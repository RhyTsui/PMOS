/**
 * Guardrail Contract — 3 层防护
 *
 * 参照 OpenAI Agents SDK 的 Input / Tool / Output Guardrail 模式：
 *
 * 1. InputGuardrail   — 在理解阶段前运行（PII / prompt injection / 敏感话题）
 * 2. ToolGuardrail     — 在工具调用前后运行（参数合规 / 敏感信息过滤）
 * 3. OutputGuardrail   — 在答案输出前运行（证据断言 / 泄露检测 / 一致性）
 *
 * 每层都有 `tripwire_triggered` 熔断标记。tripwire 触发时，
 * Runner 必须中断请求，不得继续执行后续阶段。
 *
 * 设计原则：
 * - Guardrail 是薄校验层，不包含业务逻辑
 * - 每层可独立启用/禁用
 * - tripwire 是硬闸，不可绕过
 * - 多个 guardrail 可并行运行（不互相阻塞）
 */

// ─── Common Types ────────────────────────────────────────

/**
 * Guardrail 严重程度。
 * - `info`: 仅记录，不影响流程
 * - `warning`: 记录 + 标记降级
 * - `error`: tripwire 熔断，中断请求
 */
export type GuardrailSeverity = 'info' | 'warning' | 'error';

/**
 * Guardrail 层类型。
 */
export type GuardrailLayer = 'input' | 'tool' | 'output';

// ─── Guardrail Result ────────────────────────────────────

export interface GuardrailFinding {
  /** 唯一标识，用于日志和 Admin 展示 */
  code: string;
  /** 人类可读描述 */
  message: string;
  /** 严重程度 */
  severity: GuardrailSeverity;
  /** 关联字段路径（例如 'answer_markdown', 'tool_args.app_id'） */
  path?: string;
  /** 触发时间 ISO */
  detected_at: string;
}

export interface GuardrailResult {
  /** 所属层 */
  layer: GuardrailLayer;
  /** 是否触发熔断。tripwire 触发时，Runner 必须中断请求。 */
  tripwire_triggered: boolean;
  /** 所有发现 */
  findings: GuardrailFinding[];
  /** 熔断原因（仅当 tripwire_triggered=true 时） */
  tripwire_reason?: string;
  /** 运行耗时 ms */
  duration_ms: number;
  /** 执行时间 ISO */
  checked_at: string;
}

// ─── Input Guardrail ─────────────────────────────────────

export interface InputGuardrailInput {
  /** 用户消息（glossary 归一化后） */
  message: string;
  /** 对话历史（最近 N 条） */
  history?: Array<{ role: string; content: string }>;
  /** 用户 scope key */
  userScopeKey?: string;
}

export interface InputGuardrail {
  readonly name: string;
  check(input: InputGuardrailInput): Promise<GuardrailResult> | GuardrailResult;
}

// ─── Tool Guardrail ───────────────────────────────────────

export interface ToolGuardrailInputPayload {
  toolName: string;
  serverName?: string;
  args: Record<string, unknown>;
  purpose?: string;
}

export interface ToolGuardrailOutputPayload {
  toolName: string;
  serverName?: string;
  result: unknown;
  durationMs: number;
  status: 'ok' | 'error' | 'timeout' | 'blocked';
}

export interface ToolGuardrail {
  readonly name: string;
  checkInput?(input: ToolGuardrailInputPayload): Promise<GuardrailResult> | GuardrailResult;
  checkOutput?(output: ToolGuardrailOutputPayload): Promise<GuardrailResult> | GuardrailResult;
}

// ─── Output Guardrail ────────────────────────────────────

export interface OutputGuardrailInput {
  /** 最终 answer markdown */
  answer: string;
  /** ResultStatus */
  status: string;
  /** sourceRefs */
  sourceRefs: Array<{ source_type: string; [key: string]: unknown }>;
  /** evidenceRefs */
  evidenceRefs: string[];
  /** evidence mode */
  evidenceMode?: string;
  /** workflow result（如有） */
  workflowResult?: Record<string, unknown> | null;
  /** 完整 metadata（用于 raw params 泄露检查） */
  metadata?: Record<string, unknown>;
  /** planner shadow plan（如有）— 用于检查 shadow 伪装 */
  plannerShadowPlan?: Record<string, unknown> | null;
  /** evidence ledger（如有）— 用于检查工具结果改写反 */
  evidenceLedger?: unknown;
}

export interface OutputGuardrail {
  readonly name: string;
  check(input: OutputGuardrailInput): Promise<GuardrailResult> | GuardrailResult;
}

// ─── Guardrail Runner ────────────────────────────────────

/**
 * Guardrail 执行器，负责运行一层的所有 guardrail 并合并结果。
 */
export function mergeGuardrailResults(
  layer: GuardrailLayer,
  results: GuardrailResult[],
): GuardrailResult {
  const allFindings: GuardrailFinding[] = [];
  let tripwire = false;
  let tripwireReason: string | undefined;
  let maxDuration = 0;

  for (const result of results) {
    allFindings.push(...result.findings);
    if (result.tripwire_triggered) {
      tripwire = true;
      tripwireReason = result.tripwire_reason || `${result.findings[0]?.code || 'unknown'}`;
    }
    if (result.duration_ms > maxDuration) maxDuration = result.duration_ms;
  }

  return {
    layer,
    tripwire_triggered: tripwire,
    findings: allFindings,
    tripwire_reason: tripwireReason,
    duration_ms: maxDuration,
    checked_at: new Date().toISOString(),
  };
}
