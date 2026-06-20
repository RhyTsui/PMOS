/**
 * Multi-Tool Orchestrator — 多工具编排器
 *
 * 串联 query-decomposer → MCP execution → dimension-normalizer → result-joiner，
 * 实现跨工具联邦查询。
 *
 * 执行流程：
 * 1. 从 semanticFrame/userRequirement 提取指标 + 维度
 * 2. 调用 decomposeQuery 拆解为 SubQuery 列表
 * 3. 并行调用各 MCP 工具执行 SubQuery
 * 4. 归一化各子查询结果的维度
 * 5. FULL JOIN 合并为最终结果
 *
 * 错误处理：
 * - 单个工具失败不影响其他工具（partial failure）
 * - 全部失败则返回空结果 + 错误信息
 * - 超时/安全阻断统一记入 SubQueryResult
 */

import type {
  FederatedQueryResult,
  MultiQueryContext,
  QueryDecomposition,
  SubQuery,
  SubQueryResult,
  Column,
  Row,
} from '@/contracts/multi-query';
import { decomposeQuery, extractMetricsAndDimensions } from './query-decomposer';
import { normalizeAllSubQueryResults } from './dimension-normalizer';
import { mergeSubQueryResults } from './result-joiner';
import { callMcpTool } from './mcp-discovery';
import type { ReportToolCapability } from './report-capability-manifest';
import { buildReportToolInput } from './report-query-orchestrator';
import type { McpServerConfig, McpToolConfig } from '@/types';
import type { ServiceType } from '@/contracts/service-catalog';

// ─── Orchestrator Input ──────────────────────────────────

export interface MultiToolOrchestratorInput {
  /** 用户原始消息 */
  message: string;
  /** semanticFrame（提取指标/维度用） */
  semanticFrame: {
    extractedEntities?: Array<{ type: string; key: string; value?: string }>;
    resolvedMetrics?: Array<{ key: string; raw?: string }>;
    resolvedDimensions?: Array<{ key: string; raw?: string }>;
  };
  /** userRequirement（补充指标/维度） */
  userRequirement?: {
    metrics?: string[];
    dimensions?: string[];
  };
  /** 可用的报表工具能力列表 */
  capabilities: ReportToolCapability[];
  /** MCP 服务器配置（用于实际调用工具） */
  servers: McpServerConfig[];
  /** 时间范围 */
  timeRange?: { start: string; end: string };
  /** 过滤条件 */
  filters?: Record<string, string[]>;
  /** 已编译的报表基础入参（项目、用户作用域等） */
  baseInput?: Record<string, unknown>;
  /** 关联的 ServiceType */
  serviceType: ServiceType;
  /** 执行超时（ms），默认 30000 */
  timeoutMs?: number;
}

type MultiQueryResolvedFilters = {
  mediaId?: string[];
  osTypes?: string[];
  terminalOs?: string[];
  teamIds?: string[];
  appPackageType?: string[];
  accountId?: string[];
  pkgId?: string[];
  optimizerIds?: string[];
  dynamicFilters?: Record<string, string[]>;
};

// ─── Orchestrator Output ─────────────────────────────────

export interface MultiToolOrchestratorOutput {
  /** 是否成功（至少一个工具执行成功） */
  ok: boolean;
  /** 查询拆解结果 */
  decomposition: QueryDecomposition;
  /** 联邦查询结果 */
  federatedResult: FederatedQueryResult;
  /** 多查询上下文（用于 trace） */
  context: MultiQueryContext;
}

// ─── Sub-Query Execution ─────────────────────────────────

/**
 * 执行单个子查询。
 * 将 SubQuery 转换为 MCP 工具调用参数，调用 callMcpTool。
 */
