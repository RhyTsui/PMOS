import type { AgentProcessEvent, IntentType } from '@/types';
import type {
  ServiceIntent,
  ToolPurpose,
  ProgressiveServicePolicy,
  AmbiguityClass,
  RiskLevel,
  FollowUpMode,
  ReasoningPolicy,
  UnresolvedAmbiguity,
} from '@/contracts/request-understanding/route-decision-contract';
import type { ModelServiceConfig } from '@/lib/runtime-config';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { compactRuntimePayload } from '@/lib/chat-runtime/payload-compact';
import { cleanQuestion } from '@/lib/chat-runtime/project-context';
import { evaluateIntentRouteRules } from '@/lib/intent-route-rules';
import { getPromptContent } from '@/lib/prompt-store';
import { generateModelText } from '@/lib/model-router';
import { resolveChatBoundaryMessage } from '@/lib/chat-answer-message-catalog';
import type { PipelineRouteDecisionMetadata } from '@/lib/chat-pipeline/pipeline-types';
import {
  buildRouteDecisionObservation,
  summarizeRouteDecisionObservation,
  buildCorrectiveAction,
} from '@/lib/route-decision-observation';
import {
  runPlannerShadow,
  buildPlannerShadowObservationPayload,
  buildPlannerShadowSummary,
} from '@/lib/planner-shadow';
import {
  PROGRESSIVE_POLICY_THRESHOLD,
  PROGRESSIVE_REASONING_POLICIES,
  PROGRESSIVE_NON_BLOCKING_REASONING_POLICIES,
} from '@/lib/runner-stages/progressive-service-metadata';
import {
  fromLegacyServiceIntent,
  fromPlannerServiceIntent,
  isValidServiceType,
  resolveServiceProgressivePolicyProfile,
} from '@/contracts/service-catalog';
import { recordPlannerShadowObservation } from '@/lib/planner-shadow-metrics';
import { computePlannerRouteAlignment, serializePlannerRouteAlignment } from '@/lib/planner-route-alignment';
import type { ThinkingChainLayers, AnswerMode, DisclosureLevel } from '@/contracts/request-understanding/thinking-chain-contract';
import type { UrlFactLoopResult } from '@/lib/url-fact-loop';
import { validateRouteSelection } from '@/lib/route-verification';
import { buildCausalSkeleton } from '@/lib/diagnosis/causal-skeleton';

interface ReportContinuationClassification {
  compatible: boolean;
  policy: 'llm' | 'heuristic';
  reasonCode: string;
  confidence: number;
}

const SERVICE_INTENT_BY_ROUTE_INTENT: Partial<Record<IntentType, ServiceIntent | 'general_chat'>> = {
  report_query: 'data_query',
  diagnosis: 'issue_diagnosis',
  get_delivery_packages: 'package_fetch',
  debugging: 'system_operation',
  demand: 'light_requirement',
  help: 'help_qa',
  forecast: 'data_query',
  monitor: 'system_operation',
};

const UNSUPPORTED_SERVICE_INTENT_TOPICS = new Set<ServiceIntent | string>([
  'system_operation',
  'package_fetch',
  'integration_workflow',
]);

const TOOL_PURPOSE_BY_SERVICE_INTENT: Partial<Record<ServiceIntent | string, ToolPurpose>> = {
  package_fetch: 'package_fetch',
  integration_workflow: 'integration_run',
  issue_diagnosis: 'evidence_fetch',
  help_qa: 'help_lookup',
  light_requirement: 'draft_generation',
  report_delivery: 'report_generate',
  data_query: 'data_fetch',
  system_operation: 'config_check',
};

const REPORT_CONTINUATION_CLASSIFICATION_TIMEOUT_MS = 1200;

function buildServiceIntent(intentType: IntentType, message: string, isReportQuery: boolean): string {
  return SERVICE_INTENT_BY_ROUTE_INTENT[intentType] || (isReportQuery ? 'data_query' : 'general_chat');
}

function normalizeTopLevelServiceIntent(serviceIntent: string): string {
  return serviceIntent === 'package_fetch' ? 'system_operation' : serviceIntent;
}

function authRequiredAnswerForServiceIntent(serviceIntent: string): string {
  if (serviceIntent === 'issue_diagnosis') {
    return '需要登录后才能查询内部数据并继续诊断。请在当前浏览器完成登录后重试，我会按你的项目权限查看指标变化、定位可能原因。';
  }
  if (serviceIntent === 'integration_workflow' || serviceIntent === 'system_operation' || serviceIntent === 'package_fetch') {
    return '需要登录后才能执行这类内部操作。请在当前浏览器完成登录后重试，我会按你的权限继续处理。';
  }
  return '需要登录后才能查询内部报表数据。请在当前浏览器完成登录后重试，我会按你的项目权限继续查询。';
}

