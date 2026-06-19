/**
 * Report Query Stage
 *
 * 搬迁自 route.ts L1810-3024。
 * 处理报表查询（report_query）意图的完整执行链路。
 * 包含鉴权检查、能力选择、多阶段模型节点、MCP 执行、结果组装与 SSE 输出。
 */

import type { StreamIO, ChatPipelineContext, ChatPipelineResult } from './pipeline-types';
import { createRuntimeState, defaultAnswerPolicy } from '@/lib/chat-runtime/runtime-state';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { compactCapabilityDecision, compactRuntimePayload, isRecord } from '@/lib/chat-runtime/payload-compact';
import { buildReportQueryInput } from '@/lib/chat-runtime/report-query-input';
import { buildEntityResolutionActions, compactToolChain, shouldExposeToolChainStep, toolChainStepLabel, workflowStepsFromToolChain } from '@/lib/chat-runtime/tool-chain-projection';
import { buildAnswerOrigin, buildMessageRuntimeProjection, normalizeSemanticResultForPresentation, readBusinessSummary } from '@/lib/chat-runtime/message-runtime-projection';
import { selectCapabilityForRequirement } from '@/lib/capability-orchestration';
import { type ReportQueryResult, type CapabilityUnderstanding } from '@/lib/report-query-orchestrator';
import { decodeReportActionEnvelope } from '@/lib/report-action-envelope';
import { getEntityResolutionAliasMaps, loadEntityResolutionConfigSync } from '@/lib/entity-resolution-config-store';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import { buildResponseContract } from '@/lib/response-contract';
import {
  buildRouteDecisionObservation,
  isRouteDecisionObservationEnabled,
} from '@/lib/route-decision-observation';
import { compactReportResult, compactSemanticResult } from '@/lib/semantic-result-compaction';
import { buildCapabilityGapSemanticResult } from '@/lib/capability-gap-result';
import { buildSemanticMessageContract, buildSemanticWorkflowResult } from '@/contracts/result-assembly/semantic-result-assembly';
import { buildTraceUrl } from '@/lib/trace';
import { upsertEntitySelectionPreference } from '@/lib/user-memory-store';
import {
  appendWorkflowTaskResult,
  createWorkflowTask,
  patchWorkflowTask,
  startWorkflowRun,
  updateWorkflowRun,
} from '@/lib/workflow-task-store';
import type { AnswerPolicy, MessageContract, ModelParticipationRecord, RuntimeState } from '@/types';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import { emitChatMessageTrace } from '@/app/api/chat/chat-trace';
import { runIntentOrchEnhancement } from '@/lib/intent-orch-enhancer';
import { buildInformationSourceArbitration } from '@/lib/information-source-arbitration';
import { mergeRequirementWeakSignal, type RequirementWeakSignalMergeAudit } from '@/lib/request-understanding-merge';
import {
  buildRouteObservationEvent,
  emitPlannerShadowObservationIfEnabled,
} from '@/lib/runner-stages/route-helpers';
import { summarizeOpenAnswerIntentOrchCandidate } from '@/lib/runner-stages/planning-helpers';
import {
  buildOpenAnswerPlannerProjection,
  buildOpenAnswerPlanningMetadata,
  summarizeIntentOrchCandidate,
  type OpenAnswerRouteCandidate,
} from '@/lib/open-answer-planner-context';
import {
  createReportFailureCase,
  executeReportQueryStepWithTrace,
} from '@/lib/runner-stages/execution-helpers';
import {
  runReportModelNode,
  modelParticipationFromRuntime,
  buildModelParticipationObservation,
} from '@/lib/runner-stages/assembly-helpers';
import { getModelServiceConfig } from '@/lib/runtime-config';
import { type ModelUseCaseRuntimeResult } from '@/lib/model-use-case-runtime';
import { recordEvidence } from '@/lib/evidence-ledger';
import { transitionCaseFrameStage, addEvidenceRef } from '@/lib/case-frame-helpers';

