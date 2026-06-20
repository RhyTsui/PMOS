/**
 * 每日统计报告服务
 *
 * 生成每日情报采集统计报告，包括：
 * 1. 采集量统计（新增证据、结构化事件、信号数量）
 * 2. 源健康状态统计
 * 3. 信号优先级分布
 * 4. 漏采告警摘要
 * 5. 趋势分析
 *
 * @see docs/design/03-Seed种子系统设计.md
 */
import { RawEvidenceRepository } from '../../repositories/raw-evidence-repository.js';
import { StructuredEventRepository } from '../../repositories/structured-event-repository.js';
import { EvidenceEventRepository } from '../../repositories/evidence-event-repository.js';
import { SignalRepository } from '../../repositories/signal-repository.js';
import { IntelSourceRepository } from '../../repositories/intel-source-repository.js';
import { SourceHealthRepository } from '../../repositories/source-health-repository.js';
import { GapDetectionService } from '../gap-detection/index.js';
import { TrendDetector } from '../trend/index.js';
import type { Priority, HealthStatus } from '../../models/types.js';

/**
 * 每日报告配置
 */
export interface DailyReportConfig {
  /** 报告时区（默认 Asia/Shanghai） */
  timezone: string;
  /** 是否包含趋势分析 */
  includeTrends: boolean;
  /** 是否包含漏采告警 */
  includeGapAlerts: boolean;
  /** 趋势分析时间窗口（小时） */
  trendWindowHours: number;
}

const DEFAULT_CONFIG: DailyReportConfig = {
  timezone: 'Asia/Shanghai',
  includeTrends: true,
  includeGapAlerts: true,
  trendWindowHours: 24,
};

/**
 * 每日统计报告
 */
export interface DailyReport {
  /** 报告日期 */
  reportDate: string;
  /** 生成时间 */
  generatedAt: string;

  /** 采集统计 */
  collection: {
    /** 新增原始证据数量 */
    newEvidenceCount: number;
    /** 新增结构化事件数量 */
    newStructuredEventsCount: number;
    /** 新增信号数量 */
    newSignalsCount: number;
    /** 按状态分布 */
    evidenceByStatus: Record<string, number>;
    /** 按源分布 */
    evidenceBySource: Array<{
      sourceId: string;
      sourceName: string;
      count: number;
    }>;
  };

  /** 信号统计 */
  signals: {
    /** 总信号数 */
    total: number;
    /** 新信号数 */
    new: number;
    /** 已处理信号数 */
    dispatched: number;
    /** 按优先级分布 */
    byPriority: Record<Priority, number>;
    /** 按事件类型分布 */
    byEventType: Record<string, number>;
    /** Top 10 高影响信号 */
    topImpactSignals: Array<{
      id: string;
      title: string;
      priority: Priority;
      impactScore: number;
      eventType: string;
    }>;
  };

  /** 源健康统计 */
  sourceHealth: {
    /** 总源数 */
    total: number;
    /** 启用源数 */
    enabled: number;
    /** 按健康状态分布 */
    byHealthStatus: Record<HealthStatus, number>;
    /** 不健康的源列表 */
    unhealthySources: Array<{
      id: string;
      name: string;
      healthStatus: HealthStatus;
      healthScore: number;
      lastError?: string;
    }>;
  };

  /** 漏采告警（可选） */
  gapAlerts?: {
    /** 检查的种子数 */
    seedsChecked: number;
    /** 发现的漏采数 */
    gapsFound: number;
    /** 严重漏采数 */
    criticalCount: number;
    /** 警告漏采数 */
    warningCount: number;
    /** Top 5 严重漏采 */
    topCriticalGaps: Array<{
      seedText: string;
      seedType: string;
      score: number;
      gapDays: number;
    }>;
  };

  /** 趋势分析（可选） */
  trends?: {
    /** 上升趋势数 */
    risingCount: number;
    /** 稳定趋势数 */
    stableCount: number;
    /** 下降趋势数 */
    decliningCount: number;
    /** 新兴趋势 */
    emerging: Array<{
      eventType: string;
      topicTag: string;
      signalCount: number;
      growthRate: number;
    }>;
  };

  /** 汇总摘要 */
  summary: {
    /** 整体健康度（0-100） */
    overallHealth: number;
    /** 关键指标变化（与昨天对比） */
    keyMetricsDelta: {
      evidenceDelta: number;
      signalsDelta: number;
      healthDelta: number;
    };
    /** 建议操作 */
    recommendations: string[];
  };
}

/**
 * 每日统计报告服务
 */
