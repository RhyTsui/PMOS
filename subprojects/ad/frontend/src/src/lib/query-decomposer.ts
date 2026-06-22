/**
 * Query Decomposer — 查询拆解器
 *
 * 将用户的复合查询拆解为多个子查询，分配给不同的 MCP 工具执行。
 *
 * 核心逻辑：
 * 1. 从用户查询/semanticFrame 中提取所需的指标和维度
 * 2. 从 capability manifest 中找到支持所有所需维度的工具
 * 3. 按 domain 将指标分配给工具（如 ROI 指标 → roi domain 的工具）
 * 4. 生成 SubQuery 列表
 *
 * 关键约束：
 * - 工具必须支持所有必需维度（否则不选）
 * - 每个指标只分配给一个工具
 * - 如果某个指标找不到工具覆盖，记入 uncoveredMetrics
 */

import type {
  QueryDecomposition,
  SubQuery,
  ToolSelectionInput,
  ToolSelectionResult,
  SelectedCapability,
} from '@/contracts/multi-query';
import type { ReportToolCapability, ReportCapabilityDomain } from './report-capability-manifest';
import { createSubQuery } from '@/contracts/multi-query';

// ─── Metric → Domain Mapping ──────────────────────────────

/**
 * 指标到报表域的映射。
 * 用于判断某个指标应该由哪个 domain 的工具来处理。
 */
const METRIC_TO_DOMAIN: Record<string, ReportCapabilityDomain> = {
  // 日常报表域
  cost: 'daily',
  activation: 'daily',
  register: 'daily',
  payment: 'daily',
  first_day_payment: 'daily',
  valid: 'daily',
  revenue: 'daily',
  discounted_cost: 'daily',
  arppu: 'daily',

  // ROI 域
  roi: 'roi',
  roas: 'roi',
  roi_day: 'roi',
  roi_week: 'roi',
  roi_month: 'roi',
  roi_cumulative: 'roi',

  // 留存域
  retention_d1: 'retention',
  retention_d7: 'retention',
  retention_d30: 'retention',
  retention_device: 'retention',
  retention_register: 'retention',
  retention_pay_d1: 'retention',

  // 小时报表域
  first_day_register_device_hour: 'hourly',
  first_day_paid_account_cutoff_hour: 'daily',
};

/**
 * 域到指标的映射（反向查找用）
 */
const DOMAIN_TO_METRICS: Record<ReportCapabilityDomain, string[]> = {
  daily: ['cost', 'activation', 'register', 'payment', 'first_day_payment', 'valid', 'revenue', 'discounted_cost', 'arppu', 'first_day_paid_account_cutoff_hour'],
  roi: ['roi', 'roas', 'roi_day', 'roi_week', 'roi_month', 'roi_cumulative'],
  retention: ['retention_d1', 'retention_d7', 'retention_d30', 'retention_device', 'retention_register', 'retention_pay_d1'],
  weekly: [],
  monthly: [],
  hourly: ['first_day_register_device_hour'],
  dictionary: [],
  project: [],
};

// ─── Metric Alias Resolution ───────────────────────────────

/**
 * 常见指标别名映射。
 * 用户说"消耗" → cost, "ROI" → roi, "次留" → retention_d1 等
 */
const METRIC_ALIASES: Record<string, string> = {
  '消耗': 'cost',
  '花费': 'cost',
  'cost': 'cost',
  'spend': 'cost',
  '激活': 'activation',
  'activation': 'activation',
  '注册': 'register',
  'register': 'register',
  '付费': 'payment',
  'payment': 'payment',
  '首日付费': 'first_day_payment',
  '有效': 'valid',
  '收入': 'revenue',
  'revenue': 'revenue',
  '折后消耗': 'discounted_cost',
  'roi': 'roi',
  'ROI': 'roi',
  'roas': 'roas',
  'ROAS': 'roas',
  '次留': 'retention_d1',
  'd1留存': 'retention_d1',
  'retention': 'retention_d1',
  '留存': 'retention_d1',
  'arppu': 'arppu',
  'ARPPU': 'arppu',
};

