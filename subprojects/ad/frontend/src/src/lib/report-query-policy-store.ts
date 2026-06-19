import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_DOMAIN_PACKS,
  buildAdvertisingReportPolicySeed,
  normalizeDomainPacks,
  type DomainPackConfig,
} from './advertising-domain-pack';
import { runtimeDataPath } from './runtime-data-path';
import type { EntityType, IdentifierKey } from '@/contracts/request-understanding/entity-resolution';
import type { ReportQuestionType } from './report-query-orchestrator';

export interface ReportQueryToolSelectionRule {
  id: string;
  question_type: ReportQuestionType;
  priority: number;
  include_terms: string[];
  exclude_terms: string[];
  tool_keywords: string[];
  default_metrics: string[];
  default_dimensions: string[];
  description: string;
  source_key?: string;
}

export interface ReportQuerySchemaAdapter {
  id: string;
  question_type: ReportQuestionType | 'default';
  tool_keywords: string[];
  required_defaults: Record<string, unknown>;
  promotion_source?: {
    argument_key?: string;
    internal_values?: string[];
    default_internal?: string;
    media_default_internal?: string;
    source_terms?: Record<string, string[]>;
    external_values?: Record<string, string[]>;
  };
  modeled_argument_keys?: string[];
}

export type ReportQueryCapabilityType = string;

export interface ReportQueryCapabilityConfig {
  id: string;
  capability_type: ReportQueryCapabilityType;
  required: boolean;
  tool_keywords: string[];
  description: string;
  missing_message: string;
  label?: string;
  entity_type?: EntityType;
  identifier_key?: IdentifierKey;
  alias_record?: string;
  target_keys?: string[];
  slot_mappings?: Array<{
    entity_type: EntityType;
    identifier_key: IdentifierKey;
    target_keys: string[];
    summary_key?: string;
    value_format?: 'array' | 'string' | 'csv';
    required?: boolean;
  }>;
  summary_key?: string;
  source_key?: string;
  step_key?: string;
  id_keys?: string[];
  name_keys?: string[];
  value_format?: 'array' | 'string' | 'csv';
}

export interface ReportQuerySemanticDefaults {
  promotion_source: string;
  roi_data_type: string;
  day_time_type: string;
  week_time_type: string;
  month_time_type: string;
  hour_time_type: string;
  base_time_type: string;
  media_aliases: Record<string, string[]>;
  terminal_aliases: Record<string, string[]>;
  team_aliases: Record<string, string[]>;
  app_package_type_aliases: Record<string, string[]>;
  account_aliases: Record<string, string[]>;
  package_aliases: Record<string, string[]>;
  optimizer_aliases: Record<string, string[]>;
}

export interface ReportQueryProjectResolutionPolicy {
  schema_version: 1;
  enabled: boolean;
  packs: DomainPackConfig[];
  default_project_source: 'conversation_context';
  lookup_tool_step_key: string;
  lookup_tool_keywords: string[];
  trigger_terms: string[];
  exclude_terms: string[];
  require_chinese_project_name: boolean;
  skip_when_app_id_present: boolean;
  tool_selection_rules: ReportQueryToolSelectionRule[];
  schema_adapters: ReportQuerySchemaAdapter[];
  capabilities: ReportQueryCapabilityConfig[];
  semantic_defaults: ReportQuerySemanticDefaults;
  updated_at: string;
}

const STORE_PATH = runtimeDataPath('report-query-policy.json');

const GENERIC_SEMANTIC_DEFAULTS: ReportQuerySemanticDefaults = {
  promotion_source: '',
  roi_data_type: 'total',
  day_time_type: 'DAY',
  week_time_type: 'NATURAL_WEEK',
  month_time_type: 'NATURAL_MONTH',
  hour_time_type: 'HOURLY',
  base_time_type: 'EVENT_TIME',
  media_aliases: {},
  terminal_aliases: {},
  team_aliases: {},
  app_package_type_aliases: {},
  account_aliases: {},
  package_aliases: {},
  optimizer_aliases: {},
};

