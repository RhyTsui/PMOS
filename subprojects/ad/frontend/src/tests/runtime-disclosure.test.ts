import { describe, expect, it } from 'vitest';
import type { Message } from '@/types';
import { buildMessageDisclosureView } from '@/components/cognitive/messageState';
import { createRuntimeState } from '@/lib/chat-runtime/runtime-state';
import { cleanRuntimeLabel } from '@/lib/chat-runtime/runtime-disclosure';
import { buildMessageRuntimeProjection } from '@/lib/chat-runtime/message-runtime-projection';
import { buildRuntimeDisclosurePresentation } from '@/contracts/disclosure/runtime-presentation';

describe('runtime disclosure', () => {
  it('uses neutral labels for runtime states', () => {
    const state = createRuntimeState('2026-06-07T00:00:00.000Z', 'data_fetching', [], 'running');
    expect(state.label).toBe('正在获取信息...');
    expect(state.label).not.toContain('广告');
  });

  it('keeps legacy labels from leaking business-domain terms', () => {
    const cleaned = cleanRuntimeLabel('正在获取广告数据...');
    expect(cleaned).toBe('正在获取数据');
    expect(cleaned).not.toContain('广告');
  });

  it('normalizes general request labels without domain terms', () => {
    const cleaned = cleanRuntimeLabel('正在理解请求...');
    expect(cleaned).toBe('准备执行');
    expect(cleaned).not.toContain('广告');
  });

  it('projects streaming process events into disclosure steps before final runtime projection arrives', () => {
    const message = {
      id: 'assistant-1',
      message_id: 'assistant-1',
      conversation_id: 'conv-1',
      role: 'assistant',
      content: '',
      message_type: 'assistant_reply',
      created_at: '2026-06-12T00:00:00.000Z',
      timestamp: Date.parse('2026-06-12T00:00:00.000Z'),
      process_events: [
        {
          id: 'event-1',
          type: 'intent.detected',
          label: '意图路由',
          status: 'success',
          visibility: 'user',
          summary: '进入通用回答链路。',
          started_at: '2026-06-12T00:00:00.000Z',
          completed_at: '2026-06-12T00:00:00.100Z',
          duration_ms: 100,
        },
        {
          id: 'event-2',
          type: 'knowledge.search',
          label: '查询知识库',
          status: 'running',
          visibility: 'user',
          summary: '正在查询可用资料。',
          started_at: '2026-06-12T00:00:00.100Z',
        },
      ],
      metadata: {
        turn_ui_status: 'tool_running',
      },
    } as unknown as Message;

    const view = buildMessageDisclosureView({ message });
    expect(view?.execution.steps.map((step) => step.title)).toEqual(['意图路由', '查询知识库']);
    expect(view?.execution.steps[1]?.status).toBe('running');

    const presentation = view ? buildRuntimeDisclosurePresentation(view) : null;
    expect(presentation?.primaryRows.map((row) => row.title)).toEqual(['意图路由', '查询知识库']);
    expect(presentation?.runtimeLogs).toHaveLength(2);
  });

  it('attaches all process event sources to the runtime step during history replay', () => {
    const message: Message = {
      id: 'assistant-1',
      message_id: 'assistant-1',
      conversation_id: 'conv-1',
      role: 'assistant',
      content: '回答',
      message_type: 'assistant_reply',
      created_at: '2026-06-12T00:00:00.000Z',
      timestamp: Date.parse('2026-06-12T00:00:00.000Z'),
      process_events: [
        {
          id: 'event-web',
          type: 'web.result',
          label: '查询公开来源',
          status: 'success',
          visibility: 'user',
          summary: '已获取 2 条公开来源。',
          source_refs: [
            { id: 'source-a', title: '来源 A', type: 'web', locator: { kind: 'url', value: 'https://example.com/a' } },
            { id: 'source-b', title: '来源 B', type: 'web', locator: { kind: 'url', value: 'https://example.com/b' } },
          ],
        } as any,
      ],
    };

    const view = buildMessageDisclosureView({ message });
    const presentation = view ? buildRuntimeDisclosurePresentation(view) : null;

    expect(presentation?.primaryRows[0]?.sources?.map((source) => source.title)).toEqual(['来源 A', '来源 B']);
  });

  it('projects prompt hits from actual model participation records', () => {
    const projection = buildMessageRuntimeProjection({
      messageId: 'assistant-1',
      threadId: 'conv-1',
      traceId: 'trace-1',
      workflow: 'chat',
      intent: 'general',
      status: 'success',
      content: '回答',
      messageContract: {
        type: 'chat',
        answer_markdown: '回答',
      } as any,
      processEvents: [],
      modelParticipation: [
        {
          model_use_case: 'request_understanding',
          prompt_id: 'model-use-case.request_understanding',
          prompt_source: 'seed',
          prompt_version: '3',
          prompt_hash: 'hash-a',
          status: 'succeeded_not_consumed',
        },
        {
          model_use_case: 'chat_answer',
          prompt_id: 'model-use-case.chat_answer',
          prompt_source: 'admin',
          prompt_version: '8',
          prompt_hash: 'hash-b',
          status: 'succeeded_consumed',
          consumed_by: 'chat_answer_composer',
        },
      ],
    });

    expect(projection.prompt_hits.map(item => item.title)).toEqual(['请求结构化理解', '开放式回答合成']);
    expect(projection.prompt_hits.map(item => item.prompt_version)).toEqual(['3', '8']);
    expect(projection.prompt_hits[0]?.metadata?.prompt_id).toBe('model-use-case.request_understanding');
    expect(projection.prompt_hits[1]?.metadata?.consumed_by).toBe('chat_answer_composer');
    expect(JSON.stringify(projection.prompt_hits)).not.toContain('Prompt 配置');
  });

  it('does not synthesize a shared prompt hit when no model participation is recorded', () => {
    const projection = buildMessageRuntimeProjection({
      messageId: 'assistant-1',
      threadId: 'conv-1',
      traceId: 'trace-1',
      workflow: 'chat',
      intent: 'general',
      status: 'success',
      content: '回答',
      messageContract: {
        type: 'chat',
        answer_markdown: '回答',
      } as any,
      processEvents: [],
      promptConfig: { version: 99, name: 'legacy-runtime-config' },
    });

    expect(projection.prompt_hits).toEqual([]);
    expect(projection.prompt_hits_summary).toBe('');
    expect(JSON.stringify(projection)).not.toContain('Prompt 配置');
  });
});
