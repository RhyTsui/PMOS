/**
 * 种子自进化引擎
 *
 * 负责：
 * 1. 状态转换（active → degraded → dormant → retired）
 * 2. 种子扩展（高分种子生成新种子）
 * 3. 淘汰清理
 *
 * @see docs/design/03-Seed种子系统设计.md
 */
import { SeedRepository } from '../../repositories/seed-repository.js';
import type { Seed, SeedStatus, SeedType } from '../../models/types.js';

/**
 * 进化配置
 */
export interface EvolutionConfig {
  thresholds: {
    activeMinScore: number;       // 低于此分 → degraded
    degradedMinScore: number;     // 低于此分 → dormant
    dormantMaxDays: number;       // 休眠超过此天数 → retired
    consecutiveFailLimit: number; // 连续失败次数 → dormant
    expansionMinScore: number;    // 高于此分 → 触发扩展
    expansionMaxPerCycle: number; // 每次评估周期最多扩展的种子数
  };
}

const DEFAULT_EVOLUTION_CONFIG: EvolutionConfig = {
  thresholds: {
    activeMinScore: 30,
    degradedMinScore: 15,
    dormantMaxDays: 30,
    consecutiveFailLimit: 5,
    expansionMinScore: 80,
    expansionMaxPerCycle: 10,
  },
};

/**
 * 种子扩展候选
 */
export interface SeedExpansionCandidate {
  seedType: SeedType;
  text: string;
  sourceSeedId: string;       // 来源种子 ID
  confidence: number;         // 扩展置信度
  reason: string;             // 扩展理由
}

/**
 * 种子自进化引擎
 */
export class SeedEvolution {
  private repo: SeedRepository;
  private config: EvolutionConfig;

  constructor(repo: SeedRepository, config: Partial<EvolutionConfig> = {}) {
    this.repo = repo;
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
  }

  /**
   * 执行一次完整的进化周期
   */
  async runEvolutionCycle(): Promise<EvolutionReport> {
    const report: EvolutionReport = {
      evaluated: 0,
      degraded: 0,
      dormant: 0,
      retired: 0,
      expanded: 0,
      newSeeds: [],
    };

    // 1. 获取需要评估的种子
    const seedsToEvaluate = this.repo.findNeedsEvaluation();
    report.evaluated = seedsToEvaluate.length;

    // 2. 状态转换
    for (const seed of seedsToEvaluate) {
      const result = this.evaluateAndTransition(seed);
      if (result.transitioned) {
        switch (result.newStatus) {
          case 'degraded': report.degraded++; break;
          case 'dormant': report.dormant++; break;
          case 'retired': report.retired++; break;
        }
      }
    }

    // 3. 种子扩展
    const highScoreSeeds = this.repo.findAll({ limit: this.config.thresholds.expansionMaxPerCycle })
      .filter(s => s.score >= this.config.thresholds.expansionMinScore && s.status === 'active');

    for (const seed of highScoreSeeds) {
      const candidates = this.generateExpansionCandidates(seed);
      for (const candidate of candidates) {
        const newSeed = this.createSeedFromCandidate(candidate);
        if (newSeed) {
          report.newSeeds.push(newSeed);
          report.expanded++;
        }
      }
    }

    return report;
  }

  /**
   * 评估单个种子并执行状态转换
   */
  private evaluateAndTransition(seed: Seed): { transitioned: boolean; newStatus?: SeedStatus } {
    const thresholds = this.config.thresholds;
    let newStatus: SeedStatus | null = null;

    // 连续失败过多 → dormant
    if (seed.failCount >= thresholds.consecutiveFailLimit) {
      newStatus = 'dormant';
    }
    // 评分低于 degraded 阈值
    else if (seed.status === 'active' && seed.score < thresholds.activeMinScore) {
      newStatus = 'degraded';
    }
    // 评分低于 dormant 阈值
    else if (seed.status === 'degraded' && seed.score < thresholds.degradedMinScore) {
      newStatus = 'dormant';
    }
    // 休眠超过期限 → retired
    else if (seed.status === 'dormant') {
      const daysSinceLastUsed = this.getDaysSince(seed.lastUsedAt || seed.updatedAt);
      if (daysSinceLastUsed > thresholds.dormantMaxDays) {
        newStatus = 'retired';
      }
    }

    if (newStatus && newStatus !== seed.status) {
      this.repo.update(seed.id, { status: newStatus });
      return { transitioned: true, newStatus };
    }

    return { transitioned: false };
  }

  /**
   * 生成种子扩展候选
   *
   * 简化版：基于高分种子的属性生成关联种子
   * V2 可以接入 LLM 进行更智能的扩展
   */
  private generateExpansionCandidates(seed: Seed): SeedExpansionCandidate[] {
    const candidates: SeedExpansionCandidate[] = [];

    if (seed.seedType === 'entity') {
      // 实体种子 → 扩展为事件种子
      // 例如："米哈游" → "米哈游+上线"、"米哈游+融资"
      const eventTypes = ['上线', '测试', '融资', '出海'] as const;
      for (const eventType of eventTypes) {
        candidates.push({
          seedType: 'event',
          text: `${seed.text} ${eventType}`,
          sourceSeedId: seed.id,
          confidence: 0.7,
          reason: `从高分实体种子扩展`,
        });
      }
    } else if (seed.seedType === 'event') {
      // 事件种子 → 扩展为话题种子
      candidates.push({
        seedType: 'topic',
        text: `${seed.text} 趋势`,
        sourceSeedId: seed.id,
        confidence: 0.5,
        reason: `从高分事件种子扩展`,
      });
    }

    return candidates.slice(0, 3); // 每个种子最多扩展 3 个
  }

  /**
   * 从候选创建新种子（去重检查）
   */
  private createSeedFromCandidate(candidate: SeedExpansionCandidate): Seed | null {
    // 检查是否已存在
    const existing = this.repo.findByText(candidate.text, candidate.seedType);
    if (existing) return null;

    // 创建新种子
    const baseSeed = {
      seedType: candidate.seedType,
      text: candidate.text,
      score: 50,  // 初始分
      status: 'active' as const,
      discoveryCount: 0,
      failCount: 0,
      tags: ['auto-expanded'],
    };

    if (candidate.seedType === 'entity') {
      return this.repo.create({
        ...baseSeed,
        seedType: 'entity',
        entityType: 'game',
        aliases: [],
      } as any);
    } else if (candidate.seedType === 'event') {
      return this.repo.create({
        ...baseSeed,
        seedType: 'event',
        eventType: '上线',  // 默认
        keywords: candidate.text.split(' '),
      } as any);
    } else if (candidate.seedType === 'topic') {
      return this.repo.create({
        ...baseSeed,
        seedType: 'topic',
        topicTag: candidate.text,
        relatedEntities: [],
      } as any);
    } else {
      return this.repo.create({
        ...baseSeed,
        seedType: 'source',
        sourceType: 'media',
        discoveryMethod: 'auto-expansion',
        verified: false,
      } as any);
    }
  }

  private getDaysSince(dateStr: string): number {
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}

/**
 * 进化周期报告
 */
export interface EvolutionReport {
  evaluated: number;
  degraded: number;
  dormant: number;
  retired: number;
  expanded: number;
  newSeeds: Seed[];
}
