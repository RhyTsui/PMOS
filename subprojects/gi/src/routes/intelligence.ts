/**
 * 情报服务 API（Intelligence Service Layer）
 *
 * ★ 这是白皮书 §7.5 定义的核心对外服务层。
 * Chat / 看板 / 日报 / 公众号共同依赖这些端点获取数据。
 *
 * @see docs/WHITE_PAPER.md §7.5 / §15
 * @see docs/design/04-API接口设计.md 第十五节
 */
import { Router } from 'express';
import { IntelligenceApiService } from '../services/intelligence/index.js';
import { BriefGenerationService } from '../services/brief/index.js';
import { BenchmarkParameterRepository } from '../repositories/benchmark-parameter-repository.js';
import { IntelSourceRepository } from '../repositories/intel-source-repository.js';
import { KeywordExpansionService } from '../services/intelligence/keyword-expansion-service.js';
import type { BriefType, LedgerTargetType, SourceType, SeedType } from '../models/types.js';

const router = Router();
const intelligence = new IntelligenceApiService();
const briefGen = new BriefGenerationService();
const benchmarkRepo = new BenchmarkParameterRepository();
const sourceRepo = new IntelSourceRepository();
const keywordExpansionService = new KeywordExpansionService();

const validateSourceType = (value: string): SourceType | undefined => {
  if (value === 'wechat_mp' || value === 'wewe') return 'wechat_mp';
  return (['media', 'community', 'official', 'social', 'wechat_mp', 'forum', 'api'] as SourceType[]).includes(value as SourceType)
    ? (value as SourceType)
    : undefined;
};

const splitQueryList = (value: unknown): string[] => {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
};

const normalizeScope = (value: unknown): 'seed' | 'source' | 'all' => {
  if (value === 'seed' || value === 'source' || value === 'all') return value;
  return 'all';
};

const normalizeSeedType = (value: unknown): SeedType | undefined => {
  if (value === 'entity' || value === 'event' || value === 'topic' || value === 'source') {
    return value;
  }
  return undefined;
};

// ===== 资讯流 =====

/**
 * GET /api/v1/intelligence/feed
 */
router.get('/feed', (req, res) => {
  const {
    profileId,
    since,
    priority,
    eventType,
    audienceTag,
    limit,
    sourceType,
    sourceId,
    keyword,
  } = req.query;

  const limitValue = limit ? parseInt(limit as string, 10) : undefined;
  if (limit && (!Number.isFinite(limitValue!) || limitValue! <= 0)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'limit 需为正整数' } });
    return;
  }

  const sourceTypeList = splitQueryList(sourceType)
    .map((item) => validateSourceType(item.toLowerCase()))
    .filter((item): item is SourceType => Boolean(item));
  const sourceIds = splitQueryList(sourceId);

  const options: any = {};
  if (profileId) options.profileId = profileId as string;
  if (since) options.since = since as string;
  if (audienceTag) options.audienceTag = audienceTag as string;
  if (limitValue) options.limit = limitValue;

  const priorityList = splitQueryList(priority);
  const eventTypeList = splitQueryList(eventType);
  if (priorityList.length > 0) options.priority = priorityList;
  if (eventTypeList.length > 0) options.eventType = eventTypeList;
  if (sourceTypeList.length > 0) options.sourceType = sourceTypeList;
  if (sourceIds.length > 0) options.sourceIds = sourceIds;
  if (keyword) options.keyword = (keyword as string).trim();

  res.json({ data: intelligence.getFeed(options) });
});

/**
 * GET /api/v1/intelligence/feed/highlights
 * 重点事件（P0/P1 优先）
 */
router.get('/feed/highlights', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const data = intelligence.getFeed({ priority: ['P0', 'P1'], limit });
  res.json({ data });
});

/**
 * POST /api/v1/intelligence/expansion/keyword
 * 关键词实时拓展（可触发种子和/或信源创建）
 */
router.post('/expansion/keyword', (req, res) => {
  const {
    keyword,
    scope,
    seedType,
    sourceType,
    createSeed,
    createSource,
    dryRun,
  } = req.body || {};

  try {
    const resolvedScope = normalizeScope(scope);
    const expanded = keywordExpansionService.expandByKeyword({
      keyword: String(keyword || ''),
      scope: resolvedScope,
      seedType: normalizeSeedType(seedType),
      sourceType: validateSourceType(String(sourceType || '').toLowerCase()) || 'media',
      createSeed: createSeed !== false,
      createSource: createSource !== false,
      dryRun: dryRun === true,
    });

    res.json({ data: expanded });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errCode = message.includes('keyword 不能为空') ? 'INVALID_INPUT' : 'CREATE_FAILED';
    const status = message.includes('keyword 不能为空') ? 400 : 500;
    res.status(status).json({ error: { code: errCode, message } });
  }
});

// ===== 简报 / 日报 =====

/**
 * GET /api/v1/intelligence/briefs
 */
router.get('/briefs', (req, res) => {
  const { profileId, type, limit } = req.query;
  const data = intelligence.listBriefs(
    profileId as string | undefined,
    type as BriefType | undefined,
    parseInt(limit as string) || 20,
  );
  res.json({ data, meta: { total: data.length } });
});

