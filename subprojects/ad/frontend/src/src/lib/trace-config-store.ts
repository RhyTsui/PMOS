import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { TraceConfig } from '@/lib/trace';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';

const CONFIG_PATH = runtimeDataPath('trace-config.json');
const LEGACY_CONFIG_PATH = legacyDataPath('trace-config.json');

export function getTraceConfigFromEnvDefaults(): TraceConfig {
  return {
    enabled: process.env.COZELOOP_ENABLED === 'true',
    apiUrl: process.env.COZELOOP_API_BASE_URL || 'http://liannu.dc.yokagames.com:1117',
    workspaceId: process.env.COZELOOP_WORKSPACE_ID || '',
    apiToken: process.env.COZELOOP_API_TOKEN || '',
    env: (process.env.LIANLU_ENV as TraceConfig['env']) || 'test',
    serviceName: process.env.LIANLU_SERVICE_NAME || 'xiaoqiao-zhitou-chat-service',
    sampleRate: parseFloat(process.env.LIANLU_SAMPLE_RATE || '1'),
  };
}

function normalizeTraceConfig(input?: Partial<TraceConfig>): TraceConfig {
  const defaults = getTraceConfigFromEnvDefaults();
  return {
    enabled: input?.enabled ?? defaults.enabled,
    apiUrl: input?.apiUrl?.trim() || defaults.apiUrl,
    workspaceId: input?.workspaceId?.trim() || '',
    apiToken: input?.apiToken?.trim() || '',
    env: input?.env || defaults.env,
    serviceName: input?.serviceName?.trim() || defaults.serviceName,
    sampleRate: Number.isFinite(input?.sampleRate) ? Number(input?.sampleRate) : defaults.sampleRate,
  };
}

export function getTraceConfigSync(): TraceConfig {
  for (const configPath of [CONFIG_PATH, LEGACY_CONFIG_PATH]) {
    try {
      if (!existsSync(configPath)) continue;
      const raw = readFileSync(configPath, 'utf8');
      return normalizeTraceConfig(JSON.parse(raw) as Partial<TraceConfig>);
    } catch {
      // try next path
    }
  }
  return normalizeTraceConfig();
}

export async function updateTraceConfig(patch: Partial<TraceConfig>): Promise<TraceConfig> {
  const current = getTraceConfigSync();
  const next = normalizeTraceConfig({ ...current, ...patch });
  await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  return next;
}
