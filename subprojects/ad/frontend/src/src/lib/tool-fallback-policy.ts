/**
 * Tool Fallback Policy — 工具失败处理策略
 *
 * 迭代条目：#75-81
 *
 * 设计原则：
 * 1. 不同的 failure mode 有不同的处理策略
 * 2. permission_blocked 永不 fallback，直接提示权限问题
 * 3. unsupported_project 允许 fallback 到其他能力或工具
 * 4. empty_data 支持 fallback 或返回空数据说明
 * 5. business_failed 按 inner code 分类归一化
 * 6. schema_mismatch 不执行工具，进入 contract error
 *
 * Stage 0 实现：基于 failure_mode 的策略查询。
 */

// ─── Types ───────────────────────────────────────────────

/**
 * 工具失败模式。
 */
export type ToolFailureMode =
  | 'permission_blocked'     // 权限不足（不 fallback）
  | 'unsupported_project'    // 项目/应用不支持（允许 fallback）
  | 'empty_data'             // 空结果（允许 fallback 或返回空说明）
  | 'business_failed'        // 业务失败（按 inner code 归一）
  | 'schema_mismatch'        // 输出契约不匹配（不执行，进 contract error）
  | 'tool_unavailable'       // 工具不可用
  | 'timeout';               // 超时

/**
 * fallback 决策。
 */
export type FallbackDecision =
  | 'block'                  // 阻断（不执行，不 fallback）
  | 'retry'                  // 重试（同一工具，带不同参数）
  | 'fallback_to_other'      // fallback 到其他能力/工具
  | 'return_empty'           // 返回空数据说明
  | 'contract_error';        // 进入契约错误（不执行）

/**
 * fallback 策略结果。
 */
export interface FallbackPolicyResult {
  failure_mode: ToolFailureMode;
  decision: FallbackDecision;
  /** 是否允许 fallback */
  fallback_allowed: boolean;
  /** 用户可见消息 */
  user_message?: string;
  /** 内部错误码 */
  inner_code?: string;
  /** 策略原因 */
  reason: string;
}

// ─── Policy Table ────────────────────────────────────────

const POLICY_TABLE: Record<ToolFailureMode, Omit<FallbackPolicyResult, 'failure_mode' | 'inner_code'>> = {
  permission_blocked: {
    decision: 'block',
    fallback_allowed: false,
    user_message: '当前账号缺少该操作权限，请联系管理员。',
    reason: '权限阻断 — 不允许 fallback',
  },
  unsupported_project: {
    decision: 'fallback_to_other',
    fallback_allowed: true,
    user_message: '当前项目不支持该工具，尝试其他能力。',
    reason: '项目不支持 — 允许 fallback 到其他能力',
  },
  empty_data: {
    decision: 'return_empty',
    fallback_allowed: true,
    user_message: '查询成功但结果为空。',
    reason: '空结果 — 可 fallback 或返回空说明',
  },
  business_failed: {
    decision: 'retry',
    fallback_allowed: true,
    reason: '业务失败 — 按 inner code 决定是否 fallback',
  },
  schema_mismatch: {
    decision: 'contract_error',
    fallback_allowed: false,
    user_message: '工具返回结果与预期契约不匹配。',
    reason: '契约不匹配 — 不执行，进入 contract error',
  },
  tool_unavailable: {
    decision: 'fallback_to_other',
    fallback_allowed: true,
    user_message: '该工具当前不可用。',
    reason: '工具不可用 — 允许 fallback',
  },
  timeout: {
    decision: 'retry',
    fallback_allowed: true,
    user_message: '工具调用超时，请稍后重试。',
    reason: '超时 — 允许重试或 fallback',
  },
};

// ─── Main ────────────────────────────────────────────────

/**
 * 根据 failure mode 查询 fallback 策略。
 */
export function resolveFallbackPolicy(
  failureMode: ToolFailureMode,
  innerCode?: string,
): FallbackPolicyResult {
  const policy = POLICY_TABLE[failureMode];
  return {
    failure_mode: failureMode,
    decision: policy.decision,
    fallback_allowed: policy.fallback_allowed,
    user_message: policy.user_message,
    inner_code: innerCode,
    reason: policy.reason,
  };
}

/**
 * 从工具输出推断 failure mode。
 */
export function inferFailureMode(toolResult: {
  status?: string;
  error_code?: string;
  error_message?: string;
}): ToolFailureMode {
  const status = String(toolResult.status || '').toLowerCase();
  const errorCode = String(toolResult.error_code || '').toLowerCase();

  if (/permission|forbidden|403/.test(errorCode) || /permission/.test(status)) return 'permission_blocked';
  if (/unsupported|not_supported|app_scope/.test(errorCode)) return 'unsupported_project';
  if (/empty|no_data/.test(status) || /empty/.test(errorCode)) return 'empty_data';
  if (/schema|contract|mismatch/.test(errorCode)) return 'schema_mismatch';
  if (/unavailable|not_found/.test(status) || /unavailable/.test(errorCode)) return 'tool_unavailable';
  if (/timeout|timed_out/.test(status) || /timeout/.test(errorCode)) return 'timeout';
  if (/failed|error/.test(status)) return 'business_failed';

  return 'business_failed';
}
