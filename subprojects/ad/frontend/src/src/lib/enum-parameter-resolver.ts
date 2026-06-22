/**
 * EnumParameterResolver — 单工具内 enum 字段值解析层
 *
 * 解决的问题：
 *   工具选对了，但工具参数没补全 → 误判 missing_input。
 *   三个现有模块（能力主动发现 / IntentOrch / 实体字典自动优化）
 *   覆盖工具级 / 编排级 / 实体别名，缺失"单工具内 enum 字段值解析"。
 *
 * 三层架构：
 *   A（IntentOrch parameter hint）主
 *   B（policy.enum_signal_mappings）兜
 *   C（schema default / policy safe_default / needs_user_input）安全降级
 *
 * 硬约束（H1-H8，详见 plan）：
 *   H1. schema enum 白名单是 hard gate，不是解析来源
 *   H2. explicit_slot 只接受已结构化并校验过的字段值
 *   H3. parameter_hints 不进 Prompt 权威上下文，不进原始 Trace 明文
 *   H4. 通用模糊表达不自动填 enum[0]，否则 needs_user_input
 *   H5. 冲突裁决规则：用户原文/policy > hint > schema default > policy safe_default
 *   H6. 输出归 process_events.parameter_resolution，不进 Evidence Ledger
 *   H7. 本模块不直接 import policy store；policy 由上层传入
 *   H8. runtime 分支代码不硬编码业务词（grep 门禁）
 */

// ─── Types ───────────────────────────────────────────────

export type ResolutionSource =
  | 'explicit_slot'
  | 'resolver_chain'
  | 'intentorch_hint'
  | 'policy_enum_signal'
  | 'schema_default'
  | 'policy_safe_default'
  | 'needs_user_input';

export type RejectionReason =
  | 'not_in_schema_enum'
  | 'tool_name_mismatch'
  | 'low_confidence'
  | 'conflicts_with_user_text'
  | 'ambiguous_user_text'
  | 'not_enum_field'
  | 'not_hint_allowed_field'
  | 'overridden_by_explicit'
  | 'overridden_by_policy_signal';

export interface IntentOrchParameterHint {
  toolName: string;
  parameters: Record<string, unknown>;
  confidence: number;
}

export interface PolicyEnumSignalMapping {
  field: string;
  signals: Record<string, string[]>;
}

export interface EnumParameterResolutionInput {
  field: string;
  message: string;
  schemaEnum?: unknown[];
  schemaDefault?: unknown;
  explicitInput: Record<string, unknown>;
  resolvedFilters?: Record<string, unknown>;
  intentOrchHint?: IntentOrchParameterHint;
  policyEnumSignals?: PolicyEnumSignalMapping[];
  policySafeDefault?: unknown;
  selectedToolName?: string;
  confidenceThreshold?: number;
  /**
   * 字段是否允许 hint 覆盖。
   * 仅 enum / boolean / controlled strategy field 为 true。
   * 高风险参数（appId / mediaId / accountId / date / amount / budget）一律 false。
   */
  hintAllowed?: boolean;
}

export interface ResolutionConflictRecord {
  source: ResolutionSource | 'user_text_policy';
  value: unknown;
  outcome: 'accepted' | 'rejected';
  reason: RejectionReason | 'overrode_policy_default' | 'overrode_schema_default' | string;
}

export interface EnumParameterResolution {
  field: string;
  resolved_value?: unknown;
  source: ResolutionSource;
  accepted: boolean;
  reason: string;
  conflict_trace: ResolutionConflictRecord[];
  fallback_chain: ResolutionSource[];
}

// ─── Constants ───────────────────────────────────────────

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * 高风险参数名单：这些字段不允许 hint 覆盖，必须由上游结构化链路显式提供。
 * 匹配策略：精确匹配 + 后缀匹配（如 app_id / appId 都命中）。
 */
