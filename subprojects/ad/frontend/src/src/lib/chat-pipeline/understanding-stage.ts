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
import { listSkillContracts } from '@/lib/skill-contract-store';
import { probeAllSkills } from '@/lib/skill-readiness-probe';
import { projectReadySkillsToCapabilities } from '@/lib/skill-capability-projection';
import { arbitrateExecutionPlan } from '@/lib/plan-arbitration';
import { readToolCapabilityDoc } from '@/lib/tool-capability-doc-store';
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
import { fromLegacyServiceIntent, isValidServiceType, type ServiceType } from '@/contracts/service-catalog';
import { intentToServiceType } from '@/contracts/service-catalog/intent-to-service-type';
import { deriveRequestRouteDecision } from '@/lib/request-understanding';
import { getActiveCaseFrame, createCaseFrame } from '@/lib/case-frame-store';
import { addMessageId, updateBusinessContext, updateServiceIntent } from '@/lib/case-frame-helpers';
import { hasInternalBusinessContext, shouldUsePublicWebBeforeAuth } from './auth-public-web-deferral';
import { detectAutomationIntent, isAutomationIntent } from '@/lib/automation-intent-router';
import { extractUrlCues, generateUrlHypotheses } from '@/lib/url-fact-loop';
import { getEntityResolutionAliasMaps, loadEntityResolutionConfigSync } from '@/lib/entity-resolution-config-store';
import { applyAttachmentQueryContextToRequirement, classifyAttachmentReferenceIntent, getAttachmentQueryMode, loadAttachmentQueryContext, summarizeAttachmentQueryAdoption } from '@/lib/attachment-query-context';
import type { PipelineRouteDecisionMetadata, StreamIO } from './pipeline-types';
import type { QueryContractBuildFailure } from '@/lib/query-contract-builder';

// ─── 输入类型 ─────────────────────────────────────────────

type EntityAliasMaps = ReturnType<typeof getEntityResolutionAliasMaps>;

const ENTITY_ALIAS_MAP_KEY_BY_ENTITY_TYPE: Record<string, keyof EntityAliasMaps> = {
  team: 'team_aliases',
  media: 'media_aliases',
  account: 'account_aliases',
  package: 'package_aliases',
  terminal: 'terminal_aliases',
  terminal_os: 'terminal_aliases',
  app_package_type: 'app_package_type_aliases',
  optimizer: 'optimizer_aliases',
};

function isResolvedControlledEntityAlias(aliasMaps: EntityAliasMaps, entityType: string, rawText: string): boolean {
  const aliasMapKey = ENTITY_ALIAS_MAP_KEY_BY_ENTITY_TYPE[entityType];
  if (!aliasMapKey) return false;
  const aliasMap = aliasMaps[aliasMapKey];
  const normalizedRaw = rawText.toLowerCase();
  for (const [name, aliases] of Object.entries(aliasMap || {})) {
    if (name.toLowerCase() === normalizedRaw) return true;
    if (Array.isArray(aliases) && aliases.some(alias => alias.toLowerCase() === normalizedRaw)) return true;
  }
  return false;
}

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

function isQueryContractBuildFailure(value: unknown): value is QueryContractBuildFailure {
  return Boolean(value && typeof value === 'object' && (value as { status?: unknown }).status === 'failed');
}

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
  // Phase 1: QueryContract + parsed filters (report-query domain only)
  parsedFilterResult?: import('@/contracts/request-understanding/parsed-filters').ParsedFilterResult;
  queryContract?: import('@/contracts/semantic/query-contract').CanonicalQueryContract;
  queryContractSummary?: Record<string, unknown>;
  attachmentQueryContext?: import('@/lib/attachment-query-context').AttachmentQueryContext;
  // Skill system
  executionTarget?: any;
  skillReadinessResults?: any[];
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

