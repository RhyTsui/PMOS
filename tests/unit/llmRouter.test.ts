import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { FileStore } from '../../src/core/fileStore';
import { LlmRouter } from '../../src/llm_router/index';

const originalGoogleKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
const originalLegacyKey = process.env.AI_STUDIO_API_KEY;

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
        prompt: '当前用户输入：请总结 PMAIOS v0.2',
      },
      {
        allowCrossCapabilityFallback: true,
      },
    );

    expect(execution.result.status).toBe('success');
    expect(execution.result.providerName).toBe('mock');
    expect(execution.result.warning).toContain('自动回退');
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
        prompt: '当前用户输入：你好',
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
});
