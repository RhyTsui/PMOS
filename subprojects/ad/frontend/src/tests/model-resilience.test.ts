import { readFile, unlink, writeFile } from 'node:fs/promises';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { runtimeDataPath } from '../src/lib/runtime-data-path';
import type { ModelServiceConfig } from '../src/lib/runtime-config';

const resilienceStatePath = runtimeDataPath('model-resilience-state.json');

const allowExternalModelPolicy = {
  dataClass: 'internal' as const,
  requireDesensitization: true,
  allowExternalModel: true,
  auditRequired: true,
};

const baseResilienceConfig = {
  enabled: true,
  connectTimeoutMs: 3000,
  responseTimeoutMs: 30000,
  maxRetries: 3,
  retryBackoffMs: [1000, 2000, 4000],
  retryableHttpStatuses: [429, 502, 503, 504],
  breakerFailureThreshold: 3,
  breakerOpenMs: 30000,
  breakerHalfOpenProbeCount: 1,
};

const baseModelConfig: ModelServiceConfig = {
  enabled: true,
  provider: 'coze_openai_compatible' as const,
  providerLabel: 'Test Provider',
  apiKey: 'test-key',
  baseUrl: 'https://gateway.example.com',
  modelBaseUrl: 'https://gateway.example.com/v1',
  modelName: 'test-model',
  knowledgeBaseUrl: '',
  knowledgeBaseApiKey: '',
  knowledgeBaseDataset: '',
  controlledGlossaryKnowledgeBaseId: '',
  datakiBaseUrl: 'https://dataki.example.com',
  datakiAdminEmail: '',
  datakiAdminPassword: '',
  notes: '',
  updatedAt: '2026-06-08T00:00:00.000Z',
  routes: {
    chat_answer: {
      useCase: 'chat_answer',
      enabled: true,
      routeMode: 'direct_external' as const,
      dataPolicy: allowExternalModelPolicy,
      updatedAt: '2026-06-08T00:00:00.000Z',
    },
  },
};

async function clearResilienceState(): Promise<void> {
  await unlink(resilienceStatePath).catch(() => undefined);
}

beforeEach(async () => {
  vi.resetModules();
  await clearResilienceState();
});

afterEach(async () => {
  await clearResilienceState();
});

describe('model resilience', () => {
  it('classifies retryable model errors and uses configured backoff delays', async () => {
    const { classifyModelError, getRetryDelaysMs } = await import('../src/lib/model-resilience');

    expect(classifyModelError({ response: { status: 429 }, message: 'rate limited' })).toMatchObject({
      retryable: true,
      kind: 'http_429',
      statusCode: 429,
    });
    expect(classifyModelError({ response: { status: 503 }, message: 'unavailable' })).toMatchObject({
      retryable: true,
      kind: 'http_503',
      statusCode: 503,
    });
    expect(classifyModelError(new Error('connect ETIMEDOUT'))).toMatchObject({
      retryable: true,
      kind: 'timeout',
    });
    expect(classifyModelError(new Error('socket hang up'))).toMatchObject({
      retryable: true,
      kind: 'network',
    });
    expect(getRetryDelaysMs(baseResilienceConfig)).toEqual([1000, 2000, 4000]);
  });

  it('opens the breaker after consecutive failures and allows one half-open probe', async () => {
    const { recordModelCallFailure, shouldSkipModelCall } = await import('../src/lib/model-resilience');
    const key = 'chat_answer|default-profile|test-model';

    await recordModelCallFailure(key, baseResilienceConfig, new Error('socket hang up'));
    await recordModelCallFailure(key, baseResilienceConfig, new Error('socket hang up'));
    const opened = await recordModelCallFailure(key, baseResilienceConfig, new Error('socket hang up'));

    expect(opened.state).toBe('open');
    expect(opened.openUntil).toBeTruthy();

    const raw = JSON.parse(await readFile(resilienceStatePath, 'utf8')) as {
      breakers: Record<string, { openUntil?: string; halfOpenProbeReservedAt?: string }>;
    };
    raw.breakers[key]!.openUntil = new Date(Date.now() - 1000).toISOString();
    raw.breakers[key]!.halfOpenProbeReservedAt = undefined;
    await writeFile(resilienceStatePath, JSON.stringify(raw, null, 2), 'utf8');

    vi.resetModules();
    const { shouldSkipModelCall: shouldSkipModelCallFresh } = await import('../src/lib/model-resilience');
    const firstProbe = await shouldSkipModelCallFresh(key, baseResilienceConfig);
    expect(firstProbe.skip).toBe(false);
    expect(firstProbe.snapshot.state).toBe('half_open');

    const secondProbe = await shouldSkipModelCallFresh(key, baseResilienceConfig);
    expect(secondProbe.skip).toBe(true);
    expect(secondProbe.reason).toBe('breaker_half_open_probe_in_progress');
  });

  it('enables chat_answer resilience by default in effective route config', async () => {
    const { buildEffectiveModelRoute } = await import('../src/lib/runtime-config');
    const route = buildEffectiveModelRoute(baseModelConfig, 'chat_answer');

    expect(route.resilience.enabled).toBe(true);
    expect(route.resilience.connectTimeoutMs).toBe(10000);
    expect(route.resilience.responseTimeoutMs).toBe(30000);
    expect(route.resilience.maxRetries).toBe(3);
  });

  it('keeps chat_answer resilience above the governed minimum even when old admin config is lower', async () => {
    const { buildEffectiveModelRoute } = await import('../src/lib/runtime-config');
    const route = buildEffectiveModelRoute({
      ...baseModelConfig,
      routes: {
        chat_answer: {
          ...baseModelConfig.routes!.chat_answer!,
          resilience: {
            enabled: true,
            connectTimeoutMs: 3000,
            responseTimeoutMs: 30000,
            maxRetries: 0,
            retryBackoffMs: [1000],
            retryableHttpStatuses: [429, 503],
            breakerFailureThreshold: 1,
            breakerOpenMs: 1000,
            breakerHalfOpenProbeCount: 1,
          },
        },
      },
    }, 'chat_answer');

    expect(route.resilience.connectTimeoutMs).toBe(10000);
    expect(route.resilience.maxRetries).toBe(3);
  });
});
