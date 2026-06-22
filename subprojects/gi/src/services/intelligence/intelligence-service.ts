/**
 * 情报服务层（Intelligence Service）
 *
 * 这是白皮书 §7.5 定义的核心服务层，是 Chat / 看板 / 日报 / 公众号共同依赖的统一数据源。
 * 它聚合多个 Repository 的数据，提供稳定的、面向消费的 API 响应。
 *
 * 关键原则：
 * - 所有情报消费端通过本服务获取数据，不直接查知识库
 * - 日报/资讯流是"已生成的版本"，不是临时检索
 * - 所有响应都绑定 Evidence Ledger，可追溯依据
 *
 * @see docs/WHITE_PAPER.md §7.5 / §15（Intelligence Service API）
 * @see docs/design/04-API接口设计.md 第十五节
 */
import { EvidenceEventRepository } from '../../repositories/evidence-event-repository.js';
import { SignalRepository } from '../../repositories/signal-repository.js';
import { TrendClusterRepository } from '../../repositories/trend-cluster-repository.js';
import { EvidenceLedgerRepository } from '../../repositories/evidence-ledger-repository.js';
import { BenchmarkParameterRepository } from '../../repositories/benchmark-parameter-repository.js';
import { ModelClaimRepository } from '../../repositories/model-claim-repository.js';
import { ModelAnswerRepository } from '../../repositories/model-answer-repository.js';
import { IntelligenceBriefRepository } from '../../repositories/intelligence-brief-repository.js';
import { RequirementProfileRepository } from '../../repositories/requirement-profile-repository.js';
import type {
  EvidenceEvent,
  Signal,
  TrendCluster,
  BenchmarkParameter,
  ModelClaim,
  IntelligenceBrief,
  LedgerTargetType,
  VerificationStatus,
  BriefType,
} from '../../models/types.js';

// ===== API 响应 DTO =====

/** 资讯流单项 */
export interface FeedItem {
  id: string;
  title: string;
  summary: string;
  eventType: string;
  priority: string;
  audienceTags: string[];
  sourceCount: number;
  evidenceIds: string[];
  verificationStatus: VerificationStatus;
  publishedAt: string;
  impactScore: number;
}

/** 资讯流响应 */
export interface FeedResponse {
  items: FeedItem[];
  meta: {
    profileId?: string;
    since?: string;
    total: number;
    generatedAt: string;
  };
}

/** 专题动态响应 */
export interface TopicUpdatesResponse {
  topicId: string;
  topicName: string;
  period: string;
  updates: FeedItem[];
  trendSignals: Array<{
    direction: string;
    growthRate: number;
    description: string;
  }>;
}

/** 行业基准参数响应 */
export interface BenchmarksResponse {
  segment: string;
  metric?: string;
  parameters: Array<{
    id: string;
    name: string;
    valueRange?: { min: number; max: number; p50?: number };
    confidence: number;
    timeWindow: string;
    evidenceIds: string[];
    applicableConditions: string[];
  }>;
}

/** 模型观点聚合响应 */
export interface ModelOpinionsResponse {
  topic?: string;
  claims: Array<{
    id: string;
    summary: string;
    claimType: string;
    confidence: number;
    verificationStatus: VerificationStatus;
    evidenceIds: string[];
    createdAt: string;
  }>;
}

/** 证据摘要响应（Chat 用"依据是什么"） */
export interface EvidenceSummaryResponse {
  target: {
    type: LedgerTargetType;
    id: string;
  };
  evidence: Array<{
    id: string;
    evidenceType: string;
    title: string;
    url?: string;
    publishedAt?: string;
    collectedAt: string;
    verificationStatus: VerificationStatus;
    confidence: number;
  }>;
  summary: {
    total: number;
    verified: number;
    conflicted: number;
    unverified: number;
    lowConfidence: number;
    rejected: number;
    expired: number;
  };
}

/** 趋势信号响应 */
export interface TrendingSignalsResponse {
  trends: Array<{
    id: string;
    eventType: string;
    topicTag: string;
    signalCount: number;
    sourceCount: number;
    growthRate: number;
    direction: string;
    windowStart: string;
    windowEnd: string;
  }>;
}

// ===== 查询选项 =====

export interface FeedQueryOptions {
  profileId?: string;
  since?: string;            // ISO 时间或 '24h'/'7d' 等
  priority?: string[];       // ['P0', 'P1']
  eventType?: string[];      // ['上线', '买量']
  audienceTag?: string;
  limit?: number;
}

