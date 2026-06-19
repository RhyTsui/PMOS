'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import * as echarts from 'echarts';
import type { VizChartSpec, VizSpec, VizTableSpec } from '@/types/viz';
import { useThemeColors } from '@/hooks/useTheme';
import { describeDisplayValue, type DisplayValueType } from '@/lib/display-format';
import { Table } from 'antd';

import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

type ViewMode = 'chart' | 'table';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').replace(/%$/, '').trim();
    if (normalized && Number.isFinite(Number(normalized))) return Number(normalized);
  }
  return null;
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

function dateSortOrder(values: unknown[]): number[] | null {
  const indexed = values.map((value, index) => ({ index, time: parseDateSortValue(value) }));
  if (indexed.length < 2 || indexed.some((item) => item.time === null)) return null;
  const sorted = [...indexed].sort((a, b) => (a.time as number) - (b.time as number) || a.index - b.index);
  return sorted.some((item, index) => item.index !== index) ? sorted.map((item) => item.index) : null;
}

function reorderByIndex<T>(items: T[], order: number[]): T[] {
  return order.map((index) => items[index]);
}

function exportRowsToExcel(params: { columns: string[]; rows: Array<Record<string, unknown>>; fileName?: string }) {
  const header = params.columns;
  const data = params.rows.map((row) => {
    const next: Record<string, unknown> = {};
    header.forEach((key) => {
      next[key] = row[key];
    });
    return next;
  });
  const worksheet = XLSX.utils.json_to_sheet(data, { header });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, params.fileName || 'data.xlsx');
}

function chartSeries(option: Record<string, unknown>): Array<Record<string, unknown>> {
  return Array.isArray(option.series) ? option.series.filter(isRecord) : [];
}

function seriesName(series: Record<string, unknown>, index: number): string {
  const raw = series.name;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : `series-${index + 1}`;
}

function findXColumn(columns: string[], rows: Array<Record<string, unknown>>): string {
  const preferred = columns.find((column) => /^(date|time|day|month|x|label)$/i.test(column));
  if (preferred) return preferred;
  const stringLike = columns.find((column) => rows.some((row) => typeof row[column] === 'string'));
  return stringLike || columns[0] || 'x';
}

function numericColumns(columns: string[], rows: Array<Record<string, unknown>>, xColumn: string): string[] {
  return columns.filter((column) => {
    if (column === xColumn) return false;
    return rows.some((row) => toNumber(row[column]) !== null);
  });
}

function sortRowsByDateColumn(rows: Array<Record<string, unknown>>, xColumn: string): Array<Record<string, unknown>> {
  const order = dateSortOrder(rows.map((row) => row[xColumn]));
  return order ? reorderByIndex(rows, order) : rows;
}

function tableToChart(table: VizTableSpec, selectedMetrics: string[]): VizChartSpec | null {
  if (!table.rows.length || table.columns.length < 2) return null;
  const xColumn = findXColumn(table.columns, table.rows);
  const chartRows = sortRowsByDateColumn(table.rows, xColumn);
  const metrics = numericColumns(table.columns, table.rows, xColumn);
  if (!metrics.length) return null;
  const activeMetrics = selectedMetrics.length > 0 ? selectedMetrics.filter((metric) => metrics.includes(metric)) : metrics.slice(0, metrics.length > 2 ? 1 : 2);
  return {
    kind: 'chart',
    engine: 'echarts',
    height: 360,
    option: {
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: 48, right: 24, top: 42, bottom: 36 },
      xAxis: { type: 'category', data: chartRows.map((row) => String(row[xColumn] ?? '')) },
      yAxis: { type: 'value' },
      series: activeMetrics.map((metric) => ({
        name: metric,
        type: 'line',
        smooth: true,
        data: chartRows.map((row) => toNumber(row[metric]) ?? 0),
      })),
    },
  };
}

function chartToTable(chart: VizChartSpec): VizTableSpec | null {
  const option = chart.option || {};
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
  const xValues = isRecord(xAxis) && Array.isArray(xAxis.data) ? xAxis.data : [];
  const series = chartSeries(option);
  if (!xValues.length || !series.length) return null;
  const columns = ['x', ...series.map(seriesName)];
  const rows = xValues.map((xValue, index) => {
    const row: Record<string, unknown> = { x: xValue };
    series.forEach((item, seriesIndex) => {
      const data = Array.isArray(item.data) ? item.data : [];
      const point = data[index];
      row[seriesName(item, seriesIndex)] = Array.isArray(point) ? point[1] : point;
    });
    return row;
  });
  return { kind: 'table', engine: 'table', columns, rows };
}