const METRIC_KEY_ALIASES: Record<string, string> = {
  '累计roi': 'roi_cumulative',
  '累计ROI': 'roi_cumulative',
  '第roi': 'roi_day',
  '设备留存': 'retention_device',
  '新增设备留存': 'retention_device',
  '注册留存': 'retention_register',
  '注册用户留存': 'retention_register',
  '首日付费留存': 'retention_pay_d1',
  '首日付费账号留存': 'retention_pay_d1',
  '首日注册设备数': 'first_day_register_device_hour',
  '首日付费账号数': 'first_day_paid_account_cutoff_hour',
};

const TEXT_METRIC_PATTERNS: Array<{ pattern: RegExp; metric: string }> = [
  { pattern: /激活/, metric: 'activation' },
  { pattern: /注册(?!留存)/, metric: 'register' },
  { pattern: /首日付费数|首日付费人数(?!留存)|首日付费用户数/, metric: 'first_day_payment' },
  { pattern: /付费(?!留存|账号)/, metric: 'payment' },
  { pattern: /有效数|有效用户|有效人数/, metric: 'valid' },
  { pattern: /折后消耗|折后花费|现金消耗|现金花费/, metric: 'discounted_cost' },
  { pattern: /消耗|花费|成本/, metric: 'cost' },
  { pattern: /roi|roas/i, metric: 'roi' },
  { pattern: /累计\d+(?:日|天|周|月)?roi/i, metric: 'roi_cumulative' },
  { pattern: /\d+(?:日|天|周|月)?累计roi/i, metric: 'roi_cumulative' },
  { pattern: /\d{1,3}(?:日|天)(?!累计)roi/i, metric: 'roi_day' },
  { pattern: /第\d+(?:日|天)roi/i, metric: 'roi_day' },
  { pattern: /\d+周roi|第\d+周roi/i, metric: 'roi_week' },
  { pattern: /\d+月roi|第\d+月roi/i, metric: 'roi_month' },
  { pattern: /\d+(?:日|天)?设备留存|新增设备留存/, metric: 'retention_device' },
  { pattern: /\d+(?:日|天)?注册留存|注册用户留存/, metric: 'retention_register' },
  { pattern: /\d+(?:日|天)?首日付费留存|首日付费账号留存/, metric: 'retention_pay_d1' },
  { pattern: /按时段|小时|点-\d+点|首日注册设备数/, metric: 'first_day_register_device_hour' },
  { pattern: /截止到\d+点|按天截止|首日付费账号数/, metric: 'first_day_paid_account_cutoff_hour' },
];

const TEXT_DIMENSION_PATTERNS: Array<{ pattern: RegExp; dimension: string }> = [
  { pattern: /(?:按|以|在).{0,8}(?:应用类型|包体类型|app\s*package\s*type|package\s*type).{0,8}(?:维度|分布|汇总|拆分)|(?:应用类型|包体类型).{0,4}维度/i, dimension: 'app_package_type' },
  { pattern: /(?:按|以|在).{0,8}(?:媒体|渠道).{0,8}(?:维度|分布|汇总|拆分)|(?:媒体|渠道).{0,4}维度/, dimension: 'media_id' },
  { pattern: /(?:按|以|在).{0,8}(?:团队|部门).{0,8}(?:维度|分布|汇总|拆分)|(?:团队|部门).{0,4}维度/, dimension: 'team_id' },
  { pattern: /(?:按|以|在).{0,8}(?:终端|操作系统|os).{0,8}(?:维度|分布|汇总|拆分)|(?:终端|操作系统).{0,4}维度/i, dimension: 'os_type' },
  { pattern: /(?:按|以|在).{0,8}(?:素材|创意).{0,8}(?:维度|分布|汇总|拆分)|(?:素材|创意).{0,4}维度/, dimension: 'material_id' },
];

const METRIC_EXTRA_INPUTS: Record<string, Record<string, unknown>> = {
  roi_cumulative: { dataType: 'total' },
  roi_day: { dataType: 'section' },
  roi_week: { dataType: 'section' },
  roi_month: { dataType: 'section' },
  retention_device: { retentionType: 'DEVICE_RETENTION' },
  retention_register: { retentionType: 'REG_RETENTION' },
  retention_pay_d1: { retentionType: 'PAY_D1_RETENTION' },
};

function metricExtraInputs(metric: string): Record<string, unknown> | undefined {
  return METRIC_EXTRA_INPUTS[metric];
}

