/**
 * Understanding Stage
 *
 * 理解阶段：context 编译、semantic frame 推导、user requirement 提取、
 * auth 校验、intent routing、capability discovery、信息源仲裁。
 *
 * 输入：原始请求（message, body, conversationId, userScope 等）
 * 输出：UnderstandingResult（成功）或 BlockedResult（早返回）
 */

import { createProcessEvent, pushSourceAttachedEvents } from '@/lib/chat-route-primitives';
import { createRuntimeState } from '@/lib/chat-runtime/runtime-state';
import { cleanQuestion, compileChatContext, buildProjectContextSummary } from '@/lib/chat-runtime/project-context';
import { deriveRequestSemanticFrame } from '@/lib/semantic-frame-resolver';
import { deriveUserRequirement, type LlmIntentSignal } from '@/lib/request-understanding';
import { evaluateIntentRouteRules, matchesReportQueryRoute } from '@/lib/intent-route-rules';
import { loadIntentRouteRulesSync } from '@/lib/intent-route-rules-store';
import { buildCapabilityManifest, discoverCapabilityCandidatesForMessage } from '@/lib/capability-orchestration';
import { selectSkillCandidate } from '@/lib/skill-orchestration';
import { listMcpServers } from '@/lib/mcp-server-store';
import { detectPublicWebNeed } from '@/lib/public-web-runtime';
import { buildInformationSourceArbitration } from '@/lib/information-source-arbitration';
import { shouldEnterReportExecution } from '@/lib/report-execution-gate';
import { buildResponseContract } from '@/lib/response-contract';
import { emitChatMessageTrace } from '@/app/api/chat/chat-trace';
import {
  SERVICE_INTENT_BY_ROUTE_INTENT,
  authRequiredAnswerForServiceIntent,
  buildRouteDecisionMetadata,
  isReportContinuationCompatible,
} from '@/lib/runner-stages/route-helpers';
import { runReportModelNode } from '@/lib/runner-stages/assembly-helpers';
import { getModelServiceConfig } from '@/lib/runtime-config';
import { generateServiceProposal } from '@/contracts/service-proposal';
import { discoverServices } from '@/lib/service-discovery';
import { fromLegacyServiceIntent } from '@/contracts/service-catalog';
import { intentToServiceType } from '@/contracts/service-catalog/intent-to-service-type';
import { deriveRequestRouteDecision } from '@/lib/request-understanding';
import { getActiveCaseFrame, createCaseFrame } from '@/lib/case-frame-store';
import { addMessageId, updateBusinessContext } from '@/lib/case-frame-helpers';
import { hasInternalBusinessContext, shouldUsePublicWebBeforeAuth } from './auth-public-web-deferral';
import { detectAutomationIntent, isAutomationIntent } from '@/lib/automation-intent-router';
import type { StreamIO } from './pipeline-types';

// ─── 输入类型 ─────────────────────────────────────────────

export interface UnderstandingInput {
  message: string;
  body: {
    message: string;
    intent?: string;
    history?: Array<Record<string, unknown>>;
    metadata?: Record<string, unknown>;
  };
  conversationId: string;
  traceId: string;
  startedAt: string;
  userScopeKey: string;
  userScope: unknown;
  promptConfigMetadata: Record<string, unknown>;
}

// ─── 输出类型 ─────────────────────────────────────────────

export interface UnderstandingResult {
  status: 'ok';
  question: string;
  compiledContext: any;
  semanticFrame: any;
  userRequirement: any;
  projectContextSummary: import('@/lib/chat-runtime/project-context').ProjectContextSummary;
  route: any;
  routeServers: any[];
  routeCapabilityManifest: any[];
  routeCapabilityCandidates: any[];
  skillSelection: any;
  clientIntent: string | undefined;
  matchedRouteRules: any[];
  reportRouteMatch: any;
  capabilityReportMatch: boolean;
  reportContinuation: boolean;
  reportContinuationClassification: any;
  publicWebNeed: any;
  routeInformationSourceArbitration: any;
  routeDecisionMetadata: any;
  isReportQuery: boolean;
  routeWarnings: string[];
  routeServiceIntent: string;
  serviceProposal?: import('@/contracts/service-proposal').ServiceProposal;
  possibleServices?: Array<{ type: string; displayName: string; reason: string; canStartNow: boolean; missingInputs: string[]; confidence: number; family: string }>;
  caseFrame?: import('@/contracts/case-frame').CaseFrame;
}

