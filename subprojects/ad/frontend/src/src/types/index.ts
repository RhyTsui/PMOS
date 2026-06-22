// 小乔智投 Type Definitions
// Based on: 数据对象真源, 接口真源, 使用帮助设计, 会话支撑能力设计, 提示词管理设计
// ==========================================
// Core Enums
// ==========================================

/** 意图类型（四条业务流 + 专项 + 通用） */
export type IntentType = 'help' | 'report_query' | 'demand' | 'diagnosis' | 'debugging' | 'get_delivery_packages' | 'monitor' | 'forecast' | 'general';

/** Agent 类型 */
export type AgentType = 'hub' | 'help' | 'report' | 'demand' | 'diagnosis' | 'debugging' | 'delivery' | 'monitoring' | 'material' | 'prediction';

/** 任务状态（数据对象真源 5.5） */
export type TaskStatus = 'created' | 'clarifying' | 'running' | 'waiting' | 'completed' | 'archived' | 'downgraded';

/** 工作流层级（数据对象真源 5.4） */
export type WorkflowLevel = 'light' | 'heavy';

/** 任务所有者类型（数据对象真源 5.6） */
export type OwnerType = 'xiaoqiao' | 'sub-agent' | 'human-escalation';

/** 消息类型（数据对象真源 4.3 + Chat-first Task Center 扩展） */
export type MessageType =
  | 'user_input'
  | 'assistant_reply'
  | 'clarification'
  | 'system_notice'
  | 'workflow_summary'
  | 'task_proposal'
  | 'task_created'
  | 'task_updated'
  | 'task_paused'
  | 'task_resumed'
  | 'task_deleted'
  | 'task_run_started'
  | 'task_run_completed'
  | 'task_run_failed'
  | 'task_run_skipped'
  | 'task_needs_action';

export type PresentationMessageType =
  | 'chat'
  | 'report_query'
  | 'diagnosis'
  | 'debugging'
  | 'delivery'
  | 'workflow';

export type ProcessEventStatus = 'running' | 'success' | 'error' | 'waiting' | 'rejected';

export type ProcessEventVisibility = 'user' | 'internal' | 'debug';

export type ProcessEventType =
  | 'intent.detected'
  | 'route.resolved'
  | 'route_observation'
  | 'context.prepared'
  | 'planner.arbitrated'
  | 'capability.checked'
  | 'clarify.requested'
  | 'clarify.submitted'
  | 'skill.selected'
  | 'skill.started'
  | 'skill.step'
  | 'skill.finished'
  | 'skill.failed'
  | 'mcp.tool_call'
  | 'mcp.tool_result'
  | 'mcp.tool_error'
  | 'fallback_attempt'
  | 'fallback_skipped'
  | 'fallback_success'
  | 'fallback_failed'
  | 'knowledge.search'
  | 'knowledge.result'
  | 'knowledge.rejected'
  | 'web.search'
  | 'web.result'
  | 'intent_orch.enhanced'
  | 'intent_orch.candidate'
  | 'model.step'
  | 'source.attached'
  | 'ui.component_rendered'
  | 'answer.delta'
  | 'answer.final'
  | 'planner_shadow_observation'
  | 'stage.started'
  | 'stage.ended'
  | 'stage.error';

export interface SourceRef {
  id?: string;
  title: string;
  source: string;
  url?: string;
  source_type: 'knowledge_base' | 'report_mcp' | 'mcp' | 'skill' | 'web_search' | 'web_fetch' | 'manual';
  report_name?: string;
  icon?: 'knowledge' | 'report_mcp' | 'mcp' | 'skill' | 'web_search' | 'web_fetch' | 'manual' | string;
  snippet?: string;
  prompt?: string;
  status?: ProcessEventStatus;
}

export interface AgentProcessEvent {
  id: string;
  run_id?: string;
  conversation_id?: string;
  message_id?: string;
  type: ProcessEventType;
  label: string;
  status: ProcessEventStatus;
  visibility: ProcessEventVisibility;
  summary?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  agent?: AgentType | string;
  intent_type?: IntentType | string;
  skill_id?: string;
  skill_name?: string;
  tool_name?: string;
  provider?: string;
  source_refs?: SourceRef[];
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  prompt?: string;
  ui_component?: {
    type:
      | 'clarification_form'
      | 'metric_explainer'
      | 'debug_workbench'
      | 'inspection_result'
      | 'diagnosis_report'
      | 'tracking_link_card'
      | 'report_template'
      | 'data_preview'
      | 'source_detail'
      | string;
    title?: string;
    payload?: Record<string, unknown>;
  };
}

export interface SkillContract {
  skill_id: string;
  name: string;
  description?: string;
  domain?: string;
  category: 'help' | 'diagnosis' | 'debugging' | 'report' | 'monitor' | 'integration' | 'analysis';
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  enabled?: boolean;
  version?: string;
  intent_triggers: string[];
  input_schema: Record<string, unknown>;
  clarification_schema?: Record<string, unknown>;
  slot_schema_ref?: string;
  capability_requirements_ref?: string;
  workflow_ref?: string;
  prompt_fragment_refs?: string[];
  result_screen_type?: string;
  runtime_display_ref?: string;
  observability_ref?: string;
  default_inputs?: Record<string, unknown>;
  selection_policy?: {
    requires_trigger_match_for_route_bonus?: boolean;
  };
  workflow_steps: Array<{
    key: string;
    label: string;
    tool_bindings?: string[];
    ui_component?: string;
  }>;
  output_schema: Record<string, unknown>;
  evaluation_cases: string[];
  risk_guardrails?: string[];
  created_at?: number;
  updated_at?: number;
}

export interface SkillImportPackage {
  skill?: Partial<McpSkill>;
  contract?: Partial<SkillContract>;
  manifest?: Record<string, unknown>;
  workflow?: Record<string, unknown>;
  prompts?: Record<string, unknown>;
  golden_cases?: Record<string, unknown>;
  result_contract?: Record<string, unknown>;
  runtime_display?: Record<string, unknown>;
  observability?: Record<string, unknown>;
  replace_existing?: boolean;
  source_label?: string;
}

export interface SkillImportIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface SkillImportPreview {
  valid: boolean;
  kind: 'skill-package' | 'skill-only' | 'invalid';
  skillId?: string;
  skillName?: string;
  skillCategory?: McpSkillCategory;
  hasContract: boolean;
  contractId?: string;
  contractName?: string;
  contractEnabled?: boolean;
  packageRefs?: Array<{ key: string; ref?: string; count?: number }>;
  issues: SkillImportIssue[];
}

export interface SkillImportResult {
  skill: McpSkill;
  contract: SkillContract;
  created: {
    skill: boolean;
    contract: boolean;
  };
  warnings: string[];
}

/** 置信度（数据对象真源 7） */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** 证据来源类型（数据对象真源 8.3） */
export type EvidenceSourceType = 'upload' | 'knowledge' | 'media-data' | 'callback-log' | 'client-log' | 'report';

/** 附件类型（会话支撑能力设计 6.1） */
export type AttachmentKind = 'image' | 'video' | 'document' | 'table' | 'log';

/** 附件上传状态（会话支撑能力设计 8.2） */
export type AttachmentStatus = 'uploading' | 'uploaded' | 'parsing' | 'parsed' | 'upload_failed' | 'parse_failed';

export type AttachmentContentType =
  | 'report_table'
  | 'report_screenshot'
  | 'spreadsheet'
  | 'document_screenshot'
  | 'error_screenshot'
  | 'config_screenshot'
  | 'person_photo'
  | 'plain_image'
  | 'log_text'
  | 'document'
  | 'unknown';

export type AttachmentFieldRole = 'metric' | 'dimension' | 'date' | 'filter' | 'unknown';

export interface AttachmentFieldCandidate {
  key: string;
  label: string;
  role: AttachmentFieldRole;
  confidence: ConfidenceLevel;
  source: string;
  sample_values?: string[];
}

export interface AttachmentTableInsight {
  sheet_name: string;
  row_count: number;
  column_count: number;
  headers: string[];
  sample_rows: Array<Record<string, string>>;
}

export interface ReportRequirementDraft {
  source_attachment_ids: string[];
  intent: 'report_query' | 'template_build' | 'unknown';
  metrics: string[];
  dimensions: string[];
  filters: Record<string, string[]>;
  date_range?: { start_date?: string; end_date?: string; raw?: string };
  unsupported_metrics: string[];
  missing_fields: string[];
  display: 'table' | 'chart' | 'mixed';
  merge_policy: {
    mode: 'append_or_update';
    metric_strategy: 'union_by_name';
    dimension_strategy: 'union_by_name';
    output: 'single_table';
  };
}

