/**
 * 采集 API 路由
 */
import { Router } from 'express';
import { CollectionService } from '../services/collection/index.js';
import type { Priority, AccessMethod } from '../models/types.js';

const router = Router();
const service = new CollectionService();

/**
 * POST /api/v1/collection/collect
 * 采集指定源
 */
router.post('/collect', async (req, res) => {
  const { sourceId, maxSeeds } = req.body;

  if (!sourceId) {
    res.status(400).json({
      error: { code: 'MISSING_SOURCE_ID', message: '缺少 sourceId 参数' },
    });
    return;
  }

  try {
    const result = await service.collectSource(sourceId, maxSeeds || 10);
    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'COLLECTION_FAILED', message } });
  }
});

/**
 * POST /api/v1/collection/collect-all
 * 采集所有启用的源
 */
router.post('/collect-all', async (req, res) => {
  const { priority } = req.body;

  try {
    const result = await service.collectAll(priority as Priority | undefined);
    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'COLLECTION_FAILED', message } });
  }
});

/**
 * POST /api/v1/collection/collect-by-method
 * 按采集方式采集
 */
router.post('/collect-by-method', async (req, res) => {
  const { method } = req.body;

  if (!method) {
    res.status(400).json({
      error: { code: 'MISSING_METHOD', message: '缺少 method 参数' },
    });
    return;
  }

  try {
    const result = await service.collectByMethod(method as AccessMethod);
    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'COLLECTION_FAILED', message } });
  }
});

/**
 * GET /api/v1/collection/stats
 * 获取采集统计
 */
router.get('/stats', (req, res) => {
  const stats = service.getStats();
  res.json({ data: stats });
});

export { router as collectionRouter };
