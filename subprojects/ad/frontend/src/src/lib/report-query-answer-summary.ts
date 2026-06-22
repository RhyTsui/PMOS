import type { ReportDisplayField } from './report-query-orchestrator';

export type ReportAnswerConfidence = 'high' | 'medium' | 'low' | 'unknown';

export interface ReportAnswerConclusion {
  id: string;
  title: string;
  summary: string;
  confidence: ReportAnswerConfidence;
  evidenceRefIds: string[];
  sourceRefIds: string[];
}

export interface ReportAnswerEvidenceItem {
  id: string;
  title: string;
  summary: string;
  evidenceRefId?: string;
  sourceRefId?: string;
  fields?: Record<string, unknown>;
}

export interface ReportAnswerMethodology {
  metrics: string[];
  dimensions: string[];
  dateRange: { start_date: string; end_date: string };
  granularity: 'hour' | 'day' | 'unknown';
  requestedView?: 'trend' | 'detail' | 'comparison';
  filters: Record<string, unknown>;
  sourceTool: { serverName: string; toolName: string };
  dataAsOf?: string;
}

export interface ReportAnswerRisk {
  id: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  title: string;
  summary: string;
  evidenceRefIds: string[];
  sourceRefIds: string[];
}

export interface ReportAnswerNextAction {
  id: string;
  label: string;
  type: 'follow_up' | 'open_panel' | 'create_task' | 'run_tool' | 'handoff' | 'export';
  intent?: string;
  riskLevel: 'low' | 'medium' | 'high';
  autoExecutable: boolean;
  params?: Record<string, unknown>;
}

export interface ReportAnswerContract {
  contractType: 'report-answer';
  version: '1.0.0';
  status: 'success' | 'empty' | 'failed' | 'blocked' | 'business_failed';
  businessOutcome?: string;
  conclusions: ReportAnswerConclusion[];
  evidence: ReportAnswerEvidenceItem[];
  methodology: ReportAnswerMethodology;
  risks: ReportAnswerRisk[];
  nextActions: ReportAnswerNextAction[];
  evidenceRefIds: string[];
  sourceRefIds: string[];
  confidence: ReportAnswerConfidence;
}

function normalizeFieldToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
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

function formatSummaryValue(value: number, field: ReportDisplayField): string {
  const hasDecimal = Math.abs(value - Math.round(value)) > 0.000001;
  if (field.formatter === 'currency-2') {
    return `${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${field.unit ? ` ${field.unit}` : ''}`;
  }
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: hasDecimal ? 2 : 0,
  });
}

