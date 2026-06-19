const MIN_TITLE_LENGTH = 2;
const MAX_TITLE_LENGTH = 14;
const FALLBACK_TITLE = '新对话';

const PLACEHOLDER_TITLES = new Set([
  FALLBACK_TITLE,
  '新会话',
  '未命名会话',
]);

const FORBIDDEN_PHRASES = [
  '如何',
  '帮我',
  '研究',
  '讨论',
  '优化一个',
  '设计',
  '方案',
  '需求',
  '查看',
  '当前',
  '默认',
  '给',
  '并结合',
  '并',
  '结合',
  '今天',
  '现在',
  '最近',
  '请',
  '看看',
  '查询',
  '分析',
  '一个',
];

export interface NormalizeConversationTitleOptions {
  truncate?: boolean;
}

function trimTitleEdge(value: string) {
  return value
    .replace(/^["'“”‘’【】[\]()（）<>\s]+|["'“”‘’【】[\]()（）<>\s]+$/g, '')
    .replace(/^(?:标题|会话标题|生成标题)\s*[:：]\s*/i, '')
    .replace(/[。！？、，,；;:.·!?\-~\s]+$/g, '')
    .trim();
}

function removeForbiddenPhrases(value: string) {
  return FORBIDDEN_PHRASES.reduce((next, phrase) => next.replaceAll(phrase, ''), value);
}

function sanitizeTitle(value: string) {
  return trimTitleEdge(removeForbiddenPhrases(value))
    .replace(/^\d+[.、\s-]+/, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function toChars(value: string) {
  return Array.from(value);
}

function truncateByLength(value: string, maxLength: number) {
  return toChars(value).slice(0, maxLength).join('');
}

function normalizeCandidate(value: string, options: NormalizeConversationTitleOptions = {}) {
  const firstLine = value
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) || '';
  const clean = sanitizeTitle(firstLine);
  const clipped = options.truncate === false
    ? (clean || FALLBACK_TITLE)
    : truncateByLength(clean || FALLBACK_TITLE, MAX_TITLE_LENGTH);
  const trimmed = trimTitleEdge(clipped) || FALLBACK_TITLE;
  if (toChars(trimmed).length < MIN_TITLE_LENGTH) return FALLBACK_TITLE;
  return trimmed;
}

export function normalizeConversationTitle(input?: string, _options: NormalizeConversationTitleOptions = {}) {
  return normalizeCandidate(input || '', _options);
}

export function isPlaceholderConversationTitle(input?: string) {
  const value = sanitizeTitle(input || '');
  return !value || PLACEHOLDER_TITLES.has(value);
}
