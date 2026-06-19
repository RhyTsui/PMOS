import type { IntentType } from '@/types';
import type {
  CapabilityBlockedReason,
  CapabilityCandidateContract,
  CapabilityDecisionContract,
  DomainSignalContract,
  DomainSignalType,
  MatchedRule,
  PrimaryDeliverable,
  PromptRuntimeConflict,
  PromptRuntimeMetadataContract,
  RouteDecisionContract,
  RouteEvidence,
  RouteWarning,
  ServiceIntent,
  SkillSelectionContract,
  ToolPurpose,
} from '@/contracts/request-understanding/route-decision-contract';
import type { PromptConfigMetadata } from './prompt-runtime-policy';
import { ADVERTISING_DOMAIN_PACK_ID, ADVERTISING_DOMAIN_SIGNAL_TERMS } from './advertising-domain-pack';
import { scanRouteGovernanceConflicts, type RouteGovernanceConflict, type RouteRuleGovernanceMetadata } from './route-governance-scanner';

type MatchedRouteRuleInput = Array<{
  rule: {
    id: string;
    name?: string;
    intent_type?: IntentType;
    priority?: number;
    source_pack?: string;
    updated_at?: string;
  };
  score?: number;
  matched_terms?: string[];
  rollout_hit?: boolean;
  reasons?: string[];
}>;

type SkillSelectionInput = {
  selected?: {
    skill: {
      skill_id: string;
      name?: string;
      domain?: string;
      category?: string;
      selection_policy?: {
        requires_trigger_match_for_route_bonus?: boolean;
      };
    };
    score?: number;
    reasons?: string[];
    matchedTriggers?: string[];
  };
  candidates?: Array<{
    skill: {
      skill_id: string;
      name?: string;
      domain?: string;
      category?: string;
      selection_policy?: {
        requires_trigger_match_for_route_bonus?: boolean;
      };
    };
    score?: number;
    reasons?: string[];
    matchedTriggers?: string[];
  }>;
};

type CapabilityDecisionInput = {
  selected?: {
    capabilityId: string;
    capabilityType?: string;
    dataDomain?: string;
    source?: {
      toolName?: string;
      serverId?: string;
    };
  };
  candidates?: Array<{
    capability: {
      capabilityId: string;
      capabilityType?: string;
      dataDomain?: string;
      source?: {
        toolName?: string;
        serverId?: string;
      };
    };
    score?: number;
    reasons?: string[];
    dataCoverage?: {
      missing?: string[];
    };
    presentationCoverage?: {
      missing?: string[];
    };
  }>;
  executionDecision?: string;
  blockingReason?: string;
  fallbackReason?: string;
  warnings?: string[];
};

export interface RouteDecisionActualExecution {
  actualServiceIntent: ServiceIntent;
  actualIsReportQuery: boolean;
  actualSelectedSkill?: string;
  actualSelectedTool?: string;
  actualToolPurpose: ToolPurpose;
  actualCapabilityId?: string;
  actualFallbackReason?: string;
}

