import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  AdminEvidencePolicy,
  AdminGuardrailLayerPolicy,
  AdminPolicyVersionRef,
  AdminSafetyPolicy,
} from '@/contracts/admin-control-plane';
import { runtimeDataPath } from './runtime-data-path';

const STORE_PATH = runtimeDataPath('evidence-safety-policy.json');

interface EvidenceSafetyPolicyFile {
  evidencePolicy?: Partial<AdminEvidencePolicy>;
  safetyPolicy?: Partial<AdminSafetyPolicy>;
  updatedAt?: string;
}

function checksum(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function versionRef(
  key: string,
  value: unknown,
  updatedAt: string,
  source: AdminPolicyVersionRef['source'] = 'built_in_default',
): AdminPolicyVersionRef {
  return {
    key,
    version: `${key}@${updatedAt}`,
    updatedAt,
    owner: 'admin-control-plane',
    source,
    riskLevel: 'high',
    status: 'active',
    checksum: checksum(value),
  };
}

const INPUT_CHECKS = [
  { code: 'input_pii_china_id_card', name: '身份证号检测', severity: 'error' as const, enabled: true },
  { code: 'input_pii_china_phone', name: '手机号检测', severity: 'error' as const, enabled: true },
  { code: 'input_pii_email', name: '邮箱检测', severity: 'error' as const, enabled: true },
  { code: 'input_injection_ignore_previous', name: 'Prompt 注入检查', severity: 'error' as const, enabled: true },
  { code: 'input_too_long', name: '消息长度检查', severity: 'error' as const, enabled: true },
];

const TOOL_CHECKS = [
  { code: 'tool_input_empty_required_param', name: '必填参数检查', severity: 'warning' as const, enabled: true },
  { code: 'tool_input_sql_injection_pattern', name: 'SQL 注入模式检查', severity: 'error' as const, enabled: true },
  { code: 'tool_output_secret_token', name: '密钥泄露检查', severity: 'error' as const, enabled: true },
  { code: 'tool_output_bearer_token', name: 'Bearer token 泄露检查', severity: 'error' as const, enabled: true },
];

const OUTPUT_CHECKS = [
  { code: 'mojibake_detected', name: '乱码检测', severity: 'error' as const, enabled: true },
  { code: 'source_grounded_without_source', name: '来源引用检查', severity: 'error' as const, enabled: true },
  { code: 'tool_grounded_without_evidence', name: '工具证据检查', severity: 'warning' as const, enabled: true },
  { code: 'model_only_claims_external_evidence', name: '外部证据声明检查', severity: 'error' as const, enabled: true },
  { code: 'unsourced_business_assertion', name: '无证据业务断言检查', severity: 'error' as const, enabled: true },
  { code: 'raw_params_leaked_to_answer', name: '内部参数泄露检查', severity: 'error' as const, enabled: true },
  { code: 'failure_disguised_as_success', name: '失败状态一致性检查', severity: 'error' as const, enabled: true },
];

function mergeLayer(
  fallback: AdminGuardrailLayerPolicy,
  input?: Partial<AdminGuardrailLayerPolicy>,
): AdminGuardrailLayerPolicy {
  return {
    ...fallback,
    ...input,
    enabled: input?.enabled ?? fallback.enabled,
    checks: Array.isArray(input?.checks) && input.checks.length ? input.checks.map((item) => ({
      code: item.code,
      name: item.name,
      severity: item.severity,
      enabled: item.enabled !== false,
    })) : fallback.checks,
  };
}

function defaultSafetyPolicy(updatedAt: string): AdminSafetyPolicy {
  const guardrails = {
    input: { enabled: true, checks: INPUT_CHECKS },
    tool: { enabled: true, checks: TOOL_CHECKS, integration: 'guarded tool call wrapper' },
    output: { enabled: true, checks: OUTPUT_CHECKS },
  };
  return {
    version: versionRef('safety-policy', guardrails, updatedAt),
    guardrails,
  };
}

function defaultEvidencePolicy(updatedAt: string): AdminEvidencePolicy {
  const policy = {
    sources: [
      { type: 'tool_result', description: '工具执行结果', integration_points: ['report query', 'diagnosis skill'], status: 'active' as const },
      { type: 'planner_inference', description: '计划生成和候选路径观测', integration_points: ['planner shadow'], status: 'active' as const },
      { type: 'public_web', description: '公开网络检索结果', integration_points: ['public web runtime'], status: 'active' as const },
      { type: 'knowledge', description: '知识库检索结果', integration_points: [], status: 'planned' as const },
      { type: 'user_input', description: '用户输入和约束', integration_points: [], status: 'planned' as const },
      { type: 'context_history', description: '上下文历史和记忆摘要', integration_points: [], status: 'planned' as const },
    ],
    confidence_levels: [
      { level: 'confirmed_fact', description: '已确认事实' },
      { level: 'high_probability', description: '高概率推断' },
      { level: 'unverified', description: '未验证信息' },
    ],
  };
  return {
    version: versionRef('evidence-policy', policy, updatedAt),
    ...policy,
  };
}

function readPolicyFile(): EvidenceSafetyPolicyFile {
  try {
    if (!existsSync(STORE_PATH)) return {};
    return JSON.parse(readFileSync(STORE_PATH, 'utf8')) as EvidenceSafetyPolicyFile;
  } catch {
    return {};
  }
}

export function getEvidenceSafetyPoliciesSync(): {
  evidencePolicy: AdminEvidencePolicy;
  safetyPolicy: AdminSafetyPolicy;
} {
  const file = readPolicyFile();
  const updatedAt = file.updatedAt || new Date().toISOString();
  const evidenceDefault = defaultEvidencePolicy(updatedAt);
  const safetyDefault = defaultSafetyPolicy(updatedAt);
  const evidencePolicy: AdminEvidencePolicy = {
    ...evidenceDefault,
    ...file.evidencePolicy,
    version: versionRef('evidence-policy', file.evidencePolicy || evidenceDefault, updatedAt, file.evidencePolicy ? 'admin_store' : 'built_in_default'),
    sources: Array.isArray(file.evidencePolicy?.sources) && file.evidencePolicy.sources.length
      ? file.evidencePolicy.sources as AdminEvidencePolicy['sources']
      : evidenceDefault.sources,
    confidence_levels: Array.isArray(file.evidencePolicy?.confidence_levels) && file.evidencePolicy.confidence_levels.length
      ? file.evidencePolicy.confidence_levels
      : evidenceDefault.confidence_levels,
  };
  const safetyPolicy: AdminSafetyPolicy = {
    ...safetyDefault,
    ...file.safetyPolicy,
    version: versionRef('safety-policy', file.safetyPolicy || safetyDefault, updatedAt, file.safetyPolicy ? 'admin_store' : 'built_in_default'),
    guardrails: {
      input: mergeLayer(safetyDefault.guardrails.input, file.safetyPolicy?.guardrails?.input),
      tool: mergeLayer(safetyDefault.guardrails.tool, file.safetyPolicy?.guardrails?.tool),
      output: mergeLayer(safetyDefault.guardrails.output, file.safetyPolicy?.guardrails?.output),
    },
  };
  return { evidencePolicy, safetyPolicy };
}

export async function saveEvidenceSafetyPolicies(
  patch: EvidenceSafetyPolicyFile,
): Promise<{ evidencePolicy: AdminEvidencePolicy; safetyPolicy: AdminSafetyPolicy }> {
  const current = readPolicyFile();
  const next = {
    ...current,
    ...patch,
    evidencePolicy: { ...(current.evidencePolicy || {}), ...(patch.evidencePolicy || {}) },
    safetyPolicy: { ...(current.safetyPolicy || {}), ...(patch.safetyPolicy || {}) },
    updatedAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return getEvidenceSafetyPoliciesSync();
}
