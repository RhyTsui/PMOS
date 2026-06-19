/**
 * Guarded Tool Call — 工具调用通用包装器
 *
 * 参照 OpenAI Agents SDK 的 Tool Guardrail 模式：
 * - 工具调用前运行 Input Guardrail（参数合规性）
 * - 工具调用后运行 Output Guardrail（结果安全性）
 * - 支持基于 capability manifest 的 guardrail 强度分级
 *
 * 设计原则：
 * 1. 所有工具调用走同一个包装器，规则一致
 * 2. 返回结果包含 input/output check，可附加到 trace
 * 3. tripwire 触发时抛出 ToolBlockedError，由调用方决定处理策略
 * 4. 扩展性：后续加新规则只改 ToolGuardrailImpl
 */

import { ToolGuardrailImpl } from '@/lib/guardrails/tool-guardrail';
import type { GuardrailResult, ToolGuardrail } from '@/contracts/validation/guardrail-contract';

// ─── Types ───────────────────────────────────────────────

export type GuardrailStrength = 'basic' | 'moderate' | 'strict';

export interface GuardedToolCallInput<T> {
  /** 工具名称（用于日志和 trace） */
  toolName: string;
  /** 服务名称（可选） */
  serverName?: string;
  /** 工具参数 */
  args: Record<string, unknown>;
  /** 工具用途（可选，用于 guardrail 强度选择） */
  purpose?: string;
  /** 风险等级（可选，来自 capability manifest） */
  riskLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  /** 执行类别（可选，来自 capability manifest） */
  executionClass?: 'read_only' | 'write' | 'workflow' | 'diagnostic';
  /** 实际执行函数 */
  execute: () => Promise<T>;
  /** 自定义 ToolGuardrail（可选，默认使用 ToolGuardrailImpl） */
  guardrail?: ToolGuardrail;
  /** 跳过 input guardrail（默认 false） */
  skipInputCheck?: boolean;
  /** 跳过 output guardrail（默认 false） */
  skipOutputCheck?: boolean;
}

export interface GuardedToolCallOutput<T> {
  /** 工具执行结果 */
  result: T;
  /** Input guardrail 结果（如有） */
  inputCheck?: GuardrailResult;
  /** Output guardrail 结果（如有） */
  outputCheck?: GuardrailResult;
  /** 总耗时 ms（含 guardrail） */
  totalDurationMs: number;
}

/**
 * Tool Blocked Error — guardrail tripwire 触发时抛出。
 */
export class ToolBlockedError extends Error {
  readonly guardrailResult: GuardrailResult;
  readonly phase: 'input' | 'output';

  constructor(phase: 'input' | 'output', result: GuardrailResult) {
    super(`Tool blocked by ${phase} guardrail: ${result.tripwire_reason || 'unknown'}`);
    this.name = 'ToolBlockedError';
    this.guardrailResult = result;
    this.phase = phase;
  }
}

// ─── Guardrail Strength ──────────────────────────────────

/**
 * 根据 capability manifest 推断 guardrail 强度。
 *
 * - critical/high risk 或 write/workflow → strict
 * - medium risk 或 diagnostic → moderate
 * - 其他 → basic
 */
export function inferGuardrailStrength(params: {
  riskLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  executionClass?: 'read_only' | 'write' | 'workflow' | 'diagnostic';
}): GuardrailStrength {
  const risk = params.riskLevel || 'none';
  const exec = params.executionClass || 'read_only';

  if (risk === 'critical' || risk === 'high' || exec === 'write' || exec === 'workflow') {
    return 'strict';
  }
  if (risk === 'medium' || exec === 'diagnostic') {
    return 'moderate';
  }
  return 'basic';
}

// ─── Main ────────────────────────────────────────────────

/**
 * 包装工具调用，自动运行 input/output guardrail。
 *
 * @throws ToolBlockedError guardrail tripwire 触发时
 *
 * @example
 * ```typescript
 * const { result, inputCheck, outputCheck } = await runGuardedToolCall({
 *   toolName: 'get_zt_ad_day_report',
 *   serverName: 'report_mcp',
 *   args: { app_id: '10001', date_range: 'yesterday' },
 *   riskLevel: 'low',
 *   executionClass: 'read_only',
 *   execute: () => callConfiguredMcpTool(server, tool, args),
 * });
 * ```
 */
export async function runGuardedToolCall<T>(
  input: GuardedToolCallInput<T>,
): Promise<GuardedToolCallOutput<T>> {
  const startedAt = Date.now();
  const guardrail = input.guardrail ?? new ToolGuardrailImpl();
  const strength = inferGuardrailStrength({
    riskLevel: input.riskLevel,
    executionClass: input.executionClass,
  });

  // ─── Input Guardrail ───────────────────────────────
  let inputCheck: GuardrailResult | undefined;
  if (!input.skipInputCheck && guardrail.checkInput) {
    inputCheck = await guardrail.checkInput({
      toolName: input.toolName,
      serverName: input.serverName,
      args: input.args,
      purpose: input.purpose,
    });

    if (inputCheck?.tripwire_triggered) {
      throw new ToolBlockedError('input', inputCheck);
    }
  }

  // ─── Execute ───────────────────────────────────────
  const result = await input.execute();

  // ─── Output Guardrail ──────────────────────────────
  let outputCheck: GuardrailResult | undefined;
  if (!input.skipOutputCheck && guardrail.checkOutput) {
    outputCheck = await guardrail.checkOutput({
      toolName: input.toolName,
      serverName: input.serverName,
      result,
      durationMs: Date.now() - startedAt,
      status: 'ok',
    });

    if (outputCheck?.tripwire_triggered) {
      throw new ToolBlockedError('output', outputCheck);
    }
  }

  return {
    result,
    inputCheck,
    outputCheck,
    totalDurationMs: Date.now() - startedAt,
  };
}

/**
 * 安全版本：tripwire 触发时不抛错，返回 blocked 标记。
 * 适用于不希望中断主链的场景（如 planner shadow 观测）。
 */
export async function runGuardedToolCallSafe<T>(
  input: GuardedToolCallInput<T>,
): Promise<GuardedToolCallOutput<T> & { blocked: boolean; blockedPhase?: 'input' | 'output' }> {
  try {
    const output = await runGuardedToolCall(input);
    return { ...output, blocked: false };
  } catch (error) {
    if (error instanceof ToolBlockedError) {
      return {
        result: undefined as unknown as T,
        inputCheck: error.phase === 'input' ? error.guardrailResult : undefined,
        outputCheck: error.phase === 'output' ? error.guardrailResult : undefined,
        totalDurationMs: 0,
        blocked: true,
        blockedPhase: error.phase,
      };
    }
    throw error;
  }
}
