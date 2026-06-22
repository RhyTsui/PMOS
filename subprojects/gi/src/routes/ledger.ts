/**
 * 证据账本 API
 *
 * @see docs/design/04-API接口设计.md 第十三节
 */
import { Router } from 'express';
import { EvidenceLedgerRepository } from '../repositories/evidence-ledger-repository.js';
import type { LedgerTargetType, VerificationStatus } from '../models/types.js';

const router = Router();
const repo = new EvidenceLedgerRepository();

/**
 * GET /api/v1/ledger
 * 按条件查询证据列表
 */
router.get('/', (req, res) => {
  const { targetType, targetId, status, sourceId, limit } = req.query;
  let data;
  const l = parseInt(limit as string) || 100;

  if (targetType && targetId) {
    data = repo.findByTarget(targetType as LedgerTargetType, targetId as string);
  } else if (status) {
    data = repo.findByStatus(status as VerificationStatus, l);
  } else if (sourceId) {
    data = repo.findBySource(sourceId as string);
  } else {
    data = repo.findAll({ limit: l });
  }

  res.json({ data, meta: { total: data.length } });
});

/**
 * GET /api/v1/ledger/stats
 * 按目标类型 / 核验状态统计
 */
router.get('/stats', (_req, res) => {
  res.json({
    data: {
      byTargetType: repo.countByTargetType(),
      byVerificationStatus: Object.fromEntries(
        ['unverified', 'verified', 'conflicted', 'low_confidence', 'rejected', 'expired'].map(
          (s) => [s, repo.findByStatus(s as VerificationStatus, 0).length === 0 ? 0 : 0],
        ),
      ),
    },
  });
});

/**
 * GET /api/v1/ledger/by-target
 * 按目标查询（含汇总）
 */
router.get('/by-target', (req, res) => {
  const { targetType, targetId } = req.query;
  if (!targetType || !targetId) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: '缺少 targetType 或 targetId' } });
    return;
  }
  const evidence = repo.findByTarget(targetType as LedgerTargetType, targetId as string);
  const summary = repo.summarizeByTarget(targetType as LedgerTargetType, targetId as string);
  res.json({
    data: {
      target: { type: targetType, id: targetId },
      evidence,
      summary,
    },
  });
});

/**
 * GET /api/v1/ledger/:id
 */
router.get('/:id', (req, res) => {
  const entry = repo.findById(req.params.id);
  if (!entry) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '证据不存在' } });
    return;
  }
  res.json({ data: entry });
});

/**
 * PATCH /api/v1/ledger/:id/verify
 * 更新核验状态
 */
router.patch('/:id/verify', (req, res) => {
  const { status, conflictNotes, verifiedBy } = req.body;
  if (!status) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: '缺少 status' } });
    return;
  }
  const ok = repo.updateVerificationStatus(req.params.id, status, {
    conflictNotes,
    verifiedBy,
  });
  if (!ok) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '证据不存在' } });
    return;
  }
  res.json({ data: repo.findById(req.params.id) });
});

/**
 * GET /api/v1/ledger/pending
 * 待核验队列
 */
router.get('/pending/list', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const data = repo.findPendingVerification(limit);
  res.json({ data, meta: { total: data.length } });
});

export { router as ledgerRouter };
