/**
 * Demo 数据层 — 严格匹配 types/index.ts 中的接口定义
 * 用于 Demo 模式下的 API 返回数据
 */
import type {
  Conversation, Message, Task, TaskContext, WorkflowResult, EvidenceItem,
  AttachmentRecord, WorkspaceResponse, PromptConfig, PromptVersion, PromptBinding,
  FeatureSwitch, DebugAutomationTask, DebugAutomationConfig, DebugExecutionStep,
  DebugExecutionResult, DemandPoolItem, McpServerConfig, CaseRecord,
  McpSkill, MemoryEntry, ScheduledTask, ScheduledTaskExecution,
} from '@/types';

const ts = (daysAgo = 0) => Date.now() - daysAgo * 86400000;
const iso = (daysAgo = 0) => new Date(ts(daysAgo)).toISOString();

// ─── Workspace ───────────────────────────────────
export const DEMO_WORKSPACE: WorkspaceResponse = {
  user_id: 'user-001', user_name: '投放同学A', status_summary: '可用',
  quick_modes: ['help', 'demand', 'diagnosis', 'debugging'],
  recent_tasks: [], app_support_summary: ['巨量引擎', '抖音', '快手'],
  conversation_count: 3, task_count: 5, current_mode: 'natural-chat',
  capabilities: ['knowledge_search', 'web_search', 'diagnosis'],
  feature_switches: [], recent_results: [],
};

// ─── Conversations ───────────────────────────────
export const DEMO_CONVERSATIONS: Conversation[] = [
  { conversation_id: 'conv-001', user_id: 'user-001', title: '抖音回传数据异常排查', status: '排查中', started_at: iso(2), updated_at: iso(0), last_message_at: iso(0), current_mode: 'heavy-workflow', message_count: 12, latest_task_id: 'task-001' },
  { conversation_id: 'conv-002', user_id: 'user-001', title: '巨量引擎激活归因差异咨询', status: '帮助中', started_at: iso(5), updated_at: iso(1), last_message_at: iso(1), current_mode: 'light-workflow', message_count: 6, latest_task_id: 'task-002' },
  { conversation_id: 'conv-003', user_id: 'user-001', title: '新游戏回传接入需求', status: '需求沟通中', started_at: iso(1), updated_at: iso(0), last_message_at: iso(0), current_mode: 'heavy-workflow', message_count: 8, latest_task_id: 'task-003' },
];

// ─── Messages ────────────────────────────────────
export const DEMO_MESSAGES: Record<string, Message[]> = {
  'conv-001': [
    { message_id: 'msg-001', conversation_id: 'conv-001', role: 'user', content: '抖音回传数据今天异常，付费事件回传率只有30%', message_type: 'user_input', created_at: iso(0), id: 'msg-001', timestamp: ts(0), agent: 'diagnosis' },
    { message_id: 'msg-002', conversation_id: 'conv-001', role: 'assistant', content: '我来帮你排查。需要确认：1.应用包名？2.异常开始时间？3.回传接口报错日志？', message_type: 'clarification', created_at: iso(0), id: 'msg-002', timestamp: ts(0) - 600000, agent: 'diagnosis' },
    { message_id: 'msg-003', conversation_id: 'conv-001', role: 'user', content: '包名com.game.xxx，今天上午10点开始，接口返回400', message_type: 'user_input', created_at: iso(0), id: 'msg-003', timestamp: ts(0) - 1200000, agent: 'diagnosis' },
    { message_id: 'msg-004', conversation_id: 'conv-001', role: 'assistant', content: '已定位：抖音SDK v4.2升级后回调URL参数格式变更，签名校验失败返回400。建议升级到v4.2.1。', message_type: 'assistant_reply', created_at: iso(0), id: 'msg-004', timestamp: ts(0) - 1800000, agent: 'diagnosis', metadata: { thinking: '分析回传异常...', tool_calls: [{ name: 'knowledge_search', args: { query: '抖音回传400' } }] } },
  ],
  'conv-002': [
    { message_id: 'msg-005', conversation_id: 'conv-002', role: 'user', content: '巨量引擎激活归因口径是什么？', message_type: 'user_input', created_at: iso(1), id: 'msg-005', timestamp: ts(1), agent: 'help' },
    { message_id: 'msg-006', conversation_id: 'conv-002', role: 'assistant', content: '巨量引擎激活归因采用点击归因模型，窗口7天/1天。BI与媒体差异来自归因窗口、去重逻辑、时区差异。', message_type: 'assistant_reply', created_at: iso(1), id: 'msg-006', timestamp: ts(1) - 3600000, agent: 'help' },
  ],
  'conv-003': [
    { message_id: 'msg-007', conversation_id: 'conv-003', role: 'user', content: '新游戏接入巨量引擎，需要回传激活/注册/付费', message_type: 'user_input', created_at: iso(0), id: 'msg-007', timestamp: ts(0), agent: 'demand' },
  ],
};

// ─── Tasks ───────────────────────────────────────
export const DEMO_TASKS: Task[] = [
  { task_id: 'task-001', conversation_id: 'conv-001', task_type: 'diagnosis', workflow_level: 'heavy', status: 'running', owner_type: 'xiaoqiao', created_at: iso(0), updated_at: iso(0), id: 'task-001', title: '抖音回传数据异常排查', summary: '付费事件回传率降至30%' },
  { task_id: 'task-002', conversation_id: 'conv-002', task_type: 'help', workflow_level: 'light', status: 'completed', owner_type: 'xiaoqiao', created_at: iso(1), updated_at: iso(1), id: 'task-002', title: '激活归因口径解释', summary: '已解释归因窗口/去重/时区差异' },
  { task_id: 'task-003', conversation_id: 'conv-003', task_type: 'demand', workflow_level: 'heavy', status: 'clarifying', owner_type: 'xiaoqiao', created_at: iso(0), updated_at: iso(0), id: 'task-003', title: '新游戏回传接入', summary: '需接入巨量引擎三事件回传' },
  { task_id: 'task-004', conversation_id: 'conv-004', task_type: 'debugging', workflow_level: 'heavy', status: 'waiting', owner_type: 'sub-agent', created_at: iso(0), updated_at: iso(0), id: 'task-004', title: '巨量引擎Android扫码联调', summary: '等待设备就绪' },
  { task_id: 'task-005', conversation_id: 'conv-005', task_type: 'help', workflow_level: 'light', status: 'completed', owner_type: 'xiaoqiao', created_at: iso(3), updated_at: iso(2), id: 'task-005', title: '归因窗口配置查询', summary: '已提供归因窗口配置路径' },
];

// ─── Task Context ────────────────────────────────
export const DEMO_TASK_CONTEXTS: Record<string, TaskContext> = {
  'task-001': { task_id: 'task-001', is_business_related: true, business_domain: '回传', intent_type: 'diagnosis', media: '抖音', app: 'com.game.xxx', time_range: '2025-01-10~2025-01-11', anomaly_type: '回传率下降', attachments: [], missing_fields: [] },
  'task-003': { task_id: 'task-003', is_business_related: true, business_domain: '回传', intent_type: 'demand', media: '巨量引擎', app: '新游戏A', demand_type: 'media_postback', attachments: [], missing_fields: [{ field_key: 'package_name', field_label: '应用包名', priority: 'required', why_required: '回传配置必须指定包名', suggested_question: '请提供应用包名' }] },
};

