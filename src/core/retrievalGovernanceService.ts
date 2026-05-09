import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { getRetrievalGovernancePath } from './projectPaths.js';
import { ChromaService } from '../chroma/index.js';
import type { RetrievalGovernance } from '../shared/schemas.js';
import type { SearchResult } from '../chroma/index.js';

export type RetrievalQualityGateResult = {
  passed: boolean;
  mode: RetrievalGovernance['mode'];
  remoteAvailable: boolean;
  resultCount: number;
  indexedChunkCount: number;
  truthSourceResultCount: number;
  minChunkCount: number;
  minScore: number;
  requireTruthSources: boolean;
  reasons: string[];
};

export type GovernedRetrievalSearchResult = {
  settings: RetrievalGovernance;
  items: SearchResult[];
  gate: RetrievalQualityGateResult;
};

export class RetrievalGovernanceService {
  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
  ) {}

  async load(subprojectId?: string | null): Promise<RetrievalGovernance> {
    const target = getRetrievalGovernancePath(subprojectId);
    if (await this.store.exists(target)) {
      return this.store.readJson<RetrievalGovernance>(target);
    }

    const settings = this.buildDefault(subprojectId);
    await this.save(settings);
    return settings;
  }

  async save(settings: RetrievalGovernance) {
    await this.store.writeJson(getRetrievalGovernancePath(settings.subprojectId), settings);
  }

  async update(
    subprojectId: string | null | undefined,
    patch: Partial<Pick<RetrievalGovernance, 'mode' | 'remoteUrl' | 'collectionName' | 'topK' | 'indexingEnabled'>> & {
      qualityGate?: Partial<RetrievalGovernance['qualityGate']>;
    },
  ) {
    const current = await this.load(subprojectId);
    const next: RetrievalGovernance = {
      ...current,
      mode: patch.mode ?? current.mode,
      remoteUrl: patch.remoteUrl ?? current.remoteUrl,
      collectionName: patch.collectionName ?? current.collectionName,
      topK: patch.topK ?? current.topK,
      indexingEnabled: patch.indexingEnabled ?? current.indexingEnabled,
      qualityGate: {
        ...current.qualityGate,
        ...(patch.qualityGate ?? {}),
      },
      updatedAt: new Date().toISOString(),
    };
    await this.save(next);
    return next;
  }

  async index(subprojectId?: string | null) {
    const current = await this.load(subprojectId);
    if (!current.indexingEnabled) {
      throw new Error('retrieval indexing is disabled by governance settings');
    }

    const chromaService = await this.createChromaService(current);
    const count = await chromaService.indexProjectDocuments(subprojectId, current.collectionName);
    const updated: RetrievalGovernance = {
      ...current,
      lastIndexedAt: new Date().toISOString(),
      lastIndexedChunkCount: count,
      updatedAt: new Date().toISOString(),
    };
    await this.save(updated);
    const truthSourceCount = (await this.memoryService.loadTruthSourceDocuments(subprojectId)).length;
    return {
      ...updated,
      gate: this.evaluateGate(updated, [], chromaService.isRemoteAvailable(), count, truthSourceCount),
    };
  }

  async search(subprojectId: string | null | undefined, query: string): Promise<GovernedRetrievalSearchResult> {
    const settings = await this.load(subprojectId);
    const chromaService = await this.createChromaService(settings);
    const stats = await chromaService.getCollectionStats(settings.collectionName);
    let indexedChunkCount = stats.count;

    if (settings.indexingEnabled && indexedChunkCount < settings.qualityGate.minChunkCount) {
      indexedChunkCount = await chromaService.indexProjectDocuments(subprojectId, settings.collectionName);
    }

    const rawItems = await chromaService.search(settings.collectionName, {
      query,
      topK: settings.topK,
    });
    const items = rawItems.filter((item) => item.score >= settings.qualityGate.minScore);
    const truthSourcePaths = new Set((await this.memoryService.loadTruthSourceDocuments(subprojectId)).map((document) => document.path));
    const truthSourceResultCount = items.filter((item) => truthSourcePaths.has(String(item.metadata.path ?? ''))).length;
    const gate = this.evaluateGate(
      settings,
      items,
      chromaService.isRemoteAvailable(),
      indexedChunkCount,
      truthSourceResultCount,
    );

    return {
      settings,
      items: gate.passed ? items : [],
      gate,
    };
  }

  private buildDefault(subprojectId?: string | null): RetrievalGovernance {
    const label = subprojectId ? `project-${subprojectId}` : 'platform';
    const now = new Date().toISOString();
    return {
      subprojectId: subprojectId ?? null,
      mode: 'prefer-remote',
      remoteUrl: 'http://localhost:8000',
      collectionName: label,
      topK: 5,
      indexingEnabled: true,
      qualityGate: {
        minChunkCount: 10,
        minScore: 0.35,
        requireTruthSources: true,
      },
      lastIndexedAt: null,
      lastIndexedChunkCount: 0,
      updatedAt: now,
    };
  }

  private async createChromaService(settings: RetrievalGovernance) {
    const chromaService = new ChromaService(this.store, this.memoryService, {
      path: settings.remoteUrl ?? undefined,
      localOnly: settings.mode === 'local-only',
    });
    await chromaService.initialize();

    if (settings.mode === 'remote-required' && !chromaService.isRemoteAvailable()) {
      throw new Error(`remote retrieval is required but unavailable: ${settings.remoteUrl ?? 'default Chroma URL'}`);
    }

    return chromaService;
  }

  private evaluateGate(
    settings: RetrievalGovernance,
    items: SearchResult[],
    remoteAvailable: boolean,
    indexedChunkCount: number,
    truthSourceResultCount: number,
  ): RetrievalQualityGateResult {
    const reasons: string[] = [];
    if (settings.mode === 'remote-required' && !remoteAvailable) {
      reasons.push('remote retrieval is required but unavailable');
    }
    if (indexedChunkCount < settings.qualityGate.minChunkCount) {
      reasons.push(`indexed chunks ${indexedChunkCount} below minimum ${settings.qualityGate.minChunkCount}`);
    }
    if (items.length > 0 && items.every((item) => item.score < settings.qualityGate.minScore)) {
      reasons.push(`all results are below minimum score ${settings.qualityGate.minScore}`);
    }
    if (settings.qualityGate.requireTruthSources && truthSourceResultCount === 0) {
      reasons.push('no truth-source-backed retrieval results');
    }

    return {
      passed: reasons.length === 0,
      mode: settings.mode,
      remoteAvailable,
      resultCount: items.length,
      indexedChunkCount,
      truthSourceResultCount,
      minChunkCount: settings.qualityGate.minChunkCount,
      minScore: settings.qualityGate.minScore,
      requireTruthSources: settings.qualityGate.requireTruthSources,
      reasons,
    };
  }
}
