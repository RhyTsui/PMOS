/**
 * Multi-Query Stage — 多工具编排 / 拼表 Pipeline Stage
 *
 * 当用户查询需要跨多个 MCP 工具取数并合并结果时执行。
 * 典型场景：用户要求同时查看消耗、ROI、次留等跨域指标。
 *
 * 进入条件：
 * 1. isReportQuery = true（属于报表查询场景）
 * 2. 用户需要多个指标，且这些指标分布在不同 domain 的工具中
 * 3. 当前有至少 2 个可选工具
 *
 * 流程：
 * 1. 从 userRequirement 提取指标和维度
 * 2. 调用 multi-tool-orchestrator 执行联邦查询
 * 3. 将结果转换为 markdown 表格 + 结构化数据
 * 4. 通过 SSE 推送结果
 */

import type { StreamIO, ChatPipelineContext, ChatPipelineResult } from './pipeline-types';
import { createRuntimeState } from '@/lib/chat-runtime/runtime-state';
import { buildReportQueryInput } from '@/lib/chat-runtime/report-query-input';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { buildResponseContract } from '@/lib/response-contract';
import { buildTraceUrl } from '@/lib/trace';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import { emitChatMessageTrace } from '@/app/api/chat/chat-trace';
import { recordEvidence } from '@/lib/evidence-ledger';
import { executeMultiToolOrchestration } from '@/lib/multi-tool-orchestrator';
import { buildReportCapabilityManifest, type ReportToolCapability } from '@/lib/report-capability-manifest';
import {
  canonicalDimensionKey,
  extractDimensionKeysFromText,
  extractMetricKeysFromText,
  resolveMetricKey,
  resolveDimensionKey,
} from '@/lib/query-decomposer';
import { transitionCaseFrameStage, addEvidenceRef, addDeliverable } from '@/lib/case-frame-helpers';
import { getReportMetricDomain } from '@/contracts/business-semantics/metric-catalog';
import type { FederatedQueryResult } from '@/contracts/multi-query';
import type { QueryDecomposition } from '@/contracts/multi-query';
import type { McpServerConfig } from '@/types';
import type { ServiceType } from '@/contracts/service-catalog';
import type { UserRequirementContract } from '@/contracts/request-understanding/user-requirement-contract';

// ─── Extract Metrics/Dimensions from UserRequirement ────

function extractFromUserRequirement(req: UserRequirementContract | undefined, message = ''): {
  metrics: string[];
  dimensions: string[];
} {
  const metrics = new Set<string>();
  const dimensions = new Set<string>();

  // metrics: string[]
  for (const m of req?.metrics ?? []) {
    const resolved = resolveMetricKey(m);
    if (resolved) metrics.add(resolved);
  }

  // dimensions: RequirementDimension[] → extract key
  for (const d of req?.dimensions ?? []) {
    if (typeof d === 'string') {
      dimensions.add(resolveDimensionKey(d));
    } else if (d && typeof d === 'object' && 'key' in d) {
      dimensions.add(resolveDimensionKey(d.key));
    }
  }

  // dataRequirement may also have metrics/dimensions
  if (req?.dataRequirement) {
    for (const m of req.dataRequirement.requiredMetrics ?? []) {
      const resolved = resolveMetricKey(m);
      if (resolved) metrics.add(resolved);
    }
    for (const d of req.dataRequirement.requiredDimensions ?? []) {
      dimensions.add(resolveDimensionKey(d));
    }
  }
  for (const metric of extractMetricKeysFromText(message)) {
    metrics.add(metric);
  }
  for (const dimension of extractDimensionKeysFromText(message)) {
    dimensions.add(dimension);
  }

  return {
    metrics: Array.from(metrics),
    dimensions: Array.from(dimensions),
  };
}

// ─── Stage Entry Check ─────────────────────────────────

/**
 * 判断是否应进入多工具编排 stage。
 *
 * 进入条件：
 * 1. 是报表查询场景
 * 2. 用户需要多个指标或多个维度
 * 3. **没有任何单个工具能满足完整需求**（关键修正）
 *
 * 核心逻辑：
 * - 检查是否存在一个工具能同时覆盖所有请求的指标和维度
 * - 如果有这样的工具 → 不需要 multi-query，走 report-query
 * - 如果没有这样的工具 → 需要 multi-query 拼表
 */
