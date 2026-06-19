import type { GovernedModelRouteMode, ModelRouteMode } from './model-route-contract';

export type ModelUseCase =
  | 'request_understanding'
  | 'intent_routing_review'
  | 'chat_answer'
  | 'knowledge_answer'
  | 'query_contract_building'
  | 'entity_candidate_extraction'
  | 'ambiguity_detection'
  | 'resolver_disambiguation_review'
  | 'capability_ranking_review'
  | 'report_summary'
  | 'diagnosis_summary'
  | 'automation_summary'
  | 'requirement_drafting'
  | 'conversation_title'
  | 'recommendation'
  | 'parameter_resolution'
  | 'capability_discovery'
  | 'required_input_assist'
  | 'tool_selection_review'
  | 'data_result_interpretation'
  | 'answer_composition'
  | 'metric_formula_explanation'
  | 'calculation_audit'
  | 'operation_risk_review'
  | 'permission_explanation'
  | 'trace_summary'
  | 'trace_anomaly_review'
  | 'response_contract_review'
  | 'component_binding_suggestion'
  | 'prompt_preview'
  | 'model_connectivity_test'
  | 'prompt_quality_review'
  | 'route_case_explanation'
  | 'config_change_summary'
  | 'release_note_generation'
  | 'planner_shadow';

export type ModelUseCaseCategory = 'user_facing' | 'runtime_assist' | 'governance' | 'test';
export type ModelUseCaseCurrentStatus = 'implemented' | 'planned' | 'shadow_only' | 'not_applicable';
export type ModelAuthority = 'none' | 'observe' | 'explain' | 'suggest' | 'review' | 'decide_with_guard';
export type ModelFallbackPolicy = 'rules' | 'template' | 'invalid_output_fallback' | 'disabled' | 'not_configured';
export type ModelFinalAuthority =
  | 'model_service_router'
  | 'configured_model_gateway'
  | 'tool_contract'
  | 'schema_validator'
  | 'permission_system'
  | 'calculation_engine'
  | 'component_registry'
  | 'trace_runtime'
  | 'template_engine'
  | 'contract_safety'
  | 'human_approval';

export interface ModelUseCaseDefinition {
  useCase: ModelUseCase;
  modelUseCase: ModelUseCase;
  displayName: string;
  node: string;
  routeMode: GovernedModelRouteMode;
  enabled: boolean;
  description: string;
  category: ModelUseCaseCategory;
  currentStatus: ModelUseCaseCurrentStatus;
  defaultEnabled: boolean;
  inputContract: string;
  outputContract: string;
  authority: ModelAuthority;
  finalAuthority: ModelFinalAuthority;
  allowedRouteModes: ModelRouteMode[];
  promptIds: string[];
  fallbackPolicy: ModelFallbackPolicy;
  canAffectToolArgs: false;
  canAffectPermission: false;
  canAffectFinalAnswer: boolean;
  defaultPromptId: string;
  defaultModelRoute: string;
}

const REAL_LLM_ROUTE_MODES: ModelRouteMode[] = [
  'gateway_controlled',
  'direct_external',
  'local_private',
  'template_only',
  'disabled',
];

const ASSIST_ROUTE_MODES: ModelRouteMode[] = [
  'gateway_controlled',
  'direct_external',
  'local_private',
  'template_only',
  'disabled',
  'not_applicable',
];

function defineUseCase(input: Omit<
  ModelUseCaseDefinition,
  'modelUseCase' | 'enabled' | 'canAffectToolArgs' | 'canAffectPermission' | 'defaultPromptId' | 'defaultModelRoute' | 'promptIds'
> & {
  promptIds?: string[];
  defaultPromptId?: string;
  defaultModelRoute?: string;
}): ModelUseCaseDefinition {
  const promptIds = input.promptIds?.length ? input.promptIds : [`model-use-case.${input.useCase}`];
  return {
    ...input,
    modelUseCase: input.useCase,
    enabled: input.defaultEnabled,
    canAffectToolArgs: false,
    canAffectPermission: false,
    promptIds,
    defaultPromptId: input.defaultPromptId || promptIds[0],
    defaultModelRoute: input.defaultModelRoute || input.useCase,
  };
}

