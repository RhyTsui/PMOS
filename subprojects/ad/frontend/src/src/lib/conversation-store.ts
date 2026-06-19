import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Conversation, Message, ProjectBinding } from '@/types';
import { runtimeUserDataPath } from './runtime-data-path';
import { normalizeConversationTitle, type NormalizeConversationTitleOptions } from './conversation-title';

const STORE_FILE_NAME = 'conversations.json';
const SHOULD_PERSIST_STORE = process.env.XIAOQIAO_PERSIST_DEV_STORE !== 'false';

interface ConversationStoreFile {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
}

export interface ConversationListOptions {
  limit?: number;
  cursor?: string;
  project_refs?: string[];
}

export interface MessageListOptions {
  limit?: number;
  before?: string;
}

export interface ConversationSearchHit {
  conversation_id: string;
  title: string;
  updated_at: string;
  matchCount: number;
  snippets: string[];
}

type StoreCache = Record<string, ConversationStoreFile>;

let memoryStoreByScope: StoreCache = {};
const writeChainsByScope: Record<string, Promise<void>> = {};

function nowIso(): string {
  return new Date().toISOString();
}

function getStorePath(scopeKey: string): string {
  return runtimeUserDataPath(scopeKey, STORE_FILE_NAME);
}

function defaultStore(): ConversationStoreFile {
  return {
    conversations: [],
    messagesByConversation: {},
  };
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT');
}

function cloneStore(store: ConversationStoreFile): ConversationStoreFile {
  return {
    conversations: store.conversations.map((item) => ({ ...item })),
    messagesByConversation: Object.fromEntries(
      Object.entries(store.messagesByConversation).map(([conversationId, messages]) => [
        conversationId,
        messages.map((message) => ({ ...message })),
      ]),
    ),
  };
}

function buildConversationTitle(input?: string, options?: Parameters<typeof normalizeConversationTitle>[1]): string {
    return normalizeConversationTitle(input || '新会话', options);
}

function normalizeProjectBinding(value: unknown): ProjectBinding | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const projectRefs = Array.isArray(record.project_refs)
    ? record.project_refs.map((item) => String(item).trim()).filter(Boolean)
    : [];
  if (!projectRefs.length) return undefined;
  return {
    project_refs: projectRefs,
    default_project_ref: typeof record.default_project_ref === 'string' ? record.default_project_ref.trim() || undefined : undefined,
    last_active_project_ref: typeof record.last_active_project_ref === 'string' ? record.last_active_project_ref.trim() || undefined : undefined,
    source_project_refs: Array.isArray(record.source_project_refs)
      ? record.source_project_refs.map((item) => String(item).trim()).filter(Boolean)
      : undefined,
  };
}

function isProjectBindingVisible(projectBinding: ProjectBinding | undefined, projectRefs: string[] = []) {
  const requestedRefs = projectRefs.map((item) => String(item).trim()).filter(Boolean);
  if (!projectBinding || projectBinding.project_refs.length === 0) return true;
  if (!requestedRefs.length) return true;
  return Boolean(requestedRefs.find((ref) => projectBinding.project_refs.indexOf(ref) >= 0));
}

function normalizeConversationRecord(record: Conversation, scopeKey: string): Conversation {
  const recordMap = record as unknown as Record<string, unknown>;
  return {
    ...record,
    user_id: scopeKey,
    title: buildConversationTitle(record.title),
    project_binding: normalizeProjectBinding(recordMap.project_binding),
  };
}

function normalizeStore(store: Partial<ConversationStoreFile>, scopeKey: string): ConversationStoreFile {
  const messagesByConversation = store.messagesByConversation || {};
  const normalizedMessagesByConversation = Object.fromEntries(
    Object.entries(messagesByConversation).map(([conversationId, messages]) => [
      conversationId,
      Array.isArray(messages) ? messages.map((message) => ({ ...message })) : [],
    ]),
  );
  const conversations = Array.isArray(store.conversations)
    ? store.conversations.map((item) => {
      const conversation = normalizeConversationRecord(item, scopeKey);
      const messages = normalizedMessagesByConversation[conversation.conversation_id];
      return {
        ...conversation,
        message_count: Array.isArray(messages) ? messages.length : Number(conversation.message_count || 0),
      };
    })
    : [];

  for (const conversation of conversations) {
    if (!Array.isArray(normalizedMessagesByConversation[conversation.conversation_id])) {
      normalizedMessagesByConversation[conversation.conversation_id] = [];
    }
  }

  return {
    conversations,
    messagesByConversation: normalizedMessagesByConversation,
  };
}

