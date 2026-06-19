/**
 * CozeLoop Trace SDK integration.
 */
import { cozeLoopTracer } from '@cozeloop/ai';
import { getTraceConfigSync } from '@/lib/trace-config-store';

export interface TraceConfig {
  enabled: boolean;
  apiUrl: string;
  workspaceId: string;
  apiToken: string;
  env: 'test' | 'pre' | 'prod';
  serviceName: string;
  sampleRate: number;
}

export function getTraceConfigFromEnv(): TraceConfig {
  return getTraceConfigSync();
}

let initialized = false;
let initializedConfigKey = '';
let rejectionHandlerInstalled = false;
let traceFailureCount = 0;
let traceDisabledUntil = 0;
let lastTraceWarning = '';

function isIgnorableTraceExporterError(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason);
  return /no spans provided|no access permission|socket hang up|Cannot set property message of Error which has only a getter|600904002/i.test(message)
    || /connect EACCES .*:443/i.test(message)
    || /ENOTFOUND .*liannu/i.test(message)
    || /timeout|timed out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EPIPE|broken pipe/i.test(message);
}

function recordTraceFailure(error: unknown): void {
  if (isIgnorableTraceExporterError(error)) {
    return;
  }
  traceFailureCount += 1;
  lastTraceWarning = error instanceof Error ? error.message : String(error);
  if (traceFailureCount >= 3) {
    traceDisabledUntil = Date.now() + 30_000;
  }
  console.error('[Trace] Export failed:', lastTraceWarning);
}

function recordTraceSuccess(): void {
  traceFailureCount = 0;
  traceDisabledUntil = 0;
}

function isTraceTemporarilyDisabled(): boolean {
  return traceDisabledUntil > Date.now();
}

export function getTraceHealth(): {
  mode: 'active' | 'degraded';
  failureCount: number;
  disabledUntil?: string;
  lastWarning?: string;
} {
  return {
    mode: isTraceTemporarilyDisabled() ? 'degraded' : 'active',
    failureCount: traceFailureCount,
    disabledUntil: traceDisabledUntil ? new Date(traceDisabledUntil).toISOString() : undefined,
    lastWarning: lastTraceWarning || undefined,
  };
}

function installTraceRejectionHandler(): void {
  if (rejectionHandlerInstalled) return;

  process.on('unhandledRejection', (reason) => {
    if (isIgnorableTraceExporterError(reason)) {
      return;
    }
  });

  process.on('uncaughtException', (reason) => {
    if (isIgnorableTraceExporterError(reason)) {
      return;
    }
    throw reason;
  });

  rejectionHandlerInstalled = true;
}

export function initTrace(config?: Partial<TraceConfig>): void {
  const cfg = { ...getTraceConfigFromEnv(), ...config };
  if (!cfg.enabled || !cfg.apiUrl || !cfg.workspaceId || !cfg.apiToken) return;

  const nextConfigKey = JSON.stringify({
    enabled: cfg.enabled,
    apiUrl: cfg.apiUrl,
    workspaceId: cfg.workspaceId,
    apiToken: cfg.apiToken,
    env: cfg.env,
    serviceName: cfg.serviceName,
    sampleRate: cfg.sampleRate,
  });

  if (initialized && initializedConfigKey === nextConfigKey) return;

  try {
    if (initialized && initializedConfigKey !== nextConfigKey) {
      try { cozeLoopTracer.shutdown(); } catch { /* ignore */ }
      initialized = false;
    }
    cozeLoopTracer.initialize({
      apiClient: { baseURL: cfg.apiUrl, token: cfg.apiToken },
      workspaceId: cfg.workspaceId,
      processor: 'simple',
    });
    installTraceRejectionHandler();
    initialized = true;
    initializedConfigKey = nextConfigKey;
  } catch (err) {
    console.error('[Trace] Init failed:', err);
  }
}

export const traceable = cozeLoopTracer.traceable;
export const setInput = cozeLoopTracer.setInput;
export const setOutput = cozeLoopTracer.setOutput;
export const setTags = cozeLoopTracer.setTags;
export const setError = cozeLoopTracer.setError;

