/**
 * Planner Assisted Routing — Planner 辅助路由决策
 *
 * 迭代条目：#107-113
 *
 * Phase 1: Route Review — Planner 仅审查现有 route 决策，不覆盖
 * Phase 2: Confidence Boost / Candidate Supplement
 *
 * 设计原则：
 * - Planner 不直接覆盖 route.intent_type (#110)
 * - Planner 不直接选择 MCP tool (#111)
 * - Planner 不直接生成 tool args (#112)
 * - Planner 不直接宣告执行成功 (#113)
 * - 仅在 Planner 与规则一致时提高 confidence，不一致时记录 divergence
 */

import type { IntentType } from '@/types';
import type { PlannerPlanContract } from '@/contracts/planner/planner-plan-contract';

export interface RouteReviewInput {
  routeIntent: IntentType | string;
  routeConfidence: 'high' | 'medium' | 'low';
  routeServiceIntent?: string;
  plannerPlan?: PlannerPlanContract | null;
  plannerStatus?: string;
}

export interface RouteReviewResult {
  /** 原始 route intent（不会被覆盖） */
  original_intent: string;
  /** planner 建议的 intent（仅参考） */
  planner_suggested_intent?: string;
  /** 对齐状态 */
  alignment: 'matched' | 'diverged' | 'planner_uncertain' | 'existing_uncertain';
  /** 是否提升 confidence */
  confidence_boost: boolean;
  /** 补充的候选能力（来自 planner） */
  supplemented_candidates: string[];
  /** 审查说明 */
  review_notes: string[];
}

/**
 * 将 planner task_type 映射到 route intent_type
 */
const PLANNER_TO_ROUTE_INTENT: Record<string, string> = {
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

/**
 * Phase 1: Route Review
 *
 * 审查 route 决策与 planner 输出的一致性。
 * 不覆盖 route.intent_type，仅提供审查意见。
 */
export function reviewRouteDecision(input: RouteReviewInput): RouteReviewResult {
  const notes: string[] = [];
  const supplementedCandidates: string[] = [];

  // Planner 未运行或失败
  if (!input.plannerPlan || input.plannerStatus !== 'succeeded') {
    return {
      original_intent: input.routeIntent,
      alignment: 'planner_uncertain',
      confidence_boost: false,
      supplemented_candidates: [],
      review_notes: [`Planner 未产出有效结果 (status=${input.plannerStatus ?? 'not_run'})，仅使用规则路由`],
    };
  }

  const plannerIntent = PLANNER_TO_ROUTE_INTENT[input.plannerPlan.task_type] ?? input.plannerPlan.task_type;
  const intentMatch = plannerIntent === input.routeIntent;
  const serviceIntentMatch = !input.plannerPlan.service_intent || !input.routeServiceIntent
    || input.plannerPlan.service_intent === input.routeServiceIntent;

  // Route 本身置信度低
  if (input.routeConfidence === 'low') {
    notes.push('Route 本身置信度低，planner 结果仅作参考');
    return {
      original_intent: input.routeIntent,
      planner_suggested_intent: plannerIntent,
      alignment: 'existing_uncertain',
      confidence_boost: false,
      supplemented_candidates: extractCandidateIds(input.plannerPlan),
      review_notes: notes,
    };
  }

  // Phase 2: 一致时提升 confidence
  if (intentMatch && serviceIntentMatch) {
    notes.push('Planner 与规则路由一致，confidence 提升');
    return {
      original_intent: input.routeIntent,
      planner_suggested_intent: plannerIntent,
      alignment: 'matched',
      confidence_boost: true,
      supplemented_candidates: extractCandidateIds(input.plannerPlan),
      review_notes: notes,
    };
  }

  // 不一致
  if (!intentMatch) {
    notes.push(`Planner 建议 "${plannerIntent}"，与规则路由 "${input.routeIntent}" 不一致 — 保持规则路由`);
  }
  if (!serviceIntentMatch) {
    notes.push(`Planner service_intent "${input.plannerPlan.service_intent}" 与 route "${input.routeServiceIntent}" 不一致`);
  }

  // Phase 2: 即使 intent 不一致，planner 的 candidate_capabilities 也可作为补充候选
  const plannerCandidateIds = extractCandidateIds(input.plannerPlan);
  supplementedCandidates.push(...plannerCandidateIds);

  return {
    original_intent: input.routeIntent,
    planner_suggested_intent: plannerIntent,
    alignment: 'diverged',
    confidence_boost: false,
    supplemented_candidates: supplementedCandidates,
    review_notes: notes,
  };
}

function extractCandidateIds(plan: PlannerPlanContract): string[] {
  if (!Array.isArray(plan.candidate_capabilities)) return [];
  return plan.candidate_capabilities
    .map((c) => c.capability_id || c.display_name || '')
    .filter(Boolean);
}
