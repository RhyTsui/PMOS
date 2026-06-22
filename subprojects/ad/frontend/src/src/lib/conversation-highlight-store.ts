import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeUserDataPath } from './runtime-data-path';
import type { ConversationHighlight } from '@/types';

/**
 * ConversationHighlightStore
 *
 * 管理会话自动化未读高亮状态。
 * 任务运行结果生成后，在左侧历史会话列表中出现高亮点、未读数、状态文案。
 *
 * 持久化在 .runtime/{scope}/conversation-highlights.json
 */

interface HighlightStoreFile {
  highlights: ConversationHighlight[];
}

const STORE_FILE_NAME = 'conversation-highlights.json';

let storeCacheByScope: Record<string, HighlightStoreFile> = {};
const writeChainsByScope: Record<string, Promise<void>> = {};

function getStorePath(scopeKey: string): string {
  return runtimeUserDataPath(scopeKey, STORE_FILE_NAME);
}

function defaultStore(): HighlightStoreFile {
  return { highlights: [] };
}

function cloneHighlight(item: ConversationHighlight): ConversationHighlight {
  return { ...item };
}

function cloneStore(store: HighlightStoreFile): HighlightStoreFile {
  return { highlights: store.highlights.map(cloneHighlight) };
}

async function readStore(scopeKey: string): Promise<HighlightStoreFile> {
  const cached = storeCacheByScope[scopeKey];
  if (cached) return cloneStore(cached);

  try {
    const raw = await readFile(getStorePath(scopeKey), 'utf8');
    const parsed = JSON.parse(raw) as Partial<HighlightStoreFile>;
    const store: HighlightStoreFile = {
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map(cloneHighlight) : [],
    };
    storeCacheByScope[scopeKey] = store;
    return cloneStore(store);
  } catch {
    const store = defaultStore();
    storeCacheByScope[scopeKey] = store;
    return cloneStore(store);
  }
}

async function writeStore(scopeKey: string, store: HighlightStoreFile): Promise<void> {
  storeCacheByScope[scopeKey] = store;
  const storePath = getStorePath(scopeKey);

  const prev = writeChainsByScope[scopeKey] || Promise.resolve();
  const next = prev.then(
    () => mkdir(path.dirname(storePath), { recursive: true }).then(() =>
      writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8'),
    ),
    () => {
      /* ignore previous write errors */
    },
  );
  writeChainsByScope[scopeKey] = next;
  await next;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * 标记自动化结果未读
 */
export async function markAutomationUnread(input: {
  scopeKey: string;
  conversationId: string;
  messageId: string;
  taskId: string;
  runId: string;
  severity: ConversationHighlight['severity'];
  label: string;
}): Promise<ConversationHighlight> {
  const store = await readStore(input.scopeKey);

  const highlight: ConversationHighlight = {
    id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversation_id: input.conversationId,
    message_id: input.messageId,
    task_id: input.taskId,
    run_id: input.runId,
    severity: input.severity,
    label: input.label,
    read: false,
    created_at: nowIso(),
  };

  store.highlights.push(highlight);
  await writeStore(input.scopeKey, store);
  return cloneHighlight(highlight);
}

/**
 * 标记自动化结果已读
 */
export async function markAutomationRead(input: {
  scopeKey: string;
  conversationId: string;
  messageId?: string;
  userId: string;
}): Promise<void> {
  const store = await readStore(input.scopeKey);

  let changed = false;
  for (const h of store.highlights) {
    if (h.conversation_id === input.conversationId && !h.read) {
      if (input.messageId && h.message_id !== input.messageId) continue;
      h.read = true;
      h.read_at = nowIso();
      h.read_by = input.userId;
      changed = true;
    }
  }

  if (changed) {
    await writeStore(input.scopeKey, store);
  }
}

/**
 * 获取会话未读高亮
 */
export async function getUnreadHighlights(scopeKey: string, conversationId: string): Promise<ConversationHighlight[]> {
  const store = await readStore(scopeKey);
  return store.highlights
    .filter((h) => h.conversation_id === conversationId && !h.read)
    .map(cloneHighlight);
}

/**
 * 获取会话高亮摘要（count + latestSeverity）
 */
export async function getConversationHighlightSummary(
  scopeKey: string,
  conversationId: string,
): Promise<{
  count: number;
  latestSeverity: ConversationHighlight['severity'] | null;
  latestLabel: string;
  latestMessageId: string;
  latestRunId: string;
} | null> {
  const unread = await getUnreadHighlights(scopeKey, conversationId);
  if (unread.length === 0) return null;

  const severityPriority: Record<ConversationHighlight['severity'], number> = {
    error: 4,
    warning: 3,
    success: 2,
    info: 1,
  };

  // failed / needs_action 优先级高于 completed
  const sorted = unread.sort((a, b) => {
    const priorityDiff = severityPriority[b.severity] - severityPriority[a.severity];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const latest = sorted[0];
  return {
    count: unread.length,
    latestSeverity: latest.severity,
    latestLabel: latest.label,
    latestMessageId: latest.message_id,
    latestRunId: latest.run_id,
  };
}

/**
 * 获取所有有未读高亮的会话 ID 列表
 */
export async function getConversationsWithUnread(scopeKey: string): Promise<string[]> {
  const store = await readStore(scopeKey);
  const conversationIds = new Set<string>();
  for (const h of store.highlights) {
    if (!h.read) {
      conversationIds.add(h.conversation_id);
    }
  }
  return Array.from(conversationIds);
}
