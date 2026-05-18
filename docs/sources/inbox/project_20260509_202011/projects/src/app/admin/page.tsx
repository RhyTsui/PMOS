'use client';

import { useState } from 'react';
import {
  ArrowLeft, Plus, Search, Edit3, ToggleLeft, ToggleRight,
  Tag, Clock, FileText, ChevronRight, GitBranch, Link2,
  Settings, RotateCcw, Save, X, Zap, Shield, Cpu, Smartphone,
  Globe, Timer, MessageSquare, AlertTriangle, Play, Pause,
  ClipboardList, Target, Users, CheckSquare, ArrowRightLeft,
} from 'lucide-react';
import Link from 'next/link';
import { MOCK_DEMAND_POOL } from '@/lib/constants';

// ---- Types ----
interface PromptConfig {
  id: string;
  name: string;
  scope: string;
  intent_type: string;
  status: 'active' | 'draft' | 'archived';
  version: string;
  updated_at: string;
  description: string;
  binding_count: number;
  content: string;
  variables: { name: string; description: string; example: string }[];
  versions: { version: string; created_at: string; status: string; summary: string }[];
  bindings: { target_type: string; target_name: string; enabled: boolean }[];
}

// ---- Mock Data ----
const MOCK_PROMPTS: PromptConfig[] = [
  {
    id: 'prompt_001',
    name: '使用帮助路由提示词',
    scope: 'routing',
    intent_type: 'help',
    status: 'active',
    version: 'v1.2',
    updated_at: '2026-05-08 14:30',
    description: '识别使用帮助类意图，输出指标解释、系统路径、规则引用',
    binding_count: 3,
    content: `你是一个广告技术服务数字员工，当前正在处理"使用帮助"类请求。

## 任务
1. 判断用户问题是否属于帮助类（指标解释、系统路径、规则说明、常见技术问题）
2. 如果属于帮助类，提取问题主题和关键词
3. 输出结构化帮助结果

## 输出格式
- question_type: 指标解释 | 逻辑说明 | 系统路径 | 常见问题
- subject: 问题主题
- definition_text: 解释说明
- system_path: 系统入口路径
- source_refs: 引用来源列表
- confidence_level: high | medium | low
- next_actions: 推荐下一步动作

## 注意
- 不确定时必须明确表达不确定性
- 引用来源必须标注出处
- 系统路径要给出具体入口地址`,
    variables: [
      { name: 'question', description: '用户原始问题', example: '首日ROI倒推是什么意思' },
      { name: 'context', description: '当前会话上下文', example: '用户正在查看巨量投放数据' },
      { name: 'media', description: '当前媒体', example: '巨量' },
    ],
    versions: [
      { version: 'v1.2', created_at: '2026-05-08 14:30', status: 'active', summary: '增加不确定性表达约束' },
      { version: 'v1.1', created_at: '2026-05-07 10:00', status: 'archived', summary: '补充引用来源格式' },
      { version: 'v1.0', created_at: '2026-05-06 09:00', status: 'archived', summary: '初版' },
    ],
    bindings: [
      { target_type: 'agent', target_name: 'AdAssistant', enabled: true },
      { target_type: 'workflow', target_name: 'help_workflow', enabled: true },
      { target_type: 'model', target_name: 'gpt-4o', enabled: true },
    ],
  },
  {
    id: 'prompt_002',
    name: '需求沟通路由提示词',
    scope: 'routing',
    intent_type: 'demand',
    status: 'active',
    version: 'v1.1',
    updated_at: '2026-05-07 10:00',
    description: '识别需求沟通类意图，输出结构化需求单模板与追问策略',
    binding_count: 4,
    content: `你是一个广告技术服务数字员工，当前正在处理"需求沟通"类请求。

## 任务
1. 判断用户输入是否属于需求类（媒体回传、事件映射、埋点配置、归因配置）
2. 提取已有信息字段
3. 识别缺失字段并生成追问
4. 输出结构化需求单

## 必要字段
- media: 目标媒体
- app: 应用名称
- event_type: 事件类型
- callback_url: 回传地址（可选）
- device_id: 设备标识（可选）

## 输出格式
- demand_form: 结构化需求单
- missing_fields: 缺失字段列表
- clarification_question: 追问问题`,
    variables: [
      { name: 'user_input', description: '用户原始输入', example: '我要接一个新的媒体回传需求' },
      { name: 'known_fields', description: '已知字段', example: 'media=巨量' },
    ],
    versions: [
      { version: 'v1.1', created_at: '2026-05-07 10:00', status: 'active', summary: '增加缺失字段优先级' },
      { version: 'v1.0', created_at: '2026-05-06 09:00', status: 'archived', summary: '初版' },
    ],
    bindings: [
      { target_type: 'agent', target_name: 'AdAssistant', enabled: true },
      { target_type: 'workflow', target_name: 'demand_workflow', enabled: true },
      { target_type: 'model', target_name: 'gpt-4o', enabled: true },
      { target_type: 'model', target_name: 'claude-3.5-sonnet', enabled: false },
    ],
  },
  {
    id: 'prompt_003',
    name: '问题排查路由提示词',
    scope: 'routing',
    intent_type: 'diagnosis',
    status: 'active',
    version: 'v1.3',
    updated_at: '2026-05-08 16:45',
    description: '识别问题排查类意图，输出异常类型判断与证据链收集策略',
    binding_count: 5,
    content: `你是一个广告技术服务数字员工，当前正在处理"问题排查"类请求。

## 任务
1. 判断用户输入是否属于排查类（数据gap、归因不一致、回推异常、上报异常）
2. 提取异常上下文（媒体、应用、时间范围、异常现象）
3. 规划证据链收集步骤
4. 输出初步排查结论

## 排查维度
- 上报链路：客户端 -> 服务端 -> 数据处理
- 归因链路：点击 -> 曝光 -> 转化 -> 归因判定
- 回推链路：归因结果 -> 媒体回传 -> 媒体报表

## 输出格式
- conclusion: 初步结论
- evidence_chain: 证据链
- confidence: high | medium | low
- next_action: 下一步动作`,
    variables: [
      { name: 'problem', description: '用户描述的问题', example: '为什么这个计划激活比BI少了28%' },
      { name: 'media', description: '当前媒体', example: '巨量' },
      { name: 'time_range', description: '异常时间范围', example: '2026-05-01 ~ 2026-05-07' },
    ],
    versions: [
      { version: 'v1.3', created_at: '2026-05-08 16:45', status: 'active', summary: '增加回推链路排查维度' },
      { version: 'v1.2', created_at: '2026-05-07 14:00', status: 'archived', summary: '补充置信度解释' },
      { version: 'v1.1', created_at: '2026-05-06 10:00', status: 'archived', summary: '增加证据链结构' },
      { version: 'v1.0', created_at: '2026-05-05 09:00', status: 'archived', summary: '初版' },
    ],
    bindings: [
      { target_type: 'agent', target_name: 'DiagnosisAgent', enabled: true },
      { target_type: 'workflow', target_name: 'diagnosis_workflow', enabled: true },
      { target_type: 'model', target_name: 'gpt-4o', enabled: true },
      { target_type: 'skill', target_name: 'data_query', enabled: true },
      { target_type: 'skill', target_name: 'log_retrieval', enabled: true },
    ],
  },
  {
    id: 'prompt_004',
    name: '广告联调路由提示词',
    scope: 'routing',
    intent_type: 'debugging',
    status: 'active',
    version: 'v1.0',
    updated_at: '2026-05-06 09:20',
    description: '识别广告联调类意图，输出联调准备项检查与执行策略',
    binding_count: 2,
    content: `你是一个广告技术服务数字员工，当前正在处理"广告联调"类请求。

## 任务
1. 判断用户输入是否属于联调类（回传测试、事件映射验证、SDK集成验证）
2. 检查联调准备项（账号、设备、白名单）
3. 规划联调执行步骤
4. 输出联调报告

## 准备项检查
- 媒体账号是否已配置
- 测试设备是否在白名单
- 回传URL是否可达
- 事件映射是否已定义

## 输出格式
- preparation_status: 准备项状态
- execution_steps: 执行步骤
- log_output: 日志输出
- result: 联调结果`,
    variables: [
      { name: 'intent', description: '联调意图', example: '帮我开始联调' },
      { name: 'media', description: '目标媒体', example: '巨量' },
    ],
    versions: [
      { version: 'v1.0', created_at: '2026-05-06 09:20', status: 'active', summary: '初版' },
    ],
    bindings: [
      { target_type: 'agent', target_name: 'IntegrationAgent', enabled: true },
      { target_type: 'workflow', target_name: 'debugging_workflow', enabled: true },
    ],
  },
  {
    id: 'prompt_005',
    name: '帮助结果生成提示词',
    scope: 'workflow',
    intent_type: 'help',
    status: 'active',
    version: 'v2.0',
    updated_at: '2026-05-08 18:00',
    description: '生成帮助类工作流结果，包含定义、路径、引用、下一步',
    binding_count: 2,
    content: `根据已识别的帮助类问题，生成结构化帮助结果。

## 输出要求
1. question_type: 指标解释 / 逻辑说明 / 系统路径 / 常见问题
2. subject: 问题主题
3. definition_text: 清晰的解释说明
4. system_path: 具体系统入口（名称 + 路径）
5. source_refs: 引用来源（来源类型 + 来源名称 + 可靠度）
6. confidence_level: high / medium / low
7. uncertainty: 不确定之处（如有）
8. next_actions: 推荐下一步动作列表`,
    variables: [
      { name: 'question', description: '帮助问题', example: '首日ROI倒推是什么意思' },
    ],
    versions: [
      { version: 'v2.0', created_at: '2026-05-08 18:00', status: 'active', summary: '增加不确定性表达和来源可靠度' },
      { version: 'v1.0', created_at: '2026-05-06 09:00', status: 'archived', summary: '初版' },
    ],
    bindings: [
      { target_type: 'workflow', target_name: 'help_workflow', enabled: true },
      { target_type: 'model', target_name: 'gpt-4o', enabled: true },
    ],
  },
  {
    id: 'prompt_006',
    name: '排查结果生成提示词',
    scope: 'workflow',
    intent_type: 'diagnosis',
    status: 'active',
    version: 'v1.5',
    updated_at: '2026-05-07 15:30',
    description: '生成排查类工作流结果，包含结论、证据链、置信度、建议',
    binding_count: 3,
    content: `根据排查过程和收集的证据，生成结构化排查报告。

## 输出要求
1. conclusion: 初步结论
2. evidence_chain: 证据链（按时间顺序）
3. confidence: high / medium / low
4. risk_level: high / medium / low
5. missing_evidence: 仍缺的证据
6. next_actions: 分层下一步动作（自动可执行 / 需人工确认）`,
    variables: [
      { name: 'task_context', description: '任务上下文', example: '巨量激活异常' },
    ],
    versions: [
      { version: 'v1.5', created_at: '2026-05-07 15:30', status: 'active', summary: '增加风险等级和缺失证据' },
      { version: 'v1.0', created_at: '2026-05-05 09:00', status: 'archived', summary: '初版' },
    ],
    bindings: [
      { target_type: 'workflow', target_name: 'diagnosis_workflow', enabled: true },
      { target_type: 'model', target_name: 'gpt-4o', enabled: true },
      { target_type: 'skill', target_name: 'evidence_collector', enabled: true },
    ],
  },
  {
    id: 'prompt_007',
    name: '需求单结构化提示词',
    scope: 'workflow',
    intent_type: 'demand',
    status: 'draft',
    version: 'v0.3',
    updated_at: '2026-05-05 11:15',
    description: '生成结构化需求单，包含缺失字段、依赖项、协作计划',
    binding_count: 1,
    content: `根据需求沟通过程，生成结构化需求单。

## 输出要求
1. demand_form: 需求单（媒体、应用、事件、回传配置等）
2. missing_fields: 仍缺字段
3. dependencies: 依赖项
4. collaboration_plan: 协作计划`,
    variables: [
      { name: 'conversation', description: '需求沟通过程', example: '用户要求接入巨量回传' },
    ],
    versions: [
      { version: 'v0.3', created_at: '2026-05-05 11:15', status: 'draft', summary: '草稿版' },
    ],
    bindings: [
      { target_type: 'workflow', target_name: 'demand_workflow', enabled: false },
    ],
  },
  {
    id: 'prompt_008',
    name: '追问生成提示词',
    scope: 'clarification',
    intent_type: 'general',
    status: 'active',
    version: 'v1.1',
    updated_at: '2026-05-08 12:00',
    description: '生成追问补全缺失字段，包含追问策略与上下文维护',
    binding_count: 4,
    content: `根据当前任务上下文和缺失字段，生成追问消息。

## 追问原则
1. 每次追问不超过2个字段
2. 追问要给出具体示例
3. 允许用户跳过非必要字段
4. 维护已收集字段不丢失

## 输出格式
- clarification_question: 追问问题
- target_fields: 目标补录字段
- examples: 示例回答`,
    variables: [
      { name: 'missing_fields', description: '缺失字段列表', example: 'media, app, time_range' },
      { name: 'known_fields', description: '已知字段', example: 'media=巨量' },
    ],
    versions: [
      { version: 'v1.1', created_at: '2026-05-08 12:00', status: 'active', summary: '增加追问频率限制' },
      { version: 'v1.0', created_at: '2026-05-06 09:00', status: 'archived', summary: '初版' },
    ],
    bindings: [
      { target_type: 'agent', target_name: 'AdAssistant', enabled: true },
      { target_type: 'agent', target_name: 'DiagnosisAgent', enabled: true },
      { target_type: 'agent', target_name: 'IntegrationAgent', enabled: true },
      { target_type: 'model', target_name: 'gpt-4o', enabled: true },
    ],
  },
];

