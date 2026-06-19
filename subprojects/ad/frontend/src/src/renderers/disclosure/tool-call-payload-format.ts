function safePrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isLikelyJsonText(value: string): boolean {
  return /^[\[{"]/.test(value.trim());
}

function nextNonWhitespace(text: string, start: number): string {
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (!/\s/.test(char)) return char;
  }
  return '';
}

function previousNonWhitespace(output: string): string {
  for (let index = output.length - 1; index >= 0; index -= 1) {
    const char = output[index];
    if (!/\s/.test(char)) return char;
  }
  return '';
}

function unescapeEscapedJsonEnvelope(text: string): string {
  let output = '';

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '\\' && next === '"') {
      const prevToken = previousNonWhitespace(output);
      const nextToken = nextNonWhitespace(text, index + 2);
      const structuralQuote = !prevToken
        || '{[,:'.includes(prevToken)
        || ':,]}'.includes(nextToken);

      output += structuralQuote ? '"' : '\\"';
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function tryParseJsonText(value: string): { ok: true; value: unknown } | { ok: false } {
  const text = value.trim();
  if (!text || !isLikelyJsonText(text)) return { ok: false };

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    if (!text.includes('\\"')) return { ok: false };
  }

  try {
    return { ok: true, value: JSON.parse(unescapeEscapedJsonEnvelope(text)) as unknown };
  } catch {
    return { ok: false };
  }
}

function parseJsonStringDeep(value: string): unknown {
  let current = value.trim();
  if (!current) return '';

  for (let depth = 0; depth < 4; depth += 1) {
    const parsed = tryParseJsonText(current);
    if (!parsed.ok) return depth === 0 ? value : current;
    if (typeof parsed.value !== 'string') return parsed.value;
    current = parsed.value.trim();
    if (!current) return '';
  }

  return current;
}

function findJsonFragmentEnd(text: string, start: number): number {
  const opener = text[start];
  const closer = opener === '{' ? '}' : opener === '[' ? ']' : '';
  if (!closer) return -1;

  const stack = [closer];
  let inString = false;
  let escaping = false;

  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (escaping) {
      escaping = false;
      continue;
    }
    if (char === '\\') {
      escaping = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') {
      stack.push('}');
    } else if (char === '[') {
      stack.push(']');
    } else if (char === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return index;
    }
  }

  return -1;
}

function formatJsonFragments(text: string): string {
  let output = '';
  let appendFrom = 0;
  let searchFrom = 0;
  let changed = false;

  while (searchFrom < text.length) {
    const nextObject = text.indexOf('{', searchFrom);
    const nextArray = text.indexOf('[', searchFrom);
    const start = nextObject < 0 ? nextArray : nextArray < 0 ? nextObject : Math.min(nextObject, nextArray);
    if (start < 0) break;

    const end = findJsonFragmentEnd(text, start);
    if (end < 0) {
      searchFrom = start + 1;
      continue;
    }

    const fragment = text.slice(start, end + 1);
    const parsed = tryParseJsonText(fragment);
    if (!parsed.ok || typeof parsed.value === 'string') {
      searchFrom = start + 1;
      continue;
    }

    output += text.slice(appendFrom, start);
    output += safePrettyJson(parsed.value);
    appendFrom = end + 1;
    searchFrom = end + 1;
    changed = true;
  }

  if (!changed) return text;
  return `${output}${text.slice(appendFrom)}`;
}

export function formatToolCallPayloadText(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '-';
  if (typeof value === 'string') {
    const parsed = parseJsonStringDeep(value);
    if (parsed === '') return '-';
    return typeof parsed === 'string' ? formatJsonFragments(parsed) : safePrettyJson(parsed);
  }
  if (Array.isArray(value) || typeof value === 'object') return safePrettyJson(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return String(value);
}
