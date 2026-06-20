/**
 * 每日统计报告 API 路由
 */
import { Router } from 'express';
import { DailyReportService } from '../services/daily-report/index.js';

const router = Router();
const service = new DailyReportService();

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
    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
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

export { router as dailyReportRouter };