// ─── Results ─────────────────────────────────────
export const DEMO_RESULTS: WorkflowResult[] = [
  {
    result_id: 'result-001', task_id: 'task-001', result_type: 'diagnosis_report',
    summary: '抖音回传异常：SDK v4.2升级导致签名校验失败',
    structured_payload: {
      summary_conclusion: '抖音SDK v4.2升级后回调URL参数格式变更，签名校验失败返回400',
      confidence_level: 'high', confidence_score: 0.92,
      evidence_items: [
        { id: 'ev-1', evidence_type: 'log', title: '回调400错误日志', summary: '今日10:00起持续出现400错误', relevance: 'high', timestamp: iso(0) },
        { id: 'ev-2', evidence_type: 'data_result', title: '回传率趋势', summary: '从80%骤降至30%', relevance: 'high' },
      ],
      missing_evidence_items: [{ evidence_type: 'screenshot', description: 'SDK版本确认截图', owner_role: '开发', priority: 'medium' }],
      next_actions: [{ action: '升级SDK到v4.2.1', owner_role: '开发', status: 'pending' }],
      anomaly_type: '回传率下降', affected_scope: '抖音渠道-付费事件', risk_level: 'high', owner_roles: ['开发', '投放'],
    },
    confidence: 'high', next_action: '升级SDK到v4.2.1', created_at: iso(0), kind: 'diagnosis', next_actions: ['升级SDK到v4.2.1'], pending_checks: [],
  },
  {
    result_id: 'result-002', task_id: 'task-002', result_type: 'help_answer',
    summary: '巨量引擎激活归因差异来自归因窗口、去重逻辑和时区差异',
    structured_payload: {
      question_type: '指标口径', subject: '激活归因差异', definition_text: '巨量引擎激活归因采用点击归因模型', system_path: 'BI > 数据中心 > 归因配置',
      source_refs: [{ source_type: 'doc' as const, title: '归因窗口配置说明', relevance: 'primary' as const }],
      confidence_level: 'high', next_actions: [{ action_type: 'view_system' as const, label: '查看归因配置', target: '/attribution/config' }],
      definition: '', reference_sources: [], follow_up_questions: [],
    },
    confidence: 'high', created_at: iso(1), kind: 'help', next_actions: [], pending_checks: [],
  },
  {
    result_id: 'result-003', task_id: 'task-003', result_type: 'demand_form',
    summary: '新游戏回传接入需求',
    structured_payload: {
      demand_type: 'media_postback', demand_summary: '新游戏接入巨量引擎回传',
      form: { media: '巨量引擎', app_name: '新游戏A', target_object: '激活+注册+付费' },
      missing_fields: [{ field_name: 'package_name', field_label: '应用包名', priority: 'high', owner_role: '开发', reason: '回传必须' }],
      dependencies: [{ dep_id: 'dep-1', dep_system: 'SDK', dep_role: '开发', dep_action: '集成巨量SDK', status: 'pending', owner: '开发' }],
      next_actions: [{ action: '补录包名', status: 'to_complete', owner_role: '投放' }],
      owner_roles: ['开发', '投放'], status: 'draft',
    },
    confidence: 'medium', created_at: iso(0), kind: 'demand', next_actions: ['补录包名'], pending_checks: [],
  },
];

// ─── Evidence ────────────────────────────────────
export const DEMO_EVIDENCE: Record<string, EvidenceItem[]> = {
  'task-001': [
    { evidence_id: 'ev-1', task_id: 'task-001', evidence_type: 'callback-log', title: '回调400错误日志', summary: '今日10:00起持续出现400错误', source_attachment_id: 'att-001', confidence: 'high', happened_at: iso(0), step: 1, detail: '回调接口返回400', status: 'confirmed', source: '回调日志', timestamp: iso(0) },
    { evidence_id: 'ev-2', task_id: 'task-001', evidence_type: 'media-data', title: '回传率骤降', summary: '从80%降至30%', confidence: 'high', happened_at: iso(0), step: 2, detail: '回传率骤降', status: 'confirmed', source: '媒体后台', timestamp: iso(0) },
  ],
};

// ─── Attachments ─────────────────────────────────
export const DEMO_ATTACHMENTS: AttachmentRecord[] = [
  { id: 'att-001', conversation_id: 'conv-001', task_id: 'task-001', name: 'callback_error.log', kind: 'log', mime_type: 'text/plain', size: 15360, status: 'parsed', source_type: 'click', created_at: iso(0), filename: 'callback_error.log', type: 'log' },
];

// ─── Prompts (matching PromptConfig interface) ────
export const DEMO_PROMPTS: PromptConfig[] = [
  { id: 'prompt-001', name: '路由判断 Prompt', scope: '全局', expectation: '判断用户消息业务意图和路由', status: 'active', current_version: 3, binding: { workflow: 'all' }, updated_at: iso(2), category: 'routing', applicable_workflows: ['help', 'demand', 'diagnosis', 'debugging'], enabled: true },
  { id: 'prompt-002', name: '使用帮助 Prompt', scope: '帮助流', expectation: '生成使用帮助类回答', status: 'active', current_version: 2, binding: { workflow: 'help' }, updated_at: iso(5), category: 'help', applicable_workflows: ['help'], enabled: true },
  { id: 'prompt-003', name: '问题排查 Prompt', scope: '排查流', expectation: '引导排查流程和证据收集', status: 'active', current_version: 4, binding: { workflow: 'diagnosis' }, updated_at: iso(1), category: 'diagnosis', applicable_workflows: ['diagnosis'], enabled: true },
  { id: 'prompt-004', name: '需求沟通 Prompt', scope: '需求流', expectation: '需求结构化和缺失字段补录', status: 'active', current_version: 1, binding: { workflow: 'demand' }, updated_at: iso(3), category: 'demand', applicable_workflows: ['demand'], enabled: true },
  { id: 'prompt-005', name: '联调执行 Prompt', scope: '联调流', expectation: '自动联调执行指令', status: 'draft', current_version: 2, binding: { workflow: 'debugging' }, updated_at: iso(0), category: 'debugging', applicable_workflows: ['debugging'], enabled: false },
];

export const DEMO_PROMPT_VERSIONS: Record<string, PromptVersion[]> = {
  'prompt-001': [
    { version: 3, content: '你是一个广告技术路由判断专家...', created_at: iso(2), author: '系统', change_note: '优化路由判断精度' },
    { version: 2, content: '你是一个广告技术路由判断助手...', created_at: iso(10), author: '系统', change_note: '增加排查流路由' },
  ],
};

// ─── Feature Switches (matching FeatureSwitch interface) ────
export const DEMO_FEATURE_SWITCHES: FeatureSwitch[] = [
  { key: 'auto_debug_enabled', label: '自动联调', enabled: true, scope: 'global' },
  { key: 'knowledge_search_v2', label: '知识库搜索V2', enabled: true, scope: 'global' },
  { key: 'thinking_mode', label: '思维链模式', enabled: true, scope: 'global' },
  { key: 'mcp_tool_call', label: 'MCP工具调用', enabled: false, scope: 'global' },
];

