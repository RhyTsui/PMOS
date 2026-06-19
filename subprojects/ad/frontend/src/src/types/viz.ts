/**
 * 列 Schema 条目。
 * 用于给表格列提供 label、类型、可见性等元数据。
 *
 * 迭代条目：#95-99
 *
 * 设计原则：
 * - columnSchema 是可选的，与 columns: string[] 兼容
 * - Renderer 优先使用 columnSchema.label 展示，缺失 label 时 fallback 到 key
 * - 禁止使用 `as any` 解决类型问题
 */
export interface ColumnSchemaEntry {
  /** 列 key，对应 rows 中的字段名 */
  key: string;
  /** 用户可见的列标签 */
  label?: string;
  /** 列数据类型 */
  type?: 'string' | 'number' | 'date' | 'percent' | 'currency' | 'boolean';
  /** 是否可见（默认 true） */
  visible?: boolean;
  /** 列宽提示 */
  width?: number;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
}

export type VizTableSpec = {
  kind: 'table';
  engine: 'table';
  columns: string[];
  /** 列 Schema（可选）。提供 label、类型、可见性等元数据。 */
  columnSchema?: ColumnSchemaEntry[];
  rows: Array<Record<string, unknown>>;
  fileName?: string;
};

export type VizChartSpec = {
  kind: 'chart';
  engine: 'echarts' | 'antv';
  option: Record<string, unknown>;
  height?: number;
};

export type VizFlowSpec = {
  kind: 'flow';
  engine: 'reactflow';
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
  height?: number;
};

export type VizSpec = VizTableSpec | VizChartSpec | VizFlowSpec;