function resolveNonReportFallbackMessage(serviceIntent: ServiceIntent | string | undefined, routeIntent?: string): string {
  if (!serviceIntent) {
    return resolveChatBoundaryMessage('unsupported');
  }
  if (serviceIntent === 'issue_diagnosis') {
    return resolveChatBoundaryMessage('unsupported_service_intent', {
      topic: routeIntent || 'diagnosis',
      policy: 'heuristic',
    });
  }
  if (UNSUPPORTED_SERVICE_INTENT_TOPICS.has(serviceIntent)) {
    return resolveChatBoundaryMessage('unsupported_service_intent', {
      topic: serviceIntent,
      policy: 'heuristic',
    });
  }
  return resolveChatBoundaryMessage('unsupported_route_intent', {
    topic: routeIntent || 'unknown',
    policy: 'heuristic',
  });
}

function parseJsonModelOutput(rawText: string): Record<string, unknown> | null {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        // ignore
      }
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // ignore
      }
    }
  }
  return null;
}

function buildReportContinuationHeuristic(message: string): ReportContinuationClassification {
  const normalized = cleanQuestion(message);
  const followupSignals = /(继续|再看|换成|改成|上面|刚才|详细|展开|继续查|再查|对比一下|解释一下|为什么|看一下|查一下|重新查)/i.test(normalized);
  if (followupSignals) {
    return {
      compatible: true,
      policy: 'heuristic',
      confidence: 0.88,
      reasonCode: 'report_continuation.followup_signal',
    };
  }
  return {
    compatible: false,
    policy: 'heuristic',
    confidence: 0.9,
    reasonCode: 'report_continuation.no_signal',
  };
}

function toConfidenceLevel(confidence?: string | number): 'low' | 'medium' | 'high' {
  if (typeof confidence === 'number') {
    if (confidence >= 0.82) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }
  if (confidence === 'high') return 'high';
  if (confidence === 'medium') return 'medium';
  if (confidence === 'low') return 'low';
  return 'low';
}

