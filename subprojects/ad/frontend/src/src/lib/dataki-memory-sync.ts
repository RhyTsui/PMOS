import type { MemoryEntry } from '@/types';
import {
  getKnowledgeBaseApiKey,
  getKnowledgeBaseId,
  getKnowledgeBasesEndpoint,
  getKnowledgeApiBase,
  getModelServiceConfig,
  type ModelServiceConfig,
} from './runtime-config';
import { listUserMemories, updateUserMemory } from './user-memory-store';
import { getDatakiApiKeyForScope } from './dataki-user-key-service';

const MEMORY_KNOWLEDGE_BASE_NAME = '小乔智投-徐韵-记忆库';
const DEFAULT_USER_ID = 'user-001';
const SYNC_TIMEOUT_MS = 8000;

interface DatakiRuntimeConfig extends ModelServiceConfig {
  personalKnowledgeApiKey?: string;
  personalKnowledgeApiBase?: string;
}

interface DatakiFetchResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

export interface DatakiMemorySyncResult {
  status: 'synced' | 'failed' | 'skipped';
  message: string;
  knowledge_base_id?: string;
  synced_count: number;
  failed_count: number;
  document_ids: string[];
  errors: string[];
}

interface KnowledgeBaseMatch {
  id: string;
  name: string;
}

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' ? input as Record<string, unknown> : {};
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

