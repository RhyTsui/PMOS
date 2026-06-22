import type { FederatedQueryResult, QueryDecomposition } from '@/contracts/multi-query';

type MetricProjection = {
  label: string;
  value: string;
  source: string;
};

const DIRECT_METRIC_COLUMN_CANDIDATES: Record<string, string[]> = {
  cost: ['cost_amount', 'composite_cost_amount', 'cost', 'spend_amount'],
  activation: ['composite_act_cnt', 'consuming_composite_act_cnt', 'consuming_ago1_composite_act_cnt', 'activation', 'activation_cnt', 'act_cnt'],
  register: ['composite_reg_cnt', 'consuming_composite_reg_cnt', 'register', 'reg_cnt'],
  payment: ['composite_pay_cnt', 'composite_pay_d1_cnt', 'payment', 'pay_cnt'],
  first_day_payment: ['composite_pay_d1_cnt', 'composite_pay_d1_user_cnt', 'pay_d1_cnt', 'first_day_pay_cnt'],
  valid: ['composite_effective_d1_cnt', 'composite_valid_cnt', 'effective_d1_cnt', 'valid_d1_cnt', 'valid_cnt', 'valid_count', 'effective_cnt'],
  discounted_cost: ['rebate_cost_amount', 'rebate_cash_cost_amount', 'discount_cost_amount', 'discounted_cost_amount', 'cash_cost_amount', 'composite_cash_cost_amount'],
};

export function buildRequestedMetricSummary(
  message: string,
  decomposition: QueryDecomposition,
  federatedResult: FederatedQueryResult,
): string | null {
  const resultBySubQueryId = new Map(federatedResult.subQueryResults.map(item => [item.subQueryId, item]));
  const projections: MetricProjection[] = [];

  for (const subQuery of decomposition.subQueries) {
    const subResult = resultBySubQueryId.get(subQuery.subQueryId);
    const row = subResult?.rows[0];
    if (!subResult?.ok || !row) continue;
    for (const metric of subQuery.metrics) {
      const projected = projectMetricValue(
        message,
        metric,
        row,
        subResult.columns.map(column => column.key),
        subResult.toolName,
        typeof subQuery.extraInputs?.timeSliceLabel === 'string' ? subQuery.extraInputs.timeSliceLabel : '',
        typeof subQuery.extraInputs?.dataType === 'string' ? subQuery.extraInputs.dataType : '',
      );
      projected ? projections.push(projected) : undefined;
    }
  }

  const unique = uniqueByLabel(projections);
  return unique.length ? [
    '**关键指标**',
    '| 指标 | 结果 | 来源 |',
    '| --- | --- | --- |',
    ...unique.map(item => `| ${item.label} | ${item.value} | ${item.source} |`),
  ].join('\n') : null;
}

export function federatedResultToMarkdown(result: FederatedQueryResult): string {
  if (result.columns.length === 0 || result.rows.length === 0) {
    return '> 当前候选工具还不能直接完成这次查询，未获得可展示的数据结果。';
  }

  const visibleColumns = result.columns.slice(0, 12);
  const header = `| ${visibleColumns.map(column => column.displayName).join(' | ')} |`;
  const separator = `| ${visibleColumns.map(() => '---').join(' | ')} |`;
  const rows = result.rows.map(row =>
    `| ${visibleColumns.map(column => formatCellValue(row[column.key])).join(' | ')} |`,
  );
  const omittedColumns = result.columns.length - visibleColumns.length;
  return [
    header,
    separator,
    ...rows,
    omittedColumns > 0 ? `\n> 已展示前 ${visibleColumns.length} 列，另有 ${omittedColumns} 列已作为证据保留。` : '',
  ].filter(Boolean).join('\n');
}

function projectMetricValue(
  message: string,
  metric: string,
  row: Record<string, unknown>,
  columnKeys: string[],
  toolName: string,
  labelPrefix = '',
  dataType = '',
): MetricProjection | null {
  const roiProjection = projectRoiMetricValue(message, metric, row, columnKeys, toolName, dataType);
  if (roiProjection) return withLabelPrefix(roiProjection, labelPrefix);
  const day = retentionDayFromMessage(message, metric);
  const key = pickMetricColumn(row, columnKeys, metricColumnCandidates(metric, day));
  if (!key) return null;
  return {
    label: metricDisplayLabel(metric, day, labelPrefix),
    value: formatMetricProjectionValue(row[key], metric, key),
    source: toolName,
  };
}

