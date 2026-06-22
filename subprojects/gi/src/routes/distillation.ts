/**
 * 蒸馏任务 API
 *
 * @see docs/WHITE_PAPER.md §7.2
 */
import { Router } from 'express';
import { DistillationService, getCostTracker } from '../services/distillation/index.js';
import type { DistillationTaskType } from '../services/distillation/index.js';
import { ModelAnswerRepository } from '../repositories/model-answer-repository.js';
import { ModelClaimRepository } from '../repositories/model-claim-repository.js';
import { ModelSourceMentionRepository } from '../repositories/model-source-mention-repository.js';
import { ModelQueryTaskRepository } from '../repositories/model-query-task-repository.js';

const router = Router();
const distillationService = new DistillationService();
const answerRepo = new ModelAnswerRepository();
const claimRepo = new ModelClaimRepository();
const mentionRepo = new ModelSourceMentionRepository();
const taskRepo = new ModelQueryTaskRepository();

/**
 * POST /api/v1/distillation/run
 * 执行一次蒸馏任务
 */
router.post('/run', async (req, res) => {
  try {
    const { profileId, taskType, topic, claimToVerify, existingEvidence, model, providerId } = req.body;

    if (!profileId || !taskType) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: '缺少 profileId 或 taskType' },
      });
      return;
    }

    if (!isValidTaskType(taskType)) {
      res.status(400).json({
        error: { code: 'INVALID_TASK_TYPE', message: `无效的任务类型: ${taskType}` },
      });
      return;
    }

    const result = await distillationService.distill({
      profileId,
      taskType,
      topic,
      claimToVerify,
      existingEvidence,
      model,
      providerId,
    });

    res.status(201).json({
      data: {
        answer: {
          id: result.answer.id,
          model: result.answer.modelName,
          provider: result.answer.modelProvider,
          tokenUsage: result.tokenUsage,
          latencyMs: result.latencyMs,
        },
        claimsCount: result.claims.length,
        mentionsCount: result.sourceMentions.length,
        taskType: result.taskType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'DISTILLATION_FAILED', message } });
  }
});

/**
 * POST /api/v1/distillation/batch
 * 批量蒸馏
 */
router.post('/batch', async (req, res) => {
  try {
    const { configs, concurrency } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'configs 必须是非空数组' },
      });
      return;
    }

    // 验证所有任务类型
    for (const config of configs) {
      if (!isValidTaskType(config.taskType)) {
        res.status(400).json({
          error: { code: 'INVALID_TASK_TYPE', message: `无效的任务类型: ${config.taskType}` },
        });
        return;
      }
    }

    const results = await distillationService.distillBatch(configs, { concurrency });

    res.status(201).json({
      data: {
        successCount: results.length,
        totalCount: configs.length,
        totalTokens: results.reduce((sum, r) => sum + r.tokenUsage.totalTokens, 0),
        totalLatencyMs: results.reduce((sum, r) => sum + r.latencyMs, 0),
        results: results.map((r) => ({
          taskType: r.taskType,
          provider: r.providerName,
          tokens: r.tokenUsage.totalTokens,
          claimsCount: r.claims.length,
          mentionsCount: r.sourceMentions.length,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: { code: 'BATCH_FAILED', message } });
  }
});

/**
 * GET /api/v1/distillation/stats
 * 蒸馏统计
 */
router.get('/stats', (_req, res) => {
  const costTracker = getCostTracker();
  const todaySummary = costTracker.getTodaySummary();

  res.json({
    data: {
      today: todaySummary,
      remaining: {
        callsAvailable: 1000 - todaySummary.totalCalls, // 假设每日 1000 次上限
        budgetUsd: costTracker.getRemainingBudgetUsd(),
      },
      isOverBudget: costTracker.isOverBudget(),
    },
  });
});

/**
 * GET /api/v1/distillation/answers
 * 列出蒸馏回答
 */
router.get('/answers', (req, res) => {
  const { taskId, limit } = req.query;
  let data;
  if (taskId) {
    data = answerRepo.findByTask(taskId as string);
  } else {
    data = answerRepo.findAll({ limit: parseInt(limit as string) || 50 });
  }
  res.json({ data, meta: { total: data.length } });
});

/**
 * GET /api/v1/distillation/claims
 * 列出蒸馏观点
 */
router.get('/claims', (req, res) => {
  const { answerId, claimType, verificationStatus, limit } = req.query;
  const l = parseInt(limit as string) || 50;

  let data;
  if (answerId) {
    data = claimRepo.findByAnswer(answerId as string);
  } else if (claimType) {
    data = claimRepo.findByType(claimType as any, l);
  } else if (verificationStatus) {
    data = claimRepo.findByStatus(verificationStatus as any, l);
  } else {
    data = claimRepo.findAll({ limit: l });
  }

  res.json({ data, meta: { total: data.length } });
});

/**
 * GET /api/v1/distillation/mentions
 * 列出信源提及
 */
router.get('/mentions', (req, res) => {
  const { answerId, status, limit } = req.query;
  const l = parseInt(limit as string) || 50;

  let data;
  if (answerId) {
    data = mentionRepo.findByAnswer(answerId as string);
  } else if (status) {
    data = mentionRepo.findByStatus(status as any);
  } else {
    data = mentionRepo.findAll({ limit: l });
  }

  res.json({ data, meta: { total: data.length } });
});

/**
 * GET /api/v1/distillation/tasks
 * 列出蒸馏任务
 */
router.get('/tasks', (req, res) => {
  const { profileId, taskType, limit } = req.query;
  const l = parseInt(limit as string) || 50;

  let data;
  if (profileId) {
    data = taskRepo.findByProfile(profileId as string);
  } else if (taskType) {
    data = taskRepo.findByTaskType(taskType as any);
  } else {
    data = taskRepo.findAll({ limit: l });
  }

  res.json({ data, meta: { total: data.length } });
});

// ===== 辅助函数 =====

function isValidTaskType(taskType: string): taskType is DistillationTaskType {
  return [
    'discover_sources',
    'discover_trend_hypothesis',
    'generate_verification_queries',
    'benchmark_estimation',
    'fact_check',
    'insight_synthesis',
  ].includes(taskType);
}

export { router as distillationRouter };