export interface RouteDecisionObservation extends RouteDecisionContract {
  mode: 'observe_only';
  promptRuntime?: PromptRuntimeMetadataContract & {
    available: boolean;
    conflictWarnings?: string[];
    slots?: Record<string, {
      activePromptId?: string;
      activePromptVersion?: string;
      promptSource?: string;
      seedFallbackUsed?: boolean;
      cacheHit?: boolean;
      contentHash?: string;
      conflicts?: PromptRuntimeConflict[];
      conflictWarnings?: string[];
    }>;
  };
  routeRulesGovernance?: RouteRuleGovernanceMetadata[];
  governanceConflicts?: RouteGovernanceConflict[];
  actualExecution: RouteDecisionActualExecution;
  mismatches: Array<{
    code: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;
}

export function isRouteDecisionObservationEnabled(): boolean {
  return process.env.XIAOQIAO_ROUTE_DECISION_OBSERVATION_ENABLED !== 'false';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeTopLevelServiceIntent(serviceIntent: ServiceIntent): ServiceIntent {
  return serviceIntent === 'package_fetch' ? 'system_operation' : serviceIntent;
}

export function serviceIntentFromRoute(intentType: IntentType, isReportQuery: boolean): ServiceIntent {
  if (intentType === 'report_query') {
    return 'data_query';
  }
  if (intentType === 'diagnosis') return 'issue_diagnosis';
  if (intentType === 'get_delivery_packages') return 'package_fetch';
  if (intentType === 'debugging') return 'system_operation';
  if (intentType === 'monitor') return 'system_operation';
  if (intentType === 'demand') return 'light_requirement';
  if (intentType === 'help') return 'help_qa';
  if (intentType === 'forecast') return 'data_query';
  return isReportQuery ? 'data_query' : 'general_chat';
}

export function primaryDeliverableFor(serviceIntent: ServiceIntent): PrimaryDeliverable {
  if (serviceIntent === 'help_qa') return 'help_answer';
  if (serviceIntent === 'light_requirement') return 'requirement_draft';
  if (serviceIntent === 'issue_diagnosis') return 'diagnosis_result';
  if (serviceIntent === 'system_operation' || serviceIntent === 'package_fetch' || serviceIntent === 'integration_workflow') return 'operation_result';
  if (serviceIntent === 'data_query') return 'data_table';
  if (serviceIntent === 'report_delivery') return 'report';
  return 'chat_answer';
}

export function toolPurposeFor(serviceIntent: ServiceIntent, routeIntent?: IntentType): ToolPurpose {
  if (serviceIntent === 'help_qa') return 'help_lookup';
  if (serviceIntent === 'light_requirement') return 'draft_generation';
  if (serviceIntent === 'issue_diagnosis') return 'evidence_fetch';
  if (serviceIntent === 'package_fetch') return 'package_fetch';
  if (serviceIntent === 'integration_workflow') return 'integration_run';
  if (serviceIntent === 'system_operation') {
    if (routeIntent === 'debugging') return 'integration_run';
    if (routeIntent === 'get_delivery_packages') return 'package_fetch';
    return 'config_check';
  }
  if (serviceIntent === 'report_delivery') return 'report_generate';
  if (serviceIntent === 'data_query') return 'data_fetch';
  return 'none';
}

function confidenceToNumber(value?: string): number {
  if (value === 'high') return 0.9;
  if (value === 'medium') return 0.65;
  if (value === 'low') return 0.35;
  return 0.5;
}

function routeWarningsFrom(values: string[]): RouteWarning[] {
  return unique(values).map((rawMessage) => {
    const [code, detail = ''] = rawMessage.split(':');
    const message = (() => {
      if (code === 'public_web_candidate_continues_to_composer') return '公开联网结果已作为候选证据进入通用回答链路。';
      if (code === 'public_web_no_reliable_source_fell_back_to_model_answer') return '公开联网未取得足够可靠来源，已继续交由通用回答链路处理。';
      if (code === 'client_intent_conflict') return detail ? `客户端提示与后端路由不一致：${detail}。` : '客户端提示与后端路由不一致。';
      if (code === 'client_intent_ignored') return detail ? `客户端提示未被后端路由采纳：${detail}。` : '客户端提示未被后端路由采纳。';
      return rawMessage;
    })();
    return {
      code: code || 'route_observation_warning',
      message,
      severity: /conflict|ignored|blocked|fallback|missing/i.test(rawMessage) ? 'warning' : 'info',
    };
  });
}

function signalTypeForGroup(group: keyof typeof ADVERTISING_DOMAIN_SIGNAL_TERMS): DomainSignalType {
  if (group === 'businessObject') return 'business_object';
  if (group === 'workflow') return 'workflow_scope';
  return group;
}

export function buildDomainSignals(message: string): DomainSignalContract[] {
  const normalized = String(message || '').toLowerCase();
  const signals: DomainSignalContract[] = [];
  for (const [group, terms] of Object.entries(ADVERTISING_DOMAIN_SIGNAL_TERMS) as Array<[keyof typeof ADVERTISING_DOMAIN_SIGNAL_TERMS, readonly string[]]>) {
    for (const term of terms) {
      if (!term || !normalized.includes(term.toLowerCase())) continue;
      signals.push({
        domain: ADVERTISING_DOMAIN_PACK_ID,
        signalType: signalTypeForGroup(group),
        normalizedValue: term,
        rawValue: term,
        source: 'compat_domain_signal_terms',
        confidence: 0.7,
        evidenceOnly: true,
      });
    }
  }
  return signals;
}

function buildMatchedRules(matchedRules: MatchedRouteRuleInput): MatchedRule[] {
  return matchedRules.map((item) => ({
    ruleId: item.rule.id,
    ruleVersion: item.rule.updated_at,
    ruleSource: item.rule.source_pack ? 'domain_config' : 'runtime',
    ruleType: item.rule.intent_type === 'report_query' ? 'top_intent' : 'top_intent',
    matched: true,
    priority: item.rule.priority,
    precedence: item.score,
    reason: item.reasons?.join('; ') || item.matched_terms?.join(','),
  }));
}

function buildPromptRuntime(promptConfig?: PromptConfigMetadata): RouteDecisionObservation['promptRuntime'] {
  if (!promptConfig) {
    return {
      available: false,
      promptSource: 'fallback',
      seedFallbackUsed: false,
      cacheHit: false,
      conflicts: [{
        conflictType: 'prompt_rule_conflict',
        message: 'Prompt runtime metadata is not available in this route branch.',
        severity: 'info',
      }],
    };
  }
  const entries = Object.entries(promptConfig).filter((entry): entry is [string, NonNullable<PromptConfigMetadata[keyof PromptConfigMetadata]>] => Boolean(entry[1]));
  const routePrompt = promptConfig.route_prompt || entries[0]?.[1];
  const slotConflicts = entries.flatMap(([slot, value]) =>
    (value.conflicts || []).map((conflict) => ({
      conflictType: 'prompt_rule_conflict' as const,
      promptId: slot,
      message: `${conflict.reason}:${conflict.prompt_ids.join(',')}`,
      severity: 'warning' as const,
    })),
  );
  return {
    available: entries.length > 0,
    activePromptId: routePrompt?.id,
    activePromptVersion: routePrompt?.version ? String(routePrompt.version) : undefined,
    promptSource: routePrompt?.fallback ? 'fallback' : routePrompt?.source === 'builtin_fallback' ? 'builtin' : 'runtime',
    seedFallbackUsed: entries.some(([, value]) => value.fallback),
    cacheHit: entries.some(([, value]) => value.cache_hit),
    contentHash: routePrompt?.content_hash,
    conflicts: slotConflicts,
    conflictWarnings: slotConflicts.map(conflict => conflict.message),
    slots: Object.fromEntries(entries.map(([slot, value]) => [slot, {
      activePromptId: value.id,
      activePromptVersion: String(value.version),
      promptSource: value.source === 'builtin_fallback' ? 'builtin' : value.source === 'intent_fallback' || value.source === 'exact' ? 'runtime' : 'fallback',
      seedFallbackUsed: value.fallback,
      cacheHit: value.cache_hit,
      contentHash: value.content_hash,
      conflicts: (value.conflicts || []).map((conflict) => ({
        conflictType: 'prompt_rule_conflict' as const,
        promptId: slot,
        message: `${conflict.reason}:${conflict.prompt_ids.join(',')}`,
        severity: 'warning' as const,
      })),
      conflictWarnings: value.conflictWarnings || (value.conflicts || []).map((conflict) => `${conflict.reason}:${conflict.prompt_ids.join(',')}`),
    }])),
  };
}

function buildRouteRulesGovernance(matchedRules: MatchedRouteRuleInput): RouteRuleGovernanceMetadata[] {
  return matchedRules.map((item) => ({
    ruleId: item.rule.id,
    status: 'active',
    activeVersion: item.rule.updated_at ? undefined : 1,
    version: item.rule.updated_at ? undefined : 1,
    precedence: item.score,
    priority: item.rule.priority,
    rolloutPercent: item.rollout_hit === false ? 0 : 100,
    updatedAt: item.rule.updated_at,
    changeReason: item.reasons?.join('; ') || item.matched_terms?.join(','),
  }));
}

function mapBlockedReason(value?: string): CapabilityBlockedReason | undefined {
  if (!value) return undefined;
  if (/missing|unresolved/i.test(value)) return 'missing_inputs';
  if (/permission/i.test(value)) return 'permission_denied';
  if (/intent/i.test(value)) return 'intent_not_allowed';
  if (/scope|forbidden/i.test(value)) return 'tool_scope_forbidden';
  if (/clarification/i.test(value)) return 'needs_clarification';
  if (/prompt/i.test(value)) return 'prompt_conflict';
  if (/domain/i.test(value)) return 'domain_signal_only';
  return 'no_matching_capability';
}

function toolScopeForCapability(candidate: { capabilityType?: string; dataDomain?: string; source?: { serverId?: string } }): string {
  return [candidate.dataDomain, candidate.capabilityType, candidate.source?.serverId].filter(Boolean).join(':') || 'unknown';
}

function buildCapabilityDecision(input: CapabilityDecisionInput | null | undefined, toolPurpose: ToolPurpose): CapabilityDecisionContract | undefined {
  if (!input) return undefined;
  const candidates: CapabilityCandidateContract[] = (input.candidates || []).slice(0, 8).map((candidate) => ({
    capabilityId: candidate.capability.capabilityId,
    capabilityName: candidate.capability.source?.toolName,
    toolScope: toolScopeForCapability(candidate.capability),
    toolPurpose,
    score: candidate.score,
    reason: candidate.reasons?.join('; '),
    missingInputs: unique([
      ...(candidate.dataCoverage?.missing || []),
      ...(candidate.presentationCoverage?.missing || []),
    ]),
    warnings: [],
  }));
  const selected = input.selected;
  return {
    candidates,
    executable: selected ? {
      capabilityId: selected.capabilityId,
      toolName: selected.source?.toolName,
      toolScope: toolScopeForCapability(selected),
      toolPurpose,
      executionMode: 'direct_tool',
    } : undefined,
    blockedReason: selected ? undefined : mapBlockedReason(input.blockingReason || input.fallbackReason || input.executionDecision),
    missingInputs: unique(candidates.flatMap((candidate) => candidate.missingInputs || [])),
    allowedToolScopes: unique(candidates.map((candidate) => candidate.toolScope)),
    forbiddenToolScopes: toolPurpose === 'data_fetch' || toolPurpose === 'report_generate' ? [] : ['report_fallback'],
    warnings: input.warnings || [],
  };
}

function buildSkillSelection(input: SkillSelectionInput | null | undefined): SkillSelectionContract | undefined {
  if (!input) return undefined;
  const candidateSkills = (input.candidates || []).slice(0, 8).map((candidate) => ({
    skillId: candidate.skill.skill_id,
    score: candidate.score || 0,
    reason: candidate.reasons?.join('; ') || candidate.matchedTriggers?.join(',') || '',
    domainScope: candidate.skill.domain ? [candidate.skill.domain] : undefined,
  }));
  return {
    selectedSkill: input.selected?.skill.skill_id,
    candidateSkills,
    readiness: input.selected ? 'ready' : candidateSkills.length ? 'not_applicable' : 'blocked',
    missingInputs: [],
    warnings: [],
  };
}

function buildRouteEvidence(params: {
  clientIntent?: string;
  routeIntent: IntentType;
  routeReason: string;
  reportRouteMatch: boolean;
  reportContinuation: boolean;
  userRequirementTask: string;
}): RouteEvidence[] {
  return [
    params.clientIntent ? { source: 'client_hint', key: 'body.intent', value: params.clientIntent, reason: 'Client hint only.' } : null,
    { source: 'route_rule', key: 'route.intent_type', value: params.routeIntent, reason: params.routeReason },
    { source: 'fallback_policy', key: 'matches_report_query_route', value: params.reportRouteMatch },
    { source: 'conversation_state', key: 'report_continuation', value: params.reportContinuation },
    { source: 'context', key: 'user_requirement.task', value: params.userRequirementTask },
  ].filter(Boolean) as RouteEvidence[];
}

function buildMismatches(params: {
  clientIntent?: string;
  resolvedIntent: ServiceIntent;
  domainSignals: DomainSignalContract[];
  promptRuntime?: RouteDecisionObservation['promptRuntime'];
  capabilityDecision?: CapabilityDecisionContract;
  actualExecution: RouteDecisionActualExecution;
  reportRouteMatch: boolean;
  governanceConflicts?: RouteGovernanceConflict[];
}): RouteDecisionObservation['mismatches'] {
  const output: RouteDecisionObservation['mismatches'] = [];
  if (params.clientIntent === 'report_query' && params.resolvedIntent !== 'data_query' && params.resolvedIntent !== 'report_delivery') {
    output.push({
      code: 'client_intent_ignored',
      message: `客户端提示 report_query 未被后端路由采纳，实际路由为 ${params.resolvedIntent}。`,
      severity: 'warning',
    });
  } else if (params.clientIntent && params.clientIntent !== params.resolvedIntent) {
    output.push({
      code: 'client_intent_conflict',
      message: `客户端提示 ${params.clientIntent} 与后端路由 ${params.resolvedIntent} 不一致。`,
      severity: 'warning',
    });
  }
  if (params.domainSignals.length > 0 && params.domainSignals.every((signal) => signal.evidenceOnly)) {
    output.push({
      code: 'domain_signals_evidence_only',
      message: '领域信号仅作为证据记录，未覆盖服务意图。',
      severity: 'info',
    });
  }
  if (params.promptRuntime?.conflicts?.length) {
    output.push({
      code: 'prompt_conflict_observed',
      message: '已观测到提示词运行时冲突，但未覆盖后端路由。',
      severity: 'warning',
    });
  }
  if (params.capabilityDecision?.candidates.length && !params.capabilityDecision.executable) {
    output.push({
      code: 'candidate_without_executable',
      message: '存在能力候选，但当前没有可执行能力。',
      severity: 'warning',
    });
  }
  if (
    params.actualExecution.actualSelectedTool
    && params.capabilityDecision?.executable?.toolName
    && params.actualExecution.actualSelectedTool !== params.capabilityDecision.executable.toolName
  ) {
    output.push({
      code: 'actual_tool_differs_from_observed_capability',
      message: `实际工具 ${params.actualExecution.actualSelectedTool} 与观测到的可执行工具 ${params.capabilityDecision.executable.toolName} 不一致。`,
      severity: 'warning',
    });
  }
  if (params.reportRouteMatch && !params.actualExecution.actualIsReportQuery) {
    output.push({
      code: 'report_route_match_blocked_by_backend_route',
      message: '已观测到问数路由证据，但实际执行未进入问数链路。',
      severity: 'info',
    });
  }
  for (const conflict of params.governanceConflicts || []) {
    output.push({
      code: conflict.code,
      message: conflict.message,
      severity: conflict.severity,
    });
  }
  return output;
}

export function buildRouteDecisionObservation(params: {
  decisionId: string;
  traceId?: string;
  message: string;
  clientIntent?: string;
  routeIntent: IntentType;
  routeReason: string;
  routeConfidence?: string;
  resolvedIntent?: string;
  matchedRules: MatchedRouteRuleInput;
  reportRouteMatch: boolean;
  reportContinuation: boolean;
  userRequirementTask: string;
  routeWarnings?: string[];
  selectedSkill?: { skill_id: string; name?: string } | null;
  skillSelection?: SkillSelectionInput | null;
  capabilityDecision?: CapabilityDecisionInput | null;
  promptConfig?: PromptConfigMetadata;
  isReportQuery: boolean;
  actualExecution?: Partial<RouteDecisionActualExecution>;
}): RouteDecisionObservation {
  const rawServiceIntent = params.actualExecution?.actualServiceIntent || serviceIntentFromRoute(params.routeIntent, params.isReportQuery);
  const serviceIntent = normalizeTopLevelServiceIntent(rawServiceIntent);
  const resolvedServiceIntent = params.actualExecution?.actualServiceIntent || serviceIntentFromRoute(
    params.resolvedIntent === 'report_query' ? 'report_query' : params.routeIntent,
    params.isReportQuery,
  );
  const resolvedIntent = normalizeTopLevelServiceIntent(resolvedServiceIntent);
  const toolPurpose = toolPurposeFor(rawServiceIntent, params.routeIntent);
  const domainSignals = buildDomainSignals(params.message);
  const promptRuntime = buildPromptRuntime(params.promptConfig);
  const capabilityDecision = buildCapabilityDecision(params.capabilityDecision, toolPurpose);
  const skillSelection = buildSkillSelection(params.skillSelection);
  const governanceConflicts = scanRouteGovernanceConflicts({
    message: params.message,
    serviceIntent,
    routeIntent: params.routeIntent,
    toolPurpose,
    isReportQuery: params.isReportQuery,
    reportRouteMatch: params.reportRouteMatch,
    domainSignals,
    promptRuntime,
    skillSelection,
    capabilityDecision,
  });
  const actualExecution: RouteDecisionActualExecution = {
    actualServiceIntent: params.actualExecution?.actualServiceIntent || serviceIntent,
    actualIsReportQuery: params.actualExecution?.actualIsReportQuery ?? params.isReportQuery,
    actualSelectedSkill: params.actualExecution?.actualSelectedSkill || params.selectedSkill?.skill_id,
    actualSelectedTool: params.actualExecution?.actualSelectedTool,
    actualToolPurpose: params.actualExecution?.actualToolPurpose || toolPurpose,
    actualCapabilityId: params.actualExecution?.actualCapabilityId,
    actualFallbackReason: params.actualExecution?.actualFallbackReason,
  };
  const mismatches = buildMismatches({
    clientIntent: params.clientIntent,
    resolvedIntent,
    domainSignals,
    promptRuntime,
    capabilityDecision,
    actualExecution,
    reportRouteMatch: params.reportRouteMatch,
    governanceConflicts,
  });
  const warnings = [
    ...routeWarningsFrom(params.routeWarnings || []),
    ...routeWarningsFrom(capabilityDecision?.warnings || []),
    ...mismatches.map((item): RouteWarning => ({ code: item.code, message: item.message, severity: item.severity })),
  ];

  return {
    mode: 'observe_only',
    decisionId: params.decisionId,
    traceId: params.traceId,
    clientIntent: params.clientIntent,
    serviceIntent,
    resolvedIntent,
    primaryDeliverable: primaryDeliverableFor(serviceIntent),
    decisionAuthority: {
      clientIntent: params.clientIntent ? 'hint_only' : 'ignored',
      prompt: 'evidence_only',
      domainSignals: 'evidence_only',
      routeRules: 'decision_support',
      backendRouteDecision: 'authoritative',
    },
    routeEvidence: buildRouteEvidence(params),
    domainSignals,
    matchedRules: buildMatchedRules(params.matchedRules),
    routeRulesGovernance: buildRouteRulesGovernance(params.matchedRules),
    selectedSkill: params.selectedSkill?.skill_id || params.skillSelection?.selected?.skill.skill_id,
    skillSelection,
    capabilityDecision,
    toolPurpose,
    isReportQuery: params.isReportQuery,
    confidence: confidenceToNumber(params.routeConfidence),
    needsClarification: false,
    warnings,
    promptRuntime,
    governanceConflicts,
    createdAt: new Date().toISOString(),
    actualExecution,
    mismatches,
  };
}

export function summarizeRouteDecisionObservation(observation: RouteDecisionObservation): string {
  const intent = observation.serviceIntent;
  const actual = observation.actualExecution.actualServiceIntent;
  const blockingCount = observation.mismatches.filter(item => item.severity === 'error').length;
  const warningCount = observation.mismatches.filter(item => item.severity !== 'error').length;
  if (blockingCount > 0) {
    return `路由观测发现 ${blockingCount} 个阻断差异：预期 ${intent}，实际 ${actual}。`;
  }
  if (warningCount > 0) {
    return `路由观测通过：预期 ${intent}，实际 ${actual}；另有 ${warningCount} 个非阻断提醒。`;
  }
  return `路由观测通过：预期 ${intent}，实际 ${actual}，无阻断差异。`;
}
