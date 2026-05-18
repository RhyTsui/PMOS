// 小乔智投 Constants & Mock Data
// Based on: 数据对象真源, 接口真源, 使用帮助设计, 会话支撑能力设计, 提示词管理设计

import type {
  Conversation,
  Task,
  WorkflowResult,
  TaskContext,
  WorkspaceResponse,
  PromptConfig,
  Message,
  RoutingDecision,
  CaseRecord,
  AttachmentRecord,
  AttachmentSummary,
  EvidenceItem,
  MissingField,
  DebugAutomationTask,
  DebugExecutionStep,
  DebugExecutionResult,
} from '@/types';

// ==========================================
// Color Palette
// ==========================================
export const COLORS = {
  primary: '#0A0E1A',
  primaryLight: '#141B2D',
  primaryMid: '#1A2235',
  accent: '#00D9FF',
  accentGlow: 'rgba(0, 217, 255, 0.3)',
  accentSoft: 'rgba(0, 217, 255, 0.1)',
  success: '#00FF88',
  warning: '#FFB800',
  danger: '#FF3366',
  info: '#7B61FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B9DC3',
  textMuted: '#4A5568',
  border: 'rgba(255,255,255,0.06)',
};

// ==========================================
// Animation
// ==========================================
export const ANIMATION = {
  breathe: 3000,
  fadeIn: 400,
  slideIn: 300,
  hover: 150,
  typing: 40,
};

// ==========================================
// Business Flow Labels (四条业务流)
// ==========================================
export const BUSINESS_FLOWS = {
  help: { name: '使用帮助', icon: 'BookOpen', color: '#00D9FF', desc: '指标解释、系统导航、规则引用' },
  demand: { name: '需求沟通', icon: 'MessageSquarePlus', color: '#7B61FF', desc: '结构化需求、缺失字段、协作计划' },
  diagnosis: { name: '问题排查', icon: 'Search', color: '#FF3366', desc: '证据链、结论、置信度、建议' },
  debugging: { name: '广告联调', icon: 'Wrench', color: '#FFB800', desc: '准备项、执行状态、日志、报告' },
} as const;

// ==========================================
// Agent Configuration (小乔智投 Agent 配置)
// ==========================================
export const AGENT_MAP: Record<string, { id: string; name: string; color: string; desc: string }> = {
  hub: { id: 'hub', name: '小乔', color: '#00D9FF', desc: '统一对话入口' },
  help: { id: 'help', name: '使用帮助', color: '#00D9FF', desc: '指标解释、系统导航、规则引用' },
  demand: { id: 'demand', name: '需求沟通', color: '#7B61FF', desc: '结构化需求、缺失字段、协作计划' },
  diagnosis: { id: 'diagnosis', name: '问题排查', color: '#FF3366', desc: '证据链、结论、置信度、建议' },
  debugging: { id: 'debugging', name: '广告联调', color: '#FFB800', desc: '准备项、执行状态、日志、报告' },
  monitoring: { id: 'monitoring', name: '监控大屏', color: '#00FF88', desc: '运行状态观测与告警' },
  material: { id: 'material', name: '素材分析', color: '#FF6B9D', desc: '创意脚本解析与报表' },
  prediction: { id: 'prediction', name: '广告预测', color: '#FFB800', desc: 'ROI预测与回本测算' },
};

export const AGENTS = Object.values(AGENT_MAP);

// Agent icon components (imported from lucide-react)
import {
  Brain,
  BookOpen,
  MessageSquarePlus,
  Search,
  Wrench,
  Activity,
  Image,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const AGENT_ICONS: Record<string, LucideIcon> = {
  hub: Brain,
  help: BookOpen,
  demand: MessageSquarePlus,
  diagnosis: Search,
  debugging: Wrench,
  monitoring: Activity,
  material: Image,
  prediction: TrendingUp,
};

// Agent tools configuration - defines which tools each agent can use
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
}

export const AGENT_TOOLS: Record<string, AgentTool[]> = {
  hub: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '搜索知识库文档', icon: 'BookOpen' },
    { id: 'web_search', name: 'web_search', description: '搜索互联网信息', icon: 'Globe' },
  ],
  help: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '搜索广告知识库', icon: 'BookOpen' },
    { id: 'web_search', name: 'web_search', description: '搜索最新政策文档', icon: 'Globe' },
  ],
  demand: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '搜索需求模板与配置文档', icon: 'BookOpen' },
    { id: 'web_search', name: 'web_search', description: '搜索媒体平台最新要求', icon: 'Globe' },
    { id: 'collect_demand_fields', name: 'collect_demand_fields', description: '收集需求关键字段', icon: 'ClipboardList' },
  ],
  diagnosis: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '搜索排查知识库', icon: 'BookOpen' },
    { id: 'web_search', name: 'web_search', description: '搜索已知问题与解决方案', icon: 'Globe' },
    { id: 'collect_diagnosis_context', name: 'collect_diagnosis_context', description: '收集排查上下文信息', icon: 'ClipboardList' },
    { id: 'diagnose_issue', name: 'diagnose_issue', description: '执行问题诊断分析', icon: 'Stethoscope' },
    { id: 'generate_diagnosis_report', name: 'generate_diagnosis_report', description: '生成排查报告', icon: 'FileText' },
  ],
  debugging: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '搜索联调知识库', icon: 'BookOpen' },
    { id: 'web_search', name: 'web_search', description: '搜索平台联调文档', icon: 'Globe' },
    { id: 'check_prerequisites', name: 'check_prerequisites', description: '检查联调前置条件', icon: 'CheckSquare' },
    { id: 'execute_debug_step', name: 'execute_debug_step', description: '执行联调步骤', icon: 'Play' },
    { id: 'generate_debug_report', name: 'generate_debug_report', description: '生成联调报告', icon: 'FileText' },
  ],
  monitoring: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '搜索监控指标说明', icon: 'BookOpen' },
    { id: 'query_metrics', name: 'query_metrics', description: '查询实时监控指标', icon: 'Activity' },
  ],
  material: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '搜索素材规范文档', icon: 'BookOpen' },
    { id: 'parse_creative_script', name: 'parse_creative_script', description: '解析创意脚本', icon: 'Code' },
    { id: 'match_similar_material', name: 'match_similar_material', description: '匹配相似素材', icon: 'Image' },
  ],
  prediction: [
    { id: 'knowledge_search', name: 'knowledge_search', description: '搜索预测模型文档', icon: 'BookOpen' },
    { id: 'predict_roi', name: 'predict_roi', description: '预测ROI指标', icon: 'TrendingUp' },
    { id: 'calculate_break_even', name: 'calculate_break_even', description: '计算回本周期', icon: 'Calculator' },
  ],
};