async function executeSubQuery(
  subQuery: SubQuery,
  servers: McpServerConfig[],
  timeoutMs: number,
  params: {
    message: string;
    capabilities: ReportToolCapability[];
    baseInput?: Record<string, unknown>;
    resolvedFilters?: MultiQueryResolvedFilters;
  },
): Promise<SubQueryResult> {
  const startTime = Date.now();

  // 找到对应的 MCP 服务器
  const server = servers.find(s => s.id === subQuery.serverName || s.name === subQuery.serverName);
  if (!server) {
    return {
      subQueryId: subQuery.subQueryId,
      toolName: subQuery.toolName,
      serverName: subQuery.serverName,
      ok: false,
      errorMessage: `Server "${subQuery.serverName}" not found`,
      columns: [],
      rows: [],
      latencyMs: Date.now() - startTime,
    };
  }

  // 找到对应的工具
  const tool = server.tools.find(t => t.name === subQuery.toolName);
  if (!tool) {
    return {
      subQueryId: subQuery.subQueryId,
      toolName: subQuery.toolName,
      serverName: subQuery.serverName,
      ok: false,
      errorMessage: `Tool "${subQuery.toolName}" not found in server "${subQuery.serverName}"`,
      columns: [],
      rows: [],
      latencyMs: Date.now() - startTime,
    };
  }

  // 构建 MCP 调用参数
  const capability = params.capabilities.find(item => item.capability_id === subQuery.capabilityId);
  const args = toolArgsOrThrow(buildMcpToolArgs(subQuery, tool, {
    message: params.message,
    capability,
    baseInput: params.baseInput,
    resolvedFilters: params.resolvedFilters,
  }));

  try {
    const result = await callMcpTool(
      {
        endpoint_url: server.endpoint_url,
        transport: server.transport,
        auth_type: server.auth_type,
        auth_config: { ...(server.auth_config || {}) },
      },
      subQuery.toolName,
      args,
      {
        timeout_ms: timeoutMs,
      },
    );

    if (!result.ok) {
      return {
        subQueryId: subQuery.subQueryId,
        toolName: subQuery.toolName,
        serverName: subQuery.serverName,
        ok: false,
        errorMessage: result.msg || 'MCP tool call failed',
        columns: [],
        rows: [],
        latencyMs: Date.now() - startTime,
        rawResult: result.result,
      };
    }

    // 解析 MCP 结果为 Column[] + Row[]
    const { columns, rows } = parseMcpResult(result.result, subQuery);

    return {
      subQueryId: subQuery.subQueryId,
      toolName: subQuery.toolName,
      serverName: subQuery.serverName,
      ok: true,
      columns,
      rows,
      latencyMs: Date.now() - startTime,
      rawResult: result.result,
    };
  } catch (error) {
    const diagnosticError = error as { diagnostics?: unknown };
    return {
      subQueryId: subQuery.subQueryId,
      toolName: subQuery.toolName,
      serverName: subQuery.serverName,
      ok: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      columns: [],
      rows: [],
      latencyMs: Date.now() - startTime,
      rawResult: diagnosticError.diagnostics,
    };
  }
}

// ─── Build MCP Tool Args ─────────────────────────────────

/**
 * 将 SubQuery 转换为 MCP 工具的调用参数。
 */
export function buildMcpToolArgs(
  subQuery: SubQuery,
  tool?: McpToolConfig,
  options?: {
    message?: string;
    capability?: ReportToolCapability;
    baseInput?: Record<string, unknown>;
    resolvedFilters?: MultiQueryResolvedFilters;
  },
): { ok: true; args: Record<string, unknown> } | { ok: false; errorMessage: string; diagnostics: Record<string, unknown> } {
  const args: Record<string, unknown> = {};

  // 指标
  if (subQuery.metrics.length > 0) {
    args.metrics = subQuery.metrics;
  }

  // 维度
  if (subQuery.dimensions.length > 0) {
    args.dimensions = subQuery.dimensions;
  }

  // 时间范围
  if (subQuery.timeRange) {
    args.start_date = subQuery.timeRange.start;
    args.end_date = subQuery.timeRange.end;
  }

  // 过滤条件
  if (Object.keys(subQuery.filters).length > 0) {
    args.filters = subQuery.filters;
  }

  // 额外输入
  if (subQuery.extraInputs) {
    Object.assign(args, subQuery.extraInputs);
  }

  const adapted = tool && options?.message
    ? buildReportToolInput(
      tool,
      options.message,
      {
        ...(options.baseInput || {}),
        ...baseInputFromSubQuery(subQuery),
      },
      options.resolvedFilters,
      options.capability,
    )
    : undefined;
  return !adapted
    ? { ok: true, args }
    : adapted.preflight.ok
      ? { ok: true, args: { ...adapted.finalArgs, ...subQuery.extraInputs } }
      : {
        ok: false,
        errorMessage: `Tool argument preflight failed: ${adapted.preflight.status}`,
        diagnostics: {
          finalArgKeys: adapted.finalArgKeys,
          missingRequiredKeysBeforeCall: adapted.missingRequiredKeysBeforeCall,
          preflight: adapted.preflight,
        },
      };
}

