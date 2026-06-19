/**
 * CaseFrame Store — 案例帧持久化存储
 *
 * 按 scopeKey（用户维度）存储 CaseFrame，JSON 文件持久化。
 * 复用 conversation-store 的存储模式。
 *
 * 存储路径：.runtime/users/{scopeKey}/case-frames.json
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CaseFrame, CaseFrameSummary } from '@/contracts/case-frame';
import { createCaseFrame as createCaseFrameContract } from '@/contracts/case-frame';
import { runtimeUserDataPath } from './runtime-data-path';
import { depositCaseFrame } from './feedback-loop';

const STORE_FILE_NAME = 'case-frames.json';

export interface CaseFrameStoreFile {
  caseFrames: Record<string, CaseFrame>;  // caseId → CaseFrame
  caseIdsByConversation: Record<string, string[]>;  // conversationId → caseId[]
}

let memoryStoreByScope: Record<string, CaseFrameStoreFile> = {};
const writeChainsByScope: Record<string, Promise<void>> = {};

function getStorePath(scopeKey: string): string {
  return runtimeUserDataPath(scopeKey, STORE_FILE_NAME);
}

function defaultStore(): CaseFrameStoreFile {
  return {
    caseFrames: {},
    caseIdsByConversation: {},
  };
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT');
}

function cloneStore(store: CaseFrameStoreFile): CaseFrameStoreFile {
  return {
    caseFrames: Object.fromEntries(
      Object.entries(store.caseFrames).map(([id, frame]) => [id, { ...frame }])
    ),
    caseIdsByConversation: Object.fromEntries(
      Object.entries(store.caseIdsByConversation).map(([id, ids]) => [id, [...ids]])
    ),
  };
}

export async function readStore(scopeKey: string): Promise<CaseFrameStoreFile> {
  if (memoryStoreByScope[scopeKey]) {
    return cloneStore(memoryStoreByScope[scopeKey]);
  }
  try {
    const raw = await readFile(getStorePath(scopeKey), 'utf8');
    const parsed = JSON.parse(raw) as Partial<CaseFrameStoreFile>;
    const store: CaseFrameStoreFile = {
      caseFrames: parsed.caseFrames && typeof parsed.caseFrames === 'object' ? parsed.caseFrames : {},
      caseIdsByConversation: parsed.caseIdsByConversation && typeof parsed.caseIdsByConversation === 'object'
        ? parsed.caseIdsByConversation
        : {},
    };
    memoryStoreByScope[scopeKey] = store;
    return cloneStore(store);
  } catch (error) {
    if (isMissingFileError(error)) {
      const store = defaultStore();
      memoryStoreByScope[scopeKey] = store;
      return cloneStore(store);
    }
    throw error;
  }
}

export async function writeStore(scopeKey: string, store: CaseFrameStoreFile): Promise<void> {
  memoryStoreByScope[scopeKey] = cloneStore(store);
  const prev = writeChainsByScope[scopeKey] ?? Promise.resolve();
  writeChainsByScope[scopeKey] = prev.then(
    () => mkdir(path.dirname(getStorePath(scopeKey)), { recursive: true })
      .then(() => writeFile(getStorePath(scopeKey), JSON.stringify(store, null, 2), 'utf8'))
  ).catch((error) => {
    console.warn('[case-frame-store] write failed', error instanceof Error ? error.message : String(error));
  });
  await writeChainsByScope[scopeKey];
}

// ─── Public API ────────────────────────────────────────

/**
 * 创建新的 CaseFrame 并保存到存储
 */