function buildSeedPolicy(packs?: DomainPackConfig[] | null) {
  return buildAdvertisingReportPolicySeed(packs);
}

function defaultPolicy(packs = DEFAULT_DOMAIN_PACKS): ReportQueryProjectResolutionPolicy {
  const seed = buildSeedPolicy(packs);
  return {
    schema_version: 1,
    enabled: true,
    packs,
    default_project_source: 'conversation_context',
    lookup_tool_step_key: 'list_all_apps',
    lookup_tool_keywords: ['list_all_apps', 'android_app_list_v2', 'app_list'],
    trigger_terms: ['对比', '比较', '另一个', '其它项目', '其他项目'],
    exclude_terms: ['只看当前项目', '仅当前项目', '不用对比', '不对比'],
    require_chinese_project_name: true,
    skip_when_app_id_present: true,
    tool_selection_rules: seed.tool_selection_rules,
    schema_adapters: seed.schema_adapters,
    capabilities: seed.capabilities,
    semantic_defaults: seed.semantic_defaults,
    updated_at: new Date().toISOString(),
  };
}

function normalizeList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const next = value.map(item => String(item || '').trim()).filter(Boolean);
  return next.length ? next : fallback;
}

function normalizeStringRecord(value: unknown, fallback: Record<string, string[]>): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const output: Record<string, string[]> = {};
  for (const [key, rawList] of Object.entries(value)) {
    const list = Array.isArray(rawList) ? rawList.map(item => String(item || '').trim()).filter(Boolean) : [];
    if (key.trim() && list.length) output[key.trim()] = list;
  }
  return Object.keys(output).length ? output : fallback;
}

function normalizeToolRule(input: Partial<ReportQueryToolSelectionRule>, fallback?: Partial<ReportQueryToolSelectionRule>): ReportQueryToolSelectionRule {
  const questionType = (input.question_type || fallback?.question_type || 'daily') as ReportQuestionType;
  return {
    id: String(input.id || fallback?.id || `${questionType}-rule`).trim(),
    question_type: questionType,
    priority: Number.isFinite(input.priority) ? Number(input.priority) : Number(fallback?.priority ?? 50),
    include_terms: normalizeList(input.include_terms, fallback?.include_terms || []),
    exclude_terms: normalizeList(input.exclude_terms, fallback?.exclude_terms || []),
    tool_keywords: normalizeList(input.tool_keywords, fallback?.tool_keywords || []),
    default_metrics: normalizeList(input.default_metrics, fallback?.default_metrics || []),
    default_dimensions: normalizeList(input.default_dimensions, fallback?.default_dimensions || []),
    description: String(input.description || fallback?.description || '').trim(),
    source_key: String(input.source_key || fallback?.source_key || '').trim() || undefined,
  };
}

function normalizeSchemaAdapter(input: Partial<ReportQuerySchemaAdapter>, fallback?: Partial<ReportQuerySchemaAdapter>): ReportQuerySchemaAdapter {
  const promotionSource = input.promotion_source || fallback?.promotion_source;
  return {
    id: String(input.id || fallback?.id || 'schema-adapter').trim(),
    question_type: (input.question_type || fallback?.question_type || 'default') as ReportQuerySchemaAdapter['question_type'],
    tool_keywords: normalizeList(input.tool_keywords, fallback?.tool_keywords || []),
    required_defaults: input.required_defaults && typeof input.required_defaults === 'object' && !Array.isArray(input.required_defaults)
      ? input.required_defaults as Record<string, unknown>
      : fallback?.required_defaults || {},
    promotion_source: promotionSource && typeof promotionSource === 'object' && !Array.isArray(promotionSource)
      ? {
        argument_key: String(promotionSource.argument_key || fallback?.promotion_source?.argument_key || '').trim() || undefined,
        internal_values: normalizeList(promotionSource.internal_values, fallback?.promotion_source?.internal_values || []),
        default_internal: String(promotionSource.default_internal || fallback?.promotion_source?.default_internal || '').trim() || undefined,
        media_default_internal: String(promotionSource.media_default_internal || fallback?.promotion_source?.media_default_internal || '').trim() || undefined,
        source_terms: normalizeStringRecord(promotionSource.source_terms, fallback?.promotion_source?.source_terms || {}),
        external_values: normalizeStringRecord(promotionSource.external_values, fallback?.promotion_source?.external_values || {}),
      }
      : fallback?.promotion_source,
    modeled_argument_keys: normalizeList(input.modeled_argument_keys, fallback?.modeled_argument_keys || []),
  };
}

