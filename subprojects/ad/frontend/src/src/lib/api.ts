/**
 * Unified API Client for XiaoQiao Ad OS
 * 
 * Supports two modes:
 * - local: Uses local runtime routes and stores (default)
 * - service: Calls real backend services configured via MCP
 * 
 * Mode is controlled by:
 * 1. Environment variable NEXT_PUBLIC_API_MODE (build-time)
 * 2. Runtime toggle via setApiMode() (persisted to localStorage)
 */

// ==========================================
// Mode Management
// ==========================================

export type ApiMode = 'local' | 'service';
type RequestApiMode = ApiMode;

const MODE_KEY = 'xiaoqiao_api_mode';

let _currentMode: ApiMode = 
  (typeof window !== 'undefined' && localStorage.getItem(MODE_KEY) as ApiMode) ||
  (process.env.NEXT_PUBLIC_API_MODE as ApiMode) ||
  'local';

export function getApiMode(): ApiMode {
  return _currentMode;
}

export function setApiMode(mode: ApiMode): void {
  _currentMode = mode;
  if (typeof window !== 'undefined') {
    localStorage.setItem(MODE_KEY, mode);
  }
}

export function isLocalMode(): boolean {
  return _currentMode === 'local';
}

// ==========================================
// Generic Fetch Wrapper
// ==========================================

interface FetchOptions extends Omit<RequestInit, 'mode'> {
  /** Override API mode for this single request (not RequestMode) */
  apiMode?: RequestApiMode;
}

/**
 * Unified fetch: in local mode, calls /api/xiaoqiao/* which uses local runtime stores;
 * in service mode, calls the real backend configured via MCP endpoints.
 */
export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { apiMode, ...fetchOpts } = options;
  const activeMode = apiMode || _currentMode;

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const url = activeMode === 'service'
    ? `${baseUrl}/api/v1/xiaoqiao${path}`
    : `/api/xiaoqiao${path}`;
  const isFormData = typeof FormData !== 'undefined' && fetchOpts.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(fetchOpts.headers || {}),
  };

  const res = await fetch(url, {
    ...fetchOpts,
    cache: fetchOpts.cache ?? 'no-store',
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, res.statusText, body);
  }

  return res.json() as Promise<T>;
}

// ==========================================
// Error Class
// ==========================================

export class ApiError extends Error {
  status: number;
  statusText: string;
  body: string;