export interface UnderstandingBlockedResult {
  status: 'blocked';
  reason: 'empty_message' | 'auth_required';
}

export type UnderstandingOutput = UnderstandingResult | UnderstandingBlockedResult;

// ─── 常量 ─────────────────────────────────────────────────

const AUTH_REQUIRED_SERVICE_INTENTS = new Set<string>([
  'data_query',
  'report_delivery',
  'issue_diagnosis',
  'system_operation',
  'package_fetch',
  'integration_workflow',
]);

// ─── 主函数 ───────────────────────────────────────────────

export async function executeUnderstandingStage(
  input: UnderstandingInput,
  io: StreamIO,
): Promise<UnderstandingOutput> {
  const { message, body, conversationId, traceId, startedAt, userScopeKey, userScope, promptConfigMetadata } = input;

  io.pushRuntimeState('understanding');
  io.push({ type: 'phase', phase: 'thinking' });

  // ─── 空消息检查 ─────────────────────────────────────
  if (!message) {
    io.push({ type: 'content', content: '请输入要查询的问题。' });
    const emptyRuntimeState = createRuntimeState(startedAt, 'completed', [], 'blocked');
    const responseContract = buildResponseContract({
      status: 'blocked',
      intentType: body.intent,
      traceId,
      answer: '请输入要查询的问题。',
      processEvents: io.getProcessEvents(),
      metadata: { error: 'empty_message' },
    });
    const traceMeta = await emitChatMessageTrace({
      traceId,
      message,
      conversationId,
      threadId: conversationId,
      messageId: traceId,
      turnId: traceId,
      intentType: body.intent,
      status: 'empty_message',
    });
    io.push({
      type: 'done',
      result: { answer: '', response_contract: responseContract },
      metadata: {
        error: 'empty_message',
        prompt_config: promptConfigMetadata,
        runtime_state: emptyRuntimeState,
        response_contract: responseContract,
        trace_meta: traceMeta,
        thread_id: conversationId,
        message_id: traceId,
        turn_id: traceId,
        trace_url: traceMeta?.trace_url,
      },
    });
    io.close();
    return { status: 'blocked', reason: 'empty_message' };
  }

  // ─── Context 编译 ───────────────────────────────────
  const bodyForContext = body as Partial<import('@/lib/chat-runtime/project-context').ChatProjectRequestBody>;
  const compiledContext = await compileChatContext({ body: bodyForContext, message, conversationId, userScopeKey, userScope: userScope as import('@/lib/user-scope').UserScope | null });
  const projectContextSummary = buildProjectContextSummary(bodyForContext, compiledContext);
  const question = cleanQuestion(message);

  // ─── Semantic Frame ─────────────────────────────────
  const semanticFrame = deriveRequestSemanticFrame({ message: question });

  // ─── User Requirement ───────────────────────────────
  let userRequirement = deriveUserRequirement(question, compiledContext.businessContext, semanticFrame);
  io.pushRuntimeState('context_loading', ['understanding']);

  // ─── Auth 校验 ──────────────────────────────────────
  const earlyServiceIntent = String(userRequirement.serviceIntent || '');
  const earlyAuthRequired = (
    userRequirement.task === 'report_query'
    || userRequirement.task === 'diagnosis'
    || AUTH_REQUIRED_SERVICE_INTENTS.has(earlyServiceIntent)
  );
  const automationPreflightIntent = detectAutomationIntent({
    message: typeof body.message === 'string' && body.message.trim() ? body.message : question,
    history: body.history as Array<{ role: string; content: string; intent_type?: string }> | undefined,
  });
  const shouldDeferAuthForAutomation = isAutomationIntent(automationPreflightIntent);
  const shouldDeferAuthForPublicWeb = await shouldUsePublicWebBeforeAuth({
    question,
    conversationIntent: body.intent,
    hasUserScope: Boolean(userScope),
    authRequired: earlyAuthRequired,
    businessContext: compiledContext.businessContext,
  });
  if (!userScope && earlyAuthRequired && !shouldDeferAuthForAutomation && !shouldDeferAuthForPublicWeb) {
    const authRequiredAnswer = authRequiredAnswerForServiceIntent(earlyServiceIntent);
    io.pushEvent(createProcessEvent({
      type: 'context.prepared',
      label: '检查查询权限',
      status: 'error',
      summary: earlyServiceIntent === 'issue_diagnosis'
        ? '内部诊断需要有效登录态。'
        : earlyServiceIntent === 'integration_workflow' || earlyServiceIntent === 'system_operation' || earlyServiceIntent === 'package_fetch'
          ? '内部操作需要有效登录态。'
          : '内部报表查询需要有效登录态。',
      intent_type: userRequirement.task === 'diagnosis' ? 'diagnosis' : userRequirement.task === 'report_query' ? 'report_query' : 'debugging',
      agent: userRequirement.task === 'diagnosis' ? 'diagnosis' : userRequirement.task === 'report_query' ? 'report' : 'debugging',
      output: {
        reason: 'auth_required_for_internal_service',
        userRequirement: {
          task: userRequirement.task,
          serviceIntent: userRequirement.serviceIntent,
          metrics: userRequirement.metrics,
          dimensions: userRequirement.dimensions,
          dateRange: userRequirement.dateRange,
        },
      },
    }));
    io.push({ type: 'content', content: authRequiredAnswer });
    const blockedRuntimeState = createRuntimeState(startedAt, 'completed', ['understanding', 'context_loading'], 'blocked');
    const responseContract = buildResponseContract({
      status: 'blocked',
      intentType: userRequirement.task === 'diagnosis' ? 'diagnosis' : userRequirement.task === 'report_query' ? 'report_query' : 'debugging',
      traceId,
      answer: authRequiredAnswer,
      processEvents: io.getProcessEvents(),
      metadata: {
        reason: 'auth_required_for_internal_service',
        userRequirementTask: userRequirement.task,
        userRequirementServiceIntent: userRequirement.serviceIntent,
      },
    });
    const traceMeta = await emitChatMessageTrace({
      traceId,
      message,
      conversationId,
      threadId: conversationId,
      messageId: traceId,
      turnId: traceId,
      intentType: userRequirement.task === 'diagnosis' ? 'diagnosis' : userRequirement.task === 'report_query' ? 'report_query' : 'debugging',
      status: 'auth_required',
    });
    io.push({
      type: 'done',
      result: { answer: authRequiredAnswer, response_contract: responseContract },
      metadata: {
        process_events: io.getProcessEvents(),
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
    return { status: 'blocked', reason: 'auth_required' };
  }

  // ─── Intent Routing ─────────────────────────────────
  const intentRouteRules = loadIntentRouteRulesSync();
  const clientRouteHint = typeof body.intent === 'string' && body.intent.trim() ? body.intent.trim() : undefined;

  const preRouteModelServiceConfig = await getModelServiceConfig();
  const preRouteServers = await listMcpServers();
  const toolSummary = preRouteServers
    .flatMap(s => s.enabled && s.status === 'connected' ? [`${s.name}: ${s.tools.map(t => t.name).join(', ')}`] : [])
    .join('; ') || '无已连接MCP服务';
  const routeReviewAssist = await runReportModelNode({
    useCase: 'intent_routing_review',
    fallbackText: '',
    modelServiceConfig: preRouteModelServiceConfig,
    input: {
      message: cleanQuestion(message),
      history: (body.history || []).slice(-3).map((h: any) => ({ role: h.role, content: h.content?.slice(0, 200) })),
      projectContext: compiledContext.businessContext,
      availableIntentTypes: ['report_query', 'diagnosis', 'help', 'demand', 'debugging', 'general'],
      routeRules: intentRouteRules?.rules?.map((r: any) => `${r.name}: ${r.description}`).join('; ') || '',
      capabilitySummary: toolSummary,
    },
    consume: { enabled: false, consumedBy: 'pre_route_intent_lane' },
    traceMeta: { node: 'intent_routing_review', phase: 'pre_route' },
  });
  const llmRouteReview: LlmIntentSignal | null = routeReviewAssist.output
    && typeof routeReviewAssist.output === 'object'
    && 'intent_type' in (routeReviewAssist.output as Record<string, unknown>)
    ? routeReviewAssist.output as LlmIntentSignal
    : null;

  // ─── Route Decision ─────────────────────────────────
  const route = deriveRequestRouteDecision(cleanQuestion(message), {
    businessContext: compiledContext.businessContext,
    slotState: compiledContext.slotState,
    routeRules: intentRouteRules,
    llmIntentSignal: llmRouteReview,
    semanticFrame,
    clientIntent: clientRouteHint,
  });

  // ─── Capability Discovery ───────────────────────────
  const routeServers = await listMcpServers();
  const routeManifest = buildCapabilityManifest(routeServers);
  const routeCandidates = discoverCapabilityCandidatesForMessage(question, routeManifest);
  const skillSelection = await selectSkillCandidate(question, route.intent_type, route.reason);
  const matchedRouteRules = evaluateIntentRouteRules({ message: cleanQuestion(message), rules: intentRouteRules.rules });
  const reportRouteMatch = matchesReportQueryRoute(message, intentRouteRules);
  const reportCandidateMatch = Boolean(routeCandidates.find((candidate: any) =>
    candidate.capability.capabilityType === 'data.report'
    && candidate.capability.supportedServiceIntents?.find((intent: string) => intent === 'report_delivery' || intent === 'data_query')
  ));

  // ─── Report Continuation ────────────────────────────
  const reportContinuationContext = Boolean(
    compiledContext.businessContext.latestResult?.resultType === 'report_query'
    || compiledContext.businessContext.reportSource,
  );
  const publicWebModelServiceConfig = await getModelServiceConfig();
  const reportContinuation = reportContinuationContext;
  const reportContinuationClassification = reportContinuationContext
    ? await isReportContinuationCompatible(
        question,
        route.intent_type,
        reportRouteMatch,
        reportCandidateMatch,
        { modelServiceConfig: publicWebModelServiceConfig },
      )
    : null;

  // ─── Route Warnings ─────────────────────────────────
  const routeWarnings = [...new Set([
    ...(clientRouteHint && clientRouteHint !== route.intent_type ? [`client_intent_conflict:${clientRouteHint}->${route.intent_type}`] : []),
    ...(clientRouteHint === 'report_query' && route.intent_type !== 'report_query' ? ['client_intent_ignored:report_query_hint_overridden'] : []),
  ])];

  // ─── Public Web Need ────────────────────────────────
  const routeServiceKind = SERVICE_INTENT_BY_ROUTE_INTENT[route.intent_type] || 'general_chat';
  const internalContextPresent = hasInternalBusinessContext(compiledContext.businessContext);
  const strongInternalRouteEvidence = Boolean(
    reportRouteMatch
    || reportContinuationContext
    || (reportCandidateMatch && internalContextPresent)
  );
  const internalBusinessCueForPublicWeb = Boolean(
    internalContextPresent
    || strongInternalRouteEvidence
  );
  const publicWebAccess = await detectPublicWebNeed(question, {
    modelServiceConfig: publicWebModelServiceConfig,
    context: {
      routeIntent: route.intent_type,
      conversationIntent: body.intent,
      routeReason: route.reason,
      hasInternalBusinessSignal: internalBusinessCueForPublicWeb,
    },
  });

  // ─── Report Gate ────────────────────────────────────
  const routeSelectedCandidate = routeCandidates[0]?.capability || null;
  const reportGate = shouldEnterReportExecution({
    route,
    userRequirement,
    semanticFrame,
    selectedCapability: routeSelectedCandidate,
    capabilityReportMatch: reportCandidateMatch,
    reportRouteMatch,
  });
  const publicWebPrimaryCandidate = Boolean(
    publicWebAccess.required
    && publicWebAccess.searchPlan?.allowed !== false
    && publicWebAccess.providerEligibility?.eligible !== false
    && publicWebAccess.factNeed?.fact_visibility === 'public'
    && !internalContextPresent
    && !strongInternalRouteEvidence
  );
  const isReportQuery = publicWebPrimaryCandidate ? false : reportGate.shouldEnter;
  if (publicWebPrimaryCandidate && reportGate.shouldEnter) {
    routeWarnings.push('report_gate_deferred_to_public_web_fact_need');
  }
  if (isReportQuery && publicWebAccess.required) {
    routeWarnings.push('public_web_candidate_deferred_to_internal_capability');
  }

  // ─── Information Source Arbitration ──────────────────
  const routeInformationSourceArbitration = buildInformationSourceArbitration({
    stage: 'route_arbitration',
    isReportQuery,
    reportRouteMatch,
    capabilityReportMatch: reportCandidateMatch,
    publicWebNeed: publicWebAccess,
    knowledge: { status: 'not_collected_in_route_arbitration', hitCount: 0 },
    hasProjectContext: Boolean(projectContextSummary || compiledContext.project?.currentProject),
    hasMemoryOrHistoryContext: Boolean((body.history || []).length),
  });

  // ─── Route Decision Metadata ─────────────────────────
  const routeDecisionMetadata = buildRouteDecisionMetadata({
    clientIntent: clientRouteHint,
    routeIntent: route.intent_type,
    resolvedIntent: isReportQuery ? 'report_query' : route.intent_type,
    routeReason: route.reason,
    matchedRules: matchedRouteRules,
    reportRouteMatch,
    reportContinuation,
    reportContinuationClassification,
    userRequirementTask: userRequirement.task,
    userRequirementServiceIntent: userRequirement.serviceIntent,
    selectedSkill: skillSelection.selected?.skill
      ? { skill_id: skillSelection.selected.skill.skill_id, name: skillSelection.selected.skill.name }
      : null,
    capabilityDecision: null,
    isReportQuery,
    routeWarnings,
    message,
  });

  // ─── Push Events ────────────────────────────────────
  io.pushEvent(createProcessEvent({
    type: 'intent.detected',
    label: '确定路由',
    summary: isReportQuery ? '进入问数链路。' : `进入${route.intent_type}链路。`,
    intent_type: route.intent_type,
    agent: route.agent,
    output: routeDecisionMetadata,
  }));
  io.pushEvent(createProcessEvent({
    type: 'planner.arbitrated',
    label: '信息源仲裁',
    summary: isReportQuery && publicWebAccess.required
      ? '公开信息需求已作为候选记录，内部数据能力优先执行。'
      : '已完成内部能力、公开信息和上下文候选仲裁。',
    status: 'success',
    visibility: 'internal',
    intent_type: route.intent_type,
    agent: route.agent,
    output: routeInformationSourceArbitration,
  }));

  // ─── Service Proposal Generation ─────────────────────
  // 生成服务提案（三段式响应）

  // 增强的 Service Discovery：输出多个候选服务
  const serviceDiscovery = discoverServices({
    message,
    semanticFrame,
    userRequirement,
    routeServiceIntent: typeof routeServiceKind === 'string' ? routeServiceKind : undefined,
    businessContext: {
      project: compiledContext?.businessContext?.project as { id?: string; name?: string } | undefined,
      media: compiledContext?.businessContext?.media as string | undefined,
      timeRange: compiledContext?.businessContext?.timeRange as string | undefined,
    },
  });

  // 基于 discovery 结果生成 service proposal
  const candidateServiceType = fromLegacyServiceIntent(routeServiceKind);
  const serviceProposal = candidateServiceType
    ? generateServiceProposal({
        message,
        realGoal: semanticFrame?.fieldDefinition?.targetTerm || message,
        candidateServices: serviceDiscovery.possibleServices.map(s => ({
          type: s.type,
          reason: s.reason,
          confidence: s.confidence,
        })),
        missingInputs: semanticFrame?.missingSlots?.map((slot: string) => ({
          field: slot,
          label: slot,
          required: true,
        })) ?? [],
        businessContext: {
          project: compiledContext?.businessContext?.project as { id?: string; name?: string } | undefined,
          media: compiledContext?.businessContext?.media as string | undefined,
          timeRange: compiledContext?.businessContext?.timeRange as string | undefined,
        },
      })
    : undefined;

  // ─── CaseFrame 获取/创建 ─────────────────────────────
  // 获取当前会话的活跃 CaseFrame，如果没有则创建新的
  let caseFrame = await getActiveCaseFrame(userScopeKey, conversationId);
  if (!caseFrame) {
    caseFrame = await createCaseFrame(userScopeKey, {
      conversationId,
      serviceType: intentToServiceType(route.intent_type),
      realGoal: semanticFrame?.fieldDefinition?.targetTerm || message,
      priority: 'medium',
      initialMessage: message,
      messageId: traceId,
    });
  } else {
    // 更新已有 CaseFrame：添加消息 ID 和业务上下文
    caseFrame = await addMessageId(userScopeKey, caseFrame, traceId);

    // 辅助函数：将 BusinessContextSlotValue 转换为 CaseFrame 期望的格式
    const extractProjectInfo = (slot?: { value: string | string[] }) => {
      if (!slot) return undefined;
      const value = Array.isArray(slot.value) ? slot.value[0] : slot.value;
      // 尝试解析 "appId (appName)" 格式
      const match = value?.match(/^(\S+)(?:\s*\((.+)\))?$/);
      if (match) {
        return { id: match[1], name: match[2] || match[1] };
      }
      return value ? { id: value, name: value } : undefined;
    };

    const extractStringValue = (slot?: { value: string | string[] }) => {
      if (!slot) return undefined;
      return Array.isArray(slot.value) ? slot.value[0] : slot.value;
    };

    caseFrame = await updateBusinessContext(userScopeKey, caseFrame, {
      project: extractProjectInfo(compiledContext.businessContext?.project),
      app: extractProjectInfo(compiledContext.businessContext?.app),
      media: extractStringValue(compiledContext.businessContext?.media),
      timeRange: extractStringValue(compiledContext.businessContext?.timeRange),
    });
  }

  return {
    status: 'ok',
    question,
    compiledContext,
    semanticFrame,
    userRequirement,
    projectContextSummary,
    route,
    routeServers,
    routeCapabilityManifest: routeManifest,
    routeCapabilityCandidates: routeCandidates,
    skillSelection,
    clientIntent: clientRouteHint,
    matchedRouteRules,
    reportRouteMatch,
    capabilityReportMatch: reportCandidateMatch,
    reportContinuation,
    reportContinuationClassification,
    publicWebNeed: publicWebAccess,
    routeInformationSourceArbitration,
    routeDecisionMetadata,
    isReportQuery,
    routeWarnings,
    routeServiceIntent: routeServiceKind,
    serviceProposal,
    possibleServices: serviceDiscovery.possibleServices,
    caseFrame,
  };
}