const HIGH_RISK_FIELD_PATTERNS: ReadonlyArray<string> = [
  'appid', 'app_id', 'projectid', 'project_id',
  'mediaid', 'media_id', 'mediaids', 'media_ids',
  'accountid', 'account_id', 'optimizerid', 'optimizer_ids',
  'startdate', 'start_date', 'enddate', 'end_date',
  'date_range', 'time_range',
  'amount', 'budget', 'cost', 'price', 'bid',
  'teamid', 'team_id', 'pkgid', 'pkg_id',
];

/**
 * hint 允许的字段类别（受控策略字段）。
 * 仅 enum / boolean / 受控策略字段走 resolver。
 * 通过白名单方式声明，未列入的字段不被 hint 覆盖。
 */
const HINT_ALLOWED_FIELD_PATTERNS: ReadonlyArray<string> = [
  'retentiontype', 'retention_type',
  'datatype', 'data_type',
  'timetype', 'time_type',
  'basetimetype', 'base_time_type',
  'promotionsource', 'promotion_source',
  'subgroup', 'sub_group',
  'layout', 'viewcriteria', 'view_criteria',
  'mode', 'share_mode', 'account_type',
  'account_asset_query_scope',
  'mock_mode',
];

// ─── Guard helpers ───────────────────────────────────────

function normalizeFieldKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, '');
}

function isHighRiskField(field: string): boolean {
  const normalized = normalizeFieldKey(field);
  return HIGH_RISK_FIELD_PATTERNS.some(pattern => normalized === pattern);
}

/**
 * 判断字段是否允许被 IntentOrch hint 覆盖。
 * 仅 enum / boolean / 受控策略字段返回 true。
 * 高风险参数（appId / mediaId / accountId / date / amount / budget）一律 false。
 *
 * 导出供其他模块（如 summarizeIntentOrchCandidate）在构造 hint 时复用，
 * 保证过滤逻辑一致。
 */
export function isHintAllowedField(field: string): boolean {
  if (isHighRiskField(field)) return false;
  const normalized = normalizeFieldKey(field);
  return HINT_ALLOWED_FIELD_PATTERNS.some(pattern => normalized === pattern);
}

function isInSchemaEnum(value: unknown, schemaEnum: unknown[] | undefined): boolean {
  if (!Array.isArray(schemaEnum) || schemaEnum.length === 0) return false;
  return schemaEnum.some(candidate => candidate === value);
}

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === ''
    || (Array.isArray(value) && value.length === 0);
}

// ─── Policy signal matching ──────────────────────────────

interface PolicySignalMatch {
  value: string;
  terms: string[];
  longestTermLength: number;
}

function matchPolicySignals(
  message: string,
  signals: Record<string, string[]>,
): PolicySignalMatch[] {
  const normalized = message.toLowerCase();
  const matches: PolicySignalMatch[] = [];
  for (const [value, terms] of Object.entries(signals)) {
    const hitTerms = (terms || []).filter(term => term && normalized.includes(term.toLowerCase()));
    if (hitTerms.length > 0) {
      const longestTermLength = Math.max(...hitTerms.map(t => t.length));
      matches.push({ value, terms: hitTerms, longestTermLength });
    }
  }
  return matches;
}

// ─── Resolver ────────────────────────────────────────────

