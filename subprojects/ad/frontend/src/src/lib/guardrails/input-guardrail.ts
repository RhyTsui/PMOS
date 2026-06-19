/**
 * Input Guardrail — 用户输入防护
 *
 * 在理解阶段前运行，检查：
 * 1. PII 模式（身份证 / 手机号 / 邮箱等敏感个人信息）
 * 2. 明显的 prompt injection 模式
 * 3. 极端长度消息（可能是攻击）
 *
 * tripwire 触发：PII 或明确 injection 模式 → 中断请求
 *
 * Stage 0 实现：基于正则的规则检查。
 * 后续可接入 LLM 分类器做更精细的判断。
 */

import type {
  GuardrailFinding,
  GuardrailResult,
  InputGuardrail,
  InputGuardrailInput,
} from '@/contracts/validation/guardrail-contract';

const MAX_MESSAGE_LENGTH = 10_000;

/**
 * PII 模式检测：中国大陆身份证、手机号、邮箱
 */
const PII_PATTERNS: Array<{ code: string; pattern: RegExp; message: string }> = [
  {
    code: 'input_pii_china_id_card',
    pattern: /\b\d{17}[\dXx]\b/,
    message: '用户消息中包含疑似身份证号。',
  },
  {
    code: 'input_pii_china_phone',
    pattern: /\b1[3-9]\d{9}\b/,
    message: '用户消息中包含疑似手机号。',
  },
  {
    code: 'input_pii_email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    message: '用户消息中包含疑似邮箱地址。',
  },
];

/**
 * Prompt injection 模式检测（明显模式）
 */
const INJECTION_PATTERNS: Array<{ code: string; pattern: RegExp; message: string }> = [
  {
    code: 'input_injection_ignore_previous',
    pattern: /ignore\s+(all\s+)?previous\s+instructions/i,
    message: '检测到疑似 prompt injection：忽略之前指令。',
  },
  {
    code: 'input_injection_system_prompt_leak',
    pattern: /(show|reveal|output|print)\s+(your|the|my)\s+(system\s+)?prompt/i,
    message: '检测到疑似 prompt injection：尝试获取系统提示词。',
  },
  {
    code: 'input_injection_role_override',
    pattern: /you\s+are\s+now\s+(a|an)\s+/i,
    message: '检测到疑似 prompt injection：角色覆盖尝试。',
  },
];

export class InputGuardrailImpl implements InputGuardrail {
  readonly name = 'input-guardrail-basic';

  check(input: InputGuardrailInput): GuardrailResult {
    const startedAt = Date.now();
    const findings: GuardrailFinding[] = [];

    // 极端长度检查
    if (input.message.length > MAX_MESSAGE_LENGTH) {
      findings.push({
        code: 'input_too_long',
        message: `用户消息长度 ${input.message.length} 超过上限 ${MAX_MESSAGE_LENGTH}。`,
        severity: 'error',
        path: 'message',
        detected_at: new Date().toISOString(),
      });
    }

    // PII 检查
    for (const { code, pattern, message } of PII_PATTERNS) {
      if (pattern.test(input.message)) {
        findings.push({
          code,
          message,
          severity: 'error',
          path: 'message',
          detected_at: new Date().toISOString(),
        });
      }
    }

    // Injection 检查
    for (const { code, pattern, message } of INJECTION_PATTERNS) {
      if (pattern.test(input.message)) {
        findings.push({
          code,
          message,
          severity: 'error',
          path: 'message',
          detected_at: new Date().toISOString(),
        });
      }
    }

    const tripwire = findings.some((f) => f.severity === 'error');
    return {
      layer: 'input',
      tripwire_triggered: tripwire,
      findings,
      tripwire_reason: tripwire ? findings.find((f) => f.severity === 'error')?.code : undefined,
      duration_ms: Date.now() - startedAt,
      checked_at: new Date().toISOString(),
    };
  }
}
