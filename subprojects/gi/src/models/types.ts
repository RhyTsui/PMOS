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
  | 'search'
  | 'sogou_wechat';

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
  category?: string;
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
  searchQuery?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface ScheduleConfig {
  cron: string;
  retryOnFail?: boolean;
  maxRetries?: number;
  backoffMinutes?: number;
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
  category?: string;
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
  | 'filtered'
  | 'processed_no_value';

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
  collectorType: AccessMethod | string;
  responseTime?: number;
  httpStatus?: number;
  language?: string;
  wordCount?: number;
  guid?: string;
  categories?: string[];
  searchQuery?: string;
  searchRank?: number;
  isSummaryOnly?: boolean;
  account?: string;
  accountId?: string;
  source?: string;
  [key: string]: unknown;
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
  collectorType: AccessMethod | string;
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

// ===== 反馈 =====

export type FeedbackType = 'source' | 'seed' | 'general';
export type FeedbackStatus = 'pending' | 'processing' | 'accepted' | 'rejected';

export interface Feedback {
  id: string;
  feedbackType: FeedbackType;
  content: string;
  submitter?: string;
  contact?: string;
  status: FeedbackStatus;
  relatedIds?: string[];
  adminNotes?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== VNext 情报资产 =====

export type ProfileStatus = 'active' | 'paused' | 'archived';
export type BriefFormat = 'daily_digest' | 'weekly_digest' | 'topic_brief' | 'alert' | 'custom';

export interface RequirementProfile {
  id: string;
  name: string;
  owner: string;
  industry: string;
  purpose: string[];
  focusTopics: string[];
  entities: {
    companies: string[];
    products: string[];
    platforms: string[];
    persons?: string[];
  };
  sourcePolicy: {
    preferredSourceIds: string[];
    excludeSourceIds: string[];
    minReliability?: number | string;
  };
  verificationPolicy: {
    required: boolean;
    minSources: number;
  };
  deliveryPolicy: {
    format: BriefFormat;
    frequency: string;
    channels: string[];
    excludeContent: string[];
  };
  priority: Record<string, Priority | number | 'high' | 'medium' | 'low'>;
  timeWindow: string;
  status: ProfileStatus;
  createdAt: string;
  updatedAt: string;
}

export type ModelTaskType =
  | 'discover_sources'
  | 'discover_trend_hypothesis'
  | 'generate_verification_queries'
  | 'benchmark_estimation'
  | 'fact_check'
  | 'insight_synthesis';
export type ModelTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ModelSpec {
  provider: string;
  model: string;
  weight?: number;
}

export interface ModelQueryTask {
  id: string;
  profileId: string;
  taskType: ModelTaskType;
  promptTemplateId: string;
  promptVariables: Record<string, string>;
  models: ModelSpec[];
  schedule: Record<string, unknown>;
  status: ModelTaskStatus;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export type AnswerStatus = 'success' | 'failed' | 'timeout' | 'rate_limited';
export interface TokenCost {
  input: number;
  output: number;
  total: number;
}

export interface ModelAnswer {
  id: string;
  taskId: string;
  modelProvider: string;
  modelName: string;
  promptVersion: string;
  answerText: string;
  answerJson?: unknown;
  tokenCost: TokenCost;
  latencyMs: number;
  status: AnswerStatus;
  errorMessage?: string;
  createdAt: string;
}

export type ClaimType = 'fact' | 'prediction' | 'opinion' | 'trend' | 'benchmark' | 'source_recommendation';
export type Freshness = 'breaking' | 'recent' | 'dated' | 'stale';
export type VerificationStatus = 'unverified' | 'verified' | 'conflicted' | 'low_confidence' | 'rejected' | 'expired';

export interface ClaimEntity {
  name: string;
  type: string;
  role?: string;
}

export interface ModelClaim {
  id: string;
  answerId: string;
  claimType: ClaimType;
  summary: string;
  entities: ClaimEntity[];
  confidence: number;
  freshness: Freshness;
  verificationRequired: boolean;
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  verifiedEvidenceIds: string[];
  createdAt: string;
}

export type DiscoveryStatus = 'new' | 'candidate' | 'trial' | 'accepted' | 'rejected';

export interface ModelSourceMention {
  id: string;
  answerId: string;
  sourceName: string;
  sourceType: SourceType | 'unknown';
  reason: string;
  recommendedUse: string;
  confidence: number;
  matchedSourceId?: string;
  discoveryStatus: DiscoveryStatus;
  createdAt: string;
}

export type LedgerTargetType = 'structured_event' | 'model_claim' | 'benchmark' | 'intelligence_brief' | 'trend_cluster';
export type LedgerEvidenceType = 'raw_article' | 'raw_image_ocr' | 'raw_rss' | 'model_answer' | 'model_claim' | 'cross_verified' | 'benchmark_source' | 'human_feedback';

export interface EvidenceLedger {
  id: string;
  targetType: LedgerTargetType;
  targetId: string;
  evidenceType: LedgerEvidenceType;
  sourceId?: string;
  rawEvidenceId?: string;
  structuredEventId?: string;
  modelAnswerId?: string;
  modelClaimId?: string;
  url?: string;
  title: string;
  snippet?: string;
  publishedAt?: string;
  collectedAt: string;
  verificationStatus: VerificationStatus;
  confidence: number;
  conflictNotes?: string;
  verifiedBy?: string[];
  verifiedAt?: string;
  createdAt: string;
}

export type BenchmarkSourceType = 'article' | 'report' | 'ranking' | 'database' | 'internal' | 'model' | 'expert';
export interface ValueRange {
  min?: number;
  max?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  unit?: string;
}

export interface BenchmarkParameter {
  id: string;
  industry: string;
  segment: string;
  metricName: string;
  metricValue?: number;
  valueRange?: ValueRange;
  timeWindow: string;
  sourceType: BenchmarkSourceType;
  evidenceIds: string[];
  confidence: number;
  applicableConditions: string[];
  expiredAt?: string;
  createdAt: string;
}

export type BriefType = 'daily' | 'topic' | 'alert' | 'custom';
export type BriefStatus = 'draft' | 'published' | 'archived' | 'superseded';

export interface BriefItem {
  id: string;
  title: string;
  summary: string;
  eventType: EventType;
  priority: Priority;
  evidenceIds: string[];
  sourceCount: number;
  audienceTags: string[];
}

export interface BriefSection {
  id: string;
  title: string;
  order: number;
  items: BriefItem[];
}

export interface IntelligenceBrief {
  id: string;
  profileId: string;
  briefType: BriefType;
  title: string;
  sections: BriefSection[];
  evidenceIds: string[];
  generatedAt: string;
  publishedAt?: string;
  status: BriefStatus;
  feedbackScore?: number;
  feedbackNotes?: string;
  supersededBy?: string;
}

export type LLMProviderType = 'qwen' | 'minimax' | 'deepseek' | 'openai' | 'anthropic' | 'custom';
export type LLMProviderStatus = 'active' | 'inactive' | 'error';

export interface LLMProvider {
  id: string;
  name: string;
  providerType: LLMProviderType;
  apiKey: string;
  baseUrl: string;
  modelBaseUrl?: string;
  models: string[];
  defaultModel?: string;
  enabled: boolean;
  rateLimitRpm: number;
  rateLimitDaily: number;
  priority: number;
  costPer1mInput?: number;
  costPer1mOutput?: number;
  config?: Record<string, unknown>;
  status: LLMProviderStatus;
  lastError?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export type KeywordExpansionSourceTypeInput = SourceType | 'wewe';