export async function safeTraceable<T>(
  callback: (span: any) => Promise<T> | T,
  options: { name: string; type: unknown },
  fallback?: () => Promise<T> | T,
): Promise<T> {
  if (isTraceTemporarilyDisabled()) {
    return fallback ? await fallback() : await callback(createNoopSpan());
  }
  let callbackResult: T | undefined;
  let callbackCompleted = false;
  try {
    const result = await cozeLoopTracer.traceable(async (span: any) => {
      callbackResult = await callback(span);
      callbackCompleted = true;
      return callbackResult;
    }, options as never);
    recordTraceSuccess();
    return result;
  } catch (error) {
    if (!isIgnorableTraceExporterError(error)) {
      throw error;
    }
    recordTraceFailure(error);
    if (callbackCompleted) return callbackResult as T;
    return fallback ? await fallback() : await callback(createNoopSpan());
  }
}

function createNoopSpan(): { spanContext: () => { traceId: string; spanId: string } } {
  const id = `trace-unavailable-${Date.now().toString(36)}`;
  return {
    spanContext: () => ({ traceId: id, spanId: id }),
  };
}

/**
 * 生成 Runner span 唯一标识。
 * 格式：`sp-{timestamp}-{random}`，与 traceId (`zt-chat-*`) 区分。
 */
