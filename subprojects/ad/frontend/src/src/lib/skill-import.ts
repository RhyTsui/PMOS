import type { McpSkill, McpSkillCategory, SkillContract, SkillImportIssue, SkillImportPackage, SkillImportPreview } from '@/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item).trim()).filter(Boolean);
}

function isSkillLike(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return ['endpoint_url', 'mcp_server_id', 'installed_server_id', 'expected_tools', 'use_cases', 'transport', 'auth_type']
    .some(key => key in value);
}

function isContractLike(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return ['skill_id', 'intent_triggers', 'input_schema', 'workflow_steps', 'output_schema', 'evaluation_cases', 'risk_guardrails', 'slot_schema_ref', 'workflow_ref', 'capability_requirements_ref']
    .some(key => key in value);
}

function readStringRecordField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return typeof field === 'string' && field.trim() ? field.trim() : undefined;
}

function packageRefItems(input: Record<string, unknown>): Array<{ key: string; ref?: string; count?: number }> {
  const refs: Array<{ key: string; ref?: string; count?: number }> = [];
  const manifest = isRecord(input.manifest) ? input.manifest : undefined;
  const workflow = isRecord(input.workflow) ? input.workflow : undefined;
  const prompts = isRecord(input.prompts) ? input.prompts : undefined;
  const goldenCases = isRecord(input.golden_cases) ? input.golden_cases : undefined;
  const resultContract = isRecord(input.result_contract) ? input.result_contract : undefined;
  const runtimeDisplay = isRecord(input.runtime_display) ? input.runtime_display : undefined;
  const observability = isRecord(input.observability) ? input.observability : undefined;
  if (manifest) refs.push({ key: 'manifest', ref: readStringRecordField(manifest, 'skillId') || readStringRecordField(manifest, 'skill_id') || readStringRecordField(manifest, 'name') });
  if (workflow) refs.push({ key: 'workflow', ref: readStringRecordField(workflow, 'workflowRef') || readStringRecordField(workflow, 'id'), count: Array.isArray(workflow.steps) ? workflow.steps.length : undefined });
  if (prompts) refs.push({ key: 'prompts', count: Object.keys(prompts).length });
  if (goldenCases) refs.push({ key: 'golden_cases', count: Array.isArray(goldenCases.cases) ? goldenCases.cases.length : Object.keys(goldenCases).length });
  if (resultContract) refs.push({ key: 'result_contract', ref: readStringRecordField(resultContract, 'resultScreenType') || readStringRecordField(resultContract, 'screenType') });
  if (runtimeDisplay) refs.push({ key: 'runtime_display', ref: readStringRecordField(runtimeDisplay, 'runtimeDisplayRef') || readStringRecordField(runtimeDisplay, 'id') });
  if (observability) refs.push({ key: 'observability', ref: readStringRecordField(observability, 'observabilityRef') || readStringRecordField(observability, 'id') });
  return refs;
}

function mergeSkillPackageRefs(contract: Partial<SkillContract>, input: Record<string, unknown>): Partial<SkillContract> {
  const manifest = isRecord(input.manifest) ? input.manifest : undefined;
  const workflow = isRecord(input.workflow) ? input.workflow : undefined;
  const prompts = isRecord(input.prompts) ? input.prompts : undefined;
  const resultContract = isRecord(input.result_contract) ? input.result_contract : undefined;
  const runtimeDisplay = isRecord(input.runtime_display) ? input.runtime_display : undefined;
  const observability = isRecord(input.observability) ? input.observability : undefined;
  const refList = toStringArray(manifest?.promptFragmentRefs || manifest?.prompt_fragment_refs || prompts?.promptFragmentRefs || prompts?.prompt_fragment_refs);
  return {
    ...contract,
    domain: contract.domain || readStringRecordField(manifest, 'domain'),
    slot_schema_ref: contract.slot_schema_ref || readStringRecordField(manifest, 'slotSchemaRef') || readStringRecordField(manifest, 'slot_schema_ref'),
    capability_requirements_ref: contract.capability_requirements_ref || readStringRecordField(manifest, 'capabilityRequirementsRef') || readStringRecordField(manifest, 'capability_requirements_ref'),
    workflow_ref: contract.workflow_ref || readStringRecordField(manifest, 'workflowRef') || readStringRecordField(manifest, 'workflow_ref') || readStringRecordField(workflow, 'workflowRef'),
    prompt_fragment_refs: contract.prompt_fragment_refs?.length ? contract.prompt_fragment_refs : (refList.length ? refList : contract.prompt_fragment_refs),
    result_screen_type: contract.result_screen_type || readStringRecordField(resultContract, 'resultScreenType') || readStringRecordField(resultContract, 'screenType'),
    runtime_display_ref: contract.runtime_display_ref || readStringRecordField(runtimeDisplay, 'runtimeDisplayRef') || readStringRecordField(runtimeDisplay, 'id'),
    observability_ref: contract.observability_ref || readStringRecordField(observability, 'observabilityRef') || readStringRecordField(observability, 'id'),
  };
}

