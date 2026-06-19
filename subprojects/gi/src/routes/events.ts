/**
 * 事件 API 路由
 */
import { Router } from 'express';
import { StructuredEventRepository } from '../repositories/structured-event-repository.js';

const router = Router();
const eventRepo = new StructuredEventRepository();

/**
 * GET /api/v1/events
 * 获取事件列表
 */
router.get('/', (req, res) => {
  const { limit = 50, eventType } = req.query;

  try {
    let events;
    if (eventType) {
      events = eventRepo.findByEventType(eventType as any, parseInt(limit as string));
    } else {
      events = eventRepo.findTopScored(parseInt(limit as string));
    }

    res.json({
      data: events,
      meta: {
        total: events.length,
        limit: parseInt(limit as string),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'FETCH_FAILED', message } });
  }
});

/**
 * GET /api/v1/events/:id
 * 获取单个事件详情
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const event = eventRepo.findById(id);
    if (!event) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: '事件不存在' } });
      return;
    }
    res.json({ data: event });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'FETCH_FAILED', message } });
  }
});

/**
 * GET /api/v1/events/top-scored
 * 获取评分最高的事件
 */
router.get('/top-scored', (req, res) => {
  const { limit = 20 } = req.query;

  try {
    const events = eventRepo.findTopScored(parseInt(limit as string));
    res.json({ data: events });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'FETCH_FAILED', message } });
  }
});

export { router as eventsRouter };
