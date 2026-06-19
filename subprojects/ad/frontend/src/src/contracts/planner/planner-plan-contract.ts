export const PLANNER_TASK_TYPES = [
  'general_chat', 'data_query', 'knowledge_qa', 'debugging',
  'automation', 'configuration', 'diagnosis', 'explanation', 'multi_step',
] as const;
export type PlannerTaskType = typeof PLANNER_TASK_TYPES[number];

export const PLANNER_SERVICE_INTENTS = [
  'general_chat', 'help_qa', 'data_query', 'issue_diagnosis',
  'system_operation', 'package_fetch', 'integration_workflow',
  'report_summary', 'requirement_drafting', 'clarification',
] as const;
export type PlannerServiceIntent = typeof PLANNER_SERVICE_INTENTS[number];

export const EVIDENCE_MODES = [
  'model_only', 'no_external_evidence_required', 'internal_data_required',
  'knowledge_required', 'web_required', 'file_required', 'task_required',
  'mixed_evidence_required',
] as const;
export type EvidenceMode = typeof EVIDENCE_MODES[number];

export const EVIDENCE_TYPES = [
  'user_input', 'planner_inference', 'tool_result', 'knowledge_source',
  'web_source', 'file_source', 'task_state', 'calculation',
  'model_composition', 'safety_decision',
] as const;
export type EvidenceType = typeof EVIDENCE_TYPES[number];

export const PLANNER_OPERATION_TYPES = ['read', 'write', 'execute', 'navigate', 'none'] as const;
export type PlannerOperationType = typeof PLANNER_OPERATION_TYPES[number];

export const PLANNER_RISK_LEVELS = ['none', 'low', 'medium', 'high', 'critical'] as const;
export type PlannerRiskLevel = typeof PLANNER_RISK_LEVELS[number];

export const PLANNER_SOURCE_POLICIES = ['model_only', 'grounded_only', 'mixed_allowed'] as const;
export type PlannerSourcePolicy = typeof PLANNER_SOURCE_POLICIES[number];

export const PLANNER_DISCLOSURE_POLICIES = ['minimal', 'standard', 'full'] as const;
export type PlannerDisclosurePolicy = typeof PLANNER_DISCLOSURE_POLICIES[number];

export const CLARIFICATION_POLICIES = ['ask_first', 'answer_with_caveat', 'auto_resolve'] as const;
export type ClarificationPolicy = typeof CLARIFICATION_POLICIES[number];

export const WARNING_SEVERITIES = ['info', 'warning', 'error'] as const;
export type WarningSeverity = typeof WARNING_SEVERITIES[number];

export const INPUT_SOURCES = ['user_input', 'context', 'tool_result', 'knowledge', 'default'] as const;
export type InputSource = typeof INPUT_SOURCES[number];

export const PLANNER_FORBIDDEN_OUTPUT_PATHS = [
  'final_tool_arguments', 'mcp_arguments', 'tool_arguments',
  'execute_now', 'bypass_preflight', 'bypass_permission',
  'skip_contract_safety', 'declare_tool_success',
  'fabricated_tool_result', 'fabricated_data', 'final_execution_args',
] as const;

export interface PlanStep {
  step_id: string;
  purpose: string;
  task_type: PlannerTaskType;
  service_intent: PlannerServiceIntent;
  evidence_mode: EvidenceMode;
  required_evidence: string[];
  candidate_capabilities: string[];
  depends_on: string[];
  risk_level: PlannerRiskLevel;
  expected_output: string;
}

export interface SubIntent {
  id: string;
  description: string;
  task_type: PlannerTaskType;
  evidence_mode: EvidenceMode;
  depends_on?: string[];
  candidate_capabilities?: string[];
}

export interface ToolSelectionPrior {
  tool_name: string;
  server_name?: string;
  match_reason: string;
  confidence: number;
  _semantics: 'hint_only_not_executable';
}

export interface CandidateCapability {
  capability_id: string;
  display_name: string;
  match_reason: string;
  confidence: number;
}

export interface PlannerInput {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  source?: InputSource;
}

export interface PlannerWarning {
  code: string;
  message: string;
  severity: WarningSeverity;
}

export interface PlannerAssumption {
  statement: string;
  confidence: number;
  source: string;
}

export interface AnswerPolicy {
  must_ground_facts: boolean;
  allow_model_fallback: boolean;
  clarification_policy: ClarificationPolicy;
}

export interface EvidenceRequirement {
  evidence_type: EvidenceType;
  required: boolean;
  purpose: string;
  min_confidence?: number;
}

export interface PlannerPlanContract {
  plan_id: string;
  version: 'planner-plan/v1';
  user_goal: string;
  task_type: PlannerTaskType;
  service_intent: PlannerServiceIntent;
  operation_type: PlannerOperationType;
  plan_steps: PlanStep[];
  sub_intents: SubIntent[];
  evidence_mode: EvidenceMode;
  required_evidence: string[];
  evidence_requirements: EvidenceRequirement[];
  source_policy: PlannerSourcePolicy;
  candidate_capabilities: CandidateCapability[];
  tool_selection_priors: ToolSelectionPrior[];
  required_inputs: PlannerInput[];
  missing_inputs: PlannerInput[];
  risk_level: PlannerRiskLevel;
  planner_warnings: PlannerWarning[];
  answer_policy: AnswerPolicy;
  confidence: number;
  assumptions: PlannerAssumption[];
  clarification_needed: boolean;
  clarification_question?: string;
  disclosure_policy: PlannerDisclosurePolicy;
  created_at: string;
  planner_model?: string;
  planner_latency_ms?: number;
}
