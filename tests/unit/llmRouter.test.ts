import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync } from 'node:fs';
import { FileStore } from '../../src/core/fileStore';
import { LlmRouter } from '../../src/llm_router/index';

const originalGoogleKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
const originalLegacyKey = process.env.AI_STUDIO_API_KEY;
const originalOpenAiCompatibleKey = process.env.OPENAI_COMPATIBLE_API_KEY;

afterEach(() => {
  if (originalGoogleKey === undefined) {
    delete process.env.GOOGLE_AI_STUDIO_API_KEY;
  } else {
    process.env.GOOGLE_AI_STUDIO_API_KEY = originalGoogleKey;
  }

  if (originalLegacyKey === undefined) {
    delete process.env.AI_STUDIO_API_KEY;
  } else {
    process.env.AI_STUDIO_API_KEY = originalLegacyKey;
  }

  if (originalOpenAiCompatibleKey === undefined) {
    delete process.env.OPENAI_COMPATIBLE_API_KEY;
  } else {
    process.env.OPENAI_COMPATIBLE_API_KEY = originalOpenAiCompatibleKey;
  }

  LlmRouter.resetCooldowns();
  vi.unstubAllGlobals();
});

describe('LlmRouter', () => {
  it('falls back from ai-studio to mock for text-multimodal chat', async () => {
    delete process.env.GOOGLE_AI_STUDIO_API_KEY;
    delete process.env.AI_STUDIO_API_KEY;

    const router = new LlmRouter(new FileStore(path.resolve(process.cwd())));
    const execution = await router.execute(
      {
        runId: 'run-1',
        stageId: 'chat-response',
        capability: 'text-multimodal',
        prompt: '请总结 PMAIOS v0.2',
      },
      {
        allowCrossCapabilityFallback: true,
      },
    );

    expect(execution.result.status).toBe('success');
    expect(execution.result.providerName).toBe('mock');
    expect(execution.result.warning).toContain('fell back');
    expect(execution.events.some((event) => event.kind === 'provider_failed' && event.detail.includes('ai-studio'))).toBe(true);
    expect(execution.events.some((event) => event.kind === 'provider_succeeded' && event.detail.includes('mock'))).toBe(true);
  });

  it('uses ai-studio directly when runtime is ready', async () => {
    process.env.GOOGLE_AI_STUDIO_API_KEY = 'test-google-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responseId: 'resp-1',
        candidates: [
          {
            content: {
              parts: [{ text: 'router ok' }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const router = new LlmRouter(new FileStore(path.resolve(process.cwd())));
    const execution = await router.execute(
      {
        runId: 'run-2',
        stageId: 'chat-response',
        capability: 'text-multimodal',
        prompt: '你好',
      },
      {
        allowCrossCapabilityFallback: true,
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(execution.result.status).toBe('success');
    expect(execution.result.providerName).toBe('ai-studio');
    expect(execution.result.outputText).toBe('router ok');
    expect(execution.events.filter((event) => event.kind === 'provider_invoked')).toHaveLength(1);
    expect(execution.events.at(-1)?.kind).toBe('provider_succeeded');
  });

  it('falls back from qwen to gemini when quota is exhausted', async () => {
    process.env.OPENAI_COMPATIBLE_API_KEY = 'test-qwen-key';
    process.env.GOOGLE_AI_STUDIO_API_KEY = 'test-gemini-key';

    const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-llm-router-'));
    const store = new FileStore(root);
    await store.write(
      'config/providers.json',
      JSON.stringify(
        {
          defaultProvider: 'openai-compatible',
          providers: [
            {
              name: 'openai-compatible',
              type: 'openai-compatible',
              envKey: 'OPENAI_COMPATIBLE_API_KEY',
              capabilities: ['text', 'code', 'review'],
              model: 'qwen-plus-latest',
              priority: 100,
            },
            {
              name: 'ai-studio',
              type: 'ai-studio',
              envKey: 'GOOGLE_AI_STUDIO_API_KEY',
              capabilities: ['text', 'code', 'review'],
              model: 'gemini-2.5-flash',
              priority: 90,
            },
          ],
        },
        null,
        2,
      ),
    );

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            message: 'Quota exceeded for qwen-plus-latest',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responseId: 'resp-2',
          candidates: [
            {
              content: {
                parts: [{ text: 'gemini fallback ok' }],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          responseId: 'resp-3',
          candidates: [
            {
              content: {
                parts: [{ text: 'gemini stayed primary during cooldown' }],
              },
            },
          ],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const router = new LlmRouter(store);
    const firstExecution = await router.execute({
      runId: 'run-3',
      stageId: 'chat-response',
      capability: 'text',
      prompt: '请总结当前任务',
    });
    const secondExecution = await router.execute({
      runId: 'run-4',
      stageId: 'chat-response',
      capability: 'text',
      prompt: '请继续',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('dashscope.aliyuncs.com');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('generativelanguage.googleapis.com');
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain('generativelanguage.googleapis.com');

    expect(firstExecution.result.status).toBe('success');
    expect(firstExecution.result.providerName).toBe('ai-studio');
    expect(firstExecution.result.model).toBe('gemini-2.5-flash');
    expect(firstExecution.result.outputText).toBe('gemini fallback ok');
    expect(firstExecution.result.warning).toContain('fell back');
    expect(firstExecution.events.some((event) => event.kind === 'provider_failed' && /quota|rate-limit/i.test(event.detail))).toBe(true);

    expect(secondExecution.result.status).toBe('success');
    expect(secondExecution.result.providerName).toBe('ai-studio');
    expect(secondExecution.result.outputText).toBe('gemini stayed primary during cooldown');
  });
});