export interface BenchmarkQueryOptions {
  segment: string;
  metric?: string;
  activeOnly?: boolean;
}

export interface ModelOpinionsQueryOptions {
  topic?: string;
  claimType?: string;
  verificationStatus?: VerificationStatus;
  limit?: number;
}

// ===== 服务实现 =====

export class IntelligenceApiService {
  private evidenceEventRepo = new EvidenceEventRepository();
  private signalRepo = new SignalRepository();
  private trendRepo = new TrendClusterRepository();
  private ledgerRepo = new EvidenceLedgerRepository();
  private benchmarkRepo = new BenchmarkParameterRepository();
  private claimRepo = new ModelClaimRepository();
  private answerRepo = new ModelAnswerRepository();
  private briefRepo = new IntelligenceBriefRepository();
  private profileRepo = new RequirementProfileRepository();

  /**
   * 情报资讯流
   * GET /api/v1/intelligence/feed
   */
  getFeed(options: FeedQueryOptions = {}): FeedResponse {
    const limit = options.limit ?? 50;

    // 1. 拉取最近的 evidence events
    let events: EvidenceEvent[];
    if (options.eventType && options.eventType.length > 0) {
      events = [];
      for (const t of options.eventType) {
        events.push(...this.evidenceEventRepo.findByEventType(t as any, limit));
      }
      events = events.sort((a, b) => b.impactScore - a.impactScore).slice(0, limit);
    } else if (options.priority && options.priority.length > 0) {
      events = [];
      for (const p of options.priority) {
        const pEvents = this.evidenceEventRepo.findTopPriority(limit);
        events.push(...pEvents.filter((e) => e.priority === p));
      }
      events = events.slice(0, limit);
    } else {
      events = this.evidenceEventRepo.findRecent(limit);
    }

    // 2. 按 audienceTag 过滤
    if (options.audienceTag) {
      events = events.filter((e) => e.audienceTags.includes(options.audienceTag!));
    }

    // 3. 转换为 FeedItem
    const items: FeedItem[] = events.map((e) => this.eventToFeedItem(e));

    return {
      items,
      meta: {
        profileId: options.profileId,
        since: options.since,
        total: items.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * 当日日报
   * GET /api/v1/intelligence/briefs/daily
   */
  getDailyBrief(profileId: string, date?: string): IntelligenceBrief | null {
    const queryDate = date ?? new Date().toISOString().split('T')[0];
    return this.briefRepo.findDailyByDate(profileId, queryDate);
  }

  /**
   * 简报列表
   * GET /api/v1/intelligence/briefs
   */
  listBriefs(profileId?: string, briefType?: BriefType, limit: number = 20): IntelligenceBrief[] {
    if (profileId) return this.briefRepo.findByProfile(profileId, limit);
    if (briefType) return this.briefRepo.findByType(briefType, limit);
    return this.briefRepo.findAll({ limit, orderBy: 'generated_at' });
  }

  /**
   * 专题动态
   * GET /api/v1/intelligence/topics/:id/updates
   */
  getTopicUpdates(topicId: string, since: string = '7d'): TopicUpdatesResponse {
    // 把 topicId 当作话题标签（topic_tag）或事件类型处理
    const events = this.evidenceEventRepo.findByEventType(topicId as any, 50);
    const items = events.map((e) => this.eventToFeedItem(e));

    // 查找相关趋势簇
    const trends = this.trendRepo.findByEventType(topicId as any);
    const trendSignals = trends.map((t) => ({
      direction: t.trendDirection,
      growthRate: t.growthRate,
      description: `${t.topicTag} ${this.directionLabel(t.trendDirection)} ${Math.round(t.growthRate * 100)}%`,
    }));

    return {
      topicId,
      topicName: topicId,
      period: since,
      updates: items,
      trendSignals,
    };
  }

  /**
   * 热门趋势
   * GET /api/v1/intelligence/signals/trending
   */
  getTrendingSignals(limit: number = 20): TrendingSignalsResponse {
    const rising = this.trendRepo.findRising(limit);
    return {
      trends: rising.map((t) => ({
        id: t.id,
        eventType: t.eventType,
        topicTag: t.topicTag,
        signalCount: t.signalCount,
        sourceCount: t.sourceCount,
        growthRate: t.growthRate,
        direction: t.trendDirection,
        windowStart: t.windowStart,
        windowEnd: t.windowEnd,
      })),
    };
  }

  /**
   * 行业基准参数
   * GET /api/v1/intelligence/benchmarks
   */
  getBenchmarks(options: BenchmarkQueryOptions): BenchmarksResponse {
    let parameters: BenchmarkParameter[];
    if (options.metric) {
      parameters = this.benchmarkRepo.findBySegmentAndMetric(options.segment, options.metric);
    } else {
      parameters = options.activeOnly
        ? this.benchmarkRepo.findActiveBySegment(options.segment)
        : this.benchmarkRepo.findBySegment(options.segment);
    }

    return {
      segment: options.segment,
      metric: options.metric,
      parameters: parameters.map((p) => ({
        id: p.id,
        name: p.metricName,
        valueRange: p.valueRange
          ? { min: p.valueRange.min, max: p.valueRange.max, p50: p.valueRange.p50 }
          : p.metricValue !== undefined
            ? { min: p.metricValue, max: p.metricValue }
            : undefined,
        confidence: p.confidence,
        timeWindow: p.timeWindow,
        evidenceIds: p.evidenceIds,
        applicableConditions: p.applicableConditions,
      })),
    };
  }

  /**
   * 模型观点聚合
   * GET /api/v1/intelligence/model-opinions
   */
  getModelOpinions(options: ModelOpinionsQueryOptions = {}): ModelOpinionsResponse {
    let claims: ModelClaim[];
    const limit = options.limit ?? 50;

    if (options.claimType) {
      claims = this.claimRepo.findByType(options.claimType as any, limit);
    } else if (options.verificationStatus) {
      claims = this.claimRepo.findByStatus(options.verificationStatus, limit);
    } else {
      claims = this.claimRepo.findAll({ limit });
    }

    return {
      topic: options.topic,
      claims: claims.map((c) => ({
        id: c.id,
        summary: c.summary,
        claimType: c.claimType,
        confidence: c.confidence,
        verificationStatus: c.verificationStatus,
        evidenceIds: c.verifiedEvidenceIds,
        createdAt: c.createdAt,
      })),
    };
  }

  /**
   * 证据摘要（Chat 用）
   * GET /api/v1/intelligence/evidence/:id
   */
  getEvidenceSummary(
    targetType: LedgerTargetType,
    targetId: string,
  ): EvidenceSummaryResponse {
    const ledgerEntries = this.ledgerRepo.findByTarget(targetType, targetId);
    const summary = this.ledgerRepo.summarizeByTarget(targetType, targetId);

    return {
      target: { type: targetType, id: targetId },
      evidence: ledgerEntries.map((l) => ({
        id: l.id,
        evidenceType: l.evidenceType,
        title: l.title,
        url: l.url,
        publishedAt: l.publishedAt,
        collectedAt: l.collectedAt,
        verificationStatus: l.verificationStatus,
        confidence: l.confidence,
      })),
      summary,
    };
  }

  // ===== 私有辅助方法 =====

  private eventToFeedItem(event: EvidenceEvent): FeedItem {
    // 查询该事件的核验状态
    const ledgerSummary = this.ledgerRepo.summarizeByTarget('structured_event', event.id);
    const verificationStatus: VerificationStatus =
      ledgerSummary.conflicted > 0
        ? 'conflicted'
        : ledgerSummary.verified > 0
          ? 'verified'
          : ledgerSummary.total === 0
            ? 'unverified'
            : 'unverified';

    return {
      id: event.id,
      title: event.eventTitle,
      summary: this.buildSummary(event),
      eventType: event.eventType,
      priority: event.priority,
      audienceTags: event.audienceTags,
      sourceCount: event.sourceCount,
      evidenceIds: event.evidenceIds,
      verificationStatus,
      publishedAt: event.publishedAt ?? event.firstSeenAt,
      impactScore: event.impactScore,
    };
  }

  private buildSummary(event: EvidenceEvent): string {
    if (event.keyFacts.length === 0) return event.eventTitle;
    const topFacts = event.keyFacts
      .filter((f) => f.importance === 'high')
      .slice(0, 2)
      .map((f) => f.fact);
    return topFacts.length > 0 ? topFacts.join('；') : event.keyFacts[0].fact;
  }

  private directionLabel(direction: string): string {
    switch (direction) {
      case 'rising': return '上升';
      case 'declining': return '下降';
      case 'emerging': return '新兴';
      default: return '稳定';
    }
  }
}