// Agent response templates
export const AGENT_RESPONSES: Record<string, Record<string, string>> = {
  hub: {
    help: '我是小乔，您的广告智能工作台。我可以帮您：\n\n1. **使用帮助** - 指标解释、系统导航、规则引用\n2. **需求沟通** - 结构化需求、缺失字段、协作计划\n3. **问题排查** - 证据链、结论、置信度、建议\n4. **广告联调** - 准备项、执行状态、日志、报告\n\n请直接描述您的问题或需求，我会自动识别并为您服务。',
    greeting: '您好！我是小乔，广告智能工作台。有什么可以帮您的？',
  },
  help: {
    default: '请问您想了解哪方面的内容？\n\n- 媒体政策\n- 指标解释\n- 对接需求\n- 归因模型',
  },
  demand: {
    default: '好的，我将帮助您收集对接需求。请提供以下信息：\n\n1. **媒体平台**：巨量 / 快手 / Google / 其他\n2. **应用名称**：需要对接的游戏\n3. **需求类型**：监测回传 / 事件映射 / 埋点配置\n4. **预期时间**：期望完成日期',
  },
  diagnosis: {
    default: '请告诉我您想诊断的问题，例如：\n- "为什么昨天巨量激活比BI少30%？"\n- "排查某个用户的数据问题"\n- "分析某个广告计划的表现"',
  },
  debugging: {
    default: '联调工具已就绪。我可以帮您：\n- 检查联调准备项\n- 执行联调流程\n- 查看联调日志\n- 生成联调报告',
  },
};

// ==========================================
// Special Page Labels (专项页)
// ==========================================
export const SPECIAL_PAGES = {
  monitor: { name: '监控大屏', icon: 'Activity', color: '#00FF88' },
  material: { name: '素材分析', icon: 'Image', color: '#FF6B9D' },
  forecast: { name: '广告预测', icon: 'TrendingUp', color: '#FFB800' },
} as const;

// ==========================================
// Recommended Starter Questions (F-02)
// ==========================================
export const STARTER_QUESTIONS = [
  { label: 'ROAS 怎么计算？', intent: 'help' as const },
  { label: '提交巨量监测回传需求', intent: 'demand' as const },
  { label: '昨天巨量激活比 BI 少 30%', intent: 'diagnosis' as const },
  { label: '发起巨量联调测试', intent: 'debugging' as const },
  { label: '归因窗口期是多少？', intent: 'help' as const },
  { label: 'TikTok 事件映射配置', intent: 'demand' as const },
];

// ==========================================
// Mock: Workspace (接口真源 §9)
// ==========================================
export const MOCK_WORKSPACE: WorkspaceResponse = {
  user_id: 'u_001',
  user_name: '广告支持-小乔',
  status_summary: '可用',
  quick_modes: ['使用帮助', '需求沟通', '问题排查', '广告联调'],
  recent_tasks: [],
  app_support_summary: ['知识库正常', 'MCP 正常', '媒体文档正常'],
  conversation_count: 12,
  task_count: 34,
  current_mode: '工作台',
  capabilities: ['知识库', 'MCP', '媒体文档', '需求池', '数仓查询'],
  feature_switches: [
    { key: 'auto_route', label: '自动路由', enabled: true, scope: 'global' },
    { key: 'clarification', label: '追问补全', enabled: true, scope: 'global' },
    { key: 'evidence_chain', label: '证据链展示', enabled: true, scope: 'global' },
    { key: 'auto_execute', label: '自动联调', enabled: false, scope: 'environment' },
  ],
  recent_results: [],
};

// ==========================================
// Mock: Conversations (数据对象真源 §3)
// ==========================================
export const MOCK_CONVERSATIONS: Conversation[] = [
  { conversation_id: 'conv_001', user_id: 'u_001', title: '巨量激活缺口排查', status: '排查中', started_at: '2026-05-07T14:30:00Z', updated_at: '2026-05-07T15:12:00Z', last_message_at: '2026-05-07T15:12:00Z', current_mode: 'heavy-workflow', message_count: 8, latest_task_id: 'task_diag_001' },
  { conversation_id: 'conv_002', user_id: 'u_001', title: 'TikTok 回传对接需求', status: '需求沟通中', started_at: '2026-05-07T10:00:00Z', updated_at: '2026-05-07T11:30:00Z', last_message_at: '2026-05-07T11:30:00Z', current_mode: 'heavy-workflow', message_count: 12, latest_task_id: 'task_dem_001' },
  { conversation_id: 'conv_003', user_id: 'u_001', title: 'ROAS 指标解释', status: '帮助中', started_at: '2026-05-06T16:00:00Z', updated_at: '2026-05-06T16:05:00Z', last_message_at: '2026-05-06T16:05:00Z', current_mode: 'light-workflow', message_count: 4, latest_task_id: 'task_help_001' },
  { conversation_id: 'conv_004', user_id: 'u_001', title: '指间山海联调测试', status: '联调中', started_at: '2026-05-06T09:00:00Z', updated_at: '2026-05-06T12:00:00Z', last_message_at: '2026-05-06T12:00:00Z', current_mode: 'heavy-workflow', message_count: 15, latest_task_id: 'task_dbg_001' },
  { conversation_id: 'conv_005', user_id: 'u_001', title: 'Google UAC 配置问题', status: '帮助中', started_at: '2026-05-05T11:00:00Z', updated_at: '2026-05-05T11:20:00Z', last_message_at: '2026-05-05T11:20:00Z', current_mode: 'light-workflow', message_count: 6 },
];

// ==========================================
// Mock: Tasks (数据对象真源 §5)
// ==========================================
export const MOCK_TASKS: Task[] = [
  { task_id: 'task_diag_001', conversation_id: 'conv_001', task_type: 'diagnosis', workflow_level: 'heavy', status: 'completed', owner_type: 'xiaoqiao', created_at: '2026-05-07T14:30:00Z', updated_at: '2026-05-07T15:12:00Z', id: 'task_diag_001', title: '巨量激活缺口排查', summary: '巨量回传时间戳格式异常，导致 30% 激活未入 BI' },
  { task_id: 'task_dem_001', conversation_id: 'conv_002', task_type: 'demand', workflow_level: 'heavy', status: 'clarifying', owner_type: 'xiaoqiao', created_at: '2026-05-07T10:00:00Z', updated_at: '2026-05-07T11:30:00Z', id: 'task_dem_001', title: 'TikTok 回传对接需求', summary: '待补齐：测试账号、包体地址' },
  { task_id: 'task_help_001', conversation_id: 'conv_003', task_type: 'help', workflow_level: 'light', status: 'completed', owner_type: 'xiaoqiao', created_at: '2026-05-06T16:00:00Z', updated_at: '2026-05-06T16:05:00Z', id: 'task_help_001', title: 'ROAS 指标解释', summary: 'ROAS = 广告收入 / 广告支出' },
  { task_id: 'task_dbg_001', conversation_id: 'conv_004', task_type: 'debugging', workflow_level: 'heavy', status: 'running', owner_type: 'xiaoqiao', created_at: '2026-05-06T09:00:00Z', updated_at: '2026-05-06T12:00:00Z', id: 'task_dbg_001', title: '指间山海联调测试', summary: '联调执行中，已完成 3/5 步' },
  { task_id: 'task_diag_002', conversation_id: 'conv_005', task_type: 'help', workflow_level: 'light', status: 'completed', owner_type: 'xiaoqiao', created_at: '2026-05-05T11:00:00Z', updated_at: '2026-05-05T11:20:00Z', id: 'task_diag_002', title: 'Google UAC 配置问题', summary: '已提供配置路径和规则引用' },
];