export interface AttachmentInsight {
  attachment_id: string;
  parser_version: string;
  parser_type: 'image_basic' | 'vision_provider' | 'spreadsheet' | 'text' | 'unsupported';
  status: 'parsed' | 'partial' | 'failed';
  content_type: AttachmentContentType;
  summary: string;
  llm_assisted?: boolean;
  llm_use_case?: string;
  llm_prompt_id?: string;
  llm_model?: string;
  llm_participation?: ModelParticipationRecord;
  analysis_state?: 'parsed' | 'needs_confirmation' | 'ready_for_query' | 'failed';
  needs_confirmation?: boolean;
  candidate_questions?: string[];
  missing_parameters?: string[];
  ambiguity_reasons?: string[];
  next_action?: 'ask_user' | 'run_query' | 'generate_draft' | 'review_only';
  parse_summary?: string;
  extracted_text?: string;
  keywords: string[];
  tables: AttachmentTableInsight[];
  fields: AttachmentFieldCandidate[];
  metrics: string[];
  dimensions: string[];
  date_ranges: string[];
  limitations: string[];
  report_requirement?: ReportRequirementDraft;
  updated_at: string;
}

/** 结果类型（数据对象真源 7.3） */
export type ResultType = 'help_answer' | 'report_query_result' | 'diagnosis_report' | 'demand_form' | 'debugging_report' | 'delivery_packages' | 'monitor_snapshot' | 'forecast_report';

/** 会话当前模式（数据对象真源 3.3） */
export type ConversationMode = 'natural-chat' | 'light-workflow' | 'heavy-workflow';

/** 会话状态（设计文档 6.2） */
export type ConversationStatus = '普通对话' | '帮助中' | '排查中' | '需求沟通中' | '联调中' | '执行中';

/** 系统状态（设计文档 6.1） */
export type SystemStatus = '可用' | '繁忙' | '降级';

// ==========================================
// Core Business Objects (数据对象真源)
// ==========================================

/** 会话对象（数据对象真源 3） */
export interface Conversation {
  conversation_id: string;
  user_id: string;
  title: string;
  status: ConversationStatus;
  started_at: string;
  updated_at: string;
  last_message_at: string;
  current_mode: ConversationMode;
  project_binding?: ProjectBinding;
  // 前端扩展
  message_count?: number;
  latest_task_id?: string;
  /** Chat-first Task Center: 会话类型 */
  conversation_type?: 'normal' | 'automation';
  /** Chat-first Task Center: 任务状态角标 */
  task_badge?: {
    task_id: string;
    status: 'active' | 'paused' | 'failed' | 'needs_action';
    label: string;
    next_run_at?: string;
  };
  /** Chat-first Task Center: 未读自动化结果 */
  unread_automation?: {
    count: number;
    latest_run_id: string;
    latest_message_id: string;
    severity: 'info' | 'success' | 'warning' | 'error';
    label: string;
  };
}

/** 消息对象（数据对象真源 4） */
export interface Message {
  message_id: string;
  thread_id?: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: MessageType;
  created_at: string;
  related_task_id?: string;
  // 前端扩展
  id: string; // 前端内部 ID (兼容现有组件)
  timestamp: number; // 前端时间戳
  agent?: AgentType;
  intent_type?: IntentType;
  routing?: RoutingDecision;
  task_id?: string;
  attachments?: AttachmentRecord[];
  /** Agent 运行时元数据: tool_calls/route 等 */
  metadata?: Record<string, unknown>;
  thinking?: string;
  thinking_steps?: Array<{
    key?: string;
    label: string;
    content: string;
    status: 'completed' | 'error' | 'loading' | 'skipped' | 'waiting';
    duration_ms?: number;
    started_at?: number;
    input?: unknown;
    output?: unknown;
  }>;
  /** 统一 Agent 运行事件：Skill / MCP / 知识库 / 来源 / 组件 / 回答 */
  process_events?: AgentProcessEvent[];
  /** 工具调用列表 (来自 SSE tool_call 事件) */
  tool_calls?: {
    name: string;
    type?: string;
    kind?: 'skill' | 'mcp' | 'knowledge' | 'web_search' | 'model' | string;
    status?: string;
    arguments?: string;
    result?: string;
    display_name?: string;
    provider_url?: string;
    prompt?: string;
    step_key?: string;
  }[];
  /** 缺失字段 (来自 SSE done 事件) */
  missing_fields?: MissingField[];
  /** 证据ID列表 */
  evidence_ids?: string[];
  /** 路由决策 (来自 SSE route 事件) */
  routing_decision?: RoutingDecision;
  trace_id?: string;
  sdk_trace_id?: string;
  local_trace_id?: string;
  turn_id?: string;
}

/** 路由决策对象（数据对象真源 10） */
export interface RoutingDecision {
  routing_id?: string;
  conversation_id?: string;
  source_message_id?: string;
  is_business_related: boolean;
  business_domain: string;
  intent_type: IntentType;
  workflow_level: WorkflowLevel;
  decision_reason: string;
  clarification_needed: boolean;
  created_at?: string;
  // 前端扩展
  confidence: number;
}

/** 任务对象（数据对象真源 5） */
export interface Task {
  task_id: string;
  conversation_id: string;
  task_type: IntentType;
  workflow_level: WorkflowLevel;
  status: TaskStatus;
  owner_type: OwnerType;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  // 前端扩展
  id: string; // 兼容: task_id
  title: string;
  summary?: string;
}

/** 任务上下文对象（数据对象真源 6） */
export interface TaskContext {
  task_id: string;
  is_business_related?: boolean;
  business_domain?: string;
  intent_type?: IntentType;
  media?: string;
  app?: string;
  plan_id?: string;
  device_id?: string;
  time_range?: string;
  target_date?: string;
  anomaly_type?: string;
  demand_type?: string;
  account?: string;
  attachments: string[];
  missing_fields: MissingField[];
}

/** 缺失字段（会话支撑能力设计 + 需求沟通设计） */
export interface MissingField {
  field_key: string;
  field_label: string;
  field_group?: string;
  priority?: 'required' | 'recommended' | 'optional';
  why_required: string;
  suggested_question: string;
  source?: string;
}

/** 工作流结果对象（数据对象真源 7） */
export interface WorkflowResult {
  [key: string]: unknown;
  result_id?: string;
  task_id: string;
  result_type: ResultType;
  /** @deprecated Use business_summary.brief in MessageContract. */
  summary?: string;
  answer?: string;
  business_summary?: BusinessSummary;
  message_contract?: MessageContract;
  runtime_state?: RuntimeState;
  answer_policy?: AnswerPolicy;
  evidence_bundle?: Record<string, unknown>;
  execution_context?: Record<string, unknown>;
  agent_runtime?: Record<string, unknown>;
  reasoning_artifacts?: Record<string, unknown>;
  structured_payload: HelpResult | DemandResult | DiagnosisResult | DebuggingResult | Record<string, unknown>;
  confidence?: ConfidenceLevel;
  next_action?: string;
  created_at: string;
  // 前端扩展 (兼容)
  kind: IntentType;
  next_actions: string[];
  pending_checks: string[];
}

export type ResultStatus =
  | 'success'
  | 'empty'
  | 'partial'
  | 'missing_input'
  | 'blocked'
  | 'failed'
  | 'degraded'
  | 'not_configured';

export type ResponseConfidenceLevel = ConfidenceLevel | 'unknown';

export interface ResponseConfidence {
  level: ResponseConfidenceLevel;
  basis?: 'evidence' | 'source' | 'tool' | 'model' | 'mixed' | 'policy';
  score?: number;
  reason?: string;
}

export interface ToolCallTrace {
  id: string;
  name: string;
  kind?: 'mcp' | 'api' | 'knowledge' | 'public_web' | 'file' | 'model' | string;
  status: ResultStatus | ProcessEventStatus | string;
  duration_ms?: number;
  input_summary?: string;
  output_summary?: string;
  trace_id?: string;
  source_ref_ids?: string[];
}

export type EvidenceMode =
  | 'model_only'
  | 'no_external_evidence_required'
  | 'knowledge_grounded'
  | 'source_grounded'
  | 'tool_grounded'
  | 'mixed_grounded'
  | 'insufficient_evidence';

export interface ContractSafetyIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
}

export interface ContractSafetyResult {
  status: 'passed' | 'degraded' | 'blocked';
  checked_at: string;
  issues: ContractSafetyIssue[];
  disclaimers: string[];
}

export interface MessagePart {
  id: string;
  type: 'text' | 'timeline' | 'tool_card' | 'result_card' | 'table' | 'chart' | 'missing_fields' | 'actions';
  title?: string;
  status?: ResultStatus | ProcessEventStatus | string;
  summary?: string;
  content?: string;
  payload?: Record<string, unknown>;
}

export interface ResponseContract {
  version: 'response-contract/v1';
  status: ResultStatus;
  intent_type?: IntentType | string;
  result_type?: ResultType | string;
  task_id?: string;
  trace_id?: string;
  answer_markdown?: string;
  business_summary?: BusinessSummary;
  semantic_result?: Record<string, unknown>;
  timeline: AgentProcessEvent[];
  message_parts: MessagePart[];
  source_refs: SourceRef[];
  evidence_refs: string[];
  evidence_mode?: EvidenceMode;
  confidence?: ResponseConfidence;
  tool_call_trace?: ToolCallTrace[];
  disclaimers?: string[];
  contract_safety?: ContractSafetyResult;
  candidate_source?: string;
  final_route_decision?: Record<string, unknown>;
  execution_decision?: string;
  fallback_reason?: string;
  evidence_ids?: string[];
  contract_safety_trace_ref?: string;
  next_actions: AiNextAction[];
  answer_origin?: MessageRuntimeProjection['answer_origin'];
  metadata?: Record<string, unknown>;
}

