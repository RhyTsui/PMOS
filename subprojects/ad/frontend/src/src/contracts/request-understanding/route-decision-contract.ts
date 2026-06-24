export type ServiceIntent =
  | 'general_chat'
  | 'help_qa'
  | 'field_definition'
  | 'knowledge_answer'
  | 'light_requirement'
  | 'issue_diagnosis'
  | 'system_operation'
  | 'data_query'
  | 'report_delivery'
  | 'package_fetch'
  | 'integration_workflow';

export type PrimaryDeliverable =
  | 'chat_answer'
  | 'help_answer'
  | 'requirement_draft'
  | 'diagnosis_result'
  | 'operation_result'
  | 'data_table'
  | 'report'
  | 'pending_clarification';

export type ToolPurpose =
  | 'none'
  | 'help_lookup'
  | 'field_lookup'
  | 'draft_generation'
  | 'data_fetch'
  | 'evidence_fetch'
  | 'config_check'
  | 'log_check'
  | 'package_fetch'
  | 'integration_run'
  | 'report_generate'
  | 'report_schedule'
  | 'file_data_extraction';

export type DecisionAuthorityMode =
  | 'authoritative'
  | 'decision_support'
  | 'evidence_only'
  | 'hint_only'
  | 'ignored';

export interface DecisionAuthority {
  clientIntent: DecisionAuthorityMode;
  prompt: DecisionAuthorityMode;
  domainSignals: DecisionAuthorityMode;
  routeRules: DecisionAuthorityMode;
  backendRouteDecision: DecisionAuthorityMode;
}

export type RouteEvidenceSource =
  | 'client_hint'
  | 'route_rule'
  | 'prompt'
  | 'domain_signal'
  | 'context'
  | 'conversation_state'
  | 'capability_manifest'
  | 'fallback_policy';

export interface RouteEvidence {
  source: RouteEvidenceSource;
  key: string;
  value: string | number | boolean | string[];
  confidence?: number;
  weight?: number;
  matchedText?: string;
  reason?: string;
}

export type DomainSignalType =
  | 'media'
  | 'metric'
  | 'business_object'
  | 'project'
  | 'package'
  | 'channel'
  | 'workflow_scope'
  | 'capability_scope'
  | 'unknown';

export type DomainSignalSource =
  | 'domain_config'
  | 'compat_domain_signal_terms'
  | 'metric_catalog'
  | 'route_rules'
  | 'capability_manifest'
  | 'context';

export interface DomainSignalContract {
  domain: string;
  signalType: DomainSignalType;
  normalizedValue: string;
  rawValue?: string;
  source: DomainSignalSource;
  confidence?: number;
  evidenceOnly: boolean;
}

export type MatchedRuleSource =
  | 'runtime'
  | 'seed'
  | 'builtin'
  | 'prompt'
  | 'domain_config';

export type MatchedRuleType =
  | 'top_intent'
  | 'domain_signal'
  | 'skill_selection'
  | 'capability_preflight'
  | 'fallback'
  | 'blocking';

export interface MatchedRule {
  ruleId: string;
  ruleVersion?: string;
  ruleSource: MatchedRuleSource;
  ruleType: MatchedRuleType;
  matched: boolean;
  priority?: number;
  precedence?: number;
  reason?: string;
}

export type ReasoningPolicy =
  | 'direct_execute'
  | 'minimum_viable_then_followup'
  | 'confirm_then_execute'
  | 'read_only_with_context'
  | 'manual_only';

export type AmbiguityClass = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FollowUpMode =
  | 'none'
  | 'optional'
  | 'recommended'
  | 'required_select'
  | 'required_confirm';

export interface ProgressiveServiceScope {
  scopeType: 'global' | 'account' | 'campaign' | 'unit' | 'resource';
  scopeIds?: string[];
  scopeHints?: string[];
  timeRangeDefaultDays?: number;
  granularityDefault?: 'day' | 'week' | 'month' | 'all';
}

export interface MinimumViableQuery {
  queryType: string;
  executableTarget: string;
  assumptionsUsed: string[];
  confidence: number;
  outputHint: string[];
  executionLimit?: {
    maxRecords?: number;
    maxSources?: number;
  };
}

export interface ServiceCandidate {
  serviceIntent: string;
  name: string;
  score: number;
  rationale: string;
  requiresPermission: boolean;
  requiresEscalation: boolean;
  riskAmplifiers?: string[];
}

