/**
 * LLM 供应商管理 API
 *
 * 后台配置接口，支持动态添加/修改/启用/禁用 LLM 供应商。
 *
 * @see docs/WHITE_PAPER.md §8.5
 */
import { Router } from 'express';
import { LLMProviderRepository } from '../repositories/llm-provider-repository.js';
import { getLLMClient } from '../lib/llm-client-v2.js';
import type { LLMProviderType, LLMProviderStatus } from '../models/types.js';

const router = Router();
const repo = new LLMProviderRepository();

/**
 * GET /api/v1/admin/llm-providers
 * 列出所有供应商
 */
router.get('/', (_req, res) => {
  const providers = repo.findAll();
  // 出于安全考虑，API Key 脱敏返回
  const safeProviders = providers.map((p) => ({
    ...p,
    apiKey: maskApiKey(p.apiKey),
  }));
  res.json({ data: safeProviders, meta: { total: safeProviders.length } });
});

/**
 * GET /api/v1/admin/llm-providers/enabled
 * 列出所有启用的供应商
 */
router.get('/enabled', (_req, res) => {
  const providers = repo.findEnabled();
  res.json({ data: providers, meta: { total: providers.length } });
});

/**
 * GET /api/v1/admin/llm-providers/stats
 * 统计信息
 */
router.get('/stats', (_req, res) => {
  res.json({ data: repo.countByStatus() });
});

/**
 * GET /api/v1/admin/llm-providers/:id
 * 获取单个供应商详情
 */
router.get('/:id', (req, res) => {
  const provider = repo.findById(req.params.id);
  if (!provider) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '供应商不存在' } });
    return;
  }
  res.json({ data: { ...provider, apiKey: maskApiKey(provider.apiKey) } });
});

/**
 * POST /api/v1/admin/llm-providers
 * 创建供应商
 */
router.post('/', (req, res) => {
  try {
    const body = req.body;
    validateCreateInput(body);

    const provider = repo.create({
      name: body.name,
      providerType: body.providerType,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      modelBaseUrl: body.modelBaseUrl,
      models: body.models || [],
      defaultModel: body.defaultModel,
      enabled: body.enabled ?? true,
      rateLimitRpm: body.rateLimitRpm ?? 30,
      rateLimitDaily: body.rateLimitDaily ?? 1000,
      priority: body.priority ?? 100,
      costPer1mInput: body.costPer1mInput,
      costPer1mOutput: body.costPer1mOutput,
      config: body.config,
      status: body.status ?? 'active',
    } as any);

    res.status(201).json({ data: provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: { code: 'CREATE_FAILED', message } });
  }
});

/**
 * PUT /api/v1/admin/llm-providers/:id
 * 更新供应商
 */
router.put('/:id', (req, res) => {
  try {
    const existing = repo.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: '供应商不存在' } });
      return;
    }

    const body = req.body;
    const updates: any = {};

    // 只更新提供的字段
    if (body.name !== undefined) updates.name = body.name;
    if (body.providerType !== undefined) updates.providerType = body.providerType;
    if (body.apiKey !== undefined && body.apiKey !== '***') {
      updates.apiKey = body.apiKey; // 完整 key 才更新
    }
    if (body.baseUrl !== undefined) updates.baseUrl = body.baseUrl;
    if (body.modelBaseUrl !== undefined) updates.modelBaseUrl = body.modelBaseUrl;
    if (body.models !== undefined) updates.models = body.models;
    if (body.defaultModel !== undefined) updates.defaultModel = body.defaultModel;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.rateLimitRpm !== undefined) updates.rateLimitRpm = body.rateLimitRpm;
    if (body.rateLimitDaily !== undefined) updates.rateLimitDaily = body.rateLimitDaily;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.costPer1mInput !== undefined) updates.costPer1mInput = body.costPer1mInput;
    if (body.costPer1mOutput !== undefined) updates.costPer1mOutput = body.costPer1mOutput;
    if (body.config !== undefined) updates.config = body.config;
    if (body.status !== undefined) updates.status = body.status;

    const updated = repo.update(req.params.id, updates);
    res.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: { code: 'UPDATE_FAILED', message } });
  }
});

/**
 * PATCH /api/v1/admin/llm-providers/:id/toggle
 * 启用/禁用供应商
 */
router.patch('/:id/toggle', (req, res) => {
  const { enabled } = req.body as { enabled: boolean };
  const ok = repo.setEnabled(req.params.id, enabled);
  if (!ok) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '供应商不存在' } });
    return;
  }
  res.json({ data: repo.findById(req.params.id) });
});

/**
 * POST /api/v1/admin/llm-providers/:id/test
 * 测试供应商连通性
 */
router.post('/:id/test', async (req, res) => {
  const startedAt = Date.now();
  try {
    const provider = repo.findById(req.params.id);
    if (!provider) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: '供应商不存在' } });
      return;
    }

    const client = getLLMClient();
    const result = await client.call(
      [{ role: 'user', content: '你好，请用一句话介绍自己' }],
      { providerId: provider.id, maxTokens: 50 },
    );

    // 测试成功，恢复状态
    repo.updateStatus(provider.id, 'active');

    res.json({
      data: {
        success: true,
        response: result.content,
        model: result.model,
        usage: result.usage,
        latencyMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({
      error: {
        code: 'TEST_FAILED',
        message: `连通性测试失败: ${message}`,
      },
    });
  }
});

/**
 * DELETE /api/v1/admin/llm-providers/:id
 * 删除供应商
 */
router.delete('/:id', (req, res) => {
  const ok = repo.delete(req.params.id);
  if (!ok) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '供应商不存在' } });
    return;
  }
  res.json({ data: { success: true } });
});

// ===== 工具函数 =====

function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '***';
  return apiKey.slice(0, 4) + '****' + apiKey.slice(-4);
}

function validateCreateInput(body: any): void {
  if (!body.name || typeof body.name !== 'string') {
    throw new Error('name 必填');
  }
  if (!body.providerType || typeof body.providerType !== 'string') {
    throw new Error('providerType 必填');
  }
  if (!body.apiKey || typeof body.apiKey !== 'string') {
    throw new Error('apiKey 必填');
  }
  if (!body.baseUrl || typeof body.baseUrl !== 'string') {
    throw new Error('baseUrl 必填');
  }
}

export { router as llmProvidersRouter };
