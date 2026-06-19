import { callMcpTool, type McpDiscoveryInput, type McpToolCallResult } from '@/lib/mcp-discovery';
import { findEntityResolutionCandidates, getEntityResolutionAliasMaps, loadEntityResolutionConfigSync } from '@/lib/entity-resolution-config-store';
import {
  buildReportCapabilityManifest,
  findRuntimeToolByCapability,
  isExecutableReportCapability,
  selectNormalizationCapabilities,
  type CapabilityExpectation,
  type RejectedCapabilityTool,
  type ReportCapabilityDomain,
  type ReportCapabilityManifest,
  type ReportToolCapability,
} from '@/lib/report-capability-manifest';
import {
  loadReportQueryPolicySync,
  shouldUseProjectLookup,
  type ReportQueryCapabilityConfig,
  type ReportQuerySchemaAdapter,
  type ReportQueryCapabilityType,
  type ReportQueryProjectResolutionPolicy,
  type ReportQueryToolSelectionRule,
} from '@/lib/report-query-policy-store';
import {
  getKnowledgeBaseApiKey,
  getKnowledgeBaseId,
  getKnowledgeSearchEndpoint,
  getModelServiceConfig,
  hasConfiguredKnowledgeCredentials,
  resolveKnowledgeBaseIds,
} from '@/lib/runtime-config';
import { runModelUseCase } from '@/lib/model-use-case-runtime';
import { reportTrendToSemanticResult, type ReportTrendAdapterInput } from '@/contracts/adapters/report-trend-adapter';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import type { ReportTrendData, ReportTrendDataPoint } from '@/contracts/validation/report-trend-validator';
import type { EntityResolution, EntityResolutionTraceStep, EntityType, IdentifierKey } from '@/contracts/request-understanding/entity-resolution';
import { identifierKeyForEntityType } from '@/contracts/request-understanding/entity-resolution';
import type { McpServerConfig, McpToolConfig } from '@/types';
import { parseRelativeDateRange } from './date-range-resolver';
import { resolveDictionaryEntity } from './entity-resolution';
import { adaptDictionaryToolOutput, normalizeMcpBusinessError } from './mcp-tool-output-adapter';
import { selectTrendMetricColumns } from './trend-metric-selection';
import { getEntitySelectionPreferenceMap } from './user-memory-store';
import {
  buildAdvertisingRequestSignals,
  hasAdvertisingDomainSignal,
  matchDomainSignalTerms,
} from './advertising-domain-pack';

export type ReportQuestionType = 'hour' | 'daily' | 'roi' | 'retention';
export type ReportQueryStatus = 'success' | 'empty' | 'failed' | 'blocked' | 'business_failed';
export type ReportQueryPlanStatus = 'planning' | 'waiting_for_user' | 'executing' | 'partial_success' | 'success' | 'failed' | 'case_created';
type ReportBusinessOutcome = 'success' | 'empty' | 'partial_success' | 'need_clarification' | 'blocked' | 'failed' | 'capability_not_available' | 'execution_failed';
type PromotionSourceInternal = string;

export interface ReportSubQuery {
  sub_query_id: string;
  question_type: ReportQuestionType;
  tool_name: string;
  server_name: string;
  status: 'planned' | 'executing' | 'success' | 'empty' | 'failed' | 'skipped';
  input?: Record<string, unknown>;
  row_count?: number;
  message?: string;
  evidence_refs?: string[];
}

export interface ReportQueryPlan {
  plan_id: string;
  original_question: string;
  normalized_question: string;
  primary_question_type: ReportQuestionType;
  project_context: Record<string, unknown>;
  sub_queries: ReportSubQuery[];
  required_slots: string[];
  resolved_slots: Record<string, unknown>;
  pending_slots: string[];
  merge_rules: string[];
  failed_items: Array<{ sub_query_id: string; reason: string }>;
  evidence_refs: string[];
  trace_id?: string;
  status: ReportQueryPlanStatus;
  updated_at: string;
}

export interface ReportQualityCheck {
  ok: boolean;
  empty_table: boolean;
  missing_fields: string[];
  missing_context_fields?: string[];
  missing_capabilities?: string[];
  date_gaps: string[];
  anomaly_warnings: string[];
  metric_risks: string[];
  issues: string[];
  root_cause?: 'none' | 'tool_missing' | 'missing_context' | 'dictionary_unmatched' | 'needs_user_selection' | 'needs_enrichment' | 'output_invalid' | 'capability_unavailable' | 'permission_or_scope' | 'no_matching_data' | 'response_unparsed' | 'tool_failed';
  recommended_next_actions?: string[];
}

export interface ReportToolSelectionTrace {
  selected_question_type: ReportQuestionType;
  selected_tool: string;
  selected_server: string;
  reason: string;
  hour_decision: 'selected' | 'rejected';
  hour_reason: string;
  requested_granularity: 'hour' | 'day';
  rule_id?: string;
  candidate_scores?: Array<{ rule_id: string; question_type: ReportQuestionType; score: number; matched_terms: string[]; tool_matches: string[] }>;
  manifest_version?: string;
  capability_id?: string;
  candidate_tools?: Array<{ capability_id: string; tool_name: string; domains: ReportCapabilityDomain[]; score: number; reason: string }>;
  candidate_lifecycle?: Array<{
    capability_id?: string;
    tool_name: string;
    server_name?: string;
    state: 'not_discovered' | 'not_executable' | 'filtered_out' | 'scored' | 'rejected' | 'selected' | 'runtime_unavailable';
    reason: string;
    score?: number;
    rank?: number;
    question_type?: ReportQuestionType;
    expected_domain?: ReportCapabilityDomain;
  }>;
  glossary?: RoutingTextNormalizationResult;
  argument_contract?: ReportToolArgumentContractTrace;
  fallback?: ReportFallbackTrace;
  warnings?: Array<{
    warning_type: string;
    source: 'domain_pack' | 'resolver_config' | 'capability_manifest' | 'tool_contract' | 'report_policy' | 'prompt' | 'legacy_fallback';
    capability_id?: string;
    entity_type?: string;
    target_tool?: string;
    suggested_config_path?: string;
    detail?: string;
  }>;
}

export interface ReportDisplayField {
  key: string;
  displayName: string;
  role: 'dimension' | 'metric';
  requestedKey?: string;
  formatter?: 'currency-2' | 'number-2' | 'percent-2' | 'text';
  unit?: string;
}

export interface ReportQueryResult {
  result_type: 'ReportQueryResult';
  status: ReportQueryStatus;
  business_outcome?: ReportBusinessOutcome;
  tool_execution_status?: 'called_success' | 'called_failed' | 'business_failed';
  question_type: ReportQuestionType;
  requested_view?: 'trend' | 'detail' | 'comparison';
  tool_name: string;
  server_name: string;
  input: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
  columns: string[];
  metrics: string[];
  dimensions: string[];
  date_range: { start_date: string; end_date: string };
  data_coverage?: {
    requested_date_range: { start_date: string; end_date: string };
    actual_input_date_range: { start_date: string; end_date: string };
    date_point_count: number;
    sufficient_for_trend: boolean;
    issues: string[];
  };
  quality_check: ReportQualityCheck;
  message: string;
  answer_markdown?: string;
  business_summary_markdown?: string;
  display_fields?: ReportDisplayField[];
  semantic_result?: SemanticResultContract<ReportTrendData>;
  raw_result_preview?: unknown;
  selection_trace?: ReportToolSelectionTrace;
  preflight?: ReportQueryPreflight;
  resolved_filters?: ReportResolvedFiltersSummary;
  empty_diagnosis?: ReportEmptyDiagnosis;
  query_plan?: ReportQueryPlan;
  error?: {
    code: string;
    message: string;
    canRetryWithSameTool?: boolean;
    suggestedAction?: string;
  };
}

interface RoutingTextNormalizationResult {
  original_text: string;
  normalized_text: string;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export interface ReportCapabilityCheck {
  capability_id: string;
  capability_type: ReportQueryCapabilityType;
  label: string;
  required: boolean;
  status: 'available' | 'missing' | 'skipped';
  tool_name?: string;
  server_name?: string;
  message: string;
}

export interface ReportQueryPreflight {
  ok: boolean;
  capability_checks: ReportCapabilityCheck[];
  missing_capabilities: string[];
  missing_context_fields: string[];
  knowledge_fallback?: {
    status: 'success' | 'skipped' | 'failed' | 'no_reference_found';
    message: string;
    source_count?: number;
  };
}

export interface ReportResolvedFiltersSummary {
  appId?: string;
  mediaKeys: string[];
  terminalKeys: string[];
  teamKeys: string[];
  appPackageTypeKeys: string[];
  accountKeys: string[];
  packageKeys: string[];
  optimizerKeys: string[];
  mediaId?: string[];
  osTypes?: string[];
  terminalOs?: string[];
  promotion_source?: PromotionSourceInternal;
  teamIds?: string[];
  appPackageType?: string[];
  accountId?: string[];
  pkgId?: string[];
  optimizerIds?: string[];
  dynamicFilters?: Record<string, string[]>;
  entityResolutions?: EntityResolution[];
  modelCandidateSets?: {
    semanticCandidateSet?: unknown;
    entityCandidateSet?: unknown;
  };
  source: Record<string, string>;
}

export interface ReportEmptyDiagnosis {
  root_cause: NonNullable<ReportQualityCheck['root_cause']>;
  explanation: string;
  next_actions: string[];
}

interface SelectedReportTool {
  server: McpServerConfig;
  tool: McpToolConfig;
  reason: string;
  entry: ReportQueryToolSelectionRule;
  candidate_scores: ReportToolSelectionTrace['candidate_scores'];
  manifest?: ReportCapabilityManifest;
  capability?: ReportToolCapability;
  candidate_tools?: NonNullable<ReportToolSelectionTrace['candidate_tools']>;
  candidate_lifecycle?: NonNullable<ReportToolSelectionTrace['candidate_lifecycle']>;
  glossary?: RoutingTextNormalizationResult;
  warnings?: ReportToolSelectionTrace['warnings'];
}

interface ReportFallbackTrace {
  originalTool?: string;
  fallbackTool?: string;
  finalTool?: string;
  fallbackReason?: string;
  attemptedTools: string[];
  finalToolArguments?: Record<string, unknown>;
  skippedCandidates?: ReportFallbackSkippedCandidate[];
}

interface ReportFallbackSkippedCandidate {
  toolName: string;
  capabilityId?: string;
  skippedReason: string;
  missingFields: string[];
  draftArguments: Record<string, unknown>;
}

export interface ConfiguredMcpToolCallResult extends Record<string, unknown> {
  status: 'success' | 'failed' | 'business_failed';
  execution_contract?: McpToolCallResult['execution_contract'];
  policy_blocked?: boolean;
  security_blocked?: boolean;
  blocking_reason?: string;
  server: string;
  tool: string;
  response?: unknown;
  business_payload?: unknown;
  business_outcome?: 'capability_not_available' | 'execution_failed';
  error_code?: string;
  error_message?: string;
  canRetryWithSameTool?: boolean;
  suggestedAction?: string;
  business_error?: string;
  error?: string;
  latency_ms?: number;
  token_expired?: boolean;
  message?: string;
  raw_response_preview?: string;
  normalizedErrorCode?: string;
  normalizedStatus?: string;
  blockedBeforeCall?: boolean;
  internalReason?: string;
  retry?: boolean;
}

export interface ReportToolArgumentContractTrace {
  selectedTool?: { name: string; serverId?: string; serverName?: string };
  schemaSourceTool?: { name: string; serverId?: string; serverName?: string };
  finalArgsSourceTool?: { name: string; serverId?: string; serverName?: string };
  calledTool?: { name: string; serverId?: string; serverName?: string };
  finalArgKeys: string[];
  requiredKeys: string[];
  missingRequiredKeysBeforeCall: string[];
  droppedKeys: string[];
  sourceMapping: Record<string, string>;
  preflight?: ReportToolArgumentPreflight;
}

export interface ReportToolInputBuildResult {
  input: Record<string, unknown>;
  finalArgs: Record<string, unknown>;
  finalArgKeys: string[];
  requiredKeys: string[];
  missingRequiredKeysBeforeCall: string[];
  droppedKeys: string[];
  sourceMapping: Record<string, string>;
  preflight: ReportToolArgumentPreflight;
  missing_fields: string[];
  metrics: string[];
  dimensions: string[];
  date_range: { start_date: string; end_date: string };
}

export interface ReportToolArgumentPreflightIssue {
  field: string;
  code: 'missing_required_input' | 'invalid_internal_enum' | 'invalid_external_enum' | 'source_mapping_violation' | 'unsupported_query';
  message: string;
  source?: string;
  internal?: unknown;
  external?: unknown;
  allowedExternalValues?: string[];
}

export interface ReportToolArgumentPreflight {
  ok: boolean;
  blockedBeforeCall: boolean;
  status: 'passed' | 'missing_required_input' | 'invalid_params' | 'unsupported_query';
  issues: ReportToolArgumentPreflightIssue[];
}

export interface ExecuteReportQueryStepResult {
  status: ReportQueryStatus | 'not_configured' | 'missing_input';
  business_outcome?: ReportBusinessOutcome;
  step_status?: ReportQueryPlanStatus;
  tool_execution_status?: 'not_called' | 'called_success' | 'called_failed' | 'business_failed';
  blocking_requirements?: string[];
  selected?: SelectedReportTool;
  input?: Record<string, unknown>;
  missing_fields?: string[];
  call_result?: ConfiguredMcpToolCallResult;
  report_query_result?: ReportQueryResult;
  query_plan?: ReportQueryPlan;
  selection_trace?: ReportToolSelectionTrace;
  preflight?: ReportQueryPreflight;
  resolved_filters?: ReportResolvedFiltersSummary;
  tool_chain: Array<{
    key: string;
    tool_name: string;
    server_name: string;
    status: 'planned' | 'success' | 'failed' | 'skipped';
    required: boolean;
    input?: Record<string, unknown>;
    result?: unknown;
    message?: string;
    argument_contract?: ReportToolArgumentContractTrace;
  }>;
  message: string;
}

interface ReviewHints {
  ambiguity?: unknown;
  disambiguation?: unknown;
  capabilityRanking?: unknown;
}

type ResolvedFilters = {
  mediaId?: string[];
  osTypes?: string[];
  terminalOs?: string[];
  promotion_source?: PromotionSourceInternal;
  teamIds?: string[];
  appPackageType?: string[];
  accountId?: string[];
  pkgId?: string[];
  optimizerIds?: string[];
  dynamicFilters: Record<string, string[]>;
  entity_resolutions: EntityResolution[];
  resolution_trace: EntityResolutionTraceStep[];
  missing_context_fields: string[];
  missing_capabilities: string[];
  quality_risks: string[];
  dictionary_steps: ExecuteReportQueryStepResult['tool_chain'];
  model_candidate_sets?: {
    semanticCandidateSet?: unknown;
    entityCandidateSet?: unknown;
  };
  review_hints?: ReviewHints;
  summary: ReportResolvedFiltersSummary;
  trace_warnings: NonNullable<ReportToolSelectionTrace['warnings']>;
};

type SelectedEntityCandidateInput = {
  entityType: EntityType;
  identifierKey?: IdentifierKey;
  id: string;
  name?: string;
};

type EntitySelectionPreference = Partial<Record<EntityType, { candidateId: string; candidateName?: string }>>;

function readSelectedEntityCandidates(baseInput?: Record<string, unknown>): SelectedEntityCandidateInput[] {
  const raw = baseInput?.selected_entities;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const entityType = String(record.entityType || '');
    const id = String(record.id || record.candidateId || '').trim();
    if (!id) return [];
    if (!['media', 'app', 'campaign', 'material', 'account', 'team', 'app_package_type', 'package', 'terminal', 'terminal_os'].includes(entityType)) return [];
    const identifierKey = String(record.identifierKey || identifierKeyForEntityType(entityType as EntityType)) as IdentifierKey;
    return [{
      entityType: entityType as EntityType,
      identifierKey,
      id,
      name: typeof record.name === 'string' ? record.name : typeof record.candidateName === 'string' ? record.candidateName : undefined,
    }];
  });
}

function readPreferredEntitySelectionMap(baseInput?: Record<string, unknown>): EntitySelectionPreference {
  const raw = baseInput?.preferred_entity_selections;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const output: EntitySelectionPreference = {};
  for (const [entityType, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!['media', 'app', 'campaign', 'material', 'account', 'team', 'app_package_type', 'package', 'terminal', 'terminal_os'].includes(entityType)) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    const candidateId = String(record.candidateId || record.id || '').trim();
    if (!candidateId) continue;
    output[entityType as EntityType] = {
      candidateId,
      candidateName: typeof record.candidateName === 'string' ? record.candidateName : typeof record.name === 'string' ? record.name : undefined,
    };
  }
  return output;
}

