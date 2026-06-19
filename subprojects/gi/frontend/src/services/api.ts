import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

// 请求拦截器
api.interceptors.response.use(
  (response) => response.data,
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

export interface SystemStatus {
  uptime: number;
  scheduler: {
    isRunning: boolean;
    jobCount: number;
    jobs: string[];
  };
}

// ===== API 方法 =====
export const eventsApi = {
  list: (params?: { eventType?: string; priority?: string }) =>
    api.get('/events', { params }),
  get: (id: string) => api.get(`/events/${id}`),
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
  evolve: () => api.post('/seeds/evolve'),
};

export const collectionApi = {
  collectAll: () => api.post('/collection/collect-all'),
  stats: () => api.get('/collection/stats'),
};

export const systemApi = {
  status: (): Promise<SystemStatus> => api.get('/system/status'),
  startScheduler: () => api.post('/system/scheduler/start'),
  stopScheduler: () => api.post('/system/scheduler/stop'),
};
