/**
 * Result Joiner — 结果合并
 *
 * 将多个归一化后的子查询结果按共同维度做 FULL JOIN。
 *
 * Join 策略：
 * - 固定为 FULL JOIN（保留所有维度组合，缺失填空值）
 * - Join key = 所有子查询共享的维度列
 * - 缺失数据填空值（null），不做插值或推断
 *
 * 设计原则：
 * 1. 所有工具已保证支持相同的维度（选择阶段已过滤）
 * 2. 维度已归一化（归一化阶段已处理）
 * 3. 来源可追溯——每列标记来自哪个工具
 */

import type {
  Column,
  FederatedQueryResult,
  NormalizedDataSet,
  Row,
  SubQueryResult,
} from '@/contracts/multi-query';

// ─── Find Common Dimensions ──────────────────────────────

/**
 * 找到所有归一化数据集共享的维度列。
 * 这些列将作为 JOIN KEY。
 */
export function findCommonDimensions(
  datasets: NormalizedDataSet[],
): string[] {
  if (datasets.length === 0) return [];

  // 取第一个数据集的维度列作为基准
  const firstDimKeys = new Set(
    datasets[0].columns
      .filter(c => c.type === 'dimension')
      .map(c => c.key),
  );

  // 与后续数据集取交集
  for (let i = 1; i < datasets.length; i++) {
    const dimKeys = new Set(
      datasets[i].columns
        .filter(c => c.type === 'dimension')
        .map(c => c.key),
    );
    for (const key of firstDimKeys) {
      if (!dimKeys.has(key)) {
        firstDimKeys.delete(key);
      }
    }
  }

  return Array.from(firstDimKeys);
}

// ─── Build Join Key ──────────────────────────────────────

/**
 * 为行数据构建 join key（维度值的复合键）。
 */
function buildJoinKey(row: Row, dimensionKeys: string[]): string {
  return dimensionKeys
    .map(key => String(row[key] ?? '__NULL__'))
    .join('||');
}

// ─── FULL JOIN ───────────────────────────────────────────

/**
 * 对多个归一化数据集做 FULL JOIN。
 *
 * @param datasets 归一化后的数据集
 * @param joinKeys 共同维度键（如果不传，自动推断）
 * @param startedAt 执行开始时间（用于计算耗时）
 */
