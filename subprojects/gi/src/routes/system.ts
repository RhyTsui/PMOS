/**
 * 系统 API 路由
 */
import { Router } from 'express';
import { getScheduler } from '../lib/scheduler.js';

const router = Router();

/**
 * GET /api/v1/system/status
 * 获取系统状态
 */
router.get('/status', (req, res) => {
  const scheduler = getScheduler();
  const status = scheduler.getStatus();

  res.json({
    data: {
      uptime: process.uptime(),
      scheduler: status,
      memory: process.memoryUsage(),
    },
  });
});

/**
 * POST /api/v1/system/scheduler/start
 * 启动调度器
 */
router.post('/scheduler/start', (req, res) => {
  const scheduler = getScheduler();
  scheduler.start();
  res.json({ data: { success: true, message: '调度器已启动' } });
});

/**
 * POST /api/v1/system/scheduler/stop
 * 停止调度器
 */
router.post('/scheduler/stop', (req, res) => {
  const scheduler = getScheduler();
  scheduler.stop();
  res.json({ data: { success: true, message: '调度器已停止' } });
});

/**
 * GET /api/v1/system/scheduler/status
 * 获取调度器状态
 */
router.get('/scheduler/status', (req, res) => {
  const scheduler = getScheduler();
  const status = scheduler.getStatus();
  res.json({ data: status });
});

/**
 * POST /api/v1/system/scheduler/trigger/:jobName
 * 手动触发任务
 */
router.post('/scheduler/trigger/:jobName', async (req, res) => {
  const { jobName } = req.params;
  const scheduler = getScheduler();

  try {
    await scheduler.triggerJob(jobName);
    res.json({ data: { success: true, message: `任务 ${jobName} 已触发` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: { code: 'TRIGGER_FAILED', message } });
  }
});

export { router as systemRouter };
