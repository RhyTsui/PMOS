/**
 * RSSHub API 路由
 */
import { Router } from 'express';
import { RSSHubService } from '../services/rsshub/index.js';

const router = Router();
const service = new RSSHubService();

/**
 * GET /api/v1/rsshub/routes
 * 获取预定义的游戏行业 RSSHub 路由
 */
router.get('/routes', (req, res) => {
  try {
    const routes = service.getGameIndustryRoutes();
    res.json({
      success: true,
      data: routes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ROUTES_FAILED', message },
    });
  }
});

/**
 * POST /api/v1/rsshub/discover
 * 发现并注册 RSS 源
 */
router.post('/discover', async (req, res) => {
  try {
    const result = await service.discoverAndRegister();
    res.json({
      success: true,
      data: result,
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
 * GET /api/v1/rsshub/stats
 * 获取 RSSHub 统计信息
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
 * GET /api/v1/rsshub/health
 * 检查 RSSHub 实例健康状态
 */
router.get('/health', async (req, res) => {
  try {
    const health = await service.healthCheck();
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'HEALTH_CHECK_FAILED', message },
    });
  }
});

/**
 * GET /api/v1/rsshub/feed/:path(*)
 * 获取指定路由的 RSS 内容
 */
router.get('/feed/*', async (req, res) => {
  try {
    const routePath = '/' + req.params[0];
    const feed = await service.fetchRoute(routePath);

    if (!feed) {
      res.status(404).json({
        success: false,
        error: { code: 'FEED_NOT_FOUND', message: 'RSS 源不存在或无法访问' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        title: feed.title,
        description: feed.description,
        link: feed.link,
        items: feed.items?.slice(0, 20).map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          content: item.contentSnippet || item.content,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FEED_FAILED', message },
    });
  }
});

export { router as rsshubRouter };