function withLabelPrefix(projection: MetricProjection, labelPrefix: string): MetricProjection {
  return labelPrefix ? { ...projection, label: `${labelPrefix}${projection.label}` } : projection;
}

function projectRoiMetricValue(
  message: string,
  metric: string,
  row: Record<string, unknown>,
  columnKeys: string[],
  toolName: string,
  dataType = '',
): MetricProjection | null {
  const period = roiPeriodFromMessage(message, metric);
  if (metric === 'roi_cumulative') {
    const key = period ? pickMetricColumn(row, columnKeys, roiRateColumnCandidates(period.unit, period.value)) : null;
    if (!period || !key) return null;
    return {
      label: roiCumulativeLabel(period, message),
      value: formatMetricProjectionValue(row[key], metric, key),
      source: toolName,
    };
  }
  if (metric === 'roi_day' || metric === 'roi_week' || metric === 'roi_month') {
    if (!period) return null;
    const key = pickMetricColumn(row, columnKeys, roiRateColumnCandidates(period.unit, period.value));
    if (dataType === 'section') {
      if (!key) return null;
      return {
        label: roiPeriodLabel(period),
        value: formatMetricProjectionValue(row[key], metric, key),
        source: toolName,
      };
    }
    const previousKey = period.value > 1
      ? pickMetricColumn(row, columnKeys, roiRateColumnCandidates(period.unit, period.value - 1))
      : null;
    const value = numericMetricValue(key ? row[key] : undefined);
    const previousValue = numericMetricValue(previousKey ? row[previousKey] : undefined);
    if (!key || value === null || (period.value > 1 && previousValue === null)) return null;
    return {
      label: roiPeriodLabel(period),
      value: formatMetricProjectionValue(period.value > 1 ? value - (previousValue || 0) : value, metric, key),
      source: toolName,
    };
  }
  if (metric === 'roi') {
    const key = pickMetricColumn(row, columnKeys, ['composite_start_total_roi_rate', 'composite_start_total_roi_cash_rate', 'roi1_rate', 'cash_roi1_rate']);
    if (!key) return null;
    return {
      label: 'ROI',
      value: formatMetricProjectionValue(row[key], metric, key),
      source: toolName,
    };
  }
  return null;
}

function uniqueByLabel(items: MetricProjection[]): MetricProjection[] {
  const output: MetricProjection[] = [];
  const seen: Record<string, true> = {};
  for (const item of items) {
    seen[item.label] ? undefined : (seen[item.label] = true, output.push(item));
  }
  return output;
}

function metricColumnCandidates(metric: string, day?: number): string[] {
  const retentionDay = day || 1;
  return DIRECT_METRIC_COLUMN_CANDIDATES[metric] || (
    metric.indexOf('retention') === 0
      ? [
        `composite_retention_d${retentionDay}_rate`,
        `retention_d${retentionDay}_rate`,
        `composite_retention_d${retentionDay}_cnt`,
        `retention_d${retentionDay}_cnt`,
      ]
      : [metric, `composite_${metric}`]
  );
}

type RoiPeriod = {
  unit: 'day' | 'week' | 'month';
  value: number;
};

function roiPeriodFromMessage(message: string, metric: string): RoiPeriod | null {
  const normalized = String(message || '').replace(/\s+/g, '');
  if (metric === 'roi_cumulative') {
    return matchRoiPeriod(normalized, [
      /累计(\d+)(日|天|周|月)?roi/i,
      /(\d+)(日|天|周|月)?累计roi/i,
      /(?:^|[^第])(\d+)(周|月)roi/i,
    ]);
  }
  if (metric === 'roi_day') return matchRoiPeriod(normalized, [/第(\d+)(日|天)roi/i]);
  if (metric === 'roi_week') return matchRoiPeriod(normalized, [/第(\d+)周roi/i, /(?:^|[^第])(\d+)周roi/i]);
  if (metric === 'roi_month') return matchRoiPeriod(normalized, [/第(\d+)月roi/i, /(?:^|[^第])(\d+)月roi/i]);
  return null;
}

function matchRoiPeriod(message: string, patterns: RegExp[]): RoiPeriod | null {
  for (const pattern of patterns) {
    const match = pattern.exec(message);
    if (!match?.[1]) continue;
    return {
      unit: roiUnitFromText(match[2] || match[0] || ''),
      value: Number(match[1]),
    };
  }
  return null;
}

function roiUnitFromText(unit: string): RoiPeriod['unit'] {
  return unit.indexOf('周') >= 0 ? 'week' : unit.indexOf('月') >= 0 ? 'month' : 'day';
}

