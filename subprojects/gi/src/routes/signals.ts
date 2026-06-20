/**
 * 信号 API 路由
 */
import { Router } from 'express';
import { SignalRepository } from '../repositories/signal-repository.js';

const router = Router();
const signalRepo = new SignalRepository();

/**
 * GET /api/v1/signals
 * 获取信号列表（支持过滤）
 */
router.get('/', (req, res) => {
  const { limit = 50, priority, status, audienceTag } = req.query;

  try {
    let signals;

    if (status) {
      signals = signalRepo.findByStatus(status as any, parseInt(limit as string));
    } else if (priority) {
      signals = signalRepo.findByPriority(priority as any, parseInt(limit as string));
    } else {
      signals = signalRepo.findNew(parseInt(limit as string));
    }

    if (audienceTag) {
      signals = signals.filter(s => s.audienceTags.includes(audienceTag as string));
    }

    res.json({
      data: signals,
      meta: { total: signals.length, limit: parseInt(limit as string) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'FETCH_FAILED', message } });
  }
});

/**
 * GET /api/v1/signals/stats
 * 获取信号统计
 */
router.get('/stats', (req, res) => {
  try {
    const byStatus = signalRepo.countByStatus();
    res.json({ data: byStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'FETCH_FAILED', message } });
  }
});

export { router as signalsRouter };
