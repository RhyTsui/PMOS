import type {
  AgentType,
  BusinessContextSnapshot,
  IntentType,
  MissingField,
  RoleProfile,
  SlotState,
  UserPreferenceProfile,
} from '@/types';
import { missingSlotsToFields } from './slot-resolver';
import {
  createEmptyUserRequirement,
  type RequirementDimension,
  type RequestedView,
  type RequestServiceIntent,
  type RequestTask,
  type UserRequirementContract,
} from '@/contracts/request-understanding/user-requirement-contract';
import type { EntityDependency, EntityType } from '@/contracts/request-understanding/entity-resolution';
import { findEntityResolutionCandidates, loadEntityResolutionConfigSync } from './entity-resolution-config-store';
import type { RequestSemanticFrame } from '@/contracts/request-understanding/semantic-frame-contract';
import { evaluateIntentRouteRules, normalizeIntentRouteRulesConfig, type IntentRouteRulesConfig } from './intent-route-rules';
import {
  buildAdvertisingRequestSignals,
  hasAdvertisingDomainSignal,
  matchDomainSignalTerms,
} from './advertising-domain-pack';
import type { CapabilitySelectionCandidate } from '@/contracts/capability/capability-manifest';
import { parseRelativeDateRange } from './date-range-resolver';
import { detectFieldDefinitionSignal } from './field-definition-resolver';
import { METRIC_CATALOG } from '@/contracts/business-semantics/metric-catalog';
import { DIMENSION_CATALOG } from '@/contracts/business-semantics/dimension-catalog';

function hasEntityHint(hints: Array<{ entityType: EntityType; rawText: string }>, entityType: EntityType): boolean {
  return hints.findIndex(item => item.entityType === entityType) >= 0;
}

function hasEntityHintText(hints: Array<{ entityType: EntityType; rawText: string }>, entityType: EntityType, rawText: string): boolean {
  return hints.findIndex(item => item.entityType === entityType && item.rawText === rawText) >= 0;
}

export interface RequestRouteDecision {
  intent_type: IntentType;
  agent: AgentType;
  is_business_related: boolean;
  workflow_level: 'light' | 'heavy';
  confidence: 'high' | 'medium' | 'low';
  requiresExecution: boolean;
  executionConfidence: 'high' | 'medium' | 'low';
  reason: string;
  required_slots: string[];
  missing_fields: MissingField[];
  clarification_needed: boolean;
  suggested_actions: string[];
  tracking_target?: string;
}

export interface LlmIntentSignal {
  intent_type: IntentType;
  confidence: number;
  reason: string;
  serviceIntent?: string;
  requiresExecution?: boolean;
}

export interface RequestRoutingContext {
  roleProfile?: RoleProfile | null;
  preferenceProfile?: UserPreferenceProfile | null;
  businessContext?: BusinessContextSnapshot | null;
  slotState?: SlotState | null;
  routeRules?: Partial<IntentRouteRulesConfig> | null;
  capabilityCandidates?: CapabilitySelectionCandidate[];
  llmIntentSignal?: LlmIntentSignal | null;
  semanticFrame?: RequestSemanticFrame | null;
  clientIntent?: string | null;
}