function buildProgressivePolicy(args: {
  serviceIntent: string;
  resolvedIntent: string;
  executionConfidence?: string | number;
  serviceType?: string;
  missingFieldCount?: number;
  routeWarningCount?: number;
  message?: string;
}): ProgressiveServicePolicy {
  const missCount = Math.max(0, args.missingFieldCount || 0);
  const warningCount = Math.max(0, args.routeWarningCount || 0);
  const confidenceLevel = toConfidenceLevel(args.executionConfidence);
  const policyProfile = resolveServiceProgressivePolicyProfile(args.serviceType);
  const profileDefaultRisk = policyProfile.defaultRiskLevel || 'low';

  const ambiguityClass: AmbiguityClass =
    warningCount >= PROGRESSIVE_POLICY_THRESHOLD.CRITICAL_WARNING_COUNT || missCount >= PROGRESSIVE_POLICY_THRESHOLD.HIGH_RISK_MISSING_FIELD_COUNT
      ? 'high'
      : warningCount >= PROGRESSIVE_POLICY_THRESHOLD.LOW_RISK_WARNING_COUNT || missCount >= PROGRESSIVE_POLICY_THRESHOLD.LOW_RISK_MISSING_FIELD_COUNT
        ? 'low'
        : 'none';

  const riskLevel: RiskLevel =
    profileDefaultRisk === 'high' || profileDefaultRisk === 'critical'
      ? profileDefaultRisk
      : profileDefaultRisk === 'medium' && missCount <= 0 && warningCount <= 0
        ? 'medium'
        : warningCount >= PROGRESSIVE_POLICY_THRESHOLD.CRITICAL_WARNING_COUNT || missCount >= PROGRESSIVE_POLICY_THRESHOLD.CRITICAL_MISSING_FIELD_COUNT
          ? 'high'
          : warningCount >= PROGRESSIVE_POLICY_THRESHOLD.LOW_RISK_WARNING_COUNT || missCount >= PROGRESSIVE_POLICY_THRESHOLD.LOW_RISK_MISSING_FIELD_COUNT
            ? 'medium'
            : profileDefaultRisk;

  const reasoningPolicy: ReasoningPolicy = (() => {
    const policy = policyProfile.defaultReasoningPolicy || PROGRESSIVE_REASONING_POLICIES.direct_execute;
    if (riskLevel === 'high') {
      return policyProfile.allowReadOnlyProgress
        ? PROGRESSIVE_REASONING_POLICIES.minimum_viable_then_followup
        : PROGRESSIVE_REASONING_POLICIES.confirm_then_execute;
    }
    if (missCount > 0) {
      return (PROGRESSIVE_NON_BLOCKING_REASONING_POLICIES as readonly string[]).includes(policy)
        ? policy
        : PROGRESSIVE_REASONING_POLICIES.minimum_viable_then_followup;
    }
    return policy;
  })();

  const followUpMode: FollowUpMode = riskLevel === 'high'
    ? 'required_select'
    : missCount > 0
      ? policyProfile.defaultFollowUpMode
      : 'optional';

  const resolvedAmbiguityClass = ambiguityClass === 'none' ? (policyProfile.defaultAmbiguityClass || 'low') : ambiguityClass;
  const serviceCandidate = {
    serviceIntent: args.resolvedIntent || args.serviceIntent,
    name: '默认服务候选',
    score: confidenceLevel === 'high' ? 0.91 : confidenceLevel === 'medium' ? 0.77 : 0.56,
    rationale: args.message ? `基于路由决策与语义信号：${args.message}` : '基于路由决策',
    requiresPermission: false,
    requiresEscalation: riskLevel === 'high',
  };
  const defaults: UnresolvedAmbiguity[] = [];
  const selectedService = args.resolvedIntent || args.serviceIntent;
  const executionLimitMaxRecords = riskLevel === 'high' ? 60 : 100;
  const executionLimitMaxSources = riskLevel === 'high' ? 2 : 3;

  return {
    reasoningPolicy,
    ambiguityClass: resolvedAmbiguityClass,
    riskLevel,
    followUpMode,
    defaultScope: {
      scopeType: 'global',
      granularityDefault: 'day',
      timeRangeDefaultDays: 30,
    },
    minimumViableQuery: {
      queryType: 'diagnostic_snapshot',
      executableTarget: selectedService,
      assumptionsUsed: missCount > 0 ? ['默认口径假设'] : [],
      confidence: confidenceLevel === 'high' ? 0.86 : confidenceLevel === 'medium' ? 0.64 : 0.4,
      outputHint: ['最小可用结果', '风险说明'],
      executionLimit: {
        maxRecords: executionLimitMaxRecords,
        maxSources: executionLimitMaxSources,
      },
    },
    selectedService,
    serviceCandidates: [serviceCandidate],
    unresolvedAmbiguities: defaults,
    secondHopReason: resolvedAmbiguityClass === 'none' ? undefined : '存在未决歧义，采用渐进式执行',
    executionGuardrails: {
      canExecutePartial: policyProfile.allowReadOnlyProgress,
      canFallbackToQuestion: true,
      canQueue: false,
    },
    confirmationItems: buildConfirmationItems(args.serviceType, riskLevel),
  };
}

async function classifyReportContinuationByModel(
  message: string,
  modelOptions?: { modelServiceConfig?: ModelServiceConfig; routeIntent?: IntentType },
): Promise<ReportContinuationClassification | null> {
  const normalized = cleanQuestion(message);
  if (!normalized) return null;

  // P0 治理：从 prompt store 读取 managed prompt，失败时 fallback 到原始内置文案
  const REPORT_CONTINUATION_BUILTIN_PROMPT = [
    '你是聊天路由兼容性判定器。请判断用户当前问题是否可以作为上一轮报表/问数结果的续问。',
    '只输出 JSON，不要输出 Markdown。JSON 字段必须包含 compatible(boolean), reasonCode(string), confidence(number 0-1), reason(string)。',
    'compatible=true 表示用户仍在围绕上一轮结果的同一对象、同一数据范围、同一分析问题或同一追问目标继续。',
    'compatible=false 表示用户切换到了新的主题、新的信息源、新任务类型或不依赖上一轮结果的问题。',
    'reasonCode 只能使用以下枚举之一：report_continuation.followup_signal, report_continuation.report_signal, report_continuation.no_signal。',
    '禁止编造业务事实，只做路由兼容性判断。',
  ].join('\n');
  const managedPrompt = await getPromptContent('report_continuation.classifier', '').catch(() => '');
  const prompt = managedPrompt || REPORT_CONTINUATION_BUILTIN_PROMPT;

  const fallbackText = JSON.stringify({
    compatible: false,
    reasonCode: 'report_continuation.no_signal',
    confidence: 0.2,
    reason: 'fallback',
  });
  const timeout = new Promise<string>((resolve) => {
    setTimeout(() => resolve(fallbackText), REPORT_CONTINUATION_CLASSIFICATION_TIMEOUT_MS);
  });

  const resultText = await Promise.race([
    generateModelText({
      useCase: 'intent_routing_review',
      input: {
        message,
        route_intent: modelOptions?.routeIntent || 'general',
      },
      fallback: fallbackText,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `用户问题：${message}` },
      ],
      modelServiceConfig: modelOptions?.modelServiceConfig,
    }).then((item) => item.text),
    timeout,
  ]);

  const parsed = parseJsonModelOutput(resultText);
  if (!parsed || typeof parsed !== 'object') return null;

  const compatible = parsed.compatible === true;
  const reasonCode = typeof parsed.reasonCode === 'string' && parsed.reasonCode
    ? parsed.reasonCode
    : compatible
      ? 'report_continuation.followup_signal'
      : 'report_continuation.no_signal';
  const confidence = typeof parsed.confidence === 'number' && !Number.isNaN(parsed.confidence)
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0.5;

  return {
    compatible,
    reasonCode,
    confidence,
    policy: 'llm',
  };
}

