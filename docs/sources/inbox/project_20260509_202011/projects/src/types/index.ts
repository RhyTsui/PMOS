// 小乔智投 Type Definitions
// Based on: 数据对象真源, 接口真源, 使用帮助设计, 会话支撑能力设计, 提示词管理设计

// ==========================================
// Core Enums
// ==========================================

/** 意图类型 (四条业务流 + 专项 + 通用) */
export type IntentType = 'help' | 'demand' | 'diagnosis' | 'debugging' | 'monitor' | 'material-analysis' | 'forecast' | 'general';

/** Agent 类型 */
export type AgentType = 'hub' | 'help' | 'demand' | 'diagnosis' | 'debugging' | 'monitoring' | 'material' | 'prediction';

/** 任务状态 (数据对象真源 §5.5) */
export type TaskStatus = 'created' | 'clarifying' | 'running' | 'waiting' | 'completed' | 'archived' | 'downgraded';

/** 工作流层级 (数据对象真源 §5.4) */
export type WorkflowLevel = 'light' | 'heavy';

/** 任务所有者类型 (数据对象真源 §5.6) */
export type OwnerType = 'xiaoqiao' | 'sub-agent' | 'human-escalation';

/** 消息类型 (数据对象真源 §4.3) */
export type MessageType = 'user_input' | 'assistant_reply' | 'clarification' | 'system_notice' | 'workflow_summary';

/** 置信度 (数据对象真源 §7) */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** 证据来源类型 (数据对象真源 §8.3) */
export type EvidenceSourceType = 'upload' | 'knowledge' | 'media-data' | 'callback-log' | 'client-log' | 'report';

/** 附件种类 (会话支撑能力设计 §6.1) */
export type AttachmentKind = 'image' | 'document' | 'table' | 'log';

/** 附件上传状态 (会话支撑能力设计 §8.2) */
export type AttachmentStatus = 'uploading' | 'uploaded' | 'parsing' | 'parsed' | 'upload_failed' | 'parse_failed';

/** 结果类型 (数据对象真源 §7.3) */
export type ResultType = 'help_answer' | 'diagnosis_report' | 'demand_form' | 'debugging_report' | 'monitor_snapshot' | 'material_report' | 'forecast_report';

/** 会话当前模式 (数据对象真源 §3.3) */
export type ConversationMode = 'natural-chat' | 'light-workflow' | 'heavy-workflow';

/** 会话状态 (设计文档 §6.2) */
export type ConversationStatus = '普通对话' | '帮助中' | '排查中' | '需求沟通中' | '联调中';

/** 系统状态 (设计文档 §6.1) */
export type SystemStatus = '可用' | '繁忙' | '降级';

// ==========================================
// Core Business Objects (数据对象真源)
// ==========================================

/** 会话对象 (数据对象真源 §3) */
export interface Conversation {
  conversation_id: string;
  user_id: string;
  title: string;
  status: ConversationStatus;
  started_at: string;
  updated_at: string;
  last_message_at: string;
  current_mode: ConversationMode;
  // 前端扩展
  message_count?: number;
  latest_task_id?: string;
}

/** 消息对象 (数据对象真源 §4) */
export interface Message {
  message_id: string;
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
}

/** 路由决策对象 (数据对象真源 §10) */
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

/** 任务对象 (数据对象真源 §5) */
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

/** 任务上下文对象 (数据对象真源 §6) */
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

/** 缺失字段 (会话支撑能力设计 + 需求沟通设计) */
export interface MissingField {
  field_key: string;
  field_label: string;
  field_group?: string;
  priority?: 'required' | 'recommended' | 'optional';
  why_required: string;
  suggested_question: string;
  source?: string;
}

/** 工作流结果对象 (数据对象真源 §7) */
export interface WorkflowResult {
  result_id?: string;
  task_id: string;
  result_type: ResultType;
  summary: string;
  structured_payload: HelpResult | DemandResult | DiagnosisResult | DebuggingResult;
  confidence?: ConfidenceLevel;
  next_action?: string;
  created_at: string;
  // 前端扩展 (兼容)
  kind: IntentType;
  next_actions: string[];
  pending_checks: string[];
}