// ─── Debug Automation ────────────────────────────
export const DEMO_DEBUG_TASKS: DebugAutomationTask[] = [
  { id: 'debug-task-001', conversation_id: 'conv-001', media: '巨量引擎', debug_type: 'scan_qr', account: 'AD-12345', app_name: '游戏A', package_name: 'com.game.a', device: 'Pixel 6', environment: 'test', status: 'running_mobile_launch', current_stage: '打开应用并继续校验', current_step: 'step-5', requires_manual_confirm: false, created_at: iso(0), updated_at: iso(0) },
  { id: 'debug-task-002', conversation_id: 'conv-002', media: '抖音', debug_type: 'scan_qr', account: 'AD-67890', app_name: '游戏B', package_name: 'com.game.b', device: 'Samsung S23', environment: 'production', status: 'success', current_stage: '联调成功', current_step: '', requires_manual_confirm: false, created_at: iso(1), updated_at: iso(1) },
];

export const DEMO_DEBUG_CONFIGS: DebugAutomationConfig[] = [
  { id: 'debug-config-001', name: '巨量引擎-Android-测试', media: '巨量引擎', terminal: 'android', environment: 'test', executor_type: 'appium', vision_provider: 'gpt-4o', adb_path: '/usr/bin/adb', app_package: 'com.ss.android.ugc.aweme', keywords_json: '{"ad_keyword":"广告"}', timeouts_json: '{"find_ad":30}', is_active: true, scope: '巨量引擎Android扫码', updated_at: iso(2) },
  { id: 'debug-config-002', name: '抖音-Android-生产', media: '抖音', terminal: 'android', environment: 'production', executor_type: 'appium', vision_provider: 'doubao-vision', adb_path: '/usr/bin/adb', app_package: 'com.ss.android.ugc.aweme', keywords_json: '{"ad_keyword":"广告"}', timeouts_json: '{"find_ad":30}', is_active: true, scope: '抖音Android扫码', updated_at: iso(5) },
];

export const DEMO_DEBUG_STEPS: Record<string, DebugExecutionStep[]> = {
  'debug-task-001': [
    { id: 'step-1', task_id: 'debug-task-001', stage: 'running_web_prepare', step_name: '准备Web端', step_order: 1, status: 'success', log_summary: 'Web端就绪', started_at: iso(0), completed_at: iso(0), duration_ms: 3200 },
    { id: 'step-2', task_id: 'debug-task-001', stage: 'running_mobile_scan', step_name: '手机扫码', step_order: 2, status: 'success', log_summary: '扫码成功', started_at: iso(0), completed_at: iso(0), duration_ms: 8500 },
    { id: 'step-3', task_id: 'debug-task-001', stage: 'running_mobile_find_ad', step_name: '查找广告', step_order: 3, status: 'success', log_summary: '未等到媒体侧成功返回，临时按已刷到广告继续；明天联调服务修复后移除该兜底。', started_at: iso(0), completed_at: iso(0), duration_ms: 3000 },
    { id: 'step-4', task_id: 'debug-task-001', stage: 'running_mobile_click_ad', step_name: '点击广告', step_order: 4, status: 'success', log_summary: '已点击广告并尝试拉起应用。', started_at: iso(0), completed_at: iso(0), duration_ms: 1800 },
    { id: 'step-5', task_id: 'debug-task-001', stage: 'running_mobile_launch', step_name: '打开应用', step_order: 5, status: 'running', log_summary: '已打开已安装应用，继续等待回传结果。', started_at: iso(0) },
  ],
};

export const DEMO_DEBUG_RESULT: DebugExecutionResult = {
  task_id: 'debug-task-002', success: true, success_criteria: '激活回调成功接收',
  execution_log_summary: '5个步骤全部成功', key_screenshots: [], manual_takeover_flag: false,
};

// ─── Demand Pool (matching DemandPoolItem) ────────
export const DEMO_DEMAND_POOL: DemandPoolItem[] = [
  { id: 'dp-001', title: '抖音付费事件回传接入', problem_statement: '接入抖音付费事件回传', target_users: ['投放团队'], core_scenarios: ['回传配置'], acceptance_criteria: ['回调URL可接收', '事件映射完成'], scope_in: ['抖音渠道'], scope_out: ['其他渠道'], dependencies: [{ dep_id: 'dep-1', dep_system: 'SDK', dep_role: '开发', dep_action: '集成SDK', status: 'pending', owner: '开发' }], deliverables: ['回传配置文档'], phase: 'phase1', priority: 'P0', business_flow: 'demand', automation_boundary: 'human-machine', status: 'in-progress', proposer: '张三', owner: '李四', created_at: ts(3), updated_at: ts(0) },
  { id: 'dp-002', title: '归因窗口调整', problem_statement: '归因窗口从1天调为7天', target_users: ['数据团队'], core_scenarios: ['归因配置'], acceptance_criteria: ['窗口已调整', '数据已对齐'], scope_in: ['巨量引擎'], scope_out: [], dependencies: [], deliverables: ['配置变更记录'], phase: 'phase2', priority: 'P1', business_flow: 'help', automation_boundary: 'auto', status: 'reviewing', proposer: '王五', owner: '赵六', created_at: ts(1), updated_at: ts(1) },
  { id: 'dp-003', title: '快手激活事件映射', problem_statement: '配置快手激活事件映射', target_users: ['投放团队'], core_scenarios: ['事件映射'], acceptance_criteria: ['映射关系确认'], scope_in: ['快手'], scope_out: [], dependencies: [], deliverables: ['映射配置'], phase: 'phase1', priority: 'P2', business_flow: 'demand', automation_boundary: 'auto', status: 'completed', proposer: '李四', owner: '张三', created_at: ts(7), updated_at: ts(5) },
];

