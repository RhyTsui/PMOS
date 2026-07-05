/**
 * Skill Readiness Probe
 *
 * 消费 SkillContract + MCP registry + adapter registry + execution policies，
 * 输出 SkillReadinessProbeResult。
 *
 * 核心原则：后台绑定 ≠ 可执行。只有 ready/executable 的 skill 才能进入主链路。
 *
 * 缓存策略：内存 Map + 60s TTL + Admin 事件失效。
 * 评审修复 #1 (Runtime Critical): 无缓存会导致 ~72-180ms 每次请求额外延迟。
 */

import type { SkillContract, McpServerConfig } from '@/types';
import type { CapabilityManifest } from '@/contracts/capability/capability-manifest';
import type {
  SkillReadinessProbeResult,
  SkillReadinessMissingItem,
  SkillToolBindingStatus,
  SkillReadinessState,
} from '@/contracts/skills/skill-readiness-types';

// ─── Cache ──────────────────────────────────────────────────

const PROBE_CACHE_TTL_MS = 60_000; // 60秒 TTL

const readinessCache = new Map<string, {
  result: SkillReadinessProbeResult;
  cachedAt: number;
}>();

const PROBE_VERSION = 'skill-readiness-probe/v1';

export function getCachedReadiness(skillId: string): SkillReadinessProbeResult | undefined {
  const entry = readinessCache.get(skillId);
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAt > PROBE_CACHE_TTL_MS) {
    readinessCache.delete(skillId);
    return undefined;
  }
  return entry.result;
}

export function invalidateReadinessCache(skillId?: string): void {
  if (skillId) {
    readinessCache.delete(skillId);
  } else {
    readinessCache.clear();
  }
}

function cacheReadiness(result: SkillReadinessProbeResult): void {
  readinessCache.set(result.skillId, { result, cachedAt: Date.now() });
}

// ─── Probe Implementation ───────────────────────────────────

export interface ProbeInput {
  contract: SkillContract;
  mcpServerConfigs: McpServerConfig[];
}

function createBlockedResult(
  skillId: string,
  missing: SkillReadinessMissingItem[],
  blockedReason: string,
): SkillReadinessProbeResult {
  return {
    skillId,
    state: 'blocked',
    blockedReason,
    missing,
    toolBindings: [],
    probedAt: Date.now(),
    probeVersion: PROBE_VERSION,
  };
}

/** 将 tool_bindings 解析为真实的 MCP tool */
function resolveToolBindings(
  contract: SkillContract,
  mcpServerConfigs: McpServerConfig[],
): SkillToolBindingStatus[] {
  const bindings: SkillToolBindingStatus[] = [];
  const allTools = new Map<string, { serverId: string; description?: string }>();

  for (const server of mcpServerConfigs) {
    for (const tool of server.tools || []) {
      if (tool.name) {
        allTools.set(tool.name, {
          serverId: server.id || server.endpoint_url || 'unknown',
          description: tool.description,
        });
      }
    }
  }

  for (const step of contract.workflow_steps || []) {
    const stepTools = step.tool_bindings || [];
    for (const toolName of stepTools) {
      const resolved = allTools.get(toolName);
      bindings.push({
        toolName,
        serverId: resolved?.serverId,
        status: resolved ? 'resolved' : 'missing',
        toolDescription: resolved?.description,
        stepKey: step.key,
      });
    }
  }

  return bindings;
}

/** 检查 skill 基础配置是否齐全 */
function checkBaseConfig(contract: SkillContract): SkillReadinessMissingItem[] {
  const missing: SkillReadinessMissingItem[] = [];

  if (!contract.skill_id) missing.push({ area: 'contract', item: 'skill_id', detail: 'Skill ID 缺失' });
  if (!contract.version) missing.push({ area: 'contract', item: 'version', detail: 'Skill 版本缺失' });
  if (contract.enabled === false) missing.push({ area: 'contract', item: 'enabled', detail: 'Skill 未启用' });
  if (!contract.workflow_steps || contract.workflow_steps.length === 0) {
    missing.push({ area: 'contract', item: 'workflow_steps', detail: '工作流步骤为空' });
  }

  return missing;
}

