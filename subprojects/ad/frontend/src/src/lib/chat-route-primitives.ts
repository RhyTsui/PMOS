import { attachProcessEventsToDonePayload, processEventsFromSsePayload } from '@/lib/agent-runtime';
import type { AgentProcessEvent, IntentType, WorkflowResult } from '@/types';

export interface SourceRefPayload {
  title: string;
  source: string;
  url?: string;
  source_type: 'knowledge_base' | 'report_mcp' | 'mcp' | 'skill' | 'web_search' | 'web_fetch' | 'manual';
  report_name?: string;
  icon?: string;
  prompt?: string;
}

export function detectIntent(message: string): IntentType {
  void message;
  return 'report_query';
}

export function buildFallbackAnswer(intent: IntentType, message: string): string {
  void intent;
  return `当前已切换到问数服务，我会先按你的问题查询报表数据：${message}`;
}

export function buildStructuredResult(intent: IntentType, summary: string, taskId?: string): WorkflowResult {
  void intent;
  return {
    task_id: taskId || `task-${Date.now()}`,
    result_type: 'report_query_result',
    summary: summary.slice(0, 80),
    confidence: 'medium',
    structured_payload: {},
    next_actions: [],
    pending_checks: [],
    created_at: new Date().toISOString(),
    kind: 'report_query',
  } as WorkflowResult;
}

export function pushChatSsePayload(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  payload: unknown,
  processEvents: AgentProcessEvent[],
  isClosed?: () => boolean,
) {
  if (isClosed?.()) return;
  const nextEvents = processEventsFromSsePayload(payload);
  processEvents.push(...nextEvents);
  if (payload && typeof payload === 'object' && (payload as { type?: unknown }).type === 'process_event') {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    return;
  }
  const payloadWithRuntime = attachProcessEventsToDonePayload(payload, processEvents);
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payloadWithRuntime)}\n\n`));
  for (const event of nextEvents) {
    if (isClosed?.()) return;
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'process_event', event })}\n\n`));
  }
}

export function createProcessEvent(input: Omit<AgentProcessEvent, 'id' | 'started_at' | 'visibility' | 'status'> & {
  id?: string;
  started_at?: string;
  status?: AgentProcessEvent['status'];
  visibility?: AgentProcessEvent['visibility'];
}): AgentProcessEvent {
  const now = new Date().toISOString();
  return {
    id: input.id || `${input.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    started_at: input.started_at || now,
    status: input.status || 'success',
    visibility: input.visibility || 'user',
    ...input,
  };
}

export function buildCapabilityCheckedEvent(input: {
  label: string;
  summary: string;
  status?: AgentProcessEvent['status'];
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}): AgentProcessEvent {
  const now = new Date().toISOString();
  return createProcessEvent({
    type: 'capability.checked',
    label: input.label,
    summary: input.summary,
    status: input.status || 'success',
    started_at: now,
    completed_at: now,
    input: input.input,
    output: input.output,
  });
}

export function createSourceAttachedEvent(source: SourceRefPayload, index: number): AgentProcessEvent {
  const now = new Date().toISOString();
  return createProcessEvent({
    type: 'source.attached',
    label: `挂载来源：${source.title}`,
    status: 'success',
    summary: source.report_name
      ? `来源取自${source.report_name}`
      : source.source
        ? `来源取自${source.source}`
        : '已挂载可追溯来源',
    started_at: now,
    completed_at: now,
    source_refs: [{
      id: `source-${index + 1}`,
      title: source.title,
      source: source.source,
      url: source.url,
      source_type: source.source_type,
      report_name: source.report_name,
      icon: source.icon,
      prompt: source.prompt,
    }],
    output: {
      source_type: source.source_type,
      report_name: source.report_name || '',
      source: source.source,
      url: source.url || '',
    },
  });
}

export function pushSourceAttachedEvents(push: (payload: Record<string, unknown>) => void, sources: SourceRefPayload[]) {
  sources.forEach((source, index) => {
    push({
      type: 'process_event',
      event: createSourceAttachedEvent(source, index),
    });
  });
}
