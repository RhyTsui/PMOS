'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type {
  AutomationTemplateConfig,
  DemandPoolItem,
  DebugAutomationConfig,
  McpSkill,
  McpSkillCategory,
  SkillContract,
  SkillImportPreview,
  ScheduleFrequency,
} from '@/types';
import type { McpServerConfig } from '@/types';
import type { AiadUserInfo } from '@/lib/auth-service';
import type { AdminAccessSnapshot } from '@/lib/admin-access-types';
import type { AdminFeatureSwitch } from '@/lib/feature-switch-store';
import type {
  EffectiveModelRoute,
  ModelProfileConfig,
  ModelRouteConfig,
  ModelUseCaseDefinition,
} from '@/contracts/model-service';

// ---- Admin Tab Types ----

export type AdminTab =
  | 'overview'
  | 'service-config'
  | 'chat-display'
  | 'public-web-config'
  | 'automation-templates'
  | 'prompts'
  | 'orchestration'
  | 'entity-resolution'
  | 'intent-rules'
  | 'role-profiles'
  | 'workflow'
  | 'skills'
  | 'feature-switches'
  | 'auto-debug-config'
  | 'demand-pool'
  | 'mcp-config'
  | 'users'
  | 'operation-logs'
  | 'runtime-observability';

export type DetailTab = 'content' | 'versions' | 'bindings';

export type AdminIcon = typeof import('lucide-react')['Activity'];

export type RuntimeImpact = 'runtime' | 'display' | 'test' | 'seed' | 'cache' | 'high-risk';

export type AdminCenterKey =
  | 'home'
  | 'request-understanding'
  | 'prompt-strategy'
  | 'capability'
  | 'workflow-agent'
  | 'knowledge-memory'
  | 'domain-entity'
  | 'model-routing'
  | 'security'
  | 'observability'
  | 'rendering'
  | 'operations';

export type AdminMenuItem = {
  tab: AdminTab;
  label: string;
  description: string;
  icon: AdminIcon;
  center: AdminCenterKey;
  impacts: RuntimeImpact[];
};

export type AdminCenter = {
  key: AdminCenterKey;
  label: string;
  description: string;
  icon: AdminIcon;
  defaultTab: AdminTab;
};

export type DebugKeywordRule = {
  match_type: 'exact' | 'contains' | 'regex';
  pattern: string;
  description: string;
};

export type DebugTimeoutRule = {
  stage: string;
  timeout_seconds: number;
  retry_count: number;
};

export type DebugAutomationConfigItem = DebugAutomationConfig & {
  platform: 'android' | 'ios' | 'both';
  status: 'active' | 'inactive' | 'draft';
  keywords: DebugKeywordRule[];
  timeout_config: DebugTimeoutRule[];
  instruction_text: string;
  created_by: string;
};

export type AdminSwitchItem = AdminFeatureSwitch;

// ---- Prompt Types ----

export interface PromptConfig {
  id: string;
  key?: string;
  name: string;
  scope: string;
  intent_type: string;
  status: 'active' | 'draft' | 'archived' | 'seed' | 'fallback' | 'disabled' | 'not_configured';
  version: string;
  current_version?: number;
  updated_at: string;
  description: string;
  binding_count: number;
  content: string;
  role?: string;
  priority?: number;
  response_format?: 'text' | 'json';
  output_schema?: unknown;
  prompt_source?: 'admin' | 'seed' | 'fallback' | 'hardcoded';
  content_hash?: string;
  input_variables?: string[];
  created_by?: string;
  updated_by?: string;
  approval_status?: 'approved' | 'pending' | 'rejected' | 'not_required';
  model_use_case?: string;
  visibility?: {
    main_chat?: string[];
    card?: string[];
    right_panel?: string[];
    internal_only?: string[];
  };
  variables: { name: string; description: string; example: string }[];
  versions: { version: string; created_at: string; status: string; summary: string }[];
  bindings: { target_type: string; target_name: string; enabled: boolean }[];
  effectiveStatus?: 'active_runtime' | 'active_alias' | 'planned_draft' | 'archived_ghost' | 'hardcoded_to_managed';
  runtimeConsumer?: string;
  consumerPath?: string;
  deprecatedBy?: string;
  archiveReason?: string;
  required?: boolean;
}

