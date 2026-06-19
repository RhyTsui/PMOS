import { access, copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DemandPoolItem } from '@/types';
import { runtimeDataPath } from './runtime-data-path';

const STORE_PATH = runtimeDataPath('demand-pool.json');
const BACKUP_PATH = `${STORE_PATH}.bak`;
const TEMP_PATH = `${STORE_PATH}.tmp`;
const SHOULD_PERSIST_STORE = process.env.XIAOQIAO_PERSIST_DEV_STORE !== 'false';

interface DemandPoolFile {
  items: DemandPoolItem[];
}

function normalizeItem(input: Partial<DemandPoolItem>): DemandPoolItem {
  const now = Date.now();
  return {
    id: input.id || `demand-${now}`,
    title: input.title?.trim() || '未命名需求',
    problem_statement: input.problem_statement?.trim() || '',
    target_users: Array.isArray(input.target_users) ? input.target_users : [],
    core_scenarios: Array.isArray(input.core_scenarios) ? input.core_scenarios : [],
    acceptance_criteria: Array.isArray(input.acceptance_criteria) ? input.acceptance_criteria : [],
    scope_in: Array.isArray(input.scope_in) ? input.scope_in : [],
    scope_out: Array.isArray(input.scope_out) ? input.scope_out : [],
    dependencies: Array.isArray(input.dependencies) ? input.dependencies : [],
    deliverables: Array.isArray(input.deliverables) ? input.deliverables : [],
    phase: input.phase || 'phase1',
    priority: input.priority || 'P2',
    business_flow: input.business_flow || 'help',
    automation_boundary: input.automation_boundary || 'manual',
    status: input.status || 'draft',
    proposer: input.proposer?.trim() || 'user-001',
    owner: input.owner?.trim() || 'user-001',
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
  };
}

let storeCache: DemandPoolFile | null = null;
let writeChain: Promise<void> = Promise.resolve();

function defaultStore(): DemandPoolFile {
  return { items: [] };
}

async function readStore(): Promise<DemandPoolFile> {
  if (storeCache) return structuredClone(storeCache);
  for (const candidate of [STORE_PATH, BACKUP_PATH]) {
    try {
      const raw = await readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DemandPoolFile>;
      if (Array.isArray(parsed.items)) {
        storeCache = { items: parsed.items.map(normalizeItem) };
        return structuredClone(storeCache);
      }
    } catch {
      // try next
    }
  }
  storeCache = defaultStore();
  return structuredClone(storeCache);
}

async function writeStore(store: DemandPoolFile): Promise<void> {
  storeCache = structuredClone(store);
  if (!SHOULD_PERSIST_STORE) return;
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(TEMP_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  try {
    await access(STORE_PATH);
    await rename(STORE_PATH, BACKUP_PATH);
  } catch {
    // no previous file
  }
  try {
    await rename(TEMP_PATH, STORE_PATH);
  } catch (error) {
    try { await copyFile(BACKUP_PATH, STORE_PATH); } catch { /* ignore */ }
    try { await unlink(TEMP_PATH); } catch { /* ignore */ }
    throw error;
  }
}

export async function listDemandPoolItems(): Promise<DemandPoolItem[]> {
  const store = await readStore();
  return store.items;
}

export async function getDemandPoolItem(id: string): Promise<DemandPoolItem | undefined> {
  const store = await readStore();
  return store.items.find(item => item.id === id);
}

export async function createDemandPoolItem(input: Partial<DemandPoolItem>): Promise<DemandPoolItem> {
  const item = normalizeItem(input);
  const store = await readStore();
  store.items.unshift(item);
  writeChain = writeChain.then(() => writeStore(store));
  await writeChain;
  return item;
}

export async function updateDemandPoolItem(id: string, input: Partial<DemandPoolItem>): Promise<DemandPoolItem | undefined> {
  const store = await readStore();
  let updated: DemandPoolItem | undefined;
  store.items = store.items.map((item) => {
    if (item.id !== id) return item;
    updated = normalizeItem({ ...item, ...input, id, updated_at: Date.now() });
    return updated;
  });
  if (!updated) return undefined;
  writeChain = writeChain.then(() => writeStore(store));
  await writeChain;
  return updated;
}

export async function deleteDemandPoolItem(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.items.length;
  store.items = store.items.filter(item => item.id !== id);
  if (store.items.length === before) return false;
  writeChain = writeChain.then(() => writeStore(store));
  await writeChain;
  return true;
}
