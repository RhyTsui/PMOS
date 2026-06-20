/**
 * Open Answer Stage
 *
 * 搬迁自 route.ts L1439-1808。
 * 处理非报表、非诊断类请求的通用回答链路。
 * 包含 demand（需求草稿）和 chat_answer（通用回答）两种模式。
 */

import type { StreamIO, ChatPipelineContext, ChatPipelineResult } from './pipeline-types';
import { createRuntimeState, defaultAnswerPolicy } from '@/lib/chat-runtime/runtime-state';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { buildAnswerOrigin, buildMessageRuntimeProjection } from '@/lib/chat-runtime/message-runtime-projection';
import { modelParticipationFromRuntime } from '@/lib/runner-stages/assembly-helpers';
import { type ModelUseCaseRuntimeResult } from '@/lib/model-use-case-runtime';
import { buildConversationSemanticResult, buildSemanticMessageContract, buildSemanticWorkflowResult } from '@/contracts/result-assembly/semantic-result-assembly';
import { buildResponseContract } from '@/lib/response-contract';
import { buildTraceUrl } from '@/lib/trace';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import { emitChatMessageTrace } from '@/app/api/chat/chat-trace';
import { runChatModelNode } from '@/lib/runner-stages/assembly-helpers';
import { getModelServiceConfig } from '@/lib/runtime-config';
import { evaluateChatAnswerBoundary } from '@/lib/chat-answer-boundary';
import { resolveDomainContextPromptId } from '@/lib/prompt-runtime-consumer-registry';
import { getPromptContent } from '@/lib/prompt-store';
import { buildInformationSourceArbitration } from '@/lib/information-source-arbitration';
import { buildPlannerComposerContext, summarizeOpenAnswerIntentOrchCandidate } from '@/lib/runner-stages/planning-helpers';
import {
  buildOpenAnswerPlanningAudit,
  buildOpenAnswerPlannerProjection,
  buildOpenAnswerPlanningMetadata,
} from '@/lib/open-answer-planner-context';
import { buildOpenAnswerUnavailableFallback } from '@/lib/open-answer-fallback';
import {
  buildRouteDecisionObservation,
  isRouteDecisionObservationEnabled,
} from '@/lib/route-decision-observation';
import {
  resolveNonReportFallbackMessage,
  buildRouteObservationEvent,
  emitPlannerShadowObservationIfEnabled,
} from '@/lib/runner-stages/route-helpers';
import type { ServiceIntent, ToolPurpose } from '@/contracts/request-understanding/route-decision-contract';
import type { MessageContract } from '@/types';
import { recordEvidence } from '@/lib/evidence-ledger';
import { transitionCaseFrameStage, addEvidenceRef } from '@/lib/case-frame-helpers';