export interface AdminPromptListItem {
  id: string;
  key?: string;
  name: string;
  scope: string;
  expectation: string;
  status: 'active' | 'draft' | 'archived' | 'seed' | 'fallback' | 'disabled' | 'not_configured';
  current_version: number;
  binding: {
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
  };
  updated_at: string;
  role?: string;
  priority?: number;
  response_format?: 'text' | 'json';
  output_schema?: unknown;
  prompt_source?: 'admin' | 'seed' | 'fallback' | 'hardcoded';
  content_hash?: string;
  input_variables?: string[];
  created_by?: string;
  updated_by?: string;
  approval_status?: 'approved' | 'pending' | 'rejected' | 'not_required';
  variables?: string[];
  visibility?: {
    main_chat?: string[];
    card?: string[];
    right_panel?: string[];
    internal_only?: string[];
  };
  category?: string;
  applicable_workflows?: string[];
  applicable_agents?: string[];
  applicable_models?: string[];
  enabled?: boolean;
  effectiveStatus?: 'active_runtime' | 'active_alias' | 'planned_draft' | 'archived_ghost' | 'hardcoded_to_managed';
  runtimeConsumer?: string;
  consumerPath?: string;
  deprecatedBy?: string;
  archiveReason?: string;
  required?: boolean;
}

export interface AdminPromptVersionItem {
  version: number;
  content: string;
  created_at: string;
  author: string;
  change_note: string;
}

export interface PromptHealthSummary {
  total: number;
  active: number;
  seed: number;
  fallback: number;
  disabled: number;
  ghost: number;
  hardcoded: number;
  unmanaged: number;
  ok?: boolean;
  duplicate_active_count?: number;
  missing_required_count?: number;
  report_query_prompt_suite_complete?: boolean;
  counts?: Record<string, number>;
  duplicate_active?: string[];
  missing_required?: string[];
}

export const scopeLabels: Record<string, string> = {
  route_prompt: '路由层',
  response_prompt: '回答层',
  evidence_prompt: '证据层',
  card_prompt: '卡片层',
  followup_prompt: '追问层',
  tool_explain_prompt: '工具解释层',
  routing: '路由',
  help: '使用帮助',
  diagnosis: '问题排查',
  demand: '需求沟通',
  debugging: '联调执行',
  clarification: '追问补全',
  'conversation-title': '会话标题',
  delivery: '投放交付',
  recommendation: '动态推荐',
};

// ---- Storage Keys ----

export const ADMIN_TAB_STORAGE_KEY = 'xiaoqiao-admin-tab';
export const ADMIN_PROMPT_STORAGE_KEY = 'xiaoqiao-admin-prompt-id';
export const ADMIN_DEBUG_CONFIG_STORAGE_KEY = 'xiaoqiao-admin-debug-config-id';
export const ADMIN_DEMAND_STORAGE_KEY = 'xiaoqiao-admin-demand-id';
export const ADMIN_MCP_STORAGE_KEY = 'xiaoqiao-admin-mcp-id';
export const ADMIN_SKILL_STORAGE_KEY = 'xiaoqiao-admin-skill-id';
export const ADMIN_WORKFLOW_STORAGE_KEY = 'xiaoqiao-admin-workflow-id';

// ---- Admin Menu & Centers ----

export const ADMIN_TABS: AdminTab[] = [
  'overview',
  'service-config',
  'chat-display',
  'public-web-config',
  'automation-templates',
  'prompts',
  'orchestration',
  'entity-resolution',
  'intent-rules',
  'role-profiles',
  'workflow',
  'skills',
  'feature-switches',
  'auto-debug-config',
  'demand-pool',
  'mcp-config',
  'users',
  'operation-logs',
  'runtime-observability',
];

export const RUNTIME_IMPACT_LABELS: Record<RuntimeImpact, string> = {
  runtime: '运行时生效',
  display: '仅展示',
  test: '测试入口',
  seed: '默认配置',
  cache: '本地记忆',
  'high-risk': '高风险配置',
};

export const RUNTIME_IMPACT_STYLES: Record<RuntimeImpact, string> = {
  runtime: 'border-[#b7ebc6] bg-[#f0fff5] text-[#087a2f]',
  display: 'border-[#dbe4f0] bg-[#f8fbff] text-[#5b6b82]',
  test: 'border-[#c8dcff] bg-[#eef5ff] text-[#0f6fff]',
  seed: 'border-[#f8d7a8] bg-[#fff8e8] text-[#9a5a00]',
  cache: 'border-[#d7cef8] bg-[#f7f3ff] text-[#5f3bb5]',
  'high-risk': 'border-[#ffc9c9] bg-[#fff2f2] text-[#b42318]',
};

