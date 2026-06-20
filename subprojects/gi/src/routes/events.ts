/**
 * 事件 API 路由
 */
import { Router } from 'express';
import { StructuredEventRepository } from '../repositories/structured-event-repository.js';

const router = Router();
const eventRepo = new StructuredEventRepository();

/**
 * GET /api/v1/events
 * 获取事件列表（支持搜索/过滤）
 */
router.get('/', (req, res) => {
  const {
    limit = 50,
    eventType,
    priority,
    audienceTag,
    search,
    minScore,
  } = req.query;

  try {
    let events;

    if (eventType) {
      events = eventRepo.findByEventType(eventType as any, parseInt(limit as string));
    } else {
      events = eventRepo.findTopScored(parseInt(limit as string));
    }

    // 内存端过滤（数据量小时可行，后续可优化为 SQL）
    if (priority) {
      events = events.filter(e => e.priority === priority);
    }
    if (audienceTag) {
      events = events.filter(e => e.audienceTags.includes(audienceTag as string));
    }
    if (minScore) {
      events = events.filter(e => e.impactScore >= parseInt(minScore as string));
    }
    if (search) {
      const keyword = (search as string).toLowerCase();
      events = events.filter(e =>
        e.eventTitle.toLowerCase().includes(keyword) ||
        e.keyFacts.some((f: any) => f.fact.toLowerCase().includes(keyword)) ||
        e.entities.some((ent: any) => ent.name.toLowerCase().includes(keyword))
      );
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
