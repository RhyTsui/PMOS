import { POST as chatPost } from '@/app/api/chat/route';
import type { AgentProcessEvent, SourceRef } from '@/types';
import { AUTH_TOKEN_COOKIE } from './auth-service';

export interface RuntimeEvaluationResult {
  answer: string;
  process_events: AgentProcessEvent[];
  sources: SourceRef[];
  metadata: Record<string, unknown>;
  done_payload?: Record<string, unknown>;
}

function parseSsePayloads(raw: string): Record<string, unknown>[] {
  return raw
    .split(/\n\n+/)
    .map(block => block.trim())
    .filter(Boolean)
    .flatMap((block) => block
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('data:'))
      .map((line) => {
        try {
          return JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((item): item is Record<string, unknown> => Boolean(item)));
}

async function responseToText(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

function base64UrlEncodeJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value), 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function buildEvaluationAuthCookie(): string {
  const header = base64UrlEncodeJson({ alg: 'none', typ: 'JWT' });
  const payload = base64UrlEncodeJson({
    uid: 100000,
    account: 'evaluation-runtime',
    user_name: 'evaluation-runtime',
    real_name: '评估运行',
  });
  return `${AUTH_TOKEN_COOKIE}=${encodeURIComponent(`${header}.${payload}.`)}`;
}

export async function runChatRuntimeForEvaluation(input: {
  message: string;
  scenario?: string;
  metadata?: Record<string, unknown>;
  conversationId?: string;
  history?: Array<Record<string, unknown>>;
  headers?: Record<string, string>;
}): Promise<RuntimeEvaluationResult> {
  const conversationId = input.conversationId || `eval-${Date.now()}`;
  const request = new Request('http://127.0.0.1/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pathname': '/evaluation',
      'x-conversation-id': conversationId,
      'user-agent': 'lianu-evaluation-runtime',
      cookie: buildEvaluationAuthCookie(),
      ...(input.headers || {}),
    },
    body: JSON.stringify({
      message: input.message,
      history: input.history || [],
      intent: input.scenario,
      metadata: input.metadata || {},
    }),
  });

  const response = await chatPost(request as never);
  const raw = await responseToText(response);
  const payloads = parseSsePayloads(raw);
  let answer = '';
  let donePayload: Record<string, unknown> | undefined;
  const processEvents: AgentProcessEvent[] = [];

  for (const payload of payloads) {
    if (payload.type === 'content' && typeof payload.content === 'string') {
      answer += payload.content;
    }
    if (payload.type === 'process_event' && payload.event && typeof payload.event === 'object') {
      processEvents.push(payload.event as AgentProcessEvent);
    }
    if (payload.type === 'done') {
      donePayload = payload;
      const runtimeEvents = (payload.metadata as { process_events?: AgentProcessEvent[] } | undefined)?.process_events;
      if (Array.isArray(runtimeEvents)) {
        for (const event of runtimeEvents) {
          if (!processEvents.some(existing => existing.id === event.id)) {
            processEvents.push(event);
          }
        }
      }
    }
  }

  const doneResult = donePayload?.result as { summary?: string; structured_payload?: { source_refs?: SourceRef[] } } | undefined;
  const doneSources = doneResult?.structured_payload?.source_refs || [];
  const eventSources = processEvents.flatMap(event => event.source_refs || []);
  const sources = [...doneSources, ...eventSources].filter((source, index, list) => (
    list.findIndex(item => `${item.title}:${item.source}:${item.url || ''}` === `${source.title}:${source.source}:${source.url || ''}`) === index
  ));

  return {
    answer: answer || doneResult?.summary || '',
    process_events: processEvents,
    sources,
    metadata: {
      runtime: 'chat_sse',
      http_status: response.status,
      payload_count: payloads.length,
      received_metadata: input.metadata || {},
    },
    done_payload: donePayload,
  };
}