function findJsonArrayEnd(raw: string, arrayStart: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = arrayStart; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = inString;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

function parseConversationIndex(raw: string, scopeKey: string): Conversation[] | null {
  const keyIndex = raw.indexOf('"conversations"');
  if (keyIndex < 0) return null;
  const arrayStart = raw.indexOf('[', keyIndex);
  if (arrayStart < 0) return null;
  const arrayEnd = findJsonArrayEnd(raw, arrayStart);
  if (arrayEnd < 0) return null;
  const conversations = JSON.parse(raw.slice(arrayStart, arrayEnd)) as Conversation[];
  return conversations.map((item) => normalizeConversationRecord(item, scopeKey));
}

function parseConversationMessages(raw: string, conversationId: string): Message[] | null {
  const mapKeyIndex = raw.indexOf('"messagesByConversation"');
  if (mapKeyIndex < 0) return null;
  const keyIndex = raw.indexOf(JSON.stringify(conversationId), mapKeyIndex);
  if (keyIndex < 0) return [];
  const colonIndex = raw.indexOf(':', keyIndex);
  if (colonIndex < 0) return null;
  const arrayStart = raw.indexOf('[', colonIndex);
  if (arrayStart < 0) return null;
  const arrayEnd = findJsonArrayEnd(raw, arrayStart);
  if (arrayEnd < 0) return null;
  return JSON.parse(raw.slice(arrayStart, arrayEnd)) as Message[];
}

async function readConversationIndex(scopeKey: string): Promise<Conversation[]> {
  const cached = memoryStoreByScope[scopeKey];
  if (cached) {
    return cached.conversations.map((item) => normalizeConversationRecord(item, scopeKey));
  }

  const scopedPath = getStorePath(scopeKey);
  try {
    const raw = await readFile(scopedPath, 'utf8');
    const conversations = parseConversationIndex(raw, scopeKey);
    if (conversations) return conversations;
    const parsed = JSON.parse(raw) as Partial<ConversationStoreFile>;
    return normalizeStore(parsed, scopeKey).conversations;
  } catch {
    // start with an empty scoped conversation store
  }
  return [];
}

async function readMessagesForConversation(conversationId: string, scopeKey: string): Promise<Message[]> {
  const cached = memoryStoreByScope[scopeKey];
  if (cached) {
    return (cached.messagesByConversation[conversationId] || []).map((message) => ({ ...message }));
  }

  const scopedPath = getStorePath(scopeKey);
  try {
    const raw = await readFile(scopedPath, 'utf8');
    const messages = parseConversationMessages(raw, conversationId);
    if (messages) return messages.map((message) => ({ ...message }));
    const parsed = JSON.parse(raw) as Partial<ConversationStoreFile>;
    const normalized = normalizeStore(parsed, scopeKey);
    return (normalized.messagesByConversation[conversationId] || []).map((message) => ({ ...message }));
  } catch {
    // start with an empty message list for this conversation
  }
  return [];
}

async function readStore(scopeKey: string): Promise<ConversationStoreFile> {
  const cached = memoryStoreByScope[scopeKey];
  if (cached) {
    return cloneStore(cached);
  }

  const scopedPath = getStorePath(scopeKey);
  try {
    const raw = await readFile(scopedPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ConversationStoreFile>;
    const normalized = normalizeStore(parsed, scopeKey);
    memoryStoreByScope[scopeKey] = normalized;
    return cloneStore(normalized);
  } catch (error) {
    if (!isMissingFileError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`conversation_store_read_failed:${scopeKey}:${message}`);
    }
    // start with an empty scoped conversation store only when no file exists yet
  }

  const store = defaultStore();
  memoryStoreByScope[scopeKey] = store;
  return cloneStore(store);
}

async function writeStore(scopeKey: string, store: ConversationStoreFile): Promise<void> {
  memoryStoreByScope[scopeKey] = cloneStore(store);
  if (!SHOULD_PERSIST_STORE) {
    return;
  }
  const storePath = getStorePath(scopeKey);
  await mkdir(path.dirname(storePath), { recursive: true });
  const tmpPath = `${storePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  await rename(tmpPath, storePath);
}

async function updateStore<T>(
  scopeKey: string,
  mutator: (store: ConversationStoreFile) => T | Promise<T>,
): Promise<T> {
  let result: T;
  const run = async () => {
    const store = await readStore(scopeKey);
    result = await mutator(store);
    await writeStore(scopeKey, store);
  };
  const previous = writeChainsByScope[scopeKey] || Promise.resolve();
  const next = previous.then(run, run);
  writeChainsByScope[scopeKey] = next.catch(() => undefined);
  await next;
  return result!;
}

export async function listConversations(scopeKey: string, options: ConversationListOptions = {}): Promise<Conversation[]> {
  const limit = Number.isFinite(Number(options.limit)) && Number(options.limit) > 0
    ? Math.min(Number(options.limit), 100)
    : undefined;
  const cursorTime = options.cursor ? new Date(options.cursor).getTime() : NaN;
  const conversations = await readConversationIndex(scopeKey);
  const sorted = conversations
    .map((item) => ({
      ...item,
      user_id: scopeKey,
      title: buildConversationTitle(item.title),
      message_count: Number(item.message_count || 0),
    }))
    .filter((item) => isProjectBindingVisible(item.project_binding, options.project_refs))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const filtered = Number.isFinite(cursorTime)
    ? sorted.filter((item) => new Date(item.updated_at).getTime() < cursorTime)
    : sorted;
  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}

export async function getConversation(id: string, scopeKey: string): Promise<Conversation | undefined> {
  const conversations = await readConversationIndex(scopeKey);
  return conversations.find((item) => item.conversation_id === id);
}

export async function createConversation(
  scopeKey: string,
  data: { title?: string; project_binding?: ProjectBinding } = {},
): Promise<Conversation> {
  return updateStore(scopeKey, (store) => {
    const now = nowIso();
    const conversation: Conversation = {
      conversation_id: `conv-${Date.now()}`,
      user_id: scopeKey,
      title: buildConversationTitle(data.title),
      status: '普通对话',
      started_at: now,
      updated_at: now,
      last_message_at: now,
      current_mode: 'natural-chat',
      project_binding: data.project_binding,
      message_count: 0,
    };
    store.conversations = [conversation, ...store.conversations];
    store.messagesByConversation[conversation.conversation_id] = [];
    return conversation;
  });
}

export async function updateConversation(
  id: string,
  patch: Partial<Pick<Conversation, 'title' | 'status' | 'current_mode' | 'latest_task_id' | 'project_binding'>>,
  scopeKey: string,
  titleOptions: NormalizeConversationTitleOptions = {},
): Promise<Conversation | undefined> {
  return updateStore(scopeKey, (store) => {
    const current = store.conversations.find((item) => item.conversation_id === id);
    if (!current) {
      return undefined;
    }
    const next: Conversation = {
      ...current,
      ...patch,
      title: patch.title ? buildConversationTitle(patch.title, titleOptions) : current.title,
      message_count: (store.messagesByConversation[id] || []).length,
      updated_at: nowIso(),
    };
    store.conversations = store.conversations.map((item) => (item.conversation_id === id ? next : item));
    return next;
  });
}

export async function deleteConversation(id: string, scopeKey: string): Promise<boolean> {
  return updateStore(scopeKey, (store) => {
    const exists = store.conversations.some((item) => item.conversation_id === id);
    if (!exists) {
      return false;
    }

    store.conversations = store.conversations.filter((item) => item.conversation_id !== id);
    delete store.messagesByConversation[id];
    return true;
  });
}

function trimRows(value: unknown, maxRows: number): unknown {
  if (!Array.isArray(value)) return value;
  return value.slice(0, maxRows);
}

function slimReportResult(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return {
    ...record,
    rows: trimRows(record.rows, 30),
    raw_result_preview: trimRows(record.raw_result_preview, 10),
    __preview: Array.isArray(record.rows) && record.rows.length > 30
      ? { rows_total: record.rows.length, rows_included: 30 }
      : record.__preview,
  };
}

function slimMessageForTransport(message: Message): Message {
  const metadata = message.metadata && typeof message.metadata === 'object'
    ? { ...(message.metadata as Record<string, unknown>) }
    : undefined;
  if (!metadata) return message;

  metadata.report_query_result = slimReportResult(metadata.report_query_result);
  if (metadata.workflow_result && typeof metadata.workflow_result === 'object' && !Array.isArray(metadata.workflow_result)) {
    const workflowResult = { ...(metadata.workflow_result as Record<string, unknown>) };
    workflowResult.report_query_result = slimReportResult(workflowResult.report_query_result);
    if (workflowResult.structured_payload && typeof workflowResult.structured_payload === 'object' && !Array.isArray(workflowResult.structured_payload)) {
      const structuredPayload = { ...(workflowResult.structured_payload as Record<string, unknown>) };
      structuredPayload.report_query_result = slimReportResult(structuredPayload.report_query_result);
      workflowResult.structured_payload = structuredPayload;
    }
    if (workflowResult.reasoning_artifacts) {
      workflowResult.reasoning_artifacts = { omitted: true, reason: 'lazy_loaded' };
    }
    metadata.workflow_result = workflowResult;
  }
  if (Array.isArray(metadata.process_events) && metadata.process_events.length > 20) {
    metadata.process_events = metadata.process_events.slice(-20);
  }
  return { ...message, metadata };
}

export async function listMessages(conversationId: string, scopeKey: string, options: MessageListOptions = {}): Promise<Message[]> {
  const messages = await readMessagesForConversation(conversationId, scopeKey);
  const limit = Number.isFinite(Number(options.limit)) && Number(options.limit) > 0
    ? Math.min(Number(options.limit), 100)
    : undefined;
  const beforeTime = options.before ? new Date(options.before).getTime() : NaN;
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const filtered = Number.isFinite(beforeTime)
    ? sorted.filter((item) => new Date(item.created_at).getTime() < beforeTime)
    : sorted;
  const windowed = typeof limit === 'number' ? filtered.slice(-limit) : filtered;
  return windowed.map(slimMessageForTransport);
}

export async function addMessage(
  conversationId: string,
  input: {
    role: Message['role'];
    content: string;
    message_type?: Message['message_type'];
    agent?: Message['agent'];
    intent_type?: Message['intent_type'];
    tool_calls?: Message['tool_calls'];
    process_events?: Message['process_events'];
    missing_fields?: Message['missing_fields'];
    evidence_ids?: Message['evidence_ids'];
    routing_decision?: Message['routing_decision'];
    metadata?: Message['metadata'];
  },
  scopeKey: string,
): Promise<Message> {
  return updateStore(scopeKey, (store) => {
    const conversation = store.conversations.find((item) => item.conversation_id === conversationId);
    if (!conversation) {
      throw new Error('conversation not found');
    }

    const now = nowIso();
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const message: Message = {
      id,
      message_id: id,
      conversation_id: conversationId,
      role: input.role,
      content: input.content,
      message_type: input.message_type || (input.role === 'assistant' ? 'assistant_reply' : 'user_input'),
      created_at: now,
      timestamp: Date.now(),
      agent: input.agent,
      intent_type: input.intent_type,
      tool_calls: input.tool_calls,
      process_events: input.process_events,
      missing_fields: input.missing_fields,
      evidence_ids: input.evidence_ids,
      routing_decision: input.routing_decision,
      metadata: input.metadata,
    };

    const currentMessages = store.messagesByConversation[conversationId] || [];
    const nextMessages = [...currentMessages, message];
    store.messagesByConversation[conversationId] = nextMessages;
    store.conversations = store.conversations.map((item) => (
      item.conversation_id === conversationId
        ? {
          ...item,
          title: conversation.title,
          updated_at: now,
          last_message_at: now,
          message_count: nextMessages.length,
        }
        : item
    ));

    return message;
  });
}

export async function searchConversations(keyword: string, scopeKey: string, options: { project_refs?: string[] } = {}): Promise<ConversationSearchHit[]> {
  const store = await readStore(scopeKey);
  const query = keyword.trim().toLowerCase();
  if (!query) return [];

  return store.conversations
    .filter((conversation) => isProjectBindingVisible(conversation.project_binding, options.project_refs))
    .map((conversation) => {
      const messages = store.messagesByConversation[conversation.conversation_id] || [];
      const titleMatched = conversation.title.toLowerCase().includes(query);
      const matchedMessages = messages.filter((message) => message.content.toLowerCase().includes(query));
      const snippets = matchedMessages
        .slice(0, 3)
        .map((message) => message.content.replace(/\s+/g, ' ').trim().slice(0, 72));

      if (!titleMatched && matchedMessages.length === 0) {
        return null;
      }

      return {
        conversation_id: conversation.conversation_id,
        title: conversation.title,
        updated_at: conversation.updated_at,
        matchCount: (titleMatched ? 1 : 0) + matchedMessages.length,
        snippets,
      } satisfies ConversationSearchHit;
    })
    .filter((item): item is ConversationSearchHit => Boolean(item))
    .sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
}
