import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../src/app/api/xiaoqiao/conversations/[id]/title/route';
import { getModelServiceConfig } from '../src/lib/runtime-config';
import { getPrompt, getPromptContent } from '../src/lib/prompt-store';
import { runModelUseCase } from '../src/lib/model-use-case-runtime';

vi.mock('../src/lib/prompt-store', () => ({
  getPrompt: vi.fn(),
  getPromptContent: vi.fn(),
}));

vi.mock('../src/lib/model-use-case-runtime', () => ({
  runModelUseCase: vi.fn(),
}));

vi.mock('../src/lib/runtime-config', () => ({
  getModelServiceConfig: vi.fn(),
}));

const mockedGetPrompt = vi.mocked(getPrompt);
const mockedGetPromptContent = vi.mocked(getPromptContent);
const mockedRunModelUseCase = vi.mocked(runModelUseCase);
const mockedGetModelServiceConfig = vi.mocked(getModelServiceConfig);

async function callTitle(body: Record<string, unknown>) {
  const request = new Request('http://localhost/api/xiaoqiao/conversations/conv-1/title', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const response = await POST(request, { params: Promise.resolve({ id: 'conv-1' }) });
  return response.json() as Promise<{
    title: string;
    source: 'model' | 'fallback' | 'model_unavailable';
    prompt_id?: string;
    prompt_source?: string;
    error_message?: string;
  }>;
}

describe('conversation title route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetModelServiceConfig.mockResolvedValue({} as never);
  });

  it('uses managed prompt id when configured and returns model source', async () => {
    mockedGetPrompt.mockResolvedValue({
      id: 'conversation-title-update',
      status: 'active',
      enabled: true,
      binding: {},
      updated_at: '2026-06-07T00:00:00.000Z',
    } as never);
    mockedGetPromptContent.mockResolvedValue('update system prompt');
    mockedRunModelUseCase.mockResolvedValue({
      text: 'AI生成标题',
      consumed: true,
      output: { titleText: 'AI生成标题' },
      modelUsed: true,
      blocked: false,
      warnings: [],
      participation: {} as never,
    });

    const response = await callTitle({
      message: '请帮我生成新标题',
      current_title: '旧标题',
      topic_summary: { analysis_type: '检索分析' },
      mode: 'update',
    });

    expect(mockedGetPrompt).toHaveBeenCalledWith('conversation-title-update');
    expect(mockedGetPromptContent).toHaveBeenCalledWith('conversation-title-update', expect.any(String));
    expect(mockedRunModelUseCase).toHaveBeenCalledWith(expect.objectContaining({
      promptId: 'conversation-title-update',
      input: expect.objectContaining({ mode: 'update' }),
    }));
    expect(response.source).toBe('model');
    expect(response.prompt_id).toBe('conversation-title-update');
    expect(response.prompt_source).toBe('managed');
    expect(response.title).toBe('AI生成标题');
  });

  it('falls back when prompt is not active and reports hardcoded source', async () => {
    mockedGetPrompt.mockResolvedValue(undefined);
    mockedGetPromptContent.mockResolvedValue('fallback system prompt');
    mockedRunModelUseCase.mockResolvedValue({
      text: 'fallback title',
      consumed: false,
      output: {},
      modelUsed: false,
      blocked: false,
      warnings: [],
      participation: {} as never,
    });

    const response = await callTitle({
      message: 'fallback title',
      current_title: '新对话',
      mode: 'update',
    });

    expect(mockedRunModelUseCase).toHaveBeenCalledWith(expect.objectContaining({
      promptId: 'conversation-title-generate',
      input: expect.objectContaining({ mode: 'generate' }),
    }));
    expect(response.source).toBe('fallback');
    expect(response.prompt_id).toBe('conversation-title-generate');
    expect(response.prompt_source).toBe('hardcoded');
    expect(response.title).toBe('fallbacktitle');
  });

  it('uses generate prompt for update mode when current title is placeholder', async () => {
    mockedGetPrompt.mockResolvedValue({
      id: 'conversation-title-generate',
      status: 'active',
      enabled: true,
      binding: {},
      updated_at: '2026-06-07T00:00:00.000Z',
    } as never);
    mockedGetPromptContent.mockResolvedValue('generate prompt');
    mockedRunModelUseCase.mockResolvedValue({
      text: '生成标题',
      consumed: true,
      output: { titleText: '生成标题' },
      modelUsed: true,
      blocked: false,
      warnings: [],
      participation: {} as never,
    });

    const response = await callTitle({
      message: '请给我生成标题',
      current_title: '新对话',
      mode: 'update',
    });

    expect(response.prompt_id).toBe('conversation-title-generate');
    expect(mockedRunModelUseCase).toHaveBeenCalledWith(expect.objectContaining({
      promptId: 'conversation-title-generate',
      input: expect.objectContaining({ mode: 'generate' }),
    }));
  });

  it('returns model_unavailable and keeps hardcoded source on timeout errors', async () => {
    mockedGetPrompt.mockResolvedValue({
      id: 'conversation-title-generate',
      status: 'active',
      enabled: true,
      binding: {},
      updated_at: '2026-06-07T00:00:00.000Z',
    } as never);
    mockedGetPromptContent.mockResolvedValue('generate prompt');
    mockedRunModelUseCase.mockRejectedValue(new Error('conversation title generation timed out'));

    const response = await callTitle({
      message: '生成报告标题',
      mode: 'generate',
    });

    expect(response.source).toBe('model_unavailable');
    expect(response.prompt_id).toBe('conversation-title-generate');
    expect(response.prompt_source).toBe('hardcoded');
    expect(response.error_message).toContain('timed out');
    expect(response.title).toBe('生成报告标题');
  });
});
