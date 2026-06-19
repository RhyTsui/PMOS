/**
 * ServiceIntent Execution Policy
 *
 * 定义每个 serviceIntent 对应的执行类别、允许/禁止的 capability purpose。
 * 用于：
 * 1. shouldEnterReportExecution() 门控判定
 * 2. capability selection 候选过滤
 * 3. evidence source policy 驱动
 */

// ─── Capability Purpose ────────────────────────────────────

export type CapabilityPurpose =
  | 'report_execution'        // 查数、跑报表、拉业务数据
  | 'dictionary_lookup'       // 字段字典、指标口径、枚举解释
  | 'schema_lookup'           // 报表 schema、字段 displayName
  | 'diagnostic_evidence'     // 诊断证据采集
  | 'workflow_execution';     // 联调、包操作、系统操作

// ─── Execution Category ────────────────────────────────────

export type ServiceIntentExecutionCategory =
  | 'non_execution'
  | 'execution'
  | 'evidence_execution'
  | 'workflow_execution';

// ─── Policy Interface ──────────────────────────────────────

export interface ServiceIntentExecutionPolicy {
  serviceIntent: string;
  category: ServiceIntentExecutionCategory;
  allowedPurposes: CapabilityPurpose[];
  blockedPurposes: CapabilityPurpose[];
  requiresToolExecution: boolean;
}

// ─── Policy Table ──────────────────────────────────────────

const ALL_PURPOSES: CapabilityPurpose[] = [
  'report_execution',
  'dictionary_lookup',
  'schema_lookup',
  'diagnostic_evidence',
  'workflow_execution',
];

const POLICY_TABLE: Record<string, ServiceIntentExecutionPolicy> = {
  general_chat: {
    serviceIntent: 'general_chat',
    category: 'non_execution',
    allowedPurposes: [],
    blockedPurposes: [...ALL_PURPOSES],
    requiresToolExecution: false,
  },
  help_qa: {
    serviceIntent: 'help_qa',
    category: 'non_execution',
    allowedPurposes: ['dictionary_lookup', 'schema_lookup'],
    blockedPurposes: ['report_execution', 'diagnostic_evidence', 'workflow_execution'],
    requiresToolExecution: false,
  },
  field_definition: {
    serviceIntent: 'field_definition',
    category: 'non_execution',
    allowedPurposes: ['dictionary_lookup', 'schema_lookup'],
    blockedPurposes: ['report_execution', 'diagnostic_evidence', 'workflow_execution'],
    requiresToolExecution: false,
  },
  knowledge_answer: {
    serviceIntent: 'knowledge_answer',
    category: 'non_execution',
    allowedPurposes: ['dictionary_lookup', 'schema_lookup'],
    blockedPurposes: ['report_execution', 'diagnostic_evidence', 'workflow_execution'],
    requiresToolExecution: false,
  },
  light_requirement: {
    serviceIntent: 'light_requirement',
    category: 'non_execution',
    allowedPurposes: [],
    blockedPurposes: ['report_execution', 'diagnostic_evidence', 'workflow_execution'],
    requiresToolExecution: false,
  },
  data_query: {
    serviceIntent: 'data_query',
    category: 'execution',
    allowedPurposes: ['report_execution', 'dictionary_lookup', 'schema_lookup'],
    blockedPurposes: [],
    requiresToolExecution: true,
  },
  report_delivery: {
    serviceIntent: 'report_delivery',
    category: 'execution',
    allowedPurposes: ['report_execution'],
    blockedPurposes: [],
    requiresToolExecution: true,
  },
  package_fetch: {
    serviceIntent: 'package_fetch',
    category: 'execution',
    allowedPurposes: ['workflow_execution'],
    blockedPurposes: ['report_execution'],
    requiresToolExecution: true,
  },
  issue_diagnosis: {
    serviceIntent: 'issue_diagnosis',
    category: 'evidence_execution',
    allowedPurposes: ['diagnostic_evidence', 'report_execution', 'dictionary_lookup'],
    blockedPurposes: [],
    requiresToolExecution: true,
  },
  integration_workflow: {
    serviceIntent: 'integration_workflow',
    category: 'workflow_execution',
    allowedPurposes: ['workflow_execution'],
    blockedPurposes: ['report_execution'],
    requiresToolExecution: true,
  },
  system_operation: {
    serviceIntent: 'system_operation',
    category: 'workflow_execution',
    allowedPurposes: ['workflow_execution'],
    blockedPurposes: ['report_execution'],
    requiresToolExecution: true,
  },
};

const DEFAULT_POLICY: ServiceIntentExecutionPolicy = POLICY_TABLE.general_chat;

// ─── Public API ────────────────────────────────────────────

export function getServiceIntentExecutionPolicy(
  serviceIntent: string | undefined | null,
): ServiceIntentExecutionPolicy {
  if (!serviceIntent) return DEFAULT_POLICY;
  return POLICY_TABLE[serviceIntent] || DEFAULT_POLICY;
}

export function isCapabilityPurposeAllowed(
  serviceIntent: string | undefined | null,
  purpose: CapabilityPurpose,
): boolean {
  const policy = getServiceIntentExecutionPolicy(serviceIntent);
  if (policy.blockedPurposes.includes(purpose)) return false;
  if (policy.allowedPurposes.length > 0 && !policy.allowedPurposes.includes(purpose)) return false;
  return true;
}

/**
 * 从 capabilityType + toolPurpose 推断 capabilityPurpose（向后兼容）。
 */
export function inferCapabilityPurpose(params: {
  capabilityType?: string;
  toolPurpose?: string;
}): CapabilityPurpose {
  const { capabilityType, toolPurpose } = params;
  if (capabilityType === 'data.report') return 'report_execution';
  if (capabilityType === 'data.dictionary') return 'dictionary_lookup';
  if (toolPurpose === 'data_fetch' || toolPurpose === 'report_generate') return 'report_execution';
  if (toolPurpose === 'field_lookup' || toolPurpose === 'help_lookup') return 'dictionary_lookup';
  if (toolPurpose === 'evidence_fetch') return 'diagnostic_evidence';
  if (toolPurpose === 'package_fetch') return 'workflow_execution';
  if (toolPurpose === 'integration_run' || toolPurpose === 'config_check') return 'workflow_execution';
  return 'report_execution';
}
