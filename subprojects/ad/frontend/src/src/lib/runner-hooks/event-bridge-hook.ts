/**
 * Event Bridge Hook
 *
 * RunnerHook 实现：将 lifecycle hook 事件桥接到现有 AgentProcessEvent SSE 系统。
 *
 * 设计原则：
 * 1. 保持向后兼容：所有现有 SSE 消费方无需修改
 * 2. 不重复推送：hook 事件使用新 event type，不与现有 pushEvent 冲突
 * 3. fail-open：pushEvent 抛错不向上传播
 *
 * 桥接映射：
 * - onStageStart → createProcessEvent({ type: 'stage.started', ... })
 * - onStageEnd   → createProcessEvent({ type: 'stage.ended', ... })
 * - onToolStart  → 不桥接（现有 route.ts 仍自行推送 mcp.tool_call）
 * - onToolEnd    → 不桥接（现有 route.ts 仍自行推送 mcp.tool_result）
 * - onLlmStart   → 不桥接（现有 route.ts 仍自行推送 model.step）
 * - onLlmEnd     → 不桥接（现有 route.ts 仍自行推送 model.step）
 *
 * 注意：Stage 0 采用双写策略 — hook 推送 stage 事件，现有代码继续推送 tool/llm 事件。
 * 后续阶段逐步将 tool/llm 事件迁移到 hook 系统。
 */

import type {
  RunHooks,
  RunnerHookContext,
  RunnerStageStartPayload,
  RunnerStageEndPayload,
  RunnerErrorPayload,
} from '@/contracts/observability/runner-hooks';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import type { AgentProcessEvent } from '@/types';
import { RUNNER_STAGE_LABELS } from '@/lib/runner-lifecycle';

export interface EventBridgeHookOptions {
  /** 事件推送函数。通常是 route.ts 中的 pushEvent。 */
  pushEvent: (event: AgentProcessEvent) => void;
}

export class EventBridgeHook implements RunHooks {
  readonly name = 'event-bridge';
  private readonly pushEvent: (event: AgentProcessEvent) => void;

  constructor(options: EventBridgeHookOptions) {
    this.pushEvent = options.pushEvent;
  }

  async onStageStart(payload: RunnerStageStartPayload, _ctx: RunnerHookContext): Promise<void> {
    try {
      this.pushEvent(createProcessEvent({
        type: 'stage.started',
        label: `进入${RUNNER_STAGE_LABELS[payload.stage] || payload.stage}阶段`,
        summary: payload.label || `${payload.stage} 阶段开始。`,
        status: 'success',
        visibility: 'internal',
        output: {
          stage: payload.stage,
          stage_label: RUNNER_STAGE_LABELS[payload.stage] || payload.stage,
        },
      }));
    } catch {
      // fail-open
    }
  }

  async onStageEnd(payload: RunnerStageEndPayload, _ctx: RunnerHookContext): Promise<void> {
    try {
      this.pushEvent(createProcessEvent({
        type: 'stage.ended',
        label: `${RUNNER_STAGE_LABELS[payload.stage] || payload.stage}阶段完成`,
        summary: payload.status === 'ok'
          ? `${RUNNER_STAGE_LABELS[payload.stage] || payload.stage}阶段已完成（${payload.durationMs}ms）。`
          : `${RUNNER_STAGE_LABELS[payload.stage] || payload.stage}阶段异常结束（${payload.status}）。`,
        status: payload.status === 'ok' ? 'success' : 'error',
        visibility: 'internal',
        output: {
          stage: payload.stage,
          stage_label: RUNNER_STAGE_LABELS[payload.stage] || payload.stage,
          duration_ms: payload.durationMs,
          result_status: payload.status,
        },
      }));
    } catch {
      // fail-open
    }
  }

  async onError(payload: RunnerErrorPayload, _ctx: RunnerHookContext): Promise<void> {
    try {
      this.pushEvent(createProcessEvent({
        type: 'stage.error',
        label: `${RUNNER_STAGE_LABELS[payload.stage] || payload.stage}阶段错误`,
        summary: payload.message,
        status: 'error',
        visibility: payload.fatal ? 'user' : 'internal',
        output: {
          stage: payload.stage,
          error_code: payload.errorCode,
          fatal: payload.fatal,
        },
      }));
    } catch {
      // fail-open
    }
  }
}