export async function executeReportQueryStage(
  ctx: ChatPipelineContext,
  io: StreamIO,
  intentRoutingPreAssist?: Awaited<ReturnType<typeof runReportModelNode>>,
): Promise<ChatPipelineResult> {
  const {
    route,
    message,
    question,
    traceId,
    conversationId,
    startedAt,
    userScopeKey,
    compiledContext,
    projectContextSummary,
    userRequirement,
    userScope,
    body,
    matchedRouteRules,
    reportRouteMatch,
    capabilityReportMatch,
    reportContinuation,
    routeWarnings,
    promptConfigMetadata,
    promptRuntimePolicy,
    routeInformationSourceArbitration,
    routeServers,
    routeCapabilityManifest,
    routeCapabilityCandidates,
    routeServiceIntent,
    publicWebNeed,
    routeDecisionMetadata,
    skillSelection,
    caseFrame,
  } = ctx;

  const isReportQuery = true;

  // ─── CaseFrame 状态更新：进入执行阶段 ───
  if (caseFrame) {
    await transitionCaseFrameStage(userScopeKey, caseFrame, 'executing', {
      stage_label: '报表查询执行',
      started_at: new Date().toISOString(),
    });
  }

  io.pushRuntimeState('data_fetching', ['understanding', 'context_loading']);

  // ─── Auth check ───
  if (!userScope) {
    const authRequiredAnswer = '需要登录后才能查询内部报表数据。请在当前浏览器完成登录后重试，我会按你的项目权限继续查询。';
    io.pushEvent(createProcessEvent({
      type: 'context.prepared',
      label: '检查查询权限',
      status: 'error',
      summary: '内部报表查询需要有效登录态。',
      intent_type: 'report_query',
      agent: 'report',
      output: {
        reason: 'auth_required_for_internal_report_query',
        route: routeDecisionMetadata,
      },
    }));
    io.push({ type: 'content', content: authRequiredAnswer });
    const blockedRuntimeState = createRuntimeState(startedAt, 'completed', ['understanding', 'context_loading'], 'blocked');
    const responseContract = buildResponseContract({
      status: 'blocked',
      intentType: 'report_query',
      traceId,
      answer: authRequiredAnswer,
      processEvents: io.getProcessEvents(),
      metadata: {
        reason: 'auth_required_for_internal_report_query',
        info_source_arbitration: routeInformationSourceArbitration,
      },
    });
    const traceMeta = await emitChatMessageTrace({
      traceId,
      message,
      conversationId,
      threadId: conversationId,
      messageId: traceId,
      turnId: traceId,
      intentType: 'report_query',
      status: 'auth_required',
    });
    io.push({
      type: 'done',
      result: {
        answer: authRequiredAnswer,
        response_contract: responseContract,
      },
      metadata: {
        process_events: io.getProcessEvents(),
        routing_decision_observation: null,
        info_source_arbitration: routeInformationSourceArbitration,
        prompt_config: promptConfigMetadata,
        runtime_state: blockedRuntimeState,
        response_contract: responseContract,
        trace_meta: traceMeta,
        thread_id: conversationId,
        message_id: traceId,
        turn_id: traceId,
        trace_url: traceMeta?.trace_url,
      },
    });
    io.close();
    return { terminal: true, content: authRequiredAnswer };
  }

  // ─── Capability selection ───
  const servers = routeServers;
  const capabilityManifest = routeCapabilityManifest;
  const capabilityDecision = selectCapabilityForRequirement(userRequirement, capabilityManifest);
  const routePreferredReportCapability = routeCapabilityCandidates.find(candidate =>
    candidate.capability.capabilityType === 'data.report'
    && candidate.capability.supportedServiceIntents?.some((intent: string) => intent === 'report_delivery' || intent === 'data_query')
  )?.capability;
  const routePreferredReportCandidate = routePreferredReportCapability
    ? capabilityDecision.candidates.find(candidate => candidate.capability.capabilityId === routePreferredReportCapability.capabilityId)
    : undefined;
  const canUseRoutePreferredReportCapability = Boolean(routePreferredReportCapability && routePreferredReportCandidate?.dataCoverage?.covered);
  let executionCapabilityDecision = routePreferredReportCapability && canUseRoutePreferredReportCapability
    ? {
      ...capabilityDecision,
      selected: routePreferredReportCapability,
      fallbackUsed: false,
      fallbackReason: undefined,
      executionDecision: 'executable' as const,
      warnings: capabilityDecision.selected?.capabilityId && capabilityDecision.selected.capabilityId !== routePreferredReportCapability.capabilityId
        ? [
          ...capabilityDecision.warnings,
          'Capability discovery selected ' + routePreferredReportCapability.source.toolName + ' as the tool-first candidate.',
        ]
        : capabilityDecision.warnings,
    }
    : capabilityDecision;

  const reportInformationSourceArbitration = buildInformationSourceArbitration({
    stage: 'execution_arbitration',
    isReportQuery: true,
    reportRouteMatch,
    capabilityReportMatch,
    publicWebNeed,
    knowledge: { status: 'not_collected_in_report_pre_execution', hitCount: 0 },
    hasProjectContext: Boolean(projectContextSummary || compiledContext.project.currentProject),
    hasMemoryOrHistoryContext: Boolean((body.history || []).length),
    capabilityDecision: executionCapabilityDecision,
  });

  const baseInput = buildReportQueryInput(message, compiledContext, userScopeKey);
  const task = await createWorkflowTask({
    conversation_id: conversationId,
    task_type: 'report_query',
    workflow_level: 'light',
    title: question.slice(0, 48) || '自然语言问数',
    summary: question,
    route_reason: route.reason,
    workflow_state: 'running',
  });
  const run = await startWorkflowRun({
    taskId: task.task_id,
    conversationId,
    intentType: 'report_query',
    workflowLevel: 'light',
    routeReason: route.reason,
    metadata: { question },
  });

  io.pushEvent(createProcessEvent({
    type: 'intent.detected',
    label: '识别问数意图',
    summary: route.reason || '进入自然语言问数链路。',
    intent_type: 'report_query',
    agent: 'report',
    output: { route },
  }));
  io.pushEvent(createProcessEvent({
    type: 'context.prepared',
    label: '准备查询上下文。',
    summary: '读取当前会话项目范围和可用报表工具。',
    intent_type: 'report_query',
    agent: 'report',
    input: baseInput,
    output: {
      enabled_server_count: servers.filter(item => item.enabled).length,
      slot_state: compiledContext.slotState,
      user_requirement: userRequirement,
      required_identifiers: userRequirement.requiredIdentifiers,
      capability_selected: capabilityDecision.selected?.capabilityId || null,
    },
  }));
  io.pushEvent(createProcessEvent({
    type: 'capability.checked',
    label: '检查可用能力。',
    summary: '已完成能力检查。',
    intent_type: 'report_query',
    agent: 'report',
    input: { requirement: userRequirement },
    output: {
      selected_capability_id: executionCapabilityDecision.selected?.capabilityId,
      selected_tool_name: executionCapabilityDecision.selected?.source.toolName,
      execution_decision: executionCapabilityDecision.executionDecision,
      data_coverage: executionCapabilityDecision.dataCoverage,
      presentation_coverage: executionCapabilityDecision.presentationCoverage,
      blocking_reason: executionCapabilityDecision.blockingReason,
      fallback_used: executionCapabilityDecision.fallbackUsed,
      fallback_reason: executionCapabilityDecision.fallbackReason,
      warnings: executionCapabilityDecision.warnings,
      candidate_count: executionCapabilityDecision.candidates.length,
      coverage_matrix: executionCapabilityDecision.candidates.slice(0, 20).map(candidate => ({
        tool_name: candidate.capability.source.toolName,
        capability_id: candidate.capability.capabilityId,
        data_coverage_score: candidate.dataCoverage?.score,
        data_support_level: candidate.dataCoverage?.supportLevel,
        data_missing: candidate.dataCoverage?.missing,
        presentation_missing: candidate.presentationCoverage?.missing,
        validation_required: candidate.dataCoverage?.validationRequired,
        missing_mappings: candidate.dataCoverage?.missingMappings,
        is_executable: Boolean(candidate.dataCoverage?.covered),
      })),
    },
  }));
  io.pushEvent(createProcessEvent({
    type: 'planner.arbitrated',
    label: '信息源仲裁',
    summary: publicWebNeed.required
      ? '公开信息需求已记录为候选，内部数据能力按优先级执行。'
      : '内部数据能力优先作为问数证据来源。',
    status: 'success',
    visibility: 'internal',
    intent_type: 'report_query',
    agent: 'report',
    output: reportInformationSourceArbitration,
  }));

  const executionContract = {
    request_id: traceId,
    requires_execution: isReportQuery,
    execution_confidence: route.executionConfidence,
    route_intent: route.intent_type,
    route_reason: route.reason,
    expected_capability_id: executionCapabilityDecision.selected?.capabilityId,
    expected_tool_name: executionCapabilityDecision.selected?.source?.toolName,
  };
  const reportRouteDecisionMetadata = {
    ...routeDecisionMetadata,
    capabilityDecision: {
      selectedCapabilityId: executionCapabilityDecision.selected?.capabilityId || null,
      selectedToolName: executionCapabilityDecision.selected?.source.toolName || null,
      executionDecision: executionCapabilityDecision.executionDecision,
      dataCoverage: executionCapabilityDecision.dataCoverage,
      presentationCoverage: executionCapabilityDecision.presentationCoverage,
      blockingReason: executionCapabilityDecision.blockingReason || null,
      fallbackUsed: executionCapabilityDecision.fallbackUsed,
      fallbackReason: executionCapabilityDecision.fallbackReason || null,
      warnings: executionCapabilityDecision.warnings,
      candidateCount: executionCapabilityDecision.candidates.length,
    },
    warnings: [...new Set([...routeDecisionMetadata.warnings, ...executionCapabilityDecision.warnings])],
  };
  io.pushEvent(createProcessEvent({
    type: 'skill.started',
    label: '编排报表查询',
    summary: '按查询策略选择数据能力，补齐必要字段并执行媒体、终端等匹配。',
    intent_type: 'report_query',
    agent: 'report',
  }));

  // ─── Entity selection preference ───
  const structuredAction = decodeReportActionEnvelope(message);
  const actionParams = structuredAction?.params || {};
  if (
    structuredAction?.action === 'select_entity_candidate'
    && userScopeKey
    && typeof actionParams.entityType === 'string'
    && typeof actionParams.candidateId === 'string'
  ) {
    await upsertEntitySelectionPreference({
      userId: userScopeKey,
      entityType: actionParams.entityType as Parameters<typeof upsertEntitySelectionPreference>[0]['entityType'],
      identifierKey: typeof actionParams.identifierKey === 'string'
        ? actionParams.identifierKey as Parameters<typeof upsertEntitySelectionPreference>[0]['identifierKey']
        : undefined,
      candidateId: actionParams.candidateId,
      candidateName: typeof actionParams.candidateName === 'string' ? actionParams.candidateName : undefined,
      rawText: typeof actionParams.original_message === 'string' ? actionParams.original_message : question,
      sourceConversationId: conversationId,
    });
  }

  // ─── Model nodes (multi-stage) ───
  const reportModelServiceConfig = await getModelServiceConfig();
  let reportStep!: Awaited<ReturnType<typeof executeReportQueryStepWithTrace>>;
  let reportEvidenceRefs: string[] = [];
  let queryContractAssist!: Awaited<ReturnType<typeof runReportModelNode>>;
  let entityExtractionAssist!: Awaited<ReturnType<typeof runReportModelNode>>;
  let ambiguityReview!: Awaited<ReturnType<typeof runReportModelNode>>;
  let disambiguationReview!: Awaited<ReturnType<typeof runReportModelNode>>;
  let capabilityReview!: Awaited<ReturnType<typeof runReportModelNode>>;
  let capabilityDiscoveryAssist!: Awaited<ReturnType<typeof runReportModelNode>>;
  let reportPlanningMetadata!: ReturnType<typeof buildOpenAnswerPlanningMetadata>;
  let llmUnderstandings: CapabilityUnderstanding[] = [];
  let toolSelectionReviewAssist!: Awaited<ReturnType<typeof runReportModelNode>>;
  let requestUnderstandingMerge: RequirementWeakSignalMergeAudit = { applied: [], rejected: [] };
  let multiTurnMerge: RequirementWeakSignalMergeAudit = { applied: [], rejected: [] };

  // Stage 2: 意图理解 — request_understanding
  const requestUnderstandingAssist = await runReportModelNode({
    useCase: 'request_understanding',
    fallbackText: '',
    modelServiceConfig: reportModelServiceConfig,
    input: {
      message,
      userRequirement,
      ruleBasedRouteDecision: {
        intent_type: route.intent_type,
        confidence: route.confidence,
        reason: route.reason,
        requiresExecution: route.requiresExecution,
      },
      matchedRouteRules: matchedRouteRules.slice(0, 3).map((r: any) => ({ name: r.rule.name, intent: r.rule.intent_type, score: r.score })),
      history: (body.history || []).slice(-5).map((h: { role: string; content: string }) => ({ role: h.role, content: h.content?.slice(0, 200) })),
      projectContext: compiledContext.businessContext,
    },
    consume: { enabled: true, consumedBy: 'request_understanding_correction', consumedFields: ['corrections'] },
    traceMeta: { node: 'request_understanding', phase: 'pre_resolver' },
  });

  const understandingCorrections = requestUnderstandingAssist.output && typeof requestUnderstandingAssist.output === 'object'
    ? (requestUnderstandingAssist.output as { corrections?: { metrics?: unknown; dimensions?: unknown; dateRange?: unknown; task?: unknown } })
    : null;
  if (understandingCorrections?.corrections) {
    requestUnderstandingMerge = mergeRequirementWeakSignal(userRequirement, understandingCorrections.corrections, 'request_understanding');
  }

  // Stage 7: 多轮状态 — trace_summary
  const multiTurnStateAssist = await runReportModelNode({
    useCase: 'trace_summary',
    fallbackText: '',
    modelServiceConfig: reportModelServiceConfig,
    input: {
      message,
      history: (body.history || []).slice(-5).map((h: { role: string; content: string }) => ({ role: h.role, content: h.content?.slice(0, 200) })),
      slotState: compiledContext.slotState,
      latestResultType: compiledContext.businessContext?.latestResult?.resultType,
      requestUnderstanding: requestUnderstandingAssist.output,
      currentRequirement: {
        metrics: userRequirement.metrics,
        dimensions: userRequirement.dimensions.map((d: any) => d.key),
        dateRange: userRequirement.dateRange,
        task: userRequirement.task,
      },
    },
    consume: { enabled: true, consumedBy: 'multi_turn_state_merge', consumedFields: ['inheritedSlots', 'modification'] },
    traceMeta: { node: 'trace_summary', phase: 'context_compilation' },
  });

  const multiTurnInherited = multiTurnStateAssist.output && typeof multiTurnStateAssist.output === 'object'
    ? (multiTurnStateAssist.output as { inheritedSlots?: { metrics?: unknown; dimensions?: unknown; dateRange?: unknown; entities?: unknown }; modification?: string })
    : null;
  if (multiTurnInherited?.inheritedSlots) {
    multiTurnMerge = mergeRequirementWeakSignal(userRequirement, multiTurnInherited.inheritedSlots, 'multi_turn_state');
  }
  const weakSignalAppliedCount = requestUnderstandingMerge.applied.length + multiTurnMerge.applied.length;
  const weakSignalRejectedCount = requestUnderstandingMerge.rejected.length + multiTurnMerge.rejected.length;
  if (weakSignalAppliedCount || weakSignalRejectedCount) {
    io.pushEvent(createProcessEvent({
      type: 'model.step',
      label: '合并模型弱信号',
      summary: `采纳 ${weakSignalAppliedCount} 项，拒绝 ${weakSignalRejectedCount} 项。`,
      status: 'success',
      intent_type: 'report_query',
      agent: 'report',
      output: {
        request_understanding: requestUnderstandingMerge,
        multi_turn_state: multiTurnMerge,
      },
      visibility: 'internal',
    }));
  }

  // ─── MCP retry loop ───
  const MCP_RETRY_MAX = 3;
  for (let mcpAttempt = 0; mcpAttempt < MCP_RETRY_MAX; mcpAttempt++) {
    queryContractAssist = await runReportModelNode({
      useCase: 'query_contract_building',
      fallbackText: '',
      modelServiceConfig: reportModelServiceConfig,
      input: {
        message,
        userRequirement,
        route: reportRouteDecisionMetadata,
        multiTurnContext: multiTurnInherited,
      },
      consume: {
        enabled: true,
        consumedBy: 'resolver_candidate_lane',
        consumedFields: ['semanticCandidateSet'],
      },
      traceMeta: { node: 'query_contract_building', phase: 'pre_resolver' },
    });
    entityExtractionAssist = await runReportModelNode({
      useCase: 'entity_candidate_extraction',
      fallbackText: '',
      modelServiceConfig: reportModelServiceConfig,
      input: {
        message,
        userRequirement,
        multiTurnContext: multiTurnInherited,
        currentProject: compiledContext.businessContext?.app || compiledContext.businessContext?.project || null,
        entityAliasMaps: getEntityResolutionAliasMaps(loadEntityResolutionConfigSync()),
        availableEntityTypes: executionCapabilityDecision.selected?.supports?.identifierTypes || [],
      },
      consume: {
        enabled: true,
        consumedBy: 'resolver_candidate_lane',
        consumedFields: ['entityCandidateSet'],
      },
      traceMeta: { node: 'entity_candidate_extraction', phase: 'pre_resolver' },
    });

    [ambiguityReview, disambiguationReview, capabilityReview] = await Promise.all([
      runReportModelNode({
        useCase: 'ambiguity_detection',
        fallbackText: '',
        modelServiceConfig: reportModelServiceConfig,
        input: {
          message,
          userRequirement,
          resolvedFilters: queryContractAssist.output,
          entityCandidates: entityExtractionAssist.output,
        },
        consume: { enabled: false, consumedBy: 'ambiguity_review_lane' },
        traceMeta: { node: 'ambiguity_detection', phase: 'pre_execution' },
      }),
      runReportModelNode({
        useCase: 'resolver_disambiguation_review',
        fallbackText: '',
        modelServiceConfig: reportModelServiceConfig,
        input: {
          message,
          entityCandidates: entityExtractionAssist.output,
          semanticCandidates: queryContractAssist.output,
        },
        consume: { enabled: false, consumedBy: 'disambiguation_review_lane' },
        traceMeta: { node: 'resolver_disambiguation_review', phase: 'pre_execution' },
      }),
      runReportModelNode({
        useCase: 'capability_ranking_review',
        fallbackText: '',
        modelServiceConfig: reportModelServiceConfig,
        input: {
          message,
          capabilityDecision: {
            selected: executionCapabilityDecision.selected?.capabilityId,
            candidates: executionCapabilityDecision.candidates.slice(0, 5).map((c: any) => c.capability.capabilityId),
            dataCoverage: executionCapabilityDecision.dataCoverage,
          },
        },
        consume: { enabled: false, consumedBy: 'capability_review_lane' },
        traceMeta: { node: 'capability_ranking_review', phase: 'pre_execution' },
      }),
    ]);

    // IntentOrch 候选规划
    const intentOrchResult = await runIntentOrchEnhancement({
      message,
      userRequirement: {
        metrics: userRequirement.metrics,
        dimensions: userRequirement.dimensions,
        dateRange: userRequirement.dateRange,
        task: userRequirement.task,
      },
      routeIntent: route.intent_type,
      conversationHistory: (body.history || []).slice(-5).map((h: { role: string; content: string }) => ({ role: h.role, content: h.content })),
    });
    const reportIntentOrchCandidate = summarizeIntentOrchCandidate(intentOrchResult);
    const reportRouteCandidate: OpenAnswerRouteCandidate = {
      source: 'request_understanding',
      intent_type: 'report_query',
      confidence: route.confidence,
      service_intent: routeDecisionMetadata.serviceIntent,
      reason: (route.reason || '').slice(0, 220),
    };
    const reportPlannerProjection = buildOpenAnswerPlannerProjection({
      routeCandidate: reportRouteCandidate,
      intentOrchCandidate: reportIntentOrchCandidate,
      knowledge: { hitCount: 0, status: 'not_collected_in_report_pre_execution' },
      hasProjectContext: Boolean(projectContextSummary || compiledContext.project.currentProject),
      hasMemoryContext: Boolean((body.history || []).length),
    });
    reportPlanningMetadata = buildOpenAnswerPlanningMetadata({
      plannerCandidates: reportPlannerProjection.plannerCandidates,
      arbitrationSummary: reportPlannerProjection.arbitrationSummary,
    });
    if (reportIntentOrchCandidate.status !== 'disabled') {
      io.pushEvent(createProcessEvent({
        type: 'intent_orch.candidate',
        label: 'IntentOrch 候选',
        summary: summarizeOpenAnswerIntentOrchCandidate(reportIntentOrchCandidate),
        status: reportIntentOrchCandidate.status === 'success' ? 'success' : 'rejected',
        visibility: 'internal',
        duration_ms: reportIntentOrchCandidate.duration_ms,
        output: {
          candidate: reportIntentOrchCandidate,
          arbitration_summary: reportPlannerProjection.arbitrationSummary,
        },
      }));
    }

    // Stage 3: 能力发现 — capability_discovery
    const toolDigests = capabilityManifest.map((cap: any) => ({
      capability_id: cap.capabilityId,
      tool_name: cap.source.toolName,
      server_name: cap.source.serverId || '',
      description: cap.description || '',
      required_fields: cap.requiredInputs || [],
      optional_fields: cap.optionalInputs || [],
      supported_identifiers: cap.supports?.identifierTypes || [],
    }));
    capabilityDiscoveryAssist = await runReportModelNode({
      useCase: 'capability_discovery',
      fallbackText: '',
      modelServiceConfig: reportModelServiceConfig,
      input: {
        message,
        userRequirement,
        tools: toolDigests,
        entityCandidates: entityExtractionAssist.output,
        semanticCandidates: queryContractAssist.output,
        identifyDependencies: true,
        intentorch_candidate: reportIntentOrchCandidate,
        planner_candidates: reportPlannerProjection.plannerCandidates,
        arbitration_summary: reportPlannerProjection.arbitrationSummary,
      },
      consume: { enabled: true, consumedBy: 'capability_discovery_and_orchestration', consumedFields: ['relevance', 'dependencies'] },
      traceMeta: { node: 'capability_discovery', phase: 'pre_execution' },
    });
    llmUnderstandings = Array.isArray(capabilityDiscoveryAssist.output)
      ? capabilityDiscoveryAssist.output
      : [];

    // Stage 4/8: 工具消歧
    const topCandidates = executionCapabilityDecision.candidates.slice(0, 5);
    const needsDisambiguation = topCandidates.length >= 2
      && topCandidates[0].score > 0
      && topCandidates[1].score > 0
      && (topCandidates[0].score - topCandidates[1].score) < 30;

    toolSelectionReviewAssist = await runReportModelNode({
      useCase: 'tool_selection_review',
      fallbackText: '',
      modelServiceConfig: reportModelServiceConfig,
      input: {
        message,
        userRequirement,
        capabilitySelected: executionCapabilityDecision.selected?.capabilityId,
        toolName: executionCapabilityDecision.selected?.source?.toolName,
        candidates: topCandidates.map((c: any) => ({
          capabilityId: c.capability.capabilityId,
          toolName: c.capability.source.toolName,
          description: c.capability.description,
          score: c.score,
          dataCoverageScore: c.dataCoverage?.score,
          reasons: c.reasons?.slice(0, 5),
        })),
        parameterHints: capabilityDiscoveryAssist.output,
        currentProject: compiledContext.businessContext?.app || compiledContext.businessContext?.project || null,
      },
      consume: { enabled: needsDisambiguation, consumedBy: 'tool_disambiguation_decision', consumedFields: ['selectedToolName'] },
      traceMeta: { node: 'tool_selection_review', phase: 'pre_execution', needsDisambiguation },
      skipReason: needsDisambiguation ? undefined : 'single_dominant_candidate',
    });

    if (needsDisambiguation && toolSelectionReviewAssist.output && typeof toolSelectionReviewAssist.output === 'object') {
      const llmSelection = toolSelectionReviewAssist.output as { selectedToolName?: string };
      if (llmSelection.selectedToolName && llmSelection.selectedToolName !== executionCapabilityDecision.selected?.source?.toolName) {
        const llmCandidate = topCandidates.find(
          (c: any) => c.capability.source.toolName === llmSelection.selectedToolName,
        );
        const topScore = topCandidates[0]?.score || 0;
        const candidateScore = llmCandidate?.score || 0;
        const canAcceptLlmSelection = Boolean(
          llmCandidate
          && candidateScore > 0
          && (topScore - candidateScore) < 30
          && llmCandidate.dataCoverage?.covered === true,
        );
        if (llmCandidate && canAcceptLlmSelection) {
          executionCapabilityDecision = {
            ...executionCapabilityDecision,
            selected: llmCandidate.capability,
            fallbackUsed: false,
            warnings: [
              ...executionCapabilityDecision.warnings,
              `工具消歧：模型在受控候选内选择 ${llmSelection.selectedToolName}，替代原评分结果。`,
            ],
          };
        } else if (llmSelection.selectedToolName) {
          executionCapabilityDecision = {
            ...executionCapabilityDecision,
            warnings: [
              ...executionCapabilityDecision.warnings,
              `工具消歧已忽略模型选择 ${llmSelection.selectedToolName}，原因是候选不在受控近分或覆盖满足范围内。`,
            ],
          };
        }
      }
    }

    reportStep = await executeReportQueryStepWithTrace({
      servers,
      message,
      question,
      baseInput: {
        ...baseInput,
        __modelCandidateSets: {
          semanticCandidateSet: queryContractAssist.output,
          entityCandidateSet: entityExtractionAssist.output,
        },
        __reviewHints: {
          ambiguity: ambiguityReview.output,
          disambiguation: disambiguationReview.output,
          capabilityRanking: capabilityReview.output,
        },
      },
      userScopeKey,
      capabilityDecision: executionCapabilityDecision,
      llmUnderstandings,
      conversationId,
      taskId: task.task_id,
      runId: run.run_id,
      routeReason: route.reason,
      traceId,
      executionContract,
    });

    // Evidence ledger — tool result
    const updatedLedger = recordEvidence(io.getEvidenceLedger(), {
      source: 'tool_result',
      sourceId: reportStep.selection_trace?.selected_tool || 'report_query',
      confidence: reportStep.status === 'success' ? 'confirmed_fact' : reportStep.status === 'empty' ? 'confirmed_fact' : 'high_probability',
      content: {
        status: reportStep.status,
        tool_name: reportStep.selection_trace?.selected_tool,
        server_name: reportStep.selection_trace?.selected_server,
        row_count: reportStep.report_query_result?.rows?.length || 0,
        quality_check_ok: reportStep.report_query_result?.quality_check?.ok,
      },
    });
    io.setEvidenceLedger(updatedLedger);
    const latestEvidenceId = updatedLedger.entries[updatedLedger.entries.length - 1]?.id;
    if (latestEvidenceId) {
      reportEvidenceRefs = Array.from(new Set([...reportEvidenceRefs, latestEvidenceId]));
    }

    // ─── CaseFrame 证据引用 ───
    if (caseFrame && latestEvidenceId) {
      await addEvidenceRef(userScopeKey, caseFrame, latestEvidenceId);
    }

    const isRetryableMcpFailure = reportStep.status === 'failed'
      && reportStep.tool_execution_status === 'called_failed'
      && (reportStep.call_result?.retry === true || reportStep.call_result?.canRetryWithSameTool === true)
      && mcpAttempt < MCP_RETRY_MAX - 1;
    if (!isRetryableMcpFailure) break;

    // Failure analysis
    const failureAnalysis = await runReportModelNode({
      useCase: 'operation_risk_review',
      fallbackText: '',
      modelServiceConfig: reportModelServiceConfig,
      input: {
        message,
        failureReason: reportStep.call_result?.msg || 'MCP tool call failed',
        attempt: mcpAttempt + 1,
        maxAttempts: MCP_RETRY_MAX,
        toolChain: compactToolChain(reportStep.tool_chain),
        userRequirement,
        selectedTool: executionCapabilityDecision.selected?.source?.toolName,
      },
      consume: { enabled: false, consumedBy: 'failure_explanation_only', consumedFields: ['reason', 'risk', 'userMessage'] },
      traceMeta: { node: 'operation_risk_review', phase: 'failure_handling', attempt: mcpAttempt + 1 },
    });

    const failureExplanation = failureAnalysis.output && typeof failureAnalysis.output === 'object'
      ? failureAnalysis.output
      : null;

    io.pushEvent(createProcessEvent({
      type: 'mcp.tool_error',
      label: 'MCP 调用失败，按原工具重试',
      status: 'error',
      summary: String(isRecord(failureExplanation) && typeof failureExplanation.reason === 'string'
        ? failureExplanation.reason
        : reportStep.call_result?.msg || 'MCP 工具调用失败'),
      intent_type: 'report_query',
      agent: 'report',
    }));
  }

  // ─── Post-execution ───
  const steps = workflowStepsFromToolChain(reportStep.tool_chain);
  await updateWorkflowRun(task.task_id, run.run_id, {
    status: reportStep.status === 'success' || reportStep.status === 'empty' ? 'completed' : reportStep.status === 'missing_input' ? 'blocked' : 'failed',
    state: reportStep.status,
    steps,
    metadata: {
      question,
      selection_trace: reportStep.selection_trace,
      tool_chain: compactToolChain(reportStep.tool_chain),
    },
  });

  for (const item of reportStep.tool_chain) {
    if (!shouldExposeToolChainStep(item)) continue;
    const isTool = item.tool_name || item.key === 'business_report';
    const fallbackEventType = item.key.startsWith('fallback_attempt:')
      ? 'fallback_attempt'
      : item.key.startsWith('fallback_skipped:')
        ? 'fallback_skipped'
        : item.key.startsWith('fallback_success:')
          ? 'fallback_success'
          : item.key.startsWith('fallback_failed:')
            ? 'fallback_failed'
            : undefined;
    io.pushEvent(createProcessEvent({
      type: fallbackEventType || (item.status === 'failed' ? 'mcp.tool_error' : isTool ? 'mcp.tool_result' : 'model.step'),
      label: toolChainStepLabel(item),
      status: item.status === 'failed' ? 'error' : item.status === 'skipped' ? 'waiting' : 'success',
      summary: item.message || String(item.server_name || '') + '.' + String(item.tool_name || ''),
      intent_type: 'report_query',
      agent: 'report',
      tool_name: item.tool_name || undefined,
      input: compactRuntimePayload(item.input, { depth: 3, maxString: 800, maxArray: 20, maxKeys: 30 }) as Record<string, unknown> | undefined,
      output: item.result && typeof item.result === 'object'
        ? compactRuntimePayload(item.result, { depth: 3, maxString: 800, maxArray: 20, maxKeys: 30 }) as Record<string, unknown>
        : undefined,
    }));
  }

  const result = reportStep.report_query_result;
  const compactResult = compactReportResult(result);
  const failureCaseId = await createReportFailureCase({
    message,
    conversationId,
    taskId: task.task_id,
    reportStep,
  });
  const capabilityGapResult = !result?.semantic_result && (
    executionCapabilityDecision.executionDecision === 'needs_clarification'
    || executionCapabilityDecision.executionDecision === 'no_executable_capability'
    || reportStep.status === 'missing_input'
    || reportStep.status === 'not_configured'
  )
    ? buildCapabilityGapSemanticResult({
      requirement: userRequirement,
      decision: executionCapabilityDecision,
      reportStep,
      conversationId,
      messageId: traceId,
    })
    : null;
  const semanticResult = normalizeSemanticResultForPresentation(result?.semantic_result || capabilityGapResult?.semanticResult || null);
  const compactSemantic = compactSemanticResult(semanticResult);
  const businessSummary = readBusinessSummary(semanticResult) || capabilityGapResult?.businessSummary;
  const selectedCapability = reportStep.selection_trace?.selected_tool
    ? executionCapabilityDecision.candidates.find((item: any) => item.capability.source.toolName === reportStep.selection_trace?.selected_tool)?.capability
    : undefined;
  const finalCapabilityDecision = selectedCapability
    ? {
      ...executionCapabilityDecision,
      selected: selectedCapability,
      fallbackUsed: false,
      fallbackReason: undefined,
      warnings: executionCapabilityDecision.selected?.capabilityId && executionCapabilityDecision.selected.capabilityId !== selectedCapability.capabilityId
        ? [
          ...executionCapabilityDecision.warnings,
          'Capability candidate ' + executionCapabilityDecision.selected.source.toolName + ' was corrected by report orchestration to ' + selectedCapability.source.toolName + '.',
        ]
        : executionCapabilityDecision.warnings,
    }
    : executionCapabilityDecision;
  const routeObservation = isRouteDecisionObservationEnabled()
    ? buildRouteDecisionObservation({
      decisionId: traceId + ':route-observation',
      traceId,
      message,
      clientIntent: ctx.clientIntent,
      routeIntent: route.intent_type,
      routeReason: route.reason,
      routeConfidence: route.confidence,
      resolvedIntent: reportRouteDecisionMetadata.resolvedIntent,
      matchedRules: matchedRouteRules,
      reportRouteMatch,
      reportContinuation,
      userRequirementTask: userRequirement.task,
      routeWarnings,
      selectedSkill: skillSelection.selected?.skill
        ? { skill_id: skillSelection.selected.skill.skill_id, name: skillSelection.selected.skill.name }
        : null,
      skillSelection,
      capabilityDecision: finalCapabilityDecision,
      promptConfig: promptConfigMetadata,
      isReportQuery,
      actualExecution: {
        actualIsReportQuery: true,
        actualSelectedSkill: skillSelection.selected?.skill.skill_id,
        actualSelectedTool: reportStep.selection_trace?.selected_tool,
        actualCapabilityId: selectedCapability?.capabilityId || finalCapabilityDecision.selected?.capabilityId,
        actualFallbackReason: finalCapabilityDecision.fallbackReason,
      },
    })
    : undefined;
  const semanticSummaryText = result?.semantic_result ? (businessSummary?.brief || businessSummary?.title) : undefined;
  const reportAnswerMarkdown = result?.business_summary_markdown
    || result?.answer_markdown
    || semanticSummaryText
    || result?.message
    || reportStep.message;
  let content = failureCaseId
    ? reportAnswerMarkdown + '\n\n已记录本次问题，执行详情中可查看 Case。'
    : reportAnswerMarkdown;

  // ─── Model participation ───
  const reportModelParticipation: ModelParticipationRecord[] = [
    requestUnderstandingAssist.participation,
    multiTurnStateAssist.participation,
    queryContractAssist.participation,
    entityExtractionAssist.participation,
    ambiguityReview.participation,
    disambiguationReview.participation,
    capabilityReview.participation,
    capabilityDiscoveryAssist.participation,
    toolSelectionReviewAssist.participation,
  ];
  const intentRoutingAssist = intentRoutingPreAssist;
  if (intentRoutingAssist) {
    reportModelParticipation.push(intentRoutingAssist.participation);
  }
  let reportSummaryAssist: ModelUseCaseRuntimeResult | undefined;
  let requiredInputAssist: ModelUseCaseRuntimeResult | undefined;
  if (reportStep.status === 'missing_input' || executionCapabilityDecision.executionDecision === 'needs_clarification') {
    const assist = await runReportModelNode({
      useCase: 'required_input_assist',
      fallbackText: content,
      modelServiceConfig: reportModelServiceConfig,
      input: {
        baseAnswer: content,
        missingFields: reportStep.missing_fields,
        blockingReason: executionCapabilityDecision.blockingReason,
        dataCoverage: executionCapabilityDecision.dataCoverage,
        requirement: userRequirement,
      },
      consume: {
        enabled: true,
        consumedBy: 'required_input_composer',
        textField: 'answerMarkdown',
        consumedFields: ['answerMarkdown'],
      },
      traceMeta: { intent: 'report_query', status: reportStep.status },
    });
    requiredInputAssist = assist;
    reportModelParticipation.push(...modelParticipationFromRuntime(requiredInputAssist));
    content = assist.text;
  } else if (reportStep.status === 'success' || reportStep.status === 'empty') {
    reportSummaryAssist = await runReportModelNode({
      useCase: 'report_summary',
      fallbackText: content,
      modelServiceConfig: reportModelServiceConfig,
      input: {
        baseAnswer: content,
        status: reportStep.status,
        serviceIntent: reportRouteDecisionMetadata.serviceIntent,
        metrics: userRequirement.metrics,
        dimensions: userRequirement.dimensions,
        dateRange: userRequirement.dateRange,
        businessSummary,
        semanticResult: compactSemantic,
        toolChain: compactToolChain(reportStep.tool_chain),
        result: compactResult,
      },
      consume: {
        enabled: true,
        consumedBy: 'report_answer_composer',
        textField: 'summary',
        consumedFields: ['summary'],
      },
      traceMeta: { intent: 'report_query', status: reportStep.status },
    });
    reportModelParticipation.push(...modelParticipationFromRuntime(reportSummaryAssist));
    content = reportSummaryAssist.text;
  }
  if (!requiredInputAssist) {
    reportModelParticipation.push(await buildModelParticipationObservation({
      useCase: 'required_input_assist',
      status: 'not_applicable',
      promptId: promptConfigMetadata.report_query_answer_prompt?.activePromptId || 'report_query_answer_prompt',
      promptSource: promptConfigMetadata.report_query_answer_prompt?.source,
      promptVersion: promptConfigMetadata.report_query_answer_prompt?.activePromptVersion,
      promptHash: promptConfigMetadata.report_query_answer_prompt?.contentHash,
      outputConsumedBy: 'report_query_branch',
      warnings: ['required_input_assist was skipped because this branch did not need clarification.'],
      modelServiceConfig: reportModelServiceConfig,
    }));
  }
  if (!reportSummaryAssist) {
    reportModelParticipation.push(await buildModelParticipationObservation({
      useCase: 'report_summary',
      status: 'not_applicable',
      promptId: promptConfigMetadata.report_query_answer_prompt?.activePromptId || 'report_query_answer_prompt',
      promptSource: promptConfigMetadata.report_query_answer_prompt?.source,
      promptVersion: promptConfigMetadata.report_query_answer_prompt?.activePromptVersion,
      promptHash: promptConfigMetadata.report_query_answer_prompt?.contentHash,
      outputConsumedBy: 'report_query_branch',
      warnings: ['report_summary was skipped because this branch did not have a successful or empty report result to summarize.'],
      modelServiceConfig: reportModelServiceConfig,
    }));
  }
  const hasDataToInterpret = reportStep.status === 'success' && compactResult && (
    (Array.isArray((compactResult as Record<string, unknown>).rows) && ((compactResult as Record<string, unknown>).rows as unknown[]).length > 0)
    || (Array.isArray((compactResult as Record<string, unknown>).data) && ((compactResult as Record<string, unknown>).data as unknown[]).length > 0)
    || compactSemantic
  );
  const dataInterpretationAssist = await runReportModelNode({
    useCase: 'data_result_interpretation',
    fallbackText: content,
    modelServiceConfig: reportModelServiceConfig,
    input: {
      baseAnswer: content,
      status: reportStep.status,
      metrics: userRequirement.metrics,
      dimensions: userRequirement.dimensions,
      dateRange: userRequirement.dateRange,
      semanticResult: compactSemantic,
      result: compactResult,
      toolChain: compactToolChain(reportStep.tool_chain),
    },
    consume: {
      enabled: true,
      consumedBy: 'data_interpretation_composer',
      textField: 'answerMarkdown',
      consumedFields: ['answerMarkdown'],
    },
    traceMeta: { intent: 'report_query', node: 'data_result_interpretation' },
    skipReason: hasDataToInterpret ? undefined : 'no_data_to_interpret',
  });
  reportModelParticipation.push(dataInterpretationAssist.participation);
  content = dataInterpretationAssist.text || content;

  const answerCompositionAssist = await runReportModelNode({
    useCase: 'answer_composition',
    fallbackText: content,
    modelServiceConfig: reportModelServiceConfig,
    input: {
      baseAnswer: content,
      message,
      status: reportStep.status,
      userRequirement,
      businessSummary,
      interpretation: dataInterpretationAssist.output,
      semanticResult: compactSemantic,
    },
    consume: {
      enabled: true,
      consumedBy: 'answer_composition_final',
      textField: 'answerMarkdown',
      consumedFields: ['answerMarkdown'],
    },
    traceMeta: { intent: 'report_query', node: 'answer_composition' },
  });
  reportModelParticipation.push(answerCompositionAssist.participation);
  content = answerCompositionAssist.text || content;

  // ─── Quality check event ───
  const resolutionActions = buildEntityResolutionActions({ originalMessage: question, reportStep });
  io.pushEvent(createProcessEvent({
    type: 'model.step',
    label: '检查数据质量：',
    status: result?.quality_check.ok === false ? 'waiting' : 'success',
    summary: result ? (result.quality_check.ok ? '未发现阻断问题。' : '存在需要注意的数据口径或匹配风险。') : reportStep.message,
    intent_type: 'report_query',
    agent: 'report',
    output: { quality_check: result?.quality_check, missing_fields: reportStep.missing_fields },
  }));
  if (routeObservation) io.pushEvent(buildRouteObservationEvent(routeObservation));
  await emitPlannerShadowObservationIfEnabled({
    message,
    history: body.history,
    pushEvent: io.pushEvent,
    route: { intent_type: route.intent_type, confidence: route.confidence, serviceIntent: routeServiceIntent },
    // Stage 2: shadow 结果入账 planner_inference evidence
    onShadowResult: (shadowResult) => {
      if (shadowResult.status === 'succeeded' && shadowResult.plan) {
        io.setEvidenceLedger(recordEvidence(io.getEvidenceLedger(), {
          source: 'planner_inference',
          sourceId: 'planner_shadow',
          confidence: 'high_probability',
          content: {
            status: shadowResult.status,
            task_type: shadowResult.plan.task_type,
            service_intent: shadowResult.plan.service_intent,
            confidence: shadowResult.plan.confidence,
            candidate_count: shadowResult.plan.candidate_capabilities?.length ?? 0,
          },
        }));
      }
    },
  });
  await io.endPlanningAndStartExecution();

  // ─── Semantic data visualization event ───
  if (result?.semantic_result) {
    const semanticRegions = Array.isArray(result.semantic_result.regions) ? result.semantic_result.regions : [];
    const semanticRegion = semanticRegions.find((item: any) => item.componentBinding === 'data-visualization' && item.data && typeof item.data === 'object');
    const semanticData = semanticRegion?.data && typeof semanticRegion.data === 'object'
      ? semanticRegion.data as Record<string, unknown>
      : null;
    const componentKind = String(semanticData?.chartType || semanticData?.viewType || '').toLowerCase() === 'table' ? 'table' : 'chart';
    io.pushEvent(createProcessEvent({
      type: 'ui.component_rendered',
      label: componentKind === 'chart' ? '生成趋势图：' : '生成数据表：',
      summary: componentKind === 'chart' ? '已生成可视化趋势结果。' : '已生成结构化数据表。',
      intent_type: 'report_query',
      agent: 'report',
      ui_component: { type: 'data_preview', title: '问数结果', payload: { semantic_result: compactSemanticResult(result.semantic_result) } },
    }));
  }

  // ─── SSE output ───
  io.push({ type: 'route', intent: 'report_query', hasThinking: true, toolsUsed: reportStep.tool_chain.map((item: any) => item.tool_name).filter(Boolean) });
  io.push({ type: 'phase', phase: 'generating' });
  io.pushRuntimeState('response_generation', ['understanding', 'context_loading', 'data_fetching', 'analysis']);
  io.push({ type: 'content', content });

  io.pushRuntimeState('analysis', ['understanding', 'context_loading', 'data_fetching']);
  const finalRuntimeState = createRuntimeState(
    startedAt,
    'completed',
    ['understanding', 'context_loading', 'data_fetching', 'analysis', 'response_generation'],
    result?.status === 'success' || result?.status === 'empty' ? 'completed' : 'degraded',
  );
  const answerPolicy: AnswerPolicy = {
    ...defaultAnswerPolicy(),
    evidence_visibility: promptRuntimePolicy.evidenceInDetails ? 'hidden' : 'summary',
  };
  const executionContext = {
    report_query: baseInput,
    resolved_filters: reportStep.resolved_filters,
    preflight: reportStep.preflight,
  };
  const agentRuntime = {
    trace_id: traceId,
    task_id: task.task_id,
    run_id: run.run_id,
    prompt_config: promptConfigMetadata,
    prompt_runtime_policy: promptRuntimePolicy,
  };
  const reasoningArtifacts = {
    routing_decision: reportRouteDecisionMetadata,
    routing_decision_observation: routeObservation,
    info_source_arbitration: reportInformationSourceArbitration,
    planner_candidates: reportPlanningMetadata.planner_candidates,
    arbitration_summary: reportPlanningMetadata.arbitration_summary,
    user_requirement: userRequirement,
    capability_decision: compactCapabilityDecision(finalCapabilityDecision),
    selection_trace: compactRuntimePayload(reportStep.selection_trace, { depth: 3, maxString: 800, maxArray: 8, maxKeys: 30 }),
  };
  const compactExecutionContext = compactRuntimePayload(executionContext, { depth: 4, maxString: 1000, maxArray: 12, maxKeys: 35 }) as MessageContract['execution_context'];
  const messageContract: MessageContract = buildSemanticMessageContract({
    type: 'report_query',
    answerMarkdown: content,
    businessSummary,
    semanticResult: compactSemantic as SemanticResultContract | null,
    runtimeState: finalRuntimeState,
    answerPolicy,
    nextActions: resolutionActions,
    evidenceBundle: {
      sources: [],
      execution_context: compactExecutionContext,
      tool_calls: compactToolChain(reportStep.tool_chain),
      raw_result: compactResult,
      prompt_config: promptConfigMetadata,
      diagnostics: {
        project_context_summary: projectContextSummary,
        selection_trace: reportStep.selection_trace,
        failure_case_id: failureCaseId,
        missing_fields: reportStep.missing_fields,
      },
    },
    executionContext: compactExecutionContext,
    agentRuntime,
    reasoningArtifacts,
    rawResult: compactResult,
  });
  const workflowResult = buildSemanticWorkflowResult({
    taskId: task.task_id,
    kind: 'report_query',
    resultType: 'report_query_result',
    answer: content,
    businessSummary,
    semanticResult: compactSemantic as SemanticResultContract | null,
    reportQueryResult: compactResult,
    answerPolicy,
    runtimeState: finalRuntimeState,
    nextActions: resolutionActions.map((action: any) => action.label),
    evidenceBundle: messageContract.evidence_bundle,
    executionContext: compactExecutionContext,
    agentRuntime,
    reasoningArtifacts,
  });
  await appendWorkflowTaskResult(workflowResult);
  await patchWorkflowTask(task.task_id, {
    status: reportStep.status === 'success' || reportStep.status === 'empty' ? 'completed' : reportStep.status === 'missing_input' ? 'waiting' : 'downgraded',
    workflow_state: reportStep.status,
    last_error: reportStep.status === 'success' ? undefined : reportStep.message,
  });

  io.pushEvent(createProcessEvent({
    type: 'answer.final',
    label: '生成回复',
    summary: result?.message || reportStep.message,
    intent_type: 'report_query',
    agent: 'report',
    output: { task_id: task.task_id, status: reportStep.status },
  }));
  io.push({ type: 'runtime_state', runtime_state: finalRuntimeState });
  const runtimeProjection = buildMessageRuntimeProjection({
    messageId: traceId,
    threadId: conversationId,
    traceId,
    workflow: 'report_query',
    intent: 'report_query',
    status: reportStep.status,
    routeReason: route.reason,
    runtimeState: finalRuntimeState,
    answerPolicy,
    content,
    promptConfig: promptConfigMetadata,
    promptRuntimePolicy,
    compiledContext,
    reportStep,
    result: compactResult as ReportQueryResult | null,
    messageContract,
    semanticResult: compactSemantic,
    queryPlan: compactRuntimePayload(reportStep.query_plan, { depth: 4, maxString: 1000, maxArray: 20, maxKeys: 40 }) as Record<string, unknown>,
    processEvents: io.getProcessEvents(),
    traceUrl: buildTraceUrl(traceId, getTraceConfigSync().workspaceId),
    selectedTool: reportStep.selection_trace?.selected_tool,
    selectedServer: reportStep.selection_trace?.selected_server,
    selectedQuestionType: reportStep.selection_trace?.selected_question_type,
    failureCaseId,
    modelParticipation: reportModelParticipation,
    answerOrigin: reportSummaryAssist?.consumed
      ? buildAnswerOrigin({
        source: 'real_llm',
        composerName: 'report_summary',
        summary: '报表摘要由模型基于工具结果摘要生成，未修改工具事实。',
        modelName: reportSummaryAssist.participation.model_name,
        modelSpanId: reportSummaryAssist.participation.model_span_id,
      })
      : reportStep.status === 'success' || reportStep.status === 'empty'
        ? buildAnswerOrigin({
          source: 'template_composer',
          composerName: 'buildReportQuerySuccessMessage',
          summary: '报表结果由本地规则与模板组装。',
        })
        : buildAnswerOrigin({
          source: 'rule_fallback',
          composerName: 'buildEmptyDiagnosis',
          summary: '报表结果由规则降级文案生成。',
        }),
  });
  const traceMeta = await emitChatMessageTrace({
    traceId,
    message,
    conversationId,
    threadId: conversationId,
    messageId: traceId,
    turnId: task.task_id,
    intentType: 'report_query',
    taskId: task.task_id,
    runId: run.run_id,
    status: reportStep.status,
    finalAnswer: content,
    runtimeProjection,
    extra: {
      project_context_summary: projectContextSummary,
      selected_server: reportStep.selection_trace?.selected_server,
      selected_tool: reportStep.selection_trace?.selected_tool,
      manifest_version: reportStep.selection_trace?.manifest_version,
      capability_id: reportStep.selection_trace?.capability_id,
      candidate_tools: reportStep.selection_trace?.candidate_tools,
      glossary: reportStep.selection_trace?.glossary,
      query_plan: compactRuntimePayload(reportStep.query_plan, { depth: 4, maxString: 1000, maxArray: 20, maxKeys: 40 }),
      preflight: compactRuntimePayload(reportStep.preflight, { depth: 4, maxString: 1000, maxArray: 20, maxKeys: 40 }),
      resolved_filters: compactRuntimePayload(reportStep.resolved_filters, { depth: 4, maxString: 1000, maxArray: 20, maxKeys: 40 }),
      tool_chain: compactToolChain(reportStep.tool_chain),
      execution_contract: {
        ...executionContract,
        requires_execution: executionContract.requires_execution && reportStep.status !== 'not_configured',
      },
      planner_candidates: reportPlanningMetadata.planner_candidates,
      arbitration_summary: reportPlanningMetadata.arbitration_summary,
      info_source_arbitration: reportInformationSourceArbitration,
      failure_case_id: failureCaseId,
    },
  });
  const responseContract = buildResponseContract({
    status: reportStep.status,
    intentType: 'report_query',
    traceId,
    answer: content,
    answerOrigin: runtimeProjection.answer_origin,
    workflowResult,
    reportResult: compactResult as Record<string, unknown> | null,
    processEvents: io.getProcessEvents(),
    toolChain: compactToolChain(reportStep.tool_chain),
    missingFields: reportStep.missing_fields,
    nextActions: resolutionActions,
      metadata: {
        answer_origin: runtimeProjection.answer_origin,
        selected_tool: reportStep.selection_trace?.selected_tool,
        selected_server: reportStep.selection_trace?.selected_server,
        evidence_refs: reportEvidenceRefs,
        execution_contract: {
        ...executionContract,
        requires_execution: executionContract.requires_execution && reportStep.status !== 'not_configured',
      },
      planner_candidates: reportPlanningMetadata.planner_candidates,
      arbitration_summary: reportPlanningMetadata.arbitration_summary,
      info_source_arbitration: reportInformationSourceArbitration,
      failure_case_id: failureCaseId,
    },
  });
  io.push({
    type: 'done',
    result: {
      ...workflowResult,
      response_contract: responseContract,
      message_contract: messageContract,
      answer: content,
      runtime_state: finalRuntimeState,
      answer_policy: answerPolicy,
      evidence_bundle: messageContract.evidence_bundle,
      execution_context: compactExecutionContext,
      agent_runtime: agentRuntime,
      reasoning_artifacts: reasoningArtifacts,
      structured_payload: {
        report_query: baseInput,
        report_query_result: compactResult,
        semantic_result: compactSemantic,
        user_requirement: userRequirement,
        capability_decision: compactCapabilityDecision(finalCapabilityDecision),
        selection_trace: reportStep.selection_trace,
        planner_candidates: reportPlanningMetadata.planner_candidates,
        arbitration_summary: reportPlanningMetadata.arbitration_summary,
        preflight: compactRuntimePayload(reportStep.preflight, { depth: 4, maxString: 1000, maxArray: 20, maxKeys: 40 }),
        resolved_filters: compactRuntimePayload(reportStep.resolved_filters, { depth: 4, maxString: 1000, maxArray: 20, maxKeys: 40 }),
        tool_chain: compactToolChain(reportStep.tool_chain),
        failure_case_id: failureCaseId,
      },
    },
    metadata: {
      runtime_state: finalRuntimeState,
      prompt_config: compactRuntimePayload(promptConfigMetadata, { depth: 2, maxString: 500, maxArray: 10, maxKeys: 20 }),
      answer_policy: answerPolicy,
      response_contract: responseContract,
      message_contract: messageContract,
      evidence_bundle: messageContract.evidence_bundle,
      execution_context: compactExecutionContext,
      agent_runtime: agentRuntime,
      reasoning_artifacts: reasoningArtifacts,
      semantic_result: compactSemantic,
      report_query_result: compactResult,
      user_requirement: userRequirement,
      capability_decision: compactCapabilityDecision(finalCapabilityDecision),
      selection_trace: reportStep.selection_trace,
      planner_candidates: reportPlanningMetadata.planner_candidates,
      arbitration_summary: reportPlanningMetadata.arbitration_summary,
      preflight: compactRuntimePayload(reportStep.preflight, { depth: 4, maxString: 1000, maxArray: 20, maxKeys: 40 }),
      resolved_filters: compactRuntimePayload(reportStep.resolved_filters, { depth: 4, maxString: 1000, maxArray: 20, maxKeys: 40 }),
      tool_chain: compactToolChain(reportStep.tool_chain),
      evidence_refs: reportEvidenceRefs,
      failure_case_id: failureCaseId,
      process_events: io.getProcessEvents(),
      project_context_summary: projectContextSummary,
      compiled_context_summary: {
        conversation_id: compiledContext.conversation.conversationId,
        current_role: compiledContext.user.currentRole,
        route_intent: compiledContext.routeHints.intentType,
        missing_slots: compiledContext.slotState?.missingSlots?.map((slot: any) => slot.slotKey),
        project_context_summary: projectContextSummary,
      },
      routing_decision: {
        ...((): Record<string, unknown> => {
          const payload = compactRuntimePayload(reportRouteDecisionMetadata, { depth: 3, maxString: 800, maxArray: 8, maxKeys: 30 });
          return isRecord(payload) ? payload : {};
        })(),
        intent_type: 'report_query',
        agent: 'report',
        route_trace: compactRuntimePayload(reportStep.selection_trace, { depth: 3, maxString: 800, maxArray: 8, maxKeys: 30 }),
      },
      routing_decision_observation: routeObservation,
      trace_meta: compactRuntimePayload(traceMeta, { depth: 3, maxString: 800, maxArray: 8, maxKeys: 30 }),
      trace_url: traceMeta?.trace_url,
      thread_id: conversationId,
      message_id: traceId,
      turn_id: task.task_id,
      message_runtime_projection: compactRuntimePayload(runtimeProjection, { depth: 5, maxString: 1000, maxArray: 12, maxKeys: 35 }),
    },
  });
  io.close();

  // ─── CaseFrame 状态更新：执行完成 ───
  if (caseFrame) {
    await transitionCaseFrameStage(userScopeKey, caseFrame, 'resolved', {
      completed_at: new Date().toISOString(),
      status: reportStep.status,
      tool_name: reportStep.selection_trace?.selected_tool,
    });
  }

  return {
    terminal: true,
    content,
    workflowResult,
    semanticResult: compactSemantic as SemanticResultContract | null,
    messageContract,
    businessSummary: businessSummary as Record<string, unknown> | undefined,
    finalRuntimeState,
    answerPolicy,
    modelParticipation: reportModelParticipation,
  };
}
