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
import type { BusinessMetric } from '@/contracts/business-semantics/metric-catalog';
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
  revenue: 'daily',
  arppu: 'daily',

  // ROI 域
  roi: 'roi',
  roas: 'roi',

  // 留存域
  retention_d1: 'retention',
  retention_d7: 'retention',
  retention_d30: 'retention',
};

/**
 * 域到指标的映射（反向查找用）
 */
const DOMAIN_TO_METRICS: Record<ReportCapabilityDomain, string[]> = {
  daily: ['cost', 'activation', 'register', 'payment', 'revenue', 'arppu'],
  roi: ['roi', 'roas'],
  retention: ['retention_d1', 'retention_d7', 'retention_d30'],
  weekly: [],
  monthly: [],
  hourly: [],
  dictionary: [],
  project: [],
};

// ─── Metric Alias Resolution ───────────────────────────────

/**
 * 常见指标别名映射。
 * 用户说"消耗" → cost, "ROI" → roi, "次留" → retention_d1 等
 */
const METRIC_ALIASES: Record<string, BusinessMetric> = {
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
  '收入': 'revenue',
  'revenue': 'revenue',
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

/**
 * 解析指标名称（支持别名和原始 key）
 */
export function resolveMetricKey(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  // 直接匹配别名
  const alias = METRIC_ALIASES[normalized] || METRIC_ALIASES[raw.trim()];
  if (alias) return alias;
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
  return DIMENSION_ALIASES[trimmed] || trimmed.toLowerCase();
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

  // 1. 过滤支持所有必需维度的工具
  const dimensionCapable = capabilities.filter(cap => {
    return requiredDimensions.every(dim =>
      cap.supported_dimensions.includes(dim),
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
    const matchingTool = dimensionCapable.find(cap =>
      cap.report_domains.includes(targetDomain),
    );

    if (!matchingTool) {
      uncoveredMetrics.push(metric);
      continue;
    }

    const key = matchingTool.capability_id;
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
  const uncoveredDimensions = requiredDimensions.filter(
    dim => !allSupportedDims.has(dim),
  );

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

  // 1. 工具选择
  const selection = selectToolsForQuery(
    { requiredMetrics: metrics, requiredDimensions: dimensions, filters, timeRange },
    capabilities,
  );

  // 2. 为每个选中的工具生成 SubQuery
  const subQueries: SubQuery[] = selection.selectedCapabilities.map(cap =>
    createSubQuery({
      toolName: cap.toolName,
      serverName: cap.serverName,
      capabilityId: cap.capabilityId,
      metrics: cap.assignedMetrics,
      dimensions: dimensions, // 所有子查询共享同一组维度
      filters,
      timeRange,
    }),
  );

  const confidence = selection.uncoveredMetrics.length === 0
    ? 0.9
    : Math.max(0.3, 0.9 - selection.uncoveredMetrics.length * 0.2);

  return {
    originalQuery,
    requiredDimensions: dimensions,
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