// ---- Helper maps ----
const statusStyles: Record<string, string> = {
  active: 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]',
  draft: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]',
  archived: 'bg-[rgba(100,116,139,0.15)] text-[#64748B]',
};

const statusLabels: Record<string, string> = {
  active: '已上线',
  draft: '草稿',
  archived: '已归档',
};

const scopeLabels: Record<string, string> = {
  routing: '路由层',
  workflow: '工作流层',
  clarification: '追问层',
};

type DetailTab = 'content' | 'versions' | 'bindings';
type AdminTab = 'prompts' | 'feature-switches' | 'auto-debug-config' | 'demand-pool';

// ---- Auto-Debugging Config Types ----
interface DebugAutomationConfigItem {
  id: string;
  name: string;
  media: string;
  platform: 'android' | 'ios' | 'both';
  environment: 'production' | 'staging' | 'test';
  executor_type: 'full_auto' | 'semi_auto' | 'manual';
  status: 'active' | 'inactive' | 'draft';
  keywords: { match_type: 'exact' | 'contains' | 'regex'; pattern: string; description: string }[];
  timeout_config: { stage: string; timeout_seconds: number; retry_count: number }[];
  instruction_text: string;
  updated_at: string;
  created_by: string;
}

// ---- Auto-Debugging Config Mock Data ----
const MOCK_DEBUG_CONFIGS: DebugAutomationConfigItem[] = [
  {
    id: 'dbg_cfg_001',
    name: '巨量 Android 全自动联调模板',
    media: '巨量引擎',
    platform: 'android',
    environment: 'production',
    executor_type: 'full_auto',
    status: 'active',
    keywords: [
      { match_type: 'exact', pattern: '巨量联调', description: '精确匹配巨量联调请求' },
      { match_type: 'contains', pattern: '巨量.*测试', description: '匹配含巨量+测试的请求' },
      { match_type: 'regex', pattern: 'bytedance|toutiao', description: '匹配字节系媒体关键词' },
    ],
    timeout_config: [
      { stage: 'web_prepare', timeout_seconds: 30, retry_count: 1 },
      { stage: 'mobile_scan', timeout_seconds: 60, retry_count: 2 },
      { stage: 'mobile_find_ad', timeout_seconds: 90, retry_count: 3 },
      { stage: 'mobile_launch', timeout_seconds: 45, retry_count: 2 },
      { stage: 'success_poll', timeout_seconds: 120, retry_count: 3 },
    ],
    instruction_text: '请确保测试设备已加入白名单，广告计划已创建且处于投放状态。联调过程中请勿操作测试设备。',
    updated_at: '2026-05-08 14:30',
    created_by: '张工',
  },
  {
    id: 'dbg_cfg_002',
    name: '快手 iOS 半自动联调模板',
    media: '快手广告',
    platform: 'ios',
    environment: 'staging',
    executor_type: 'semi_auto',
    status: 'active',
    keywords: [
      { match_type: 'exact', pattern: '快手联调', description: '精确匹配快手联调请求' },
      { match_type: 'contains', pattern: '快手.*回传', description: '匹配含快手+回传的请求' },
    ],
    timeout_config: [
      { stage: 'web_prepare', timeout_seconds: 30, retry_count: 1 },
      { stage: 'mobile_scan', timeout_seconds: 45, retry_count: 2 },
      { stage: 'mobile_find_ad', timeout_seconds: 60, retry_count: 2 },
      { stage: 'mobile_launch', timeout_seconds: 30, retry_count: 1 },
      { stage: 'success_poll', timeout_seconds: 90, retry_count: 2 },
    ],
    instruction_text: 'iOS 设备需确保已安装 TestFlight 版本，快手广告 SDK 版本 >= 3.5.0。',
    updated_at: '2026-05-07 10:00',
    created_by: '李工',
  },
  {
    id: 'dbg_cfg_003',
    name: '广点通通用联调模板',
    media: '广点通',
    platform: 'both',
    environment: 'test',
    executor_type: 'semi_auto',
    status: 'draft',
    keywords: [
      { match_type: 'contains', pattern: '广点通', description: '匹配广点通相关请求' },
    ],
    timeout_config: [
      { stage: 'web_prepare', timeout_seconds: 30, retry_count: 1 },
      { stage: 'mobile_scan', timeout_seconds: 60, retry_count: 2 },
      { stage: 'mobile_find_ad', timeout_seconds: 90, retry_count: 3 },
      { stage: 'mobile_launch', timeout_seconds: 45, retry_count: 2 },
      { stage: 'success_poll', timeout_seconds: 120, retry_count: 3 },
    ],
    instruction_text: '广点通联调需要使用优量汇广告位ID，请提前在后台配置好广告位。',
    updated_at: '2026-05-05 16:00',
    created_by: '王工',
  },
  {
    id: 'dbg_cfg_004',
    name: '百度营销全平台联调模板',
    media: '百度营销',
    platform: 'both',
    environment: 'production',
    executor_type: 'manual',
    status: 'inactive',
    keywords: [
      { match_type: 'exact', pattern: '百度联调', description: '精确匹配百度联调请求' },
      { match_type: 'regex', pattern: 'baidu|百度', description: '匹配百度系关键词' },
    ],
    timeout_config: [
      { stage: 'web_prepare', timeout_seconds: 60, retry_count: 2 },
      { stage: 'mobile_scan', timeout_seconds: 90, retry_count: 3 },
      { stage: 'mobile_find_ad', timeout_seconds: 120, retry_count: 3 },
      { stage: 'mobile_launch', timeout_seconds: 60, retry_count: 2 },
      { stage: 'success_poll', timeout_seconds: 180, retry_count: 3 },
    ],
    instruction_text: '百度营销平台联调需要等待广告审核通过后才能开始，请预留充足时间。',
    updated_at: '2026-05-03 09:00',
    created_by: '赵工',
  },
];

