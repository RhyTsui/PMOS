const INLINE_SOURCE_HEADING_PATTERN = /^(关键信息来源|信息来源|来源|参考来源|数据来源)[:：]?$/;
const PUBLIC_WEB_INTRO_PATTERN = /^我找到了与[“"].+[”"]相关的公开信息[:：]?$/;
const SYSTEM_HEADING_PATTERN = /^(公开信息)[:：]?$/;

function normalizeHeadingText(line: string): string {
  return line.replace(/\*/g, '').replace(/^#+\s*/, '').trim();
}

function stripLeadingSystemLines(lines: string[]): string[] {
  let cursor = 0;
  while (cursor < Math.min(lines.length, 4)) {
    const normalized = normalizeHeadingText(lines[cursor]);
    if (!normalized || PUBLIC_WEB_INTRO_PATTERN.test(normalized) || SYSTEM_HEADING_PATTERN.test(normalized)) {
      cursor += 1;
      continue;
    }
    break;
  }
  return lines.slice(cursor);
}

function stripSourceSection(lines: string[]): string[] {
  const sourceHeadingIndex = lines.findIndex((line) => INLINE_SOURCE_HEADING_PATTERN.test(normalizeHeadingText(line)));
  if (sourceHeadingIndex < 0) return lines;
  const before = lines.slice(0, sourceHeadingIndex);
  const after = lines.slice(sourceHeadingIndex + 1);
  const nextHeadingIndex = after.findIndex((line) => /^#{1,3}\s+/.test(line.trim()));
  return nextHeadingIndex < 0 ? before : [...before, '', ...after.slice(nextHeadingIndex)];
}

function compactBlankLines(lines: string[]): string {
  return lines
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeAnswerMarkdown(markdown: string): string {
  const lines = stripSourceSection(stripLeadingSystemLines(String(markdown || '').split('\n')));
  return compactBlankLines(lines);
}