function reportUseCase(input: {
  useCase: ModelUseCase;
  displayName: string;
  node: string;
  routeMode: GovernedModelRouteMode;
  description: string;
  inputContract: string;
  outputContract: string;
  authority: ModelAuthority;
  finalAuthority: ModelFinalAuthority;
  canAffectFinalAnswer?: boolean;
  fallbackPolicy?: ModelFallbackPolicy;
  currentStatus?: ModelUseCaseCurrentStatus;
}): ModelUseCaseDefinition {
  return defineUseCase({
    category: input.canAffectFinalAnswer ? 'user_facing' : 'runtime_assist',
    currentStatus: input.currentStatus || 'implemented',
    defaultEnabled: true,
    allowedRouteModes: ASSIST_ROUTE_MODES,
    fallbackPolicy: input.fallbackPolicy || (input.canAffectFinalAnswer ? 'template' : 'rules'),
    canAffectFinalAnswer: Boolean(input.canAffectFinalAnswer),
    ...input,
  });
}

export const GOVERNED_REPORT_QUERY_LLM_NODES: ModelUseCase[] = [
  'request_understanding',
  'intent_routing_review',
  'query_contract_building',
  'entity_candidate_extraction',
  'ambiguity_detection',
  'resolver_disambiguation_review',
  'capability_ranking_review',
  'capability_discovery',
  'required_input_assist',
  'data_result_interpretation',
  'report_summary',
  'diagnosis_summary',
  'answer_composition',
];