export type RuntimeStage =
  | 'understanding'
  | 'context_loading'
  | 'data_fetching'
  | 'analysis'
  | 'diagnosis'
  | 'knowledge_lookup'
  | 'recommendation'
  | 'response_generation';

export interface RuntimeState {
  current_stage: RuntimeStage | 'completed';
  completed_stages: RuntimeStage[];
  status: 'running' | 'completed' | 'degraded' | 'blocked' | 'failed';
  started_at: string;
  duration_ms?: number;
  label?: string;
}

export interface BusinessSummary {
  title: string;
  brief: string;
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence?: ConfidenceLevel;
  business_impact?: string;
  type?: string;
  kind?: string;
  capability_gap?: Record<string, unknown>;
}

export interface AiNextAction {
  label: string;
  type?: 'follow_up' | 'open_panel' | 'create_task' | 'run_tool' | 'handoff' | 'export';
  intent?: string;
  action?: string;
  params?: Record<string, unknown>;
  risk_level?: 'low' | 'medium' | 'high';
  auto_executable?: boolean;
}

export interface AnswerPolicy {
  verbosity: 'concise' | 'balanced' | 'detailed';
  evidence_visibility: 'hidden' | 'summary' | 'expanded';
  reasoning_visibility: 'internal' | 'summary' | 'visible';
  confidence_policy: 'show_always' | 'show_when_low' | 'hidden';
  fallback_strategy: 'soft_degrade' | 'ask_user' | 'block';
}

export interface MessageContract {
  type: PresentationMessageType;
  answer_markdown: string;
  business_summary?: BusinessSummary;
  visualizations?: {
    tables?: unknown[];
    charts?: unknown[];
  };
  next_actions?: AiNextAction[];
  runtime_state?: RuntimeState;
  answer_policy?: AnswerPolicy;
  evidence_bundle?: Record<string, unknown>;
  execution_context?: Record<string, unknown>;
  agent_runtime?: Record<string, unknown>;
  reasoning_artifacts?: Record<string, unknown>;
  raw_result?: unknown;
}

/** 证据对象（数据对象真源 8） */
export interface EvidenceItem {
  evidence_id?: string;
  task_id?: string;
  evidence_type?: EvidenceSourceType;
  title: string;
  summary?: string;
  source_attachment_id?: string;
  source_message_id?: string;
  confidence?: ConfidenceLevel;
  happened_at?: string;
  // 前端扩展（兼容旧渲染）
  step?: number;
  detail: string;
  status: 'confirmed' | 'suspected' | 'pending';
  source: string;
  timestamp?: string;
}

/** Case 对象（数据对象真源 9） */
export interface CaseRecord {
  case_id: string;
  source_task_id: string;
  case_type: string;
  title: string;
  summary: string;
  reusable_points: string[];
  status: 'active' | 'archived' | 'deprecated';
  created_at: string;
}

export interface ProjectBinding {
  project_refs: string[];
  default_project_ref?: string;
  last_active_project_ref?: string;
  source_project_refs?: string[];
}

// ==========================================
// 附件 & 会话支撑（会话支撑能力设计 6）
// ==========================================

/** 附件记录（会话支撑能力设计 6.1） */
export interface AttachmentRecord {
  id: string;
  conversation_id: string;
  message_id?: string;
  task_id?: string;
  name: string;
  kind: AttachmentKind;
  mime_type: string;
  size: number;
  status: AttachmentStatus;
  preview_url?: string;
  asset_url?: string;
  thumbnail_url?: string;
  cover_url?: string;
  preview_image_url?: string;
  thumbnail_status?: 'generated' | 'generating' | 'unsupported' | 'failed';
  asset_state?: 'draft' | 'committed';
  media_width?: number;
  media_height?: number;
  duration_ms?: number;
  icon_type?: AttachmentKind | 'pdf' | 'word' | 'unknown';
  source_type?: 'click' | 'drag' | 'paste' | 'automation';
  created_at: string;
  project_binding?: ProjectBinding;
  // 前端扩展
  filename: string; // 兼容: name
  type: AttachmentKind; // 兼容: kind
  url?: string; // 兼容: preview_url
  summary?: string; // 附件摘要
  insight?: AttachmentInsight;
}

/** 附件摘要（会话支撑能力设计 6.2） */
export interface AttachmentSummary {
  attachment_id: string;
  summary: string;
  keywords: string[];
  structured_fields?: Record<string, string>;
  parse_status: 'pending' | 'parsing' | 'parsed' | 'failed';
  parser_type?: string;
  updated_at: string;
}

// ==========================================
// 四条业务流结果 Schema
// ==========================================

/** 使用帮助结果（使用帮助设计 3.3 + F-HELP-01~04） */
export interface HelpResult {
  question_type: string;
  subject: string;
  definition_text: string;
  system_path?: string;
  source_refs: HelpSourceRef[];
  confidence_level: ConfidenceLevel;
  next_actions: HelpNextAction[];
  // 前端扩展（兼容旧字段）
  definition: string;
  reference_sources: ReferenceSource[];
  follow_up_questions: string[];
}

/** 帮助来源引用（使用帮助设计 3.3） */
export interface HelpSourceRef {
  source_type: 'doc' | 'rule' | 'case' | 'knowledge';
  title: string;
  url?: string;
  relevance?: 'primary' | 'supplementary';
}

/** 帮助下一步动作 */
export interface HelpNextAction {
  action_type: 'ask_followup' | 'upgrade_workflow' | 'view_system' | 'view_source';
  label: string;
  target?: string;
}

/** 需求沟通结果（需求沟通设计） */
/** 需求沟通结果（需求沟通设计 3.3） */
export interface DemandResult {
  demand_type: 'media_postback' | 'event_mapping' | 'buried_point' | 'attribution_config' | 'whitelist' | 'other';
  demand_summary: string;
  form: DemandForm;
  missing_fields: DemandMissingField[];
  dependencies: DependencyItem[];
  next_actions: DemandNextAction[];
  owner_roles: string[];
  status: 'draft' | 'structured' | 'submitted';
}

export interface DemandForm {
  media: string;
  app_name: string;
  package_name?: string;
  target_object: string;
  target_timeline?: string;
  acceptance_method?: string;
  event_mapping?: EventMapping[];
}

export interface DemandMissingField {
  field_name: string;
  field_label: string;
  priority: 'high' | 'medium' | 'low';
  owner_role: string;
  reason: string;
}


export interface DemandNextAction {
  action: string;
  status: 'to_complete' | 'to_process' | 'to_generate';
  owner_role: string;
}

export interface EventMapping {
  client_event: string;
  media_event: string;
  mapping_status: 'mapped' | 'unmapped' | 'conflict';
}

/** 问题排查结果（问题排查设计 3.3） */
export interface DiagnosisResult {
  summary_conclusion: string;
  confidence_level: 'high' | 'medium' | 'low';
  confidence_score: number;
  evidence_items: DiagnosisEvidenceItem[];
  missing_evidence_items: MissingEvidenceItem[];
  next_actions: DiagnosisNextAction[];
  anomaly_type: string;
  affected_scope: string;
  risk_level: 'high' | 'medium' | 'low';
  owner_roles: string[];
}

export interface DiagnosisEvidenceItem {
  id: string;
  evidence_type: 'log' | 'screenshot' | 'data_result' | 'status' | 'attribution_result' | 'upload';
  title: string;
  summary: string;
  relevance: 'high' | 'medium' | 'low';
  timestamp?: string;
  source_attachment_id?: string;
}

