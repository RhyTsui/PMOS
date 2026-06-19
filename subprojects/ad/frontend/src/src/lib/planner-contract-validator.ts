import {
  PLANNER_TASK_TYPES,
  PLANNER_SERVICE_INTENTS,
  PLANNER_OPERATION_TYPES,
  EVIDENCE_MODES,
  PLANNER_RISK_LEVELS,
  PLANNER_SOURCE_POLICIES,
  PLANNER_DISCLOSURE_POLICIES,
  PLANNER_FORBIDDEN_OUTPUT_PATHS,
} from '@/contracts/planner/planner-plan-contract';

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface PlannerContractValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const REQUIRED_FIELDS: readonly string[] = [
  'plan_id', 'version', 'user_goal', 'task_type', 'service_intent',
  'operation_type', 'plan_steps', 'sub_intents', 'evidence_mode',
  'required_evidence', 'evidence_requirements', 'source_policy',
  'candidate_capabilities', 'tool_selection_priors', 'required_inputs',
  'missing_inputs', 'risk_level', 'planner_warnings', 'answer_policy',
  'confidence', 'assumptions', 'clarification_needed', 'disclosure_policy',
  'created_at',
];

const ALLOWED_TOP_LEVEL = new Set<string>([
  ...REQUIRED_FIELDS,
  'clarification_question', 'planner_model', 'planner_latency_ms',
]);

const FORBIDDEN_IN_TOOL_PRIOR = ['selectedTool', 'executableTool', 'finalTool'];

const EVIDENCE_MODE_REQUIRED_TYPE: Record<string, string> = {
  internal_data_required: 'tool_result',
  web_required: 'web_source',
  knowledge_required: 'knowledge_source',
  file_required: 'file_source',
  task_required: 'task_state',
};

const NO_EXTERNAL_EVIDENCE_MODES = ['model_only', 'no_external_evidence_required'];
const NO_EXTERNAL_EVIDENCE_TYPES = ['tool_result', 'web_source', 'task_state'];