function normalizeCapability(input: Partial<ReportQueryCapabilityConfig>, fallback?: Partial<ReportQueryCapabilityConfig>): ReportQueryCapabilityConfig {
  return {
    id: String(input.id || fallback?.id || input.capability_type || 'capability').trim(),
    capability_type: (input.capability_type || fallback?.capability_type || 'business_report') as ReportQueryCapabilityType,
    required: typeof input.required === 'boolean' ? input.required : fallback?.required !== false,
    tool_keywords: normalizeList(input.tool_keywords, fallback?.tool_keywords || []),
    description: String(input.description || fallback?.description || '').trim(),
    missing_message: String(input.missing_message || fallback?.missing_message || '').trim(),
    label: String(input.label || fallback?.label || '').trim() || undefined,
    entity_type: (input.entity_type || fallback?.entity_type) as EntityType | undefined,
    identifier_key: (input.identifier_key || fallback?.identifier_key) as IdentifierKey | undefined,
    alias_record: String(input.alias_record || fallback?.alias_record || '').trim() || undefined,
    target_keys: normalizeList(input.target_keys, fallback?.target_keys || []),
    slot_mappings: Array.isArray(input.slot_mappings)
      ? input.slot_mappings
      : Array.isArray(fallback?.slot_mappings)
        ? fallback.slot_mappings
        : undefined,
    summary_key: String(input.summary_key || fallback?.summary_key || '').trim() || undefined,
    source_key: String(input.source_key || fallback?.source_key || '').trim() || undefined,
    step_key: String(input.step_key || fallback?.step_key || '').trim() || undefined,
    id_keys: normalizeList(input.id_keys, fallback?.id_keys || []),
    name_keys: normalizeList(input.name_keys, fallback?.name_keys || []),
    value_format: (input.value_format || fallback?.value_format) as ReportQueryCapabilityConfig['value_format'],
  };
}

function normalizeSemanticDefaults(
  input: Partial<ReportQuerySemanticDefaults> | undefined,
  fallback: ReportQuerySemanticDefaults,
): ReportQuerySemanticDefaults {
  return {
    ...GENERIC_SEMANTIC_DEFAULTS,
    ...fallback,
    ...input,
    media_aliases: normalizeStringRecord(input?.media_aliases, fallback.media_aliases),
    terminal_aliases: normalizeStringRecord(input?.terminal_aliases, fallback.terminal_aliases),
    team_aliases: normalizeStringRecord(input?.team_aliases, fallback.team_aliases),
    app_package_type_aliases: normalizeStringRecord(input?.app_package_type_aliases, fallback.app_package_type_aliases),
    account_aliases: normalizeStringRecord(input?.account_aliases, fallback.account_aliases),
    package_aliases: normalizeStringRecord(input?.package_aliases, fallback.package_aliases),
    optimizer_aliases: normalizeStringRecord(input?.optimizer_aliases, fallback.optimizer_aliases),
  };
}

function normalizeRuleList<T extends { id: string }>(
  input: T[] | undefined,
  fallback: T[],
  normalize: (item: Partial<T>, fallback?: Partial<T>) => T,
): T[] {
  const source = Array.isArray(input) && input.length ? input : fallback;
  return source.map((item) => {
    const seed = fallback.find(candidate => candidate.id === item.id);
    return normalize(item, seed);
  });
}