type RequestedTimeSlice = {
  key: 'day' | 'week' | 'month';
  label: string;
  timeType: 'DAY' | 'NATURAL_WEEK' | 'NATURAL_MONTH';
  timeRange: { start: string; end: string };
};

const TIME_SLICE_DIMENSION = 'time_slice';

function assignmentKey(capabilityId: string, metric: string): string {
  const extraInputs = metricExtraInputs(metric);
  return `${capabilityId}:${extraInputs ? JSON.stringify(extraInputs) : ''}`;
}

function domainAffinityScore(capability: ReportToolCapability, targetDomain: ReportCapabilityDomain): number {
  const text = `${capability.tool_name} ${(capability.route_terms || []).join(' ')}`.toLowerCase();
  const domainTerms: Record<string, string[]> = {
    daily: ['day_report', 'daily', '日报', '日周月报'],
    roi: ['roi'],
    retention: ['retention', '留存'],
    hourly: ['hour_report', 'hourly', '小时'],
  };
  const terms = domainTerms[targetDomain] || [targetDomain];
  let score = capability.report_domains.length === 1 ? 2 : 0;
  for (const term of terms) {
    score += text.indexOf(term.toLowerCase()) >= 0 ? 4 : 0;
  }
  score += capability.supported_granularity.length;
  return score;
}

export function extractMetricKeysFromText(text: string): string[] {
  const output = new Set<string>();
  const compact = String(text || '').replace(/\s+/g, '');
  for (const item of TEXT_METRIC_PATTERNS) {
    item.pattern.test(compact) && output.add(item.metric);
  }
  return Array.from(output);
}

export function hasMultipleTimeSliceRequest(text: string): boolean {
  return extractRequestedTimeSlices(text).length > 1;
}

export function canonicalDimensionKey(raw: string): string {
  const normalized = String(raw || '')
    .trim()
    .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    .replace(/__+/g, '_')
    .toLowerCase();
  const compact = normalized.replace(/[_\s-]/g, '');
  const aliases: Record<string, string> = {
    apppackagetype: 'app_package_type',
    packagetype: 'app_package_type',
    apppackage_type: 'app_package_type',
    package_type: 'app_package_type',
    apppackagetypes: 'app_package_type',
    app_package_types: 'app_package_type',
    packagetypes: 'app_package_type',
    package_types: 'app_package_type',
    mediaid: 'media_id',
    mediaids: 'media_id',
    media_ids: 'media_id',
    media: 'media_id',
    channel: 'media_id',
    teamid: 'team_id',
    teamids: 'team_id',
    team_ids: 'team_id',
    team: 'team_id',
    accountid: 'account_id',
    accountids: 'account_id',
    account_ids: 'account_id',
    account: 'account_id',
    ostype: 'os_type',
    ostypes: 'os_type',
    os_types: 'os_type',
    os: 'os_type',
    terminalid: 'terminal_id',
    terminal: 'terminal_id',
    materialid: 'material_id',
    material: 'material_id',
    creativeid: 'material_id',
    creative: 'material_id',
    campaignid: 'campaign_id',
    campaign: 'campaign_id',
    groupid: 'campaign_id',
    group: 'campaign_id',
    date: 'date',
  };
  return aliases[compact] || aliases[normalized] || normalized;
}

export function extractDimensionKeysFromText(text: string): string[] {
  const output = new Set<string>();
  const compact = String(text || '').replace(/\s+/g, '');
  for (const item of TEXT_DIMENSION_PATTERNS) {
    item.pattern.test(compact) && output.add(item.dimension);
  }
  return Array.from(output);
}

/**
 * 解析指标名称（支持别名和原始 key）
 */
export function resolveMetricKey(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  // 直接匹配别名
  const alias = METRIC_ALIASES[normalized] || METRIC_ALIASES[raw.trim()];
  if (alias) return alias;
  const keyAlias = METRIC_KEY_ALIASES[normalized] || METRIC_KEY_ALIASES[raw.trim()];
  if (keyAlias) return keyAlias;
  // 检查是否在已知指标列表中
  if (METRIC_TO_DOMAIN[normalized]) return normalized;
  return null;
}

// ─── Dimension Alias Resolution ────────────────────────────

