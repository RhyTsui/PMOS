/**
 * Evidence Ledger Store — 证据账本持久化存储
 *
 * 按 caseId 存储 Evidence Ledger，支持跨请求查询。
 * 与 conversation-store 的存储模式类似。
 *
 * 存储路径：.runtime/users/{scopeKey}/evidence-ledgers.json
 *
 * 设计原则：
 * 1. 每个 caseId 对应一个 Evidence Ledger
 * 2. 支持跨请求追加证据
 * 3. 支持按 caseId 查询完整证据链
 * 4. 保留最近的 N 个 ledger（避免无限增长）
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { EvidenceLedger, EvidenceEntry } from './evidence-ledger';
import { createEmptyEvidenceLedger } from './evidence-ledger';
import { runtimeUserDataPath } from './runtime-data-path';

const STORE_FILE_NAME = 'evidence-ledgers.json';
const MAX_LEDGERS = 200; // 保留最近的 200 个 ledger

interface EvidenceLedgerStoreFile {
  ledgers: Record<string, EvidenceLedger & { caseId: string; conversationId: string; lastUpdated: string }>;  // caseId → EvidenceLedger + metadata
  caseIdsByConversation: Record<string, string[]>;  // conversationId → caseId[]
  lastUpdated: number;
}

let memoryStoreByScope: Record<string, EvidenceLedgerStoreFile> = {};
const writeChainsByScope: Record<string, Promise<void>> = {};

function getStorePath(scopeKey: string): string {
  return runtimeUserDataPath(scopeKey, STORE_FILE_NAME);
}

function defaultStore(): EvidenceLedgerStoreFile {
  return {
    ledgers: {},
    caseIdsByConversation: {},
    lastUpdated: Date.now(),
  };
}

async function readStore(scopeKey: string): Promise<EvidenceLedgerStoreFile> {
  if (memoryStoreByScope[scopeKey]) {
    return memoryStoreByScope[scopeKey];
  }

  const storePath = getStorePath(scopeKey);
  try {
    const raw = await readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<EvidenceLedgerStoreFile>;
    const store: EvidenceLedgerStoreFile = {
      ledgers: parsed.ledgers && typeof parsed.ledgers === 'object' ? parsed.ledgers : {},
      caseIdsByConversation: parsed.caseIdsByConversation && typeof parsed.caseIdsByConversation === 'object'
        ? parsed.caseIdsByConversation
        : {},
      lastUpdated: parsed.lastUpdated ?? Date.now(),
    };
    memoryStoreByScope[scopeKey] = store;
    return store;
  } catch {
    const store = defaultStore();
    memoryStoreByScope[scopeKey] = store;
    return store;
  }
}

async function writeStore(scopeKey: string, store: EvidenceLedgerStoreFile): Promise<void> {
  const storePath = getStorePath(scopeKey);
  const dir = path.dirname(storePath);

  // 串行化写入，避免并发覆盖
  const prev = writeChainsByScope[scopeKey] ?? Promise.resolve();
  const next = prev.then(async () => {
    await mkdir(dir, { recursive: true });
    await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  }, async (err) => {
    // 上一个写入失败，继续尝试当前写入
    await mkdir(dir, { recursive: true });
    await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
    console.error('[evidence-ledger-store] previous write failed:', err);
  });
  writeChainsByScope[scopeKey] = next;
  await next;
}

// ─── Core API ──────────────────────────────────────────

/**
 * 获取指定 caseId 的 Evidence Ledger。
 * 如果不存在，返回空的 ledger。
 */
export async function getEvidenceLedgerByCase(
  scopeKey: string,
  caseId: string,
): Promise<EvidenceLedger> {
  const store = await readStore(scopeKey);
  const stored = store.ledgers[caseId];
  if (stored) {
    return cloneLedger(stored);
  }
  return createEmptyEvidenceLedger();
}

/**
 * 保存 Evidence Ledger（按 caseId）。
 */
export async function saveEvidenceLedger(
  scopeKey: string,
  caseId: string,
  conversationId: string,
  ledger: EvidenceLedger,
): Promise<EvidenceLedger> {
  const store = await readStore(scopeKey);
  const now = new Date().toISOString();

  // 更新 ledger（附加元数据）
  store.ledgers[caseId] = {
    ...cloneLedger(ledger),
    caseId,
    conversationId,
    lastUpdated: now,
  };

  // 维护 conversation → caseIds 索引
  if (!store.caseIdsByConversation[conversationId]) {
    store.caseIdsByConversation[conversationId] = [];
  }
  if (!store.caseIdsByConversation[conversationId].includes(caseId)) {
    store.caseIdsByConversation[conversationId].push(caseId);
  }

  // 限制 ledger 数量
  const caseIds = Object.keys(store.ledgers);
  if (caseIds.length > MAX_LEDGERS) {
    // 按 lastUpdated 排序，删除最旧的
    const sorted = caseIds
      .map(id => ({ id, updatedAt: store.ledgers[id]?.lastUpdated ? new Date(store.ledgers[id].lastUpdated).getTime() : 0 }))
      .sort((a, b) => a.updatedAt - b.updatedAt);
    const toRemove = sorted.slice(0, caseIds.length - MAX_LEDGERS);
    for (const { id } of toRemove) {
      delete store.ledgers[id];
      // 同时从索引中移除
      for (const convId of Object.keys(store.caseIdsByConversation)) {
        store.caseIdsByConversation[convId] = store.caseIdsByConversation[convId].filter(cid => cid !== id);
      }
    }
  }

  store.lastUpdated = Date.now();
  await writeStore(scopeKey, store);
  return cloneLedger(ledger);
}