// ==========================================
// Mock: Task Contexts (数据对象真源 §6)
// ==========================================
export const MOCK_TASK_CONTEXTS: Record<string, TaskContext> = {
  task_diag_001: {
    task_id: 'task_diag_001',
    is_business_related: true,
    business_domain: 'ad',
    intent_type: 'diagnosis',
    media: '巨量',
    app: '指间山海',
    plan_id: 'PLAN-7788',
    time_range: '2026-04-20',
    anomaly_type: '激活缺口',
    missing_fields: [],
    attachments: [],
  },
  task_dem_001: {
    task_id: 'task_dem_001',
    is_business_related: true,
    business_domain: 'ad',
    intent_type: 'demand',
    media: 'TikTok',
    app: '云上城歌',
    demand_type: '监测回传对接',
    target_date: '2026-05-15',
    missing_fields: [
      { field_key: 'test_account', field_label: '测试账号', field_group: '联调准备', priority: 'required', why_required: '联调需要白名单测试账号', suggested_question: '请提供 TikTok 广告测试账号 ID', source: 'demand_workflow' },
      { field_key: 'package_url', field_label: '包体地址', field_group: '联调准备', priority: 'required', why_required: '需要确认测试包体版本', suggested_question: '请提供测试包体下载地址', source: 'demand_workflow' },
      { field_key: 'event_manager', field_label: '事件管理器', field_group: '配置项', priority: 'recommended', why_required: '需确认 TikTok 事件管理器已创建', suggested_question: 'TikTok 事件管理器是否已配置？', source: 'demand_workflow' },
    ],
    attachments: [],
  },
  task_dbg_001: {
    task_id: 'task_dbg_001',
    is_business_related: true,
    business_domain: 'ad',
    intent_type: 'debugging',
    media: '巨量',
    app: '指间山海',
    device_id: 'ANDROID-01',
    account: 'AD_ACC_001',
    missing_fields: [],
    attachments: [],
  },
};