async function isReportContinuationCompatible(
  message: string,
  routeIntent: IntentType,
  reportRouteMatch: boolean,
  capabilityReportMatch: boolean,
  options?: { modelServiceConfig?: ModelServiceConfig },
): Promise<ReportContinuationClassification> {
  if (routeIntent === 'report_query') {
    return {
      compatible: true,
      policy: 'heuristic',
      reasonCode: 'report_continuation.report_signal',
      confidence: 0.95,
    };
  }

  if (reportRouteMatch || capabilityReportMatch) {
    return {
      compatible: true,
      policy: 'heuristic',
      reasonCode: reportRouteMatch
        ? 'report_continuation.report_signal'
        : 'report_continuation.report_signal',
      confidence: 0.95,
    };
  }

  const modelResult = await classifyReportContinuationByModel(message, {
    modelServiceConfig: options?.modelServiceConfig,
    routeIntent,
  });
  if (modelResult) {
    if (modelResult.compatible) return modelResult;
    if (!modelResult.compatible && modelResult.confidence >= 0.85 && modelResult.reasonCode !== 'report_continuation.no_signal') {
      return modelResult;
    }
  }

  const heuristicResult = buildReportContinuationHeuristic(message);
  return heuristicResult;
}

function buildToolPurpose(intentType: IntentType, serviceIntent: string, message: string, isReportQuery: boolean): ToolPurpose {
  if (isReportQuery) return serviceIntent === 'report_delivery' ? 'report_generate' : 'data_fetch';
  return TOOL_PURPOSE_BY_SERVICE_INTENT[serviceIntent]
    || (intentType === 'get_delivery_packages' ? 'package_fetch' : 'none');
}

// ─── 思维链四层投影 & 确认项辅助 ──────────────────────────

function deriveAnswerMode(policy: ProgressiveServicePolicy | undefined, isReportQuery: boolean): AnswerMode {
  if (!policy) return isReportQuery ? 'business_summary' : 'direct_answer';
  if (policy.riskLevel === 'high' || policy.followUpMode === 'required_confirm' || policy.followUpMode === 'required_select') {
    return 'blocking_confirmation';
  }
  if (policy.reasoningPolicy === 'minimum_viable_then_followup') {
    return policy.ambiguityClass === 'medium' || policy.ambiguityClass === 'high'
      ? 'evidence_first_with_hypotheses'
      : 'business_summary_with_follow_up';
  }
  if (policy.reasoningPolicy === 'read_only_with_context') {
    return 'business_summary_with_follow_up';
  }
  return isReportQuery ? 'business_summary' : 'direct_answer';
}

function deriveDisclosureLevel(policy: ProgressiveServicePolicy | undefined): DisclosureLevel {
  if (!policy) return 'side_panel_only';
  if (policy.riskLevel === 'high' || policy.riskLevel === 'critical') return 'admin_trace_only';
  return 'user_readable';
}

