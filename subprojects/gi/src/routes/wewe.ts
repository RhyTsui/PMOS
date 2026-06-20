/**
 * WeWe RSS API 路由
 */
import { Router } from 'express';
import { WeWeService } from '../services/wewe/index.js';

const router = Router();
const service = new WeWeService();

/**
 * GET /api/v1/wewe/accounts
 * 获取预定义的游戏行业公众号列表
 */
router.get('/accounts', (req, res) => {
  try {
    const accounts = service.getGameAccounts();
    res.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ACCOUNTS_FAILED', message },
    });
  }
});

/**
 * POST /api/v1/wewe/discover
 * 发现并注册公众号 RSS 源
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
 * GET /api/v1/wewe/stats
 * 获取 WeWe RSS 统计信息
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
 * GET /api/v1/wewe/health
 * 检查 WeWe RSS 实例健康状态
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
 * GET /api/v1/wewe/feed/:accountId
 * 获取指定公众号的 RSS 内容
 */
router.get('/feed/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const feed = await service.fetchAccount(accountId);

    if (!feed) {
      res.status(404).json({
        success: false,
        error: { code: 'FEED_NOT_FOUND', message: '公众号 RSS 不存在或无法访问' },
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

export { router as weweRouter };
