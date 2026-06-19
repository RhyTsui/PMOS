/**
 * Multi-Query Decomposition — 多工具编排 / 拼表契约
 *
 * 当用户请求涉及多个指标且需要跨 MCP 工具取数时，系统需要将请求拆解为多个子查询，
 * 分别调用不同的工具，然后在共同维度上做 FULL JOIN。
 *
 * 核心原则：
 * 1. 所有被选中的工具必须支持用户要求的维度（否则不选它）
 * 2. 每个子查询只负责自己能力范围内的指标
 * 3. 维度归一化后按共同维度 FULL JOIN，缺失填空值
 * 4. 来源可追溯——每列数据来自哪个工具、哪个服务器
 *
 * 典型场景：
 * 用户: "给我昨天三小的消耗、激活、ROI、次留，按媒体拆"
 * → 拆解为：daily_tool (消耗/激活) + roi_tool (ROI) + retention_tool (次留)
 * → 三个工具都支持 [media, date] 维度
 * → FULL JOIN on [date, media]
 */

import type { ServiceType } from '@/contracts/service-catalog';

// ─── Sub-Query（子查询）─────────────────────────────────

/**
 * 子查询：拆解后分配给单个工具的查询任务
 */
export interface SubQuery {
  /** 子查询唯一 ID */
  subQueryId: string;
  /** 目标工具名 */
  toolName: string;
  /** 目标服务器名 */
  serverName: string;
  /** capability ID（用于 trace 和 evidence） */
  capabilityId?: string;
  /** 该工具负责取的指标列表 */
  metrics: string[];
  /** 统一的维度列表（所有子查询共享） */
  dimensions: string[];
  /** 过滤条件 */
  filters: Record<string, string[]>;
  /** 时间范围 */
  timeRange?: {
    start: string;
    end: string;
  };
  /** 该子查询需要的额外输入参数 */
  extraInputs?: Record<string, unknown>;
}

// ─── Query Decomposition（查询拆解结果）────────────────────

/**
 * 查询拆解结果：将一个复合查询拆解为多个子查询
 */
export interface QueryDecomposition {
  /** 用户原始查询 */
  originalQuery: string;
  /** 识别到的所有必需维度 */
  requiredDimensions: string[];
  /** 识别到的所有必需指标 */
  requiredMetrics: string[];
  /** 拆解出的子查询列表 */
  subQueries: SubQuery[];
  /** 拆解置信度 */
  confidence: number;
  /** 拆解原因/说明 */
  reason: string;
  /** 拆解耗时（ms） */
  decompositionLatencyMs: number;
}

// ─── Sub-Query Result（子查询结果）───────────────────────

/**
 * 单个子查询的执行结果
 */
export interface SubQueryResult {
  /** 对应的子查询 ID */
  subQueryId: string;
  /** 工具名 */
  toolName: string;
  /** 服务器名 */
  serverName: string;
  /** 是否成功 */
  ok: boolean;
  /** 错误信息（失败时） */
  errorMessage?: string;
  /** 返回的列 */
  columns: Column[];
  /** 返回的行数据 */
  rows: Row[];
  /** 执行耗时（ms） */
  latencyMs: number;
  /** 原始 MCP 结果（用于 evidence） */
  rawResult?: unknown;
}

// ─── Column（列定义）────────────────────────────────────

/**
 * 列定义：描述结果表中一列的元数据
 */
export interface Column {
  /** 列键（用于行数据中的 key） */
  key: string;
  /** 显示名称 */
  displayName: string;
  /** 列类型 */
  type: ColumnType;
  /** 该列来自哪个子查询（维度列标记为 'shared'） */
  sourceSubQueryId: string;
  /** 该列来自哪个工具 */
  sourceTool?: string;
  /** 对应的指标名（如果是指标列） */
  metric?: string;
  /** 对应的维度名（如果是维度列） */
  dimension?: string;
}

export type ColumnType =
  | 'dimension'   // 维度列（日期、媒体等）
  | 'metric';     // 指标列（消耗、ROI 等）

// ─── Row（行数据）───────────────────────────────────────

/**
 * 行数据：键值对形式，key 对应 Column.key
 */
export type Row = Record<string, unknown>;

// ─── Federated Query Result（合并结果）────────────────────

/**
 * 联邦查询结果：多个子查询结果合并后的最终输出
 */
