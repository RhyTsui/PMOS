import type { SemanticRegion } from '../semantic/semantic-result-contract';
import {
  addIssue,
  createValidationResult,
  isRecord,
  type ContractValidationResult,
} from './contract-validator';

export interface ReportTrendDataPoint {
  date: string;
  value: number;
  series?: string;
  [key: string]: unknown;
}

export interface ReportTrendSeriesSpec {
  name: string;
  metricKey?: string;
  displayName?: string;
  formatter?: string;
  yAxisId?: 'left' | 'right';
  points: ReportTrendDataPoint[];
  [key: string]: unknown;
}

export interface ReportTrendMetricSpec {
  metricKey: string;
  displayName: string;
  valueType?: 'percent' | 'money' | 'count' | 'number' | 'ratio' | 'integer';
  formatter?: string;
  aliases?: string[];
}

export interface ReportTrendChartSpec {
  chartType: 'line'
    | 'area'
    | 'bar'
    | 'stacked-bar'
    | 'stacked-area'
    | 'waterfall'
    | 'bubble'
    | 'polar'
    | 'histogram'
    | 'scatter'
    | 'pie'
    | 'donut'
    | 'radar'
    | 'funnel'
    | 'heatmap'
    | 'gauge'
    | 'boxplot'
    | 'sankey'
    | 'treemap'
    | 'sunburst'
    | 'tree'
    | 'dual-axis-line'
    | 'table';
  xField: string;
  xAxis?: {
    type?: 'category' | 'time';
    formatter?: string;
  };
  yAxes?: Array<{
    id: 'left' | 'right';
    title?: string;
    formatter?: string;
  }>;
  series?: Array<{
    metricKey: string;
    displayName: string;
    yAxisId?: 'left' | 'right';
    formatter?: string;
    points?: ReportTrendDataPoint[];
  }>;
  dataRef?: string;
}

export interface ReportTrendData {
  viewType?: 'trend' | 'table' | 'chart' | 'summary' | 'sankey' | string;
  requestedView?: 'trend' | 'table' | 'chart' | 'summary' | 'auto' | string;
  chartType?: 'line'
    | 'area'
    | 'bar'
    | 'stacked-bar'
    | 'stacked-area'
    | 'waterfall'
    | 'bubble'
    | 'polar'
    | 'histogram'
    | 'scatter'
    | 'pie'
    | 'donut'
    | 'radar'
    | 'funnel'
    | 'heatmap'
    | 'gauge'
    | 'boxplot'
    | 'sankey'
    | 'treemap'
    | 'sunburst'
    | 'tree'
    | 'dual-axis-line'
    | 'table'
    | string;
  dateRange?: {
    start: string;
    end: string;
    timezone?: string;
  };
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | string;
  dataCoverage?: {
    status: 'complete' | 'partial' | 'insufficient' | 'unknown' | string;
    availablePoints: number;
    requiredPoints: number;
    missingReasons?: string[];
  };
  dataset?: ReportTrendDataPoint[];
  series?: ReportTrendSeriesSpec[];
  metricCatalog?: ReportTrendMetricSpec[];
  dimensionCatalog?: Array<{ key: string; displayName?: string; role?: string }>;
  chartSpec?: ReportTrendChartSpec;
  insights?: Array<{
    id: string;
    title: string;
    summary?: string;
    evidenceRefs?: string[];
    sourceRefs?: string[];
    confidence?: unknown;
  }>;
  [key: string]: unknown;
}

function countDistinctDatePoints(data: ReportTrendData): number {
  const dates = new Set<string>();
  for (const point of Array.isArray(data.dataset) ? data.dataset : []) {
    if (typeof point.date === 'string') dates.add(point.date);
  }
  for (const series of Array.isArray(data.series) ? data.series : []) {
    for (const point of Array.isArray(series.points) ? series.points : []) {
      if (typeof point.date === 'string') dates.add(point.date);
    }
  }
  return dates.size;
}

