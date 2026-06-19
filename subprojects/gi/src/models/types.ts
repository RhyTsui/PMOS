/**
 * GI 核心数据模型类型定义
 *
 * @see docs/design/02-数据模型设计.md
 */

// ===== 通用类型 =====

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export type EventType =
  | '上线'
  | '测试'
  | '预约'
  | '版号'
  | '榜单变化'
  | '买量'
  | '舆情'
  | '融资'
  | '组织动作'
  | '版本更新'
  | '出海'
  | '合作'
  | '政策'
  | 'AI应用';

export type SourceType =
  | 'media'        // 行业媒体
  | 'community'    // 社区
  | 'official'     // 官方渠道
  | 'social'       // 社媒
  | 'wechat_mp'    // 微信公众号
  | 'forum'        // 论坛/贴吧
  | 'api';         // 数据 API

export type AccessMethod =
  | 'rss'
  | 'api'
  | 'static_crawl'
  | 'dynamic'
  | 'search';

// ===== 情报源 =====

export interface IntelSource {
  id: string;
  name: string;
  shortName: string;
  sourceType: SourceType;
  accessMethod: AccessMethod;
  baseUrl: string;
  feedUrl?: string;
  config: SourceConfig;
  schedule: ScheduleConfig;
  enabled: boolean;
  priority: Priority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SourceConfig {
  maxPages?: number;
  depth?: number;
  cssSelectors?: {
    title?: string;
    content?: string;
    publishDate?: string;
    images?: string;
  };
  requestDelay?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  authMethod?: 'cookie' | 'token' | 'none';
}

export interface ScheduleConfig {
  cron: string;
  retryOnFail: boolean;
  maxRetries: number;
  backoffMinutes: number;
}

// ===== 种子 =====

export type SeedType = 'entity' | 'event' | 'topic' | 'source';

export type SeedStatus = 'active' | 'dormant' | 'degraded' | 'retired';

export interface BaseSeed {
  id: string;
  seedType: SeedType;
  text: string;
  score: number;
  status: SeedStatus;
  discoveryCount: number;
  lastUsedAt?: string;
  lastEffectiveAt?: string;
  failCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EntitySeed extends BaseSeed {
  seedType: 'entity';
  entityType: 'game' | 'company' | 'person' | 'brand' | 'ip';
  aliases: string[];
  category?: string;
  market?: string;
}

export interface EventSeed extends BaseSeed {
  seedType: 'event';
  eventType: EventType;
  keywords: string[];
}

export interface TopicSeed extends BaseSeed {
  seedType: 'topic';
  topicTag: string;
  relatedEntities: string[];
  trendDirection?: 'rising' | 'stable' | 'declining';
}

export interface SourceSeed extends BaseSeed {
  seedType: 'source';
  sourceType: SourceType;
  discoveryUrl?: string;
  discoveryMethod: string;
  verified: boolean;
}

export type Seed = EntitySeed | EventSeed | TopicSeed | SourceSeed;

// ===== 原始证据 =====

export type EvidenceStatus =
  | 'collected'
  | 'extracting'
  | 'extracted'
  | 'failed'
  | 'duplicate'
  | 'filtered';

export interface RawEvidence {
  id: string;
  sourceId: string;
  seedIds: string[];
  url: string;
  title: string;
  content: string;
  contentHtml?: string;
  summary?: string;
  author?: string;
  publishedAt?: string;
  collectedAt: string;
  images: ImageRef[];
  metadata: EvidenceMetadata;
  hash: string;
  status: EvidenceStatus;
  errorMessage?: string;
}

export interface ImageRef {
  url: string;
  alt?: string;
  position: number;
  ocrText?: string;
  ocrConfidence?: number;
  qwenDescription?: string;
  processed: boolean;
}

export interface EvidenceMetadata {
  collectorType: AccessMethod;
  responseTime?: number;
  httpStatus?: number;
  language?: string;
  wordCount?: number;
  guid?: string;
  categories?: string[];
  searchQuery?: string;
  searchRank?: number;
  isSummaryOnly?: boolean;
}

// ===== 结构化事件 =====

export interface StructuredEvent {
  id: string;
  evidenceId: string;
  sourceId: string;
  eventTitle: string;
  keyFacts: KeyFact[];
  actionAdvice: ActionAdvice[];
  eventType: EventType;
  sentiment: Sentiment;
  impactScore: number;
  priority: Priority;
  audienceTags: string[];
  entities: MentionedEntity[];
  extractedAt: string;
  model: string;
  confidence: number;
}

export interface KeyFact {
  fact: string;
  importance: 'high' | 'medium' | 'low';
  entities: string[];
}

export interface ActionAdvice {
  role: string;
  advice: string;
  urgency: 'immediate' | 'watch' | 'info';
}

export interface Sentiment {
  polarity: 'positive' | 'negative' | 'neutral' | 'mixed';
  intensity: number;
  target?: string;
}

export interface MentionedEntity {
  name: string;
  type: 'game' | 'company' | 'person' | 'brand';
  role: 'subject' | 'object' | 'context';
  seedId?: string;
}

// ===== 证据事件 =====

export interface EvidenceEvent {
  id: string;
  eventTitle: string;
  eventType: EventType;
  keyFacts: KeyFact[];
  actionAdvice: ActionAdvice[];
  sentiment: Sentiment;
  evidenceIds: string[];
  structuredEventIds: string[];
  sourceCount: number;
  sourceIds: string[];
  impactScore: number;
  confidenceScore: number;
  priority: Priority;
  audienceTags: string[];
  entities: MentionedEntity[];
  relatedSeedIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  dedupHash: string;
  mergeCount: number;
}

// ===== 信号 =====

export type SignalStatus = 'new' | 'dispatched' | 'consumed' | 'archived';

export interface Signal {
  id: string;
  evidenceEventId: string;
  sourceId: string;
  title: string;
  summary: string;
  eventType: EventType;
  priority: Priority;
  impactScore: number;
  audienceTags: string[];
  topicTags: string[];
  entityTags: string[];
  status: SignalStatus;
  readByRoles: string[];
  dispatchedAt?: string;
  createdAt: string;
}

// ===== 趋势簇 =====

export interface TrendCluster {
  id: string;
  eventType: EventType;
  topicTag: string;
  signalCount: number;
  sourceCount: number;
  entityCount: number;
  growthRate: number;
  trendDirection: 'rising' | 'stable' | 'declining' | 'emerging';
  signalIds: string[];
  windowStart: string;
  windowEnd: string;
  createdAt: string;
  updatedAt: string;
}

// ===== 源健康状态 =====

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface SourceHealth {
  id: string;
  sourceId: string;
  lastCollectedAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  totalCollections: number;
  successCount: number;
  failCount: number;
  evidenceProduced: number;
  avgResponseTime: number;
  healthStatus: HealthStatus;
  healthScore: number;
  consecutiveFailures: number;
  updatedAt: string;
}

// ===== 采集任务 =====

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobTrigger = 'scheduled' | 'manual' | 'seed_driven';

export interface CollectionJob {
  id: string;
  sourceId: string;
  seedIds: string[];
  trigger: JobTrigger;
  collectorType: AccessMethod;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  status: JobStatus;
  evidenceCount: number;
  newEvidenceCount: number;
  errorCount: number;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
}

// ===== 去重记录 =====

export interface DedupRecord {
  id: string;
  evidenceId: string;
  urlNormalized: string;
  contentHash: string;
  titleHash: string;
  dedupGroupId?: string;
  createdAt: string;
}