function deriveExecutionMode(policy: ProgressiveServicePolicy | undefined): string {
  if (!policy) return 'direct_execute';
  if (policy.riskLevel === 'high' || policy.riskLevel === 'critical') return 'block_for_confirmation';
  if (policy.reasoningPolicy === 'minimum_viable_then_followup') return 'aggregate_first';
  if (policy.reasoningPolicy === 'read_only_with_context') return 'read_only_with_context';
  if (policy.reasoningPolicy === 'confirm_then_execute') return 'confirm_then_execute';
  return 'direct_execute';
}

function buildConfirmationItems(serviceType?: string, riskLevel?: string): Array<{ label: string; description?: string; required: boolean }> {
  if (riskLevel !== 'high' && riskLevel !== 'critical') return [];
  // 按服务类型生成默认确认清单
  if (serviceType === 'automation_task') {
    return [
      { label: '任务执行频率和触发条件', required: true },
      { label: '影响的数据范围和指标', required: true },
      { label: '通知方式和告警阈值', required: false },
    ];
  }
  if (serviceType === 'integration_workflow') {
    return [
      { label: '联调的项目和包', required: true },
      { label: '联调媒体和联调对象', required: true },
      { label: '预期联调范围和验收标准', required: false },
    ];
  }
  if (serviceType === 'join_table_report') {
    return [
      { label: '报表模板和数据范围', required: true },
      { label: '输出格式和交付方式', required: true },
    ];
  }
  // 通用高风险确认
  return [
    { label: '确认操作对象和范围', required: true },
    { label: '确认影响和回退方式', required: true },
  ];
}

function deriveFollowUpQuestion(policy: ProgressiveServicePolicy | undefined): string | undefined {
  if (!policy) return undefined;
  // 优先从 unresolvedAmbiguities 推导
  if (policy.unresolvedAmbiguities?.length) {
    return policy.unresolvedAmbiguities[0]?.question;
  }
  // 其次从 secondHopReason 推导
  if (policy.secondHopReason) {
    return `是否需要${policy.secondHopReason}？`;
  }
  return undefined;
}

function deriveSuggestedActions(policy: ProgressiveServicePolicy | undefined, serviceType?: string): string[] {
  if (!policy) return [];
  const actions: string[] = [];
  // 从 secondHopReason 推导下钻动作
  if (policy.secondHopReason) {
    if (policy.secondHopReason.includes('未决歧义')) {
      actions.push('确认歧义范围', '按默认口径继续');
    } else {
      actions.push('继续深入分析');
    }
  }
  // 从服务类型推导推荐动作
  if (serviceType === 'data_query') {
    actions.push('按媒体拆分', '按时间趋势查看');
  } else if (serviceType === 'data_issue_diagnosis' || serviceType === 'roi_diagnosis') {
    actions.push('查看回传链路', '检查归因配置');
  } else if (serviceType === 'package_fetch') {
    actions.push('查看包详情', '检查包状态');
  }
  // 从 unresolvedAmbiguities 推导
  if (policy.unresolvedAmbiguities?.length) {
    const firstAmbiguity = policy.unresolvedAmbiguities[0];
    if (firstAmbiguity?.question && !actions.includes(firstAmbiguity.question)) {
      actions.unshift(firstAmbiguity.question);
    }
  }
  return actions.slice(0, 4); // 最多 4 个推荐动作
}

