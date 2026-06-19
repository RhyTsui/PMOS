import type { ModelUseCase } from './model-use-case-registry';

export type PromptVariableSource =
  | 'request'
  | 'planner_output'
  | 'intent_orch'
  | 'plan_arbitrator'
  | 'evidence_ledger'
  | 'response_contract'
  | 'capability_manifest'
  | 'knowledge_source_policy'
  | 'project_context'
  | 'user_profile'
  | 'memory'
  | 'conversation_history'
  | 'temporal_context'
  | 'admin_config';

export interface PromptVariableSourceSpec {
  name: string;
  source: PromptVariableSource;
  auto_update: boolean;
  freshness_policy?: 'per_request' | 'on_config_change' | 'scheduled' | 'manual';
  redaction?: 'none' | 'summary_only' | 'hash_only' | 'sensitive_fields_removed';
}

export interface PromptVariableSchema {
  use_case: ModelUseCase;
  required_variables: string[];
  optional_variables: string[];
  forbidden_variables: string[];
  required_alias_groups?: Record<string, string[]>;
  variable_sources: PromptVariableSourceSpec[];
}

export interface PromptVariableValidationResult {
  passed: boolean;
  missingRequired: string[];
  forbiddenPaths: string[];
}

const COMMON_FORBIDDEN_VARIABLES = [
  'raw_tool_args',
  'rawToolArgs',
  'raw_tool_result',
  'rawToolResult',
  'intentOrchPlan',
  'mappedParameters',
  'raw_kb_chunks',
  'rawKbChunks',
  'raw_kb_chunks_not_filtered',
  'rawKbChunksNotFiltered',
  'raw_knowledge_hits',
  'rawKnowledgeHits',
  'route_rules',
  'routeRules',
  'tool_priority',
  'toolPriority',
  'raw_stack_trace',
  'rawStackTrace',
  'prompt_hidden_reasoning',
  'promptHiddenReasoning',
  'model_chain_of_thought',
  'modelChainOfThought',
  'full_user_profile',
  'fullUserProfile',
];

const OPEN_ANSWER_OPTIONAL_VARIABLES = [
  'user_role',
  'project_context',
  'user_preferences',
  'memory_items',
  'recent_conversations',
  'capability_summary',
  'assistant_profile',
  'capability_overview',
  'intentorch_candidate',
  'planner_candidates',
  'arbitration_summary',
  'knowledge_hits',
  'public_sources',
  'temporal_context',
  'allowed_actions',
  'domain_context',
  'service_intent',
];

