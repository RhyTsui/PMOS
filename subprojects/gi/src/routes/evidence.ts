/**
 * 证据 API 路由
 */
import { Router } from 'express';
import { RawEvidenceRepository } from '../repositories/raw-evidence-repository.js';
import type { EvidenceStatus } from '../models/types.js';

const router = Router();
const repo = new RawEvidenceRepository();

/**
 * GET /api/v1/evidence
 * 获取证据列表
 */
router.get('/', (req, res) => {
  const { sourceId, status, limit, offset } = req.query;

  let evidences = repo.findAll({
    limit: limit ? parseInt(limit as string) : 100,
    offset: offset ? parseInt(offset as string) : 0,
    orderBy: 'collected_at',
    order: 'DESC',
  });

  // 过滤
  if (sourceId) {
    evidences = evidences.filter(e => e.sourceId === sourceId);
  }
  if (status) {
    evidences = evidences.filter(e => e.status === status);
  }

  res.json({
    data: evidences,
    meta: {
      total: evidences.length,
      limit: parseInt(limit as string) || 100,
      offset: parseInt(offset as string) || 0,
    },
  });
});

/**
 * GET /api/v1/evidence/pending
 * 获取待处理的证据
 */
router.get('/pending', (req, res) => {
  const { limit } = req.query;
  const evidences = repo.findPending(limit ? parseInt(limit as string) : 50);
  res.json({ data: evidences });
});

/**
 * GET /api/v1/evidence/stats
 * 获取证据统计
 */
router.get('/stats', (req, res) => {
  const byStatus = repo.countByStatus();
  const total = Object.values(byStatus).reduce((sum: number, c: number) => sum + c, 0);
  const today = repo.countToday();

  res.json({
    data: {
      total,
      today,
      byStatus,
    },
  });
});

/**
 * GET /api/v1/evidence/:id
 * 获取证据详情
 */
router.get('/:id', (req, res) => {
  const evidence = repo.findById(req.params.id);
  if (!evidence) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '证据不存在' } });
    return;
  }
  res.json({ data: evidence });
});

/**
 * DELETE /api/v1/evidence/:id
 * 删除证据
 */
router.delete('/:id', (req, res) => {
  const deleted = repo.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '证据不存在' } });
    return;
  }
  res.json({ data: { success: true } });
});

export { router as evidenceRouter };
