/**
 * Public Web Stage
 *
 * 搬迁自 route.ts L661-1147。
 * 当用户问题需要公开网络搜索时执行此 stage。
 * 如果公开网络结果足够完整（terminal=true），直接返回答案；
 * 否则产出 publicWebEvidenceForComposer 供后续 stage 使用。
 */

import type { StreamIO, ChatPipelineContext, ChatPipelineResult } from './pipeline-types';
import { createRuntimeState, defaultAnswerPolicy } from '@/lib/chat-runtime/runtime-state';
import { compactRuntimePayload } from '@/lib/chat-runtime/payload-compact';
import { pushSourceAttachedEvents } from '@/lib/chat-route-primitives';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { buildAnswerOrigin, buildMessageRuntimeProjection } from '@/lib/chat-runtime/message-runtime-projection';
import { modelParticipationFromRuntime } from '@/lib/runner-stages/assembly-helpers';
import { buildSemanticMessageContract, buildSemanticWorkflowResult } from '@/contracts/result-assembly/semantic-result-assembly';
import { buildResponseContract } from '@/lib/response-contract';
import { buildTraceUrl } from '@/lib/trace';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import { emitChatMessageTrace } from '@/app/api/chat/chat-trace';
import { recordEvidence } from '@/lib/evidence-ledger';
import { runChatModelNode } from '@/lib/runner-stages/assembly-helpers';
import { type ModelUseCaseRuntimeResult } from '@/lib/model-use-case-runtime';
import { resolveChatAnswerMessage } from '@/lib/chat-answer-message-catalog';
import { executePublicWebQuery } from '@/lib/public-web-runtime';
import {
  buildRouteDecisionObservation,
  isRouteDecisionObservationEnabled,
} from '@/lib/route-decision-observation';
import {
  buildRouteObservationEvent,
  emitPlannerShadowObservationIfEnabled,
} from '@/lib/runner-stages/route-helpers';
import type { ToolPurpose } from '@/contracts/request-understanding/route-decision-contract';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import type { MessageContract } from '@/types';
import type { OpenAnswerPublicWebCandidate } from '@/lib/open-answer-planner-context';
import { addEvidenceRef } from '@/lib/case-frame-helpers';

