import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeUserDataPath } from './runtime-data-path';

const STORE_FILE_NAME = 'personal-knowledge-config.json';
export const PERSONAL_DATAKI_API_BASE = 'https://dataki.dobest.com/api/v1';

export interface PersonalKnowledgeConfig {
  enabled: boolean;
  datakiApiKey: string;
  updatedAt: string;
  lastTestStatus?: 'success' | 'failed' | 'skipped';
  lastTestMessage?: string;
}

export interface PublicPersonalKnowledgeConfig {
  enabled: boolean;
  maskedKey: string;
  updatedAt: string;
  lastTestStatus?: 'success' | 'failed' | 'skipped';
  lastTestMessage?: string;
  apiBase: string;
}

function nowIso() {
  return new Date().toISOString();
}

function getStorePath(scopeKey: string) {
  return runtimeUserDataPath(scopeKey, STORE_FILE_NAME);
}

function normalizeConfig(input?: Partial<PersonalKnowledgeConfig>): PersonalKnowledgeConfig {
  return {
    enabled: Boolean(input?.enabled && input.datakiApiKey?.trim()),
    datakiApiKey: input?.datakiApiKey?.trim() || '',
    updatedAt: input?.updatedAt || nowIso(),
    lastTestStatus: input?.lastTestStatus,
    lastTestMessage: input?.lastTestMessage,
  };
}

export function maskDatakiKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}****`;
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
}

export function toPublicPersonalKnowledgeConfig(config: PersonalKnowledgeConfig): PublicPersonalKnowledgeConfig {
  return {
    enabled: Boolean(config.enabled && config.datakiApiKey),
    maskedKey: maskDatakiKey(config.datakiApiKey),
    updatedAt: config.updatedAt,
    lastTestStatus: config.lastTestStatus,
    lastTestMessage: config.lastTestMessage,
    apiBase: PERSONAL_DATAKI_API_BASE,
  };
}

export async function getPersonalKnowledgeConfig(scopeKey: string): Promise<PersonalKnowledgeConfig> {
  try {
    const raw = await readFile(getStorePath(scopeKey), 'utf8');
    return normalizeConfig(JSON.parse(raw) as Partial<PersonalKnowledgeConfig>);
  } catch {
    return normalizeConfig();
  }
}

async function writePersonalKnowledgeConfig(
  scopeKey: string,
  config: PersonalKnowledgeConfig,
): Promise<PersonalKnowledgeConfig> {
  const next = normalizeConfig(config);
  const storePath = getStorePath(scopeKey);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export async function updatePersonalKnowledgeConfig(
  scopeKey: string,
  patch: Partial<PersonalKnowledgeConfig>,
): Promise<PersonalKnowledgeConfig> {
  const current = await getPersonalKnowledgeConfig(scopeKey);
  const next = normalizeConfig({
    ...current,
    ...patch,
    updatedAt: nowIso(),
  });
  return writePersonalKnowledgeConfig(scopeKey, next);
}

export async function testPersonalDatakiKey(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const key = apiKey.trim();
  if (!key) return { ok: false, message: '请粘贴 Dataki KEY' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${PERSONAL_DATAKI_API_BASE}/knowledge-bases`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-API-Key': key,
      },
      signal: controller.signal,
    });
    if (response.ok) return { ok: true, message: '个人知识库已接入' };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, message: 'KEY 无法使用，请检查后再提交' };
    }
    return { ok: false, message: `Dataki 返回异常（HTTP ${response.status}）` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error && error.name === 'AbortError'
        ? '连接 Dataki 超时，请稍后重试'
        : '连接 Dataki 失败，请稍后重试',
    };
  } finally {
    clearTimeout(timer);
  }
}