function toolArgsOrThrow(
  result: ReturnType<typeof buildMcpToolArgs>,
): Record<string, unknown> {
  return result.ok ? result.args : raiseToolArgError(result.errorMessage, result.diagnostics);
}

function raiseToolArgError(message: string, diagnostics: Record<string, unknown>): never {
  const error = new Error(message) as Error & { diagnostics?: Record<string, unknown> };
  error.diagnostics = diagnostics;
  throw error;
}

function baseInputFromSubQuery(subQuery: SubQuery): Record<string, unknown> {
  return {
    ...(subQuery.metrics.length ? { metrics: subQuery.metrics } : {}),
    ...(subQuery.dimensions.length ? { dimensions: subQuery.dimensions } : {}),
    ...(subQuery.timeRange ? {
      start_date: subQuery.timeRange.start,
      end_date: subQuery.timeRange.end,
      startDate: subQuery.timeRange.start,
      endDate: subQuery.timeRange.end,
    } : {}),
  };
}

function resolvedFiltersFromInput(filters?: Record<string, string[]>): MultiQueryResolvedFilters | undefined {
  const keys = Object.keys(filters || {});
  const source = filters || {};
  const output: MultiQueryResolvedFilters = { dynamicFilters: filters };
  const read = (...names: string[]) => {
    const values: string[] = [];
    for (const name of names) {
      for (const value of source[name] || []) {
        value ? values.push(value) : undefined;
      }
    }
    return values;
  };
  const mappings: Array<[keyof MultiQueryResolvedFilters, string[]]> = [
    ['mediaId', read('mediaId', 'media_id', 'mediaIds', 'media_ids')],
    ['terminalOs', read('terminalOs', 'terminal_os', 'osType', 'osTypes', 'os_type')],
    ['osTypes', read('terminalOs', 'terminal_os', 'osType', 'osTypes', 'os_type')],
    ['teamIds', read('teamIds', 'team_id', 'teamId', 'team_ids')],
    ['appPackageType', read('appPackageType', 'app_package_type', 'packageType', 'package_type')],
    ['accountId', read('accountId', 'account_id', 'accountIds', 'account_ids')],
    ['pkgId', read('pkgId', 'pkg_id', 'packageId', 'package_id')],
    ['optimizerIds', read('optimizerIds', 'optimizer_id', 'optimizerId', 'optimizer_ids')],
  ];
  for (const [key, values] of mappings) {
    values.length ? (output[key] = values as never) : undefined;
  }
  return keys.length === 0 ? undefined : output;
}

// ─── Parse MCP Result ────────────────────────────────────

/**
 * 解析 MCP 工具返回结果为 Column[] + Row[]。
 *
 * 支持多种常见格式：
 * 1. { columns: [...], rows: [...] } — 标准表格格式
 * 2. { data: [...], fields: [...] } — 常见变体
 * 3. [...] — 纯数组（每行一个对象）
 */
function parseMcpResult(
  rawResult: unknown,
  subQuery: SubQuery,
): { columns: Column[]; rows: Row[] } {
  if (!rawResult || typeof rawResult !== 'object') {
    return { columns: [], rows: [] };
  }

  const result = rawResult as Record<string, unknown>;

  // 尝试标准表格格式
  if (Array.isArray(result.rows) && Array.isArray(result.columns)) {
    return parseStandardTableFormat(result, subQuery);
  }

  // 尝试 data + fields 格式
  if (Array.isArray(result.data) && Array.isArray(result.fields)) {
    return parseFieldsDataFormat(result, subQuery);
  }

  // 尝试纯数组格式
  if (Array.isArray(rawResult) && rawResult.length > 0 && typeof rawResult[0] === 'object') {
    return parseArrayFormat(rawResult as Record<string, unknown>[], subQuery);
  }

  // 尝试 result.data 数组
  if (Array.isArray(result.data) && result.data.length > 0 && typeof result.data[0] === 'object') {
    return parseArrayFormat(result.data as Record<string, unknown>[], subQuery);
  }

  return { columns: [], rows: [] };
}