export class DailyReportService {
  private evidenceRepo: RawEvidenceRepository;
  private structuredEventRepo: StructuredEventRepository;
  private evidenceEventRepo: EvidenceEventRepository;
  private signalRepo: SignalRepository;
  private sourceRepo: IntelSourceRepository;
  private healthRepo: SourceHealthRepository;
  private gapService: GapDetectionService;
  private trendDetector: TrendDetector;
  private config: DailyReportConfig;

  constructor(config: Partial<DailyReportConfig> = {}) {
    this.evidenceRepo = new RawEvidenceRepository();
    this.structuredEventRepo = new StructuredEventRepository();
    this.evidenceEventRepo = new EvidenceEventRepository();
    this.signalRepo = new SignalRepository();
    this.sourceRepo = new IntelSourceRepository();
    this.healthRepo = new SourceHealthRepository();
    this.gapService = new GapDetectionService();
    this.trendDetector = new TrendDetector();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 生成每日报告
   */
  async generateReport(date?: string): Promise<DailyReport> {
    const reportDate = date || this.getTodayDate();
    const generatedAt = new Date().toISOString();

    // 1. 采集统计
    const collection = await this.generateCollectionStats(reportDate);

    // 2. 信号统计
    const signals = this.generateSignalStats();

    // 3. 源健康统计
    const sourceHealth = this.generateSourceHealthStats();

    // 4. 漏采告警（可选）
    let gapAlerts: DailyReport['gapAlerts'];
    if (this.config.includeGapAlerts) {
      gapAlerts = this.generateGapAlerts();
    }

    // 5. 趋势分析（可选）
    let trends: DailyReport['trends'];
    if (this.config.includeTrends) {
      trends = this.generateTrendAnalysis();
    }

    // 6. 生成汇总摘要
    const summary = this.generateSummary(collection, signals, sourceHealth, reportDate);

    return {
      reportDate,
      generatedAt,
      collection,
      signals,
      sourceHealth,
      gapAlerts,
      trends,
      summary,
    };
  }

  /**
   * 生成采集统计
   */
  private async generateCollectionStats(reportDate: string): Promise<DailyReport['collection']> {
    const startOfDay = `${reportDate}T00:00:00.000Z`;
    const endOfDay = `${reportDate}T23:59:59.999Z`;

    // 获取当天采集的证据
    const allEvidence = this.evidenceRepo.findAll({ limit: 10000, orderBy: 'collected_at' });
    const todayEvidence = allEvidence.filter(e =>
      e.collectedAt >= startOfDay && e.collectedAt <= endOfDay
    );

    // 获取当天的结构化事件
    const allStructuredEvents = this.structuredEventRepo.findAll({ limit: 10000, orderBy: 'extracted_at' });
    const todayStructuredEvents = allStructuredEvents.filter(e =>
      e.extractedAt >= startOfDay && e.extractedAt <= endOfDay
    );

    // 获取当天的信号
    const allSignals = this.signalRepo.findAll({ limit: 10000 });
    const todaySignals = allSignals.filter(s =>
      s.createdAt >= startOfDay && s.createdAt <= endOfDay
    );

    // 按状态分布
    const evidenceByStatus: Record<string, number> = {};
    for (const e of todayEvidence) {
      evidenceByStatus[e.status] = (evidenceByStatus[e.status] || 0) + 1;
    }

    // 按源分布
    const sourceCountMap = new Map<string, number>();
    for (const e of todayEvidence) {
      sourceCountMap.set(e.sourceId, (sourceCountMap.get(e.sourceId) || 0) + 1);
    }

    const allSources = this.sourceRepo.findAll();
    const evidenceBySource = Array.from(sourceCountMap.entries())
      .map(([sourceId, count]) => {
        const source = allSources.find(s => s.id === sourceId);
        return {
          sourceId,
          sourceName: source?.name || 'Unknown',
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      newEvidenceCount: todayEvidence.length,
      newStructuredEventsCount: todayStructuredEvents.length,
      newSignalsCount: todaySignals.length,
      evidenceByStatus,
      evidenceBySource,
    };
  }

  /**
   * 生成信号统计
   */
  private generateSignalStats(): DailyReport['signals'] {
    const allSignals = this.signalRepo.findAll({ limit: 10000 });
    const signalStats = this.signalRepo.countByStatus();

    // 按优先级分布
    const byPriority: Record<Priority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    for (const s of allSignals) {
      byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
    }

    // 按事件类型分布
    const byEventType: Record<string, number> = {};
    for (const s of allSignals) {
      byEventType[s.eventType] = (byEventType[s.eventType] || 0) + 1;
    }

    // Top 10 高影响信号
    const topImpactSignals = allSignals
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        title: s.title,
        priority: s.priority,
        impactScore: s.impactScore,
        eventType: s.eventType,
      }));

    return {
      total: allSignals.length,
      new: signalStats.new,
      dispatched: signalStats.dispatched,
      byPriority,
      byEventType,
      topImpactSignals,
    };
  }