function filteredChart(chart: VizChartSpec, selectedNames: string[]): VizChartSpec {
  if (!selectedNames.length) return chart;
  const option = chart.option || {};
  const series = chartSeries(option);
  const nextSeries = series.filter((item, index) => selectedNames.includes(seriesName(item, index)));
  if (!nextSeries.length) return chart;
  return {
    ...chart,
    option: {
      ...option,
      series: nextSeries,
    },
  };
}

function normalizeDateAxisChart(chart: VizChartSpec): VizChartSpec {
  const option = chart.option || {};
  const xAxisList = Array.isArray(option.xAxis) ? option.xAxis : [option.xAxis];
  const firstXAxis = xAxisList.find(isRecord);
  const xValues = firstXAxis && Array.isArray(firstXAxis.data) ? firstXAxis.data : [];
  const order = dateSortOrder(xValues);
  if (!order) return chart;
  const nextXAxisList = xAxisList.map((axis) => {
    if (!isRecord(axis) || !Array.isArray(axis.data)) return axis;
    return { ...axis, data: reorderByIndex(axis.data, order) };
  });
  const nextSeries = chartSeries(option).map((series) => {
    const data = Array.isArray(series.data) ? series.data : null;
    return data && data.length === order.length ? { ...series, data: reorderByIndex(data, order) } : series;
  });
  return {
    ...chart,
    option: {
      ...option,
      xAxis: Array.isArray(option.xAxis) ? nextXAxisList : nextXAxisList[0],
      series: nextSeries,
    },
  };
}

function TableView({ table }: { table: VizTableSpec }) {
  const c = useThemeColors();
  const tableRows = useMemo(() => table.rows.map((row, index) => {
    const values: Record<string, string> = {};
    const rawValues: Record<string, number | null> = {};
    const valueTypes: Record<string, DisplayValueType> = {};

    table.columns.forEach((field) => {
      const result = describeDisplayValue(row[field], field);
      values[field] = result.text;
      rawValues[field] = result.numericValue;
      valueTypes[field] = result.type;
    });

    return {
      key: String(index),
      ...values,
      __rawValues: rawValues,
      __valueTypes: valueTypes,
    };
  }), [table]);

  const columnDefs = useMemo(() => {
    // 优先使用 columnSchema，缺失时 fallback 到 key
    const columnSchemaMap = new Map<string, import('@/types/viz').ColumnSchemaEntry>();
    if (table.columnSchema) {
      for (const entry of table.columnSchema) {
        columnSchemaMap.set(entry.key, entry);
      }
    }

    return table.columns
      .filter((field) => {
        // 如果 columnSchema 指定 visible: false，跳过该列
        const schemaEntry = columnSchemaMap.get(field);
        return schemaEntry?.visible !== false;
      })
      .map((field) => {
        const schemaEntry = columnSchemaMap.get(field);
        const firstValueType = tableRows.find((row) => row.__valueTypes[field] !== 'text')?.__valueTypes[field] || 'number';
        const isText = firstValueType === 'text';
        const isPercent = firstValueType === 'percent';
        // columnSchema 优先，fallback 到原始 field key
        const displayTitle = schemaEntry?.label || field;
        const fieldWidth = schemaEntry?.width ?? Math.max(
          Math.min(Math.max(displayTitle.length * 16 + 28, 120), 220),
          isText ? 140 : 130,
        );
        const align = schemaEntry?.align ?? (isText ? ('left' as const) : ('right' as const));
        return {
          title: displayTitle,
          dataIndex: field,
          key: field,
          width: fieldWidth,
          ellipsis: {
            showTitle: false,
          },
          align,
          sorter: (a: Record<string, unknown>, b: Record<string, unknown>) => {
            const left = (a.__rawValues as Record<string, number | null | undefined> | undefined)?.[field];
            const right = (b.__rawValues as Record<string, number | null | undefined> | undefined)?.[field];
            const leftMissing = left === null || left === undefined;
            const rightMissing = right === null || right === undefined;
            if (!leftMissing && !rightMissing) return left - right;
            if (leftMissing && rightMissing) return 0;
            return leftMissing ? 1 : -1;
          },
          render: (text: string, row: Record<string, unknown>) => {
        const normalizedText = String(text ?? '--');
        const raw = (row.__rawValues as Record<string, number | null | undefined> | undefined)?.[field];
        const isMissing = normalizedText === '--';
        const isNegative = !isMissing && typeof raw === 'number' && raw < 0;
        return (
          <span
            style={{
              display: 'inline-block',
              width: '100%',
              textAlign: align === 'left' ? 'left' : 'right',
              color: isMissing ? c.textMuted : (isPercent ? '#0f766e' : (isNegative ? '#b91c1c' : c.textPrimary)),
              fontWeight: isText ? 400 : 500,
              whiteSpace: 'nowrap',
            }}
            title={normalizedText}
          >
            {normalizedText}
          </span>
        );
      },
        };
      });
  }, [tableRows, table.columns, table.columnSchema]);

  return (
    <div className="xq-data-result-fade" style={{ padding: '8px', overflowX: 'auto' }}>
      <Table
        bordered
        size="middle"
        columns={columnDefs}
        dataSource={tableRows}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: table.columns.length > 6 ? 'max-content' : true }}
      />
    </div>
  );
}

