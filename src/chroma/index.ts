import { ChromaClient } from 'chromadb';
import type { FileStore } from '../core/fileStore.js';
import type { MemoryService } from '../core/memoryService.js';

export type ChromaConfig = {
  path?: string;
  tenant?: string;
  database?: string;
  localOnly?: boolean;
};

export type DocumentChunk = {
  id: string;
  content: string;
  metadata: Record<string, string | number | boolean>;
};

export type SearchQuery = {
  query: string;
  topK?: number;
  filter?: Record<string, string | number | boolean>;
};

export type SearchResult = {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, string | number | boolean>;
};

type QueryResponse = {
  ids?: string[][];
  documents?: Array<Array<string | null>>;
  metadatas?: Array<Array<Record<string, unknown> | null>>;
  distances?: number[][];
};

type VectorCollection = {
  add(input: {
    ids: string[];
    documents: string[];
    metadatas: Array<Record<string, string | number | boolean>>;
  }): Promise<void>;
  query(input: {
    queryTexts: string[];
    nResults: number;
    where?: Record<string, string | number | boolean>;
    include?: string[];
  }): Promise<QueryResponse>;
  delete(input: { where: Record<string, unknown> }): Promise<void>;
  count(): Promise<number>;
};

function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean> {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string | number | boolean] => {
      const value = entry[1];
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    }),
  );
}

class MemoryCollection implements VectorCollection {
  private readonly documents = new Map<string, { content: string; metadata: Record<string, string | number | boolean> }>();

  async add(input: {
    ids: string[];
    documents: string[];
    metadatas: Array<Record<string, string | number | boolean>>;
  }): Promise<void> {
    input.ids.forEach((id, index) => {
      this.documents.set(id, {
        content: input.documents[index] || '',
        metadata: input.metadatas[index] || {},
      });
    });
  }

