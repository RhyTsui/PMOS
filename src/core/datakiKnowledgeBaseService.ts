import { randomUUID } from 'node:crypto';

type FetchResponseLike = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
};

type FetchLike = (input: string, init?: Record<string, unknown>) => Promise<FetchResponseLike>;

type DatakiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: string;
  };
};

export type DatakiConnectorStatus = {
  configured: boolean;
  connected: boolean | null;
  missing: string[];
  baseUrl: string | null;
  userId: string | null;
  agentId: string | null;
  defaultKnowledgeBaseId: string | null;
  defaultKnowledgeBaseIds: string[];
};

export type DatakiKnowledgeBaseSummary = {
  id: string;
  name: string;
  description: string;
  type: string;
  knowledgeCount: number;
  chunkCount: number;
  processingCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DatakiKnowledgeFileSummary = {
  id: string;
  title: string;
  fileType: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DatakiKnowledgeSearchItem = {
  id: string;
  content: string;
  knowledgeId: string;
  knowledgeTitle: string;
  knowledgeFilename: string | null;
  knowledgeSource: string | null;
  chunkType: string | null;
  score: number | null;
};

export class DatakiKnowledgeBaseService {
  constructor(private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike) {}

  async getStatus(input?: {
    baseUrl?: string | null;
    apiKey?: string | null;
    userId?: string | null;
    agentId?: string | null;
    defaultKnowledgeBaseId?: string | null;
    defaultKnowledgeBaseIds?: string[];
    checkRemote?: boolean;
  }): Promise<DatakiConnectorStatus> {
    const baseUrl = this.resolveBaseUrl(input?.baseUrl);
    const apiKey = this.resolveApiKey(input?.apiKey);
    const userId = this.resolveUserId(input?.userId);
    const agentId = this.resolveAgentId(input?.agentId);
    const defaultKnowledgeBaseId = this.resolveDefaultKnowledgeBaseId(input?.defaultKnowledgeBaseId);
    const defaultKnowledgeBaseIds = this.resolveDefaultKnowledgeBaseIds(input?.defaultKnowledgeBaseIds, defaultKnowledgeBaseId);
    if (!baseUrl || !apiKey) {
      return {
        configured: false,
        connected: null,
        missing: [
          ...(!baseUrl ? ['DATAKI_BASE_URL'] : []),
          ...(!apiKey ? ['DATAKI_API_KEY'] : []),
        ],
        baseUrl,
        userId,
        agentId,
        defaultKnowledgeBaseId,
        defaultKnowledgeBaseIds,
      };
    }

    const connected = input?.checkRemote ? await this.safeConnection({ baseUrl, apiKey }) : null;
    return {
      configured: true,
      connected,
      missing: [],
      baseUrl,
      userId,
      agentId,
      defaultKnowledgeBaseId,
      defaultKnowledgeBaseIds,
    };
  }

  async listKnowledgeBases(input?: {
    baseUrl?: string | null;
    apiKey?: string | null;
    userId?: string | null;
    agentId?: string | null;
  }): Promise<DatakiKnowledgeBaseSummary[]> {
    const payload = await this.request<unknown[]>('/knowledge-bases', {
      method: 'GET',
      baseUrl: input?.baseUrl,
      apiKey: input?.apiKey,
      query:
        this.normalizeOptional(input?.agentId)
          ? { agent_id: this.normalizeOptional(input?.agentId) ?? '' }
          : undefined,
    });
    const items = Array.isArray(payload) ? payload : [];
    return items
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        id: String(item.id ?? ''),
        name: typeof item.name === 'string' ? item.name : 'Untitled knowledge base',
        description: typeof item.description === 'string' ? item.description : '',
        type: typeof item.type === 'string' ? item.type : 'document',
        knowledgeCount: this.toNumber(item.knowledge_count),
        chunkCount: this.toNumber(item.chunk_count),
        processingCount: this.toNumber(item.processing_count),
        createdAt: typeof item.created_at === 'string' ? item.created_at : null,
        updatedAt: typeof item.updated_at === 'string' ? item.updated_at : null,
      }))
      .filter((item) => item.id);
  }

  async listKnowledgeFiles(input: {
    knowledgeBaseId: string;
    page?: number;
    pageSize?: number;
    keyword?: string | null;
    fileType?: string | null;
    baseUrl?: string | null;
    apiKey?: string | null;
  }): Promise<DatakiKnowledgeFileSummary[]> {
    const payload = await this.request<unknown[]>(
      `/knowledge-bases/${encodeURIComponent(input.knowledgeBaseId)}/knowledge`,
      {
        method: 'GET',
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        query: {
          page: String(input.page ?? 1),
          page_size: String(input.pageSize ?? 20),
          ...(input.keyword?.trim() ? { keyword: input.keyword.trim() } : {}),
          ...(input.fileType?.trim() ? { file_type: input.fileType.trim() } : {}),
        },
      },
    );
    const items = Array.isArray(payload) ? payload : [];
    return items
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        id: String(item.id ?? ''),
        title: typeof item.title === 'string' ? item.title : typeof item.name === 'string' ? item.name : 'Untitled knowledge',
        fileType: typeof item.file_type === 'string' ? item.file_type : null,
        status: typeof item.status === 'string' ? item.status : null,
        createdAt: typeof item.created_at === 'string' ? item.created_at : null,
        updatedAt: typeof item.updated_at === 'string' ? item.updated_at : null,
      }))
      .filter((item) => item.id);
  }

  async searchKnowledge(input: {
    query: string;
    knowledgeBaseId?: string | null;
    knowledgeBaseIds?: string[];
    knowledgeIds?: string[];
    baseUrl?: string | null;
    apiKey?: string | null;
  }): Promise<DatakiKnowledgeSearchItem[]> {
    const query = input.query.trim();
    if (!query) {
      throw new Error('query is required');
    }

    const payload = await this.request<unknown[]>('/knowledge-search', {
      method: 'POST',
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      body: {
        query,
        ...(input.knowledgeBaseId?.trim() ? { knowledge_base_id: input.knowledgeBaseId.trim() } : {}),
        ...(input.knowledgeBaseIds?.length ? { knowledge_base_ids: input.knowledgeBaseIds } : {}),
        ...(input.knowledgeIds?.length ? { knowledge_ids: input.knowledgeIds } : {}),
      },
    });
    const items = Array.isArray(payload) ? payload : [];
    return items
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        id: String(item.id ?? ''),
        content: typeof item.content === 'string' ? item.content : '',
        knowledgeId: typeof item.knowledge_id === 'string' ? item.knowledge_id : '',
        knowledgeTitle: typeof item.knowledge_title === 'string' ? item.knowledge_title : '',
        knowledgeFilename: typeof item.knowledge_filename === 'string' ? item.knowledge_filename : null,
        knowledgeSource: typeof item.knowledge_source === 'string' ? item.knowledge_source : null,
        chunkType: typeof item.chunk_type === 'string' ? item.chunk_type : null,
        score: typeof item.score === 'number' ? item.score : null,
      }))
      .filter((item) => item.id);
  }

  private async safeConnection(input: { baseUrl: string; apiKey: string }) {
    try {
      await this.listKnowledgeBases(input);
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(
    pathname: string,
    input: {
      method: 'GET' | 'POST';
      baseUrl?: string | null;
      apiKey?: string | null;
      query?: Record<string, string>;
      body?: Record<string, unknown>;
    },
  ): Promise<T> {
    const baseUrl = this.resolveBaseUrl(input.baseUrl);
    const apiKey = this.resolveApiKey(input.apiKey);
    if (!baseUrl) {
      throw new Error('DATAKI_BASE_URL is required');
    }
    if (!apiKey) {
      throw new Error('DATAKI_API_KEY is required');
    }

    const url = new URL(`${baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`);
    Object.entries(input.query ?? {}).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    const response = await this.fetchImpl(url.toString(), {
      method: input.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Request-ID': `pmaios-${randomUUID()}`,
      },
      ...(input.method === 'POST' ? { body: JSON.stringify(input.body ?? {}) } : {}),
    });

    const payload = await response.json().catch(() => null) as DatakiEnvelope<T> | null;
    if (!response.ok) {
      const message = payload?.error?.message || payload?.error?.details || `${response.status} ${response.statusText}`;
      throw new Error(`dataki request failed: ${message}`);
    }

    if (!payload || payload.success === false || typeof payload !== 'object') {
      throw new Error('dataki returned an invalid response');
    }

    return payload.data as T;
  }

  private resolveBaseUrl(input?: string | null) {
    const candidate = input?.trim() || process.env.DATAKI_BASE_URL?.trim() || process.env.WEKNORA_BASE_URL?.trim() || '';
    if (!candidate) {
      return null;
    }
    return candidate.replace(/\/+$/u, '');
  }

  private resolveApiKey(input?: string | null) {
    const candidate = input?.trim() || process.env.DATAKI_API_KEY?.trim() || process.env.WEKNORA_API_KEY?.trim() || '';
    return candidate || null;
  }

  private resolveUserId(input?: string | null) {
    const candidate = input?.trim() || process.env.DATAKI_USER_ID?.trim() || process.env.WEKNORA_USER_ID?.trim() || '';
    return candidate || null;
  }

  private resolveAgentId(input?: string | null) {
    const candidate = input?.trim() || process.env.DATAKI_AGENT_ID?.trim() || process.env.WEKNORA_AGENT_ID?.trim() || '';
    return candidate || null;
  }

  private normalizeOptional(value?: string | null) {
    const candidate = value?.trim() || '';
    return candidate || null;
  }

  private normalizeOptionalList(values?: string[] | null) {
    return (values ?? []).map((item) => item.trim()).filter(Boolean);
  }

  private resolveDefaultKnowledgeBaseId(input?: string | null) {
    return this.normalizeOptional(
      input ??
        process.env.DATAKI_KNOWLEDGE_BASE_ID ??
        process.env.WEKNORA_KNOWLEDGE_BASE_ID ??
        null,
    );
  }

  private resolveDefaultKnowledgeBaseIds(input?: string[] | null, defaultKnowledgeBaseId?: string | null) {
    return [...new Set([
      ...this.normalizeOptionalList(input),
      ...this.normalizeOptionalList(process.env.DATAKI_KNOWLEDGE_BASE_IDS?.split(',') ?? []),
      ...this.normalizeOptionalList(process.env.WEKNORA_KNOWLEDGE_BASE_IDS?.split(',') ?? []),
      ...(defaultKnowledgeBaseId ? [defaultKnowledgeBaseId] : []),
    ])];
  }

  private toNumber(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
}
