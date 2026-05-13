/**
 * CozeLoop (连弩) Trace SDK 集成层
 * SDK: @cozeloop/ai | AppID: 10100283
 */
import { cozeLoopTracer } from '@cozeloop/ai';
import { getTraceConfigSync } from '@/lib/trace-config-store';

// ===== 配置 =====
export interface TraceConfig {
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

export function getTraceConfigFromEnv(): TraceConfig {
  return getTraceConfigSync();
}

let initialized = false;
let initializedConfigKey = '';
let rejectionHandlerInstalled = false;

function installTraceRejectionHandler(): void {
  if (rejectionHandlerInstalled) return;

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    if (/no spans provided|no access permission|socket hang up/i.test(message)) {
      console.error('[Trace] Ignored exporter rejection:', message);
      return;
    }
  });

  rejectionHandlerInstalled = true;
}

export function initTrace(config?: Partial<TraceConfig>): void {
  const cfg = { ...getTraceConfigFromEnv(), ...config };
  if (!cfg.enabled || !cfg.apiUrl || !cfg.workspaceId || !cfg.apiToken) return;
  const nextConfigKey = JSON.stringify({
    enabled: cfg.enabled,
    apiUrl: cfg.apiUrl,
    workspaceId: cfg.workspaceId,
    apiToken: cfg.apiToken,
    projectId: cfg.projectId,
    env: cfg.env,
    serviceName: cfg.serviceName,
    sampleRate: cfg.sampleRate,
    appId: cfg.appId,
  });
  if (initialized && initializedConfigKey === nextConfigKey) return;
  try {
    if (initialized && initializedConfigKey !== nextConfigKey) {
      try { cozeLoopTracer.shutdown(); } catch { /* */ }
      initialized = false;
    }
    cozeLoopTracer.initialize({
      apiClient: { baseURL: cfg.apiUrl, token: cfg.apiToken },
      workspaceId: cfg.workspaceId,
      processor: 'simple',
    });
    installTraceRejectionHandler();
    initialized = true;
    initializedConfigKey = nextConfigKey;
  } catch (err) {
    console.error('[Trace] Init failed:', err);
  }
}

export const traceable = cozeLoopTracer.traceable;
export const setInput = cozeLoopTracer.setInput;
export const setOutput = cozeLoopTracer.setOutput;
export const setTags = cozeLoopTracer.setTags;
export const setError = cozeLoopTracer.setError;
export function flushTrace() { try { cozeLoopTracer.forceFlush(); } catch { /* */ } }
export function shutdownTrace() { try { cozeLoopTracer.shutdown(); } catch { /* */ } }

// ===== Trace 数据结构 =====
export interface ChatTraceInput {
  project_id: string; env: string; service_name: string;
  question: string; conversation_id?: string; agent_id?: string;
  request_time: string; frontend_params?: Record<string, unknown>;
}

export function buildChatTraceInput(question: string, extras?: Partial<ChatTraceInput>): ChatTraceInput {
  const cfg = getTraceConfigFromEnv();
  return { project_id: cfg.projectId, env: cfg.env, service_name: cfg.serviceName,
    question: question.slice(0, 4000), request_time: new Date().toISOString(), ...extras };
}

export function truncate(str: string, max: number): string {
  return (!str || str.length <= max) ? str : str.slice(0, max) + '...[truncated]';
}