// ==========================================
// Mock: Workflow Results (四类结果)
// ==========================================
export const MOCK_RESULTS: Record<string, WorkflowResult> = {
  task_diag_001: {
    result_id: 'res_diag_001',
    task_id: 'task_diag_001',
    result_type: 'diagnosis_report',
    summary: '巨量回传时间戳格式异常，导致 30% 激活未入 BI',
    structured_payload: {
      summary_conclusion: '巨量回传时间戳格式异常，导致 30% 激活未入 BI',
      confidence_level: 'high',
      confidence_score: 0.92,
      anomaly_type: 'activation',
      affected_scope: '2026-04-20 19:00~21:00 时段，影响激活约 360 条',
      risk_level: 'high',
      evidence_items: [
        { id: 'ev_inline_001', evidence_type: 'log', title: '巨量回调日志异常', summary: '2026-04-20 19:00~21:00 时段回调日志显示时间戳为 Unix 秒级，非毫秒', relevance: 'high', timestamp: '2026-05-07T15:00:00Z' },
        { id: 'ev_inline_002', evidence_type: 'data_result', title: 'BI 激活数据缺口', summary: 'BI 报表激活数 842 条，媒体回传 1203 条，差额 361 条', relevance: 'high', timestamp: '2026-05-07T14:50:00Z' },
        { id: 'ev_inline_003', evidence_type: 'status', title: '回传服务运行正常', summary: 'S2S 回传服务状态正常，QPS 和延迟均在阈值内', relevance: 'medium', timestamp: '2026-05-07T14:45:00Z' },
      ],
      missing_evidence_items: [
        { evidence_type: 'client-log', description: 'SDK 原始上报日志，确认客户端上报时间戳是否正常', owner_role: '开发', priority: 'high' as const },
        { evidence_type: 'log', description: '媒体回调确认，确认媒体侧是否收到全部回传', owner_role: '广告支持', priority: 'medium' as const },
      ],
      next_actions: [
        { action: '修正回传时间戳格式', owner_role: '开发', status: 'pending' as const },
        { action: '复测 19:00~21:00 时段数据', owner_role: '广告支持', status: 'pending' as const },
        { action: '更新配置文档', owner_role: '广告支持', status: 'pending' as const },
      ],
      owner_roles: ['广告支持', '开发'],
    },
    confidence: 'high',
    next_action: '修正回传时间戳格式并复测',
    kind: 'diagnosis',
    next_actions: ['修正回传时间戳格式', '复测 19:00~21:00 时段数据', '更新配置文档'],
    pending_checks: ['确认修正后回传成功率', '验证 BI 数据是否补齐'],
    created_at: '2026-05-07T15:12:00Z',
  },
  task_dem_001: {
    result_id: 'res_dem_001',
    task_id: 'task_dem_001',
    result_type: 'demand_form',
    summary: 'TikTok 媒体回传对接需求（草稿，缺 2 个字段）',
    structured_payload: {
      demand_type: 'media_postback',
      demand_summary: 'TikTok 媒体回传对接需求，包含事件映射和回传配置',
      form: {
        media: 'TikTok',
        app_name: '云上城歌',
        package_name: 'com.cloudcity.song',
        target_object: '监测回传配置',
        target_timeline: '2026-05-15',
        acceptance_method: 'S2S 回传验证',
      },
      missing_fields: [
        { field_name: 'event_mapping', field_label: '事件映射', priority: 'high' as const, owner_role: '广告支持', reason: '需要明确客户端事件到媒体事件的映射关系' },
        { field_name: 'test_account', field_label: '测试账号', priority: 'medium' as const, owner_role: '开发', reason: '需要测试账号用于联调验证' },
      ],
      dependencies: [
        { dep_id: 'dep_001', dep_system: 'TikTok 事件管理器', dep_role: '广告支持', dep_action: '创建应用事件', owner: '广告支持-小乔', status: 'pending' as const },
        { dep_id: 'dep_002', dep_system: '测试设备白名单', dep_role: '开发', dep_action: '添加测试设备', owner: '开发-张工', status: 'pending' as const },
        { dep_id: 'dep_003', dep_system: 'S2S 回传服务', dep_role: '后端', dep_action: '配置回传 URL', owner: '后端-李工', status: 'completed' as const },
      ],
      next_actions: [
        { action: '补充测试账号', status: 'to_complete' as const, owner_role: '开发' },
        { action: '确认包体地址', status: 'to_process' as const, owner_role: '开发' },
        { action: '完善事件映射', status: 'to_generate' as const, owner_role: '广告支持' },
      ],
      owner_roles: ['广告支持-小乔', '开发-张工'],
      status: 'draft',
    },
    next_action: '补充测试账号和包体地址',
    kind: 'demand',
    next_actions: ['补充测试账号', '确认包体地址', '完善事件映射'],
    pending_checks: ['TikTok 事件管理器是否已创建'],
    created_at: '2026-05-07T11:30:00Z',
  },
  task_help_001: {
    result_id: 'res_help_001',
    task_id: 'task_help_001',
    result_type: 'help_answer',
    summary: 'ROAS (广告支出回报率) 指标解释',
    structured_payload: {
      question_type: '指标解释',
      subject: 'ROAS',
      definition_text: 'ROAS (Return On Ad Spend) = 广告收入 / 广告支出，衡量每投入 1 元广告能带来多少收入。',
      system_path: 'BI 报表 > 广告效果 > ROAS 列',
      source_refs: [
        { source_type: 'doc', title: 'ROAS 计算口径说明', relevance: 'primary' },
        { source_type: 'rule', title: '广告指标定义规范 v2.1', relevance: 'primary' },
        { source_type: 'case', title: 'CASE-20260410-003 ROAS 异常归因', relevance: 'supplementary' },
      ],
      confidence_level: 'high',
      next_actions: [
        { action_type: 'ask_followup', label: 'ROAS 和 ROI 有什么区别？' },
        { action_type: 'ask_followup', label: '如何优化 ROAS？' },
        { action_type: 'upgrade_workflow', label: 'ROAS 异常排查', target: 'diagnosis' },
      ],
      // 兼容旧字段
      definition: 'ROAS (Return On Ad Spend) = 广告收入 / 广告支出，衡量每投入 1 元广告能带来多少收入。',
      reference_sources: [
        { title: 'ROAS 计算口径说明', type: 'doc' },
        { title: '广告指标定义规范 v2.1', type: 'rule' },
        { title: 'CASE-20260410-003 ROAS 异常归因', type: 'case' },
      ],
      follow_up_questions: ['ROAS 和 ROI 有什么区别？', '如何优化 ROAS？', '不同媒体的 ROAS 基准线是多少？'],
    },
    confidence: 'high',
    next_action: '继续追问或升级排查',
    kind: 'help',
    next_actions: [],
    pending_checks: [],
    created_at: '2026-05-06T16:05:00Z',
  },
  task_dbg_001: {
    result_id: 'res_dbg_001',
    task_id: 'task_dbg_001',
    result_type: 'debugging_report',
    summary: '指间山海巨量联调：已完成 3/5 步，设备登录步骤待执行',
    structured_payload: {
      current_stage: 'running_mobile_launch',
      stages: [
        { stage: 'running_web_prepare' as const, label: 'Web 准备', status: 'completed' as const, started_at: '2026-05-06T09:05:00Z', completed_at: '2026-05-06T09:05:05Z' },
        { stage: 'running_mobile_scan' as const, label: '扫码', status: 'completed' as const, started_at: '2026-05-06T09:05:05Z', completed_at: '2026-05-06T09:05:10Z' },
        { stage: 'running_mobile_find_ad' as const, label: '刷广告', status: 'completed' as const, started_at: '2026-05-06T09:05:10Z', completed_at: '2026-05-06T09:05:13Z' },
        { stage: 'running_mobile_launch' as const, label: '拉起应用', status: 'running' as const, started_at: '2026-05-06T09:05:13Z' },
        { stage: 'running_success_poll' as const, label: '成功验证', status: 'pending' as const },
      ],
      readiness_items: [
        { item: '投放账号', status: 'ready' as const, detail: 'AD_ACC_001 已配置' },
        { item: '白名单设备', status: 'ready' as const, detail: 'ANDROID-01 在线' },
        { item: '包体版本', status: 'ready' as const, detail: 'v3.2.1-debug' },
        { item: '回传配置', status: 'ready' as const, detail: 'S2S 回传 URL 已配置' },
        { item: '环境检查', status: 'ready' as const, detail: '测试环境正常' },
      ],
      execution_logs: [
        { step: 1, action: '登录巨量后台', status: 'success' as const, duration: 3200, observation: '登录成功', timestamp: '2026-05-06T09:05:00Z' },
        { step: 2, action: '进入联调工具', status: 'success' as const, duration: 2100, observation: '进入成功', timestamp: '2026-05-06T09:05:03Z' },
        { step: 3, action: '生成二维码', status: 'success' as const, duration: 1500, observation: '二维码已生成', timestamp: '2026-05-06T09:05:05Z' },
        { step: 4, action: '手机扫码', status: 'success' as const, duration: 5100, observation: '扫码成功', timestamp: '2026-05-06T09:05:10Z' },
        { step: 5, action: '找到广告', status: 'success' as const, duration: 2800, observation: '找到指间山海广告', timestamp: '2026-05-06T09:05:13Z' },
        { step: 6, action: '点击广告', status: 'success' as const, duration: 1800, observation: '落地页加载成功', timestamp: '2026-05-06T09:05:15Z' },
        { step: 7, action: '拉起游戏', status: 'running' as const, duration: 0, observation: '等待游戏启动...', timestamp: '2026-05-06T09:05:17Z' },
        { step: 8, action: '轮询激活标记', status: 'pending' as const, observation: '' },
      ],
      result_status: 'running',
      issues_found: ['游戏启动延迟偏高（>10s）'],
      can_takeover: true,
      takeover_reason: '游戏启动超时，可人工介入',
    },
    confidence: 'medium',
    next_action: '等待游戏启动完成',
    kind: 'debugging',
    next_actions: ['等待游戏启动完成', '执行登录步骤', '检查激活回传'],
    pending_checks: ['激活回传是否到达', '归因结果是否生成'],
    created_at: '2026-05-06T12:00:00Z',
  },
};

// ==========================================
// Mock: Cases (数据对象真源 §9)
// ==========================================
export const MOCK_CASES: CaseRecord[] = [
  { case_id: 'case_001', source_task_id: 'task_diag_001', case_type: 'diagnosis', title: '巨量回传时间戳格式异常排查', summary: '巨量回传时间戳格式异常导致激活缺口，修正后回传成功率恢复', reusable_points: ['时间戳格式校验规则', 'S2S 回传监控要点', 'BI 补数据流程'], status: 'active', created_at: '2026-05-07T16:00:00Z' },
  { case_id: 'case_002', source_task_id: 'task_help_001', case_type: 'help', title: 'ROAS 指标解释标准回答', summary: 'ROAS 计算口径和系统路径的标准解释', reusable_points: ['ROAS 定义', 'BI 路径', '优化建议模板'], status: 'active', created_at: '2026-05-06T17:00:00Z' },
];

