import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Conversation, Message } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'conversations.json');

interface ConversationStoreFile {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
}

export interface ConversationSearchHit {
  conversation_id: string;
  title: string;
  updated_at: string;
  matchCount: number;
  snippets: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultStore(): ConversationStoreFile {
  return {
    conversations: [],
    messagesByConversation: {},
  };
}

async function readStore(): Promise<ConversationStoreFile> {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ConversationStoreFile>;
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      messagesByConversation: parsed.messagesByConversation || {},
    };
  } catch {
    return defaultStore();
  }
}

async function writeStore(store: ConversationStoreFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function buildConversationTitle(input?: string): string {
  const text = (input || '').trim();
  if (!text) {
    return '新会话';
  }
  return text.length > 24 ? `${text.slice(0, 24)}...` : text;
}

export async function listConversations(): Promise<Conversation[]> {
  const store = await readStore();
  return [...store.conversations].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const conversations = await listConversations();
  return conversations.find(item => item.conversation_id === id);
}

export async function createConversation(data: { title?: string } = {}): Promise<Conversation> {
  const store = await readStore();
  const now = nowIso();
  const conversation: Conversation = {
    conversation_id: `conv-${Date.now()}`,
    user_id: 'user-001',
    title: buildConversationTitle(data.title),
    status: '普通对话',
    started_at: now,
    updated_at: now,
    last_message_at: now,
    current_mode: 'natural-chat',
    message_count: 0,
  };
  store.conversations = [conversation, ...store.conversations];
  store.messagesByConversation[conversation.conversation_id] = [];
  await writeStore(store);
  return conversation;
}

export async function updateConversation(
  id: string,
  patch: Partial<Pick<Conversation, 'title' | 'status' | 'current_mode' | 'latest_task_id'>>,
): Promise<Conversation | undefined> {
  const store = await readStore();
  const current = store.conversations.find(item => item.conversation_id === id);
  if (!current) {
    return undefined;
  }
  const next: Conversation = {
    ...current,
    ...patch,
    title: patch.title ? buildConversationTitle(patch.title) : current.title,
    updated_at: nowIso(),
  };
  store.conversations = store.conversations.map(item => item.conversation_id === id ? next : item);
  await writeStore(store);
  return next;
}

export async function deleteConversation(id: string): Promise<boolean> {
  const store = await readStore();
  const exists = store.conversations.some(item => item.conversation_id === id);
  if (!exists) {
    return false;
  }

  store.conversations = store.conversations.filter(item => item.conversation_id !== id);
  delete store.messagesByConversation[id];
  await writeStore(store);
  return true;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const store = await readStore();
  return [...(store.messagesByConversation[conversationId] || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export async function addMessage(
  conversationId: string,
  input: { role: Message['role']; content: string; message_type?: Message['message_type'] },
): Promise<Message> {
  const store = await readStore();
  const conversation = store.conversations.find(item => item.conversation_id === conversationId);
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
  };

  const currentMessages = store.messagesByConversation[conversationId] || [];
  store.messagesByConversation[conversationId] = [...currentMessages, message];
  const maybeTitle = conversation.message_count ? conversation.title : buildConversationTitle(input.content);
  store.conversations = store.conversations.map(item => item.conversation_id === conversationId
    ? {
      ...item,
      title: maybeTitle,
      updated_at: now,
      last_message_at: now,
      message_count: (item.message_count || 0) + 1,
    }
    : item);

  await writeStore(store);
  return message;
}

export async function searchConversations(keyword: string): Promise<ConversationSearchHit[]> {
  const store = await readStore();
  const query = keyword.trim().toLowerCase();
  if (!query) return [];

  return store.conversations
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
