/**
 * 管道 API 路由
 */
import { Router } from 'express';
import { PipelineService } from '../services/pipeline/index.js';

const router = Router();
const pipelineService = new PipelineService();

/**
 * POST /api/v1/pipeline/process
 * 处理单条证据
 */
router.post('/process', async (req, res) => {
  const { evidenceId } = req.body;

  if (!evidenceId) {
    res.status(400).json({
      error: { code: 'MISSING_EVIDENCE_ID', message: '缺少 evidenceId 参数' },
    });
    return;
  }

  try {
    const result = await pipelineService.processEvidence(evidenceId);
    res.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'PIPELINE_FAILED', message } });
  }
});

/**
 * POST /api/v1/pipeline/process-pending
 * 处理所有待处理证据
 */
router.post('/process-pending', async (req, res) => {
  const { limit } = req.body;

  try {
    const results = await pipelineService.processPending(limit || 10);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    res.json({
      data: {
        processed: results.length,
        success: successCount,
        failed: failCount,
        results,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'PIPELINE_FAILED', message } });
  }
});

/**
 * GET /api/v1/pipeline/stats
 * 获取管道统计
 */
router.get('/stats', (req, res) => {
  const stats = pipelineService.getStats();
  res.json({ data: stats });
});

export { router as pipelineRouter };