async function datakiFetch<T = Record<string, unknown>>(
  url: string,
  config: DatakiRuntimeConfig,
  init: RequestInit = {},
): Promise<DatakiFetchResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.personalKnowledgeApiKey || getKnowledgeBaseApiKey(config),
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let data: unknown = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { text };
      }
    }
    const record = asRecord(data);
    const nestedError = asRecord(record.error);
    const message = pickString(record, ['message', 'error'])
      || pickString(nestedError, ['message'])
      || (response.ok ? '' : `HTTP ${response.status}`);
    return {
      ok: response.ok && record.success !== false,
      status: response.status,
      data: data as T,
      error: message,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {} as T,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractKnowledgeBases(data: unknown): KnowledgeBaseMatch[] {
  const record = asRecord(data);
  const candidates = [
    record.data,
    asRecord(record.data).items,
    asRecord(record.data).list,
    record.items,
    record.list,
    record.knowledge_bases,
  ];
  const list = candidates.find(Array.isArray) as unknown[] | undefined;
  return (list || [])
    .map(item => {
      const itemRecord = asRecord(item);
      return {
        id: pickString(itemRecord, ['id', 'knowledge_base_id', 'dataset_id']),
        name: pickString(itemRecord, ['name', 'title', 'knowledge_base_name']),
      };
    })
    .filter(item => item.id);
}

async function hasWritableKnowledgeStorage(
  config: DatakiRuntimeConfig,
  knowledgeBaseId: string,
): Promise<boolean> {
  const apiBase = config.personalKnowledgeApiBase || getKnowledgeApiBase(config);
  if (!apiBase) return false;
  const detail = await datakiFetch(`${apiBase}/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}`, config, { method: 'GET' });
  if (!detail.ok) return false;
  const record = asRecord(detail.data);
  const data = asRecord(record.data);
  const vectorStoreId = pickString(data, ['vector_store_id']);
  const storageProvider = asRecord(data.storage_provider_config);
  return Boolean(vectorStoreId || pickString(storageProvider, ['provider']));
}

function extractDocumentId(data: unknown): string {
  const record = asRecord(data);
  const dataRecord = asRecord(record.data);
  return pickString(record, ['id', 'document_id', 'doc_id', 'knowledge_id'])
    || pickString(dataRecord, ['id', 'document_id', 'doc_id', 'knowledge_id']);
}

function extractKnowledgeItems(data: unknown): Array<{ id: string; title: string; type: string }> {
  const record = asRecord(data);
  const candidates = [
    record.data,
    asRecord(record.data).items,
    asRecord(record.data).list,
    record.items,
    record.list,
  ];
  const list = candidates.find(Array.isArray) as unknown[] | undefined;
  return (list || [])
    .map(item => {
      const itemRecord = asRecord(item);
      return {
        id: pickString(itemRecord, ['id', 'knowledge_id', 'doc_id']),
        title: pickString(itemRecord, ['title', 'name', 'file_name']),
        type: pickString(itemRecord, ['type', 'file_type']),
      };
    })
    .filter(item => item.id);
}

async function resolveMemoryKnowledgeBase(config: DatakiRuntimeConfig): Promise<{ id: string; error?: string }> {
  const configuredId = getKnowledgeBaseId(config);
  const endpoint = config.personalKnowledgeApiBase
    ? `${config.personalKnowledgeApiBase}/knowledge-bases`
    : getKnowledgeBasesEndpoint(config);
  if (!endpoint) {
    return configuredId
      ? { id: configuredId }
      : { id: '', error: 'Dataki 知识库地址未配置' };
  }

  const listed = await datakiFetch(endpoint, config, { method: 'GET' });
  if (listed.ok) {
    const matched = extractKnowledgeBases(listed.data).find(item => item.name === MEMORY_KNOWLEDGE_BASE_NAME);
    if (matched && await hasWritableKnowledgeStorage(config, matched.id)) return { id: matched.id };
  }

  const createPayloads = [
    {
      name: MEMORY_KNOWLEDGE_BASE_NAME,
      description: '小乔智投长期业务记忆库',
      type: 'document',
      is_temporary: false,
      storage_provider_config: { provider: 'local' },
      question_generation_config: { enabled: false, question_count: 3 },
    },
    {
      title: MEMORY_KNOWLEDGE_BASE_NAME,
      name: MEMORY_KNOWLEDGE_BASE_NAME,
      description: '小乔智投长期业务记忆库',
      type: 'document',
      is_temporary: false,
      storage_provider_config: { provider: 'local' },
      question_generation_config: { enabled: false, question_count: 3 },
    },
    {
      name: `${MEMORY_KNOWLEDGE_BASE_NAME}-自动同步`,
      description: '小乔智投长期业务记忆自动同步库',
      type: 'document',
      is_temporary: false,
      storage_provider_config: { provider: 'local' },
      question_generation_config: { enabled: false, question_count: 3 },
    },
  ];
  const errors: string[] = [];
  for (const payload of createPayloads) {
    const created = await datakiFetch(endpoint, config, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (created.ok) {
      const id = extractDocumentId(created.data)
        || pickString(asRecord(created.data), ['knowledge_base_id', 'dataset_id']);
      if (id) return { id };
    }
    errors.push(created.error || `HTTP ${created.status}`);
  }

  return {
    id: '',
    error: `未能获取或创建 Dataki 记忆知识库：${errors.filter(Boolean).join('；') || listed.error || '未知错误'}${configuredId ? `；后台配置知识库 ${configuredId} 未作为记忆库使用，避免写入业务知识库。` : ''}`,
  };
}

function formatShanghaiDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

function formatShanghaiDay(timestamp: number): string {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const year = parts.find(part => part.type === 'year')?.value || '1970';
  const month = parts.find(part => part.type === 'month')?.value || '01';
  const day = parts.find(part => part.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

function buildMemoryDocument(day: string, memories: MemoryEntry[]): { title: string; content: string; metadata: Record<string, unknown> } {
  const title = `小乔智投记忆-${day}`;
  const content = [
    `# ${title}`,
    '',
    `- 账号：徐韵`,
    `- 日期：${day}`,
    `- 记忆数：${memories.length}`,
    `- 更新时间：${formatShanghaiDateTime(Date.now())}`,
    '',
    ...memories.map((memory, index) => [
      `## ${index + 1}. ${memory.business_domain || memory.memory_type}`,
      '',
      `- 记忆ID：${memory.id}`,
      `- 类型：${memory.memory_type}`,
      `- 关键词：${memory.keywords.join('、') || '无'}`,
      `- 重要度：${memory.importance}`,
      `- 来源：${memory.source}`,
      `- 更新时间：${formatShanghaiDateTime(memory.updated_at)}`,
      '',
      memory.content,
      '',
    ].join('\n')),
  ].join('\n');
  return {
    title,
    content,
    metadata: {
      source: 'xiaoqiao_chat_memory',
      owner: 'xuyun',
      day,
      memory_count: memories.length,
    },
  };
}

async function upsertKnowledgeDocument(
  config: DatakiRuntimeConfig,
  knowledgeBaseId: string,
  document: { title: string; content: string; metadata: Record<string, unknown> },
): Promise<{ ok: boolean; documentId?: string; error?: string }> {
  const apiBase = config.personalKnowledgeApiBase || getKnowledgeApiBase(config);
  if (!apiBase) return { ok: false, error: 'Dataki 知识库地址未配置' };

  const listUrl = new URL(`${apiBase}/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/knowledge`);
  listUrl.searchParams.set('page', '1');
  listUrl.searchParams.set('page_size', '20');
  listUrl.searchParams.set('keyword', document.title);
  listUrl.searchParams.set('file_type', 'manual');
  const listed = await datakiFetch(listUrl.toString(), config, { method: 'GET' });
  const existing = listed.ok
    ? extractKnowledgeItems(listed.data).find(item => item.title === document.title)
    : undefined;
  let updateError = '';

  if (existing?.id) {
    const updated = await datakiFetch(`${apiBase}/knowledge/manual/${encodeURIComponent(existing.id)}`, config, {
      method: 'PUT',
      body: JSON.stringify({
        title: document.title,
        content: document.content,
        status: 'publish',
        channel: 'api',
      }),
    });
    if (updated.ok) {
      return {
        ok: true,
        documentId: extractDocumentId(updated.data) || existing.id,
      };
    }
    updateError = updated.error || `HTTP ${updated.status}`;
  }

  const created = await datakiFetch(`${apiBase}/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/knowledge/manual`, config, {
    method: 'POST',
    body: JSON.stringify({
      title: document.title,
      content: document.content,
      status: 'publish',
      channel: 'api',
    }),
  });
  if (created.ok) {
    return {
      ok: true,
      documentId: extractDocumentId(created.data) || document.title,
    };
  }

  const documentKey = encodeURIComponent(document.title);
  const attempts: Array<{ method: string; url: string; body: Record<string, unknown> }> = [
    {
      method: 'PUT',
      url: `${apiBase}/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents/${documentKey}`,
      body: {
        title: document.title,
        name: document.title,
        content: document.content,
        text: document.content,
        metadata: document.metadata,
      },
    },
    {
      method: 'POST',
      url: `${apiBase}/knowledge-bases/${encodeURIComponent(knowledgeBaseId)}/documents`,
      body: {
        title: document.title,
        name: document.title,
        content: document.content,
        text: document.content,
        metadata: document.metadata,
      },
    },
    {
      method: 'POST',
      url: `${apiBase}/documents`,
      body: {
        knowledge_base_id: knowledgeBaseId,
        title: document.title,
        name: document.title,
        content: document.content,
        text: document.content,
        metadata: document.metadata,
      },
    },
  ];

  const errors: string[] = [];
  if (listed.error) errors.push(`GET ${listUrl.toString()}: ${listed.error}`);
  if (existing?.id) errors.push(`PUT ${apiBase}/knowledge/manual/${existing.id}: ${updateError || '更新失败'}`);
  errors.push(`POST ${apiBase}/knowledge-bases/${knowledgeBaseId}/knowledge/manual: ${created.error || `HTTP ${created.status}`}`);
  for (const attempt of attempts) {
    const result = await datakiFetch(attempt.url, config, {
      method: attempt.method,
      body: JSON.stringify(attempt.body),
    });
    if (result.ok) {
      return {
        ok: true,
        documentId: extractDocumentId(result.data) || document.title,
      };
    }
    errors.push(`${attempt.method} ${attempt.url}: ${result.error || `HTTP ${result.status}`}`);
  }
  return { ok: false, error: errors.join('；') };
}

export async function syncMemoriesToDataki(options: {
  user_id?: string;
  memory_ids?: string[];
  personal_config_scope_key?: string;
} = {}): Promise<DatakiMemorySyncResult> {
  const userId = options.user_id || DEFAULT_USER_ID;
  const baseConfig = await getModelServiceConfig();
  const datakiApiKey = await getDatakiApiKeyForScope(options.personal_config_scope_key || userId);
  const datakiBaseUrl = (baseConfig.datakiBaseUrl || 'https://dataki.dobest.com').replace(/\/$/, '');
  const config: DatakiRuntimeConfig = {
    ...baseConfig,
    knowledgeBaseUrl: datakiBaseUrl,
    personalKnowledgeApiKey: datakiApiKey,
    personalKnowledgeApiBase: `${datakiBaseUrl}/api/v1`,
  };

  if (!datakiApiKey) {
    return {
      status: 'skipped',
      message: '个人知识库暂未准备好，已保存到本地待同步。',
      synced_count: 0,
      failed_count: 0,
      document_ids: [],
      errors: ['用户信息表中未找到可用的 Dataki KEY'],
    };
  }

  const allMemories = await listUserMemories({
    user_id: userId,
    include_archived: true,
  });
  const candidateMemories = allMemories.filter(memory => {
    if (options.memory_ids?.length) return options.memory_ids.includes(memory.id);
    return !memory.archived && memory.sync_status !== 'synced';
  });
  if (!candidateMemories.length) {
    return {
      status: 'synced',
      message: '没有待同步的记忆。',
      synced_count: 0,
      failed_count: 0,
      document_ids: [],
      errors: [],
    };
  }

  const knowledgeBase = await resolveMemoryKnowledgeBase(config);
  if (!knowledgeBase.id) {
    await Promise.all(candidateMemories.map(memory => updateUserMemory(memory.id, {
      sync_status: 'failed',
      sync_error: knowledgeBase.error || '未能获取 Dataki 记忆知识库',
    })));
    return {
      status: 'failed',
      message: knowledgeBase.error || '未能获取 Dataki 记忆知识库',
      synced_count: 0,
      failed_count: candidateMemories.length,
      document_ids: [],
      errors: [knowledgeBase.error || '未能获取 Dataki 记忆知识库'],
    };
  }

  const affectedDays = new Set(candidateMemories.map(memory => formatShanghaiDay(memory.updated_at)));
  const documentIds: string[] = [];
  const errors: string[] = [];
  let syncedCount = 0;
  let failedCount = 0;

  for (const day of affectedDays) {
    const dayMemories = allMemories
      .filter(memory => !memory.archived && formatShanghaiDay(memory.updated_at) === day)
      .sort((a, b) => a.created_at - b.created_at);
    const document = buildMemoryDocument(day, dayMemories);
    const upserted = await upsertKnowledgeDocument(config, knowledgeBase.id, document);
    const dayCandidateMemories = candidateMemories.filter(memory => formatShanghaiDay(memory.updated_at) === day);
    if (upserted.ok) {
      documentIds.push(upserted.documentId || document.title);
      await Promise.all(dayCandidateMemories.map(async (memory) => {
        await updateUserMemory(memory.id, {
          sync_status: 'synced',
          sync_error: undefined,
          sync_target: 'dataki',
          dataki_knowledge_base_id: knowledgeBase.id,
          dataki_document_id: upserted.documentId || document.title,
          synced_at: Date.now(),
        });
      }));
      syncedCount += dayCandidateMemories.length;
    } else {
      errors.push(upserted.error || `同步 ${document.title} 失败`);
      await Promise.all(dayCandidateMemories.map(async (memory) => {
        await updateUserMemory(memory.id, {
          sync_status: 'failed',
          sync_error: upserted.error || `同步 ${document.title} 失败`,
          sync_target: 'dataki',
          dataki_knowledge_base_id: knowledgeBase.id,
        });
      }));
      failedCount += dayCandidateMemories.length;
    }
  }

  return {
    status: failedCount ? 'failed' : 'synced',
    message: failedCount ? '部分记忆同步失败。' : '记忆已同步到 Dataki 知识库。',
    knowledge_base_id: knowledgeBase.id,
    synced_count: syncedCount,
    failed_count: failedCount,
    document_ids: documentIds,
    errors,
  };
}

export async function getMemorySyncStatus(userId = DEFAULT_USER_ID) {
  const memories = await listUserMemories({ user_id: userId, include_archived: true });
  const counts = memories.reduce<Record<string, number>>((acc, memory) => {
    const key = memory.archived ? 'archived' : (memory.sync_status || 'pending');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const latest = memories
    .filter(memory => memory.synced_at)
    .sort((a, b) => (b.synced_at || 0) - (a.synced_at || 0))[0];
  return {
    total: memories.length,
    counts,
    latest_synced_at: latest?.synced_at,
  };
}