export function createRunnerSpanId(): string {
  return `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 创建 Runner 级别的 span meta（根 span，无 parent）。
 */
export function createRunSpanMeta(params: {
  traceId: string;
  startedAt: string;
}): StandardTraceMeta {
  return {
    trace_id: params.traceId,
    span_id: createRunnerSpanId(),
    span_kind: 'run',
    span_name: 'chat_run',
    span_started_at: params.startedAt,
  };
}

/**
 * 创建 stage 级别的 span meta（parent 为 run span）。
 */
export function createStageSpanMeta(params: {
  traceId: string;
  parentSpanId: string;
  stage: string;
  startedAt: string;
}): StandardTraceMeta {
  return {
    trace_id: params.traceId,
    span_id: createRunnerSpanId(),
    parent_span_id: params.parentSpanId,
    span_kind: 'stage',
    span_name: `stage:${params.stage}`,
    span_started_at: params.startedAt,
  };
}

/**
 * 创建 tool / llm 级别的 span meta（parent 为 stage span）。
 */
export function createOperationSpanMeta(params: {
  traceId: string;
  parentSpanId: string;
  kind: 'tool' | 'llm' | 'guardrail';
  name: string;
  startedAt: string;
}): StandardTraceMeta {
  return {
    trace_id: params.traceId,
    span_id: createRunnerSpanId(),
    parent_span_id: params.parentSpanId,
    span_kind: params.kind,
    span_name: `${params.kind}:${params.name}`,
    span_started_at: params.startedAt,
  };
}

/**
 * 完成 span：设置 ended_at 和 status。
 */
export function completeSpanMeta(meta: StandardTraceMeta, status: 'ok' | 'error' = 'ok'): StandardTraceMeta {
  return {
    ...meta,
    span_ended_at: new Date().toISOString(),
    status_code: status === 'ok' ? 'ok' : 'error',
  };
}

export function safeSetInput(span: unknown, input: unknown): void {
  try { cozeLoopTracer.setInput(span as never, input as never); } catch (error) { recordTraceFailure(error); }
}

export function safeSetOutput(span: unknown, output: unknown): void {
  try { cozeLoopTracer.setOutput(span as never, output as never); } catch (error) { recordTraceFailure(error); }
}

export function safeSetTags(span: unknown, tags: Record<string, string>): void {
  try { cozeLoopTracer.setTags(span as never, tags); } catch (error) { recordTraceFailure(error); }
}

export function safeSetError(span: unknown, error: unknown): void {
  try { cozeLoopTracer.setError(span as never, error as never); } catch (traceError) { recordTraceFailure(traceError); }
}

export type TraceSpanKind = 'run' | 'stage' | 'llm' | 'tool' | 'guardrail';

export interface StandardTraceMeta {
  trace_id?: string;
  sdk_trace_id?: string;
  local_trace_id?: string;
  /** 当前 span 唯一标识。用于构建 trace-and-span 层级。 */
  span_id?: string;
  /** 父 span 标识。根 span（run 级）无此字段。 */
  parent_span_id?: string;
  /** span 类型：run / stage / llm / tool / guardrail。 */
  span_kind?: TraceSpanKind;
  /** span 开始时间 ISO。 */
  span_started_at?: string;
  /** span 结束时间 ISO。 */
  span_ended_at?: string;
  thread_id?: string;
  message_id?: string;
  turn_id?: string;
  task_id?: string;
  run_id?: string;
  conversation_id?: string;
  intent_type?: string;
  workflow_name?: string;
  span_name?: string;
  span_type?: 'custom' | 'model' | 'tool' | 'agent' | 'retriever';
  status_code?: string | number;
  env?: string;
  app?: string;
  module?: string;
  user_role?: string;
  token_usage_input?: number;
  token_usage_output?: number;
  token_usage_total?: number;
}

export function buildStandardTraceTags(meta: StandardTraceMeta): Record<string, string> {
  const tags: Record<string, string> = {};
  const assign = (key: string, value: string | number | undefined) => {
    if (value === undefined) return;
    tags[key] = String(value);
  };
  assign('cozeloop.trace_id', meta.trace_id);
  assign('cozeloop.sdk_trace_id', meta.sdk_trace_id);
  assign('cozeloop.local_trace_id', meta.local_trace_id);
  assign('cozeloop.span_id', meta.span_id);
  assign('cozeloop.parent_span_id', meta.parent_span_id);
  assign('cozeloop.span_kind', meta.span_kind);
  assign('cozeloop.span_started_at', meta.span_started_at);
  assign('cozeloop.span_ended_at', meta.span_ended_at);
  assign('cozeloop.thread_id', meta.thread_id);
  assign('cozeloop.message_id', meta.message_id);
  assign('cozeloop.turn_id', meta.turn_id);
  assign('cozeloop.task_id', meta.task_id);
  assign('cozeloop.run_id', meta.run_id);
  assign('cozeloop.conversation_id', meta.conversation_id);
  assign('cozeloop.intent_type', meta.intent_type);
  assign('cozeloop.workflow_name', meta.workflow_name);
  assign('cozeloop.span_name', meta.span_name);
  assign('cozeloop.span_type', meta.span_type);
  assign('cozeloop.status_code', meta.status_code);
  assign('cozeloop.env', meta.env);
  assign('cozeloop.app', meta.app);
  assign('cozeloop.module', meta.module);
  assign('cozeloop.user_role', meta.user_role);
  assign('gen_ai.usage.input_tokens', meta.token_usage_input);
  assign('gen_ai.usage.output_tokens', meta.token_usage_output);
  assign('gen_ai.usage.total_tokens', meta.token_usage_total);
  return tags;
}

export function buildStandardTraceInput<T extends object>(input: T, meta: StandardTraceMeta = {}): T & {
  trace_id?: string;
  sdk_trace_id?: string;
  local_trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  span_kind?: TraceSpanKind;
  span_started_at?: string;
  span_ended_at?: string;
  thread_id?: string;
  message_id?: string;
  turn_id?: string;
  task_id?: string;
  run_id?: string;
  conversation_id?: string;
  intent_type?: string;
  workflow_name?: string;
  env?: string;
  app?: string;
  module?: string;
  user_role?: string;
} {
  return {
    ...input,
    trace_id: meta.trace_id,
    sdk_trace_id: meta.sdk_trace_id,
    local_trace_id: meta.local_trace_id,
    span_id: meta.span_id,
    parent_span_id: meta.parent_span_id,
    span_kind: meta.span_kind,
    span_started_at: meta.span_started_at,
    span_ended_at: meta.span_ended_at,
    thread_id: meta.thread_id,
    message_id: meta.message_id,
    turn_id: meta.turn_id,
    task_id: meta.task_id,
    run_id: meta.run_id,
    conversation_id: meta.conversation_id,
    intent_type: meta.intent_type,
    workflow_name: meta.workflow_name,
    env: meta.env,
    app: meta.app,
    module: meta.module,
    user_role: meta.user_role,
  };
}

export async function flushTrace(timeoutMs = 1500) {
  if (isTraceTemporarilyDisabled()) return;
  try {
    await Promise.race([
      Promise.resolve(cozeLoopTracer.forceFlush()),
      new Promise(resolve => setTimeout(resolve, timeoutMs)),
    ]);
    recordTraceSuccess();
  } catch (error) {
    if (isIgnorableTraceExporterError(error)) return;
    recordTraceFailure(error);
  }
}

export const safeFlushTrace = flushTrace;

export function resetTraceState(): void {
  initialized = false;
  initializedConfigKey = '';
  traceFailureCount = 0;
  traceDisabledUntil = 0;
  lastTraceWarning = '';
}

export function shutdownTrace() {
  try { cozeLoopTracer.shutdown(); } catch { /* ignore */ }
  resetTraceState();
}

export interface ChatTraceInput {
  trace_id?: string;
  sdk_trace_id?: string;
  local_trace_id?: string;
  thread_id?: string;
  message_id?: string;
  turn_id?: string;
  env: string;
  service_name: string;
  question: string;
  conversation_id?: string;
  agent_id?: string;
  app?: string;
  module?: string;
  user_role?: string;
  request_time: string;
  frontend_params?: Record<string, unknown>;
}

export function buildChatTraceInput(question: string, extras?: Partial<ChatTraceInput>): ChatTraceInput {
  const cfg = getTraceConfigFromEnv();
  return {
    env: cfg.env,
    service_name: cfg.serviceName,
    question: question.slice(0, 4000),
    request_time: new Date().toISOString(),
    ...extras,
  };
}

export type ChatSpanKind = 'custom' | 'agent' | 'model' | 'tool' | 'retriever';

export interface TraceIdentity {
  trace_id?: string;
  sdk_trace_id?: string;
  local_trace_id?: string;
  thread_id?: string;
  conversation_id?: string;
  message_id?: string;
  turn_id?: string;
  task_id?: string;
  run_id?: string;
  env?: string;
  app?: string;
  module?: string;
  user_role?: string;
  intent_type?: string;
  workflow_name?: string;
}

export interface TraceSpanFactoryOptions {
  name: string;
  kind: ChatSpanKind;
  identity: TraceIdentity;
  attrs?: Record<string, unknown>;
}

export function normalizeTraceIdentity(identity: TraceIdentity): TraceIdentity {
  const threadId = identity.thread_id || identity.conversation_id;
  return {
    ...identity,
    thread_id: threadId,
    conversation_id: identity.conversation_id || threadId,
  };
}

export function createChatSpan(options: TraceSpanFactoryOptions): {
  name: string;
  type: ChatSpanKind;
  input: Record<string, unknown>;
  tags: Record<string, string>;
} {
  const identity = normalizeTraceIdentity(options.identity);
  return {
    name: options.name,
    type: options.kind,
    input: buildStandardTraceInput(options.attrs || {}, identity),
    tags: buildStandardTraceTags({
      ...identity,
      span_name: options.name,
      span_type: options.kind,
    }),
  };
}

export function buildTraceUrl(traceId: string, workspaceId?: string): string {
  const template = process.env.COZELOOP_TRACE_URL_TEMPLATE?.trim();
  if (template) {
    return template
      .replaceAll('{trace_id}', traceId)
      .replaceAll('{workspace_id}', workspaceId || '')
      .replaceAll('{workspaceId}', workspaceId || '');
  }
  const cfg = getTraceConfigFromEnv();
  const base = cfg.apiUrl.replace(/\/$/, '');
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  return `${base}/traces/${encodeURIComponent(traceId)}${query}`;
}

export function buildTracePropagationHeaders(identity: TraceIdentity): Record<string, string> {
  const normalized = normalizeTraceIdentity(identity);
  const headers: Record<string, string> = {};
  const assign = (key: string, value?: string) => {
    if (!value) return;
    headers[key] = value;
  };
  assign('x-trace-id', normalized.trace_id);
  assign('x-sdk-trace-id', normalized.sdk_trace_id);
  assign('x-local-trace-id', normalized.local_trace_id);
  assign('x-thread-id', normalized.thread_id);
  assign('x-conversation-id', normalized.conversation_id);
  assign('x-message-id', normalized.message_id);
  assign('x-turn-id', normalized.turn_id);
  assign('x-task-id', normalized.task_id);
  assign('x-run-id', normalized.run_id);
  assign('x-env', normalized.env);
  assign('x-app', normalized.app);
  assign('x-module', normalized.module);
  assign('x-user-role', normalized.user_role);
  return headers;
}

export function truncate(str: string, max: number): string {
  return (!str || str.length <= max) ? str : str.slice(0, max) + '...[truncated]';
}
