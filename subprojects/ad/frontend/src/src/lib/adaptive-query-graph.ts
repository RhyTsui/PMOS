/**
 * 自适应推理图
 *
 * 扩展 multi-query-stage 支持中间结果驱动的动态子查询生成。
 * 当子查询结果异常时，自动生成补充子查询（如跨媒体对比）。
 * 最多扩展 1 层，防止无限查询。
 */

import type { QueryDecomposition, FederatedQueryResult, SubQuery } from '@/contracts/multi-query';

// ─── 类型定义 ──────────────────────────────────────────────

export interface ExpansionTrigger {
  /** 异常子查询 ID */
  abnormalSubQueryId: string;
  /** 异常类型 */
  anomalyType: 'empty_result' | 'low_confidence' | 'data_mismatch' | 'partial_failure';
  /** 异常描述 */
  description: string;
}

export interface ExpandedSubQuery {
  /** 原始子查询 ID */
  originalSubQueryId: string;
  /** 扩展原因 */
  expansionReason: string;
  /** 新生成的子查询 */
  newSubQuery: SubQuery;
}

export interface AdaptiveGraphResult {
  /** 是否发生了扩展 */
  expanded: boolean;
  /** 扩展的子查询列表 */
  expansions: ExpandedSubQuery[];
  /** 扩展层级（最多 1 层） */
  expansionDepth: number;
  /** 扩展原因汇总（写入 trace） */
  expansionReasons: string[];
}

// ─── 异常检测 ──────────────────────────────────────────────

/**
 * 检测子查询结果是否异常
 */
export function detectAnomalies(
  decomposition: QueryDecomposition,
  federatedResult: FederatedQueryResult,
): ExpansionTrigger[] {
  const triggers: ExpansionTrigger[] = [];
  const subQueryResults = new Map(
    federatedResult.subQueryResults.map((r) => [r.subQueryId, r]),
  );

  for (const subQuery of decomposition.subQueries) {
    const result = subQueryResults.get(subQuery.subQueryId);
    if (!result) {
      triggers.push({
        abnormalSubQueryId: subQuery.subQueryId,
        anomalyType: 'empty_result',
        description: `子查询 ${subQuery.subQueryId} 无返回结果`,
      });
      continue;
    }

    // 空结果
    if (!result.ok || (result.rows && result.rows.length === 0)) {
      triggers.push({
        abnormalSubQueryId: subQuery.subQueryId,
        anomalyType: 'empty_result',
        description: `子查询 ${subQuery.subQueryId} 返回空结果`,
      });
      continue;
    }

    // 低置信度
    if (result.confidence && result.confidence < 0.5) {
      triggers.push({
        abnormalSubQueryId: subQuery.subQueryId,
        anomalyType: 'low_confidence',
        description: `子查询 ${subQuery.subQueryId} 置信度过低 (${result.confidence})`,
      });
    }

    // 部分失败
    if (federatedResult.hasPartialFailure && !result.ok) {
      triggers.push({
        abnormalSubQueryId: subQuery.subQueryId,
        anomalyType: 'partial_failure',
        description: `子查询 ${subQuery.subQueryId} 执行失败`,
      });
    }
  }

  return triggers;
}

// ─── 动态扩展 ──────────────────────────────────────────────

/**
 * 基于异常触发器生成扩展子查询
 */
export function generateExpansions(
  triggers: ExpansionTrigger[],
  originalDecomposition: QueryDecomposition,
): ExpandedSubQuery[] {
  const expansions: ExpandedSubQuery[] = [];

  for (const trigger of triggers) {
    const originalSubQuery = originalDecomposition.subQueries.find(
      (sq) => sq.subQueryId === trigger.abnormalSubQueryId,
    );
    if (!originalSubQuery) continue;

    // 基于异常类型生成补充查询
    let newSubQuery: SubQuery | null = null;
    let reason = '';

    switch (trigger.anomalyType) {
      case 'empty_result':
        // 放宽时间范围或维度重新查询
        reason = `子查询 ${trigger.abnormalSubQueryId} 无结果，放宽条件重试`;
        newSubQuery = {
          subQueryId: `${trigger.abnormalSubQueryId}_expanded`,
          toolName: originalSubQuery.toolName,
          serverName: originalSubQuery.serverName,
          query: `(扩展) ${originalSubQuery.query || ''}`,
          metrics: originalSubQuery.metrics,
          dimensions: originalSubQuery.dimensions,
          filters: {
            ...originalSubQuery.filters,
          },
        };
        break;

      case 'low_confidence':
        // 增加对比维度（如跨媒体对比）
        reason = `子查询 ${trigger.abnormalSubQueryId} 置信度低，增加跨媒体对比`;
        newSubQuery = {
          subQueryId: `${trigger.abnormalSubQueryId}_cross_media`,
          toolName: originalSubQuery.toolName,
          serverName: originalSubQuery.serverName,
          query: `(跨媒体对比) ${originalSubQuery.query || ''}`,
          metrics: originalSubQuery.metrics,
          dimensions: ['media', ...(originalSubQuery.dimensions || [])],
          filters: originalSubQuery.filters,
        };
        break;

      case 'partial_failure':
        // 简化查询重试
        reason = `子查询 ${trigger.abnormalSubQueryId} 失败，简化查询重试`;
        newSubQuery = {
          subQueryId: `${trigger.abnormalSubQueryId}_simplified`,
          toolName: originalSubQuery.toolName,
          serverName: originalSubQuery.serverName,
          query: `(简化) ${originalSubQuery.query || ''}`,
          metrics: originalSubQuery.metrics?.slice(0, 3) || [], // 只保留前 3 个指标
          dimensions: [],
          filters: originalSubQuery.filters,
        };
        break;

      default:
        break;
    }

    if (newSubQuery) {
      expansions.push({
        originalSubQueryId: trigger.abnormalSubQueryId,
        expansionReason: reason,
        newSubQuery,
      });
    }
  }

  return expansions;
}

// ─── 主入口 ──────────────────────────────────────────────

/**
 * 执行自适应推理图扩展
 * 最多扩展 1 层，防止无限查询。
 */
export function executeAdaptiveGraphExpansion(input: {
  decomposition: QueryDecomposition;
  federatedResult: FederatedQueryResult;
  /** 当前扩展层级（调用方维护，初始为 0） */
  currentDepth: number;
}): AdaptiveGraphResult {
  const { decomposition, federatedResult, currentDepth } = input;

  // 最多扩展 1 层
  if (currentDepth >= 1) {
    return {
      expanded: false,
      expansions: [],
      expansionDepth: currentDepth,
      expansionReasons: ['已达最大扩展层级'],
    };
  }

  // 检测异常
  const triggers = detectAnomalies(decomposition, federatedResult);
  if (triggers.length === 0) {
    return {
      expanded: false,
      expansions: [],
      expansionDepth: currentDepth,
      expansionReasons: [],
    };
  }

  // 生成扩展子查询
  const expansions = generateExpansions(triggers, decomposition);

  return {
    expanded: expansions.length > 0,
    expansions,
    expansionDepth: currentDepth + 1,
    expansionReasons: expansions.map((e) => e.expansionReason),
  };
}