function formatEvidenceValue(value: unknown, field: ReportDisplayField): string {
  if (value === undefined || value === null || value === '') return '--';
  if (field.formatter === 'currency-2' || field.formatter === 'number-2' || field.formatter === 'percent-2') {
    const parsed = parseReportMetricNumber(value);
    if (parsed !== null) {
      if (field.formatter === 'percent-2') {
        return `${(parsed * (Math.abs(parsed) <= 1 ? 100 : 1)).toFixed(2)}%`;
      }
      return formatSummaryValue(parsed, field);
    }
  }
  return String(value);
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function buildDetailPreviewTable(params: {
  rows: Array<Record<string, unknown>>;
  displayFields: ReportDisplayField[];
}): string {
  const header = `| ${params.displayFields.map(field => escapeMarkdownTableCell(field.displayName)).join(' | ')} |`;
  const separator = `| ${params.displayFields.map(() => '---').join(' | ')} |`;
  const body = params.rows.slice(0, 5).map(row =>
    `| ${params.displayFields.map(field => escapeMarkdownTableCell(formatEvidenceValue(row[field.key], field))).join(' | ')} |`,
  );
  return [header, separator, ...body].join('\n');
}

export function buildMetricSummaryAnswerMarkdown(params: {
  rows: Array<Record<string, unknown>>;
  metrics: string[];
  dimensions: string[];
  displayFields: ReportDisplayField[];
  date_range: { start_date: string; end_date: string };
  message: string;
}): string | undefined {
  const nonDateDimensions = params.dimensions.filter(dimension => normalizeFieldToken(dimension) !== 'date');
  const shouldSkip = params.rows.length <= 1
    || !params.metrics.length
    || nonDateDimensions.length > 0
    || /趋势|每日|按日|明细|列表|表格|完整|全部|全量|所有|各|分媒体|分渠道|分应用|按媒体|按渠道|按应用|trend|detail|table|list/i.test(params.message);
  const metricFields = shouldSkip ? [] : params.metrics
    .map((metric) => {
      const requestedToken = normalizeFieldToken(metric);
      return params.displayFields.find(field => field.role === 'metric' && normalizeFieldToken(field.requestedKey || '') === requestedToken);
    })
    .filter((field): field is ReportDisplayField => Boolean(field && field.formatter !== 'percent-2'));
  const summaryItems = metricFields.map((field) => {
    const total = params.rows.reduce((sum, row) => {
      const value = parseReportMetricNumber(row[field.key]);
      return value === null ? sum : sum + value;
    }, 0);
    return { field, total };
  }).filter(item => Number.isFinite(item.total));
  const dateText = params.date_range.start_date === params.date_range.end_date
    ? params.date_range.start_date
    : `${params.date_range.start_date} 至 ${params.date_range.end_date}`;
  const metricsText = summaryItems
    .map(item => `${item.field.displayName} ${formatSummaryValue(item.total, item.field)}`)
    .join('，');
  return summaryItems.length
    ? `${dateText} 总计：${metricsText}。\n\n数据来自 ${params.rows.length} 条明细结果，完整明细已保留在结果中。`
    : undefined;
}

function displayNameForKey(key: string, fields: ReportDisplayField[]): string {
  return fields.find(field => field.key === key || field.requestedKey === key)?.displayName || key;
}

function compactList(values: string[], fallback: string): string {
  const unique = Array.from(new Set(values.filter(Boolean)));
  return unique.length ? unique.map(value => value.trim()).filter(Boolean).join('、') : fallback;
}

function dateRangeText(dateRange: { start_date: string; end_date: string }): string {
  return dateRange.start_date === dateRange.end_date
    ? dateRange.start_date
    : `${dateRange.start_date} 至 ${dateRange.end_date}`;
}

function sourceIdFor(serverName: string, toolName: string): string {
  return `src-${toolName}-${serverName}`;
}

function evidenceIdFor(serverName: string, toolName: string): string {
  return `ev-${toolName}-${serverName}`;
}

function readFilters(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    if (key === 'source' || key === 'modelCandidateSets') continue;
    if (Array.isArray(item) && item.length > 0) output[key] = item;
    else if (typeof item === 'string' && item.trim()) output[key] = item;
    else if (typeof item === 'number' || typeof item === 'boolean') output[key] = item;
  }
  return output;
}

function confidenceFor(params: {
  status: ReportAnswerContract['status'];
  hasRows: boolean;
  hasRisks: boolean;
  hasMissingFields: boolean;
}): ReportAnswerConfidence {
  if (params.status === 'failed' || params.status === 'blocked' || params.status === 'business_failed') return 'low';
  if (params.status === 'empty') return 'medium';
  if (params.hasMissingFields || params.hasRisks) return 'medium';
  return params.hasRows ? 'high' : 'unknown';
}

function nextActionsFor(params: {
  status: ReportAnswerContract['status'];
  requestedView?: 'trend' | 'detail' | 'comparison';
  risks: ReportAnswerRisk[];
  recommendedNextActions?: string[];
}): ReportAnswerNextAction[] {
  const actions: ReportAnswerNextAction[] = [];
  const add = (action: ReportAnswerNextAction) => {
    if (!actions.some(item => item.id === action.id || item.label === action.label)) actions.push(action);
  };
  if (params.status === 'success') {
    if (params.requestedView !== 'detail') {
      add({
        id: 'view-detail',
        label: '查看明细数据',
        type: 'open_panel',
        intent: 'inspect_report_detail',
        riskLevel: 'low',
        autoExecutable: true,
      });
    }
    add({
      id: 'continue-analysis',
      label: '继续下钻分析',
      type: 'follow_up',
      intent: 'continue_report_analysis',
      riskLevel: 'low',
      autoExecutable: false,
    });
  }
  if (params.status === 'empty' || params.risks.some(risk => risk.id === 'data-coverage')) {
    add({
      id: 'adjust-date-range',
      label: '调整时间范围后再查',
      type: 'follow_up',
      intent: 'adjust_report_date_range',
      riskLevel: 'low',
      autoExecutable: false,
    });
  }
  for (const label of params.recommendedNextActions || []) {
    add({
      id: `recommended-${actions.length + 1}`,
      label,
      type: 'follow_up',
      intent: 'resolve_report_risk',
      riskLevel: 'low',
      autoExecutable: false,
    });
  }
  if (!actions.length) {
    add({
      id: 'retry-query',
      label: '调整条件后重试',
      type: 'follow_up',
      intent: 'retry_report_query',
      riskLevel: 'low',
      autoExecutable: false,
    });
  }
  return actions;
}

