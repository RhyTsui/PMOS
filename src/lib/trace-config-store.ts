import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { TraceConfig } from '@/lib/trace';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'trace-config.json');

export function getTraceConfigFromEnvDefaults(): TraceConfig {
  return {
    enabled: process.env.COZELOOP_ENABLED === 'true',
    apiUrl: process.env.COZELOOP_API_BASE_URL || 'http://liannu.dc.yokagames.com:1117',
    workspaceId: process.env.COZELOOP_WORKSPACE_ID || '',
    apiToken: process.env.COZELOOP_API_TOKEN || '',
    projectId: process.env.LIANLU_PROJECT_ID || '10100283',
    env: (process.env.LIANLU_ENV as TraceConfig['env']) || 'test',
    serviceName: process.env.LIANLU_SERVICE_NAME || 'xiaoqiao-zhitou-chat-service',
    sampleRate: parseFloat(process.env.LIANLU_SAMPLE_RATE || '1'),
    appId: process.env.LIANLU_APP_ID || '10100283',
  };
}

function normalizeTraceConfig(input?: Partial<TraceConfig>): TraceConfig {
  const defaults = getTraceConfigFromEnvDefaults();
  return {
    ...defaults,
    ...input,
    enabled: input?.enabled ?? defaults.enabled,
    apiUrl: input?.apiUrl?.trim() || defaults.apiUrl,
    workspaceId: input?.workspaceId?.trim() || '',
    apiToken: input?.apiToken?.trim() || '',
    projectId: input?.projectId?.trim() || defaults.projectId,
    env: input?.env || defaults.env,
    serviceName: input?.serviceName?.trim() || defaults.serviceName,
    sampleRate: Number.isFinite(input?.sampleRate) ? Number(input?.sampleRate) : defaults.sampleRate,
    appId: input?.appId?.trim() || defaults.appId,
  };
}

export function getTraceConfigSync(): TraceConfig {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return normalizeTraceConfig();
    }
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    return normalizeTraceConfig(JSON.parse(raw) as Partial<TraceConfig>);
  } catch {
    return normalizeTraceConfig();
  }
}

export async function updateTraceConfig(patch: Partial<TraceConfig>): Promise<TraceConfig> {
  const current = getTraceConfigSync();
  const next = normalizeTraceConfig({ ...current, ...patch });
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