/**
 * 常见维度别名映射。
 */
const DIMENSION_ALIASES: Record<string, string> = {
  '媒体': 'media',
  '渠道': 'channel',
  '项目': 'project',
  '应用': 'app',
  '应用类型': 'app_package_type',
  '包体类型': 'app_package_type',
  'app package type': 'app_package_type',
  'package type': 'app_package_type',
  '日期': 'date',
  '终端': 'terminal',
  '平台': 'platform',
  '素材': 'creative',
  '创意': 'creative',
};

/**
 * 解析维度名称（支持别名和原始 key）
 */
export function resolveDimensionKey(raw: string): string {
  const trimmed = raw.trim();
  return canonicalDimensionKey(DIMENSION_ALIASES[trimmed] || trimmed);
}

function supportsDimension(supportedDimensions: string[], dimension: string): boolean {
  const required = canonicalDimensionKey(dimension);
  return supportedDimensions.map(canonicalDimensionKey).indexOf(required) >= 0;
}

// ─── Tool Selection ────────────────────────────────────────

/**
 * 选择能覆盖所需维度和指标的工具。
 *
 * 核心过滤逻辑：
 * 1. 工具必须支持所有必需维度
 * 2. 工具的 domain 必须覆盖至少一个所需指标
 */
export function selectToolsForQuery(
  input: ToolSelectionInput,
  capabilities: ReportToolCapability[],
): ToolSelectionResult {
  const { requiredMetrics, requiredDimensions } = input;
  const reportCapabilities = capabilities.filter(cap => cap.capability_kind === 'report_query');

  // 1. 过滤支持所有必需维度的工具
  const dimensionCapable = reportCapabilities.filter(cap => {
    return requiredDimensions.every(dim =>
      supportsDimension(cap.supported_dimensions, dim),
    );
  });

  // 2. 为每个指标找到最佳工具
  const selectedMap = new Map<string, SelectedCapability>();
  const uncoveredMetrics: string[] = [];

  for (const metric of requiredMetrics) {
    const targetDomain = METRIC_TO_DOMAIN[metric];
    if (!targetDomain) {
      uncoveredMetrics.push(metric);
      continue;
    }

    // 在维度合格的工具中，找 domain 匹配的工具
    const domainCapable: ReportToolCapability[] = [];
    for (const cap of dimensionCapable) {
      cap.report_domains.indexOf(targetDomain) >= 0 ? domainCapable.push(cap) : undefined;
    }
    const matchingTool = domainCapable
      .sort((a, b) => domainAffinityScore(b, targetDomain) - domainAffinityScore(a, targetDomain))[0];

    if (!matchingTool) {
      uncoveredMetrics.push(metric);
      continue;
    }

    const key = assignmentKey(matchingTool.capability_id, metric);
    if (selectedMap.has(key)) {
      // 该工具已被选中，追加指标
      selectedMap.get(key)!.assignedMetrics.push(metric);
    } else {
      selectedMap.set(key, {
        capabilityId: matchingTool.capability_id,
        toolName: matchingTool.tool_name,
        serverName: matchingTool.server_name,
        assignedMetrics: [metric],
        supportedDimensions: matchingTool.supported_dimensions,
        reason: `domain "${targetDomain}" covers metric "${metric}"`,
        confidence: matchingTool.confidence === 'schema_confirmed' ? 0.9 : 0.7,
      });
    }
  }

  // 3. 检查是否有维度完全不被覆盖
  const allSupportedDims = new Set<string>();
  for (const cap of dimensionCapable) {
    for (const dim of cap.supported_dimensions) {
      allSupportedDims.add(dim);
    }
  }
  const normalizedSupportedDims = new Set(Array.from(allSupportedDims).map(canonicalDimensionKey));
  const uncoveredDimensions: string[] = [];
  for (const dim of requiredDimensions) {
    normalizedSupportedDims.has(canonicalDimensionKey(dim)) ? undefined : uncoveredDimensions.push(dim);
  }

  const selectedCapabilities = Array.from(selectedMap.values());

  return {
    selectedCapabilities,
    uncoveredMetrics,
    uncoveredDimensions,
    reason: selectedCapabilities.length > 0
      ? `Selected ${selectedCapabilities.length} tool(s) covering ${requiredMetrics.length - uncoveredMetrics.length}/${requiredMetrics.length} metrics`
      : 'No tool can cover all required dimensions',
  };
}