function DataToolbar({
  viewMode,
  canShowChart,
  canShowTable,
  onViewModeChange,
  metricNames,
  selectedMetricNames,
  onToggleMetric,
  onExport,
}: {
  viewMode: ViewMode;
  canShowChart: boolean;
  canShowTable: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  metricNames: string[];
  selectedMetricNames: string[];
  onToggleMetric: (metric: string) => void;
  onExport?: () => void;
}) {
  const c = useThemeColors();
  const showMetricSelector = metricNames.length > 2;
  return (
    <div
      style={{
        padding: '8px 10px',
        borderBottom: `1px solid ${c.borderFaint}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
        {canShowChart && canShowTable && (
          <div style={{ display: 'inline-flex', border: `1px solid ${c.borderFaint}`, borderRadius: 10, padding: 2, background: c.bgSection }}>
            {(['chart', 'table'] as ViewMode[]).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewModeChange(mode)}
                  style={{
                    height: 26,
                    padding: '0 10px',
                    border: 'none',
                    borderRadius: 8,
                    background: active ? '#fff' : 'transparent',
                    color: active ? c.textPrimary : c.textMuted,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {mode === 'chart' ? '\u56fe' : '\u8868'}
                </button>
              );
            })}
          </div>
        )}
        {showMetricSelector && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
            {metricNames.map((metric) => {
              const active = selectedMetricNames.includes(metric);
              return (
                <button
                  key={metric}
                  type="button"
                  onClick={() => onToggleMetric(metric)}
                  title={metric}
                  style={{
                    height: 26,
                    maxWidth: 180,
                    padding: '0 9px',
                    borderRadius: 999,
                    border: `1px solid ${active ? c.accentBorder : c.borderFaint}`,
                    background: active ? c.accentBgFaint : '#fff',
                    color: active ? c.accent : c.textSecondary,
                    cursor: 'pointer',
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {metric}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          style={{
            height: 30,
            padding: '0 10px',
            borderRadius: 999,
            border: `1px solid ${c.borderFaint}`,
            background: '#fff',
            color: c.textSecondary,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            flexShrink: 0,
            fontSize: 12,
          }}
          title={'\u5bfc\u51fa Excel'}
        >
          <Download size={14} />
          {'\u5bfc\u51fa'}
        </button>
      )}
    </div>
  );
}

function ChartView({ chart }: { chart: VizChartSpec }) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const chartOptionKey = useMemo(() => JSON.stringify(chart.option || {}), [chart.option]);

  useEffect(() => {
    if (chart.engine !== 'echarts') return;
    const node = chartRef.current;
    if (!node || chartInstanceRef.current) return;
    const instance = echarts.init(node, undefined, { renderer: 'canvas' });
    chartInstanceRef.current = instance;
    const onResize = () => instance.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      instance.dispose();
      if (chartInstanceRef.current === instance) {
        chartInstanceRef.current = null;
      }
    };
  }, [chart.engine]);

  useEffect(() => {
    if (chart.engine !== 'echarts') {
      if (!chartInstanceRef.current) return;
      chartInstanceRef.current.dispose();
      chartInstanceRef.current = null;
      return;
    }
    const instance = chartInstanceRef.current;
    if (!instance) return;
    instance.setOption(chart.option as Record<string, unknown>, { notMerge: true, lazyUpdate: true });
  }, [chart.engine, chartOptionKey]);

  const height = chart.height || 360;
  if (chart.engine !== 'echarts') {
    return (
      <div
        className="xq-data-result-fade"
        style={{
          height,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: 13,
        }}
      >
        当前仅支持 ECharts 渲染，请确认返回图表配置。
      </div>
    );
  }
  return <div className="xq-data-result-fade" ref={chartRef} style={{ height, width: '100%' }} />;
}

export function DataVizRenderer({ spec }: { spec: VizSpec }) {
  const c = useThemeColors();
  const table = spec.kind === 'table' ? spec : null;
  const rawChart = spec.kind === 'chart' ? spec : null;
  const chart = useMemo(() => rawChart ? normalizeDateAxisChart(rawChart) : null, [rawChart]);
  const flow = spec.kind === 'flow' ? spec : null;
  const [viewMode, setViewMode] = useState<ViewMode>(chart ? 'chart' : 'table');
  const baseTable = useMemo(() => table || (chart ? chartToTable(chart) : null), [chart, table]);
  const metricNames = useMemo(() => {
    if (chart) return chartSeries(chart.option).map(seriesName);
    if (baseTable) {
      const xColumn = findXColumn(baseTable.columns, baseTable.rows);
      return numericColumns(baseTable.columns, baseTable.rows, xColumn);
    }
    return [];
  }, [baseTable, chart]);
  const [selectedMetricNames, setSelectedMetricNames] = useState<string[]>([]);
  const activeMetricNames = selectedMetricNames.length > 0
    ? selectedMetricNames.filter((metric) => metricNames.includes(metric))
    : metricNames.length > 2
      ? [metricNames[0]]
      : metricNames;
  const activeTable = baseTable;
  const activeChart = useMemo(() => {
    if (chart) return filteredChart(chart, activeMetricNames);
    if (table) return tableToChart(table, activeMetricNames);
    return null;
  }, [activeMetricNames, chart, table]);
  const canShowChart = Boolean(activeChart);
  const canShowTable = Boolean(activeTable);
  const activeViewMode = useMemo(() => {
    if (canShowChart && !canShowTable) return 'chart' as const;
    if (canShowTable && !canShowChart) return 'table' as const;
    return viewMode;
  }, [canShowChart, canShowTable, viewMode]);

  useEffect(() => {
    setSelectedMetricNames((prev) => prev.filter((name) => metricNames.includes(name)));
  }, [metricNames]);

  useEffect(() => {
    if (!chart && !table) return;
    setViewMode((prev) => {
      if (canShowChart && canShowTable) return prev;
      return canShowChart ? 'chart' : 'table';
    });
  }, [canShowChart, canShowTable]);

  const toggleMetric = (metric: string) => {
    setSelectedMetricNames((prev) => {
      const base = prev.length > 0 ? prev : activeMetricNames;
      if (base.includes(metric)) {
        const next = base.filter((item) => item !== metric);
        return next.length > 0 ? next : [metric];
      }
      return [...base, metric].slice(-2);
    });
  };

  if (flow) {
    const height = flow.height || 420;
    return (
      <section className="xq-data-result-fade" style={{ borderRadius: 12, border: `1px solid ${c.borderFaint}`, background: '#fff', overflow: 'hidden' }}>
        <div style={{ height, width: '100%' }}>
          <ReactFlow nodes={flow.nodes as any} edges={flow.edges as any} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </section>
    );
  }

  if (!activeChart && !activeTable) return null;
  const effectiveView = activeViewMode === 'chart' && canShowChart ? 'chart' : 'table';

  return (
    <section className="xq-data-result-panel" style={{ borderRadius: 12, border: `1px solid ${c.borderFaint}`, background: '#fff', overflow: 'hidden' }}>
      <DataToolbar
        viewMode={effectiveView}
        canShowChart={canShowChart}
        canShowTable={canShowTable}
        onViewModeChange={setViewMode}
        metricNames={metricNames}
        selectedMetricNames={activeMetricNames}
        onToggleMetric={toggleMetric}
        onExport={activeTable ? () => exportRowsToExcel({ columns: activeTable.columns, rows: activeTable.rows, fileName: activeTable.fileName }) : undefined}
      />
      {effectiveView === 'chart' && activeChart ? (
        <ChartView chart={activeChart} />
      ) : activeTable ? (
        <TableView table={activeTable} />
      ) : null}
    </section>
  );
}