export function shouldEnterMultiQueryStage(
  ctx: ChatPipelineContext,
  servers: McpServerConfig[],
): boolean {
  // 必须是报表查询
  if (!ctx.isReportQuery) return false;

  // 提取指标和维度
  const { metrics, dimensions } = extractFromUserRequirement(ctx.userRequirement, ctx.message || ctx.question || '');

  // 单指标 + 筛选维度应走普通问数；只有多指标或多输出维度才有拼表价值。
  if (metrics.length < 2 && dimensions.length < 2) return false;

  // 检查是否有单个工具能满足完整需求
  const capabilities = buildReportCapabilityManifest(servers);
  const completeTool = capabilities.tools.find(tool => {
    const supportedDimensions = new Set(tool.supported_dimensions.map(canonicalDimensionKey));
    const reportDomains = new Set(tool.report_domains);
    // 检查工具是否支持所有请求的维度
    const supportsAllDimensions = dimensions.every(dim =>
      supportedDimensions.has(canonicalDimensionKey(dim))
    );

    // 检查工具是否支持所有请求的指标
    const supportsAllMetrics = metrics.every(metric => {
      const domain = getReportMetricDomain(metric);
      return Boolean(domain && reportDomains.has(domain as any));
    });

    return supportsAllDimensions && supportsAllMetrics;
  });

  // 如果有单个工具能满足完整需求，不需要 multi-query
  if (completeTool) {
    return false;
  }

  // 没有单个工具能满足完整需求，需要 multi-query
  return true;
}

// ─── Main Stage Function ───────────────────────────────