/** 主探测函数 */
export function probeSkillReadiness(input: ProbeInput): SkillReadinessProbeResult {
  const { contract, mcpServerConfigs } = input;
  const skillId = contract.skill_id;

  // Check cache first
  const cached = getCachedReadiness(skillId);
  if (cached) return cached;

  const missing: SkillReadinessMissingItem[] = [];

  // Step 1: Base config check → configured
  const baseIssues = checkBaseConfig(contract);
  if (baseIssues.length > 0) {
    missing.push(...baseIssues);
    const result = createBlockedResult(skillId, missing, '基础配置不完整');
    cacheReadiness(result);
    return result;
  }

  // Step 2: Tool binding resolution → tools_resolved
  const bindings = resolveToolBindings(contract, mcpServerConfigs);
  const unresolved = bindings.filter(b => b.status !== 'resolved');
  if (unresolved.length > 0) {
    for (const b of unresolved) {
      missing.push({ area: 'mcp', item: b.toolName, detail: `MCP tool '${b.toolName}' 未注册或不可用` });
    }
    const result: SkillReadinessProbeResult = {
      skillId,
      state: 'blocked',
      blockedReason: `工具绑定未解析: ${unresolved.map(b => b.toolName).join(', ')}`,
      missing,
      toolBindings: bindings,
      probedAt: Date.now(),
      probeVersion: PROBE_VERSION,
    };
    cacheReadiness(result);
    return result;
  }

  // Step 3: Schema check → schema_ingested (all tools resolved; schema compatibility verified at runtime)
  // Step 4: Contract ready check → contract_ready
  // For now, if all tools are resolved, we consider the skill contract_ready
  // Full schema ingestion would require calling MCP tools/list which is done at buildCapabilityManifest time

  // Step 5: Check if ready to enter catalog
  // A skill is "ready" if all its tool bindings resolve to existing MCP tools
  // The full readiness probe (adapter + policy check) is done in Phase 2

  const state: SkillReadinessState = bindings.every(b => b.status === 'resolved')
    ? 'ready'
    : 'blocked';

  const blockedReason = state === 'blocked'
    ? `工具绑定问题: ${bindings.filter(b => b.status !== 'resolved').map(b => b.toolName).join(', ')}`
    : undefined;

  const result: SkillReadinessProbeResult = {
    skillId,
    state,
    blockedReason,
    missing,
    toolBindings: bindings,
    // Capability projection will be set separately after projection
    capability: undefined,
    probedAt: Date.now(),
    probeVersion: PROBE_VERSION,
  };

  cacheReadiness(result);
  return result;
}

/** 批量探测所有 enabled skill */
export async function probeAllSkills(
  skills: SkillContract[],
  mcpServerConfigs: McpServerConfig[],
): Promise<SkillReadinessProbeResult[]> {
  const results: SkillReadinessProbeResult[] = [];
  for (const skill of skills) {
    const result = probeSkillReadiness({ contract: skill, mcpServerConfigs });
    results.push(result);
  }
  return results;
}

/** 判断 skill 是否可进入 CapabilityCatalog */
export function isSkillReadyForDiscovery(result: SkillReadinessProbeResult): boolean {
  return result.state === 'ready' || result.state === 'executable';
}

/** 获取所有就绪的 skill */
export function filterReadySkills(results: SkillReadinessProbeResult[]): SkillReadinessProbeResult[] {
  return results.filter(isSkillReadyForDiscovery);
}

/** 获取所有被阻塞的 skill（用于 admin 面板和 trace） */
export function filterBlockedSkills(results: SkillReadinessProbeResult[]): SkillReadinessProbeResult[] {
  return results.filter(r => r.state === 'blocked' || r.state === 'stale');
}
