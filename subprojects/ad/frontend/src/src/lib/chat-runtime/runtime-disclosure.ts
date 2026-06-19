const LEGACY_UNDERSTANDING_LABELS = new Set(['正在理解问题', '正在理解请求']);
const LEGACY_RESULT_COMPOSING_LABELS = new Set(['正在整理回答', '正在生成回答']);
const LEGACY_NEUTRAL_LABELS = new Set(['正在调用能力', '正在处理']);
const LEGACY_TOOL_EXECUTING_LABELS = new Set(['正在获取广告数据', '正在获取数据', '正在获取信息', '正在定位原因', '正在校验历史规则与案例', '正在整理下一步建议']);
const LEGACY_CONTEXT_LABELS = new Set(['正在补充上下文', '正在读取上下文']);
const LEGACY_ENTITY_LABELS = new Set(['正在分析数据变化', '正在分析信息变化']);

export function cleanRuntimeLabel(value: string): string {
  const text = value.replace(/\.{3}|…/g, '').trim();
  if (LEGACY_UNDERSTANDING_LABELS.has(text)) return '准备执行';
  if (LEGACY_RESULT_COMPOSING_LABELS.has(text)) return '正在生成回答';
  if (LEGACY_NEUTRAL_LABELS.has(text)) return '';
  if (LEGACY_TOOL_EXECUTING_LABELS.has(text)) return '正在获取数据';
  if (LEGACY_CONTEXT_LABELS.has(text)) return '正在补充上下文';
  if (LEGACY_ENTITY_LABELS.has(text)) return '正在分析信息变化';
  return text;
}

export function formatDisclosureText(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
