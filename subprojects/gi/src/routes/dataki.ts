/**
 * Dataki 知识库同步路由
 */
import { Router } from 'express';
import { DatakiDirectSyncService } from '../services/dataki/dataki-direct-sync.js';

const router = Router();
const syncService = new DatakiDirectSyncService();

/**
 * POST /api/v1/dataki/sync
 * 手动触发同步到 Dataki
 */
router.post('/sync', async (req, res) => {
  const { limit = 50 } = req.body;

  try {
    if (!syncService.isConfigured()) {
      res.status(500).json({
        error: {
          code: 'DATAKI_NOT_CONFIGURED',
          message: 'Dataki 未配置，请设置 DATAKI_BASE_URL 和 DATAKI_API_KEY',
        },
      });
      return;
    }

    const result = await syncService.syncEvents(limit);
    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'SYNC_FAILED', message } });
  }
});

/**
 * GET /api/v1/dataki/status
 * 检查 Dataki 连接状态
 */
router.get('/status', async (req, res) => {
  try {
    const status = await syncService.checkConnection();
    res.json({ data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'STATUS_FAILED', message } });
  }
});

/**
 * GET /api/v1/dataki/knowledge-base
 * 获取知识库信息
 */
router.get('/knowledge-base', async (req, res) => {
  try {
    const info = await syncService.getKnowledgeBaseInfo();
    res.json({ data: info });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'INFO_FAILED', message } });
  }
});

export { router as datakiRouter };