export const PROMPT_LAYER_SCOPE_ORDER = [
  'route_prompt',
  'response_prompt',
  'evidence_prompt',
  'card_prompt',
  'followup_prompt',
  'tool_explain_prompt',
];

export const ADMIN_PROMPT_SCOPE_LABELS: Record<string, string> = {
  route_prompt: '路由层',
  response_prompt: '回答层',
  evidence_prompt: '证据层',
  card_prompt: '卡片层',
  followup_prompt: '追问层',
  tool_explain_prompt: '工具解释层',
  routing: '路由',
  help: '使用帮助',
  diagnosis: '问题排查',
  demand: '需求沟通',
  debugging: '联调执行',
  clarification: '追问补全',
  'conversation-title': '会话标题',
  delivery: '投放交付',
  recommendation: '动态推荐',
};

export const statusStyles: Record<string, string> = {
  active: 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]',
  draft: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]',
  archived: 'bg-[rgba(100,116,139,0.15)] text-[#64748B]',
  seed: 'bg-[rgba(15,111,255,0.1)] text-[#0f6fff]',
  fallback: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]',
  disabled: 'bg-[rgba(100,116,139,0.15)] text-[#64748B]',
  not_configured: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]',
  inactive: 'bg-[rgba(100,116,139,0.15)] text-[#64748B]',
  connected: 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]',
  disconnected: 'bg-[rgba(100,116,139,0.15)] text-[#64748B]',
  error: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]',
  pending: 'bg-[rgba(100,116,139,0.15)] text-[#64748B]',
};

export const statusLabels: Record<string, string> = {
  active: '已启用',
  inactive: '已停用',
  draft: '草稿',
  archived: '已归档',
  seed: '初始版本',
  fallback: '备用',
  disabled: '已停用',
  not_configured: '未配置',
  connected: '已连接',
  disconnected: '未连接',
  error: '异常',
  pending: '待配置',
};

export const platformLabels: Record<string, string> = {
  all: '全部终端',
  android: '安卓',
  ios: 'iOS',
  both: '双端',
};

export const environmentLabels: Record<string, string> = {
  all: '全部环境',
  test: '测试',
  staging: '预发',
  production: '生产',
};

export const executorTypeLabels: Record<string, string> = {
  standard: '标准执行',
  visual: '视觉执行',
  hybrid: '混合执行',
  model: '模型驱动',
};

export const executorTypeStyles: Record<string, string> = {
  standard: 'bg-[rgba(15,111,255,0.1)] text-[#0f6fff]',
  visual: 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]',
  hybrid: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]',
  model: 'bg-[rgba(100,116,139,0.15)] text-[#64748B]',
};

export const AUTOMATION_TEMPLATE_STATUS_OPTIONS = [
  { value: 'active', label: '已上线' },
  { value: 'draft', label: '草稿' },
  { value: 'archived', label: '已归档' },
];

export const AUTOMATION_TEMPLATE_TYPE_OPTIONS = [
  { value: 'daily_report', label: '日报' },
  { value: 'weekly_report', label: '周报' },
  { value: 'monthly_report', label: '月报' },
  { value: 'traffic_classification', label: '流量分类' },
  { value: 'table_merge', label: '表格合并' },
  { value: 'tag_summary', label: '标签汇总' },
  { value: 'custom', label: '自定义' },
];

export const AUTOMATION_TEMPLATE_FREQUENCY_OPTIONS = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'custom_cron', label: '自定义 Cron' },
];

export const EMPTY_AUTOMATION_TEMPLATE: AutomationTemplateConfig = {
  id: '',
  name: '',
  description: '',
  template_type: 'custom',
  status: 'draft',
  default_frequency: 'daily',
  default_cron_expression: '',
  metrics: [],
  dimensions: [],
  filters: [],
  output_blocks: [],
  prompt_template: '',
  created_by: '',
  created_at: Date.now(),
  updated_at: Date.now(),
};