/**
 * 向指定 caseId 的 Evidence Ledger 追加证据。
 */
export async function appendEvidenceToCase(
  scopeKey: string,
  caseId: string,
  conversationId: string,
  entry: Omit<EvidenceEntry, 'id' | 'recorded_at'>,
): Promise<EvidenceLedger> {
  const ledger = await getEvidenceLedgerByCase(scopeKey, caseId);

  // 追加证据
  const newEntry: EvidenceEntry = {
    ...entry,
    id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    recorded_at: new Date().toISOString(),
  };
  ledger.entries.push(newEntry);

  return saveEvidenceLedger(scopeKey, caseId, conversationId, ledger);
}

/**
 * 获取会话下的所有 Evidence Ledger。
 */
export async function listEvidenceLedgersByConversation(
  scopeKey: string,
  conversationId: string,
): Promise<Array<{ caseId: string; ledger: EvidenceLedger }>> {
  const store = await readStore(scopeKey);
  const caseIds = store.caseIdsByConversation[conversationId] ?? [];
  return caseIds
    .map(caseId => ({
      caseId,
      ledger: store.ledgers[caseId] ? cloneLedger(store.ledgers[caseId]) : null,
    }))
    .filter((item): item is { caseId: string; ledger: EvidenceLedger } => item.ledger !== null);
}

/**
 * 获取所有 Evidence Ledger 的摘要列表。
 */
export async function listEvidenceLedgerSummaries(
  scopeKey: string,
  options: { conversationId?: string; limit?: number } = {},
): Promise<Array<{
  caseId: string;
  conversationId: string;
  entryCount: number;
  lastUpdated: string;
}>> {
  const store = await readStore(scopeKey);
  const summaries: Array<{
    caseId: string;
    conversationId: string;
    entryCount: number;
    lastUpdated: string;
  }> = [];

  for (const [caseId, ledger] of Object.entries(store.ledgers)) {
    // 按 conversationId 过滤
    if (options.conversationId) {
      const caseIds = store.caseIdsByConversation[options.conversationId] ?? [];
      if (!caseIds.includes(caseId)) continue;
    }

    // 找到该 caseId 对应的 conversationId
    let conversationId = '';
    for (const [convId, caseIds] of Object.entries(store.caseIdsByConversation)) {
      if (caseIds.includes(caseId)) {
        conversationId = convId;
        break;
      }
    }

    summaries.push({
      caseId,
      conversationId,
      entryCount: ledger.entries?.length ?? 0,
      lastUpdated: ledger.lastUpdated ?? '',
    });
  }

  // 按 lastUpdated 降序排序
  summaries.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));

  // 限制数量
  if (options.limit && options.limit > 0) {
    return summaries.slice(0, options.limit);
  }
  return summaries;
}

/**
 * 删除指定 caseId 的 Evidence Ledger。
 */
export async function deleteEvidenceLedger(
  scopeKey: string,
  caseId: string,
): Promise<boolean> {
  const store = await readStore(scopeKey);
  if (!store.ledgers[caseId]) return false;

  delete store.ledgers[caseId];

  // 从索引中移除
  for (const convId of Object.keys(store.caseIdsByConversation)) {
    store.caseIdsByConversation[convId] = store.caseIdsByConversation[convId].filter(id => id !== caseId);
  }

  store.lastUpdated = Date.now();
  await writeStore(scopeKey, store);
  return true;
}

// ─── Helper ────────────────────────────────────────────

function cloneLedger(ledger: EvidenceLedger): EvidenceLedger {
  return {
    ...ledger,
    entries: ledger.entries.map(entry => ({
      ...entry,
      content: entry.content && typeof entry.content === 'object'
        ? { ...entry.content }
        : entry.content,
    })),
  };
}

/**
 * 清除内存缓存（用于测试或手动刷新）。
 */
export function clearEvidenceLedgerStoreCache(scopeKey?: string): void {
  if (scopeKey) {
    delete memoryStoreByScope[scopeKey];
  } else {
    memoryStoreByScope = {};
  }
}
