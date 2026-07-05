/**
 * Skill Capability Projection
 *
 * 将 SkillContract 转换为 CapabilityManifest，
 * 使 Skill 能力可以与 MCP 能力共存于统一 CapabilityCatalog。
 *
 * 评审修复 #6 (Architecture Must-fix): 此模块提供统一的 skill→capability 映射。
 */

import type { SkillContract, McpServerConfig } from '@/types';
import type { CapabilityManifest, CapabilityProvider } from '@/contracts/capability/capability-manifest';
import type { SkillReadinessProbeResult } from '@/contracts/skills/skill-readiness-types';
import type { SkillCapabilityProjection } from './skill-capability-projection-types';

// ─── Projection Types ───────────────────────────────────────

export type { SkillCapabilityProjection } from './skill-capability-projection-types';

// ─── Skill → Capability Manifest ────────────────────────────

/** 构建 skill capabilityId */
export function buildSkillCapabilityId(skillId: string): string {
  return `skill:${skillId}`;
}

/** 从 skill category 推断 executionClass */
function inferExecutionClass(
  category: SkillContract['category'],
): CapabilityManifest['executionClass'] {
  switch (category) {
    case 'diagnosis':
    case 'debugging':
      return 'diagnostic';
    case 'integration':
      return 'workflow';
    case 'report':
    case 'monitor':
      return 'read_only';
    case 'help':
    case 'analysis':
    default:
      return 'read_only';
  }
}

/** 从 skill category 推断 supportedServiceIntents */
function inferServiceIntents(category: SkillContract['category']): string[] {
  switch (category) {
    case 'diagnosis':
    case 'debugging':
      return ['issue_diagnosis'];
    case 'integration':
      return ['integration_workflow', 'package_fetch'];
    case 'report':
      return ['data_query', 'report_delivery'];
    case 'help':
      return ['help_qa', 'knowledge_answer', 'field_definition'];
    case 'monitor':
      return ['data_query'];
    case 'analysis':
      return ['data_query'];
    default:
      return ['general_chat'];
  }
}

/** 从 risk_guardrails 推断 riskLevel */
function inferRiskLevel(contract: SkillContract): CapabilityManifest['riskLevel'] {
  const guardrails = contract.risk_guardrails || [];
  const joined = guardrails.join(' ');

  if (joined.includes('写操作') || joined.includes('modify') || joined.includes('保存') || joined.includes('确认短语')) {
    return 'high';
  }
  if (joined.includes('审计') || joined.includes('权限')) {
    return 'medium';
  }
  return 'low';
}

/** 转换 ServiceIntent 为 CapabilityPurpose */
function inferCapabilityPurpose(category: SkillContract['category']): CapabilityManifest['capabilityPurpose'] {
  switch (category) {
    case 'diagnosis':
    case 'debugging':
      return 'diagnostic_evidence';
    case 'integration':
      return 'workflow_execution';
    case 'report':
      return 'report_execution';
    case 'help':
      return 'dictionary_lookup';
    default:
      return 'workflow_execution';
  }
}

/** 主投影函数：将 SkillContract 转换为 CapabilityManifest */
export function projectSkillToCapability(
  contract: SkillContract,
  readiness: SkillReadinessProbeResult,
): CapabilityManifest {
  const capabilityId = buildSkillCapabilityId(contract.skill_id);
  const category = contract.category || 'analysis';

  // 展开所有 workflow_steps 中的 tool_bindings
  const allToolBindings: string[] = [];
  for (const step of contract.workflow_steps || []) {
    if (step.tool_bindings) {
      allToolBindings.push(...step.tool_bindings);
    }
  }

  // 从 input_schema 提取 required inputs
  const inputSchema = contract.input_schema as Record<string, unknown> | undefined;
  const requiredInputs: string[] = Array.isArray(inputSchema?.required)
    ? (inputSchema!.required as string[])
    : [];

  const optionalInputs: string[] = inputSchema?.properties
    ? Object.keys(inputSchema.properties as Record<string, unknown>).filter(k => !requiredInputs.includes(k))
    : [];

  const manifest: CapabilityManifest = {
    capabilityId,
    displayName: contract.name,
    description: contract.description,
    provider: 'builtin' as CapabilityProvider,
    capabilityType: category === 'report' ? 'data.report' : 'workflow',
    capabilityPurpose: inferCapabilityPurpose(category),
    verificationStatus: readiness.state === 'ready' || readiness.state === 'executable'
      ? 'verified' : 'inferred',
    center: category === 'diagnosis' || category === 'debugging'
      ? 'delivery_integration' : 'conversation',
    serviceLine: category,
    automationLevel: category === 'help' ? 'L0' : 'L1',
    owner: 'skill-governance',
    governanceVersion: `skill-projection/${contract.version || 'unknown'}`,
    evidenceNeed: ['tool_result', 'source_ref_or_model_only_boundary'],
    outputSurface: ['chat_answer'],
    fallbackPolicy: 'clarify',
    executionClass: inferExecutionClass(category),
    supportedSemanticTasks: category === 'diagnosis'
      ? ['diagnose_data_issue']
      : category === 'integration'
        ? ['execute_workflow']
        : ['retrieve_report_data'],
    supportedServiceIntents: inferServiceIntents(category) as CapabilityManifest['supportedServiceIntents'],
    toolPurpose: category === 'report' ? 'report_generate'
      : category === 'diagnosis' || category === 'debugging' ? 'evidence_fetch'
      : category === 'help' ? 'help_lookup'
      : 'integration_run',
    primaryGoal: contract.description,
    requiredInputs,
    optionalInputs,
    inputContract: {
      requiredFields: requiredInputs,
      optionalFields: optionalInputs,
      description: contract.description,
    },
    outputContract: {
      contractType: 'semantic_result',
      requiredFields: Object.keys(contract.output_schema?.properties || {}),
    },
    riskLevel: inferRiskLevel(contract),
    dataDomain: contract.domain || category,
    supports: {
      metrics: [],
      dimensions: [],
      identifierTypes: [],
      granularity: [],
      views: ['detail'],
    },
    triggerHints: contract.intent_triggers,
    source: {
      sourceType: 'builtin' as CapabilityProvider,
      toolName: contract.skill_id,
    },
    // Skill 来源扩展字段
    skillId: contract.skill_id,
    skillContractVersion: contract.version,
    workflowStepCount: contract.workflow_steps?.length || 0,
  };

  return manifest;
}

/** 批量投影 ready skills */
export function projectReadySkillsToCapabilities(
  contracts: SkillContract[],
  readinessResults: SkillReadinessProbeResult[],
): CapabilityManifest[] {
  const readyIds = new Set(
    readinessResults
      .filter(r => r.state === 'ready' || r.state === 'executable')
      .map(r => r.skillId),
  );

  const manifests: CapabilityManifest[] = [];
  for (const contract of contracts) {
    if (!readyIds.has(contract.skill_id)) continue;
    const readiness = readinessResults.find(r => r.skillId === contract.skill_id);
    if (!readiness) continue;

    const manifest = projectSkillToCapability(contract, readiness);
    manifests.push(manifest);

    // Update readiness result with projected capability
    readiness.capability = manifest;
  }

  return manifests;
}
