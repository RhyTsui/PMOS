/**
 * 情报源 API 路由
 */
import { Router } from 'express';
import { IntelSourceRepository } from '../repositories/intel-source-repository.js';
import type { Priority, SourceType, AccessMethod } from '../models/types.js';

const router = Router();
const repo = new IntelSourceRepository();

/**
 * GET /api/v1/sources
 * 获取情报源列表
 */
router.get('/', (req, res) => {
  const { enabled, priority, sourceType, accessMethod, limit, offset } = req.query;

  let sources = repo.findAll({
    limit: limit ? parseInt(limit as string) : 100,
    offset: offset ? parseInt(offset as string) : 0,
  });

  // 过滤
  if (enabled !== undefined) {
    const isEnabled = enabled === 'true';
    sources = sources.filter(s => s.enabled === isEnabled);
  }
  if (priority) {
    sources = sources.filter(s => s.priority === priority);
  }
  if (sourceType) {
    sources = sources.filter(s => s.sourceType === sourceType);
  }
  if (accessMethod) {
    sources = sources.filter(s => s.accessMethod === accessMethod);
  }

  res.json({
    data: sources,
    meta: {
      total: sources.length,
      limit: parseInt(limit as string) || 100,
      offset: parseInt(offset as string) || 0,
    },
  });
});

/**
 * GET /api/v1/sources/enabled
 * 获取已启用的情报源
 */
router.get('/enabled', (req, res) => {
  const { priority } = req.query;
  const sources = repo.findEnabled(priority as Priority | undefined);
  res.json({ data: sources });
});

/**
 * GET /api/v1/sources/stats
 * 获取情报源统计
 */
router.get('/stats', (req, res) => {
  const byPriority = repo.countByPriority();
  const total = Object.values(byPriority).reduce((sum: number, c: number) => sum + c, 0);

  res.json({
    data: {
      total,
      byPriority,
    },
  });
});

/**
 * GET /api/v1/sources/:id
 * 获取情报源详情
 */
router.get('/:id', (req, res) => {
  const source = repo.findById(req.params.id);
  if (!source) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '情报源不存在' } });
    return;
  }
  res.json({ data: source });
});

/**
 * POST /api/v1/sources
 * 创建情报源
 */
router.post('/', (req, res) => {
  try {
    const source = repo.create(req.body);
    res.status(201).json({ data: source });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: { code: 'CREATE_FAILED', message } });
  }
});

/**
 * PUT /api/v1/sources/:id
 * 更新情报源
 */
router.put('/:id', (req, res) => {
  const updated = repo.update(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '情报源不存在' } });
    return;
  }
  res.json({ data: updated });
});

/**
 * DELETE /api/v1/sources/:id
 * 删除情报源
 */
router.delete('/:id', (req, res) => {
  const deleted = repo.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '情报源不存在' } });
    return;
  }
  res.json({ data: { success: true } });
});

export { router as sourcesRouter };