export const MODEL_USE_CASE_REGISTRY: ModelUseCaseDefinition[] = [
  reportUseCase({ useCase: 'request_understanding', displayName: '请求结构化理解', node: 'request_understanding', routeMode: 'assist', description: '识别用户目标、指标、时间、维度和歧义，输出受 schema 校验的结构化理解候选。', inputContract: 'raw_message_context', outputContract: 'QueryUnderstandingContract', authority: 'suggest', finalAuthority: 'schema_validator' }),
  reportUseCase({ useCase: 'intent_routing_review', displayName: '意图路由候选', node: 'intent_routing_review', routeMode: 'assist', description: '生成意图路由候选和理由，进入 Planner/Arbitrator；最终路径由执行策略和契约决定。', inputContract: 'message_and_history', outputContract: 'IntentRoutingContract', authority: 'suggest', finalAuthority: 'schema_validator' }),
  reportUseCase({ useCase: 'query_contract_building', displayName: '问数语义契约构建', node: 'query_contract_building', routeMode: 'assist', description: '生成问数语义候选，不生成可执行工具参数。', inputContract: 'report_query_message_context', outputContract: 'QueryUnderstandingContract', authority: 'suggest', finalAuthority: 'tool_contract' }),
  reportUseCase({ useCase: 'entity_candidate_extraction', displayName: '实体候选抽取', node: 'entity_candidate_extraction', routeMode: 'assist', description: '抽取实体候选，候选只进入 Resolver，不直接写最终 ID。', inputContract: 'message_and_semantic_catalogs', outputContract: 'DetectedEntityContract', authority: 'suggest', finalAuthority: 'tool_contract' }),
  reportUseCase({ useCase: 'ambiguity_detection', displayName: '歧义检测', node: 'ambiguity_detection', routeMode: 'assist', description: '辅助识别歧义和追问点，不覆盖必填项和 preflight。', inputContract: 'message_and_resolver_state', outputContract: 'AmbiguityDecisionContract', authority: 'suggest', finalAuthority: 'tool_contract' }),
  reportUseCase({ useCase: 'resolver_disambiguation_review', displayName: 'Resolver 风险检查', node: 'resolver_disambiguation_review', routeMode: 'assist', description: '检查 Resolver 候选风险，不选择最终 ID。', inputContract: 'resolver_candidates', outputContract: 'AmbiguityDecisionContract', authority: 'explain', finalAuthority: 'tool_contract' }),
  reportUseCase({ useCase: 'capability_ranking_review', displayName: '能力排序风险检查', node: 'capability_ranking_review', routeMode: 'assist', description: '说明能力排序风险，不覆盖能力清单和执行策略。', inputContract: 'capability_candidates', outputContract: 'AmbiguityDecisionContract', authority: 'explain', finalAuthority: 'tool_contract' }),
  reportUseCase({ useCase: 'required_input_assist', displayName: '缺参追问辅助', node: 'required_input_assist', routeMode: 'assist', description: '把确定性的缺参原因转成用户可理解的追问。', inputContract: 'blocking_requirements', outputContract: 'GroundedAnswerContract', authority: 'explain', finalAuthority: 'tool_contract', canAffectFinalAnswer: true, fallbackPolicy: 'template' }),
  reportUseCase({ useCase: 'data_result_interpretation', displayName: '数据结果解读', node: 'data_result_interpretation', routeMode: 'grounded_compose', description: '基于工具结果解释趋势和变化，不改事实和数字。', inputContract: 'data_result', outputContract: 'GroundedInterpretationContract', authority: 'explain', finalAuthority: 'calculation_engine', canAffectFinalAnswer: true, fallbackPolicy: 'template' }),
  reportUseCase({ useCase: 'report_summary', displayName: '问数结果总结', node: 'report_summary', routeMode: 'grounded_compose', description: '基于报表工具结果生成摘要，不替代数据事实。', inputContract: 'report_result', outputContract: 'GroundedInterpretationContract', authority: 'explain', finalAuthority: 'calculation_engine', canAffectFinalAnswer: true, fallbackPolicy: 'template' }),
  reportUseCase({ useCase: 'diagnosis_summary', displayName: '诊断总结', node: 'diagnosis_summary', routeMode: 'grounded_compose', description: '基于诊断结果和证据生成总结，不编造原因。', inputContract: 'diagnosis_result', outputContract: 'EvidenceGroundedDiagnosisContract', authority: 'explain', finalAuthority: 'tool_contract', canAffectFinalAnswer: true, fallbackPolicy: 'template' }),
  reportUseCase({ useCase: 'answer_composition', displayName: '问数答案组装', node: 'answer_composition', routeMode: 'grounded_compose', description: '基于已落地语义结果和证据组织答案文本，不控制 ResponseContract 字段。', inputContract: 'report_result_and_message_contract', outputContract: 'GroundedAnswerContract', authority: 'explain', finalAuthority: 'contract_safety', canAffectFinalAnswer: true, fallbackPolicy: 'template' }),

  defineUseCase({ useCase: 'chat_answer', displayName: '开放式回答合成', node: 'chat_answer', routeMode: 'grounded_compose', description: '基于 Planner 上下文、证据账本、变量白名单和回答约束生成开放式主消息；不选择工具、不补事实、不绕过 ContractSafety。', category: 'user_facing', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'open_answer_prompt_variables', outputContract: 'GroundedAnswerContract', authority: 'suggest', finalAuthority: 'contract_safety', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: true }),
  defineUseCase({ useCase: 'knowledge_answer', displayName: '知识证据表达辅助', node: 'knowledge_answer', routeMode: 'grounded_compose', description: '仅基于已过滤知识证据生成候选摘要；source_count 为 0 时不得生成最终主消息。', category: 'user_facing', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'knowledge_evidence_prompt_variables', outputContract: 'GroundedAnswerContract', authority: 'explain', finalAuthority: 'contract_safety', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: true }),
  defineUseCase({ useCase: 'automation_summary', displayName: '自动化任务总结', node: 'automation_summary', routeMode: 'assist', description: '总结自动化任务状态、步骤和产物。', category: 'user_facing', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'automation_task_status', outputContract: 'GroundedAnswerContract', authority: 'explain', finalAuthority: 'trace_runtime', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: true }),
  defineUseCase({ useCase: 'requirement_drafting', displayName: '需求草拟', node: 'requirement_drafting', routeMode: 'assist', description: '把用户描述整理成需求草稿，最终由用户确认。', category: 'user_facing', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'requirement_context', outputContract: 'DraftTextContract', authority: 'suggest', finalAuthority: 'human_approval', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: true }),
  defineUseCase({ useCase: 'conversation_title', displayName: '会话标题', node: 'conversation_title', routeMode: 'assist', description: '生成或更新会话标题。', category: 'user_facing', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'conversation_messages', outputContract: 'TitleTextContract', authority: 'suggest', finalAuthority: 'template_engine', allowedRouteModes: REAL_LLM_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: false, promptIds: ['conversation-title-generate', 'conversation-title-update'] }),
  defineUseCase({ useCase: 'recommendation', displayName: '动态推荐', node: 'recommendation', routeMode: 'assist', description: '根据最近会话、任务和功能状态生成推荐入口。', category: 'user_facing', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'recommendation_context', outputContract: 'RecommendationContract', authority: 'suggest', finalAuthority: 'template_engine', allowedRouteModes: REAL_LLM_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'parameter_resolution', displayName: '参数解析辅助', node: 'parameter_resolution', routeMode: 'disabled', description: '辅助识别参数候选，不替代 Tool required input 校验。', category: 'runtime_assist', currentStatus: 'planned', defaultEnabled: true, inputContract: 'message_and_slots', outputContract: 'slot_suggestions', authority: 'suggest', finalAuthority: 'tool_contract', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'rules', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'capability_discovery', displayName: '能力发现', node: 'capability_discovery', routeMode: 'assist', description: '遍历工具信息理解每个工具的语义能力，识别与用户意图匹配的候选。', category: 'runtime_assist', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'message_and_tool_manifest', outputContract: 'CapabilityUnderstandingContract', authority: 'suggest', finalAuthority: 'tool_contract', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'rules', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'tool_selection_review', displayName: '工具消歧选择', node: 'tool_selection_review', routeMode: 'assist', description: '多工具竞争时，结合用户上下文和能力定义做最终选择。', category: 'runtime_assist', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'tool_candidates', outputContract: 'ToolSelectionDecisionContract', authority: 'decide_with_guard', finalAuthority: 'tool_contract', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'rules', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'metric_formula_explanation', displayName: '指标公式说明', node: 'metric_formula_explanation', routeMode: 'assist', description: '解释指标定义和公式，不改公式真源。', category: 'runtime_assist', currentStatus: 'planned', defaultEnabled: true, inputContract: 'metric_definition', outputContract: 'explanation_text', authority: 'explain', finalAuthority: 'calculation_engine', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: true }),
  defineUseCase({ useCase: 'calculation_audit', displayName: '计算审计', node: 'calculation_audit', routeMode: 'disabled', description: '只读检查计算过程风险，不替代计算引擎。', category: 'runtime_assist', currentStatus: 'shadow_only', defaultEnabled: true, inputContract: 'calculation_trace', outputContract: 'review_notes', authority: 'explain', finalAuthority: 'calculation_engine', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'rules', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'operation_risk_review', displayName: 'MCP 失败解释', node: 'operation_risk_review', routeMode: 'assist', description: '解释 MCP 工具调用失败原因和风险，只能输出观察说明；不得改变工具参数、工具选择或重试策略。', category: 'runtime_assist', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'operation_context', outputContract: 'FailureExplanationContract', authority: 'explain', finalAuthority: 'tool_contract', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'rules', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'permission_explanation', displayName: '权限说明', node: 'permission_explanation', routeMode: 'assist', description: '解释权限阻断原因，不替代权限判断。', category: 'runtime_assist', currentStatus: 'planned', defaultEnabled: true, inputContract: 'permission_result', outputContract: 'explanation_text', authority: 'explain', finalAuthority: 'permission_system', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: true }),
  defineUseCase({ useCase: 'trace_summary', displayName: '多轮状态继承', node: 'trace_summary', routeMode: 'assist', description: '识别多轮对话中本轮的修改意图和应继承的上轮条件，输出结构化继承状态。', category: 'runtime_assist', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'trace_events', outputContract: 'MultiTurnInheritanceContract', authority: 'suggest', finalAuthority: 'tool_contract', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'rules', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'trace_anomaly_review', displayName: '运行异常检查', node: 'trace_anomaly_review', routeMode: 'disabled', description: '说明运行异常风险，不替代观测事实。', category: 'runtime_assist', currentStatus: 'shadow_only', defaultEnabled: true, inputContract: 'trace_events', outputContract: 'review_notes', authority: 'explain', finalAuthority: 'trace_runtime', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'rules', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'response_contract_review', displayName: '回答契约检查', node: 'response_contract_review', routeMode: 'disabled', description: '检查回答封装风险，不替代 validator。', category: 'runtime_assist', currentStatus: 'shadow_only', defaultEnabled: true, inputContract: 'response_contract', outputContract: 'review_notes', authority: 'explain', finalAuthority: 'schema_validator', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'rules', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'component_binding_suggestion', displayName: '组件绑定建议', node: 'component_binding_suggestion', routeMode: 'assist', description: '建议展示组件绑定，不替代 Component Registry。', category: 'runtime_assist', currentStatus: 'planned', defaultEnabled: true, inputContract: 'semantic_result', outputContract: 'binding_suggestions', authority: 'suggest', finalAuthority: 'component_registry', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'prompt_preview', displayName: '提示词预览', node: 'prompt_preview', routeMode: 'assist', description: '预览提示词输出效果。', category: 'governance', currentStatus: 'planned', defaultEnabled: true, inputContract: 'prompt_content', outputContract: 'preview_text', authority: 'suggest', finalAuthority: 'human_approval', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'model_connectivity_test', displayName: '模型连通性测试', node: 'model_connectivity_test', routeMode: 'assist', description: '验证后台配置的模型服务是否可调用。', category: 'test', currentStatus: 'implemented', defaultEnabled: true, inputContract: 'test_prompt', outputContract: 'test_result', authority: 'none', finalAuthority: 'model_service_router', allowedRouteModes: REAL_LLM_ROUTE_MODES, fallbackPolicy: 'disabled', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'prompt_quality_review', displayName: '提示词质量检查', node: 'prompt_quality_review', routeMode: 'assist', description: '检查提示词风险：乱码、过短、缺少 few-shot、中英文混用、变量声明缺失等。由管理员在后台手动触发，不影响主链路。', category: 'governance', currentStatus: 'implemented', defaultEnabled: false, inputContract: 'prompt_content', outputContract: 'review_notes', authority: 'explain', finalAuthority: 'human_approval', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'rules', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'route_case_explanation', displayName: '路由样例解释', node: 'route_case_explanation', routeMode: 'assist', description: '解释路由样例命中原因，不替代路由结果。', category: 'governance', currentStatus: 'planned', defaultEnabled: true, inputContract: 'route_case', outputContract: 'explanation_text', authority: 'explain', finalAuthority: 'schema_validator', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'config_change_summary', displayName: '配置变更摘要', node: 'config_change_summary', routeMode: 'assist', description: '总结配置变更影响，供管理员确认。', category: 'governance', currentStatus: 'planned', defaultEnabled: true, inputContract: 'config_diff', outputContract: 'summary_text', authority: 'explain', finalAuthority: 'human_approval', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: false }),
  defineUseCase({ useCase: 'release_note_generation', displayName: '发布说明生成', node: 'release_note_generation', routeMode: 'assist', description: '根据变更记录生成发布说明草稿。', category: 'governance', currentStatus: 'planned', defaultEnabled: true, inputContract: 'change_log', outputContract: 'release_note_draft', authority: 'suggest', finalAuthority: 'human_approval', allowedRouteModes: ASSIST_ROUTE_MODES, fallbackPolicy: 'template', canAffectFinalAnswer: false }),

  // Planner Shadow - 旁路规划观测，不影响主链
  defineUseCase({
    useCase: 'planner_shadow',
    displayName: 'Planner Shadow 旁路规划',
    node: 'planner_shadow',
    routeMode: 'assist',
    description: '旁路生成 PlannerPlanContract 候选，只记录观测，不接管路由、不选择工具、不执行 MCP。',
    category: 'runtime_assist',
    currentStatus: 'shadow_only',
    defaultEnabled: false,
    inputContract: 'planner_shadow_prompt_variables',
    outputContract: 'PlannerPlanContract',
    authority: 'observe',
    finalAuthority: 'schema_validator',
    allowedRouteModes: ASSIST_ROUTE_MODES,
    fallbackPolicy: 'disabled',
    canAffectFinalAnswer: false,
    promptIds: ['planner-shadow-prompt'],
  }),
];

export const MODEL_USE_CASES = MODEL_USE_CASE_REGISTRY.map((item) => item.useCase);

export function getModelUseCaseDefinition(useCase: string): ModelUseCaseDefinition | undefined {
  return MODEL_USE_CASE_REGISTRY.find((item) => item.useCase === useCase);
}