export function normalizeReportQueryPolicy(input?: Partial<ReportQueryProjectResolutionPolicy>): ReportQueryProjectResolutionPolicy {
  const packs = normalizeDomainPacks(input?.packs);
  const seed = buildSeedPolicy(packs);
  const fallback = defaultPolicy(packs);
  const rules = normalizeRuleList(input?.tool_selection_rules, seed.tool_selection_rules, normalizeToolRule);
  const adapters = normalizeRuleList(input?.schema_adapters, seed.schema_adapters, normalizeSchemaAdapter);
  const capabilities = normalizeRuleList(input?.capabilities, seed.capabilities, normalizeCapability);

  return {
    ...fallback,
    ...input,
    schema_version: 1,
    enabled: input?.enabled !== false,
    packs,
    default_project_source: 'conversation_context',
    lookup_tool_step_key: String(input?.lookup_tool_step_key || fallback.lookup_tool_step_key).trim() || fallback.lookup_tool_step_key,
    lookup_tool_keywords: normalizeList(input?.lookup_tool_keywords, fallback.lookup_tool_keywords),
    trigger_terms: normalizeList(input?.trigger_terms, fallback.trigger_terms),
    exclude_terms: normalizeList(input?.exclude_terms, fallback.exclude_terms),
    require_chinese_project_name: input?.require_chinese_project_name !== false,
    skip_when_app_id_present: input?.skip_when_app_id_present !== false,
    tool_selection_rules: rules.sort((a, b) => b.priority - a.priority),
    schema_adapters: adapters,
    capabilities,
    semantic_defaults: normalizeSemanticDefaults(input?.semantic_defaults, seed.semantic_defaults),
    updated_at: String(input?.updated_at || new Date().toISOString()),
  };
}

export function loadReportQueryPolicySync(): ReportQueryProjectResolutionPolicy {
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, 'utf8');
      return normalizeReportQueryPolicy(JSON.parse(raw) as Partial<ReportQueryProjectResolutionPolicy>);
    }
  } catch {
    // Fall back to the built-in seed.
  }
  return normalizeReportQueryPolicy();
}

export async function saveReportQueryPolicy(
  patch: Partial<ReportQueryProjectResolutionPolicy>,
): Promise<ReportQueryProjectResolutionPolicy> {
  const next = normalizeReportQueryPolicy({
    ...loadReportQueryPolicySync(),
    ...patch,
    updated_at: new Date().toISOString(),
  });
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export function shouldUseProjectLookup(params: {
  message: string;
  baseInput: Record<string, unknown>;
  policy?: ReportQueryProjectResolutionPolicy;
}): { use_lookup: boolean; reason: string; matched_terms: string[] } {
  const policy = params.policy || loadReportQueryPolicySync();
  if (!policy.enabled) return { use_lookup: false, reason: 'policy_disabled', matched_terms: [] };
  if (policy.skip_when_app_id_present && (params.baseInput.appId || params.baseInput.app_id)) {
    return { use_lookup: false, reason: 'app_id_already_present', matched_terms: [] };
  }
  const message = params.message || '';
  const excluded = policy.exclude_terms.filter(term => term && message.includes(term));
  if (excluded.length > 0) return { use_lookup: false, reason: `excluded:${excluded.join(',')}`, matched_terms: [] };
  const matched = policy.trigger_terms.filter(term => term && message.includes(term));
  if (matched.length === 0) return { use_lookup: false, reason: 'no_cross_project_signal', matched_terms: [] };
  if (policy.require_chinese_project_name && !/[\u4e00-\u9fa5]{2,}/.test(message)) {
    return { use_lookup: false, reason: 'no_chinese_project_name', matched_terms: matched };
  }
  return { use_lookup: true, reason: 'policy_matched', matched_terms: matched };
}