// ─── MCP Servers (matching McpServerConfig exactly) ──
export const DEMO_MCP_SERVERS: McpServerConfig[] = [
  { id: 'mcp-001', name: '归因MCP', description: '归因数据查询', category: 'data', endpoint_url: 'https://attribution.internal/mcp', transport: 'streamable-http', auth_type: 'bearer_token', auth_config: { token: '***' }, status: 'connected', tools: [{ tool_id: 't-1', name: 'query_attribution', description: '查询归因数据', input_schema: {}, enabled: true, bound_agents: ['diagnosis'], access_mode: 'read', call_count: 128 }], enabled: true, business_domains: ['归因'], bound_agents: ['diagnosis', 'prediction'], tags: ['归因', '数据'], last_health_check_at: ts(0), latency_ms: 45, created_at: ts(30), updated_at: ts(0) },
  { id: 'mcp-002', name: '报表MCP', description: 'BI报表数据查询', category: 'data', endpoint_url: 'https://report.internal/mcp', transport: 'streamable-http', auth_type: 'api_key', auth_config: { api_key: '***' }, status: 'connected', tools: [{ tool_id: 't-2', name: 'query_report', description: '查询报表', input_schema: {}, enabled: true, bound_agents: ['monitoring'], access_mode: 'read', call_count: 256 }], enabled: true, business_domains: ['报表'], bound_agents: ['monitoring', 'prediction'], tags: ['报表', '数据'], last_health_check_at: ts(0), latency_ms: 80, created_at: ts(30), updated_at: ts(1) },
  { id: 'mcp-003', name: '回传MCP', description: '回传配置和状态', category: 'function', endpoint_url: 'https://postback.internal/mcp', transport: 'streamable-http', auth_type: 'bearer_token', auth_config: { token: '***' }, status: 'disconnected', tools: [{ tool_id: 't-3', name: 'check_postback', description: '检查回传', input_schema: {}, enabled: true, bound_agents: ['demand'], access_mode: 'read', call_count: 89 }], enabled: true, business_domains: ['回传'], bound_agents: ['demand', 'diagnosis'], tags: ['回传', '配置'], created_at: ts(20), updated_at: ts(5) },
  { id: 'mcp-004', name: '联调MCP', description: '自动联调', category: 'function', endpoint_url: 'https://debug.internal/mcp', transport: 'streamable-http', auth_type: 'none', auth_config: {}, status: 'connected', tools: [{ tool_id: 't-4', name: 'start_debug', description: '启动联调', input_schema: {}, enabled: true, bound_agents: ['debugging'], access_mode: 'write', call_count: 42 }], enabled: true, business_domains: ['联调'], bound_agents: ['debugging'], tags: ['联调', '自动'], last_health_check_at: ts(0), latency_ms: 120, created_at: ts(15), updated_at: ts(0) },
  { id: 'mcp-005', name: '知识库MCP', description: '知识库搜索', category: 'data', endpoint_url: 'https://knowledge.internal/mcp', transport: 'streamable-http', auth_type: 'none', auth_config: {}, status: 'connected', tools: [{ tool_id: 't-5', name: 'search_knowledge', description: '搜索知识库', input_schema: {}, enabled: true, bound_agents: ['help'], access_mode: 'read', call_count: 512 }], enabled: true, business_domains: ['知识库'], bound_agents: ['help', 'diagnosis'], tags: ['知识库'], last_health_check_at: ts(0), latency_ms: 30, created_at: ts(30), updated_at: ts(0) },
  { id: 'mcp-006', name: '监测活动配置MCP', description: '监控配置管理', category: 'function', endpoint_url: 'https://monitor-config.internal/mcp', transport: 'streamable-http', auth_type: 'api_key', auth_config: { api_key: '***' }, status: 'disconnected', tools: [{ tool_id: 't-6', name: 'get_monitor_config', description: '获取监控配置', input_schema: {}, enabled: true, bound_agents: ['monitoring'], access_mode: 'read', call_count: 15 }], enabled: true, business_domains: ['监控'], bound_agents: ['monitoring'], tags: ['监控', '配置'], created_at: ts(15), updated_at: ts(10) },
  { id: 'mcp-007', name: '游戏接入报告MCP', description: '游戏接入报告', category: 'data', endpoint_url: 'https://game-report.internal/mcp', transport: 'streamable-http', auth_type: 'bearer_token', auth_config: { token: '***' }, status: 'error', tools: [{ tool_id: 't-7', name: 'get_access_report', description: '获取接入报告', input_schema: {}, enabled: true, bound_agents: ['demand'], access_mode: 'read', call_count: 3 }], enabled: false, business_domains: ['接入'], bound_agents: ['demand'], tags: ['游戏', '报告'], error_message: '连接超时', created_at: ts(10), updated_at: ts(3) },
];

// ─── Cases ───────────────────────────────────────
export const DEMO_CASES: CaseRecord[] = [
  { case_id: 'case-001', source_task_id: 'task-001', case_type: '回传异常', title: '抖音SDK升级导致回传失败', summary: 'SDK v4.2升级后回调参数变更', reusable_points: ['检查SDK变更日志', '验证回调参数'], status: 'active', created_at: iso(0) },
];

