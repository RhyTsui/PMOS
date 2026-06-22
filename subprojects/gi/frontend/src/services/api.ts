import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

// 请求拦截器
api.interceptors.response.use(
  (response) => {
    // 后端返回 { data: ..., meta: ... } 格式，自动解包
    const body = response.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return body.data;
    }
    return body;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;

// ===== 类型定义 =====
export interface EvidenceEvent {
  id: string;
  eventTitle: string;
  eventType: string;
  impactScore: number;
  priority: string;
  sourceCount: number;
  audienceTags: string[];
  entities: Array<{ name: string; type: string }>;
  firstSeenAt: string;
  lastSeenAt: string;
  keyFacts: Array<{ fact: string; importance: string }>;
  actionAdvice: Array<{ role: string; advice: string; urgency: string }>;
}

export interface IntelSource {
  id: string;
  name: string;
  sourceType: string;
  accessMethod: string;
  enabled: boolean;
  priority: string;
}

export interface Seed {
  id: string;
  seedType: string;
  text: string;
  score: number;
  status: string;
}

export interface SchedulerConfig {
  enabled: boolean;
  healthCheckCron: string;
  evolutionCron: string;
  cleanupCron: string;
  gapDetectionCron: string;
  sourceDiscoveryCron: string;
  dailyReportCron: string;
  enableAutoCollection: boolean;
  defaultCron: string;
}

export interface SchedulerStatus {
  isRunning: boolean;
  jobCount: number;
  jobs: string[];
  config: SchedulerConfig;
}

export interface SystemStatus {
  uptime: number;
  scheduler: SchedulerStatus;
}

// ===== API 方法 =====
export const eventsApi = {
  list: (params?: {
    eventType?: string;
    priority?: string;
    audienceTag?: string;
    search?: string;
    minScore?: string;
    limit?: string;
  }) => api.get('/events', { params }),
  get: (id: string) => api.get(`/events/${id}`),
};

export const signalsApi = {
  list: (params?: { priority?: string; status?: string; audienceTag?: string }) =>
    api.get('/signals', { params }),
  stats: () => api.get('/signals/stats'),
};

export const gapsApi = {
  detect: () => api.get('/gaps'),
  stats: () => api.get('/gaps/stats'),
};

export const sourcesApi = {
  list: () => api.get('/sources'),
  get: (id: string) => api.get(`/sources/${id}`),
  create: (data: Partial<IntelSource>) => api.post('/sources', data),
  update: (id: string, data: Partial<IntelSource>) => api.put(`/sources/${id}`, data),
  delete: (id: string) => api.delete(`/sources/${id}`),
};

export const seedsApi = {
  list: () => api.get('/seeds'),
  create: (data: Partial<Seed>) => api.post('/seeds', data),
  delete: (id: string) => api.delete('/seeds/' + id),
  evolve: () => api.post('/seeds/evolve'),
};

export const collectionApi = {
  collectAll: () => api.post('/collection/collect-all'),
  stats: () => api.get('/collection/stats'),
};

export const systemApi = {
  status: (): Promise<SystemStatus> => api.get('/system/status'),
  getSchedulerSettings: (): Promise<{ config: SchedulerConfig; status: SchedulerStatus }> =>
    api.get('/system/settings/scheduler'),
  updateSchedulerSettings: (data: Partial<SchedulerConfig>): Promise<{ config: SchedulerConfig; status: SchedulerStatus }> =>
    api.put('/system/settings/scheduler', data),
  startScheduler: () => api.post('/system/scheduler/start'),
  stopScheduler: () => api.post('/system/scheduler/stop'),
};

// ===== LLM Provider 类型 =====
export interface LLMProvider {
  id: string;
  name: string;
  providerType: string;
  apiKey: string;
  baseUrl: string;
  modelBaseUrl?: string;
  models: string[];
  defaultModel?: string;
  enabled: boolean;
  rateLimitRpm: number;
  rateLimitDaily: number;
  priority: number;
  costPer1mInput?: number;
  costPer1mOutput?: number;
  config?: Record<string, unknown>;
  status: 'active' | 'inactive' | 'error';
  lastError?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const llmProvidersApi = {
  list: () => api.get('/admin/llm-providers'),
  listEnabled: () => api.get('/admin/llm-providers/enabled'),
  stats: () => api.get('/admin/llm-providers/stats'),
  get: (id: string) => api.get(`/admin/llm-providers/${id}`),
  create: (data: Partial<LLMProvider>) => api.post('/admin/llm-providers', data),
  update: (id: string, data: Partial<LLMProvider>) => api.put(`/admin/llm-providers/${id}`, data),
  toggle: (id: string, enabled: boolean) => api.patch(`/admin/llm-providers/${id}/toggle`, { enabled }),
  test: (id: string) => api.post(`/admin/llm-providers/${id}/test`),
  delete: (id: string) => api.delete(`/admin/llm-providers/${id}`),
};

// ===== 蒸馏 API =====
export const distillationApi = {
  run: (config: {
    profileId: string;
    taskType: string;
    topic?: string;
    claimToVerify?: string;
    model?: string;
    providerId?: string;
  }) => api.post('/distillation/run', config),
  batch: (configs: any[], concurrency?: number) =>
    api.post('/distillation/batch', { configs, concurrency }),
  stats: () => api.get('/distillation/stats'),
  answers: (params?: { taskId?: string; limit?: number }) =>
    api.get('/distillation/answers', { params }),
  claims: (params?: { answerId?: string; claimType?: string; limit?: number }) =>
    api.get('/distillation/claims', { params }),
  mentions: (params?: { answerId?: string; status?: string; limit?: number }) =>
    api.get('/distillation/mentions', { params }),
  tasks: (params?: { profileId?: string; taskType?: string; limit?: number }) =>
    api.get('/distillation/tasks', { params }),
};
