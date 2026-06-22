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
import type { BriefType, LedgerTargetType } from '../models/types.js';

const router = Router();
const intelligence = new IntelligenceApiService();
const briefGen = new BriefGenerationService();
const benchmarkRepo = new BenchmarkParameterRepository();
const sourceRepo = new IntelSourceRepository();

// ===== 资讯流 =====

/**
 * GET /api/v1/intelligence/feed
 */
router.get('/feed', (req, res) => {
  const { profileId, since, priority, eventType, audienceTag, limit } = req.query;

  const options: any = {};
  if (profileId) options.profileId = profileId;
  if (since) options.since = since;
  if (priority) options.priority = (priority as string).split(',');
  if (eventType) options.eventType = (eventType as string).split(',');
  if (audienceTag) options.audienceTag = audienceTag;
  if (limit) options.limit = parseInt(limit as string);

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
  const data = intelligence.getTopicUpdates(req.params.id, since);
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
