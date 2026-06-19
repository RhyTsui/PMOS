/**
 * Trace Span Hook
 *
 * RunnerHook 实现：在 lifecycle 事件上自动创建/完成 span。
 *
 * 功能：
 * - onStageStart → 创建 stage span，记录到 run span 之下
 * - onStageEnd   → 完成 stage span（设 ended_at + status）
 * - onToolStart  → 创建 tool span，记录到当前 stage span 之下
 * - onToolEnd    → 完成 tool span
 * - onLlmStart   → 创建 llm span，记录到当前 stage span 之下
 * - onLlmEnd     → 完成 llm span
 * - onError      → 标记当前 span 为 error
 *
 * 所有 span 存储在本 hook 实例内部，可通过 getSpans() 获取完整 span 树，
 * 用于 trace 发送或 Admin 展示。
 */

import type {
  RunHooks,
  RunnerHookContext,
  RunnerStageStartPayload,
  RunnerStageEndPayload,
  RunnerToolStartPayload,
  RunnerToolEndPayload,
  RunnerLlmStartPayload,
  RunnerLlmEndPayload,
  RunnerErrorPayload,
} from '@/contracts/observability/runner-hooks';
import {
  createRunSpanMeta,
  createStageSpanMeta,
  createOperationSpanMeta,
  completeSpanMeta,
  type StandardTraceMeta,
  type TraceSpanKind,
} from '@/lib/trace';

export class TraceSpanHook implements RunHooks {
  readonly name = 'trace-span';

  private runSpan: StandardTraceMeta | null = null;
  private currentStageSpan: StandardTraceMeta | null = null;
  private readonly spans: StandardTraceMeta[] = [];

  constructor(params: { traceId: string; startedAt: string }) {
    this.runSpan = createRunSpanMeta({ traceId: params.traceId, startedAt: params.startedAt });
    this.spans.push(this.runSpan);
  }

  getRunSpan(): StandardTraceMeta | null {
    return this.runSpan;
  }

  getCurrentStageSpan(): StandardTraceMeta | null {
    return this.currentStageSpan;
  }

  /**
   * 获取所有已创建的 span（按时间顺序）。
   * 在 run 结束时用于 trace 发送。
   */
  getSpans(): readonly StandardTraceMeta[] {
    return this.spans;
  }

  /**
   * 完成 run span。应在整个请求结束时调用。
   */
  completeRun(status: 'ok' | 'error' = 'ok'): void {
    if (!this.runSpan) return;
    this.runSpan = completeSpanMeta(this.runSpan, status);
    // 替换 spans 数组中的 run span
    const index = this.spans.findIndex((s) => s.span_id === this.runSpan?.span_id);
    if (index >= 0) {
      this.spans[index] = this.runSpan;
    }
  }

  async onStageStart(payload: RunnerStageStartPayload, ctx: RunnerHookContext): Promise<void> {
    if (!this.runSpan?.span_id) return;
    this.currentStageSpan = createStageSpanMeta({
      traceId: ctx.traceId,
      parentSpanId: this.runSpan.span_id,
      stage: payload.stage,
      startedAt: new Date().toISOString(),
    });
    this.spans.push(this.currentStageSpan);
  }

  async onStageEnd(payload: RunnerStageEndPayload, _ctx: RunnerHookContext): Promise<void> {
    if (!this.currentStageSpan) return;
    const status = payload.status === 'ok' ? 'ok' : 'error';
    this.currentStageSpan = completeSpanMeta(this.currentStageSpan, status);
    const index = this.spans.findIndex((s) => s.span_id === this.currentStageSpan?.span_id);
    if (index >= 0) {
      this.spans[index] = this.currentStageSpan;
    }
  }

  async onToolStart(payload: RunnerToolStartPayload, ctx: RunnerHookContext): Promise<void> {
    const parentSpanId = this.currentStageSpan?.span_id ?? this.runSpan?.span_id;
    if (!parentSpanId) return;
    const span = createOperationSpanMeta({
      traceId: ctx.traceId,
      parentSpanId,
      kind: 'tool',
      name: payload.toolName,
      startedAt: new Date().toISOString(),
    });
    this.spans.push(span);
  }

  async onToolEnd(payload: RunnerToolEndPayload, _ctx: RunnerHookContext): Promise<void> {
    // 找到最近的同名未结束 tool span
    const toolSpanIndex = this.findLastUnfinishedSpan('tool', `tool:${payload.toolName}`);
    if (toolSpanIndex < 0) return;
    const span = this.spans[toolSpanIndex];
    this.spans[toolSpanIndex] = completeSpanMeta(span, payload.status === 'ok' ? 'ok' : 'error');
  }

  async onLlmStart(payload: RunnerLlmStartPayload, ctx: RunnerHookContext): Promise<void> {
    const parentSpanId = this.currentStageSpan?.span_id ?? this.runSpan?.span_id;
    if (!parentSpanId) return;
    const span = createOperationSpanMeta({
      traceId: ctx.traceId,
      parentSpanId,
      kind: 'llm',
      name: payload.useCase,
      startedAt: new Date().toISOString(),
    });
    this.spans.push(span);
  }

  async onLlmEnd(payload: RunnerLlmEndPayload, _ctx: RunnerHookContext): Promise<void> {
    const llmSpanIndex = this.findLastUnfinishedSpan('llm', `llm:${payload.useCase}`);
    if (llmSpanIndex < 0) return;
    const span = this.spans[llmSpanIndex];
    this.spans[llmSpanIndex] = completeSpanMeta(span, payload.status === 'ok' ? 'ok' : 'error');
  }

  async onError(payload: RunnerErrorPayload, _ctx: RunnerHookContext): Promise<void> {
    // 标记当前 stage span 为 error
    if (this.currentStageSpan) {
      this.currentStageSpan = {
        ...this.currentStageSpan,
        status_code: 'error',
      };
    }
  }

  private findLastUnfinishedSpan(kind: TraceSpanKind, namePrefix: string): number {
    for (let i = this.spans.length - 1; i >= 0; i--) {
      const span = this.spans[i];
      if (span.span_kind === kind && span.span_name?.startsWith(namePrefix) && !span.span_ended_at) {
        return i;
      }
    }
    return -1;
  }
}