export function normalizeUserQuestionText(message: string): string {
  const numberedPrefix = /^\s*(?:[?']?\d{1,3}[)）][.、．:：]?|\d{1,3}[.、．:：])\s*/;
  let text = String(message || '').trim();
  while (numberedPrefix.test(text)) {
    text = text.replace(numberedPrefix, '').trim();
  }
  return text;
}

function inferEntityHints(message: string): Array<{ entityType: EntityType; rawText: string }> {
  const text = message;
  const hints: Array<{ entityType: EntityType; rawText: string }> = [];
  const add = (entityType: EntityType, rawText?: string) => {
    const normalized = String(rawText || '').trim();
    if (!normalized) return;
    if (hasEntityHintText(hints, entityType, normalized)) return;
    hints.push({ entityType, rawText: normalized });
  };

  if (/(media|platform|媒体|平台)/i.test(text)) add('media', RegExp.$1);
  if (/(应用|app|APPID|app_id|项目|包名)/i.test(text)) add('app', RegExp.$1);
  if (/(计划|campaign|广告计划)/i.test(text)) add('campaign', RegExp.$1);
  if (/(素材|创意|material|creative)/i.test(text)) add('material', RegExp.$1);
  if (/(账户|account)/i.test(text)) add('account', RegExp.$1);
  if (/(团队|team)/i.test(text)) add('team', RegExp.$1);
  if (/(包体|package|pkg)/i.test(text)) add('package', RegExp.$1);
  if (/(终端|terminal|device)/i.test(text)) add('terminal', RegExp.$1);

  return hints;
}

function hasExplicitTeamIdentifier(message: string, hints: Array<{ entityType: EntityType; rawText: string }>): boolean {
  return /team[_\s-]?\d+|team[_\s-]?id|团队[_\s-]?\d+/i.test(message)
    || hints.findIndex(item => item.entityType === 'team' && /[\dA-Za-z_-]/.test(item.rawText)) >= 0;
}

function inferRequiredIdentifiers(
  message: string,
  dimensions: RequirementDimension[],
  hints: Array<{ entityType: EntityType; rawText: string }>,
): EntityDependency[] {
  const required: EntityDependency[] = [];
  const add = (entityType: EntityType, identifierKey: EntityDependency['identifierKey'], condition: boolean) => {
    if (!condition) return;
    if (required.some(item => item.identifierKey === identifierKey)) return;
    required.push({ entityType, identifierKey, required: true });
  };

  const dimensionKeys = new Set(dimensions.map(item => item.key));
  add('media', 'media_id', dimensionKeys.has('media') || hasEntityHint(hints, 'media'));
  add('app', 'app_id', dimensionKeys.has('app') || hasEntityHint(hints, 'app'));
  add('campaign', 'campaign_id', dimensionKeys.has('campaign') || hasEntityHint(hints, 'campaign'));
  add('material', 'material_id', dimensionKeys.has('material') || hasEntityHint(hints, 'material'));
  add('account', 'account_id', dimensionKeys.has('account') || hasEntityHint(hints, 'account'));
  add('team', 'team_id', hasExplicitTeamIdentifier(message, hints));
  add('app_package_type', 'app_package_type', dimensionKeys.has('app_package_type') || hasEntityHint(hints, 'app_package_type'));
  add('package', 'app_package_id', dimensionKeys.has('package') || hasEntityHint(hints, 'package'));
  add('terminal', 'terminal_id', dimensionKeys.has('terminal') || hasEntityHint(hints, 'terminal'));
  add('terminal_os', 'os_type', dimensionKeys.has('terminal_os') || hasEntityHint(hints, 'terminal_os'));
  return required;
}

function inferEntityHintsV2(message: string): Array<{ entityType: EntityType; rawText: string }> {
  const hints: Array<{ entityType: EntityType; rawText: string }> = [];
  const add = (entityType: EntityType, rawText?: string) => {
    const normalized = String(rawText || '').trim();
    if (!normalized) return;
    if (hasEntityHintText(hints, entityType, normalized)) return;
    hints.push({ entityType, rawText: normalized });
  };

  const catalog = loadEntityResolutionConfigSync();
  for (const entityType of ['media', 'app', 'campaign', 'material', 'account', 'team', 'app_package_type', 'package', 'terminal_os', 'terminal'] as EntityType[]) {
    const candidates = findEntityResolutionCandidates(message, entityType, catalog);
    if (candidates.length) {
      add(entityType, candidates[0].canonical || candidates[0].aliases[0] || message);
    }
  }

  const regexHints: Array<[EntityType, RegExp]> = [
    ['media', /(media|platform|媒体|平台)/i],
    ['app', /(应用|app|APPID|app_id|项目|包名)/i],
    ['campaign', /(计划|campaign|广告计划)/i],
    ['material', /(素材|创意|material|creative)/i],
    ['account', /(账户|account)/i],
    ['team', /(团队|team)/i],
    ['app_package_type', /(应用类型|包体类型|app\s*package\s*type|package\s*type)/i],
    ['package', /(包体|package|pkg)/i],
    ['terminal', /(终端|terminal|device)/i],
  ];

  for (const [entityType, pattern] of regexHints) {
    if (hasEntityHint(hints, entityType)) continue;
    const match = pattern.exec(message);
    if (match?.[1] && !isGenericEntityLabel(entityType, match[1])) add(entityType, match[1]);
  }
  if (hasEntityHint(hints, 'terminal_os')) {
    for (let index = hints.length - 1; index >= 0; index -= 1) {
      if (hints[index].entityType === 'terminal') hints.splice(index, 1);
    }
  }

  return hints;
}

function isGenericEntityLabel(entityType: EntityType, rawText: string): boolean {
  const normalized = rawText.trim().toLowerCase();
  const genericLabels: Partial<Record<EntityType, string[]>> = {
    media: ['media', 'platform', '媒体', '平台', '渠道'],
    app: ['应用', 'app', '项目', '包名'],
    campaign: ['计划', 'campaign', '广告计划'],
    material: ['素材', '创意', 'material', 'creative'],
    account: ['账户', 'account'],
    team: ['团队', 'team'],
    app_package_type: ['应用类型', '包体类型', 'app package type', 'package type'],
    package: ['包体', 'package', 'pkg'],
    terminal: ['终端', 'terminal', 'device'],
  };
  return (genericLabels[entityType] || []).some(label => label.toLowerCase() === normalized);
}

function hasOutputDimensionCueForKey(message: string, key: string): boolean {
  const text = message.replace(/\s+/g, '');
  const labels: Record<string, string[]> = {
    media: ['媒体', '渠道', 'media', 'platform'],
    app: ['应用', 'app', '项目'],
    app_package_type: ['应用类型', '包体类型', 'app_package_type', 'package_type'],
    team: ['团队', 'team'],
    account: ['账户', '账号', 'account'],
    campaign: ['计划', 'campaign'],
    material: ['素材', '创意', 'material', 'creative'],
    terminal: ['终端', 'terminal'],
    terminal_os: ['安卓', 'Android', '苹果', 'iOS', '终端系统', 'os'],
  };
  const cue = '(按|分组|分维度|拆分|细分|各|每个|哪个|哪些|排名|排行|最高|最低|最多|最少|最好|最差|top\\d*|前\\d+)';
  return (labels[key] || [key]).some((label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${cue}[^，。；、,.!?]*${escaped}|${escaped}[^，。；、,.!?]*${cue}`, 'i').test(text);
  });
}

function promoteOutputDimensions(
  message: string,
  dimensions: RequirementDimension[],
): RequirementDimension[] {
  const outputKeys = new Set(['media', 'app', 'app_package_type', 'team', 'account', 'campaign', 'material', 'terminal', 'terminal_os']);
  return dimensions.map(item => (
    item.role === 'filter' && outputKeys.has(item.key) && hasOutputDimensionCueForKey(message, item.key)
      ? { ...item, role: 'breakdown' as const }
      : item
  ));
}

function mergeEntityHintFilterDimensions(
  dimensions: RequirementDimension[],
  entityHints: Array<{ entityType: EntityType; rawText: string }>,
): RequirementDimension[] {
  const next = [...dimensions];
  for (const hint of entityHints) {
    if (next.some(item => item.key === hint.entityType)) continue;
    next.push({ key: hint.entityType, role: 'filter' });
  }
  return next;
}

function mergeFilters(
  ...items: Array<Record<string, string[]> | undefined>
): Record<string, string[]> {
  const output: Record<string, string[]> = {};
  for (const item of items) {
    for (const [key, values] of Object.entries(item || {})) {
      const list = Array.isArray(values) ? values.map(String).filter(Boolean) : [];
      if (!list.length) continue;
      output[key] = Array.from(new Set([...(output[key] || []), ...list]));
    }
  }
  return output;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)));
}

function filtersFromEntityHints(entityHints: Array<{ entityType: EntityType; rawText: string }>): Record<string, string[]> {
  const output: Record<string, string[]> = {};
  for (const hint of entityHints) {
    const rawText = hint.rawText.trim();
    if (!rawText) continue;
    output[hint.entityType] = Array.from(new Set([...(output[hint.entityType] || []), rawText]));
  }
  return output;
}

function requiredOutputDimensions(dimensions: RequirementDimension[]): string[] {
  return Array.from(new Set(
    dimensions
      .filter(item => item.role === 'x_axis' || item.role === 'breakdown')
      .map(item => item.key),
  ));
}

function activeRequestSignals() {
  return buildAdvertisingRequestSignals();
}

function hasRoutePhrase(message: string, key: string): boolean {
  return matchDomainSignalTerms(message, activeRequestSignals().routePhrases).some(hit => hit.key === key);
}

function inferRequestedView(message: string, semanticFrame?: RequestSemanticFrame | null): RequestedView {
  // 优先从 semanticFrame 推导（Stage 1 迁移）
  if (semanticFrame) {
    const view = requestedViewFromSemanticFrame(semanticFrame);
    if (view) return view;
  }
  // 兜底：受控词典 + 正则
  const configured = matchDomainSignalTerms(message, activeRequestSignals().views)[0];
  if (configured?.key) return configured.key as RequestedView;
  if (/(对比|comparison|compare)/i.test(message)) return 'comparison';
  if (/(明细|table|表格|列表)/i.test(message)) return 'table';
  if (/(诊断|原因|为什么|异常|问题)/i.test(message)) return 'diagnosis';
  if (/(按天|每天|每日|逐日|折线图|折线|line\s*chart|chart)/i.test(message)) return 'trend';
  if (/(趋势|走势|trend|变化)/i.test(message)) return 'trend';
  return 'summary';
}

/**
 * 从 semanticFrame 推导 requestedView。
 *
 * 映射规则：
 * - semanticTask=diagnose_data_issue → 'diagnosis'
 * - executionMode=data_execution + 含趋势类语义 → 'trend'
 * - executionMode=data_execution + 含明细/表格语义 → 'table'
 * - semanticTask=retrieve_report_data → 'summary'（默认）
 */
function requestedViewFromSemanticFrame(frame: RequestSemanticFrame): RequestedView | null {
  if (frame.semanticTask === 'diagnose_data_issue') return 'diagnosis';
  if (frame.semanticTask === 'retrieve_report_data' && frame.executionMode === 'data_execution') {
    // 具体 view 仍由 message 中的表面信号决定，但这里只处理最明确的
    // 其余留给兜底正则
    return null;
  }
  if (frame.semanticTask === 'retrieve_report_data') return 'summary';
  return null;
}

function inferMetrics(message: string): string[] {
  const configuredMetrics = matchDomainSignalTerms(message, activeRequestSignals().metrics).map(hit => hit.key);
  if (configuredMetrics.length) {
    const next = configuredMetrics.includes('d1_roi')
      ? configuredMetrics.filter(metric => metric !== 'roi')
      : configuredMetrics;
    return Array.from(new Set(next));
  }
  // Stage 1 迁移：优先使用 Metric Catalog 的 label 匹配
  const metrics = new Set<string>();
  const text = message.toLowerCase();
  for (const metric of METRIC_CATALOG) {
    if (text.includes(metric.label.toLowerCase())) {
      metrics.add(metric.key);
    }
  }
  // 保留无法用 label 表达的特殊模式（d1_roi / 回收 等）
  if (metrics.has('roi') && /d1\s*roi|first\s*day\s*roi|首日\s*roi|首日回收|首日广告回收/i.test(message)) {
    metrics.delete('roi');
    metrics.add('d1_roi');
  }
  if (!metrics.has('roi') && /\bROI\b|roi/i.test(message)) metrics.add('roi');
  if (/\bROAS\b|roas/i.test(message)) metrics.add('roas');
  if (/(回收)/i.test(message) && !metrics.has('revenue')) metrics.add('revenue');
  if (/(留存|retention)/i.test(message)) metrics.add('retention_d1');
  return Array.from(metrics);
}

function inferDimensions(message: string): RequirementDimension[] {
  const signals = activeRequestSignals().dimensions;
  const configuredDimensions = matchDomainSignalTerms(message, signals).map((hit) => {
    const signal = signals.find(item => item.key === hit.key);
    return { key: hit.key, role: signal?.role || 'filter' };
  });
  if (configuredDimensions.length) {
    return configuredDimensions.filter((item, index, list) => list.findIndex(candidate => candidate.key === item.key) === index);
  }
  // Stage 1 迁移：优先使用 Dimension Catalog 的 label 匹配
  const dimensions: RequirementDimension[] = [];
  const text = message.toLowerCase();
  for (const dim of DIMENSION_CATALOG) {
    if (text.includes(dim.label.toLowerCase())) {
      dimensions.push({ key: dim.key as RequirementDimension['key'], role: dim.role as RequirementDimension['role'] });
    }
  }
  // 保留无法用 label 直接表达的语义模式
  if (/(日期|时间|date|day|daily|趋势)/i.test(message) && !dimensions.some(item => item.key === 'date')) dimensions.push({ key: 'date', role: 'x_axis' });
  if (/(按天|每天|每日|逐日|折线图|折线|line\s*chart)/i.test(message) && !dimensions.some(item => item.key === 'date')) dimensions.push({ key: 'date', role: 'x_axis' });
  if (/(小时|hour|hourly|实时)/i.test(message)) dimensions.push({ key: 'hour', role: 'x_axis' });
  return dimensions.filter((item, index, list) => list.findIndex(d => d.key === item.key) === index);
}

function inferGranularity(message: string): UserRequirementContract['granularity'] {
  const configured = matchDomainSignalTerms(message, activeRequestSignals().granularity)[0];
  if (configured?.key === 'hour' || configured?.key === 'week' || configured?.key === 'month') return configured.key;
  if (/(小时|hour|hourly|实时)/i.test(message)) return 'hour';
  if (/(周|weekly)/i.test(message)) return 'week';
  if (/(月|monthly)/i.test(message)) return 'month';
  return 'day';
}

function inferDateRange(message: string): UserRequirementContract['dateRange'] {
  const parsed = parseRelativeDateRange(message);
  if (parsed.is_explicit && parsed.start_date && parsed.end_date) {
    return { type: 'absolute', value: `${parsed.start_date}~${parsed.end_date}` };
  }
  if (parsed.start_date && parsed.end_date) {
    if (parsed.start_date === parsed.end_date) {
      if (/(今天|今日)/.test(message)) return { type: 'relative', value: 'today' };
      if (/(昨天|昨日)/.test(message)) return { type: 'relative', value: 'yesterday' };
      if (/(前天|前日)/.test(message)) return { type: 'relative', value: 'day_before_yesterday' };
    }
    if (/(上周)/.test(message)) return { type: 'relative', value: 'last_week' };
    if (/(本周)/.test(message)) return { type: 'relative', value: 'this_week' };
    if (/(上月)/.test(message)) return { type: 'relative', value: 'last_month' };
    if (/(本月)/.test(message)) return { type: 'relative', value: 'this_month' };
    if (parsed.requested_days && parsed.requested_days <= 7) return { type: 'relative', value: `last_${parsed.requested_days}_days` };
    return { type: 'absolute', value: `${parsed.start_date}~${parsed.end_date}` };
  }
  const text = message.replace(/\s+/g, '');
  if (/(今天|今日)/.test(text)) return { type: 'relative', value: 'today' };
  if (/(昨天|昨日)/.test(text)) return { type: 'relative', value: 'yesterday' };
  if (/(前天|前日)/.test(text)) return { type: 'relative', value: 'day_before_yesterday' };
  const recentDays = /(?:近|最近|过去)(\d{1,3})(?:天|日)/.exec(text);
  if (recentDays) return { type: 'relative', value: `last_${Number(recentDays[1]) || 1}_days` };
  if (/(上周)/.test(text)) return { type: 'relative', value: 'last_week' };
  if (/(本周)/.test(text)) return { type: 'relative', value: 'this_week' };
  if (/(上月)/.test(text)) return { type: 'relative', value: 'last_month' };
  if (/(本月)/.test(text)) return { type: 'relative', value: 'this_month' };
  return { type: 'unknown', value: '' };
}
function isCapabilitySupportQuestion(message: string): boolean {
  return /(支不支持|是否支持|能不能|可不可以|支持哪些|支持吗|可以监测|能监测|support)/i.test(message);
}

function isDeliverableWritingRequest(message: string): boolean {
  if (hasRoutePhrase(message, 'deliverable_writing')) return true;
  const text = message.replace(/\s+/g, '');
  const hasWritingAction = /(帮我写|帮忙写|写一个|写份|整理|输出|起草|草拟|生成|产出|撰写|draft|write)/i.test(text);
  const hasDeliverable = /(需求|方案|草稿|PRD|prd|文档|说明文档|配置方案文档|排查需求|需求草稿)/i.test(text);
  return hasWritingAction && hasDeliverable;
}

function isConfigurationHelpQuestion(message: string): boolean {
  if (hasRoutePhrase(message, 'config_help')) return true;
  return /(需要哪些配置|要哪些配置|怎么配置|如何配置|配置说明|配置项是什么|配置项有哪些|接入条件|支持条件|要准备什么|需要准备什么|准备哪些|需要哪些材料)/i.test(message);
}

function isConfigurationOperationQuestion(message: string): boolean {
  if (hasRoutePhrase(message, 'config_operation')) return true;
  return /(检查.*配置.*(问题|是否|有没有)|配置.*(是否有问题|有没有问题)|执行.*配置|修改.*配置|发起.*配置检查|配置检查)/i.test(message);
}

function isPackageFetchQuestion(message: string): boolean {
  if (hasRoutePhrase(message, 'package_fetch')) return true;
  return /(投放包|可交付包|交付包|可投放包|可用包|包地址|下载地址|分包|包详情|包列表|package|pkg|apk|ipa|download)/i.test(message);
}

function isIntegrationWorkflowQuestion(message: string): boolean {
  if (hasRoutePhrase(message, 'integration_workflow')) return true;
  return /(联调|联调状态|联调步骤|截图记录|截图|日志|integration|screenshot|step|record|log)/i.test(message);
}

function isDiagnosisQuestion(message: string): boolean {
  if (!hasRoutePhrase(message, 'deliverable_writing') && !hasRoutePhrase(message, 'config_help') && hasRoutePhrase(message, 'diagnosis')) return true;
  if (isDeliverableWritingRequest(message) || isConfigurationHelpQuestion(message)) return false;
  return /(排查|异常|不一致|差异|失败|报错|为什么|原因|gap|质量|下滑|下降|没数|问题)/i.test(message);
}

function isHelpQuestion(message: string): boolean {
  return /(怎么用|如何用|是什么意思|口径|规则|说明|解释|支持哪些|需要哪些配置|支持吗|能不能|可不可以|help|support)/i.test(message);
}

function hasStrongReportIntent(
  message: string,
  metrics: string[],
  dimensions: RequirementDimension[],
  dateRange: UserRequirementContract['dateRange'],
  semanticFrame?: RequestSemanticFrame | null,
): boolean {
  // 优先从 semanticFrame 判断（Stage 1 迁移）
  if (semanticFrame) {
    if (semanticFrame.semanticTask === 'retrieve_report_data') return true;
    // diagnose_data_issue / explain_field_or_value / draft_requirement
    // 明确不是报表意图，直接否定；execute_workflow 仍允许结构化查数信号兜底校正。
    if (
      semanticFrame.semanticTask === 'diagnose_data_issue'
      || semanticFrame.semanticTask === 'explain_field_or_value'
      || semanticFrame.semanticTask === 'draft_requirement'
    ) {
      return false;
    }
    // general_chat 保留走兜底判断（可能是隐式查数）
  }
  // 兜底：关键词组合
  const text = message.replace(/\s+/g, '');
  const hasReportAction = /(查数|查询|看下|看看|查看|统计|取数|明细|生成|导出|订阅|拼表|拉取|下载|分析|data|query)/i.test(text);
  const hasTrendOrCompare = /(趋势|走势|对比|比较|排名|排行|最高|最低|最多|最少|前三|前十|top\d*|环比|同比|变化|trend|compare|comparison|ranking|rank)/i.test(text);
  const hasValueQuestion = /(多少|几|是多少|值是多少|有多少)/i.test(text);
  const hasBusinessObject = hasAdvertisingDomainSignal(text, ['businessObject', 'media']);
  const hasFileWorkflow = /(上传.*(excel|表|模板)|excel.*(模板|表)|按模板|模板取数|拼表)/i.test(text);
  const hasTime = dateRange.type !== 'unknown' || /(今天|今日|昨天|昨日|上周|本周|本月|近\d{1,3}(?:天|日)|最近\d{1,3}(?:天|日)|过去\d{1,3}(?:天|日)|日期|时间|day|daily|hour|hourly)/i.test(text);

  return Boolean(
    hasFileWorkflow
    || (hasReportAction && (metrics.length > 0 || dimensions.length > 0 || hasTime || hasBusinessObject))
    || (hasTrendOrCompare && (metrics.length > 0 || dimensions.length > 0 || hasTime || hasBusinessObject))
    || (hasValueQuestion && metrics.length > 0 && (hasTime || hasBusinessObject))
    || (hasTime && metrics.length > 0 && hasBusinessObject)
  );
}

function hasStructuredReportSurfaceIntent(message: string): boolean {
  const text = normalizeUserQuestionText(message);
  const metrics = inferMetrics(text);
  const entityHints = inferEntityHintsV2(text);
  const dimensions = mergeEntityHintFilterDimensions(inferDimensions(text), entityHints);
  const dateRange = inferDateRange(text);
  return hasStrongReportIntent(text, metrics, dimensions, dateRange, null);
}

function inferServiceIntentFromRequirement(params: {
  text: string;
  task: RequestTask;
  metrics: string[];
  dimensions: RequirementDimension[];
  dateRange: UserRequirementContract['dateRange'];
  semanticFrame?: RequestSemanticFrame | null;
}): RequestServiceIntent {
  if (params.task === 'demand') return 'light_requirement';
  if (params.task === 'diagnosis' || params.task === 'debugging') return 'issue_diagnosis';
  if (params.task === 'help') return 'help_qa';
  if (params.task === 'forecast') return 'data_query';
  switch (true) {
    case isPackageFetchQuestion(params.text):
      return 'package_fetch';
    case isIntegrationWorkflowQuestion(params.text):
      return 'integration_workflow';
  }
  if (isConfigurationOperationQuestion(params.text)) return 'system_operation';
  if (isConfigurationHelpQuestion(params.text) || isCapabilitySupportQuestion(params.text) || isHelpQuestion(params.text)) return 'help_qa';
  if (hasStrongReportIntent(params.text, params.metrics, params.dimensions, params.dateRange, params.semanticFrame)) {
    return /(生成|导出|订阅|报告|日报|周报|月报|报表|交付|拼表|下载)/i.test(params.text) ? 'report_delivery' : 'data_query';
  }
  return 'general_chat';
}

function buildRequirementEvidence(params: {
  text: string;
  task: RequestTask;
  metrics: string[];
  dimensions: RequirementDimension[];
  dateRange: UserRequirementContract['dateRange'];
  requestedView: RequestedView;
  serviceIntent: RequestServiceIntent;
}): {
  routeEvidence: string[];
  domainSignals: string[];
  capabilityCandidates: string[];
} {
  const routeEvidence = uniqueStrings([
    `task:${params.task}`,
    'task_authority:heuristic_candidate',
    `view:${params.requestedView}`,
    params.metrics.length ? `metrics:${params.metrics.join(',')}` : '',
    params.dimensions.length ? `dimensions:${params.dimensions.map(item => `${item.key}:${item.role}`).join(',')}` : '',
    params.dateRange.type !== 'unknown' ? `date_range:${params.dateRange.type}:${params.dateRange.value}` : '',
    params.serviceIntent ? `service_intent:${params.serviceIntent}` : '',
  ]);
  const domainSignals = uniqueStrings([
    hasAdvertisingDomainSignal(params.text, ['businessObject', 'media']) ? 'advertising_domain_signal' : '',
    params.metrics.length || params.dimensions.length ? 'data_signal' : '',
    isCapabilitySupportQuestion(params.text) ? 'capability_support_signal' : '',
    isConfigurationHelpQuestion(params.text) ? 'configuration_help_signal' : '',
    isConfigurationOperationQuestion(params.text) ? 'configuration_operation_signal' : '',
    isDeliverableWritingRequest(params.text) ? 'deliverable_writing_signal' : '',
  ]);
  const capabilityCandidates = uniqueStrings([
    params.serviceIntent,
    params.task !== 'general' ? params.task : '',
    params.requestedView !== 'summary' ? `view:${params.requestedView}` : '',
  ]);
  return { routeEvidence, domainSignals, capabilityCandidates };
}

function intentToAgent(intent: IntentType): AgentType {
  const map: Record<IntentType, AgentType> = {
    help: 'help',
    report_query: 'report',
    demand: 'demand',
    diagnosis: 'diagnosis',
    debugging: 'debugging',
    get_delivery_packages: 'delivery',
    monitor: 'monitoring',
    forecast: 'prediction',
    general: 'hub',
  };
  return map[intent];
}

function buildDecision(intent_type: IntentType, reason: string, override: Partial<RequestRouteDecision> = {}): RequestRouteDecision {
  return {
    intent_type,
    agent: override.agent || intentToAgent(intent_type),
    is_business_related: override.is_business_related ?? intent_type !== 'general',
    workflow_level: override.workflow_level || (intent_type === 'report_query' || intent_type === 'diagnosis' || intent_type === 'debugging' || intent_type === 'get_delivery_packages' || intent_type === 'monitor' ? 'heavy' : 'light'),
    confidence: override.confidence || 'medium',
    requiresExecution: override.requiresExecution || false,
    executionConfidence: override.executionConfidence || override.confidence || 'medium',
    reason,
    required_slots: [],
    missing_fields: override.missing_fields || [],
    clarification_needed: override.clarification_needed || false,
    suggested_actions: override.suggested_actions || [],
    tracking_target: override.tracking_target,
  };
}

function isReportFollowupIntent(text: string): boolean {
  const normalized = text.replace(/\s+/g, '');
  const followupCue = /(再查|再看|重查|再次|重试|继续|上次|刚刚|刚才|接着|继续查|再输出|导出|趋势|对比|同比|环比)/i.test(normalized);
  if (followupCue) return true;
  return false;
}

function agentForIntent(intentType: IntentType): AgentType {
  const map: Record<IntentType, AgentType> = {
    help: 'help',
    report_query: 'report',
    demand: 'demand',
    diagnosis: 'diagnosis',
    debugging: 'debugging',
    get_delivery_packages: 'delivery',
    monitor: 'monitoring',
    forecast: 'prediction',
    general: 'hub',
  };
  return map[intentType] || 'hub';
}

function workflowForIntent(intentType: IntentType): RequestRouteDecision['workflow_level'] {
  return intentType === 'report_query'
    || intentType === 'diagnosis'
    || intentType === 'debugging'
    || intentType === 'get_delivery_packages'
    || intentType === 'monitor'
    ? 'heavy'
    : 'light';
}

function confidenceFromNumber(value: number): RequestRouteDecision['confidence'] {
  return value >= 0.8 ? 'high' : value >= 0.55 ? 'medium' : 'low';
}

function hasGovernedBusinessRoutingSignal(message: string): boolean {
  const signals = activeRequestSignals();
  return matchDomainSignalTerms(message, [
    ...signals.metrics,
    ...signals.dimensions,
    ...signals.reportActions,
    ...signals.domainEntities,
  ]).length > 0
    || hasAdvertisingDomainSignal(message, ['workflow'])
    || hasRoutePhrase(message, 'package_fetch')
    || hasRoutePhrase(message, 'integration_workflow');
}

export function deriveRequestRouteDecision(message: string, context?: RequestRoutingContext | null): RequestRouteDecision {
  const text = normalizeUserQuestionText(message);
  const lower = text.toLowerCase();

  const routeRules = normalizeIntentRouteRulesConfig(context?.routeRules || undefined);
  const capabilityCandidate = (context?.capabilityCandidates || [])
    .find(candidate =>
      candidate.capability.capabilityType === 'data.report'
      && candidate.capability.supportedServiceIntents?.some(intent => intent === 'report_delivery' || intent === 'data_query')
    );
  const hasBusinessContext = Boolean(
    context?.businessContext?.latestResult
    || context?.businessContext?.qualityCheck
    || context?.businessContext?.timeRange
    || context?.businessContext?.metrics
    || context?.businessContext?.app
    || context?.businessContext?.project,
  );
  const governedBusinessCue = hasGovernedBusinessRoutingSignal(text);
  const hasCapabilityCandidate = Boolean(capabilityCandidate);
  const canUseCodeRulePath = governedBusinessCue
    || hasCapabilityCandidate
    || hasBusinessContext;
  const canUseBusinessTextRulePath = governedBusinessCue || hasCapabilityCandidate;
  const llmIntentSignal = context?.llmIntentSignal;
  const clientRouteHint = typeof context?.clientIntent === 'string' ? context.clientIntent.trim() : '';
  const llmUnderstandingMatched = llmIntentSignal
    && llmIntentSignal.confidence >= 0.7
    && llmIntentSignal.intent_type !== 'general';
  const structuredReportSurfaceIntent = hasStructuredReportSurfaceIntent(text);
  const shouldRejectLlmReportDowngrade = Boolean(
    llmUnderstandingMatched
    && llmIntentSignal.intent_type !== 'report_query'
    && structuredReportSurfaceIntent
  );
  const llmUnderstandingReason = (intentType: IntentType) => llmUnderstandingMatched && llmIntentSignal.intent_type === intentType
    ? `；LLM 理解一致：${llmIntentSignal.reason}`
    : '';
  if (llmUnderstandingMatched && !shouldRejectLlmReportDowngrade) {
    return buildDecision(llmIntentSignal.intent_type, `Planner 候选：${llmIntentSignal.reason}`, {
      agent: agentForIntent(llmIntentSignal.intent_type),
      is_business_related: llmIntentSignal.intent_type !== 'general',
      workflow_level: workflowForIntent(llmIntentSignal.intent_type),
      confidence: confidenceFromNumber(llmIntentSignal.confidence),
      requiresExecution: llmIntentSignal.requiresExecution ?? llmIntentSignal.intent_type === 'report_query',
      suggested_actions: [],
      tracking_target: llmIntentSignal.serviceIntent,
    });
  }

  // Field definition signal — MUST be checked before evaluateIntentRouteRules and capability candidate
  // to prevent report_query from hijacking field explanation requests
  // "素材报表的未知是什么" must be intercepted here, not pulled into report execution
  const fieldDef = detectFieldDefinitionSignal(text);
  if (fieldDef.matched) {
    const objectDesc = fieldDef.targetObject || '当前对象';
    const termDesc = fieldDef.targetTerm || '该术语';
    return buildDecision('help', `规则候选：识别到字段/口径解释诉求（${objectDesc}.${termDesc}），进入帮助链路。`, {
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: fieldDef.confidence === 'high' ? 'medium' : 'low',
      requiresExecution: false,
      clarification_needed: fieldDef.requiresClarification,
      required_slots: [],
      suggested_actions: fieldDef.requiresClarification
        ? ['补充查询对象', '查看常见字段说明']
        : ['查看字段说明', '继续追问'],
      tracking_target: 'field_definition',
    });
  }

  // ─── Semantic Frame → Route Decision Adapter ──────────────────────────────────
  // When semantic frame is provided, use it as the semantic truth source for route decision.
  // This adapter runs AFTER field_definition check (which has highest priority for help intent)
  // but BEFORE capability candidate check and other governed backup paths.
  //
  // Mapping:
  // - semanticTask=retrieve_report_data + executionMode=data_execution → report_query
  // - semanticTask=diagnose_data_issue + executionMode=diagnostic_evidence → diagnosis
  // - semanticTask=execute_workflow + executionMode=workflow_execution → debugging (system_operation)
  const semanticFrame = context?.semanticFrame;
  if (semanticFrame) {
    // retrieve_report_data → report_query
    if (semanticFrame.semanticTask === 'retrieve_report_data' &&
        semanticFrame.executionMode === 'data_execution' &&
        (semanticFrame.serviceIntent === 'data_query' || semanticFrame.serviceIntent === 'report_delivery')) {
      return buildDecision('report_query', `语义框架候选：识别到数据查询意图（semanticTask=${semanticFrame.semanticTask}），进入问数链路。`, {
        agent: 'report',
        is_business_related: true,
        workflow_level: 'light',
        confidence: 'medium',
        requiresExecution: true,
        required_slots: semanticFrame.missingSlots,
        suggested_actions: ['查询报表数据', '展示趋势结果'],
        tracking_target: semanticFrame.serviceIntent,
      });
    }

    // diagnose_data_issue → diagnosis
    if (semanticFrame.semanticTask === 'diagnose_data_issue' &&
        semanticFrame.executionMode === 'diagnostic_evidence') {
      return buildDecision('diagnosis', `语义框架候选：识别到诊断意图（semanticTask=${semanticFrame.semanticTask}），进入排查链路。`, {
        agent: 'diagnosis',
        is_business_related: true,
        workflow_level: 'heavy',
        confidence: 'medium',
        requiresExecution: true,
        required_slots: semanticFrame.missingSlots,
        suggested_actions: ['补充排查条件', '保存排查记录'],
        tracking_target: semanticFrame.serviceIntent,
      });
    }

    // execute_workflow → debugging (system_operation)
    if (semanticFrame.semanticTask === 'execute_workflow' &&
        semanticFrame.executionMode === 'workflow_execution') {
      if (hasStructuredReportSurfaceIntent(text)) {
        return buildDecision('report_query', `语义框架候选需要校正：文本具备结构化查数信号（semanticTask=${semanticFrame.semanticTask}），进入问数链路。`, {
          agent: 'report',
          is_business_related: true,
          workflow_level: 'light',
          confidence: 'medium',
          requiresExecution: true,
          required_slots: semanticFrame.missingSlots,
          suggested_actions: ['查询报表数据', '展示趋势结果'],
          tracking_target: 'data_query',
        });
      }
      return buildDecision('debugging', `语义框架候选：识别到工作流执行意图（semanticTask=${semanticFrame.semanticTask}），进入系统操作链路。`, {
        agent: 'debugging',
        is_business_related: true,
        workflow_level: 'heavy',
        confidence: 'medium',
        requiresExecution: true,
        required_slots: semanticFrame.missingSlots,
        suggested_actions: ['确认操作范围', '检查配置'],
        tracking_target: semanticFrame.serviceIntent,
      });
    }
  }

  if (clientRouteHint === 'report_query' && structuredReportSurfaceIntent) {
    return buildDecision('report_query', '客户端候选：前端意图与受治理报表/业务信号一致，进入统一问数链路。', {
      agent: 'report',
      is_business_related: true,
      workflow_level: 'light',
      confidence: structuredReportSurfaceIntent ? 'medium' : 'low',
      requiresExecution: true,
      required_slots: ['project', 'time_range', 'metric'],
      suggested_actions: ['查询报表数据', '展示趋势结果', '检查数据质量'],
      tracking_target: 'data_query',
    });
  }

  if (structuredReportSurfaceIntent) {
    return buildDecision('report_query', '规则候选：识别到结构化报表、指标、时间或维度查数信号，进入统一问数链路。', {
      agent: 'report',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      requiresExecution: true,
      required_slots: ['project', 'time_range', 'metric'],
      suggested_actions: ['查询报表数据', '展示趋势结果', '检查数据质量'],
      tracking_target: 'data_query',
    });
  }

  if (canUseCodeRulePath && isDeliverableWritingRequest(text)) {
    return buildDecision('demand', '规则候选：识别到需求、方案或文档撰写交付物，进入轻量需求撰写链路。', {
      agent: 'demand',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      required_slots: [],
      suggested_actions: ['生成草稿', '继续补充背景', '保存需求'],
      tracking_target: '需求草稿',
    });
  }

  const routeCandidate = evaluateIntentRouteRules({ message: text, rules: routeRules.rules })[0];
  if (routeCandidate) {
    return buildDecision(routeCandidate.rule.intent_type, `规则候选：${routeCandidate.rule.reason_template || routeCandidate.rule.description}${llmUnderstandingReason(routeCandidate.rule.intent_type)}`, {
      requiresExecution: routeCandidate.rule.intent_type === 'report_query',
      agent: routeCandidate.rule.agent,
      is_business_related: routeCandidate.rule.intent_type !== 'general',
      workflow_level: routeCandidate.rule.workflow_level,
      confidence: routeCandidate.rule.confidence === 'high' ? 'medium' : routeCandidate.rule.confidence,
      suggested_actions: [],
      tracking_target: routeCandidate.rule.name,
    });
  }

  if (!canUseCodeRulePath && isHelpQuestion(text)) {
    return buildDecision('help', '规则候选：识别到通用说明或用法咨询，进入帮助链路。', {
      agent: 'help',
      is_business_related: false,
      workflow_level: 'light',
      confidence: 'medium',
      required_slots: [],
      suggested_actions: ['查看说明', '继续追问'],
    });
  }

  if (canUseCodeRulePath && isConfigurationHelpQuestion(text)) {
    return buildDecision('help', '规则候选：识别到配置说明、接入条件或准备事项咨询，进入帮助链路。', {
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      required_slots: [],
      suggested_actions: ['查看配置说明', '继续追问', '查看可用能力'],
    });
  }

  if (canUseCodeRulePath && isConfigurationOperationQuestion(text)) {
    return buildDecision('debugging', '规则候选：识别到配置检查或配置执行诉求，进入系统操作链路。', {
      agent: 'debugging',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'medium',
      required_slots: ['project'],
      suggested_actions: ['确认操作范围', '检查配置', '返回检查结果'],
    });
  }

  if (canUseCodeRulePath && /(字段|口径|指标|规则|说明|解释|什么意思|怎么理解).*(?:是什么|什么意思|怎么理解|怎么计算|怎么定义|含义|口径)|(?:是什么|什么意思|怎么理解).*(?:字段|口径|指标|规则)/i.test(text)) {
    return buildDecision('help', '规则候选：识别到字段、口径或指标解释诉求，进入帮助链路。', {
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      required_slots: [],
      suggested_actions: ['查看解释', '继续补充上下文'],
    });
  }

  if (canUseCodeRulePath && isDiagnosisQuestion(text)) {
    return buildDecision('diagnosis', '规则候选：识别到异常、原因或排查诉求，进入问题排查链路。', {
      agent: 'diagnosis',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'medium',
      required_slots: ['media', 'app', 'time_range', 'metric'],
      suggested_actions: ['补充排查条件', '保存排查记录'],
    });
  }

  if (capabilityCandidate) {
    return buildDecision('report_query', `能力候选：命中可用报表能力，进入报表交付兼容链路。${llmUnderstandingReason('report_query')}`, {
      agent: 'report',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      requiresExecution: true,
      required_slots: [],
      suggested_actions: ['使用已发现的报表能力', '按工具契约补齐参数'],
      tracking_target: capabilityCandidate.capability.displayName || capabilityCandidate.capability.capabilityId,
    });
  }
  const requirement = deriveUserRequirement(text, context?.businessContext, context?.semanticFrame);
  const wantsRefetch = /(重新查|再查|重查|对比|趋势|维度|导出|同比|环比)/i.test(text);
  const wantsDiagnosis = /(排查|异常|差异|失败|报错|为什么|gap|质量|不一致)/i.test(text);
  const wantsDebugging = false;
  const reportFollowupIntend = isReportFollowupIntent(text);

  if (canUseCodeRulePath && isCapabilitySupportQuestion(text)) {
    return buildDecision('help', '规则候选：识别到能力支持范围咨询，进入帮助链路确认当前可支持内容。', {
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      required_slots: [],
      suggested_actions: ['确认支持范围', '查看可用能力', '继续补充目标媒体或游戏类?'],
    });
  }

  if (canUseCodeRulePath && (requirement.task === 'report_query' || hasStrongReportIntent(text, requirement.metrics, requirement.dimensions, requirement.dateRange, context?.semanticFrame))) {
    return buildDecision('report_query', '规则候选：识别到取数、报表指标或趋势对比诉求，进入统一问数链路。', {
      agent: 'report',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      requiresExecution: true,
      required_slots: ['project', 'time_range', 'metric'],
      suggested_actions: ['查询报表数据', '展示趋势结果', '检查数据质量'],
      tracking_target: '报表查询记录',
    });
  }

  if (canUseCodeRulePath && /(投放包|可交付包|交付包|可投放包|可用包|包地址|下载地址|包详情|包列表|分包)/i.test(text)) {
    return buildDecision('get_delivery_packages', '规则候选：识别到投放包或交付包诉求，进入交付链路。', {
      agent: 'delivery',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'medium',
      required_slots: ['project'],
      suggested_actions: ['查询可投放包', '检查阻塞项', '继续准备交付'],
      tracking_target: '投放包交付',
    });
  }

  if (canUseCodeRulePath && /(监控|告警|报警|阈值|波动|回传延迟|延迟.*告警)/i.test(text)) {
    return buildDecision('monitor', '规则候选：识别到监控或告警诉求，进入监控链路。', {
      agent: 'monitoring',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'medium',
      required_slots: ['project', 'media', 'time_range'],
      suggested_actions: ['创建监控任务', '查看告警记录', '调整阈值'],
      tracking_target: '监控任务告警',
    });
  }

  if (canUseCodeRulePath && /(排查|异常|失败|差异|不一致|为什么|gap|质量问题|回传少|漏发)/i.test(text)) {
    return buildDecision('diagnosis', '规则候选：识别到排查、异常或差异诉求，进入问题排查链路。', {
      agent: 'diagnosis',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'medium',
      required_slots: ['media', 'app', 'time_range', 'metric'],
      suggested_actions: ['补充排查条件', '保存排查记录'],
      tracking_target: '排查记录',
    });
  }

  if (canUseBusinessTextRulePath && /(怎么|如何|是什么|在哪里|说明|解释|口径|规则|路径|list|列表|能力|支不支持|是否支持|能不能|可不可以|支持哪些|支持吗)/i.test(text)) {
    return buildDecision('help', '规则候选：识别到说明、规则或能力查询诉求，进入帮助链路。', {
      agent: 'help',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      required_slots: [],
      suggested_actions: ['查看说明', '继续追问', '打开可用能力'],
    });
  }

  if (canUseCodeRulePath && /(预测|预估|预判|forecast|ltv|roi)/i.test(lower)) {
    return buildDecision('forecast', '规则候选：识别到预测、预估或回本诉求，进入预测链路。', {
      agent: 'prediction',
      is_business_related: true,
      workflow_level: 'light',
      confidence: 'medium',
      required_slots: ['project', 'time_range', 'metric'],
      suggested_actions: ['生成预测记录', '补充假设条件', '查看历史预测'],
      tracking_target: '预测记录',
    });
  }

  if (canUseCodeRulePath && /(需求|对接|接入|映射|埋点|规则配置|配置|素材|媒体)/i.test(text)) {
    return buildDecision('demand', '规则候选：识别到需求、接入或配置诉求，进入需求链路。', {
      agent: 'demand',
      is_business_related: true,
      workflow_level: 'heavy',
      confidence: 'medium',
      required_slots: ['媒体名称', '对接文档', '验收方式'],
      suggested_actions: ['打开需求单', '保存到待办', '补齐对接文档'],
      tracking_target: '需求记录',
    });
  }

  if (hasBusinessContext && (wantsDiagnosis || wantsRefetch || wantsDebugging || reportFollowupIntend)) {
    if (context?.businessContext?.qualityCheck?.status === 'needs_review') {
      return buildDecision('diagnosis', '上下文候选：基于上下文中的质量检查结果，当前追问承接为数据排查。', {
        agent: 'diagnosis',
        is_business_related: true,
        workflow_level: 'heavy',
        confidence: 'high',
        required_slots: ['media', 'app', 'time_range', 'metric'],
        suggested_actions: ['继续定位问题', '创建排查记录'],
      });
    }

    if ((context?.businessContext?.latestResult?.resultType === 'report_query' || context?.businessContext?.reportSource || wantsRefetch) && reportFollowupIntend) {
      return buildDecision('report_query', '上下文候选：基于上下文中的问数结果，当前追问承接为继续问数。', {
        agent: 'report',
        is_business_related: true,
        workflow_level: 'light',
        confidence: 'high',
        requiresExecution: true,
        required_slots: ['project', 'time_range', 'metric'],
        suggested_actions: ['继续查询报表数据', '展开趋势或对比'],
      });
    }
  }

  const next = buildDecision('general', '未命中明确业务链路，保持普通对话。', {
    agent: 'hub',
    is_business_related: false,
    workflow_level: 'light',
    confidence: 'low',
    required_slots: [],
    suggested_actions: ['继续对话'],
  });

  if (context?.slotState) {
    const missingFields = missingSlotsToFields(context.slotState.missingSlots);
    next.missing_fields = missingFields;
    next.clarification_needed = missingFields.some(item => item.priority === 'required');
  }

  return next;
}

export function deriveUserRequirement(message: string, context?: BusinessContextSnapshot | null, semanticFrame?: RequestSemanticFrame | null): UserRequirementContract {
  const text = normalizeUserQuestionText(message);
  const requirement = createEmptyUserRequirement();
  const metrics = inferMetrics(text);
  const entityHints = inferEntityHintsV2(text);
  const dimensions = promoteOutputDimensions(
    text,
    mergeEntityHintFilterDimensions(inferDimensions(text), entityHints),
  );
  const granularity = inferGranularity(text);
  const requestedView = inferRequestedView(text, semanticFrame);
  const dateRange = inferDateRange(text);
  const identifierDependencies = inferRequiredIdentifiers(text, dimensions, entityHints);

  const isWritingRequirement = isDeliverableWritingRequest(text);
  const fieldDef = detectFieldDefinitionSignal(text);
  const isFieldDefinitionRequirement = !isWritingRequirement && fieldDef.matched;
  const isReportRequirement = !isWritingRequirement && !isFieldDefinitionRequirement && !isCapabilitySupportQuestion(text) && !isConfigurationHelpQuestion(text) && hasStrongReportIntent(text, metrics, dimensions, dateRange, semanticFrame);
  const isDiagnosisRequirement = isDiagnosisQuestion(text);
  const isHelpRequirement = !isWritingRequirement && !isDiagnosisRequirement && (isConfigurationHelpQuestion(text) || isHelpQuestion(text));
  const serviceIntent = inferServiceIntentFromRequirement({
    text,
    task: isWritingRequirement
      ? 'demand'
      : isFieldDefinitionRequirement
        ? 'help'
        : isReportRequirement
          ? 'report_query'
          : isDiagnosisRequirement
            ? 'diagnosis'
            : isHelpRequirement
              ? 'help'
              : 'general',
    metrics,
    dimensions,
    dateRange,
    semanticFrame,
  });
  // Override serviceIntent for field definition
  // Prefer semanticFrame.serviceIntent when available (P1 migration)
  const semanticServiceIntent = semanticFrame?.serviceIntent;
  const reportServiceIntentFromSignals = isReportRequirement
    && (serviceIntent === 'data_query' || serviceIntent === 'report_delivery')
    && semanticServiceIntent !== 'data_query'
    && semanticServiceIntent !== 'report_delivery';
  const effectiveServiceIntent = reportServiceIntentFromSignals || (isReportRequirement && (
    semanticFrame?.semanticTask === 'execute_workflow'
    || (serviceIntent === 'report_delivery' && semanticServiceIntent === 'data_query')
    || (serviceIntent === 'package_fetch' && (semanticServiceIntent === 'integration_workflow' || semanticServiceIntent === 'system_operation'))
  ))
    ? serviceIntent
    : semanticServiceIntent
    || (isFieldDefinitionRequirement ? 'field_definition' : serviceIntent);
  const requirementEvidence = buildRequirementEvidence({
    text,
    task: isWritingRequirement
      ? 'demand'
      : isReportRequirement
        ? 'report_query'
        : isDiagnosisRequirement
          ? 'diagnosis'
          : isHelpRequirement
            ? 'help'
            : 'general',
    metrics,
    dimensions,
    dateRange,
    requestedView,
    serviceIntent: effectiveServiceIntent,
  });
  // Prefer semanticFrame for task determination when available (P1 migration)
  // general_chat 表示"未识别"，应让结构化信号兜底判断（与 hasStrongReportIntent line 420 对齐）
  if (semanticFrame?.semanticTask && semanticFrame.semanticTask !== 'general_chat') {
    requirement.task = semanticFrame.semanticTask === 'retrieve_report_data'
      ? 'report_query'
      : semanticFrame.semanticTask === 'explain_field_or_value'
        ? 'help'
        : semanticFrame.semanticTask === 'diagnose_data_issue'
          ? 'diagnosis'
          : semanticFrame.semanticTask === 'draft_requirement'
            ? 'demand'
            : semanticFrame.semanticTask === 'execute_workflow'
              ? isReportRequirement ? 'report_query' : 'debugging'
              : 'general';
  } else {
    requirement.task = isWritingRequirement
      ? 'demand'
      : isFieldDefinitionRequirement
        ? 'help'
        : isReportRequirement
          ? 'report_query'
          : isDiagnosisRequirement
            ? 'diagnosis'
            : isHelpRequirement
              ? 'help'
              : 'general';
  }
  requirement.taskAuthority = 'heuristic_candidate';
  requirement.taskSource = 'request_understanding_structured_signals';
  requirement.taskConfidence = requirement.task === 'general' ? 'low' : isReportRequirement || isDiagnosisRequirement ? 'high' : 'medium';

  // Backfill serviceIntent for report_query when not explicitly set
  // This ensures gate can properly authorize report execution
  // Only applies AFTER field_definition/knowledge_answer/help_qa exclusions
  if (requirement.task === 'report_query' &&
      (effectiveServiceIntent === 'general_chat' || !effectiveServiceIntent)) {
    // Check for report delivery semantics (日报/报表交付)
    if (/(生成|导出|订阅|报告|日报|周报|月报|报表|交付|拼表|下载)/i.test(text)) {
      requirement.serviceIntent = 'report_delivery';
    } else {
      requirement.serviceIntent = 'data_query';
    }
  } else {
    requirement.serviceIntent = effectiveServiceIntent;
  }

  requirement.routeEvidence = requirementEvidence.routeEvidence;
  requirement.domainSignals = requirementEvidence.domainSignals;
  requirement.capabilityCandidates = requirementEvidence.capabilityCandidates;
  requirement.requestedView = requestedView;
  requirement.metrics = metrics;
  requirement.dimensions = dimensions;
  requirement.dateRange = dateRange;
  requirement.granularity = granularity;
  requirement.focusEntity = dimensions.find(item => item.key !== 'date' && item.key !== 'hour')?.key;
  requirement.filters = mergeFilters(
    filtersFromEntityHints(entityHints),
    context?.app?.value ? { app: [String(context.app.value)] } : undefined,
    context?.media?.value ? { media: [String(context.media.value)] } : undefined,
  );
  requirement.entityHints = entityHints;
  requirement.identifierDependencies = identifierDependencies;
  requirement.requiredIdentifiers = identifierDependencies.map(item => item.identifierKey);
  requirement.dataRequirement = {
    requiredDimensions: requiredOutputDimensions(dimensions),
    requiredMetrics: metrics,
    requiredGranularity: granularity,
  };
  return requirement;
}