  constructor(status: number, statusText: string, body: string) {
    const detail = body ? ` - ${body.slice(0, 300)}` : '';
    super(`API Error ${status}: ${statusText}${detail}`);
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

// ==========================================
// Typed API Methods
// ==========================================

import type {
  WorkspaceResponse,
  Conversation,
  Message,
  Task,
  TaskContext,
  ScheduledTask,
  ScheduledTaskExecution,
  AutomationNotification,
  AutomationDraftSuggestion,
  AutomationExecutionRecord,
  WorkflowResult,
  AttachmentRecord,
  EvidenceItem,
  PromptConfig,
  PromptVersion,
  PromptBinding,
  FeatureSwitch,
  DemandPoolItem,
  DebugAutomationTask,
  DebugAutomationConfig,
  DebugExecutionStep,
  DebugExecutionResult,
  McpServerConfig,
  McpSkill,
  SkillContract,
  SkillImportPackage,
  SkillImportResult,
  ReportDraft,
  ReportTemplate,
} from '@/types';

interface ConversationTitleRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
  latest_messages?: Array<{ role: string; content: string }>;
  current_title?: string;
  topic_summary?: Record<string, string | undefined>;
  mode?: 'generate' | 'update';
}

type ConversationUpdateRequest = Partial<Conversation> & {
  normalize_title?: boolean;
};

export interface ConversationTitleResponse {
  title: string;
  source: 'model' | 'fallback' | 'model_unavailable';
  prompt_id?: string;
  prompt_source?: 'managed' | 'hardcoded' | 'admin' | 'seed' | 'fallback';
  error_message?: string;
}

export type ReportCapabilityKind =
  | 'identifier_normalization'
  | 'context_lookup'
  | 'knowledge_lookup'
  | 'report_query'
  | 'workflow'
  | 'general';

export type ReportCapabilityContractVersion = 'capability-contract/v1';

export interface ReportToolCapabilityResponse {
  capability_id: string;
  server_id: string;
  server_name: string;
  tool_name: string;
  description?: string;
  report_domains: string[];
  required_fields: string[];
  optional_fields?: string[];
  required_dictionary_tools: string[];
  supported_dimensions: string[];
  supported_granularity: Array<'hour' | 'day' | 'natural_week' | 'natural_month'>;
  supported_entity_types: string[];
  identifier_keys: string[];
  label_keys: string[];
  output_adapter?: Record<string, string[] | undefined>;
  slot_mappings?: Array<{
    entity_type: string;
    identifier_key: string;
    target_keys: string[];
    value_format?: 'array' | 'string' | 'csv';
    required?: boolean;
  }>;
  route_terms?: string[];
  capability_kind: ReportCapabilityKind;
  contract_version: ReportCapabilityContractVersion;
  confidence: 'schema_confirmed' | 'description_inferred' | 'manual_override';
  authority?: {
    authoritative_for: string[];
  };
}

export interface ReportCapabilityManifestResponse {
  manifest_version: string;
  generated_at: string;
  tools: ReportToolCapabilityResponse[];
  dictionary_tools: ReportToolCapabilityResponse[];
  warnings: Array<{
    code: string;
    message: string;
    server_id?: string;
    tool_name?: string;
  }>;
  summary: {
    report_tool_count: number;
    dictionary_tool_count: number;
    warning_count: number;
    domains: Record<string, number>;
  };
}

export interface ReportCapabilityOverrideConfigResponse {
  schema_version: 1;
  enabled: boolean;
  overrides: Array<{
    id: string;
    enabled: boolean;
    capability_id?: string;
    server_id?: string;
    tool_name?: string;
    report_domains?: string[];
    capability_kind?: ReportCapabilityKind;
    supported_entity_types?: string[];
    identifier_keys?: string[];
    label_keys?: string[];
    output_adapter?: Record<string, string[] | undefined>;
    slot_mappings?: Array<{
      entity_type: string;
      identifier_key: string;
      target_keys: string[];
      value_format?: 'array' | 'string' | 'csv';
      required?: boolean;
    }>;
    required_dictionary_tools?: string[];
    route_terms?: string[];
    notes?: string;
  }>;
  updated_at: string;
}

export interface ReportQueryPolicyResponse {
  schema_version: 1;
  enabled: boolean;
  default_project_source: 'conversation_context';
  lookup_tool_step_key: string;
  lookup_tool_keywords: string[];
  trigger_terms: string[];
  exclude_terms: string[];
  require_chinese_project_name: boolean;
  skip_when_app_id_present: boolean;
  tool_selection_rules: Array<Record<string, unknown>>;
  schema_adapters: Array<Record<string, unknown>>;
  capabilities: Array<Record<string, unknown>>;
  semantic_defaults: {
    promotion_source: string;
    roi_data_type: string;
    day_time_type: string;
    week_time_type: string;
    month_time_type: string;
    hour_time_type: string;
    base_time_type: string;
    media_aliases: Record<string, string[]>;
    terminal_aliases: Record<string, string[]>;
    team_aliases: Record<string, string[]>;
    app_package_type_aliases: Record<string, string[]>;
    account_aliases: Record<string, string[]>;
    package_aliases: Record<string, string[]>;
    optimizer_aliases: Record<string, string[]>;
  };
  updated_at: string;
}

export interface EntityResolutionConfigResponse {
  schema_version: 1;
  enabled: boolean;
  entries: Array<{
    id: string;
    entity_type: 'media' | 'app' | 'campaign' | 'material' | 'account' | 'team' | 'package' | 'terminal';
    canonical: string;
    aliases: string[];
    priority: number;
    enabled: boolean;
    source: string;
    notes?: string;
    updated_at?: string;
  }>;
  updated_at: string;
}

// ---- Workspace ----
export const workspaceApi = {
  get: () => apiFetch<WorkspaceResponse>('/workspace'),
};

// ---- Conversations ----
export const conversationApi = {
  create: (data: { title?: string; type?: string; project_binding?: import('@/types').ProjectBinding }) =>
    apiFetch<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  list: (options: { limit?: number; cursor?: string; project_refs?: string[] } = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.project_refs?.length) params.set('project_refs', options.project_refs.join(','));
    const query = params.toString();
    return apiFetch<Conversation[]>(`/conversations${query ? `?${query}` : ''}`);
  },
  update: (id: string, data: ConversationUpdateRequest) =>
    apiFetch<Conversation>(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}`, {
      method: 'DELETE',
    }),
  getMessages: (id: string, options: { limit?: number; before?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.before) params.set('before', options.before);
    const query = params.toString();
    return apiFetch<Message[]>(`/conversations/${id}/messages${query ? `?${query}` : ''}`);
  },
  sendMessage: (id: string, data: Omit<Partial<Message>, 'attachments'> & { content: string; role?: 'user' | 'assistant'; message_type?: string; attachments?: string[] }) =>
    apiFetch<Message>(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateTitle: (id: string, data: ConversationTitleRequest) =>
    apiFetch<ConversationTitleResponse>(`/conversations/${id}/title`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadAttachment: (id: string, formData: FormData) =>
    apiFetch<AttachmentRecord>(`/conversations/${id}/attachments`, {
      method: 'POST',
      body: formData as unknown as BodyInit,
      headers: {},  // let browser set Content-Type for FormData
    }),
};

// ---- Tasks ----
export const taskApi = {
  list: (params?: { status?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    const query = qs.toString();
    return apiFetch<Task[]>(`/tasks${query ? `?${query}` : ''}`);
  },
  get: (id: string) => apiFetch<Task>(`/tasks/${id}`),
  getResults: (id: string) => apiFetch<WorkflowResult[]>(`/tasks/${id}/results`),
  getContext: (id: string) => apiFetch<TaskContext>(`/tasks/${id}/context`),
  updateContext: (id: string, data: Partial<TaskContext>) =>
    apiFetch<TaskContext>(`/tasks/${id}/context`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getEvidence: (id: string) => apiFetch<EvidenceItem[]>(`/tasks/${id}/evidence`),
  getRuns: (id: string) => apiFetch<Array<Record<string, unknown>>>(`/tasks/${id}/runs`),
};

export const scheduledTaskApi = {
  list: (params?: { status?: string; task_type?: string; project_refs?: string[] }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.task_type) qs.set('task_type', params.task_type);
    if (params?.project_refs?.length) qs.set('project_refs', params.project_refs.join(','));
    const query = qs.toString();
    return apiFetch<ScheduledTask[]>(`/scheduled-tasks${query ? `?${query}` : ''}`);
  },
  get: (id: string) => apiFetch<ScheduledTask>(`/scheduled-tasks/${id}`),
  create: (data: Partial<ScheduledTask>) =>
    apiFetch<ScheduledTask>('/scheduled-tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ScheduledTask>) =>
    apiFetch<ScheduledTask>(`/scheduled-tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/scheduled-tasks/${id}`, {
      method: 'DELETE',
    }),
  pause: (id: string) =>
    apiFetch<ScheduledTask>(`/scheduled-tasks/${id}/pause`, {
      method: 'POST',
    }),
  resume: (id: string) =>
    apiFetch<ScheduledTask>(`/scheduled-tasks/${id}/resume`, {
      method: 'POST',
    }),
  run: (id: string) =>
    apiFetch<{
      task: ScheduledTask;
      execution: ScheduledTaskExecution;
      artifact?: { id: string; url: string; name: string };
      notificationId: string;
    }>(`/scheduled-tasks/${id}/run`, {
      method: 'POST',
    }),
};

export const automationApi = {
  list: (params?: { status?: string; task_type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.task_type) qs.set('task_type', params.task_type);
    const query = qs.toString();
    return apiFetch<ScheduledTask[]>(`/automations${query ? `?${query}` : ''}`);
  },
  get: (id: string) => apiFetch<ScheduledTask>(`/automations/${id}`),
  create: (data: Partial<ScheduledTask>) =>
    apiFetch<ScheduledTask>('/automations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ScheduledTask>) =>
    apiFetch<ScheduledTask>(`/automations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/automations/${id}`, {
      method: 'DELETE',
    }),
  run: (id: string) =>
    apiFetch<{
      task: ScheduledTask;
      execution: ScheduledTaskExecution;
      artifact?: { id: string; url: string; name: string };
      notificationId: string;
    }>(`/automations/${id}/run`, {
      method: 'POST',
    }),
  draft: (data: { conversation_id?: string; attachment_ids?: string[]; message?: string; template_id?: string }) =>
    apiFetch<AutomationDraftSuggestion>('/automations/draft', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const automationExecutionApi = {
  list: (taskId?: string, projectRefs?: string[]) => {
    const qs = new URLSearchParams();
    if (taskId) qs.set('task_id', taskId);
    if (projectRefs?.length) qs.set('project_refs', projectRefs.join(','));
    const query = qs.toString();
    return apiFetch<AutomationExecutionRecord[]>(`/automation-executions${query ? `?${query}` : ''}`);
  },
  get: (id: string) => apiFetch<AutomationExecutionRecord>(`/automation-executions/${id}`),
  cancel: (id: string) => apiFetch<AutomationExecutionRecord>(`/automation-executions/${id}/cancel`, { method: 'POST' }),
  retry: (id: string) => apiFetch<AutomationExecutionRecord | ScheduledTaskExecution>(`/automation-executions/${id}/retry`, { method: 'POST' }),
};

export const notificationApi = {
  list: (limit = 50) => apiFetch<AutomationNotification[]>(`/notifications?limit=${limit}`),
  unreadCount: () => apiFetch<{ unread_count: number }>('/notifications/unread-count'),
  markRead: (ids?: string[]) =>
    apiFetch<{ notifications: AutomationNotification[] }>('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify(ids ? { ids } : {}),
    }),
};

// ---- Admin: Prompts ----
export const promptApi = {
  list: (params?: { category?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString();
    return apiFetch<PromptConfig[]>(`/admin/prompts${query ? `?${query}` : ''}`);
  },
  get: (id: string) => apiFetch<PromptConfig>(`/admin/prompts/${id}`),
  create: (data: Partial<PromptConfig>) =>
    apiFetch<PromptConfig>('/admin/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<PromptConfig>) =>
    apiFetch<PromptConfig>(`/admin/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getVersions: (id: string) => apiFetch<PromptVersion[]>(`/admin/prompts/${id}/versions`),
  updateBinding: (id: string, data: PromptBinding) =>
    apiFetch<PromptBinding>(`/admin/prompts/${id}/binding`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ---- Admin: Skill Contracts / Logs ----
export const adminReadApi = {
  getSkills: () => apiFetch<McpSkill[]>('/skills'),
  getSkillContracts: () => apiFetch<SkillContract[]>('/skill-contracts'),
  getOperationLogs: (params?: { module?: string; action?: string; targetType?: string; actor?: string; keyword?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.module) qs.set('module', params.module);
    if (params?.action) qs.set('action', params.action);
    if (params?.targetType) qs.set('target_type', params.targetType);
    if (params?.actor) qs.set('actor', params.actor);
    if (params?.keyword) qs.set('keyword', params.keyword);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiFetch<{ logs: Array<Record<string, unknown>> }>(`/admin/operation-logs${query ? `?${query}` : ''}`);
  },
};

// ---- Admin: Feature Switches ----
export const switchApi = {
  list: () => apiFetch<FeatureSwitch[]>('/admin/feature-switches'),
  update: (key: string, data: Partial<FeatureSwitch>) =>
    apiFetch<FeatureSwitch>(`/admin/feature-switches/${key}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ---- Admin: Debug Automation ----
export const debugAutomationApi = {
  listConfigs: () => apiFetch<DebugAutomationConfig[]>('/admin/debug-automation/configs'),
  createConfig: (data: Partial<DebugAutomationConfig>) =>
    apiFetch<DebugAutomationConfig>('/admin/debug-automation/configs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateConfig: (id: string, data: Partial<DebugAutomationConfig>) =>
    apiFetch<DebugAutomationConfig>(`/admin/debug-automation/configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  listTasks: () => apiFetch<DebugAutomationTask[]>('/debug-automation/tasks'),
  getTask: (id: string) => apiFetch<DebugAutomationTask>(`/debug-automation/tasks/${id}`),
  createTask: (data: Record<string, unknown>) =>
    apiFetch<DebugAutomationTask>('/debug-automation/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  startTask: (id: string) =>
    apiFetch<DebugAutomationTask>(`/debug-automation/tasks/${id}/start`, { method: 'POST' }),
  pauseTask: (id: string) =>
    apiFetch<DebugAutomationTask>(`/debug-automation/tasks/${id}/pause`, { method: 'POST' }),
  resumeTask: (id: string) =>
    apiFetch<DebugAutomationTask>(`/debug-automation/tasks/${id}/resume`, { method: 'POST' }),
  takeoverTask: (id: string) =>
    apiFetch<DebugAutomationTask>(`/debug-automation/tasks/${id}/takeover`, { method: 'POST' }),
  getSteps: (id: string) => apiFetch<DebugExecutionStep[]>(`/debug-automation/tasks/${id}/steps`),
  getResult: (id: string) => apiFetch<DebugExecutionResult>(`/debug-automation/tasks/${id}/result`),
};

// ---- Admin: Demand Pool ----
export const demandPoolApi = {
  list: () => apiFetch<DemandPoolItem[]>('/admin/demand-pool'),
};

// ---- Admin: MCP Config ----
export const mcpApi = {
  list: (params?: { category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    const query = qs.toString();
    return apiFetch<McpServerConfig[]>(`/admin/mcp-servers${query ? `?${query}` : ''}`, {
      apiMode: 'local',
    });
  },
  get: (id: string) => apiFetch<McpServerConfig>(`/admin/mcp-servers/${id}`, {
    apiMode: 'local',
  }),
  create: (data: Partial<McpServerConfig>) =>
    apiFetch<McpServerConfig>('/admin/mcp-servers', {
      method: 'POST',
      body: JSON.stringify(data),
      apiMode: 'local',
    }),
  update: (id: string, data: Partial<McpServerConfig>) =>
    apiFetch<McpServerConfig>(`/admin/mcp-servers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      apiMode: 'local',
    }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/admin/mcp-servers/${id}`, {
      method: 'DELETE',
      apiMode: 'local',
    }),
  testConnection: (id: string) =>
    apiFetch<{ success: boolean; latency_ms: number }>(`/admin/mcp-servers/${id}/test`, {
      method: 'POST',
      apiMode: 'local',
    }),
  getReportCapabilityManifest: () =>
    apiFetch<ReportCapabilityManifestResponse>('/admin/report-capability-manifest', {
      apiMode: 'local',
    }),
  getReportCapabilityOverrides: () =>
    apiFetch<ReportCapabilityOverrideConfigResponse>('/admin/report-capability-overrides', {
      apiMode: 'local',
    }),
  updateReportCapabilityOverrides: (data: Partial<ReportCapabilityOverrideConfigResponse>) =>
    apiFetch<ReportCapabilityOverrideConfigResponse>('/admin/report-capability-overrides', {
      method: 'PUT',
      body: JSON.stringify(data),
      apiMode: 'local',
    }),
  getReportQueryPolicy: () =>
    apiFetch<ReportQueryPolicyResponse>('/admin/report-query-policy', {
      apiMode: 'local',
    }),
  updateReportQueryPolicy: (data: Partial<ReportQueryPolicyResponse>) =>
    apiFetch<ReportQueryPolicyResponse>('/admin/report-query-policy', {
      method: 'PUT',
      body: JSON.stringify(data),
      apiMode: 'local',
    }),
  getEntityResolutionConfig: () =>
    apiFetch<EntityResolutionConfigResponse>('/admin/entity-resolution-config', {
      apiMode: 'local',
    }),
  updateEntityResolutionConfig: (data: Partial<EntityResolutionConfigResponse>) =>
    apiFetch<EntityResolutionConfigResponse>('/admin/entity-resolution-config', {
      method: 'PUT',
      body: JSON.stringify(data),
      apiMode: 'local',
    }),
};

// ---- Admin: Auto Report ----
export const reportApi = {
  listTemplates: () =>
    apiFetch<ReportTemplate[]>('/admin/report-templates', { apiMode: 'local' }),
  createTemplate: (data: Partial<ReportTemplate>) =>
    apiFetch<ReportTemplate>('/admin/report-templates', {
      method: 'POST',
      body: JSON.stringify(data),
      apiMode: 'local',
    }),
  updateTemplate: (id: string, data: Partial<ReportTemplate>) =>
    apiFetch<ReportTemplate>(`/admin/report-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      apiMode: 'local',
    }),
  deleteTemplate: (id: string) =>
    apiFetch<{ success: boolean }>(`/admin/report-templates/${id}`, {
      method: 'DELETE',
      apiMode: 'local',
    }),
  listDrafts: (templateId?: string) => {
    const qs = new URLSearchParams();
    if (templateId) qs.set('templateId', templateId);
    const query = qs.toString();
    return apiFetch<ReportDraft[]>(`/admin/report-template-results${query ? `?${query}` : ''}`, {
      apiMode: 'local',
    });
  },
  updateDraft: (id: string, data: Partial<ReportDraft>) =>
    apiFetch<ReportDraft>(`/admin/report-template-results/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      apiMode: 'local',
    }),
  generateDraft: (data: { templateId: string; reportDate: string }) =>
    apiFetch<ReportDraft>('/admin/report-template-results/generate', {
      method: 'POST',
      body: JSON.stringify(data),
      apiMode: 'local',
    }),
  runSession: (data: { message: string; attachmentSummaries?: string[]; reportDate?: string }) =>
    apiFetch<{
      assistantMessage: string;
      analysis: Record<string, unknown>;
      draft?: ReportDraft;
      metricCatalog: string[];
      missingClarifications: string[];
      actionHints: string[];
      shareLink?: string;
      screenshotHint?: string;
    }>('/report-session', {
      method: 'POST',
      body: JSON.stringify(data),
      apiMode: 'local',
    }),
};

// ---- Unified API (convenience) ----
export const xiaoqiaoApi = {
  getWorkspace: workspaceApi.get,
  // Conversations
  createConversation: conversationApi.create,
  getConversations: conversationApi.list,
  updateConversation: conversationApi.update,
  deleteConversation: conversationApi.delete,
  getMessages: conversationApi.getMessages,
  sendMessage: conversationApi.sendMessage,
  generateConversationTitle: conversationApi.generateTitle,
  uploadAttachment: conversationApi.uploadAttachment,
  // Tasks
  getTasks: taskApi.list,
  getTask: taskApi.get,
  getTaskResults: taskApi.getResults,
  getTaskContext: taskApi.getContext,
  updateTaskContext: taskApi.updateContext,
  getTaskEvidence: taskApi.getEvidence,
  getTaskRuns: taskApi.getRuns,
  // Scheduled Tasks / Automation
  getScheduledTasks: scheduledTaskApi.list,
  getScheduledTask: scheduledTaskApi.get,
  createScheduledTask: scheduledTaskApi.create,
  updateScheduledTask: scheduledTaskApi.update,
  deleteScheduledTask: scheduledTaskApi.delete,
  pauseScheduledTask: scheduledTaskApi.pause,
  resumeScheduledTask: scheduledTaskApi.resume,
  runScheduledTask: scheduledTaskApi.run,
  getAutomations: automationApi.list,
  getAutomation: automationApi.get,
  createAutomation: automationApi.create,
  updateAutomation: automationApi.update,
  deleteAutomation: automationApi.delete,
  runAutomation: automationApi.run,
  generateAutomationDraft: automationApi.draft,
  getAutomationExecutions: automationExecutionApi.list,
  getAutomationExecution: automationExecutionApi.get,
  cancelAutomationExecution: automationExecutionApi.cancel,
  retryAutomationExecution: automationExecutionApi.retry,
  listNotifications: notificationApi.list,
  getUnreadNotificationCount: notificationApi.unreadCount,
  markNotificationsRead: notificationApi.markRead,
  // Prompts
  getPrompts: promptApi.list,
  getPrompt: promptApi.get,
  createPrompt: promptApi.create,
  updatePrompt: promptApi.update,
  getPromptVersions: promptApi.getVersions,
  updatePromptBinding: promptApi.updateBinding,
  // Read-only architecture sources
  getSkills: adminReadApi.getSkills,
  getSkillContracts: adminReadApi.getSkillContracts,
  importSkillPackage: (data: SkillImportPackage) =>
    apiFetch<SkillImportResult>('/skills/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getOperationLogs: adminReadApi.getOperationLogs,
  // Feature Switches
  getFeatureSwitches: switchApi.list,
  updateFeatureSwitch: switchApi.update,
  // Debug Automation
  getDebugConfigs: debugAutomationApi.listConfigs,
  createDebugConfig: debugAutomationApi.createConfig,
  updateDebugConfig: debugAutomationApi.updateConfig,
  getDebugTasks: debugAutomationApi.listTasks,
  getDebugTask: debugAutomationApi.getTask,
  createDebugTask: debugAutomationApi.createTask,
  startDebugTask: debugAutomationApi.startTask,
  pauseDebugTask: debugAutomationApi.pauseTask,
  resumeDebugTask: debugAutomationApi.resumeTask,
  takeoverDebugTask: debugAutomationApi.takeoverTask,
  getDebugSteps: debugAutomationApi.getSteps,
  getDebugResult: debugAutomationApi.getResult,
  // Demand Pool
  getDemandPool: demandPoolApi.list,
  // MCP Servers
  getMcpServers: mcpApi.list,
  getMcpServer: mcpApi.get,
  createMcpServer: mcpApi.create,
  updateMcpServer: mcpApi.update,
  deleteMcpServer: mcpApi.delete,
  testMcpConnection: mcpApi.testConnection,
  getReportCapabilityManifest: mcpApi.getReportCapabilityManifest,
  getReportCapabilityOverrides: mcpApi.getReportCapabilityOverrides,
  updateReportCapabilityOverrides: mcpApi.updateReportCapabilityOverrides,
  getReportQueryPolicy: mcpApi.getReportQueryPolicy,
  updateReportQueryPolicy: mcpApi.updateReportQueryPolicy,
  getEntityResolutionConfig: mcpApi.getEntityResolutionConfig,
  updateEntityResolutionConfig: mcpApi.updateEntityResolutionConfig,
  // Auto report
  getReportTemplates: reportApi.listTemplates,
  createReportTemplate: reportApi.createTemplate,
  updateReportTemplate: reportApi.updateTemplate,
  deleteReportTemplate: reportApi.deleteTemplate,
  getReportDrafts: reportApi.listDrafts,
  updateReportDraft: reportApi.updateDraft,
  generateReportDraft: reportApi.generateDraft,
  runReportSession: reportApi.runSession,
};