function parseStandardTableFormat(
  result: Record<string, unknown>,
  subQuery: SubQuery,
): { columns: Column[]; rows: Row[] } {
  const rawColumns = result.columns as Array<Record<string, unknown>>;
  const rawRows = result.rows as Array<Record<string, unknown>>;

  const columns: Column[] = rawColumns.map(col => ({
    key: String(col.key || col.name || ''),
    displayName: String(col.displayName || col.label || col.key || col.name || ''),
    type: inferColumnType(String(col.key || col.name || ''), subQuery),
    sourceSubQueryId: subQuery.subQueryId,
    sourceTool: subQuery.toolName,
    metric: inferMetricFromKey(String(col.key || col.name || ''), subQuery),
    dimension: inferDimensionFromKey(String(col.key || col.name || ''), subQuery),
  }));

  return { columns, rows: rawRows };
}

function parseFieldsDataFormat(
  result: Record<string, unknown>,
  subQuery: SubQuery,
): { columns: Column[]; rows: Row[] } {
  const fields = result.fields as string[];
  const data = result.data as Array<Record<string, unknown>>;

  const columns: Column[] = fields.map(field => ({
    key: field,
    displayName: field,
    type: inferColumnType(field, subQuery),
    sourceSubQueryId: subQuery.subQueryId,
    sourceTool: subQuery.toolName,
    metric: inferMetricFromKey(field, subQuery),
    dimension: inferDimensionFromKey(field, subQuery),
  }));

  return { columns, rows: data };
}

function parseArrayFormat(
  data: Array<Record<string, unknown>>,
  subQuery: SubQuery,
): { columns: Column[]; rows: Row[] } {
  if (data.length === 0) return { columns: [], rows: [] };

  const keys = Object.keys(data[0]);
  const columns: Column[] = keys.map(key => ({
    key,
    displayName: key,
    type: inferColumnType(key, subQuery),
    sourceSubQueryId: subQuery.subQueryId,
    sourceTool: subQuery.toolName,
    metric: inferMetricFromKey(key, subQuery),
    dimension: inferDimensionFromKey(key, subQuery),
  }));

  return { columns, rows: data };
}

// ─── Column Type Inference ───────────────────────────────

function inferColumnType(
  key: string,
  subQuery: SubQuery,
): 'dimension' | 'metric' {
  if (subQuery.dimensions.includes(key)) return 'dimension';
  if (subQuery.metrics.includes(key)) return 'metric';

  // 常见维度 key 模式
  const dimPatterns = ['date', 'day', 'media', 'channel', 'project', 'app', 'terminal', 'platform'];
  if (dimPatterns.some(p => key.toLowerCase().includes(p))) return 'dimension';

  // 默认视为指标
  return 'metric';
}

function inferMetricFromKey(key: string, subQuery: SubQuery): string | undefined {
  if (subQuery.metrics.includes(key)) return key;
  return undefined;
}

function inferDimensionFromKey(key: string, subQuery: SubQuery): string | undefined {
  if (subQuery.dimensions.includes(key)) return key;
  return undefined;
}

// ─── Main Orchestrator ───────────────────────────────────

/**
 * 执行多工具编排。
 * 串联：拆解 → 执行 → 归一化 → 合并
 */
