/**
 * 漏采检测服务
 *
 * 检测高分种子是否长期未产出情报，生成告警报告
 *
 * @see docs/design/03-Seed种子系统设计.md
 */
import { SeedRepository } from '../../repositories/seed-repository.js';
import { RawEvidenceRepository } from '../../repositories/raw-evidence-repository.js';
import type { Seed } from '../../models/types.js';

/**
 * 漏采检测配置
 */
export interface GapDetectionConfig {
  /** 种子评分阈值（低于此分不参与检测） */
  minSeedScore: number;
  /** 无产出天数阈值（超过此天数视为漏采） */
  gapDaysThreshold: number;
  /** 最多返回的告警数量 */
  maxAlerts: number;
}

const DEFAULT_CONFIG: GapDetectionConfig = {
  minSeedScore: 70,
  gapDaysThreshold: 7,
  maxAlerts: 50,
};

/**
 * 漏采告警
 */
export interface GapAlert {
  seedId: string;
  seedText: string;
  seedType: string;
  score: number;
  lastUsedAt: string | null;
  gapDays: number;
  severity: 'warning' | 'critical';
  suggestion: string;
}

/**
 * 漏采检测报告
 */
export interface GapDetectionReport {
  detectedAt: string;
  totalSeedsChecked: number;
  gapsFound: number;
  alerts: GapAlert[];
  summary: {
    critical: number;
    warning: number;
  };
}

/**
 * 漏采检测服务
 */
export class GapDetectionService {
  private seedRepo: SeedRepository;
  private evidenceRepo: RawEvidenceRepository;
  private config: GapDetectionConfig;

  constructor(config: Partial<GapDetectionConfig> = {}) {
    this.seedRepo = new SeedRepository();
    this.evidenceRepo = new RawEvidenceRepository();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行漏采检测
   */
  detect(): GapDetectionReport {
    const now = new Date();
    const alerts: GapAlert[] = [];

    // 1. 获取所有高分活跃种子
    const activeSeeds = this.seedRepo.findAll({ limit: 1000 })
      .filter((s: Seed) => s.status === 'active' && s.score >= this.config.minSeedScore);

    // 2. 对每个种子检查是否长期未产出
    for (const seed of activeSeeds) {
      const gapDays = this.calculateGapDays(seed, now);

      if (gapDays >= this.config.gapDaysThreshold) {
        const severity = gapDays >= this.config.gapDaysThreshold * 2 ? 'critical' : 'warning';
        const suggestion = this.generateSuggestion(seed, gapDays);

        alerts.push({
          seedId: seed.id,
          seedText: seed.text,
          seedType: seed.seedType,
          score: seed.score,
          lastUsedAt: seed.lastUsedAt || null,
          gapDays,
          severity,
          suggestion,
        });
      }

      if (alerts.length >= this.config.maxAlerts) break;
    }

    // 3. 按严重度和评分排序
    alerts.sort((a, b) => {
      // 先按严重度（critical 优先）
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1;
      }
      // 再按评分（高分优先）
      return b.score - a.score;
    });

    const critical = alerts.filter(a => a.severity === 'critical').length;
    const warning = alerts.filter(a => a.severity === 'warning').length;

    return {
      detectedAt: now.toISOString(),
      totalSeedsChecked: activeSeeds.length,
      gapsFound: alerts.length,
      alerts,
      summary: { critical, warning },
    };
  }

  /**
   * 计算种子的无产出天数
   */
  private calculateGapDays(seed: Seed, now: Date): number {
    if (!seed.lastUsedAt) {
      // 从未使用过，用创建时间计算
      const createdDate = new Date(seed.createdAt);
      return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const lastUsedDate = new Date(seed.lastUsedAt);
    return Math.floor((now.getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * 生成建议
   */
  private generateSuggestion(seed: Seed, gapDays: number): string {
    const seedType = seed.seedType;

    if (seedType === 'entity') {
      if (gapDays >= 14) {
        return `高分实体种子"${seed.text}"已 ${gapDays} 天未产出，建议：1) 检查相关源是否正常采集 2) 考虑增加该实体相关的采集源 3) 如实体已不再重要，可降低评分或停用`;
      }
      return `实体种子"${seed.text}"已 ${gapDays} 天未产出，建议检查相关采集源`;
    }

    if (seedType === 'event') {
      if (gapDays >= 14) {
        return `事件种子"${seed.text}"已 ${gapDays} 天未触发，建议：1) 检查事件类型配置是否合理 2) 确认关键词覆盖是否完整 3) 检查相关源是否覆盖此类事件`;
      }
      return `事件种子"${seed.text}"已 ${gapDays} 天未触发，建议检查采集源覆盖`;
    }

    if (seedType === 'topic') {
      return `话题种子"${seed.text}"已 ${gapDays} 天未关联新情报，建议检查话题热度是否下降`;
    }

    return `种子"${seed.text}"已 ${gapDays} 天未产出，建议检查`;
  }

  /**
   * 获取漏采统计
   */
  getStats(): GapStats {
    const report = this.detect();
    return {
      totalSeedsChecked: report.totalSeedsChecked,
      gapsFound: report.gapsFound,
      critical: report.summary.critical,
      warning: report.summary.warning,
      detectedAt: report.detectedAt,
    };
  }
}

/**
 * 漏采统计
 */
export interface GapStats {
  totalSeedsChecked: number;
  gapsFound: number;
  critical: number;
  warning: number;
  detectedAt: string;
}
