import type { AgentType, IntentType } from '@/types';
import {
  DEFAULT_DOMAIN_PACKS,
  buildAdvertisingIntentRouteSeed,
  hasAdvertisingDomainSignal,
  normalizeDomainPacks,
  type DomainPackConfig,
} from './advertising-domain-pack';

export type IntentRuleMatchMode = 'contains' | 'regex';
export type IntentRuleStatus = 'active' | 'inactive' | 'draft' | 'archived';
export type IntentRouteDecisionScope = 'candidate' | 'fallback' | 'execution_gate';
export type IntentRouteExecutionAuthority = 'candidate_only' | 'requires_arbitration' | 'execution_authorized';

export interface IntentRouteRule {
  id: string;
  policy_id?: string;
  policy_version?: number;
  decision_scope?: IntentRouteDecisionScope;
  candidate_only?: boolean;
  execution_authority?: IntentRouteExecutionAuthority;
  name: string;
  description: string;
  intent_type: IntentType;
  agent: AgentType;
  workflow_level: 'light' | 'heavy';
  confidence: 'high' | 'medium' | 'low';
  priority: number;
  status: IntentRuleStatus;
  enabled: boolean;
  rollout_percent: number;
  match_mode: IntentRuleMatchMode;
  include_terms: string[];
  exclude_terms: string[];
  required_tool_keywords: string[];
  reason_template: string;
  updated_at: string;
  source_pack?: string;
}

export interface IntentRouteRuleVersion {
  version: number;
  note: string;
  created_at: string;
  rules: IntentRouteRule[];
}

export interface IntentRouteRulesConfig {
  schema_version: 1;
  active_version: number;
  current_version: number;
  updated_at: string;
  packs: DomainPackConfig[];
  rules: IntentRouteRule[];
  versions: IntentRouteRuleVersion[];
}

export interface IntentRuleCandidate {
  rule: IntentRouteRule;
  score: number;
  matched_terms: string[];
  excluded_terms: string[];
  tool_available: boolean;
  tool_matches: string[];
  rollout_hit: boolean;
  reasons: string[];
  policy_id: string;
  policy_version: number;
  decision_scope: IntentRouteDecisionScope;
  execution_authority: IntentRouteExecutionAuthority;
}

export const CORE_INTENT_ROUTE_RULES: IntentRouteRule[] = [
  {
    id: 'diagnosis',
    name: '问题排查',
    description: '用于异常、差异、失败、数据不一致等排查请求。',
    intent_type: 'diagnosis',
    agent: 'diagnosis',
    workflow_level: 'heavy',
    confidence: 'high',
    priority: 70,
    status: 'active',
    enabled: true,
    rollout_percent: 100,
    match_mode: 'contains',
    include_terms: ['异常', '排查', '不一致', '差异', '失败', '报错', '为什么'],
    exclude_terms: [],
    required_tool_keywords: ['diagnosis', 'log', 'report', 'trace'],
    reason_template: '识别到异常、差异或失败排查诉求，进入问题排查链路。',
    updated_at: '2026-06-01T00:00:00.000Z',
  },
];

export const DEFAULT_INTENT_ROUTE_RULES: IntentRouteRule[] = [
  ...CORE_INTENT_ROUTE_RULES,
  ...buildAdvertisingIntentRouteSeed(DEFAULT_DOMAIN_PACKS),
];