function resolvePublicWebServiceType(params?: {
  required?: boolean;
  capabilityType?: string;
} | null): string | null {
  if (!params?.required) return null;
  const capabilityType = String(params.capabilityType || '').toLowerCase();
  if (!capabilityType) return 'public_web_search';
  if (capabilityType === 'realtime_public_info' || capabilityType === 'external_doc_lookup') {
    return 'realtime_public_info';
  }
  if (capabilityType === 'web_search' || capabilityType === 'web_fetch' || capabilityType === 'public_web_qa') {
    return 'public_web_search';
  }
  return 'public_web_search';
}

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
  const attachmentQueryContext = await loadAttachmentQueryContext({
    metadata: body.metadata,
    conversationId,
    userScopeKey,
  });

  // ─── Semantic Frame ─────────────────────────────────
  // P1: LLM-first — try LLM understanding first; fall back to regex.
  // TODO(A1): add dedicated 'semantic_frame' model useCase with structured output
  // contract (speechAct, semanticTask, metrics, dimensions, entities, dateRange, filters).
  // Currently regex-based deriveRequestSemanticFrame is the primary source.
  const semanticFrame = deriveRequestSemanticFrame({ message: question });

  // ─── Model Service Config (shared by attachment intent + intent routing) ──
  const preRouteModelServiceConfig = await getModelServiceConfig();

  // ─── User Requirement ───────────────────────────────
  let userRequirement = deriveUserRequirement(question, compiledContext.businessContext, semanticFrame);
  const attachmentReferenceIntent = attachmentQueryContext?.attachments.length
    ? await classifyAttachmentReferenceIntent(question, attachmentQueryContext, preRouteModelServiceConfig)
    : 'none';
  const attachmentMode = await getAttachmentQueryMode();
  const userRequirementBeforeAttachment = userRequirement;
  userRequirement = applyAttachmentQueryContextToRequirement(userRequirement, attachmentQueryContext, {
    referenceIntent: attachmentReferenceIntent,
    mode: attachmentMode,
  });
  const attachmentAdoptionSummary = summarizeAttachmentQueryAdoption(
    userRequirementBeforeAttachment,
    userRequirement,
    attachmentQueryContext,
    { referenceIntent: attachmentReferenceIntent, mode: attachmentMode },
  );

  // ─── Phase 1: QueryContract Building ──────────────────
  // Only for report-query domain requests. Non-report requests get undefined.
  const { parseFilterSyntaxToContract } = await import('@/lib/filter-syntax-parser');
  const { buildQueryContract } = await import('@/lib/query-contract-builder');
  const parsedFilterResult = parseFilterSyntaxToContract(question);
  const queryContract = buildQueryContract({
    traceId,
    message: question,
    userRequirement,
    parsedFilterResult,
    serviceIntent: userRequirement.serviceIntent,
    queryType: userRequirement.task,
    intentType: undefined as string | undefined, // filled after route decision
    capabilityType: undefined,
    conversationContext: null,
  });
  const canonicalQueryContract = queryContract && !isQueryContractBuildFailure(queryContract)
    ? queryContract
    : undefined;
  const queryContractSummary = canonicalQueryContract ? {
    queryType: canonicalQueryContract.queryType,
    metricsCount: canonicalQueryContract.metrics.length,
    parsedFiltersCount: canonicalQueryContract.parsedFilters.length,
    entityHintsCount: canonicalQueryContract.entityHints.length,
    pendingEnumFiltersCount: canonicalQueryContract.pendingEnumFilters?.length ?? 0,
    identifierFiltersCount: canonicalQueryContract.identifierFilters.length,
    sanitizerRejectedCount: parsedFilterResult.sanitizerRejected.length,
    identifierFilterCount: parsedFilterResult.parsedFilters.filter(f => f.filterKind === 'identifier').length,
    enumFilterCount: parsedFilterResult.parsedFilters.filter(f => f.filterKind === 'enum').length,
  } : undefined;

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
    queryContract: canonicalQueryContract,
    queryContractSummary,
    clientIntent: clientRouteHint,
  });

  // ─── Capability Discovery ───────────────────────────
  const routeServers = await listMcpServers();
  const toolDoc = await readToolCapabilityDoc();
  let routeManifest = buildCapabilityManifest(routeServers, toolDoc);
  let routeCandidates = discoverCapabilityCandidatesForMessage(question, routeManifest);
  const skillSelection = await selectSkillCandidate(question, route.intent_type, route.reason);

  // ─── Skill Capability Projection + Plan Arbitration ───
  let executionTarget: any = undefined;
  let skillReadinessResults: any[] | undefined = undefined;

  const contracts = (await listSkillContracts()).filter((s: any) => s.enabled !== false);
  const results = await probeAllSkills(contracts, routeServers);
  skillReadinessResults = results;
  const skillManifests = projectReadySkillsToCapabilities(contracts, results);
  // Merge skill capability projections into route manifest
  routeManifest = [...routeManifest, ...skillManifests];
  // Re-discover candidates with merged manifest
  routeCandidates = discoverCapabilityCandidatesForMessage(question, routeManifest);

  const readinessMap: Record<string, any> = {};
  for (const r of results) readinessMap[r.skillId] = r;

  const arbitration = arbitrateExecutionPlan({
    mcpCapabilities: routeCandidates,
    skillProjections: [],
    skillReadiness: readinessMap,
    routeIntent: route.intent_type as string,
  });
  executionTarget = arbitration.target;

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
  const routeServiceTypeByIntent = fromLegacyServiceIntent(routeServiceKind)
    || fromLegacyServiceIntent(String(userRequirement.serviceIntent || ''));
  const fallbackServiceType = intentToServiceType(route.intent_type);
  const internalContextPresent = hasInternalBusinessContext(compiledContext.businessContext);

  // P0.5 Batch 2.1: Detect controlled entity candidates for routing
  // When user mentions specific team/account/campaign entities, this is strong evidence
  // for internal report query, not public web lookup.
  // P0.5 Step 12: 同时记录 strongFilter 数量，供 progressive policy 消费为风险信号
  let controlledEntityCandidatesDetected = false;
  let controlledEntityStrongFilterCount = 0;
  const blockedEntityDetails: Array<{
    entityType: string;
    rawText: string;
    reason: string;
    correctionHint?: string;
  }> = [];
  try {
    const { collectEntityCandidates } = await import('@/lib/entity-candidate-collector');
    const entityAliasMaps = getEntityResolutionAliasMaps(loadEntityResolutionConfigSync());
    const entityResult = collectEntityCandidates({ message: question });
    controlledEntityCandidatesDetected = entityResult.strongFilters.length > 0;
    controlledEntityStrongFilterCount = entityResult.strongFilters.length;
    // Phase 2.2: Build per-entity blocking details for thinking chain review.
    for (const candidate of entityResult.strongFilters) {
      const rawText = candidate.name || '';
      // Extract entityType from candidate id (e.g. "rule:team:广州二部" → "team")
      const idParts = (candidate.id || '').split(':');
      const entityType = idParts.length >= 3 ? idParts[1] : (idParts[0] || 'unknown');
      if (rawText && isResolvedControlledEntityAlias(entityAliasMaps, entityType, rawText)) continue;
      // Route understanding records entity filter evidence only. Dictionary/LLM semantic
      // resolution runs later in the report resolver, where tool candidates are available.
      const isFilterSyntaxSuspect = /[是为=]/.test(rawText) || /筛选|维度/.test(rawText);
      if (isFilterSyntaxSuspect) {
        blockedEntityDetails.push({
          entityType,
          rawText,
          reason: 'filter_syntax_suspect',
          correctionHint: '检测到疑似筛选语法，请使用「团队名=值」格式',
        });
      }
    }
  } catch {
    // Silently ignore if import fails
  }

  const strongInternalRouteEvidence = Boolean(
    reportRouteMatch
    || reportContinuationContext
    || (reportCandidateMatch && internalContextPresent)
    || controlledEntityCandidatesDetected  // P0.5: Controlled entities are strong internal evidence
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
  const resolvedPublicWebServiceType = publicWebAccess.required
    && !internalContextPresent
    && !strongInternalRouteEvidence
    ? resolvePublicWebServiceType(publicWebAccess)
    : null;
  const routeServiceType = resolvedPublicWebServiceType
    || routeServiceTypeByIntent
    || fallbackServiceType;
  const caseFrameServiceType = isValidServiceType(routeServiceType || '') ? (routeServiceType as ServiceType) : fallbackServiceType;

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
  // URL 外部事实循环：提取 URL 线索并生成搜索假设
  const urlCues = extractUrlCues(message);
  const urlFactLoopResult = urlCues.length > 0
    ? generateUrlHypotheses(urlCues, { serviceType: routeServiceType })
    : undefined;

  const routeDecisionMetadata: PipelineRouteDecisionMetadata = buildRouteDecisionMetadata({
    clientIntent: clientRouteHint,
    routeIntent: route.intent_type,
    resolvedIntent: isReportQuery ? 'report_query' : route.intent_type,
    routeReason: route.reason,
    executionConfidence: route.confidence,
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
    missingFieldCount: (userRequirement.missingFields || []).length,
    serviceType: routeServiceType || undefined,
    message,
    urlFactLoop: urlFactLoopResult,
    blockedEntityStrongFilterCount: controlledEntityStrongFilterCount,
    blockedEntityDetails: blockedEntityDetails.length > 0 ? blockedEntityDetails : undefined,
  });

  // Phase 2.2: Generate specific follow-up questions from blocked entities + missing fields
  const blockedEntityQuestions = blockedEntityDetails.map((detail, index) => ({
    key: `blocked_entity_${index + 1}`,
    question: detail.correctionHint || `请确认「${detail.rawText}」的准确名称`,
    impact: `无法识别 ${detail.entityType === 'team' ? '团队' : detail.entityType} 名称「${detail.rawText}」，结果可能不准确`,
    defaultAssumption: detail.reason === 'filter_syntax_suspect'
      ? '请使用「筛选条件=值」格式重新描述'
      : '使用当前识别结果继续，结果可能不完整',
    options: detail.reason === 'filter_syntax_suspect'
      ? ['输入正确筛选格式', '按默认口径继续']
      : ['补充更准确的名称', '按默认口径继续'],
    priority: 'high' as const,
  }));
  const unresolvedAmbiguities = [
    ...(userRequirement.missingFields || []).map((item, index) => ({
      key: `missing_field_${index + 1}`,
      question: `请确认 ${item} 的准确范围`,
      impact: '结果口径可能变化',
      defaultAssumption: '使用默认口径和最近活跃上下文继续执行',
      options: ['按默认口径继续', '补充更准确的范围'],
      priority: 'medium' as const,
    })),
    ...blockedEntityQuestions,
  ];
  routeDecisionMetadata.assumedContext = {
    project: compiledContext.businessContext?.project,
    media: compiledContext.businessContext?.media,
    timeRange: compiledContext.businessContext?.timeRange,
  };
  routeDecisionMetadata.resolvedContext = {
    project: compiledContext.businessContext?.project,
    media: compiledContext.businessContext?.media,
    hasInternalContext: Boolean(hasInternalBusinessContext(compiledContext.businessContext)),
  };
  routeDecisionMetadata.unresolvedAmbiguities = unresolvedAmbiguities;
  if (attachmentQueryContext?.attachments.length) {
    routeDecisionMetadata.attachmentQueryContext = {
      attachmentCount: attachmentQueryContext.attachments.length,
      metricCount: attachmentQueryContext.metrics.length,
      dimensionCount: attachmentQueryContext.dimensions.length,
      templateLike: attachmentQueryContext.attachments.some(item => item.templateLike),
      warnings: attachmentQueryContext.warnings,
      referenceIntent: attachmentReferenceIntent,
      adoption: attachmentAdoptionSummary,
    };
  }
  if (routeDecisionMetadata.progressivePolicy) {
    routeDecisionMetadata.progressivePolicy.unresolvedAmbiguities = unresolvedAmbiguities;
    routeDecisionMetadata.policyTrace = {
      reasoningPolicy: routeDecisionMetadata.progressivePolicy.reasoningPolicy,
      ambiguityClass: routeDecisionMetadata.progressivePolicy.ambiguityClass,
      riskLevel: routeDecisionMetadata.progressivePolicy.riskLevel,
      followUpMode: routeDecisionMetadata.progressivePolicy.followUpMode,
    };
  }

  // ─── Push Events ────────────────────────────────────
  if (attachmentQueryContext?.attachments.length) {
    const sourceRefs = attachmentQueryContext.sourceRefs.map(ref => ({
      id: ref.id,
      title: ref.title,
      source: ref.source,
      source_type: 'manual' as const,
    }));
    const isAdopted = attachmentAdoptionSummary?.inputAdoptionDecision === 'slot_assist';
    const hasAdoptedSlots = Boolean(attachmentAdoptionSummary?.adoptedSlots.length);
    const hasRejectedReasons = Boolean(attachmentAdoptionSummary?.rejectedReasons.length);

    // 1. attachment.read — 附件已读取
    io.pushEvent(createProcessEvent({
      type: 'attachment.read',
      label: '读取附件信息',
      summary: isAdopted
        ? '已读取上传资料，并补充了可用的取数条件。'
        : attachmentQueryContext.attachments.some(item => item.templateLike)
          ? '已读取上传的表格模板，本轮问题未自动改为取数。'
          : '已读取上传资料，作为本轮问题的参考。',
      status: 'success',
      visibility: 'user',
      intent_type: route.intent_type,
      agent: route.agent,
      source_refs: sourceRefs,
      output: {
        attachments: attachmentQueryContext.attachments,
        warnings: attachmentQueryContext.warnings,
      },
    }));

    // 2. attachment.candidate — 附件字段作为候选（internal，避免暴露内部诊断）
    if (attachmentAdoptionSummary?.inputAdoptionDecision !== 'rejected') {
      io.pushEvent(createProcessEvent({
        type: 'attachment.candidate',
        label: '附件字段候选',
        summary: `附件提供 ${attachmentQueryContext.metrics.length} 个指标、${attachmentQueryContext.dimensions.length} 个维度候选。`,
        status: 'success',
        visibility: 'internal',
        intent_type: route.intent_type,
        agent: route.agent,
        source_refs: sourceRefs,
        output: {
          metrics: attachmentQueryContext.metrics,
          dimensions: attachmentQueryContext.dimensions,
          date_ranges: attachmentQueryContext.dateRanges,
          unsupported_metrics: attachmentQueryContext.unsupportedMetrics,
          missing_fields: attachmentQueryContext.missingFields,
        },
      }));
    }

    // 3. attachment.adopted — 槽位被采纳（仅在非 shadow 模式且有采纳时发送）
    if (hasAdoptedSlots && attachmentMode !== 'shadow') {
      io.pushEvent(createProcessEvent({
        type: 'attachment.adopted',
        label: '采纳附件槽位',
        summary: `已采纳附件提供的 ${attachmentAdoptionSummary!.adoptedSlots.join('、')} 信息。`,
        status: 'success',
        visibility: 'user',
        intent_type: route.intent_type,
        agent: route.agent,
        source_refs: sourceRefs,
        output: {
          adoptedSlots: attachmentAdoptionSummary!.adoptedSlots,
          inputReferenceIntent: attachmentReferenceIntent,
        },
      }));
    }

    // 4. attachment.rejected — 槽位被拒绝（internal，避免暴露路由诊断到用户可见 SSE）
    if (hasRejectedReasons) {
      io.pushEvent(createProcessEvent({
        type: 'attachment.rejected',
        label: '附件槽位未采纳',
        summary: `附件字段未采纳原因：${attachmentAdoptionSummary!.rejectedReasons.join('、')}`,
        status: 'success',
        visibility: 'internal',
        intent_type: route.intent_type,
        agent: route.agent,
        source_refs: sourceRefs,
        output: {
          rejectedReasons: attachmentAdoptionSummary!.rejectedReasons,
        },
      }));
    }
  }
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
  const candidateServiceType = isValidServiceType(routeServiceType || '') ? routeServiceType : null;
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
      serviceType: caseFrameServiceType || intentToServiceType(route.intent_type),
      realGoal: semanticFrame?.fieldDefinition?.targetTerm || message,
      priority: 'medium',
      initialMessage: message,
      messageId: traceId,
    });
  } else {
    caseFrame = await updateServiceIntent(userScopeKey, caseFrame, caseFrameServiceType || intentToServiceType(route.intent_type));
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
    executionTarget,
    skillReadinessResults,
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
    // Phase 1: QueryContract + parsed filters (report-query domain only)
    parsedFilterResult,
    queryContract: canonicalQueryContract,
    queryContractSummary,
    attachmentQueryContext,
  };
}