export async function executeMultiQueryStage(
  ctx: ChatPipelineContext,
  io: StreamIO,
): Promise<ChatPipelineResult> {
  const {
    question,
    conversationId,
    traceId,
    startedAt,
    message,
    promptConfigMetadata,
    compiledContext,
    semanticFrame,
    userRequirement,
    routeServers,
    userScopeKey,
    caseFrame,
  } = ctx;

  const servers = (routeServers ?? []) as McpServerConfig[];

  // ─── CaseFrame 状态更新：进入执行阶段 ───
  if (caseFrame) {
    await transitionCaseFrameStage(userScopeKey, caseFrame, 'executing', {
      stage_label: '多工具编排执行',
      started_at: new Date().toISOString(),
    });
  }

  io.push({ type: 'route', intent: 'multi_query', hasThinking: false, tools_used: [] });
  io.pushRuntimeState('data_fetching', ['understanding', 'context_loading']);

  io.pushEvent(createProcessEvent({
    type: 'stage.started',
    label: '多工具编排',
    summary: '正在拆解查询并分配给多个工具...',
    status: 'running',
    intent_type: 'multi_query',
    agent: 'multi_query',
  }));

  // 提取指标和维度
  const { metrics, dimensions } = extractFromUserRequirement(userRequirement, message);

  // 构建适配 orchestrator 输入的 semanticFrame shape
  const orchSemanticFrame = {
    resolvedMetrics: metrics.map(m => ({ key: m })),
    resolvedDimensions: dimensions.map(d => ({ key: d })),
  };

  // 构建适配 orchestrator 输入的 userRequirement shape
  const orchUserRequirement = {
    metrics,
    dimensions,
    query: message,
  };

  // 构建 capability manifest
  const capabilityManifest = buildReportCapabilityManifest(servers);

  // 执行多工具编排
  const orchestrationResult = await executeMultiToolOrchestration({
    message,
    semanticFrame: orchSemanticFrame,
    userRequirement: orchUserRequirement,
    capabilities: capabilityManifest.tools,
    servers,
    baseInput: buildReportQueryInput(message, compiledContext, userScopeKey),
    serviceType: 'join_table_report' as ServiceType,
    timeRange: extractTimeRange(userRequirement),
    filters: extractFilters(userRequirement),
  });

  const { decomposition, federatedResult } = orchestrationResult;

  // 记录 process events
  io.pushEvent(createProcessEvent({
    type: 'stage.ended',
    label: '查询拆解',
    summary: `拆解为 ${decomposition.subQueries.length} 个子查询`,
    status: 'success',
    intent_type: 'multi_query',
    agent: 'multi_query',
  }));

  if (decomposition.subQueries.length === 0 || !orchestrationResult.ok) {
    io.pushEvent(createProcessEvent({
      type: 'stage.ended',
      label: '多工具编排未覆盖',
      summary: decomposition.subQueries.length === 0
        ? '当前多工具编排没有拆解出可执行子查询，继续尝试常规报表查询。'
        : '当前多工具编排没有获得成功的工具结果，继续尝试常规报表查询。',
      status: 'waiting',
      intent_type: 'multi_query',
      agent: 'multi_query',
      output: {
        sub_query_count: decomposition.subQueries.length,
        total_rows: federatedResult.totalRows,
        has_partial_failure: federatedResult.hasPartialFailure,
        missing_data_notes: federatedResult.missingDataNotes,
      },
    }));
    return {
      terminal: false,
      intentType: 'multi_query',
      metadata: {
        multi_query_fallback: {
          reason: decomposition.subQueries.length === 0
            ? 'no_executable_sub_queries'
            : 'no_successful_sub_query_results',
          sub_query_count: decomposition.subQueries.length,
          total_rows: federatedResult.totalRows,
        },
      },
    };
  }

  // 记录证据
  const updatedLedger = recordEvidence(io.getEvidenceLedger(), {
    stage: 'multi_query',
    source: 'tool_result',
    sourceId: 'multi_query_orchestration',
    confidence: decomposition.confidence > 0.7 ? 'high_probability' : 'unverified',
    content: {
      original_query: message,
      sub_query_count: decomposition.subQueries.length,
      total_rows: federatedResult.totalRows,
      has_partial_failure: federatedResult.hasPartialFailure,
    },
  });
  io.setEvidenceLedger(updatedLedger);
  const latestEvidenceId = updatedLedger.entries[updatedLedger.entries.length - 1]?.id;

  // ─── CaseFrame 证据引用 ───
  if (caseFrame && latestEvidenceId) {
    await addEvidenceRef(userScopeKey, caseFrame, latestEvidenceId);
  }

  io.pushEvent(createProcessEvent({
    type: 'mcp.tool_result',
    label: '多工具编排结果',
    summary: `联邦查询返回 ${federatedResult.totalRows} 行数据。`,
    status: orchestrationResult.ok ? 'success' : 'waiting',
    intent_type: 'multi_query',
    agent: 'multi_query',
    tool_name: 'multi_query_orchestration',
    source_refs: [{
      id: 'tool:multi_query_orchestration',
      title: 'multi_query_orchestration',
      source: 'multi_query_orchestration',
      source_type: 'report_mcp',
      icon: 'report_mcp',
      status: orchestrationResult.ok ? 'success' : 'waiting',
    }],
    output: {
      evidence_ref: latestEvidenceId,
      sub_query_count: decomposition.subQueries.length,
      total_rows: federatedResult.totalRows,
      total_columns: federatedResult.totalColumns,
      has_partial_failure: federatedResult.hasPartialFailure,
    },
  }));

  // 生成 markdown 表格
  const markdownTable = federatedResultToMarkdown(federatedResult);
  const answer = buildMultiQueryAnswer(message, decomposition, federatedResult, markdownTable);

  // 记录每个工具的执行结果
  for (const sqr of federatedResult.subQueryResults) {
    const sourceId = `tool:${sqr.serverName || sqr.toolName}.${sqr.toolName}`.replace(/[^a-zA-Z0-9:_./-]+/g, '_');
    io.pushEvent(createProcessEvent({
      type: sqr.ok ? 'mcp.tool_result' : 'mcp.tool_error',
      label: sqr.ok ? `${sqr.toolName} 完成` : `${sqr.toolName} 失败`,
      summary: sqr.ok
        ? `返回 ${sqr.rows.length} 行数据`
        : `错误: ${sqr.errorMessage ?? 'unknown'}`,
      status: sqr.ok ? 'success' : 'error',
      intent_type: 'multi_query',
      agent: 'multi_query',
      tool_name: sqr.toolName,
      source_refs: [{
        id: sourceId,
        title: sqr.toolName,
        source: sqr.serverName ? `${sqr.serverName}.${sqr.toolName}` : sqr.toolName,
        source_type: 'report_mcp',
        icon: 'report_mcp',
        status: sqr.ok ? 'success' : 'error',
      }],
      output: {
        sub_query_id: sqr.subQueryId,
        row_count: sqr.rows.length,
        column_count: sqr.columns.length,
        error_message: sqr.errorMessage,
      },
    }));
  }

  // Emit trace
  const traceConfig = getTraceConfigSync();
  if (traceConfig.enabled) {
    await emitChatMessageTrace({
      traceId,
      message,
      conversationId,
      threadId: conversationId,
      messageId: traceId,
      turnId: traceId,
      intentType: 'multi_query',
      status: orchestrationResult.ok ? 'success' : 'failed',
    });
  }

  // Build response
  const responseContract = buildResponseContract({
    status: orchestrationResult.ok ? 'success' : 'partial_failure',
    intentType: 'multi_query',
    traceId,
    answer,
    processEvents: io.getProcessEvents(),
    metadata: {
      evidence_refs: latestEvidenceId ? [latestEvidenceId] : [],
      decomposition: {
        sub_query_count: decomposition.subQueries.length,
        required_metrics: decomposition.requiredMetrics,
        required_dimensions: decomposition.requiredDimensions,
      },
      federated_result: {
        total_rows: federatedResult.totalRows,
        total_columns: federatedResult.totalColumns,
        join_keys: federatedResult.joinKeys,
        has_partial_failure: federatedResult.hasPartialFailure,
      },
    },
  });

  // Push done
  const finalRuntimeState = createRuntimeState(
    startedAt,
    'completed',
    ['understanding', 'context_loading', 'data_fetching', 'analysis', 'response_generation'],
    'completed',
  );

  io.push({
    type: 'done',
    result: {
      answer,
      response_contract: responseContract,
    },
    metadata: {
      process_events: io.getProcessEvents(),
      prompt_config: promptConfigMetadata,
      runtime_state: finalRuntimeState,
      response_contract: responseContract,
      trace_meta: traceConfig.enabled ? { trace_url: buildTraceUrl(traceId) } : undefined,
      thread_id: conversationId,
      message_id: traceId,
      turn_id: traceId,
    },
  });
  io.close();

  // ─── CaseFrame 状态更新：执行完成 ───
  if (caseFrame) {
    await transitionCaseFrameStage(userScopeKey, caseFrame, 'resolved', {
      completed_at: new Date().toISOString(),
      status: orchestrationResult.ok ? 'success' : 'partial_failure',
      sub_query_count: decomposition.subQueries.length,
    });

    // 添加产物到 CaseFrame
    if (orchestrationResult.ok) {
      await addDeliverable(userScopeKey, caseFrame, {
        type: 'multi_query_result',
        id: `mq-${traceId}`,
        summary: `联邦查询完成：${decomposition.subQueries.length} 个子查询，${federatedResult.totalRows} 行结果`,
      });
    }
  }

  return {
    terminal: true,
    content: answer,
    finalRuntimeState,
  };
}

