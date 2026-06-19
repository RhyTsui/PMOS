/**
 * Schema Registry — 报表字段、维度、类型与可视化结构的真源登记。
 *
 * Stage 1 (task 1.6) 落地：为 request-understanding / report-query-orchestrator
 * 提供统一的字段定义登记，禁止 LLM 凭经验回答字段语义。
 *
 * 设计原则：
 * 1. 每个报表类型（reportType）在此注册其可用字段、推荐维度、可视化偏好。
 * 2. 字段定义来自 METRIC_CATALOG / DIMENSION_CATALOG / 业务扩展，不硬编码在 prompt。
 * 3. field_definition 类问题必须通过本 registry 查找，不得自由推断。
 */

import { METRIC_CATALOG, type BusinessMetric, type MetricDefinition } from '@/contracts/business-semantics/metric-catalog';
import { DIMENSION_CATALOG, type BusinessDimension, type DimensionDefinition } from '@/contracts/business-semantics/dimension-catalog';

// ─── 报表类型 ─────────────────────────────────────────────

export type ReportType =
  | 'cost_summary'
  | 'activation_performance'
  | 'payment_funnel'
  | 'retention_analysis'
  | 'revenue_arppu'
  | 'material_detail'
  | 'media_comparison'
  | 'campaign_breakdown';

export interface ReportTypeDefinition {
  key: ReportType;
  label: string;
  description: string;
  /** 该报表类型支持的指标（来自 METRIC_CATALOG）。空数组表示继承全量。 */
  supportedMetrics: BusinessMetric[];
  /** 该报表类型支持的维度（来自 DIMENSION_CATALOG）。空数组表示继承全量。 */
  supportedDimensions: BusinessDimension[];
  /** 默认推荐可视化形式。 */
  defaultVisualization: 'trend_line' | 'bar_chart' | 'pie_chart' | 'table' | 'kpi_card' | 'funnel' | 'heatmap';
  /** 是否需要时间范围。 */
  requiresDateRange: boolean;
  /** 触发关键词/语义信号（用于 field_definition 类问题路由到正确报表）。 */
  semanticSignals: string[];
}

// ─── 字段定义登记 ────────────────────────────────────────────

export type FieldCategory = 'metric' | 'dimension' | 'derived' | 'system';

export interface FieldDefinition {
  /** 字段 key（来自 metric/dimension catalog 或自定义）。 */
  key: string;
  /** 字段显示名。 */
  label: string;
  /** 字段分类。 */
  category: FieldCategory;
  /** 口径说明（中文，面向用户）。 */
  definition: string;
  /** 计算逻辑（面向技术说明）。 */
  computation?: string;
  /** 数据来源（MCP / 报表 / 派生）。 */
  source: string;
  /** 关联的报表类型（空数组表示全局字段）。 */
  applicableReports: ReportType[];
  /** 同义词（用于 field_definition 类问题匹配）。 */
  synonyms: string[];
}

// ─── 报表类型登记 ────────────────────────────────────────────

