/**
 * 关键词拓展服务
 *
 * 用于用户提交关键词后，按需补齐种子或信源。
 */
import { IntelSourceRepository } from '../../repositories/intel-source-repository.js';
import { SourceDiscoveryService } from '../source-discovery/index.js';
import { SeedService } from '../seed/index.js';
import type {
  IntelSource,
  KeywordExpansionSourceTypeInput,
  SeedType,
  SourceType,
} from '../../models/types.js';
import type { CreateSeedInput } from '../seed/seed-service.js';
import type { DiscoveredSource } from '../source-discovery/source-discovery-service.js';


export interface KeywordExpansionInput {
  keyword: string;
  scope?: 'seed' | 'source' | 'all';
  seedType?: SeedType;
  sourceType?: KeywordExpansionSourceTypeInput;
  createSeed?: boolean;
  createSource?: boolean;
  dryRun?: boolean;
}

export interface KeywordExpansionResult {
  keyword: string;
  scope: 'seed' | 'source' | 'all';
  request: {
    seedType: SeedType;
    sourceType: SourceType;
    createSeed: boolean;
    createSource: boolean;
    dryRun: boolean;
  };
  created: {
    seeds: Array<{ id: string; seedType: SeedType; text: string }>;
    sources: IntelSource[];
  };
  skipped: {
    seeds: Array<{ seedType: SeedType; text: string; reason: string }>;
    sources: Array<{ name: string; reason: string }>;
  };
  candidates: {
    seeds: Array<{ seedType: SeedType; text: string }>;
    sources: DiscoveredSource[];
  };
  meta: {
    createdSeedCount: number;
    createdSourceCount: number;
  };
}

export class KeywordExpansionService {
  private seedService: SeedService;
  private sourceDiscoveryService: SourceDiscoveryService;
  private sourceRepo: IntelSourceRepository;

  constructor() {
    this.seedService = new SeedService();
    this.sourceDiscoveryService = new SourceDiscoveryService();
    this.sourceRepo = new IntelSourceRepository();
  }

  expandByKeyword(input: KeywordExpansionInput): KeywordExpansionResult {
    const keyword = (input.keyword || '').trim();
    if (!keyword) {
      throw new Error('keyword 不能为空');
    }

    const scope = this.resolveScope(input.scope);
    const seedType = this.resolveSeedType(scope, input.seedType);
    const sourceType = this.resolveSourceType(input.sourceType);
    const createSeed = input.createSeed !== false;
    const createSource = input.createSource !== false;
    const dryRun = input.dryRun === true;

    const result: KeywordExpansionResult = {
      keyword,
      scope,
      request: {
        seedType,
        sourceType,
        createSeed,
        createSource,
        dryRun,
      },
      created: {
        seeds: [],
        sources: [],
      },
      skipped: {
        seeds: [],
        sources: [],
      },
      candidates: {
        seeds: [],
        sources: [],
      },
      meta: {
        createdSeedCount: 0,
        createdSourceCount: 0,
      },
    };

    const includeSeed = scope === 'seed' || scope === 'all';
    const includeSource = scope === 'source' || scope === 'all';

    if (includeSeed) {
      const seedCandidate = this.buildSeedCandidate(keyword, seedType, sourceType);
      result.candidates.seeds.push(seedCandidate);

      if (createSeed) {
        if (dryRun) {
          result.skipped.seeds.push({
            seedType,
            text: keyword,
            reason: 'dryRun 模式，不落库',
          });
        } else {
          try {
            const seed = this.seedService.createSeed(seedCandidate);
            result.created.seeds.push({
              id: seed.id,
              seedType: seed.seedType,
              text: seed.text,
            });
            result.meta.createdSeedCount += 1;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.skipped.seeds.push({
              seedType,
              text: keyword,
              reason: message,
            });
          }
        }
      }
    }

    if (includeSource) {
      const sourceCandidate = this.buildSourceCandidate(keyword, sourceType);
      result.candidates.sources.push(sourceCandidate);

      const existedByName = this.sourceRepo.findByName(sourceCandidate.name);
      if (existedByName) {
        result.skipped.sources.push({
          name: sourceCandidate.name,
          reason: `信源已存在：${existedByName.id}`,
        });
      } else if (createSource) {
        if (dryRun) {
          result.skipped.sources.push({
            name: sourceCandidate.name,
            reason: 'dryRun 模式，不落库',
          });
        } else {
          const created = this.sourceDiscoveryService.addDiscoveredSource(sourceCandidate);
          if (created) {
            result.created.sources.push(created);
            result.meta.createdSourceCount += 1;
          } else {
            result.skipped.sources.push({
              name: sourceCandidate.name,
              reason: '创建信源失败',
            });
          }
        }
      }
    }

    return result;
  }

  private resolveScope(scope?: string): 'seed' | 'source' | 'all' {
    if (scope === 'seed' || scope === 'source' || scope === 'all') {
      return scope;
    }
    return 'all';
  }

  private resolveSeedType(scope: 'seed' | 'source' | 'all', seedType?: SeedType): SeedType {
    if (seedType) return seedType;
    return scope === 'source' ? 'source' : 'event';
  }

  private resolveSourceType(sourceType?: KeywordExpansionSourceTypeInput): SourceType {
    if (!sourceType) return 'media';
    if (sourceType === 'wewe') return 'wechat_mp';
    return sourceType;
  }

  private buildSeedCandidate(
    keyword: string,
    seedType: SeedType,
    sourceType: SourceType,
  ): CreateSeedInput {
    switch (seedType) {
      case 'entity':
        return {
          text: keyword,
          seedType: 'entity',
          entityType: 'game',
          aliases: [keyword],
          tags: ['manual-expansion', 'keyword'],
        };
      case 'topic':
        return {
          text: keyword,
          seedType: 'topic',
          topicTag: keyword,
          relatedEntities: [],
          tags: ['manual-expansion', 'keyword'],
        };
      case 'source':
        return {
          text: keyword,
          seedType: 'source',
          sourceType,
          discoveryMethod: 'manual-keyword',
          discoveryUrl: this.buildUrlCandidate(keyword),
          tags: ['manual-expansion', 'keyword'],
        };
      default:
        return {
          text: keyword,
          seedType: 'event',
          eventType: '上线',
          keywords: [keyword],
          tags: ['manual-expansion', 'keyword'],
        };
    }
  }

  private buildSourceCandidate(keyword: string, sourceType: SourceType): DiscoveredSource {
    const cleanUrl = this.buildUrlCandidate(keyword);

    return {
      name: keyword,
      url: cleanUrl,
      feedUrl: undefined,
      sourceType,
      accessMethod: 'search',
      discoveryMethod: 'search',
      confidence: 0.72,
      relatedSeedIds: [],
      reason: `用户提交关键词实时拓展：${keyword}`,
    };
  }

  private buildUrlCandidate(keyword: string): string {
    const raw = keyword.trim();
    if (raw.match(/^https?:\/\//i)) {
      return raw;
    }

    const slug = raw
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9\-_.]/g, '');

    return slug ? `https://${slug}.com` : 'https://example.com';
  }
}