export async function createCaseFrame(scopeKey: string, params: {
  conversationId: string;
  initialMessage?: string;
  messageId?: string;
  serviceType?: string;
  realGoal?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}): Promise<CaseFrame> {
  const caseId = `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const frame = createCaseFrameContract({
    caseId,
    conversationId: params.conversationId,
    initialMessage: params.initialMessage,
    messageId: params.messageId,
  });

  // 设置额外参数
  if (params.serviceType) {
    frame.serviceType = params.serviceType as any;
  }
  if (params.realGoal) {
    frame.realGoal = params.realGoal;
  }
  if (params.priority) {
    frame.priority = params.priority;
  }

  await saveCaseFrame(scopeKey, frame);
  return frame;
}

/**
 * 保存或更新 CaseFrame
 */
export async function saveCaseFrame(scopeKey: string, frame: CaseFrame): Promise<CaseFrame> {
  const store = await readStore(scopeKey);
  const previousFrame = store.caseFrames[frame.caseId];
  store.caseFrames[frame.caseId] = { ...frame };
  // 维护 conversation → caseIds 索引
  const convId = frame.conversationId;
  if (!store.caseIdsByConversation[convId]) {
    store.caseIdsByConversation[convId] = [];
  }
  if (!store.caseIdsByConversation[convId].includes(frame.caseId)) {
    store.caseIdsByConversation[convId].push(frame.caseId);
  }
  await writeStore(scopeKey, store);

  // 触发 Feedback Loop：当 frame 进入 resolved 且尚未沉淀时
  if (
    frame.stage === 'resolved' &&
    !frame.deposited &&
    (!previousFrame || previousFrame.stage !== 'resolved')
  ) {
    // 异步沉淀，不阻塞主流程
    void depositCaseFrame(frame).catch(err => {
      console.error('[case-frame-store] feedback deposit failed:', err);
    });
  }

  return { ...frame };
}

/**
 * 获取单个 CaseFrame
 */
export async function getCaseFrame(scopeKey: string, caseId: string): Promise<CaseFrame | null> {
  const store = await readStore(scopeKey);
  const frame = store.caseFrames[caseId];
  return frame ? { ...frame } : null;
}

/**
 * 获取会话下的所有 CaseFrame
 */
export async function listCaseFramesByConversation(
  scopeKey: string,
  conversationId: string,
): Promise<CaseFrame[]> {
  const store = await readStore(scopeKey);
  const caseIds = store.caseIdsByConversation[conversationId] ?? [];
  return caseIds
    .map(id => store.caseFrames[id])
    .filter((frame): frame is CaseFrame => Boolean(frame))
    .map(frame => ({ ...frame }));
}

/**
 * 获取会话下当前活跃的 CaseFrame（未关闭的）
 */
export async function getActiveCaseFrame(
  scopeKey: string,
  conversationId: string,
): Promise<CaseFrame | null> {
  const frames = await listCaseFramesByConversation(scopeKey, conversationId);
  // 返回最后一个未关闭的 case
  for (let i = frames.length - 1; i >= 0; i--) {
    const frame = frames[i];
    if (!['resolved', 'converted_to_task', 'abandoned'].includes(frame.stage)) {
      return frame;
    }
  }
  return null;
}

/**
 * 获取 CaseFrame 摘要列表
 */
export async function listCaseFrameSummaries(
  scopeKey: string,
  options?: {
    conversationId?: string;
    stage?: string;
    limit?: number;
  },
): Promise<CaseFrameSummary[]> {
  const store = await readStore(scopeKey);
  let frames = Object.values(store.caseFrames);

  if (options?.conversationId) {
    frames = frames.filter(f => f.conversationId === options.conversationId);
  }
  if (options?.stage) {
    frames = frames.filter(f => f.stage === options.stage);
  }

  // 按更新时间降序
  frames.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (options?.limit) {
    frames = frames.slice(0, options.limit);
  }

  return frames.map(frame => ({
    caseId: frame.caseId,
    conversationId: frame.conversationId,
    stage: frame.stage,
    serviceType: frame.serviceType,
    realGoal: frame.realGoal,
    priority: frame.priority,
    turnCount: frame.turnCount,
    createdAt: frame.createdAt,
    updatedAt: frame.updatedAt,
    closedAt: frame.closedAt,
    deposited: frame.deposited,
  }));
}

/**
 * 删除 CaseFrame
 */
export async function deleteCaseFrame(scopeKey: string, caseId: string): Promise<boolean> {
  const store = await readStore(scopeKey);
  const frame = store.caseFrames[caseId];
  if (!frame) return false;

  delete store.caseFrames[caseId];
  // 从 conversation 索引中移除
  const convId = frame.conversationId;
  if (store.caseIdsByConversation[convId]) {
    store.caseIdsByConversation[convId] = store.caseIdsByConversation[convId].filter(id => id !== caseId);
  }
  await writeStore(scopeKey, store);
  return true;
}

/**
 * 清除内存缓存（用于测试）
 */
export function clearCaseFrameStoreCache(scopeKey?: string): void {
  if (scopeKey) {
    delete memoryStoreByScope[scopeKey];
  } else {
    memoryStoreByScope = {};
  }
}
