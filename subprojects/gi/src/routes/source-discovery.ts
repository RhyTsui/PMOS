/**
 * 源发现 API 路由
 */
import { Router } from 'express';
import { SourceDiscoveryService } from '../services/source-discovery/index.js';

const router = Router();
const service = new SourceDiscoveryService();

/**
 * POST /api/v1/source-discovery/discover
 * 执行源发现
 */
router.post('/discover', async (req, res) => {
  try {
    const report = await service.discover();
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'DISCOVERY_FAILED', message },
    });
  }
});

/**
 * GET /api/v1/source-discovery/stats
 * 获取源发现统计
 */
router.get('/stats', (req, res) => {
  try {
    const stats = service.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'STATS_FAILED', message },
    });
  }
});

/**
 * POST /api/v1/source-discovery/add
 * 将发现的源添加为情报源
 */
router.post('/add', (req, res) => {
  try {
    const { discovery } = req.body;
    if (!discovery) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: '缺少 discovery 参数' },
      });
      return;
    }

    const source = service.addDiscoveredSource(discovery);
    if (!source) {
      res.status(400).json({
        success: false,
        error: { code: 'ADD_FAILED', message: '添加源失败' },
      });
      return;
    }

    res.json({
      success: true,
      data: source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'ADD_FAILED', message },
    });
  }
});

export { router as sourceDiscoveryRouter };