export interface MissingEvidenceItem {
  evidence_type: string;
  description: string;
  owner_role: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DiagnosisNextAction {
  action: string;
  owner_role: string;
  status: 'pending' | 'in_progress' | 'completed' | 'ready';
}

/** 广告联调结果 (自动联调设计) */
/** 联调结果（自动联调设计 3.2 + 4.4） */
export interface DebuggingResult {
  current_stage: DebugAutomationStatus;
  stages: DebugStage[];
  readiness_items: ReadinessItem[];
  execution_logs: ExecutionLog[];
  result_status: 'pass' | 'fail' | 'partial' | 'running';
  issues_found: string[];
  can_takeover: boolean;
  takeover_reason?: string;
}

export interface DebugStage {
  stage: DebugAutomationStatus;
  label: string;
  status: 'completed' | 'running' | 'pending' | 'failed';
  started_at?: string;
  completed_at?: string;
  screenshot_url?: string;
}

export interface ReadinessItem {
  item: string;
  status: 'ready' | 'not_ready' | 'unknown';
  detail?: string;
}

export interface ExecutionLog {
  step: number;
  action: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  duration?: number;
  observation?: string;
  timestamp?: string;
}

// ==========================================
// 自动联调专项（自动联调设计 3.2）
// ==========================================

/** 自动联调状态 */
export type DebugAutomationStatus =
  | 'created'
  | 'waiting_confirm'
  | 'running_web_prepare'
  | 'running_mobile_scan'
  | 'running_mobile_find_ad'
  | 'running_mobile_launch'
  | 'running_success_poll'
  | 'success'
  | 'failed'
  | 'manual_takeover';

/** 自动联调任务（自动联调实施方案 5.1） */
export interface DebugAutomationTask {
  id: string;
  conversation_id: string;
  media: string;
  debug_type: string;
  account: string;
  app_name: string;
  package_name: string;
  device: string;
  environment: string;
  status: DebugAutomationStatus;
  current_stage: string;
  current_step: string;
  requires_manual_confirm: boolean;
  current_blocker?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

/** 自动联调配置（自动联调实施方案 5.2） */
export interface DebugAutomationConfig {
  id: string;
  name: string;
  media: string;
  terminal: 'android' | 'ios';
  environment: 'test' | 'production';
  executor_type: string;
  vision_provider: string;
  adb_path?: string;
  app_package?: string;
  media_config?: {
    username?: string;
    password?: string;
    default_account?: string;
    event_asset_url?: string;
    postback_result_view?: string;
    aadvid?: string;
    target_channel?: string;
  };
  channel_config?: {
    app_package?: string;
    app_activity?: string;
    deeplink?: string;
    auth_keyword?: string;
    feed_keyword?: string;
    action_keyword?: string;
    max_swipe_count?: number;
    keyword_settle_seconds?: number;
    install_password?: string;
    game_package?: string;
  };
  game_config?: {
    package_name?: string;
    login_type?: string;
    account?: string;
    password?: string;
  };
  mobile_env?: {
    device_id?: string;
  };
  keywords_json: string;
  timeouts_json: string;
  is_active: boolean;
  scope?: string;
  updated_at: string;
}

/** 自动联调执行步骤 */
export interface DebugExecutionStep {
  id: string;
  task_id: string;
  stage: string;
  step_name: string;
  step_order: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  screenshot_url?: string;
  log_summary?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

/** 自动联调执行结果（自动联调实施方案 5.4） */
export interface DebugExecutionResult {
  task_id: string;
  success: boolean;
  success_criteria: string;
  failure_code?: string;
  failure_reason?: string;
  evidence_json?: string;
  execution_log_summary: string;
  key_screenshots: string[];
  final_report_url?: string;
  final_report_markdown?: string;
  manual_takeover_flag: boolean;
  failed_step?: string;
}

/** 自动联调任务发起表单（自动联调设计 1） */
export interface DebugTaskInitForm {
  media: string;
  debug_type: string;
  account: string;
  app_name: string;
  package_name: string;
  device_id: string;
  environment: string;
  current_blocker: string;
}

// ==========================================
// 需求池模板增强 (需求池模板增强建议)
// ==========================================

/** 需求池条目 - 增强模板 */
export interface DemandPoolItem {
  id: string;
  title: string;
  /** 具体问题描述 */
  problem_statement: string;
  /** 目标用户/角色 */
  target_users: string[];
  /** 核心场景 */
  core_scenarios: string[];
  /** 验收标准 */
  acceptance_criteria: string[];
  /** 方案边界（做什么 / 不做什么） */
  scope_in: string[];
  scope_out: string[];
  /** 依赖项 */
  dependencies: DependencyItem[];
  /** 结果物 */
  deliverables: string[];
  /** 阶段归属 */
  phase: 'phase1' | 'phase2' | 'phase3';
  /** 优先级 */
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  /** 所属业务流 */
  business_flow: 'help' | 'demand' | 'diagnosis' | 'debugging';
  /** 自动化栬竟鐣?*/
  automation_boundary: 'auto' | 'human-machine' | 'manual';
  /** 状态?*/
  status: 'draft' | 'reviewing' | 'approved' | 'in-progress' | 'completed' | 'archived';
  /** 鎻愬嚭浜?*/
  proposer: string;
  /** 璐熻矗浜?*/
  owner: string;
  created_at: number;
  updated_at: number;

  // ─── 需求 Intake 关联字段（P1 新增）──────────────────