function selectedResolutionFromInput(params: {
  selected: SelectedEntityCandidateInput;
  rawText: string;
  label: string;
  capabilityType: ReportQueryCapabilityType;
}): {
  ids: string[];
  resolution: EntityResolution;
  trace: EntityResolutionTraceStep[];
  step: ExecuteReportQueryStepResult['tool_chain'][number];
  missingField?: string;
  missingCapability?: string;
  risk?: string;
} {
  const resolution: EntityResolution = {
    entityType: params.selected.entityType,
    rawText: params.rawText || params.label,
    normalizedId: params.selected.id,
    normalizedName: params.selected.name,
    confidence: 1,
    status: 'resolved',
    candidates: [{
      id: params.selected.id,
      name: params.selected.name,
      confidence: 1,
      source: 'user_selection',
    }],
    identifierKey: params.selected.identifierKey,
    normalizationCapabilityId: params.capabilityType,
    normalizationToolName: 'user_selection',
  };
  const trace: EntityResolutionTraceStep[] = [{
    entityType: params.selected.entityType,
    stage: 'decision',
    status: 'resolved',
    detail: `${params.label} resolved from user candidate selection.`,
    toolName: 'user_selection',
    metadata: { selectedEntity: params.selected },
  }];
  return {
    ids: [params.selected.id],
    resolution,
    trace,
    step: {
      key: `${params.selected.entityType}_selection`,
      tool_name: 'user_selection',
      server_name: '',
      status: 'success',
      required: true,
      input: { selectedEntity: params.selected },
      result: { resolution, selectedEntity: params.selected },
      message: `${params.label}已按用户选择继续处理。`,
    },
  };
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mergedEntityAliasMaps(policy: ReportQueryProjectResolutionPolicy) {
  const configAliases = getEntityResolutionAliasMaps(loadEntityResolutionConfigSync());
  return {
    ...configAliases,
    media_aliases: { ...policy.semantic_defaults.media_aliases, ...configAliases.media_aliases },
    terminal_aliases: { ...policy.semantic_defaults.terminal_aliases, ...configAliases.terminal_aliases },
    team_aliases: { ...policy.semantic_defaults.team_aliases, ...configAliases.team_aliases },
    app_package_type_aliases: { ...policy.semantic_defaults.app_package_type_aliases, ...configAliases.app_package_type_aliases },
    account_aliases: { ...policy.semantic_defaults.account_aliases, ...configAliases.account_aliases },
    package_aliases: { ...policy.semantic_defaults.package_aliases, ...configAliases.package_aliases },
    optimizer_aliases: { ...policy.semantic_defaults.optimizer_aliases, ...configAliases.optimizer_aliases },
  };
}

function normalizeRoutingText(text: string): RoutingTextNormalizationResult {
  return {
    original_text: text,
    normalized_text: String(text || '').toLowerCase().replace(/\s+/g, ' ').trim(),
  };
}

function shiftDate(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function parseDateRange(message: string): { start_date: string; end_date: string; period_type: 'day' | 'week' | 'month' | 'hour'; is_explicit: boolean; requested_days?: number } {
  const parsed = parseRelativeDateRange(message);
  if (parsed.is_explicit && parsed.start_date && parsed.end_date) {
    return {
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      period_type: parsed.period_type,
      is_explicit: true,
      requested_days: parsed.requested_days,
    };
  }
  const today = formatDate(shiftDate(0));
  return { start_date: today, end_date: today, period_type: hasExplicitHourNeed(message) ? 'hour' : 'day', is_explicit: false, requested_days: 1 };
}
function hasExplicitDateRangeNeed(message: string): boolean {
  const text = message.replace(/\s+/g, '');
  return Boolean(
    /date_range=([0-9]{4}-[0-9]{1,2}-[0-9]{1,2})~([0-9]{4}-[0-9]{1,2}-[0-9]{1,2})/i.test(message)
    || /(\d{4}-\d{1,2}-\d{1,2})(?:至|到|~|-)(\d{4}-\d{1,2}-\d{1,2})/.test(text)
    || /(\d{4}-\d{1,2}-\d{1,2})/.test(text)
    || /(\d{4})年(\d{1,2})月(\d{1,2})日/.test(text)
    || /(\d{1,2})月(\d{1,2})日/.test(text)
    || /(?:近|最近|过去)\d{1,3}(?:天|日)/.test(text)
    || /今天|今日|昨天|昨日|前天|上周|本周|本月|上月/.test(text)
  );
}

function hasExplicitHourNeed(message: string): boolean {
  return /小时|分时|实时|截至当前|截止当前|当前小时|hour|hourly/i.test(message);
}

function inferRequestedView(message: string): 'trend' | 'detail' | 'comparison' {
  const text = normalizeRoutingText(message).normalized_text.replace(/\s+/g, '');
  if (/对比|比较|环比|同比|comparison|compare/i.test(text)) return 'comparison';
  if (/趋势|每日|按日|折线|图表|近\d{1,3}(?:天|日)|最近\d{1,3}(?:天|日)|过去\d{1,3}(?:天|日)|trend|chart/i.test(text)) return 'trend';
  return 'detail';
}

function matchTerms(message: string, terms: string[]): string[] {
  const lower = message.toLowerCase();
  return terms.filter(term => term && lower.includes(term.toLowerCase()));
}

function normalizeText(value: unknown): string {
  return String(value || '').toLowerCase();
}

function inferQuestionTypeFromTerms(message: string, policy = loadReportQueryPolicySync()): {
  type: ReportQuestionType;
  rule?: ReportQueryToolSelectionRule;
  scores: ReportToolSelectionTrace['candidate_scores'];
  glossary: RoutingTextNormalizationResult;
  warnings?: ReportToolSelectionTrace['warnings'];
} {
  const glossary = normalizeRoutingText(message);
  const routableText = glossary.normalized_text;
  const roiRules = policy.tool_selection_rules.filter(rule => rule.question_type === 'roi');
  const dailyRules = policy.tool_selection_rules.filter(rule => rule.question_type === 'daily');
  const hasRoiNeed = roiRules.some(rule => matchTerms(routableText, rule.include_terms).length > 0);
  const hasGenericTrendNeed = dailyRules.some(rule => matchTerms(routableText, rule.include_terms).length > 0);
  const scores = policy.tool_selection_rules.map((rule) => {
    const matched = matchTerms(routableText, rule.include_terms);
    const excluded = matchTerms(routableText, rule.exclude_terms);
    const genericTrendOnly = rule.question_type === 'roi'
      && !hasRoiNeed
      && matched.length > 0
      && matched.every(term => /趋势|趋势图|对比图/.test(term));
    const dailyTrendBoost = rule.question_type === 'daily' && !hasRoiNeed && hasGenericTrendNeed && !hasExplicitHourNeed(routableText) ? 60 : 0;
    const score = (genericTrendOnly ? 0 : rule.priority) + matched.length * 20 + dailyTrendBoost - excluded.length * 50;
    return { rule, matched, score };
  }).filter(item => item.matched.length > 0 && item.score > 0).sort((a, b) => b.score - a.score);
  const selected = scores[0];
  if (selected) {
    return {
      type: selected.rule.question_type,
      rule: selected.rule,
      scores: scores.map(item => ({
        rule_id: item.rule.id,
        question_type: item.rule.question_type,
        score: item.score,
        matched_terms: item.matched,
        tool_matches: [],
      })),
      glossary,
    };
  }
  const defaultRule = policy.tool_selection_rules.find(rule => rule.question_type === 'daily') || policy.tool_selection_rules[0];
  return {
    type: defaultRule?.question_type || 'daily',
    rule: defaultRule,
    scores: [],
    glossary,
    warnings: [{
      warning_type: 'legacy_question_type_fallback',
      source: 'legacy_fallback',
      suggested_config_path: 'report-query-policy.tool_selection_rules',
      detail: 'No report policy rule matched; using configured default rule instead of domain hardcoded question-type inference.',
    }],
  };
}

export function selectReportQuestionType(message: string): ReportQuestionType {
  return inferQuestionTypeFromTerms(message).type;
}

function schemaProperties(tool: McpToolConfig): Record<string, unknown> {
  const properties = (tool.input_schema || {}).properties;
  return properties && typeof properties === 'object' && !Array.isArray(properties) ? properties as Record<string, unknown> : {};
}

function schemaRequired(tool: McpToolConfig): string[] {
  const required = tool.input_schema?.required;
  return Array.isArray(required) ? required.map(String) : [];
}

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

const USER_INTENT_CRITICAL_KEYS = new Set([
  'appId', 'app_id', 'projectId', 'project_id',
]);

function resolveSemanticDefault(
  key: string,
  questionType: ReportQuestionType,
  policy: ReportQueryProjectResolutionPolicy,
  toolProperties: Record<string, unknown>,
): unknown {
  for (const adapter of policy.schema_adapters) {
    if (adapter.question_type === questionType || adapter.question_type === 'default') {
      if (adapter.required_defaults && key in adapter.required_defaults) {
        return adapter.required_defaults[key];
      }
    }
  }
  const propSchema = toolProperties[key];
  if (propSchema && typeof propSchema === 'object' && !Array.isArray(propSchema)) {
    const schemaDefault = (propSchema as { default?: unknown }).default;
    if (schemaDefault !== undefined) return schemaDefault;
    const enumValues = (propSchema as { enum?: unknown[] }).enum;
    if (Array.isArray(enumValues) && enumValues.length > 0) return enumValues[0];
  }
  return undefined;
}

function classifyAndFillMissingKeys(params: {
  missingKeys: string[];
  questionType: ReportQuestionType;
  policy: ReportQueryProjectResolutionPolicy;
  toolProperties: Record<string, unknown>;
  input: Record<string, unknown>;
}): { criticalMissing: string[]; autoFilled: Record<string, unknown> } {
  const criticalMissing: string[] = [];
  const autoFilled: Record<string, unknown> = {};
  for (const key of params.missingKeys) {
    if (USER_INTENT_CRITICAL_KEYS.has(key)) {
      criticalMissing.push(key);
      continue;
    }
    const defaultValue = resolveSemanticDefault(key, params.questionType, params.policy, params.toolProperties);
    if (defaultValue !== undefined) {
      autoFilled[key] = defaultValue;
      params.input[key] = defaultValue;
    } else {
      criticalMissing.push(key);
    }
  }
  return { criticalMissing, autoFilled };
}

function userFacingRequirementLabel(field: string): string {
  if (field === '媒体平台选择' || field === '媒体平台') return '媒体平台';
  if (field === '输出维度' || field === '查看维度') return '查看维度';
  const normalized = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).toLowerCase();
  if (['appid', 'app_id', 'projectid', 'project_id'].includes(normalized)) return '项目';
  if (['startdate', 'start_date', 'enddate', 'end_date', 'date_range', 'time_range', 'timetype', 'time_type'].includes(normalized)) return '时间范围';
  if (['mediaid', 'media_id', 'mediaids', 'media_ids', 'promotionsource', 'promotion_source'].includes(normalized)) return '媒体平台';
  if (['metric', 'metrics', 'metric_keys'].includes(normalized)) return '指标';
  if (['dimension', 'dimensions', 'subgroup', 'sub_group'].includes(normalized)) return '查看维度';
  return field;
}

function userFacingMissingRequirementMessage(fields: string[]): string {
  const labels = Array.from(new Set(fields.map(userFacingRequirementLabel).filter(Boolean)));
  if (labels.includes('媒体平台')) return '还需要确认媒体平台后才能继续查询。';
  if (labels.includes('时间范围')) return '还需要确认查询时间后才能继续。';
  if (labels.includes('指标')) return '还需要确认要查看的指标后才能继续。';
  if (labels.includes('项目')) return '还需要确认项目后才能继续查询。';
  if (labels.length === 1) return `还需要补充${labels[0]}后才能继续。`;
  if (labels.length > 1) return `还需要补充${labels.join('、')}后才能继续。`;
  return '还需要补充查询条件后才能继续。';
}

function assignIfAccepted(target: Record<string, unknown>, properties: Record<string, unknown>, key: string, value: unknown): void {
  if (value === undefined) return;
  if (Object.keys(properties).length === 0 || key in properties) target[key] = value;
}

function assignReportArg(params: {
  target: Record<string, unknown>;
  properties: Record<string, unknown>;
  droppedKeys: Set<string>;
  sourceMapping: Record<string, string>;
  key: string;
  value: unknown;
  source: string;
}): void {
  if (params.value === undefined) return;
  if (Object.keys(params.properties).length > 0 && !(params.key in params.properties)) {
    params.droppedKeys.add(params.key);
    return;
  }
  params.target[params.key] = params.value;
  params.sourceMapping[params.key] = params.source;
}

function listValueForSchema(properties: Record<string, unknown>, key: string, values: string[]): string[] | string {
  const schema = properties[key];
  if (schema && typeof schema === 'object' && !Array.isArray(schema) && (schema as { type?: unknown }).type === 'string') {
    return values.join(',');
  }
  return values;
}

function formatSlotValue(properties: Record<string, unknown>, key: string, values: string[], format?: 'array' | 'string' | 'csv'): string[] | string {
  switch (format) {
    case 'csv':
      return values.join(',');
    case 'string':
      return values[0] || '';
    case 'array':
      return values;
    default:
      return listValueForSchema(properties, key, values);
  }
}

function resolvedValuesForEntity(resolvedFilters: Partial<ResolvedFilters>, entityType: EntityType): string[] {
  if (entityType === 'media') return resolvedFilters.mediaId || [];
  if (entityType === 'terminal' || entityType === 'terminal_os') return resolvedFilters.osTypes || resolvedFilters.terminalOs || [];
  if (entityType === 'team') return resolvedFilters.teamIds || [];
  if (entityType === 'app_package_type') return resolvedFilters.appPackageType || [];
  if (entityType === 'package') return resolvedFilters.pkgId || [];
  if (entityType === 'account') return resolvedFilters.accountId || [];
  return [];
}

function applyCapabilitySlotMappings(
  input: Record<string, unknown>,
  properties: Record<string, unknown>,
  capability: ReportToolCapability | undefined,
  resolvedFilters: Partial<ResolvedFilters>,
  trace?: { droppedKeys: Set<string>; sourceMapping: Record<string, string>; requiredKeys?: Set<string>; modeledKeys?: Set<string> },
): void {
  for (const mapping of capability?.slot_mappings || []) {
    const values = resolvedValuesForEntity(resolvedFilters, mapping.entity_type);
    if (!values.length) continue;
    for (const key of mapping.target_keys) {
      if (trace) {
        assignReportArg({
          target: input,
          properties,
          droppedKeys: trace.droppedKeys,
          sourceMapping: trace.sourceMapping,
          key,
          value: formatSlotValue(properties, key, values, mapping.value_format),
          source: `capability_slot_mapping:${mapping.entity_type}`,
        });
      } else {
        assignIfAccepted(input, properties, key, formatSlotValue(properties, key, values, mapping.value_format));
      }
    }
  }
  for (const [key, values] of Object.entries(resolvedFilters.dynamicFilters || {})) {
    if (!values.length) continue;
    if (isModeledReportArgumentKey(key, trace?.modeledKeys) || trace?.requiredKeys?.has(key) || key in input) {
      trace?.droppedKeys.add(key);
      continue;
    }
    if (trace) {
      assignReportArg({
        target: input,
        properties,
        droppedKeys: trace.droppedKeys,
        sourceMapping: trace.sourceMapping,
        key,
        value: formatSlotValue(properties, key, values),
        source: 'resolved_filters.dynamicFilters',
      });
    } else {
      assignIfAccepted(input, properties, key, formatSlotValue(properties, key, values));
    }
  }
}

function isModeledReportArgumentKey(key: string, modeledKeys?: Set<string>): boolean {
  if (!modeledKeys?.size) return false;
  const normalized = key.toLowerCase();
  return Array.from(modeledKeys).some(item => item.toLowerCase() === normalized);
}

function isReportToolCandidate(server: McpServerConfig, tool: McpToolConfig): boolean {
  if (tool.access_mode === 'write') return false;
  const required = schemaRequired(tool);
  if (required.some(key => ['debug_targets', 'task_id', 'template_id'].includes(key))) return false;
  const haystack = normalizeText(`${server.id} ${server.name} ${server.description} ${server.tags?.join(' ')} ${server.business_domains?.join(' ')} ${tool.tool_id} ${tool.name} ${tool.description}`);
  if (/debug|diagnos|postback|tracking|event_report_check|config_check|start_task|watch_steps/.test(haystack)) return false;
  if (/联调|调试|回传|诊断|巡检/.test(haystack)) return false;
  return /report|roi|roas|daily|hour|retention|query|报表|查数|消耗|花费|投放|趋势/.test(haystack);
}

function findToolByKeywords(servers: McpServerConfig[], keywords: string[], reportOnly = true): { server: McpServerConfig; tool: McpToolConfig; matches: string[] } | null {
  let best: { server: McpServerConfig; tool: McpToolConfig; score: number; matches: string[] } | null = null;
  for (const server of servers) {
    if (!server.enabled || !server.endpoint_url) continue;
    for (const tool of server.tools || []) {
      if (!tool.enabled) continue;
      if (reportOnly && !isReportToolCandidate(server, tool)) continue;
      const haystack = normalizeText(`${server.name} ${server.description} ${server.tags?.join(' ') || ''} ${server.business_domains?.join(' ') || ''} ${tool.name} ${tool.description}`);
      const matches = keywords.filter(keyword => keyword && haystack.includes(keyword.toLowerCase()));
      const exactBoost = keywords.some(keyword => tool.name.toLowerCase() === keyword.toLowerCase()) ? 20 : 0;
      const score = matches.length * 10 + exactBoost;
      if (score > 0 && (!best || score > best.score)) best = { server, tool, score, matches };
    }
  }
  return best ? { server: best.server, tool: best.tool, matches: best.matches } : null;
}

function capabilityByType(policy: ReportQueryProjectResolutionPolicy, type: ReportQueryCapabilityType): ReportQueryCapabilityConfig {
  return policy.capabilities.find(capability => capability.capability_type === type) || {
    id: type,
    capability_type: type,
    required: type !== 'knowledge_fallback' && type !== 'project_lookup',
    tool_keywords: [],
    description: type,
    missing_message: '当前缺少必要能力。',
  };
}

function capabilityLabel(type: ReportQueryCapabilityType): string {
  const labels: Record<string, string> = {
    business_report: '报表查询',
    media_dictionary: '媒体平台匹配',
    terminal_dictionary: '终端系统匹配',
    team_dictionary: 'team_dictionary',
    app_package_type_dictionary: 'app_package_type_dictionary',
    account_dictionary: 'account_dictionary',
    package_dictionary: 'package_dictionary',
    optimizer_dictionary: 'optimizer_dictionary',
    project_lookup: 'project_lookup',
    knowledge_fallback: 'knowledge_fallback',
  };
  return labels[type] || type;
}

function capabilitySignalTerms(type: ReportQueryCapabilityType): string[] {
  const capability = loadReportQueryPolicySync().capabilities.find(item => item.capability_type === type);
  const configured = Array.from(new Set([
    ...(capability?.tool_keywords || []),
    capability?.entity_type || '',
    capability?.identifier_key || '',
    capability?.label || '',
  ].filter(Boolean)));
  if (configured.length) return configured;
  const signals: Record<string, string[]> = {
    business_report: ['query', 'report', 'data', 'analysis', 'analytics', 'metric', 'table', 'chart', 'trend', 'summary', 'detail'],
    media_dictionary: ['media', '媒体', 'platform', '渠道'],
    terminal_dictionary: ['terminal', '终端', 'device', 'os_type'],
    team_dictionary: ['team', '团队'],
    app_package_type_dictionary: ['app package', 'apppackage', 'appPackageType', '应用类型'],
    account_dictionary: ['account', '账户'],
    package_dictionary: ['package', 'pkg', '包体'],
    optimizer_dictionary: ['optimizer', '优化师'],
    project_lookup: ['project', 'app', '项目', '应用'],
    knowledge_fallback: ['knowledge', '知识库'],
  };
  return signals[type] || [];
}

function questionTypeSignalTerms(type: ReportQuestionType): string[] {
  const rules = loadReportQueryPolicySync().tool_selection_rules.filter(rule => rule.question_type === type);
  const configured = Array.from(new Set(rules.flatMap(rule => rule.include_terms)));
  if (configured.length) return configured;
  const signals: Record<ReportQuestionType, string[]> = {
    hour: ['hour', '小时', '分时', '实时', 'current hour'],
    daily: ['daily', '日报', '报表', '查询', 'trend', 'table', 'chart', 'data', 'metric', 'summary', 'detail'],
    roi: ['roi', 'roas', '回收', '投入产出', '首日', '投产'],
    retention: ['留存', '次留', 'arppu', 'retention'],
  };
  return signals[type] || [];
}

function extractRequestedDimensionKeys(message: string): string[] {
  const text = normalizeRoutingText(message).normalized_text;
  return Array.from(new Set(matchDomainSignalTerms(text, buildAdvertisingRequestSignals().dimensions).map(hit => hit.key)));
}

function capabilityTypeExpectedDomain(type: ReportQueryCapabilityType): ReportCapabilityDomain | undefined {
  if (type === 'business_report') return 'daily';
  if (
    type === 'media_dictionary'
    || type === 'terminal_dictionary'
    || type === 'team_dictionary'
    || type === 'app_package_type_dictionary'
    || type === 'account_dictionary'
    || type === 'package_dictionary'
    || type === 'optimizer_dictionary'
  ) return 'dictionary';
  if (type === 'project_lookup') return 'project';
  return undefined;
}

function expectedCapabilityKindForType(type: ReportQueryCapabilityType): ReportToolCapability['capability_kind'] | undefined {
  if (type === 'business_report') return 'report_query';
  if (
    type === 'media_dictionary'
    || type === 'terminal_dictionary'
    || type === 'team_dictionary'
    || type === 'app_package_type_dictionary'
    || type === 'account_dictionary'
    || type === 'package_dictionary'
    || type === 'optimizer_dictionary'
  ) return 'identifier_normalization';
  if (type === 'project_lookup') return 'context_lookup';
  if (type === 'knowledge_fallback') return 'knowledge_lookup';
  return undefined;
}

function expectedIdentifierKeyForType(type: ReportQueryCapabilityType): IdentifierKey | undefined {
  const mapping: Partial<Record<string, IdentifierKey>> = {
    media_dictionary: 'media_id',
    terminal_dictionary: 'os_type',
    team_dictionary: 'team_id',
    app_package_type_dictionary: 'app_package_type',
    account_dictionary: 'account_id',
    package_dictionary: 'app_package_id',
    optimizer_dictionary: 'account_id',
  };
  return mapping[type];
}

function scoreCapabilityMatch(params: {
  capability: ReportToolCapability;
  type: ReportQueryCapabilityType;
  message: string;
  signalTerms?: string[];
  entryPriority?: number;
  expectedDomain?: ReportCapabilityDomain;
}): { score: number; reason: string } {
  const text = normalizeRoutingText(params.message).normalized_text.toLowerCase();
  const signalTerms = params.signalTerms || capabilitySignalTerms(params.type);
  const routeHits = params.capability.route_terms.filter(term => signalTerms.some(signal => term.toLowerCase().includes(signal.toLowerCase()) || text.includes(term.toLowerCase())));
  const domainMatch = params.expectedDomain
    ? params.capability.report_domains.includes(params.expectedDomain)
    : false;
  const granularityHint = /小时|分时|实时|hour|hourly/i.test(params.message)
    ? params.capability.supported_granularity.includes('hour')
    : /周|week|weekly/.test(params.message)
      ? params.capability.supported_granularity.includes('natural_week')
      : /月|month|monthly/.test(params.message)
        ? params.capability.supported_granularity.includes('natural_month')
        : params.capability.supported_granularity.includes('day');
  const requestedDimensions = extractRequestedDimensionKeys(params.message);
  const dimensionHits = params.capability.supported_dimensions.filter(dimension => requestedDimensions.includes(dimension));
  const granularityScore = params.type === 'business_report' && granularityHint ? 60 : 0;
  const versatilityScore = params.type === 'business_report'
    ? (params.capability.supported_granularity.length * 4) + (params.capability.report_domains.filter(domain => domain !== 'dictionary' && domain !== 'project').length * 3)
    : 0;
  const descriptionHit = params.type === 'business_report'
    && params.capability.description
    && text.split(/\s+/).some(word => word.length >= 2 && params.capability.description.toLowerCase().includes(word))
    ? 15
    : 0;
  const baselineScore = params.type === 'business_report'
    && params.capability.capability_kind === 'report_query'
    && granularityHint
    ? 30
    : 0;
  const signalScore = (domainMatch ? 220 : 0)
    + (routeHits.length * 35)
    + granularityScore
    + versatilityScore
    + (dimensionHits.length * 12)
    + descriptionHit
    + baselineScore
    + (params.capability.confidence === 'manual_override' ? 10 : 0);
  const score = signalScore > 0 ? signalScore + (params.entryPriority || 0) : 0;
  return {
    score,
    reason: [
      domainMatch ? `domain:${params.expectedDomain}` : '',
      routeHits.length ? `terms:${routeHits.join(',')}` : '',
      granularityHint ? 'granularity:match' : '',
      dimensionHits.length ? `dimensions:${dimensionHits.join(',')}` : '',
    ].filter(Boolean).join(';') || 'no_match',
  };
}

function collectRawReportToolEntries(servers: McpServerConfig[]): Array<{
  capability_id: string;
  tool_name: string;
  server_name: string;
}> {
  return servers.flatMap(server => (server.tools || [])
    .filter(tool => tool.enabled && tool.access_mode !== 'write')
    .map(tool => ({
      capability_id: `${server.id}:${tool.name}`,
      tool_name: tool.name,
      server_name: server.name,
    })));
}

function buildCandidateLifecycle(params: {
  servers: McpServerConfig[];
  manifest: ReportCapabilityManifest;
  scored: Array<{
    capability: ReportToolCapability;
    score: number;
    reason: string;
    questionType: ReportQuestionType;
    expectedDomain?: ReportCapabilityDomain;
  }>;
  selectedCapabilityId?: string;
}): NonNullable<ReportToolSelectionTrace['candidate_lifecycle']> {
  const lifecycle: NonNullable<ReportToolSelectionTrace['candidate_lifecycle']> = [];
  const manifestCapabilityIds = new Set(params.manifest.tools.map(item => item.capability_id));
  const rawTools = collectRawReportToolEntries(params.servers);
  const rawToolIds = new Set(rawTools.map(item => item.capability_id));
  const scoredById = new Map(params.scored.map(item => [item.capability.capability_id, item] as const));
  const ranked = [...params.scored].sort((a, b) => b.score - a.score);
  const rankByCapabilityId = new Map(ranked.map((item, index) => [item.capability.capability_id, index + 1] as const));

  for (const rawTool of rawTools) {
    if (!manifestCapabilityIds.has(rawTool.capability_id)) {
      lifecycle.push({
        capability_id: rawTool.capability_id,
        tool_name: rawTool.tool_name,
        server_name: rawTool.server_name,
        state: 'not_discovered',
        reason: 'tool_not_present_in_report_capability_manifest',
      });
    }
  }

  for (const capability of params.manifest.tools) {
    const scored = scoredById.get(capability.capability_id);
    const runtimeAvailable = rawToolIds.has(capability.capability_id);
    if (!isExecutableReportCapability(capability)) {
      lifecycle.push({
        capability_id: capability.capability_id,
        tool_name: capability.tool_name,
        server_name: capability.server_name,
        state: 'not_executable',
        reason: 'capability_does_not_satisfy_report_execution_shape',
      });
      continue;
    }
    if (!scored || scored.score <= 0) {
      lifecycle.push({
        capability_id: capability.capability_id,
        tool_name: capability.tool_name,
        server_name: capability.server_name,
        state: 'filtered_out',
        reason: scored?.reason || 'no_match',
        score: scored?.score,
        question_type: scored?.questionType,
        expected_domain: scored?.expectedDomain,
      });
      continue;
    }
    lifecycle.push({
      capability_id: capability.capability_id,
      tool_name: capability.tool_name,
      server_name: capability.server_name,
      state: params.selectedCapabilityId === capability.capability_id
        ? 'selected'
        : runtimeAvailable
          ? 'rejected'
          : 'runtime_unavailable',
      reason: params.selectedCapabilityId === capability.capability_id
        ? scored.reason
        : runtimeAvailable
          ? 'lower_score_than_selected_tool'
          : 'no_runtime_tool_bound',
      score: scored.score,
      rank: rankByCapabilityId.get(capability.capability_id),
      question_type: scored.questionType,
      expected_domain: scored.expectedDomain,
    });
  }

  return lifecycle.sort((a, b) => {
    const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return a.tool_name.localeCompare(b.tool_name);
  });
}

function findToolForCapability(
  servers: McpServerConfig[],
  policy: ReportQueryProjectResolutionPolicy,
  type: ReportQueryCapabilityType,
  message = '',
  reportOnly = false,
): { capability: ReportQueryCapabilityConfig; server?: McpServerConfig; tool?: McpToolConfig; matches: string[] } {
  const capability = capabilityByType(policy, type);
  const manifest = buildReportCapabilityManifest(servers);
  const expectedDomain = capabilityTypeExpectedDomain(type) || (capability.entity_type ? 'dictionary' : undefined);
  const expectedCapabilityKind = expectedCapabilityKindForType(type) || (capability.entity_type ? 'identifier_normalization' : undefined);
  const expectedIdentifierKey = capability.identifier_key || expectedIdentifierKeyForType(type);
  const candidateCapabilities = (type === 'business_report' ? manifest.tools.filter(isExecutableReportCapability) : [...manifest.tools, ...manifest.dictionary_tools])
    .map(item => {
      const scored = scoreCapabilityMatch({
        capability: item,
        type,
        message: message || capability.description,
        entryPriority: capability.required ? 100 : 40,
        expectedDomain,
      });
      return { item, scored };
    })
    .filter(candidate => (
      candidate.scored.score > 0
      && (!expectedCapabilityKind || candidate.item.capability_kind === expectedCapabilityKind)
      && (!expectedIdentifierKey || candidate.item.identifier_keys.includes(expectedIdentifierKey))
    ))
    .sort((a, b) => b.scored.score - a.scored.score);
  const selected = candidateCapabilities.find(candidate => {
    const runtimeTool = findRuntimeToolByCapability(servers, candidate.item);
    return Boolean(runtimeTool && (!reportOnly || candidate.item.report_domains.some(domain => domain !== 'dictionary' && domain !== 'project')));
  });
  const runtimeTool = selected ? findRuntimeToolByCapability(servers, selected.item) : null;

  return {
    capability,
    server: runtimeTool?.server,
    tool: runtimeTool?.tool,
    matches: selected ? selected.item.route_terms.slice(0, 3) : [],
  };
}

function questionTypeToCapabilityDomain(type: ReportQuestionType): ReportCapabilityDomain {
  if (type === 'hour') return 'hourly';
  if (type === 'daily') return 'daily';
  return type;
}

function inferRequestedQuestionTypes(message: string, primary: ReportQuestionType): ReportQuestionType[] {
  const normalized = normalizeRoutingText(message).normalized_text;
  const output = new Set<ReportQuestionType>([primary]);
  if (/留存|次留|ARPPU|retention/i.test(normalized)) output.add('retention');
  if (!/留存|次留|ARPPU|retention/i.test(normalized) && /ROI|ROAS|roi|roas|投入产出|回收|回本|首日/i.test(normalized)) output.add('roi');
  if (hasExplicitHourNeed(normalized)) output.add('hour');
  if (/消耗|花费|成本|激活|注册|付费|支付|收入|日报|周报|月报|数据|趋势|报表|大盘|表现|经营/i.test(normalized)) output.add('daily');
  return [primary, ...Array.from(output).filter(type => type !== primary)];
}

function hasResolvedBusinessObjectSignal(message: string): boolean {
  return (['media', 'app', 'campaign', 'material', 'account', 'team', 'package', 'terminal', 'terminal_os'] as EntityType[])
    .some(entityType => findEntityResolutionCandidates(message, entityType).length > 0);
}

function hasStrongReportQueryIntent(message: string): boolean {
  const normalized = normalizeRoutingText(message).normalized_text;
  const hasDiagnosisSignal = /(为什么|为何|异常|对不上|不一致|没数|排查|诊断|原因|报错|失败|problem|issue|root\s*cause)/i.test(normalized);
  const hasDataSignal = /(查询|查看|看下|看一下|统计|取数|日报|周报|月报|数据|趋势|对比|多少|报表)/i.test(normalized);
  if (hasDiagnosisSignal && !hasDataSignal) return false;
  const requestSignals = buildAdvertisingRequestSignals();
  const hasMetric = matchDomainSignalTerms(normalized, requestSignals.metrics).length > 0 || hasAdvertisingDomainSignal(normalized, ['metric']);
  const configuredActionHits = matchDomainSignalTerms(normalized, requestSignals.reportActions);
  const hasReportAction = /(查询|查看|看下|看一下|看看|统计|取数|明细|数据|报表|日报|周报|月报|生成|导出|订阅|拉取|下载|分析)/i.test(normalized);
  const hasTrendOrCompare = /(趋势|走势|对比|比较|排名|环比|同比|变化)/i.test(normalized);
  const hasBusinessObject = matchDomainSignalTerms(normalized, requestSignals.domainEntities).length > 0 || hasAdvertisingDomainSignal(normalized, ['businessObject', 'media']) || hasResolvedBusinessObjectSignal(normalized);
  const hasValueQuestion = /(多少|几|是多少|值是多少|有多少)/i.test(normalized);
  const hasTime = /(今天|今日|昨日|昨天|上周|本周|本月|近\d{1,3}(?:天|日|小时)|最近\d{1,3}(?:天|日|小时)|过去\d{1,3}(?:天|日|小时)|时间|day|daily|hour|hourly)/i.test(normalized);
  const hasFileWorkflow = /(上传.*(excel|模板)|excel.*(模板|表)|按模板取数|拼表)/i.test(normalized);
  return Boolean(
    hasFileWorkflow
    || ((hasReportAction || configuredActionHits.some(hit => hit.key === 'query' || hit.key === 'delivery')) && (hasMetric || hasTime || hasBusinessObject))
    || ((hasTrendOrCompare || configuredActionHits.some(hit => hit.key === 'trend')) && (hasMetric || hasBusinessObject || hasTime))
    || (hasValueQuestion && hasMetric && (hasTime || hasBusinessObject))
    || (hasTime && hasMetric && hasBusinessObject)
  );
}

function selectReportToolForType(params: {
  servers: McpServerConfig[];
  message: string;
  questionType: ReportQuestionType;
  manifest: ReportCapabilityManifest;
  glossary: RoutingTextNormalizationResult;
}): SelectedReportTool | null {
  const policy = loadReportQueryPolicySync();
  const candidates = policy.tool_selection_rules
    .filter(rule => rule.question_type === params.questionType)
    .sort((a, b) => b.priority - a.priority);
  const entry = candidates[0];
  if (!entry) return null;
  const expectedDomain = questionTypeToCapabilityDomain(params.questionType);
  const scored = params.manifest.tools
    .filter(isExecutableReportCapability)
    .map((capability) => ({
      capability,
      questionType: params.questionType,
      expectedDomain,
      ...scoreCapabilityMatch({
        capability,
        type: 'business_report',
        message: params.glossary.normalized_text,
        signalTerms: questionTypeSignalTerms(params.questionType),
        entryPriority: entry.priority,
        expectedDomain,
      }),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  for (const item of scored) {
    const runtimeTool = findRuntimeToolByCapability(params.servers, item.capability);
    if (!runtimeTool) continue;
    return {
      server: runtimeTool.server,
      tool: runtimeTool.tool,
      entry,
      reason: `${entry.id}:${entry.description}; manifest:${item.reason}`,
      candidate_scores: [{
        rule_id: entry.id,
        question_type: entry.question_type,
        score: item.score,
        matched_terms: matchTerms(params.glossary.normalized_text, entry.include_terms),
        tool_matches: [item.capability.tool_name],
      }],
      manifest: params.manifest,
      capability: item.capability,
      candidate_lifecycle: buildCandidateLifecycle({
        servers: params.servers,
        manifest: params.manifest,
        scored,
        selectedCapabilityId: item.capability.capability_id,
      }),
      glossary: params.glossary,
      candidate_tools: scored.slice(0, 5).map(candidate => ({
        capability_id: candidate.capability.capability_id,
        tool_name: candidate.capability.tool_name,
        domains: candidate.capability.report_domains,
        score: candidate.score,
        reason: candidate.reason,
      })),
    };
  }
  const fallback = params.manifest.tools
    .filter(isExecutableReportCapability)
    .map((capability) => ({
      capability,
      ...scoreCapabilityMatch({
        capability,
        type: 'business_report',
        message: params.glossary.normalized_text,
        signalTerms: questionTypeSignalTerms(params.questionType),
        entryPriority: Math.max(1, entry.priority - 40),
        expectedDomain,
      }),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  const fallbackRuntimeTool = fallback ? findRuntimeToolByCapability(params.servers, fallback.capability) : null;
  if (!fallbackRuntimeTool) return null;
  return {
    server: fallbackRuntimeTool.server,
    tool: fallbackRuntimeTool.tool,
    entry,
    reason: `${entry.id}:${entry.description}; fallback:capability`,
    candidate_scores: [{
      rule_id: entry.id,
      question_type: entry.question_type,
      score: fallback?.score || entry.priority,
      matched_terms: matchTerms(params.glossary.normalized_text, entry.include_terms),
      tool_matches: [fallback?.capability.tool_name || fallbackRuntimeTool.tool.name],
      }],
      manifest: params.manifest,
      candidate_lifecycle: buildCandidateLifecycle({
        servers: params.servers,
        manifest: params.manifest,
        scored,
        selectedCapabilityId: fallback.capability.capability_id,
      }),
      glossary: params.glossary,
    };
  }

function isReportDefinitionOrHelpQuestion(message: string): boolean {
  const normalized = normalizeRoutingText(message).normalized_text;
  return /(字段|口径|指标|规则|说明|解释|是什么意思|什么含义|怎么定义|怎么计算|support|支持|配置|需要哪些)/i.test(normalized)
    && !/(查询|查看|看下|看一下|统计|取数|生成|导出|趋势|对比|多少|数据)/i.test(normalized);
}

export interface CapabilityUnderstanding {
  capability_id: string;
  relevance: 'high' | 'medium' | 'low' | 'none';
  reason: string;
  matched_intent_aspects: string[];
  confidence: number;
  dependencies?: Array<{ target_capability_id: string; dependency_type: 'requires_output' | 'enriches_input'; reason: string }>;
}

export function selectReportTool(servers: McpServerConfig[], message: string, options?: {
  preferredToolName?: string;
  preferredCapabilityId?: string;
  requirePreferred?: boolean;
  llmUnderstandings?: CapabilityUnderstanding[];
}): SelectedReportTool | null {
  if (isReportDefinitionOrHelpQuestion(message) && !options?.preferredToolName && !options?.preferredCapabilityId) {
    return null;
  }
  if (!hasStrongReportQueryIntent(message) && !options?.preferredToolName && !options?.preferredCapabilityId) {
    return null;
  }
  const policy = loadReportQueryPolicySync();
  const inferred = inferQuestionTypeFromTerms(message, policy);
  const manifest = buildReportCapabilityManifest(servers);
  const candidateTypes = Array.from(new Set([
    inferred.type,
    ...inferRequestedQuestionTypes(message, inferred.type),
  ]));
  const candidates = policy.tool_selection_rules
    .filter(rule => candidateTypes.includes(rule.question_type))
    .sort((a, b) => b.priority - a.priority);
  const llmUnderstandingMap = new Map(
    (options?.llmUnderstandings || []).map(u => [u.capability_id, u]),
  );
  const scoredCandidates = manifest.tools
    .filter(isExecutableReportCapability)
    .map((capability) => {
      const best = candidates
        .map(entry => ({
          entry,
          ...scoreCapabilityMatch({
            capability,
            type: 'business_report',
            message,
            signalTerms: questionTypeSignalTerms(entry.question_type),
            entryPriority: entry.priority + (entry.question_type === inferred.type ? 120 : 0),
            expectedDomain: questionTypeToCapabilityDomain(entry.question_type),
          }),
        }))
        .sort((a, b) => b.score - a.score)[0];
      const ruleScore = best ? best.score : 0;
      const llmU = llmUnderstandingMap.get(capability.capability_id)
        || llmUnderstandingMap.get(`mcp.${capability.server_id}.${capability.tool_name}`);
      const llmBoost = ruleScore > 0
        ? llmU?.relevance === 'high' ? 12
          : llmU?.relevance === 'medium' ? 6
            : 0
        : 0;
      const finalScore = ruleScore + llmBoost;
      return best
        ? { capability, score: finalScore, reason: `${best.entry.id}:${best.reason}${llmBoost ? `;llm:${llmU!.relevance}(+${llmBoost})` : ''}` }
        : { capability, score: finalScore, reason: llmBoost ? `llm:${llmU!.relevance}(+${llmBoost})` : 'no_match' };
    })
    .sort((a, b) => b.score - a.score);
  const candidateTools = scoredCandidates.filter(item => item.score > 0);
  const candidateLifecycle = (selectedCapabilityId?: string) => buildCandidateLifecycle({
    servers,
    manifest,
    scored: scoredCandidates.map(candidate => ({
      capability: candidate.capability,
      score: candidate.score,
      reason: candidate.reason,
      questionType: inferred.type,
      expectedDomain: questionTypeToCapabilityDomain(inferred.type),
    })),
    selectedCapabilityId,
  });
  const candidateToolRefs = (preferredCapability?: ReportToolCapability) => {
    const ordered = [
      ...(preferredCapability ? [{
        capability: preferredCapability,
        score: 999,
        reason: 'preferred_capability',
      }] : []),
      ...candidateTools.filter(item => item.capability.capability_id !== preferredCapability?.capability_id),
    ];
    return ordered.slice(0, 8).map(candidate => ({
      capability_id: candidate.capability.capability_id,
      tool_name: candidate.capability.tool_name,
      domains: candidate.capability.report_domains,
      score: candidate.score,
      reason: candidate.reason,
    }));
  };
  if (options?.preferredToolName || options?.preferredCapabilityId) {
    const normalizedPreferredCapabilityId = options.preferredCapabilityId
      ? options.preferredCapabilityId.replace(/^mcp\./, '').replace(/\./g, ':')
      : undefined;
    const preferredCapability = manifest.tools.find((capability) => (
      (options.preferredCapabilityId && capability.capability_id === options.preferredCapabilityId)
      || (normalizedPreferredCapabilityId && capability.capability_id === normalizedPreferredCapabilityId)
      || (options.preferredToolName && capability.tool_name === options.preferredToolName)
    ));
    if (preferredCapability) {
      const runtimeTool = findRuntimeToolByCapability(servers, preferredCapability);
      if (runtimeTool && isExecutableReportCapability(preferredCapability)) {
        const entry = policy.tool_selection_rules.find(rule => preferredCapability.report_domains.includes(questionTypeToCapabilityDomain(rule.question_type))) || policy.tool_selection_rules[0];
        if (entry) {
          const candidate_scores = (inferred.scores || []).map(score => ({
            ...score,
            tool_matches: score.tool_matches.includes(preferredCapability.tool_name) ? score.tool_matches : [...score.tool_matches, preferredCapability.tool_name],
          }));
          return {
            server: runtimeTool.server,
            tool: runtimeTool.tool,
            entry,
            reason: `preferred:${preferredCapability.capability_id}; ${entry.id}:${entry.description}`,
            candidate_scores,
            manifest,
            capability: preferredCapability,
            candidate_lifecycle: candidateLifecycle(preferredCapability.capability_id),
            glossary: inferred.glossary,
            candidate_tools: candidateToolRefs(preferredCapability),
            warnings: inferred.warnings,
          };
        }
      }
      if (options.requirePreferred) return null;
    } else if (options.requirePreferred) {
      return null;
    }
  }
  for (const item of candidateTools) {
    const runtimeTool = findRuntimeToolByCapability(servers, item.capability);
    const entry = candidates.find(rule => item.capability.report_domains.includes(questionTypeToCapabilityDomain(rule.question_type))) || candidates[0];
    if (!runtimeTool || !entry) continue;
    const candidate_scores = (inferred.scores || []).map(score => ({
      ...score,
      tool_matches: score.rule_id === entry.id ? [item.capability.tool_name] : score.tool_matches,
    }));
    return {
      server: runtimeTool.server,
      tool: runtimeTool.tool,
      entry,
      reason: `${entry.id}:${entry.description}; manifest:${item.reason}`,
      candidate_scores,
      manifest,
      capability: item.capability,
      candidate_lifecycle: candidateLifecycle(item.capability.capability_id),
      glossary: inferred.glossary,
      candidate_tools: candidateToolRefs(item.capability),
      warnings: inferred.warnings,
    };
  }
  return null;
}

function extractMetrics(message: string, fallback: string[]): string[] {
  const configured = matchDomainSignalTerms(message, buildAdvertisingRequestSignals().metrics).map(hit => hit.key);
  return Array.from(new Set(configured.length ? configured : fallback));
}

function extractDimensions(message: string, type: ReportQuestionType, fallback: string[]): string[] {
  const configured = matchDomainSignalTerms(message, buildAdvertisingRequestSignals().dimensions).map(hit => hit.key);
  if (configured.length) return Array.from(new Set([...fallback, ...configured]));
  const dimensions = new Set<string>(fallback);
  if (type === 'hour') dimensions.add('hour');
  return Array.from(dimensions);
}

function extractAppId(message: string, baseInput: Record<string, unknown>): string {
  const direct = baseInput.appId || baseInput.app_id || baseInput.projectId || baseInput.project_id;
  if (direct && !/^current_project$/i.test(String(direct))) return String(direct);
  const scope = Array.isArray(baseInput.project_scope) ? baseInput.project_scope.map(String).find(item => /^\d+$/.test(item)) : undefined;
  if (scope) return scope;
  return /(?:APPID|appId|app_id|应用id|项目id)[:：\s]*([0-9]+)/i.exec(message)?.[1] || '';
}

function extractAliasKeys(message: string, aliases: Record<string, string[]>): string[] {
  return Object.entries(aliases)
    .filter(([, terms]) => terms.some(term => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(message)))
    .map(([key]) => key);
}

function createCapabilityCheck(params: {
  policy: ReportQueryProjectResolutionPolicy;
  type: ReportQueryCapabilityType;
  tool?: McpToolConfig;
  server?: McpServerConfig;
  required?: boolean;
  skipped?: boolean;
  message?: string;
}): ReportCapabilityCheck {
  const capability = capabilityByType(params.policy, params.type);
  const required = params.required ?? capability.required;
  if (params.skipped) {
    return {
      capability_id: capability.id,
      capability_type: params.type,
      label: capabilityLabel(params.type),
      required,
      status: 'skipped',
      message: params.message || '本次问题不需要使用这项能力。',
    };
  }
  if (params.tool && params.server) {
    return {
      capability_id: capability.id,
      capability_type: params.type,
      label: capabilityLabel(params.type),
      required,
      status: 'available',
      tool_name: params.tool.name,
      server_name: params.server.name,
      message: params.message || '能力可用。',
    };
  }
  return {
    capability_id: capability.id,
    capability_type: params.type,
    label: capabilityLabel(params.type),
    required,
    status: 'missing',
    message: params.message || capability.missing_message,
  };
}

export function buildCapabilityPreflight(params: {
  servers: McpServerConfig[];
  selected: SelectedReportTool;
  message: string;
  baseInput: Record<string, unknown>;
  appId: string;
  policy: ReportQueryProjectResolutionPolicy;
}): ReportQueryPreflight {
  const semanticAliases = mergedEntityAliasMaps(params.policy);
  const dictionaryPlans = buildDictionaryPlans({
    message: params.message,
    policy: params.policy,
    semanticAliases,
    reportTool: params.selected.tool,
    baseInput: params.baseInput,
  });
  const requiresCapability = (type: ReportQueryCapabilityType) => dictionaryPlans.some(plan => plan.capability.capability_type === type);
  const mediaCapability = findToolForCapability(params.servers, params.policy, 'media_dictionary', params.message, false);
  const terminalCapability = findToolForCapability(params.servers, params.policy, 'terminal_dictionary', params.message, false);
  const teamCapability = findToolForCapability(params.servers, params.policy, 'team_dictionary', params.message, false);
  const appPackageTypeCapability = findToolForCapability(params.servers, params.policy, 'app_package_type_dictionary', params.message, false);
  const accountCapability = findToolForCapability(params.servers, params.policy, 'account_dictionary', params.message, false);
  const packageCapability = findToolForCapability(params.servers, params.policy, 'package_dictionary', params.message, false);
  const optimizerCapability = findToolForCapability(params.servers, params.policy, 'optimizer_dictionary', params.message, false);
  const projectCapability = findToolForCapability(params.servers, params.policy, 'project_lookup', params.message, false);
  const knowledgeCapability = findToolForCapability(params.servers, params.policy, 'knowledge_fallback', params.message, false);
  const projectDecision = shouldUseProjectLookup({ message: params.message, baseInput: params.baseInput, policy: params.policy });
  const checks: ReportCapabilityCheck[] = [
    createCapabilityCheck({
      policy: params.policy,
      type: 'business_report',
      tool: params.selected.tool,
      server: params.selected.server,
      required: true,
      message: '已找到可用于本次问题的数据查询能力。',
    }),
    requiresCapability('media_dictionary')
      ? createCapabilityCheck({
        policy: params.policy,
        type: 'media_dictionary',
        tool: mediaCapability.tool,
        server: mediaCapability.server,
        required: true,
      })
      : createCapabilityCheck({ policy: params.policy, type: 'media_dictionary', skipped: true, required: false }),
    requiresCapability('terminal_dictionary')
      ? createCapabilityCheck({
        policy: params.policy,
        type: 'terminal_dictionary',
        tool: terminalCapability.tool,
        server: terminalCapability.server,
        required: true,
      })
      : createCapabilityCheck({ policy: params.policy, type: 'terminal_dictionary', skipped: true, required: false }),
    requiresCapability('team_dictionary')
      ? createCapabilityCheck({ policy: params.policy, type: 'team_dictionary', tool: teamCapability.tool, server: teamCapability.server, required: true })
      : createCapabilityCheck({ policy: params.policy, type: 'team_dictionary', skipped: true, required: false }),
    requiresCapability('app_package_type_dictionary')
      ? createCapabilityCheck({ policy: params.policy, type: 'app_package_type_dictionary', tool: appPackageTypeCapability.tool, server: appPackageTypeCapability.server, required: true })
      : createCapabilityCheck({ policy: params.policy, type: 'app_package_type_dictionary', skipped: true, required: false }),
    requiresCapability('account_dictionary')
      ? createCapabilityCheck({ policy: params.policy, type: 'account_dictionary', tool: accountCapability.tool, server: accountCapability.server, required: true })
      : createCapabilityCheck({ policy: params.policy, type: 'account_dictionary', skipped: true, required: false }),
    requiresCapability('package_dictionary')
      ? createCapabilityCheck({ policy: params.policy, type: 'package_dictionary', tool: packageCapability.tool, server: packageCapability.server, required: true })
      : createCapabilityCheck({ policy: params.policy, type: 'package_dictionary', skipped: true, required: false }),
    requiresCapability('optimizer_dictionary')
      ? createCapabilityCheck({ policy: params.policy, type: 'optimizer_dictionary', tool: optimizerCapability.tool, server: optimizerCapability.server, required: true })
      : createCapabilityCheck({ policy: params.policy, type: 'optimizer_dictionary', skipped: true, required: false }),
    projectDecision.use_lookup
      ? createCapabilityCheck({
        policy: params.policy,
        type: 'project_lookup',
        tool: projectCapability.tool,
        server: projectCapability.server,
        required: false,
      })
      : createCapabilityCheck({ policy: params.policy, type: 'project_lookup', skipped: true, required: false }),
    createCapabilityCheck({
      policy: params.policy,
      type: 'knowledge_fallback',
      tool: knowledgeCapability.tool,
      server: knowledgeCapability.server,
      required: false,
      message: knowledgeCapability.tool ? '工具缺失时可参考知识库解释能力缺口。' : capabilityByType(params.policy, 'knowledge_fallback').missing_message,
    }),
  ];
  const missing_context_fields: string[] = [];
  const missing_capabilities = checks
    .filter(item => item.required && item.status === 'missing')
    .map(item => item.label);
  return {
    ok: missing_capabilities.length === 0 && missing_context_fields.length === 0,
    capability_checks: checks,
    missing_capabilities,
    missing_context_fields,
  };
}

function timeTypeForRange(type: ReportQuestionType, range: ReturnType<typeof parseDateRange>, policy: ReportQueryProjectResolutionPolicy): string {
  if (type === 'hour' || range.period_type === 'hour') return policy.semantic_defaults.hour_time_type;
  if (range.period_type === 'week') return policy.semantic_defaults.week_time_type;
  if (range.period_type === 'month') return policy.semantic_defaults.month_time_type;
  return policy.semantic_defaults.day_time_type;
}

function schemaAdaptersForType(policy: ReportQueryProjectResolutionPolicy, type: ReportQuestionType): ReportQuerySchemaAdapter[] {
  return policy.schema_adapters.filter(adapter => adapter.question_type === 'default' || adapter.question_type === type);
}

function adapterDefaults(_tool: McpToolConfig, type: ReportQuestionType, policy: ReportQueryProjectResolutionPolicy): Record<string, unknown> {
  return schemaAdaptersForType(policy, type)
    .reduce((acc, adapter) => ({ ...acc, ...adapter.required_defaults }), {} as Record<string, unknown>);
}

function promotionSourceAdapter(type: ReportQuestionType, policy: ReportQueryProjectResolutionPolicy): NonNullable<ReportQuerySchemaAdapter['promotion_source']> | undefined {
  return [...schemaAdaptersForType(policy, type)]
    .reverse()
    .find(adapter => adapter.promotion_source)?.promotion_source;
}

function firstSchemaKey(properties: Record<string, unknown>, candidates: string[]): string | undefined {
  if (Object.keys(properties).length === 0) return candidates.find(Boolean);
  return candidates.find(key => key in properties);
}

function configuredModeledArgumentKeys(policy: ReportQueryProjectResolutionPolicy, type: ReportQuestionType, properties: Record<string, unknown>): Set<string> {
  const keys = new Set<string>();
  for (const adapter of schemaAdaptersForType(policy, type)) {
    for (const key of adapter.modeled_argument_keys || []) keys.add(key);
    const argumentKey = adapter.promotion_source?.argument_key;
    if (argumentKey) keys.add(argumentKey);
  }
  for (const capability of policy.capabilities) {
    for (const key of capability.target_keys || []) keys.add(key);
  }
  for (const key of Object.keys(properties)) {
    if (/^(app|project|start|end|date|time|data|metric|dimension|media|os|terminal|team|account|pkg|package|optimizer|promotion)/i.test(key)) {
      keys.add(key);
    }
  }
  return keys;
}

function schemaEnumValues(properties: Record<string, unknown>, key: string): string[] {
  const schema = properties[key];
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return [];
  const values = (schema as { enum?: unknown }).enum;
  return Array.isArray(values) ? values.map(String).filter(Boolean) : [];
}

function inferPromotionSourceInternal(params: {
  message: string;
  mediaKeys: string[];
  adapter?: NonNullable<ReportQuerySchemaAdapter['promotion_source']>;
  policy: ReportQueryProjectResolutionPolicy;
}): { value: PromotionSourceInternal; source: string; internalValues: string[] } {
  const internalValues = params.adapter?.internal_values?.length
    ? params.adapter.internal_values
    : [params.policy.semantic_defaults.promotion_source].filter(Boolean);
  const normalized = params.message.toLowerCase();
  for (const [internal, terms] of Object.entries(params.adapter?.source_terms || {})) {
    if (terms.some(term => term && normalized.includes(term.toLowerCase()))) {
      return { value: internal, source: 'promotion_source_resolver', internalValues };
    }
  }
  if (params.mediaKeys.length && params.adapter?.media_default_internal) {
    return { value: params.adapter.media_default_internal, source: 'promotion_source_resolver', internalValues };
  }
  const fallback = params.adapter?.default_internal || params.policy.semantic_defaults.promotion_source || internalValues[0] || '';
  return { value: fallback, source: 'policy.default_promotion_source', internalValues };
}

function mapPromotionSourceToExternal(params: {
  internal: PromotionSourceInternal;
  properties: Record<string, unknown>;
  tool: McpToolConfig;
  type: ReportQuestionType;
  policy: ReportQueryProjectResolutionPolicy;
}): {
  external?: string;
  adapter: string;
  allowedExternalValues: string[];
  argumentKey: string;
  internalValues: string[];
  unsupported: boolean;
} {
  const adapterConfig = promotionSourceAdapter(params.type, params.policy);
  const argumentKey = firstSchemaKey(params.properties, [adapterConfig?.argument_key || ''].filter(Boolean)) || adapterConfig?.argument_key || '';
  const allowedExternalValues = argumentKey ? schemaEnumValues(params.properties, argumentKey) : [];
  const adapter = `tool_schema_adapter:${params.tool.name}:${params.type}`;
  const internalValues = adapterConfig?.internal_values || [];
  const configuredExternalValues = adapterConfig?.external_values?.[params.internal] || [params.internal].filter(Boolean);
  const external = allowedExternalValues.length
    ? configuredExternalValues.find(value => allowedExternalValues.includes(value))
    : configuredExternalValues[0];
  return {
    external,
    adapter,
    allowedExternalValues,
    argumentKey,
    internalValues,
    unsupported: !external,
  };
}

export function buildToolArgumentPreflight(params: {
  finalArgs: Record<string, unknown>;
  requiredKeys: string[];
  missingRequiredKeysBeforeCall: string[];
  sourceMapping: Record<string, string>;
  resolvedFilters: Partial<ResolvedFilters>;
  promotionMapping?: {
    internal: PromotionSourceInternal;
    external?: string;
    source: string;
    adapter: string;
    argumentKey?: string;
    internalValues?: string[];
    allowedExternalValues: string[];
    unsupported: boolean;
  };
}): ReportToolArgumentPreflight {
  const issues: ReportToolArgumentPreflightIssue[] = [];
  for (const key of params.missingRequiredKeysBeforeCall) {
    issues.push({
      field: key,
      code: 'missing_required_input',
      message: `${key} is required before calling the MCP tool.`,
      source: params.sourceMapping[key],
    });
  }
  const promotionArgumentKey = params.promotionMapping?.argumentKey
    || Object.keys(params.sourceMapping).find(key => key.toLowerCase() === 'promotionsource')
    || '';
  const promotionValue = params.finalArgs[promotionArgumentKey];
  const promotionSource = params.sourceMapping[promotionArgumentKey] || '';
  const mediaIds = (params.resolvedFilters.mediaId || []).map(String);
  const mediaSource = params.sourceMapping.mediaId || params.sourceMapping.mediaIds || params.sourceMapping.media_id || '';
  const terminalSource = params.sourceMapping.osTypes || params.sourceMapping.osType || params.sourceMapping.terminalOs || '';
  if (params.promotionMapping) {
    const internalValues = params.promotionMapping.internalValues || [];
    if (internalValues.length && !internalValues.includes(params.promotionMapping.internal)) {
      issues.push({
        field: 'promotion_source',
        code: 'invalid_internal_enum',
        message: 'Internal promotion_source does not match the schema adapter contract.',
        internal: params.promotionMapping.internal,
        source: params.promotionMapping.source,
      });
    }
    if (params.promotionMapping.unsupported) {
      issues.push({
        field: promotionArgumentKey,
        code: 'unsupported_query',
        message: 'The selected tool does not support the requested promotion source.',
        internal: params.promotionMapping.internal,
        allowedExternalValues: params.promotionMapping.allowedExternalValues,
        source: params.promotionMapping.source,
      });
    }
  }
  if (promotionValue !== undefined && promotionValue !== null && promotionValue !== '') {
    const asString = String(promotionValue);
    const allowedExternalValues = params.promotionMapping?.allowedExternalValues || [];
    if (/^\d+$/.test(asString) || mediaIds.includes(asString)) {
      issues.push({
        field: promotionArgumentKey,
        code: 'source_mapping_violation',
        message: `${promotionArgumentKey} must not be populated by media_id.`,
        external: asString,
        source: promotionSource,
      });
    }
    if (/media|dynamicFilters/i.test(promotionSource)) {
      issues.push({
        field: promotionArgumentKey,
        code: 'source_mapping_violation',
        message: `${promotionArgumentKey} sourceMapping must come from promotion_source_resolver or policy default.`,
        external: asString,
        source: promotionSource,
      });
    }
    if (allowedExternalValues.length && !allowedExternalValues.includes(asString)) {
      issues.push({
        field: promotionArgumentKey,
        code: 'invalid_external_enum',
        message: `${promotionArgumentKey} must match the selected tool schema adapter.`,
        external: asString,
        allowedExternalValues,
        source: promotionSource,
      });
    }
  }
  if (params.finalArgs.mediaId !== undefined || params.finalArgs.mediaIds !== undefined || params.finalArgs.media_id !== undefined) {
    const value = params.finalArgs.mediaId ?? params.finalArgs.mediaIds ?? params.finalArgs.media_id;
    const values = Array.isArray(value) ? value.map(String) : String(value || '').split(',').map(item => item.trim()).filter(Boolean);
    if (!values.length) {
      issues.push({
        field: 'mediaId',
        code: 'missing_required_input',
        message: 'mediaId must contain at least one resolved media identifier.',
        source: mediaSource,
      });
    }
    if (!/resolved_filters\.mediaId|capability_slot_mapping:media/.test(mediaSource)) {
      issues.push({
        field: 'mediaId',
        code: 'source_mapping_violation',
        message: 'mediaId must be populated by MediaResolver.',
        external: value,
        source: mediaSource,
      });
    }
  }
  if (params.finalArgs.osTypes !== undefined || params.finalArgs.osType !== undefined || params.finalArgs.terminalOs !== undefined) {
    if (!/resolved_filters\.(osTypes|terminalOs)|capability_slot_mapping:terminal_os/.test(terminalSource)) {
      issues.push({
        field: 'terminal_os',
        code: 'source_mapping_violation',
        message: 'terminal/os argument must be populated by TerminalOsResolver.',
        external: params.finalArgs.osTypes ?? params.finalArgs.osType ?? params.finalArgs.terminalOs,
        source: terminalSource,
      });
    }
  }
  const status: ReportToolArgumentPreflight['status'] = issues.some(item => item.code === 'unsupported_query')
    ? 'unsupported_query'
    : issues.some(item => item.code !== 'missing_required_input')
      ? 'invalid_params'
      : issues.length
        ? 'missing_required_input'
        : 'passed';
  return {
    ok: issues.length === 0,
    blockedBeforeCall: issues.length > 0,
    status,
    issues,
  };
}

export function buildReportToolInput(
  tool: McpToolConfig,
  message: string,
  baseInput: Record<string, unknown>,
  resolvedFilters: Partial<ResolvedFilters> = {},
  capability?: ReportToolCapability,
): ReportToolInputBuildResult {
  const policy = loadReportQueryPolicySync();
  const semanticAliases = mergedEntityAliasMaps(policy);
  const type = selectReportQuestionType(message);
  const entry = policy.tool_selection_rules.find(item => item.question_type === type) || policy.tool_selection_rules[policy.tool_selection_rules.length - 1];
  const parsedRange = parseDateRange(message);
  const useParsedDateRange = parsedRange.is_explicit || hasExplicitDateRangeNeed(message);
  const dateRange = {
    start_date: !useParsedDateRange && typeof baseInput.start_date === 'string' ? baseInput.start_date : parsedRange.start_date,
    end_date: !useParsedDateRange && typeof baseInput.end_date === 'string' ? baseInput.end_date : parsedRange.end_date,
  };
  const metrics = extractMetrics(message, Array.isArray(baseInput.metrics) ? baseInput.metrics.map(String) : entry.default_metrics);
  const dimensions = extractDimensions(message, type, entry.default_dimensions);
  const mediaKeys = extractAliasKeys(message, semanticAliases.media_aliases);
  const appId = extractAppId(message, baseInput);
  const properties = schemaProperties(tool);
  const input: Record<string, unknown> = Object.keys(properties).length ? {} : { ...baseInput };
  const droppedKeys = new Set<string>();
  const sourceMapping: Record<string, string> = {};
  if (Object.keys(properties).length === 0) {
    for (const key of Object.keys(baseInput)) sourceMapping[key] = 'baseInput';
  }
  const defaults = adapterDefaults(tool, type, policy);
  const requiredKeys = schemaRequired(tool);
  const reportTimeType = timeTypeForRange(type, parsedRange, policy);
  const promotionAdapter = promotionSourceAdapter(type, policy);
  const promotionInternal = inferPromotionSourceInternal({
    message,
    mediaKeys,
    adapter: promotionAdapter,
    policy,
  });
  const promotionExternal = mapPromotionSourceToExternal({
    internal: promotionInternal.value,
    properties,
    tool,
    type,
    policy,
  });
  const promotionMapping = {
    internal: promotionInternal.value,
    external: promotionExternal.external,
    source: promotionInternal.source,
    adapter: promotionExternal.adapter,
    argumentKey: promotionExternal.argumentKey,
    internalValues: promotionExternal.internalValues.length ? promotionExternal.internalValues : promotionInternal.internalValues,
    allowedExternalValues: promotionExternal.allowedExternalValues,
    unsupported: promotionExternal.unsupported,
  };
  const modeledArgumentKeys = configuredModeledArgumentKeys(policy, type, properties);
  const assign = (key: string, value: unknown, source: string) => assignReportArg({
    target: input,
    properties,
    droppedKeys,
    sourceMapping,
    key,
    value,
    source,
  });

  for (const [key, value] of Object.entries(defaults)) {
    if (key === promotionExternal.argumentKey) continue;
    assign(key, value, 'policy.schema_adapters.required_defaults');
  }
  if (promotionExternal.argumentKey && (promotionExternal.argumentKey in properties || Object.keys(properties).length === 0)) {
    assign(promotionExternal.argumentKey, promotionExternal.external, `${promotionInternal.source}.external`);
    sourceMapping[`${promotionExternal.argumentKey}.internal`] = promotionInternal.value;
    sourceMapping[`${promotionExternal.argumentKey}.external`] = String(promotionExternal.external || '');
    sourceMapping[`${promotionExternal.argumentKey}.source`] = promotionInternal.source;
    sourceMapping[`${promotionExternal.argumentKey}.adapter`] = promotionExternal.adapter;
    sourceMapping[`${promotionExternal.argumentKey}.allowedExternalValues`] = promotionExternal.allowedExternalValues.join(',');
  }
  assign('appId', appId, 'baseInput.appId_alias');
  assign('project_id', appId, 'baseInput.appId_alias');
  assign('projectId', appId, 'baseInput.appId_alias');
  assign('start_date', dateRange.start_date, 'date_range_resolver.start_date');
  assign('startDate', dateRange.start_date, 'date_range_resolver.start_date');
  assign('end_date', dateRange.end_date, 'date_range_resolver.end_date');
  assign('endDate', dateRange.end_date, 'date_range_resolver.end_date');
  assign('date_range', `${dateRange.start_date}~${dateRange.end_date}`, 'date_range_resolver.range');
  assign('time_range', `${dateRange.start_date}~${dateRange.end_date}`, 'date_range_resolver.range');
  assign('metrics', metrics, 'request_understanding.metrics');
  assign('metric_keys', metrics, 'request_understanding.metrics');
  assign('dimensions', dimensions, 'request_understanding.dimensions');
  assign('granularity', type === 'hour' ? 'hour' : 'day', 'request_understanding.granularity');
  assign('timeType', reportTimeType, 'policy.semantic_defaults.time_type');
  assign('baseTimeType', policy.semantic_defaults.base_time_type, 'policy.semantic_defaults.base_time_type');
  assign('report_type', type, 'request_understanding.question_type');
  assign('user_question', message.slice(0, 1000), 'user_message');
  assign('intent', 'report_query', 'route_intent');
  applyCapabilitySlotMappings(input, properties, capability, resolvedFilters, { droppedKeys, sourceMapping, requiredKeys: new Set(requiredKeys), modeledKeys: modeledArgumentKeys });

  if (resolvedFilters.mediaId?.length) {
    assign('mediaId', listValueForSchema(properties, 'mediaId', resolvedFilters.mediaId), 'resolved_filters.mediaId');
    assign('mediaIds', listValueForSchema(properties, 'mediaIds', resolvedFilters.mediaId), 'resolved_filters.mediaId');
    assign('media_id', listValueForSchema(properties, 'media_id', resolvedFilters.mediaId), 'resolved_filters.mediaId');
  }
  if (resolvedFilters.osTypes?.length) assign('osTypes', resolvedFilters.osTypes, 'resolved_filters.osTypes');
  if (resolvedFilters.terminalOs?.length) {
    assign('osTypes', resolvedFilters.terminalOs, 'resolved_filters.terminalOs');
    assign('osType', listValueForSchema(properties, 'osType', resolvedFilters.terminalOs), 'resolved_filters.terminalOs');
  }
  if (resolvedFilters.teamIds?.length) assign('teamIds', resolvedFilters.teamIds, 'resolved_filters.teamIds');
  if (resolvedFilters.appPackageType?.length) assign('appPackageType', resolvedFilters.appPackageType[0], 'resolved_filters.appPackageType');
  if (resolvedFilters.accountId?.length) assign('accountId', resolvedFilters.accountId, 'resolved_filters.accountId');
  if (resolvedFilters.pkgId?.length) assign('pkgId', resolvedFilters.pkgId, 'resolved_filters.pkgId');
  if (resolvedFilters.optimizerIds?.length) assign('optimizerIds', resolvedFilters.optimizerIds, 'resolved_filters.optimizerIds');
  if (mediaKeys.length && resolvedFilters.mediaId?.length) {
    assign('subGroup', 'media_id', 'request_understanding.media_dimension');
  }
  if (resolvedFilters.teamIds?.length) assign('subGroup', 'team_id', 'resolved_filters.teamIds');
  if (resolvedFilters.accountId?.length) assign('subGroup', 'account_id', 'resolved_filters.accountId');
  if (resolvedFilters.pkgId?.length) assign('subGroup', 'pkg_id', 'resolved_filters.pkgId');
  if (resolvedFilters.optimizerIds?.length) assign('subGroup', 'optimizer_id', 'resolved_filters.optimizerIds');
  const missingRequiredKeysBeforeCall = requiredKeys.filter(key => isEmptyValue(input[key]));
  const preflight = buildToolArgumentPreflight({
    finalArgs: input,
    requiredKeys,
    missingRequiredKeysBeforeCall,
    sourceMapping,
    resolvedFilters,
    promotionMapping,
  });
  const finalArgKeys = Object.keys(input).sort();
  const missing_fields = missingRequiredKeysBeforeCall;
  return {
    input,
    finalArgs: input,
    finalArgKeys,
    requiredKeys,
    missingRequiredKeysBeforeCall,
    droppedKeys: Array.from(droppedKeys).sort(),
    sourceMapping,
    preflight,
    missing_fields,
    metrics,
    dimensions,
    date_range: dateRange,
  };
}

function buildTrace(message: string, selected: SelectedReportTool): ReportToolSelectionTrace {
  const explicitHour = hasExplicitHourNeed(message);
  return {
    selected_question_type: selected.entry.question_type,
    selected_tool: selected.tool.name,
    selected_server: selected.server.name,
    reason: selected.reason,
    hour_decision: selected.entry.question_type === 'hour' ? 'selected' : 'rejected',
    hour_reason: selected.entry.question_type === 'hour'
      ? '用户明确要求小时或实时数据。'
      : explicitHour
        ? '存在小时信号，但编排规则选择了更高优先级的日报/ROI工具。'
        : '没有明确小时或实时要求，按日粒度更符合问题。',
    requested_granularity: selected.entry.question_type === 'hour' ? 'hour' : 'day',
    rule_id: selected.entry.id,
    candidate_scores: selected.candidate_scores,
    manifest_version: selected.manifest?.manifest_version,
    capability_id: selected.capability?.capability_id,
    candidate_tools: selected.candidate_tools,
    candidate_lifecycle: selected.candidate_lifecycle,
    glossary: selected.glossary,
    warnings: selected.warnings,
  };
}

function runtimeToolRef(server: McpServerConfig, tool: McpToolConfig): NonNullable<ReportToolArgumentContractTrace['selectedTool']> {
  return {
    name: tool.name,
    serverId: server.id,
    serverName: server.name,
  };
}

function buildArgumentContractTrace(params: {
  selected: SelectedReportTool;
  adapted: ReportToolInputBuildResult;
  called?: SelectedReportTool;
}): ReportToolArgumentContractTrace {
  const selectedTool = runtimeToolRef(params.selected.server, params.selected.tool);
  const calledTool = params.called ? runtimeToolRef(params.called.server, params.called.tool) : undefined;
  return {
    selectedTool,
    schemaSourceTool: selectedTool,
    finalArgsSourceTool: selectedTool,
    calledTool,
    finalArgKeys: params.adapted.finalArgKeys,
    requiredKeys: params.adapted.requiredKeys,
    missingRequiredKeysBeforeCall: params.adapted.missingRequiredKeysBeforeCall,
    droppedKeys: params.adapted.droppedKeys,
    sourceMapping: params.adapted.sourceMapping,
    preflight: params.adapted.preflight,
  };
}

function preflightSuggestedAction(preflight: ReportToolArgumentPreflight): string {
  if (preflight.issues.some(item => item.code === 'missing_required_input')) return 'complete_required_input';
  if (preflight.issues.some(item => item.code === 'unsupported_query')) return 'select_supported_tool_or_check_project_capability';
  return 'fix_argument_mapping';
}

function preflightErrorCode(preflight: ReportToolArgumentPreflight): string {
  if (preflight.status === 'missing_required_input') return 'missing_required_input';
  if (preflight.status === 'unsupported_query') return 'unsupported_query';
  return 'business_failed_invalid_argument';
}

function buildPreflightBlockedCallResult(params: {
  selected: SelectedReportTool;
  adapted: ReportToolInputBuildResult;
}): ConfiguredMcpToolCallResult {
  const issue = params.adapted.preflight.issues[0];
  const errorCode = preflightErrorCode(params.adapted.preflight);
  const errorMessage = issue?.message || 'Tool argument preflight blocked the MCP call.';
  return {
    status: 'business_failed',
    server: params.selected.server.name,
    tool: params.selected.tool.name,
    business_outcome: errorCode === 'unsupported_query' ? 'capability_not_available' : 'execution_failed',
    error_code: errorCode,
    normalizedErrorCode: errorCode,
    normalizedStatus: params.adapted.preflight.status,
    error_message: errorMessage,
    business_error: errorMessage,
    message: errorMessage,
    canRetryWithSameTool: false,
    suggestedAction: preflightSuggestedAction(params.adapted.preflight),
    blockedBeforeCall: true,
    internalReason: issue?.code === 'source_mapping_violation'
      ? `${issue.field} was populated from invalid source: ${issue.source || 'unknown'}`
      : issue?.code,
    response: {
      blockedBeforeCall: true,
      preflight: params.adapted.preflight,
      sourceMapping: params.adapted.sourceMapping,
      finalArgKeys: params.adapted.finalArgKeys,
      requiredKeys: params.adapted.requiredKeys,
    },
  };
}

export function selectFallbackToolsForAppScope(params: {
  servers: McpServerConfig[];
  selected: SelectedReportTool;
  candidateTools?: NonNullable<ReportToolSelectionTrace['candidate_tools']>;
  attemptedToolNames: Set<string>;
}): SelectedReportTool[] {
  const manifest = params.selected.manifest;
  const candidateTools = params.candidateTools?.length ? params.candidateTools : params.selected.candidate_tools;
  if (!manifest || !candidateTools?.length) return [];
  return candidateTools
    .filter(candidate => !params.attemptedToolNames.has(candidate.tool_name))
    .flatMap((candidate) => {
      const capability = manifest.tools.find(item => (
        item.capability_id === candidate.capability_id
        || item.tool_name === candidate.tool_name
      ));
      if (!capability || !isExecutableReportCapability(capability)) return [];
      if (capability.report_domains.includes('dictionary') || capability.report_domains.includes('project')) return [];
      const runtimeTool = findRuntimeToolByCapability(params.servers, capability);
      if (!runtimeTool) return [];
      const entry = capability.report_domains.includes(questionTypeToCapabilityDomain(params.selected.entry.question_type))
        ? params.selected.entry
        : params.selected.entry;
      return [{
        server: runtimeTool.server,
        tool: runtimeTool.tool,
        entry,
        reason: `fallback_after_app_scope_not_supported:${candidate.reason}`,
        candidate_scores: params.selected.candidate_scores,
        manifest,
        capability,
        candidate_tools: candidateTools,
        glossary: params.selected.glossary,
      } satisfies SelectedReportTool];
    });
}

function buildInitialReportQueryPlan(params: {
  message: string;
  selected: SelectedReportTool;
  selectedTools?: SelectedReportTool[];
  baseInput: Record<string, unknown>;
  adaptedInput?: Record<string, unknown>;
  pendingSlots?: string[];
  status?: ReportQueryPlanStatus;
}): ReportQueryPlan {
  const now = new Date().toISOString();
  const normalized = params.selected.glossary?.normalized_text || params.message;
  const selectedTools = params.selectedTools?.length ? params.selectedTools : [params.selected];
  const candidateSubQueries = selectedTools
    .map((toolSelection, index): ReportSubQuery => ({
      sub_query_id: `sub-${index + 1}`,
      question_type: toolSelection.entry.question_type,
      tool_name: toolSelection.tool.name,
      server_name: toolSelection.server.name,
      status: 'planned',
      message: index === 0 ? '主查询。' : '复合问数子查询，按串行计划执行。',
    }));
  const subQueries = candidateSubQueries.length
    ? candidateSubQueries
    : [{
      sub_query_id: 'sub-1',
      question_type: params.selected.entry.question_type,
      tool_name: params.selected.tool.name,
      server_name: params.selected.server.name,
      status: 'planned' as const,
      input: params.adaptedInput,
    }];
  return {
    plan_id: `report-plan-${Date.now()}`,
    original_question: params.message,
    normalized_question: normalized,
    primary_question_type: params.selected.entry.question_type,
    project_context: { ...params.baseInput, ...(params.adaptedInput || {}) },
    sub_queries: subQueries,
    required_slots: unique(selectedTools.flatMap(toolSelection => schemaRequired(toolSelection.tool))),
    resolved_slots: params.adaptedInput || {},
    pending_slots: params.pendingSlots || [],
    merge_rules: subQueries.length > 1 ? ['按子查询报表域分别执行后，以同一项目和日期范围合并展示。'] : [],
    failed_items: [],
    evidence_refs: [],
    status: params.status || 'planning',
    updated_at: now,
  };
}

function capabilityDomainToQuestionType(domain?: ReportCapabilityDomain): ReportQuestionType | undefined {
  if (domain === 'hourly') return 'hour';
  if (domain === 'daily' || domain === 'weekly' || domain === 'monthly') return 'daily';
  if (domain === 'roi' || domain === 'retention') return domain;
  return undefined;
}

function resultStatusToSubQueryStatus(status: ReportQueryStatus): ReportSubQuery['status'] {
  if (status === 'blocked' || status === 'business_failed') return 'failed';
  return status;
}

function buildLookupToolChain(
  servers: McpServerConfig[],
  selected: SelectedReportTool,
  message: string,
  baseInput: Record<string, unknown>,
): ExecuteReportQueryStepResult['tool_chain'] {
  const chain: ExecuteReportQueryStepResult['tool_chain'] = [];
  const policy = loadReportQueryPolicySync();
  const decision = shouldUseProjectLookup({ message, baseInput, policy });
  if (decision.use_lookup) {
  const lookup = findToolForCapability(servers, policy, 'project_lookup', message, false);
  chain.push({
    key: policy.lookup_tool_step_key,
    tool_name: lookup.tool?.name || '',
    server_name: lookup.server?.name || '',
    status: lookup.tool ? 'planned' : 'skipped',
    required: false,
    message: lookup.tool ? `project_lookup:${decision.reason}; capability:${lookup.capability.id}` : `project_lookup_tool_unavailable:${decision.reason}`,
  });
  } else {
    chain.push({
      key: policy.lookup_tool_step_key,
      tool_name: '',
      server_name: '',
      status: 'skipped',
      required: false,
      message: `project_lookup_skipped:${decision.reason}`,
    });
  }
  chain.push({
    key: 'business_report',
    tool_name: selected.tool.name,
    server_name: selected.server.name,
    status: 'planned',
    required: true,
  });
  return chain;
}

export function normalizeConfiguredMcpToolCallResult(params: {
  ok: boolean;
  msg?: string;
  result?: unknown;
  latency_ms?: number;
  execution_contract?: McpToolCallResult['execution_contract'];
  policy_blocked?: boolean;
  security_blocked?: boolean;
  blocking_reason?: string;
  retry?: boolean;
  serverName: string;
  toolName: string;
  raw_response_preview?: string;
}): ConfiguredMcpToolCallResult {
  const failureMessage = params.msg || '';
  const shouldNormalizeFailedBusinessError = !params.ok && (
    /\b(?:4\d\d|5\d\d)\b/.test(failureMessage)
    || /not support|unsupported|not configured|no permission|permission|unauthor|forbidden|missing required|required field|缺少|必填|权限|授权|不支持/i.test(failureMessage)
  );
  const businessError = params.ok
    ? normalizeMcpBusinessError(params.result)
    : shouldNormalizeFailedBusinessError
      ? normalizeMcpBusinessError({
        code: /\b(4\d\d|5\d\d)\b/.exec(failureMessage)?.[1] || 'business_error',
        message: failureMessage,
        policy_blocked: params.policy_blocked,
        security_blocked: params.security_blocked,
        blocking_reason: params.blocking_reason,
      })
      : undefined;
  if (businessError) {
    const retryAllowed = params.policy_blocked || params.security_blocked ? false : businessError.canRetryWithSameTool;
    return {
      status: 'business_failed',
      execution_contract: params.execution_contract,
      policy_blocked: params.policy_blocked,
      security_blocked: params.security_blocked,
      blocking_reason: params.blocking_reason,
      server: params.serverName,
      tool: params.toolName,
      response: params.result,
      business_payload: params.result,
      business_outcome: businessError.business_outcome,
      business_error: businessError.business_error,
      error: businessError.error_message,
      error_code: businessError.error_code,
      error_message: businessError.error_message,
      canRetryWithSameTool: retryAllowed,
      suggestedAction: businessError.suggestedAction,
      message: businessError.error_message,
      latency_ms: params.latency_ms,
      token_expired: false,
      raw_response_preview: params.raw_response_preview,
      normalizedErrorCode: businessError.error_code,
      normalizedStatus: 'business_failed',
      internalReason: businessError.internalReason,
      retry: retryAllowed,
    };
  }
  return {
    status: params.ok ? 'success' : 'failed',
    execution_contract: params.execution_contract,
    policy_blocked: params.policy_blocked,
    security_blocked: params.security_blocked,
    blocking_reason: params.blocking_reason,
    server: params.serverName,
    tool: params.toolName,
    response: params.result,
    business_payload: params.result,
    business_error: params.ok ? undefined : params.msg,
    error: params.ok ? undefined : params.msg,
    message: params.msg,
    latency_ms: params.latency_ms,
    token_expired: /token|unauthor|forbidden|401|403|过期|失效|重新登录/i.test(params.msg || ''),
    raw_response_preview: params.raw_response_preview,
    normalizedErrorCode: undefined,
    normalizedStatus: params.ok ? 'success' : 'failed',
    retry: params.retry,
  };
}

function reportToolFallbackReason(callResult: ConfiguredMcpToolCallResult): string | null {
  if (callResult.status !== 'business_failed' || callResult.canRetryWithSameTool !== false) return null;
  if (callResult.error_code === 'app_scope_not_supported') return 'app_scope_not_supported';
  const message = String(callResult.error_message || callResult.business_error || callResult.error || callResult.message || '');
  if (
    callResult.error_code === 'capability_not_available'
    && /unsupported[_ -]?project|project.*(?:not support|unsupported)|(?:not support|unsupported).*project/i.test(message)
  ) {
    return 'unsupported_project';
  }
  return null;
}

export function shouldAttemptReportToolFallback(callResult: ConfiguredMcpToolCallResult): boolean {
  return Boolean(reportToolFallbackReason(callResult));
}

async function callConfiguredMcpTool(
  server: McpServerConfig,
  tool: McpToolConfig,
  input: Record<string, unknown>,
  options?: {
    executionContract?: McpToolCallResult['execution_contract'];
    toolPolicy?: McpDiscoveryInput['tool_policy'];
    timeout_ms?: number;
  },
): Promise<ConfiguredMcpToolCallResult> {
  // ─── Stage 4: Tool Guardrail (方案 C 集成) ───
  // 使用 runGuardedToolCallSafe 包装 MCP 调用，自动运行 input/output guardrail。
  // tripwire 触发时不中断主链，返回 blocked 结果。
  const { runGuardedToolCallSafe } = await import('@/lib/guarded-tool-call');
  const guarded = await runGuardedToolCallSafe<{
    ok: boolean;
    msg?: string;
    result?: unknown;
    latency_ms?: number;
    execution_contract?: McpToolCallResult['execution_contract'];
    policy_blocked?: boolean;
    security_blocked?: boolean;
    blocking_reason?: string;
    raw_response_preview?: string;
    retry?: boolean;
  }>({
    toolName: tool.name,
    serverName: server.name,
    args: input,
    skipOutputCheck: false,
    execute: async () => {
      const discoveryInput: McpDiscoveryInput = {
        endpoint_url: server.endpoint_url,
        transport: server.transport,
        auth_type: server.auth_type,
        auth_config: { ...(server.auth_config || {}) },
      };
      return await callMcpTool(discoveryInput, tool.name, input, {
        execution_contract: options?.executionContract,
        tool_policy: options?.toolPolicy,
        timeout_ms: options?.timeout_ms ?? 30000,
      });
    },
  });

  // Input guardrail tripwire 触发 → 返回 blocked 结果，不实际调用工具
  if (guarded.blocked && guarded.blockedPhase === 'input') {
    return normalizeConfiguredMcpToolCallResult({
      ok: false,
      msg: `Tool blocked by input guardrail: ${guarded.inputCheck?.tripwire_reason || 'unknown'}`,
      serverName: server.name,
      toolName: tool.name,
      policy_blocked: true,
      blocking_reason: guarded.inputCheck?.tripwire_reason,
    });
  }

  // Output guardrail tripwire 触发 → 返回结果但附加 warning
  const result = guarded.result;
  const outputGuardrailWarning = guarded.blocked && guarded.blockedPhase === 'output'
    ? `Output guardrail tripwire: ${guarded.outputCheck?.tripwire_reason || 'unknown'}`
    : undefined;

  const blockingReason = typeof (result as { blocking_reason?: unknown }).blocking_reason === 'string'
    ? String((result as { blocking_reason?: unknown }).blocking_reason)
    : undefined;
  const normalizedRetry = typeof (result as { retry?: boolean }).retry === 'boolean'
    ? (result as { retry?: boolean }).retry
    : undefined;
  return normalizeConfiguredMcpToolCallResult({
    ok: result.ok,
    msg: outputGuardrailWarning ? `${result.msg || ''} [${outputGuardrailWarning}]`.trim() : result.msg,
    result: result.result,
    latency_ms: result.latency_ms,
    execution_contract: result.execution_contract,
    policy_blocked: result.policy_blocked,
    security_blocked: result.security_blocked,
    blocking_reason: blockingReason,
    serverName: server.name,
    toolName: tool.name,
    raw_response_preview: result.raw_response_preview,
    retry: normalizedRetry,
  });
}

async function buildKnowledgeFallbackStep(params: {
  message: string;
  reasons: string[];
  policy: ReportQueryProjectResolutionPolicy;
}): Promise<{ step: ExecuteReportQueryStepResult['tool_chain'][number]; fallback: ReportQueryPreflight['knowledge_fallback'] }> {
  const capability = capabilityByType(params.policy, 'knowledge_fallback');
  const query = [
    params.message,
    params.reasons.length ? `能力缺口：${params.reasons.join('、')}` : '',
    '请说明需要补齐哪些查询条件或能力配置。',
  ].filter(Boolean).join('\n');

  try {
    const config = await getModelServiceConfig();
    if (!hasConfiguredKnowledgeCredentials(config)) {
      const message = capability.missing_message || '知识库暂未配置，无法进一步检索能力缺口说明。';
      return {
        step: {
          key: 'knowledge_fallback',
          tool_name: 'knowledge.search',
          server_name: 'Dataki 知识库',
          status: 'skipped',
          required: false,
          input: { query },
          message,
        },
        fallback: { status: 'skipped', message },
      };
    }

    const endpoint = getKnowledgeSearchEndpoint(config);
    const configuredKnowledgeBaseId = getKnowledgeBaseId(config);
    if (!endpoint) {
      const message = '知识库地址未配置，无法检索能力缺口说明。';
      return {
        step: { key: 'knowledge_fallback', tool_name: 'knowledge.search', server_name: 'Dataki 知识库', status: 'skipped', required: false, input: { query }, message },
        fallback: { status: 'skipped', message },
      };
    }

    const knowledgeBaseIds = await resolveKnowledgeBaseIds(config);
    if (!knowledgeBaseIds.length) {
      const message = '当前没有可访问的知识库，已跳过知识库兜底说明。';
      return {
        step: { key: 'knowledge_fallback', tool_name: 'knowledge.search', server_name: 'Dataki 知识库', status: 'skipped', required: false, input: { query }, message },
        fallback: { status: 'skipped', message },
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': getKnowledgeBaseApiKey(config),
        },
        body: JSON.stringify({
          query,
          top_k: 3,
          knowledge_base_ids: knowledgeBaseIds,
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      const sourceCount = Array.isArray((data as Record<string, unknown>).data)
        ? ((data as Record<string, unknown>).data as unknown[]).length
        : Array.isArray((data as Record<string, unknown>).items)
          ? ((data as Record<string, unknown>).items as unknown[]).length
          : 0;
      if (!response.ok) {
        const message = `知识库检索失败：HTTP ${response.status}`;
        return {
          step: { key: 'knowledge_fallback', tool_name: 'knowledge.search', server_name: 'Dataki 知识库', status: 'failed', required: false, input: { query }, result: { status: response.status }, message },
          fallback: { status: 'failed', message },
        };
      }
      const baseMessage = sourceCount > 0
        ? (configuredKnowledgeBaseId
          ? `已检索知识库 ID ${knowledgeBaseIds[0]}，找到 ${sourceCount} 条可参考说明。`
          : `已自动检索 ${knowledgeBaseIds.length} 个可访问知识库，找到 ${sourceCount} 条可参考说明。`)
        : (configuredKnowledgeBaseId
          ? `已检索知识库 ID ${knowledgeBaseIds[0]}，但没有找到直接相关说明；本次仍以工具状态为准。`
          : `已自动检索 ${knowledgeBaseIds.length} 个可访问知识库，但没有找到直接相关说明；本次仍以工具状态为准。`);
      const enhanced = sourceCount > 0
        ? await runModelUseCase({
          useCase: 'knowledge_answer',
          fallbackText: baseMessage,
          modelServiceConfig: config,
          input: {
            query,
            sourceCount,
            knowledgeBaseCount: knowledgeBaseIds.length,
            configuredKnowledgeBaseId: Boolean(configuredKnowledgeBaseId),
            reasons: params.reasons,
            baseAnswer: baseMessage,
          },
          consume: {
            enabled: true,
            consumedBy: 'knowledge_fallback_composer',
            textField: 'answerMarkdown',
            consumedFields: ['answerMarkdown'],
          },
          traceMeta: { module: 'report-query-orchestrator' },
        })
        : undefined;
      const message = enhanced?.text || baseMessage;
      return {
        step: {
          key: 'knowledge_fallback',
          tool_name: 'knowledge.search',
          server_name: 'Dataki 知识库',
          status: sourceCount > 0 ? 'success' : 'skipped',
          required: false,
          input: { query },
          result: { source_count: sourceCount, evidence_mode: sourceCount > 0 ? 'knowledge_grounded' : 'insufficient_evidence' },
          message,
        },
        fallback: { status: sourceCount > 0 ? 'success' : 'no_reference_found', message, source_count: sourceCount },
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const message = error instanceof Error && error.message.includes('abort')
      ? '知识库检索超时，已先返回当前能力缺口。'
      : `知识库检索失败：${error instanceof Error ? error.message : String(error)}`;
    return {
      step: { key: 'knowledge_fallback', tool_name: 'knowledge.search', server_name: 'Dataki 知识库', status: 'failed', required: false, input: { query }, message },
      fallback: { status: 'failed', message },
    };
  }
}

function normalizeRows(payload: unknown): Array<Record<string, unknown>> {
  if (typeof payload === 'string') {
    try {
      return normalizeRows(JSON.parse(payload));
    } catch {
      return [];
    }
  }
  if (Array.isArray(payload)) {
    const parsedContentRows = payload.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const text = (item as Record<string, unknown>).text;
      if (typeof text !== 'string') return [];
      try {
        return normalizeRows(JSON.parse(text));
      } catch {
        return [];
      }
    });
    if (parsedContentRows.length) return parsedContentRows;
    const objectRows = payload.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>>;
    const looksLikeMcpContent = objectRows.length > 0 && objectRows.every((item) => 'type' in item && 'text' in item);
    return looksLikeMcpContent ? [] : objectRows;
  }
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.content)) {
    for (const item of record.content) {
      if (!item || typeof item !== 'object') continue;
      const text = (item as Record<string, unknown>).text;
      if (typeof text !== 'string') continue;
      try {
        const parsed = JSON.parse(text);
        const nested = normalizeRows(parsed);
        if (nested.length) return nested;
      } catch {
        // Ignore non-JSON text chunks.
      }
    }
  }
  for (const key of ['tableContent', 'rows', 'records', 'list', 'items', 'data', 'result']) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>>;
    if (value && typeof value === 'object') {
      const nested = normalizeRows(value);
      if (nested.length) return nested;
    }
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const nested = normalizeRows(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function summarizeRawPreview(payload: unknown): unknown {
  const rows = normalizeRows(payload);
  if (rows.length) return { row_count: rows.length, preview_rows: rows.slice(0, 3) };
  if (!payload || typeof payload !== 'object') return payload;
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.content)) {
    return {
      content: record.content.slice(0, 1).map((item) => {
        if (!item || typeof item !== 'object') return item;
        const next = item as Record<string, unknown>;
        const text = typeof next.text === 'string' ? next.text.slice(0, 1000) : next.text;
        return { ...next, text };
      }),
      isError: record.isError,
    };
  }
  return Object.fromEntries(Object.entries(record).slice(0, 20));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

interface ReportColumnMeta {
  key: string;
  displayName: string;
  unit?: string;
}

const DETAIL_DIMENSION_ALIASES: Record<string, string[]> = {
  date: ['dt', 'date', 'stat_date', 'day'],
  media: ['media_id', 'media', 'media_name'],
};

const DETAIL_METRIC_ALIASES: Record<string, string[]> = {
  cost: ['cost_amount', 'cash_cost_amount', 'rebate_cost_amount', 'rebate_cash_cost_amount', 'cost', 'spend', 'stat_cost', 'cash_cost', 'total_cost'],
  spend: ['cost_amount', 'cash_cost_amount', 'spend', 'cost', 'stat_cost', 'total_cost'],
  amount: ['amount', 'cost_amount', 'cash_cost_amount', 'total_amount'],
  cash_cost: ['cash_cost_amount', 'cost_amount'],
  rebate_cost: ['rebate_cost_amount', 'rebate_cash_cost_amount', 'cost_amount'],
  active: ['active', 'activation', 'active_count', 'activation_count'],
  activation: ['activation', 'active', 'activation_count', 'active_count'],
  register: ['register', 'register_count'],
  revenue: ['revenue', 'income', 'pay_amount'],
  income: ['income', 'revenue', 'pay_amount'],
  roi: ['roi', 'roas'],
  roas: ['roas', 'roi'],
};

const DETAIL_FIELD_DISPLAY_NAMES: Record<string, string> = {
  dt: '日期',
  date: '日期',
  stat_date: '日期',
  day: '日期',
  media_id: '媒体',
  media: '媒体',
  media_name: '媒体',
  cost_amount: '消耗',
  cash_cost_amount: '现金消耗',
  rebate_cost_amount: '折后消耗',
  rebate_cash_cost_amount: '现金折后消耗',
  active: '激活',
  activation: '激活',
  active_count: '激活',
  activation_count: '激活',
  register: '注册',
  register_count: '注册',
  pay_amount: '收入',
  revenue: '收入',
  income: '收入',
  roi: 'ROI',
  roas: 'ROI',
};

const DETAIL_REQUEST_DISPLAY_ALIASES: Record<string, string[]> = {
  date: ['日期'],
  media: ['媒体'],
  cost: ['消耗'],
  spend: ['消耗'],
  cash_cost: ['现金消耗'],
  rebate_cost: ['折后消耗'],
  active: ['激活'],
  activation: ['激活'],
  register: ['注册'],
  revenue: ['收入'],
  income: ['收入'],
  roi: ['ROI'],
  roas: ['ROI'],
};

function parseJsonPayload(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function readStringField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function collectColumnConfigEntries(value: unknown, output: Map<string, ReportColumnMeta>, seen = new WeakSet<object>()): void {
  const parsed = parseJsonPayload(value);
  if (!parsed || typeof parsed !== 'object') return;
  if (seen.has(parsed)) return;
  seen.add(parsed);

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (isPlainRecord(item) && item.type === 'text' && typeof item.text === 'string') {
        collectColumnConfigEntries(item.text, output, seen);
      } else {
        collectColumnConfigEntries(item, output, seen);
      }
    }
    return;
  }

  const record = parsed as Record<string, unknown>;
  const config = record.columnConfig ?? record.column_config ?? record.columnsConfig ?? record.columnMeta ?? record.columns;
  if (Array.isArray(config)) {
    for (const item of config) {
      if (!isPlainRecord(item)) continue;
      const key = readStringField(item, ['key', 'field', 'dataIndex', 'name', 'columnKey', 'column']);
      const displayName = readStringField(item, ['columnName', 'displayName', 'title', 'label', 'nameCn', 'name']) || key;
      if (key && displayName) {
        output.set(key, { key, displayName, unit: readStringField(item, ['unit', 'unitName']) });
      }
    }
  } else if (isPlainRecord(config)) {
    for (const [key, rawMeta] of Object.entries(config)) {
      if (isPlainRecord(rawMeta)) {
        const displayName = readStringField(rawMeta, ['columnName', 'displayName', 'title', 'label', 'nameCn', 'name']) || key;
        output.set(key, { key, displayName, unit: readStringField(rawMeta, ['unit', 'unitName']) });
      } else if (typeof rawMeta === 'string' && rawMeta.trim()) {
        output.set(key, { key, displayName: rawMeta.trim() });
      }
    }
  }

  for (const child of Object.values(record)) {
    if (child && typeof child === 'object') collectColumnConfigEntries(child, output, seen);
    if (isPlainRecord(child) && child.type === 'text' && typeof child.text === 'string') collectColumnConfigEntries(child.text, output, seen);
  }
}

function extractColumnConfig(payload: unknown): Map<string, ReportColumnMeta> {
  const output = new Map<string, ReportColumnMeta>();
  collectColumnConfigEntries(payload, output);
  return output;
}

function normalizeFieldToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
}

function availableRowKeys(rows: Array<Record<string, unknown>>): string[] {
  return Array.from(new Set(rows.flatMap(row => Object.keys(row))));
}

function hasUsefulValue(rows: Array<Record<string, unknown>>, key: string): boolean {
  return rows.some(row => Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null && row[key] !== '');
}

function inferDisplayName(key: string, role: ReportDisplayField['role'], requestedKey?: string): string {
  const normalizedKey = normalizeFieldToken(key);
  const directName = DETAIL_FIELD_DISPLAY_NAMES[normalizedKey] || DETAIL_FIELD_DISPLAY_NAMES[key];
  if (directName) return directName;
  const normalized = normalizeFieldToken(requestedKey || key);
  if (normalized === 'date' || ['dt', 'statdate', 'day'].includes(normalizeFieldToken(key))) return '日期';
  if (normalized === 'media' || ['mediaid', 'medianame'].includes(normalizeFieldToken(key))) return '媒体';
  if (normalized === 'cost' || /cost|spend|amount|fee|expense|消耗|花费/.test(normalizeFieldToken(key))) return '消耗';
  return requestedKey || (role === 'metric' ? key : key);
}

function formatterForField(key: string, displayName: string, requestedKey?: string): ReportDisplayField['formatter'] {
  const token = normalizeFieldToken(`${requestedKey || ''} ${key} ${displayName}`);
  if (/roi|rate|percent|pct|率/.test(token)) return 'percent-2';
  if (/cost|spend|amount|fee|expense|price|pay|cash|消耗|金额|花费|费用|收入/.test(token)) return 'currency-2';
  return 'number-2';
}

function selectBestField(params: {
  requestedKey: string;
  role: ReportDisplayField['role'];
  rows: Array<Record<string, unknown>>;
  columnMeta: Map<string, ReportColumnMeta>;
}): ReportDisplayField | null {
  const requestedToken = normalizeFieldToken(params.requestedKey);
  const aliases = params.role === 'dimension'
    ? DETAIL_DIMENSION_ALIASES[requestedToken] || [params.requestedKey]
    : DETAIL_METRIC_ALIASES[requestedToken] || [params.requestedKey];
  const aliasTokens = aliases.map(normalizeFieldToken);
  const displayAliasTokens = (DETAIL_REQUEST_DISPLAY_ALIASES[requestedToken] || []).map(normalizeFieldToken);
  const keys = availableRowKeys(params.rows).filter(key => hasUsefulValue(params.rows, key));
  if (!keys.length) return null;

  const ranked = keys
    .map((key) => {
      const meta = params.columnMeta.get(key);
      const keyToken = normalizeFieldToken(key);
      const displayToken = normalizeFieldToken(meta?.displayName || '');
      let score = 0;
      if (params.role === 'metric' && requestedToken === 'cost' && meta?.displayName === '消耗') score += 1000;
      if (params.role === 'metric' && requestedToken === 'cost' && keyToken === 'costamount') score += 900;
      const aliasIndex = aliasTokens.indexOf(keyToken);
      if (aliasIndex >= 0) score += 800 - aliasIndex;
      const displayAliasIndex = displayAliasTokens.indexOf(displayToken);
      if (displayAliasIndex >= 0) score += 760 - displayAliasIndex;
      if (displayAliasTokens.some(token => displayToken.includes(token))) score += 650;
      if (displayToken && displayToken === requestedToken) score += 700;
      if (displayToken && displayToken.includes(requestedToken)) score += 600;
      if (keyToken === requestedToken) score += 500;
      if (keyToken.includes(requestedToken)) score += 400;
      if (params.role === 'metric' && requestedToken === 'cost' && /消耗/.test(meta?.displayName || '')) score += 350;
      if (params.role === 'dimension' && requestedToken === 'date' && /^dt$|date|statdate|day/.test(keyToken)) score += 300;
      if (params.role === 'dimension' && requestedToken === 'media' && /^mediaid$|media|medianame/.test(keyToken)) score += 300;
      return { key, meta, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return null;
  const displayName = best.meta?.displayName || inferDisplayName(best.key, params.role, params.requestedKey);
  return {
    key: best.key,
    displayName,
    role: params.role,
    requestedKey: params.requestedKey,
    formatter: params.role === 'metric' ? formatterForField(best.key, displayName, params.requestedKey) : 'text',
    unit: best.meta?.unit || (formatterForField(best.key, displayName, params.requestedKey) === 'currency-2' ? '元' : undefined),
  };
}

function buildReportDisplayFields(params: {
  rows: Array<Record<string, unknown>>;
  metrics: string[];
  dimensions: string[];
  columnMeta: Map<string, ReportColumnMeta>;
}): ReportDisplayField[] {
  const fields: ReportDisplayField[] = [];
  const seen = new Set<string>();
  const push = (field: ReportDisplayField | null) => {
    if (!field || seen.has(field.key)) return;
    seen.add(field.key);
    fields.push(field);
  };

  for (const dimension of params.dimensions) {
    push(selectBestField({ requestedKey: dimension, role: 'dimension', rows: params.rows, columnMeta: params.columnMeta }));
  }
  for (const preferredDimension of ['date', 'media']) {
    if (!fields.some(item => item.role === 'dimension' && normalizeFieldToken(item.requestedKey || '') === preferredDimension)) {
      push(selectBestField({ requestedKey: preferredDimension, role: 'dimension', rows: params.rows, columnMeta: params.columnMeta }));
    }
  }
  for (const metric of params.metrics) {
    push(selectBestField({ requestedKey: metric, role: 'metric', rows: params.rows, columnMeta: params.columnMeta }));
  }
  if (!fields.some(item => item.role === 'metric')) {
    push(selectBestField({ requestedKey: 'cost', role: 'metric', rows: params.rows, columnMeta: params.columnMeta }));
  }

  return fields;
}

function toDisplayText(value: unknown, field: ReportDisplayField): string {
  if (value === undefined || value === null || value === '') return '--';
  if (field.formatter === 'currency-2') {
    const numberValue = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    if (Number.isFinite(numberValue)) {
      return `${numberValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${field.unit ? ` ${field.unit}` : ''}`;
    }
  }
  if (field.formatter === 'percent-2') {
    const numberValue = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    if (Number.isFinite(numberValue)) return `${(numberValue * (Math.abs(numberValue) <= 1 ? 100 : 1)).toFixed(2)}%`;
  }
  return String(value);
}

function parseReportMetricNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/,/g, '')
    .replace(/[%％]$/, '')
    .replace(/^[￥¥$楼元\s]+/, '')
    .replace(/[元楼\s]+$/, '');
  if (!normalized || !Number.isFinite(Number(normalized))) return null;
  return Number(normalized);
}

function buildDetailAnswerMarkdown(params: {
  rows: Array<Record<string, unknown>>;
  displayFields: ReportDisplayField[];
  fallbackMessage: string;
}): string | undefined {
  const metricFields = params.displayFields.filter(field => field.role === 'metric');
  if (!params.rows.length || metricFields.length === 0) return undefined;
  const dimensionFields = params.displayFields.filter(field => field.role === 'dimension');
  if (params.rows.length === 1) {
    const row = params.rows[0];
    const prefix = dimensionFields
      .map(field => toDisplayText(row[field.key], field))
      .filter(text => text && text !== '--')
      .join('，');
    const metricsText = metricFields
      .map(field => `${field.displayName}为 ${toDisplayText(row[field.key], field)}`)
      .join('，');
    const separator = prefix && dimensionFields.length === 1 ? '，' : '';
    return `${prefix ? `${prefix}${separator}` : ''}${metricsText}。`;
  }

  const fields = [...dimensionFields, ...metricFields].slice(0, 8);
  const header = `| ${fields.map(field => field.displayName).join(' | ')} |`;
  const align = `| ${fields.map(field => field.role === 'metric' ? '---:' : '---').join(' | ')} |`;
  const rows = params.rows.slice(0, 10).map(row => `| ${fields.map(field => toDisplayText(row[field.key], field).replace(/\|/g, '\\|')).join(' | ')} |`);
  const note = params.rows.length > 10 ? '\n\n仅展示前 10 行，完整数据可打开明细或导出。' : '';
  return [header, align, ...rows].join('\n') + note;
}

function buildReportDetailSemanticResult(params: {
  result: ReportQueryResult;
  displayFields: ReportDisplayField[];
}): SemanticResultContract<ReportTrendData> | null {
  if (params.result.requested_view !== 'detail' || params.result.status !== 'success' || !params.result.rows.length || !params.displayFields.length) return null;
  const fields = params.displayFields;
  const dataset = params.result.rows.map(row => Object.fromEntries(fields.map(field => [field.key, row[field.key]])));
  const now = new Date().toISOString();
  return {
    contractType: 'semantic-result',
    version: '1.0.0',
    resultId: `report-detail-${Date.now()}`,
    screenType: 'report-result',
    title: '明细结果',
    createdAt: now,
    producer: { kind: 'backend', name: 'report-query-service', version: '1.0.0' },
    regions: [{
      id: 'detail-data-view',
      type: 'data-view',
      componentBinding: 'data-visualization',
      title: '明细结果',
      state: 'ready',
      data: {
        viewType: 'table',
        requestedView: 'table',
        chartType: 'table',
        columns: fields.map(field => field.key),
        columnLabels: Object.fromEntries(fields.map(field => [field.key, field.displayName])),
        displayFields: fields,
        dataset,
        metricName: fields.find(field => field.role === 'metric')?.key,
        dimensions: fields.filter(field => field.role === 'dimension').map(field => field.key),
      } as unknown as ReportTrendData,
      evidenceRefs: [`ev-${params.result.tool_name}-${params.result.server_name}`],
      sourceRefs: [`src-${params.result.tool_name}-${params.result.server_name}`],
      layoutHints: {
        placement: 'main',
        width: 'full',
        scrollMode: 'normal',
        preferredVariant: 'table',
      },
    }],
    evidenceRefs: [{
      id: `ev-${params.result.tool_name}-${params.result.server_name}`,
      type: 'query-result',
      title: '报表查询结果',
      summary: '报表查询结果已生成',
    }],
    sourceRefs: [{
      id: `src-${params.result.tool_name}-${params.result.server_name}`,
      type: 'report',
      title: `${params.result.server_name}.${params.result.tool_name}`,
      description: params.result.message,
      retrievedAt: now,
    }],
    metadata: {
      useCase: 'report-detail',
      requestedView: 'detail',
    },
  };
}

async function resolveDictionaryValues(params: {
  servers: McpServerConfig[];
  policy: ReportQueryProjectResolutionPolicy;
  appId: string;
  capabilityType: ReportQueryCapabilityType;
  entityType: EntityType;
  stepKey: string;
  keys: string[];
  aliases: Record<string, string[]>;
  idKeys: string[];
  nameKeys: string[];
  label: string;
  message?: string;
  preferredCandidateIds?: string[];
  preferredCandidateNames?: string[];
}): Promise<{
  ids: string[];
  step: ExecuteReportQueryStepResult['tool_chain'][number];
  missingField?: string;
  missingCapability?: string;
  risk?: string;
  resolution: EntityResolution;
  trace: EntityResolutionTraceStep[];
  expectation: CapabilityExpectation;
  rejectedTools: RejectedCapabilityTool[];
}> {
  const capabilitySelection = selectNormalizationCapabilities(params.servers, params.entityType, params.message || '');
  const { expectation, candidates, rejectedTools } = capabilitySelection;
  const rejectedMismatchReason = rejectedTools.flatMap(item => item.mismatchReason);
  if (!candidates.length) {
    const missingMessage = `${params.label}归一化能力不可用，无法将自然语言转换为标准 ${identifierKeyForEntityType(params.entityType)}。`;
    const resolution: EntityResolution = {
      entityType: params.entityType,
      rawText: params.keys.join('、'),
      confidence: 0,
      status: 'capability_unavailable',
      identifierKey: identifierKeyForEntityType(params.entityType),
      normalizationCapabilityId: params.capabilityType,
    };
    return {
      ids: [],
      missingCapability: `${params.label}归一化能力`,
      risk: missingMessage,
      resolution,
      expectation,
      rejectedTools,
      trace: [{
        entityType: params.entityType,
        stage: 'capability_selection',
        status: 'capability_unavailable',
        detail: missingMessage,
        metadata: {
          expectation,
          expectedCapabilityKind: expectation.expectedCapabilityKind,
          selectedCapabilityKind: undefined,
          selectedTool: undefined,
          rejectedTools,
          mismatchReason: rejectedMismatchReason,
          fallbackDecision: 'stop_capability_unavailable',
        },
      }],
      step: {
        key: params.stepKey,
        tool_name: '',
        server_name: '',
        status: 'skipped',
        required: true,
        message: missingMessage,
        result: {
          resolution,
          status: 'capability_unavailable',
          expectation,
          expectedCapabilityKind: expectation.expectedCapabilityKind,
          selectedCapabilityKind: undefined,
          selectedTool: undefined,
          rejectedTools,
          mismatchReason: rejectedMismatchReason,
          fallbackDecision: 'stop_capability_unavailable',
        },
      },
    };
  }

  const aliases = params.keys.flatMap((key) => params.aliases[key] || [key]);
  type AttemptResult = {
    ids: string[];
    step: ExecuteReportQueryStepResult['tool_chain'][number];
    missingField?: string;
    missingCapability?: string;
    risk?: string;
    resolution: EntityResolution;
    trace: EntityResolutionTraceStep[];
    statusRank: number;
  };
  const attempts: Array<{
    tool_name: string;
    server_name: string;
    status: 'success' | 'failed';
    message: string;
    resolution: EntityResolution;
  }> = [];
  let bestAttempt: AttemptResult | undefined;
  const resolutionRank: Record<EntityResolution['status'], number> = {
    resolved: 5,
    needs_user_selection: 4,
    needs_enrichment: 4,
    output_invalid: 3,
    not_found: 2,
    capability_unavailable: 1,
  };

  for (const candidate of candidates) {
    const input = { appId: params.appId };
    const result = await callConfiguredMcpTool(candidate.server, candidate.tool, input);
    const adapterResult = adaptDictionaryToolOutput({
      raw: result.business_payload ?? result.response,
      capability: candidate.capability,
      expectation,
      idKeys: params.idKeys,
      nameKeys: params.nameKeys,
      toolName: candidate.tool.name,
    });
    const selectedTool = {
      capability_id: candidate.capability.capability_id,
      tool_name: candidate.tool.name,
      server_name: candidate.server.name,
    };
    const resolutionResult = adapterResult.business_status === 'failed'
      ? {
        resolution: {
          entityType: params.entityType,
          rawText: params.keys.join('、'),
          confidence: 0,
          status: 'output_invalid' as const,
          identifierKey: identifierKeyForEntityType(params.entityType),
          normalizationCapabilityId: candidate.capability.capability_id,
          normalizationToolName: candidate.tool.name,
        },
        candidateIds: [] as string[],
        trace: [{
          entityType: params.entityType,
          stage: 'normalization' as const,
          status: 'output_invalid' as const,
          detail: `Dictionary tool returned business failure: ${adapterResult.business_error || adapterResult.business_code || 'unknown error'}`,
          capabilityId: candidate.capability.capability_id,
          toolName: candidate.tool.name,
        }],
        risk: adapterResult.business_error || `Business code ${String(adapterResult.business_code || '')}`.trim(),
      }
      : resolveDictionaryEntity({
      entityType: params.entityType,
      rawText: params.keys.join('、'),
      label: params.label,
      identifierKey: identifierKeyForEntityType(params.entityType),
      aliases,
      rows: adapterResult.rows,
      candidates: adapterResult.candidates,
      idKeys: params.idKeys,
      nameKeys: params.nameKeys,
      capabilityAvailable: true,
      capabilityId: candidate.capability.capability_id,
      toolName: candidate.tool.name,
      preferredCandidateIds: params.preferredCandidateIds,
      preferredCandidateNames: params.preferredCandidateNames,
    });
    const fallbackDecision = resolutionResult.resolution.status === 'needs_user_selection'
      ? 'continue_with_user_selection'
      : 'call_selected_tool';
    const traceWithMetadata: EntityResolutionTraceStep[] = resolutionResult.trace.map(traceStep => ({
      ...traceStep,
      metadata: {
        ...(traceStep.metadata || {}),
        expectation,
        expectedCapabilityKind: expectation.expectedCapabilityKind,
        selectedCapabilityKind: candidate.capability.capability_kind,
        selectedTool,
        rejectedTools,
        mismatchReason: rejectedMismatchReason,
        fallbackDecision,
      },
    }));
    const step = {
      key: params.stepKey,
      tool_name: candidate.tool.name,
      server_name: candidate.server.name,
      status: result.status === 'success' && adapterResult.business_status !== 'failed' ? 'success' : 'failed',
      required: true,
      input,
      result: {
        matched_ids: resolutionResult.candidateIds,
        row_count: adapterResult.row_count,
        adapter: {
          candidate_count: adapterResult.candidates.length,
          warnings: adapterResult.warnings,
          business_status: adapterResult.business_status,
          business_code: adapterResult.business_code,
          business_error: adapterResult.business_error,
        },
        raw_result_preview: adapterResult.raw_result_preview,
        message: result.message,
        resolution: resolutionResult.resolution,
        trace: traceWithMetadata,
        expectation,
        expectedCapabilityKind: expectation.expectedCapabilityKind,
        selectedCapabilityKind: candidate.capability.capability_kind,
        selectedTool,
        rejectedTools,
        mismatchReason: rejectedMismatchReason,
        fallbackDecision,
      },
      message: adapterResult.business_status === 'failed'
        ? `dictionary business failed: ${adapterResult.business_error || adapterResult.business_code || params.label}`
        : resolutionResult.resolution.status === 'resolved'
        ? `dictionary matched: ${params.label} ${resolutionResult.candidateIds.join(',')}`
        : resolutionResult.resolution.status === 'needs_user_selection'
          ? `dictionary needs selection: ${params.label} ${params.keys.join(',')}`
          : resolutionResult.resolution.status === 'needs_enrichment'
            ? `dictionary needs enrichment: ${params.label} ${params.keys.join(',')}`
          : resolutionResult.resolution.status === 'output_invalid'
            ? `dictionary invalid output: ${params.label} ${params.keys.join(',')}`
            : `dictionary unmatched: ${params.label} ${params.keys.join(',')}`,
    } satisfies ExecuteReportQueryStepResult['tool_chain'][number];

    const attempt: AttemptResult = {
      ids: resolutionResult.candidateIds,
      step,
      missingField: resolutionResult.missingField,
      missingCapability: resolutionResult.missingCapability,
      risk: resolutionResult.risk,
      resolution: resolutionResult.resolution,
      trace: traceWithMetadata,
      statusRank: resolutionRank[resolutionResult.resolution.status],
    };
    attempts.push({
      tool_name: candidate.tool.name,
      server_name: candidate.server.name,
      status: result.status === 'success' && adapterResult.business_status !== 'failed' ? 'success' : 'failed',
      message: adapterResult.business_error || result.message || resolutionResult.resolution.status,
      resolution: resolutionResult.resolution,
    });
    if (!bestAttempt || attempt.statusRank > bestAttempt.statusRank) {
      bestAttempt = attempt;
    }
    if (resolutionResult.resolution.status === 'resolved') {
      const stepResult = step.result && typeof step.result === 'object' && !Array.isArray(step.result)
        ? step.result as Record<string, unknown>
        : {};
      return {
        ids: resolutionResult.candidateIds,
        missingField: resolutionResult.missingField,
        risk: resolutionResult.risk,
        resolution: resolutionResult.resolution,
        trace: traceWithMetadata,
        step: {
          ...step,
          result: { ...stepResult, attempts },
        },
        expectation,
        rejectedTools,
      };
    }
  }

  if (bestAttempt) {
    const stepResult = bestAttempt.step.result && typeof bestAttempt.step.result === 'object' && !Array.isArray(bestAttempt.step.result)
      ? bestAttempt.step.result as Record<string, unknown>
      : {};
    return {
      ids: bestAttempt.ids,
      missingField: bestAttempt.missingField,
      risk: bestAttempt.risk,
      resolution: bestAttempt.resolution,
      trace: bestAttempt.trace,
      step: {
        ...bestAttempt.step,
        result: { ...stepResult, attempts },
      },
      expectation,
      rejectedTools,
    };
  }

  const missingMessage = `${params.label}归一化能力不可用，无法将自然语言转换为标准 ${identifierKeyForEntityType(params.entityType)}。`;
  const resolution: EntityResolution = {
    entityType: params.entityType,
    rawText: params.keys.join('、'),
    confidence: 0,
    status: 'capability_unavailable',
    identifierKey: identifierKeyForEntityType(params.entityType),
    normalizationCapabilityId: params.capabilityType,
  };
  return {
    ids: [],
    missingCapability: `${params.label}归一化能力`,
    risk: missingMessage,
    resolution,
    expectation,
    rejectedTools,
    trace: [{
      entityType: params.entityType,
      stage: 'capability_selection',
      status: 'capability_unavailable',
      detail: missingMessage,
      metadata: {
        expectation,
        expectedCapabilityKind: expectation.expectedCapabilityKind,
        selectedCapabilityKind: undefined,
        selectedTool: undefined,
        rejectedTools,
        mismatchReason: rejectedMismatchReason,
        fallbackDecision: 'stop_capability_unavailable',
      },
    }],
    step: {
      key: params.stepKey,
      tool_name: '',
      server_name: '',
      status: 'skipped',
      required: true,
      message: missingMessage,
      result: {
        resolution,
        status: 'capability_unavailable',
        attempts,
        expectation,
        expectedCapabilityKind: expectation.expectedCapabilityKind,
        selectedCapabilityKind: undefined,
        selectedTool: undefined,
        rejectedTools,
        mismatchReason: rejectedMismatchReason,
        fallbackDecision: 'stop_capability_unavailable',
      },
    },
  };
}

type DictionaryResolutionPlan = {
  capability: ReportQueryCapabilityConfig;
  keys: string[];
  aliases: Record<string, string[]>;
  entityType: EntityType;
  identifierKey: IdentifierKey;
  stepKey: string;
  label: string;
  idKeys: string[];
  nameKeys: string[];
  summaryKey?: string;
  sourceKey: string;
  targetKeys: string[];
  valueFormat?: 'array' | 'string' | 'csv';
  usedLegacySlotMapping?: boolean;
};

function semanticAliasRecord(
  policy: ReportQueryProjectResolutionPolicy,
  semanticAliases: ReturnType<typeof mergedEntityAliasMaps>,
  recordName?: string,
): Record<string, string[]> {
  if (!recordName) return {};
  const configRecord = (semanticAliases as unknown as Record<string, unknown>)[recordName];
  const policyRecord = (policy.semantic_defaults as unknown as Record<string, unknown>)[recordName];
  return {
    ...(policyRecord && typeof policyRecord === 'object' && !Array.isArray(policyRecord) ? policyRecord as Record<string, string[]> : {}),
    ...(configRecord && typeof configRecord === 'object' && !Array.isArray(configRecord) ? configRecord as Record<string, string[]> : {}),
  };
}

function schemaTextForProperty(properties: Record<string, unknown>, key: string): string {
  const schema = properties[key];
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return key;
  const record = schema as Record<string, unknown>;
  return [key, record.title, record.description].map(value => String(value || '')).join(' ');
}

function inferTargetKeysFromReportTool(tool: McpToolConfig | undefined, capability: ReportQueryCapabilityConfig): string[] {
  if (!tool) return [];
  const terms = [
    capability.identifier_key,
    capability.entity_type,
    capability.summary_key,
    capability.source_key,
    ...capability.tool_keywords,
  ].map(value => String(value || '').toLowerCase()).filter(Boolean);
  if (!terms.length) return [];
  const properties = schemaProperties(tool);
  return Object.keys(properties).filter((key) => {
    const text = schemaTextForProperty(properties, key).toLowerCase();
    return terms.some(term => text.includes(term));
  });
}

function legacySummaryKeyForCapability(type: ReportQueryCapabilityType): string | undefined {
  const mapping: Record<string, string> = {
    media_dictionary: 'mediaId',
    terminal_dictionary: 'osTypes',
    team_dictionary: 'teamIds',
    app_package_type_dictionary: 'appPackageType',
    account_dictionary: 'accountId',
    package_dictionary: 'pkgId',
    optimizer_dictionary: 'optimizerIds',
  };
  return mapping[type];
}

function legacyEntityTypeForCapability(type: ReportQueryCapabilityType): EntityType | undefined {
  const mapping: Record<string, EntityType> = {
    media_dictionary: 'media',
    terminal_dictionary: 'terminal_os',
    team_dictionary: 'team',
    app_package_type_dictionary: 'app_package_type',
    account_dictionary: 'account',
    package_dictionary: 'package',
    optimizer_dictionary: 'account',
  };
  return mapping[type];
}

function buildDictionaryPlans(params: {
  message: string;
  policy: ReportQueryProjectResolutionPolicy;
  semanticAliases: ReturnType<typeof mergedEntityAliasMaps>;
  reportTool?: McpToolConfig;
  baseInput?: Record<string, unknown>;
  preferredEntitySelections?: EntitySelectionPreference;
}): DictionaryResolutionPlan[] {
  const selectedEntities = readSelectedEntityCandidates(params.baseInput);
  return params.policy.capabilities.flatMap((capability) => {
    const entityType = capability.entity_type || legacyEntityTypeForCapability(capability.capability_type);
    const identifierKey = capability.identifier_key || expectedIdentifierKeyForType(capability.capability_type);
    if (!entityType || !identifierKey) return [];
    const slotMapping = capability.slot_mappings?.find(mapping => mapping.entity_type === entityType && mapping.identifier_key === identifierKey);
    const aliases = semanticAliasRecord(params.policy, params.semanticAliases, capability.alias_record);
    const aliasKeys = extractAliasKeys(params.message, aliases);
    const genericAliasKeys = new Set([entityType, identifierKey, capability.capability_type]);
    const concreteAliasKeys = aliasKeys.filter(key => !genericAliasKeys.has(key));
    const inferredTargetKeys = inferTargetKeysFromReportTool(params.reportTool, capability);
    const selectedEntity = selectedEntities.find(item => item.entityType === entityType);
    const preferredEntity = params.preferredEntitySelections?.[entityType];
    const shouldTryDictionary = concreteAliasKeys.length > 0
      || Boolean(selectedEntity)
      || Boolean(preferredEntity);
    if (!shouldTryDictionary) return [];
    const targetKeys = Array.from(new Set([...(slotMapping?.target_keys || capability.target_keys || []), ...inferredTargetKeys]));
    return [{
      capability,
      keys: concreteAliasKeys.length
        ? concreteAliasKeys
        : selectedEntity?.name
          ? [selectedEntity.name]
          : preferredEntity?.candidateName
            ? [preferredEntity.candidateName]
            : [params.message],
      aliases,
      entityType,
      identifierKey,
      stepKey: capability.step_key || capability.capability_type,
      label: capability.label || capability.description || capability.capability_type,
      idKeys: capability.id_keys?.length ? capability.id_keys : [identifierKey, 'id', 'value', 'code'],
      nameKeys: capability.name_keys?.length ? capability.name_keys : ['name', 'label', 'text'],
      summaryKey: slotMapping?.summary_key || capability.summary_key || legacySummaryKeyForCapability(capability.capability_type),
      sourceKey: capability.source_key || capability.summary_key || capability.capability_type,
      targetKeys,
      valueFormat: slotMapping?.value_format || capability.value_format,
      usedLegacySlotMapping: !slotMapping,
    }];
  });
}

function setResolvedFilterValue(output: ResolvedFilters, key: string | undefined, ids: string[]): void {
  if (!key || !ids.length) return;
  if (key === 'mediaId') output.mediaId = ids;
  else if (key === 'osTypes' || key === 'osType' || key === 'terminalOs') {
    output.osTypes = ids;
    output.terminalOs = ids;
  }
  else if (key === 'teamIds') output.teamIds = ids;
  else if (key === 'appPackageType') output.appPackageType = ids;
  else if (key === 'accountId') output.accountId = ids;
  else if (key === 'pkgId') output.pkgId = ids;
  else if (key === 'optimizerIds') output.optimizerIds = ids;
  output.summary[key as keyof ReportResolvedFiltersSummary] = ids as never;
}

function readModelCandidateSets(baseInput?: Record<string, unknown>): ResolvedFilters['model_candidate_sets'] | undefined {
  const raw = baseInput?.__modelCandidateSets;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const semanticCandidateSet = record.semanticCandidateSet;
  const entityCandidateSet = record.entityCandidateSet;
  if (semanticCandidateSet === undefined && entityCandidateSet === undefined) return undefined;
  return { semanticCandidateSet, entityCandidateSet };
}

function readReviewHints(baseInput?: Record<string, unknown>): ReviewHints | undefined {
  const raw = baseInput?.__reviewHints;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return raw as ReviewHints;
}

async function resolveDictionaryFiltersByCapability(params: {
  servers: McpServerConfig[];
  message: string;
  appId: string;
  policy: ReportQueryProjectResolutionPolicy;
  baseInput?: Record<string, unknown>;
  reportTool?: McpToolConfig;
  userScopeKey?: string;
}): Promise<ResolvedFilters> {
  const semanticAliases = mergedEntityAliasMaps(params.policy);
  const modelCandidateSets = readModelCandidateSets(params.baseInput);
  const reviewHints = readReviewHints(params.baseInput);
  const preferredEntitySelections = params.userScopeKey
    ? await getEntitySelectionPreferenceMap(params.userScopeKey)
    : readPreferredEntitySelectionMap(params.baseInput);
  const promotionSource = inferPromotionSourceInternal({
    message: params.message,
    mediaKeys: extractAliasKeys(params.message, semanticAliases.media_aliases),
    adapter: promotionSourceAdapter(selectReportQuestionType(params.message), params.policy),
    policy: params.policy,
  });
  const plans = buildDictionaryPlans({
    message: params.message,
    policy: params.policy,
    semanticAliases,
    reportTool: params.reportTool,
    baseInput: params.baseInput,
    preferredEntitySelections,
  });
  const output: ResolvedFilters = {
    dynamicFilters: {},
    entity_resolutions: [],
    resolution_trace: [],
    missing_context_fields: [],
    missing_capabilities: [],
    quality_risks: [],
    dictionary_steps: [],
    model_candidate_sets: modelCandidateSets,
    review_hints: reviewHints,
    trace_warnings: [],
    promotion_source: promotionSource.value,
    summary: {
      appId: params.appId || undefined,
      mediaKeys: extractAliasKeys(params.message, semanticAliases.media_aliases),
      terminalKeys: extractAliasKeys(params.message, semanticAliases.terminal_aliases),
      teamKeys: extractAliasKeys(params.message, semanticAliases.team_aliases),
      appPackageTypeKeys: extractAliasKeys(params.message, semanticAliases.app_package_type_aliases),
      accountKeys: extractAliasKeys(params.message, semanticAliases.account_aliases),
      packageKeys: extractAliasKeys(params.message, semanticAliases.package_aliases),
      optimizerKeys: extractAliasKeys(params.message, semanticAliases.optimizer_aliases),
      promotion_source: promotionSource.value,
      modelCandidateSets,
      dynamicFilters: {},
      source: {
        appId: params.appId ? '会话或用户输入' : '未取得',
        promotion_source: promotionSource.source,
        ...(modelCandidateSets ? { modelCandidateSets: 'llm_candidate_lane_non_authoritative' } : {}),
      },
    },
  };
  output.summary.entityResolutions = output.entity_resolutions;
  if (!params.appId && plans.length) {
    output.quality_risks.push(`需要先确认当前项目或 appId，才能匹配${Array.from(new Set(plans.map(plan => plan.label))).join('、')}范围。`);
    return output;
  }

  const selectedEntities = readSelectedEntityCandidates(params.baseInput);
  const selectedByEntity = (entityType: EntityType) => selectedEntities.find(item => item.entityType === entityType);
  for (const plan of plans) {
    if (plan.usedLegacySlotMapping) {
      output.trace_warnings.push({
        warning_type: 'missing_slot_mapping',
        source: 'legacy_fallback',
        capability_id: plan.capability.id,
        entity_type: plan.entityType,
        target_tool: params.reportTool?.name,
        suggested_config_path: `report-query-policy.capabilities.${plan.capability.id}.slot_mappings`,
        detail: 'Dictionary resolver used legacy target_keys/summary_key because slot_mappings is missing.',
      });
    }
    const selectedEntity = selectedByEntity(plan.entityType);
    const resolved = selectedEntity ? selectedResolutionFromInput({
      selected: selectedEntity!,
      rawText: plan.keys.join('、'),
      label: plan.label,
      capabilityType: plan.capability.capability_type,
    }) : await resolveDictionaryValues({
      servers: params.servers,
      policy: params.policy,
      appId: params.appId,
      capabilityType: plan.capability.capability_type,
      entityType: plan.entityType,
      stepKey: plan.stepKey,
      keys: plan.keys,
      aliases: plan.aliases,
      idKeys: plan.idKeys,
      nameKeys: plan.nameKeys,
      label: plan.label,
      message: params.message,
      preferredCandidateIds: preferredEntitySelections[plan.entityType]?.candidateId ? [preferredEntitySelections[plan.entityType]!.candidateId] : undefined,
      preferredCandidateNames: preferredEntitySelections[plan.entityType]?.candidateName ? [preferredEntitySelections[plan.entityType]!.candidateName!] : undefined,
    });
    output.entity_resolutions.push(resolved.resolution);
    output.resolution_trace.push(...resolved.trace);
    if (resolved.resolution.status === 'resolved') {
      setResolvedFilterValue(output, plan.summaryKey, resolved.ids);
      output.summary.source[plan.sourceKey] = `${plan.label}匹配能力`;
      for (const targetKey of plan.targetKeys) {
        if (isModeledReportArgumentKey(targetKey, configuredModeledArgumentKeys(params.policy, selectReportQuestionType(params.message), {}))) continue;
        output.dynamicFilters[targetKey] = resolved.ids;
        output.summary.dynamicFilters![targetKey] = resolved.ids;
      }
    } else {
      output.summary.source[plan.sourceKey] = '未匹配';
    }
    if (resolved.missingCapability) output.missing_capabilities.push(resolved.missingCapability as string);
    if (resolved.missingField) output.missing_context_fields.push(resolved.missingField as string);
    if (resolved.risk) output.quality_risks.push(resolved.risk as string);
    output.dictionary_steps.push(resolved.step);
  }
  return output;
}

async function resolveDictionaryFilters(params: {
  servers: McpServerConfig[];
  message: string;
  appId: string;
  policy: ReportQueryProjectResolutionPolicy;
  baseInput?: Record<string, unknown>;
  reportTool?: McpToolConfig;
  userScopeKey?: string;
}): Promise<ResolvedFilters> {
  return resolveDictionaryFiltersByCapability(params);
}

function countDatePoints(rows: Array<Record<string, unknown>>, dateKey?: string): number {
  if (!dateKey) return rows.length;
  const values = rows
    .map(row => row[dateKey])
    .filter(value => value !== undefined && value !== null && value !== '');
  return new Set(values.map(value => String(value))).size;
}

function buildDataCoverage(params: {
  message: string;
  rows: Array<Record<string, unknown>>;
  columns: string[];
  requestedDateRange: { start_date: string; end_date: string };
  actualInputDateRange: { start_date: string; end_date: string };
}): NonNullable<ReportQueryResult['data_coverage']> {
  const requestedView = inferRequestedView(params.message);
  const dateKey = params.columns.find(key => /date|day|日期|时间|dt|stat/i.test(key.toLowerCase())) || params.columns[0];
  const datePointCount = countDatePoints(params.rows, dateKey);
  const issues: string[] = [];
  if (
    params.requestedDateRange.start_date !== params.actualInputDateRange.start_date
    || params.requestedDateRange.end_date !== params.actualInputDateRange.end_date
  ) {
    issues.push('请求时间范围与实际取数时间范围不一致。');
  }
  if (requestedView !== 'detail' && params.rows.length > 0 && datePointCount < 2) {
    issues.push('当前返回数据不足以形成趋势。');
  }
  return {
    requested_date_range: params.requestedDateRange,
    actual_input_date_range: params.actualInputDateRange,
    date_point_count: datePointCount,
    sufficient_for_trend: requestedView === 'detail' || datePointCount >= 2,
    issues,
  };
}

function buildReportTrendSemanticResult(result: ReportQueryResult): ReturnType<typeof reportTrendToSemanticResult> | null {
  if ((result.requested_view !== 'trend' && result.requested_view !== 'comparison') || result.status !== 'success') return null;
  const dateKey = result.columns.find(key => /date|day|date_time|dt|stat/i.test(key.toLowerCase())) || result.columns[0];
  const metricColumns = selectTrendMetricColumns({
    metrics: result.metrics,
    columns: result.columns.filter((column) => column !== dateKey),
    rows: result.rows,
  });
  if (!dateKey || metricColumns.length === 0) return null;
  const metricDisplayNameByKey = new Map(
    (result.display_fields || []).filter((field) => field.role === 'metric').map((field) => [field.key, field.displayName]),
  );
  const resolveMetricDisplayName = (metricKey: string) => metricDisplayNameByKey.get(metricKey) || metricKey;
  const now = new Date().toISOString();
  const dataset: NonNullable<ReportTrendAdapterInput['dataset']> = result.rows.map((row): ReportTrendDataPoint => {
    const base: ReportTrendDataPoint = {
      date: String(row[dateKey] ?? ''),
      value: 0,
    };
    metricColumns.forEach((metricKey) => {
      const raw = row[metricKey];
      const value = parseReportMetricNumber(raw) ?? 0;
      base[metricKey] = value;
      if (metricKey === metricColumns[0]) {
        base.value = value;
      }
    });
    return base;
  });
  const series: NonNullable<ReportTrendAdapterInput['series']> = metricColumns.map((metricKey, index) => ({
    name: metricKey,
    metricKey,
    displayName: resolveMetricDisplayName(metricKey),
    formatter: /roi|rate|percent|pct/i.test(metricKey) ? 'percent-2' : /cost|amount|price|fee|spend|expense|消耗|花费/i.test(metricKey) ? 'currency-2' : 'number-2',
    yAxisId: index === 0 ? 'left' : 'right',
    points: result.rows.map((row) => ({
      date: String(row[dateKey] ?? ''),
      value: parseReportMetricNumber(row[metricKey]) ?? 0,
      series: metricKey,
    })),
  }));
  const dataCoverage = result.data_coverage;
  return reportTrendToSemanticResult({
    resultId: `report-trend-${Date.now()}`,
    title: `${result.question_type === 'hour' ? '小时' : '日'}趋势结果`,
    requestedView: result.requested_view,
    dateRange: {
      start: result.date_range.start_date,
      end: result.date_range.end_date,
      timezone: 'Asia/Shanghai',
    },
    granularity: result.question_type === 'hour' ? 'hour' : 'day',
    dataCoverage: {
      status: dataCoverage?.sufficient_for_trend === false || (dataCoverage?.date_point_count ?? dataset.length) < 2 ? 'insufficient' : 'complete',
      availablePoints: dataCoverage?.date_point_count ?? dataset.length,
      requiredPoints: 2,
      missingReasons: dataCoverage?.issues?.length ? dataCoverage.issues : undefined,
    },
    dataset,
    series,
    metricName: metricColumns[0],
    dimensions: result.dimensions,
    insights: undefined,
    sourceRefs: [{
      id: `src-${result.tool_name}-${result.server_name}`,
      type: 'report',
      title: `${result.server_name}.${result.tool_name}`,
      description: result.message,
    }],
    evidenceRefs: [{
      id: `ev-${result.tool_name}-${result.server_name}`,
      type: 'query-result',
      title: '报表查询结果',
      summary: '报表查询结果已生成',
    }],
    createdAt: now,
  });
}

function buildRecommendedActions(params: {
  root_cause: NonNullable<ReportQualityCheck['root_cause']>;
  missing_context_fields: string[];
  missing_capabilities: string[];
  error_code?: string;
}): string[] {
  if (params.error_code === 'app_scope_not_supported') return ['请检查该项目是否已接入对应报表能力', '或切换到支持该项目的报表工具'];
  if (params.root_cause === 'tool_missing') return ['请管理员补齐对应的数据能力配置', '补齐后重新发起查询'];
  if (params.root_cause === 'capability_unavailable') return ['请先接入对应的归一化能力', '补齐后我再继续查数'];
  if (params.root_cause === 'needs_user_selection') return ['请从候选项中选择一个实体', '选定后我再继续查数'];
  if (params.root_cause === 'needs_enrichment') return ['请确认候选编号对应的实体名称', '确认后我再继续查数'];
  if (params.root_cause === 'output_invalid') return ['请检查归一化工具输出协议', '修正后我再继续查数'];
  if (params.root_cause === 'missing_context') return [`请先补充${params.missing_context_fields.join('、')}`, '补齐后我再继续查数'];
  if (params.root_cause === 'dictionary_unmatched') return ['请确认媒体平台或终端名称是否正确', '也可以直接提供媒体编号或终端范围'];
  if (params.root_cause === 'permission_or_scope') return ['请确认当前账号是否有该项目和媒体的数据权限', '必要时切换项目或联系管理员开通'];
  if (params.root_cause === 'response_unparsed') return ['请检查数据返回格式或字段映射', '我会保留本次返回供排查'];
  if (params.root_cause === 'tool_failed') return ['请稍后重试', '如果持续失败，请检查数据服务连接和授权'];
  return ['请确认查询条件是否过窄', '可以扩大日期范围或去掉媒体、终端限制后再查一次'];
}

function buildEmptyDiagnosis(params: {
  status: ReportQueryStatus;
  call_result: ConfiguredMcpToolCallResult;
  rows: Array<Record<string, unknown>>;
  quality_risks: string[];
  missing_context_fields: string[];
  missing_capabilities: string[];
  resolved_filters: ReportResolvedFiltersSummary;
}): ReportEmptyDiagnosis | undefined {
  if (params.status === 'success') return undefined;
  let root_cause: NonNullable<ReportQualityCheck['root_cause']> = 'no_matching_data';
  if (params.call_result.error_code === 'app_scope_not_supported') root_cause = 'capability_unavailable';
  else if (params.missing_capabilities.some(item => /归一化能力/.test(item))) root_cause = 'capability_unavailable';
  else if (params.missing_context_fields.some(item => /选择/.test(item))) root_cause = 'needs_user_selection';
  else if (params.missing_context_fields.some(item => /确认/.test(item)) || params.quality_risks.some(item => /needs_enrichment/.test(item))) root_cause = 'needs_enrichment';
  else if (params.missing_context_fields.some(item => /解析输出/.test(item))) root_cause = 'output_invalid';
  else if (params.missing_capabilities.length) root_cause = 'tool_missing';
  else if (params.missing_context_fields.length) root_cause = 'missing_context';
  else if (params.quality_risks.some(item => /匹配|编号|终端/.test(item))) root_cause = 'dictionary_unmatched';
  else if (params.call_result.status !== 'success') {
    const message = params.call_result.business_error || params.call_result.error || params.call_result.message || '';
    root_cause = /token|unauthor|forbidden|401|403|权限|授权|登录/i.test(message) ? 'permission_or_scope' : 'tool_failed';
  } else if (params.rows.length === 0 && params.call_result.status === 'success') {
    root_cause = 'no_matching_data';
  }

  const nextActions = buildRecommendedActions({
    root_cause,
    missing_context_fields: params.missing_context_fields,
    missing_capabilities: params.missing_capabilities,
    error_code: params.call_result.error_code,
  });
  const conditionText = [
    params.resolved_filters.appId ? `项目 ${params.resolved_filters.appId}` : '',
    params.resolved_filters.mediaId?.length ? `媒体编号 ${params.resolved_filters.mediaId.join('、')}` : params.resolved_filters.mediaKeys.length ? `媒体 ${params.resolved_filters.mediaKeys.join('、')}` : '',
    params.resolved_filters.osTypes?.length ? `终端 ${params.resolved_filters.osTypes.join('、')}` : params.resolved_filters.terminalKeys.length ? `终端 ${params.resolved_filters.terminalKeys.join('、')}` : '',
  ].filter(Boolean).join('，') || '当前查询条件';
  const explanations: Record<NonNullable<ReportQualityCheck['root_cause']>, string> = {
    none: '未发现异常。',
    capability_unavailable: params.call_result.error_code === 'app_scope_not_supported'
      ? '当前项目未接入这类报表能力，无法继续执行本次查询。'
      : '当前未接入标准标识归一化能力，无法继续执行下游报表查询。',
    tool_missing: `本次没有继续查数，因为缺少必要能力：${params.missing_capabilities.join('、')}。`,
    needs_user_selection: `本次没有继续查数，因为当前实体有多个候选，需要先选择一个。`,
    needs_enrichment: '本次没有继续查数，因为候选项缺少名称或别名证据，需要先确认后继续。',
    output_invalid: '本次没有继续查数，因为归一化工具未返回符合协议的标准标识。',
    missing_context: `本次没有继续查数，因为还缺少${params.missing_context_fields.join('、')}。`,
    dictionary_unmatched: '本次没有继续查数，因为媒体平台或终端没有匹配到报表可识别的范围。',
    permission_or_scope: '数据服务返回权限或范围异常，当前账号可能看不到这部分数据。',
    no_matching_data: `已按${conditionText}查询，但没有查到符合条件的数据。`,
    response_unparsed: '数据服务有返回，但当前无法识别成可展示的数据表。',
    tool_failed: '数据服务调用失败，暂时无法返回报表结果。',
  };
  return {
    root_cause,
    explanation: explanations[root_cause],
    next_actions: nextActions,
  };
}

function buildReportQuerySuccessMessage(result: {
  date_range: { start_date: string; end_date: string };
  requested_view?: 'trend' | 'detail' | 'comparison';
  rows: Array<Record<string, unknown>>;
  metrics: string[];
  dimensions: string[];
  columns: string[];
}): string {
  const dateText = `${result.date_range.start_date} 至 ${result.date_range.end_date}`;
  const viewText = result.requested_view === 'trend'
    ? '趋势'
    : result.requested_view === 'comparison'
      ? '对比'
      : '明细';
  const rowText = result.rows.length ? `，共 ${result.rows.length} 条数据` : '，已返回结果';
  return `已查到 ${dateText} 的${viewText}结果${rowText}。`;
}

export function buildBusinessFailedMessage(params: {
  input: Record<string, unknown>;
  resolved_filters: ReportResolvedFiltersSummary;
  call_result: ConfiguredMcpToolCallResult;
  empty_diagnosis?: ReportEmptyDiagnosis;
}): string {
  if (params.call_result.error_code === 'app_scope_not_supported') {
    return '当前报表工具不支持你选择的项目，暂时无法完成这次查询。请检查该项目是否已接入对应报表能力，或切换到支持该项目的报表工具。';
  }
  if (params.call_result.error_code === 'business_failed_invalid_argument' || params.call_result.error_code === 'invalid_params') {
    return '查询参数映射异常，系统未能完成查询。';
  }
  return params.empty_diagnosis?.explanation
    || params.call_result.business_error
    || params.call_result.error
    || params.call_result.message
    || '报表查询失败。';
}

const OUTPUT_IDENTIFIER_FIELD_ALIASES: Record<string, string[]> = {
  media_id: ['mediaId', 'media_id', 'mediaIds', 'media_ids'],
  app_id: ['appId', 'app_id', 'projectId', 'project_id'],
  campaign_id: ['campaignId', 'campaign_id', 'groupId', 'group_id'],
  material_id: ['materialId', 'material_id', 'creativeId', 'creative_id'],
  account_id: ['accountId', 'account_id', 'accountIds', 'account_ids'],
  team_id: ['teamId', 'team_id', 'teamIds', 'team_ids'],
  app_package_type: ['appPackageType', 'app_package_type', 'appPackageTypes', 'app_package_types'],
  app_package_id: ['pkgId', 'pkg_id', 'packageId', 'package_id', 'appPackageId', 'app_package_id'],
  terminal_id: ['terminalId', 'terminal_id'],
  os_type: ['osTypes', 'os_type', 'osType', 'terminalOs'],
};

function aliasesForOutputIdentifier(identifierKey: string): string[] {
  const normalized = String(identifierKey || '').trim();
  if (!normalized) return [];
  return OUTPUT_IDENTIFIER_FIELD_ALIASES[normalized] || [normalized];
}

function detectMissingOutputIdentifierFields(params: {
  rows: Array<Record<string, unknown>>;
  selectedCapability?: ReportToolCapability;
}): string[] {
  if (!params.rows.length || !params.selectedCapability) return [];
  const declaredIdentifierKeys = Array.from(new Set(params.selectedCapability.identifier_keys || []));
  if (!declaredIdentifierKeys.length) return [];
  const rowKeys = new Set(params.rows.flatMap(row => Object.keys(row || {})));
  return Array.from(new Set(declaredIdentifierKeys.flatMap((identifierKey) => {
    const aliases = aliasesForOutputIdentifier(identifierKey);
    if (!aliases.length) return [];
    return aliases.some(alias => rowKeys.has(alias)) ? [] : [aliases[0] || identifierKey];
  })));
}

export function normalizeReportQueryResult(params: {
  question_type: ReportQuestionType;
  server: McpServerConfig;
  tool: McpToolConfig;
  input: Record<string, unknown>;
  metrics: string[];
  dimensions: string[];
  date_range: { start_date: string; end_date: string };
  call_result: ConfiguredMcpToolCallResult;
  selection_trace: ReportToolSelectionTrace;
  selected_capability?: ReportToolCapability;
  quality_risks: string[];
  missing_context_fields: string[];
  missing_capabilities: string[];
  preflight: ReportQueryPreflight;
  resolved_filters: ReportResolvedFiltersSummary;
  message: string;
}): ReportQueryResult {
  const rawPayload = params.call_result.business_payload ?? params.call_result.response;
  const rows = params.call_result.status === 'success' ? normalizeRows(rawPayload) : [];
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const columnMeta = extractColumnConfig(rawPayload);
  const requestedView = inferRequestedView(params.message);
  const displayFields = params.call_result.status === 'success' && rows.length
    ? buildReportDisplayFields({
      rows,
      metrics: params.metrics,
      dimensions: params.dimensions,
      columnMeta,
    })
    : [];
  const parsedRequestedRange = parseDateRange(params.message);
  const requestedDateRange = parsedRequestedRange.is_explicit
    ? { start_date: parsedRequestedRange.start_date, end_date: parsedRequestedRange.end_date }
    : params.date_range;
  const dataCoverage = buildDataCoverage({
    message: params.message,
    rows,
    columns,
    requestedDateRange,
    actualInputDateRange: params.date_range,
  });
  const missingOutputFields = detectMissingOutputIdentifierFields({
    rows,
    selectedCapability: params.selected_capability,
  });
  const issues: string[] = [];
  if (params.call_result.status !== 'success') issues.push(params.call_result.business_error || params.call_result.error || '数据服务调用失败');
  if (params.call_result.status === 'success' && rows.length === 0) issues.push('报表返回为空');
  if (missingOutputFields.length) issues.push(`结果缺少标识字段：${missingOutputFields.join('、')}`);
  issues.push(...dataCoverage.issues);
  const status: ReportQueryStatus = params.call_result.status === 'business_failed'
    ? 'business_failed'
    : params.call_result.status === 'success'
      ? (rows.length ? 'success' : 'empty')
      : (params.call_result.token_expired ? 'blocked' : 'failed');
  const empty_diagnosis = buildEmptyDiagnosis({
    status,
    call_result: params.call_result,
    rows,
    quality_risks: params.quality_risks,
    missing_context_fields: params.missing_context_fields,
    missing_capabilities: params.missing_capabilities,
    resolved_filters: params.resolved_filters,
  });
  const successMessage = buildReportQuerySuccessMessage({
    date_range: params.date_range,
    requested_view: requestedView,
    rows,
    metrics: params.metrics,
    dimensions: params.dimensions,
    columns,
  });
  const answerMarkdown = requestedView === 'detail'
    ? buildDetailAnswerMarkdown({ rows, displayFields, fallbackMessage: successMessage })
    : undefined;
  const businessFailedMessage = status === 'business_failed'
    ? buildBusinessFailedMessage({
      input: params.input,
      resolved_filters: params.resolved_filters,
      call_result: params.call_result,
      empty_diagnosis,
    })
    : undefined;
  const quality_check: ReportQualityCheck = {
    ok: status === 'success' && issues.length === 0 && params.quality_risks.length === 0,
    empty_table: rows.length === 0,
    missing_fields: missingOutputFields,
    missing_context_fields: params.missing_context_fields,
    missing_capabilities: params.missing_capabilities,
    date_gaps: [],
    anomaly_warnings: [],
    metric_risks: params.quality_risks,
    issues,
    root_cause: status === 'success'
      ? (missingOutputFields.length ? 'output_invalid' : 'none')
      : empty_diagnosis?.root_cause,
    recommended_next_actions: status === 'success' && missingOutputFields.length
      ? buildRecommendedActions({
        root_cause: 'output_invalid',
        missing_context_fields: params.missing_context_fields,
        missing_capabilities: params.missing_capabilities,
        error_code: params.call_result.error_code,
      })
      : empty_diagnosis?.next_actions,
  };
  const baseResult: ReportQueryResult = {
    result_type: 'ReportQueryResult',
    status,
    business_outcome: status === 'success'
      ? 'success'
      : status === 'empty'
        ? 'empty'
        : params.call_result.business_outcome || (status === 'blocked' ? 'blocked' : 'failed'),
    tool_execution_status: params.call_result.status === 'business_failed'
      ? 'business_failed'
      : params.call_result.status === 'success'
        ? 'called_success'
        : 'called_failed',
    question_type: params.question_type,
    requested_view: requestedView,
    tool_name: params.tool.name,
    server_name: params.server.name,
    input: params.input,
    rows,
    columns,
    metrics: params.metrics,
    dimensions: params.dimensions,
    date_range: params.date_range,
    data_coverage: dataCoverage,
    quality_check,
    message: status === 'success'
      ? successMessage
      : status === 'empty'
        ? '没有查到符合条件的数据。可以换个日期，或减少媒体等限制后再查。'
        : (businessFailedMessage || empty_diagnosis?.explanation || params.call_result.business_error || params.call_result.error || params.call_result.message || '报表查询失败。'),
    answer_markdown: status === 'success' ? answerMarkdown : undefined,
    business_summary_markdown: status === 'success' ? answerMarkdown : undefined,
    display_fields: displayFields.length ? displayFields : undefined,
    raw_result_preview: summarizeRawPreview(rawPayload),
    selection_trace: params.selection_trace,
    preflight: params.preflight,
    resolved_filters: params.resolved_filters,
    empty_diagnosis,
    error: params.call_result.error_code ? {
      code: params.call_result.error_code,
      message: params.call_result.error_message || params.call_result.business_error || params.call_result.error || '',
      canRetryWithSameTool: params.call_result.canRetryWithSameTool,
      suggestedAction: params.call_result.suggestedAction,
    } : undefined,
  };
  if (status === 'success') {
    baseResult.semantic_result = buildReportTrendSemanticResult(baseResult)
      ?? buildReportDetailSemanticResult({ result: baseResult, displayFields })
      ?? undefined;
  }
  return baseResult;
}

export async function executeReportQueryStep(params: {
  servers: McpServerConfig[];
  message: string;
  baseInput: Record<string, unknown>;
  userScopeKey?: string;
  executionContract?: McpToolCallResult['execution_contract'];
  llmUnderstandings?: CapabilityUnderstanding[];
  capabilityDecision?: {
    selected?: { capabilityId?: string; source?: { toolName?: string } };
    fallbackUsed?: boolean;
    fallbackReason?: string;
    warnings?: string[];
    candidates?: Array<{ capability?: { capabilityId?: string; source?: { toolName?: string } } }>;
    dataCoverage?: { covered?: boolean; missing?: string[]; reasons?: string[]; supportLevel?: string };
    presentationCoverage?: { covered?: boolean; missing?: string[]; reasons?: string[] };
  } | null;
}): Promise<ExecuteReportQueryStepResult> {
  const policy = loadReportQueryPolicySync();
  if (params.capabilityDecision && !params.capabilityDecision.selected) {
    const businessCapability = capabilityByType(policy, 'business_report');
    const basePreflight: ReportQueryPreflight = {
      ok: false,
      capability_checks: [
        createCapabilityCheck({
          policy,
          type: 'business_report',
          required: true,
          message: businessCapability.missing_message,
        }),
      ],
      missing_capabilities: [capabilityLabel('business_report')],
      missing_context_fields: [],
    };
      return {
        status: 'missing_input',
        business_outcome: 'need_clarification',
        step_status: 'waiting_for_user',
        tool_execution_status: 'not_called',
        blocking_requirements: basePreflight.missing_capabilities,
        preflight: basePreflight,
        tool_chain: [{
          key: 'structured_capability_gap',
          tool_name: 'capability.discovery',
          server_name: 'local',
          status: 'skipped',
          required: false,
          input: { message: params.message },
          result: {
            fallbackReason: params.capabilityDecision.fallbackReason || 'no_executable_capability',
            warnings: params.capabilityDecision.warnings || [],
            dataCoverage: params.capabilityDecision.dataCoverage,
            presentationCoverage: params.capabilityDecision.presentationCoverage,
            candidateTools: (params.capabilityDecision.candidates || []).map(item => item.capability?.source?.toolName).filter(Boolean),
          },
          message: 'structured_capability_gap',
        }],
        message: '当前候选工具还不能直接完成这次查询，已整理能力缺口。',
      };
  }
  const selected = selectReportTool(params.servers, params.message, {
    preferredToolName: params.capabilityDecision?.selected?.source?.toolName,
    preferredCapabilityId: params.capabilityDecision?.selected?.capabilityId,
    requirePreferred: Boolean(params.capabilityDecision?.selected),
    llmUnderstandings: params.llmUnderstandings,
  }) || (params.capabilityDecision?.selected
    ? selectReportTool(params.servers, params.message, { llmUnderstandings: params.llmUnderstandings })
    : null);
  if (!selected) {
    const businessCapability = capabilityByType(policy, 'business_report');
    const basePreflight: ReportQueryPreflight = {
      ok: false,
      capability_checks: [
        createCapabilityCheck({
          policy,
          type: 'business_report',
          required: true,
          message: businessCapability.missing_message,
        }),
      ],
      missing_capabilities: [capabilityLabel('business_report')],
      missing_context_fields: [],
    };
    if (params.capabilityDecision?.selected) {
      const knowledge = await buildKnowledgeFallbackStep({
        message: params.message,
        reasons: [
          params.capabilityDecision.fallbackReason || 'preferred_capability_not_executable',
          ...(params.capabilityDecision.warnings || []),
        ],
        policy,
      });
      basePreflight.knowledge_fallback = knowledge.fallback;
      return {
        status: 'missing_input',
        business_outcome: 'need_clarification',
        step_status: 'waiting_for_user',
        tool_execution_status: 'not_called',
        blocking_requirements: basePreflight.missing_capabilities,
        preflight: basePreflight,
        tool_chain: [{ ...knowledge.step, status: 'skipped' }],
        message: '已找到可用能力，但当前还不能直接执行，请先补齐必要条件后继续。',
      };
    }
    const knowledge = await buildKnowledgeFallbackStep({
      message: params.message,
      reasons: basePreflight.missing_capabilities,
      policy,
    });
    basePreflight.knowledge_fallback = knowledge.fallback;
    return {
      status: 'not_configured',
      business_outcome: 'blocked',
      step_status: 'failed',
      tool_execution_status: 'not_called',
      blocking_requirements: basePreflight.missing_capabilities,
      preflight: basePreflight,
      tool_chain: [knowledge.step],
      message: `${businessCapability.missing_message} 已尝试参考知识库说明当前缺口。`,
    };
  }
  const lookupChain = buildLookupToolChain(params.servers, selected, params.message, params.baseInput);
  const appId = extractAppId(params.message, params.baseInput);
  const preflight = buildCapabilityPreflight({
    servers: params.servers,
    selected,
    message: params.message,
    baseInput: params.baseInput,
    appId,
    policy,
  });
  const resolvedFilters = await resolveDictionaryFilters({
    servers: params.servers,
    message: params.message,
    appId,
    policy,
    baseInput: params.baseInput,
    reportTool: selected.tool,
    userScopeKey: params.userScopeKey,
  });
  const adapted = buildReportToolInput(selected.tool, params.message, params.baseInput, resolvedFilters, selected.capability);
  const selection_trace = buildTrace(params.message, selected);
  selection_trace.warnings = [
    ...(selection_trace.warnings || []),
    ...resolvedFilters.trace_warnings,
  ];
  selection_trace.argument_contract = buildArgumentContractTrace({ selected, adapted });
  const requestedTypes = inferRequestedQuestionTypes(params.message, selected.entry.question_type);
  const selectedTools = requestedTypes
    .map(type => type === selected.entry.question_type
      ? selected
      : selectReportToolForType({
        servers: params.servers,
        message: params.message,
        questionType: type,
        manifest: selected.manifest || buildReportCapabilityManifest(params.servers),
        glossary: selected.glossary || normalizeRoutingText(params.message),
      }))
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex(candidate => candidate?.tool.name === item?.tool.name) === index) as SelectedReportTool[];
  const subQueryInputs = selectedTools.map((toolSelection) => ({
    selected: toolSelection,
    adapted: buildReportToolInput(toolSelection.tool, params.message, params.baseInput, resolvedFilters, toolSelection.capability),
  }));
  const query_plan = buildInitialReportQueryPlan({
    message: params.message,
    selected,
    selectedTools,
    baseInput: params.baseInput,
    adaptedInput: adapted.finalArgs,
    pendingSlots: Array.from(new Set(subQueryInputs.flatMap(item => item.adapted.missingRequiredKeysBeforeCall))),
    status: 'executing',
  });
  const tool_chain = [...lookupChain.filter(item => item.key !== 'business_report'), ...resolvedFilters.dictionary_steps, lookupChain.find(item => item.key === 'business_report')!];
  const missing_context_fields = Array.from(new Set([...preflight.missing_context_fields, ...resolvedFilters.missing_context_fields]));
  const missing_capabilities = Array.from(new Set([...preflight.missing_capabilities, ...resolvedFilters.missing_capabilities]));
  preflight.missing_context_fields = missing_context_fields;
  preflight.missing_capabilities = missing_capabilities;
  preflight.ok = missing_context_fields.length === 0 && missing_capabilities.length === 0;
  const rawMissingFields = Array.from(new Set([
    ...subQueryInputs.flatMap(item => item.adapted.missingRequiredKeysBeforeCall),
    ...missing_context_fields,
  ]));
  const allAutoFilled: Record<string, unknown> = {};
  for (const item of subQueryInputs) {
    if (item.adapted.preflight.status === 'unsupported_query') continue;
    if (item.adapted.missingRequiredKeysBeforeCall.length > 0) {
      const { autoFilled } = classifyAndFillMissingKeys({
        missingKeys: item.adapted.missingRequiredKeysBeforeCall,
        questionType: item.selected.entry.question_type,
        policy,
        toolProperties: schemaProperties(item.selected.tool),
        input: item.adapted.finalArgs as Record<string, unknown>,
      });
      Object.assign(allAutoFilled, autoFilled);
      item.adapted.missingRequiredKeysBeforeCall = item.adapted.missingRequiredKeysBeforeCall
        .filter(key => !(key in autoFilled));
      if (Object.keys(autoFilled).length > 0) {
        item.adapted.preflight = buildToolArgumentPreflight({
          finalArgs: item.adapted.finalArgs as Record<string, unknown>,
          requiredKeys: item.adapted.requiredKeys,
          missingRequiredKeysBeforeCall: item.adapted.missingRequiredKeysBeforeCall,
          sourceMapping: item.adapted.sourceMapping,
          resolvedFilters: {},
        });
      }
    }
  }
  const blockingMissingFields = Array.from(new Set([
    ...subQueryInputs.flatMap(item => item.adapted.missingRequiredKeysBeforeCall),
    ...missing_context_fields.filter(field => !allAutoFilled[field]),
  ]));
  const hasInvalidArgumentPreflight = subQueryInputs.some(item => !item.adapted.preflight.ok && item.adapted.preflight.status !== 'missing_required_input');
  if ((missing_capabilities.length > 0 || blockingMissingFields.length > 0) && !hasInvalidArgumentPreflight) {
    const knowledge = await buildKnowledgeFallbackStep({
      message: params.message,
      reasons: [...missing_capabilities, ...blockingMissingFields],
      policy,
    });
    preflight.knowledge_fallback = knowledge.fallback;
    const blockedChain = [
      ...tool_chain.filter(item => item.key !== 'business_report').map(item => ({
        ...item,
        status: 'skipped' as const,
      })),
      {
        ...knowledge.step,
        status: 'skipped' as const,
      },
      {
        ...tool_chain.find(item => item.key === 'business_report')!,
        status: 'skipped' as const,
        input: adapted.finalArgs,
        argument_contract: buildArgumentContractTrace({ selected, adapted }),
        message: '查询条件或能力未补齐，已停止本次报表查询。',
      },
    ];
    return {
      status: 'missing_input',
      business_outcome: 'need_clarification',
      step_status: 'waiting_for_user',
      tool_execution_status: 'not_called',
      blocking_requirements: blockingMissingFields.length ? blockingMissingFields : [...missing_capabilities],
      selected,
      input: adapted.finalArgs,
      missing_fields: blockingMissingFields,
      selection_trace,
      query_plan: {
        ...query_plan,
        pending_slots: blockingMissingFields,
        status: 'waiting_for_user',
        updated_at: new Date().toISOString(),
      },
      preflight,
      resolved_filters: resolvedFilters.summary,
      tool_chain: blockedChain,
      message: userFacingMissingRequirementMessage(blockingMissingFields.length ? blockingMissingFields : missing_capabilities),
    };
  }
  const blockedByArgumentPreflight = subQueryInputs.filter(item => !item.adapted.preflight.ok);
  if (blockedByArgumentPreflight.length > 0) {
    const primaryBlocked = blockedByArgumentPreflight.find(item => item.selected.tool.name === selected.tool.name) || blockedByArgumentPreflight[0];
    const blockingIssues = primaryBlocked.adapted.preflight.issues;
    const blockingRequirements = Array.from(new Set(blockingIssues.map(item => `${item.field}:${item.code}`)));
    const blockedBusinessStep = {
      ...tool_chain.find(item => item.key === 'business_report')!,
      status: 'skipped' as const,
      input: primaryBlocked.adapted.finalArgs,
      argument_contract: buildArgumentContractTrace({ selected: primaryBlocked.selected, adapted: primaryBlocked.adapted }),
      result: {
        status: primaryBlocked.adapted.preflight.status,
        business_outcome: 'execution_failed',
        blockedBeforeCall: true,
        issues: blockingIssues,
        finalArgKeys: primaryBlocked.adapted.finalArgKeys,
        requiredKeys: primaryBlocked.adapted.requiredKeys,
        missingRequiredKeysBeforeCall: primaryBlocked.adapted.missingRequiredKeysBeforeCall,
        sourceMapping: primaryBlocked.adapted.sourceMapping,
      },
      message: primaryBlocked.adapted.preflight.status === 'unsupported_query'
        ? '当前数据能力不支持这类流量来源，已停止本次查询。'
        : '查询参数映射异常，系统未能完成查询。',
    };
    return {
      status: 'business_failed',
      business_outcome: 'execution_failed',
      step_status: 'failed',
      tool_execution_status: 'not_called',
      blocking_requirements: blockingRequirements,
      selected,
      input: primaryBlocked.adapted.finalArgs,
      missing_fields: blockingRequirements,
      selection_trace: {
        ...selection_trace,
        argument_contract: buildArgumentContractTrace({ selected: primaryBlocked.selected, adapted: primaryBlocked.adapted }),
      },
      query_plan: {
        ...query_plan,
        pending_slots: blockingRequirements,
        status: 'failed',
        updated_at: new Date().toISOString(),
      },
      preflight,
      resolved_filters: resolvedFilters.summary,
      tool_chain: [
        ...tool_chain.filter(item => item.key !== 'business_report'),
        blockedBusinessStep,
      ],
      message: blockedBusinessStep.message,
    };
  }
  const executions: Array<{
    selected: SelectedReportTool;
    adapted: ReturnType<typeof buildReportToolInput>;
    call_result: ConfiguredMcpToolCallResult;
    result: ReportQueryResult;
  }> = [];
  const fallbackDiagnosticSteps: ExecuteReportQueryStepResult['tool_chain'] = [];
  const fallbackSkippedCandidates: ReportFallbackSkippedCandidate[] = [];
  let fallbackAttemptedTools: string[] = [];
  for (const item of subQueryInputs) {
    const call_result = item.adapted.preflight.ok
      ? await callConfiguredMcpTool(item.selected.server, item.selected.tool, item.adapted.finalArgs, {
        executionContract: params.executionContract,
      })
      : buildPreflightBlockedCallResult(item);
    const result = normalizeReportQueryResult({
      question_type: item.selected.entry.question_type,
      server: item.selected.server,
      tool: item.selected.tool,
      input: item.adapted.finalArgs,
      metrics: item.adapted.metrics,
      dimensions: item.adapted.dimensions,
      date_range: item.adapted.date_range,
      call_result,
      selection_trace: item.selected.tool.name === selected.tool.name ? selection_trace : buildTrace(params.message, item.selected),
      selected_capability: item.selected.capability,
      quality_risks: resolvedFilters.quality_risks,
      missing_context_fields,
      missing_capabilities,
      preflight,
      resolved_filters: resolvedFilters.summary,
      message: params.message,
    });
    executions.push({ ...item, call_result, result });
  }
  const initialPrimaryExecution = executions.find(item => item.selected.tool.name === selected.tool.name) || executions[0];
  const fallbackReason = initialPrimaryExecution ? reportToolFallbackReason(initialPrimaryExecution.call_result) || undefined : undefined;
  if (initialPrimaryExecution && fallbackReason) {
    const attemptedToolNames = new Set(executions.map(item => item.selected.tool.name));
    const fallbackTools = selectFallbackToolsForAppScope({
      servers: params.servers,
      selected,
      candidateTools: selected.candidate_tools,
      attemptedToolNames,
    });
    for (const fallbackSelection of fallbackTools) {
      attemptedToolNames.add(fallbackSelection.tool.name);
      fallbackAttemptedTools = Array.from(attemptedToolNames);
      const fallbackAdapted = buildReportToolInput(fallbackSelection.tool, params.message, params.baseInput, resolvedFilters, fallbackSelection.capability);
      fallbackDiagnosticSteps.push({
        key: `fallback_attempt:${fallbackSelection.tool.name}`,
        tool_name: fallbackSelection.tool.name,
        server_name: fallbackSelection.server.name,
        status: 'success',
        required: false,
        input: fallbackAdapted.finalArgs,
        argument_contract: buildArgumentContractTrace({ selected: fallbackSelection, adapted: fallbackAdapted, called: fallbackSelection }),
        result: {
          originalTool: selected.tool.name,
          fallbackTool: fallbackSelection.tool.name,
          fallbackReason,
          attemptedTools: Array.from(attemptedToolNames),
          finalArgKeys: fallbackAdapted.finalArgKeys,
          requiredKeys: fallbackAdapted.requiredKeys,
          missingFields: fallbackAdapted.missingRequiredKeysBeforeCall,
          draftArguments: fallbackAdapted.finalArgs,
        },
        message: `fallback_attempt:${fallbackReason}`,
      });
      if (fallbackAdapted.missingRequiredKeysBeforeCall.length) {
        const skipped = {
          toolName: fallbackSelection.tool.name,
          capabilityId: fallbackSelection.capability?.capability_id,
          skippedReason: 'missing_required_fields',
          missingFields: fallbackAdapted.missingRequiredKeysBeforeCall,
          draftArguments: fallbackAdapted.finalArgs,
        };
        fallbackSkippedCandidates.push(skipped);
        fallbackDiagnosticSteps.push({
          key: `fallback_skipped:${fallbackSelection.tool.name}`,
          tool_name: fallbackSelection.tool.name,
          server_name: fallbackSelection.server.name,
          status: 'skipped',
          required: false,
          input: fallbackAdapted.finalArgs,
          argument_contract: buildArgumentContractTrace({ selected: fallbackSelection, adapted: fallbackAdapted }),
          result: {
            originalTool: selected.tool.name,
            fallbackTool: fallbackSelection.tool.name,
            fallbackReason,
            skippedReason: skipped.skippedReason,
            missingFields: skipped.missingFields,
            draftArguments: skipped.draftArguments,
          },
          message: `fallback_skipped:${skipped.skippedReason}`,
        });
        continue;
      }
      const call_result = fallbackAdapted.preflight.ok
        ? await callConfiguredMcpTool(fallbackSelection.server, fallbackSelection.tool, fallbackAdapted.finalArgs, {
          executionContract: params.executionContract,
        })
        : buildPreflightBlockedCallResult({ selected: fallbackSelection, adapted: fallbackAdapted });
      const result = normalizeReportQueryResult({
        question_type: fallbackSelection.entry.question_type,
        server: fallbackSelection.server,
        tool: fallbackSelection.tool,
        input: fallbackAdapted.finalArgs,
        metrics: fallbackAdapted.metrics,
        dimensions: fallbackAdapted.dimensions,
        date_range: fallbackAdapted.date_range,
        call_result,
        selection_trace: buildTrace(params.message, fallbackSelection),
        selected_capability: fallbackSelection.capability,
        quality_risks: resolvedFilters.quality_risks,
        missing_context_fields,
        missing_capabilities,
        preflight,
        resolved_filters: resolvedFilters.summary,
        message: params.message,
      });
      executions.push({
        selected: fallbackSelection,
        adapted: fallbackAdapted,
        call_result,
        result,
      });
      fallbackDiagnosticSteps.push({
        key: result.status === 'success' ? `fallback_success:${fallbackSelection.tool.name}` : `fallback_failed:${fallbackSelection.tool.name}`,
        tool_name: fallbackSelection.tool.name,
        server_name: fallbackSelection.server.name,
        status: result.status === 'success' ? 'success' : 'failed',
        required: false,
        input: fallbackAdapted.finalArgs,
        argument_contract: buildArgumentContractTrace({ selected: fallbackSelection, adapted: fallbackAdapted, called: fallbackSelection }),
        result: {
          execution_contract: call_result.execution_contract,
          policy_blocked: call_result.policy_blocked,
          security_blocked: call_result.security_blocked,
          blocking_reason: call_result.blocking_reason,
          status: result.status,
          originalTool: selected.tool.name,
          fallbackTool: fallbackSelection.tool.name,
          finalTool: result.status === 'success' ? fallbackSelection.tool.name : undefined,
          fallbackReason,
          attemptedTools: Array.from(attemptedToolNames),
          finalToolArguments: fallbackAdapted.finalArgs,
          row_count: result.rows.length,
          error: call_result.error || call_result.business_error,
          error_code: call_result.error_code,
          retry: call_result.retry,
        },
        message: result.status === 'success' ? `fallback_success:${fallbackReason}` : `fallback_failed:${call_result.error_code || result.status}`,
      });
      if (result.status === 'success') break;
    }
  }
  const selectedExecution = executions.find(item => item.selected.tool.name === selected.tool.name) || executions[0];
  const fallbackSuccessExecution = selectedExecution?.result.status === 'business_failed'
    ? executions.find(item =>
      item.selected.tool.name !== selected.tool.name
      && item.result.status === 'success'
      && item.selected.entry.question_type === selected.entry.question_type
    )
    : undefined;
  const primaryExecution = fallbackSuccessExecution || selectedExecution;
  const report_query_result = primaryExecution.result;
  const successfulExecutions = executions.filter(item => item.result.status === 'success');
  const failedExecutions = executions.filter(item => item.result.status !== 'success');
  const planStatus: ReportQueryPlanStatus = failedExecutions.length === 0
    ? 'success'
    : successfulExecutions.length > 0
      ? 'partial_success'
      : report_query_result.status === 'empty'
        ? 'partial_success'
        : 'failed';
  const completedPlan: ReportQueryPlan = {
    ...query_plan,
    sub_queries: [
      ...query_plan.sub_queries.map((item) => {
      const execution = executions.find(candidate => candidate.selected.tool.name === item.tool_name);
      if (!execution) return item;
      return {
        ...item,
        status: resultStatusToSubQueryStatus(execution.result.status),
        input: execution.adapted.finalArgs,
        row_count: execution.result.rows.length,
        message: execution.result.message,
        evidence_refs: [
          `${execution.selected.server.id}:${execution.selected.tool.name}`,
          ...(execution.selected.capability ? [execution.selected.capability.capability_id] : []),
        ],
      };
      }),
      ...executions
        .filter(execution => !query_plan.sub_queries.some(item => item.tool_name === execution.selected.tool.name))
        .map((execution, index) => ({
          sub_query_id: `fallback-${index + 1}`,
          question_type: execution.selected.entry.question_type,
          tool_name: execution.selected.tool.name,
          server_name: execution.selected.server.name,
          status: resultStatusToSubQueryStatus(execution.result.status),
          input: execution.adapted.finalArgs,
          row_count: execution.result.rows.length,
          message: execution.result.message,
          evidence_refs: [
            `${execution.selected.server.id}:${execution.selected.tool.name}`,
            ...(execution.selected.capability ? [execution.selected.capability.capability_id] : []),
          ],
        } satisfies ReportSubQuery)),
    ],
    status: planStatus,
    failed_items: failedExecutions.map((item, index) => ({
      sub_query_id: query_plan.sub_queries.find(subQuery => subQuery.tool_name === item.selected.tool.name)?.sub_query_id || `sub-${index + 1}`,
      reason: item.result.message,
    })),
    evidence_refs: executions.flatMap(item => [
      `${item.selected.server.id}:${item.selected.tool.name}`,
      ...(item.selected.capability ? [item.selected.capability.capability_id] : []),
    ]),
    updated_at: new Date().toISOString(),
  };
  const finalSelectionTrace = buildTrace(params.message, primaryExecution.selected);
  finalSelectionTrace.warnings = [
    ...(finalSelectionTrace.warnings || []),
    ...resolvedFilters.trace_warnings,
  ];
  finalSelectionTrace.argument_contract = buildArgumentContractTrace({
    selected: primaryExecution.selected,
    adapted: primaryExecution.adapted,
    called: primaryExecution.selected,
  });
  if (primaryExecution.selected.tool.name !== selected.tool.name || fallbackReason || fallbackSkippedCandidates.length) {
    finalSelectionTrace.fallback = {
      originalTool: selected.tool.name,
      fallbackTool: primaryExecution.selected.tool.name !== selected.tool.name ? primaryExecution.selected.tool.name : undefined,
      finalTool: primaryExecution.selected.tool.name,
      fallbackReason,
      attemptedTools: fallbackAttemptedTools.length ? fallbackAttemptedTools : executions.map(item => item.selected.tool.name),
      finalToolArguments: primaryExecution.adapted.finalArgs,
      skippedCandidates: fallbackSkippedCandidates,
    };
  }
  if (report_query_result) {
    report_query_result.selection_trace = finalSelectionTrace;
  }
  return {
    status: report_query_result.status,
    business_outcome: report_query_result.status === 'success'
      ? 'success'
      : report_query_result.status === 'empty'
        ? 'empty'
        : report_query_result.status === 'blocked'
          ? 'blocked'
          : report_query_result.status === 'business_failed'
            ? (primaryExecution.call_result.business_outcome || 'execution_failed')
          : report_query_result.status === 'failed'
            ? 'failed'
            : 'partial_success',
    step_status: planStatus,
    tool_execution_status: primaryExecution.call_result.status === 'business_failed'
      ? 'business_failed'
      : primaryExecution.call_result.status === 'success'
        ? 'called_success'
        : 'called_failed',
    blocking_requirements: Array.from(new Set([
      ...missing_context_fields,
      ...missing_capabilities,
      ...(primaryExecution.result.status === 'success' ? [] : primaryExecution.result.quality_check.missing_fields),
    ])),
    selected,
    input: primaryExecution.adapted.finalArgs,
    call_result: primaryExecution.call_result,
    report_query_result: {
      ...report_query_result,
      query_plan: completedPlan,
    },
    query_plan: completedPlan,
    selection_trace: finalSelectionTrace,
    preflight,
    resolved_filters: resolvedFilters.summary,
    tool_chain: [
      ...tool_chain.filter(item => item.key !== 'business_report'),
      ...executions.map((item, index) => ({
        key: index === 0 ? 'business_report' : `business_report:${item.selected.entry.question_type}`,
        tool_name: item.selected.tool.name,
        server_name: item.selected.server.name,
        status: item.call_result.status === 'success' ? 'success' as const : 'failed' as const,
        required: true,
        input: item.adapted.finalArgs,
        argument_contract: buildArgumentContractTrace({ selected: item.selected, adapted: item.adapted, called: item.selected }),
        result: {
          execution_contract: item.call_result.execution_contract,
          policy_blocked: item.call_result.policy_blocked,
          security_blocked: item.call_result.security_blocked,
          blocking_reason: item.call_result.blocking_reason,
          status: item.result.status,
          business_outcome: item.result.business_outcome,
          tool_execution_status: item.result.tool_execution_status,
          row_count: item.result.rows.length,
          columns: item.result.columns.slice(0, 30),
          message: item.result.message,
          response_payload: item.call_result.business_payload ?? item.call_result.response,
          error: item.call_result.error || item.call_result.business_error,
          error_code: item.call_result.error_code,
          rawResponsePreview: item.call_result.raw_response_preview,
          normalizedErrorCode: item.call_result.normalizedErrorCode,
          normalizedStatus: item.call_result.normalizedStatus,
          calledTool: {
            name: item.selected.tool.name,
            serverId: item.selected.server.id,
            serverName: item.selected.server.name,
          },
          finalArgKeys: item.adapted.finalArgKeys,
          requiredKeys: item.adapted.requiredKeys,
          missingRequiredKeysBeforeCall: item.adapted.missingRequiredKeysBeforeCall,
          droppedKeys: item.adapted.droppedKeys,
          sourceMapping: item.adapted.sourceMapping,
          preflight: item.adapted.preflight,
          canRetryWithSameTool: item.call_result.canRetryWithSameTool,
          suggestedAction: item.call_result.suggestedAction,
          retry: item.call_result.retry,
          latency_ms: item.call_result.latency_ms,
        },
        message: item.result.message,
      })),
      ...fallbackDiagnosticSteps,
    ],
    message: report_query_result.message,
  };
}