function projectThinkingChain(params: {
  serviceType?: string;
  progressivePolicy?: ProgressiveServicePolicy;
  isReportQuery: boolean;
  routeIntent: string;
  urlFactLoop?: UrlFactLoopResult;
  complexity?: 'low' | 'medium' | 'high';
}): ThinkingChainLayers {
  const { serviceType, progressivePolicy, isReportQuery, routeIntent, urlFactLoop, complexity = 'medium' } = params;
  const policy = progressivePolicy;
  // 所有层始终全量计算（Judge 层的 riskLevel/ambiguityClass 是下游策略基础，不可跳过）
  const answerMode = deriveAnswerMode(policy, isReportQuery);
  const disclosureLevel = deriveDisclosureLevel(policy);
  const executionMode = deriveExecutionMode(policy);

  const serviceCandidates = (policy?.serviceCandidates || []).map((c) => ({
    type: c.serviceIntent,
    score: c.score,
    reason: c.rationale,
  }));

  // 低复杂度时精简投影：express 层跳过多模式推导，直接走默认
  const effectiveAnswerMode = complexity === 'low'
    ? (isReportQuery ? 'business_summary' : 'direct_answer')
    : answerMode;
  const effectiveFollowUpQuestion = complexity === 'low'
    ? undefined
    : deriveFollowUpQuestion(policy);
  const effectiveSuggestedActions = complexity === 'low'
    ? []
    : deriveSuggestedActions(policy, serviceType);

  return {
    identify: {
      serviceType: serviceType || 'general_chat',
      serviceCandidates,
      selectedService: policy?.selectedService || routeIntent,
      urlCues: urlFactLoop?.urlCues?.map((cue) => ({
        raw: cue.raw,
        normalized: cue.normalized,
        domainIntent: cue.domainIntent,
      })),
    },
    judge: {
      reasoningPolicy: policy?.reasoningPolicy || 'direct_execute',
      ambiguityClass: policy?.ambiguityClass || 'none',
      riskLevel: policy?.riskLevel || 'low',
      executionMode,
      urlEvidenceGap: urlFactLoop?.evidenceGap,
    },
    advance: {
      defaultScope: (policy?.defaultScope as unknown as Record<string, unknown>) || {},
      minimumViableQuery: (policy?.minimumViableQuery as unknown as Record<string, unknown>) || {},
      secondHopStrategy: policy?.secondHopReason,
      confirmationGate: executionMode === 'block_for_confirmation' ? 'user_confirm_required' : undefined,
      urlHypotheses: urlFactLoop?.hypotheses?.map((h) => ({ keyword: h.keyword, source: h.source })),
      // 因果推理骨架（仅诊断类服务）
      ...((serviceType === 'roi_diagnosis' || serviceType === 'data_issue_diagnosis') ? {
        causalSkeleton: (() => {
          const skeleton = buildCausalSkeleton({
            rootQuestion: `诊断：${serviceType === 'roi_diagnosis' ? 'ROI 异常' : '数据问题'}`,
            serviceType,
          });
          return {
            rootQuestion: skeleton.rootQuestion,
            overallConfidence: skeleton.overallConfidence,
            nodeCount: skeleton.tree.length,
          };
        })(),
      } : {}),
    },
    express: {
      answerMode: effectiveAnswerMode,
      disclosureLevel,
      followUpMode: policy?.followUpMode || 'optional',
      followUpQuestion: effectiveFollowUpQuestion,
      suggestedActions: effectiveSuggestedActions,
    },
  };
}

