/**
 * Unified API Client for XiaoQiao Ad OS
 * 
 * Supports two modes:
 * - demo: Returns mock data from local demo-data store (default)
 * - service: Calls real backend services configured via MCP
 * 
 * Mode is controlled by:
 * 1. Environment variable NEXT_PUBLIC_API_MODE (build-time)
 * 2. Runtime toggle via setApiMode() (persisted to localStorage)
 */

// ==========================================
// Mode Management
// ==========================================

export type ApiMode = 'demo' | 'service';

const MODE_KEY = 'xiaoqiao_api_mode';

let _currentMode: ApiMode = 
  (typeof window !== 'undefined' && localStorage.getItem(MODE_KEY) as ApiMode) ||
  (process.env.NEXT_PUBLIC_API_MODE as ApiMode) ||
  'demo';

export function getApiMode(): ApiMode {
  return _currentMode;
}

export function setApiMode(mode: ApiMode): void {
  _currentMode = mode;
  if (typeof window !== 'undefined') {
    localStorage.setItem(MODE_KEY, mode);
  }
}

export function isDemoMode(): boolean {
  return _currentMode === 'demo';
}

// ==========================================
// Generic Fetch Wrapper
// ==========================================

interface FetchOptions extends Omit<RequestInit, 'mode'> {
  /** Override API mode for this single request (not RequestMode) */
  apiMode?: ApiMode;
}

/**
 * Unified fetch: in demo mode, calls /api/xiaoqiao/* which returns mock data;
 * in service mode, calls the real backend configured via MCP endpoints.
 */
export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { apiMode, ...fetchOpts } = options;
  const activeMode = apiMode || _currentMode;

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const url = activeMode === 'demo'
    ? `/api/xiaoqiao${path}`
    : `${baseUrl}/api/v1/xiaoqiao${path}`;
  const isFormData = typeof FormData !== 'undefined' && fetchOpts.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(fetchOpts.headers || {}),
  };

  const res = await fetch(url, {
    ...fetchOpts,
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
    super(`API Error ${status}: ${statusText}`);
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
  ReportDraft,
  ReportTemplate,
} from '@/types';

// ---- Workspace ----
export const workspaceApi = {
  get: () => apiFetch<WorkspaceResponse>('/workspace'),
};

// ---- Conversations ----
export const conversationApi = {
  create: (data: { title?: string; type?: string }) =>
    apiFetch<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  list: () => apiFetch<Conversation[]>('/conversations'),
  update: (id: string, data: Partial<Conversation>) =>
    apiFetch<Conversation>(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}`, {
      method: 'DELETE',
    }),
  getMessages: (id: string) =>
    apiFetch<Message[]>(`/conversations/${id}/messages`),
  sendMessage: (id: string, data: Partial<Message> & { content: string; role?: 'user' | 'assistant'; message_type?: string; attachments?: string[] }) =>
    apiFetch<Message>(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateTitle: (id: string, data: { message: string; history?: Array<{ role: string; content: string }> }) =>
    apiFetch<{ title: string; source: 'model' | 'fallback' }>(`/conversations/${id}/title`, {
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
      apiMode: 'demo',
    });
  },
  get: (id: string) => apiFetch<McpServerConfig>(`/admin/mcp-servers/${id}`, {
    apiMode: 'demo',
  }),
  create: (data: Partial<McpServerConfig>) =>
    apiFetch<McpServerConfig>('/admin/mcp-servers', {
      method: 'POST',
      body: JSON.stringify(data),
      apiMode: 'demo',
    }),
  update: (id: string, data: Partial<McpServerConfig>) =>
    apiFetch<McpServerConfig>(`/admin/mcp-servers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      apiMode: 'demo',
    }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/admin/mcp-servers/${id}`, {
      method: 'DELETE',
      apiMode: 'demo',
    }),
  testConnection: (id: string) =>
    apiFetch<{ success: boolean; latency_ms: number }>(`/admin/mcp-servers/${id}/test`, {
      method: 'POST',
      apiMode: 'demo',
    }),
};

// ---- Admin: Auto Report ----
export const reportApi = {
  listTemplates: () =>
    apiFetch<ReportTemplate[]>('/admin/report-templates', { apiMode: 'demo' }),
  createTemplate: (data: Partial<ReportTemplate>) =>
    apiFetch<ReportTemplate>('/admin/report-templates', {
      method: 'POST',
      body: JSON.stringify(data),
      apiMode: 'demo',
    }),
  updateTemplate: (id: string, data: Partial<ReportTemplate>) =>
    apiFetch<ReportTemplate>(`/admin/report-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      apiMode: 'demo',
    }),
  deleteTemplate: (id: string) =>
    apiFetch<{ success: boolean }>(`/admin/report-templates/${id}`, {
      method: 'DELETE',
      apiMode: 'demo',
    }),
  listDrafts: (templateId?: string) => {
    const qs = new URLSearchParams();
    if (templateId) qs.set('templateId', templateId);
    const query = qs.toString();
    return apiFetch<ReportDraft[]>(`/admin/report-drafts${query ? `?${query}` : ''}`, {
      apiMode: 'demo',
    });
  },
  updateDraft: (id: string, data: Partial<ReportDraft>) =>
    apiFetch<ReportDraft>(`/admin/report-drafts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      apiMode: 'demo',
    }),
  generateDraft: (data: { templateId: string; reportDate: string }) =>
    apiFetch<ReportDraft>('/admin/report-drafts/generate', {
      method: 'POST',
      body: JSON.stringify(data),
      apiMode: 'demo',
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
      apiMode: 'demo',
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
  // Prompts
  getPrompts: promptApi.list,
  getPrompt: promptApi.get,
  createPrompt: promptApi.create,
  updatePrompt: promptApi.update,
  getPromptVersions: promptApi.getVersions,
  updatePromptBinding: promptApi.updateBinding,
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
