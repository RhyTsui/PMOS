/**
 * Planner Route Alignment — 离线路由对齐分析
 *
 * 迭代条目：#19-21
 *
 * 对比 route 决策与 planner shadow 输出：
 * - route.intent_type vs planner.task_type
 * - route.service_intent vs planner.service_intent
 * - route.evidence_mode vs planner.evidence_mode
 * - route.confidence vs planner.confidence
 *
 * 输出 alignment 分类：
 * - `matched`: route 与 planner 一致
 * - `diverged`: route 与 planner 不一致（planner 有不同判断）
 * - `planner_uncertain`: planner 失败或置信度过低
 * - `existing_uncertain`: route 本身置信度低
 *
 * 注意：alignment 只进 trace，不改变 route/tool/answer（#22）。
 */

import type { PlannerPlanContract } from '@/contracts/planner/planner-plan-contract';
import type { IntentType } from '@/types';

// ─── Types ───────────────────────────────────────────────

export type PlannerRouteAlignment =
  | 'matched'
  | 'diverged'
  | 'planner_uncertain'
  | 'existing_uncertain';

export interface PlannerRouteAlignmentResult {
  alignment: PlannerRouteAlignment;
  /** route.intent_type */
  route_intent: string;
  /** planner.task_type */
  planner_task_type?: string;
  /** route.service_intent vs planner.service_intent 是否一致 */
  service_intent_aligned: boolean;
  /** route.confidence */
  route_confidence: string;
  /** planner.confidence */
  planner_confidence?: number;
  /** 差异字段列表 */
  diverged_fields: string[];
  /** 分析原因 */
  reason: string;
  /** 分析时间 ISO */
  computed_at: string;
}

// ─── Intent Mapping ──────────────────────────────────────

/**
 * 将 planner.task_type 映射到 route.intent_type 进行比较。
 * planner 使用 task_type，route 使用 intent_type，两者命名不同但语义相似。
 */
function mapPlannerTaskTypeToIntentType(taskType: string): IntentType | null {
  const mapping: Record<string, IntentType> = {
    data_query: 'report_query',
    debugging: 'debugging',
    diagnosis: 'diagnosis',
    knowledge_qa: 'help',
    explanation: 'help',
    configuration: 'help',
    automation: 'debugging',
    multi_step: 'report_query',
    general_chat: 'general',
    requirement_drafting: 'demand',
  };
  return mapping[taskType] ?? null;
}

// ─── Main ────────────────────────────────────────────────

export interface PlannerRouteAlignmentInput {
  /** route 决策结果 */
  route: {
    intent_type: IntentType | string;
    confidence: 'high' | 'medium' | 'low';
    serviceIntent?: string;
  };
  /** planner shadow 结果（可能为 null 表示 planner 未运行） */
  planner: {
    status: string;
    plan?: PlannerPlanContract | null;
  } | null;
}

/**
 * 计算 planner 与 route 的对齐结果。
 *
 * 规则：
 * 1. planner 未运行或状态非 succeeded → planner_uncertain
 * 2. route.confidence = 'low' → existing_uncertain
 * 3. planner.task_type 映射后的 intent 与 route.intent_type 一致 + service_intent 一致 → matched
 * 4. 其他情况 → diverged
 */
export function computePlannerRouteAlignment(
  input: PlannerRouteAlignmentInput,
): PlannerRouteAlignmentResult {
  const divergedFields: string[] = [];

  // Case 1: planner 未运行或失败
  if (!input.planner || input.planner.status !== 'succeeded' || !input.planner.plan) {
    return {
      alignment: 'planner_uncertain',
      route_intent: input.route.intent_type,
      service_intent_aligned: false,
      route_confidence: input.route.confidence,
      diverged_fields: [],
      reason: `planner status=${input.planner?.status ?? 'not_run'}，无法比较`,
      computed_at: new Date().toISOString(),
    };
  }

  const plan = input.planner.plan;
  const plannerIntent = mapPlannerTaskTypeToIntentType(plan.task_type);

  // Case 2: route 本身置信度低
  if (input.route.confidence === 'low') {
    return {
      alignment: 'existing_uncertain',
      route_intent: input.route.intent_type,
      planner_task_type: plan.task_type,
      planner_confidence: plan.confidence,
      service_intent_aligned: input.route.serviceIntent === plan.service_intent,
      route_confidence: input.route.confidence,
      diverged_fields: [],
      reason: 'route 本身置信度低，无法判断对齐',
      computed_at: new Date().toISOString(),
    };
  }

  // 比较 intent
  const intentMatched = plannerIntent != null && plannerIntent === input.route.intent_type;
  if (!intentMatched) {
    divergedFields.push('intent_type');
  }

  // 比较 service_intent
  const serviceIntentAligned = input.route.serviceIntent === plan.service_intent;
  if (!serviceIntentAligned) {
    divergedFields.push('service_intent');
  }

  // 比较 evidence_mode（如果 route 有对应概念）
  // route 没有显式的 evidence_mode，这里只记录 planner 的输出
  // 留给后续扩展

  if (divergedFields.length === 0) {
    return {
      alignment: 'matched',
      route_intent: input.route.intent_type,
      planner_task_type: plan.task_type,
      planner_confidence: plan.confidence,
      service_intent_aligned: true,
      route_confidence: input.route.confidence,
      diverged_fields: [],
      reason: 'route 与 planner 在 intent_type 和 service_intent 上完全一致',
      computed_at: new Date().toISOString(),
    };
  }

  return {
    alignment: 'diverged',
    route_intent: input.route.intent_type,
    planner_task_type: plan.task_type,
    planner_confidence: plan.confidence,
    service_intent_aligned: serviceIntentAligned,
    route_confidence: input.route.confidence,
    diverged_fields: divergedFields,
    reason: `差异字段：${divergedFields.join(', ')}`,
    computed_at: new Date().toISOString(),
  };
}

/**
 * 序列化 alignment 结果用于 trace 附加。
 */
export function serializePlannerRouteAlignment(
  result: PlannerRouteAlignmentResult,
): Record<string, unknown> {
  return {
    alignment: result.alignment,
    route_intent: result.route_intent,
    planner_task_type: result.planner_task_type,
    planner_confidence: result.planner_confidence,
    service_intent_aligned: result.service_intent_aligned,
    diverged_fields: result.diverged_fields,
    reason: result.reason,
  };
}
