/**
 * Capability Refs Resolver — capabilityRefs → 真实 MCP tool
 *
 * 迭代条目：#50-51
 *
 * 设计原则：
 * 1. 禁止直接用 tool_name 做最终能力选择
 * 2. capabilityRefs 来自 Domain Ontology，必须验证对应 MCP tool 实际存在
 * 3. 返回 capability candidate 状态：executable / missing_input / permission_blocked / unsupported
 *
 * Stage 0 实现：静态映射 + 状态标记。
 */

import type { CapabilityManifest } from '@/contracts/capability/capability-manifest';

// ─── Types ───────────────────────────────────────────────

/**
 * capabilityRef 来源类型。
 */
export type CapabilityRefSource =
  | 'ontology'             // 来自 Domain Ontology
  | 'capability_manifest'  // 来自 Capability Manifest
  | 'planner_hint';        // 来自 Planner candidate_capabilities

/**
 * capabilityRef 条目。
 */
export interface CapabilityRef {
  type: 'tool_name' | 'capability_id' | 'semantic_task';
  value: string;
  source: CapabilityRefSource;
}

/**
 * 解析后的候选能力状态。
 */
export type CapabilityCandidateStatus =
  | 'executable'           // 可执行
  | 'missing_input'        // 缺少必要输入
  | 'permission_blocked'   // 权限不足
  | 'unsupported';         // 不支持（tool 不存在或能力不匹配）

/**
 * 解析后的候选能力。
 */
export interface ResolvedCapabilityCandidate {
  ref: CapabilityRef;
  status: CapabilityCandidateStatus;
  capability?: CapabilityManifest;
  reason?: string;
}

// ─── Resolver ────────────────────────────────────────────

/**
 * 解析 capabilityRefs 到真实 MCP capability。
 *
 * @param refs 待解析的 capabilityRefs（来自 ontology 或 planner）
 * @param manifest 当前可用 MCP capability manifest
 * @returns 解析后的候选能力列表，带状态标记
 */
export function resolveCapabilityRefs(
  refs: CapabilityRef[],
  manifest: CapabilityManifest[],
): ResolvedCapabilityCandidate[] {
  const manifestByToolName = new Map<string, CapabilityManifest>();
  const manifestById = new Map<string, CapabilityManifest>();
  for (const cap of manifest) {
    manifestById.set(cap.capabilityId, cap);
    // toolName 通常可以从 capabilityId 中提取（server.tool_name 格式）
    const toolName = cap.capabilityId.split('.').pop() || cap.capabilityId;
    manifestByToolName.set(toolName, cap);
  }

  return refs.map((ref) => {
    let capability: CapabilityManifest | undefined;

    switch (ref.type) {
      case 'tool_name':
        capability = manifestByToolName.get(ref.value);
        break;
      case 'capability_id':
        capability = manifestById.get(ref.value);
        break;
      case 'semantic_task':
        // semantic_task 需要匹配 supportedSemanticTasks
        capability = manifest.find((cap) =>
          cap.supportedSemanticTasks?.includes(ref.value as never),
        );
        break;
    }

    if (!capability) {
      return {
        ref,
        status: 'unsupported' as const,
        reason: `capability ref "${ref.type}:${ref.value}" 未在 manifest 中找到对应能力`,
      };
    }

    // 基础检查通过，标记为 executable
    // 更细致的 missing_input / permission_blocked 检查由 planner-tool-contract-matching 处理
    return {
      ref,
      status: 'executable' as const,
      capability,
    };
  });
}

/**
 * 过滤出可执行的候选。
 */
export function filterExecutableCandidates(
  candidates: ResolvedCapabilityCandidate[],
): ResolvedCapabilityCandidate[] {
  return candidates.filter((c) => c.status === 'executable');
}