export function fullJoinResults(
  datasets: NormalizedDataSet[],
  joinKeys?: string[],
  startedAt?: string,
): FederatedQueryResult {
  const joinStartMs = Date.now();
  const effectiveJoinKeys = joinKeys ?? findCommonDimensions(datasets);

  // 1. 构建列定义
  const allColumns: Column[] = [];
  const sourceTrace: Record<string, { tool: string; server: string; subQueryId: string }> = {};

  // 1a. 维度列（来自第一个数据集，所有数据集共享）
  if (datasets.length > 0) {
    for (const col of datasets[0].columns) {
      if (col.type === 'dimension' && effectiveJoinKeys.includes(col.key)) {
        allColumns.push({
          ...col,
          sourceSubQueryId: 'shared',
        });
        sourceTrace[col.key] = {
          tool: 'shared',
          server: 'shared',
          subQueryId: 'shared',
        };
      }
    }
  }

  // 1b. 指标列（来自各数据集）
  for (const ds of datasets) {
    for (const col of ds.columns) {
      if (col.type === 'metric') {
        allColumns.push({
          ...col,
          sourceSubQueryId: ds.subQueryId,
          sourceTool: ds.toolName,
        });
        sourceTrace[col.key] = {
          tool: ds.toolName,
          server: ds.toolName, // server name is in the SubQueryResult
          subQueryId: ds.subQueryId,
        };
      }
    }
  }

  // 2. 为每个数据集构建索引（join key → row）
  const indexes: Map<string, Row>[] = datasets.map(ds => {
    const index = new Map<string, Row>();
    for (const row of ds.rows) {
      const key = buildJoinKey(row, effectiveJoinKeys);
      index.set(key, row);
    }
    return index;
  });

  // 3. 收集所有唯一的 join key（FULL JOIN）
  const allJoinKeys = new Set<string>();
  for (const index of indexes) {
    for (const key of index.keys()) {
      allJoinKeys.add(key);
    }
  }

  // 4. 合并行数据
  const mergedRows: Row[] = [];
  const missingDataNotes: string[] = [];

  for (const joinKey of allJoinKeys) {
    const mergedRow: Row = {};

    // 4a. 填充维度值（从任何有该 key 的数据集取）
    for (const ds of datasets) {
      const row = indexes[datasets.indexOf(ds)].get(joinKey);
      if (row) {
        for (const dimKey of effectiveJoinKeys) {
          if (mergedRow[dimKey] === undefined && row[dimKey] !== undefined) {
            mergedRow[dimKey] = row[dimKey];
          }
        }
        break;
      }
    }

    // 4b. 填充指标值（从各数据集取，缺失填 null）
    for (let i = 0; i < datasets.length; i++) {
      const ds = datasets[i];
      const row = indexes[i].get(joinKey);
      for (const col of ds.columns) {
        if (col.type === 'metric') {
          if (row && row[col.key] !== undefined) {
            mergedRow[col.key] = row[col.key];
          } else {
            mergedRow[col.key] = null;
            missingDataNotes.push(
              `Metric "${col.displayName}" from tool "${ds.toolName}" is missing for key "${joinKey}"`,
            );
          }
        }
      }
    }

    mergedRows.push(mergedRow);
  }

  // 5. 排序（按维度键排序，便于阅读）
  mergedRows.sort((a, b) => {
    for (const key of effectiveJoinKeys) {
      const va = String(a[key] ?? '');
      const vb = String(b[key] ?? '');
      const cmp = va.localeCompare(vb);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });

  const joinLatencyMs = Date.now() - joinStartMs;
  const totalLatencyMs = startedAt
    ? Date.now() - new Date(startedAt).getTime()
    : joinLatencyMs;

  return {
    columns: allColumns,
    rows: mergedRows,
    sourceTrace,
    subQueryResults: datasets.map(ds => ({
      subQueryId: ds.subQueryId,
      toolName: ds.toolName,
      serverName: ds.toolName, // Will be enriched by caller
      ok: true,
      columns: ds.columns,
      rows: ds.rows,
      latencyMs: 0, // Will be enriched by caller
    })),
    joinKeys: effectiveJoinKeys,
    totalRows: mergedRows.length,
    totalColumns: allColumns.length,
    joinLatencyMs,
    totalLatencyMs,
    hasPartialFailure: false,
    missingDataNotes: missingDataNotes.slice(0, 20), // 限制 notes 数量
  };
}

// ─── Merge with Failure Handling ──────────────────────────

/**
 * 合并子查询结果，处理部分失败的情况。
 * 成功的结果做归一化 + JOIN，失败的记录错误信息。
 */
export function mergeSubQueryResults(params: {
  successfulResults: NormalizedDataSet[];
  failedResults: SubQueryResult[];
  joinKeys?: string[];
  startedAt?: string;
}): FederatedQueryResult {
  const { successfulResults, failedResults, joinKeys, startedAt } = params;

  // 如果全部失败，返回空结果
  if (successfulResults.length === 0) {
    return {
      columns: [],
      rows: [],
      sourceTrace: {},
      subQueryResults: failedResults.map(r => ({
        subQueryId: r.subQueryId,
        toolName: r.toolName,
        serverName: r.serverName,
        ok: false,
        errorMessage: r.errorMessage,
        columns: [],
        rows: [],
        latencyMs: r.latencyMs,
      })),
      joinKeys: joinKeys ?? [],
      totalRows: 0,
      totalColumns: 0,
      joinLatencyMs: 0,
      totalLatencyMs: startedAt ? Date.now() - new Date(startedAt).getTime() : 0,
      hasPartialFailure: failedResults.length > 0,
      missingDataNotes: failedResults.map(
        r => `Tool "${r.toolName}" failed: ${r.errorMessage ?? 'unknown error'}`,
      ),
    };
  }

  // 合并成功的结果
  const result = fullJoinResults(successfulResults, joinKeys, startedAt);

  // 标记部分失败
  if (failedResults.length > 0) {
    result.hasPartialFailure = true;
    result.subQueryResults.push(
      ...failedResults.map(r => ({
        subQueryId: r.subQueryId,
        toolName: r.toolName,
        serverName: r.serverName,
        ok: false,
        errorMessage: r.errorMessage,
        columns: [],
        rows: [],
        latencyMs: r.latencyMs,
      })),
    );
    for (const r of failedResults) {
      result.missingDataNotes.push(
        `Tool "${r.toolName}" failed: ${r.errorMessage ?? 'unknown error'}`,
      );
    }
  }

  return result;
}