// ==========================================
// Mock: Attachments (会话支撑能力设计 §6)
// ==========================================
export const MOCK_ATTACHMENTS: AttachmentRecord[] = [
  { id: 'att_001', conversation_id: 'conv_001', message_id: 'msg_003', task_id: 'task_diag_001', name: '巨量激活报表_0507.xlsx', filename: '巨量激活报表_0507.xlsx', kind: 'table', type: 'table', mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 245760, status: 'parsed', preview_url: '#', created_at: '2026-05-07T14:32:00Z', summary: '包含 2026-04-20 巨量投放激活数据，共 1200 条记录' },
  { id: 'att_002', conversation_id: 'conv_001', message_id: 'msg_005', task_id: 'task_diag_001', name: 's2s_log_0507.png', filename: 's2s_log_0507.png', kind: 'image', type: 'image', mime_type: 'image/png', size: 89000, status: 'parsed', preview_url: '#', created_at: '2026-05-07T14:45:00Z', summary: 'S2S 回传日志截图，显示时间戳格式异常行' },
];

// ==========================================
// Mock: Evidence (会话支撑能力设计 §6 + 数据对象真源 §8)
// ==========================================
export const MOCK_EVIDENCE: EvidenceItem[] = [
  {
    evidence_id: 'evi_001',
    task_id: 'task_diag_001',
    evidence_type: 'callback-log',
    title: 'S2S 回传日志',
    summary: '部分回传请求时间戳格式异常，使用 unix_ms 而非 iso8601',
    source_attachment_id: 'att_002',
    source_message_id: 'msg_005',
    confidence: 'high',
    happened_at: '2026-05-07T19:30:00Z',
    detail: '日志显示 19:00-21:00 时段有 360 条回传使用 unix_ms 时间戳，不符合巨量 API 要求',
    status: 'confirmed',
    source: 'S2S 回传日志',
    step: 1,
  },
  {
    evidence_id: 'evi_002',
    task_id: 'task_diag_001',
    evidence_type: 'media-data',
    title: '巨量激活报表',
    summary: '2026-05-07 19:00-21:00 时段 360 条激活记录缺失媒体侧匹配',
    source_attachment_id: 'att_001',
    source_message_id: 'msg_003',
    confidence: 'high',
    happened_at: '2026-05-07T20:00:00Z',
    detail: '对比巨量后台与我们 BI 数据，19:00-21:00 时段存在 28% 缺口（BI 1200 vs 巨量 864）',
    status: 'confirmed',
    source: '巨量激活报表',
    step: 2,
  },
  {
    evidence_id: 'evi_003',
    task_id: 'task_diag_001',
    evidence_type: 'knowledge',
    title: '巨量时间戳格式要求',
    summary: '巨量 S2S 回传 API 文档要求时间戳格式为 iso8601',
    confidence: 'medium',
    happened_at: '2026-05-07T14:00:00Z',
    detail: '根据巨量 S2S API 文档 v2.3，event_time 字段必须为 ISO8601 格式',
    status: 'suspected',
    source: '巨量 API 文档',
    step: 3,
  },
];

// ==========================================
// Mock: Missing Fields (会话支撑能力设计 §4 R-S02)
// ==========================================
export const MOCK_MISSING_FIELDS: MissingField[] = [
  {
    field_key: 'time_range',
    field_label: '异常时间范围',
    field_group: '基础信息',
    priority: 'required',
    why_required: '确定异常出现的时间范围，缩小排查区间',
    suggested_question: '异常出现在哪天？',
    source: 'diagnosis_workflow',
  },
  {
    field_key: 'media',
    field_label: '涉及媒体',
    field_group: '基础信息',
    priority: 'required',
    why_required: '不同媒体有不同的回传和归因逻辑',
    suggested_question: '涉及哪个媒体平台？',
    source: 'diagnosis_workflow',
  },
  {
    field_key: 'device_id',
    field_label: '测试设备',
    field_group: '联调配置',
    priority: 'optional',
    why_required: '联调时需要指定白名单设备',
    suggested_question: '使用哪台设备测试？',
    source: 'debugging_workflow',
  },
];

export const MOCK_ATTACHMENT_SUMMARIES: Record<string, AttachmentSummary> = {
  att_001: {
    attachment_id: 'att_001',
    summary: '包含 2026-04-20 巨量投放激活数据，共 1200 条记录。其中 19:00-21:00 时段 360 条回传时间戳异常',
    keywords: ['巨量', '激活', '时间戳异常'],
    structured_fields: { total_records: '1200', abnormal_count: '360', time_range: '19:00-21:00' },
    parse_status: 'parsed',
    parser_type: 'excel-parser',
    updated_at: '2026-05-07T14:33:00Z',
  },
  att_002: {
    attachment_id: 'att_002',
    summary: 'S2S 回传日志截图，可看到部分回传请求时间戳格式为 unix_ms，部分为 iso8601',
    keywords: ['S2S', '回传日志', '时间戳'],
    parse_status: 'parsed',
    parser_type: 'image-ocr',
    updated_at: '2026-05-07T14:46:00Z',
  },
};

// ==========================================
// Mock: Monitoring Data
// ==========================================
export const MOCK_MONITORING_DATA = {
  metrics: [
    { id: 'sdk_upload', name: 'SDK 上报延迟', value: 120, unit: 'ms', status: 'normal' as const, threshold: 500 },
    { id: 'attribution_delay', name: '归因延迟', value: 340, unit: 'ms', status: 'warning' as const, threshold: 300 },
    { id: 'postback_delay', name: '回推延迟', value: 890, unit: 'ms', status: 'critical' as const, threshold: 600 },
    { id: 'upload_success', name: '上报成功率', value: 99.2, unit: '%', status: 'normal' as const, threshold: 95 },
    { id: 'attribution_rate', name: '归因匹配率', value: 87.3, unit: '%', status: 'warning' as const, threshold: 90 },
    { id: 'abnormal_traffic', name: '异常流量占比', value: 2.1, unit: '%', status: 'normal' as const, threshold: 5 },
  ],
  alerts: [
    { id: 'alert_001', type: '回推延迟', level: 'critical', message: '巨量回推延迟超过阈值 600ms，当前 890ms', timestamp: '2026-05-07T15:00:00Z' },
    { id: 'alert_002', type: '归因匹配率', level: 'warning', message: '归因匹配率降至 87.3%，低于 90% 基线', timestamp: '2026-05-07T14:50:00Z' },
    { id: 'alert_003', type: 'SDK 上报', level: 'info', message: 'SDK 上报恢复正常', timestamp: '2026-05-07T14:30:00Z' },
  ],
};

