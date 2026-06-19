/**
 * 种子评分器
 *
 * @see docs/design/03-Seed种子系统设计.md
 */
import type { Seed, RawEvidence, StructuredEvent } from '../../models/types.js';

/**
 * 采集结果（用于评分输入）
 */
export interface CollectionResult {
  newEvidenceCount: number;        // 新证据数量
  avgImpactScore: number;          // 平均影响评分
  noveltyRate: number;             // 新鲜度（新信息占比）
  requestCount: number;            // 请求次数
}

/**
 * 评分配置
 */
export interface ScoringConfig {
  weights: {
    output: number;        // 产出因子权重
    quality: number;       // 质量因子权重
    novelty: number;       // 新鲜度因子权重
    efficiency: number;    // 效率因子权重
  };
  expectations: {
    evidencePerSeed: number;     // 期望每种子产出
    expectedEfficiency: number;  // 期望效率
  };
  penalties: {
    zeroOutput: number;          // 零产出惩罚
    maxDecayPerDay: number;      // 每日衰减上限
  };
  update: {
    inertia: number;             // 历史评分权重
    deltaWeight: number;         // 本次评分权重
  };
}

/**
 * 默认评分配置
 */
const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    output: 0.40,
    quality: 0.30,
    novelty: 0.15,
    efficiency: 0.15,
  },
  expectations: {
    evidencePerSeed: 5,
    expectedEfficiency: 0.5,
  },
  penalties: {
    zeroOutput: -10,
    maxDecayPerDay: -0.5,
  },
  update: {
    inertia: 0.7,
    deltaWeight: 0.3,
  },
};

/**
 * 种子评分器
 */
export class SeedScorer {
  private config: ScoringConfig;

  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config };
  }

  /**
   * 计算种子评分
   */
  calculateScore(seed: Seed, result: CollectionResult): number {
    const currentScore = seed.score;
    let delta = 0;

    // ① 产出因子
    if (result.newEvidenceCount > 0) {
      const outputRatio = Math.min(1.0, result.newEvidenceCount / this.config.expectations.evidencePerSeed);
      delta += this.config.weights.output * 100 * outputRatio;
    } else {
      delta += this.config.penalties.zeroOutput;
    }

    // ② 质量因子
    const qualityRatio = result.avgImpactScore / 100;
    delta += this.config.weights.quality * 100 * qualityRatio;

    // ③ 新鲜度因子
    if (result.noveltyRate > 0.5) {
      delta += this.config.weights.novelty * 100 * result.noveltyRate;
    }

    // ④ 效率因子
    const efficiency = result.newEvidenceCount / Math.max(1, result.requestCount);
    const efficiencyRatio = Math.min(1.0, efficiency / this.config.expectations.expectedEfficiency);
    delta += this.config.weights.efficiency * 100 * efficiencyRatio;

    // 衰减：长期不使用的种子缓慢降分
    const daysSinceLastUse = this.getDaysSinceLastUse(seed);
    if (daysSinceLastUse > 7) {
      const decay = Math.min(
        Math.abs(this.config.penalties.maxDecayPerDay) * (daysSinceLastUse - 7),
        20
      );
      delta -= decay;
    }

    // 更新评分（带惯性）
    const newScore = currentScore * this.config.update.inertia
      + (currentScore + delta) * this.config.update.deltaWeight;

    return this.clamp(newScore, 0, 100);
  }

  /**
   * 从证据和事件中构建采集结果
   */
  buildCollectionResult(
    newEvidences: RawEvidence[],
    structuredEvents: StructuredEvent[],
    requestCount: number,
    totalExistingEvidences: number = 0
  ): CollectionResult {
    const newEvidenceCount = newEvidences.length;

    // 平均影响评分
    const avgImpactScore = structuredEvents.length > 0
      ? structuredEvents.reduce((sum, e) => sum + e.impactScore, 0) / structuredEvents.length
      : 0;

    // 新鲜度（新证据占总证据的比例）
    const totalEvidences = totalExistingEvidences + newEvidenceCount;
    const noveltyRate = totalEvidences > 0 ? newEvidenceCount / totalEvidences : 0;

    return {
      newEvidenceCount,
      avgImpactScore,
      noveltyRate,
      requestCount,
    };
  }

  private getDaysSinceLastUse(seed: Seed): number {
    if (!seed.lastUsedAt) return 0;
    const lastUsed = new Date(seed.lastUsedAt);
    const now = new Date();
    return Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
