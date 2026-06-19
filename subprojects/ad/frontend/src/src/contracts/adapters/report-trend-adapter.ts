import type { SemanticResultContract } from '../semantic/semantic-result-contract';
import type { ActionContract } from '../semantic/action-contract';
import type { EvidenceRef } from '../semantic/evidence-contract';
import type { SourceRef } from '../semantic/source-contract';
import type { ReportTrendData, ReportTrendChartSpec, ReportTrendMetricSpec, ReportTrendSeriesSpec } from '../validation/report-trend-validator';

export interface ReportTrendAdapterInput {
  resultId: string;
  conversationId?: string;
  messageId?: string;
  title: string;
  requestedView: ReportTrendData['requestedView'];
  dateRange: NonNullable<ReportTrendData['dateRange']>;
  granularity: NonNullable<ReportTrendData['granularity']>;
  dataCoverage: NonNullable<ReportTrendData['dataCoverage']>;
  dataset?: ReportTrendData['dataset'];
  series?: ReportTrendData['series'];
  metricName?: string;
  dimensions?: string[];
  insights?: ReportTrendData['insights'];
  sourceRefs: SourceRef[];
  evidenceRefs: EvidenceRef[];
  actions?: ActionContract[];
  createdAt?: string;
}

export function reportTrendToSemanticResult(input: ReportTrendAdapterInput): SemanticResultContract<ReportTrendData> {
  const insufficient = input.dataCoverage.status === 'insufficient' || input.dataCoverage.availablePoints < 2;
  const inputSeries = Array.isArray(input.series) && input.series.length > 0
    ? input.series
    : [{
        name: input.metricName || 'value',
        metricKey: input.metricName || 'value',
        displayName: input.metricName || 'value',
        formatter: 'number-2',
        yAxisId: 'left' as const,
        points: (input.dataset || []).map((point) => ({
          date: point.date,
          value: point.value,
          series: input.metricName || 'value',
        })),
      }];
  const series: ReportTrendSeriesSpec[] = inputSeries.map((item) => ({
    ...item,
    metricKey: item.metricKey || item.name,
    displayName: item.displayName || item.name,
    formatter: item.formatter || 'number-2',
    yAxisId: item.yAxisId === 'right' ? 'right' : 'left',
  }));
  const metricCatalog: ReportTrendMetricSpec[] = series.map((item, index) => ({
    metricKey: item.metricKey || item.name || `metric-${index + 1}`,
    displayName: item.displayName || item.name || `指标${index + 1}`,
    valueType: item.formatter?.includes('percent') ? 'percent' : item.formatter?.includes('currency') ? 'money' : item.formatter?.includes('integer') ? 'integer' : 'number',
    formatter: item.formatter || 'number-2',
    aliases: item.metricKey ? [item.metricKey, item.name].filter(Boolean) as string[] : [item.name].filter(Boolean) as string[],
  }));
  const chartType: ReportTrendChartSpec['chartType'] = insufficient
    ? 'table'
    : series.length > 1
      ? 'dual-axis-line'
      : input.requestedView === 'table'
        ? 'table'
        : 'line';
  const chartSpec: ReportTrendChartSpec = {
    chartType,
    xField: 'date',
    xAxis: {
      type: 'category',
      formatter: 'date-mm-dd',
    },
    yAxes: series.map((item, index) => ({
      id: index === 0 ? 'left' : 'right',
      title: metricCatalog[index]?.displayName || item.displayName || item.name,
      formatter: metricCatalog[index]?.formatter || item.formatter || 'number-2',
    })) as ReportTrendChartSpec['yAxes'],
    series: series.map((item, index) => ({
      metricKey: item.metricKey || item.name,
      displayName: item.displayName || item.name,
      yAxisId: index === 0 ? 'left' : 'right',
      formatter: item.formatter || 'number-2',
      points: item.points,
    })),
    dataRef: input.resultId,
  };

  const defaultActions: ActionContract[] = insufficient
    ? [
        {
          id: 'expand-date-range',
          type: 'continue-analysis',
          intent: 'primary',
          label: '扩大时间范围继续分析',
          target: { kind: 'semantic-query', value: 'expand_date_range' },
          payload: { dateRange: input.dateRange, granularity: input.granularity },
          feedbackPolicy: { resultHandling: 'append-message', showToast: true },
        },
        {
          id: 'show-table',
          type: 'filter',
          intent: 'secondary',
          label: '改为表格查看',
          target: { kind: 'local-state', value: 'requestedView' },
          payload: { requestedView: 'table' },
        },
      ]
    : [];

  return {
    contractType: 'semantic-result',
    version: '1.0.0',
    resultId: input.resultId,
    conversationId: input.conversationId,
    messageId: input.messageId,
    screenType: 'report-result',
    title: input.title,
    createdAt: input.createdAt ?? new Date().toISOString(),
    producer: { kind: 'backend', name: 'report-trend-adapter', version: '1.0.0' },
    regions: [
      {
        id: 'trend-data-view',
        type: 'data-view',
        componentBinding: 'data-visualization',
        title: input.title,
        state: insufficient ? 'degraded' : 'ready',
        data: {
          viewType: 'trend',
          requestedView: input.requestedView,
          chartType,
          dateRange: input.dateRange,
          granularity: input.granularity,
          dataCoverage: input.dataCoverage,
          dataset: input.dataset,
          series,
          metricCatalog,
          dimensionCatalog: (input.dimensions || []).map((item) => ({ key: item, displayName: item, role: item === 'date' ? 'x_axis' : 'breakdown' })),
          metricName: input.metricName,
          dimensions: input.dimensions,
          insights: input.insights,
          chartSpec,
        },
        actions: input.actions ?? defaultActions,
        evidenceRefs: input.evidenceRefs.map((item) => item.id),
        sourceRefs: input.sourceRefs.map((item) => item.id),
        layoutHints: {
          placement: 'main',
          width: 'full',
          scrollMode: insufficient ? 'normal' : 'virtualized',
          preferredVariant: insufficient ? 'table' : 'line-chart',
        },
        fallback: insufficient
          ? {
              reason: 'empty-data',
              title: '趋势数据不足',
              message: '当前时间范围内少于 2 个日期点，无法生成趋势图。',
              actionIds: ['expand-date-range', 'show-table'],
            }
          : undefined,
      },
    ],
    actions: input.actions ?? defaultActions,
    evidenceRefs: input.evidenceRefs,
    sourceRefs: input.sourceRefs,
    metadata: {
      useCase: 'report-trend',
      requestedView: input.requestedView,
      granularity: input.granularity,
      dataCoverageStatus: input.dataCoverage.status,
    },
  };
}
