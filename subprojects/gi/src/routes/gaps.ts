/**
 * 漏采检测 API 路由
 */
import { Router } from 'express';
import { GapDetectionService } from '../services/gap-detection/index.js';

export const gapDetectionRouter = Router();

const gapService = new GapDetectionService();

/**
 * GET /api/v1/gaps
 * 执行漏采检测并返回报告
 */
gapDetectionRouter.get('/', (req, res) => {
  const report = gapService.detect();
  res.json(report);
});

/**
 * GET /api/v1/gaps/stats
 * 获取漏采统计摘要
 */
gapDetectionRouter.get('/stats', (req, res) => {
  const stats = gapService.getStats();
  res.json(stats);
});