// ─── MCP Skills (可添加的MCP技能模板) ──────────────
export const DEMO_MCP_SKILLS: McpSkill[] = [
  { id: 'skill-001', name: '自然语言查数', description: '把用户的问题转成标准报表查询，返回指标、维度、时间和来源说明。', icon: '📊', source: 'builtin', category: 'data', endpoint_url: 'https://report.internal/mcp', transport: 'streamable-http', auth_type: 'api_key', auth_config_template: { api_key: '' }, expected_tools: [{ name: 'query_report', description: '查询报表数据' }, { name: 'explain_metric', description: '解释指标口径' }], installed: true, installed_server_id: 'mcp-002', tags: ['P0', '报表', '查数'], use_cases: ['查询消耗和ROI', '按媒体或账户下钻', '解释指标口径'], sort_order: 1, created_at: ts(30), updated_at: ts(0) },
  { id: 'skill-002', name: '媒体消耗排查', description: '面向消耗异常，检查采集、报表调度、权限和口径，不混入回传链路。', icon: '🧭', source: 'builtin', category: 'operation', endpoint_url: 'https://report-diagnosis.internal/mcp', transport: 'streamable-http', auth_type: 'api_key', auth_config_template: { api_key: '' }, expected_tools: [{ name: 'query_cost_report', description: '查询智投消耗报表' }, { name: 'check_collect_status', description: '检查媒体采集状态' }, { name: 'check_report_schedule', description: '检查报表调度时间' }, { name: 'check_user_scope', description: '检查用户数据权限' }], installed: true, installed_server_id: 'mcp-002', tags: ['P0', '排查', '消耗'], use_cases: ['媒体后台和智投消耗对不上', '消耗报表没有数据', '判断报表是否已调度完成'], sort_order: 2, created_at: ts(30), updated_at: ts(0) },
  { id: 'skill-003', name: '回传链路巡检', description: '面向激活、注册、付费等转化异常，检查事件、归因、回传和入库链路。', icon: '🔄', source: 'builtin', category: 'integration', endpoint_url: 'https://postback.internal/mcp', transport: 'streamable-http', auth_type: 'bearer_token', auth_config_template: { token: '' }, expected_tools: [{ name: 'check_event_receive', description: '检查事件接收' }, { name: 'query_attribution', description: '查询归因结果' }, { name: 'check_postback', description: '检查媒体回传状态' }, { name: 'check_bi_ingestion', description: '检查入库和聚合状态' }], installed: true, installed_server_id: 'mcp-003', tags: ['P0', '回传', '归因'], use_cases: ['排查激活异常', '排查注册或付费异常', '定位回传失败节点'], sort_order: 3, created_at: ts(20), updated_at: ts(5) },
  { id: 'skill-004', name: '自动联调', description: '按媒体、项目、事件执行标准联调流程，记录过程并生成联调报告。', icon: '🔧', source: 'builtin', category: 'operation', endpoint_url: 'https://debug.internal/mcp', transport: 'streamable-http', auth_type: 'none', auth_config_template: {}, expected_tools: [{ name: 'start_debug', description: '启动联调' }, { name: 'get_debug_status', description: '获取联调进度' }, { name: 'generate_debug_report', description: '生成联调报告' }], installed: true, installed_server_id: 'mcp-004', tags: ['P0', '联调', '自动化'], use_cases: ['巨量联调', '新媒体联调', '事件回传验证'], sort_order: 4, created_at: ts(15), updated_at: ts(0) },
  { id: 'skill-005', name: '日报生成', description: '按固定指标拉数、分析波动、生成日报，并支持定时发送。', icon: '📝', source: 'builtin', category: 'monitor', endpoint_url: 'https://report.internal/mcp', transport: 'streamable-http', auth_type: 'api_key', auth_config_template: { api_key: '' }, expected_tools: [{ name: 'query_report', description: '查询日报指标' }, { name: 'generate_daily_report', description: '生成日报内容' }, { name: 'create_scheduled_task', description: '创建定时发送任务' }], installed: true, installed_server_id: 'mcp-002', tags: ['P0', '日报', '定时任务'], use_cases: ['每天生成广告日报', '生成投放复盘', '发送日报到指定对象'], sort_order: 5, created_at: ts(30), updated_at: ts(0) },
  { id: 'skill-006', name: 'ROI异常监控', description: '按项目、媒体或账户设置ROI和消耗阈值，持续巡检并告警。', icon: '📉', source: 'builtin', category: 'monitor', endpoint_url: 'https://monitor-config.internal/mcp', transport: 'streamable-http', auth_type: 'api_key', auth_config_template: { api_key: '' }, expected_tools: [{ name: 'get_monitor_config', description: '读取监控规则' }, { name: 'set_alert_rule', description: '设置告警规则' }, { name: 'query_roi_trend', description: '查询ROI趋势' }], installed: false, tags: ['P1', '监控', 'ROI'], use_cases: ['ROI下降告警', '消耗突增监控', '回收异常提醒'], sort_order: 6, created_at: ts(15), updated_at: ts(10) },
  { id: 'skill-007', name: '项目健康巡检', description: '检查项目配置、媒体配置、监测状态、数据更新和风险项，输出健康度。', icon: '✅', source: 'builtin', category: 'operation', endpoint_url: 'https://project-audit.internal/mcp', transport: 'streamable-http', auth_type: 'bearer_token', auth_config_template: { token: '' }, expected_tools: [{ name: 'check_project_config', description: '检查项目配置' }, { name: 'check_media_config', description: '检查媒体配置' }, { name: 'check_tracking_status', description: '检查监测状态' }, { name: 'generate_health_score', description: '生成健康度评分' }], installed: false, tags: ['P1', '巡检', '健康度'], use_cases: ['项目上线前巡检', '每日项目健康检查', '识别配置风险'], sort_order: 7, created_at: ts(10), updated_at: ts(3) },
  { id: 'skill-008', name: '新媒体对接', description: '把新增媒体需求转成表单、依赖清单、验收标准和后续联调任务。', icon: '🧩', source: 'builtin', category: 'integration', endpoint_url: 'https://media-onboarding.internal/mcp', transport: 'streamable-http', auth_type: 'bearer_token', auth_config_template: { token: '' }, expected_tools: [{ name: 'create_requirement_form', description: '生成需求表单' }, { name: 'check_onboarding_dependencies', description: '检查对接依赖' }, { name: 'create_debug_task', description: '创建后续联调任务' }], installed: false, tags: ['P1', '对接', '需求'], use_cases: ['新增媒体对接', '生成验收清单', '记录到需求池'], sort_order: 8, created_at: ts(10), updated_at: ts(2) },
  { id: 'skill-009', name: 'Campaign分析', description: '拆解campaign消耗、ROI、转化和贡献度，输出预算和优化建议。', icon: '📈', source: 'builtin', category: 'analysis', endpoint_url: 'https://campaign-analysis.internal/mcp', transport: 'streamable-http', auth_type: 'api_key', auth_config_template: { api_key: '' }, expected_tools: [{ name: 'query_campaign_report', description: '查询Campaign报表' }, { name: 'compare_campaign_contribution', description: '计算贡献度' }], installed: false, tags: ['P1', '分析', 'Campaign'], use_cases: ['Campaign贡献分析', '预算调整建议', '定位高消耗低回收对象'], sort_order: 9, created_at: ts(10), updated_at: ts(2) },
  { id: 'skill-010', name: '素材洞察', description: '分析素材表现、创意标签和效果差异，辅助投放优化。', icon: '🎨', source: 'builtin', category: 'analysis', endpoint_url: 'https://material.internal/mcp', transport: 'streamable-http', auth_type: 'api_key', auth_config_template: { api_key: '' }, expected_tools: [{ name: 'analyze_material', description: '分析素材效果' }, { name: 'cluster_creatives', description: '聚类创意标签' }, { name: 'find_similar', description: '查找相似素材' }], installed: false, tags: ['P1', '素材', '分析'], use_cases: ['分析素材效果', '查找相似素材', '生成素材洞察'], sort_order: 10, created_at: ts(10), updated_at: ts(2) },
];

// ─── Global Memory (全局记忆) ─────────────────────
export const DEMO_MEMORIES: MemoryEntry[] = [
  { id: 'mem-001', content: '用户负责的媒体平台: 巨量引擎、抖音、快手', memory_type: 'fact', source: 'auto_extract', source_conversation_id: 'conv-001', keywords: ['媒体', '巨量', '抖音', '快手'], importance: 5, access_count: 12, last_accessed_at: ts(0), archived: false, created_at: ts(30), updated_at: ts(0) },
  { id: 'mem-002', content: '用户偏好: 排查问题时先看数据再做判断，不喜欢猜测性结论', memory_type: 'preference', source: 'auto_extract', keywords: ['偏好', '排查', '数据驱动'], importance: 4, access_count: 8, last_accessed_at: ts(1), archived: false, created_at: ts(20), updated_at: ts(1) },
  { id: 'mem-003', content: '用户常用应用: com.game.xxx (游戏), com.social.yyy (社交)', memory_type: 'fact', source: 'user_input', keywords: ['应用', '包名'], importance: 4, access_count: 6, last_accessed_at: ts(2), archived: false, created_at: ts(15), updated_at: ts(5) },
  { id: 'mem-004', content: '上次抖音回传异常根因: SDK v4.2升级后回调URL参数格式变更', memory_type: 'experience', source: 'agent_summary', source_conversation_id: 'conv-001', keywords: ['抖音', '回传', 'SDK', '异常'], business_domain: '回传', importance: 5, access_count: 3, last_accessed_at: ts(0), archived: false, created_at: ts(0), updated_at: ts(0) },
  { id: 'mem-005', content: '归因窗口统一使用7天点击归因，不要用1天的', memory_type: 'instruction', source: 'user_input', keywords: ['归因', '窗口', '7天'], business_domain: '归因', importance: 5, access_count: 15, last_accessed_at: ts(0), archived: false, created_at: ts(25), updated_at: ts(1) },
  { id: 'mem-006', content: '用户团队有3人: 投放同学A(本人), 数据同学B, 运营同学C', memory_type: 'context', source: 'user_input', keywords: ['团队', '人员'], importance: 2, access_count: 2, archived: false, created_at: ts(20), updated_at: ts(10) },
];

