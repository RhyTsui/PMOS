/**
 * 每日统计报告 API 路由
 */
import { Router, type Response } from 'express';
import { DailyReportService, type DailyDigestOptions } from '../services/daily-report/index.js';

const router = Router();
const service = new DailyReportService();

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function parseDigestOptions(input: Record<string, unknown>): DailyDigestOptions {
  return {
    prompt: typeof input.prompt === 'string' ? input.prompt : undefined,
    useLLM: typeof input.useLLM === 'boolean' ? input.useLLM : input.useLLM === 'true' ? true : input.useLLM === 'false' ? false : undefined,
    audience: typeof input.audience === 'string' ? input.audience : undefined,
    style: typeof input.style === 'string' ? input.style : undefined,
    maxItems: typeof input.maxItems === 'string' ? parseInt(input.maxItems, 10) : typeof input.maxItems === 'number' ? input.maxItems : undefined,
    model: typeof input.model === 'string' ? input.model : undefined,
  };
}

async function sendDigest(res: Response, date?: string, options: DailyDigestOptions = {}): Promise<void> {
  try {
    const digest = await service.generateDigest(date, options);
    res.json({
      success: true,
      data: digest,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'DIGEST_FAILED', message },
    });
  }
}

/**
 * GET /api/v1/daily-report/stats
 * 获取报告统计信息
 */
router.get('/stats', (req, res) => {
  try {
    const stats = service.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'STATS_FAILED', message },
    });
  }
});

/**
 * GET /api/v1/daily-report/digest
 * 生成今日速览。query 支持 prompt/useLLM/audience/style/maxItems/model。
 */
router.get('/digest', async (req, res) => {
  await sendDigest(res, undefined, parseDigestOptions(req.query as Record<string, unknown>));
});

/**
 * POST /api/v1/daily-report/digest
 * 生成今日速览。body 支持 prompt/useLLM/audience/style/maxItems/model。
 */
router.post('/digest', async (req, res) => {
  await sendDigest(res, undefined, parseDigestOptions(req.body || {}));
});

/**
 * GET /api/v1/daily-report/digest/:date
 * 生成指定日期速览。
 */
router.get('/digest/:date', async (req, res) => {
  const date = req.params.date;
  if (!isValidDate(date)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_DATE', message: '日期格式应为 YYYY-MM-DD' },
    });
    return;
  }

  await sendDigest(res, date, parseDigestOptions(req.query as Record<string, unknown>));
});

/**
 * POST /api/v1/daily-report/digest/:date
 * 使用 body 里的提示词生成指定日期速览。
 */
router.post('/digest/:date', async (req, res) => {
  const date = req.params.date;
  if (!isValidDate(date)) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_DATE', message: '日期格式应为 YYYY-MM-DD' },
    });
    return;
  }

  await sendDigest(res, date, parseDigestOptions(req.body || {}));
});

/**
 * GET /api/v1/daily-report
 * 生成今日报告
 */
router.get('/', async (req, res) => {
  try {
    const report = await service.generateReport();
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'GENERATE_FAILED', message },
    });
  }
});

/**
 * GET /api/v1/daily-report/:date
 * 生成指定日期的报告
 */
router.get('/:date', async (req, res) => {
  try {
    const date = req.params.date;
    if (!isValidDate(date)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: '日期格式应为 YYYY-MM-DD' },
      });
      return;
    }

    const report = await service.generateReport(date);
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: { code: 'GENERATE_FAILED', message },
    });
  }
});

export { router as dailyReportRouter };