export interface UnresolvedAmbiguity {
  key: string;
  question: string;
  impact: string;
  defaultAssumption: string;
  options?: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ProgressiveServicePolicy {
  reasoningPolicy: ReasoningPolicy;
  ambiguityClass: AmbiguityClass;
  riskLevel: RiskLevel;
  followUpMode: FollowUpMode;
  defaultScope: ProgressiveServiceScope;
  minimumViableQuery?: MinimumViableQuery;
  selectedService: string;
  serviceCandidates: ServiceCandidate[];
  unresolvedAmbiguities?: UnresolvedAmbiguity[];
  secondHopReason?: string;
  executionGuardrails?: {
    canExecutePartial: boolean;
    canFallbackToQuestion: boolean;
    canQueue: boolean;
  };
  /** 高风险写操作时的结构化确认项清单（策略 C 闭环） */
  confirmationItems?: Array<{
    label: string;
    description?: string;
    required: boolean;
  }>;
}

export interface RequirementAssumption {
  key: string;
  value: unknown;
  source: 'llm' | 'history' | 'config' | 'default';
  confidence: number;
}

export interface RequirementContextAssumptions {
  assumedContext: Record<string, unknown>;
  resolvedContext: Record<string, unknown>;
  assumptions: RequirementAssumption[];
  unresolvedDisambiguations: UnresolvedAmbiguity[];
}

export interface CapabilityCandidateContract {
  capabilityId: string;
  capabilityName?: string;
  toolScope: string;
  toolPurpose: ToolPurpose;
  score?: number;
  reason?: string;
  missingInputs?: string[];
  warnings?: string[];
}

export type CapabilityExecutionMode =
  | 'direct_tool'
  | 'mcp_workflow'
  | 'deferred'
  | 'manual_confirmation';

export interface ExecutableCapabilityContract {
  capabilityId: string;
  toolName?: string;
  toolScope: string;
  toolPurpose: ToolPurpose;
  inputPreview?: Record<string, unknown>;
  executionMode: CapabilityExecutionMode;
}

export type CapabilityBlockedReason =
  | 'missing_inputs'
  | 'intent_not_allowed'
  | 'tool_scope_forbidden'
  | 'permission_denied'
  | 'no_matching_capability'
  | 'needs_clarification'
  | 'client_intent_conflict'
  | 'domain_signal_only'
  | 'prompt_conflict';

export interface CapabilityDecisionContract {
  candidates: CapabilityCandidateContract[];
  executable?: ExecutableCapabilityContract;
  blockedReason?: CapabilityBlockedReason;
  missingInputs: string[];
  allowedToolScopes: string[];
  forbiddenToolScopes: string[];
  warnings: string[];
}

export type SkillReadiness =
  | 'ready'
  | 'missing_inputs'
  | 'not_applicable'
  | 'blocked';

export interface SkillCandidateContract {
  skillId: string;
  score: number;
  reason: string;
  supportedServiceIntents?: ServiceIntent[];
  domainScope?: string[];
  allowedToolScopes?: string[];
  forbiddenToolScopes?: string[];
}

export interface SkillSelectionContract {
  selectedSkill?: string;
  candidateSkills: SkillCandidateContract[];
  readiness: SkillReadiness;
  missingInputs: string[];
  warnings: string[];
}

export type PromptRuntimeSource =
  | 'runtime'
  | 'seed'
  | 'builtin'
  | 'fallback';

export type PromptConflictType =
  | 'strong_report_bias'
  | 'default_report_query'
  | 'prompt_rule_conflict'
  | 'prompt_domain_override'
  | 'inactive_prompt_used';

export interface PromptRuntimeConflict {
  conflictType: PromptConflictType;
  promptId?: string;
  message: string;
  severity: RouteWarningSeverity;
}

export interface PromptRuntimeMetadataContract {
  activePromptId?: string;
  activePromptVersion?: string;
  promptSource?: PromptRuntimeSource;
  seedFallbackUsed?: boolean;
  cacheHit?: boolean;
  contentHash?: string;
  conflicts?: PromptRuntimeConflict[];
}

export type RouteWarningSeverity = 'info' | 'warning' | 'error';

export interface RouteWarning {
  code: string;
  message: string;
  severity: RouteWarningSeverity;
}

export interface RouteDecisionContract {
  decisionId: string;
  traceId?: string;
  clientIntent?: string;
  serviceIntent: ServiceIntent;
  resolvedIntent: ServiceIntent;
  primaryDeliverable: PrimaryDeliverable;
  decisionAuthority: DecisionAuthority;
  routeEvidence: RouteEvidence[];
  domainSignals: DomainSignalContract[];
  matchedRules: MatchedRule[];
  selectedSkill?: string;
  skillSelection?: SkillSelectionContract;
  capabilityDecision?: CapabilityDecisionContract;
  toolPurpose: ToolPurpose;
  isReportQuery: boolean;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
  warnings: RouteWarning[];
  promptRuntime?: PromptRuntimeMetadataContract;
  progressivePolicy?: ProgressiveServicePolicy;
  assumedContext?: Record<string, unknown>;
  resolvedContext?: Record<string, unknown>;
  unresolvedAmbiguities?: UnresolvedAmbiguity[];
  createdAt: string;
}
