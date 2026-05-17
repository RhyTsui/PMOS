'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, Search, Edit3, ToggleLeft, ToggleRight,
  Tag, Clock, FileText, ChevronRight, GitBranch, Link2,
  Settings, RotateCcw, Save, X, Zap, Shield, Cpu, Smartphone,
  Globe, Timer, MessageSquare, AlertTriangle, Play, Pause,
  ClipboardList, Target, Users, CheckSquare,
  Plug, Activity,
  Wifi, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type { DemandPoolItem, McpSkill, McpSkillCategory } from '@/types';
import { xiaoqiaoApi } from '@/lib/api';
import type { McpServerConfig } from '@/types';
import { THINKING_LENGTH_OPTIONS, useChatSettings } from '@/hooks/useChatSettings';
import { CODE_STYLES, type CodeStyle } from '@/components/ui/FancyCodeBlock';

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

function ClientTime({
  value,
  mode = 'datetime',
  empty = '--',
}: {
  value?: number | string | null;
  mode?: 'date' | 'datetime';
  empty?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!value) {
    return <span>{empty}</span>;
  }

  if (!mounted) {
    return <span suppressHydrationWarning>{empty}</span>;
  }

  const date = new Date(value);
  const text = mode === 'date'
    ? date.toLocaleDateString('zh-CN')
    : date.toLocaleString('zh-CN');

  return <span suppressHydrationWarning>{text}</span>;
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
type AdminTab = 'service-config' | 'chat-display' | 'prompts' | 'skills' | 'feature-switches' | 'auto-debug-config' | 'demand-pool' | 'mcp-config';

const ADMIN_TAB_STORAGE_KEY = 'zhitou-admin-active-tab';
const ADMIN_PROMPT_STORAGE_KEY = 'zhitou-admin-selected-prompt';
const ADMIN_DEBUG_CONFIG_STORAGE_KEY = 'zhitou-admin-selected-debug-config';
const ADMIN_DEBUG_CONFIGS_STATE_KEY = 'zhitou-admin-debug-configs-state';
const ADMIN_DEMAND_STORAGE_KEY = 'zhitou-admin-selected-demand';
const ADMIN_SKILL_STORAGE_KEY = 'zhitou-admin-selected-skill';
const ADMIN_MCP_STORAGE_KEY = 'zhitou-admin-selected-mcp';

const ADMIN_TABS: AdminTab[] = [
  'service-config',
  'chat-display',
  'prompts',
  'skills',
  'feature-switches',
  'auto-debug-config',
  'demand-pool',
  'mcp-config',
];

function readClientStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeClientStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // 浏览器隐私模式下 localStorage 可能不可写，忽略即可。
  }
}

function readStoredAdminTab(): AdminTab {
  const stored = readClientStorage(ADMIN_TAB_STORAGE_KEY);
  return ADMIN_TABS.includes(stored as AdminTab) ? stored as AdminTab : 'service-config';
}

function readStoredDebugConfigs(): DebugAutomationConfigItem[] {
  const stored = readClientStorage(ADMIN_DEBUG_CONFIGS_STATE_KEY);
  if (!stored) return MOCK_DEBUG_CONFIGS;
  try {
    const parsed = JSON.parse(stored) as DebugAutomationConfigItem[];
    return Array.isArray(parsed) && parsed.length ? parsed : MOCK_DEBUG_CONFIGS;
  } catch {
    return MOCK_DEBUG_CONFIGS;
  }
}

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
  media_config?: { username: string; password: string; default_account: string; event_asset_url: string; postback_result_view: string; aadvid: string; target_channel: string };
  channel_config?: {
    app_package: string;
    app_activity: string;
    deeplink: string;
    auth_keyword: string;
    feed_keyword: string;
    action_keyword: string;
    max_swipe_count: number;
    keyword_settle_seconds: number;
    install_password: string;
    game_package: string;
  };
  game_config?: { package_name: string; login_type: string; account: string; password: string };
  mobile_env?: { device_id: string };
  instruction_text: string;
  updated_at: string;
  created_by: string;
}

const defaultDebugRuntimeConfig = {
  media_config: { username: '', password: '', default_account: '', event_asset_url: '', postback_result_view: '', aadvid: '', target_channel: '' },
  channel_config: {
    app_package: '',
    app_activity: '',
    deeplink: '',
    auth_keyword: '',
    feed_keyword: '',
    action_keyword: '',
    max_swipe_count: 12,
    keyword_settle_seconds: 1,
    install_password: '',
    game_package: '',
  },
  game_config: { package_name: '', login_type: 'account', account: '', password: '' },
  mobile_env: { device_id: '' },
};

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
    media_config: {
      username: '',
      password: '',
      default_account: 'wuyanlan@dobest.com',
      event_asset_url: '',
      postback_result_view: '巨量事件管理器 > 联调工具 > 回传结果',
      aadvid: '1812330415881259',
      target_channel: '311348_20251020',
    },
    channel_config: {
      app_package: 'com.ss.android.ugc.aweme',
      app_activity: '.splash.SplashActivity',
      deeplink: 'snssdk1128://scan',
      auth_keyword: '授权测试',
      feed_keyword: '转化联调广告',
      action_keyword: '打开',
      max_swipe_count: 12,
      keyword_settle_seconds: 1,
      install_password: 'wyl@1002',
      game_package: 'com.yoka.sgs.x',
    },
    game_config: {
      package_name: 'com.yoka.sgs.x',
      login_type: 'account',
      account: '15921311749',
      password: '1qaz@WSX',
    },
    mobile_env: {
      device_id: '5EF0218918001054',
    },
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
const MOCK_SWITCHES: AdminSwitchItem[] = [
  { key: 'auto_debug_full', name: '全自动联调开关', type: 'boolean', enabled: true, config: {}, description: '开启后联调任务自动执行，无需人工确认' },
  { key: 'auto_debug_takeover', name: '人工接管开关', type: 'boolean', enabled: true, config: {}, description: '允许在联调失败时由人工接管' },
  { key: 'evidence_auto_collect', name: '证据自动采集', type: 'boolean', enabled: true, config: {}, description: '自动采集排查所需日志和数据' },
  { key: 'demand_form_auto_fill', name: '需求单自动填充', type: 'boolean', enabled: false, config: {}, description: '从历史记录自动填充需求单字段' },
  { key: 'clarification_max_rounds', name: '追问轮数上限', type: 'number', enabled: true, config: { value: 3 }, description: '单次任务最多追问轮数' },
  { key: 'risk_alert_threshold', name: '风险告警阈值', type: 'number', enabled: true, config: { value: 0.7 }, description: '置信度低于此值时触发告警' },
];
interface AdminSwitchItem {
  key: string;
  name: string;
  type: 'boolean' | 'number';
  enabled: boolean;
  config: Record<string, unknown>;
  description: string;
}

