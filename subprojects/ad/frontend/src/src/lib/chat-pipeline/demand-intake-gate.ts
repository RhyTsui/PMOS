/**
 * Demand Intake Gate（P1）
 *
 * 需求 intake 门禁，在 route.intent_type === 'demand' 时执行。
 * 受 feature flag 控制，支持 shadow 和 active 两种模式。
 */

import type { StreamIO, ChatPipelineContext, ChatPipelineResult } from './pipeline-types';
import { getDemandIntakeFlags } from '@/lib/demand-intake-flags';
import {
  structureDemandIntake,
  toCaseFrameMetadata,
  type DemandIntakeDraft,
} from '@/lib/demand-intake-structurer';
import {
  generateDemandConfirmationCard,
  generateMissingInputsPrompt,
  isConfirmationIntent,
} from '@/lib/demand-intake-confirmation';
import { resolveDemandCapabilityStatus } from '@/lib/demand-capability-status';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { saveCaseFrame } from '@/lib/case-frame-store';

const CAPABILITY_CHECK_SERVICE_TYPES = new Set(['monitoring_callback', 'data_collection']);

function shouldEnterDemandIntake(ctx: ChatPipelineContext): boolean {
  const flags = getDemandIntakeFlags();
  if (!flags.enableDemandIntakeGate) return false;
  if (ctx.route.intent_type !== 'demand') return false;
  if (ctx.isReportQuery) return false;
  const excludedIntents = new Set(['report_query', 'diagnosis', 'debugging', 'get_delivery_packages', 'monitor']);
  if (excludedIntents.has(String(ctx.route.intent_type))) return false;
  return true;
}

function projectScopeFromDraft(draft: DemandIntakeDraft): string[] | undefined {
  const project = draft.collectedSlots.project?.value;
  return project ? [project] : undefined;
}

function buildCapabilityGateMessage(draft: DemandIntakeDraft): string | undefined {
  const result = draft.capabilityStatusResult;
  if (!result) return undefined;

  if (result.nextAction === 'ask_missing_media') {
    return '请先补充媒体平台，我会根据媒体和应用类型确认当前能力是否已接好。';
  }
  if (result.nextAction === 'ask_missing_app_type') {
    return '请先补充应用类型（例如 Android 或 iOS），我会根据媒体和应用类型确认当前能力是否已接好。';
  }
  if (result.requestMode === 'change_request') {
    return '当前媒体和应用类型的能力已接好。你这次是变更诉求，请补充要调整的事件、字段、口径、期望生效时间和验收方式。';
  }
  if (result.requestMode === 'usage_help') {
    return '当前媒体和应用类型的能力已接好。你可以直接说明要查看配置方法、测试步骤或验收口径，我会按现有配置给出下一步。';
  }
  return undefined;
}

export async function executeDemandIntakeGate(
  ctx: ChatPipelineContext,
  io: StreamIO,
): Promise<ChatPipelineResult> {
  if (!shouldEnterDemandIntake(ctx)) return {};

  const flags = getDemandIntakeFlags();
  const caseFrame = ctx.caseFrame;
  const message = ctx.question || ctx.message;

  const existingIntakeMeta = caseFrame?.metadata?.demandIntake as any;
  if (existingIntakeMeta?.intakeDraftStatus === 'ready_for_confirmation' && isConfirmationIntent(message)) {
    (ctx as Record<string, unknown>).demandIntakeUserConfirmed = true;
    (ctx as Record<string, unknown>).demandIntakeDraft = existingIntakeMeta;

    io.pushEvent(createProcessEvent({
      type: 'intent.detected',
      label: '需求确认',
      summary: '用户已确认需求信息，准备创建需求单。',
      status: 'success',
      visibility: 'internal',
      output: {
        userConfirmed: true,
        intakeDraftStatus: 'ready_for_confirmation',
      },
    }));

    return {};
  }

  const draft = structureDemandIntake(message, ctx.compiledContext?.businessContext);

  io.pushEvent(createProcessEvent({
    type: 'intent.detected',
    label: '需求门禁',
    summary: draft.serviceType
      ? `识别到需求：${draft.serviceType}。`
      : '需求意图待确认。',
    status: 'success',
    visibility: 'internal',
    output: {
      serviceIntakeCandidate: draft.serviceIntakeCandidate,
      serviceType: draft.serviceType,
      shadow: flags.enableDemandIntakeShadow,
      intakeDraftStatus: draft.intakeDraftStatus,
      missingInputsCount: draft.missingInputs.length,
    },
  }));

  if (!draft.serviceIntakeCandidate || !draft.serviceType) {
    return {};
  }

  if (flags.enableDemandCapabilityStatusCheck && CAPABILITY_CHECK_SERVICE_TYPES.has(draft.serviceType)) {
    const capabilityStatusResult = await resolveDemandCapabilityStatus({
      media: draft.media,
      appType: draft.appType,
      serviceType: draft.serviceType,
      message,
      projectScope: projectScopeFromDraft(draft),
    });

    if (capabilityStatusResult) {
      draft.capabilityStatusResult = capabilityStatusResult;
      if (capabilityStatusResult.nextAction === 'ask_missing_media') {
        draft.missingInputs = ['媒体平台'];
        draft.intakeDraftStatus = 'collecting';
      } else if (capabilityStatusResult.nextAction === 'ask_missing_app_type') {
        draft.missingInputs = ['应用类型'];
        draft.intakeDraftStatus = 'collecting';
      }

      io.pushEvent(createProcessEvent({
        type: 'stage.ended',
        label: '能力状态查询',
        summary: `能力状态：${capabilityStatusResult.status}。`,
        status: 'success',
        visibility: 'internal',
        output: {
          status: capabilityStatusResult.status,
          requestMode: capabilityStatusResult.requestMode,
          nextAction: capabilityStatusResult.nextAction,
          source: capabilityStatusResult.source,
          media: capabilityStatusResult.media,
          appType: capabilityStatusResult.appType,
          matchedConfig: capabilityStatusResult.matchedConfig,
          reason: capabilityStatusResult.reason,
        },
      }));
    }
  }

  if (caseFrame) {
    const intakeMeta = toCaseFrameMetadata(draft);
    intakeMeta.capabilityStatusResult = draft.capabilityStatusResult;
    caseFrame.metadata.demandIntake = intakeMeta;
    caseFrame.stage = draft.intakeDraftStatus === 'ready_for_confirmation'
      ? 'waiting_user'
      : 'clarifying';
    caseFrame.missingInputs = draft.missingInputs;
    await saveCaseFrame(ctx.userScopeKey, caseFrame);
  }

  let gateMessage = buildCapabilityGateMessage(draft) || '';

  if (!gateMessage && draft.intakeDraftStatus === 'ready_for_confirmation') {
    const confirmationCard = generateDemandConfirmationCard(draft);
    gateMessage = confirmationCard?.markdown || '需求信息已齐全，请确认。';
    (ctx as Record<string, unknown>).demandIntakeConfirmCard = confirmationCard;
    (ctx as Record<string, unknown>).demandIntakeConfirmCandidate = true;
  } else if (!gateMessage) {
    gateMessage = generateMissingInputsPrompt(draft);
  }

  (ctx as Record<string, unknown>).demandIntakeGateMessage = gateMessage;
  (ctx as Record<string, unknown>).demandIntakeDraft = draft;

  return {};
}