// ─── Scheduled Tasks (定时任务) ────────────────────
export const DEMO_SCHEDULED_TASKS: ScheduledTask[] = [
  { id: 'st-001', name: '抖音消耗监控', description: '每小时监控抖音广告消耗数据，超过日预算80%时告警', task_type: 'data_monitor', status: 'active', frequency: 'hourly', next_run_at: ts(0) + 3600000, last_run_at: ts(0), created_by: 'user-001', account_ids: ['acc-001'], app_names: ['com.game.xxx'], monitor_metrics: ['cost', 'roi', 'conversion_rate'], alert_conditions: [{ metric: 'cost', operator: 'gte', threshold: 80, window_seconds: 86400 }], alert_channels: ['in_app', 'webhook'], alert_targets: ['user-001'], mcp_skill_id: 'skill-002', custom_params: { media: 'douyin', dimension: 'hourly' }, recent_executions: [{ id: 'exec-001', task_id: 'st-001', status: 'success', started_at: ts(0), finished_at: ts(0) + 2300, duration_ms: 2300, result_summary: '抖音消耗 ¥12,350 / 日预算 ¥15,000 (82.3%)', alert_triggered: true, alert_details: '消耗已超过日预算80%' }, { id: 'exec-002', task_id: 'st-001', status: 'success', started_at: ts(0) - 3600000, finished_at: ts(0) - 3600000 + 1800, duration_ms: 1800, result_summary: '抖音消耗 ¥11,200 / 日预算 ¥15,000 (74.7%)', alert_triggered: false }], total_executions: 48, success_count: 47, failure_count: 1, enabled: true, created_at: ts(7), updated_at: ts(0) },
  { id: 'st-002', name: '巨量引擎激活归因差异检查', description: '每4小时检查巨量引擎激活数与归因数差异，差异超过15%告警', task_type: 'alert_check', status: 'active', frequency: 'custom_cron', cron_expression: '0 */4 * * *', next_run_at: ts(0) + 7200000, last_run_at: ts(0) - 7200000, created_by: 'user-001', account_ids: ['acc-002'], app_names: ['com.game.xxx', 'com.social.yyy'], monitor_metrics: ['activation', 'attribution_count', 'attribution_diff_rate'], alert_conditions: [{ metric: 'attribution_diff_rate', operator: 'gt', threshold: 15 }], alert_channels: ['in_app'], alert_targets: ['user-001'], mcp_skill_id: 'skill-001', custom_params: { media: 'bytedance', compare_window: '1d' }, recent_executions: [{ id: 'exec-003', task_id: 'st-002', status: 'success', started_at: ts(0) - 7200000, finished_at: ts(0) - 7200000 + 5400, duration_ms: 5400, result_summary: '激活 1,234 / 归因 1,056 差异率 14.4%', alert_triggered: false }], total_executions: 24, success_count: 24, failure_count: 0, enabled: true, created_at: ts(5), updated_at: ts(0) },
  { id: 'st-003', name: '日报生成', description: '每天凌晨2点生成前一天的广告投放日报', task_type: 'report_generate', status: 'active', frequency: 'daily', cron_expression: '0 2 * * *', next_run_at: ts(0) + 86400000, last_run_at: ts(0) - 86400000, created_by: 'user-001', account_ids: ['acc-001', 'acc-002'], app_names: [], monitor_metrics: ['cost', 'impression', 'click', 'conversion', 'roi'], alert_conditions: [], alert_channels: ['email'], alert_targets: ['user-001@company.com'], mcp_skill_id: 'skill-002', custom_params: { report_type: 'daily', format: 'markdown' }, recent_executions: [{ id: 'exec-004', task_id: 'st-003', status: 'success', started_at: ts(1), finished_at: ts(1) + 12000, duration_ms: 12000, result_summary: '日报已生成: 总消耗 ¥45,678, 总激活 2,345, 整体ROI 1.8', alert_triggered: false }], total_executions: 7, success_count: 7, failure_count: 0, enabled: true, created_at: ts(7), updated_at: ts(0) },
  { id: 'st-004', name: '回传链路健康检查', description: '每30分钟检查回传链路状态，发现异常即时告警', task_type: 'health_check', status: 'paused', frequency: 'every_30min', next_run_at: ts(0), last_run_at: ts(0) - 86400000, created_by: 'user-001', account_ids: [], app_names: [], monitor_metrics: ['postback_success_rate', 'postback_latency', 'postback_error_count'], alert_conditions: [{ metric: 'postback_success_rate', operator: 'lt', threshold: 95 }, { metric: 'postback_error_count', operator: 'gt', threshold: 10, window_seconds: 1800 }], alert_channels: ['in_app', 'webhook'], alert_targets: ['user-001'], mcp_skill_id: 'skill-003', custom_params: { check_depth: 'full' }, recent_executions: [], total_executions: 12, success_count: 10, failure_count: 2, enabled: false, created_at: ts(10), updated_at: ts(1) },
];

// ═══════════════════════════════════════════════════
// Demo CRUD Helpers (内存可变状态)
// ═══════════════════════════════════════════════════

let _prompts = [...DEMO_PROMPTS];
let _switches = [...DEMO_FEATURE_SWITCHES];
let _debugConfigs = [...DEMO_DEBUG_CONFIGS];
const _demandPool = [...DEMO_DEMAND_POOL];
let _mcpServers = [...DEMO_MCP_SERVERS];
let _debugTasks = [...DEMO_DEBUG_TASKS];
let _conversations = [...DEMO_CONVERSATIONS];
const _tasks = [...DEMO_TASKS];
let _attachments = [...DEMO_ATTACHMENTS];
const _results = [...DEMO_RESULTS];
let _mcpSkills = [...DEMO_MCP_SKILLS];
let _memories = [...DEMO_MEMORIES];
let _scheduledTasks = [...DEMO_SCHEDULED_TASKS];

// ── Workspace ──
export function getDemoWorkspace() { return DEMO_WORKSPACE; }

// ── Conversations ──
export function getDemoConversations() { return _conversations; }
export function getDemoConversation(id: string) { return _conversations.find(c => c.conversation_id === id); }
export function createDemoConversation(data: Partial<Conversation>): Conversation {
  const c: Conversation = { conversation_id: `conv-${Date.now()}`, user_id: 'user-001', title: data.title || '新对话', status: '普通对话', started_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_message_at: new Date().toISOString(), current_mode: 'natural-chat' };
  _conversations = [..._conversations, c]; return c;
}

// ── Messages ──
export function getDemoMessages(conversationId: string) { return DEMO_MESSAGES[conversationId] || []; }
export function addDemoMessage(conversationId: string, msg: Partial<Message>): Message {
  const m: Message = { message_id: `msg-${Date.now()}`, conversation_id: conversationId, role: msg.role || 'user', content: msg.content || '', message_type: msg.message_type || 'user_input', created_at: new Date().toISOString(), id: `msg-${Date.now()}`, timestamp: Date.now() };
  if (!DEMO_MESSAGES[conversationId]) DEMO_MESSAGES[conversationId] = [];
  DEMO_MESSAGES[conversationId].push(m); return m;
}

