/**
 * Skill Capability Projection Types
 *
 * 定义 Skill → CapabilityManifest 投影的中间类型。
 */

import type { CapabilityManifest } from '@/contracts/capability/capability-manifest';

export interface SkillCapabilityProjection {
  /** 来源 Skill ID */
  sourceSkillId: string;
  projectedAt: string;
  /** 投影生成的 CapabilityManifest（通常 1 个 skill → 1 个 manifest） */
  manifests: CapabilityManifest[];
  /** 从 workflow_steps[].key 到 MCP toolName 的映射 */
  stepToolMapping: Record<string, string>;
  /** 覆盖的 service intents */
  serviceIntents: string[];
  /** 覆盖的 semantic tasks */
  semanticTasks: string[];
  /** 投影置信度 */
  confidence: 'high' | 'medium' | 'low';
  /** 执行类别 */
  executionClass: CapabilityManifest['executionClass'];
  /** 风险等级 */
  riskLevel: CapabilityManifest['riskLevel'];
}
