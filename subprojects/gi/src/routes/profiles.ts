/**
 * 情报需求画像 API
 *
 * @see docs/design/04-API接口设计.md 第十二节
 */
import { Router } from 'express';
import { RequirementProfileService } from '../services/profile/index.js';
import type { ProfileStatus, BriefFormat } from '../models/types.js';

const router = Router();
const service = new RequirementProfileService();

/**
 * GET /api/v1/profiles
 */
router.get('/', (req, res) => {
  const { owner, status } = req.query;
  let data;
  if (owner) {
    data = service.listByOwner(owner as string, status as ProfileStatus | undefined);
  } else {
    data = service.listActive();
  }
  res.json({ data, meta: { total: data.length } });
});

/**
 * GET /api/v1/profiles/stats
 */
router.get('/stats', (_req, res) => {
  res.json({ data: service.getStats() });
});

/**
 * POST /api/v1/profiles
 */
router.post('/', (req, res) => {
  try {
    const profile = service.createProfile(req.body);
    res.status(201).json({ data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: { code: 'CREATE_FAILED', message } });
  }
});

/**
 * GET /api/v1/profiles/:id
 */
router.get('/:id', (req, res) => {
  const profile = service.getProfile(req.params.id);
  if (!profile) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '画像不存在' } });
    return;
  }
  res.json({ data: profile });
});

/**
 * PUT /api/v1/profiles/:id
 */
router.put('/:id', (req, res) => {
  const updated = service.updateProfile(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '画像不存在' } });
    return;
  }
  res.json({ data: updated });
});

/**
 * PATCH /api/v1/profiles/:id/status
 */
router.patch('/:id/status', (req, res) => {
  const { status } = req.body as { status: ProfileStatus };
  if (!status || !['active', 'paused', 'archived'].includes(status)) {
    res.status(400).json({ error: { code: 'INVALID_STATUS', message: '状态值非法' } });
    return;
  }
  const ok = service.setStatus(req.params.id, status);
  if (!ok) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '画像不存在' } });
    return;
  }
  res.json({ data: service.getProfile(req.params.id) });
});

/**
 * GET /api/v1/profiles/:id/entities
 * 提取画像涉及的所有实体（用于种子生成预览）
 */
router.get('/:id/entities', (req, res) => {
  const entities = service.extractEntities(req.params.id);
  res.json({ data: entities });
});

/**
 * DELETE /api/v1/profiles/:id
 */
router.delete('/:id', (req, res) => {
  const ok = service.deleteProfile(req.params.id);
  if (!ok) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '画像不存在' } });
    return;
  }
  res.json({ data: { success: true } });
});

export { router as profilesRouter };
