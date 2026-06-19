/**
 * Planner Shadow Metrics — 旁路规划指标聚合
 *
 * 迭代条目：#17-18
 *
 * 统计：
 * - 按 status 计数（disabled / llm_unavailable / timeout / json_parse_failed / contract_validation_failed / succeeded）
 * - 平均耗时
 * - succeeded rate / json_parse_failed rate / contract_validation_failed rate
 * - task_type 分布（从 plan.task_type 提取）
 *
 * Stage 0 实现：内存聚合。每次 run 调 recordPlannerShadowObservation() 更新指标。
 * 指标可被 Admin 面板查询（Stage 5 Task 5.2）。
 */

import type { PlannerOrchestratorResult } from '@/lib/planner-orchestrator';

// ─── Types ───────────────────────────────────────────────

export type PlannerShadowStatus = PlannerOrchestratorResult['status'];

export interface PlannerShadowMetrics {
  /** 按 status 计数 */
  status_counts: Record<PlannerShadowStatus, number>;
  /** 总观测数 */
  total_observations: number;
  /** 总耗时 ms（用于计算平均） */
  total_duration_ms: number;
  /** 平均耗时 ms */
  avg_duration_ms: number;
  /** 成功率（succeeded / total） */
  succeeded_rate: number;
  /** JSON 解析失败率 */
  json_parse_failed_rate: number;
  /** 契约校验失败率 */
  contract_validation_failed_rate: number;
  /** task_type 分布（从 plan.task_type 提取） */
  task_type_distribution: Record<string, number>;
  /** 指标更新时间 ISO */
  updated_at: string;
}

// ─── State ───────────────────────────────────────────────

let metrics: PlannerShadowMetrics = createEmptyMetrics();

function createEmptyMetrics(): PlannerShadowMetrics {
  return {
    status_counts: {
      disabled: 0,
      llm_unavailable: 0,
      timeout: 0,
      json_parse_failed: 0,
      contract_validation_failed: 0,
      succeeded: 0,
    },
    total_observations: 0,
    total_duration_ms: 0,
    avg_duration_ms: 0,
    succeeded_rate: 0,
    json_parse_failed_rate: 0,
    contract_validation_failed_rate: 0,
    task_type_distribution: {},
    updated_at: new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────

/**
 * 记录一次 Planner Shadow 观测。
 * 在每次 emitPlannerShadowObservationIfEnabled 后调用。
 */
export function recordPlannerShadowObservation(result: PlannerOrchestratorResult): void {
  metrics.total_observations += 1;
  metrics.status_counts[result.status] = (metrics.status_counts[result.status] || 0) + 1;
  metrics.total_duration_ms += result.durationMs;
  metrics.avg_duration_ms = metrics.total_duration_ms / metrics.total_observations;
  metrics.succeeded_rate = metrics.status_counts.succeeded / metrics.total_observations;
  metrics.json_parse_failed_rate = metrics.status_counts.json_parse_failed / metrics.total_observations;
  metrics.contract_validation_failed_rate = metrics.status_counts.contract_validation_failed / metrics.total_observations;

  // task_type 分布
  if (result.status === 'succeeded' && result.plan?.task_type) {
    const taskType = result.plan.task_type;
    metrics.task_type_distribution[taskType] = (metrics.task_type_distribution[taskType] || 0) + 1;
  }

  metrics.updated_at = new Date().toISOString();
}

/**
 * 获取当前指标快照（只读）。
 */
export function getPlannerShadowMetrics(): Readonly<PlannerShadowMetrics> {
  return metrics;
}

/**
 * 重置指标（用于测试或 Admin 手动清零）。
 */
export function resetPlannerShadowMetrics(): void {
  metrics = createEmptyMetrics();
}

/**
 * 序列化为可附加到 metadata 的轻量结构。
 */
export function serializePlannerShadowMetrics(): Record<string, unknown> {
  return {
    total_observations: metrics.total_observations,
    status_counts: metrics.status_counts,
    avg_duration_ms: Math.round(metrics.avg_duration_ms * 100) / 100,
    succeeded_rate: Math.round(metrics.succeeded_rate * 1000) / 1000,
    json_parse_failed_rate: Math.round(metrics.json_parse_failed_rate * 1000) / 1000,
    contract_validation_failed_rate: Math.round(metrics.contract_validation_failed_rate * 1000) / 1000,
    task_type_distribution: metrics.task_type_distribution,
    updated_at: metrics.updated_at,
  };
}
