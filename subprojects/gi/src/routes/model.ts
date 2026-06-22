/**
 * 模型情报 API
 *
 * 聚合 ModelQueryTask / ModelAnswer / ModelClaim / ModelSourceMention。
 *
 * @see docs/design/04-API接口设计.md 第十四节
 */
import { Router } from 'express';
import { ModelQueryTaskRepository } from '../repositories/model-query-task-repository.js';
import { ModelAnswerRepository } from '../repositories/model-answer-repository.js';
import { ModelClaimRepository } from '../repositories/model-claim-repository.js';
import { ModelSourceMentionRepository } from '../repositories/model-source-mention-repository.js';
import type {
  ModelTaskType,
  ModelTaskStatus,
  ClaimType,
  VerificationStatus,
  DiscoveryStatus,
} from '../models/types.js';

const router = Router();
const taskRepo = new ModelQueryTaskRepository();
const answerRepo = new ModelAnswerRepository();
const claimRepo = new ModelClaimRepository();
const mentionRepo = new ModelSourceMentionRepository();

// ===== Tasks =====

router.get('/tasks', (req, res) => {
  const { profileId, status, taskType } = req.query;
  let data;
  if (profileId) data = taskRepo.findByProfile(profileId as string);
  else if (status) data = taskRepo.findByStatus(status as ModelTaskStatus);
  else if (taskType) data = taskRepo.findByTaskType(taskType as ModelTaskType);
  else data = taskRepo.findAll();
  res.json({ data, meta: { total: data.length } });
});

router.post('/tasks', (req, res) => {
  try {
    const task = taskRepo.create(req.body);
    res.status(201).json({ data: task });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: { code: 'CREATE_FAILED', message } });
  }
});

router.get('/tasks/:id', (req, res) => {
  const task = taskRepo.findById(req.params.id);
  if (!task) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '任务不存在' } });
    return;
  }
  res.json({ data: task });
});

router.patch('/tasks/:id/status', (req, res) => {
  const { status } = req.body as { status: ModelTaskStatus };
  const ok = taskRepo.updateStatus(req.params.id, status);
  if (!ok) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '任务不存在' } });
    return;
  }
  res.json({ data: taskRepo.findById(req.params.id) });
});

router.delete('/tasks/:id', (req, res) => {
  const ok = taskRepo.delete(req.params.id);
  if (!ok) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '任务不存在' } });
    return;
  }
  res.json({ data: { success: true } });
});

// ===== Answers =====

router.get('/answers', (req, res) => {
  const { taskId, provider, model } = req.query;
  let data;
  if (taskId) data = answerRepo.findByTask(taskId as string);
  else if (provider) data = answerRepo.findByModel(provider as string, model as string | undefined);
  else data = answerRepo.findAll();
  res.json({ data, meta: { total: data.length } });
});

router.get('/answers/:id', (req, res) => {
  const answer = answerRepo.findById(req.params.id);
  if (!answer) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '回答不存在' } });
    return;
  }
  res.json({ data: answer });
});

// ===== Claims =====

router.get('/claims', (req, res) => {
  const { answerId, claimType, verificationStatus, limit } = req.query;
  const l = parseInt(limit as string) || 50;
  let data;
  if (answerId) data = claimRepo.findByAnswer(answerId as string);
  else if (claimType) data = claimRepo.findByType(claimType as ClaimType, l);
  else if (verificationStatus) data = claimRepo.findByStatus(verificationStatus as VerificationStatus, l);
  else data = claimRepo.findAll({ limit: l });
  res.json({ data, meta: { total: data.length } });
});

router.get('/claims/stats', (_req, res) => {
  res.json({
    data: {
      byStatus: claimRepo.countByStatus(),
      byType: claimRepo.countByType(),
    },
  });
});

router.get('/claims/:id', (req, res) => {
  const claim = claimRepo.findById(req.params.id);
  if (!claim) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '观点不存在' } });
    return;
  }
  res.json({ data: claim });
});

router.patch('/claims/:id/verify', (req, res) => {
  const { status, evidenceIds } = req.body;
  const ok = claimRepo.updateVerificationStatus(req.params.id, status, evidenceIds);
  if (!ok) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '观点不存在' } });
    return;
  }
  res.json({ data: claimRepo.findById(req.params.id) });
});

// ===== Source Mentions =====

router.get('/source-mentions', (req, res) => {
  const { answerId, status, limit } = req.query;
  const l = parseInt(limit as string) || 50;
  let data;
  if (answerId) data = mentionRepo.findByAnswer(answerId as string);
  else if (status) data = mentionRepo.findByStatus(status as DiscoveryStatus);
  else data = mentionRepo.findAll({ limit: l });
  res.json({ data, meta: { total: data.length } });
});

router.get('/source-mentions/stats', (_req, res) => {
  res.json({ data: mentionRepo.countByStatus() });
});

router.get('/source-mentions/:id', (req, res) => {
  const mention = mentionRepo.findById(req.params.id);
  if (!mention) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '信源提及不存在' } });
    return;
  }
  res.json({ data: mention });
});

router.patch('/source-mentions/:id/status', (req, res) => {
  const { status } = req.body as { status: DiscoveryStatus };
  const ok = mentionRepo.updateDiscoveryStatus(req.params.id, status);
  if (!ok) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '信源提及不存在' } });
    return;
  }
  res.json({ data: mentionRepo.findById(req.params.id) });
});

router.patch('/source-mentions/:id/bind', (req, res) => {
  const { sourceId } = req.body;
  if (!sourceId) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: '缺少 sourceId' } });
    return;
  }
  const ok = mentionRepo.bindToSource(req.params.id, sourceId);
  if (!ok) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '信源提及不存在' } });
    return;
  }
  res.json({ data: mentionRepo.findById(req.params.id) });
});

export { router as modelRouter };