export interface FederatedQueryResult {
  /** 合并后的列定义 */
  columns: Column[];
  /** 合并后的行数据 */
  rows: Row[];
  /** 来源追溯：列 key → { tool, server } */
  sourceTrace: Record<string, { tool: string; server: string; subQueryId: string }>;
  /** 各子查询结果明细 */
  subQueryResults: SubQueryResult[];
  /** Join 使用的维度键 */
  joinKeys: string[];
  /** 总行数 */
  totalRows: number;
  /** 总列数 */
  totalColumns: number;
  /** 合并耗时（ms） */
  joinLatencyMs: number;
  /** 总执行耗时（ms） */
  totalLatencyMs: number;
  /** 是否有部分失败 */
  hasPartialFailure: boolean;
  /** 缺失数据说明 */
  missingDataNotes: string[];
}

// ─── Tool Selection（工具选择）───────────────────────────

/**
 * 工具选择输入：描述查询需要的维度和指标
 */
export interface ToolSelectionInput {
  requiredMetrics: string[];
  requiredDimensions: string[];
  filters?: Record<string, string[]>;
  timeRange?: { start: string; end: string };
}

/**
 * 工具选择结果：选中的工具 + 各工具负责的指标分配
 */
export interface ToolSelectionResult {
  /** 选中的能力列表 */
  selectedCapabilities: SelectedCapability[];
  /** 未覆盖的指标 */
  uncoveredMetrics: string[];
  /** 未覆盖的维度（如果有，说明没有工具能满足） */
  uncoveredDimensions: string[];
  /** 选择说明 */
  reason: string;
}

/**
 * 选中的能力 + 该能力负责的指标分配
 */
export interface SelectedCapability {
  capabilityId: string;
  toolName: string;
  serverName: string;
  /** 该能力负责取的指标 */
  assignedMetrics: string[];
  /** 该能力支持的维度 */
  supportedDimensions: string[];
  /** 选择原因 */
  reason: string;
  /** 置信度 */
  confidence: number;
}

// ─── Dimension Normalization（维度归一化）─────────────────

/**
 * 维度归一化规则
 */
export interface DimensionNormalizationRule {
  /** 维度名 */
  dimension: string;
  /** 归一化类型 */
  type: 'date_format' | 'name_alias' | 'enum_mapping' | 'identity';
  /** 目标格式/映射 */
  target: string | Record<string, string>;
}

/**
 * 归一化后的数据集
 */
export interface NormalizedDataSet {
  subQueryId: string;
  toolName: string;
  columns: Column[];
  rows: Row[];
  /** 应用的归一化规则 */
  appliedRules: DimensionNormalizationRule[];
}

// ─── Multi-Query Context（多查询上下文）──────────────────

/**
 * 多工具编排的完整执行上下文
 */
export interface MultiQueryContext {
  /** 用户原始消息 */
  originalMessage: string;
  /** 查询拆解结果 */
  decomposition: QueryDecomposition;
  /** 工具选择结果 */
  toolSelection: ToolSelectionResult;
  /** 执行结果 */
  federatedResult?: FederatedQueryResult;
  /** 关联的 ServiceType */
  serviceType: ServiceType;
  /** 执行开始时间 */
  startedAt: string;
}

// ─── Helper Functions ──────────────────────────────────

/**
 * 创建空的 FederatedQueryResult
 */
export function createEmptyFederatedResult(
  joinKeys: string[],
  startedAt: string,
): FederatedQueryResult {
  return {
    columns: [],
    rows: [],
    sourceTrace: {},
    subQueryResults: [],
    joinKeys,
    totalRows: 0,
    totalColumns: 0,
    joinLatencyMs: 0,
    totalLatencyMs: Date.now() - new Date(startedAt).getTime(),
    hasPartialFailure: false,
    missingDataNotes: [],
  };
}

/**
 * 创建子查询
 */
export function createSubQuery(params: {
  toolName: string;
  serverName: string;
  capabilityId?: string;
  metrics: string[];
  dimensions: string[];
  filters?: Record<string, string[]>;
  timeRange?: { start: string; end: string };
}): SubQuery {
  return {
    subQueryId: `sq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    toolName: params.toolName,
    serverName: params.serverName,
    capabilityId: params.capabilityId,
    metrics: params.metrics,
    dimensions: params.dimensions,
    filters: params.filters ?? {},
    timeRange: params.timeRange,
  };
}