// ---- Component ----
export default function AdminPage() {
  useEffect(() => {
    document.title = '智投chat-配置管理';
  }, []);

  const [adminTab, setAdminTabRaw] = useState<AdminTab>(() => readStoredAdminTab());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<string>('all');
  const [selectedPromptId, setSelectedPromptIdRaw] = useState<string | null>(() => readClientStorage(ADMIN_PROMPT_STORAGE_KEY));
  const [detailTab, setDetailTab] = useState<DetailTab>('content');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Auto-debug config state
  const [dbgSearchTerm, setDbgSearchTerm] = useState('');
  const [dbgFilterMedia, setDbgFilterMedia] = useState<string>('all');
  const [dbgFilterPlatform, setDbgFilterPlatform] = useState<string>('all');
  const [dbgFilterEnv, setDbgFilterEnv] = useState<string>('all');
  const [dbgFilterStatus, setDbgFilterStatus] = useState<string>('all');
  const [debugConfigs, setDebugConfigs] = useState<DebugAutomationConfigItem[]>(() => readStoredDebugConfigs());
  const [selectedDbgConfigId, setSelectedDbgConfigIdRaw] = useState<string | null>(() => readClientStorage(ADMIN_DEBUG_CONFIG_STORAGE_KEY));
  const [dbgDetailTab, setDbgDetailTab] = useState<'runtime' | 'keywords' | 'timeout' | 'instruction'>('runtime');

  // Feature switch state
  const [featureSwitches, setFeatureSwitches] = useState<AdminSwitchItem[]>([]);
  const [switchStates, setSwitchStates] = useState<Record<string, boolean>>({});
  const [selectedSwitchKey, setSelectedSwitchKey] = useState<string | null>(null);

  const filtered = MOCK_PROMPTS.filter((p) => {
    const matchSearch = p.name.includes(searchTerm) || p.description.includes(searchTerm);
    const matchScope = filterScope === 'all' || p.scope === filterScope;
    return matchSearch && matchScope;
  });

  const selectedPrompt = MOCK_PROMPTS.find(p => p.id === selectedPromptId) || null;

  const setAdminTab = (tab: AdminTab) => {
    setAdminTabRaw(tab);
    writeClientStorage(ADMIN_TAB_STORAGE_KEY, tab);
  };

  const setSelectedPromptId = (id: string | null) => {
    setSelectedPromptIdRaw(id);
    writeClientStorage(ADMIN_PROMPT_STORAGE_KEY, id);
  };

  const setSelectedDbgConfigId = (id: string | null) => {
    setSelectedDbgConfigIdRaw(id);
    writeClientStorage(ADMIN_DEBUG_CONFIG_STORAGE_KEY, id);
  };

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
  const filteredDbgConfigs = debugConfigs.filter((c) => {
    const matchSearch = c.name.includes(dbgSearchTerm) || c.media.includes(dbgSearchTerm);
    const matchMedia = dbgFilterMedia === 'all' || c.media === dbgFilterMedia;
    const matchPlatform = dbgFilterPlatform === 'all' || c.platform === dbgFilterPlatform || (dbgFilterPlatform === 'both' && c.platform === 'both');
    const matchEnv = dbgFilterEnv === 'all' || c.environment === dbgFilterEnv;
    const matchStatus = dbgFilterStatus === 'all' || c.status === dbgFilterStatus;
    return matchSearch && matchMedia && matchPlatform && matchEnv && matchStatus;
  });

  const selectedDbgConfig = debugConfigs.find(c => c.id === selectedDbgConfigId) || null;

  const uniqueMedias = [...new Set(debugConfigs.map(c => c.media))];

  const handleUpdateDebugConfig = (id: string, patch: Partial<DebugAutomationConfigItem>) => {
    setDebugConfigs(prev => {
      const next = prev.map(item => item.id === id ? {
        ...item,
        ...patch,
        updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      } : item);
      writeClientStorage(ADMIN_DEBUG_CONFIGS_STATE_KEY, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/xiaoqiao/admin/feature-switches');
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json() as AdminSwitchItem[];
        setFeatureSwitches(data);
        setSwitchStates(Object.fromEntries(data.map(item => [item.key, item.enabled])));
        setSelectedSwitchKey(current => current && data.some(item => item.key === current) ? current : data[0]?.key || null);
      } catch {
        setFeatureSwitches(MOCK_SWITCHES);
        setSwitchStates(Object.fromEntries(MOCK_SWITCHES.map(item => [item.key, item.enabled])));
        setSelectedSwitchKey(current => current || MOCK_SWITCHES[0]?.key || null);
      }
    })();
  }, []);

  const toggleSwitch = async (key: string) => {
    const current = switchStates[key] ?? false;
    const nextEnabled = !current;
    setSwitchStates(prev => ({ ...prev, [key]: nextEnabled }));
    setFeatureSwitches(prev => prev.map(item => item.key === key ? { ...item, enabled: nextEnabled } : item));
    try {
      const response = await fetch(`/api/xiaoqiao/admin/feature-switches/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      if (!response.ok) throw new Error(await response.text());
      const saved = await response.json() as AdminSwitchItem;
      setFeatureSwitches(prev => prev.map(item => item.key === key ? saved : item));
      setSwitchStates(prev => ({ ...prev, [key]: saved.enabled }));
    } catch {
      setSwitchStates(prev => ({ ...prev, [key]: current }));
      setFeatureSwitches(prev => prev.map(item => item.key === key ? { ...item, enabled: current } : item));
    }
  };

  return (
    <div className="admin-page min-h-screen flex flex-col bg-white text-[#1f2937]">
      {/* Header with Tabs */}
      <header className="sticky top-0 z-20 border-b border-[#dbe4f0] bg-[rgba(243,246,251,0.95)] backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-[#e8eef7] text-[#5b6b82] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-[#10233f]">配置管理服务</h1>
              <p className="text-[11px] text-[#6b7c93]">问答服务 &middot; MCP服务 &middot; 观测配置</p>
            </div>
          </div>
          <div className="hidden md:block" />
        </div>
        {/* Tab Navigation */}
        <div className="flex overflow-x-auto px-3 md:px-6 gap-1 scrollbar-hide">
          {([
            { key: 'service-config' as AdminTab, label: '配置服务', icon: Cpu },
            { key: 'chat-display' as AdminTab, label: '会话展示', icon: MessageSquare },
            { key: 'prompts' as AdminTab, label: '提示词管理', icon: FileText },
            { key: 'skills' as AdminTab, label: 'Skill管理', icon: GitBranch },
            { key: 'feature-switches' as AdminTab, label: '功能开关', icon: ToggleRight },
            { key: 'auto-debug-config' as AdminTab, label: '自动联调配置', icon: Zap },
            { key: 'demand-pool' as AdminTab, label: '需求池', icon: ClipboardList },
            { key: 'mcp-config' as AdminTab, label: 'MCP配置', icon: Plug },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAdminTab(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs border-b-2 transition-colors ${
                adminTab === tab.key
                  ? 'text-[#0f6fff] border-[#0f6fff]'
                  : 'text-[#6b7c93] border-transparent hover:text-[#1d4f91]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tab Content */}
      {adminTab === 'service-config' && <TraceConfigTab />}
      {adminTab === 'chat-display' && <ChatDisplaySettingsTab />}

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

      {adminTab === 'skills' && <SkillManagementTab />}

      {adminTab === 'feature-switches' && (
        <FeatureSwitchesTab
          switches={featureSwitches.length ? featureSwitches : MOCK_SWITCHES}
          switchStates={switchStates}
          onToggle={toggleSwitch}
          selectedSwitchKey={selectedSwitchKey}
          onSelectSwitch={setSelectedSwitchKey}
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
          setSelectedConfigId={(id) => { setSelectedDbgConfigId(id); setDbgDetailTab('runtime'); }}
          detailTab={dbgDetailTab}
          setDetailTab={setDbgDetailTab}
          filteredConfigs={filteredDbgConfigs}
          selectedConfig={selectedDbgConfig}
          uniqueMedias={uniqueMedias}
          onUpdateConfig={handleUpdateDebugConfig}
        />
      )}

      {adminTab === 'demand-pool' && <DemandPoolTab />}
      {adminTab === 'mcp-config' && <McpConfigTab />}
    </div>
  );
}

// ---- Chat Display Settings Tab ----
function ChatDisplaySettingsTab() {
  const { settings, updateSetting, loaded } = useChatSettings();
  const toggleItems = [
    {
      key: 'autoCollapseThinking' as const,
      title: '思维链默认收起',
      desc: '会话中保留思维链入口，默认折叠，用户需要时再展开查看。',
      value: settings.autoCollapseThinking,
    },
    {
      key: 'showSystemPrompt' as const,
      title: '展示系统提示',
      desc: '仅用于内部排查，默认不在普通会话中展示系统提示内容。',
      value: settings.showSystemPrompt,
    },
    {
      key: 'codeLineNumbers' as const,
      title: '代码行号',
      desc: '回答中出现代码块时展示行号，方便定位和复核。',
      value: settings.codeLineNumbers,
    },
  ];

  if (!loaded) {
    return (
      <main className="flex-1 p-4 md:p-6">
        <div className="rounded-2xl border border-[#dbe4f0] bg-white p-6 text-sm text-[#6b7c93]">
          正在读取会话展示设置...
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-[#dbe4f0] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="border-b border-[#e6edf6] p-5">
            <h2 className="text-lg font-semibold text-[#10233f]">会话展示设置</h2>
            <p className="mt-1 text-sm text-[#6b7c93]">
              这些设置会影响工作台里的思维链、系统提示和代码块展示方式。
            </p>
          </div>

          <div className="grid gap-3 p-5">
            {toggleItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => updateSetting(item.key, !item.value)}
                className="grid gap-3 border-b border-[#edf2f8] p-4 text-left transition-colors hover:bg-[#fafcff] md:grid-cols-[minmax(0,1fr)_96px]"
              >
                <span>
                  <span className="block text-sm font-semibold text-[#10233f]">{item.title}</span>
                  <span className="mt-1 block text-xs leading-6 text-[#6b7c93]">{item.desc}</span>
                </span>
                <span className={`inline-flex h-8 items-center justify-center gap-1.5 text-xs font-semibold ${item.value ? 'text-[#0f6fff]' : 'text-[#6b7c93]'}`}>
                  {item.value ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {item.value ? '已开启' : '已关闭'}
                </span>
              </button>
            ))}

            <div className="border-b border-[#edf2f8] p-4">
              <div className="text-sm font-semibold text-[#10233f]">思维链展示长度</div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {(Object.entries(THINKING_LENGTH_OPTIONS) as Array<[keyof typeof THINKING_LENGTH_OPTIONS, { label: string; desc: string }]>).map(([key, option]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateSetting('thinkingLength', key)}
                    className={`border-b p-3 text-left transition-colors ${
                      settings.thinkingLength === key
                        ? 'border-[#8ec5ff] text-[#0f6fff]'
                        : 'border-[#e2eaf5] text-[#355070] hover:bg-[#fafcff]'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{option.label}</span>
                    <span className="mt-1 block text-[11px] leading-5 text-[#6b7c93]">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2 border-b border-[#edf2f8] p-4">
              <span className="text-sm font-semibold text-[#10233f]">长文本转文件阈值</span>
              <span className="text-xs leading-6 text-[#6b7c93]">输入内容超过该长度时，优先按资料处理，减少对话区被长文本占满。</span>
              <input
                type="number"
                min={500}
                step={100}
                value={settings.longTextThreshold}
                onChange={(event) => updateSetting('longTextThreshold', Number(event.target.value) || 2000)}
                className="h-10 rounded-lg border border-[#dbe4f0] bg-white px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]"
              />
            </label>

            <label className="grid gap-2 border-b border-[#edf2f8] p-4">
              <span className="text-sm font-semibold text-[#10233f]">代码块样式</span>
              <span className="text-xs leading-6 text-[#6b7c93]">影响回答中代码、配置片段和排查脚本的展示样式。</span>
              <select
                value={settings.codeStyle}
                onChange={(event) => updateSetting('codeStyle', event.target.value as CodeStyle)}
                className="h-10 rounded-lg border border-[#dbe4f0] bg-white px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]"
              >
                {(Object.keys(CODE_STYLES) as CodeStyle[]).map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <aside className="rounded-2xl border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef7ff] text-[#0f6fff]">
            <MessageSquare className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-[#10233f]">当前生效范围</h3>
          <p className="mt-2 text-xs leading-6 text-[#6b7c93]">
            设置保存在当前浏览器，立即影响工作台消息展示。后台服务配置仍在“配置服务”中管理。
          </p>
        </aside>
      </div>
    </main>
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
    <div className="flex-1 flex overflow-hidden bg-[#f3f6fb]">
      {/* Left Column - Filters */}
      <div className="w-56 border-r border-[#dbe4f0] flex flex-col bg-white">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-[#f8fbff] border border-[#dbe4f0]">
            <Search className="w-3.5 h-3.5 text-[#6b7c93]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索提示词..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-[#10233f] placeholder:text-[#93a1b2]"
            />
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-[#6b7c93] uppercase tracking-wider mb-2 px-2">分类筛选</div>
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
                    ? 'bg-[#eaf3ff] text-[#0f6fff]'
                    : 'text-[#5f6f86] hover:bg-[#f5f8fc]'
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 mt-6">
            <div className="text-[10px] text-[#6b7c93] uppercase tracking-wider mb-2 px-2">状态筛选</div>
            {[
              { key: 'active', label: '已上线', color: '#00FF88' },
              { key: 'draft', label: '草稿', color: '#FFB800' },
              { key: 'archived', label: '已归档', color: '#64748B' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#5f6f86] hover:bg-[#f5f8fc] transition-colors"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Column - List */}
      <div className="w-80 border-r border-[#dbe4f0] flex flex-col bg-[#f9fbfe]">
        <div className="px-4 py-3 border-b border-[#e5edf7]">
          <div className="text-xs text-[#6b7c93]">共 {filtered.length} 个提示词</div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => setSelectedPromptId(prompt.id)}
              className={`w-full text-left p-4 border-b border-[rgba(255,255,255,0.04)] transition-colors ${
                selectedPromptId === prompt.id
                  ? 'bg-[#edf5ff] border-l-2 border-l-[#0f6fff]'
                  : 'hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className={`text-sm font-medium ${selectedPromptId === prompt.id ? 'text-[#0f6fff]' : 'text-[#10233f]'}`}>
                  {prompt.name}
                </h3>
                <ChevronRight className="w-3.5 h-3.5 text-[#93a1b2] mt-0.5" />
              </div>
              <p className="text-[11px] text-[#6b7c93] mb-2 line-clamp-2">{prompt.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[prompt.status]}`}>
                  {statusLabels[prompt.status]}
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#eaf3ff] text-[#0f6fff]">
                  {scopeLabels[prompt.scope]}
                </span>
                <span className="text-[10px] text-[#93a1b2]">{prompt.version}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#6b7c93] text-sm">没有匹配的提示词</div>
          )}
        </div>
      </div>

      {/* Right Column - Detail / Edit */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f3f6fb]">
        {selectedPrompt ? (
          <>
            <div className="px-6 py-4 border-b border-[#dbe4f0] bg-white">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-[#10233f]">{selectedPrompt.name}</h2>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      <button onClick={onStartEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#5f6f86] hover:bg-[#f5f8fc] transition-colors">
                        <Edit3 className="w-3.5 h-3.5" /> 编辑
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#5f6f86] hover:bg-[#f5f8fc] transition-colors">
                        {selectedPrompt.status === 'active' ? <ToggleRight className="w-3.5 h-3.5 text-[#00FF88]" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {selectedPrompt.status === 'active' ? '停用' : '启用'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={onSaveEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#0f6fff] text-white hover:bg-[#0b5ad1] transition-colors">
                        <Save className="w-3.5 h-3.5" /> 保存
                      </button>
                      <button onClick={onCancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#5f6f86] hover:bg-[#f5f8fc] transition-colors">
                        <X className="w-3.5 h-3.5" /> 取消
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#6b7c93]">
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {selectedPrompt.intent_type}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {selectedPrompt.updated_at}</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {selectedPrompt.version}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusStyles[selectedPrompt.status]}`}>
                  {statusLabels[selectedPrompt.status]}
                </span>
              </div>
            </div>

            <div className="px-6 border-b border-[#dbe4f0] bg-white">
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
                      detailTab === key ? 'text-[#0f6fff] border-[#0f6fff]' : 'text-[#6b7c93] border-transparent hover:text-[#355070]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#f3f6fb]">
              {detailTab === 'content' && (
                <div className="space-y-6">
                  <div>
                    <div className="text-xs text-[#6b7c93] mb-2">提示词正文</div>
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-80 p-4 rounded-2xl bg-white border border-[#dbe4f0] text-sm text-[#10233f] font-mono resize-none focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      />
                    ) : (
                      <div className="p-4 rounded-2xl bg-white border border-[#dbe4f0] shadow-[0_10px_30px_rgba(15,35,63,0.05)]">
                        <pre className="text-sm text-[#10233f] font-mono whitespace-pre-wrap leading-relaxed">{selectedPrompt.content}</pre>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-[#6b7c93] mb-2">变量说明</div>
                    <div className="space-y-2">
                      {selectedPrompt.variables.map((v, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-[#dbe4f0]">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs text-[#0f6fff] font-mono">{`{{${v.name}}}`}</code>
                          </div>
                          <div className="text-[11px] text-[#355070]">{v.description}</div>
                          <div className="text-[11px] text-[#6b7c93] mt-1">示例: {v.example}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6b7c93] mb-2">适用范围</div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] bg-[#eaf3ff] text-[#0f6fff]">{scopeLabels[selectedPrompt.scope]}</span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#dbe4f0] text-[#355070]">{selectedPrompt.intent_type}</span>
                    </div>
                  </div>
                </div>
              )}
              {detailTab === 'versions' && (
                <div className="space-y-3">
                  {selectedPrompt.versions.map((v, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white border border-[#dbe4f0]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-3.5 h-3.5 text-[#355070]" />
                          <span className="text-sm font-medium text-[#10233f]">{v.version}</span>
                          {v.status === 'active' && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[rgba(0,255,136,0.1)] text-[#00FF88]">当前生效</span>}
                        </div>
                        {v.status !== 'active' && (
                          <button className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#5f6f86] hover:bg-[#f5f8fc] transition-colors">
                            <RotateCcw className="w-3 h-3" /> 回滚到此版本
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-[#6b7c93] mb-1">{v.created_at}</div>
                      <div className="text-xs text-[#355070]">{v.summary}</div>
                    </div>
                  ))}
                </div>
              )}
              {detailTab === 'bindings' && (
                <div className="space-y-3">
                  {selectedPrompt.bindings.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#dbe4f0]">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${b.enabled ? 'bg-[#00FF88]' : 'bg-[#5a6a8a]'}`} />
                        <div>
                          <div className="text-sm text-[#10233f]">{b.target_name}</div>
                          <div className="text-[11px] text-[#6b7c93]">
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
              <Settings className="w-10 h-10 text-[#9aa9bc] mx-auto mb-3" />
              <div className="text-sm text-[#6b7c93]">选择左侧提示词查看详情</div>
              <div className="text-[11px] text-[#93a1b2] mt-1">支持编辑、版本管理与绑定配置</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Feature Switches Tab Component ----
function FeatureSwitchesTab({
  switches, switchStates, onToggle, selectedSwitchKey, onSelectSwitch,
}: {
  switches: AdminSwitchItem[];
  switchStates: Record<string, boolean>;
  onToggle: (key: string) => void;
  selectedSwitchKey: string | null;
  onSelectSwitch: (key: string) => void;
}) {
  const selectedSwitch = switches.find(item => item.key === selectedSwitchKey) || switches[0] || null;
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      <div className="w-[420px] border-r border-[#dbe4f0] bg-white">
        <div className="border-b border-[#e5edf7] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#10233f]">功能开关</h2>
            <p className="text-[11px] text-[#6b7c93] mt-1">列表查看，点击后在右侧查看详情</p>
          </div>
        </div>
        <div className="custom-scrollbar h-full overflow-y-auto">
          {switches.map((sw) => (
            <div
              role="button"
              tabIndex={0}
              key={sw.key}
              onClick={() => onSelectSwitch(sw.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectSwitch(sw.key);
              }}
              className={`w-full border-b border-[#edf2f8] px-5 py-4 text-left transition-colors ${
                selectedSwitch?.key === sw.key ? 'border-l-2 border-l-[#0f6fff] bg-[#f7fbff]' : 'hover:bg-[#fafcff]'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-3">
                    <span className="text-sm font-medium text-[#10233f]">{sw.name}</span>
                    <span className="text-[10px] text-[#8ea0b8]">{sw.type === 'boolean' ? '布尔' : '数值'}</span>
                  </div>
                  <div className="text-[11px] text-[#6b7c93]">{sw.description}</div>
                </div>
                <button onClick={(event) => { event.stopPropagation(); onToggle(sw.key); }} className="flex items-center">
                  {switchStates[sw.key] ? (
                    <ToggleRight className="h-7 w-7 text-[#0f9f6e]" />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-[#8ea0b8]" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="flex-1 overflow-y-auto bg-white px-6 py-5">
        {selectedSwitch ? (
          <div className="max-w-3xl">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#edf2f8] pb-4">
              <div>
                <h3 className="text-base font-semibold text-[#10233f]">{selectedSwitch.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6b7c93]">{selectedSwitch.description}</p>
              </div>
              <button onClick={() => onToggle(selectedSwitch.key)} className="flex items-center gap-2 text-sm text-[#355070]">
                {switchStates[selectedSwitch.key] ? <ToggleRight className="h-8 w-8 text-[#0f9f6e]" /> : <ToggleLeft className="h-8 w-8 text-[#8ea0b8]" />}
                {switchStates[selectedSwitch.key] ? '已开启' : '已关闭'}
              </button>
            </div>
            <div className="grid gap-4 text-sm text-[#355070]">
              <div className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-[#edf2f8] py-3">
                <span className="text-[#8ea0b8]">开关标识</span>
                <code>{selectedSwitch.key}</code>
              </div>
              <div className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-[#edf2f8] py-3">
                <span className="text-[#8ea0b8]">类型</span>
                <span>{selectedSwitch.type === 'boolean' ? '开关型' : '数值型'}</span>
              </div>
              <div className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-[#edf2f8] py-3">
                <span className="text-[#8ea0b8]">当前状态</span>
                <span>{switchStates[selectedSwitch.key] ? '开启' : '关闭'}</span>
              </div>
              {selectedSwitch.type === 'number' && selectedSwitch.config.value !== undefined && (
                <div className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-[#edf2f8] py-3">
                  <span className="text-[#8ea0b8]">当前值</span>
                  <span>{String(selectedSwitch.config.value)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-[#8ea0b8]">选择一个开关查看详情。</div>
        )}
      </aside>
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
  onUpdateConfig,
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
  detailTab: 'runtime' | 'keywords' | 'timeout' | 'instruction';
  setDetailTab: (v: 'runtime' | 'keywords' | 'timeout' | 'instruction') => void;
  filteredConfigs: DebugAutomationConfigItem[];
  selectedConfig: DebugAutomationConfigItem | null;
  uniqueMedias: string[];
  onUpdateConfig: (id: string, patch: Partial<DebugAutomationConfigItem>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DebugAutomationConfigItem | null>(null);

  useEffect(() => {
    setEditing(false);
    setDraft(selectedConfig ? {
      ...selectedConfig,
      media_config: { ...defaultDebugRuntimeConfig.media_config, ...(selectedConfig.media_config || {}) },
      channel_config: { ...defaultDebugRuntimeConfig.channel_config, ...(selectedConfig.channel_config || {}) },
      game_config: { ...defaultDebugRuntimeConfig.game_config, ...(selectedConfig.game_config || {}) },
      mobile_env: { ...defaultDebugRuntimeConfig.mobile_env, ...(selectedConfig.mobile_env || {}) },
    } : null);
  }, [selectedConfig?.id]);

  const activeConfig = draft || selectedConfig;
  const updateDraftGroup = <K extends 'media_config' | 'channel_config' | 'game_config' | 'mobile_env'>(
    group: K,
    key: keyof NonNullable<DebugAutomationConfigItem[K]>,
    value: string | number,
  ) => {
    setDraft(prev => prev ? ({
      ...prev,
      [group]: {
        ...defaultDebugRuntimeConfig[group],
        ...(prev[group] || {}),
        [key]: value,
      },
    }) : prev);
  };

  const saveDraft = () => {
    if (!draft) return;
    onUpdateConfig(draft.id, draft);
    setEditing(false);
  };
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
      <div className="flex w-56 flex-col border-r border-[#e8eef7] bg-[#fbfdff]">
        <div className="p-4">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2">
            <Search className="w-3.5 h-3.5 text-[#5a6a8a]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索配置..."
              className="flex-1 border-none bg-transparent text-xs text-[#355070] outline-none placeholder:text-[#9aa8bb]"
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
      <div className="flex w-80 flex-col border-r border-[#e8eef7] bg-white">
        <div className="border-b border-[#edf3fb] px-4 py-3">
          <div className="text-xs text-[#5a6a8a]">共 {filteredConfigs.length} 个配置模板</div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConfigs.map((cfg) => (
            <button
              key={cfg.id}
              onClick={() => setSelectedConfigId(cfg.id)}
              className={`w-full text-left p-4 border-b border-[rgba(255,255,255,0.04)] transition-colors ${
                selectedConfigId === cfg.id
                  ? 'bg-[#f5f9ff] border-l-2 border-l-[#0f6fff]'
                  : 'hover:bg-[#fafcff]'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className={`text-sm font-medium ${selectedConfigId === cfg.id ? 'text-[#0f6fff]' : 'text-[#10233f]'}`}>
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
            <div className="border-b border-[#edf3fb] bg-white px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-[#10233f]">{selectedConfig.name}</h2>
                <div className="flex items-center gap-2">
                  {editing ? (
                    <>
                      <button
                        onClick={saveDraft}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#0f6fff] transition-colors hover:bg-[#f3f8ff]"
                      >
                        <Save className="w-3.5 h-3.5" /> 保存
                      </button>
                      <button
                        onClick={() => { setEditing(false); setDraft(selectedConfig); }}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#5f6f86] transition-colors hover:bg-[#f3f8ff]"
                      >
                        <X className="w-3.5 h-3.5" /> 取消
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setDraft(selectedConfig); setEditing(true); }}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#5f6f86] transition-colors hover:bg-[#f3f8ff] hover:text-[#0f6fff]"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> 编辑
                    </button>
                  )}
                    <button
                      onClick={() => onUpdateConfig(selectedConfig.id, { status: selectedConfig.status === 'active' ? 'inactive' : 'active' })}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#5f6f86] transition-colors hover:bg-[#f3f8ff] hover:text-[#0f6fff]"
                    >
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
            <div className="border-b border-[#edf3fb] bg-white px-6">
              <div className="flex gap-1">
                {[
                  { key: 'runtime' as const, label: '联调参数', icon: Settings },
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
              {detailTab === 'runtime' && activeConfig && (
                <div className="space-y-6">
                  {([
                    {
                      key: 'media_config' as const,
                      title: '媒体账号与事件资产',
                      fields: [
                        ['username', '账号'],
                        ['password', '密码'],
                        ['default_account', '默认账户'],
                        ['event_asset_url', '事件资产地址'],
                        ['postback_result_view', '回传查看位置'],
                        ['aadvid', '广告主ID'],
                        ['target_channel', '目标渠道包'],
                      ],
                    },
                    {
                      key: 'channel_config' as const,
                      title: '渠道端执行参数',
                      fields: [
                        ['app_package', '媒体应用包名'],
                        ['app_activity', '启动Activity'],
                        ['deeplink', '扫码DeepLink'],
                        ['auth_keyword', '授权关键词'],
                        ['feed_keyword', '广告关键词'],
                        ['action_keyword', '动作关键词'],
                        ['max_swipe_count', '最大滑动次数'],
                        ['keyword_settle_seconds', '关键词停留秒数'],
                        ['install_password', '安装密码'],
                        ['game_package', '游戏包名'],
                      ],
                    },
                    {
                      key: 'game_config' as const,
                      title: '游戏登录参数',
                      fields: [
                        ['package_name', '游戏包名'],
                        ['login_type', '登录方式'],
                        ['account', '测试账号'],
                        ['password', '测试密码'],
                      ],
                    },
                    {
                      key: 'mobile_env' as const,
                      title: '移动设备环境',
                      fields: [
                        ['device_id', '设备ID'],
                      ],
                    },
                  ]).map((group) => {
                    const values = {
                      ...defaultDebugRuntimeConfig[group.key],
                      ...(activeConfig[group.key] || {}),
                    } as Record<string, string | number>;
                    return (
                      <section key={group.key} className="space-y-3">
                        <div>
                          <div className="text-sm font-semibold text-[#10233f]">{group.title}</div>
                          <div className="mt-1 text-xs text-[#6b7c93]">由后台维护，用户发起联调时只选择项目、媒体、应用包和联调目标。</div>
                        </div>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                          {group.fields.map(([field, label]) => (
                            <label key={`${group.key}-${field}`} className="flex flex-col gap-1.5">
                              <span className="text-[11px] text-[#6b7c93]">{label}</span>
                              {editing ? (
                                <input
                                  type={String(field).includes('password') ? 'password' : 'text'}
                                  value={String(values[field] ?? '')}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    const nextValue = ['max_swipe_count', 'keyword_settle_seconds'].includes(String(field)) ? Number(raw || 0) : raw;
                                    updateDraftGroup(group.key, field as never, nextValue);
                                  }}
                                  className="h-9 rounded-xl border border-[#dbe4f0] bg-white px-3 text-xs text-[#10233f] outline-none focus:border-[#0f6fff]"
                                />
                              ) : (
                                <div className="min-h-9 rounded-xl px-3 py-2 text-xs text-[#10233f]">
                                  {String(field).includes('password') && values[field] ? '••••••••' : String(values[field] || '未配置')}
                                </div>
                              )}
                            </label>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              {detailTab === 'keywords' && (
                <div className="space-y-4">
                  <div className="text-xs text-[#5a6a8a] mb-2">触发关键词规则</div>
                  {selectedConfig.keywords.map((kw, idx) => (
                    <div key={idx} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          kw.match_type === 'exact' ? 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]'
                            : kw.match_type === 'contains' ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]'
                              : 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]'
                        }`}>
                          {kw.match_type === 'exact' ? '精确匹配' : kw.match_type === 'contains' ? '包含匹配' : '正则匹配'}
                        </span>
                      </div>
                      <code className="mb-2 block text-sm font-mono text-[#10233f]">{kw.pattern}</code>
                      <div className="text-[11px] text-[#5a6a8a]">{kw.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === 'timeout' && (
                <div className="space-y-4">
                  <div className="text-xs text-[#5a6a8a] mb-2">阶段超时与重试配置</div>
                  {selectedConfig.timeout_config.map((tc, idx) => (
                    <div key={idx} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${idx < 3 ? 'bg-[#00D9FF]' : 'bg-[#FFB800]'}`} />
                          <span className="text-sm font-medium text-[#10233f]">
                            {stageLabels[tc.stage] || tc.stage}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-[#5a6a8a] mb-1">超时时间</div>
                          <div className="flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5 text-[#00D9FF]" />
                            <span className="text-sm text-[#10233f]">{tc.timeout_seconds}s</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#5a6a8a] mb-1">重试次数</div>
                          <div className="flex items-center gap-2">
                            <RotateCcw className="w-3.5 h-3.5 text-[#FFB800]" />
                            <span className="text-sm text-[#10233f]">{tc.retry_count} 次</span>
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
                  <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#355070]">{selectedConfig.instruction_text}</pre>
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
  const [selectedIdRaw, setSelectedIdRaw] = useState<string | null>(() => readClientStorage(ADMIN_DEMAND_STORAGE_KEY));
  const [filterFlow, setFilterFlow] = useState<string>('all');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [pool, setPool] = useState<DemandPoolItem[]>([]);

  useEffect(() => {
    xiaoqiaoApi.getDemandPool().then(setPool).catch(() => undefined);
  }, []);

  const setSelectedId = (id: string | null) => {
    setSelectedIdRaw(id);
    writeClientStorage(ADMIN_DEMAND_STORAGE_KEY, id);
  };

  const selectedId = selectedIdRaw && pool.some(d => d.id === selectedIdRaw) ? selectedIdRaw : null;
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
    if (s === 'in-progress') return '#0f6fff';
    if (s === 'approved') return '#1a9b68';
    if (s === 'completed') return '#7c3aed';
    if (s === 'draft') return '#64748b';
    return '#ef4444';
  };
  const autoLabel = (a: string) => a === 'auto' ? '可自动' : a === 'human-machine' ? '人机协作' : '必须人工';
  const autoColor = (a: string) => a === 'auto' ? '#00FF88' : a === 'human-machine' ? '#FFB800' : '#FF3366';
  const flowLabel = (f: string) => f === 'help' ? '使用帮助' : f === 'demand' ? '需求沟通' : f === 'diagnosis' ? '问题排查' : '广告联调';

  return (
    <div className="admin-demand-pool flex flex-1 overflow-hidden bg-white" style={{ height: 'calc(100vh - 104px)' }}>
      <div className="w-56 shrink-0 overflow-y-auto border-r border-[#e8eef7] bg-white p-4">
        <div className="mb-3 text-xs font-medium text-[#5f6f86]">业务流</div>
        <div className="mb-5 space-y-1">
          {[['all', '全部'], ['help', '使用帮助'], ['demand', '需求沟通'], ['diagnosis', '问题排查'], ['debugging', '广告联调']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterFlow(v)}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                filterFlow === v ? 'bg-[#eef5ff] text-[#0f6fff]' : 'text-[#5f6f86] hover:bg-[#f3f8ff] hover:text-[#355070]'
              }`}>
              {l}
            </button>
          ))}
        </div>
        <div className="mb-3 text-xs font-medium text-[#5f6f86]">阶段</div>
        <div className="mb-5 space-y-1">
          {[['all', '全部'], ['phase1', '第一阶段'], ['phase2', '第二阶段'], ['phase3', '第三阶段']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterPhase(v)}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                filterPhase === v ? 'bg-[#eef5ff] text-[#0f6fff]' : 'text-[#5f6f86] hover:bg-[#f3f8ff] hover:text-[#355070]'
              }`}>
              {l}
            </button>
          ))}
        </div>
        <div className="mb-3 text-xs font-medium text-[#5f6f86]">优先级</div>
        <div className="space-y-1">
          {[['all', '全部'], ['P0', 'P0'], ['P1', 'P1'], ['P2', 'P2'], ['P3', 'P3']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterPriority(v)}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                filterPriority === v ? 'bg-[#eef5ff] text-[#0f6fff]' : 'text-[#5f6f86] hover:bg-[#f3f8ff] hover:text-[#355070]'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="w-80 shrink-0 overflow-y-auto border-r border-[#e8eef7] bg-white">
        <div className="flex items-center justify-between border-b border-[#edf3fb] px-4 py-4">
          <div>
            <div className="text-sm font-semibold text-[#10233f]">需求池列表</div>
            <span className="mt-0.5 block text-[11px] text-[#6b7c93]">{filtered.length} 条需求</span>
          </div>
          <button className="flex items-center gap-1 text-xs text-[#0f6fff] hover:text-[#0b5ad1]">
            <Plus className="w-3 h-3" />新建需求
          </button>
        </div>
        {filtered.map(d => (
          <div key={d.id}
            onClick={() => setSelectedId(d.id)}
            className={`cursor-pointer border-l-2 border-b border-[#f0f4fa] p-4 transition-colors ${
              selectedId === d.id ? 'border-l-[#0f6fff] bg-[#f5f9ff]' : 'border-l-transparent hover:bg-[#fafcff]'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold" style={{ color: priorityColor(d.priority) }}>{d.priority}</span>
              <span className="truncate text-sm font-medium text-[#10233f]">{d.title}</span>
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
            <div className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#6b7c93]">{d.problem_statement}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-6 py-5">
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-[#dbe4f0] pb-5">
              <div>
                <div className="mb-2 text-xs font-medium text-[#6b7c93]">需求详情</div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold" style={{ color: priorityColor(selected.priority) }}>{selected.priority}</span>
                  <h3 className="text-base font-semibold text-[#10233f]">{selected.title}</h3>
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
                <button className="flex items-center gap-1 rounded-xl border border-[#d5e0ee] px-3 py-1.5 text-xs text-[#5f6f86] transition-colors hover:border-[#0f6fff] hover:text-[#0f6fff]">
                  <Edit3 className="w-3 h-3" />编辑
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#FFB800]" />
                <span className="text-sm font-medium text-[#355070]">问题描述</span>
              </div>
              <p className="text-sm leading-7 text-[#5f6f86]">{selected.problem_statement}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-sm font-medium text-[#355070]">目标用户</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selected.target_users.map((u, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">{u}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#00FF88]" />
                  <span className="text-sm font-medium text-[#355070]">核心场景</span>
                </div>
                <div className="space-y-1">
                  {selected.core_scenarios.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[#5f6f86]">
                      <span className="w-1 h-1 rounded-full bg-[#00FF88] shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-4 h-4 text-[#00FF88]" />
                <span className="text-sm font-medium text-[#355070]">验收标准</span>
              </div>
              <div className="space-y-1.5">
                {selected.acceptance_criteria.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[#5f6f86]">
                    <span className="text-[#00FF88] shrink-0 mt-0.5">✓</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#00FF88] text-xs">✓ 做</span>
                  <span className="text-sm font-medium text-[#355070]">范围内</span>
                </div>
                <div className="space-y-1">
                  {selected.scope_in.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[#5f6f86]">
                      <span className="w-1 h-1 rounded-full bg-[#00FF88] shrink-0" />{s}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#FF3366] text-xs">✕ 不做</span>
                  <span className="text-sm font-medium text-[#355070]">范围外</span>
                </div>
                <div className="space-y-1">
                  {selected.scope_out.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[#7a8aa0]">
                      <span className="w-1 h-1 rounded-full bg-[#FF3366] shrink-0" />{s}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selected.dependencies.length > 0 && (
              <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-[#FFB800]" />
                  <span className="text-sm font-medium text-[#355070]">依赖项</span>
                </div>
                <div className="space-y-2">
                  {selected.dependencies.map((dep, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl border border-[#e7edf6] bg-[#fbfdff] p-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#355070]">{dep.dep_system} <span className="text-[#8ea0b8]">· {dep.dep_role}</span></div>
                        <div className="text-[11px] text-[#7a8aa0] truncate">{dep.dep_action}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[#8ea0b8]">{dep.owner}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${dep.status === 'ready' ? 'bg-[#00FF88]/10 text-[#00FF88]' : 'bg-[#FFB800]/10 text-[#FFB800]'}`}>
                          {dep.status === 'ready' ? '就绪' : '待确认'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4 text-[#7B61FF]" />
                <span className="text-sm font-medium text-[#355070]">结果物</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selected.deliverables.map((d, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(123,97,255,0.08)] text-[#7B61FF]">{d}</span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[24px] border border-[#dbe4f0] bg-white px-5 py-4 text-[11px] text-[#7a8aa0] shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
              <span>提出人: {selected.proposer}</span>
              <span>负责人: {selected.owner}</span>
              <span>创建: <ClientTime value={selected.created_at} mode="date" /></span>
              <span>更新: <ClientTime value={selected.updated_at} mode="date" /></span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-[#b0bfd4]" />
              <div className="text-sm text-[#5f6f86]">选择左侧需求查看详情</div>
              <div className="mt-1 text-[11px] text-[#8ea0b8]">问题描述 / 验收标准 / 依赖项 / 结果物</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function McpConfigTab() {
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedMcpRaw, setSelectedMcpRaw] = useState<string | null>(() => readClientStorage(ADMIN_MCP_STORAGE_KEY));
  const [editMode, setEditMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toolKeyword, setToolKeyword] = useState('');
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'fail'>>({});
  const [testMessage, setTestMessage] = useState<Record<string, string>>({});
  const [addForm, setAddForm] = useState({
    name: '',
    category: 'data' as string,
    endpoint_url: '',
    transport: 'streamable-http' as McpServerConfig['transport'],
    auth_type: 'none' as string,
    auth_token: '',
    auth_api_key: '',
    auth_oauth_client_id: '',
    auth_oauth_client_secret: '',
    description: '',
  });
  const [editForm, setEditForm] = useState({
    endpoint_url: '',
    transport: 'streamable-http' as McpServerConfig['transport'],
    auth_type: 'none' as string,
    auth_token: '',
    auth_api_key: '',
    auth_oauth_client_id: '',
    auth_oauth_client_secret: '',
  });
  const [saveMsg, setSaveMsg] = useState('');

  const tokenPrefixMap: Record<string, { prefix: string; placeholder: string }> = {
    bearer_token: { prefix: 'Bearer ', placeholder: '输入 Token（系统自动加 Bearer 前缀）' },
    api_key: { prefix: '', placeholder: '输入 API Key' },
    oauth2: { prefix: '', placeholder: '输入 OAuth Client ID' },
  };

  useEffect(() => {
    xiaoqiaoApi.getMcpServers().then(setMcpServers).catch(() => undefined);
  }, []);

  const stripPrefix = (authType: string, value: string): string => {
    if (authType === 'bearer_token') {
      return value
        .replace(/^Authorization\s*[:=]\s*Bearer\s+/i, '')
        .replace(/^Bearer\s+/i, '')
        .trim();
    }
    return value;
  };

  const buildFullToken = (authType: string, rawKey: string): string => {
    const cfg = tokenPrefixMap[authType];
    if (!cfg || !rawKey) return rawKey;
    const normalized = stripPrefix(authType, rawKey);
    if (cfg.prefix && normalized && !normalized.startsWith(cfg.prefix)) {
      return cfg.prefix + normalized;
    }
    return normalized;
  };

  const filtered = filterCategory === 'all' ? mcpServers : mcpServers.filter(server => server.category === filterCategory);
  const selectedMcp = selectedMcpRaw && mcpServers.some(server => server.id === selectedMcpRaw)
    ? selectedMcpRaw
    : null;
  const selected = filtered.find(server => server.id === selectedMcp) || mcpServers.find(server => server.id === selectedMcp) || null;
  const visibleTools = selected
    ? selected.tools.filter(tool => {
      const keyword = toolKeyword.trim().toLowerCase();
      if (!keyword) return true;
      return `${tool.name} ${tool.description}`.toLowerCase().includes(keyword);
    })
    : [];

  const categoryLabels: Record<string, string> = {
    all: '全部',
    data: '数据 MCP',
    function: '功能 MCP',
  };

  const statusColors: Record<string, string> = {
    connected: 'text-[#157f54]',
    disconnected: 'text-[#c2415c]',
    error: 'text-[#b7791f]',
    pending: 'text-[#64748b]',
  };
  const statusLabels: Record<string, string> = {
    connected: '已连接',
    disconnected: '未连接',
    error: '异常',
    pending: '待配置',
  };
  const authTypeLabels: Record<string, string> = {
    none: '无鉴权',
    bearer_token: 'Bearer Token',
    api_key: 'API Key',
    oauth2: 'OAuth 2.0',
  };
  const transportLabels: Record<McpServerConfig['transport'], string> = {
    'streamable-http': 'Streamable HTTP',
    sse: 'SSE',
    stdio: 'stdio',
  };

  const buildAuthConfig = (authType: string, form: typeof editForm | typeof addForm): Record<string, string> => {
    const config: Record<string, string> = {};
    if (authType === 'bearer_token' && 'auth_token' in form && form.auth_token) {
      config.token = buildFullToken(authType, form.auth_token);
    }
    if (authType === 'api_key' && 'auth_api_key' in form && form.auth_api_key) {
      config.api_key = form.auth_api_key;
    }
    if (authType === 'oauth2') {
      if ('auth_oauth_client_id' in form && form.auth_oauth_client_id) {
        config.client_id = form.auth_oauth_client_id;
      }
      if ('auth_oauth_client_secret' in form && form.auth_oauth_client_secret) {
        config.client_secret = form.auth_oauth_client_secret;
      }
    }
    return config;
  };

  const maskValue = (value?: string) => {
    if (!value) return '未配置';
    if (value.length <= 8) return '已配置';
    return `${value.slice(0, 4)}****${value.slice(-4)}`;
  };

  const handleSelectMcp = (id: string) => {
    setSelectedMcpRaw(id);
    writeClientStorage(ADMIN_MCP_STORAGE_KEY, id);
    setEditMode(false);
    setShowAddForm(false);
    setSaveMsg('');
    setToolKeyword('');
    const mcp = mcpServers.find(server => server.id === id);
    if (!mcp) return;
    setEditForm({
      endpoint_url: mcp.endpoint_url,
      transport: mcp.transport || 'streamable-http',
      auth_type: mcp.auth_type,
      auth_token: stripPrefix(mcp.auth_type, mcp.auth_config?.token || mcp.auth_config?.bearer_token || ''),
      auth_api_key: mcp.auth_config?.api_key || '',
      auth_oauth_client_id: mcp.auth_config?.client_id || '',
      auth_oauth_client_secret: mcp.auth_config?.client_secret || '',
    });
  };

  useEffect(() => {
    if (showAddForm || editMode) {
      return;
    }
    if (filtered.length === 0) {
      if (selectedMcp) {
        setSelectedMcpRaw(null);
        writeClientStorage(ADMIN_MCP_STORAGE_KEY, null);
      }
      return;
    }
    if (!selectedMcp || !filtered.some(server => server.id === selectedMcp)) {
      handleSelectMcp(filtered[0].id);
    }
  }, [filtered, selectedMcp, showAddForm, editMode]);

  const testConnection = async (serverId: string) => {
    setTestStatus(prev => ({ ...prev, [serverId]: 'testing' }));
    setTestMessage(prev => ({ ...prev, [serverId]: '' }));
    try {
      const res = await fetch(`/api/xiaoqiao/admin/mcp-servers/${serverId}/test`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      const success = Boolean(res.ok && data?.ok);
      setTestStatus(prev => ({ ...prev, [serverId]: success ? 'success' : 'fail' }));
      setTestMessage(prev => ({
        ...prev,
        [serverId]: data?.msg
          ? `${data.msg}${typeof data?.tool_count === 'number' ? ` · 已发现 ${data.tool_count} 个工具` : ''}`
          : data?.message || (success ? '连接成功' : `HTTP ${res.status} ${res.statusText}`),
      }));
      setMcpServers(prev => prev.map(item => item.id === serverId ? {
        ...item,
        status: success ? 'connected' : 'error',
        latency_ms: typeof data?.latency_ms === 'number' ? data.latency_ms : item.latency_ms,
        last_ping_at: Date.now(),
        last_health_check_at: Date.now(),
        error_message: success ? undefined : (data?.msg || item.error_message),
        tools: Array.isArray(data?.tools) ? data.tools : item.tools,
      } : item));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestStatus(prev => ({ ...prev, [serverId]: 'fail' }));
      setTestMessage(prev => ({ ...prev, [serverId]: msg.includes('abort') ? '连接超时 (8s)' : `连接失败: ${msg}` }));
      setMcpServers(prev => prev.map(item => item.id === serverId ? {
        ...item,
        status: 'error',
        last_ping_at: Date.now(),
      } : item));
    }
  };

  const handleRegister = () => {
    if (!addForm.name || !addForm.endpoint_url) {
      setSaveMsg('请填写服务名称和 Endpoint URL');
      return;
    }
    if (addForm.auth_type === 'bearer_token' && !addForm.auth_token) {
      setSaveMsg('请填写 Bearer Token');
      return;
    }
    if (addForm.auth_type === 'api_key' && !addForm.auth_api_key) {
      setSaveMsg('请填写 API Key');
      return;
    }
    if (addForm.auth_type === 'oauth2' && (!addForm.auth_oauth_client_id || !addForm.auth_oauth_client_secret)) {
      setSaveMsg('请填写 OAuth Client ID 和 Client Secret');
      return;
    }

    const newMcp: McpServerConfig = {
      id: `mcp_${Date.now()}`,
      name: addForm.name,
      description: addForm.description || addForm.name,
      category: addForm.category as McpServerConfig['category'],
      endpoint_url: addForm.endpoint_url,
      transport: addForm.transport,
      auth_type: addForm.auth_type as McpServerConfig['auth_type'],
      auth_config: buildAuthConfig(addForm.auth_type, addForm),
      status: 'disconnected',
      tools: [],
      enabled: true,
      business_domains: [],
      bound_agents: [],
      tags: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    void (async () => {
      try {
        const created = await xiaoqiaoApi.createMcpServer(newMcp);
        setMcpServers(prev => [...prev, created]);
        setSelectedMcpRaw(created.id);
        writeClientStorage(ADMIN_MCP_STORAGE_KEY, created.id);
        setSaveMsg('注册成功');
        setTimeout(() => {
          setShowAddForm(false);
          setSaveMsg('');
          setAddForm({
            name: '',
            category: 'data',
            endpoint_url: '',
            transport: 'streamable-http',
            auth_type: 'none',
            auth_token: '',
            auth_api_key: '',
            auth_oauth_client_id: '',
            auth_oauth_client_secret: '',
            description: '',
          });
        }, 800);
      } catch {
        setSaveMsg('注册失败');
      }
    })();
  };

  const handleSave = () => {
    if (!editForm.endpoint_url) {
      setSaveMsg('Endpoint URL 不能为空');
      return;
    }
    if (editForm.auth_type === 'bearer_token' && !editForm.auth_token) {
      setSaveMsg('请填写 Bearer Token');
      return;
    }
    if (editForm.auth_type === 'api_key' && !editForm.auth_api_key) {
      setSaveMsg('请填写 API Key');
      return;
    }
    if (editForm.auth_type === 'oauth2' && (!editForm.auth_oauth_client_id || !editForm.auth_oauth_client_secret)) {
      setSaveMsg('请填写 OAuth Client ID 和 Client Secret');
      return;
    }
    if (!selectedMcp) return;

    void (async () => {
      try {
        const updated = await xiaoqiaoApi.updateMcpServer(selectedMcp, {
          endpoint_url: editForm.endpoint_url,
          transport: editForm.transport,
          auth_type: editForm.auth_type as McpServerConfig['auth_type'],
          auth_config: buildAuthConfig(editForm.auth_type, editForm),
          updated_at: Date.now(),
        });
        setMcpServers(prev => prev.map(server => server.id === selectedMcp ? updated : server));
        setSaveMsg('保存成功');
        setEditMode(false);
        setTimeout(() => setSaveMsg(''), 1500);
      } catch {
        setSaveMsg('保存失败');
      }
    })();
  };

  const renderAuthFields = (
    authType: string,
    formData: typeof addForm | typeof editForm,
    setFormData: React.Dispatch<React.SetStateAction<typeof addForm>> | React.Dispatch<React.SetStateAction<typeof editForm>>,
  ) => {
    const updateField = (key: string, value: string) => {
      const nextValue = key === 'auth_token' ? stripPrefix(authType, value) : value;
      (setFormData as React.Dispatch<React.SetStateAction<Record<string, string>>>)(prev => ({ ...prev, [key]: nextValue }));
    };

    return (
      <div className="mt-2 space-y-3">
        {authType === 'none' && (
          <div className="py-2 text-[11px] text-[#6b7c93]">无需鉴权凭证</div>
        )}
        {authType === 'bearer_token' && (
          <div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-[#6b7c93]">Token</label>
              <span className="rounded-full bg-[#eef5ff] px-2 py-0.5 text-[10px] font-mono text-[#0f6fff]">系统自动加 Bearer 前缀</span>
            </div>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#8ea0b8]">Bearer</span>
              <input
                type="password"
                className="w-full rounded-xl border border-[#dbe4f0] bg-white py-2 pl-16 pr-3 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                placeholder={tokenPrefixMap.bearer_token.placeholder}
                value={'auth_token' in formData ? formData.auth_token : ''}
                onChange={e => updateField('auth_token', e.target.value)}
              />
            </div>
          </div>
        )}
        {authType === 'api_key' && (
          <div>
            <label className="text-[11px] text-[#6b7c93]">API Key</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
              placeholder={tokenPrefixMap.api_key.placeholder}
              value={'auth_api_key' in formData ? formData.auth_api_key : ''}
              onChange={e => updateField('auth_api_key', e.target.value)}
            />
          </div>
        )}
        {authType === 'oauth2' && (
          <>
            <div>
              <label className="text-[11px] text-[#6b7c93]">Client ID</label>
              <input
                className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                placeholder={tokenPrefixMap.oauth2.placeholder}
                value={'auth_oauth_client_id' in formData ? formData.auth_oauth_client_id : ''}
                onChange={e => updateField('auth_oauth_client_id', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] text-[#6b7c93]">Client Secret</label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                placeholder="输入 OAuth Client Secret"
                value={'auth_oauth_client_secret' in formData ? formData.auth_oauth_client_secret : ''}
                onChange={e => updateField('auth_oauth_client_secret', e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f3f6fb] px-4 py-5 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-[#dbe4f0] bg-white p-5 shadow-[0_18px_50px_rgba(15,35,63,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#10233f]">MCP 配置</h2>
              <p className="mt-1 text-xs leading-5 text-[#6b7c93]">
                这里统一管理报表、归因、监控等外部能力服务。连通测试会实时拉取工具清单，并把结果写回当前配置。
              </p>
            </div>
            <button
              onClick={() => { setShowAddForm(true); setEditMode(false); setSaveMsg(''); }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f6fff] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,111,255,0.18)] transition-colors hover:bg-[#0b5ad1]"
            >
              <Plus size={14} /> 添加 MCP 服务
            </button>
          </div>
          {saveMsg && (
            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
              saveMsg.includes('成功')
                ? 'border border-[#b8ebd0] bg-[#f2fff7] text-[#157f54]'
                : 'border border-[#fecdd3] bg-[#fff1f2] text-[#c2415c]'
            }`}>
              {saveMsg}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[220px_320px_minmax(0,1fr)]">
          <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-4 shadow-[0_12px_36px_rgba(15,35,63,0.06)]">
            <div className="mb-3 px-1 text-[11px] font-medium text-[#8ea0b8]">服务分类</div>
            <div className="space-y-2">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setFilterCategory(key);
                    setShowAddForm(false);
                    setEditMode(false);
                  }}
                  className={`w-full rounded-2xl px-3 py-3 text-left text-sm transition-colors ${
                    filterCategory === key
                      ? 'border border-[#cfe0ff] bg-[#eef5ff] text-[#0f6fff]'
                      : 'border border-transparent text-[#4f647d] hover:border-[#dbe4f0] hover:bg-[#f8fbff]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{label}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#8ea0b8]">
                      {(key === 'all' ? mcpServers : mcpServers.filter(server => server.category === key)).length}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-4 shadow-[0_12px_36px_rgba(15,35,63,0.06)]">
            <div className="text-sm font-medium text-[#355070]">已注册服务</div>
            <div className="mt-1 text-[11px] text-[#8ea0b8]">{filtered.length} 条配置</div>
            <div className="mt-4 space-y-3">
              {filtered.map(mcp => (
                <button
                  key={mcp.id}
                  type="button"
                  onClick={() => handleSelectMcp(mcp.id)}
                  className={`w-full rounded-[20px] border px-4 py-3 text-left transition-colors ${
                    selectedMcp === mcp.id
                      ? 'border-[#0f6fff] bg-[#eef5ff]'
                      : 'border-[#dbe4f0] bg-[#fbfdff] hover:border-[#b8cae6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-[#10233f]">{mcp.name}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      mcp.status === 'connected' ? 'bg-[#22c55e]' :
                      mcp.status === 'error' ? 'bg-[#f59e0b]' :
                      mcp.status === 'disconnected' ? 'bg-[#ef4444]' : 'bg-[#94a3b8]'
                    }`} />
                  </div>
                  <div className="mt-1 truncate text-[11px] text-[#8ea0b8]">{mcp.endpoint_url || '未配置地址'}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                    <span className={`rounded-full px-2 py-0.5 ${
                      mcp.status === 'connected'
                        ? 'bg-[#e9fff4] text-[#157f54]'
                        : mcp.status === 'error'
                          ? 'bg-[#fff7e8] text-[#b7791f]'
                          : 'bg-[#fff1f2] text-[#c2415c]'
                    }`}>
                      {statusLabels[mcp.status]}
                    </span>
                    <span className="rounded-full bg-[#f3f7fd] px-2 py-0.5 text-[#6b7c93]">{mcp.tools.length} 工具</span>
                    <span className="rounded-full bg-[#f3f7fd] px-2 py-0.5 text-[#6b7c93]">{categoryLabels[mcp.category]}</span>
                    <span className="rounded-full bg-[#f3f7fd] px-2 py-0.5 text-[#6b7c93]">{transportLabels[mcp.transport] || mcp.transport}</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="rounded-[20px] border border-dashed border-[#dbe4f0] bg-[#fbfdff] px-4 py-8 text-center text-sm text-[#8ea0b8]">
                  当前分类下还没有服务配置。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_12px_36px_rgba(15,35,63,0.06)]">
            {showAddForm ? (
              <div>
                <h3 className="mb-4 text-base font-semibold text-[#10233f]">注册新 MCP 服务</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] text-[#6b7c93]">服务名称 *</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      placeholder="例如：报表 MCP"
                      value={addForm.name}
                      onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6b7c93]">分类</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      value={addForm.category}
                      onChange={e => setAddForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="data">数据 MCP</option>
                      <option value="function">功能 MCP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6b7c93]">Endpoint URL *</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      placeholder="例如：https://service.example.com/mcp"
                      value={addForm.endpoint_url}
                      onChange={e => setAddForm(prev => ({ ...prev, endpoint_url: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6b7c93]">连接协议</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      value={addForm.transport}
                      onChange={e => setAddForm(prev => ({ ...prev, transport: e.target.value as McpServerConfig['transport'] }))}
                    >
                      <option value="streamable-http">Streamable HTTP</option>
                      <option value="sse">SSE</option>
                    </select>
                    <div className="mt-1 text-[11px] leading-5 text-[#8ea0b8]">
                      巨量引擎等只支持 SSE 的服务，请直接填写完整 SSE URL。
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
                    <label className="text-[11px] text-[#6b7c93]">鉴权方式</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      value={addForm.auth_type}
                      onChange={e => setAddForm(prev => ({ ...prev, auth_type: e.target.value }))}
                    >
                      <option value="none">无鉴权</option>
                      <option value="api_key">API Key</option>
                      <option value="bearer_token">Bearer Token</option>
                      <option value="oauth2">OAuth 2.0</option>
                    </select>
                    {renderAuthFields(addForm.auth_type, addForm, setAddForm)}
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6b7c93]">描述</label>
                    <textarea
                      className="mt-1 h-24 w-full resize-none rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      placeholder="描述此 MCP 提供的能力和适用场景"
                      value={addForm.description}
                      onChange={e => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleRegister} className="rounded-xl bg-[#0f6fff] px-4 py-2 text-sm font-medium text-white hover:bg-[#0b5ad1]">注册服务</button>
                    <button onClick={() => { setShowAddForm(false); setSaveMsg(''); }} className="rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm text-[#4f647d] hover:border-[#b8cae6]">取消</button>
                  </div>
                </div>
              </div>
            ) : selected ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#10233f]">{selected.name}</h3>
                    <div className="mt-1 text-sm text-[#6b7c93]">{selected.description}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => testConnection(selected.id)}
                      disabled={testStatus[selected.id] === 'testing'}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        testStatus[selected.id] === 'success'
                          ? 'border border-[#b8ebd0] bg-[#f2fff7] text-[#157f54]'
                          : testStatus[selected.id] === 'fail'
                            ? 'border border-[#fecdd3] bg-[#fff1f2] text-[#c2415c]'
                            : 'border border-[#dbe4f0] bg-white text-[#355070] hover:border-[#0f6fff] hover:text-[#0f6fff]'
                      }`}
                    >
                      {testStatus[selected.id] === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                      {testStatus[selected.id] === 'testing' ? '测试中...' :
                        testStatus[selected.id] === 'success' ? '已连接' :
                          testStatus[selected.id] === 'fail' ? '失败' : '测试连通'}
                    </button>
                    <button
                      onClick={() => { setEditMode(!editMode); setSaveMsg(''); }}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        editMode
                          ? 'border border-[#b8ebd0] bg-[#f2fff7] text-[#157f54]'
                          : 'border border-[#dbe4f0] bg-white text-[#355070] hover:border-[#0f6fff] hover:text-[#0f6fff]'
                      }`}
                    >
                      {editMode ? '完成编辑' : '编辑'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                    <div className="rounded-[20px] border border-[#dbe4f0] bg-[#f8fbff] p-4">
                      <div className="mb-3 text-sm font-medium text-[#355070]">连接状态</div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          selected.status === 'connected' ? 'bg-[#22c55e]' :
                            selected.status === 'error' ? 'bg-[#f59e0b]' :
                              selected.status === 'disconnected' ? 'bg-[#ef4444]' : 'bg-[#94a3b8]'
                        }`} />
                        <span className={`text-sm font-medium ${statusColors[selected.status]}`}>{statusLabels[selected.status]}</span>
                        {selected.last_ping_at && (
                          <span className="text-[11px] text-[#8ea0b8]">最近测试：<ClientTime value={selected.last_ping_at} /></span>
                        )}
                        {selected.latency_ms !== undefined && (
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] text-[#6b7c93]">延迟 {selected.latency_ms}ms</span>
                        )}
                      </div>
                      {testMessage[selected.id] && (
                        <div className={`mt-3 rounded-2xl px-3 py-2 text-[12px] ${
                          testStatus[selected.id] === 'success'
                            ? 'bg-[#f2fff7] text-[#157f54]'
                            : testStatus[selected.id] === 'fail'
                              ? 'bg-[#fff1f2] text-[#c2415c]'
                              : 'bg-white text-[#355070]'
                        }`}>
                          {testMessage[selected.id]}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                      <div className="mb-3 text-sm font-medium text-[#355070]">连接配置</div>
                      {editMode ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[11px] text-[#6b7c93]">Endpoint URL</label>
                            <input
                              className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                              value={editForm.endpoint_url}
                              onChange={e => setEditForm(prev => ({ ...prev, endpoint_url: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-[#6b7c93]">连接协议</label>
                            <select
                              className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                              value={editForm.transport}
                              onChange={e => setEditForm(prev => ({ ...prev, transport: e.target.value as McpServerConfig['transport'] }))}
                            >
                              <option value="streamable-http">Streamable HTTP</option>
                              <option value="sse">SSE</option>
                            </select>
                            <div className="mt-1 text-[11px] leading-5 text-[#8ea0b8]">
                              SSE 模式按后台填写的完整 URL 建立连接。
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-[#6b7c93]">鉴权方式</label>
                            <select
                              className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                              value={editForm.auth_type}
                              onChange={e => setEditForm(prev => ({ ...prev, auth_type: e.target.value }))}
                            >
                              <option value="none">无鉴权</option>
                              <option value="api_key">API Key</option>
                              <option value="bearer_token">Bearer Token</option>
                              <option value="oauth2">OAuth 2.0</option>
                            </select>
                            {renderAuthFields(editForm.auth_type, editForm, setEditForm)}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={handleSave} className="rounded-xl bg-[#0f6fff] px-4 py-2 text-sm font-medium text-white hover:bg-[#0b5ad1]">保存</button>
                            <button onClick={() => { setEditMode(false); setSaveMsg(''); }} className="rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm text-[#4f647d] hover:border-[#b8cae6]">取消</button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                            <div className="text-[11px] text-[#8ea0b8]">Endpoint</div>
                            <div className="mt-2 break-all font-mono text-[12px] text-[#10233f]">{selected.endpoint_url || '未配置'}</div>
                          </div>
                          <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                            <div className="text-[11px] text-[#8ea0b8]">连接协议</div>
                            <div className="mt-2 text-sm text-[#10233f]">{transportLabels[selected.transport] || selected.transport}</div>
                            <div className="mt-1 text-[11px] text-[#6b7c93]">
                              {selected.transport === 'sse' ? '按完整 SSE URL 连接' : '按标准 HTTP MCP 连接'}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                            <div className="text-[11px] text-[#8ea0b8]">鉴权方式</div>
                            <div className="mt-2 text-sm text-[#10233f]">{authTypeLabels[selected.auth_type] || selected.auth_type}</div>
                            <div className="mt-1 text-[11px] text-[#6b7c93]">
                              {selected.auth_type === 'bearer_token'
                                ? maskValue(selected.auth_config?.token)
                                : selected.auth_type === 'api_key'
                                  ? maskValue(selected.auth_config?.api_key)
                                  : selected.auth_type === 'oauth2'
                                    ? '已配置 OAuth 凭证'
                                    : '无需凭证'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-medium text-[#355070]">提供工具</div>
                          <div className="mt-1 text-[11px] text-[#8ea0b8]">{selected.tools.length} 个工具，支持按名称或说明检索</div>
                        </div>
                        <div className="relative w-full md:w-64">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0b8]" />
                          <input
                            value={toolKeyword}
                            onChange={e => setToolKeyword(e.target.value)}
                            placeholder="搜索工具"
                            className="w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] py-2 pl-10 pr-3 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                          />
                        </div>
                      </div>
                      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                        {visibleTools.map(tool => (
                          <div key={tool.name} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-mono text-sm text-[#10233f]">{tool.name}</div>
                                <div className="mt-1 text-[12px] leading-5 text-[#6b7c93]">{tool.description || '未提供说明'}</div>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                                tool.enabled ? 'bg-[#e9fff4] text-[#157f54]' : 'bg-[#f1f5f9] text-[#64748b]'
                              }`}>
                                {tool.enabled ? '启用' : '禁用'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {visibleTools.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-[#dbe4f0] bg-[#fbfdff] px-4 py-10 text-center text-sm text-[#8ea0b8]">
                            {selected.tools.length === 0 ? '当前服务还没有发现工具，请先执行测试连通。' : '没有匹配到对应工具，请调整搜索词。'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[20px] border border-[#dbe4f0] bg-[#f8fbff] p-4">
                      <div className="mb-3 text-sm font-medium text-[#355070]">服务概览</div>
                      <div className="space-y-3 text-sm">
                        <div className="rounded-2xl border border-[#e5edf7] bg-white px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">服务分类</div>
                          <div className="mt-1 text-[#10233f]">{categoryLabels[selected.category]}</div>
                        </div>
                        <div className="rounded-2xl border border-[#e5edf7] bg-white px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">工具数量</div>
                          <div className="mt-1 text-[#10233f]">{selected.tools.length} 个</div>
                        </div>
                        <div className="rounded-2xl border border-[#e5edf7] bg-white px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">绑定 Agent</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selected.bound_agents.length > 0 ? selected.bound_agents.map(agent => (
                              <span key={agent} className="rounded-full bg-[#eef5ff] px-2 py-1 text-[11px] text-[#0f6fff]">{agent}</span>
                            )) : <span className="text-[12px] text-[#6b7c93]">未绑定任何 Agent</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                      <div className="mb-3 text-sm font-medium text-[#355070]">时间记录</div>
                      <div className="space-y-3 text-[12px] text-[#4f647d]">
                        <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">最近心跳</div>
                          <div className="mt-1">{selected.last_ping_at ? <ClientTime value={selected.last_ping_at} /> : '暂无记录'}</div>
                        </div>
                        <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">最近健康检查</div>
                          <div className="mt-1">{selected.last_health_check_at ? <ClientTime value={selected.last_health_check_at} /> : '暂无记录'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center">
                <div className="text-center">
                  <div className="text-sm text-[#6b7c93]">选择左侧服务查看详情，或先添加新的 MCP 服务。</div>
                  <div className="mt-1 text-[11px] text-[#8ea0b8]">右侧会显示连通状态、连接配置和工具清单。</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const skillCategoryLabels: Record<McpSkillCategory | 'all', string> = {
  all: '全部',
  data: '数据服务',
  operation: '执行流程',
  monitor: '监控任务',
  analysis: '分析洞察',
  integration: '对接集成',
  other: '其他',
};

function SkillManagementTab() {
  const [skills, setSkills] = useState<McpSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<McpSkillCategory | 'all'>('all');
  const [filterInstall, setFilterInstall] = useState<'all' | 'installed' | 'not-installed'>('all');
  const [selectedSkillIdRaw, setSelectedSkillIdRaw] = useState<string | null>(() => readClientStorage(ADMIN_SKILL_STORAGE_KEY));
  const [message, setMessage] = useState('');

  const setSelectedSkillId = (id: string | null) => {
    setSelectedSkillIdRaw(id);
    writeClientStorage(ADMIN_SKILL_STORAGE_KEY, id);
  };

  const loadSkills = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/xiaoqiao/skills');
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json() as McpSkill[];
      setSkills(data);
      setSelectedSkillIdRaw(current => {
        const next = current && data.some(skill => skill.id === current)
          ? current
          : data[0]?.id || null;
        writeClientStorage(ADMIN_SKILL_STORAGE_KEY, next);
        return next;
      });
    } catch {
      setMessage('Skill配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSkills();
  }, []);

  const filteredSkills = skills.filter(skill => {
    const categoryMatched = filterCategory === 'all' || skill.category === filterCategory;
    const installMatched = filterInstall === 'all' ||
      (filterInstall === 'installed' ? skill.installed : !skill.installed);
    return categoryMatched && installMatched;
  });
  const selectedSkillId = selectedSkillIdRaw && skills.some(skill => skill.id === selectedSkillIdRaw)
    ? selectedSkillIdRaw
    : null;
  const selectedSkill = skills.find(skill => skill.id === selectedSkillId) || filteredSkills[0] || null;
  const installedCount = skills.filter(skill => skill.installed).length;
  const p0Count = skills.filter(skill => skill.tags.includes('P0')).length;

  const updateSkillInstall = async (skill: McpSkill, nextInstalled: boolean) => {
    setMessage('');
    try {
      const response = await fetch(`/api/xiaoqiao/skills/${skill.id}/${nextInstalled ? 'install' : 'uninstall'}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(await response.text());
      await loadSkills();
      setMessage(`${skill.name} 已${nextInstalled ? '启用' : '停用'}`);
    } catch {
      setMessage(`${skill.name} 状态更新失败`);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-white">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[#dbe4f0] bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#10233f]">Skill管理</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[#6b7c93]">
                管理智投 Chat 可调用的业务能力单元。Agent 负责识别意图和追问，Skill 负责执行稳定流程，MCP 提供系统连接。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="px-4 py-3">
                <div className="text-lg font-semibold text-[#10233f]">{skills.length}</div>
                <div className="mt-1 text-[11px] text-[#8ea0b8]">全部Skill</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-lg font-semibold text-[#157f54]">{installedCount}</div>
                <div className="mt-1 text-[11px] text-[#8ea0b8]">已启用</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-lg font-semibold text-[#0f6fff]">{p0Count}</div>
                <div className="mt-1 text-[11px] text-[#8ea0b8]">P0能力</div>
              </div>
            </div>
          </div>
          {message && (
            <div className="mt-4 border-t border-[#edf2f8] px-4 py-3 text-sm text-[#355070]">
              {message}
            </div>
          )}
        </section>

        <section className="grid min-h-[calc(100vh-170px)] xl:grid-cols-[220px_360px_minmax(0,1fr)]">
          <aside className="border-r border-[#dbe4f0] bg-white p-4">
            <div className="mb-3 px-1 text-[11px] font-medium text-[#8ea0b8]">能力分类</div>
            <div className="space-y-2">
              {(Object.keys(skillCategoryLabels) as Array<McpSkillCategory | 'all'>).map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFilterCategory(category)}
                  className={`w-full rounded-2xl px-3 py-3 text-left text-sm transition-colors ${
                    filterCategory === category
                      ? 'border border-[#cfe0ff] bg-[#eef5ff] text-[#0f6fff]'
                      : 'border border-transparent text-[#4f647d] hover:border-[#dbe4f0] hover:bg-[#f8fbff]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{skillCategoryLabels[category]}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#8ea0b8]">
                      {(category === 'all' ? skills : skills.filter(skill => skill.category === category)).length}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-5 border-t border-[#edf2f8] pt-4">
              <div className="mb-3 px-1 text-[11px] font-medium text-[#8ea0b8]">启用状态</div>
              <div className="space-y-2">
                {[
                  ['all', '全部'],
                  ['installed', '已启用'],
                  ['not-installed', '未启用'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilterInstall(key as typeof filterInstall)}
                    className={`w-full rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                      filterInstall === key ? 'bg-[#eef5ff] text-[#0f6fff]' : 'text-[#4f647d] hover:bg-[#f8fbff]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="border-r border-[#dbe4f0] bg-white p-4">
            <div className="text-sm font-medium text-[#355070]">Skill列表</div>
            <div className="mt-1 text-[11px] text-[#8ea0b8]">{filteredSkills.length} 个能力单元</div>
            <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {loading ? (
                <div className="rounded-[20px] border border-dashed border-[#dbe4f0] px-4 py-8 text-center text-sm text-[#8ea0b8]">正在加载Skill...</div>
              ) : filteredSkills.map(skill => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => setSelectedSkillId(skill.id)}
                  className={`w-full border-b border-[#edf2f8] px-4 py-3 text-left transition-colors ${
                    selectedSkill?.id === skill.id
                      ? 'border-l-2 border-l-[#0f6fff] bg-[#f7fbff]'
                      : 'hover:bg-[#fafcff]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{skill.icon}</span>
                        <span className="truncate text-sm font-medium text-[#10233f]">{skill.name}</span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#6b7c93]">{skill.description}</div>
                    </div>
                    <span className={`shrink-0 text-[10px] ${skill.installed ? 'text-[#157f54]' : 'text-[#64748b]'}`}>
                      {skill.installed ? '启用' : '停用'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skill.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] text-[#6b7c93]">{tag}</span>
                    ))}
                    <span className="text-[10px] text-[#6b7c93]">{skill.expected_tools.length} 工具</span>
                  </div>
                </button>
              ))}
              {!loading && filteredSkills.length === 0 && (
                <div className="rounded-[20px] border border-dashed border-[#dbe4f0] px-4 py-8 text-center text-sm text-[#8ea0b8]">
                  当前筛选下没有Skill。
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5">
            {selectedSkill ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selectedSkill.icon}</span>
                      <h3 className="text-base font-semibold text-[#10233f]">{selectedSkill.name}</h3>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7c93]">{selectedSkill.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSkillInstall(selectedSkill, !selectedSkill.installed)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      selectedSkill.installed
                        ? 'border border-[#dbe4f0] bg-white text-[#355070] hover:border-[#b8cae6]'
                        : 'bg-[#0f6fff] text-white hover:bg-[#0b5ad1]'
                    }`}
                  >
                    {selectedSkill.installed ? '停用Skill' : '启用Skill'}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                    <div className="text-[11px] text-[#8ea0b8]">分类</div>
                    <div className="mt-1 text-sm text-[#10233f]">{skillCategoryLabels[selectedSkill.category]}</div>
                  </div>
                  <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                    <div className="text-[11px] text-[#8ea0b8]">来源</div>
                    <div className="mt-1 text-sm text-[#10233f]">{selectedSkill.source === 'builtin' ? '内置' : '自定义'}</div>
                  </div>
                  <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                    <div className="text-[11px] text-[#8ea0b8]">MCP地址</div>
                    <div className="mt-1 truncate font-mono text-[12px] text-[#10233f]">{selectedSkill.endpoint_url || '未配置'}</div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                    <div className="text-sm font-medium text-[#355070]">适用场景</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedSkill.use_cases.map(useCase => (
                        <span key={useCase} className="rounded-full bg-[#f3f7fd] px-3 py-1 text-[12px] text-[#4f647d]">{useCase}</span>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                    <div className="text-sm font-medium text-[#355070]">触发策略</div>
                    <div className="mt-3 space-y-2 text-[12px] leading-5 text-[#4f647d]">
                      <div>Agent 先判断意图、业务对象和缺失字段。</div>
                      <div>字段不足时先结构化追问，不直接调用Skill。</div>
                      <div>字段满足后调用Skill，并在消息区保留过程、来源和结果。</div>
                    </div>
                  </section>
                </div>

                <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                  <div className="mb-3 text-sm font-medium text-[#355070]">绑定工具</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedSkill.expected_tools.map(tool => (
                      <div key={tool.name} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                        <div className="font-mono text-sm text-[#10233f]">{tool.name}</div>
                        <div className="mt-1 text-[12px] leading-5 text-[#6b7c93]">{tool.description}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[20px] border border-[#dbe4f0] bg-[#f8fbff] p-4">
                  <div className="text-sm font-medium text-[#355070]">Agent调用提示词骨架</div>
                  <pre className="mt-3 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-2xl border border-[#e5edf7] bg-white p-4 text-[12px] leading-6 text-[#10233f]">{`你是智投 Chat 的服务路由 Agent。
当前候选 Skill：${selectedSkill.name}

调用前必须确认：
1. 用户意图是否匹配该 Skill。
2. 必填字段是否已齐全。
3. 用户是否有对应项目、账户、媒体的数据权限。
4. 是否需要先追问，而不是直接调用。

如果满足调用条件：
- 输出 skill_id=${selectedSkill.id}
- 输出 normalized_input
- 调用绑定工具
- 返回过程、来源、结构化结果和下一步动作

如果不满足：
- 输出 missing_fields
- 生成一个结构化补充表单
- 不把缺失条件当成新的自由问题发送`}</pre>
                </section>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8ea0b8]">
                选择一个Skill查看调用契约、工具绑定和启用状态。
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

// ---- Trace Config Tab ----
interface TraceConfigForm {
  enabled: boolean;
  apiUrl: string;
  workspaceId: string;
  apiToken: string;
  projectId: string;
  env: 'test' | 'pre' | 'prod';
  serviceName: string;
  sampleRate: number;
  appId: string;
}

interface ModelServiceConfigForm {
  enabled: boolean;
  provider: 'coze_openai_compatible' | 'custom_openai_compatible';
  providerLabel: string;
  apiKey: string;
  baseUrl: string;
  modelBaseUrl: string;
  modelName: string;
  knowledgeBaseUrl: string;
  knowledgeBaseApiKey: string;
  knowledgeBaseDataset: string;
  notes: string;
  updatedAt?: string;
}

interface ProjectServiceConfigForm {
  enabled: boolean;
  apiBaseUrl: string;
  apiToken: string;
  notes: string;
  updatedAt?: string;
}

type ServiceLinkState = 'idle' | 'testing' | 'success' | 'fail';

interface ServiceTestFeedback {
  state: ServiceLinkState;
  message: string;
  latencyMs?: number;
}

function TraceConfigTab() {
  const [config, setConfig] = useState<TraceConfigForm>({
    enabled: false,
    apiUrl: 'http://liannu.dc.yokagames.com:1117',
    workspaceId: '',
    apiToken: '',
    projectId: '10100283',
    env: 'test',
    serviceName: 'xiaoqiao-zhitou-chat-service',
    sampleRate: 1,
    appId: '10100283',
  });
  const [modelService, setModelService] = useState<ModelServiceConfigForm>({
    enabled: true,
    provider: 'coze_openai_compatible',
    providerLabel: 'Coze/OpenAI 兼容服务',
    apiKey: '',
    baseUrl: '',
    modelBaseUrl: '',
    modelName: 'doubao-seed-1-8-251228',
    knowledgeBaseUrl: '',
    knowledgeBaseApiKey: '',
    knowledgeBaseDataset: '',
    notes: '',
  });
  const [projectService, setProjectService] = useState<ProjectServiceConfigForm>({
    enabled: true,
    apiBaseUrl: 'https://apps-api.dobest.com/v1.0/apps',
    apiToken: '',
    notes: '',
  });
  const [saved, setSaved] = useState(false);
  const [traceTest, setTraceTest] = useState<ServiceTestFeedback>({
    state: 'idle',
    message: '尚未测试',
  });
  const [serviceTest, setServiceTest] = useState<{
    model: ServiceTestFeedback;
    knowledge: ServiceTestFeedback;
  }>({
    model: { state: 'idle', message: '尚未测试' },
    knowledge: { state: 'idle', message: '尚未测试' },
  });

  useEffect(() => {
    (async () => {
      try {
        const [traceRes, modelRes, projectRes] = await Promise.all([
          fetch('/api/xiaoqiao/admin/trace-config'),
          fetch('/api/xiaoqiao/admin/model-service-config'),
          fetch('/api/xiaoqiao/admin/project-service-config'),
        ]);
        const traceData = await traceRes.json();
        const modelData = await modelRes.json();
        const projectData = await projectRes.json();
        setConfig(prev => ({ ...prev, ...traceData }));
        setModelService(prev => ({ ...prev, ...modelData }));
        setProjectService(prev => ({ ...prev, ...projectData }));
      } catch { /* use defaults */ }
    })();
  }, []);

  const handleSave = async () => {
    try {
      await Promise.all([
        fetch('/api/xiaoqiao/admin/trace-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        }),
        fetch('/api/xiaoqiao/admin/model-service-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modelService),
        }),
        fetch('/api/xiaoqiao/admin/project-service-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectService),
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('保存失败');
    }
  };

  const updateField = <K extends keyof TraceConfigForm>(key: K, value: TraceConfigForm[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    setTraceTest({ state: 'idle', message: '配置已变更，请重新测试' });
  };

  const updateModelServiceField = <K extends keyof ModelServiceConfigForm>(
    key: K,
    value: ModelServiceConfigForm[K],
  ) => {
    setModelService(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    if (key !== 'notes' && key !== 'updatedAt') {
      setServiceTest(prev => ({
        ...prev,
        model: { state: 'idle', message: '配置已变更，请重新测试' },
        knowledge: { state: 'idle', message: '配置已变更，请重新测试' },
      }));
    }
  };

  const updateProjectServiceField = <K extends keyof ProjectServiceConfigForm>(
    key: K,
    value: ProjectServiceConfigForm[K],
  ) => {
    setProjectService(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const fields: { key: keyof TraceConfigForm; label: string; type?: string; placeholder?: string }[] = [
    { key: 'apiUrl', label: 'API 地址', placeholder: 'http://liannu.dc.yokagames.com:1117' },
    { key: 'workspaceId', label: 'Workspace ID', placeholder: 'COZELOOP_WORKSPACE_ID' },
    { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'COZELOOP_API_TOKEN' },
    { key: 'projectId', label: '项目 ID (Project ID)', placeholder: '10100283' },
    { key: 'appId', label: '应用 ID (App ID)', placeholder: '10100283' },
    { key: 'serviceName', label: '服务名称', placeholder: 'xiaoqiao-zhitou-chat-service' },
  ];
  const modelFields: { key: keyof ModelServiceConfigForm; label: string; type?: string; placeholder?: string }[] = [
    { key: 'providerLabel', label: '服务名称', placeholder: 'Coze/OpenAI 兼容服务' },
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' },
    { key: 'baseUrl', label: '服务地址', placeholder: 'https://your-gateway.example.com' },
    { key: 'modelBaseUrl', label: '模型地址', placeholder: 'https://your-gateway.example.com/v1' },
    { key: 'modelName', label: '模型名称', placeholder: 'doubao-seed-1-8-251228' },
    { key: 'knowledgeBaseUrl', label: '知识库地址', placeholder: '留空则跟随服务地址' },
    { key: 'knowledgeBaseApiKey', label: '知识库 Key', type: 'password', placeholder: '留空则复用 API Key' },
    { key: 'knowledgeBaseDataset', label: '知识库 ID（可选）', placeholder: '留空时自动覆盖当前账号可访问的全部知识库' },
  ];

  const runTraceTest = async () => {
    setTraceTest({ state: 'testing', message: '正在测试连接...' });
    try {
      const res = await fetch('/api/xiaoqiao/admin/trace-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json().catch(() => ({}));
      const nextState: ServiceLinkState = res.ok && data.ok ? 'success' : 'fail';
      setTraceTest({
        state: nextState,
        message: data.message || (nextState === 'success' ? '连接正常' : '连接失败'),
        latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
      });
    } catch (error: unknown) {
      setTraceTest({
        state: 'fail',
        message: error instanceof Error ? `连接失败：${error.message}` : '连接失败',
      });
    }
  };

  const runServiceTest = async (target: 'model' | 'knowledge') => {
    setServiceTest(prev => ({
      ...prev,
      [target]: { state: 'testing', message: '正在测试连接...' },
    }));
    try {
      const res = await fetch('/api/xiaoqiao/admin/model-service-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, config: modelService }),
      });
      const data = await res.json().catch(() => ({}));
      const nextState: ServiceLinkState = res.ok && data.ok ? 'success' : 'fail';
      setServiceTest(prev => ({
        ...prev,
        [target]: {
          state: nextState,
          message: data.message || (nextState === 'success' ? '连接正常' : '连接失败'),
          latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
        },
      }));
    } catch (error: unknown) {
      setServiceTest(prev => ({
        ...prev,
        [target]: {
          state: 'fail',
          message: error instanceof Error ? `连接失败：${error.message}` : '连接失败',
        },
      }));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#10233f]">配置管理服务</h2>
            <p className="text-xs text-[#6b7c93] mt-1">在这里统一管理问答服务、调用观测和运行参数，配置保存后会直接影响首页对话链路。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Enable toggle */}
            <button
              onClick={() => updateField('enabled', !config.enabled)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                config.enabled
                  ? 'bg-[#e9fff4] text-[#157f54] border border-[#b8ebd0]'
                  : 'bg-[#fff1f2] text-[#c2415c] border border-[#fecdd3]'
              }`}
            >
              {config.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {config.enabled ? '已启用' : '已禁用'}
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved
                  ? 'bg-[#e9fff4] text-[#157f54]'
                  : 'bg-[#0f6fff] text-white hover:bg-[#0b5ad1] shadow-[0_10px_30px_rgba(15,111,255,0.18)]'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? '已保存' : '保存配置'}
            </button>
          </div>
        </div>

        {/* Connection Info Card */}
        <div className="rounded-2xl border border-[#dbe4f0] bg-white p-5 space-y-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-medium text-[#355070] flex items-center gap-2">
                <Activity className="w-4 h-4" /> 观测连接配置
              </h3>
              <p className="mt-1 text-[11px] text-[#6b7c93]">
                这里配置的是连弩观测服务。保存后可直接测试链路是否可达、认证是否生效。
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 ${
              traceTest.state === 'success'
                ? 'border-[#b8ebd0] bg-[#f2fff7] text-[#157f54]'
                : traceTest.state === 'fail'
                  ? 'border-[#fecdd3] bg-[#fff1f2] text-[#c2415c]'
                  : 'border-[#dbe4f0] bg-[#f8fbff] text-[#4f647d]'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium">Trace 链路状态</div>
                  <div className="mt-1 text-[11px] opacity-80">
                    {traceTest.message}
                    {typeof traceTest.latencyMs === 'number' ? ` · ${traceTest.latencyMs}ms` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={runTraceTest}
                  disabled={traceTest.state === 'testing'}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors ${
                    traceTest.state === 'testing'
                      ? 'bg-[#e8f1ff] text-[#0f6fff]'
                      : 'bg-white text-[#0f6fff] border border-[#c8d8ee] hover:border-[#0f6fff]'
                  }`}
                >
                  {traceTest.state === 'testing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                  {traceTest.state === 'testing' ? '测试中...' : '测试 Trace 链路'}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fields.map(f => (
              <div key={f.key}>
                <label className="text-[11px] text-[#6b7c93] block mb-1">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={String(config[f.key])}
                  onChange={e => {
                    if (f.key === 'sampleRate') {
                      updateField(f.key, parseFloat(e.target.value) || 0);
                    } else {
                      updateField(f.key, e.target.value as TraceConfigForm[typeof f.key]);
                    }
                  }}
                  placeholder={f.placeholder}
                  className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] placeholder-[#93a1b2] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)] transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe4f0] bg-white p-5 space-y-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-medium text-[#355070] flex items-center gap-2">
                <Cpu className="w-4 h-4" /> 问答服务配置
              </h3>
              <p className="text-[11px] text-[#6b7c93] mt-1">
                这里配置的是用户提问时真正调用的模型服务和知识库 API。知识库按 WeKnora REST API 接入，不走 MCP 协议；如果不填知识库 ID，系统会自动覆盖当前账号可访问的全部知识库。
              </p>
            </div>
            <button
              onClick={() => updateModelServiceField('enabled', !modelService.enabled)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                modelService.enabled
                  ? 'bg-[#e9fff4] text-[#157f54] border border-[#b8ebd0]'
                  : 'bg-[#fff1f2] text-[#c2415c] border border-[#fecdd3]'
              }`}
            >
              {modelService.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {modelService.enabled ? '已启用' : '已禁用'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">服务类型</label>
              <select
                value={modelService.provider}
                onChange={e => updateModelServiceField('provider', e.target.value as ModelServiceConfigForm['provider'])}
                className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
              >
                <option value="coze_openai_compatible">Coze / OpenAI 兼容服务</option>
                <option value="custom_openai_compatible">自定义 OpenAI 兼容服务</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">最近更新时间</label>
              <div className="w-full min-h-[40px] bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#355070]">
                <ClientTime value={modelService.updatedAt} empty="未保存" />
              </div>
            </div>
            {modelFields.map(f => (
              <div key={f.key}>
                <label className="text-[11px] text-[#6b7c93] block mb-1">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={String(modelService[f.key] ?? '')}
                  onChange={e => updateModelServiceField(f.key, e.target.value as ModelServiceConfigForm[typeof f.key])}
                  placeholder={f.placeholder}
                  className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] placeholder-[#93a1b2] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)] transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {([
              {
                key: 'model' as const,
                label: '大模型连接状态',
                buttonLabel: '测试大模型连接',
              },
              {
                key: 'knowledge' as const,
                label: '知识库连接状态',
                buttonLabel: '测试知识库连接',
              },
            ]).map(item => {
              const current = serviceTest[item.key];
              const stateClass = current.state === 'success'
                ? 'border-[#b8ebd0] bg-[#f2fff7] text-[#157f54]'
                : current.state === 'fail'
                  ? 'border-[#fecdd3] bg-[#fff1f2] text-[#c2415c]'
                  : 'border-[#dbe4f0] bg-[#f8fbff] text-[#4f647d]';
              return (
                <div key={item.key} className={`rounded-2xl border p-4 ${stateClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium">{item.label}</div>
                      <div className="mt-1 text-[11px] opacity-80">
                        {current.message}
                        {typeof current.latencyMs === 'number' ? ` · ${current.latencyMs}ms` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => runServiceTest(item.key)}
                      disabled={current.state === 'testing'}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors ${
                        current.state === 'testing'
                          ? 'bg-[#e8f1ff] text-[#0f6fff]'
                          : 'bg-white text-[#0f6fff] border border-[#c8d8ee] hover:border-[#0f6fff]'
                      }`}
                    >
                      {current.state === 'testing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                      {current.state === 'testing' ? '测试中...' : item.buttonLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="text-[11px] text-[#6b7c93] block mb-1">备注</label>
            <textarea
              value={modelService.notes}
              onChange={e => updateModelServiceField('notes', e.target.value)}
              placeholder="例如：生产环境走统一 AI 网关，模型地址需包含 /v1"
              className="w-full min-h-[96px] bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] placeholder-[#93a1b2] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)] transition-colors resize-none"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe4f0] bg-white p-5 space-y-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-medium text-[#355070] flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> 项目信息接口配置
              </h3>
              <p className="text-[11px] text-[#6b7c93] mt-1">
                首页项目下拉和项目列表接口从这里读取 token，不再在代码中内置生产凭证。
              </p>
            </div>
            <button
              onClick={() => updateProjectServiceField('enabled', !projectService.enabled)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                projectService.enabled
                  ? 'bg-[#e9fff4] text-[#157f54] border border-[#b8ebd0]'
                  : 'bg-[#fff1f2] text-[#c2415c] border border-[#fecdd3]'
              }`}
            >
              {projectService.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {projectService.enabled ? '已启用' : '已禁用'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">接口地址</label>
              <input
                value={projectService.apiBaseUrl}
                onChange={e => updateProjectServiceField('apiBaseUrl', e.target.value)}
                placeholder="https://apps-api.dobest.com/v1.0/apps"
                className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] placeholder-[#93a1b2] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)] transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">Access Token</label>
              <input
                type="password"
                value={projectService.apiToken}
                onChange={e => updateProjectServiceField('apiToken', e.target.value)}
                placeholder="在后台配置项目接口 token"
                className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] placeholder-[#93a1b2] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)] transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">最近更新时间</label>
              <div className="w-full min-h-[40px] bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#355070]">
                <ClientTime value={projectService.updatedAt} empty="未保存" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#6b7c93] block mb-1">备注</label>
            <textarea
              value={projectService.notes}
              onChange={e => updateProjectServiceField('notes', e.target.value)}
              placeholder="例如：生产项目接口 token 由后台配置，过期后在此更新"
              className="w-full min-h-[80px] bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] placeholder-[#93a1b2] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Sampling & Env */}
        <div className="rounded-2xl border border-[#dbe4f0] bg-white p-5 space-y-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
              <h3 className="text-sm font-medium text-[#355070] flex items-center gap-2">
                <Target className="w-4 h-4" /> 观测采样与环境
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">环境 (LIANLU_ENV)</label>
              <select
                value={config.env}
                onChange={e => updateField('env', e.target.value as TraceConfigForm['env'])}
                className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
              >
                <option value="test">test (100%采样)</option>
                <option value="pre">pre (100%采样)</option>
                <option value="prod">prod (按采样率)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">采样率 (0-1)</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={config.sampleRate}
                onChange={e => updateField('sampleRate', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
              />
            </div>
          </div>
        </div>

        {/* Span Structure Info */}
        <div className="rounded-2xl border border-[#dbe4f0] bg-white p-5 space-y-3 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
          <h3 className="text-sm font-medium text-[#355070] flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> 观测链路结构
          </h3>
          <div className="overflow-x-auto text-[11px] text-[#5f6f86] font-mono leading-6 bg-[#f8fbff] rounded-xl p-4 border border-[#e5edf7]">
            <div className="text-[#0f6fff]">xiaoqiao.zhitou.chat</div>
            <div className="ml-4 text-[#157f54]">├── xiaoqiao.zhitou.llm <span className="text-[#8ea0b8]">(model)</span></div>
            <div className="ml-4 text-[#b7791f]">├── xiaoqiao.zhitou.tool <span className="text-[#8ea0b8]">(tool - 知识库 / 搜索)</span></div>
            <div className="ml-4 text-[#c2415c]">├── xiaoqiao.zhitou.mcp <span className="text-[#8ea0b8]">(tool - 外部服务)</span></div>
            <div className="ml-4 text-[#157f54]">└── xiaoqiao.zhitou.llm <span className="text-[#8ea0b8]">(model - 最终回复)</span></div>
          </div>
          <p className="text-[10px] text-[#8ea0b8]">SDK: @cozeloop/ai | AppID: {config.appId}</p>
        </div>

        {/* Status */}
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
          config.enabled
            ? 'border-[#b8ebd0] bg-[#f2fff7]'
            : 'border-[#dbe4f0] bg-white'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${config.enabled ? 'bg-[#22c55e]' : 'bg-[#94a3b8]'}`} />
          <span className="text-xs text-[#4f647d]">
            {config.enabled
              ? `Trace 已启用 · ${config.env} 环境 · 采样率 ${(config.sampleRate * 100).toFixed(0)}%`
              : 'Trace 未启用 · 需填写 API 地址、Workspace ID、Token 后启用'}
          </span>
        </div>

        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
          serviceTest.model.state === 'success'
            ? 'border-[#b8ebd0] bg-[#f2fff7]'
            : 'border-[#fde68a] bg-[#fffaf0]'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            serviceTest.model.state === 'success'
              ? 'bg-[#22c55e]'
              : 'bg-[#f59e0b]'
          }`} />
          <span className="text-xs text-[#4f647d]">
            {serviceTest.model.state === 'success'
              ? `聊天服务已接通 · ${modelService.providerLabel} · 模型 ${modelService.modelName}`
              : serviceTest.model.state === 'fail'
                ? `聊天服务测试失败 · ${serviceTest.model.message}`
                : '聊天服务尚未验证。请保存配置后执行大模型连接测试。'}
          </span>
        </div>

        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
          serviceTest.knowledge.state === 'success'
            ? 'border-[#b8ebd0] bg-[#f2fff7]'
            : 'border-[#dbe4f0] bg-white'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            serviceTest.knowledge.state === 'success'
              ? 'bg-[#22c55e]'
              : serviceTest.knowledge.state === 'fail'
                ? 'bg-[#ef4444]'
                : 'bg-[#94a3b8]'
          }`} />
          <span className="text-xs text-[#4f647d]">
            {serviceTest.knowledge.state === 'success'
              ? (modelService.knowledgeBaseDataset
                ? `知识库已接通 · 知识库 ID ${modelService.knowledgeBaseDataset}`
                : '知识库已接通 · 当前按账号可访问范围自动检索')
              : serviceTest.knowledge.state === 'fail'
                ? `知识库测试失败 · ${serviceTest.knowledge.message}`
                : '知识库尚未验证。请补齐知识库地址和知识库 Key；知识库 ID 可选，留空时自动按账号权限覆盖全部可访问知识库。'}
          </span>
        </div>
      </div>
    </div>
  );
}
