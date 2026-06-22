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
import { createLLMClient } from '../../lib/llm-client.js';
import type { Priority, HealthStatus, RawEvidence, Signal, StructuredEvent } from '../../models/types.js';

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
  /** 速览默认是否尝试调用 LLM */
  enableDigestLLM: boolean;
}

const DEFAULT_CONFIG: DailyReportConfig = {
  timezone: 'Asia/Shanghai',
  includeTrends: true,
  includeGapAlerts: true,
  trendWindowHours: 24,
  enableDigestLLM: false,
};
export interface DailyDigestOptions {
  /** 自定义提示词模板，支持 {{date}} / {{stats}} / {{items}} / {{signals}} / {{events}} */
  prompt?: string;
  /** 是否调用 LLM；未传时使用服务配置 */
  useLLM?: boolean;
  /** 速览面向的读者 */
  audience?: string;
  /** 文风要求 */
  style?: string;
  /** 纳入 prompt 的最大内容条数 */
  maxItems?: number;
  /** 指定模型 */
  model?: string;
}

export interface DailyDigest {
  /** 速览日期 */
  reportDate: string;
  /** 生成时间 */
  generatedAt: string;
  /** 内容来源 */
  source: 'llm' | 'fallback';
  /** 实际使用的提示词 */
  prompt: string;
  /** 快速阅读短文 */
  shortArticle: string;
  /** 高质量感受/洞察 */
  qualityImpressions: string[];
  /** 重点条目 */
  highlights: Array<{
    title: string;
    reason: string;
    url?: string;
    sourceName?: string;
  }>;
  /** 关键信号 */
  keySignals: Array<{
    id: string;
    title: string;
    priority: Priority;
    impactScore: number;
    summary: string;
  }>;
  /** 数据概览 */
  stats: {
    evidenceCount: number;
    structuredEventCount: number;
    signalCount: number;
    sourceCount: number;
  };
  /** LLM 元信息 */
  llm?: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

const DEFAULT_DIGEST_PROMPT = `你是游戏行业情报编辑。请基于今天采集到的内容，输出适合快速阅读的每日速览。

要求：
1. shortArticle 写成 300-500 字中文短文，不要堆砌列表，要有判断和节奏。
2. qualityImpressions 输出 3-5 条高质量感受，强调行业变化、机会、风险、值得继续跟踪的地方。
3. highlights 选择最值得读的 3-6 条内容，并说明入选理由。
4. 只使用输入材料，不要编造事实。
5. 返回 JSON，格式为：
{
  "shortArticle": "...",
  "qualityImpressions": ["..."],
  "highlights": [{"title":"...", "reason":"...", "url":"...", "sourceName":"..."}]
}

日期：{{date}}
读者：{{audience}}
文风：{{style}}
统计：{{stats}}
关键信号：{{signals}}
结构化事件：{{events}}
采集内容：{{items}}`;
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
   * 生成提示词控制的每日速览
   */
  async generateDigest(date?: string, options: DailyDigestOptions = {}): Promise<DailyDigest> {
    const reportDate = date || this.getTodayDate();
    const generatedAt = new Date().toISOString();
    const material = this.collectDigestMaterial(reportDate, options.maxItems ?? 20);
    const prompt = this.buildDigestPrompt(reportDate, material, options);
    const useLLM = options.useLLM ?? this.config.enableDigestLLM;

    if (useLLM && process.env.QWEN_API_KEY) {
      try {
        const client = createLLMClient();
        const response = await client.call({
          model: options.model,
          messages: [
            { role: 'system', content: '你输出严格 JSON，不添加 Markdown 代码块。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.45,
          maxTokens: 1800,
        });
        const parsed = this.parseDigestLLMContent(response.content);
        return {
          reportDate,
          generatedAt,
          source: 'llm',
          prompt,
          ...parsed,
          keySignals: this.toDigestSignals(material.todaySignals),
          stats: this.toDigestStats(material),
          llm: {
            model: response.model,
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens,
          },
        };
      } catch (error) {
        console.warn('[DailyDigest] LLM 生成失败，使用本地兜底速览:', error instanceof Error ? error.message : String(error));
      }
    }

    return this.generateFallbackDigest(reportDate, generatedAt, prompt, material);
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

  private collectDigestMaterial(reportDate: string, maxItems: number): {
    todayEvidence: RawEvidence[];
    todayStructuredEvents: StructuredEvent[];
    todaySignals: Signal[];
    sourceNames: Map<string, string>;
  } {
    const startOfDay = `${reportDate}T00:00:00.000Z`;
    const endOfDay = `${reportDate}T23:59:59.999Z`;
    const sourceNames = new Map(this.sourceRepo.findAll({ limit: 10000 }).map(source => [source.id, source.name]));

    const todayEvidence = this.evidenceRepo.findByDateRange(startOfDay, endOfDay)
      .slice(0, maxItems);
    const todayStructuredEvents = this.structuredEventRepo.findAll({ limit: 10000, orderBy: 'extracted_at' })
      .filter(event => event.extractedAt >= startOfDay && event.extractedAt <= endOfDay)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, maxItems);
    const todaySignals = this.signalRepo.findAll({ limit: 10000 })
      .filter(signal => signal.createdAt >= startOfDay && signal.createdAt <= endOfDay)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, maxItems);

    return { todayEvidence, todayStructuredEvents, todaySignals, sourceNames };
  }

  private buildDigestPrompt(
    reportDate: string,
    material: ReturnType<DailyReportService['collectDigestMaterial']>,
    options: DailyDigestOptions,
  ): string {
    const template = options.prompt?.trim() || DEFAULT_DIGEST_PROMPT;
    const audience = options.audience || '游戏行业经营者、发行和投放负责人、产品负责人';
    const style = options.style || '短、准、有判断，像资深行业编辑写给忙碌决策者';

    return template
      .replaceAll('{{date}}', reportDate)
      .replaceAll('{{audience}}', audience)
      .replaceAll('{{style}}', style)
      .replaceAll('{{stats}}', JSON.stringify(this.toDigestStats(material), null, 2))
      .replaceAll('{{signals}}', JSON.stringify(this.toDigestSignals(material.todaySignals), null, 2))
      .replaceAll('{{events}}', JSON.stringify(this.toDigestEvents(material.todayStructuredEvents), null, 2))
      .replaceAll('{{items}}', JSON.stringify(this.toDigestItems(material), null, 2));
  }

  private parseDigestLLMContent(content: string): Pick<DailyDigest, 'shortArticle' | 'qualityImpressions' | 'highlights'> {
    const normalized = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(normalized) as Partial<Pick<DailyDigest, 'shortArticle' | 'qualityImpressions' | 'highlights'>>;

    return {
      shortArticle: typeof parsed.shortArticle === 'string' ? parsed.shortArticle : '',
      qualityImpressions: Array.isArray(parsed.qualityImpressions)
        ? parsed.qualityImpressions.filter(item => typeof item === 'string').slice(0, 8)
        : [],
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights
            .filter(item => item && typeof item.title === 'string' && typeof item.reason === 'string')
            .slice(0, 8)
            .map(item => ({
              title: item.title,
              reason: item.reason,
              url: typeof item.url === 'string' ? item.url : undefined,
              sourceName: typeof item.sourceName === 'string' ? item.sourceName : undefined,
            }))
        : [],
    };
  }

  private generateFallbackDigest(
    reportDate: string,
    generatedAt: string,
    prompt: string,
    material: ReturnType<DailyReportService['collectDigestMaterial']>,
  ): DailyDigest {
    const keySignals = this.toDigestSignals(material.todaySignals);
    const topItems = this.toDigestItems(material).slice(0, 6);
    const stats = this.toDigestStats(material);
    const lead = stats.evidenceCount > 0
      ? `${reportDate} 共采集 ${stats.evidenceCount} 条内容，形成 ${stats.signalCount} 条信号。`
      : `${reportDate} 暂无新增采集内容。`;
    const signalText = keySignals.length > 0
      ? `最值得优先看的信号是：${keySignals.slice(0, 3).map(signal => `${signal.title}（${signal.priority}/${signal.impactScore}）`).join('；')}。`
      : '今天还没有形成新的高优先级信号。';
    const itemText = topItems.length > 0
      ? `从采集内容看，信息主要集中在 ${topItems.map(item => item.title).join('、')} 等条目。`
      : '当前更适合把重点放在源健康、采集链路和种子覆盖检查上。';

    return {
      reportDate,
      generatedAt,
      source: 'fallback',
      prompt,
      shortArticle: `${lead}${signalText}${itemText}整体上，这份速览更偏向“先建立今天的信息地图”：先处理高影响信号，再回看原文确认事实细节，最后把异常采集源和空白主题列入明天的跟踪清单。`,
      qualityImpressions: this.buildFallbackImpressions(stats, keySignals),
      highlights: topItems.slice(0, 5).map(item => ({
        title: item.title,
        reason: item.summary ? item.summary.slice(0, 120) : '今日采集内容中优先级较高，值得快速浏览。',
        url: item.url,
        sourceName: item.sourceName,
      })),
      keySignals,
      stats,
    };
  }

  private buildFallbackImpressions(stats: DailyDigest['stats'], keySignals: DailyDigest['keySignals']): string[] {
    const impressions: string[] = [];
    if (keySignals.some(signal => signal.priority === 'P0')) {
      impressions.push('今天存在 P0 信号，说明至少有一条内容可能影响近期判断或行动节奏。');
    }
    if (stats.evidenceCount === 0) {
      impressions.push('无新增采集比低质量采集更需要关注，应优先确认采集任务、RSS 源和微信公众号接入状态。');
    } else {
      impressions.push('先用信号排序过滤噪音，再回到原始证据核对细节，阅读效率会更高。');
    }
    if (stats.sourceCount > 1) {
      impressions.push('多源覆盖能提升事实可信度，重复出现的主题应进入明日持续观察。');
    }
    impressions.push('高质量速览的价值不在罗列新闻，而在把“值得继续跟踪什么”提前说清楚。');
    return impressions;
  }

  private toDigestStats(material: ReturnType<DailyReportService['collectDigestMaterial']>): DailyDigest['stats'] {
    return {
      evidenceCount: material.todayEvidence.length,
      structuredEventCount: material.todayStructuredEvents.length,
      signalCount: material.todaySignals.length,
      sourceCount: new Set(material.todayEvidence.map(evidence => evidence.sourceId)).size,
    };
  }

  private toDigestSignals(signals: Signal[]): DailyDigest['keySignals'] {
    return signals.slice(0, 8).map(signal => ({
      id: signal.id,
      title: signal.title,
      priority: signal.priority,
      impactScore: signal.impactScore,
      summary: signal.summary,
    }));
  }

  private toDigestEvents(events: StructuredEvent[]): Array<{
    title: string;
    eventType: string;
    priority: Priority;
    impactScore: number;
    keyFacts: string[];
  }> {
    return events.slice(0, 10).map(event => ({
      title: event.eventTitle,
      eventType: event.eventType,
      priority: event.priority,
      impactScore: event.impactScore,
      keyFacts: event.keyFacts.map(fact => fact.fact).slice(0, 3),
    }));
  }

  private toDigestItems(material: ReturnType<DailyReportService['collectDigestMaterial']>): Array<{
    title: string;
    summary: string;
    url?: string;
    sourceName?: string;
    publishedAt?: string;
    collectedAt: string;
  }> {
    return material.todayEvidence.map(evidence => ({
      title: evidence.title,
      summary: evidence.summary || evidence.content.slice(0, 240),
      url: evidence.url,
      sourceName: material.sourceNames.get(evidence.sourceId),
      publishedAt: evidence.publishedAt,
      collectedAt: evidence.collectedAt,
    }));
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