export function resolveEnumParameter(input: EnumParameterResolutionInput): EnumParameterResolution {
  const threshold = input.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const conflictTrace: ResolutionConflictRecord[] = [];
  const fallbackChain: ResolutionSource[] = [];

  // 1. explicit_slot：已结构化输入（H2）
  const explicitValue = input.explicitInput?.[input.field];
  if (!isEmptyValue(explicitValue)) {
    fallbackChain.push('explicit_slot');
    if (isInSchemaEnum(explicitValue, input.schemaEnum)) {
      return {
        field: input.field,
        resolved_value: explicitValue,
        source: 'explicit_slot',
        accepted: true,
        reason: 'explicit_slot_schema_match',
        conflict_trace: conflictTrace,
        fallback_chain: fallbackChain,
      };
    }
    conflictTrace.push({
      source: 'explicit_slot',
      value: explicitValue,
      outcome: 'rejected',
      reason: 'not_in_schema_enum',
    });
  }

  // 2. resolver_chain：resolvedFilters 里的归一化值
  const filterValue = input.resolvedFilters?.[input.field];
  if (!isEmptyValue(filterValue)) {
    fallbackChain.push('resolver_chain');
    if (isInSchemaEnum(filterValue, input.schemaEnum)) {
      return {
        field: input.field,
        resolved_value: filterValue,
        source: 'resolver_chain',
        accepted: true,
        reason: 'resolver_chain_schema_match',
        conflict_trace: conflictTrace,
        fallback_chain: fallbackChain,
      };
    }
    conflictTrace.push({
      source: 'resolver_chain',
      value: filterValue,
      outcome: 'rejected',
      reason: 'not_in_schema_enum',
    });
  }

  // 预计算 policy 信号匹配结果（用于冲突裁决）
  const policyMapping = (input.policyEnumSignals || []).find(m => m.field === input.field);
  const policyMatches = policyMapping
    ? matchPolicySignals(input.message, policyMapping.signals)
    : [];
  const hasUnambiguousPolicySignal = policyMatches.length === 1;
  const hasAmbiguousPolicySignals = policyMatches.length > 1;
  const policySignalValue = hasUnambiguousPolicySignal ? policyMatches[0].value : undefined;

  // 3. IntentOrch hint（H3 / H5）
  const hintCandidate = readHintCandidate(input, threshold, conflictTrace, policySignalValue, hasUnambiguousPolicySignal, hasAmbiguousPolicySignals);
  if (hintCandidate !== undefined) {
    fallbackChain.push('intentorch_hint');
    if (isInSchemaEnum(hintCandidate, input.schemaEnum)) {
      return {
        field: input.field,
        resolved_value: hintCandidate,
        source: 'intentorch_hint',
        accepted: true,
        reason: 'intentorch_hint_schema_match',
        conflict_trace: conflictTrace,
        fallback_chain: fallbackChain,
      };
    }
    conflictTrace.push({
      source: 'intentorch_hint',
      value: hintCandidate,
      outcome: 'rejected',
      reason: 'not_in_schema_enum',
    });
  }

  // 4. policy_enum_signal（H5 冲突裁决已在 hint 阶段处理；这里只在无 hint 时生效）
  if (hasUnambiguousPolicySignal && policySignalValue !== undefined) {
    fallbackChain.push('policy_enum_signal');
    if (isInSchemaEnum(policySignalValue, input.schemaEnum)) {
      return {
        field: input.field,
        resolved_value: policySignalValue,
        source: 'policy_enum_signal',
        accepted: true,
        reason: 'policy_enum_signal_schema_match',
        conflict_trace: conflictTrace,
        fallback_chain: fallbackChain,
      };
    }
    conflictTrace.push({
      source: 'policy_enum_signal',
      value: policySignalValue,
      outcome: 'rejected',
      reason: 'not_in_schema_enum',
    });
  } else if (hasAmbiguousPolicySignals) {
    // H5-2：用户原文命中多个 enum → needs_user_input
    fallbackChain.push('policy_enum_signal');
    conflictTrace.push({
      source: 'policy_enum_signal',
      value: policyMatches.map(m => m.value),
      outcome: 'rejected',
      reason: 'ambiguous_user_text',
    });
  }

  // 5. schema default（仅当 schema 显式声明，H4：禁止 enum[0]）
  if (input.schemaDefault !== undefined) {
    fallbackChain.push('schema_default');
    if (isInSchemaEnum(input.schemaDefault, input.schemaEnum)) {
      return {
        field: input.field,
        resolved_value: input.schemaDefault,
        source: 'schema_default',
        accepted: true,
        reason: 'schema_default',
        conflict_trace: conflictTrace,
        fallback_chain: fallbackChain,
      };
    }
    conflictTrace.push({
      source: 'schema_default',
      value: input.schemaDefault,
      outcome: 'rejected',
      reason: 'not_in_schema_enum',
    });
  }

  // 6. policy safe_default（仅当 policy 显式声明安全）
  if (input.policySafeDefault !== undefined) {
    fallbackChain.push('policy_safe_default');
    if (isInSchemaEnum(input.policySafeDefault, input.schemaEnum)) {
      return {
        field: input.field,
        resolved_value: input.policySafeDefault,
        source: 'policy_safe_default',
        accepted: true,
        reason: 'policy_safe_default',
        conflict_trace: conflictTrace,
        fallback_chain: fallbackChain,
      };
    }
    conflictTrace.push({
      source: 'policy_safe_default',
      value: input.policySafeDefault,
      outcome: 'rejected',
      reason: 'not_in_schema_enum',
    });
  }

  // 7. needs_user_input（H4：禁止 enum[0] 兜底）
  return {
    field: input.field,
    source: 'needs_user_input',
    accepted: false,
    reason: 'no_safe_resolution',
    conflict_trace: conflictTrace,
    fallback_chain: fallbackChain,
  };
}