// ==========================================
// Mock: Prompt Configs (提示词管理设计 §3)
// ==========================================
export const MOCK_PROMPT_CONFIGS: PromptConfig[] = [
  { id: 'prompt_001', name: '路由判断提示词', scope: 'routing', expectation: '准确识别四类业务意图', status: 'active', current_version: 3, binding: { workflow: 'routing' }, updated_at: '2026-05-06', category: '路由', applicable_workflows: ['routing'], applicable_agents: ['hub'], applicable_models: ['gpt-4o'], enabled: true },
  { id: 'prompt_002', name: '使用帮助提示词', scope: 'help', expectation: '提供准确的指标解释与系统路径', status: 'active', current_version: 5, binding: { workflow: 'help' }, updated_at: '2026-05-05', category: '业务流', applicable_workflows: ['help'], applicable_agents: ['help'], applicable_models: ['gpt-4o'], enabled: true },
  { id: 'prompt_003', name: '排查分析提示词', scope: 'diagnosis', expectation: '输出结构化证据链与结论', status: 'active', current_version: 4, binding: { workflow: 'diagnosis' }, updated_at: '2026-05-06', category: '业务流', applicable_workflows: ['diagnosis'], applicable_agents: ['diagnosis'], applicable_models: ['gpt-4o'], enabled: true },
  { id: 'prompt_004', name: '需求沟通提示词', scope: 'demand', expectation: '结构化需求单并追问缺失字段', status: 'active', current_version: 2, binding: { workflow: 'demand' }, updated_at: '2026-05-04', category: '业务流', applicable_workflows: ['demand'], applicable_agents: ['demand'], applicable_models: ['gpt-4o'], enabled: true },
  { id: 'prompt_005', name: '联调执行提示词', scope: 'debugging', expectation: '按步骤执行联调流程', status: 'draft', current_version: 1, binding: { workflow: 'debugging' }, updated_at: '2026-05-07', category: '业务流', applicable_workflows: ['debugging'], applicable_agents: ['debugging'], applicable_models: ['gpt-4o'], enabled: false },
  { id: 'prompt_006', name: '追问补全提示词', scope: 'clarification', expectation: '识别缺失字段并生成追问', status: 'active', current_version: 3, binding: { tool: 'clarification_service' }, updated_at: '2026-05-06', category: '支撑', applicable_workflows: ['routing'], applicable_agents: ['hub'], applicable_models: ['gpt-4o-mini'], enabled: true },
];

// ==========================================
// Mock: Prompt Versions
// ==========================================
export const MOCK_PROMPT_VERSIONS: Record<string, import('@/types').PromptVersion[]> = {
  prompt_001: [
    { version: 3, content: '你是小乔路由判断模块。根据用户输入，判断：1) 是否业务相关 2) 属于哪个业务域 3) 意图类型(help/demand/diagnosis/debugging) 4) 工作流层级(light/heavy) 5) 是否需要追问。输出 JSON 格式。', created_at: '2026-05-06T10:00:00Z', author: '产品经理', change_note: '增加 debug 意图识别' },
    { version: 2, content: '你是小乔路由判断模块。根据用户输入，判断意图类型并决定是否追问。输出 JSON。', created_at: '2026-05-03T14:00:00Z', author: '产品经理', change_note: '优化追问策略' },
    { version: 1, content: '你是小乔路由判断模块。判断用户意图。', created_at: '2026-05-01T09:00:00Z', author: '产品经理', change_note: '初始版本' },
  ],
  prompt_002: [
    { version: 5, content: '你是小乔帮助模块。当用户询问指标含义、系统路径、规则口径时，提供：1) 定义说明 2) 系统入口 3) 引用来源 4) 不确定性表达 5) 下一步建议。输出 HelpResult JSON。', created_at: '2026-05-05T11:00:00Z', author: '产品经理', change_note: '增加不确定性表达' },
    { version: 4, content: '你是小乔帮助模块。提供指标解释和系统路径。', created_at: '2026-05-04T10:00:00Z', author: '产品经理', change_note: '增加来源引用' },
  ],
};

// ==========================================
// Mock: Initial Messages
// ==========================================
export const MOCK_INITIAL_MESSAGES: Message[] = [
  {
    message_id: 'msg_sys_001',
    conversation_id: 'conv_new',
    role: 'system',
    content: '欢迎使用小乔智投工作台。您可以直接描述问题或需求，我会自动识别并进入对应业务流。',
    message_type: 'system_notice',
    created_at: new Date().toISOString(),
    id: 'msg_sys_001',
    timestamp: Date.now(),
  },
];

// ==========================================
// Routing & Response Generator
// ==========================================
export function generateRoutingResponse(userMessage: string): RoutingDecision {
  const lower = userMessage.toLowerCase();

  if (lower.includes('roas') || lower.includes('cpm') || lower.includes('指标') || lower.includes('解释') || lower.includes('什么意思') || lower.includes('怎么算')) {
    return { is_business_related: true, business_domain: 'ad', intent_type: 'help', workflow_level: 'light', clarification_needed: false, decision_reason: '指标解释类问题', confidence: 0.9 };
  }
  if (lower.includes('需求') || lower.includes('对接') || lower.includes('回传') || lower.includes('接入') || lower.includes('配置')) {
    return { is_business_related: true, business_domain: 'ad', intent_type: 'demand', workflow_level: 'heavy', clarification_needed: true, decision_reason: '需求沟通类，可能需要补充字段', confidence: 0.85 };
  }
  if (lower.includes('少') || lower.includes('异常') || lower.includes('排查') || lower.includes('不一致') || lower.includes('下降') || lower.includes('缺口') || lower.includes('为什么')) {
    return { is_business_related: true, business_domain: 'ad', intent_type: 'diagnosis', workflow_level: 'heavy', clarification_needed: true, decision_reason: '问题排查类，需要确认时间范围和对象', confidence: 0.88 };
  }
  if (lower.includes('联调') || lower.includes('测试') || lower.includes('验证') || lower.includes('调试')) {
    return { is_business_related: true, business_domain: 'ad', intent_type: 'debugging', workflow_level: 'heavy', clarification_needed: true, decision_reason: '广告联调类，需要确认准备项', confidence: 0.87 };
  }
  if (lower.includes('你好') || lower.includes('hi') || lower.includes('hello')) {
    return { is_business_related: false, business_domain: '', intent_type: 'general', workflow_level: 'light', clarification_needed: false, decision_reason: '非业务闲聊', confidence: 0.95 };
  }
  return { is_business_related: true, business_domain: 'ad', intent_type: 'help', workflow_level: 'light', clarification_needed: false, decision_reason: '默认归入帮助', confidence: 0.6 };
}

export function generateAssistantReply(routing: RoutingDecision, userMessage: string): string {
  if (!routing.is_business_related) {
    return '您好！我是小乔智投工作台。您可以直接描述广告相关的问题、需求或异常，我会自动帮您进入对应流程。';
  }

  switch (routing.intent_type) {
    case 'help':
      return `我理解您需要帮助。让我为您查找相关信息...\n\n关于您提到的「${userMessage.slice(0, 30)}」，我正在检索知识库和指标定义。结果将在右侧面板展示。`;
    case 'demand': {
      const needsClarify = routing.clarification_needed;
      return needsClarify
        ? `我理解您有对接需求。为了生成标准化需求单，我还需要确认几个信息：\n\n1. **目标媒体**：巨量 / TikTok / Google？\n2. **应用名称**：涉及哪个游戏？\n3. **需求类型**：监测回传 / 事件映射 / 其他？\n\n请补充以上信息，我会为您生成结构化需求单。`
        : `好的，我来为您生成结构化需求单。`;
    }
    case 'diagnosis': {
      const needsClarify = routing.clarification_needed;
      return needsClarify
        ? `我理解您遇到了数据异常。为了准确排查，请补充以下信息：\n\n1. **时间范围**：异常出现在哪天？\n2. **涉及媒体**：巨量 / TikTok / Google？\n3. **异常表现**：激活/付费/回传/归因？\n\n我会根据这些信息启动排查流程。`
        : `好的，我来为您启动排查流程。`;
    }
    case 'debugging': {
      const needsClarify = routing.clarification_needed;
      return needsClarify
        ? `我理解您需要进行联调。请先确认以下准备项：\n\n1. **目标媒体**：哪个平台？\n2. **应用名称**：涉及哪个游戏？\n3. **测试设备**：是否已加入白名单？\n\n确认后我会启动联调流程。`
        : `好的，联调准备项已确认，即将启动执行。`;
    }
    default:
      return '我理解了您的问题。让我来帮您处理。';
  }
}

