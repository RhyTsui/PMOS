/**
 * Planner Capability Grounding — Planner 候选能力落地
 *
 * 迭代条目：#52-57
 *
 * 设计原则：
 * 1. Planner 输出只能作为 hint，不能决定最终能力选择
 * 2. Planner candidate_capabilities 通过 capability-refs-resolver 验证
 * 3. 每个 candidate 标记状态：executable / missing_input / permission_blocked / unsupported
 * 4. 只生成 candidate，不执行 MCP
 *
 * Stage 0 实现：读取 PlannerPlanContract 的 candidate_capabilities，
 * 通过 capability-refs-resolver 验证，返回带状态的候选列表。
 */

import type { PlannerPlanContract } from '@/contracts/planner/planner-plan-contract';
import type { CapabilityManifest } from '@/contracts/capability/capability-manifest';
import {
  resolveCapabilityRefs,
  type CapabilityCandidateStatus,
  type CapabilityRef,
  type ResolvedCapabilityCandidate,
} from './capability-refs-resolver';

// ─── Types ───────────────────────────────────────────────

export interface PlannerCapabilityGroundingInput {
  plannerPlan: PlannerPlanContract;
  capabilityManifest: CapabilityManifest[];
}

export interface PlannerCapabilityCandidate {
  /** 原始 planner 候选（capability_id / display_name / match_reason） */
  plannerCandidate: {
    capability_id?: string;
    display_name?: string;
    match_reason?: string;
    confidence?: number;
  };
  /** 解析后的状态 */
  status: CapabilityCandidateStatus;
  /** 匹配的 capability manifest（如有） */
  capability?: CapabilityManifest;
  /** 原因 */
  reason?: string;
}

export interface PlannerCapabilityGroundingResult {
  /** planner 状态 */
  plannerStatus: string;
  /** 解析后的候选能力 */
  candidates: PlannerCapabilityCandidate[];
  /** 可执行候选数 */
  executable_count: number;
  /** 不可执行候选数 */
  blocked_count: number;
  /** 分析时间 ISO */
  computed_at: string;
}

// ─── Main ────────────────────────────────────────────────

/**
 * 将 Planner 候选能力落地为带状态的 candidate。
 *
 * 注意：planner 输出只作为 hint。最终能力选择由 planner-tool-contract-matching 决定。
 */
export function groundPlannerCapabilities(
  input: PlannerCapabilityGroundingInput,
): PlannerCapabilityGroundingResult {
  const candidates: PlannerCapabilityCandidate[] = [];

  // 从 planner plan 中提取 candidate_capabilities
  const plannerCandidates = Array.isArray(input.plannerPlan.candidate_capabilities)
    ? input.plannerPlan.candidate_capabilities
    : [];

  // 转换为 CapabilityRef 列表
  const refs: CapabilityRef[] = plannerCandidates
    .map((c): CapabilityRef | null => {
      if (c.capability_id) {
        return { type: 'capability_id', value: c.capability_id, source: 'planner_hint' };
      }
      if (c.display_name) {
        return { type: 'tool_name', value: c.display_name, source: 'planner_hint' };
      }
      return null;
    })
    .filter((r): r is CapabilityRef => r !== null);

  // 解析 refs
  const resolved = resolveCapabilityRefs(refs, input.capabilityManifest);

  // 合并 planner candidate 元数据 + resolved 状态
  for (let i = 0; i < plannerCandidates.length; i++) {
    const plannerCandidate = plannerCandidates[i];
    const resolvedCandidate = resolved[i];

    candidates.push({
      plannerCandidate: {
        capability_id: plannerCandidate.capability_id,
        display_name: plannerCandidate.display_name,
        match_reason: plannerCandidate.match_reason,
        confidence: plannerCandidate.confidence,
      },
      status: resolvedCandidate?.status ?? 'unsupported',
      capability: resolvedCandidate?.capability,
      reason: resolvedCandidate?.reason,
    });
  }

  const executableCount = candidates.filter((c) => c.status === 'executable').length;
  const blockedCount = candidates.filter((c) => c.status !== 'executable').length;

  return {
    plannerStatus: 'succeeded',
    candidates,
    executable_count: executableCount,
    blocked_count: blockedCount,
    computed_at: new Date().toISOString(),
  };
}
