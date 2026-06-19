/**
 * Tool Guardrail — 工具调用防护
 *
 * 在工具调用前后运行，检查：
 * - checkInput: 参数合规（禁止空字符串 appId / media_id，禁止注入 SQL/命令）
 * - checkOutput: 敏感信息过滤（禁止输出中包含 token/secret/password 模式）
 *
 * Stage 0 实现：基于规则的检查。
 */

import type {
  GuardrailFinding,
  GuardrailResult,
  ToolGuardrail,
  ToolGuardrailInputPayload,
  ToolGuardrailOutputPayload,
} from '@/contracts/validation/guardrail-contract';

/**
 * 工具输入参数中不允许为空的字段（针对广告业务场景）
 */
const REQUIRED_NON_EMPTY_PARAMS = ['app_id', 'appId', 'media_id', 'mediaId'];

/**
 * 工具输出中不允许出现的敏感模式
 */
const SENSITIVE_OUTPUT_PATTERNS: Array<{ code: string; pattern: RegExp; message: string }> = [
  {
    code: 'tool_output_secret_token',
    pattern: /(?:api[_-]?key|token|secret|password)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    message: '工具输出中包含疑似密钥或令牌。',
  },
  {
    code: 'tool_output_bearer_token',
    pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/,
    message: '工具输出中包含疑似 Bearer token。',
  },
];

export class ToolGuardrailImpl implements ToolGuardrail {
  readonly name = 'tool-guardrail-basic';

  checkInput(input: ToolGuardrailInputPayload): GuardrailResult {
    const startedAt = Date.now();
    const findings: GuardrailFinding[] = [];

    // 检查关键参数不为空字符串
    for (const paramName of REQUIRED_NON_EMPTY_PARAMS) {
      const value = input.args[paramName];
      if (value !== undefined && (value === '' || value === null)) {
        findings.push({
          code: 'tool_input_empty_required_param',
          message: `工具参数 ${paramName} 不允许为空字符串。`,
          severity: 'warning',
          path: `tool_args.${paramName}`,
          detected_at: new Date().toISOString(),
        });
      }
    }

    // 检查 SQL 注入模式
    const argsString = JSON.stringify(input.args);
    if (/(\bOR\b\s+\d+\s*=\s*\d+|\bUNION\b\s+\bSELECT\b|;\s*DROP\b\s+\bTABLE\b)/i.test(argsString)) {
      findings.push({
        code: 'tool_input_sql_injection_pattern',
        message: '工具参数中包含疑似 SQL 注入模式。',
        severity: 'error',
        path: 'tool_args',
        detected_at: new Date().toISOString(),
      });
    }

    const tripwire = findings.some((f) => f.severity === 'error');
    return {
      layer: 'tool',
      tripwire_triggered: tripwire,
      findings,
      tripwire_reason: tripwire ? findings.find((f) => f.severity === 'error')?.code : undefined,
      duration_ms: Date.now() - startedAt,
      checked_at: new Date().toISOString(),
    };
  }

  checkOutput(output: ToolGuardrailOutputPayload): GuardrailResult {
    const startedAt = Date.now();
    const findings: GuardrailFinding[] = [];

    if (output.status === 'ok' && output.result !== undefined) {
      const resultString = typeof output.result === 'string'
        ? output.result
        : JSON.stringify(output.result);

      for (const { code, pattern, message } of SENSITIVE_OUTPUT_PATTERNS) {
        if (pattern.test(resultString)) {
          findings.push({
            code,
            message,
            severity: 'error',
            path: `tool_result.${output.toolName}`,
            detected_at: new Date().toISOString(),
          });
        }
      }
    }

    const tripwire = findings.some((f) => f.severity === 'error');
    return {
      layer: 'tool',
      tripwire_triggered: tripwire,
      findings,
      tripwire_reason: tripwire ? findings.find((f) => f.severity === 'error')?.code : undefined,
      duration_ms: Date.now() - startedAt,
      checked_at: new Date().toISOString(),
    };
  }
}
