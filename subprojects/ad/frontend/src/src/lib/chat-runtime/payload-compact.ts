export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function truncate(str: string, max: number): string {
  return (!str || str.length <= max) ? str : `${str.slice(0, max)}...[truncated]`;
}

export function previewTraceValue(value: unknown, max = 2000): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string') return truncate(value, max);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  try {
    return truncate(JSON.stringify(value), max);
  } catch {
    return truncate(String(value), max);
  }
}

export function compactRuntimePayload(value: unknown, options: { maxString?: number; maxArray?: number; maxKeys?: number; depth?: number } = {}): unknown {
  const maxString = options.maxString ?? 1200;
  const maxArray = options.maxArray ?? 20;
  const maxKeys = options.maxKeys ?? 40;
  const maxDepth = options.depth ?? 4;
  const seen = new WeakSet<object>();

  const visit = (input: unknown, depth: number): unknown => {
    if (input === undefined || input === null) return input;
    if (typeof input === 'string') return truncate(input, maxString);
    if (typeof input === 'number' || typeof input === 'boolean') return input;
    if (typeof input === 'bigint') return String(input);
    if (typeof input !== 'object') return String(input);
    if (seen.has(input)) return '[Circular]';
    seen.add(input);
    if (depth <= 0) return '[Truncated]';

    if (Array.isArray(input)) {
      const next = input.slice(0, maxArray).map(item => visit(item, depth - 1));
      if (input.length > maxArray) next.push(`[+${input.length - maxArray} items]`);
      return next;
    }

    const output: Record<string, unknown> = {};
    const entries = Object.entries(input as Record<string, unknown>);
    for (const [key, raw] of entries.slice(0, maxKeys)) {
      if (key === 'raw_result' || key === 'rawResult' || key === 'raw_result_preview') {
        output[key] = visit(raw, Math.min(depth - 1, 2));
        continue;
      }
      output[key] = visit(raw, depth - 1);
    }
    if (entries.length > maxKeys) output.__truncated_keys = entries.length - maxKeys;
    return output;
  };

  return visit(value, maxDepth);
}

export function summarizePayloadForTrace(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return truncate(value, 220);
  if (Array.isArray(value)) return `共 ${value.length} 项`;
  if (isRecord(value)) {
    const rowCount = typeof value.row_count === 'number'
      ? value.row_count
      : Array.isArray(value.rows)
        ? value.rows.length
        : Array.isArray(value.data)
          ? value.data.length
          : undefined;
    const status = typeof value.status === 'string' ? value.status : undefined;
    const message = typeof value.message === 'string' ? value.message : undefined;
    return [status ? `状态：${status}` : '', typeof rowCount === 'number' ? `返回 ${rowCount} 行` : '', message ? truncate(message, 120) : '']
      .filter(Boolean)
      .join('；') || truncate(JSON.stringify(Object.keys(value).slice(0, 8)), 220);
  }
  return String(value);
}

export function compactCapabilityDecision(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  return compactRuntimePayload(value, { depth: 4, maxString: 800, maxArray: 6, maxKeys: 30 }) as Record<string, unknown>;
}
