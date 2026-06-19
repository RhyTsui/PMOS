/**
 * Field Definition Resolver
 *
 * 识别字段/值解释类问题的语义信号。
 *
 * Stage 1 (task 1.7) 升级：
 * 优先通过 Schema Registry 查找字段定义，禁止 LLM 凭经验回答。
 * 仅在 Schema Registry 未命中时 fallback 到正则模式匹配。
 *
 * 区分：
 * - "素材报表的未知是什么" → targetObject=素材报表, targetTerm=未知, termRole=field_name
 * - "未知是什么意思" → targetTerm=未知, termRole=unknown, requiresClarification=true
 * - "为什么素材显示未知" → not matched（诊断/字段值解释，不应拦截）
 * - "今天素材报表的数据" → not matched（普通查数）
 */

import { findFieldDefinitionsByLabelOrSynonym, type FieldDefinition } from './schema-registry';

export type TermRole = 'field_name' | 'field_value' | 'unknown';

export interface FieldDefinitionSignal {
  matched: boolean;
  targetObject?: string;
  targetTerm?: string;
  termRole: TermRole;
  requiresClarification: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  /** Stage 1: Schema Registry 匹配到的字段定义（如有）。 */
  registryMatches?: FieldDefinition[];
}

const NO_SIGNAL: FieldDefinitionSignal = {
  matched: false,
  termRole: 'unknown',
  requiresClarification: false,
  confidence: 'low',
  reason: 'no_field_definition_signal',
};

/**
 * 主检测函数。
 *
 * 按优先级匹配：
 * 0. Schema Registry 查找（最高优先级，禁止 LLM 凭经验回答）
 * 1. 诊断类问题 → 不匹配（为什么 X 显示/变成 Y）
 * 2. 带对象的字段解释 → 高置信度
 * 3. 仅有术语的解释 → 中置信度，需追问
 */
export function detectFieldDefinitionSignal(message: string): FieldDefinitionSignal {
  // Preserve original text (with spaces) for term extraction
  const originalText = message.trim();
  if (!originalText) return NO_SIGNAL;

  // ─── Stage 1: 优先通过 Schema Registry 查找 ───────────
  // 从消息中提取可能的字段/指标/维度名称，查 Schema Registry
  const registryMatches = findFieldDefinitionsByLabelOrSynonym(originalText);
  if (registryMatches.length > 0) {
    const bestMatch = registryMatches[0];
    return {
      matched: true,
      targetTerm: bestMatch.label,
      termRole: 'field_name',
      requiresClarification: registryMatches.length > 1,
      confidence: 'high',
      reason: `schema_registry_match:${bestMatch.key}`,
      registryMatches,
    };
  }

  // Collapsed text for pattern matching (to handle space variations)
  const text = originalText.replace(/\s+/g, '');

  // Pattern 0: 诊断类排除 — "为什么 X 显示/变成 Y"
  // 这类问题应进入诊断或字段值解释，不应一律当字段名解释
  if (/^(?:为什么|为啥).*(?:显示|变成|变为|成了|是).+/.test(text)) {
    return {
      ...NO_SIGNAL,
      reason: 'diagnostic_pattern_excluded',
    };
  }

  // Pattern 1: <object> 的 <term> 是什么/什么意思/怎么理解
  // 高置信度：有明确对象和术语
  // 排除：对象中包含动词（查/统计/看/导出等）→ 这是查数意图
  // 注意：长匹配放前面（"什么意思" 在 "是什么" 前面），避免 "是什么意思" 被错误拆分
  const objectFieldPattern = /^(.{2,15}?)的(.{1,12}?)(?:是什么意思|什么意思|是什么|怎么理解|怎么计算|怎么定义|什么含义|的含义|的口径|的定义|怎么算)$/;
  const objectFieldMatch = objectFieldPattern.exec(text);
  if (objectFieldMatch) {
    const candidateObject = objectFieldMatch[1];
    const candidateTerm = objectFieldMatch[2];

    // 排除对象部分含查数动词的情况
    if (/(?:查|统计|看|导出|拉取|下载|分析|查询|生成)/.test(candidateObject)) {
      return NO_SIGNAL;
    }

    // 排除术语部分是纯数字/日期
    if (/^\d+$/.test(candidateTerm)) {
      return NO_SIGNAL;
    }

    return {
      matched: true,
      targetObject: candidateObject,
      targetTerm: candidateTerm,
      termRole: 'field_name',
      requiresClarification: false,
      confidence: 'high',
      reason: 'object_field_definition_pattern',
    };
  }

  // Pattern 2: <term> 是什么/什么意思（缺少对象）
  // 中置信度：有术语但无对象，需追问
  // 排除：术语前含动词（查/统计等）
  // 长匹配优先："是什么意思" > "什么意思" > "是什么"，避免 "是什么意思" 被错误拆分
  const termOnlyPattern = /^(.{1,12}?)(?:是什么意思|什么意思|是什么|怎么理解|怎么算|什么含义|的口径|的定义)$/;
  const termOnlyMatch = termOnlyPattern.exec(text);
  if (termOnlyMatch) {
    const candidateTerm = termOnlyMatch[1];

    // 排除含查数动词
    if (/(?:查|统计|看|导出|拉取|下载|分析|查询|生成|帮我|帮)/.test(candidateTerm)) {
      return NO_SIGNAL;
    }

    // 排除纯数字
    if (/^\d+$/.test(candidateTerm)) {
      return NO_SIGNAL;
    }

    return {
      matched: true,
      targetTerm: candidateTerm,
      termRole: 'unknown',
      requiresClarification: true,
      confidence: 'medium',
      reason: 'term_only_definition_pattern_requires_clarification',
    };
  }

  return NO_SIGNAL;
}