export const PROMPT_VARIABLE_SCHEMAS: Partial<Record<ModelUseCase, PromptVariableSchema>> = {
  chat_answer: {
    use_case: 'chat_answer',
    required_variables: ['user_query', 'planner_output', 'evidence_ledger', 'answer_constraints'],
    optional_variables: OPEN_ANSWER_OPTIONAL_VARIABLES,
    forbidden_variables: COMMON_FORBIDDEN_VARIABLES,
    required_alias_groups: {
      user_query: ['user_query', 'message'],
      planner_output: ['planner_output', 'context', 'route'],
      evidence_ledger: ['evidence_ledger', 'sourceRefs', 'evidenceRefs', 'publicWeb', 'semanticResult', 'context', 'baseAnswer'],
      answer_constraints: ['answer_constraints', 'boundary', 'context', 'baseAnswer'],
    },
    variable_sources: [
      { name: 'user_query', source: 'request', auto_update: true, freshness_policy: 'per_request' },
      { name: 'planner_output', source: 'planner_output', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'intentorch_candidate', source: 'intent_orch', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'planner_candidates', source: 'planner_output', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'arbitration_summary', source: 'plan_arbitrator', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'evidence_ledger', source: 'evidence_ledger', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'capability_summary', source: 'capability_manifest', auto_update: true, freshness_policy: 'on_config_change', redaction: 'summary_only' },
      { name: 'assistant_profile', source: 'admin_config', auto_update: true, freshness_policy: 'on_config_change', redaction: 'summary_only' },
      { name: 'capability_overview', source: 'capability_manifest', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'user_role', source: 'user_profile', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'project_context', source: 'project_context', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'user_preferences', source: 'user_profile', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'memory_items', source: 'memory', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'recent_conversations', source: 'conversation_history', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'temporal_context', source: 'temporal_context', auto_update: true, freshness_policy: 'per_request' },
    ],
  },
  answer_composition: {
    use_case: 'answer_composition',
    required_variables: ['user_query', 'planner_output', 'evidence_ledger', 'answer_constraints'],
    optional_variables: ['semantic_result', 'source_refs', 'evidence_refs', 'allowed_actions'],
    forbidden_variables: COMMON_FORBIDDEN_VARIABLES,
    required_alias_groups: {
      user_query: ['user_query', 'message'],
      planner_output: ['planner_output', 'userRequirement', 'status'],
      evidence_ledger: ['evidence_ledger', 'semanticResult', 'interpretation', 'businessSummary', 'sourceRefs', 'evidenceRefs'],
      answer_constraints: ['answer_constraints', 'baseAnswer', 'status'],
    },
    variable_sources: [
      { name: 'user_query', source: 'request', auto_update: true, freshness_policy: 'per_request' },
      { name: 'planner_output', source: 'planner_output', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'planner_candidates', source: 'planner_output', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'arbitration_summary', source: 'plan_arbitrator', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'evidence_ledger', source: 'evidence_ledger', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'allowed_actions', source: 'response_contract', auto_update: true, freshness_policy: 'per_request' },
    ],
  },
  capability_discovery: {
    use_case: 'capability_discovery',
    required_variables: ['user_query', 'capability_manifest'],
    optional_variables: [
      'userRequirement',
      'entityCandidates',
      'semanticCandidates',
      'intentorch_candidate',
      'planner_candidates',
      'arbitration_summary',
    ],
    forbidden_variables: COMMON_FORBIDDEN_VARIABLES,
    required_alias_groups: {
      user_query: ['user_query', 'message'],
      capability_manifest: ['capability_manifest', 'tools'],
    },
    variable_sources: [
      { name: 'user_query', source: 'request', auto_update: true, freshness_policy: 'per_request' },
      { name: 'capability_manifest', source: 'capability_manifest', auto_update: true, freshness_policy: 'on_config_change', redaction: 'summary_only' },
      { name: 'planner_candidates', source: 'planner_output', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'intentorch_candidate', source: 'intent_orch', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'arbitration_summary', source: 'plan_arbitrator', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
    ],
  },
  knowledge_answer: {
    use_case: 'knowledge_answer',
    required_variables: ['user_query', 'evidence_ledger', 'answer_constraints'],
    optional_variables: ['knowledge_hits', 'source_count', 'knowledge_source_policy'],
    forbidden_variables: COMMON_FORBIDDEN_VARIABLES,
    required_alias_groups: {
      user_query: ['user_query', 'query'],
      evidence_ledger: ['evidence_ledger', 'sourceRefs', 'evidenceRefs', 'sourceCount', 'knowledgeHits', 'baseAnswer'],
      answer_constraints: ['answer_constraints', 'baseAnswer', 'reasons'],
    },
    variable_sources: [
      { name: 'user_query', source: 'request', auto_update: true, freshness_policy: 'per_request' },
      { name: 'evidence_ledger', source: 'evidence_ledger', auto_update: true, freshness_policy: 'per_request', redaction: 'summary_only' },
      { name: 'knowledge_source_policy', source: 'knowledge_source_policy', auto_update: true, freshness_policy: 'on_config_change', redaction: 'summary_only' },
    ],
  },

  // Planner Shadow - 旁路规划观测，不影响主链
  planner_shadow: {
    use_case: 'planner_shadow',
    required_variables: ['message', 'now', 'locale'],
    optional_variables: ['conversation_history'],
    forbidden_variables: [
      ...COMMON_FORBIDDEN_VARIABLES,
      'tool_result',
      'api_response',
      'final_tool_arguments',
      'execute_now',
      'selectedTool',
      'raw_user_private_context',
      'raw_prompt',
      'raw_llm_output',
      'full_planner_plan_contract',
      'resolved_app_id',
      'resolved_media_id',
      'resolved_project_id',
    ],
    required_alias_groups: {
      message: ['message', 'user_query'],
      now: ['now', 'current_time', 'timestamp'],
      locale: ['locale', 'language'],
      conversation_history: ['conversation_history', 'recent_conversations', 'history'],
    },
    variable_sources: [
      {
        name: 'message',
        source: 'request',
        auto_update: true,
        freshness_policy: 'per_request',
        redaction: 'summary_only',
      },
      {
        name: 'now',
        source: 'temporal_context',
        auto_update: true,
        freshness_policy: 'per_request',
      },
      {
        name: 'locale',
        source: 'request',
        auto_update: true,
        freshness_policy: 'per_request',
      },
      {
        name: 'conversation_history',
        source: 'conversation_history',
        auto_update: true,
        freshness_policy: 'per_request',
        redaction: 'summary_only',
      },
    ],
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasTopLevelAny(input: unknown, keys: string[]): boolean {
  if (!isRecord(input)) return false;
  return keys.some((key) => input[key] !== undefined && input[key] !== null && input[key] !== '');
}

function collectForbiddenPaths(value: unknown, forbidden: Set<string>, path: string[] = []): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenPaths(item, forbidden, [...path, String(index)]));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const currentPath = [...path, key];
    const own = forbidden.has(key) ? [currentPath.join('.')] : [];
    return [...own, ...collectForbiddenPaths(nested, forbidden, currentPath)];
  });
}

export function getPromptVariableSchema(useCase: ModelUseCase): PromptVariableSchema | undefined {
  return PROMPT_VARIABLE_SCHEMAS[useCase];
}

export function validatePromptVariables(useCase: ModelUseCase, input: unknown): PromptVariableValidationResult {
  const schema = getPromptVariableSchema(useCase);
  if (!schema) return { passed: true, missingRequired: [], forbiddenPaths: [] };
  const forbiddenPaths = collectForbiddenPaths(input, new Set(schema.forbidden_variables));
  const missingRequired = schema.required_variables.filter((variable) => {
    const aliases = schema.required_alias_groups?.[variable] || [variable];
    return !hasTopLevelAny(input, aliases);
  });
  return {
    passed: missingRequired.length === 0 && forbiddenPaths.length === 0,
    missingRequired,
    forbiddenPaths,
  };
}
