/**
 * 系统 API 路由
 */
import { Router } from 'express';
import { getScheduler, validateSchedulerConfig, type SchedulerConfig } from '../lib/scheduler.js';

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
 * GET /api/v1/system/settings/scheduler
 * 获取持久化调度器配置
 */
router.get('/settings/scheduler', (_req, res) => {
  const scheduler = getScheduler();
  res.json({
    data: {
      config: scheduler.getConfig(),
      status: scheduler.getStatus(),
    },
  });
});

/**
 * PUT /api/v1/system/settings/scheduler
 * 更新持久化调度器配置并热重载
 */
router.put('/settings/scheduler', (req, res) => {
  const scheduler = getScheduler();

  try {
    const updates = parseSchedulerConfigUpdates(req.body);
    const merged = { ...scheduler.getConfig(), ...updates };
    validateSchedulerConfig(merged);
    const config = scheduler.updateConfig(updates);

    res.json({
      data: {
        config,
        status: scheduler.getStatus(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: { code: 'INVALID_SCHEDULER_CONFIG', message } });
  }
});

/**
 * POST /api/v1/system/scheduler/start
 * 启动调度器
 */
router.post('/scheduler/start', (req, res) => {
  const scheduler = getScheduler();
  scheduler.start();
  res.json({ data: { success: true, message: '调度器已启动', status: scheduler.getStatus() } });
});

/**
 * POST /api/v1/system/scheduler/stop
 * 停止调度器
 */
router.post('/scheduler/stop', (req, res) => {
  const scheduler = getScheduler();
  scheduler.stop();
  res.json({ data: { success: true, message: '调度器已停止', status: scheduler.getStatus() } });
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

function parseSchedulerConfigUpdates(body: unknown): Partial<SchedulerConfig> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('请求体必须是对象');
  }

  const input = body as Record<string, unknown>;
  const updates: Partial<SchedulerConfig> = {};
  const booleanFields = ['enabled', 'enableAutoCollection'] as const;
  const cronFields = [
    'healthCheckCron',
    'evolutionCron',
    'cleanupCron',
    'gapDetectionCron',
    'sourceDiscoveryCron',
    'dailyReportCron',
    'defaultCron',
  ] as const;

  for (const field of booleanFields) {
    if (input[field] !== undefined) {
      if (typeof input[field] !== 'boolean') {
        throw new Error(`${field} 必须是 boolean`);
      }
      updates[field] = input[field];
    }
  }

  for (const field of cronFields) {
    if (input[field] !== undefined) {
      if (typeof input[field] !== 'string') {
        throw new Error(`${field} 必须是 string`);
      }
      updates[field] = input[field];
    }
  }

  return updates;
}

export { router as systemRouter };