export const REPORT_TYPE_REGISTRY: ReportTypeDefinition[] = [
  {
    key: 'cost_summary',
    label: '消耗汇总',
    description: '整体投放消耗、ROI、ROAS 等核心消耗指标汇总。',
    supportedMetrics: ['cost', 'roi', 'roas', 'revenue'],
    supportedDimensions: ['date', 'media', 'account', 'campaign'],
    defaultVisualization: 'trend_line',
    requiresDateRange: true,
    semanticSignals: ['消耗', '花费', '成本', 'ROI', 'ROAS', '投入产出'],
  },
  {
    key: 'activation_performance',
    label: '激活表现',
    description: '激活量、激活率、激活成本等激活链路指标。',
    supportedMetrics: ['activation', 'cost', 'roi'],
    supportedDimensions: ['date', 'material', 'media', 'campaign', 'package', 'terminal'],
    defaultVisualization: 'bar_chart',
    requiresDateRange: true,
    semanticSignals: ['激活', '激活量', '激活率', '激活成本', '新增'],
  },
  {
    key: 'payment_funnel',
    label: '付费漏斗',
    description: '激活→注册→付费的转化漏斗与各级转化率。',
    supportedMetrics: ['activation', 'register', 'payment', 'cost', 'roi'],
    supportedDimensions: ['date', 'material', 'media', 'campaign', 'package'],
    defaultVisualization: 'funnel',
    requiresDateRange: true,
    semanticSignals: ['付费', '充值', '转化', '漏斗', '注册', '付费率'],
  },
  {
    key: 'retention_analysis',
    label: '留存分析',
    description: 'D1/D7/D30 留存率及留存用户价值。',
    supportedMetrics: ['retention_d1', 'arppu', 'revenue'],
    supportedDimensions: ['date', 'media', 'package', 'terminal'],
    defaultVisualization: 'heatmap',
    requiresDateRange: true,
    semanticSignals: ['留存', '次留', '7日留存', '30日留存', '回流'],
  },
  {
    key: 'revenue_arppu',
    label: '收入与 ARPPU',
    description: '收入规模、ARPPU、付费用户价值分析。',
    supportedMetrics: ['revenue', 'arppu', 'payment', 'roi'],
    supportedDimensions: ['date', 'media', 'account', 'package', 'terminal'],
    defaultVisualization: 'trend_line',
    requiresDateRange: true,
    semanticSignals: ['收入', '营收', 'ARPPU', '付费用户', '客单价', 'LTV'],
  },
  {
    key: 'material_detail',
    label: '素材明细',
    description: '按素材维度的效果明细与对比。',
    supportedMetrics: ['cost', 'activation', 'payment', 'roi', 'roas'],
    supportedDimensions: ['material', 'date', 'media', 'campaign'],
    defaultVisualization: 'table',
    requiresDateRange: true,
    semanticSignals: ['素材', '创意', '物料', '素材效果', '素材明细'],
  },
  {
    key: 'media_comparison',
    label: '媒体对比',
    description: '跨媒体平台的效果对比与优选。',
    supportedMetrics: ['cost', 'activation', 'payment', 'roi', 'roas', 'revenue'],
    supportedDimensions: ['media', 'date', 'account'],
    defaultVisualization: 'bar_chart',
    requiresDateRange: true,
    semanticSignals: ['媒体', '平台', '渠道', '对比', '头条', '腾讯', '快手'],
  },
  {
    key: 'campaign_breakdown',
    label: '计划拆分',
    description: '按计划/单元粒度的效果拆分。',
    supportedMetrics: ['cost', 'activation', 'payment', 'roi'],
    supportedDimensions: ['campaign', 'adgroup', 'date', 'media'],
    defaultVisualization: 'table',
    requiresDateRange: true,
    semanticSignals: ['计划', '单元', '广告组', '拆分', '明细'],
  },
];

// ─── 字段定义登记 ────────────────────────────────────────────

/**
 * 从 METRIC_CATALOG 自动生成 metric 类字段定义。
 */
function buildMetricFieldDefinitions(): FieldDefinition[] {
  return METRIC_CATALOG.map((metric: MetricDefinition) => ({
    key: metric.key,
    label: metric.label,
    category: 'metric' as FieldCategory,
    definition: metric.description,
    source: 'report_query',
    applicableReports: REPORT_TYPE_REGISTRY
      .filter((r) => r.supportedMetrics.length === 0 || r.supportedMetrics.includes(metric.key))
      .map((r) => r.key),
    synonyms: [],
  }));
}

/**
 * 从 DIMENSION_CATALOG 自动生成 dimension 类字段定义。
 */
function buildDimensionFieldDefinitions(): FieldDefinition[] {
  return DIMENSION_CATALOG.map((dim: DimensionDefinition) => ({
    key: dim.key,
    label: dim.label,
    category: 'dimension' as FieldCategory,
    definition: dim.description,
    source: 'report_query',
    applicableReports: REPORT_TYPE_REGISTRY
      .filter((r) => r.supportedDimensions.length === 0 || r.supportedDimensions.includes(dim.key))
      .map((r) => r.key),
    synonyms: [],
  }));
}

/**
 * 派生字段（非原始指标，需要计算才能得到）。
 */
