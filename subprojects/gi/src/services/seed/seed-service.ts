/**
 * 种子服务
 *
 * 统一管理种子的 CRUD、评分、进化、调度
 */
import { SeedRepository } from '../../repositories/seed-repository.js';
import { IntelSourceRepository } from '../../repositories/intel-source-repository.js';
import { SeedScorer, CollectionResult } from './seed-scorer.js';
import { SeedEvolution, EvolutionReport } from './seed-evolution.js';
import type {
  Seed, SeedType, SeedStatus, Priority,
  EntitySeed, EventSeed, TopicSeed, SourceSeed,
  RawEvidence, StructuredEvent,
} from '../../models/types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 种子服务
 */
export class SeedService {
  private seedRepo: SeedRepository;
  private sourceRepo: IntelSourceRepository;
  private scorer: SeedScorer;
  private evolution: SeedEvolution;

  constructor() {
    this.seedRepo = new SeedRepository();
    this.sourceRepo = new IntelSourceRepository();
    this.scorer = new SeedScorer();
    this.evolution = new SeedEvolution(this.seedRepo);
  }

  // ===== CRUD 操作 =====

  /**
   * 创建种子
   */
  createSeed(input: CreateSeedInput): Seed {
    // 去重检查
    const existing = this.seedRepo.findByText(input.text, input.seedType);
    if (existing) {
      throw new Error(`种子已存在: ${input.text} (${input.seedType})`);
    }

    const baseSeed = {
      text: input.text,
      seedType: input.seedType,
      score: input.score ?? 50,
      status: 'active' as const,
      discoveryCount: 0,
      failCount: 0,
      tags: input.tags || [],
    };

    switch (input.seedType) {
      case 'entity':
        return this.seedRepo.create({
          ...baseSeed,
          seedType: 'entity',
          entityType: input.entityType || 'game',
          aliases: input.aliases || [],
          category: input.category,
          market: input.market,
        } as any);

      case 'event':
        return this.seedRepo.create({
          ...baseSeed,
          seedType: 'event',
          eventType: input.eventType || '上线',
          keywords: input.keywords || [input.text],
        } as any);

      case 'topic':
        return this.seedRepo.create({
          ...baseSeed,
          seedType: 'topic',
          topicTag: input.topicTag || input.text,
          relatedEntities: input.relatedEntities || [],
        } as any);

      case 'source':
        return this.seedRepo.create({
          ...baseSeed,
          seedType: 'source',
          sourceType: input.sourceType || 'media',
          discoveryUrl: input.discoveryUrl,
          discoveryMethod: input.discoveryMethod || 'manual',
          verified: false,
        } as any);

      default:
        throw new Error(`Unknown seed type: ${(input as any).seedType}`);
    }
  }

  /**
   * 获取种子详情
   */
  getSeed(id: string): Seed | null {
    return this.seedRepo.findById(id);
  }

  /**
   * 获取种子列表
   */
  listSeeds(options?: {
    seedType?: SeedType;
    status?: SeedStatus;
    minScore?: number;
    limit?: number;
    offset?: number;
  }): Seed[] {
    if (options?.seedType) {
      return this.seedRepo.findByType(options.seedType, options.status);
    }
    if (options?.status) {
      return this.seedRepo.findByType('entity', options.status) // 临时方案
        .concat(this.seedRepo.findByType('event', options.status))
        .concat(this.seedRepo.findByType('topic', options.status))
        .concat(this.seedRepo.findByType('source', options.status));
    }
    return this.seedRepo.findAll({ limit: options?.limit, offset: options?.offset });
  }

  /**
   * 更新种子
   */
  updateSeed(id: string, updates: Partial<Seed>): Seed | null {
    return this.seedRepo.update(id, updates);
  }

  /**
   * 删除种子
   */
  deleteSeed(id: string): boolean {
    return this.seedRepo.delete(id);
  }

  // ===== 评分操作 =====

  /**
   * 采集后更新种子评分
   */
  updateSeedScores(
    seedIds: string[],
    newEvidences: RawEvidence[],
    structuredEvents: StructuredEvent[],
    requestCount: number
  ): void {
    const result = this.scorer.buildCollectionResult(
      newEvidences,
      structuredEvents,
      requestCount
    );

    for (const seedId of seedIds) {
      const seed = this.seedRepo.findById(seedId);
      if (!seed) continue;

      const newScore = this.scorer.calculateScore(seed, result);
      this.seedRepo.updateScore(seedId, newScore);

      // 标记使用
      const effective = newEvidences.length > 0;
      this.seedRepo.markUsed(seedId, effective);
    }
  }

  /**
   * 手动评估种子
   */
  evaluateSeed(id: string): { score: number; status: SeedStatus } | null {
    const seed = this.seedRepo.findById(id);
    if (!seed) return null;

    // 这里可以触发更复杂的评估逻辑
    // 目前仅返回当前状态
    return { score: seed.score, status: seed.status };
  }

  // ===== 进化操作 =====

  /**
   * 运行进化周期
   */
  async runEvolution(): Promise<EvolutionReport> {
    return this.evolution.runEvolutionCycle();
  }

  // ===== 调度操作 =====

  /**
   * 获取当前活跃的种子（用于采集调度）
   */
  getActiveSeeds(limit: number = 100): Seed[] {
    return this.seedRepo.findActive(limit);
  }

  /**
   * 根据优先级获取种子
   */
  getSeedsByPriority(priority: Priority): Seed[] {
    const minScores: Record<Priority, number> = {
      P0: 80,
      P1: 50,
      P2: 30,
      P3: 0,
    };

    return this.seedRepo.findActive(100)
      .filter(s => s.score >= minScores[priority]);
  }

  // ===== 统计操作 =====

  /**
   * 获取种子统计
   */
  getStats(): SeedStats {
    const byStatus = this.seedRepo.countByStatus();
    const total = Object.values(byStatus).reduce((sum, c) => sum + c, 0);

    return {
      total,
      active: byStatus.active,
      dormant: byStatus.dormant,
      degraded: byStatus.degraded,
      retired: byStatus.retired,
    };
  }
}

// ===== 辅助类型 =====

export interface CreateSeedInput {
  text: string;
  seedType: SeedType;
  score?: number;
  tags?: string[];
  // 实体种子
  entityType?: EntitySeed['entityType'];
  aliases?: string[];
  category?: string;
  market?: string;
  // 事件种子
  eventType?: string;
  keywords?: string[];
  // 话题种子
  topicTag?: string;
  relatedEntities?: string[];
  // 源种子
  sourceType?: string;
  discoveryUrl?: string;
  discoveryMethod?: string;
}

export interface SeedStats {
  total: number;
  active: number;
  dormant: number;
  degraded: number;
  retired: number;
}