export function buildReportAnswerContract(params: {
  status: ReportAnswerContract['status'];
  businessOutcome?: string;
  message: string;
  rows: Array<Record<string, unknown>>;
  metrics: string[];
  dimensions: string[];
  displayFields: ReportDisplayField[];
  dateRange: { start_date: string; end_date: string };
  requestedView?: 'trend' | 'detail' | 'comparison';
  questionType: 'hour' | 'daily' | 'roi' | 'retention';
  serverName: string;
  toolName: string;
  resolvedFilters?: unknown;
  qualityCheck?: {
    ok?: boolean;
    empty_table?: boolean;
    missing_fields?: string[];
    date_gaps?: string[];
    anomaly_warnings?: string[];
    metric_risks?: string[];
    issues?: string[];
    root_cause?: string;
    recommended_next_actions?: string[];
  };
  dataCoverage?: {
    date_point_count?: number;
    sufficient_for_trend?: boolean;
    issues?: string[];
  };
}): ReportAnswerContract {
  const sourceRefId = sourceIdFor(params.serverName, params.toolName);
  const evidenceRefId = evidenceIdFor(params.serverName, params.toolName);
  const metricNames = params.metrics.map(metric => displayNameForKey(metric, params.displayFields));
  const dimensionNames = params.dimensions.map(dimension => displayNameForKey(dimension, params.displayFields));
  const period = dateRangeText(params.dateRange);
  const risks: ReportAnswerRisk[] = [];
  const addRisk = (risk: ReportAnswerRisk) => {
    if (!risks.some(item => item.id === risk.id && item.summary === risk.summary)) risks.push(risk);
  };

  if (params.status === 'empty') {
    addRisk({
      id: 'empty-result',
      severity: 'medium',
      title: '没有匹配数据',
      summary: params.message || '当前条件下没有查到可用数据。',
      evidenceRefIds: [evidenceRefId],
      sourceRefIds: [sourceRefId],
    });
  }
  for (const field of params.qualityCheck?.missing_fields || []) {
    addRisk({
      id: `missing-field-${field}`,
      severity: 'medium',
      title: '结果字段不完整',
      summary: `结果缺少 ${field} 字段，相关结论需要复核。`,
      evidenceRefIds: [evidenceRefId],
      sourceRefIds: [sourceRefId],
    });
  }
  for (const issue of [...(params.qualityCheck?.issues || []), ...(params.dataCoverage?.issues || [])]) {
    addRisk({
      id: `quality-${normalizeFieldToken(issue).slice(0, 24) || risks.length + 1}`,
      severity: params.status === 'success' ? 'low' : 'medium',
      title: '数据质量提示',
      summary: issue,
      evidenceRefIds: [evidenceRefId],
      sourceRefIds: [sourceRefId],
    });
  }
  for (const risk of [...(params.qualityCheck?.metric_risks || []), ...(params.qualityCheck?.anomaly_warnings || [])]) {
    addRisk({
      id: `metric-risk-${normalizeFieldToken(risk).slice(0, 24) || risks.length + 1}`,
      severity: 'medium',
      title: '口径或匹配风险',
      summary: risk,
      evidenceRefIds: [evidenceRefId],
      sourceRefIds: [sourceRefId],
    });
  }
  if (params.dataCoverage && params.dataCoverage.sufficient_for_trend === false) {
    addRisk({
      id: 'data-coverage',
      severity: 'low',
      title: '趋势数据不足',
      summary: `当前只有 ${params.dataCoverage.date_point_count ?? 0} 个时间点，趋势判断需要更多数据。`,
      evidenceRefIds: [evidenceRefId],
      sourceRefIds: [sourceRefId],
    });
  }
  if (params.status === 'failed' || params.status === 'blocked' || params.status === 'business_failed') {
    addRisk({
      id: 'execution-not-completed',
      severity: params.status === 'blocked' ? 'high' : 'medium',
      title: '查询未完成',
      summary: params.message || '报表查询未能完成，不能形成确定数据结论。',
      evidenceRefIds: [evidenceRefId],
      sourceRefIds: [sourceRefId],
    });
  }

  const confidence = confidenceFor({
    status: params.status,
    hasRows: params.rows.length > 0,
    hasRisks: risks.length > 0,
    hasMissingFields: Boolean(params.qualityCheck?.missing_fields?.length),
  });
  const conclusionSummary = params.status === 'success'
    ? `${period} 的${params.requestedView === 'trend' ? '趋势' : params.requestedView === 'comparison' ? '对比' : '明细'}结果已生成，共 ${params.rows.length} 条数据；核心指标为 ${compactList(metricNames, '当前指标')}。`
    : params.status === 'empty'
      ? `${period} 未查到符合条件的数据，当前不能形成指标结论。`
      : `本次查询未完成：${params.message || '数据服务暂未返回可用结果。'}`;

  const evidence: ReportAnswerEvidenceItem[] = [
    {
      id: 'row-count',
      title: '返回数据量',
      summary: `本次返回 ${params.rows.length} 条结果。`,
      evidenceRefId,
      sourceRefId,
      fields: { rowCount: params.rows.length, columns: params.displayFields.map(field => field.key) },
    },
    {
      id: 'time-range',
      title: '统计时间范围',
      summary: `统计范围为 ${period}。`,
      evidenceRefId,
      sourceRefId,
      fields: params.dateRange,
    },
    {
      id: 'field-coverage',
      title: '字段覆盖',
      summary: `指标：${compactList(metricNames, '未声明')}；维度：${compactList(dimensionNames, '无额外维度')}。`,
      evidenceRefId,
      sourceRefId,
      fields: {
        metrics: params.metrics,
        dimensions: params.dimensions,
        displayFields: params.displayFields.map(field => ({ key: field.key, displayName: field.displayName, role: field.role })),
      },
    },
  ];

  if (params.status === 'success' && params.requestedView === 'detail' && params.rows.length > 1 && params.displayFields.length) {
    evidence.push({
      id: 'detail-preview',
      title: '明细预览',
      summary: `明细预览：\n${buildDetailPreviewTable({ rows: params.rows, displayFields: params.displayFields })}`,
      evidenceRefId,
      sourceRefId,
      fields: {
        rowCount: params.rows.length,
        columns: params.displayFields.map(field => field.key),
      },
    });
  } else if (params.status === 'success' && params.requestedView === 'detail' && params.rows.length && params.displayFields.length) {
    const sampleRow = params.rows[0] || {};
    const sampleValues = params.displayFields
      .map(field => `${field.displayName}为 ${formatEvidenceValue(sampleRow[field.key], field)}`)
      .filter(Boolean);
    if (sampleValues.length) {
      evidence.push({
        id: 'detail-sample',
        title: '明细样例',
        summary: `首条明细：${sampleValues.join('，')}。`,
        evidenceRefId,
        sourceRefId,
        fields: Object.fromEntries(params.displayFields.map(field => [field.key, sampleRow[field.key]])),
      });
    }
  }

  return {
    contractType: 'report-answer',
    version: '1.0.0',
    status: params.status,
    businessOutcome: params.businessOutcome,
    conclusions: [{
      id: 'primary',
      title: params.status === 'success' ? '查询结论' : '当前结论',
      summary: conclusionSummary,
      confidence,
      evidenceRefIds: [evidenceRefId],
      sourceRefIds: [sourceRefId],
    }],
    evidence,
    methodology: {
      metrics: metricNames,
      dimensions: dimensionNames,
      dateRange: params.dateRange,
      granularity: params.questionType === 'hour' ? 'hour' : 'day',
      requestedView: params.requestedView,
      filters: readFilters(params.resolvedFilters),
      sourceTool: { serverName: params.serverName, toolName: params.toolName },
      dataAsOf: params.dateRange.end_date,
    },
    risks,
    nextActions: nextActionsFor({
      status: params.status,
      requestedView: params.requestedView,
      risks,
      recommendedNextActions: params.qualityCheck?.recommended_next_actions,
    }),
    evidenceRefIds: [evidenceRefId],
    sourceRefIds: [sourceRefId],
    confidence,
  };
}

export function renderReportAnswerContractMarkdown(contract: ReportAnswerContract): string {
  const conclusionText = contract.conclusions.map(item => `- ${item.summary}`).join('\n');
  const methodologyText = [
    `- 时间范围：${dateRangeText(contract.methodology.dateRange)}`,
    `- 指标：${compactList(contract.methodology.metrics, '未声明')}`,
    `- 维度：${compactList(contract.methodology.dimensions, '无额外维度')}`,
    `- 数据来源：${contract.methodology.sourceTool.serverName}.${contract.methodology.sourceTool.toolName}`,
  ].join('\n');
  const evidenceText = contract.evidence.map(item => `- ${item.summary}`).join('\n');
  const riskText = contract.risks.length
    ? contract.risks.map(item => `- ${item.summary}`).join('\n')
    : '- 未发现阻断性风险。';
  const actionText = contract.nextActions.map(item => `- ${item.label}`).join('\n');
  return [
    '**结论**',
    conclusionText,
    '',
    '**证据**',
    evidenceText,
    '',
    '**口径**',
    methodologyText,
    '',
    '**风险**',
    riskText,
    '',
    '**下一步**',
    actionText,
  ].join('\n');
}