function normalizeTerms(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

export function normalizeIntentRouteRule(input: Partial<IntentRouteRule>, fallbackId?: string): IntentRouteRule {
  const now = new Date().toISOString();
  const id = String(input.id || fallbackId || `rule-${Date.now()}`).trim();
  return {
    id,
    policy_id: String(input.policy_id || `intent-route:${id}`).trim(),
    policy_version: Number.isFinite(input.policy_version) ? Number(input.policy_version) : 1,
    decision_scope: input.decision_scope || 'candidate',
    candidate_only: input.candidate_only !== false,
    execution_authority: input.execution_authority || 'requires_arbitration',
    name: String(input.name || id).trim(),
    description: String(input.description || '').trim(),
    intent_type: input.intent_type || 'general',
    agent: input.agent || 'hub',
    workflow_level: input.workflow_level || 'light',
    confidence: input.confidence || 'medium',
    priority: Number.isFinite(input.priority) ? Number(input.priority) : 50,
    status: input.status || (input.enabled === false ? 'inactive' : 'active'),
    enabled: input.enabled !== false,
    rollout_percent: Math.max(0, Math.min(100, Number(input.rollout_percent ?? 100))),
    match_mode: input.match_mode || 'contains',
    include_terms: normalizeTerms(input.include_terms),
    exclude_terms: normalizeTerms(input.exclude_terms),
    required_tool_keywords: normalizeTerms(input.required_tool_keywords),
    reason_template: String(input.reason_template || input.description || '命中后台配置的意图规则。').trim(),
    updated_at: String(input.updated_at || now),
    source_pack: String(input.source_pack || '').trim() || undefined,
  };
}

function buildDefaultRules(packs?: DomainPackConfig[] | null): IntentRouteRule[] {
  return [
    ...CORE_INTENT_ROUTE_RULES,
    ...buildAdvertisingIntentRouteSeed(packs),
  ].map(rule => normalizeIntentRouteRule(rule));
}

export function normalizeIntentRouteRulesConfig(input?: Partial<IntentRouteRulesConfig>): IntentRouteRulesConfig {
  const now = new Date().toISOString();
  const packs = normalizeDomainPacks(input?.packs);
  const rules = Array.isArray(input?.rules) && input.rules.length
    ? input.rules.map((rule, index) => normalizeIntentRouteRule(rule, `rule-${index + 1}`))
    : buildDefaultRules(packs);
  const currentVersion = Number(input?.current_version || input?.active_version || 1);
  const versions = Array.isArray(input?.versions) && input.versions.length
    ? input.versions.map((item) => ({
      version: Number(item.version || 1),
      note: String(item.note || ''),
      created_at: String(item.created_at || now),
      rules: Array.isArray(item.rules) ? item.rules.map((rule, index) => normalizeIntentRouteRule(rule, `rule-${index + 1}`)) : rules,
    }))
    : [{ version: currentVersion, note: 'initial', created_at: now, rules }];
  return {
    schema_version: 1,
    active_version: Number(input?.active_version || currentVersion),
    current_version: currentVersion,
    updated_at: String(input?.updated_at || now),
    packs,
    rules,
    versions,
  };
}

export function evaluateIntentRouteRules(params: {
  message: string;
  rules: IntentRouteRule[];
  toolNames?: string[];
  userKey?: string;
}): IntentRuleCandidate[] {
  const message = params.message || '';
  const lowerMessage = message.toLowerCase();
  const toolNames = (params.toolNames || []).map((item) => item.toLowerCase());

  return params.rules
    .filter((rule) => rule.enabled && rule.status === 'active')
    .map((rule) => {
      const matchedTerms = rule.include_terms.filter((term) => matchTerm(message, lowerMessage, term, rule.match_mode));
      const excludedTerms = rule.exclude_terms.filter((term) => matchTerm(message, lowerMessage, term, rule.match_mode));
      const toolMatches = rule.required_tool_keywords.filter((term) => toolNames.some((toolName) => toolName.includes(term.toLowerCase())));
      const toolAvailable = rule.required_tool_keywords.length === 0 || toolMatches.length > 0;
      const rolloutHit = isRolloutHit(`${params.userKey || ''}:${message}:${rule.id}`, rule.rollout_percent);
      const matchedScore = matchedTerms.length * 18;
      const toolScore = toolAvailable ? 15 : -20;
      const excludedScore = excludedTerms.length * -35;
      const rolloutScore = rolloutHit ? 0 : -1000;
      const score = rule.priority + matchedScore + toolScore + excludedScore + rolloutScore;
      const reasons = [
        matchedTerms.length ? `matched:${matchedTerms.join(',')}` : 'no keyword match',
        toolAvailable ? `tool_available:${toolMatches.join(',') || 'not_required'}` : 'tool_unavailable',
        excludedTerms.length ? `excluded:${excludedTerms.join(',')}` : '',
        rolloutHit ? `rollout:${rule.rollout_percent}%` : `rollout_miss:${rule.rollout_percent}%`,
      ].filter(Boolean);
      return {
        rule,
        score,
        matched_terms: matchedTerms,
        excluded_terms: excludedTerms,
        tool_available: toolAvailable,
        tool_matches: toolMatches,
        rollout_hit: rolloutHit,
        reasons,
        policy_id: rule.policy_id || `intent-route:${rule.id}`,
        policy_version: rule.policy_version || 1,
        decision_scope: rule.decision_scope || 'candidate',
        execution_authority: rule.execution_authority || 'requires_arbitration',
      };
    })
    .filter((candidate) => candidate.matched_terms.length > 0 && candidate.rollout_hit)
    .sort((a, b) => b.score - a.score);
}

export function matchesDebuggingRoute(message: string, rules?: Partial<IntentRouteRulesConfig> | null): boolean {
  const config = normalizeIntentRouteRulesConfig(rules || undefined);
  return evaluateIntentRouteRules({ message, rules: config.rules })
    .some((candidate) => candidate.rule.intent_type === 'debugging');
}

function isDiagnosticExpression(message: string): boolean {
  return /(为什么|为何|异常|下降|下滑|对不上|不一致|没数|少了|多了|排查|诊断|原因|报错|失败|problem|issue|root\s*cause)/i.test(message);
}

function hasStrongReportQueryEvidence(message: string): boolean {
  const text = message.replace(/\s+/g, '');
  if (isDiagnosticExpression(text)) return false;
  const hasMetric = hasAdvertisingDomainSignal(text, ['metric']);
  const hasBusinessObject = hasAdvertisingDomainSignal(text, ['businessObject', 'media']);
  const hasReportAction = /(查数|查询|看下|看看|查看|统计|取数|明细|日报|周报|月报|生成|导出|订阅|拼表|拉取|下载|分析)/i.test(text);
  const hasTrendOrCompare = /(趋势|走势|对比|比较|排名|环比|同比|变化)/i.test(text);
  const hasValueQuestion = /(多少|几|是多少|值是多少|有多少)/i.test(text);
  const hasTime = /(今天|今日|昨天|昨日|上周|本周|本月|近\d{1,3}天|最近\d{1,3}天|过去\d{1,3}天|日期|时间|day|daily|hour|hourly)/i.test(text);
  const hasFileWorkflow = /(上传.*(excel|表|模板)|excel.*(模板|表)|按模板|模板取数|拼表)/i.test(text);
  return Boolean(
    hasFileWorkflow
    || (hasReportAction && (hasMetric || hasTime || hasBusinessObject))
    || (hasTrendOrCompare && (hasMetric || hasBusinessObject || hasTime))
    || (hasValueQuestion && hasMetric && (hasTime || hasBusinessObject))
    || (hasTime && hasMetric && hasBusinessObject)
  );
}

export function matchesReportQueryRoute(message: string, rules?: Partial<IntentRouteRulesConfig> | null): boolean {
  if (isDiagnosticExpression(message)) return false;
  const config = normalizeIntentRouteRulesConfig(rules || undefined);
  const candidates = evaluateIntentRouteRules({ message, rules: config.rules });
  if (candidates.some((candidate) => candidate.rule.intent_type === 'report_query' && candidate.matched_terms.length >= 2)) return true;
  return hasStrongReportQueryEvidence(message);
}

function matchTerm(message: string, lowerMessage: string, term: string, mode: IntentRuleMatchMode): boolean {
  if (!term) return false;
  if (mode === 'regex') {
    try {
      return new RegExp(term, 'i').test(message);
    } catch {
      return false;
    }
  }
  return lowerMessage.includes(term.toLowerCase());
}

function isRolloutHit(seed: string, percent: number): boolean {
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % 100 < percent;
}