// ─── Markdown Table Generation ─────────────────────────

/**
 * 将 FederatedQueryResult 转换为 markdown 表格。
 */
function federatedResultToMarkdown(result: FederatedQueryResult): string {
  if (result.columns.length === 0 || result.rows.length === 0) {
    return '> 当前候选工具还不能直接完成这次查询，未获得可展示的数据结果。';
  }

  const header = '| ' + result.columns.map(c => c.displayName).join(' | ') + ' |';
  const separator = '| ' + result.columns.map(() => '---').join(' | ') + ' |';
  const rows = result.rows.map(row =>
    '| ' + result.columns.map(c => formatCellValue(row[c.key])).join(' | ') + ' |',
  );

  return [header, separator, ...rows].join('\n');
}

function formatCellValue(value: unknown): string {
  return value === null || value === undefined
    ? '-'
    : typeof value === 'number'
      ? Number.isInteger(value) ? String(value) : value.toFixed(2)
      : String(value);
}

// ─── Answer Builder ────────────────────────────────────

function buildMultiQueryAnswer(
  message: string,
  decomposition: QueryDecomposition,
  federatedResult: FederatedQueryResult,
  markdownTable: string,
): string {
  const parts: string[] = [];

  parts.push(`## 查询结果`);
  parts.push('');
  parts.push(`**查询**: ${message}`);
  parts.push('');

  // 工具说明
  if (decomposition.subQueries.length > 1) {
    parts.push(`**数据来源**: 已合并 ${decomposition.subQueries.length} 类报表数据`);
    const toolSummary = decomposition.subQueries.map(sq =>
      `- ${sq.metrics.join(', ')}`,
    );
    parts.push(toolSummary.join('\n'));
    parts.push('');
  }

  // 数据表格
  parts.push(markdownTable);
  parts.push('');

  // 统计信息
  parts.push(`共 ${federatedResult.totalRows} 行 × ${federatedResult.totalColumns} 列`);

  // 部分失败提示
  if (federatedResult.hasPartialFailure) {
    parts.push('');
    parts.push('> 部分数据暂未返回，缺失位置已留空。');
    if (federatedResult.missingDataNotes.length > 0) {
      parts.push('>');
      for (const note of federatedResult.missingDataNotes.slice(0, 3)) {
        parts.push(`> - ${note}`);
      }
    }
  }

  return parts.join('\n');
}

// ─── Helper Functions ──────────────────────────────────

function extractTimeRange(
  userRequirement?: UserRequirementContract,
): { start: string; end: string } | undefined {
  if (!userRequirement?.dateRange) return undefined;
  const dr = userRequirement.dateRange;
  if (dr.type === 'absolute' && dr.value) {
    // value 可能是 "2026-01-01~2026-01-31" 格式
    const parts = dr.value.split('~');
    if (parts.length === 2) {
      return { start: parts[0].trim(), end: parts[1].trim() };
    }
  }
  return undefined;
}

function extractFilters(
  userRequirement?: UserRequirementContract,
): Record<string, string[]> | undefined {
  if (!userRequirement?.filters) return undefined;
  if (Object.keys(userRequirement.filters).length === 0) return undefined;
  return userRequirement.filters;
}