/** 证据对象 (数据对象真源 §8) */
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
  // 前端扩展 (兼容旧渲染)
  step?: number;
  detail: string;
  status: 'confirmed' | 'suspected' | 'pending';
  source: string;
  timestamp?: string;
}

/** Case 对象 (数据对象真源 §9) */
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

// ==========================================
// 附件 & 会话支撑 (会话支撑能力设计 §6)
// ==========================================

/** 附件记录 (会话支撑能力设计 §6.1) */
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
  source_type?: 'click' | 'drag' | 'paste';
  created_at: string;
  // 前端扩展
  filename: string; // 兼容: name
  type: AttachmentKind; // 兼容: kind
  url?: string; // 兼容: preview_url
  summary?: string; // 附件摘要
}

/** 附件摘要 (会话支撑能力设计 §6.2) */
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

/** 使用帮助结果 (使用帮助设计 §3.3 + F-HELP-01~04) */
export interface HelpResult {
  question_type: string;
  subject: string;
  definition_text: string;
  system_path?: string;
  source_refs: HelpSourceRef[];
  confidence_level: ConfidenceLevel;
  next_actions: HelpNextAction[];
  // 前端扩展 (兼容旧字段)
  definition: string;
  reference_sources: ReferenceSource[];
  follow_up_questions: string[];
}

/** 帮助来源引用 (使用帮助设计 §3.3) */
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

/** 需求沟通结果 (需求沟通设计) */
/** 需求沟通结果 (需求沟通设计 §3.3) */
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

/** 问题排查结果 (问题排查设计 §3.3) */
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
/** 联调结果 (自动联调设计 §3.2 + §4.4) */
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
// 自动联调专项 (自动联调设计 §3.2)
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

/** 自动联调任务 (自动联调实施方案 §5.1) */
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

/** 自动联调配置 (自动联调实施方案 §5.2) */
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

/** 自动联调执行结果 (自动联调实施方案 §5.4) */
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

/** 自动联调任务发起表单 (自动联调设计图 §1) */
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
  /** 方案边界 (做什么/不做什么) */
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
  /** 自动化边界 */
  automation_boundary: 'auto' | 'human-machine' | 'manual';
  /** 状态 */
  status: 'draft' | 'reviewing' | 'approved' | 'in-progress' | 'completed' | 'archived';
  /** 提出人 */
  proposer: string;
  /** 负责人 */
  owner: string;
  created_at: number;
  updated_at: number;
}

// ==========================================
// 通用引用来源 (兼容旧 ReferenceSource)
// ==========================================

export interface ReferenceSource {
  title: string;
  type: 'doc' | 'rule' | 'case';
  url?: string;
}

// ==========================================
// Workspace & Admin Types
// ==========================================

/** 工作空间 (接口真源 §9) */
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
}

/** 功能开关 */
export interface FeatureSwitch {
  key: string;
  label: string;
  enabled: boolean;
  scope: 'global' | 'role' | 'environment';
}

/** 提示词配置 (提示词管理设计 §3.2) */
export interface PromptConfig {
  id: string;
  name: string;
  scope: string;
  expectation: string;
  status: 'active' | 'draft' | 'archived';
  current_version: number;
  binding: PromptBinding;
  updated_at: string;
  // 扩展: 分类筛选
  category?: string;
  applicable_workflows?: string[];
  applicable_agents?: string[];
  applicable_models?: string[];
  enabled?: boolean;
}

/** 提示词版本 (提示词管理设计 §3.2) */
export interface PromptVersion {
  version: number;
  content: string;
  created_at: string;
  author: string;
  change_note: string;
}

/** 提示词绑定 (提示词管理设计 §3.2) */
export interface PromptBinding {
  workflow?: string;
  agent?: string;
  tool?: string;
}

// ==========================================
// 旧版兼容类型 (保留向后兼容)
// ==========================================

/** 旧版 Attachment (兼容旧组件) */
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

/** 依赖项 (需求沟通设计 §3.3) */
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
