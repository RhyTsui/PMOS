/**
 * 趋势检测 API 路由
 */
import { Router } from 'express';
import { TrendDetector } from '../services/trend/index.js';

const router = Router();
const trendDetector = new TrendDetector();

/**
 * GET /api/v1/trends
 * 获取趋势列表
 */
router.get('/', async (req, res) => {
  try {
    const { windowHours = 24, direction } = req.query;

    // 运行趋势检测
    const clusters = await trendDetector.detect();

    // 过滤趋势方向
    let filteredClusters = clusters;
    if (direction && typeof direction === 'string') {
      filteredClusters = clusters.filter(c => c.trendDirection === direction);
    }

    res.json({
      success: true,
      data: filteredClusters,
      meta: {
        total: filteredClusters.length,
        windowHours: parseInt(windowHours as string),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_TRENDS_FAILED', message },
    });
  }
});

/**
 * GET /api/v1/trends/rising
 * 获取上升趋势
 */
router.get('/rising', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const risingTrends = trendDetector.getRisingTrends(parseInt(limit as string));

    res.json({
      success: true,
      data: risingTrends,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_RISING_TRENDS_FAILED', message },
    });
  }
});

/**
 * GET /api/v1/trends/stats
 * 获取趋势统计
 */
router.get('/stats', (req, res) => {
  try {
    const stats = trendDetector.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_TREND_STATS_FAILED', message },
    });
  }
});

/**
 * POST /api/v1/trends/detect
 * 手动触发趋势检测
 */
router.post('/detect', async (req, res) => {
  try {
    const clusters = await trendDetector.detect();

    res.json({
      success: true,
      data: {
        detected: clusters.length,
        clusters,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'DETECT_TRENDS_FAILED', message },
    });
  }
});

export { router as trendsRouter };