function buildRouteDecisionMetadata(params: {
  clientIntent?: string;
  routeIntent: IntentType;
  resolvedIntent: string;
  executionConfidence?: 'low' | 'medium' | 'high' | number | string;
  routeReason: string;
  matchedRules: ReturnType<typeof evaluateIntentRouteRules>;
  reportRouteMatch: boolean;
  reportContinuation: boolean;
  userRequirementTask: string;
  userRequirementServiceIntent?: string;
  selectedSkill?: { skill_id: string; name: string } | null;
  reportContinuationClassification?: ReportContinuationClassification | null;
  capabilityDecision?: {
    selected?: { capabilityId?: string; source?: { toolName?: string } };
    fallbackUsed?: boolean;
    fallbackReason?: string;
    warnings?: string[];
    candidates?: Array<{ capability?: { capabilityId?: string; source?: { toolName?: string } } }>;
    dataCoverage?: { covered?: boolean; missing?: string[]; reasons?: string[]; supportLevel?: string };
    presentationCoverage?: { covered?: boolean; missing?: string[]; reasons?: string[] };
  } | null;
  isReportQuery: boolean;
  routeWarnings: string[];
  message: string;
  serviceType?: string;
  missingFieldCount?: number;
  urlFactLoop?: UrlFactLoopResult;
}): PipelineRouteDecisionMetadata {
  const routeServiceIntent = buildServiceIntent(params.routeIntent, params.message, params.isReportQuery);
  const rawServiceIntent = params.userRequirementServiceIntent && params.userRequirementServiceIntent !== 'general_chat'
    ? params.userRequirementServiceIntent
    : routeServiceIntent;
  const serviceIntent = normalizeTopLevelServiceIntent(rawServiceIntent);
  const routeServiceType = params.serviceType;
  const resolvedIntentServiceType = fromPlannerServiceIntent(String(params.resolvedIntent || ''));
  const fallbackByIntentServiceType = fromLegacyServiceIntent(String(rawServiceIntent || ''));
  const resolvedRouteServiceType = isValidServiceType(routeServiceType || '') ? routeServiceType : undefined;
  const serviceType = resolvedRouteServiceType || resolvedIntentServiceType || fallbackByIntentServiceType || routeServiceType;
  const serviceTypeSource = serviceType
    ? resolvedRouteServiceType
      ? 'routeServiceType'
      : resolvedIntentServiceType
        ? 'resolvedIntent'
        : fallbackByIntentServiceType
          ? 'fallbackByIntent'
          : undefined
    : undefined;
  const serviceTypeCandidateSources = [
    ...(routeServiceType ? [{ source: 'routeServiceType' as const, value: routeServiceType }] : []),
    ...(resolvedIntentServiceType ? [{ source: 'resolvedIntent' as const, value: resolvedIntentServiceType }] : []),
    ...(fallbackByIntentServiceType ? [{ source: 'rawServiceIntent' as const, value: fallbackByIntentServiceType }] : []),
  ].filter((item, index, arr) => {
    const key = `${item.source}:${item.value}`;
    const existed = arr.slice(0, index).some((prev) => `${prev.source}:${prev.value}` === key);
    return !existed;
  });
  const ignoredClientIntentReason = params.clientIntent && params.clientIntent !== params.resolvedIntent
    ? `client_intent_conflict:${params.clientIntent}->${params.resolvedIntent}`
    : undefined;
  const progressivePolicy = buildProgressivePolicy({
    serviceIntent,
    resolvedIntent: params.resolvedIntent,
    executionConfidence: params.executionConfidence,
    routeWarningCount: params.routeWarnings.length,
    missingFieldCount: params.missingFieldCount,
    serviceType,
    message: params.message,
  });

  // ─── 路由自修正验证（仅只读服务允许降级）───
  const routeVerification = validateRouteSelection({
    selectedService: serviceType,
  });
  const effectiveServiceType = routeVerification.downgraded && routeVerification.downgradedService
    ? routeVerification.downgradedService
    : serviceType;
  const downgradeWarning = routeVerification.warning;

  return {
    clientIntent: params.clientIntent || null,
    resolvedIntent: params.resolvedIntent,
    serviceIntent,
    ignoredClientIntentReason: ignoredClientIntentReason || null,
    routeEvidence: {
      routeIntent: params.routeIntent,
      userRequirementTask: params.userRequirementTask,
      reportRouteMatch: params.reportRouteMatch,
      reportContinuation: params.reportContinuation,
      reportContinuationClassification: params.reportContinuationClassification
        ? {
            compatible: params.reportContinuationClassification.compatible,
            policy: params.reportContinuationClassification.policy,
            reasonCode: params.reportContinuationClassification.reasonCode,
            confidence: params.reportContinuationClassification.confidence,
          }
          : null,
      routeReason: params.routeReason,
    },
    matchedRules: params.matchedRules.map((item) => ({
      id: item.rule.id,
      name: item.rule.name,
      intent_type: item.rule.intent_type,
      score: item.score,
      matched_terms: item.matched_terms,
      rollout_hit: item.rollout_hit,
      reasons: item.reasons,
    })),
    selectedSkill: params.selectedSkill || null,
    capabilityDecision: params.capabilityDecision || null,
    isReportQuery: params.isReportQuery,
    toolPurpose: buildToolPurpose(params.routeIntent, serviceIntent, params.message, params.isReportQuery),
    warnings: [...new Set([
      ...params.routeWarnings,
      ...(params.capabilityDecision?.warnings || []),
      ...(ignoredClientIntentReason ? [ignoredClientIntentReason] : []),
      ...(downgradeWarning ? [downgradeWarning] : []),
      ...(routeVerification.downgradeReason ? [`route_verification:${routeVerification.downgradeReason}`] : []),
    ])],
    progressivePolicy,
    serviceTypeSource,
    serviceTypeCandidateSources,
    ...(serviceType ? { serviceType } : {}),
    ...(routeVerification.downgraded ? {
      routeDowngrade: {
        originalService: routeVerification.originalService,
        downgradedService: routeVerification.downgradedService,
        reason: routeVerification.downgradeReason,
      },
    } : {}),
    thinkingChain: projectThinkingChain({
      serviceType: effectiveServiceType || serviceType,
      progressivePolicy,
      isReportQuery: params.isReportQuery,
      routeIntent: params.routeIntent,
      urlFactLoop: params.urlFactLoop,
    }),
    ...(params.urlFactLoop ? { urlFactLoop: params.urlFactLoop } : {}),
  };
}

function buildRouteObservationEvent(observation: ReturnType<typeof buildRouteDecisionObservation>): AgentProcessEvent {
  return createProcessEvent({
    type: 'route_observation',
    label: '路由观测',
    summary: summarizeRouteDecisionObservation(observation),
    status: observation.mismatches.some(item => item.severity === 'error') ? 'error' : 'success',
    output: compactRuntimePayload(observation, { depth: 4, maxString: 800, maxArray: 8, maxKeys: 30 }) as Record<string, unknown>,
  });
}