export function validatePlannerPlanContract(input: unknown): PlannerContractValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  function addError(code: string, p: string, message: string): void {
    errors.push({ code, path: p, message });
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    addError('invalid_input', '$', 'input must be a non-null object');
    return { valid: false, errors, warnings };
  }

  const obj = input as Record<string, unknown>;

  // Required fields check
  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) {
      addError('missing_required', '$.' + field, 'required field missing: ' + field);
    }
  }

  // Unknown fields check
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_TOP_LEVEL.has(key)) {
      addError('unknown_field', '$.' + key, 'unknown top-level field: ' + key);
    }
  }

  // Version check
  if (obj.version !== 'planner-plan/v1') {
    addError('invalid_version', '$.version', 'version must be planner-plan/v1, got ' + String(obj.version));
  }

  // Confidence check
  if (typeof obj.confidence === 'number') {
    if (obj.confidence < 0 || obj.confidence > 1 || !Number.isFinite(obj.confidence)) {
      addError('invalid_confidence', '$.confidence', 'confidence must be 0-1, got ' + obj.confidence);
    }
  }

  // Enum checks
  checkEnum(obj.task_type, PLANNER_TASK_TYPES, 'task_type');
  checkEnum(obj.service_intent, PLANNER_SERVICE_INTENTS, 'service_intent');
  checkEnum(obj.operation_type, PLANNER_OPERATION_TYPES, 'operation_type');
  checkEnum(obj.evidence_mode, EVIDENCE_MODES, 'evidence_mode');
  checkEnum(obj.source_policy, PLANNER_SOURCE_POLICIES, 'source_policy');
  checkEnum(obj.risk_level, PLANNER_RISK_LEVELS, 'risk_level');
  checkEnum(obj.disclosure_policy, PLANNER_DISCLOSURE_POLICIES, 'disclosure_policy');

  function checkEnum(value: unknown, allowed: readonly string[], fieldName: string): void {
    if (typeof value === 'string' && !allowed.includes(value)) {
      addError('invalid_enum', '$.' + fieldName, 'invalid ' + fieldName + ': ' + value);
    }
  }

  // Tool selection priors check
  if (Array.isArray(obj.tool_selection_priors)) {
    for (let i = 0; i < obj.tool_selection_priors.length; i++) {
      const item = obj.tool_selection_priors[i];
      const prefix = '$.tool_selection_priors[' + i + ']';
      
      if (!item || typeof item !== 'object') {
        addError('invalid_tool_prior', prefix, 'must be an object');
        continue;
      }
      
      const tp = item as Record<string, unknown>;
      if (tp._semantics !== 'hint_only_not_executable') {
        addError('invalid_tool_prior_semantics', prefix + '._semantics', 'must be hint_only_not_executable');
      }
      
      for (const forbidden of FORBIDDEN_IN_TOOL_PRIOR) {
        if (forbidden in tp) {
          addError('tool_prior_not_executable', prefix + '.' + forbidden,
            'tool_selection_prior must not contain ' + forbidden);
        }
      }
    }
  }

  // Forbidden output paths
  for (const fPath of PLANNER_FORBIDDEN_OUTPUT_PATHS) {
    if (fPath in obj) {
      addError('forbidden_output_path', '$.' + fPath, 'Planner must not output: ' + fPath);
    }
  }

  // Evidence mode consistency
  const evidenceMode = typeof obj.evidence_mode === 'string' ? obj.evidence_mode : '';
  const evidenceReqs = Array.isArray(obj.evidence_requirements) ? obj.evidence_requirements as unknown[] : [];
  const reqEvidenceTypes: string[] = evidenceReqs
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .filter(r => r.required === true)
    .map(r => typeof r.evidence_type === 'string' ? r.evidence_type : '')
    .filter(Boolean);

  if (NO_EXTERNAL_EVIDENCE_MODES.includes(evidenceMode)) {
    for (const t of NO_EXTERNAL_EVIDENCE_TYPES) {
      if (reqEvidenceTypes.includes(t)) {
        addError('evidence_mode_conflict', '$.evidence_requirements',
          evidenceMode + ' must not require ' + t);
      }
    }
  }

  for (const mode of Object.keys(EVIDENCE_MODE_REQUIRED_TYPE)) {
    const requiredType = EVIDENCE_MODE_REQUIRED_TYPE[mode];
    if (evidenceMode === mode && !reqEvidenceTypes.includes(requiredType)) {
      addError('evidence_mode_missing_type', '$.evidence_requirements',
        mode + ' must require ' + requiredType);
    }
  }

  if (evidenceMode === 'mixed_evidence_required') {
    const uniqueTypes = new Set(reqEvidenceTypes);
    if (uniqueTypes.size < 2) {
      addError('mixed_evidence_insufficient', '$.evidence_requirements',
        'mixed_evidence_required needs at least 2 evidence types');
    }
  }

  // Planner fabrication check
  for (const field of ['fabricated_tool_result', 'declare_tool_success', 'execute_now']) {
    if (field in obj) {
      addError('planner_fabrication', '$.' + field, 'Planner must not produce execution results');
    }
  }

  // Input value check
  for (const listName of ['required_inputs', 'missing_inputs'] as const) {
    const list = obj[listName];
    if (Array.isArray(list)) {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item && typeof item === 'object' && 'value' in (item as Record<string, unknown>)) {
          addError(
            'input_has_value',
            '$.' + listName + '[' + i + '].value',
            listName + ' must not contain value field',
          );
        }
      }
    }
  }

  // Plan steps check
  if (Array.isArray(obj.plan_steps) && obj.plan_steps.length === 0) {
    addError('empty_plan_steps', '$.plan_steps', 'plan_steps must have at least 1 step');
  }

  return { valid: errors.length === 0, errors, warnings };
}