export async function executeMultiToolOrchestration(
  input: MultiToolOrchestratorInput,
): Promise<MultiToolOrchestratorOutput> {
  const startedAt = new Date().toISOString();
  const timeoutMs = input.timeoutMs ?? 30000;

  // 1. 提取指标和维度
  const { metrics, dimensions } = extractMetricsAndDimensions(
    input.semanticFrame,
    input.userRequirement,
  );

  // 如果没有需要编排的指标/维度，返回空结果
  if (metrics.length === 0 && dimensions.length === 0) {
    const emptyDecomposition: QueryDecomposition = {
      originalQuery: input.message,
      requiredDimensions: [],
      requiredMetrics: [],
      subQueries: [],
      confidence: 0,
      reason: 'No metrics or dimensions identified',
      decompositionLatencyMs: 0,
    };
    const emptyResult: FederatedQueryResult = {
      columns: [],
      rows: [],
      sourceTrace: {},
      subQueryResults: [],
      joinKeys: [],
      totalRows: 0,
      totalColumns: 0,
      joinLatencyMs: 0,
      totalLatencyMs: 0,
      hasPartialFailure: false,
      missingDataNotes: [],
    };
    return {
      ok: true,
      decomposition: emptyDecomposition,
      federatedResult: emptyResult,
      context: {
        originalMessage: input.message,
        decomposition: emptyDecomposition,
        toolSelection: { selectedCapabilities: [], uncoveredMetrics: [], uncoveredDimensions: [], reason: '' },
        federatedResult: emptyResult,
        serviceType: input.serviceType,
        startedAt,
      },
    };
  }

  // 2. 查询拆解
  const decomposition = decomposeQuery({
    originalQuery: input.message,
    metrics,
    dimensions,
    capabilities: input.capabilities,
    filters: input.filters,
    timeRange: input.timeRange,
  });

  // 如果没有拆解出子查询，返回空结果
  if (decomposition.subQueries.length === 0) {
    const emptyResult: FederatedQueryResult = {
      columns: [],
      rows: [],
      sourceTrace: {},
      subQueryResults: [],
      joinKeys: dimensions,
      totalRows: 0,
      totalColumns: 0,
      joinLatencyMs: 0,
      totalLatencyMs: Date.now() - new Date(startedAt).getTime(),
      hasPartialFailure: false,
      missingDataNotes: ['No sub-queries could be decomposed — no tool covers the requested metrics with the required dimensions'],
    };
    return {
      ok: false,
      decomposition,
      federatedResult: emptyResult,
      context: {
        originalMessage: input.message,
        decomposition,
        toolSelection: { selectedCapabilities: [], uncoveredMetrics: metrics, uncoveredDimensions: [], reason: decomposition.reason },
        federatedResult: emptyResult,
        serviceType: input.serviceType,
        startedAt,
      },
    };
  }

  // 3. 并行执行所有子查询
  const resolvedFilters = resolvedFiltersFromInput(input.filters);
  const executionPromises = decomposition.subQueries.map(
    sq => executeSubQuery(sq, input.servers, timeoutMs, {
      message: input.message,
      capabilities: input.capabilities,
      baseInput: input.baseInput,
      resolvedFilters,
    }),
  );
  const subQueryResults = await Promise.all(executionPromises);

  // 4. 分类成功/失败结果
  const successfulResults = subQueryResults.filter(r => r.ok);
  const failedResults = subQueryResults.filter(r => !r.ok);

  // 5. 归一化成功的结果
  const normalizedResults = normalizeAllSubQueryResults(
    successfulResults,
    dimensions,
  );

  // 6. 合并结果
  const federatedResult = mergeSubQueryResults({
    successfulResults: normalizedResults,
    failedResults,
    joinKeys: dimensions,
    startedAt,
  });

  // 7. 丰富 subQueryResults 中的 serverName
  for (const sqr of federatedResult.subQueryResults) {
    const sq = decomposition.subQueries.find(s => s.subQueryId === sqr.subQueryId);
    if (sq) {
      sqr.serverName = sq.serverName;
    }
  }

  return {
    ok: successfulResults.length > 0,
    decomposition,
    federatedResult,
    context: {
      originalMessage: input.message,
      decomposition,
      toolSelection: {
        selectedCapabilities: decomposition.subQueries.map(sq => ({
          capabilityId: sq.capabilityId ?? '',
          toolName: sq.toolName,
          serverName: sq.serverName,
          assignedMetrics: sq.metrics,
          supportedDimensions: sq.dimensions,
          reason: 'decomposed',
          confidence: decomposition.confidence,
        })),
        uncoveredMetrics: metrics.filter(
          m => !decomposition.subQueries.some(sq => sq.metrics.includes(m)),
        ),
        uncoveredDimensions: [],
        reason: decomposition.reason,
      },
      federatedResult,
      serviceType: input.serviceType,
      startedAt,
    },
  };
}