export function mapSkillCategoryToContractCategory(category?: McpSkillCategory): SkillContract['category'] {
  switch (category) {
    case 'data':
      return 'report';
    case 'operation':
      return 'integration';
    case 'monitor':
      return 'monitor';
    case 'analysis':
      return 'analysis';
    case 'integration':
      return 'integration';
    default:
      return 'analysis';
  }
}

export function buildDefaultSkillContract(skill: Partial<McpSkill>): Partial<SkillContract> {
  return {
    skill_id: skill.id || '',
    name: skill.name || '',
    description: skill.description || '',
    category: mapSkillCategoryToContractCategory(skill.category),
    priority: 'P1',
    enabled: Boolean(skill.installed),
    version: `imported-${Date.now()}`,
    intent_triggers: [],
    input_schema: { type: 'object', properties: {} },
    workflow_steps: [],
    output_schema: { type: 'object', properties: {} },
    evaluation_cases: [],
    risk_guardrails: [],
  };
}

export function parseSkillImportPackage(input: unknown): {
  package?: SkillImportPackage;
  preview: SkillImportPreview;
  issues: SkillImportIssue[];
} {
  const issues: SkillImportIssue[] = [];
  if (!isRecord(input)) {
    const issue = { field: 'root', message: '导入内容必须是 JSON 对象', severity: 'error' as const };
    return {
      preview: {
        valid: false,
        kind: 'invalid',
        hasContract: false,
        issues: [issue],
      },
      issues: [issue],
    };
  }

  const skillSource = isRecord(input.skill) ? input.skill : (isSkillLike(input) ? input : undefined);
  const contractSource = isRecord(input.contract) ? input.contract : (isContractLike(input) && !skillSource ? input : undefined);

  if (!skillSource) {
    issues.push({ field: 'skill', message: '请提供 skill 部分', severity: 'error' });
  }

  const skill = skillSource ? { ...skillSource } as Partial<McpSkill> : undefined;
  const contract = contractSource ? { ...contractSource } as Partial<SkillContract> : undefined;

  if (skill && !skill.name) {
    issues.push({ field: 'skill.name', message: '技能名称不能为空', severity: 'error' });
  }
  if (skill && !skill.endpoint_url && !skill.mcp_server_id && !skill.installed_server_id) {
    issues.push({ field: 'skill.endpoint_url', message: '请提供 MCP 地址或已绑定的服务 ID', severity: 'error' });
  }
  if (contract && skill?.id && contract.skill_id && contract.skill_id !== skill.id) {
    issues.push({ field: 'contract.skill_id', message: '编排配置的技能 ID 必须与 Skill 保持一致', severity: 'error' });
  }

  const normalizedContract = skill ? (
    contract
      ? {
          ...buildDefaultSkillContract(skill),
          ...mergeSkillPackageRefs(contract, input),
          skill_id: skill.id || contract.skill_id || '',
          name: contract.name || skill.name || '',
          description: contract.description ?? skill.description ?? '',
          category: contract.category || mapSkillCategoryToContractCategory(skill.category),
          enabled: contract.enabled ?? Boolean(skill.installed),
          version: contract.version || `imported-${Date.now()}`,
          intent_triggers: toStringArray(contract.intent_triggers),
          evaluation_cases: toStringArray(contract.evaluation_cases),
          risk_guardrails: toStringArray(contract.risk_guardrails),
        }
      : buildDefaultSkillContract(skill)
  ) : undefined;

  const preview: SkillImportPreview = {
    valid: !issues.some(item => item.severity === 'error'),
    kind: skill ? (contract ? 'skill-package' : 'skill-only') : 'invalid',
    skillId: skill?.id,
    skillName: skill?.name,
    skillCategory: skill?.category,
    hasContract: Boolean(normalizedContract),
    contractId: normalizedContract?.skill_id,
    contractName: normalizedContract?.name,
    contractEnabled: normalizedContract?.enabled,
    packageRefs: skill ? packageRefItems(input) : [],
    issues,
  };

  return {
    package: skill ? {
      skill,
      contract: normalizedContract,
      replace_existing: Boolean(input.replace_existing),
      source_label: typeof input.source_label === 'string' ? input.source_label : undefined,
    } : undefined,
    preview,
    issues,
  };
}