// ==========================================
// 自动联调专项 Mock 数据 (自动联调设计图 + 实施方案)
// ==========================================

/** 自动联调任务 Mock */
export const MOCK_DEBUG_TASK: DebugAutomationTask = {
  id: 'AT-20260508-0001',
  conversation_id: 'conv_debug_001',
  media: '巨量/抖音',
  debug_type: '扫码联调',
  account: 'AD_ACC_001',
  app_name: 'com.xx.game',
  package_name: 'com.xx.game v3.2.1-debug',
  device: 'ANDROID-01',
  environment: '预发布环境',
  status: 'running_mobile_scan',
  current_stage: '扫码',
  current_step: '等待获取二维码',
  requires_manual_confirm: false,
  current_blocker: undefined,
  created_at: '2026-05-08T10:00:00Z',
  updated_at: '2026-05-08T10:01:05Z',
};

/** 自动联调执行步骤 Mock */
export const MOCK_DEBUG_STEPS: DebugExecutionStep[] = [
  {
    id: 'step_001', task_id: 'AT-20260508-0001', stage: 'web_prepare',
    step_name: '登录巨量后台', step_order: 1, status: 'success',
    screenshot_url: '/debug-screenshots/web-login.png',
    log_summary: '打开广告管理页面... 成功',
    started_at: '2026-05-08T10:00:12Z', completed_at: '2026-05-08T10:00:15Z', duration_ms: 3200,
  },
  {
    id: 'step_002', task_id: 'AT-20260508-0001', stage: 'web_prepare',
    step_name: '进入联调工具', step_order: 2, status: 'success',
    screenshot_url: '/debug-screenshots/web-tool.png',
    log_summary: '导航至联调工具页... 成功',
    started_at: '2026-05-08T10:00:15Z', completed_at: '2026-05-08T10:00:18Z', duration_ms: 2100,
  },
  {
    id: 'step_003', task_id: 'AT-20260508-0001', stage: 'web_prepare',
    step_name: '生成二维码', step_order: 3, status: 'success',
    screenshot_url: '/debug-screenshots/web-qrcode.png',
    log_summary: '二维码生成成功, 等待扫码',
    started_at: '2026-05-08T10:00:18Z', completed_at: '2026-05-08T10:00:20Z', duration_ms: 1500,
  },
  {
    id: 'step_004', task_id: 'AT-20260508-0001', stage: 'mobile_scan',
    step_name: '手机扫码', step_order: 4, status: 'running',
    screenshot_url: '/debug-screenshots/mobile-scanning.png',
    log_summary: '正在Web端获取广告落地页二维码, 请确保页面已加载完成并在超时前完成二维码抓取。',
    started_at: '2026-05-08T10:01:05Z',
  },
];

/** 自动联调执行结果 Mock */
export const MOCK_DEBUG_RESULT: DebugExecutionResult = {
  task_id: 'AT-20260508-0001',
  success: false,
  success_criteria: '激活标记回传成功',
  failure_code: undefined,
  failure_reason: undefined,
  execution_log_summary: 'Web准备阶段完成, 当前处于扫码阶段',
  key_screenshots: [
    '/debug-screenshots/web-login.png',
    '/debug-screenshots/web-tool.png',
    '/debug-screenshots/web-qrcode.png',
    '/debug-screenshots/mobile-scanning.png',
  ],
  final_report_url: undefined,
  final_report_markdown: undefined,
  manual_takeover_flag: false,
  failed_step: undefined,
};

/** 自动联调实时日志 Mock */
export const MOCK_DEBUG_LOGS = [
  { timestamp: '10:00:12', action: '打开广告管理页面', status: 'success' as const },
  { timestamp: '10:00:15', action: '导航至联调工具', status: 'success' as const },
  { timestamp: '10:00:18', action: '生成二维码', status: 'success' as const },
  { timestamp: '10:01:02', action: '等待获取二维码', status: 'running' as const },
  { timestamp: '10:01:05', action: '扫码阶段开始', status: 'running' as const },
];

/** 自动联调阶段定义 (对应设计图状态机) */
export const DEBUG_STAGE_DEFINITIONS = [
  { id: 'web_prepare', label: 'Web准备', order: 1, icon: 'globe' },
  { id: 'mobile_scan', label: '扫码', order: 2, icon: 'scan' },
  { id: 'mobile_authorize', label: '授权', order: 3, icon: 'shield' },
  { id: 'mobile_find_ad', label: '刷广告', order: 4, icon: 'search' },
  { id: 'mobile_click_ad', label: '点击广告', order: 5, icon: 'pointer' },
  { id: 'mobile_launch', label: '拉起应用', order: 6, icon: 'rocket' },
  { id: 'success_poll', label: '成功轮询', order: 7, icon: 'check' },
] as const;

/** 执行能力边界 (设计图 §4) */
export const DEBUG_CAPABILITY_BOUNDARIES = [
  { id: 'web_exec', name: 'Web执行能力', description: '控制浏览器执行页面操作、等待、抓取', icon: 'globe' },
  { id: 'mobile_exec', name: 'Mobile执行能力', description: '控制设备操作、启动应用、页面切换', icon: 'smartphone' },
  { id: 'vision', name: '视觉识别能力', description: '二维码识别、广告位识别、元素检测', icon: 'eye' },
  { id: 'adb', name: 'ADB控制能力', description: '设备连接、命令执行、日志获取', icon: 'terminal' },
  { id: 'poll', name: '成功轮询能力', description: '监测转化信号、状态判断与轮询策略', icon: 'refresh' },
] as const;

/** 常见异常类型 (设计图 §5) */
export const DEBUG_COMMON_EXCEPTIONS = [
  { id: 'ex_001', name: '登录失败', description: '登录协议勾选失败或账号异常' },
  { id: 'ex_002', name: '弹窗阻塞', description: '页面弹窗阻碍正常操作流程' },
  { id: 'ex_003', name: '二维码抓取失败', description: '二维码加载超时或无法识别' },
  { id: 'ex_004', name: 'ADB失效', description: '设备连接断开或命令执行失败' },
  { id: 'ex_005', name: '广告识别失败', description: '滑动后未找到目标广告位' },
  { id: 'ex_006', name: '成功轮询超时', description: '联调成功标记长时间未出现' },
] as const;