const DERIVED_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: 'activation_rate',
    label: '激活率',
    category: 'derived',
    definition: '激活量 / 展示量或点击量，反映广告带来激活的效率。',
    computation: 'activation_count / impression_count 或 click_count',
    source: 'derived',
    applicableReports: ['activation_performance', 'material_detail', 'media_comparison'],
    synonyms: ['激活转化', '激活效率'],
  },
  {
    key: 'payment_rate',
    label: '付费率',
    category: 'derived',
    definition: '付费用户数 / 注册用户数或激活数，反映付费转化效率。',
    computation: 'payment_count / register_count',
    source: 'derived',
    applicableReports: ['payment_funnel', 'activation_performance'],
    synonyms: ['付费转化', '付费转化效率'],
  },
  {
    key: 'cost_per_activation',
    label: '激活成本',
    category: 'derived',
    definition: '消耗 / 激活量，单个激活的平均成本。',
    computation: 'cost / activation_count',
    source: 'derived',
    applicableReports: ['activation_performance', 'cost_summary', 'material_detail', 'media_comparison'],
    synonyms: ['CPA', '单次激活成本', '激活单价'],
  },
  {
    key: 'cost_per_payment',
    label: '付费成本',
    category: 'derived',
    definition: '消耗 / 付费量，单个付费用户的获取成本。',
    computation: 'cost / payment_count',
    source: 'derived',
    applicableReports: ['payment_funnel', 'cost_summary'],
    synonyms: ['CPP', '单次付费成本', '付费单价'],
  },
  {
    key: 'arpu',
    label: 'ARPU',
    category: 'derived',
    definition: '总收入 / 活跃用户数，单用户平均收入。',
    computation: 'revenue / active_user_count',
    source: 'derived',
    applicableReports: ['revenue_arppu', 'retention_analysis'],
    synonyms: ['单用户收入'],
  },
];

/**
 * 系统字段（非业务指标/维度，但属于报表输出）。
 */
const SYSTEM_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: 'date',
    label: '日期',
    category: 'system',
    definition: '数据对应的日期，格式 YYYY-MM-DD。',
    source: 'report_query',
    applicableReports: REPORT_TYPE_REGISTRY.filter((r) => r.requiresDateRange).map((r) => r.key),
    synonyms: ['时间', '日期范围'],
  },
];

// ─── 完整 Registry 构建 ────────────────────────────────────

let _registryCache: FieldDefinition[] | null = null;

/**
 * 获取完整的字段定义登记（含自动从 catalog 生成的字段）。
 * 结果缓存，首次调用时构建。
 */
export function getFieldRegistry(): FieldDefinition[] {
  if (_registryCache) return _registryCache;
  _registryCache = [
    ...buildMetricFieldDefinitions(),
    ...buildDimensionFieldDefinitions(),
    ...DERIVED_FIELD_DEFINITIONS,
    ...SYSTEM_FIELD_DEFINITIONS,
  ];
  return _registryCache;
}

/**
 * 根据 key 查找字段定义。找不到返回 null。
 */
export function findFieldDefinition(key: string): FieldDefinition | null {
  return getFieldRegistry().find((f) => f.key === key) ?? null;
}

/**
 * 根据 label 或 synonym 模糊查找字段定义（用于 field_definition 类问题）。
 * 返回所有匹配的字段定义。
 */
export function findFieldDefinitionsByLabelOrSynonym(query: string): FieldDefinition[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];
  return getFieldRegistry().filter((f) => {
    if (f.label.toLowerCase() === normalizedQuery) return true;
    if (f.synonyms.some((s) => s.toLowerCase() === normalizedQuery)) return true;
    return false;
  });
}

/**
 * 根据报表类型获取该报表支持的字段定义。
 */
export function getFieldsForReportType(reportType: ReportType): FieldDefinition[] {
  return getFieldRegistry().filter(
    (f) => f.applicableReports.length === 0 || f.applicableReports.includes(reportType),
  );
}

/**
 * 根据报表类型获取报表定义。找不到返回 null。
 */
export function findReportTypeDefinition(reportType: ReportType | string): ReportTypeDefinition | null {
  return REPORT_TYPE_REGISTRY.find((r) => r.key === reportType) ?? null;
}

/**
 * 根据语义信号（关键词）匹配报表类型。
 */
export function matchReportTypeBySignal(signal: string): ReportTypeDefinition | null {
  const normalizedSignal = signal.trim().toLowerCase();
  if (!normalizedSignal) return null;
  return (
    REPORT_TYPE_REGISTRY.find((r) =>
      r.semanticSignals.some((s) => normalizedSignal.includes(s.toLowerCase())),
    ) ?? null
  );
}
