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
  /** Agent 运行时元数据: thinking/tool_calls/route 等 */
  metadata?: Record<string, unknown>;
  /** 思考过程内容 (来自SSE thinking事件) */
  thinking?: string;
  /** 思考步骤列表 (结构化) */
  thinking_steps?: {
    key?: string;
    label: string;
    content: string;
    status: 'loading' | 'completed' | 'error';
    duration_ms?: number;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
  }[];
  /** 工具调用列表 (来自SSE tool_call事件) */
  tool_calls?: { name: string; type?: string; status?: string; arguments?: string; result?: string }[];
  /** 缺失字段 (来自SSE done事件) */
  missing_fields?: MissingField[];
  /** 证据ID列表 */
  evidence_ids?: string[];
  /** 路由决策 (来自SSE route事件) */
  routing_decision?: RoutingDecision;
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
// MCP Skill (可添加的MCP技能模板)
// ==========================================

/** MCP Skill 来源 */
export type McpSkillSource = 'builtin' | 'custom';

/** MCP Skill 分类 */
export type McpSkillCategory = 'data' | 'operation' | 'monitor' | 'analysis' | 'integration' | 'other';

/** MCP Skill 定义 */
export interface McpSkill {
  id: string;
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 图标(emoji或Lucide图标名) */
  icon: string;
  /** 来源: 内置/自定义 */
  source: McpSkillSource;
  /** 分类 */
  category: McpSkillCategory;
  /** MCP服务端点URL */
  endpoint_url: string;
  /** 传输协议 */
  transport: 'sse' | 'streamable-http';
  /** 鉴权方式 */
  auth_type: McpAuthType;
  /** 鉴权参数模板(值可能为空,用户需填写) */
  auth_config_template: Record<string, string>;
  /** 预期工具列表 */
  expected_tools: { name: string; description: string }[];
  /** 是否已安装(连接为McpServerConfig) */
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

/** 全局记忆条目 */
export interface MemoryEntry {
  id: string;
  /** 记忆内容 */
  content: string;
  /** 记忆类型 */
  memory_type: MemoryType;
  /** 来源 */
  source: MemorySource;
  /** 关联的会话ID(自动提取时) */
  source_conversation_id?: string;
  /** 关键词(用于检索) */
  keywords: string[];
  /** 关联业务域 */
  business_domain?: string;
  /** 重要性(1-5) */
  importance: number;
  /** 访问次数(被注入上下文的次数) */
  access_count: number;
  /** 最后访问时间 */
  last_accessed_at?: number;
  /** 是否已归档 */
  archived: boolean;
  created_at: number;
  updated_at: number;
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
  /** 阈值 */
  threshold: number;
  /** 时间窗口(秒) */
  window_seconds?: number;
}

/** 定时任务执行记录 */
export interface ScheduledTaskExecution {
  id: string;
  task_id: string;
  /** 执行状态 */
  status: 'success' | 'failed' | 'timeout';
  /** 开始时间 */
  started_at: number;
  /** 结束时间 */
  finished_at: number;
  /** 执行耗时(ms) */
  duration_ms: number;
  /** 执行结果摘要 */
  result_summary: string;
  /** 告警是否触发 */
  alert_triggered: boolean;
  /** 告警详情 */
  alert_details?: string;
  /** 错误信息 */
  error_message?: string;
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
  /** 状态 */
  status: ScheduledTaskStatus;
  /** 频率 */
  frequency: ScheduleFrequency;
  /** 自定义cron表达式(frequency=custom_cron时) */
  cron_expression?: string;
  /** 下次执行时间 */
  next_run_at?: number;
  /** 上次执行时间 */
  last_run_at?: number;
  /** 创建者 */
  created_by: string;
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
  /** 使用的MCP Skill */
  mcp_skill_id?: string;
  /** 自定义参数(透传给MCP工具) */
  custom_params: Record<string, unknown>;
  /** 执行历史(最近N条) */
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
  status: 'ready' | 'mock' | 'missing';
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
// Call Chain / Trace Data (开发者模式)
// ==========================================

/** Span 种类 */
export type SpanType = 'custom' | 'model' | 'tool' | 'agent';

/** 单个 Span 节点 */
export interface CallSpan {
  /** Span ID */
  spanId: string;
  /** Span 名称 (如 xiaoqiao.zhitou.chat) */
  name: string;
  /** Span 类型 */
  type: SpanType;
  /** 开始时间 (ms timestamp) */
  startTime: number;
  /** 结束时间 (ms timestamp) */
  endTime?: number;
  /** 耗时 (ms) */
  durationMs?: number;
  /** 状态 */
  status: 'running' | 'success' | 'error';
  /** 输入数据 */
  input?: Record<string, unknown>;
  /** 输出数据 */
  output?: Record<string, unknown>;
  /** Tags */
  tags?: Record<string, string>;
  /** 子 Span */
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
  latencyMs: number;
  finishReason?: string;
}

/** 工具调用详情 (Tool/MCP span 专属) */
export interface ToolCallDetail {
  toolName: string;
  toolType: 'builtin' | 'mcp';
  serverName?: string;
  query: string;
  resultPreview: string;
  latencyMs: number;
}

/** 完整调用链数据 */
export interface CallChainData {
  /** Trace ID */
  traceId: string;
  /** 根 Span */
  rootSpan: CallSpan;
  /** 总耗时 */
  totalDurationMs: number;
  /** 模型调用列表 (扁平化) */
  modelCalls: ModelCallDetail[];
  /** 工具调用列表 (扁平化) */
  toolCalls: ToolCallDetail[];
  /** Token 统计 */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
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

/** ============================================
 *  MCP 配置体系 (MCP Server + Tool 管理)
 *  ============================================ */

/** MCP 服务器类型 */
export type McpServerType = 'data' | 'function';

/** MCP 服务器连接状态 */
export type McpServerStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

/** MCP 鉴权方式 */
export type McpAuthType = 'none' | 'api_key' | 'oauth2' | 'bearer_token';

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
  /** 鉴权参数 (API key / token 等, 敏感字段打码) */
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
  /** 健康检查URL (可选) */
  health_check_url?: string;
  /** 最近一次健康检查时间 */
  last_health_check_at?: number;
  /** 最近一次ping时间 */
  last_ping_at?: number;
  /** 延迟(ms) */
  latency_ms?: number;
  /** 错误信息 (status=error 时) */
  error_message?: string;
  created_at: number;
  updated_at: number;
}
