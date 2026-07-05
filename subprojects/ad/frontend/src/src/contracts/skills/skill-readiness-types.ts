/**
 * Skill Readiness Probe Types
 *
 * 定义 Skill 就绪探测系统的核心类型：
 * - SkillReadinessState: 9 状态就绪状态机
 * - SkillReadinessProbeResult: 探测结果
 * - SkillSelectionCandidate: 技能候选评分
 *
 * 遵循 "后台绑定 ≠ 可执行" 原则：只有 ready/executable 的 skill 才能进入主链路。
 */

import type { CapabilityManifest } from '@/contracts/capability/capability-manifest';
import type { SkillContract } from '@/types';

// ─── Readiness State Machine ────────────────────────────────

/** Skill 就绪状态机。
 *  正向推进: discovered → configured → tools_resolved → schema_ingested → contract_ready → ready → executable
 *  失败状态: blocked（任何步骤失败）, stale（版本/架构不一致）
 */
export type SkillReadinessState =
  | 'discovered'       // 发现后台绑定记录
  | 'configured'       // SkillContract 存在，基础字段可读
  | 'tools_resolved'   // tool_bindings 指向的 MCP tool 已解析
  | 'schema_ingested'  // tool input/output schema 已读取
  | 'contract_ready'   // SkillCapabilityContract 可生成
  | 'ready'            // 可进入 CapabilityCatalog（仍需执行策略检查）
  | 'executable'       // 当前请求上下文通过 preflight，可执行
  | 'blocked'          // 缺 contract/tool/schema/adapter/policy
  | 'stale';           // 配置版本与 MCP schema / adapter 版本不一致

// ─── Probe Result ───────────────────────────────────────────

export interface SkillReadinessMissingItem {
  area: 'contract' | 'mcp' | 'schema' | 'input' | 'policy' | 'output' | 'test';
  item: string;
  detail?: string;
}

export interface SkillToolBindingStatus {
  toolName: string;
  serverId?: string;
  status: 'resolved' | 'missing' | 'stale_schema';
  toolDescription?: string;
  stepKey?: string;
}

export interface SkillReadinessProbeResult {
  skillId: string;
  state: SkillReadinessState;
  /** 当 state === 'blocked' 时的顶层错误原因，方便快速诊断 */
  blockedReason?: string;
  missing: SkillReadinessMissingItem[];
  toolBindings: SkillToolBindingStatus[];
  /** 仅在 ready/executable 时存在 */
  capability?: CapabilityManifest;
  probedAt: number;
  /** 探测逻辑版本，变更时强制重探测 */
  probeVersion: string;
}

// ─── Selection Candidate ────────────────────────────────────

/** Skill 候选评分。向后兼容现有 SkillSelectionInput.candidates 格式。 */
export interface SkillSelectionCandidate {
  skill: {
    skill_id: string;
    name?: string;
    domain?: string;
    category?: string;
    description?: string;
    selection_policy?: { requires_trigger_match_for_route_bonus?: boolean };
  };
  score?: number;
  reasons?: string[];
  matchedTriggers?: string[];
  /** 新增：skill 就绪状态 */
  readiness?: SkillReadinessState;
}
