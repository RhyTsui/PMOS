import { describe, expect, it, vi } from 'vitest';
import { createSDK } from '@mcpilotx/intentorch';
import { runIntentOrchEnhancement } from '../src/lib/intent-orch-enhancer';
import { getModelServiceConfig } from '../src/lib/runtime-config';

vi.mock('@mcpilotx/intentorch', () => ({
  createSDK: vi.fn(),
}));

vi.mock('../src/lib/runtime-config', () => ({
  getModelServiceConfig: vi.fn(async () => ({
    enabled: true,
    apiKey: 'test-api-key',
    modelBaseUrl: 'https://model.example.com/compatible-mode/v1',
    baseUrl: 'https://model.example.com/compatible-mode/v1',
    modelName: 'qwen-test',
  })),
}));

vi.mock('../src/lib/mcp-server-store', () => ({
  listMcpServers: vi.fn(async () => []),
}));

const baseInput = {
  message: '查一下当前任务',
  userRequirement: {
    metrics: [],
    dimensions: [],
    dateRange: { type: 'unknown' },
    task: 'general',
  },
  routeIntent: 'general',
  conversationHistory: [],
};

function successfulSdk() {
  return {
    init: vi.fn(),
    configureAI: vi.fn(async () => undefined),
    initCloudIntentEngine: vi.fn(async () => undefined),
    connectMCPServer: vi.fn(async () => undefined),
    listTools: vi.fn(() => [{
      name: 'tool.search',
      description: 'search tool',
      serverName: 'server-a',
    }]),
    parseAndPlanWorkflow: vi.fn(async () => ({
      success: true,
      plan: {
        parsedIntents: [{ id: 'intent-1', type: 'lookup', description: 'lookup', parameters: {} }],
        toolSelections: [{
          intentId: 'intent-1',
          toolName: 'tool.search',
          toolDescription: 'search tool',
          mappedParameters: {},
          confidence: 0.8,
        }],
        executionOrder: ['intent-1'],
        dependencies: [],
        estimatedSteps: 1,
      },
    })),
  };
}

describe('IntentOrch enhancer timeout', () => {
  it('uses a total timeout and does not pin later calls to a stale init promise', async () => {
    process.env.INTENT_ORCH_ENABLED = 'true';
    vi.mocked(createSDK)
      .mockReturnValueOnce({
        init: vi.fn(),
        configureAI: vi.fn(async () => undefined),
        initCloudIntentEngine: vi.fn(() => new Promise(() => undefined)),
        connectMCPServer: vi.fn(async () => undefined),
        listTools: vi.fn(() => []),
        parseAndPlanWorkflow: vi.fn(),
      } as any)
      .mockReturnValueOnce(successfulSdk() as any);

    const timedOut = await runIntentOrchEnhancement(baseInput, { timeoutMs: 5 });

    expect(timedOut?.success).toBe(false);
    expect(timedOut?.error).toBe('intentorch_timeout');
    expect(timedOut?.warnings.join('\n')).toContain('总超时');

    const recovered = await runIntentOrchEnhancement(baseInput, { timeoutMs: 1000 });

    expect(recovered?.success).toBe(true);
    expect(recovered?.plan?.toolSelections[0]?.toolName).toBe('tool.search');
    expect(createSDK).toHaveBeenCalledTimes(2);
  });

  it('recovers once when a stale SDK reports cloud intent engine not initialized during planning', async () => {
    process.env.INTENT_ORCH_ENABLED = 'true';
    vi.mocked(getModelServiceConfig).mockResolvedValue({
      enabled: true,
      apiKey: 'test-api-key',
      modelBaseUrl: 'https://model.example.com/compatible-mode/v1',
      baseUrl: 'https://model.example.com/compatible-mode/v1',
      modelName: 'qwen-recovery',
    } as any);

    const createSdkCallsBefore = vi.mocked(createSDK).mock.calls.length;
    vi.mocked(createSDK)
      .mockReturnValueOnce({
        init: vi.fn(),
        configureAI: vi.fn(async () => undefined),
        initCloudIntentEngine: vi.fn(async () => undefined),
        getCloudIntentEngineStatus: vi.fn(() => ({ initialized: true })),
        connectMCPServer: vi.fn(async () => undefined),
        listTools: vi.fn(() => [{
          name: 'tool.search',
          description: 'search tool',
          serverName: 'server-a',
        }]),
        parseAndPlanWorkflow: vi.fn(async () => {
          throw new Error('Cloud Intent Engine not initialized. Call initCloudIntentEngine() first.');
        }),
      } as any)
      .mockReturnValueOnce(successfulSdk() as any);

    const recovered = await runIntentOrchEnhancement(baseInput, { timeoutMs: 1000 });

    expect(recovered?.success).toBe(true);
    expect(recovered?.plan?.toolSelections[0]?.toolName).toBe('tool.search');
    expect(createSDK).toHaveBeenCalledTimes(createSdkCallsBefore + 2);
  });
});
