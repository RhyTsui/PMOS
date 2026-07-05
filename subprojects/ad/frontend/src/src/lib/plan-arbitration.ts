/**
 * Unified Plan Arbitration
 *
 * 统一 Plan Arbitration 模块。消费 MCP 候选 + Skill 候选，
 * 输出唯一的 executionTarget，防止 Skill 与 MCP 工具并行执行。
 *
 * 评审修复 #3 (Architecture + Runtime): 原始方案中 Plan Arbitration 仅作为算法描述存在。
 * 现统一由 arbitrateExecutionPlan() 负责，由 understanding-stage.ts 调用。
 */

import type { CapabilitySelectionCandidate } from '@/contracts/capability/capability-manifest';
import type { SkillReadinessProbeResult, SkillReadinessState } from '@/contracts/skills/skill-readiness-types';
import type { SkillCapabilityProjection } from '@/lib/skill-capability-projection-types';

// ─── Arbitration Types ──────────────────────────────────────

export interface ArbitratedExecutionPlan {
  target: {
    type: 'mcp_tool' | 'skill' | 'builtin' | 'open_answer';
    capabilityId?: string;
    skillId?: string;
    readiness?: SkillReadinessState;
  };
  reason: string;
  candidates: CapabilitySelectionCandidate[];
  warnings: string[];
}

export interface ArbitrationInput {
  mcpCapabilities: CapabilitySelectionCandidate[];
  skillProjections: SkillCapabilityProjection[];
  skillReadiness: Record<string, SkillReadinessProbeResult>;
  routeIntent: string;
}

// ─── Arbitration Logic ──────────────────────────────────────

/** 判断 capabilityId 是否来自 skill 投影 */
function isSkillCapability(capabilityId: string): boolean {
  return capabilityId.startsWith('skill:');
}

/** 从 skill capabilityId 提取 skillId */
function extractSkillId(capabilityId: string): string {
  return capabilityId.replace(/^skill:/, '');
}

/** 生成去重后的统一候选列表 */
function mergeAndDeduplicate(input: ArbitrationInput): {
  candidates: CapabilitySelectionCandidate[];
  warnings: string[];
} {
  const candidates: CapabilitySelectionCandidate[] = [];
  const warnings: string[] = [];
  const seenToolNames = new Set<string>();

  // Step 1: Add skill-projected capabilities
  for (const proj of input.skillProjections) {
    for (const manifest of proj.manifests) {
      const readiness = input.skillReadiness[proj.sourceSkillId];
      const score = proj.confidence === 'high' ? 80 : proj.confidence === 'medium' ? 60 : 40;

      candidates.push({
        capability: manifest,
        score,
        reasons: [
          `Skill '${proj.sourceSkillId}' (${readiness?.state || 'unknown'})`,
          ...proj.serviceIntents.map(si => `Intent: ${si}`),
        ],
        // Skill projections get priority bonus
        // @ts-expect-error: extended candidate
        _isSkillProjection: true,
        _sourceSkillId: proj.sourceSkillId,
      });

      // Track tool names from skill projections
      for (const toolName of Object.keys(proj.stepToolMapping)) {
        seenToolNames.add(toolName);
      }
    }
  }

  // Step 2: Add MCP candidates, skipping those shadowed by skills
  for (const mcpCandidate of input.mcpCapabilities) {
    const toolName = mcpCandidate.capability.source?.toolName;
    if (toolName && seenToolNames.has(toolName)) {
      warnings.push(`MCP capability '${mcpCandidate.capability.capabilityId}' shadowed by skill`);
      continue; // Skip MCP tools already covered by a skill
    }
    candidates.push(mcpCandidate);
  }

  return { candidates, warnings };
}

/** 主仲裁函数 */
export function arbitrateExecutionPlan(input: ArbitrationInput): ArbitratedExecutionPlan {
  const { candidates, warnings } = mergeAndDeduplicate(input);

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      target: { type: 'open_answer' },
      reason: 'no_executable_capability',
      candidates: [],
      warnings: [...warnings, 'All candidates are unavailable or blocked'],
    };
  }

  const best = candidates[0];
  const bestCapabilityId = best.capability.capabilityId;

  // Check if it's a skill
  if (isSkillCapability(bestCapabilityId)) {
    const skillId = extractSkillId(bestCapabilityId);
    const readiness = input.skillReadiness[skillId];

    if (readiness && (readiness.state === 'ready' || readiness.state === 'executable')) {
      return {
        target: {
          type: 'skill',
          skillId,
          capabilityId: bestCapabilityId,
          readiness: readiness.state,
        },
        reason: `Skill '${skillId}' selected with score ${best.score}. ${best.reasons.join('. ')}`,
        candidates,
        warnings,
      };
    }

    // Skill not ready — fall through to next best
    warnings.push(`Best candidate skill '${skillId}' is not ready (${readiness?.state || 'unknown'})`);
    const nextBest = candidates.find(c =>
      !isSkillCapability(c.capability.capabilityId) ||
      input.skillReadiness[extractSkillId(c.capability.capabilityId)]?.state === 'ready'
    );

    if (nextBest) {
      return {
        target: {
          type: isSkillCapability(nextBest.capability.capabilityId) ? 'skill' : 'mcp_tool',
          capabilityId: nextBest.capability.capabilityId,
          skillId: isSkillCapability(nextBest.capability.capabilityId)
            ? extractSkillId(nextBest.capability.capabilityId)
            : undefined,
        },
        reason: `Fallback to ${nextBest.capability.capabilityId} (best skill not ready)`,
        candidates,
        warnings,
      };
    }

    return {
      target: { type: 'open_answer' },
      reason: 'no_ready_candidate_found',
      candidates,
      warnings: [...warnings, 'No ready candidates available'],
    };
  }

  // MCP tool
  const isBuiltin = bestCapabilityId.startsWith('builtin.');
  return {
    target: {
      type: isBuiltin ? 'builtin' : 'mcp_tool',
      capabilityId: bestCapabilityId,
    },
    reason: `${isBuiltin ? 'Builtin' : 'MCP'} capability '${bestCapabilityId}' selected with score ${best.score}`,
    candidates,
    warnings,
  };
}