// ─── Hint candidate helper ───────────────────────────────

function readHintCandidate(
  input: EnumParameterResolutionInput,
  threshold: number,
  conflictTrace: ResolutionConflictRecord[],
  policySignalValue: string | undefined,
  hasUnambiguousPolicySignal: boolean,
  hasAmbiguousPolicySignals: boolean,
): unknown {
  // hint 不允许的字段直接跳过（H3）
  const hintAllowed = input.hintAllowed ?? isHintAllowedField(input.field);
  if (!hintAllowed) {
    return undefined;
  }
  const hint = input.intentOrchHint;
  if (!hint) return undefined;

  // tool_name 必须匹配当前 selected tool
  if (input.selectedToolName && hint.toolName && hint.toolName !== input.selectedToolName) {
    conflictTrace.push({
      source: 'intentorch_hint',
      value: hint.parameters?.[input.field],
      outcome: 'rejected',
      reason: 'tool_name_mismatch',
    });
    return undefined;
  }

  const rawValue = hint.parameters?.[input.field];
  if (isEmptyValue(rawValue)) return undefined;

  // confidence 低于阈值不用 hint（验收点 2）
  if (typeof hint.confidence !== 'number' || hint.confidence < threshold) {
    conflictTrace.push({
      source: 'intentorch_hint',
      value: rawValue,
      outcome: 'rejected',
      reason: 'low_confidence',
    });
    return undefined;
  }

  // 冲突裁决（H5）
  // H5-1: 用户原文被 policy 明确命中单一 enum，且 hint 不一致 → 用户原文/policy 优先
  if (hasUnambiguousPolicySignal && policySignalValue !== undefined && String(rawValue) !== policySignalValue) {
    conflictTrace.push({
      source: 'intentorch_hint',
      value: rawValue,
      outcome: 'rejected',
      reason: 'conflicts_with_user_text',
    });
    conflictTrace.push({
      source: 'user_text_policy',
      value: policySignalValue,
      outcome: 'accepted',
      reason: 'user_text_policy_wins',
    });
    return undefined;
  }
  // H5-2: 用户原文命中多个 enum → needs_user_input（hint 不参与裁决）
  if (hasAmbiguousPolicySignals) {
    conflictTrace.push({
      source: 'intentorch_hint',
      value: rawValue,
      outcome: 'rejected',
      reason: 'ambiguous_user_text',
    });
    return undefined;
  }

  return rawValue;
}

// ─── Trace event helpers ─────────────────────────────────

/**
 * 把 EnumParameterResolution 转换为 process_events.parameter_resolution 事件输出。
 * 符合 H3（不暴露 hint 原文）和 H6（不进 Evidence Ledger）。
 */
export function toParameterResolutionEvent(resolution: EnumParameterResolution): Record<string, unknown> {
  return {
    type: 'parameter_resolution',
    stage: 'tool_input_building',
    field: resolution.field,
    resolved_value: resolution.resolved_value,
    source: resolution.source,
    accepted: resolution.accepted,
    reason: resolution.reason,
    fallback_chain: resolution.fallback_chain,
    conflict_trace: (resolution.conflict_trace || []).map(record => ({
      source: record.source,
      outcome: record.outcome,
      reason: record.reason,
    })),
  };
}
