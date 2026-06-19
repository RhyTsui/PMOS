/**
 * 趋势检测服务
 *
 * 基于信号聚类分析，检测行业趋势
 */
import { v4 as uuidv4 } from 'uuid';
import { TrendClusterRepository } from '../../repositories/trend-cluster-repository.js';
import { SignalRepository } from '../../repositories/signal-repository.js';
import type { TrendCluster, Signal, EventType } from '../../models/types.js';

/**
 * 趋势检测配置
 */
export interface TrendDetectorConfig {
  // 时间窗口
  windowSizeHours: number;       // 时间窗口大小（小时）

  // 聚类阈值
  minSignalsPerCluster: number;  // 每个簇最少信号数
  minSourcesPerCluster: number;  // 每个簇最少来源数

  // 趋势判定
  risingGrowthRate: number;      // 增长率超过此值判定为上升
  decliningGrowthRate: number;   // 增长率低于此值判定为下降
  emergingMinSignals: number;    // 新兴趋势最少信号数
}

const DEFAULT_CONFIG: TrendDetectorConfig = {
  windowSizeHours: 24,
  minSignalsPerCluster: 3,
  minSourcesPerCluster: 2,
  risingGrowthRate: 0.2,
  decliningGrowthRate: -0.2,
  emergingMinSignals: 5,
};

/**
 * 趋势检测服务
 */
export class TrendDetector {
  private trendRepo: TrendClusterRepository;
  private signalRepo: SignalRepository;
  private config: TrendDetectorConfig;

  constructor(config: Partial<TrendDetectorConfig> = {}) {
    this.trendRepo = new TrendClusterRepository();
    this.signalRepo = new SignalRepository();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 运行趋势检测
   */
  async detect(): Promise<TrendCluster[]> {
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - this.config.windowSizeHours * 60 * 60 * 1000);

    // 获取时间窗口内的所有信号
    const signals = this.getSignalsInWindow(windowStart.toISOString(), windowEnd.toISOString());

    if (signals.length === 0) {
      return [];
    }

    // 按事件类型分组
    const groupedByType = this.groupByEventType(signals);

    // 对每个组进行聚类
    const clusters: TrendCluster[] = [];

    for (const [eventType, typeSignals] of Object.entries(groupedByType)) {
      // 按话题/实体进一步聚类
      const topicClusters = this.clusterByTopic(typeSignals);

      for (const cluster of topicClusters) {
        const trendCluster = this.createTrendCluster(
          eventType as EventType,
          cluster,
          windowStart.toISOString(),
          windowEnd.toISOString()
        );

        if (trendCluster) {
          this.trendRepo.create(trendCluster);
          clusters.push(trendCluster);
        }
      }
    }

    return clusters;
  }

  /**
   * 获取时间窗口内的信号
   */
  private getSignalsInWindow(start: string, end: string): Signal[] {
    const allSignals = this.signalRepo.findAll({ limit: 1000 });
    return allSignals.filter(s => s.createdAt >= start && s.createdAt <= end);
  }

  /**
   * 按事件类型分组
   */
  private groupByEventType(signals: Signal[]): Record<string, Signal[]> {
    const groups: Record<string, Signal[]> = {};
    for (const signal of signals) {
      if (!groups[signal.eventType]) {
        groups[signal.eventType] = [];
      }
      groups[signal.eventType].push(signal);
    }
    return groups;
  }

  /**
   * 按话题/实体聚类
   */
  private clusterByTopic(signals: Signal[]): Signal[][] {
    const clusters: Map<string, Signal[]> = new Map();

    for (const signal of signals) {
      // 使用实体标签作为聚类键
      const keys = signal.entityTags.length > 0 ? signal.entityTags : ['_general'];

      for (const key of keys) {
        if (!clusters.has(key)) {
          clusters.set(key, []);
        }
        clusters.get(key)!.push(signal);
      }
    }

    return Array.from(clusters.values());
  }

  /**
   * 创建趋势簇
   */
  private createTrendCluster(
    eventType: EventType,
    signals: Signal[],
    windowStart: string,
    windowEnd: string
  ): TrendCluster | null {
    // 检查是否满足最小阈值
    if (signals.length < this.config.minSignalsPerCluster) {
      return null;
    }

    const uniqueSources = new Set(signals.map((s: Signal) => s.sourceId));
    if (uniqueSources.size < this.config.minSourcesPerCluster) {
      return null;
    }

    const now = new Date().toISOString();
    const topicTag = signals[0]?.entityTags[0] || eventType;

    // 计算增长率（简化版：基于信号数量）
    const growthRate = this.calculateGrowthRate(signals, windowStart, windowEnd);

    // 判定趋势方向
    const trendDirection = this.determineTrendDirection(signals.length, growthRate);

    // 收集唯一实体
    const uniqueEntities = new Set<string>();
    for (const signal of signals) {
      for (const entity of signal.entityTags) {
        uniqueEntities.add(entity);
      }
    }

    return {
      id: uuidv4(),
      eventType,
      topicTag,
      signalCount: signals.length,
      sourceCount: uniqueSources.size,
      entityCount: uniqueEntities.size,
      growthRate,
      trendDirection,
      signalIds: signals.map(s => s.id),
      windowStart,
      windowEnd,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 计算增长率
   */
  private calculateGrowthRate(signals: Signal[], windowStart: string, windowEnd: string): number {
    const start = new Date(windowStart).getTime();
    const end = new Date(windowEnd).getTime();
    const mid = start + (end - start) / 2;

    const firstHalf = signals.filter(s => new Date(s.createdAt).getTime() < mid).length;
    const secondHalf = signals.filter(s => new Date(s.createdAt).getTime() >= mid).length;

    if (firstHalf === 0) {
      return secondHalf > 0 ? 1.0 : 0;
    }

    return (secondHalf - firstHalf) / firstHalf;
  }

  /**
   * 判定趋势方向
   */
  private determineTrendDirection(
    signalCount: number,
    growthRate: number
  ): 'rising' | 'stable' | 'declining' | 'emerging' {
    // 新兴趋势：信号数量达到阈值且增长迅速
    if (signalCount >= this.config.emergingMinSignals && growthRate > 0.5) {
      return 'emerging';
    }

    // 上升趋势
    if (growthRate > this.config.risingGrowthRate) {
      return 'rising';
    }

    // 下降趋势
    if (growthRate < this.config.decliningGrowthRate) {
      return 'declining';
    }

    // 稳定
    return 'stable';
  }

  /**
   * 获取上升趋势
   */
  getRisingTrends(limit: number = 20): TrendCluster[] {
    return this.trendRepo.findRising(limit);
  }

  /**
   * 获取趋势统计
   */
  getStats(): TrendStats {
    const allTrends = this.trendRepo.findAll();
    const rising = allTrends.filter((t: TrendCluster) => t.trendDirection === 'rising' || t.trendDirection === 'emerging').length;
    const stable = allTrends.filter((t: TrendCluster) => t.trendDirection === 'stable').length;
    const declining = allTrends.filter((t: TrendCluster) => t.trendDirection === 'declining').length;

    return {
      total: allTrends.length,
      rising,
      stable,
      declining,
    };
  }
}

/**
 * 趋势统计
 */
export interface TrendStats {
  total: number;
  rising: number;
  stable: number;
  declining: number;
}
