import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MemoryEntry } from '@/types';
import { DEMO_MEMORIES } from './demo-data';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';

const MEMORY_PATH = runtimeDataPath('user-memory.json');
const LEGACY_MEMORY_PATH = legacyDataPath('user-memory.json');
const DEFAULT_USER_ID = 'user-001';

interface MemoryFile {
  memories: MemoryEntry[];
}

function normalizeMemory(input: Partial<MemoryEntry>): MemoryEntry {
  const now = Date.now();
  return {
    id: input.id || `mem-${now}`,
    user_id: input.user_id || DEFAULT_USER_ID,
    content: input.content || '',
    memory_type: input.memory_type || 'fact',
    source: input.source || 'user_input',
    source_conversation_id: input.source_conversation_id,
    keywords: Array.isArray(input.keywords) ? input.keywords : [],
    business_domain: input.business_domain,
    importance: input.importance || 3,
    access_count: input.access_count || 0,
    last_accessed_at: input.last_accessed_at,
    archived: Boolean(input.archived),
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
  };
}

async function readMemoryFile(): Promise<MemoryFile> {
  for (const filePath of [MEMORY_PATH, LEGACY_MEMORY_PATH]) {
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<MemoryFile>;
      if (Array.isArray(parsed.memories)) {
        return { memories: parsed.memories.map(normalizeMemory) };
      }
    } catch {
      // Try next location.
    }
  }
  return { memories: DEMO_MEMORIES.map(item => normalizeMemory({ ...item, user_id: DEFAULT_USER_ID })) };
}

async function writeMemoryFile(file: MemoryFile): Promise<void> {
  await mkdir(path.dirname(MEMORY_PATH), { recursive: true });
  await writeFile(MEMORY_PATH, JSON.stringify(file, null, 2), 'utf8');
}

export interface MemoryListFilter {
  user_id?: string;
  memory_type?: string;
  business_domain?: string;
}

export async function listUserMemories(filter: MemoryListFilter = {}): Promise<MemoryEntry[]> {
  const userId = filter.user_id || DEFAULT_USER_ID;
  const file = await readMemoryFile();
  return file.memories
    .filter(item => !item.archived)
    .filter(item => (item.user_id || DEFAULT_USER_ID) === userId)
    .filter(item => !filter.memory_type || item.memory_type === filter.memory_type)
    .filter(item => !filter.business_domain || item.business_domain === filter.business_domain)
    .sort((a, b) => b.updated_at - a.updated_at);
}

export async function getUserMemory(id: string): Promise<MemoryEntry | undefined> {
  const file = await readMemoryFile();
  return file.memories.find(item => item.id === id);
}

export async function createUserMemory(data: Partial<MemoryEntry>): Promise<MemoryEntry> {
  const file = await readMemoryFile();
  const memory = normalizeMemory({
    ...data,
    id: data.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: Date.now(),
    updated_at: Date.now(),
  });
  file.memories = [memory, ...file.memories];
  await writeMemoryFile(file);
  return memory;
}

export async function upsertUserMemoryByKey(data: Partial<MemoryEntry> & { user_id?: string; key?: string }): Promise<MemoryEntry> {
  const file = await readMemoryFile();
  const userId = data.user_id || DEFAULT_USER_ID;
  const key = data.key || data.keywords?.[0];
  const existing = key
    ? file.memories.find(item =>
      (item.user_id || DEFAULT_USER_ID) === userId &&
      !item.archived &&
      item.keywords.includes(key))
    : undefined;

  if (!existing) {
    return createUserMemory({ ...data, user_id: userId });
  }

  const updated = normalizeMemory({
    ...existing,
    ...data,
    user_id: userId,
    keywords: data.keywords || existing.keywords,
    access_count: existing.access_count,
    created_at: existing.created_at,
    updated_at: Date.now(),
  });
  file.memories = file.memories.map(item => item.id === existing.id ? updated : item);
  await writeMemoryFile(file);
  return updated;
}

export async function updateUserMemory(id: string, patch: Partial<MemoryEntry>): Promise<MemoryEntry | undefined> {
  const file = await readMemoryFile();
  let updated: MemoryEntry | undefined;
  file.memories = file.memories.map((item) => {
    if (item.id !== id) return item;
    updated = normalizeMemory({ ...item, ...patch, id, updated_at: Date.now() });
    return updated;
  });
  if (!updated) return undefined;
  await writeMemoryFile(file);
  return updated;
}

export async function archiveUserMemory(id: string): Promise<MemoryEntry | undefined> {
  return updateUserMemory(id, { archived: true });
}

export async function deleteUserMemory(id: string): Promise<boolean> {
  const file = await readMemoryFile();
  const before = file.memories.length;
  file.memories = file.memories.filter(item => item.id !== id);
  await writeMemoryFile(file);
  return file.memories.length < before;
}

export async function searchUserMemories(query: string, userId = DEFAULT_USER_ID): Promise<MemoryEntry[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const file = await readMemoryFile();
  return file.memories
    .filter(item => !item.archived && (item.user_id || DEFAULT_USER_ID) === userId)
    .filter(item =>
      item.content.toLowerCase().includes(q) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(q)) ||
      item.business_domain?.toLowerCase().includes(q))
    .sort((a, b) => b.importance - a.importance || b.updated_at - a.updated_at);
}
