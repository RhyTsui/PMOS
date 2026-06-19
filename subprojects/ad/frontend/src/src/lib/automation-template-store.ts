import { access, copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AutomationTemplateConfig } from '@/types';
import { runtimeUserDataPath } from './runtime-data-path';

const STORE_FILE_NAME = 'automation-templates.json';
const BACKUP_SUFFIX = '.bak';
const TEMP_SUFFIX = '.tmp';
const SHOULD_PERSIST_STORE = process.env.XIAOQIAO_PERSIST_DEV_STORE !== 'false';

interface AutomationTemplateFile {
  templates: AutomationTemplateConfig[];
}

type StoreCache = Record<string, AutomationTemplateFile>;

function now(): number {
  return Date.now();
}

function getStorePath(scopeKey: string): string {
  return runtimeUserDataPath(scopeKey, STORE_FILE_NAME);
}

function normalizeTemplate(input: Partial<AutomationTemplateConfig>): AutomationTemplateConfig {
  const timestamp = now();
  return {
    id: input.id || `auto-template-${timestamp}`,
    name: input.name?.trim() || '未命名模板',
    description: input.description?.trim() || '',
    template_type: input.template_type || 'custom',
    status: input.status || 'draft',
    default_frequency: input.default_frequency || 'daily',
    default_cron_expression: input.default_cron_expression?.trim() || undefined,
    metrics: Array.isArray(input.metrics) ? input.metrics : [],
    dimensions: Array.isArray(input.dimensions) ? input.dimensions : [],
    filters: Array.isArray(input.filters) ? input.filters : [],
    output_blocks: Array.isArray(input.output_blocks) ? input.output_blocks : [],
    prompt_template: input.prompt_template?.trim() || '',
    created_by: input.created_by?.trim() || 'unknown',
    created_at: input.created_at || timestamp,
    updated_at: input.updated_at || timestamp,
  };
}

function defaultStore(): AutomationTemplateFile {
  return { templates: [] };
}

let storeCacheByScope: StoreCache = {};
let writeChainsByScope: Record<string, Promise<void>> = {};

function cloneStore(store: AutomationTemplateFile): AutomationTemplateFile {
  return { templates: store.templates.map((item) => ({ ...item })) };
}

async function readStore(scopeKey: string): Promise<AutomationTemplateFile> {
  const cached = storeCacheByScope[scopeKey];
  if (cached) return cloneStore(cached);

  const storePath = getStorePath(scopeKey);
  for (const candidate of [storePath, `${storePath}${BACKUP_SUFFIX}`]) {
    try {
      const raw = await readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AutomationTemplateFile>;
      if (Array.isArray(parsed.templates)) {
        const store = { templates: parsed.templates.map(normalizeTemplate) };
        storeCacheByScope[scopeKey] = store;
        if (candidate !== storePath) {
          await writeStore(scopeKey, store);
        }
        return cloneStore(store);
      }
    } catch {
      // try next
    }
  }

  const store = defaultStore();
  storeCacheByScope[scopeKey] = store;
  return cloneStore(store);
}

async function writeStore(scopeKey: string, store: AutomationTemplateFile): Promise<void> {
  storeCacheByScope[scopeKey] = cloneStore(store);
  if (!SHOULD_PERSIST_STORE) return;
  const storePath = getStorePath(scopeKey);
  const tempPath = `${storePath}${TEMP_SUFFIX}`;
  const backupPath = `${storePath}${BACKUP_SUFFIX}`;
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  try {
    await access(storePath);
    await rename(storePath, backupPath);
  } catch {
    // no previous file
  }
  try {
    await rename(tempPath, storePath);
  } catch (error) {
    try { await copyFile(backupPath, storePath); } catch { /* ignore */ }
    try { await unlink(tempPath); } catch { /* ignore */ }
    throw error;
  }
}

async function updateStore(
  scopeKey: string,
  mutator: (store: AutomationTemplateFile) => void | Promise<void>,
): Promise<AutomationTemplateFile> {
  const next = await readStore(scopeKey);
  await mutator(next);
  writeChainsByScope[scopeKey] = (writeChainsByScope[scopeKey] || Promise.resolve()).then(() => writeStore(scopeKey, next));
  await writeChainsByScope[scopeKey];
  return cloneStore(next);
}

export async function listAutomationTemplates(
  scopeKey: string,
  filters: { status?: string; template_type?: string } = {},
): Promise<AutomationTemplateConfig[]> {
  const store = await readStore(scopeKey);
  return store.templates.filter((template) => (
    (!filters.status || template.status === filters.status)
    && (!filters.template_type || template.template_type === filters.template_type)
  ));
}

export async function getAutomationTemplate(scopeKey: string, id: string): Promise<AutomationTemplateConfig | undefined> {
  const store = await readStore(scopeKey);
  return store.templates.find((template) => template.id === id);
}

export async function createAutomationTemplate(
  scopeKey: string,
  input: Partial<AutomationTemplateConfig>,
): Promise<AutomationTemplateConfig> {
  const template = normalizeTemplate(input);
  await updateStore(scopeKey, (store) => {
    store.templates.unshift(template);
  });
  return template;
}

export async function updateAutomationTemplate(
  scopeKey: string,
  id: string,
  input: Partial<AutomationTemplateConfig>,
): Promise<AutomationTemplateConfig | undefined> {
  let updated: AutomationTemplateConfig | undefined;
  await updateStore(scopeKey, (store) => {
    store.templates = store.templates.map((item) => {
      if (item.id !== id) return item;
      updated = normalizeTemplate({ ...item, ...input, id, updated_at: now() });
      return updated;
    });
  });
  return updated;
}

export async function deleteAutomationTemplate(scopeKey: string, id: string): Promise<boolean> {
  const store = await readStore(scopeKey);
  const before = store.templates.length;
  store.templates = store.templates.filter((item) => item.id !== id);
  if (store.templates.length === before) return false;
  await writeStore(scopeKey, store);
  return true;
}