export function extractRequestedTimeSlices(text: string, fallbackTimeRange?: { start: string; end: string }): RequestedTimeSlice[] {
  const compact = String(text || '').replace(/\s+/g, '');
  const anchor = extractAnchorDate(compact, fallbackTimeRange);
  const sliceKeys: RequestedTimeSlice['key'][] = [];
  /日报|日数据|当天|当日/.test(compact) && sliceKeys.push('day');
  /所在周|那一周|自然周|本周/.test(compact) && sliceKeys.push('week');
  /所在月|那一月|自然月|本月/.test(compact) && sliceKeys.push('month');
  const uniqueKeys = Array.from(new Set(sliceKeys));
  return anchor && uniqueKeys.length > 1
    ? uniqueKeys.map(key => buildTimeSlice(key, anchor))
    : [];
}

function extractAnchorDate(text: string, fallbackTimeRange?: { start: string; end: string }): string | null {
  const matchers: Array<[RegExp, (match: RegExpExecArray) => string]> = [
    [/(?:^|[^0-9])(\d{4})(\d{2})(\d{2})(?:[^0-9]|$)/, match => `${match[1]}-${match[2]}-${match[3]}`],
    [/(\d{4})-(\d{2})-(\d{2})/, match => match[0]],
    [/(\d{4})年(\d{1,2})月(\d{1,2})[日号]?/, match => `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`],
  ];
  for (const [pattern, format] of matchers) {
    const match = pattern.exec(text);
    if (match) return format(match);
  }
  return fallbackTimeRange && fallbackTimeRange.start === fallbackTimeRange.end ? fallbackTimeRange.start : null;
}

function buildTimeSlice(key: RequestedTimeSlice['key'], anchor: string): RequestedTimeSlice {
  const date = parseUtcDate(anchor);
  const labels: Record<RequestedTimeSlice['key'], string> = {
    day: '日报',
    week: '所在周',
    month: '所在月',
  };
  const timeTypes: Record<RequestedTimeSlice['key'], RequestedTimeSlice['timeType']> = {
    day: 'DAY',
    week: 'NATURAL_WEEK',
    month: 'NATURAL_MONTH',
  };
  return {
    key,
    label: labels[key],
    timeType: timeTypes[key],
    timeRange: key === 'day'
      ? { start: anchor, end: anchor }
      : key === 'week'
        ? weekRange(date)
        : monthRange(date),
  };
}

function parseUtcDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function weekRange(date: Date): { start: string; end: string } {
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = addUtcDays(date, mondayOffset);
  const end = addUtcDays(start, 6);
  return { start: formatUtcDate(start), end: formatUtcDate(end) };
}

function monthRange(date: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: formatUtcDate(start), end: formatUtcDate(end) };
}

// ─── Query Decomposition ──────────────────────────────────

/**
 * 将用户查询拆解为多个子查询。
 *
 * 输入：
 * - metrics: 用户需要的指标列表（已解析为 BusinessMetric key）
 * - dimensions: 用户需要的维度列表（已解析为标准 key）
 * - capabilities: 当前可用的报表工具能力列表
 * - filters: 过滤条件
 * - timeRange: 时间范围
 */
