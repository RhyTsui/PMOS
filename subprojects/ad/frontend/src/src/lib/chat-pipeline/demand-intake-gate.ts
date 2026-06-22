/**
 * Demand Intake Gate（P1）
 *
 * 需求 intake 门禁，在 route.intent_type === 'demand' 时执行。
 * 受 feature flag 控制，支持 shadow 和 active 两种模式。
 *
 * 硬条件：
 * - featureFlags.enableDemandIntakeGate === true
 * - route.intent_type === 'demand'
 * - !isReportQuery
 * - 不影响其他路由（report_query, diagnosis, debugging, package, monitor）
 *
 * 行为：
 * - shadow 模式：记录 metadata + 生成门禁提示供后续 stage 参考，不 terminal
 * - active 模式：生成门禁提示并返回给前端（非 terminal，open-answer-stage 可补充）
 * - 不自动创建 DemandPoolItem（需 enableDemandPoolCreateOnConfirm + 用户确认）
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
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { saveCaseFrame } from '@/lib/case-frame-store';

// ─── 入口条件 ──────────────────────────────────────────

function shouldEnterDemandIntake(ctx: ChatPipelineContext): boolean {
  const flags = getDemandIntakeFlags();
  if (!flags.enableDemandIntakeGate) return false;
  if (ctx.route.intent_type !== 'demand') return false;
  if (ctx.isReportQuery) return false;
  // 排除其他意图，不改变它们的路由
  const excludedIntents = new Set(['report_query', 'diagnosis', 'debugging', 'get_delivery_packages', 'monitor']);
  if (excludedIntents.has(String(ctx.route.intent_type))) return false;
  return true;
}

// ─── 主函数 ────────────────────────────────────────────

export async function executeDemandIntakeGate(
  ctx: ChatPipelineContext,
  io: StreamIO,
): Promise<ChatPipelineResult> {
  if (!shouldEnterDemandIntake(ctx)) return {};

  const flags = getDemandIntakeFlags();
  const caseFrame = ctx.caseFrame;
  const message = ctx.question || ctx.message;

  // 检查是否为用户确认意图（当 CaseFrame 已有 demandIntake metadata 时）
  const existingIntakeMeta = caseFrame?.metadata?.demandIntake as any;
  if (existingIntakeMeta?.intakeDraftStatus === 'ready_for_confirmation' && isConfirmationIntent(message)) {
    // 用户确认意图，标记为待建单状态
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

  // 结构化 intake draft
  const draft = structureDemandIntake(message, ctx.compiledContext?.businessContext);

  // 记录 process event
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

  // 记录到 CaseFrame metadata
  if (caseFrame) {
    const intakeMeta = toCaseFrameMetadata(draft);
    caseFrame.metadata.demandIntake = intakeMeta;
    caseFrame.stage = draft.intakeDraftStatus === 'ready_for_confirmation'
      ? 'waiting_user'
      : 'clarifying';
    caseFrame.missingInputs = draft.missingInputs;
    await saveCaseFrame(ctx.userScopeKey, caseFrame);
  }

  // 生成门禁提示
  let gateMessage: string;

  if (draft.intakeDraftStatus === 'ready_for_confirmation') {
    // 所有必填槽位齐全，生成确认卡
    const confirmationCard = generateDemandConfirmationCard(draft);
    gateMessage = confirmationCard?.markdown || '需求信息已齐全，请确认。';
    (ctx as Record<string, unknown>).demandIntakeConfirmCard = confirmationCard;
    (ctx as Record<string, unknown>).demandIntakeConfirmCandidate = true;
  } else {
    // 缺失项追问
    gateMessage = generateMissingInputsPrompt(draft);
  }

  // shadow 模式：记录但不改变回答，让 open-answer-stage 继续处理
  if (flags.enableDemandIntakeShadow) {
    // 将门禁信息存入 pipeline context 供后续 stage 参考
    (ctx as Record<string, unknown>).demandIntakeGateMessage = gateMessage;
    (ctx as Record<string, unknown>).demandIntakeDraft = draft;
    return {};
  }

  // active 模式：将结构化 draft 和门禁提示传递给后续 stage
  (ctx as Record<string, unknown>).demandIntakeGateMessage = gateMessage;
  (ctx as Record<string, unknown>).demandIntakeDraft = draft;

  return {};
}
