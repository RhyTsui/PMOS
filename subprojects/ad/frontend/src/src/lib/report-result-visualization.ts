import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import type { VizSpec } from '@/types/viz';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

type SemanticRegionData = Record<string, unknown>;

type TrendChartSeries = {
  metricKey: string;
  displayName: string;
  yAxisId?: 'left' | 'right';
  formatter?: string;
  points?: Array<{ date?: string; value?: unknown; y?: unknown; amount?: unknown; series?: string }>;
};

function formatChartValue(value: unknown, formatter?: string): string {
  if (value === null || value === undefined || value === '') return '--';
  const numeric = parseChartNumber(value);
  if (numeric === null || !Number.isFinite(numeric)) return String(value);
  switch (formatter) {
    case 'percent-0':
      return `${(Math.abs(numeric) <= 1 ? numeric * 100 : numeric).toFixed(0)}%`;
    case 'percent-1':
      return `${(Math.abs(numeric) <= 1 ? numeric * 100 : numeric).toFixed(1)}%`;
    case 'percent-2':
      return `${(Math.abs(numeric) <= 1 ? numeric * 100 : numeric).toFixed(2)}%`;
    case 'currency-0':
      return `¥${numeric.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
    case 'currency-1':
      return `¥${numeric.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
    case 'currency-2':
      return `¥${numeric.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'integer':
      return `${Math.round(numeric).toLocaleString('zh-CN')}`;
    case 'ratio':
      return numeric.toFixed(2);
    case 'number-0':
      return numeric.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
    case 'number-1':
      return numeric.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    default:
      return numeric.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function parseChartNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/,/g, '')
    .replace(/[%$¥]/g, '')
    .replace(/[^\d.+\-eE]/g, '');
  if (!normalized || !Number.isFinite(Number(normalized))) return null;
  return Number(normalized);
}

function toNumber(value: unknown): number {
  return parseChartNumber(value) ?? 0;
}

function parseDateSortValue(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!text) return null;
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  const normalized = compact ? `${compact[1]}-${compact[2]}-${compact[3]}` : text.replace(/\//g, '-');
  if (!/^\d{4}-\d{1,2}(-\d{1,2})?(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?$/.test(normalized)) return null;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : null;
}

function sortRowsByDateField(rows: Array<Record<string, unknown>>, field: string): Array<Record<string, unknown>> {
  const indexed = rows.map((row, index) => ({ row, index, time: parseDateSortValue(row[field]) }));
  if (indexed.length < 2 || indexed.some((item) => item.time === null)) return rows;
  const sorted = [...indexed].sort((a, b) => (a.time as number) - (b.time as number) || a.index - b.index);
  const changed = sorted.some((item, index) => item.index !== index);
  return changed ? sorted.map((item) => item.row) : rows;
}

function sortRowsByDateCandidate(rows: Array<Record<string, unknown>>, fields: string[]): Array<Record<string, unknown>> {
  for (const field of fields) {
    const sorted = sortRowsByDateField(rows, field);
    if (sorted !== rows) return sorted;
  }
  return rows;
}

function getRegionData(semanticResult?: SemanticResultContract | null): SemanticRegionData | null {
  if (!semanticResult?.regions?.length) return null;
  const region = semanticResult.regions.find((item) => item.componentBinding === 'data-visualization' && item.data && typeof item.data === 'object');
  return region?.data && typeof region.data === 'object' ? region.data as SemanticRegionData : null;
}

type TrendChartRenderType =
  | 'line'
  | 'area'
  | 'bar'
  | 'stacked-bar'
  | 'stacked-area'
  | 'waterfall'
  | 'bubble'
  | 'polar'
  | 'histogram'
  | 'dual-axis-line'
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
  | 'table';

type TrendSeriesPoint = {
  key: string;
  name: string;
  yAxisIndex: 0 | 1;
  formatter?: string;
  values: number[];
};

type MetricDisplayNameMap = Record<string, string>;

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text || null;
}

function buildMetricDisplayNameMap(data: SemanticRegionData): MetricDisplayNameMap {
  const map: MetricDisplayNameMap = {};
  const metricCatalog = Array.isArray(data.metricCatalog) ? data.metricCatalog : [];
  metricCatalog.forEach((item) => {
    if (!isRecord(item)) return;
    const metricKey = toTrimmedString(item.metricKey);
    const displayName = toTrimmedString(item.displayName);
    if (!metricKey || !displayName) return;
    map[metricKey] = displayName;
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    aliases.forEach((alias) => {
      const aliasText = toTrimmedString(alias);
      if (aliasText) map[aliasText] = displayName;
    });
  });
  if (isRecord(data.columnLabels)) {
    Object.entries(data.columnLabels).forEach(([metricKey, displayName]) => {
      const key = toTrimmedString(metricKey);
      const name = toTrimmedString(displayName);
      if (key && name) map[key] = name;
    });
  }
  return map;
}

function resolveDisplayNameByMetric({
  metricKey,
  displayName,
  metricNameMap,
}: {
  metricKey: string;
  displayName?: string;
  metricNameMap?: MetricDisplayNameMap;
}): string {
  if (displayName && displayName.trim()) return displayName.trim();
  if (metricNameMap && metricNameMap[metricKey]?.trim()) return metricNameMap[metricKey]!.trim();
  return metricKey;
}

function resolveTrendChartType(chartType: string): TrendChartRenderType {
  const normalized = String(chartType || '').toLowerCase().trim().replace(/_/g, '-');
  if (!normalized || normalized === 'trend') return 'line';
  if (normalized.includes('table')) return 'table';
  if (['line', 'line-chart', 'trend-line', 'line-graph', '折线', '折线图'].includes(normalized)) return 'line';
  if (['area', 'area-chart', 'area-graph', 'area-chart'].includes(normalized)) return 'area';
  if (normalized.includes('stacked') && normalized.includes('area')) return 'stacked-area';
  if (['bar', 'column', 'bar-chart', 'column-chart', '柱状', '柱状图', '柱形图', 'histogram', 'histogram-chart'].includes(normalized)) return 'bar';
  if (normalized.includes('stacked') && (normalized.includes('bar') || normalized.includes('column') || normalized.includes('histogram'))) return 'stacked-bar';
  if (['waterfall', 'waterfall-chart', '瀑布', '瀑布图'].includes(normalized)) return 'waterfall';
  if (['bubble', 'bubble-chart', '气泡', '气泡图'].includes(normalized)) return 'bubble';
  if (['polar', 'polar-chart', '极坐标', '极坐标图'].includes(normalized)) return 'polar';
  if (['dual-axis-line', 'dual-axis', 'dual-axis_line', 'dual_axis_line', 'dual-axis-curve', '双轴', '双轴图'].includes(normalized)) return 'dual-axis-line';
  if (['scatter', 'scatter-plot', '散点', '散点图'].includes(normalized)) return 'scatter';
  if (['donut', 'doughnut', '环形', '环形图'].includes(normalized)) return 'donut';
  if (['pie', 'pie-chart', '饼', '饼图', '扇形图'].includes(normalized)) return 'pie';
  if (['radar', 'radar-chart', 'spider', '雷达', '雷达图'].includes(normalized)) return 'radar';
  if (['funnel', 'funnel-chart', '漏斗', '漏斗图'].includes(normalized)) return 'funnel';
  if (['heatmap', 'heat-map', '热力', '热力图'].includes(normalized)) return 'heatmap';
  if (['gauge', 'gauge-chart', '仪表', '仪表盘'].includes(normalized)) return 'gauge';
  if (['boxplot', 'box-plot', 'box', '箱线', '箱线图'].includes(normalized)) return 'boxplot';
  if (['sankey', 'sankey-chart', '桑基', '桑基图'].includes(normalized)) return 'sankey';
  if (['treemap', 'tree-map', 'treemap-chart', '树图', '树状图'].includes(normalized)) return 'treemap';
  if (['sunburst', 'sunburst-chart', '旭日', '旭日图'].includes(normalized)) return 'sunburst';
  if (['tree', 'tree-chart', '树', '树图', '树状图'].includes(normalized)) return 'tree';
  return 'line';
}

function resolvePointValue(value: unknown): number {
  return toNumber(value);
}

function pickSeriesValues(
  chartDataset: Array<Record<string, unknown>>,
  seriesItem: TrendChartSeries,
  xValues: string[],
  xField: string,
): number[] {
  const points = Array.isArray(seriesItem.points) && seriesItem.points.length > 0
    ? sortRowsByDateField(seriesItem.points as Array<Record<string, unknown>>, 'date')
    : [];

  if (points.length > 0 && xValues.length > 0) {
    const xToValue = new Map<string, number>();
    points.forEach((point) => {
      const rawX = point[xField] ?? point.date ?? point.label ?? point.x ?? point.series;
      const key = String(rawX || '').trim();
      if (!key) return;
      xToValue.set(key, resolvePointValue(point.value ?? point.y ?? point.amount ?? point[seriesItem.metricKey]));
    });
    const mapped = xValues.map((x) => xToValue.get(x) ?? 0);
    if (mapped.some((value) => value !== 0)) return mapped;
  }

  if (points.length > 0) {
    return points.map((point) => resolvePointValue(point.value ?? point.y ?? point.amount ?? point[seriesItem.metricKey]));
  }

  return chartDataset.map((point) => resolvePointValue(
    point[seriesItem.metricKey] ?? point[seriesItem.displayName] ?? point.value ?? point.y ?? point.amount,
  ));
}

function buildSeriesCollection(params: {
  seriesSource: TrendChartSeries[];
  chartDataset: Array<Record<string, unknown>>;
  xValues: string[];
  xField: string;
  metricDisplayNameMap?: MetricDisplayNameMap;
}): TrendSeriesPoint[] {
  return params.seriesSource.map((seriesItem, index) => ({
    key: seriesItem.metricKey || `series-${index + 1}`,
    name: resolveDisplayNameByMetric({
      metricKey: seriesItem.metricKey || `series-${index + 1}`,
      displayName: seriesItem.displayName,
      metricNameMap: params.metricDisplayNameMap,
    }),
    yAxisIndex: seriesItem.yAxisId === 'right' ? 1 : 0,
    formatter: seriesItem.formatter,
    values: pickSeriesValues(params.chartDataset, seriesItem, params.xValues, params.xField),
  }));
}

function buildYAxisConfig(yAxes: Array<{ id: 'left' | 'right'; title?: string; formatter?: string }>, hasLineLike: boolean) {
  if (!hasLineLike) return undefined;
  if (yAxes.length <= 1) {
    return {
      type: 'value',
      name: yAxes[0]?.title,
      axisLabel: { formatter: (value: number) => formatChartValue(value, yAxes[0]?.formatter) },
    };
  }
  return [
    {
      type: 'value',
      name: yAxes[0]?.title,
      axisLabel: { formatter: (value: number) => formatChartValue(value, yAxes[0]?.formatter) },
    },
    {
      type: 'value',
      name: yAxes[1]?.title,
      position: 'right',
      axisLabel: { formatter: (value: number) => formatChartValue(value, yAxes[1]?.formatter) },
    },
  ];
}

function buildAxisTooltipFormatter(series: TrendSeriesPoint[], xValues: string[], yAxes: Array<{ id: 'left' | 'right'; formatter?: string }>) {
  return (params: unknown) => {
    const safe = Array.isArray(params) ? params as Array<Record<string, unknown>> : [params as Record<string, unknown>];
    const header = xValues[(safe[0]?.dataIndex as number) || 0] || '';
    const lines = safe.map((item, index) => {
      const seriesName = String(item.seriesName || series[index]?.name || '');
      const formatter = yAxes[item.yAxisIndex as number]?.formatter || series[index]?.formatter;
      return `${seriesName}: ${formatChartValue(item.value, formatter)}`;
    });
    return [header, ...lines].join('<br/>');
  };
}

function calculateQuantile(values: number[], quantile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * quantile;
  const left = Math.floor(pos);
  const right = Math.ceil(pos);
  if (left === right) return sorted[left] || 0;
  return sorted[left] + (sorted[right] - sorted[left]) * (pos - left);
}

function sumSeriesValues(item: TrendSeriesPoint): number {
  return item.values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
}

function buildDimensionTree(params: {
  seriesPoints: TrendSeriesPoint[];
  xLabels: string[];
  rootName: string;
}) {
  const { seriesPoints, xLabels, rootName } = params;
  const labels = xLabels.length > 0 ? xLabels : seriesPoints.map((item) => item.name);
  return {
    name: rootName,
    children: labels.map((label, index) => ({
      name: label || `维度${index + 1}`,
      value: seriesPoints.reduce((sum, seriesItem) => sum + (Number.isFinite(seriesItem.values[index]) ? seriesItem.values[index] : 0), 0),
      children: seriesPoints.map((seriesItem) => ({
        name: seriesItem.name,
        value: Number.isFinite(seriesItem.values[index]) ? seriesItem.values[index] : 0,
      })),
    })),
  };
}

function buildChartOptionByType(params: {
  chartType: TrendChartRenderType;
  chartXValues: string[];
  seriesPoints: TrendSeriesPoint[];
  yAxes: Array<{ id: 'left' | 'right'; title?: string; formatter?: string }>;
}) {
  const { chartType, chartXValues, seriesPoints, yAxes } = params;
  if (seriesPoints.length === 0) return null;

  if (chartType === 'pie' || chartType === 'donut') {
    const pieData = seriesPoints.map((item) => ({
      name: item.name,
      value: item.values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0),
    }));
    return {
      tooltip: { trigger: 'item' },
      legend: { top: 0 },
      series: [{
        type: 'pie',
        radius: chartType === 'donut' ? ['38%', '68%'] : '65%',
        avoidLabelOverlap: false,
        label: { show: true, formatter: '{b}: {c}' },
        data: pieData,
      }],
    };
  }

  if (chartType === 'funnel') {
    const funnelSeries = seriesPoints[0];
    const funnelData = chartXValues.length > 0
      ? chartXValues.map((item, index) => ({ name: item, value: funnelSeries?.values[index] ?? 0 }))
      : funnelSeries.values.map((value, index) => ({ name: `阶段${index + 1}`, value }));
    return {
      tooltip: { trigger: 'item' },
      legend: { top: 0 },
      series: [{
        type: 'funnel',
        left: '10%',
        top: 40,
        width: '80%',
        sort: 'descending',
        gap: 4,
        label: { show: true },
        data: funnelData,
      }],
    };
  }

  if (chartType === 'radar') {
    const indicator = seriesPoints.map((item) => {
      const finite = item.values.filter((value) => Number.isFinite(value));
      const max = finite.length ? Math.max(...finite) : 0;
      return { name: item.name, max: max > 0 ? Math.ceil(max * 1.15) : 10 };
    });
    const data = chartXValues.length > 0
      ? chartXValues.map((item, index) => ({
        name: item,
        value: seriesPoints.map((seriesItem) => seriesItem.values[index] ?? 0),
      }))
      : [{ name: '数据', value: seriesPoints.map((seriesItem) => seriesItem.values[0] ?? 0) }];
    return {
      tooltip: { trigger: 'item' },
      radar: {
        indicator,
        center: ['50%', '50%'],
        radius: '65%',
      },
      legend: { top: 0 },
      series: [{ type: 'radar', data }],
    };
  }

  if (chartType === 'scatter') {
    const xSeries = seriesPoints[0];
    const ySeries = seriesPoints[1] || seriesPoints[0];
    const data = xSeries.values.map((xValue, index) => [
      Number.isFinite(xValue) ? xValue : 0,
      Number.isFinite(ySeries.values[index] || 0) ? Number(ySeries.values[index] || 0) : 0,
      chartXValues[index] || `鐐逛綅${index + 1}`,
    ]);
    return {
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: xSeries.name },
      yAxis: { type: 'value', name: ySeries.name },
      series: [{
        name: `${xSeries.name} 脳 ${ySeries.name}`,
        type: 'scatter',
        symbolSize: 10,
        data: data.map((item) => item.slice(0, 2)),
      }],
    };
  }

  if (chartType === 'waterfall') {
    const sourceSeries = seriesPoints[0];
    if (!sourceSeries) return null;
    const changes = sourceSeries.values.map((value) => (Number.isFinite(value) ? value : 0));
    let total = 0;
    const startValues = changes.map((value) => {
      const start = total;
      total += value;
      return start;
    });
    const names = chartXValues.length > 0 ? chartXValues : changes.map((_, index) => `Step ${index + 1}`);
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      xAxis: { type: 'category', data: names },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Baseline',
          type: 'bar',
          stack: 'waterfall',
          emphasis: { disabled: true },
          itemStyle: { color: 'transparent' },
          data: startValues,
        },
        {
          name: sourceSeries.name,
          type: 'bar',
          stack: 'waterfall',
          data: changes,
        },
      ],
    };
  }

  if (chartType === 'bubble') {
    if (seriesPoints.length < 2) return null;
    const xSeries = seriesPoints[0];
    const ySeries = seriesPoints[1];
    const zSeries = seriesPoints[2];
    const data = xSeries.values.map((xValue, index) => {
      const yValue = Number.isFinite(ySeries.values[index] ?? NaN) ? (ySeries.values[index] as number) : 0;
      const zValue = Number.isFinite(zSeries?.values[index] ?? NaN) ? (zSeries?.values[index] as number) : 0;
      const label = chartXValues[index] || `${index + 1}`;
      return { value: [xValue, yValue, zValue], name: `${label}` };
    });
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `${params.name}<br/>${xSeries.name}: ${formatChartValue(params.value?.[0])}<br/>${ySeries.name}: ${formatChartValue(params.value?.[1])}`,
      },
      xAxis: { type: 'value', name: xSeries.name },
      yAxis: { type: 'value', name: ySeries.name },
      series: [{
        type: 'scatter',
        symbolSize: (value: number[]) => Math.max(6, Math.sqrt((value[2] || 0) + 1) * 5),
        data: data.map((item) => [item.value[0], item.value[1], item.value[2]]),
      }],
    };
  }

  if (chartType === 'polar') {
    if (seriesPoints.length === 0) return null;
    const first = seriesPoints[0];
    return {
      tooltip: { trigger: 'item' },
      polar: {
        radius: '70%',
      },
      angleAxis: {
        type: 'category',
        data: chartXValues.length > 0 ? chartXValues : first.values.map((_, index) => `${index + 1}`),
      },
      radiusAxis: {},
      series: [{
        type: 'bar',
        coordinateSystem: 'polar',
        name: first.name,
        data: first.values,
      }],
    };
  }

  if (chartType === 'heatmap') {
    const maxValue = Math.max(...seriesPoints.flatMap((item) => item.values), 0);
    const data = seriesPoints.flatMap((seriesItem, rowIndex) => (
      seriesItem.values.map((value, valueIndex) => [valueIndex, rowIndex, value]).filter((item) => Number.isFinite(item[2]))
    )) as Array<[number, number, number]>;
    return {
      tooltip: {
        position: 'top',
      },
      xAxis: {
        type: 'category',
        data: chartXValues.length > 0 ? chartXValues : seriesPoints.map((item) => item.name),
      },
      yAxis: { type: 'category', data: seriesPoints.map((item) => item.name) },
      visualMap: {
        min: 0,
        max: Math.max(maxValue, 1),
        orient: 'vertical',
        right: 10,
        top: 40,
        bottom: 20,
        calculable: true,
      },
      series: [{
        name: '热力图',
        type: 'heatmap',
        data,
        label: { show: true },
      }],
    };
  }

  if (chartType === 'gauge') {
    const baseValue = seriesPoints[0]?.values[seriesPoints[0].values.length - 1] ?? 0;
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const item = params as { value?: unknown; name?: string };
          return `${item.name || '当前值'}: ${formatChartValue(item.value, seriesPoints[0]?.formatter)}`;
        },
      },
      series: [{
        type: 'gauge',
        radius: '78%',
        startAngle: 225,
        endAngle: -45,
        min: 0,
        max: Math.max(baseValue * 1.2, 100),
        detail: { formatter: '{value}' },
        data: [{ value: baseValue, name: seriesPoints[0]?.name || 'value' }],
      }],
    };
  }

  if (chartType === 'boxplot') {
    const data = seriesPoints.map((item) => {
      const finite = item.values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
      return [
        finite[0] || 0,
        calculateQuantile(finite, 0.25),
        calculateQuantile(finite, 0.5),
        calculateQuantile(finite, 0.75),
        finite[finite.length - 1] || 0,
      ];
    });
    return {
      tooltip: { trigger: 'item' },
      grid: { left: 52, right: 30 },
      xAxis: { type: 'category', data: seriesPoints.map((item) => item.name), boundaryGap: true },
      yAxis: { type: 'value' },
      series: [{ type: 'boxplot', data }],
    };
  }

  if (chartType === 'sankey') {
  const links: Array<{ source: string; target: string; value: number }> = [];
  const nodeSet = new Set<string>();
  if (chartXValues.length > 1 && seriesPoints[0]?.values.length) {
    for (let index = 0; index < chartXValues.length - 1; index += 1) {
      const source = chartXValues[index];
      const target = chartXValues[index + 1];
      const value = Number(seriesPoints[0].values[index] ?? 0);
      if (!source || !target || !Number.isFinite(value)) continue;
      nodeSet.add(source);
      nodeSet.add(target);
      if (value > 0) {
        links.push({ source, target, value });
      }
    }
  }
  if (!links.length) return null;
  return {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'sankey',
      data: [...nodeSet].map((name) => ({ name })),
      links,
    }],
  };
}

if (chartType === 'treemap') {
  const treemapData = seriesPoints
    .filter((item) => item.values.length > 0)
    .map((item) => ({
      name: item.name,
      value: sumSeriesValues(item),
    }));
  return {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'treemap',
      roam: false,
      data: treemapData,
      label: { show: true },
    }],
  };
}

if (chartType === 'sunburst') {
  const sunburstData = buildDimensionTree({
    seriesPoints,
    xLabels: chartXValues,
    rootName: '总览',
  });
  return {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'sunburst',
      radius: ['10%', '80%'],
      data: [sunburstData],
      label: { show: true },
    }],
  };
}

if (chartType === 'tree') {
  const treeData = buildDimensionTree({
    seriesPoints,
    xLabels: chartXValues.length > 0 ? chartXValues : ['维度'],
    rootName: '总览',
  });
  return {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'tree',
      data: [treeData],
      left: '10%',
      right: '10%',
      top: '10%',
      bottom: '10%',
      initialTreeDepth: 2,
      symbol: 'emptyCircle',
      orient: 'vertical',
      label: { show: true, position: 'left', verticalAlign: 'middle', align: 'right' },
    }],
  };
}

const isLineLike = ['line', 'area', 'stacked-area', 'dual-axis-line'].includes(chartType);
  const isBar = ['bar', 'stacked-bar', 'histogram'].includes(chartType);
  const axisSeries = seriesPoints.map((item) => (isBar ? {
    name: item.name,
    type: 'bar',
    yAxisIndex: item.yAxisIndex,
    data: item.values,
    stack: chartType === 'stacked-bar' ? 'total' : undefined,
  } : {
    name: item.name,
    type: 'line',
    yAxisIndex: item.yAxisIndex,
    data: item.values,
    smooth: true,
    areaStyle: chartType === 'area' || chartType === 'stacked-area' ? {} : undefined,
    stack: chartType === 'stacked-area' ? 'total' : undefined,
  }));

  return {
    tooltip: {
      trigger: 'axis',
      formatter: buildAxisTooltipFormatter(seriesPoints, chartXValues, yAxes),
    },
    legend: { top: 0 },
    grid: { left: 52, right: yAxes.length > 1 ? 56 : 24, top: 42, bottom: 36 },
    xAxis: {
      type: isLineLike || isBar ? 'category' : 'value',
      data: isLineLike || isBar ? chartXValues : undefined,
      axisLabel: isLineLike || isBar ? { formatter: (value: string) => value } : undefined,
    },
    yAxis: buildYAxisConfig(yAxes, isLineLike || isBar),
    series: axisSeries,
  };
}

function buildChartSpecFromTrendData(data: SemanticRegionData): VizSpec | null {
  const metricDisplayNameMap = buildMetricDisplayNameMap(data);
  const chartSpec = data.chartSpec && typeof data.chartSpec === 'object' ? data.chartSpec as Record<string, unknown> : null;
  const dataset = Array.isArray(data.dataset) ? data.dataset as Array<Record<string, unknown>> : [];
  const seriesFromSpec = Array.isArray(chartSpec?.series) ? chartSpec.series as TrendChartSeries[] : [];
  const requestedView = String(data.requestedView || data.viewType || '').toLowerCase();
  const chartType = resolveTrendChartType(String(chartSpec?.chartType || data.chartType || '').toLowerCase());
  const isTable = requestedView === 'table' || chartType === 'table';

  if (isTable) {
    const columns = Array.isArray(data.dimensions) && data.dimensions.length > 0
      ? ['date', ...data.dimensions.map(String)]
      : Array.from(new Set(dataset.flatMap((row) => Object.keys(row)))).slice(0, 12);
    return {
      kind: 'table',
      engine: 'table',
      columns,
      rows: dataset,
    };
  }

  if (!seriesFromSpec.length && !Array.isArray(data.series)) return null;
  const seriesSource = seriesFromSpec.length > 0
    ? seriesFromSpec
    : (data.series as TrendChartSeries[] || []);
  const xField = String(chartSpec?.xField || 'date');
  const chartDataset = sortRowsByDateField(dataset, xField);
  const yAxes = Array.isArray(chartSpec?.yAxes) ? chartSpec.yAxes as Array<{ id: 'left' | 'right'; title?: string; formatter?: string }> : [];
  const chartXValues = chartDataset.map((item) => String(item[xField] ?? item.date ?? item.x ?? item.label ?? ''));
  const seriesPoints = buildSeriesCollection({
    seriesSource,
    chartDataset,
    xValues: chartXValues,
    xField,
    metricDisplayNameMap,
  });
  const option = buildChartOptionByType({
    chartType,
    chartXValues,
    seriesPoints,
    yAxes,
  });
  if (!option) return null;

  return {
    kind: 'chart',
    engine: 'echarts',
    height: 360,
    option: option as Record<string, unknown>,
  };
}

export function semanticResultToVizSpec(semanticResult?: SemanticResultContract | null): VizSpec | null {
  const data = getRegionData(semanticResult);
  if (!data) return null;

  const dataset = Array.isArray(data.dataset) ? data.dataset as Array<Record<string, unknown>> : [];
  if (!dataset.length) return null;

  const chartSpecViz = buildChartSpecFromTrendData(data);
  if (chartSpecViz) return chartSpecViz;

  const requestedView = String(data.requestedView || data.viewType || '').toLowerCase();
  const chartType = resolveTrendChartType(String(data.chartType || '').toLowerCase());
  const isTable = requestedView === 'table' || chartType === 'table' || String(semanticResult?.regions.find((item) => item.componentBinding === 'data-visualization')?.state || '').toLowerCase() === 'degraded';
  const metricDisplayNameMap = buildMetricDisplayNameMap(data);

  if (isTable) {
    const explicitColumns = Array.isArray(data.columns) ? data.columns.map(String).filter(Boolean) : [];
    const columns = explicitColumns.length > 0
      ? explicitColumns
      : Array.isArray(data.dimensions) && data.dimensions.length > 0
        ? ['date', ...data.dimensions.map(String)]
        : Array.from(new Set(dataset.flatMap((row) => Object.keys(row)))).slice(0, 12);
    return {
      kind: 'table',
      engine: 'table',
      columns,
      rows: dataset,
    };
  }

  const seriesList = Array.isArray(data.series) ? data.series as Array<Record<string, unknown>> : [];
  const sortedDataset = sortRowsByDateCandidate(dataset, ['date', 'x', 'label']);
  const xValues = sortedDataset.map((item) => String(item.date ?? item.x ?? item.label ?? ''));
  const normalizedSeries: TrendChartSeries[] = seriesList.length > 0
    ? seriesList.map((seriesItem, index) => ({
      metricKey: String(seriesItem.metricKey || seriesItem.name || data.metricName || `series-${index + 1}`),
      displayName: resolveDisplayNameByMetric({
        metricKey: String(seriesItem.metricKey || seriesItem.name || data.metricName || `series-${index + 1}`),
        displayName: String(seriesItem.name || seriesItem.metricKey || data.metricName || `指标${index + 1}`),
        metricNameMap: metricDisplayNameMap,
      }),
      yAxisId: seriesItem.yAxisId === 'right' ? 'right' : 'left',
      formatter: typeof seriesItem.formatter === 'string' ? seriesItem.formatter : 'number-2',
      points: Array.isArray(seriesItem.points)
        ? seriesItem.points as Array<{ date?: string; value?: unknown; y?: unknown; amount?: unknown; series?: string }>
        : [],
      }))
    : [{
      metricKey: String(data.metricName || 'value'),
      displayName: String(data.metricName || data.metricName || 'value'),
      yAxisId: 'left',
      formatter: 'number-2',
      points: [],
    }];
  const fallbackSeriesPoints = buildSeriesCollection({
    seriesSource: normalizedSeries,
    chartDataset: sortedDataset,
    xValues,
    xField: 'date',
    metricDisplayNameMap,
  });
  const fallbackOption = buildChartOptionByType({
    chartType,
    chartXValues: xValues,
    seriesPoints: fallbackSeriesPoints,
    yAxes: [{ id: 'left', title: String(data.metricName || '') }],
  });
  if (fallbackOption) {
    return {
      kind: 'chart',
      engine: 'echarts',
      height: 360,
      option: fallbackOption as Record<string, unknown>,
    };
  }
  return null;
}