// ==========================================
// 需求池 Mock Data (需求池模板增强建议)
// ==========================================

export const MOCK_DEMAND_POOL: import('@/types').DemandPoolItem[] = [
  {
    id: 'dp_001',
    title: '巨量引擎购买回传自动接入',
    problem_statement: '投放团队每次新增应用回传需手动配置，平均耗时2小时/次，常因参数遗漏导致回传失败',
    target_users: ['投放团队', '广告支持'],
    core_scenarios: ['新应用回传接入', '回传参数配置', '联调验证'],
    acceptance_criteria: ['输入应用包名和媒体账号后，系统自动生成回传URL模板', '联调验证通过率≥95%', '接入时间从2小时缩短至15分钟'],
    scope_in: ['巨量引擎回传URL自动生成', '参数自动填充', '联调验证'],
    scope_out: ['其他媒体回传（第二阶段）', '出价策略配置'],
    dependencies: [
      { dep_id: 'dep_001', dep_system: '巨量API', dep_role: '数据源', dep_action: '提供回传接口文档和测试环境', owner: '巨量对接人', status: 'ready' },
      { dep_id: 'dep_002', dep_system: '归因平台', dep_role: '校验方', dep_action: '提供转化数据回调验证', owner: '数据团队', status: 'ready' },
    ],
    deliverables: ['回传URL自动生成工具', '联调验证报告模板', '参数配置说明文档'],
    phase: 'phase1',
    priority: 'P0',
    business_flow: 'debugging',
    automation_boundary: 'auto',
    status: 'in-progress',
    proposer: '张经理（投放部）',
    owner: '李工（广告支持）',
    created_at: Date.now() - 86400000 * 5,
    updated_at: Date.now() - 86400000,
  },
  {
    id: 'dp_002',
    title: '激活数据异常自动诊断',
    problem_statement: '激活数据与BI不一致时，投放团队需反复找支持排查，平均排查周期3天，严重影响投放决策',
    target_users: ['投放团队', '广告支持', '数据分析师'],
    core_scenarios: ['激活数据不一致告警', '归因链路追踪', '异常原因定位'],
    acceptance_criteria: ['系统自动检测激活数据偏差≥5%时触发告警', '自动归集归因链路日志', '80%的常见异常可自动给出原因和修复建议'],
    scope_in: ['激活数据偏差检测', '归因链路日志归集', '常见异常模式匹配'],
    scope_out: ['自动修复数据（需人工确认）', '第三方平台数据拉取'],
    dependencies: [
      { dep_id: 'dep_003', dep_system: '归因平台', dep_role: '数据源', dep_action: '提供归因数据API', owner: '数据团队', status: 'pending' },
      { dep_id: 'dep_004', dep_system: 'BI平台', dep_role: '校验方', dep_action: '提供激活数据查询接口', owner: 'BI团队', status: 'pending' },
    ],
    deliverables: ['异常诊断工作流', '证据链自动归集工具', '常见异常知识库'],
    phase: 'phase1',
    priority: 'P0',
    business_flow: 'diagnosis',
    automation_boundary: 'human-machine',
    status: 'approved',
    proposer: '王总（投放部）',
    owner: '赵工（广告支持）',
    created_at: Date.now() - 86400000 * 3,
    updated_at: Date.now() - 86400000 * 2,
  },
  {
    id: 'dp_003',
    title: '投放指标口径自助查询',
    problem_statement: '投放团队频繁询问指标定义和口径，支持团队重复解答，占用大量沟通时间',
    target_users: ['投放团队', '投放主管'],
    core_scenarios: ['指标定义查询', '口径对比说明', '计算逻辑解释'],
    acceptance_criteria: ['覆盖50+核心指标的定义和口径说明', '支持自然语言查询', '回答准确率≥90%'],
    scope_in: ['指标知识库建设', '自然语言查询接口', '口径对比展示'],
    scope_out: ['指标计算服务', '实时数据查询'],
    dependencies: [],
    deliverables: ['指标知识库', '查询对话界面', '口径对比工具'],
    phase: 'phase1',
    priority: 'P1',
    business_flow: 'help',
    automation_boundary: 'auto',
    status: 'approved',
    proposer: '刘经理（投放部）',
    owner: '陈工（广告支持）',
    created_at: Date.now() - 86400000 * 7,
    updated_at: Date.now() - 86400000 * 4,
  },
  {
    id: 'dp_004',
    title: '素材脚本AI解析',
    problem_statement: '创意团队需要快速分析竞品素材结构，目前靠人工拆解，效率低且主观性强',
    target_users: ['创意团队', '设计师'],
    core_scenarios: ['视频素材脚本拆解', '元素提取', '风格标签化'],
    acceptance_criteria: ['支持视频素材上传并自动拆解为时间线脚本', '自动提取角色/场景/文案/BGM等元素', '生成结构化标签'],
    scope_in: ['视频脚本拆解', '元素提取', '标签化'],
    scope_out: ['素材自动生成', '投放策略推荐'],
    dependencies: [
      { dep_id: 'dep_005', dep_system: '视觉模型', dep_role: '能力方', dep_action: '提供视频理解API', owner: 'AI团队', status: 'pending' },
    ],
    deliverables: ['脚本解析工具', '元素提取报告', '标签体系'],
    phase: 'phase2',
    priority: 'P2',
    business_flow: 'help',
    automation_boundary: 'auto',
    status: 'draft',
    proposer: '设计组-小周',
    owner: '待分配',
    created_at: Date.now() - 86400000 * 2,
    updated_at: Date.now() - 86400000,
  },
  {
    id: 'dp_005',
    title: 'ROI自动预测与出价建议',
    problem_statement: '投放预算决策完全依赖经验，缺乏数据驱动的预测和建议',
    target_users: ['投放主管', '财务'],
    core_scenarios: ['ROI预测', 'LTV预测', '回本周期测算'],
    acceptance_criteria: ['基于历史数据预测ROI准确率≥75%', '提供出价区间建议', '回本测算误差≤20%'],
    scope_in: ['ROI/LTV预测模型', '出价建议生成', '回本测算'],
    scope_out: ['自动执行出价（需人工确认）', '预算审批流程'],
    dependencies: [
      { dep_id: 'dep_006', dep_system: '数据仓库', dep_role: '数据源', dep_action: '提供历史投放和转化数据', owner: '数据团队', status: 'pending' },
    ],
    deliverables: ['预测模型', '出价建议界面', '回本测算报告'],
    phase: 'phase3',
    priority: 'P3',
    business_flow: 'help',
    automation_boundary: 'human-machine',
    status: 'draft',
    proposer: '王总（投放部）',
    owner: '待分配',
    created_at: Date.now() - 86400000,
    updated_at: Date.now(),
  },
];