const executorTypeLabels: Record<string, string> = {
  full_auto: '全自动',
  semi_auto: '半自动',
  manual: '手动',
};

const executorTypeStyles: Record<string, string> = {
  full_auto: 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]',
  semi_auto: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]',
  manual: 'bg-[rgba(100,116,139,0.15)] text-[#64748B]',
};

const platformLabels: Record<string, string> = {
  android: 'Android',
  ios: 'iOS',
  both: '全平台',
};

const environmentLabels: Record<string, string> = {
  production: '生产',
  staging: '预发',
  test: '测试',
};

// ---- Feature Switch Mock Data ----
const MOCK_SWITCHES = [
  { key: 'auto_debug_full', name: '全自动联调开关', type: 'boolean', enabled: true, config: {}, description: '开启后联调任务自动执行，无需人工确认' },
  { key: 'auto_debug_takeover', name: '人工接管开关', type: 'boolean', enabled: true, config: {}, description: '允许在联调失败时由人工接管' },
  { key: 'evidence_auto_collect', name: '证据自动采集', type: 'boolean', enabled: true, config: {}, description: '自动采集排查所需日志和数据' },
  { key: 'demand_form_auto_fill', name: '需求单自动填充', type: 'boolean', enabled: false, config: {}, description: '从历史记录自动填充需求单字段' },
  { key: 'clarification_max_rounds', name: '追问轮数上限', type: 'number', enabled: true, config: { value: 3 }, description: '单次任务最多追问轮数' },
  { key: 'risk_alert_threshold', name: '风险告警阈值', type: 'number', enabled: true, config: { value: 0.7 }, description: '置信度低于此值时触发告警' },
];

