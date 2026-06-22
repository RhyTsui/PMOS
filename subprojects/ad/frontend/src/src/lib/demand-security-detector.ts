/**
 * Demand Security Detector（P0 最小实现）
 *
 * 检测用户消息中是否包含敏感凭证模式（Key、Secret、Token、密码明文）。
 * 检测模式通过配置驱动，不硬编码业务样例。
 */

export type SecurityFindingType = 'api_key' | 'secret' | 'token' | 'password';

export interface SecurityFinding {
  type: SecurityFindingType;
  hint: string;
}

interface SecurityPattern {
  pattern: RegExp;
  type: SecurityFindingType;
  hint: string;
}

/**
 * 默认安全检测模式（通用模式，不含业务词）。
 * 可通过 runtime config 扩展。
 */
const DEFAULT_SECURITY_PATTERNS: SecurityPattern[] = [
  {
    pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*\S+/i,
    type: 'api_key',
    hint: '检测到 API Key 明文，请通过安全授权流程提交。',
  },
  {
    pattern: /(?:secret|密钥)\s*[:=]\s*\S+/i,
    type: 'secret',
    hint: '检测到 Secret 明文，请通过安全授权流程提交。',
  },
  {
    pattern: /(?:token|bearer)\s+[\w.-]{20,}/i,
    type: 'token',
    hint: '检测到 Token 明文，请通过安全授权流程提交。',
  },
  {
    pattern: /(?:password|密码)\s*[:=]\s*\S+/i,
    type: 'password',
    hint: '检测到密码明文，请通过安全授权流程提交。',
  },
];

export function detectSecuritySensitiveContent(message: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const entry of DEFAULT_SECURITY_PATTERNS) {
    if (entry.pattern.test(message)) {
      findings.push({ type: entry.type, hint: entry.hint });
    }
  }
  return findings;
}