export async function executePublicWebStage(
  ctx: ChatPipelineContext,
  io: StreamIO,
): Promise<ChatPipelineResult> {
  const {
    question,
    conversationId,
    traceId,
    startedAt,
    message,
    routeServiceIntent,
    compiledContext,
    projectContextSummary,
    userRequirement,
    publicWebModelServiceConfig,
    matchedRouteRules,
    reportRouteMatch,
    reportContinuation,
    skillSelection,
    clientIntent,
    routeInformationSourceArbitration,
    promptConfigMetadata,
    body,
    userScopeKey,
  } = ctx;

  const route = ctx.route;
  const publicWebNeed = ctx.publicWebNeed;
  const routeDecisionMetadata = ctx.routeDecisionMetadata;
  const routeWarnings = ctx.routeWarnings;
  const caseFrame = ctx.caseFrame;

  // canUsePublicWeb 判定
  if (!publicWebNeed.required) {
    return {};
  }

  io.pushRuntimeState('data_fetching', ['understanding', 'context_loading']);
  const publicWebResult = await executePublicWebQuery(question, publicWebNeed);
  const publicWebReasonCode = publicWebResult.reasonCode || (publicWebNeed.reasonCode as string) || 'public_web.need_not_detected';
  // Stage 2: 公开网络结果入账 Evidence Ledger
  const updatedLedger = recordEvidence(io.getEvidenceLedger(), {
    source: 'public_web',
    sourceId: (publicWebNeed.reasonCode as string) || 'public_web',
    confidence: publicWebResult.status === 'success' ? 'confirmed_fact' : 'unverified',
    content: {
      status: publicWebResult.status,
      source_count: publicWebResult.sourceRefs.length,
      reason_code: publicWebReasonCode,
    },
    sourceRefId: publicWebResult.sourceRefs[0]?.id,
  });
  io.setEvidenceLedger(updatedLedger);

  // CaseFrame 证据引用
  if (caseFrame && updatedLedger.entries.length > 0) {
    const latestEvidenceId = updatedLedger.entries[updatedLedger.entries.length - 1].id;
    await addEvidenceRef(userScopeKey, caseFrame, latestEvidenceId);
  }
  const publicWebAnswerSummary = resolveChatAnswerMessage(publicWebReasonCode, publicWebResult.reasonContext || {});
  for (const event of publicWebResult.processEvents) {
    io.pushEvent(event);
  }
  if (publicWebResult.sourceRefs.length) {
    pushSourceAttachedEvents(io.push, publicWebResult.sourceRefs.map((source: any) => ({
      title: source.title as string,
      source: source.source as string,
      url: source.url as string,
      source_type: (source.source_type || 'web_search') as import('@/lib/chat-route-primitives').SourceRefPayload['source_type'],
      icon: source.icon as string,
      prompt: source.snippet as string,
    })));
  }
  const publicWebEvidenceRole: OpenAnswerPublicWebCandidate['evidence_role'] = 'candidate_evidence';
  const publicWebCandidate: OpenAnswerPublicWebCandidate = {
    source: 'public_web',
    status: publicWebResult.status,
    capability_type: publicWebNeed.capabilityType as string,
    reason_code: publicWebReasonCode,
    source_count: publicWebResult.sourceRefs.length,
    source_required: publicWebNeed.sourceRequired as boolean,
    confidence: publicWebNeed.confidence as number,
    evidence_role: publicWebEvidenceRole,
    fact_need: publicWebNeed.factNeed as string,
    provider_eligibility: publicWebNeed.providerEligibility as OpenAnswerPublicWebCandidate['provider_eligibility'],
    search_plan: publicWebNeed.searchPlan as OpenAnswerPublicWebCandidate['search_plan'],
    risk_flags: [
      'public_web_requires_composer_arbitration',
      ...(publicWebResult.sourceRefs.length ? [] : ['public_web_no_reliable_source']),
      ...publicWebResult.warnings,
    ],
  };
  const publicWebEvidenceForComposer = compactRuntimePayload({
    candidate: publicWebCandidate,
    answer_candidate: publicWebResult.answer || publicWebAnswerSummary,
    sanitized_query: publicWebResult.sanitizedQuery,
    fact_need: publicWebNeed.factNeed,
    provider_eligibility: publicWebNeed.providerEligibility,
    search_plan: publicWebNeed.searchPlan,
    sources: publicWebResult.sourceRefs.map((source: any) => ({
      id: source.id,
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      confidence: source.confidence,
      source_type: source.source_type,
    })),
    evidence_items: publicWebResult.evidenceItems || [],
    search_trace: publicWebResult.searchTrace,
    retrieval_result: publicWebResult.retrievalResult,
    warnings: publicWebResult.warnings,
  }, { depth: 4, maxString: 500, maxArray: 8, maxKeys: 32 }) as Record<string, unknown>;
  const hasRequiredPublicEvidence = (publicWebNeed.sourceRequired as boolean)
    && publicWebResult.status === 'success'
    && publicWebResult.sourceRefs.length > 0;
  const shouldReturnPublicWebAnswer = publicWebResult.status === 'blocked'
    || hasRequiredPublicEvidence
    || (publicWebResult.status !== 'success' && (publicWebNeed.sourceRequired as boolean));
  if (!shouldReturnPublicWebAnswer) {
    const publicWebContinueReason = publicWebResult.sourceRefs.length
      ? 'public_web_candidate_continues_to_composer'
      : 'public_web_no_reliable_source_fell_back_to_model_answer';
    routeWarnings.push(publicWebContinueReason);
    io.pushEvent(createProcessEvent({
      type: 'web.result',
      label: '公开来源候选',
      summary: publicWebResult.sourceRefs.length
        ? '公开来源已作为候选证据进入通用回答链路。'
        : '未取得足够可靠的公开来源，继续由通用回答链路处理。',
      status: 'success',
      visibility: 'internal',
      output: {
        decision: publicWebResult.sourceRefs.length ? 'continue_to_answer_composer' : 'fallback_to_model_answer',
        evidence_role: publicWebEvidenceRole,
        public_web_status: publicWebResult.status,
        source_count: publicWebResult.sourceRefs.length,
        reason_code: publicWebReasonCode,
        source_required: publicWebNeed.sourceRequired,
        result_reason: publicWebResult.processEvents.find((event) => event.type === 'web.result')?.summary,
        fact_need: publicWebNeed.factNeed,
        provider_eligibility: publicWebNeed.providerEligibility,
        search_plan: publicWebNeed.searchPlan,
      },
    }));
    // 非 terminal — 返回 evidence 供后续 stage 使用
    return { publicWebEvidenceForComposer };
  }

  // ─── shouldReturnPublicWebAnswer === true — 直接回答 ───
  let publicWebAnswer = publicWebResult.answer || publicWebAnswerSummary;
  let publicWebAnswerAssist: ModelUseCaseRuntimeResult | undefined;
  if (publicWebResult.status === 'failed' && publicWebModelServiceConfig) {
    publicWebAnswerAssist = await runChatModelNode({
      useCase: 'chat_answer',
      fallbackText: publicWebAnswer,
      modelServiceConfig: publicWebModelServiceConfig,
      input: {
        message,
        baseAnswer: publicWebAnswer,
        route,
        serviceIntent: routeDecisionMetadata.serviceIntent,
        publicWeb: {
          status: publicWebResult.status,
          reasonCode: publicWebReasonCode,
          sourceCount: publicWebResult.sourceRefs.length,
          sanitizedQuery: publicWebResult.sanitizedQuery,
          noReliablePublicSource: true,
          factNeed: publicWebNeed.factNeed,
          providerEligibility: publicWebNeed.providerEligibility,
          searchPlan: publicWebNeed.searchPlan,
          searchTrace: publicWebResult.searchTrace,
        },
        projectContextSummary,
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
        public_web_status: publicWebResult.status,
      },
    });
    publicWebAnswer = publicWebAnswerAssist.text.trim() || publicWebAnswer;
  }
  const runtimeState = createRuntimeState(
    startedAt,
    'completed',
    ['understanding', 'context_loading', 'data_fetching', 'response_generation'],
    publicWebResult.status === 'success' ? 'completed' : publicWebResult.status === 'blocked' ? 'blocked' : 'degraded',
  );
  const answerPolicy = {
    ...defaultAnswerPolicy(),
    evidence_visibility: 'expanded' as const,
  };
  const publicWebBusinessSummary = {
    title: publicWebResult.status === 'success' ? '公开信息结果' : '公开信息查询结果',
    brief: publicWebAnswer || publicWebAnswerSummary,
    severity: publicWebResult.status === 'success' ? 'info' as const : 'medium' as const,
    confidence: publicWebResult.sourceRefs.length ? 'medium' as const : 'low' as const,
    type: 'public_web_answer',
    kind: 'chat',
  };
  const answerOrigin = buildAnswerOrigin({
    source: publicWebResult.status === 'success'
      ? 'external_service'
      : publicWebAnswerAssist?.consumed
        ? 'real_llm'
        : 'rule_fallback',
    composerName: publicWebAnswerAssist?.consumed ? 'chat_answer' : 'public_web_grounded_answer',
    modelName: publicWebAnswerAssist?.participation.model_name,
    provider: 'configured_web_search',
    summary: publicWebAnswerSummary,
    metadata: {
      primaryGoal: publicWebNeed.primaryGoal,
      capabilityType: publicWebNeed.capabilityType,
      sourceRequired: publicWebNeed.sourceRequired,
      sanitizedQuery: publicWebResult.sanitizedQuery,
      warnings: [...publicWebResult.warnings, ...(publicWebAnswerAssist?.warnings || [])],
      reasonCode: publicWebReasonCode,
      reasonContext: publicWebResult.reasonContext,
      factNeed: publicWebNeed.factNeed,
      providerEligibility: publicWebNeed.providerEligibility,
      searchPlan: publicWebNeed.searchPlan,
      searchTrace: publicWebResult.searchTrace,
      model_fallback_used: Boolean(publicWebAnswerAssist?.consumed),
    },
  });
  const semanticSourceIds = publicWebResult.sourceRefs
    .map((source: any) => source.id as string)
    .filter((id: string): id is string => Boolean(id));
  const semanticSourceRefs = publicWebResult.sourceRefs.map((source: any) => ({
    id: (source.id as string) || (source.sourceId as string) || (source.url as string) || `public-web-source-${traceId}`,
    type: 'web_search' as const,
    title: source.title as string,
    description: source.snippet as string,
    locator: source.url ? { kind: 'url' as const, value: source.url as string } : undefined,
    retrievedAt: (source.retrievedAt as string) || (source.fetchedAt as string),
    freshness: {
      status: 'fresh' as const,
      retrievedAt: (source.retrievedAt as string) || (source.fetchedAt as string),
    },
    reliability: {
      level: 'unknown' as const,
      explanation: '公开网页搜索来源，需结合来源页面自行判断。',
    },
    citationPolicy: {
      required: true,
      format: 'panel' as const,
      clickable: true,
    },
    metadata: {
      source: source.source,
      siteName: source.siteName,
      publisher: source.publisher,
      contentHash: source.contentHash,
      confidence: source.confidence,
    },
  }));
  const processEvents = io.getProcessEvents();
  const semanticResult: SemanticResultContract = {
    contractType: 'semantic-result',
    version: 'semantic-result/v1',
    resultId: `${traceId}:public-web`,
    conversationId,
    messageId: traceId,
    screenType: 'conversation-answer',
    title: publicWebResult.status === 'success' ? '公开信息结果' : '公开信息不可用',
    description: publicWebAnswerSummary,
    createdAt: new Date().toISOString(),
    producer: {
      kind: publicWebResult.status === 'success' ? 'tool' : 'system',
      name: 'configured_web_search',
    },
    regions: [
      {
        id: 'public-web-answer',
        type: 'summary',
        componentBinding: 'markdown-result',
        title: '回答',
        state: publicWebResult.status === 'success' ? 'ready' : 'degraded',
        data: {
          answer_markdown: publicWebAnswer,
          status: publicWebResult.status,
        },
        sourceRefs: semanticSourceIds,
        runtimeRefs: processEvents.map((event) => event.id),
      },
      {
        id: 'public-web-sources',
        type: 'source',
        componentBinding: 'source-list',
        title: '公开来源',
        state: publicWebResult.sourceRefs.length ? 'ready' : 'empty',
        data: {
          source_refs: publicWebResult.sourceRefs,
        },
        sourceRefs: semanticSourceIds,
      },
    ],
    sourceRefs: semanticSourceRefs,
    runtimeRefs: processEvents.map((event) => ({
      id: event.id,
      kind: 'event',
    })),
    freshness: {
      status: publicWebResult.sourceRefs.length ? 'fresh' : 'unknown',
      retrievedAt: (publicWebResult.sourceRefs[0] as any)?.retrievedAt as string || (publicWebResult.sourceRefs[0] as any)?.fetchedAt as string,
      generatedAt: new Date().toISOString(),
    },
    confidence: {
      level: publicWebResult.sourceRefs.length ? 'medium' : 'low',
      score: publicWebResult.sourceRefs.length ? 0.7 : 0.3,
      basis: 'source',
      explanation: publicWebResult.sourceRefs.length
        ? '已取得公开来源。'
        : '未取得可引用公开来源。',
    },
    metadata: {
      public_web: {
        primaryGoal: publicWebNeed.primaryGoal,
        capabilityType: publicWebNeed.capabilityType,
        sourceRequired: publicWebNeed.sourceRequired,
        sourceCount: publicWebResult.sourceRefs.length,
        reasonCode: publicWebReasonCode,
        reasonContext: publicWebResult.reasonContext,
        factNeed: publicWebNeed.factNeed,
        providerEligibility: publicWebNeed.providerEligibility,
        searchPlan: publicWebNeed.searchPlan,
        searchTrace: publicWebResult.searchTrace,
        retrievalResult: publicWebResult.retrievalResult,
      },
    },
  };
  const messageContract: MessageContract = buildSemanticMessageContract({
    type: 'chat',
    answerMarkdown: publicWebAnswer,
    businessSummary: publicWebBusinessSummary,
    semanticResult,
    runtimeState,
    answerPolicy,
    evidenceBundle: {
      source_refs: publicWebResult.sourceRefs,
    },
  });
  const workflowResult = buildSemanticWorkflowResult({
    taskId: traceId,
    kind: (route.intent_type as any) || 'general',
    resultType: 'help_answer',
    answer: publicWebAnswer,
    businessSummary: publicWebBusinessSummary,
    semanticResult,
    runtimeState,
    answerPolicy,
    evidenceBundle: {
      source_refs: publicWebResult.sourceRefs,
    },
    nextActions: [],
  });
  const routeObservation = isRouteDecisionObservationEnabled()
    ? buildRouteDecisionObservation({
      decisionId: `${traceId}:route-observation`,
      traceId,
      message,
      clientIntent,
      routeIntent: route.intent_type as any,
      routeReason: (publicWebNeed.reason as string) || (route.reason as string),
      routeConfidence: route.confidence as any,
      resolvedIntent: 'general',
      matchedRules: matchedRouteRules,
      reportRouteMatch,
      reportContinuation,
      userRequirementTask: userRequirement.task,
      routeWarnings,
      selectedSkill: null,
      skillSelection,
      capabilityDecision: {
        selected: publicWebResult.status === 'success'
          ? {
            capabilityId: 'public_web_search',
            capabilityType: publicWebNeed.capabilityType as string,
            dataDomain: 'public_web',
            source: { toolName: 'configured_web_search' },
          }
          : undefined,
        executionDecision: publicWebResult.status,
        candidates: [{
          capability: {
            capabilityId: 'public_web_search',
            capabilityType: publicWebNeed.capabilityType as string,
            dataDomain: 'public_web',
            source: { toolName: 'configured_web_search' },
          },
          score: publicWebResult.status === 'success' ? 100 : 0,
          reasons: [
            (publicWebNeed.primaryGoal as string) || '',
            publicWebNeed.sourceRequired ? 'source_required' : '',
          ].filter(Boolean),
        }],
        warnings: publicWebResult.warnings,
      },
      promptConfig: promptConfigMetadata,
      isReportQuery: false,
      actualExecution: {
        actualServiceIntent: 'general_chat',
        actualIsReportQuery: false,
        actualSelectedSkill: undefined,
        actualToolPurpose: 'evidence_fetch' as ToolPurpose,
      },
    })
    : undefined;
  if (routeObservation) io.pushEvent(buildRouteObservationEvent(routeObservation));
  await emitPlannerShadowObservationIfEnabled({ message, history: body.history, pushEvent: io.pushEvent, route: { intent_type: route.intent_type as any, confidence: route.confidence as any, serviceIntent: routeServiceIntent as string }, onShadowResult: (result) => { io.setEvidenceLedger(recordEvidence(io.getEvidenceLedger(), { source: 'planner_inference', sourceId: 'planner_shadow', confidence: result.status === 'succeeded' ? 'high_probability' : 'unverified', content: { status: result.status, task_type: result.plan?.task_type, service_intent: result.plan?.service_intent, confidence: result.plan?.confidence, duration_ms: result.durationMs } })); } });
  await io.endPlanningAndStartExecution();

  const runtimeProjection = buildMessageRuntimeProjection({
    messageId: traceId,
    threadId: conversationId,
    traceId,
    workflow: 'public_web',
    intent: (route.intent_type as any) || 'general',
    status: publicWebResult.status,
    routeReason: (publicWebNeed.reason as string) || (route.reason as string),
    runtimeState,
    answerPolicy,
    content: publicWebAnswer,
    promptConfig: promptConfigMetadata,
    compiledContext,
    messageContract,
    processEvents,
    traceUrl: buildTraceUrl(traceId, getTraceConfigSync().workspaceId),
    modelParticipation: modelParticipationFromRuntime(publicWebAnswerAssist),
    answerOrigin,
  });
  const responseContract = buildResponseContract({
    status: publicWebResult.status === 'success'
      ? 'success'
      : publicWebResult.status === 'blocked'
        ? 'blocked'
        : 'degraded',
    intentType: route.intent_type as any,
    traceId,
    answer: publicWebAnswer,
    workflowResult,
    answerOrigin,
    processEvents,
    metadata: {
      answer_origin: answerOrigin,
      semantic_result: semanticResult,
      business_summary: publicWebBusinessSummary,
      info_source_arbitration: routeInformationSourceArbitration,
      public_web: {
        primaryGoal: publicWebNeed.primaryGoal,
        capabilityType: publicWebNeed.capabilityType,
        sourceRequired: publicWebNeed.sourceRequired,
        sourceCount: publicWebResult.sourceRefs.length,
        reasonCode: publicWebReasonCode,
        reasonContext: publicWebResult.reasonContext,
        policy: publicWebNeed.policy,
        confidence: publicWebNeed.confidence,
        factNeed: publicWebNeed.factNeed,
        providerEligibility: publicWebNeed.providerEligibility,
        searchPlan: publicWebNeed.searchPlan,
        searchTrace: publicWebResult.searchTrace,
        evidenceItems: publicWebResult.evidenceItems || [],
        retrievalResult: publicWebResult.retrievalResult,
      },
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
    status: publicWebResult.status,
    routeReason: (publicWebNeed.reason as string) || (route.reason as string),
    finalAnswer: publicWebAnswer,
    runtimeProjection,
    extra: {
      project_context_summary: projectContextSummary,
      public_web: responseContract.metadata?.public_web,
      info_source_arbitration: routeInformationSourceArbitration,
      semantic_result: semanticResult,
    },
  });
  io.push({ type: 'route', intent: route.intent_type, hasThinking: true, toolsUsed: ['web_search'] });
  io.pushRuntimeState('response_generation', ['understanding', 'context_loading', 'data_fetching']);
  io.push({ type: 'content', content: publicWebAnswer });
  io.push({
    type: 'done',
    termination: 'server_done',
    result: {
      answer: publicWebAnswer,
      response_contract: responseContract,
      semantic_result: semanticResult,
      business_summary: publicWebBusinessSummary,
      workflow_result: workflowResult,
      message_contract: messageContract,
      runtime_state: runtimeState,
      answer_policy: answerPolicy,
      structured_payload: {
        source_refs: publicWebResult.sourceRefs,
      },
    },
    metadata: {
      process_events: processEvents,
      routing_decision_observation: routeObservation,
      project_context_summary: projectContextSummary,
      compiled_context: compiledContext,
      prompt_config: promptConfigMetadata,
      runtime_state: runtimeState,
      workflow_result: workflowResult,
      message_contract: messageContract,
      response_contract: responseContract,
      semantic_result: semanticResult,
      business_summary: publicWebBusinessSummary,
      trace_meta: traceMeta,
      trace_url: traceMeta?.trace_url,
      thread_id: conversationId,
      message_id: traceId,
      turn_id: traceId,
      message_runtime_projection: runtimeProjection,
      source_refs: publicWebResult.sourceRefs,
      info_source_arbitration: routeInformationSourceArbitration,
    },
  });
  io.close();
  return { terminal: true };
}