// ---- Component ----
export default function AdminPage() {
  const [adminTab, setAdminTab] = useState<AdminTab>('prompts');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<string>('all');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('content');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Auto-debug config state
  const [dbgSearchTerm, setDbgSearchTerm] = useState('');
  const [dbgFilterMedia, setDbgFilterMedia] = useState<string>('all');
  const [dbgFilterPlatform, setDbgFilterPlatform] = useState<string>('all');
  const [dbgFilterEnv, setDbgFilterEnv] = useState<string>('all');
  const [dbgFilterStatus, setDbgFilterStatus] = useState<string>('all');
  const [selectedDbgConfigId, setSelectedDbgConfigId] = useState<string | null>(null);
  const [dbgDetailTab, setDbgDetailTab] = useState<'keywords' | 'timeout' | 'instruction'>('keywords');

  // Feature switch state
  const [switchStates, setSwitchStates] = useState<Record<string, boolean>>(
    Object.fromEntries(MOCK_SWITCHES.map(s => [s.key, s.enabled]))
  );

  const filtered = MOCK_PROMPTS.filter((p) => {
    const matchSearch = p.name.includes(searchTerm) || p.description.includes(searchTerm);
    const matchScope = filterScope === 'all' || p.scope === filterScope;
    return matchSearch && matchScope;
  });

  const selectedPrompt = MOCK_PROMPTS.find(p => p.id === selectedPromptId) || null;

  const handleSelectPrompt = (id: string) => {
    setSelectedPromptId(id);
    setDetailTab('content');
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    if (selectedPrompt) {
      setEditContent(selectedPrompt.content);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    // In real implementation, would save to backend
  };

  // Auto-debug config helpers
  const filteredDbgConfigs = MOCK_DEBUG_CONFIGS.filter((c) => {
    const matchSearch = c.name.includes(dbgSearchTerm) || c.media.includes(dbgSearchTerm);
    const matchMedia = dbgFilterMedia === 'all' || c.media === dbgFilterMedia;
    const matchPlatform = dbgFilterPlatform === 'all' || c.platform === dbgFilterPlatform || (dbgFilterPlatform === 'both' && c.platform === 'both');
    const matchEnv = dbgFilterEnv === 'all' || c.environment === dbgFilterEnv;
    const matchStatus = dbgFilterStatus === 'all' || c.status === dbgFilterStatus;
    return matchSearch && matchMedia && matchPlatform && matchEnv && matchStatus;
  });

  const selectedDbgConfig = MOCK_DEBUG_CONFIGS.find(c => c.id === selectedDbgConfigId) || null;

  const uniqueMedias = [...new Set(MOCK_DEBUG_CONFIGS.map(c => c.media))];

  const toggleSwitch = (key: string) => {
    setSwitchStates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-screen flex flex-col bg-[#0A0E1A]">
      {/* Header with Tabs */}
      <header className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(10,14,26,0.95)]">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-[#8B9DC3] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-[#c8d6e5]">管理中心</h1>
              <p className="text-[11px] text-[#5a6a8a]">提示词 &middot; 功能开关 &middot; 联调配置</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00D9FF] text-[#0A0E1A] text-sm font-medium hover:bg-[#00b8d9] transition-colors">
            <Plus className="w-4 h-4" />
            {adminTab === 'prompts' ? '新建提示词' : adminTab === 'auto-debug-config' ? '新建配置' : '新建'}
          </button>
        </div>
        {/* Tab Navigation */}
        <div className="flex px-6 gap-1">
          {([
            { key: 'prompts' as AdminTab, label: '提示词管理', icon: FileText },
            { key: 'feature-switches' as AdminTab, label: '功能开关', icon: ToggleRight },
            { key: 'auto-debug-config' as AdminTab, label: '自动联调配置', icon: Zap },
            { key: 'demand-pool' as AdminTab, label: '需求池', icon: ClipboardList },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAdminTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs border-b-2 transition-colors ${
                adminTab === tab.key
                  ? 'text-[#00D9FF] border-[#00D9FF]'
                  : 'text-[#5a6a8a] border-transparent hover:text-[#8B9DC3]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tab Content */}
      {adminTab === 'prompts' && (
        <PromptManagementTab
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterScope={filterScope}
          setFilterScope={setFilterScope}
          selectedPromptId={selectedPromptId}
          setSelectedPromptId={handleSelectPrompt}
          detailTab={detailTab}
          setDetailTab={setDetailTab}
          isEditing={isEditing}
          editContent={editContent}
          setEditContent={setEditContent}
          onStartEdit={handleStartEdit}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setIsEditing(false)}
          filtered={filtered}
          selectedPrompt={selectedPrompt}
        />
      )}

      {adminTab === 'feature-switches' && (
        <FeatureSwitchesTab
          switches={MOCK_SWITCHES}
          switchStates={switchStates}
          onToggle={toggleSwitch}
        />
      )}

      {adminTab === 'auto-debug-config' && (
        <AutoDebugConfigTab
          searchTerm={dbgSearchTerm}
          setSearchTerm={setDbgSearchTerm}
          filterMedia={dbgFilterMedia}
          setFilterMedia={setDbgFilterMedia}
          filterPlatform={dbgFilterPlatform}
          setFilterPlatform={setDbgFilterPlatform}
          filterEnv={dbgFilterEnv}
          setFilterEnv={setDbgFilterEnv}
          filterStatus={dbgFilterStatus}
          setFilterStatus={setDbgFilterStatus}
          selectedConfigId={selectedDbgConfigId}
          setSelectedConfigId={(id) => { setSelectedDbgConfigId(id); setDbgDetailTab('keywords'); }}
          detailTab={dbgDetailTab}
          setDetailTab={setDbgDetailTab}
          filteredConfigs={filteredDbgConfigs}
          selectedConfig={selectedDbgConfig}
          uniqueMedias={uniqueMedias}
        />
      )}

      {adminTab === 'demand-pool' && <DemandPoolTab />}
    </div>
  );
}

// ---- Prompt Management Tab Component ----
function PromptManagementTab({
  searchTerm, setSearchTerm, filterScope, setFilterScope,
  selectedPromptId, setSelectedPromptId, detailTab, setDetailTab,
  isEditing, editContent, setEditContent, onStartEdit, onSaveEdit, onCancelEdit,
  filtered, selectedPrompt,
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterScope: string;
  setFilterScope: (v: string) => void;
  selectedPromptId: string | null;
  setSelectedPromptId: (id: string) => void;
  detailTab: DetailTab;
  setDetailTab: (v: DetailTab) => void;
  isEditing: boolean;
  editContent: string;
  setEditContent: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  filtered: PromptConfig[];
  selectedPrompt: PromptConfig | null;
}) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Column - Filters */}
      <div className="w-56 border-r border-[rgba(255,255,255,0.06)] flex flex-col bg-[rgba(10,14,26,0.5)]">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4 px-2 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <Search className="w-3.5 h-3.5 text-[#5a6a8a]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索提示词..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-[#c8d6e5] placeholder:text-[#5a6a8a]"
            />
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider mb-2 px-2">分类筛选</div>
            {[
              { key: 'all', label: '全部', count: MOCK_PROMPTS.length },
              { key: 'routing', label: '路由层', count: MOCK_PROMPTS.filter(p => p.scope === 'routing').length },
              { key: 'workflow', label: '工作流层', count: MOCK_PROMPTS.filter(p => p.scope === 'workflow').length },
              { key: 'clarification', label: '追问层', count: MOCK_PROMPTS.filter(p => p.scope === 'clarification').length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilterScope(key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  filterScope === key
                    ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]'
                    : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 mt-6">
            <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider mb-2 px-2">状态筛选</div>
            {[
              { key: 'active', label: '已上线', color: '#00FF88' },
              { key: 'draft', label: '草稿', color: '#FFB800' },
              { key: 'archived', label: '已归档', color: '#64748B' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Column - List */}
      <div className="w-80 border-r border-[rgba(255,255,255,0.06)] flex flex-col">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
          <div className="text-xs text-[#5a6a8a]">共 {filtered.length} 个提示词</div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => setSelectedPromptId(prompt.id)}
              className={`w-full text-left p-4 border-b border-[rgba(255,255,255,0.04)] transition-colors ${
                selectedPromptId === prompt.id
                  ? 'bg-[rgba(0,217,255,0.06)] border-l-2 border-l-[#00D9FF]'
                  : 'hover:bg-[rgba(255,255,255,0.02)]'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className={`text-sm font-medium ${selectedPromptId === prompt.id ? 'text-[#00D9FF]' : 'text-[#c8d6e5]'}`}>
                  {prompt.name}
                </h3>
                <ChevronRight className="w-3.5 h-3.5 text-[#5a6a8a] mt-0.5" />
              </div>
              <p className="text-[11px] text-[#5a6a8a] mb-2 line-clamp-2">{prompt.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[prompt.status]}`}>
                  {statusLabels[prompt.status]}
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">
                  {scopeLabels[prompt.scope]}
                </span>
                <span className="text-[10px] text-[#5a6a8a]">{prompt.version}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#5a6a8a] text-sm">没有匹配的提示词</div>
          )}
        </div>
      </div>

      {/* Right Column - Detail / Edit */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedPrompt ? (
          <>
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-[#c8d6e5]">{selectedPrompt.name}</h2>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      <button onClick={onStartEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                        <Edit3 className="w-3.5 h-3.5" /> 编辑
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                        {selectedPrompt.status === 'active' ? <ToggleRight className="w-3.5 h-3.5 text-[#00FF88]" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {selectedPrompt.status === 'active' ? '停用' : '启用'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={onSaveEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#00D9FF] text-[#0A0E1A] hover:bg-[#00b8d9] transition-colors">
                        <Save className="w-3.5 h-3.5" /> 保存
                      </button>
                      <button onClick={onCancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                        <X className="w-3.5 h-3.5" /> 取消
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#5a6a8a]">
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {selectedPrompt.intent_type}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {selectedPrompt.updated_at}</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {selectedPrompt.version}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusStyles[selectedPrompt.status]}`}>
                  {statusLabels[selectedPrompt.status]}
                </span>
              </div>
            </div>

            <div className="px-6 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex gap-1">
                {[
                  { key: 'content' as DetailTab, label: '正文', icon: FileText },
                  { key: 'versions' as DetailTab, label: '版本', icon: GitBranch },
                  { key: 'bindings' as DetailTab, label: '绑定', icon: Link2 },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setDetailTab(key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
                      detailTab === key ? 'text-[#00D9FF] border-[#00D9FF]' : 'text-[#5a6a8a] border-transparent hover:text-[#8B9DC3]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {detailTab === 'content' && (
                <div className="space-y-6">
                  <div>
                    <div className="text-xs text-[#5a6a8a] mb-2">提示词正文</div>
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-80 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-sm text-[#c8d6e5] font-mono resize-none focus:outline-none focus:border-[rgba(0,217,255,0.3)]"
                      />
                    ) : (
                      <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                        <pre className="text-sm text-[#c8d6e5] font-mono whitespace-pre-wrap leading-relaxed">{selectedPrompt.content}</pre>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-[#5a6a8a] mb-2">变量说明</div>
                    <div className="space-y-2">
                      {selectedPrompt.variables.map((v, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs text-[#00D9FF] font-mono">{`{{${v.name}}}`}</code>
                          </div>
                          <div className="text-[11px] text-[#8B9DC3]">{v.description}</div>
                          <div className="text-[11px] text-[#5a6a8a] mt-1">示例: {v.example}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#5a6a8a] mb-2">适用范围</div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">{scopeLabels[selectedPrompt.scope]}</span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] bg-[rgba(255,255,255,0.05)] text-[#8B9DC3]">{selectedPrompt.intent_type}</span>
                    </div>
                  </div>
                </div>
              )}
              {detailTab === 'versions' && (
                <div className="space-y-3">
                  {selectedPrompt.versions.map((v, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-3.5 h-3.5 text-[#8B9DC3]" />
                          <span className="text-sm font-medium text-[#c8d6e5]">{v.version}</span>
                          {v.status === 'active' && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[rgba(0,255,136,0.1)] text-[#00FF88]">当前生效</span>}
                        </div>
                        {v.status !== 'active' && (
                          <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                            <RotateCcw className="w-3 h-3" /> 回滚到此版本
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-[#5a6a8a] mb-1">{v.created_at}</div>
                      <div className="text-xs text-[#8B9DC3]">{v.summary}</div>
                    </div>
                  ))}
                </div>
              )}
              {detailTab === 'bindings' && (
                <div className="space-y-3">
                  {selectedPrompt.bindings.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${b.enabled ? 'bg-[#00FF88]' : 'bg-[#5a6a8a]'}`} />
                        <div>
                          <div className="text-sm text-[#c8d6e5]">{b.target_name}</div>
                          <div className="text-[11px] text-[#5a6a8a]">
                            {b.target_type === 'agent' ? '智能体' : b.target_type === 'workflow' ? '工作流' : b.target_type === 'model' ? '模型' : '技能'}
                          </div>
                        </div>
                      </div>
                      <button className="flex items-center">
                        {b.enabled ? <ToggleRight className="w-5 h-5 text-[#00FF88]" /> : <ToggleLeft className="w-5 h-5 text-[#5a6a8a]" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Settings className="w-10 h-10 text-[#2a3654] mx-auto mb-3" />
              <div className="text-sm text-[#5a6a8a]">选择左侧提示词查看详情</div>
              <div className="text-[11px] text-[#3a4a6a] mt-1">支持编辑、版本管理与绑定配置</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Feature Switches Tab Component ----
function FeatureSwitchesTab({
  switches, switchStates, onToggle,
}: {
  switches: typeof MOCK_SWITCHES;
  switchStates: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-[#c8d6e5]">功能开关</h2>
            <p className="text-[11px] text-[#5a6a8a] mt-1">灰度 / 全量 / 按角色控制</p>
          </div>
        </div>
        <div className="space-y-3">
          {switches.map((sw) => (
            <div key={sw.key} className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-medium text-[#c8d6e5]">{sw.name}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      sw.type === 'boolean' ? 'bg-[rgba(0,217,255,0.08)] text-[#00D9FF]' : 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]'
                    }`}>
                      {sw.type === 'boolean' ? '布尔' : '数值'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5a6a8a]">{sw.description}</div>
                  {sw.type === 'number' && sw.config.value !== undefined && (
                    <div className="text-[11px] text-[#8B9DC3] mt-1">当前值: {String(sw.config.value)}</div>
                  )}
                </div>
                <button onClick={() => onToggle(sw.key)} className="flex items-center">
                  {switchStates[sw.key] ? (
                    <ToggleRight className="w-8 h-8 text-[#00FF88]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-[#5a6a8a]" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Auto-Debug Config Tab Component ----
function AutoDebugConfigTab({
  searchTerm, setSearchTerm,
  filterMedia, setFilterMedia, filterPlatform, setFilterPlatform,
  filterEnv, setFilterEnv, filterStatus, setFilterStatus,
  selectedConfigId, setSelectedConfigId,
  detailTab, setDetailTab,
  filteredConfigs, selectedConfig, uniqueMedias,
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterMedia: string;
  setFilterMedia: (v: string) => void;
  filterPlatform: string;
  setFilterPlatform: (v: string) => void;
  filterEnv: string;
  setFilterEnv: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  selectedConfigId: string | null;
  setSelectedConfigId: (id: string) => void;
  detailTab: 'keywords' | 'timeout' | 'instruction';
  setDetailTab: (v: 'keywords' | 'timeout' | 'instruction') => void;
  filteredConfigs: DebugAutomationConfigItem[];
  selectedConfig: DebugAutomationConfigItem | null;
  uniqueMedias: string[];
}) {
  const dbgConfigStatusStyles: Record<string, string> = {
    active: 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]',
    inactive: 'bg-[rgba(100,116,139,0.15)] text-[#64748B]',
    draft: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]',
  };
  const dbgConfigStatusLabels: Record<string, string> = {
    active: '已启用',
    inactive: '已停用',
    draft: '草稿',
  };
  const stageLabels: Record<string, string> = {
    web_prepare: 'Web准备',
    mobile_scan: '移动端扫码',
    mobile_find_ad: '查找广告',
    mobile_launch: '启动应用',
    success_poll: '成功轮询',
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Column - Filters */}
      <div className="w-56 border-r border-[rgba(255,255,255,0.06)] flex flex-col bg-[rgba(10,14,26,0.5)]">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4 px-2 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <Search className="w-3.5 h-3.5 text-[#5a6a8a]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索配置..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-[#c8d6e5] placeholder:text-[#5a6a8a]"
            />
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider mb-2 px-2">媒体筛选</div>
            <button
              onClick={() => setFilterMedia('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                filterMedia === 'all' ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              <span>全部媒体</span>
            </button>
            {uniqueMedias.map((media) => (
              <button
                key={media}
                onClick={() => setFilterMedia(media)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  filterMedia === media ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <span>{media}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 mt-4">
            <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider mb-2 px-2">终端筛选</div>
            {['all', 'android', 'ios', 'both'].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  filterPlatform === p ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <span>{p === 'all' ? '全部终端' : platformLabels[p]}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 mt-4">
            <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider mb-2 px-2">环境筛选</div>
            {['all', 'production', 'staging', 'test'].map((e) => (
              <button
                key={e}
                onClick={() => setFilterEnv(e)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  filterEnv === e ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <span>{e === 'all' ? '全部环境' : environmentLabels[e]}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 mt-4">
            <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider mb-2 px-2">状态筛选</div>
            {['all', 'active', 'inactive', 'draft'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  filterStatus === s ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <span>{s === 'all' ? '全部状态' : dbgConfigStatusLabels[s]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Column - Config List */}
      <div className="w-80 border-r border-[rgba(255,255,255,0.06)] flex flex-col">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
          <div className="text-xs text-[#5a6a8a]">共 {filteredConfigs.length} 个配置模板</div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConfigs.map((cfg) => (
            <button
              key={cfg.id}
              onClick={() => setSelectedConfigId(cfg.id)}
              className={`w-full text-left p-4 border-b border-[rgba(255,255,255,0.04)] transition-colors ${
                selectedConfigId === cfg.id
                  ? 'bg-[rgba(0,217,255,0.06)] border-l-2 border-l-[#00D9FF]'
                  : 'hover:bg-[rgba(255,255,255,0.02)]'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className={`text-sm font-medium ${selectedConfigId === cfg.id ? 'text-[#00D9FF]' : 'text-[#c8d6e5]'}`}>
                  {cfg.name}
                </h3>
                <ChevronRight className="w-3.5 h-3.5 text-[#5a6a8a] mt-0.5" />
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="flex items-center gap-1 text-[11px] text-[#8B9DC3]">
                  <Globe className="w-3 h-3" /> {cfg.media}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#8B9DC3]">
                  <Smartphone className="w-3 h-3" /> {platformLabels[cfg.platform]}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${dbgConfigStatusStyles[cfg.status]}`}>
                  {dbgConfigStatusLabels[cfg.status]}
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${executorTypeStyles[cfg.executor_type]}`}>
                  {executorTypeLabels[cfg.executor_type]}
                </span>
              </div>
            </button>
          ))}
          {filteredConfigs.length === 0 && (
            <div className="text-center py-12 text-[#5a6a8a] text-sm">没有匹配的配置</div>
          )}
        </div>
      </div>

      {/* Right Column - Config Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConfig ? (
          <>
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-[#c8d6e5]">{selectedConfig.name}</h2>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> 编辑
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                    {selectedConfig.status === 'active' ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-[#FFB800]" /> 停用
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-[#00FF88]" /> 启用
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#5a6a8a]">
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {selectedConfig.media}</span>
                <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {platformLabels[selectedConfig.platform]}</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {environmentLabels[selectedConfig.environment]}</span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {executorTypeLabels[selectedConfig.executor_type]}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${dbgConfigStatusStyles[selectedConfig.status]}`}>
                  {dbgConfigStatusLabels[selectedConfig.status]}
                </span>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="px-6 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex gap-1">
                {[
                  { key: 'keywords' as const, label: '关键词配置', icon: Search },
                  { key: 'timeout' as const, label: '超时配置', icon: Timer },
                  { key: 'instruction' as const, label: '说明文案', icon: MessageSquare },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setDetailTab(key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
                      detailTab === key ? 'text-[#00D9FF] border-[#00D9FF]' : 'text-[#5a6a8a] border-transparent hover:text-[#8B9DC3]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {detailTab === 'keywords' && (
                <div className="space-y-4">
                  <div className="text-xs text-[#5a6a8a] mb-2">触发关键词规则</div>
                  {selectedConfig.keywords.map((kw, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          kw.match_type === 'exact' ? 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]'
                            : kw.match_type === 'contains' ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]'
                              : 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]'
                        }`}>
                          {kw.match_type === 'exact' ? '精确匹配' : kw.match_type === 'contains' ? '包含匹配' : '正则匹配'}
                        </span>
                      </div>
                      <code className="text-sm text-[#c8d6e5] font-mono block mb-2">{kw.pattern}</code>
                      <div className="text-[11px] text-[#5a6a8a]">{kw.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === 'timeout' && (
                <div className="space-y-4">
                  <div className="text-xs text-[#5a6a8a] mb-2">阶段超时与重试配置</div>
                  {selectedConfig.timeout_config.map((tc, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${idx < 3 ? 'bg-[#00D9FF]' : 'bg-[#FFB800]'}`} />
                          <span className="text-sm font-medium text-[#c8d6e5]">
                            {stageLabels[tc.stage] || tc.stage}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-[#5a6a8a] mb-1">超时时间</div>
                          <div className="flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5 text-[#00D9FF]" />
                            <span className="text-sm text-[#c8d6e5]">{tc.timeout_seconds}s</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#5a6a8a] mb-1">重试次数</div>
                          <div className="flex items-center gap-2">
                            <RotateCcw className="w-3.5 h-3.5 text-[#FFB800]" />
                            <span className="text-sm text-[#c8d6e5]">{tc.retry_count} 次</span>
                          </div>
                        </div>
                      </div>
                      {/* Timeout progress bar */}
                      <div className="mt-3">
                        <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              tc.timeout_seconds > 100 ? 'bg-[#FFB800]' : tc.timeout_seconds > 60 ? 'bg-[#00D9FF]' : 'bg-[#00FF88]'
                            }`}
                            style={{ width: `${Math.min((tc.timeout_seconds / 180) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === 'instruction' && (
                <div className="space-y-4">
                  <div className="text-xs text-[#5a6a8a] mb-2">联调说明文案</div>
                  <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                    <pre className="text-sm text-[#c8d6e5] whitespace-pre-wrap leading-relaxed">{selectedConfig.instruction_text}</pre>
                  </div>
                  <div className="p-4 rounded-xl bg-[rgba(255,184,0,0.05)] border border-[rgba(255,184,0,0.15)]">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-[#FFB800]" />
                      <span className="text-xs text-[#FFB800] font-medium">注意事项</span>
                    </div>
                    <div className="text-[11px] text-[#8B9DC3] space-y-1">
                      <p>1. 此文案将在联调开始前展示给用户</p>
                      <p>2. 请确保文案包含必要的准备条件和注意事项</p>
                      <p>3. 修改后需重新发布才生效</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#5a6a8a]">
                    <span>创建者: {selectedConfig.created_by}</span>
                    <span>更新时间: {selectedConfig.updated_at}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Zap className="w-10 h-10 text-[#2a3654] mx-auto mb-3" />
              <div className="text-sm text-[#5a6a8a]">选择左侧配置查看详情</div>
              <div className="text-[11px] text-[#3a4a6a] mt-1">关键词配置 / 超时配置 / 说明文案</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Demand Pool Tab Component (需求池模板增强建议) ----
function DemandPoolTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterFlow, setFilterFlow] = useState<string>('all');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const pool = MOCK_DEMAND_POOL;
  const selected = pool.find(d => d.id === selectedId);

  const filtered = pool.filter(d => {
    if (filterFlow !== 'all' && d.business_flow !== filterFlow) return false;
    if (filterPhase !== 'all' && d.phase !== filterPhase) return false;
    if (filterPriority !== 'all' && d.priority !== filterPriority) return false;
    return true;
  });

  const phaseLabel = (p: string) => p === 'phase1' ? '第一阶段' : p === 'phase2' ? '第二阶段' : '第三阶段';
  const phaseColor = (p: string) => p === 'phase1' ? '#00FF88' : p === 'phase2' ? '#FFB800' : '#7B61FF';
  const priorityColor = (p: string) => p === 'P0' ? '#FF3366' : p === 'P1' ? '#FFB800' : p === 'P2' ? '#00D9FF' : '#5a6a8a';
  const statusColor = (s: string) => {
    if (s === 'in-progress') return '#00D9FF';
    if (s === 'approved') return '#00FF88';
    if (s === 'completed') return '#7B61FF';
    if (s === 'draft') return '#5a6a8a';
    return '#FF3366';
  };
  const autoLabel = (a: string) => a === 'auto' ? '可自动' : a === 'human-machine' ? '人机协作' : '必须人工';
  const autoColor = (a: string) => a === 'auto' ? '#00FF88' : a === 'human-machine' ? '#FFB800' : '#FF3366';
  const flowLabel = (f: string) => f === 'help' ? '使用帮助' : f === 'demand' ? '需求沟通' : f === 'diagnosis' ? '问题排查' : '广告联调';

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Left: Filters */}
      <div className="w-48 border-r border-white/5 p-4 overflow-y-auto shrink-0">
        <div className="text-xs font-medium text-[#8B9DC3] mb-3">业务流</div>
        <div className="space-y-1 mb-4">
          {[['all', '全部'], ['help', '使用帮助'], ['demand', '需求沟通'], ['diagnosis', '问题排查'], ['debugging', '广告联调']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterFlow(v)}
              className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                filterFlow === v ? 'bg-[rgba(0,217,255,0.08)] text-[#00D9FF]' : 'text-[#5a6a8a] hover:text-[#8B9DC3]'
              }`}>
              {l}
            </button>
          ))}
        </div>
        <div className="text-xs font-medium text-[#8B9DC3] mb-3">阶段</div>
        <div className="space-y-1 mb-4">
          {[['all', '全部'], ['phase1', '第一阶段'], ['phase2', '第二阶段'], ['phase3', '第三阶段']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterPhase(v)}
              className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                filterPhase === v ? 'bg-[rgba(0,217,255,0.08)] text-[#00D9FF]' : 'text-[#5a6a8a] hover:text-[#8B9DC3]'
              }`}>
              {l}
            </button>
          ))}
        </div>
        <div className="text-xs font-medium text-[#8B9DC3] mb-3">优先级</div>
        <div className="space-y-1">
          {[['all', '全部'], ['P0', 'P0'], ['P1', 'P1'], ['P2', 'P2'], ['P3', 'P3']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterPriority(v)}
              className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                filterPriority === v ? 'bg-[rgba(0,217,255,0.08)] text-[#00D9FF]' : 'text-[#5a6a8a] hover:text-[#8B9DC3]'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Middle: List */}
      <div className="w-80 border-r border-white/5 overflow-y-auto shrink-0">
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs text-[#8B9DC3]">{filtered.length} 条需求</span>
          <button className="text-xs text-[#00D9FF] hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" />新建需求
          </button>
        </div>
        {filtered.map(d => (
          <div key={d.id}
            onClick={() => setSelectedId(d.id)}
            className={`p-3 border-b border-white/[0.03] cursor-pointer transition-colors ${
              selectedId === d.id ? 'bg-[rgba(0,217,255,0.05)] border-l-2 border-l-[#00D9FF]' : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold" style={{ color: priorityColor(d.priority) }}>{d.priority}</span>
              <span className="text-sm text-white/80 font-medium truncate">{d.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${phaseColor(d.phase)}15`, color: phaseColor(d.phase) }}>
                {phaseLabel(d.phase)}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${statusColor(d.status)}15`, color: statusColor(d.status) }}>
                {d.status === 'in-progress' ? '进行中' : d.status === 'approved' ? '已批准' : d.status === 'draft' ? '草稿' : d.status === 'completed' ? '已完成' : d.status}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${autoColor(d.automation_boundary)}15`, color: autoColor(d.automation_boundary) }}>
                {autoLabel(d.automation_boundary)}
              </span>
            </div>
            <div className="text-[11px] text-[#3a4a6a] mt-1 truncate">{d.problem_statement}</div>
          </div>
        ))}
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-y-auto p-4">
        {selected ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold" style={{ color: priorityColor(selected.priority) }}>{selected.priority}</span>
                  <h3 className="text-base font-semibold text-white/90">{selected.title}</h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${phaseColor(selected.phase)}15`, color: phaseColor(selected.phase) }}>
                    {phaseLabel(selected.phase)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${statusColor(selected.status)}15`, color: statusColor(selected.status) }}>
                    {selected.status === 'in-progress' ? '进行中' : selected.status === 'approved' ? '已批准' : selected.status === 'draft' ? '草稿' : selected.status}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${autoColor(selected.automation_boundary)}15`, color: autoColor(selected.automation_boundary) }}>
                    {autoLabel(selected.automation_boundary)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">
                    {flowLabel(selected.business_flow)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-[#8B9DC3] hover:text-white hover:border-white/20 transition-colors flex items-center gap-1">
                  <Edit3 className="w-3 h-3" />编辑
                </button>
              </div>
            </div>

            {/* Problem Statement */}
            <div className="bg-[#0d1225] rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#FFB800]" />
                <span className="text-sm font-medium text-white/80">问题描述</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{selected.problem_statement}</p>
            </div>

            {/* Target Users & Scenarios */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0d1225] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-sm font-medium text-white/80">目标用户</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selected.target_users.map((u, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">{u}</span>
                  ))}
                </div>
              </div>
              <div className="bg-[#0d1225] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#00FF88]" />
                  <span className="text-sm font-medium text-white/80">核心场景</span>
                </div>
                <div className="space-y-1">
                  {selected.core_scenarios.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <span className="w-1 h-1 rounded-full bg-[#00FF88] shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div className="bg-[#0d1225] rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-4 h-4 text-[#00FF88]" />
                <span className="text-sm font-medium text-white/80">验收标准</span>
              </div>
              <div className="space-y-1.5">
                {selected.acceptance_criteria.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-[#00FF88] shrink-0 mt-0.5">✓</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scope */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0d1225] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#00FF88] text-xs">✓ 做</span>
                  <span className="text-sm font-medium text-white/80">范围内</span>
                </div>
                <div className="space-y-1">
                  {selected.scope_in.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <span className="w-1 h-1 rounded-full bg-[#00FF88] shrink-0" />{s}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#0d1225] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#FF3366] text-xs">✕ 不做</span>
                  <span className="text-sm font-medium text-white/80">范围外</span>
                </div>
                <div className="space-y-1">
                  {selected.scope_out.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="w-1 h-1 rounded-full bg-[#FF3366] shrink-0" />{s}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dependencies */}
            {selected.dependencies.length > 0 && (
              <div className="bg-[#0d1225] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-[#FFB800]" />
                  <span className="text-sm font-medium text-white/80">依赖项</span>
                </div>
                <div className="space-y-2">
                  {selected.dependencies.map((dep, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#080c1a] rounded-lg p-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/80">{dep.dep_system} <span className="text-gray-500">· {dep.dep_role}</span></div>
                        <div className="text-[11px] text-gray-500 truncate">{dep.dep_action}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-gray-500">{dep.owner}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${dep.status === 'ready' ? 'bg-[#00FF88]/10 text-[#00FF88]' : 'bg-[#FFB800]/10 text-[#FFB800]'}`}>
                          {dep.status === 'ready' ? '就绪' : '待确认'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deliverables */}
            <div className="bg-[#0d1225] rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4 text-[#7B61FF]" />
                <span className="text-sm font-medium text-white/80">结果物</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selected.deliverables.map((d, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(123,97,255,0.08)] text-[#7B61FF]">{d}</span>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between text-[11px] text-[#3a4a6a] pt-2 border-t border-white/5">
              <span>提出人: {selected.proposer}</span>
              <span>负责人: {selected.owner}</span>
              <span>创建: {new Date(selected.created_at).toLocaleDateString()}</span>
              <span>更新: {new Date(selected.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <ClipboardList className="w-10 h-10 text-[#2a3654] mx-auto mb-3" />
              <div className="text-sm text-[#5a6a8a]">选择左侧需求查看详情</div>
              <div className="text-[11px] text-[#3a4a6a] mt-1">问题描述 / 验收标准 / 依赖项 / 结果物</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