  async query(input: {
    queryTexts: string[];
    nResults: number;
    where?: Record<string, string | number | boolean>;
  }): Promise<QueryResponse> {
    const query = input.queryTexts[0] || '';
    const filtered = [...this.documents.entries()].filter(([, value]) => this.matchesFilter(value.metadata, input.where));
    const ranked = filtered
      .map(([id, value]) => ({
        id,
        content: value.content,
        metadata: value.metadata,
        distance: 1 - this.computeScore(query, value.content),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, input.nResults);

    return {
      ids: [ranked.map((item) => item.id)],
      documents: [ranked.map((item) => item.content)],
      metadatas: [ranked.map((item) => item.metadata)],
      distances: [ranked.map((item) => item.distance)],
    };
  }

  async delete(input: { where: Record<string, unknown> }): Promise<void> {
    if (!input.where || Object.keys(input.where).length === 0) {
      this.documents.clear();
      return;
    }

    for (const [id, value] of this.documents.entries()) {
      if (this.matchesFilter(value.metadata, input.where as Record<string, string | number | boolean>)) {
        this.documents.delete(id);
      }
    }
  }

  async count(): Promise<number> {
    return this.documents.size;
  }

  private computeScore(query: string, content: string) {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return 0;
    }

    const contentTokens = new Set(this.tokenize(content));
    const matches = queryTokens.filter((token) => contentTokens.has(token)).length;
    return matches / queryTokens.length;
  }

  private tokenize(text: string) {
    return text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  private matchesFilter(
    metadata: Record<string, string | number | boolean>,
    filter?: Record<string, string | number | boolean>,
  ) {
    if (!filter) {
      return true;
    }

    return Object.entries(filter).every(([key, value]) => metadata[key] === value);
  }
}

export class ChromaService {
  private client: ChromaClient | null = null;
  private readonly collections = new Map<string, VectorCollection>();

  constructor(
    private readonly store: FileStore,
    private readonly memoryService: MemoryService,
    private readonly config: ChromaConfig = {},
  ) {
    void this.store;
  }

  async initialize(): Promise<void> {
    if (this.config.localOnly) {
      this.client = null;
      return;
    }

    const remoteUrl = new URL(this.config.path || 'http://localhost:8000');
    this.client = new ChromaClient({
      ssl: remoteUrl.protocol === 'https:',
      host: remoteUrl.hostname,
      port: Number(remoteUrl.port || (remoteUrl.protocol === 'https:' ? 443 : 80)),
      tenant: this.config.tenant || 'default_tenant',
      database: this.config.database || 'default_database',
    });

    try {
      await (this.client as { heartbeat(): Promise<unknown> }).heartbeat();
      console.log('[ChromaDB] connected');
    } catch (error) {
      console.warn('[ChromaDB] unavailable, continuing without remote storage', error);
      this.client = null;
    }
  }

  isRemoteAvailable(): boolean {
    return this.client !== null;
  }

  async getOrCreateCollection(name: string): Promise<VectorCollection> {
    const cached = this.collections.get(name);
    if (cached) {
      return cached;
    }

    if (!this.client) {
      const collection = new MemoryCollection();
      this.collections.set(name, collection);
      return collection;
    }

    try {
      const collection = await this.client.getCollection({ name });
      this.collections.set(name, collection as unknown as VectorCollection);
      return collection as unknown as VectorCollection;
    } catch {
      const collection = await this.client.createCollection({ name });
      this.collections.set(name, collection as unknown as VectorCollection);
      return collection as unknown as VectorCollection;
    }
  }

  async addDocuments(collectionName: string, documents: DocumentChunk[]): Promise<void> {
    const collection = await this.getOrCreateCollection(collectionName);
    const payload = {
      ids: documents.map((document) => document.id),
      documents: documents.map((document) => document.content),
      metadatas: documents.map((document) => document.metadata),
    };
    try {
      await collection.add(payload);
    } catch (error) {
      if (!this.shouldFallbackToLocalCollection(error)) {
        throw error;
      }
      console.warn(`[ChromaDB] remote collection ${collectionName} cannot embed locally, falling back to in-memory collection`);
      const localCollection = this.useLocalCollection(collectionName);
      await localCollection.add(payload);
    }
  }

  async search(collectionName: string, query: SearchQuery): Promise<SearchResult[]> {
    const collection = await this.getOrCreateCollection(collectionName);
    let results: QueryResponse;
    try {
      results = await collection.query({
        queryTexts: [query.query],
        nResults: query.topK || 5,
        where: query.filter,
        include: ['documents', 'metadatas', 'distances'],
      });
    } catch (error) {
      if (!this.shouldFallbackToLocalCollection(error)) {
        throw error;
      }
      console.warn(`[ChromaDB] remote collection ${collectionName} cannot query without embeddings, falling back to in-memory collection`);
      const localCollection = this.useLocalCollection(collectionName);
      results = await localCollection.query({
        queryTexts: [query.query],
        nResults: query.topK || 5,
        where: query.filter,
      });
    }

    if (!results.documents || !results.documents[0]) {
      return [];
    }

    const documents = results.documents[0];
    const metadatas = results.metadatas?.[0] || [];
    const distances = results.distances?.[0] || [];

    return documents
      .map((content, index) => ({ content, index }))
      .filter((item): item is { content: string; index: number } => typeof item.content === 'string')
      .map(({ content, index }) => ({
        id: results.ids?.[0]?.[index] || `doc-${index}`,
        content,
        score: 1 - (distances[index] || 0),
        metadata: sanitizeMetadata((metadatas[index] as Record<string, unknown> | null | undefined) ?? undefined),
      }));
  }

  private useLocalCollection(name: string) {
    const collection = new MemoryCollection();
    this.collections.set(name, collection);
    return collection;
  }

  private shouldFallbackToLocalCollection(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return /No embedding function found|DefaultEmbeddingFunction|embedding function/iu.test(message);
  }

  async indexProjectDocuments(subprojectId?: string | null, targetCollectionName?: string): Promise<number> {
    const collectionName = targetCollectionName ?? (subprojectId ? `project-${subprojectId}` : 'platform');
    await this.getOrCreateCollection(collectionName);

    const contextDocs = await this.memoryService.loadContextDocuments(subprojectId);
    const truthDocs = await this.memoryService.loadTruthSourceDocuments(subprojectId);
    const allDocs = [...contextDocs, ...truthDocs];
    const chunks: DocumentChunk[] = [];

    for (const doc of allDocs) {
      const textChunks = this.chunkText(doc.content, 500, 50);
      for (const [index, chunk] of textChunks.entries()) {
        chunks.push({
          id: `${doc.path}-chunk-${index}`,
          content: chunk,
          metadata: {
            path: doc.path,
            chunkIndex: index,
            subprojectId: subprojectId || 'platform',
          },
        });
      }
    }

    if (chunks.length > 0) {
      await this.addDocuments(collectionName, chunks);
    }

    return chunks.length;
  }

  async clearCollection(collectionName: string): Promise<void> {
    const collection = await this.getOrCreateCollection(collectionName);
    await collection.delete({ where: {} });
  }

  async getCollectionStats(collectionName: string): Promise<{ count: number }> {
    const collection = await this.getOrCreateCollection(collectionName);
    return { count: await collection.count() };
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end).trim());
      start += chunkSize - overlap;
    }

    return chunks;
  }
}

export class LocalEmbeddingService {
  private pipeline: ((text: string, options: { pooling: 'mean'; normalize: true }) => Promise<{ data: ArrayLike<number> }>) | null = null;

  async initialize(): Promise<void> {
    try {
      const { pipeline } = await import('@xenova/transformers');
      this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as typeof this.pipeline;
    } catch (error) {
      console.warn('[Embedding] local model unavailable, falling back to hash embeddings', error);
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.pipeline) {
      return this.hashEmbed(text);
    }

    const result = await this.pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }

  private hashEmbed(text: string): number[] {
    const hash = this.simpleHash(text);
    return Array(384)
      .fill(0)
      .map((_, index) => (hash[index % hash.length] / 255) * 2 - 1);
  }

  private simpleHash(text: string): number[] {
    const safeText = text.length > 0 ? text : ' ';
    const hash: number[] = [];
    for (let index = 0; index < 384; index += 1) {
      hash.push((safeText.charCodeAt(index % safeText.length) + index) % 256);
    }
    return hash;
  }
}
