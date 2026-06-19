/**
 * 抽取 API 路由
 */
import { Router } from 'express';
import { ExtractionService } from '../services/extraction/index.js';
import { RawEvidenceRepository } from '../repositories/raw-evidence-repository.js';

const router = Router();
const extractionService = new ExtractionService();
const evidenceRepo = new RawEvidenceRepository();

/**
 * POST /api/v1/extraction/extract
 * 从单条证据抽取事件
 */
router.post('/extract', async (req, res) => {
  const { evidenceId } = req.body;

  if (!evidenceId) {
    res.status(400).json({
      error: { code: 'MISSING_EVIDENCE_ID', message: '缺少 evidenceId 参数' },
    });
    return;
  }

  const evidence = evidenceRepo.findById(evidenceId);
  if (!evidence) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: '证据不存在' },
    });
    return;
  }

  try {
    const event = await extractionService.extractFromEvidence(evidence);
    if (!event) {
      res.status(500).json({
        error: { code: 'EXTRACTION_FAILED', message: '抽取失败' },
      });
      return;
    }
    res.json({ data: event });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'EXTRACTION_FAILED', message } });
  }
});

/**
 * POST /api/v1/extraction/extract-batch
 * 批量抽取
 */
router.post('/extract-batch', async (req, res) => {
  const { evidenceIds } = req.body;

  if (!evidenceIds || !Array.isArray(evidenceIds)) {
    res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'evidenceIds 必须是数组' },
    });
    return;
  }

  try {
    const events = await extractionService.extractBatch(evidenceIds);
    res.json({
      data: {
        extracted: events.length,
        events,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'EXTRACTION_FAILED', message } });
  }
});

/**
 * POST /api/v1/extraction/extract-pending
 * 抽取所有待处理的证据
 */
router.post('/extract-pending', async (req, res) => {
  const { limit } = req.body;

  try {
    // 获取待处理的证据
    const pendingEvidences = evidenceRepo.findPending(limit || 10);

    if (pendingEvidences.length === 0) {
      res.json({
        data: {
          extracted: 0,
          events: [],
          message: '没有待处理的证据',
        },
      });
      return;
    }

    const evidenceIds = pendingEvidences.map(e => e.id);
    const events = await extractionService.extractBatch(evidenceIds);

    res.json({
      data: {
        extracted: events.length,
        total: pendingEvidences.length,
        events,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'EXTRACTION_FAILED', message } });
  }
});

export { router as extractionRouter };