export function decomposeQuery(params: {
  originalQuery: string;
  metrics: string[];
  dimensions: string[];
  capabilities: ReportToolCapability[];
  filters?: Record<string, string[]>;
  timeRange?: { start: string; end: string };
}): QueryDecomposition {
  const startTime = Date.now();

  const { originalQuery, metrics, dimensions, capabilities, filters, timeRange } = params;
  const requestedTimeSlices = extractRequestedTimeSlices(originalQuery, timeRange);
  const decompositionDimensions = requestedTimeSlices.length > 1
    ? Array.from(new Set([...dimensions, TIME_SLICE_DIMENSION]))
    : dimensions;

  // 1. 工具选择
  const selection = selectToolsForQuery(
    { requiredMetrics: metrics, requiredDimensions: dimensions, filters, timeRange },
    capabilities,
  );

  // 2. 为每个选中的工具生成 SubQuery
  const buildSubQuery = (cap: SelectedCapability, slice?: RequestedTimeSlice) =>
    createSubQuery({
      toolName: cap.toolName,
      serverName: cap.serverName,
      capabilityId: cap.capabilityId,
      metrics: cap.assignedMetrics,
      dimensions,
      filters,
      timeRange: slice?.timeRange || timeRange,
      extraInputs: {
        ...cap.assignedMetrics.reduce((acc, metric) => ({ ...acc, ...metricExtraInputs(metric) }), {} as Record<string, unknown>),
        ...(slice ? {
          timeType: slice.timeType,
          timeSlice: slice.key,
          timeSliceLabel: slice.label,
          startDate: slice.timeRange.start,
          endDate: slice.timeRange.end,
          start_date: slice.timeRange.start,
          end_date: slice.timeRange.end,
        } : {}),
      },
    });
  const subQueries: SubQuery[] = requestedTimeSlices.length > 1
    ? requestedTimeSlices.flatMap(slice => selection.selectedCapabilities.map(cap => buildSubQuery(cap, slice)))
    : selection.selectedCapabilities.map(cap => buildSubQuery(cap));

  const confidence = selection.uncoveredMetrics.length === 0
    ? 0.9
    : Math.max(0.3, 0.9 - selection.uncoveredMetrics.length * 0.2);

  return {
    originalQuery,
    requiredDimensions: decompositionDimensions,
    requiredMetrics: metrics,
    subQueries,
    confidence,
    reason: selection.reason +
      (selection.uncoveredMetrics.length > 0
        ? `; uncovered: ${selection.uncoveredMetrics.join(', ')}`
        : ''),
    decompositionLatencyMs: Date.now() - startTime,
  };
}

// ─── Extract Metrics/Dimensions from SemanticFrame ────────

/**
 * 从 semanticFrame 的 extractedEntities 或 userRequirement 中提取指标和维度。
 * 这是 query decomposer 与现有理解链路的衔接点。
 */
export function extractMetricsAndDimensions(semanticFrame: {
  extractedEntities?: Array<{ type: string; key: string; value?: string }>;
  resolvedMetrics?: Array<{ key: string; raw?: string }>;
  resolvedDimensions?: Array<{ key: string; raw?: string }>;
}, userRequirement?: {
  metrics?: string[];
  dimensions?: string[];
  query?: string;
}): { metrics: string[]; dimensions: string[] } {
  const metrics = new Set<string>();
  const dimensions = new Set<string>();

  // 从 resolvedMetrics 提取
  if (semanticFrame.resolvedMetrics) {
    for (const m of semanticFrame.resolvedMetrics) {
      const resolved = resolveMetricKey(m.key);
      if (resolved) metrics.add(resolved);
    }
  }

  // 从 resolvedDimensions 提取
  if (semanticFrame.resolvedDimensions) {
    for (const d of semanticFrame.resolvedDimensions) {
      dimensions.add(resolveDimensionKey(d.key));
    }
  }

  // 从 extractedEntities 补充
  if (semanticFrame.extractedEntities) {
    for (const e of semanticFrame.extractedEntities) {
      if (e.type === 'metric') {
        const resolved = resolveMetricKey(e.value || e.key);
        if (resolved) metrics.add(resolved);
      } else if (e.type === 'dimension' || e.type === 'breakdown') {
        dimensions.add(resolveDimensionKey(e.value || e.key));
      }
    }
  }

  // 从 userRequirement 补充
  if (userRequirement?.metrics) {
    for (const m of userRequirement.metrics) {
      const resolved = resolveMetricKey(m);
      if (resolved) metrics.add(resolved);
    }
  }
  if (userRequirement?.query) {
    for (const m of extractMetricKeysFromText(userRequirement.query)) metrics.add(m);
    for (const d of extractDimensionKeysFromText(userRequirement.query)) dimensions.add(d);
  }
  if (userRequirement?.dimensions) {
    for (const d of userRequirement.dimensions) {
      dimensions.add(resolveDimensionKey(d));
    }
  }

  return {
    metrics: Array.from(metrics),
    dimensions: Array.from(dimensions),
  };
}

// ─── Re-exports ──────────────────────────────────────────

export { METRIC_TO_DOMAIN, DOMAIN_TO_METRICS, METRIC_ALIASES };