function roiRateColumnCandidates(unit: RoiPeriod['unit'], value: number): string[] {
  const prefix = unit === 'week' ? 'w_' : unit === 'month' ? 'm_' : '';
  return [
    `${prefix}roi${value}_rate`,
    `${prefix}cash_roi${value}_rate`,
    `${prefix}composite_roi${value}_rate`,
    `${prefix}composite_cash_roi${value}_rate`,
  ];
}

function roiCumulativeLabel(period: RoiPeriod, message = ''): string {
  const unit = roiUnitLabel(period.unit);
  return period.unit === 'day'
    ? `累计${period.value}${unit}ROI`
    : /累计\s*roi|累计ROI|累计/.test(message)
      ? `${period.value}${unit}累计ROI`
      : `${period.value}${unit}ROI`;
}

function roiPeriodLabel(period: RoiPeriod): string {
  return `第${period.value}${roiUnitLabel(period.unit)}ROI`;
}

function roiUnitLabel(unit: RoiPeriod['unit']): string {
  return ({ day: '日', week: '周', month: '月' } as const)[unit];
}

function pickMetricColumn(
  row: Record<string, unknown>,
  columnKeys: string[],
  candidates: string[],
): string | null {
  const available = [...Object.keys(row), ...columnKeys];
  for (const candidate of candidates) {
    if (available.indexOf(candidate) >= 0 && isPresentMetricValue(row[candidate])) return candidate;
  }
  for (const candidate of candidates) {
    const matched = available.find(key => key.endsWith(candidate) && isPresentMetricValue(row[key]));
    if (matched) return matched;
  }
  return null;
}

function isPresentMetricValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim() !== '-';
}

function numericMetricValue(value: unknown): number | null {
  if (!isPresentMetricValue(value)) return null;
  const raw = typeof value === 'number' ? value : Number(String(value).replace(/%$/, ''));
  return Number.isFinite(raw) ? raw : null;
}

function metricDisplayLabel(metric: string, day?: number, labelPrefix = ''): string {
  const retentionDay = day || 1;
  const labels: Record<string, string> = {
    cost: '消耗',
    activation: '激活数',
    register: '注册数',
    payment: '付费数',
    first_day_payment: '首日付费数',
    valid: '有效数',
    discounted_cost: '折后消耗',
    retention_device: `${retentionDay}日设备留存率`,
    retention_register: `${retentionDay}日注册留存率`,
    retention_pay_d1: `${retentionDay}日首日付费留存率`,
    retention_d1: `${retentionDay}日留存率`,
  };
  const label = labels[metric] || metric;
  return labelPrefix ? `${labelPrefix}${label}` : label;
}

function retentionDayFromMessage(message: string, metric: string): number | undefined {
  const normalized = String(message || '').replace(/\s+/g, '');
  const patterns: Record<string, RegExp[]> = {
    retention_device: [/(\d+)(?:日|天)?(?:设备|新增设备)留存/],
    retention_register: [/(\d+)(?:日|天)?注册(?:用户)?留存/],
    retention_pay_d1: [/(\d+)(?:日|天)?首日付费(?:账号)?留存/],
    retention_d1: [/(\d+)(?:日|天)?留存/],
  };
  for (const pattern of patterns[metric] || []) {
    const match = pattern.exec(normalized);
    if (match?.[1]) return Number(match[1]);
  }
  return undefined;
}

function formatMetricProjectionValue(value: unknown, metric: string, columnKey: string): string {
  if (!isPresentMetricValue(value)) return '-';
  const raw = typeof value === 'number' ? value : Number(String(value).replace(/%$/, ''));
  if (Number.isFinite(raw) && (metric.indexOf('retention') === 0 || /(?:^|_)rate$/.test(columnKey))) {
    return `${(Math.abs(raw) <= 1 ? raw * 100 : raw).toFixed(2)}%`;
  }
  if (Number.isFinite(raw)) return formatNumberWithGrouping(raw, metric === 'cost' || metric === 'discounted_cost' || /(?:^|_)(?:cost|amount)(?:_|$)/.test(columnKey));
  return String(value);
}

function formatCellValue(value: unknown): string {
  return value === null || value === undefined
    ? '-'
    : typeof value === 'number'
      ? formatNumberWithGrouping(value, !Number.isInteger(value))
      : String(value);
}

function formatNumberWithGrouping(value: number, fixedTwoDecimals: boolean): string {
  return value.toLocaleString('en-US', fixedTwoDecimals
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 0 });
}