/**
 * GET /api/v1/intelligence/briefs/daily
 * 当日日报
 */
router.get('/briefs/daily', (req, res) => {
  const { profileId, date } = req.query;
  if (!profileId) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: '缺少 profileId' } });
    return;
  }
  const brief = intelligence.getDailyBrief(profileId as string, date as string | undefined);
  if (!brief) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '今日日报尚未生成' } });
    return;
  }
  res.json({ data: brief });
});

/**
 * GET /api/v1/intelligence/briefs/:id
 */
router.get('/briefs/:id', (req, res) => {
  const brief = intelligence.listBriefs().find((b) => b.id === req.params.id);
  if (!brief) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '简报不存在' } });
    return;
  }
  res.json({ data: brief });
});

/**
 * POST /api/v1/intelligence/briefs/generate
 * 触发生成日报 / 专题简报
 */
router.post('/briefs/generate', (req, res) => {
  try {
    const { profileId, briefType, title, windowHours, autoPublish, date } = req.body;
    if (!profileId || !briefType) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: '缺少 profileId 或 briefType' } });
      return;
    }
    const result = briefGen.generate({
      profileId,
      briefType: briefType as BriefType,
      title,
      windowHours,
      autoPublish,
      date,
    });
    res.status(201).json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: { code: 'GENERATE_FAILED', message } });
  }
});

// ===== 专题动态 =====

/**
 * GET /api/v1/intelligence/topics
 */
router.get('/topics', (_req, res) => {
  // TODO: 从 profile.focusTopics 聚合
  res.json({ data: [] });
});

/**
 * GET /api/v1/intelligence/topics/:id/updates
 */
router.get('/topics/:id/updates', (req, res) => {
  const since = (req.query.since as string) || '7d';
  const limit = parseInt(req.query.limit as string, 10);
  const sourceTypeList = splitQueryList(req.query.sourceType)
    .map((item) => validateSourceType(item.toLowerCase()))
    .filter((item): item is SourceType => Boolean(item));
  const sourceIds = splitQueryList(req.query.sourceId);

  const options: any = {};
  if (Number.isFinite(limit) && limit > 0) options.limit = limit;
  if (sourceTypeList.length > 0) options.sourceType = sourceTypeList;
  if (sourceIds.length > 0) options.sourceIds = sourceIds;
  if (req.query.keyword) options.keyword = (req.query.keyword as string).trim();

  const data = intelligence.getTopicUpdates(req.params.id, since, options);
  res.json({ data });
});

// ===== 趋势信号 =====

/**
 * GET /api/v1/intelligence/signals/trending
 */
router.get('/signals/trending', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  res.json({ data: intelligence.getTrendingSignals(limit) });
});

/**
 * GET /api/v1/intelligence/signals/anomalies
 * TODO: 异常信号（待实现）
 */
router.get('/signals/anomalies', (_req, res) => {
  res.json({ data: { signals: [] } });
});

/**
 * GET /api/v1/intelligence/signals/saturated
 * TODO: 饱和信号（待实现）
 */
router.get('/signals/saturated', (_req, res) => {
  res.json({ data: { signals: [] } });
});

// ===== 行业基准参数 =====

/**
 * GET /api/v1/intelligence/benchmarks
 */
router.get('/benchmarks', (req, res) => {
  const { segment, metric, activeOnly } = req.query;
  if (!segment) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: '缺少 segment' } });
    return;
  }
  const data = intelligence.getBenchmarks({
    segment: segment as string,
    metric: metric as string | undefined,
    activeOnly: activeOnly === 'true',
  });
  res.json({ data });
});

/**
 * GET /api/v1/intelligence/benchmarks/segments
 * 列出所有细分领域
 */
router.get('/benchmarks/segments', (_req, res) => {
  res.json({ data: benchmarkRepo.listSegments() });
});

// ===== 模型观点 =====

/**
 * GET /api/v1/intelligence/model-opinions
 */
router.get('/model-opinions', (req, res) => {
  const { topic, claimType, verificationStatus, limit } = req.query;
  const data = intelligence.getModelOpinions({
    topic: topic as string | undefined,
    claimType: claimType as string | undefined,
    verificationStatus: verificationStatus as any,
    limit: limit ? parseInt(limit as string) : undefined,
  });
  res.json({ data });
});

// ===== 证据摘要 =====

/**
 * GET /api/v1/intelligence/evidence/:targetType/:targetId
 * 或者 GET /api/v1/intelligence/evidence/:id （兼容旧设计）
 */
router.get('/evidence/:targetType/:targetId', (req, res) => {
  const { targetType, targetId } = req.params;
  const data = intelligence.getEvidenceSummary(
    targetType as LedgerTargetType,
    targetId,
  );
  res.json({ data });
});

// ===== 信源（代理到现有 sources 路由或增强） =====

/**
 * GET /api/v1/intelligence/sources
 */
router.get('/sources', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const data = sourceRepo.findAll({ limit });
  res.json({ data, meta: { total: data.length } });
});

export { router as intelligenceRouter };