  /**
   * 生成源健康统计
   */
  private generateSourceHealthStats(): DailyReport['sourceHealth'] {
    const allSources = this.sourceRepo.findAll();
    const enabledSources = allSources.filter(s => s.enabled);
    const allHealth = this.healthRepo.findAll();
    const healthStats = this.healthRepo.countByStatus();

    // 不健康的源列表
    const unhealthySources = allHealth
      .filter(h => h.healthStatus === 'degraded' || h.healthStatus === 'down')
      .map(h => {
        const source = allSources.find(s => s.id === h.sourceId);
        return {
          id: h.sourceId,
          name: source?.name || 'Unknown',
          healthStatus: h.healthStatus,
          healthScore: h.healthScore,
          lastError: h.lastError,
        };
      });

    return {
      total: allSources.length,
      enabled: enabledSources.length,
      byHealthStatus: healthStats,
      unhealthySources,
    };
  }

  /**
   * 生成漏采告警
   */
  private generateGapAlerts(): DailyReport['gapAlerts'] {
    const report = this.gapService.detect();

    const topCriticalGaps = report.alerts
      .filter(a => a.severity === 'critical')
      .slice(0, 5)
      .map(a => ({
        seedText: a.seedText,
        seedType: a.seedType,
        score: a.score,
        gapDays: a.gapDays,
      }));

    return {
      seedsChecked: report.totalSeedsChecked,
      gapsFound: report.gapsFound,
      criticalCount: report.summary.critical,
      warningCount: report.summary.warning,
      topCriticalGaps,
    };
  }

  /**
   * 生成趋势分析
   */
  private generateTrendAnalysis(): DailyReport['trends'] {
    const trends = this.trendDetector.getRisingTrends(20);
    const trendStats = this.trendDetector.getStats();

    const emerging = trends
      .filter(t => t.trendDirection === 'emerging' || t.trendDirection === 'rising')
      .slice(0, 5)
      .map(t => ({
        eventType: t.eventType,
        topicTag: t.topicTag,
        signalCount: t.signalCount,
        growthRate: t.growthRate,
      }));

    return {
      risingCount: trendStats.rising,
      stableCount: trendStats.stable,
      decliningCount: trendStats.declining,
      emerging,
    };
  }

  /**
   * 生成汇总摘要
   */
  private generateSummary(
    collection: DailyReport['collection'],
    signals: DailyReport['signals'],
    sourceHealth: DailyReport['sourceHealth'],
    reportDate: string
  ): DailyReport['summary'] {
    // 计算整体健康度
    const healthScore = sourceHealth.total > 0
      ? (sourceHealth.byHealthStatus.healthy / sourceHealth.total) * 100
      : 100;

    // 这里简化处理，实际应该与昨天的报告对比
    const keyMetricsDelta = {
      evidenceDelta: collection.newEvidenceCount,
      signalsDelta: signals.new,
      healthDelta: 0,
    };

    // 生成建议
    const recommendations: string[] = [];

    if (sourceHealth.unhealthySources.length > 0) {
      recommendations.push(`有 ${sourceHealth.unhealthySources.length} 个源健康状态异常，建议检查`);
    }

    if (signals.byPriority.P0 > 10) {
      recommendations.push(`P0 信号较多（${signals.byPriority.P0} 个），建议优先处理`);
    }

    if (collection.newEvidenceCount === 0) {
      recommendations.push('今日无新增证据，建议检查采集源是否正常工作');
    }

    if (recommendations.length === 0) {
      recommendations.push('系统运行正常，无特殊建议');
    }

    return {
      overallHealth: Math.round(healthScore),
      keyMetricsDelta,
      recommendations,
    };
  }

  /**
   * 获取今天日期（YYYY-MM-DD）
   */
  private getTodayDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * 获取报告统计
   */
  getStats(): DailyReportStats {
    return {
      lastReportDate: this.getTodayDate(),
      totalReportsGenerated: 0, // 实际应该持久化
    };
  }
}

/**
 * 每日报告统计
 */
export interface DailyReportStats {
  lastReportDate: string;
  totalReportsGenerated: number;
}
