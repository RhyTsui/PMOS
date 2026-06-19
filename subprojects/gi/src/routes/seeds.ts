/**
 * 种子 API 路由
 */
import { Router } from 'express';
import { SeedService } from '../services/seed/index.js';
import type { SeedType, SeedStatus } from '../models/types.js';

const router = Router();
const service = new SeedService();

/**
 * GET /api/v1/seeds
 * 获取种子列表
 */
router.get('/', (req, res) => {
  const { seedType, status, limit, offset } = req.query;

  const seeds = service.listSeeds({
    seedType: seedType as SeedType | undefined,
    status: status as SeedStatus | undefined,
    limit: limit ? parseInt(limit as string) : 100,
    offset: offset ? parseInt(offset as string) : 0,
  });

  res.json({
    data: seeds,
    meta: {
      total: seeds.length,
      limit: parseInt(limit as string) || 100,
      offset: parseInt(offset as string) || 0,
    },
  });
});

/**
 * GET /api/v1/seeds/stats
 * 获取种子统计
 */
router.get('/stats', (req, res) => {
  const stats = service.getStats();
  res.json({ data: stats });
});

/**
 * GET /api/v1/seeds/active
 * 获取活跃种子
 */
router.get('/active', (req, res) => {
  const { limit } = req.query;
  const seeds = service.getActiveSeeds(limit ? parseInt(limit as string) : 100);
  res.json({ data: seeds });
});

/**
 * GET /api/v1/seeds/:id
 * 获取种子详情
 */
router.get('/:id', (req, res) => {
  const seed = service.getSeed(req.params.id);
  if (!seed) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '种子不存在' } });
    return;
  }
  res.json({ data: seed });
});

/**
 * POST /api/v1/seeds
 * 创建种子
 */
router.post('/', (req, res) => {
  try {
    const seed = service.createSeed(req.body);
    res.status(201).json({ data: seed });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: { code: 'CREATE_FAILED', message } });
  }
});

/**
 * PUT /api/v1/seeds/:id
 * 更新种子
 */
router.put('/:id', (req, res) => {
  const updated = service.updateSeed(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '种子不存在' } });
    return;
  }
  res.json({ data: updated });
});

/**
 * DELETE /api/v1/seeds/:id
 * 删除种子
 */
router.delete('/:id', (req, res) => {
  const deleted = service.deleteSeed(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '种子不存在' } });
    return;
  }
  res.json({ data: { success: true } });
});

/**
 * POST /api/v1/seeds/evolve
 * 运行种子进化
 */
router.post('/evolve', async (req, res) => {
  try {
    const report = await service.runEvolution();
    res.json({ data: report });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'EVOLVE_FAILED', message } });
  }
});

export { router as seedsRouter };
