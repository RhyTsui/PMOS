/**
 * 思维链复杂度评估
 *
 * 根据消息特征评估复杂度，决定思维链投影深度。
 * 注意：所有层（Identify/Judge/Advance/Express）的计算始终全量执行，
 * 复杂度仅影响投影层的输出详细程度。
 *
 * 复杂度级别：
 * - low: 消息短小、无歧义、无缺字段 → 精简投影
 * - medium: 默认级别
 * - high: 多实体、URL、歧义 ≥ 2、缺字段 ≥ 3 → 全量投影
 */

export type ThinkingComplexity = 'low' | 'medium' | 'high';

export interface ComplexityInput {
  message: string;
  missingFieldCount?: number;
  ambiguityCount?: number;
  hasUrl?: boolean;
  hasMultipleEntities?: boolean;
}

/**
 * 评估思维链复杂度
 */
export function evaluateThinkingComplexity(input: ComplexityInput): ThinkingComplexity {
  const {
    message,
    missingFieldCount = 0,
    ambiguityCount = 0,
    hasUrl = false,
    hasMultipleEntities = false,
  } = input;

  // High complexity triggers
  if (hasUrl) return 'high';
  if (ambiguityCount >= 2) return 'high';
  if (missingFieldCount >= 3) return 'high';
  if (hasMultipleEntities) return 'high';

  // Low complexity triggers
  const trimmedMessage = message.trim();
  if (trimmedMessage.length <= 10 && missingFieldCount === 0 && ambiguityCount === 0) {
    return 'low';
  }

  // Default to medium
  return 'medium';
}

/**
 * 复杂度元数据（用于 trace 记录）
 */
export interface ComplexityMetadata {
  complexity: ThinkingComplexity;
  reasons: string[];
}

/**
 * 评估复杂度并返回详细原因
 */
export function evaluateComplexityWithReasons(input: ComplexityInput): ComplexityMetadata {
  const reasons: string[] = [];
  const complexity = evaluateThinkingComplexity(input);

  if (input.hasUrl) reasons.push('contains_url');
  if ((input.ambiguityCount || 0) >= 2) reasons.push('multiple_ambiguities');
  if ((input.missingFieldCount || 0) >= 3) reasons.push('many_missing_fields');
  if (input.hasMultipleEntities) reasons.push('multiple_entities');
  if (input.message.trim().length <= 10) reasons.push('short_message');
  if ((input.missingFieldCount || 0) === 0 && (input.ambiguityCount || 0) === 0) {
    reasons.push('no_gaps');
  }

  return { complexity, reasons };
}