export async function executeOpenAnswerStage(
  ctx: ChatPipelineContext,
  io: StreamIO,
  publicWebEvidenceForComposer?: Record<string, unknown>,
): Promise<ChatPipelineResult> {
  const route = ctx.route;
  const routeDecisionMetadata = ctx.routeDecisionMetadata;
  const skillSelection = ctx.skillSelection;
  const selectedSkill = skillSelection.selected?.skill;
  const caseFrame = ctx.caseFrame;

  const {
    message,
    conversationId,
    traceId,
    startedAt,
    clientIntent,
    matchedRouteRules,
    reportRouteMatch,
    capabilityReportMatch,
    reportContinuation,
    userRequirement,
    routeWarnings,
    promptConfigMetadata,
    compiledContext,
    projectContextSummary,
    body,
    routeServiceIntent,
    routeInformationSourceArbitration,
    routeCapabilityManifest,
    userScopeKey,
  } = ctx;
  const publicWebNeed = ctx.publicWebNeed;

  // CaseFrame 状态转换：进入执行阶段
  if (caseFrame) {
    await transitionCaseFrameStage(userScopeKey, caseFrame, 'executing', {
      open_answer_mode: route.intent_type,
      started_at: new Date().toISOString(),
    });
  }

  const resolvedNonReportIntent = routeDecisionMetadata.resolvedIntent as ServiceIntent | undefined;
  const nonReportServiceIntent = (
    resolvedNonReportIntent === 'issue_diagnosis'
      || resolvedNonReportIntent === 'system_operation'
      || resolvedNonReportIntent === 'package_fetch'
      || resolvedNonReportIntent === 'integration_workflow'
      ? resolvedNonReportIntent
      : routeDecisionMetadata.serviceIntent
  ) as ServiceIntent | undefined;
  const isUnsupportedExecutionIntent = nonReportServiceIntent === 'issue_diagnosis'
    || nonReportServiceIntent === 'system_operation'
    || nonReportServiceIntent === 'package_fetch'
    || nonReportServiceIntent === 'integration_workflow';
  const composerBase = isUnsupportedExecutionIntent
    ? resolveNonReportFallbackMessage(nonReportServiceIntent, route.intent_type as any)
    : '基于 plannerContext 和 answerStrategy 组织自然中文回答；不要使用固定模板，不要罗列内部上下文字段。';
  let unavailableFallback = isUnsupportedExecutionIntent
    ? composerBase
    : buildOpenAnswerUnavailableFallback({ serviceIntent: nonReportServiceIntent });
  let content = isUnsupportedExecutionIntent ? composerBase : unavailableFallback;
  let chatAnswerAssist: ModelUseCaseRuntimeResult | undefined;
  const nonReportModelServiceConfig = await getModelServiceConfig();
  const plannerContext = isUnsupportedExecutionIntent
    ? undefined
    : await buildPlannerComposerContext({
      message,
      route,
      serviceIntent: nonReportServiceIntent,
      compiledContext,
      projectContextSummary,
      capabilityManifest: routeCapabilityManifest,
      modelServiceConfig: nonReportModelServiceConfig,
      userScopeKey,
      conversationId,
      publicWebEvidence: publicWebEvidenceForComposer,
    });
  if (!isUnsupportedExecutionIntent) {
    unavailableFallback = buildOpenAnswerUnavailableFallback({
      context: plannerContext,
      serviceIntent: nonReportServiceIntent,
    });
    content = unavailableFallback;
  }
  if (plannerContext?.intentOrch && plannerContext.intentOrch.status !== 'disabled') {
    io.pushEvent(createProcessEvent({
      type: 'intent_orch.candidate',
      label: 'IntentOrch 候选',
      summary: summarizeOpenAnswerIntentOrchCandidate(plannerContext.intentOrch),
      status: plannerContext.intentOrch.status === 'success'
        ? 'success'
        : 'rejected',
      visibility: 'internal',
      duration_ms: plannerContext.intentOrch.duration_ms,
      output: {
        candidate: plannerContext.intentOrch,
        arbitration_summary: plannerContext.arbitrationSummary,
      },
    }));
  }
  if (!isUnsupportedExecutionIntent && route.intent_type === 'demand') {
    chatAnswerAssist = await runChatModelNode({
      useCase: 'requirement_drafting',
      fallbackText: unavailableFallback,
      modelServiceConfig: nonReportModelServiceConfig,
      input: { message, route, compiledContext, plannerContext, baseDraft: composerBase },
      consume: {
        enabled: true,
        consumedBy: 'requirement_answer_composer',
        textField: 'draftText',
        consumedFields: ['draftText'],
      },
      traceMeta: { intent: (route.intent_type as any) || 'demand' },
    });
    content = chatAnswerAssist.text;
  } else if (!isUnsupportedExecutionIntent) {
    const chatAnswerBoundary = evaluateChatAnswerBoundary({
      serviceIntent: routeDecisionMetadata.serviceIntent,
      routeIntent: route.intent_type as any,
      isReportQuery: false,
      hasSelectedSkill: Boolean(selectedSkill),
      hasExecutableTool: false,
      phase: 'fallback',
    });
    if (chatAnswerBoundary.allowed) {
      const domainContextPromptId = resolveDomainContextPromptId({
        serviceIntent: routeDecisionMetadata.serviceIntent,
        routeIntent: route.intent_type as any,
      });
      const domainContext = domainContextPromptId
        ? await getPromptContent(domainContextPromptId, '').catch(() => '')
        : '';
      try {
        chatAnswerAssist = await runChatModelNode({
          useCase: 'chat_answer',
          fallbackText: unavailableFallback,
          modelServiceConfig: nonReportModelServiceConfig,
          input: {
            user_query: message,
            message,
            context: plannerContext,
            evidence_ledger: plannerContext?.evidenceLedger,
            answer_constraints: {
              boundary: chatAnswerBoundary,
              baseAnswer: composerBase,
              must_use_available_evidence: true,
              no_evidence_no_claim: true,
            },
            intentorch_candidate: plannerContext?.intentOrch,
            planner_candidates: plannerContext?.plannerCandidates,
            arbitration_summary: plannerContext?.arbitrationSummary,
            assistant_profile: plannerContext?.assistantProfile,
            capability_overview: plannerContext?.capabilityOverview,
            baseAnswer: composerBase,
            route,
            serviceIntent: routeDecisionMetadata.serviceIntent,
            boundary: chatAnswerBoundary,
            projectContextSummary,
            domain_context: domainContext || undefined,
          },
          consume: {
            enabled: true,
            consumedBy: 'chat_answer_composer',
            textField: 'answerMarkdown',
            consumedFields: ['answerMarkdown'],
          },
          traceMeta: {
            intent: (route.intent_type as any) || 'general',
            service_intent: routeDecisionMetadata.serviceIntent,
            boundary_reason: chatAnswerBoundary.reason,
          },
        });
        content = chatAnswerAssist.text.trim() || content;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn('[open-answer] chat_answer model call failed, using fallback:', errMsg);
        chatAnswerAssist = {
          text: unavailableFallback,
          modelUsed: false,
          consumed: false,
          blocked: false,
          warnings: [`chat_answer_model_error: ${errMsg}`],
          participation: {
            model_use_case: 'chat_answer',
            status: 'failed_fallback',
            model_name: nonReportModelServiceConfig?.modelName || 'unknown',
            warnings: [`model_call_failed: ${errMsg}`],
          },
        };
        content = unavailableFallback;
      }
    }
  }
  const modelFallbackUsed = !isUnsupportedExecutionIntent
    && chatAnswerAssist?.participation.status === 'failed_fallback';
  const openAnswerPlanningMetadata = plannerContext
    ? buildOpenAnswerPlanningMetadata({
      plannerCandidates: plannerContext.plannerCandidates,
      arbitrationSummary: plannerContext.arbitrationSummary,
      contextSelection: plannerContext.contextSelection,
    })
    : undefined;
  const openAnswerInformationSourceArbitration = plannerContext
    ? buildInformationSourceArbitration({
      stage: 'route_arbitration',
      isReportQuery: false,
      reportRouteMatch,
      capabilityReportMatch,
      publicWebNeed,
      knowledge: plannerContext.knowledge,
      hasProjectContext: Boolean(projectContextSummary || compiledContext.project.currentProject),
      hasMemoryOrHistoryContext: Boolean(
        (body.history || []).length
        || plannerContext.contextSelection.memory.selected.length
        || plannerContext.contextSelection.recentConversations.selected.length,
      ),
    })
    : routeInformationSourceArbitration;
  const openAnswerEvidenceMode = plannerContext?.arbitrationSummary.evidence_mode_hint === 'knowledge_grounded'
    ? 'knowledge_grounded' as const
    : plannerContext?.arbitrationSummary.evidence_mode_hint === 'mixed_context'
      ? 'mixed_grounded' as const
      : plannerContext?.arbitrationSummary.evidence_mode_hint === 'insufficient_evidence'
        ? 'insufficient_evidence' as const
        : undefined;
  if (plannerContext) {
    const planningAudit = buildOpenAnswerPlanningAudit({
      plannerCandidates: plannerContext.plannerCandidates,
      arbitrationSummary: plannerContext.arbitrationSummary,
      contextSelection: plannerContext.contextSelection,
    });
    io.pushEvent(createProcessEvent({
      type: 'model.step',
      label: '开放式回答仲裁',
      summary: planningAudit.summary,
      status: planningAudit.status,
      visibility: 'internal',
      output: planningAudit.output,
    }));
  }
  const nonReportResultStatus = isUnsupportedExecutionIntent
    ? 'not_configured' as const
    : modelFallbackUsed
      ? 'degraded' as const
      : 'success' as const;
  const runtimeState = createRuntimeState(
    startedAt,
    'completed',
    ['understanding', 'context_loading', 'response_generation'],
    modelFallbackUsed ? 'degraded' : 'completed',
  );
  io.push({ type: 'route', intent: route.intent_type, hasThinking: false, toolsUsed: [] });
  io.pushRuntimeState('response_generation', ['understanding', 'context_loading']);
  io.push({ type: 'content', content });
  const { semanticResult, businessSummary } = buildConversationSemanticResult({
    conversationId,
    messageId: traceId,
    traceId,
    answerMarkdown: content,
  });
  const semanticResultRecord = semanticResult as unknown as Record<string, unknown>;
  const messageContract: MessageContract = buildSemanticMessageContract({
    type: route.intent_type === 'diagnosis' ? 'diagnosis' : route.intent_type === 'debugging' ? 'debugging' : route.intent_type === 'get_delivery_packages' ? 'delivery' : 'chat',
    answerMarkdown: content,
    businessSummary,
    semanticResult,
    runtimeState,
    answerPolicy: defaultAnswerPolicy(),
  });
  const workflowResult = buildSemanticWorkflowResult({
    taskId: traceId,
    kind: (route.intent_type as any) || 'general',
    resultType: 'help_answer',
    answer: content,
    businessSummary,
    semanticResult,
    runtimeState,
    answerPolicy: defaultAnswerPolicy(),
    nextActions: [],
  });
  const routeObservation = isRouteDecisionObservationEnabled()
    ? buildRouteDecisionObservation({
      decisionId: `${traceId}:route-observation`,
      traceId,
      message,
      clientIntent,
      routeIntent: route.intent_type as any,
      routeReason: route.reason as string,
      routeConfidence: route.confidence as any,
      resolvedIntent: routeDecisionMetadata.resolvedIntent as any,
      matchedRules: matchedRouteRules,
      reportRouteMatch,
      reportContinuation,
      userRequirementTask: userRequirement.task,
      routeWarnings,
      selectedSkill: selectedSkill ? { skill_id: selectedSkill.skill_id, name: selectedSkill.name } : null,
      skillSelection,
      capabilityDecision: null,
      promptConfig: promptConfigMetadata,
      isReportQuery: false,
      actualExecution: {
        actualServiceIntent: nonReportServiceIntent,
        actualIsReportQuery: false,
        actualSelectedSkill: selectedSkill?.skill_id,
        actualToolPurpose: (route.intent_type === 'get_delivery_packages' || nonReportServiceIntent === 'package_fetch'
          ? 'package_fetch'
          : nonReportServiceIntent === 'integration_workflow' || nonReportServiceIntent === 'system_operation'
          ? 'integration_run'
          : nonReportServiceIntent === 'issue_diagnosis'
            ? 'evidence_fetch'
            : routeDecisionMetadata.toolPurpose) as ToolPurpose | undefined,
      },
    })
    : undefined;
  if (routeObservation) io.pushEvent(buildRouteObservationEvent(routeObservation));
  await emitPlannerShadowObservationIfEnabled({
    message,
    history: body.history,
    pushEvent: io.pushEvent,
    route: { intent_type: route.intent_type as any, confidence: route.confidence as any, serviceIntent: routeServiceIntent as string },
    // Stage 2: shadow 结果入账 planner_inference evidence
    onShadowResult: async (result) => {
      if (result.status === 'succeeded' && result.plan) {
        const updatedLedger = recordEvidence(io.getEvidenceLedger(), {
          stage: 'planning',
          source: 'planner_inference',
          sourceId: 'planner_shadow',
          confidence: 'high_probability',
          content: {
            status: result.status,
            task_type: result.plan.task_type,
            service_intent: result.plan.service_intent,
            confidence: result.plan.confidence,
            candidate_count: result.plan.candidate_capabilities?.length ?? 0,
            duration_ms: result.durationMs,
          },
        });
        io.setEvidenceLedger(updatedLedger);

        // CaseFrame 证据引用
        if (caseFrame && updatedLedger.entries.length > 0) {
          const latestEvidenceId = updatedLedger.entries[updatedLedger.entries.length - 1].id;
          await addEvidenceRef(userScopeKey, caseFrame, latestEvidenceId);
        }
      }
    },
  });
  await io.endPlanningAndStartExecution();

  const processEvents = io.getProcessEvents();
  const runtimeProjection = buildMessageRuntimeProjection({
    messageId: traceId,
    threadId: conversationId,
    traceId,
    workflow: (route.intent_type as any) || 'chat',
    intent: route.intent_type as any,
    status: 'fallback',
    routeReason: route.reason as string,
    runtimeState,
    answerPolicy: defaultAnswerPolicy(),
    content,
    promptConfig: promptConfigMetadata,
    compiledContext,
    messageContract,
    semanticResult: semanticResultRecord,
    processEvents,
    traceUrl: buildTraceUrl(traceId, getTraceConfigSync().workspaceId),
    modelParticipation: modelParticipationFromRuntime(chatAnswerAssist),
    answerOrigin: chatAnswerAssist?.consumed
      ? buildAnswerOrigin({
        source: 'real_llm',
        composerName: 'chat_answer',
        summary: '通用回答由模型在有可执行工具场景下生成，未修改工具事实。',
        modelName: chatAnswerAssist.participation.model_name,
        modelSpanId: chatAnswerAssist.participation.model_span_id,
        metadata: {
          ...(openAnswerPlanningMetadata ? { open_answer_planning: openAnswerPlanningMetadata } : {}),
          ...(chatAnswerAssist.warnings.length
            ? {
              warnings: chatAnswerAssist.warnings,
              trace_unavailable: chatAnswerAssist.warnings.some((warning) => /trace|链路|span/i.test(warning)),
            }
            : {}),
        },
      })
      : buildAnswerOrigin({
        source: chatAnswerAssist?.participation.status === 'failed_fallback' ? 'model_unavailable' : 'template_composer',
        composerName: 'fallbackAnswer',
        summary: chatAnswerAssist?.participation.status === 'failed_fallback'
          ? '通用回答需要模型生成，但当前模型服务不可用。'
          : '兜底回答由本地规则生成。',
        metadata: {
          ...(openAnswerPlanningMetadata ? { open_answer_planning: openAnswerPlanningMetadata } : {}),
          ...(chatAnswerAssist?.participation.status === 'failed_fallback'
            ? { error_message: chatAnswerAssist.participation.fallback_reason, warnings: chatAnswerAssist.warnings }
            : {}),
        },
      }),
  });
  if (runtimeProjection.answer_origin?.metadata && typeof runtimeProjection.answer_origin.metadata === 'object' && 'trace_unavailable' in runtimeProjection.answer_origin.metadata) {
    io.pushEvent(createProcessEvent({
      type: 'model.step',
      label: '模型链路记录',
      summary: '模型回答已生成，链路记录暂不可用。',
      status: 'success',
      visibility: 'internal',
      output: runtimeProjection.answer_origin.metadata,
    }));
  }
  const responseContract = buildResponseContract({
    status: nonReportResultStatus,
    intentType: route.intent_type as any,
    traceId,
    answer: content,
    workflowResult,
    answerOrigin: runtimeProjection.answer_origin,
    processEvents,
    metadata: {
      evidence_mode: openAnswerEvidenceMode,
      answer_origin: runtimeProjection.answer_origin,
      open_answer_planning: openAnswerPlanningMetadata,
      info_source_arbitration: openAnswerInformationSourceArbitration,
      capability_status: isUnsupportedExecutionIntent ? 'not_configured' : undefined,
      semantic_result: semanticResult,
    },
  });
  const traceMeta = await emitChatMessageTrace({
    traceId,
    message,
    conversationId,
    threadId: conversationId,
    messageId: traceId,
    turnId: traceId,
    intentType: route.intent_type as any,
    status: 'fallback',
    routeReason: route.reason as string,
    finalAnswer: content,
    runtimeProjection,
    extra: {
      project_context_summary: projectContextSummary,
      message_contract: messageContract,
      semantic_result: semanticResult,
      info_source_arbitration: openAnswerInformationSourceArbitration,
    },
  });
  io.push({
    type: 'done',
    result: {
      answer: content,
      response_contract: responseContract,
      semantic_result: semanticResult,
      business_summary: businessSummary,
      workflow_result: workflowResult,
      message_contract: messageContract,
      runtime_state: runtimeState,
      answer_policy: defaultAnswerPolicy(),
    },
    metadata: { process_events: processEvents, routing_decision_observation: routeObservation, info_source_arbitration: openAnswerInformationSourceArbitration, project_context_summary: projectContextSummary, compiled_context: compiledContext, prompt_config: promptConfigMetadata, runtime_state: runtimeState, workflow_result: workflowResult, message_contract: messageContract, response_contract: responseContract, semantic_result: semanticResult, business_summary: businessSummary, trace_meta: traceMeta, thread_id: conversationId, message_id: traceId, turn_id: traceId, trace_url: traceMeta?.trace_url, message_runtime_projection: runtimeProjection, service_proposal: ctx.serviceProposal },
  });
  io.close();

  // CaseFrame 状态转换：执行完成
  if (caseFrame) {
    await transitionCaseFrameStage(userScopeKey, caseFrame, 'resolved', {
      open_answer_mode: route.intent_type,
      completed_at: new Date().toISOString(),
    });
  }

  return { terminal: true, content };
}