export function isTrendRequested(data: ReportTrendData): boolean {
  const requestedChartType = String(data.chartType || '').toLowerCase().trim().replace(/_/g, '-');
  return (
    data.requestedView === 'trend' ||
    data.viewType === 'trend' ||
    requestedChartType === 'line' ||
    requestedChartType === 'waterfall' ||
    requestedChartType === 'bubble' ||
    requestedChartType === 'polar' ||
    requestedChartType === 'histogram' ||
    requestedChartType === 'area' ||
    requestedChartType === 'bar' ||
    requestedChartType === 'stacked-bar' ||
    requestedChartType === 'stacked-area' ||
    requestedChartType === 'scatter' ||
    requestedChartType === 'pie' ||
    requestedChartType === 'donut' ||
    requestedChartType === 'radar' ||
    requestedChartType === 'funnel' ||
    requestedChartType === 'heatmap' ||
    requestedChartType === 'gauge' ||
    requestedChartType === 'boxplot' ||
    requestedChartType === 'sankey' ||
    requestedChartType === 'treemap' ||
    requestedChartType === 'sunburst' ||
    requestedChartType === 'tree' ||
    requestedChartType === 'line-chart' ||
    ['饼图', '折线图', '柱状图', '散点图', '雷达图', '漏斗图', '热力图', '仪表盘', '树图', '柱状图', '气泡图', '瀑布图', '极坐标图', '箱线图', '旭日图'].includes(requestedChartType) ||
    data.chartType === 'trend'
  );
}

export function validateReportTrendData(
  value: unknown,
  region?: SemanticRegion,
  path = '$.data',
): ContractValidationResult<ReportTrendData> {
  const result = createValidationResult<ReportTrendData>(value as ReportTrendData);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'report_trend_data_not_object',
      message: 'Report trend data must be an object.',
      path,
    });
  }

  const data = value as ReportTrendData;
  const trendRequested = isTrendRequested(data);
  const availablePoints = isRecord(data.dataCoverage) && typeof data.dataCoverage.availablePoints === 'number'
    ? data.dataCoverage.availablePoints
    : countDistinctDatePoints(data);
  const insufficientTrendFallback = Boolean(
    region?.state === 'degraded'
    || (isRecord(data.dataCoverage) && data.dataCoverage.status === 'insufficient')
    || (isRecord(data.dataCoverage) && data.dataCoverage.requiredPoints === 2 && availablePoints < 2),
  );

  if (trendRequested) {
    if (!isRecord(data.dateRange)) {
      addIssue(result, {
        level: 'error',
        code: 'trend_date_range_missing',
        message: 'Trend view requires dateRange.',
        path: `${path}.dateRange`,
      });
    }

    if (typeof data.granularity !== 'string') {
      addIssue(result, {
        level: 'error',
        code: 'trend_granularity_missing',
        message: 'Trend view requires granularity.',
        path: `${path}.granularity`,
      });
    }

    if (!isRecord(data.dataCoverage)) {
      addIssue(result, {
        level: 'error',
        code: 'trend_data_coverage_missing',
        message: 'Trend view requires dataCoverage.',
        path: `${path}.dataCoverage`,
      });
    }

    const distinctDatePoints = countDistinctDatePoints(data);

    if (distinctDatePoints < 2 || availablePoints < 2) {
      addIssue(result, {
        level: insufficientTrendFallback ? 'warning' : 'error',
        code: 'trend_requires_at_least_two_date_points',
        message: 'Trend visualization requires at least two distinct date points. Use degraded insufficient-trend fallback instead.',
        path,
        details: { distinctDatePoints, availablePoints },
      });
    }
  }

  if (Array.isArray(data.insights)) {
    data.insights.forEach((insight, index) => {
      const hasEvidence = Array.isArray(insight.evidenceRefs) && insight.evidenceRefs.length > 0;
      const hasSource = Array.isArray(insight.sourceRefs) && insight.sourceRefs.length > 0;
      if (!hasEvidence && !hasSource) {
        addIssue(result, {
          level: 'warning',
          code: 'trend_insight_missing_evidence_or_source',
          message: 'Trend insight should reference evidenceRefs or sourceRefs.',
          path: `${path}.insights[${index}]`,
        });
      }
    });
  }

  return result;
}
