type ReportRow = Record<string, unknown>;
type RowNormalizer = (payload: unknown) => ReportRow[];

const ROW_ARRAY_KEYS = ['tableContent', 'rows', 'records', 'list', 'items', 'data', 'result'];

function stripTruncationMarker(value: string): string {
  return value
    .replace(/\s*(?:\.\.\.)?\[truncated\]\s*$/i, '')
    .replace(/\s*(?:\.\.\.)?truncated\s*$/i, '')
    .trim();
}

function findArrayStartAfterKey(text: string, key: string): number {
  const pattern = new RegExp(`["']?${key}["']?\\s*:\\s*\\[`, 'i');
  const match = pattern.exec(text);
  return match ? match.index + match[0].lastIndexOf('[') : -1;
}

function readBalancedArray(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}

function parseCompleteObjectsFromArrayPrefix(text: string, arrayStart: number): ReportRow[] {
  const rows: ReportRow[] = [];
  let inString = false;
  let quote = '';
  let escaped = false;
  let objectDepth = 0;
  let objectStart = -1;
  for (let index = arrayStart + 1; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === '{') {
      if (objectDepth === 0) objectStart = index;
      objectDepth += 1;
      continue;
    }
    if (char === '}') {
      objectDepth -= 1;
      if (objectDepth === 0 && objectStart >= 0) {
        try {
          const parsed = JSON.parse(text.slice(objectStart, index + 1));
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            rows.push(parsed as ReportRow);
          }
        } catch {
          // Ignore incomplete or non-JSON row fragments.
        }
        objectStart = -1;
      }
    }
  }
  return rows;
}

function recoverRowsFromJsonArrayText(text: string, normalizeRows: RowNormalizer): ReportRow[] {
  const clean = stripTruncationMarker(text);
  for (const key of ROW_ARRAY_KEYS) {
    const start = findArrayStartAfterKey(clean, key);
    if (start < 0) continue;
    const balanced = readBalancedArray(clean, start);
    if (balanced) {
      try {
        const nested = normalizeRows(JSON.parse(balanced));
        if (nested.length) return nested;
      } catch {
        // Fall through to complete-object recovery.
      }
    }
    const recovered = parseCompleteObjectsFromArrayPrefix(clean, start);
    if (recovered.length) return recovered;
  }
  const directArrayStart = clean.indexOf('[');
  if (directArrayStart >= 0) {
    const balanced = readBalancedArray(clean, directArrayStart);
    if (balanced) {
      try {
        const nested = normalizeRows(JSON.parse(balanced));
        if (nested.length) return nested;
      } catch {
        // Fall through to complete-object recovery.
      }
    }
    const recovered = parseCompleteObjectsFromArrayPrefix(clean, directArrayStart);
    if (recovered.length) return recovered;
  }
  return [];
}

function parseMarkdownTableRows(text: string): ReportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith('|') && line.endsWith('|'));
  if (lines.length < 2) return [];
  const headers = lines[0].split('|').slice(1, -1).map(item => item.trim()).filter(Boolean);
  const separatorCells = lines[1].split('|').slice(1, -1).map(item => item.trim());
  const isSeparator = separatorCells.length >= headers.length
    && separatorCells.every(item => /^:?-{3,}:?$/.test(item));
  if (!headers.length || !isSeparator) return [];
  return lines.slice(2).flatMap((line) => {
    const cells = line.split('|').slice(1, -1).map(item => item.trim());
    if (cells.length < headers.length) return [];
    return [Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))];
  });
}

export function recoverRowsFromLooseText(text: string, normalizeRows: RowNormalizer): ReportRow[] {
  const clean = stripTruncationMarker(text);
  if (!clean) return [];
  try {
    return normalizeRows(JSON.parse(clean));
  } catch {
    const jsonRows = recoverRowsFromJsonArrayText(clean, normalizeRows);
    if (jsonRows.length) return jsonRows;
    return parseMarkdownTableRows(clean);
  }
}