/**
 * Planner Shadow Trace - 旁路观测 helper
 * 只在 PLANNER_FIRST_SHADOW_ENABLED=true 时执行，不影响主链
 */
async function emitPlannerShadowObservationIfEnabled(params: {
  message: string;
  history?: Array<{ role: string; content: string }>;
  pushEvent: (event: AgentProcessEvent) => void;
  /** Stage 3: 用于计算 route alignment（可选） */
  route?: { intent_type: string; confidence: 'high' | 'medium' | 'low'; serviceIntent?: string };
  /** Stage 2: shadow 结果回调，用于入账 planner_inference 到 Evidence Ledger（可选） */
  onShadowResult?: (result: Awaited<ReturnType<typeof runPlannerShadow>>) => void;
}): Promise<void> {
  // 检查开关
  if (process.env.PLANNER_FIRST_SHADOW_ENABLED !== 'true') {
    return;
  }

  try {
    const shadowTimeoutMs = Math.min(
      Number(process.env.PLANNER_FIRST_SHADOW_TIMEOUT_MS) || 2000,
      2000,  // 最多 2s，避免影响首包
    );

    const shadowResult = await Promise.race([
      runPlannerShadow({
        message: params.message,
        history: params.history,
        timeoutMs: shadowTimeoutMs,
      }),
      new Promise<Awaited<ReturnType<typeof runPlannerShadow>>>((resolve) => {
        setTimeout(() => resolve({
          status: 'timeout',
          errors: [{ code: 'timeout', message: 'Planner shadow timeout' }],
          warnings: [],
          durationMs: shadowTimeoutMs,
        }), shadowTimeoutMs);
      }),
    ]);

    if (shadowResult.status !== 'disabled') {
      // Stage 3: 记录 Planner Shadow 指标
      recordPlannerShadowObservation(shadowResult);

      const shadowPayload = buildPlannerShadowObservationPayload(shadowResult);
      const shadowSummary = buildPlannerShadowSummary(shadowPayload);
      params.pushEvent(createProcessEvent({
        type: 'planner_shadow_observation',
        label: 'Planner Shadow 观测',
        summary: shadowSummary,
        status: shadowResult.status === 'succeeded' ? 'success' : 'error',
        output: shadowPayload as unknown as Record<string, unknown>,
      }));

      // Stage 2: 通知调用方 shadow 结果（用于入账 planner_inference 到 Evidence Ledger）
      if (params.onShadowResult) {
        try {
          params.onShadowResult(shadowResult);
        } catch {
          // fail-open
        }
      }

      // Stage 3: 计算 route alignment 并推送到 trace
      if (params.route && shadowResult.status === 'succeeded' && shadowResult.plan) {
        const alignment = computePlannerRouteAlignment({
          route: {
            intent_type: params.route.intent_type,
            confidence: params.route.confidence,
            serviceIntent: params.route.serviceIntent,
          },
          planner: {
            status: shadowResult.status,
            plan: shadowResult.plan,
          },
        });
        params.pushEvent(createProcessEvent({
          type: 'route_observation',
          label: 'Planner 路由对齐分析',
          summary: `alignment=${alignment.alignment}${alignment.diverged_fields.length ? ` (差异: ${alignment.diverged_fields.join(', ')})` : ''}`,
          status: alignment.alignment === 'matched' ? 'success' : alignment.alignment === 'diverged' ? 'error' : 'success',
          visibility: 'internal',
          output: serializePlannerRouteAlignment(alignment) as Record<string, unknown>,
        }));
      }
    }
  } catch (error) {
    // Fail-open: trace 写入失败不影响主链
    console.warn('[Planner Shadow] Failed to emit observation:', error);
  }
}

export {
  SERVICE_INTENT_BY_ROUTE_INTENT,
  type ReportContinuationClassification,
  buildServiceIntent,
  normalizeTopLevelServiceIntent,
  buildProgressivePolicy,
  authRequiredAnswerForServiceIntent,
  resolveNonReportFallbackMessage,
  parseJsonModelOutput,
  buildReportContinuationHeuristic,
  classifyReportContinuationByModel,
  isReportContinuationCompatible,
  buildToolPurpose,
  buildRouteDecisionMetadata,
  buildRouteObservationEvent,
  emitPlannerShadowObservationIfEnabled,
};