// ── Tasks ──
export function getDemoTasks() { return _tasks; }
export function getDemoTask(id: string) { return _tasks.find(t => t.task_id === id || t.id === id); }
export function getDemoResults(taskId: string) { return _results.filter(r => r.task_id === taskId); }
export function getDemoTaskResults(taskId: string) { return _results.filter(r => r.task_id === taskId); }
export function getDemoTaskContext(taskId: string) { return DEMO_TASK_CONTEXTS[taskId]; }
export function updateDemoTaskContext(taskId: string, data: Partial<TaskContext>): TaskContext | undefined {
  if (DEMO_TASK_CONTEXTS[taskId]) Object.assign(DEMO_TASK_CONTEXTS[taskId], data);
  return DEMO_TASK_CONTEXTS[taskId];
}
export function getDemoEvidence(taskId: string) { return DEMO_EVIDENCE[taskId] || []; }
export function getDemoTaskEvidence(taskId: string) { return DEMO_EVIDENCE[taskId] || []; }

// ── Attachments ──
export function getDemoAttachments(conversationId: string) { return _attachments.filter(a => a.conversation_id === conversationId); }
export function addDemoAttachment(data: Partial<AttachmentRecord>): AttachmentRecord {
  const a: AttachmentRecord = { id: `att-${Date.now()}`, conversation_id: data.conversation_id || '', name: data.name || 'file', kind: data.kind || 'document', mime_type: data.mime_type || 'application/octet-stream', size: data.size || 0, status: 'uploaded', created_at: new Date().toISOString(), filename: data.name || 'file', type: data.kind || 'document' };
  _attachments = [..._attachments, a]; return a;
}

// ── Prompts ──
export function getDemoPrompts() { return _prompts; }
export function getDemoPrompt(id: string) { return _prompts.find(p => p.id === id); }
export function createDemoPrompt(data: Partial<PromptConfig>): PromptConfig {
  const p: PromptConfig = { id: `prompt-${Date.now()}`, name: data.name || '', scope: data.scope || '', expectation: data.expectation || '', status: 'draft', current_version: 1, binding: data.binding || {}, updated_at: new Date().toISOString(), category: data.category, applicable_workflows: data.applicable_workflows, enabled: data.enabled ?? true };
  _prompts = [..._prompts, p]; return p;
}
export function updateDemoPrompt(id: string, data: Partial<PromptConfig>): PromptConfig | undefined {
  _prompts = _prompts.map(p => p.id === id ? { ...p, ...data } : p); return _prompts.find(p => p.id === id);
}
export function getDemoPromptVersions(id: string) { return DEMO_PROMPT_VERSIONS[id] || []; }
export function updateDemoPromptBinding(_id: string, data: Partial<PromptBinding>): PromptBinding {
  return { workflow: data.workflow, agent: data.agent, tool: data.tool };
}

// ── Feature Switches ──
export function getDemoSwitches() { return _switches; }
export function updateDemoSwitch(key: string, data: Partial<FeatureSwitch>): FeatureSwitch | undefined {
  _switches = _switches.map(s => s.key === key ? { ...s, ...data } : s); return _switches.find(s => s.key === key);
}

// ── Debug Automation Configs ──
export function getDemoDebugConfigs() { return _debugConfigs; }
export function getDemoDebugConfig(id: string) { return _debugConfigs.find(c => c.id === id); }
export function createDemoDebugConfig(data: Partial<DebugAutomationConfig>): DebugAutomationConfig {
  const c: DebugAutomationConfig = { id: `debug-config-${Date.now()}`, name: data.name || '', media: data.media || '', terminal: data.terminal || 'android', environment: data.environment || 'test', executor_type: data.executor_type || 'appium', vision_provider: data.vision_provider || 'gpt-4o', keywords_json: data.keywords_json || '{}', timeouts_json: data.timeouts_json || '{}', is_active: data.is_active ?? true, scope: data.scope || '', updated_at: new Date().toISOString() };
  _debugConfigs = [..._debugConfigs, c]; return c;
}
export function updateDemoDebugConfig(id: string, data: Partial<DebugAutomationConfig>): DebugAutomationConfig | undefined {
  _debugConfigs = _debugConfigs.map(c => c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c); return _debugConfigs.find(c => c.id === id);
}

// ── Demand Pool ──
export function getDemoDemandPool() { return _demandPool; }

// ── MCP Servers ──
export function getDemoMcpServers() { return _mcpServers; }
export function getDemoMcpServer(id: string) { return _mcpServers.find(s => s.id === id); }
export function createDemoMcpServer(data: Partial<McpServerConfig>): McpServerConfig {
  const s: McpServerConfig = { id: `mcp-${Date.now()}`, name: data.name || '', description: data.description || '', category: data.category || 'data', endpoint_url: data.endpoint_url || '', transport: data.transport || 'streamable-http', auth_type: data.auth_type || 'none', auth_config: data.auth_config || {}, status: 'disconnected', tools: data.tools || [], enabled: data.enabled ?? true, business_domains: data.business_domains || [], bound_agents: data.bound_agents || [], tags: data.tags || [], created_at: Date.now(), updated_at: Date.now() };
  _mcpServers = [..._mcpServers, s]; return s;
}
export function updateDemoMcpServer(id: string, data: Partial<McpServerConfig>): McpServerConfig | undefined {
  _mcpServers = _mcpServers.map(s => s.id === id ? { ...s, ...data, updated_at: Date.now() } : s); return _mcpServers.find(s => s.id === id);
}
export function deleteDemoMcpServer(id: string): boolean {
  const len = _mcpServers.length; _mcpServers = _mcpServers.filter(s => s.id !== id); return _mcpServers.length < len;
}
export function testDemoMcpConnection(id: string): { success: boolean; latency_ms: number; tool_count: number } {
  const server = _mcpServers.find(s => s.id === id);
  if (server) _mcpServers = _mcpServers.map(s => s.id === id ? { ...s, status: 'connected' as const, last_health_check_at: Date.now(), latency_ms: Math.floor(Math.random() * 100) + 20 } : s);
  return { success: !!server, latency_ms: server ? 120 : 0, tool_count: server?.tools.length || 0 };
}