export const defaultDebugRuntimeConfig = {
  media_config: {
    username: '',
    password: '',
    default_account: '',
    event_asset_url: '',
    postback_result_view: '',
    aadvid: '',
    target_channel: '',
  },
  channel_config: {
    app_package: '',
    app_activity: '',
    deeplink: '',
    auth_keyword: '',
    feed_keyword: '',
    action_keyword: '',
    max_swipe_count: 0,
    keyword_settle_seconds: 0,
    install_password: '',
    game_package: '',
  },
  game_config: {
    package_name: '',
    login_type: '',
    account: '',
    password: '',
  },
  mobile_env: {
    device_id: '',
  },
};

// ---- Shared Utility Functions ----

export function readClientStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeClientStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage failures
  }
}

export function readStoredAdminTab(): AdminTab {
  if (typeof window !== 'undefined') {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab && ADMIN_TABS.includes(tab as AdminTab)) {
      return tab as AdminTab;
    }
  }
  const stored = readClientStorage(ADMIN_TAB_STORAGE_KEY);
  return (stored && ADMIN_TABS.includes(stored as AdminTab) ? stored : 'overview') as AdminTab;
}

export function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function splitAdminList(value: string): string[] {
  return value
    .split(/[\n,，]/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function joinAdminList(value: string[] | string | undefined): string {
  if (!value) return '';
  if (Array.isArray(value)) return value.join('\n');
  return String(value);
}

export function normalizeDebugAutomationConfigItem(input: Partial<DebugAutomationConfigItem>): DebugAutomationConfigItem {
  const rawPlatform = input.platform || (input.terminal === 'android' ? 'android' : 'ios');
  const platform: DebugAutomationConfigItem['platform'] =
    rawPlatform === 'both' ? 'both' : rawPlatform === 'android' ? 'android' : 'ios';
  const status: DebugAutomationConfigItem['status'] = input.status === 'inactive' || input.status === 'draft'
    ? input.status
    : input.is_active === false
      ? 'inactive'
      : 'active';
  const parsedKeywords: DebugKeywordRule[] = Array.isArray(input.keywords)
    ? input.keywords
    : parseJson<DebugKeywordRule[] | string[]>(input.keywords_json, []).map((item) => (
        typeof item === 'string'
          ? { match_type: 'contains' as const, pattern: item, description: item }
          : {
              match_type: item.match_type === 'exact' || item.match_type === 'contains' || item.match_type === 'regex'
                ? item.match_type
                : 'contains',
              pattern: String(item.pattern || ''),
              description: String(item.description || item.pattern || ''),
            }
      ));
  const parsedTimeouts = Array.isArray(input.timeout_config)
    ? input.timeout_config
    : parseJson<DebugTimeoutRule[] | Array<{ stage?: string; timeout_seconds?: number; retry_count?: number }>>(input.timeouts_json, []).map((item, index) => ({
        stage: String(item.stage || `stage-${index + 1}`),
        timeout_seconds: Number(item.timeout_seconds || 0),
        retry_count: Number(item.retry_count || 0),
      }));
  const instructionText = String((input as Record<string, unknown>).instruction_text || input.scope || '');
  return {
    ...defaultDebugRuntimeConfig,
    ...input,
    id: input.id || `debug-config-${Date.now()}`,
    name: input.name || '未命名调试配置',
    media: input.media || '',
    terminal: input.terminal || 'android',
    platform,
    environment: input.environment || 'test',
    executor_type: input.executor_type || 'standard',
    vision_provider: input.vision_provider || 'builtin',
    media_config: { ...defaultDebugRuntimeConfig.media_config, ...(input.media_config || {}) },
    channel_config: { ...defaultDebugRuntimeConfig.channel_config, ...(input.channel_config || {}) },
    game_config: { ...defaultDebugRuntimeConfig.game_config, ...(input.game_config || {}) },
    mobile_env: { ...defaultDebugRuntimeConfig.mobile_env, ...(input.mobile_env || {}) },
    keywords_json: input.keywords_json || '[]',
    timeouts_json: input.timeouts_json || '[]',
    is_active: input.is_active ?? true,
    scope: input.scope || 'global',
    updated_at: input.updated_at || new Date().toLocaleString('zh-CN', { hour12: false }),
    created_by: input.created_by || 'system',
    status,
    keywords: parsedKeywords,
    timeout_config: parsedTimeouts,
    instruction_text: instructionText,
  };
}

// ---- Prompt Helper Functions ----

export function buildPromptBindings(prompt: AdminPromptListItem): PromptConfig['bindings'] {
  const bindings: PromptConfig['bindings'] = [];
  if (prompt.binding.workflow) {
    bindings.push({ target_type: 'workflow', target_name: prompt.binding.workflow, enabled: true });
  }
  if (prompt.binding.agent) {
    bindings.push({ target_type: 'agent', target_name: prompt.binding.agent, enabled: true });
  }
  if (prompt.binding.tool) {
    bindings.push({ target_type: 'tool', target_name: prompt.binding.tool, enabled: true });
  }
  if (prompt.binding.modelUseCase) {
    bindings.push({ target_type: 'model_use_case', target_name: prompt.binding.modelUseCase, enabled: prompt.binding.status !== 'disabled' });
  }
  for (const item of prompt.applicable_workflows || []) {
    if (!bindings.some(binding => binding.target_type === 'workflow' && binding.target_name === item)) {
      bindings.push({ target_type: 'workflow', target_name: item, enabled: true });
    }
  }
  for (const item of prompt.applicable_agents || []) {
    if (!bindings.some(binding => binding.target_type === 'agent' && binding.target_name === item)) {
      bindings.push({ target_type: 'agent', target_name: item, enabled: true });
    }
  }
  for (const item of prompt.applicable_models || []) {
    if (!bindings.some(binding => binding.target_type === 'model' && binding.target_name === item)) {
      bindings.push({ target_type: 'model', target_name: item, enabled: true });
    }
  }
  return bindings;
}

export function buildPromptVersions(prompt: AdminPromptListItem, versions: AdminPromptVersionItem[]): PromptConfig['versions'] {
  const sorted = versions.slice().sort((a, b) => a.version - b.version);
  return sorted.map((item) => ({
    version: `v${item.version}`,
    created_at: item.created_at,
    status: item.version === prompt.current_version ? 'active' : 'archived',
    summary: item.change_note || item.author || '版本更新',
  }));
}

export function buildPromptView(prompt: AdminPromptListItem, versions: AdminPromptVersionItem[] = []): PromptConfig {
  const normalizedVersions = versions.length > 0 ? versions : [{
    version: prompt.current_version,
    content: prompt.expectation,
    created_at: prompt.updated_at,
    author: 'system',
    change_note: '初始化版本',
  }];
  const selectedVersion = normalizedVersions.find(item => item.version === prompt.current_version)
    || normalizedVersions[normalizedVersions.length - 1]
    || normalizedVersions[0];
  const bindings = buildPromptBindings(prompt);
  return {
    id: prompt.id,
    key: prompt.key || prompt.id,
    name: prompt.name,
    scope: prompt.scope,
    intent_type: prompt.category || prompt.scope,
    status: prompt.status,
    version: `v${prompt.current_version}`,
    current_version: prompt.current_version,
    updated_at: prompt.updated_at,
    description: prompt.expectation,
    binding_count: bindings.length,
    content: selectedVersion?.content || prompt.expectation,
    role: prompt.role || prompt.binding.agent,
    priority: prompt.priority,
    response_format: prompt.response_format,
    output_schema: prompt.output_schema || prompt.binding.outputSchema,
    prompt_source: prompt.prompt_source || prompt.binding.promptSource,
    content_hash: prompt.content_hash || prompt.binding.contentHash,
    input_variables: prompt.input_variables || prompt.binding.inputVariables,
    created_by: prompt.created_by || prompt.binding.createdBy,
    updated_by: prompt.updated_by || prompt.binding.updatedBy,
    approval_status: prompt.approval_status || prompt.binding.approvalStatus,
    model_use_case: prompt.binding.modelUseCase,
    visibility: prompt.visibility,
    variables: (prompt.input_variables || prompt.binding.inputVariables || prompt.variables || []).map((name) => ({ name, description: '运行时变量', example: `{{${name}}}` })),
    versions: buildPromptVersions(prompt, normalizedVersions),
    bindings,
    effectiveStatus: prompt.effectiveStatus,
    runtimeConsumer: prompt.runtimeConsumer,
    consumerPath: prompt.consumerPath,
    deprecatedBy: prompt.deprecatedBy,
    archiveReason: prompt.archiveReason,
    required: prompt.required,
  };
}

export const skillCategoryLabels: Record<string, string> = {
  report_query: '问数',
  diagnosis: '排查',
  debugging: '联调',
  delivery: '投放',
  monitoring: '监控',
  prediction: '预测',
  help: '帮助',
  demand: '需求',
  general: '通用',
};
