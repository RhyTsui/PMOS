import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeDataPath } from './runtime-data-path';

const STORE_PATH = runtimeDataPath('operation-logs.json');
const SHOULD_PERSIST_STORE = process.env.XIAOQIAO_PERSIST_DEV_STORE !== 'false';

export type OperationLogStatus = 'success' | 'failed';

export interface OperationLogActor {
  uid?: number;
  account: string;
  user_name: string;
  real_name?: string;
}

export interface OperationLogRecord {
  id: string;
  created_at: string;
  module: string;
  action: string;
  target_type: string;
  target_id?: string;
  target_name?: string;
  summary: string;
  status: OperationLogStatus;
  actor: OperationLogActor;
  changes?: string[];
  detail?: string;
  metadata?: Record<string, unknown>;
}

interface OperationLogFile {
  logs: OperationLogRecord[];
}

type StoreCache = OperationLogFile | null;

let storeCache: StoreCache = null;
let writeChain: Promise<void> = Promise.resolve();

function nowIso(): string {
  return new Date().toISOString();
}

function cloneStore(store: OperationLogFile): OperationLogFile {
  return { logs: store.logs.map((item) => ({ ...item, actor: { ...item.actor }, changes: item.changes ? [...item.changes] : undefined, metadata: item.metadata ? { ...item.metadata } : undefined })) };
}

function defaultStore(): OperationLogFile {
  return { logs: [] };
}

async function readStore(): Promise<OperationLogFile> {
  if (storeCache) return cloneStore(storeCache);

  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<OperationLogFile>;
    storeCache = {
      logs: Array.isArray(parsed.logs) ? parsed.logs as OperationLogRecord[] : [],
    };
    return cloneStore(storeCache);
  } catch {
    // use empty store
  }

  storeCache = defaultStore();
  return cloneStore(storeCache);
}

async function writeStore(store: OperationLogFile): Promise<void> {
  storeCache = cloneStore(store);
  if (!SHOULD_PERSIST_STORE) return;
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

export async function appendOperationLog(
  entry: Omit<OperationLogRecord, 'id' | 'created_at'> & Partial<Pick<OperationLogRecord, 'id' | 'created_at'>>,
): Promise<OperationLogRecord> {
  const record: OperationLogRecord = {
    id: entry.id || `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: entry.created_at || nowIso(),
    module: entry.module,
    action: entry.action,
    target_type: entry.target_type,
    target_id: entry.target_id,
    target_name: entry.target_name,
    summary: entry.summary,
    status: entry.status,
    actor: entry.actor,
    changes: entry.changes,
    detail: entry.detail,
    metadata: entry.metadata,
  };

  const store = await readStore();
  store.logs = [record, ...store.logs].slice(0, 5000);
  writeChain = writeChain.then(() => writeStore(store));
  await writeChain;
  return record;
}

export async function listOperationLogs(filters: {
  module?: string;
  action?: string;
  targetType?: string;
  actor?: string;
  keyword?: string;
  limit?: number;
} = {}): Promise<OperationLogRecord[]> {
  const store = await readStore();
  const keyword = filters.keyword?.trim().toLowerCase() || '';
  const actor = filters.actor?.trim().toLowerCase() || '';
  const limit = Math.max(1, Math.min(filters.limit || 200, 1000));
  return store.logs
    .filter((item) => (
      (!filters.module || item.module === filters.module)
      && (!filters.action || item.action === filters.action)
      && (!filters.targetType || item.target_type === filters.targetType)
      && (!actor || [item.actor.account, item.actor.user_name, item.actor.real_name].some((value) => String(value || '').toLowerCase().includes(actor)))
      && (!keyword || [
        item.summary,
        item.detail,
        item.target_name,
        item.target_id,
        item.actor.account,
        item.actor.user_name,
        item.module,
        item.action,
      ].some((value) => String(value || '').toLowerCase().includes(keyword)))
    ))
    .slice(0, limit);
}