  /** 关联的 CaseFrame ID */
  caseId?: string;
  /** 关联的会话 ID */
  conversationId?: string;
  /** 关联的消息 ID */
  messageId?: string;
  /** 服务类型（monitoring_callback / data_collection） */
  serviceType?: string;
  /** 需求 intake 状态 */
  intakeDraftStatus?: 'collecting' | 'ready_for_confirmation' | 'confirmed' | 'submitted';
  /** 已收集的槽位 */
  intakeSlots?: Record<string, {
    value?: string;
    source?: string;
    confirmed?: boolean;
  }>;
  /** 缺失项 */
  intakeMissingInputs?: string[];
  /** 产物（文档 URL 等） */
  intakeArtifacts?: Array<{
    type: string;
    url?: string;
    title?: string;
    storedAt?: string;
  }>;
  /** 风险提示 */
  intakeRiskWarnings?: string[];
  /** 原始用户消息摘要 */
  originalMessageSummary?: string;
  /** 确认时间戳 */
  confirmedAt?: number;
  /** 提交时间戳 */
  submittedAt?: number;
  /** 关联的证据引用 */
  evidenceRefs?: string[];
  /** 关联的来源引用 */
  sourceRefs?: string[];
}

// ==========================================
// MCP Skill（可添加的 MCP 能力模板）
// ==========================================

/** MCP Skill 来源 */
export type McpSkillSource = 'builtin' | 'custom';

/** MCP Skill 分类 */
export type McpSkillCategory = 'data' | 'operation' | 'monitor' | 'analysis' | 'integration' | 'other';

/** MCP Skill 定义 */
export interface McpSkill {
  id: string;
  /** 能力名称 */
  name: string;
  /** 能力描述 */
  description: string;
  /** Skill 运行时提示词模板 */
  prompt_template?: string;
  /** 图标（emoji 或 Lucide 图标名） */
  icon: string;
  /** 来源: 内置/自定义 */
  source: McpSkillSource;
  /** 分类 */
  category: McpSkillCategory;
  /** 选择的 MCP 服务 ID */
  mcp_server_id?: string;
  /** MCP服务端点URL */
  endpoint_url: string;
  /** 传输协议 */
  transport: 'sse' | 'streamable-http';
  /** 鉴权方式 */
  auth_type: McpAuthType;
  /** 鉴权参数模板(值可能为空，用户需填写) */
  auth_config_template: Record<string, string>;
  /** 预期工具列表 */
  expected_tools: { name: string; description: string }[];
  /** 是否已安装（连接为 McpServerConfig） */
  installed: boolean;
  /** 安装后的MCP Server ID */
  installed_server_id?: string;
  /** 标签 */
  tags: string[];
  /** 适用场景 */
  use_cases: string[];
  /** 排序权重 */
  sort_order: number;
  created_at: number;
  updated_at: number;
}

// ==========================================
// Global Memory (全局记忆)
// ==========================================

/** 记忆类型 */
export type MemoryType = 'preference' | 'fact' | 'context' | 'instruction' | 'experience';

/** 记忆来源 */
export type MemorySource = 'auto_extract' | 'user_input' | 'agent_summary' | 'system_default';

/** 记忆同步状态 */
export type MemorySyncStatus = 'pending' | 'synced' | 'failed' | 'skipped';

/** 全局记忆条目 */
export interface MemoryEntry {
  id: string;
  /** 用户 ID */
  user_id?: string;
  /** 记忆内容 */
  content: string;
  /** 记忆类型 */
  memory_type: MemoryType;
  /** 来源 */
  source: MemorySource;
  /** 关联的会话 ID（自动提取时） */
  source_conversation_id?: string;
  /** 关键词，用于检索 */
  keywords: string[];
  /** 关联业务域 */
  business_domain?: string;
  /** 重要性（1-5） */
  importance: number;
  /** 访问次数（被注入上下文的次数） */
  access_count: number;
  /** 最后访问时间 */
  last_accessed_at?: number;
  /** 是否已归档 */
  archived: boolean;
  /** 同步到长期知识库的状态 */
  sync_status?: MemorySyncStatus;
  /** 同步目标 */
  sync_target?: 'dataki';
  /** Dataki 知识库 ID */
  dataki_knowledge_base_id?: string;
  /** Dataki 文档 ID */
  dataki_document_id?: string;
  /** 最近一次同步失败原因 */
  sync_error?: string;
  /** 最近一次同步时间 */
  synced_at?: number;
  created_at: number;
  updated_at: number;
}

// ==========================================
// Context Governance (上下文治理层)
// ==========================================

export type RolePerspective = 'summary' | 'analysis' | 'operation';
export type RoleRoutePolicyAction = 'confirm' | 'fallback' | 'redirect' | 'explain';

export interface RoleResponseStyle {
  outputStyle: string[];
  analysisFocus: string[];
  riskBias: string[];
  explanationDepth: string;
  decisionStyle: string;
}

export interface RoleShortcutEntry {
  id: string;
  title: string;
  description: string;
  intentType?: IntentType;
  placeholder?: string;
  enabled: boolean;
  sortOrder: number;
}

export interface RoleProfile {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
  defaultPerspective: RolePerspective;
  allowedPerspectives: RolePerspective[];
  defaultAgent: AgentType;
  allowedIntentTypes: IntentType[];
  scopeTags: string[];
  routePolicy: {
    ambiguous: RoleRoutePolicyAction;
    outOfScope: RoleRoutePolicyAction;
    clarificationRounds: number;
  };
  rolePrompt: string;
  resultTemplate: {
    defaultBlocks: string[];
    blockOrder: string[];
  };
  responseStyle: RoleResponseStyle;
  shortcutEntries: RoleShortcutEntry[];
  updatedAt: string;
}

export interface UserPreferenceProfile {
  userId: string;
  defaultRole: string;
  activePreferences: string[];
  inferredPreferences: {
    outputStyle: string[];
    analysisFocus: string[];
    riskBias: string[];
    explanationDepth: string;
    decisionStyle: string;
  };
  confidence: Record<string, number>;
  updatedAt: string;
  currentRole?: string;
  roleHistory?: Array<{
    role: string;
    source: 'login' | 'manual' | 'inferred' | 'system';
    updatedAt: string;
    reason?: string;
  }>;
}

// ==========================================
// Scheduled Task (定时任务)
// ==========================================

/** 定时任务类型 */
export type ScheduledTaskType = 'data_monitor' | 'report_generate' | 'alert_check' | 'health_check' | 'custom';

/** 定时任务状态 */
export type ScheduledTaskStatus = 'active' | 'paused' | 'running' | 'completed' | 'failed' | 'disabled';

/** 执行频率 */
export type ScheduleFrequency = 'every_5min' | 'every_15min' | 'every_30min' | 'hourly' | 'daily' | 'weekly' | 'custom_cron';

/** Cron预设 */
export type CronPreset = 'every_5min' | 'every_15min' | 'every_30min' | 'hourly' | 'daily' | 'weekly' | 'custom';

/** 告警条件 */
export interface AlertCondition {
  /** 监控指标 */
  metric: string;
  /** 比较运算符 */
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte' | 'change_gt' | 'change_lt';
  /** 阈值?*/
  threshold: number;
  /** 时间窗口(绉? */
  window_seconds?: number;
}

/** 定时任务执行记录 */
export interface ScheduledTaskExecution {
  id: string;
  task_id: string;
  /** 执行状?*/
  status: 'queued' | 'running' | 'success' | 'failed' | 'timeout' | 'partial_succeeded' | 'succeeded' | 'cancelled';
  /** 开始时间 */
  started_at: number;
  /** 结束时间 */
  finished_at: number;
  /** 执行耗时(ms) */
  duration_ms: number;
  /** 执行结果摘要 */
  result_summary: string;
  /** LLM 参与摘要 */
  llm_summary?: string;
  /** 源文件 ID */
  source_attachment_ids?: string[];
  /** 确认态 */
  confirmation_state?: 'pending' | 'confirmed' | 'rejected' | 'not_required';
  /** 解析/确认快照 */
  parse_snapshot?: Record<string, unknown>;
  /** 生成文件名称 */
  artifact_name?: string;
  /** 生成文件地址 */
  artifact_url?: string;
  /** 生成文件对应资产 ID */
  artifact_attachment_id?: string;
  /** 告警是否触发 */
  alert_triggered: boolean;
  /** 告警详情 */
  alert_details?: string;
  /** 错误信息 */
  error_message?: string;
  /** 失败原因分类 */
  failure_category?: 'data_source' | 'permission' | 'missing_input' | 'tool_unavailable' | 'timeout' | 'unknown';
  /** 当前重试次数 */
  retry_attempt?: number;
  /** 下次自动重试时间 */
  next_retry_at?: number;
  /** 重试说明 */
  retry_reason?: string;
  /** 失败案例快照 */
  failure_case_id?: string;
  /** 执行步骤 */
  step_runs?: AutomationExecutionStep[];
  /** Chat-first Task Center: 输出消息 ID */
  output_message_id?: string;
  /** Chat-first Task Center: Trace ID */
  trace_id?: string;
  /** Chat-first Task Center: 产物引用 */
  artifact_refs?: Array<{ type: string; uri: string; name?: string }>;
  /** Chat-first Task Center: 证据引用 */
  evidence_refs?: Array<{ type: string; id: string; label?: string }>;
  /** Chat-first Task Center: 来源引用 */
  source_refs?: Array<{ type: string; uri: string; title?: string }>;
  /** 结果复用：可在 Chat 中复用 */
  result_reusable_in_chat?: boolean;
  /** 质量状态 */
  quality_status?: string;
}

/** 定时任务 */
export interface ScheduledTask {
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description: string;
  /** 任务类型 */
  task_type: ScheduledTaskType;
  /** 状态?*/
  status: ScheduledTaskStatus;
  /** 棰戠巼 */
  frequency: ScheduleFrequency;
  /** 自定义 cron 表达式（frequency=custom_cron 时） */
  cron_expression?: string;
  /** 下次执行时间 */
  next_run_at?: number;
  /** 上次执行时间 */
  last_run_at?: number;
  /** 创建鑰?*/
  created_by: string;
  /** 项目绑定 */
  project_binding?: ProjectBinding;
  /** 关联的广告账户ID */
  account_ids: string[];
  /** 关联的应用名 */
  app_names: string[];
  /** 监控指标 */
  monitor_metrics: string[];
  /** 告警条件 */
  alert_conditions: AlertCondition[];
  /** 告警通知方式 */
  alert_channels: ('in_app' | 'email' | 'webhook')[];
  /** 告警通知目标 */
  alert_targets: string[];
  /** 通知策略 */
  notification_policy?: {
    on_success?: boolean;
    on_failure?: boolean;
    on_partial?: boolean;
    target_scope?: 'creator' | 'team' | 'custom';
    quiet_hours?: { start: string; end: string };
  };
  /** 使用的MCP Skill */
  mcp_skill_id?: string;
  /** 自定义参数（透传给 MCP 工具） */
  custom_params: Record<string, unknown>;
  /** 执行历史（最近 N 条） */
  recent_executions: ScheduledTaskExecution[];
  /** 总执行次数 */
  total_executions: number;
  /** 成功次数 */
  success_count: number;
  /** 失败次数 */
  failure_count: number;
  /** 是否启用 */
  enabled: boolean;
  created_at: number;
  updated_at: number;
  /** Chat-first Task Center: 来源会话 ID */
  source_conversation_id?: string;
  /** Chat-first Task Center: 创建该任务的消息 ID */
  created_by_message_id?: string;
  /** Chat-first Task Center: 风险等级 */
  risk_level?: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  /** Chat-first Task Center: 模板 ID */
  template_id?: 'scheduled_join_table' | 'scheduled_aggregate_table' | 'gi_keyword_daily_digest' | 'scheduled_metric_monitor' | 'custom';
  /** Chat-first Task Center: 最近一次结果摘要 */
  last_result_summary?: string;
  /** Chat-first Task Center: 最近一次结果消息 ID */
  last_result_message_id?: string;
  /** Chat-first Task Center: 最近一次运行状态 */
  last_run_status?: 'completed' | 'failed' | 'partial' | 'skipped' | 'needs_action';
  /** 自动化触发方式 */
  automation_trigger?: 'manual' | 'schedule' | 'event' | 'webhook';
  /** 自动化可见性 */
  automation_visibility?: 'admin_only' | 'owner_visible' | 'public' | 'silent';
  /** 所有者范围 */
  owner_scope?: string;
  /** 结果复用策略 */
  result_reuse_policy?: {
    freshness_seconds?: number;
    reusable_in_chat?: boolean;
    requires_evidence_refs?: boolean;
  };
}

export interface AutomationNotification {
  id: string;
  task_id?: string;
  execution_id?: string;
  type: 'task_run_success' | 'task_run_failed' | 'task_run_partial' | 'task_updated' | 'artifact_ready';
  title: string;
  summary: string;
  read: boolean;
  created_at: number;
  read_at?: number;
  action_label?: string;
  action_url?: string;
  artifact_attachment_id?: string;
  artifact_url?: string;
  severity?: 'info' | 'warning' | 'critical';
  channels?: ('in_app' | 'email' | 'webhook')[];
  targets?: string[];
}

export interface AutomationExecutionStep {
  id: string;
  execution_id: string;
  task_id: string;
  key: 'parse' | 'query' | 'compute' | 'artifact' | 'notification' | 'orchestrator';
  label: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'skipped';
  started_at: number;
  finished_at?: number;
  duration_ms?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error_message?: string;
}

export interface AutomationExecutionRecord {
  id: string;
  task_id: string;
  project_binding?: ProjectBinding;
  status: ScheduledTaskExecution['status'];
  started_at: number;
  finished_at?: number;
  duration_ms?: number;
  input_snapshot: Record<string, unknown>;
  prompt_snapshot: string;
  result_summary: string;
  llm_summary?: string;
  source_attachment_ids?: string[];
  confirmation_state?: 'pending' | 'confirmed' | 'rejected' | 'not_required';
  trace_snapshot?: Record<string, unknown>;
  artifact_attachment_ids: string[];
  artifact_names: string[];
  artifact_urls: string[];
  error_message?: string;
  failure_category?: ScheduledTaskExecution['failure_category'];
  retry_attempt?: number;
  next_retry_at?: number;
  retry_reason?: string;
  failure_case_id?: string;
  step_runs: AutomationExecutionStep[];
  created_at: number;
  updated_at: number;
}

export interface AutomationDraftSuggestion {
  name: string;
  description: string;
  task_type: ScheduledTaskType;
  trigger_type: 'manual' | 'cron' | 'file_upload' | 'metric_threshold' | 'webhook';
  frequency: ScheduleFrequency;
  cron_expression?: string;
  monitor_metrics: string[];
  dimensions: string[];
  alert_channels: ('in_app' | 'email' | 'webhook')[];
  alert_targets: string[];
  output_formats: Array<'markdown' | 'excel' | 'pdf' | 'json'>;
  source_attachment_ids: string[];
  source_refs: Array<{ id: string; title: string; summary?: string }>;
  missing_fields: string[];
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  /** 模板布局（多 sheet） */
  template_layout?: {
    sheets: Array<{
      sheet_name: string;
      headers: string[];
      source?: string;
    }>;
    required_fields?: string[];
    missing_fields?: string[];
  };
  /** 模板来源 */
  template_source?: string;
  /** 报表模板名称 */
  report_template_name?: string;
  /** 报表模板 ID */
  report_template_id?: string;
}

// ==========================================
// Automation Templates (自动化栨ā鏉?
// ==========================================

export type AutomationTemplateKind =
  | 'daily_report'
  | 'weekly_report'
  | 'monthly_report'
  | 'traffic_classification'
  | 'table_merge'
  | 'tag_summary'
  | 'custom';

export type AutomationTemplateStatus = 'active' | 'draft' | 'archived';

export interface AutomationTemplateConfig {
  id: string;
  name: string;
  description: string;
  template_type: AutomationTemplateKind;
  status: AutomationTemplateStatus;
  default_frequency: ScheduleFrequency;
  default_cron_expression?: string;
  metrics: string[];
  dimensions: string[];
  filters: string[];
  output_blocks: Array<'template_definition' | 'table' | 'chart' | 'analysis'>;
  prompt_template: string;
  created_by: string;
  created_at: number;
  updated_at: number;
}

// ==========================================
// Auto Report Templates & Drafts
// ==========================================

export type ReportTemplateFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export type ReportSourceType = 'mcp_report' | 'mcp_attribution' | 'mcp_monitor' | 'knowledge_api';

export type ReportMetricAggregation = 'sum' | 'avg' | 'max' | 'min' | 'latest';

export type ReportMetricFormatter = 'currency' | 'percent' | 'integer' | 'decimal' | 'text';

export type ReportDraftStatus = 'draft' | 'reviewed' | 'exported' | 'failed';

export type ReportExportTarget = 'xiaoshan';

export type ReportCellValue = string | number | boolean | null;

export interface ReportSourceBinding {
  id: string;
  sourceType: ReportSourceType;
  sourceName: string;
  sourceRef: string;
  reportCode: string;
  dimension: string;
  filters: string[];
}

export interface ReportMetricBinding {
  id: string;
  reportKey: string;
  reportLabel: string;
  metricKey: string;
  metricLabel: string;
  columnKey: string;
  aggregation: ReportMetricAggregation;
  formatter: ReportMetricFormatter;
  required: boolean;
  note?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  scene: string;
  frequency: ReportTemplateFrequency;
  cronExpression?: string;
  enabled: boolean;
  reviewRequired: boolean;
  exportTarget: ReportExportTarget;
  sources: ReportSourceBinding[];
  metricBindings: ReportMetricBinding[];
  narrativeFocus: string[];
  linkedScheduledTaskId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSummaryCard {
  label: string;
  value: number | string;
  formatter: ReportMetricFormatter;
  trend?: 'up' | 'down' | 'stable';
}

export interface ReportSourceSnapshot {
  sourceName: string;
  sourceRef: string;
  reportCode: string;
  status: 'ready' | 'planned' | 'missing';
  note: string;
}

export interface ReportDraft {
  id: string;
  templateId: string;
  templateName: string;
  reportDate: string;
  status: ReportDraftStatus;
  reviewRequired: boolean;
  exportTarget: ReportExportTarget;
  summary: string;
  narrative: string[];
  columns: string[];
  rows: Record<string, ReportCellValue>[];
  summaryCards: ReportSummaryCard[];
  sourceSnapshots: ReportSourceSnapshot[];
  generatedAt: string;
  reviewedAt?: string;
  exportedAt?: string;
}

// ==========================================
// Call Chain / Trace Data（开发者模式）
// ==========================================

/** Span 绉嶇被 */
export type SpanType = 'custom' | 'model' | 'tool' | 'agent';

/** 单个 Span 节点 */
export interface CallSpan {
  /** Span ID */
  spanId: string;
  /** Span 名称 (濡?xiaoqiao.zhitou.chat) */
  name: string;
  /** Span 类型 */
  type: SpanType;
  /** 开始时间（ms timestamp） */
  startTime: number;
  /** 结束时间 (ms timestamp) */
  endTime?: number;
  /** 耗时 (ms) */
  durationMs?: number;
  /** 状态?*/
  status: 'running' | 'success' | 'error';
  /** 输入数据 */
  input?: Record<string, unknown>;
  /** 输出数据 */
  output?: Record<string, unknown>;
  /** Tags */
  tags?: Record<string, string>;
  /** 瀛?Span */
  children?: CallSpan[];
  /** 错误信息 */
  error?: string;
}

/** 模型调用详情 (LLM span 专属) */
export interface ModelCallDetail {
  model: string;
  provider: string;
  stream: boolean;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  finishReason?: string;
  promptKeys?: string[];
  statusCode?: string;
  errorType?: string;
  tokensUnknown?: boolean;
}

/** 工具调用详情 (Tool/MCP span 专属) */
export interface ToolCallDetail {
  toolName: string;
  toolType: 'builtin' | 'mcp';
  serverName?: string;
  query: string;
  resultPreview: string;
  latencyMs: number;
  arguments?: string;
  resultSummary?: string;
  rowCount?: number;
  documentCount?: number;
  scoreSummary?: string;
  httpStatus?: number;
  statusCode?: string;
  errorType?: string;
}

/** 完整调用链数据 */
export interface CallChainData {
  /** Trace ID */
  traceId: string;
  traceUrl?: string;
  threadId?: string;
  conversationId?: string;
  messageId?: string;
  turnId?: string;
  /** 根 Span */
  rootSpan: CallSpan;
  /** 总耗时 */
  totalDurationMs: number;
  /** 模型调用列表（扁平化） */
  modelCalls: ModelCallDetail[];
  /** 工具调用列表（扁平化） */
  toolCalls: ToolCallDetail[];
  /** Token 统计 */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  runtimeProjection?: MessageRuntimeProjection;
}

export interface MessageRuntimeStepSummary {
  key: string;
  label: string;
  status: string;
  summary?: string;
  kind?: 'agent' | 'model' | 'tool' | 'retriever' | 'runtime' | 'analysis' | 'reasoning' | 'custom';
  durationMs?: number;
  traceRef?: string;
  metadata?: Record<string, unknown>;
}

export interface ModelParticipationRecord {
  node?: string;
  model_use_case: string;
  modelUseCase?: string;
  model_name?: string;
  provider?: string;
  route_mode?: string;
  model_route_id?: string;
  prompt_id?: string;
  prompt_source?: string;
  prompt_version?: string;
  prompt_hash?: string;
  content_hash?: string;
  model_span_id?: string;
  input_schema?: string;
  output_schema?: string;
  input_hash?: string;
  raw_output_hash?: string;
  output_hash?: string;
  output_adapter_used?: boolean;
  output_adapter_name?: string;
  normalized_output_hash?: string;
  validation_status?: 'not_applicable' | 'passed' | 'failed';
  validation_error?: string;
  latency_ms?: number;
  status:
    | 'not_applicable'
    | 'not_configured'
    | 'disabled'
    | 'fallback_to_rules'
    | 'attempted'
    | 'succeeded_consumed'
    | 'succeeded_not_consumed'
    | 'failed_fallback'
    | 'invalid_output_fallback'
    | 'blocked_by_policy'
    | 'model_succeeded'
    | 'fallback'
    | 'template'
    | 'error';
  consumed?: boolean;
  consumed_by?: string;
  consumed_fields?: string[];
  dropped_fields?: string[];
  drop_reason?: string;
  fallback_used?: boolean;
  fallback_reason?: string;
  fallback_path?: string;
  output_consumed?: boolean;
  output_consumed_by?: string;
  decision_right?: string;
  can_affect_tool_args?: false;
  can_affect_permission?: false;
  can_affect_final_answer?: boolean;
  answer_origin?: string;
  warnings?: string[];
}

export interface MessageRuntimeProjection {
  message_id: string;
  thread_id?: string;
  trace_id?: string;
  workflow?: string;
  intent?: string;
  status?: string;
  answer_origin?: {
    source: 'real_llm' | 'template_composer' | 'rule_fallback' | 'external_service' | 'model_unavailable';
    model_span_id?: string;
    external_trace_id?: string;
    composer_name?: string;
    model_name?: string;
    provider?: string;
    summary?: string;
    metadata?: Record<string, unknown>;
  };
  model_participation?: ModelParticipationRecord[];
  runtime_steps: MessageRuntimeStepSummary[];
  prompt_hits: Array<{
    key: string;
    title: string;
    prompt_version?: string;
    matched?: boolean;
    summary?: string;
    metadata?: Record<string, unknown>;
  }>;
  query_plan_summary: {
    selected_tool?: string;
    selected_server?: string;
    selected_question_type?: string;
    filters?: Record<string, unknown>;
    summary?: string;
    metadata?: Record<string, unknown>;
  };
  tool_summaries: Array<{
    name: string;
    kind: 'mcp' | 'api' | 'knowledge' | 'model' | 'skill' | string;
    status: string;
    summary?: string;
    arguments?: string;
    result_summary?: string;
    row_count?: number;
    document_count?: number;
    score_summary?: string;
    http_status?: number;
    duration_ms?: number;
    status_code?: string;
    metadata?: Record<string, unknown>;
  }>;
  view_model_summary: {
    type?: string;
    status?: string;
    has_answer_markdown: boolean;
    has_business_summary: boolean;
    table_count: number;
    chart_count: number;
    action_count: number;
    evidence_available: boolean;
    empty_reason?: string;
    metadata?: Record<string, unknown>;
  };
  quality_checks: Array<{
    key: string;
    label: string;
    status: 'pass' | 'warn' | 'fail' | 'info' | 'pending';
    summary: string;
    detail?: string;
    metadata?: Record<string, unknown>;
  }>;
  render_consumption: Array<{
    renderer: string;
    field: string;
    consumed: boolean;
    status?: 'rendered' | 'empty' | 'unmapped' | 'missing_renderer' | 'deduped' | 'hidden' | 'render_error' | string;
    required?: boolean;
    warning?: string;
    metadata?: Record<string, unknown>;
  }>;
  prompt_hits_summary?: string;
  view_model_summary_text?: string;
  quality_summary?: string;
  trace_url?: string;
  metadata?: Record<string, unknown>;
}

// ==========================================
// 通用引用来源（兼容旧 ReferenceSource）
// ==========================================

export interface ReferenceSource {
  title: string;
  type: 'doc' | 'rule' | 'case';
  url?: string;
}

// ==========================================
// Workspace & Admin Types
// ==========================================

/** 工作空间（接口真源 9） */
export interface WorkspaceResponse {
  user_id: string;
  user_name: string;
  status_summary: SystemStatus;
  quick_modes: string[];
  recent_tasks: Task[];
  app_support_summary: string[];
  // 前端扩展
  conversation_count: number;
  task_count: number;
  current_mode: string;
  capabilities: string[];
  feature_switches: FeatureSwitch[];
  recent_results?: WorkflowResult[];
  current_role?: string;
  role_profile?: RoleProfile | null;
  preference_profile?: UserPreferenceProfile | null;
  preference_summary?: {
    userId: string;
    defaultRole: string;
    currentRole: string;
    activePreferences: string[];
    outputStyle: string[];
    analysisFocus: string[];
    riskBias: string[];
    explanationDepth: string;
    decisionStyle: string;
    confidence: number;
    updatedAt: string;
  } | null;
}

/** 功能开关 */
export interface FeatureSwitch {
  key: string;
  label: string;
  enabled: boolean;
  scope: 'global' | 'role' | 'environment';
}

/** 提示词配置（提示词管理设计 3.2） */
export interface PromptConfig {
  id: string;
  key?: string;
  name: string;
  scope: string;
  expectation: string;
  status: 'active' | 'draft' | 'archived' | 'seed' | 'fallback' | 'disabled' | 'not_configured';
  current_version: number;
  binding: PromptBinding;
  updated_at: string;
  role?: string;
  priority?: number;
  model?: string;
  temperature?: number;
  response_format?: 'text' | 'json';
  output_schema?: unknown;
  variables?: string[];
  prompt_source?: 'admin' | 'seed' | 'fallback' | 'hardcoded';
  content_hash?: string;
  input_variables?: string[];
  created_by?: string;
  updated_by?: string;
  approval_status?: 'approved' | 'pending' | 'rejected' | 'not_required';
  visibility?: {
    main_chat?: string[];
    card?: string[];
    right_panel?: string[];
    internal_only?: string[];
  };
  // 扩展: 分类筛选
  category?: string;
  applicable_workflows?: string[];
  applicable_agents?: string[];
  applicable_models?: string[];
  enabled?: boolean;
  managed_seed_revision?: string;
  managed_seed_hash?: string;
  // P0 治理扩展字段
  canonicalId?: string;
  aliasIds?: string[];
  deprecatedBy?: string;
  archiveReason?: string;
  effectiveStatus?:
    | 'active_runtime'
    | 'active_alias'
    | 'planned_draft'
    | 'archived_ghost'
    | 'hardcoded_to_managed';
  runtimeConsumer?: string;
  consumerPath?: string;
  required?: boolean;
  lastUsedAt?: string;
  // P4-d: A/B 测试基础设施
  ab_test?: {
    enabled: boolean;
    variant_version?: number;
    variant_traffic_pct?: number;  // 0-100
    started_at?: string;
    metrics?: {
      control_invocations?: number;
      variant_invocations?: number;
      control_quality_avg?: number;
      variant_quality_avg?: number;
    };
  };
}

/** 提示词版本（提示词管理设计 3.2） */
export interface PromptVersion {
  version: number;
  content: string;
  created_at: string;
  author: string;
  change_note: string;
  content_hash?: string;
}

/** 提示词绑定（提示词管理设计 3.2） */
export interface PromptBinding {
  workflow?: string;
  agent?: string;
  tool?: string;
  modelUseCase?: string;
  promptSource?: 'admin' | 'seed' | 'fallback' | 'hardcoded';
  status?: 'active' | 'draft' | 'seed' | 'fallback' | 'disabled' | 'not_configured';
  contentHash?: string;
  inputVariables?: string[];
  outputSchema?: unknown;
  createdBy?: string;
  updatedBy?: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected' | 'not_required';
}

// ==========================================
// 旧版兼容类型 (保留向后兼容)
// ==========================================

/** 旧版 Attachment（兼容旧组件） */
export interface Attachment {
  id: string;
  filename: string;
  type: AttachmentKind;
  size: number;
  status: 'uploading' | 'ready' | 'failed';
  summary?: string;
  url?: string;
}

// ==========================================
// UI State
// ==========================================

export interface UIState {
  isSidebarOpen: boolean;
  isAgentPanelOpen: boolean;
  activeAgent: AgentType;
  activeTaskId: string | null;
  showResultPanel: boolean;
  showTaskSidebar: boolean;
}

/** Agent definition */
export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  color: string;
  icon: string;
}

/** Conversation context for useAgent hook */
export interface ConversationContext {
  currentAgent: AgentType;
  messages: Message[];
  isTyping: boolean;
}

export type BusinessContextSource =
  | 'current_message'
  | 'conversation_history'
  | 'workflow_result'
  | 'task_context'
  | 'project_context'
  | 'memory';

export interface BusinessContextSlotValue {
  value: string | string[];
  source: BusinessContextSource;
  confidence: 'high' | 'medium' | 'low';
  updatedAt?: string;
}

export interface BusinessContextQualityCheck {
  status?: 'ok' | 'needs_review' | 'unknown';
  issues: string[];
  missingFields: string[];
  source?: BusinessContextSource;
}

export interface BusinessContextSnapshot {
  project?: BusinessContextSlotValue;
  app?: BusinessContextSlotValue;
  media?: BusinessContextSlotValue;
  timeRange?: BusinessContextSlotValue;
  metrics?: BusinessContextSlotValue;
  dimensions?: BusinessContextSlotValue;
  reportSource?: BusinessContextSlotValue;
  compareSource?: BusinessContextSlotValue;
  latestResult?: {
    resultType?: string;
    status?: string;
    summary?: string;
    sourceMessageId?: string;
    taskId?: string;
    updatedAt?: string;
  };
  qualityCheck?: BusinessContextQualityCheck;
  evidenceRefs: string[];
  sourceMessageId?: string;
  updatedAt: string;
}

export interface ResolvedSlot {
  slotKey: string;
  label: string;
  value: string | string[];
  source: BusinessContextSource;
  confidence: 'high' | 'medium' | 'low';
  inherited: boolean;
}

export interface MissingSlot {
  slotKey: string;
  label: string;
  priority: 'required' | 'recommended' | 'optional';
  suggestedQuestion: string;
  reason: string;
}

export interface SlotState {
  intentType?: IntentType;
  requiredSlots: string[];
  resolvedSlots: ResolvedSlot[];
  missingSlots: MissingSlot[];
  confidence: 'high' | 'medium' | 'low';
  followUpAllowed: boolean;
  policyId?: string;
}

export interface CompiledContextPackage {
  compiledAt: string;
  scopeKey: string;
  user: {
    uid?: number;
    account: string;
    userName: string;
    realName?: string;
    currentRole: string;
  };
  conversation: {
    conversationId?: string;
    title?: string;
    currentMode?: ConversationMode;
    recentMessages: Array<{
      role: Message['role'];
      content: string;
      createdAt?: string;
    }>;
    temporaryRole?: string;
    temporaryConstraints: string[];
  };
  task: {
    taskId?: string;
    taskType?: string;
    workflowLevel?: WorkflowLevel;
    status?: TaskStatus;
    summary?: string;
    blockers: string[];
    nextActions: string[];
    latestResultId?: string;
    latestEvidenceIds: string[];
  };
  project: {
    currentProject: {
      appId?: string | number;
      appName?: string;
      appAlias?: string;
      appEnName?: string;
      appTypes: string[];
      status?: string;
      icon?: string;
      projectId?: string | number;
      projectName?: string;
      packageName?: string;
      platform?: string;
      channel?: string;
      media?: string;
      mediaName?: string;
    } | null;
    availableProjects: Array<{
      appId?: string | number;
      appName?: string;
      appAlias?: string;
      appEnName?: string;
      appTypes: string[];
      status?: string;
      icon?: string;
      projectId?: string | number;
      projectName?: string;
      packageName?: string;
      platform?: string;
      channel?: string;
      media?: string;
      mediaName?: string;
    }>;
    modelAvailable: boolean;
    mcpAvailable: boolean;
    availableMcpServers: string[];
    enabledFeatureSwitches: string[];
  };
  preference: UserPreferenceProfile;
  roleProfile: RoleProfile | null;
  promptContext: {
    rolePrompt: string;
    resultTemplate: string[];
  };
  skillContext: {
    installedSkills: string[];
    enabledSkills: string[];
  };
  toolAvailability: {
    model: boolean;
    mcp: boolean;
    knowledge: boolean;
  };
  routeHints: {
    intentType?: IntentType;
    agent: AgentType;
    confidence: 'high' | 'medium' | 'low';
    clarificationPolicy: 'single' | 'batch';
    outOfScope: boolean;
  };
  businessContext: BusinessContextSnapshot;
  slotState: SlotState;
  followUpPolicy: {
    policyId: string;
    allowInheritance: boolean;
    inheritedSlots: string[];
    mustConfirmSlots: string[];
    reason: string;
  };
  responseStyle: RoleResponseStyle;
  renderHints: {
    defaultBlocks: string[];
    showEvidence: boolean;
    showRisk: boolean;
    showActions: boolean;
  };
  shortcutEntries: RoleShortcutEntry[];
}

/** Integration log entry */
export interface IntegrationLog {
  id: string;
  timestamp: number;
  type: 'response' | 'error';
  method: string;
  url: string;
  status: number;
  duration: number;
  data?: string;
}

/** Metric for monitoring */
export interface MonitoringMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  threshold: number;
  timestamp: string;
}

/** 通用指标 */
export interface Metric {
  label: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'normal' | 'warning' | 'critical';
}

/** 依赖项（需求沟通设计 3.3） */
export interface DependencyItem {
  dep_id: string;
  dep_system: string;
  dep_role: string;
  dep_action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'ready';
  owner: string;
  estimated_completion?: string;
}

/** StatusBadge 支持的状态 */
export type StatusType = 'active' | 'warning' | 'danger' | 'info' | 'idle' | 'running' | 'completed' | 'failed' | 'created' | 'clarifying';

/** ============================================
 *  MCP 配置体系 (MCP Server + Tool 管理)
 *  ============================================ */

/** MCP 服务器类型 */
export type McpServerType = 'data' | 'function';

/** MCP 服务器连接状态 */
export type McpServerStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

/** MCP 鉴权方式 */
export type McpAuthType = 'none' | 'api_key' | 'oauth2' | 'bearer_token' | 'access_token';

/** MCP 工具配置 - 单个工具 */
export interface McpToolConfig {
  tool_id: string;
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  enabled: boolean;
  /** 绑定到哪些 Agent 可用 */
  bound_agents: string[];
  /** 工具只读/读写 */
  access_mode: 'read' | 'write';
  /** 最近一次调用时间 */
  last_called_at?: number;
  /** 调用次数 */
  call_count: number;
}

/** MCP 服务器配置 */
export interface McpServerConfig {
  id: string;
  name: string;
  description: string;
  /** 数据MCP / 功能MCP */
  category: McpServerType;
  /** MCP 服务端地址 */
  endpoint_url: string;
  /** 连接协议: stdio / sse / streamable-http */
  transport: 'stdio' | 'sse' | 'streamable-http';
  /** 鉴权方式 */
  auth_type: McpAuthType;
  /** 鉴权参数（API key / token 等，敏感字段打码） */
  auth_config: Record<string, string>;
  /** 连接状态 */
  status: McpServerStatus;
  /** 从该 MCP 发现的工具列表 */
  tools: McpToolConfig[];
  /** 是否启用 */
  enabled: boolean;
  /** 关联的业务域 */
  business_domains: string[];
  /** 绑定的Agent列表 */
  bound_agents: string[];
  /** 标签 */
  tags: string[];
  /** 健康检查URL (可? */
  health_check_url?: string;
  /** 最近一次健康检查时间 */
  last_health_check_at?: number;
  /** 最近一次ping时间 */
  last_ping_at?: number;
  /** 延迟(ms) */
  latency_ms?: number;
  /** 错误信息 (status=error 日? */
  error_message?: string;
  created_at: number;
  updated_at: number;
}

// ==========================================
// Chat-first Task Center 扩展类型
// ==========================================

/** 任务结果消息载荷 */
export interface TaskResultMessagePayload {
  task_id: string;
  run_id: string;
  task_title: string;
  run_status: 'completed' | 'failed' | 'partial' | 'skipped' | 'needs_action';
  completed_at?: string;
  /** 用户可读摘要 */
  summary: string;
  /** 关键发现 */
  key_findings?: string[];
  /** 建议动作 */
  next_actions?: Array<{ label: string; action: string; payload?: Record<string, unknown> }>;
  /** 产物引用 */
  artifacts?: Array<{ type: string; uri: string; name?: string }>;
  /** 证据引用 */
  evidence_refs?: Array<{ type: string; id: string; label?: string }>;
  /** 来源引用 */
  source_refs?: Array<{ type: string; uri: string; title?: string }>;
  /** Trace ID */
  trace_id?: string;
  /** 展示模式 */
  display_mode: 'compact' | 'expanded';
  /** 模板 ID */
  template_id?: string;
  /** 模板专用数据 */
  template_data?: Record<string, unknown>;
}

/** 会话高亮记录 */
export interface ConversationHighlight {
  id: string;
  conversation_id: string;
  message_id: string;
  task_id: string;
  run_id: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  label: string;
  read: boolean;
  created_at: string;
  read_at?: string;
  read_by?: string;
}

/** 任务模板定义 */
export interface TaskTemplateDefinition {
  template_id: 'scheduled_join_table' | 'scheduled_aggregate_table' | 'gi_keyword_daily_digest' | 'scheduled_metric_monitor' | 'custom';
  name: string;
  description: string;
  /** 必填槽位 */
  required_slots: Array<{
    key: string;
    label: string;
    type: 'string' | 'string[]' | 'schedule' | 'object';
    description: string;
    required: boolean;
  }>;
  /** 输出契约 */
  output_contract: {
    message_type: MessageType;
    supports_artifacts: boolean;
    supports_charts: boolean;
    supports_table_preview: boolean;
  };
  /** 风险等级 */
  risk_level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  /** 执行器绑定 */
  executor_binding: string;
  /** 意图识别关键词（辅助） */
  intent_keywords?: string[];
}

/** 任务 Proposal 载荷 */
export interface TaskProposalPayload {
  task_title: string;
  description: string;
  template_id?: string;
  schedule_label: string;
  risk_level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  risk_description?: string;
  scope_summary: string;
  output_summary: string;
  missing_slots?: string[];
  clarifying_question?: string;
}

/** 自动化意图识别结果 */
export interface AutomationIntentResult {
  automation_intent: 'create' | 'update' | 'pause' | 'resume' | 'delete' | 'rerun' | 'ask_status' | 'ask_history' | 'none';
  target_task_ref: 'current' | 'latest' | 'explicit_title' | 'unknown';
  requires_confirmation: boolean;
  risk_level: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  template_id?: string;
  slots: {
    schedule?: string;
    condition?: string;
    scope?: string;
    metrics?: string[];
    media?: string[];
    project?: string;
    time_range?: string;
    output_preference?: string;
  };
  missing_slots: string[];
  clarifying_question?: string;
}