// ── Debug Automation Tasks ──
export function getDemoDebugTasks() { return _debugTasks; }
export function getDemoDebugTask(id: string) { return _debugTasks.find(t => t.id === id); }
export function createDemoDebugTask(data: Partial<DebugAutomationTask>): DebugAutomationTask {
  const t: DebugAutomationTask = { id: `debug-task-${Date.now()}`, conversation_id: data.conversation_id || '', media: data.media || '', debug_type: data.debug_type || 'scan_qr', account: data.account || '', app_name: data.app_name || '', package_name: data.package_name || '', device: data.device || '', environment: data.environment || 'test', status: 'created', current_stage: 'created', current_step: '', requires_manual_confirm: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  _debugTasks = [..._debugTasks, t]; return t;
}
export function updateDemoDebugTask(id: string, data: Partial<DebugAutomationTask>): DebugAutomationTask | undefined {
  _debugTasks = _debugTasks.map(t => t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t); return _debugTasks.find(t => t.id === id);
}
export function startDemoDebugTask(id: string) { return updateDemoDebugTask(id, { status: 'running_web_prepare', current_stage: 'Web端准备' }); }
export function pauseDemoDebugTask(id: string) { return updateDemoDebugTask(id, { status: 'waiting_confirm', current_stage: '已暂停' }); }
export function resumeDemoDebugTask(id: string) { return updateDemoDebugTask(id, { status: 'running_mobile_find_ad', current_stage: '恢复执行' }); }
export function takeoverDemoDebugTask(id: string) { return updateDemoDebugTask(id, { status: 'manual_takeover', current_stage: '人工接管', requires_manual_confirm: true }); }
export function getDemoDebugSteps(taskId: string) { return DEMO_DEBUG_STEPS[taskId] || []; }
export function getDemoDebugResult(taskId: string) { return taskId.startsWith('debug-task') ? DEMO_DEBUG_RESULT : null; }

// ── MCP Skills ──
export function getDemoMcpSkills() { return _mcpSkills; }
export function getDemoMcpSkill(id: string) { return _mcpSkills.find(s => s.id === id); }
export function createDemoMcpSkill(data: Partial<McpSkill>): McpSkill {
  const s: McpSkill = { id: `skill-${Date.now()}`, name: data.name || '', description: data.description || '', icon: data.icon || '🔧', source: 'custom', category: data.category || 'other', endpoint_url: data.endpoint_url || '', transport: data.transport || 'streamable-http', auth_type: data.auth_type || 'none', auth_config_template: data.auth_config_template || {}, expected_tools: data.expected_tools || [], installed: false, tags: data.tags || [], use_cases: data.use_cases || [], sort_order: _mcpSkills.length + 1, created_at: Date.now(), updated_at: Date.now() };
  _mcpSkills = [..._mcpSkills, s]; return s;
}
export function updateDemoMcpSkill(id: string, data: Partial<McpSkill>): McpSkill | undefined {
  _mcpSkills = _mcpSkills.map(s => s.id === id ? { ...s, ...data, updated_at: Date.now() } : s); return _mcpSkills.find(s => s.id === id);
}
export function deleteDemoMcpSkill(id: string): boolean {
  const len = _mcpSkills.length; _mcpSkills = _mcpSkills.filter(s => s.id !== id); return _mcpSkills.length < len;
}
export function installDemoMcpSkill(id: string): McpSkill | undefined {
  const skill = _mcpSkills.find(s => s.id === id);
  if (!skill || skill.installed) return skill;
  const server: McpServerConfig = { id: `mcp-installed-${Date.now()}`, name: skill.name, description: skill.description, category: (skill.category === 'data' || skill.category === 'operation' || skill.category === 'integration') ? 'function' : 'data', endpoint_url: skill.endpoint_url, transport: skill.transport, auth_type: skill.auth_type, auth_config: skill.auth_config_template, status: 'disconnected', tools: skill.expected_tools.map((t, i) => ({ tool_id: `t-inst-${i}`, name: t.name, description: t.description, input_schema: {}, enabled: true, bound_agents: [], access_mode: 'read' as const, call_count: 0 })), enabled: true, business_domains: [], bound_agents: [], tags: skill.tags, created_at: Date.now(), updated_at: Date.now() };
  _mcpServers = [..._mcpServers, server];
  _mcpSkills = _mcpSkills.map(s => s.id === id ? { ...s, installed: true, installed_server_id: server.id, updated_at: Date.now() } : s);
  return _mcpSkills.find(s => s.id === id);
}
export function uninstallDemoMcpSkill(id: string): McpSkill | undefined {
  const skill = _mcpSkills.find(s => s.id === id);
  if (!skill || !skill.installed) return skill;
  if (skill.installed_server_id) _mcpServers = _mcpServers.filter(s => s.id !== skill.installed_server_id);
  _mcpSkills = _mcpSkills.map(s => s.id === id ? { ...s, installed: false, installed_server_id: undefined, updated_at: Date.now() } : s);
  return _mcpSkills.find(s => s.id === id);
}

// ── Global Memory ──
export function getDemoMemories() { return _memories.filter(m => !m.archived); }
export function getAllDemoMemories() { return _memories; }
export function getDemoMemory(id: string) { return _memories.find(m => m.id === id); }
export function createDemoMemory(data: Partial<MemoryEntry>): MemoryEntry {
  const m: MemoryEntry = { id: `mem-${Date.now()}`, content: data.content || '', memory_type: data.memory_type || 'fact', source: data.source || 'user_input', keywords: data.keywords || [], importance: data.importance || 3, access_count: 0, archived: false, created_at: Date.now(), updated_at: Date.now() };
  _memories = [..._memories, m]; return m;
}
export function updateDemoMemory(id: string, data: Partial<MemoryEntry>): MemoryEntry | undefined {
  _memories = _memories.map(m => m.id === id ? { ...m, ...data, updated_at: Date.now() } : m); return _memories.find(m => m.id === id);
}
export function deleteDemoMemory(id: string): boolean {
  const len = _memories.length; _memories = _memories.filter(m => m.id !== id); return _memories.length < len;
}
export function archiveDemoMemory(id: string): MemoryEntry | undefined {
  return updateDemoMemory(id, { archived: true });
}
export function searchDemoMemories(query: string): MemoryEntry[] {
  const q = query.toLowerCase();
  return _memories.filter(m => !m.archived && (m.content.toLowerCase().includes(q) || m.keywords.some(k => k.toLowerCase().includes(q)) || m.business_domain?.toLowerCase().includes(q)));
}

// ── Scheduled Tasks ──
export function getDemoScheduledTasks() { return _scheduledTasks; }
export function getDemoScheduledTask(id: string) { return _scheduledTasks.find(t => t.id === id); }
export function createDemoScheduledTask(data: Partial<ScheduledTask>): ScheduledTask {
  const t: ScheduledTask = { id: `st-${Date.now()}`, name: data.name || '', description: data.description || '', task_type: data.task_type || 'data_monitor', status: 'active', frequency: data.frequency || 'hourly', cron_expression: data.cron_expression, next_run_at: Date.now() + 3600000, created_by: 'user-001', account_ids: data.account_ids || [], app_names: data.app_names || [], monitor_metrics: data.monitor_metrics || [], alert_conditions: data.alert_conditions || [], alert_channels: data.alert_channels || ['in_app'], alert_targets: data.alert_targets || [], mcp_skill_id: data.mcp_skill_id, custom_params: data.custom_params || {}, recent_executions: [], total_executions: 0, success_count: 0, failure_count: 0, enabled: true, created_at: Date.now(), updated_at: Date.now() };
  _scheduledTasks = [..._scheduledTasks, t]; return t;
}
export function updateDemoScheduledTask(id: string, data: Partial<ScheduledTask>): ScheduledTask | undefined {
  _scheduledTasks = _scheduledTasks.map(t => t.id === id ? { ...t, ...data, updated_at: Date.now() } : t); return _scheduledTasks.find(t => t.id === id);
}
export function deleteDemoScheduledTask(id: string): boolean {
  const len = _scheduledTasks.length; _scheduledTasks = _scheduledTasks.filter(t => t.id !== id); return _scheduledTasks.length < len;
}
export function pauseDemoScheduledTask(id: string): ScheduledTask | undefined {
  return updateDemoScheduledTask(id, { status: 'paused', enabled: false });
}
export function resumeDemoScheduledTask(id: string): ScheduledTask | undefined {
  return updateDemoScheduledTask(id, { status: 'active', enabled: true, next_run_at: Date.now() + 3600000 });
}
