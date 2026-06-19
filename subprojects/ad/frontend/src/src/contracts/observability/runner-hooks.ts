/**
 * Runner Lifecycle Hooks Contract
 *
 * 参照 OpenAI Agents SDK 的 RunHooks + AgentHooks 模式，
 * 定义 Chat Runtime Runner 的生命周期钩子接口。
 *
 * 设计原则：
 * 1. Hook 不改变主链路行为——只观测、不拦截（Stage 0）
 * 2. Hook 抛错不影响主链路（fail-open）
 * 3. Hook 可异步（返回 Promise）
 * 4. Hook 可注册多个，按注册顺序依次调用
 *
 * Stage 0 仅实现观测型 hooks。
 * 后续 Stage 2 将引入 guardrail hook（可 tripwire 中断）。
 */

import type { RunnerStage } from '@/lib/runner-lifecycle';

// ─── Hook Context ────────────────────────────────────────

/**
 * Hook 上下文，每次 hook 调用都携带。
 * 包含当前 run 的身份信息和当前 stage。
 */
export interface RunnerHookContext {
  /** 本次 run 的唯一标识 */
  traceId: string;
  /** 会话 ID */
  conversationId: string;
  /** 用户消息（glossary 归一化后） */
  message: string;
  /** 当前阶段 */
  stage: RunnerStage;
  /** run 开始时间 ISO */
  startedAt: string;
  /** 用户 scope key */
  userScopeKey?: string;
}

// ─── Hook Event Payloads ─────────────────────────────────

export interface RunnerStageStartPayload {
  stage: RunnerStage;
  label?: string;
}

export interface RunnerStageEndPayload {
  stage: RunnerStage;
  durationMs: number;
  status: 'ok' | 'error' | 'skipped';
  resultSummary?: Record<string, unknown>;
}

export interface RunnerToolStartPayload {
  toolName: string;
  serverName?: string;
  args: Record<string, unknown>;
  purpose?: string;
}

export interface RunnerToolEndPayload {
  toolName: string;
  serverName?: string;
  durationMs: number;
  status: 'ok' | 'error' | 'timeout' | 'blocked';
  errorCode?: string;
  resultSummary?: Record<string, unknown>;
}

export interface RunnerLlmStartPayload {
  useCase: string;
  modelName?: string;
  promptVariables?: Record<string, unknown>;
}

export interface RunnerLlmEndPayload {
  useCase: string;
  modelName?: string;
  durationMs: number;
  status: 'ok' | 'error' | 'timeout' | 'empty_response';
  outputLength?: number;
  participation?: Record<string, unknown>;
}

export interface RunnerErrorPayload {
  stage: RunnerStage;
  errorCode: string;
  message: string;
  fatal: boolean;
}

// ─── RunHooks Interface ──────────────────────────────────

/**
 * Runner 生命周期钩子接口。
 *
 * 所有方法都是可选的。未实现的方法会被跳过。
 * 方法可以返回 void 或 Promise<void>。
 * Hook 内部抛错会被 RunnerHookRunner 捕获并记录，不向上传播。
 */
export interface RunHooks {
  /** Hook 名称，用于日志和 trace */
  readonly name: string;

  /** 阶段开始 */
  onStageStart?(payload: RunnerStageStartPayload, ctx: RunnerHookContext): void | Promise<void>;

  /** 阶段结束 */
  onStageEnd?(payload: RunnerStageEndPayload, ctx: RunnerHookContext): void | Promise<void>;

  /** 工具调用开始 */
  onToolStart?(payload: RunnerToolStartPayload, ctx: RunnerHookContext): void | Promise<void>;

  /** 工具调用结束 */
  onToolEnd?(payload: RunnerToolEndPayload, ctx: RunnerHookContext): void | Promise<void>;

  /** LLM 调用开始 */
  onLlmStart?(payload: RunnerLlmStartPayload, ctx: RunnerHookContext): void | Promise<void>;

  /** LLM 调用结束 */
  onLlmEnd?(payload: RunnerLlmEndPayload, ctx: RunnerHookContext): void | Promise<void>;

  /** 错误发生 */
  onError?(payload: RunnerErrorPayload, ctx: RunnerHookContext): void | Promise<void>;
}

// ─── Hook Runner ─────────────────────────────────────────

/**
 * Hook 执行器，管理多个 RunHooks 的注册和调用。
 *
 * 设计：
 * - 按注册顺序依次调用 hooks
 * - 单个 hook 抛错不影响其他 hooks
 * - 支持 async hooks（用 Promise.allSettled）
 */
export class RunnerHookRunner {
  private readonly hooks: RunHooks[] = [];

  register(hook: RunHooks): void {
    this.hooks.push(hook);
  }

  getRegisteredHooks(): readonly RunHooks[] {
    return this.hooks;
  }

  async invokeStageStart(payload: RunnerStageStartPayload, ctx: RunnerHookContext): Promise<void> {
    await this.invokeAll('onStageStart', payload, ctx);
  }

  async invokeStageEnd(payload: RunnerStageEndPayload, ctx: RunnerHookContext): Promise<void> {
    await this.invokeAll('onStageEnd', payload, ctx);
  }

  async invokeToolStart(payload: RunnerToolStartPayload, ctx: RunnerHookContext): Promise<void> {
    await this.invokeAll('onToolStart', payload, ctx);
  }

  async invokeToolEnd(payload: RunnerToolEndPayload, ctx: RunnerHookContext): Promise<void> {
    await this.invokeAll('onToolEnd', payload, ctx);
  }

  async invokeLlmStart(payload: RunnerLlmStartPayload, ctx: RunnerHookContext): Promise<void> {
    await this.invokeAll('onLlmStart', payload, ctx);
  }

  async invokeLlmEnd(payload: RunnerLlmEndPayload, ctx: RunnerHookContext): Promise<void> {
    await this.invokeAll('onLlmEnd', payload, ctx);
  }

  async invokeError(payload: RunnerErrorPayload, ctx: RunnerHookContext): Promise<void> {
    await this.invokeAll('onError', payload, ctx);
  }

  private async invokeAll(
    methodName: keyof Omit<RunHooks, 'name'>,
    payload: unknown,
    ctx: RunnerHookContext,
  ): Promise<void> {
    for (const hook of this.hooks) {
      const method = hook[methodName] as ((...args: unknown[]) => void | Promise<void>) | undefined;
      if (!method) continue;
      try {
        await method.call(hook, payload, ctx);
      } catch (error) {
        // Fail-open: hook 错误不传播
        console.warn(
          `[RunnerHook] hook "${hook.name}" method "${methodName}" threw:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }
}

/**
 * 创建 RunnerHookRunner 实例。
 */
export function createRunnerHookRunner(hooks?: RunHooks[]): RunnerHookRunner {
  const runner = new RunnerHookRunner();
  if (hooks) {
    for (const hook of hooks) {
      runner.register(hook);
    }
  }
  return runner;
}
