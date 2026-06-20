/**
 * 反馈 API 路由
 */
import { Router } from 'express';
import { FeedbackRepository } from '../repositories/feedback-repository.js';
import type { FeedbackType, FeedbackStatus } from '../models/types.js';

const router = Router();
const repo = new FeedbackRepository();

/**
 * GET /api/v1/feedback
 * 获取反馈列表
 */
router.get('/', (req, res) => {
  const { feedbackType, status, limit = 50, offset = 0 } = req.query;

  let feedbacks;
  if (status) {
    feedbacks = repo.findByStatus(status as FeedbackStatus, parseInt(limit as string));
  } else if (feedbackType) {
    feedbacks = repo.findByType(feedbackType as FeedbackType, parseInt(limit as string));
  } else {
    feedbacks = repo.findAll({
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  }

  res.json({
    data: feedbacks,
    meta: {
      total: feedbacks.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    },
  });
});

/**
 * GET /api/v1/feedback/stats
 * 获取反馈统计
 */
router.get('/stats', (req, res) => {
  const byStatus = repo.countByStatus();
  const total = Object.values(byStatus).reduce((sum: number, c: number) => sum + c, 0);

  res.json({
    data: {
      total,
      byStatus,
    },
  });
});

/**
 * POST /api/v1/feedback
 * 提交反馈
 */
router.post('/', (req, res) => {
  try {
    const { feedbackType, content, submitter, contact, relatedIds } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: '反馈内容不能为空' } });
      return;
    }

    const feedback = repo.create({
      feedbackType: feedbackType || 'general',
      content: content.trim(),
      submitter: submitter || undefined,
      contact: contact || undefined,
      status: 'pending',
      relatedIds: relatedIds || [],
    });

    res.status(201).json({ data: feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: { code: 'CREATE_FAILED', message } });
  }
});

/**
 * GET /api/v1/feedback/:id
 * 获取反馈详情
 */
router.get('/:id', (req, res) => {
  const feedback = repo.findById(req.params.id);
  if (!feedback) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '反馈不存在' } });
    return;
  }
  res.json({ data: feedback });
});

/**
 * PUT /api/v1/feedback/:id/status
 * 更新反馈状态
 */
router.put('/:id/status', (req, res) => {
  const { status, adminNotes } = req.body;
  const feedback = repo.findById(req.params.id);

  if (!feedback) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '反馈不存在' } });
    return;
  }

  repo.updateStatus(req.params.id, status, adminNotes);
  const updated = repo.findById(req.params.id);
  res.json({ data: updated });
});

/**
 * DELETE /api/v1/feedback/:id
 * 删除反馈
 */
router.delete('/:id', (req, res) => {
  const deleted = repo.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '反馈不存在' } });
    return;
  }
  res.json({ data: { success: true } });
});

export { router as feedbackRouter };
