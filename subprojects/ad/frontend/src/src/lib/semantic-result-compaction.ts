import type { SemanticResultContract, SemanticRegion } from '@/contracts/semantic/semantic-result-contract';

type CompactRecord = Record<string, unknown>;

interface CompactOptions {
  depth: number;
  maxArray: number;
  maxKeys: number;
  maxString: number;
}

const DEFAULT_OPTIONS: CompactOptions = {
  depth: 4,
  maxArray: 30,
  maxKeys: 50,
  maxString: 1200,
};

const VISUALIZATION_OPTIONS: CompactOptions = {
  depth: 6,
  maxArray: 1000,
  maxKeys: 80,
  maxString: 1200,
};

function isRecord(value: unknown): value is CompactRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isSemanticRegion(value: unknown): value is SemanticRegion {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.type === 'string'
    && typeof value.componentBinding === 'string'
    && 'data' in value;
}

function compactValue(value: unknown, options: CompactOptions, seen = new WeakSet<object>(), depth = options.depth): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string') return value.length > options.maxString ? `${value.slice(0, options.maxString)}...[truncated]` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return String(value);
  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (depth <= 0) return '[Truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, options.maxArray).map((item) => compactValue(item, options, seen, depth - 1));
  }

  const entries = Object.entries(value);
  const output: CompactRecord = {};
  for (const [key, raw] of entries.slice(0, options.maxKeys)) {
    output[key] = compactValue(raw, options, seen, depth - 1);
  }
  if (entries.length > options.maxKeys) {
    output.__truncated_keys = entries.length - options.maxKeys;
  }
  return output;
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
}

function collectDisplayFieldKeys(result: CompactRecord): string[] {
  const keys = new Set<string>();
  const displayFields = Array.isArray(result.display_fields) ? result.display_fields : [];
  for (const field of displayFields) {
    if (isRecord(field) && typeof field.key === 'string') keys.add(field.key);
  }

  const metrics = Array.isArray(result.metrics) ? result.metrics.map(String).map(normalizeToken) : [];
  const dimensions = Array.isArray(result.dimensions) ? result.dimensions.map(String).map(normalizeToken) : [];
  const aliasMap: Record<string, string[]> = {
    cost: ['cost_amount', 'cash_cost_amount', 'rebate_cost_amount', 'rebate_cash_cost_amount', 'cost', 'spend', 'stat_cost', 'cash_cost', 'total_cost'],
    spend: ['cost_amount', 'cash_cost_amount', 'spend', 'cost', 'stat_cost', 'total_cost'],
    date: ['dt', 'date', 'stat_date', 'day'],
    media: ['media_id', 'media', 'media_name'],
  };
  for (const metric of metrics) {
    for (const key of aliasMap[metric] || [metric]) keys.add(key);
  }
  for (const dimension of dimensions) {
    for (const key of aliasMap[dimension] || [dimension]) keys.add(key);
  }

  if (isRecord(result.semantic_result) && Array.isArray(result.semantic_result.regions)) {
    for (const region of result.semantic_result.regions) {
      if (!isRecord(region) || !isRecord(region.data)) continue;
      const columns = Array.isArray(region.data.columns) ? region.data.columns : [];
      for (const column of columns) {
        if (typeof column === 'string') keys.add(column);
      }
      const regionFields = Array.isArray(region.data.displayFields) ? region.data.displayFields : [];
      for (const field of regionFields) {
        if (isRecord(field) && typeof field.key === 'string') keys.add(field.key);
      }
    }
  }

  return Array.from(keys);
}

function compactRowWithWhitelist(row: CompactRecord, options: CompactOptions, whitelist: string[]): CompactRecord {
  const output: CompactRecord = {};
  const used = new Set<string>();
  for (const key of whitelist) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      output[key] = compactValue(row[key], options, new WeakSet<object>(), options.depth - 1);
      used.add(key);
    }
  }
  for (const [key, raw] of Object.entries(row)) {
    if (used.has(key)) continue;
    if (Object.keys(output).length >= options.maxKeys) break;
    output[key] = compactValue(raw, options, new WeakSet<object>(), options.depth - 1);
    used.add(key);
  }
  const keptKeys = Object.keys(output).length;
  const truncated = Object.keys(row).length - keptKeys;
  if (truncated > 0) output.__truncated_keys = truncated;
  return output;
}

function compactRowsWithWhitelist(rows: unknown, options: CompactOptions, whitelist: string[]): unknown {
  if (!Array.isArray(rows)) return rows;
  return rows.slice(0, options.maxArray).map((row) => {
    if (!isRecord(row)) return compactValue(row, options);
    return compactRowWithWhitelist(row, options, whitelist);
  });
}

function compactSemanticRegion(region: SemanticRegion, options: CompactOptions): SemanticRegion {
  const compacted = compactValue(region, options) as CompactRecord;
  const regionData = region.data;
  if (isRecord(regionData)) {
    compacted.data = compactValue(
      regionData,
      region.componentBinding === 'data-visualization' ? VISUALIZATION_OPTIONS : options,
    );
  }
  return compacted as unknown as SemanticRegion;
}

export function compactSemanticResult(semanticResult: unknown): CompactRecord | null {
  if (!isRecord(semanticResult)) return null;

  const compacted = compactValue(semanticResult, DEFAULT_OPTIONS) as CompactRecord;
  const regions = Array.isArray(semanticResult.regions)
    ? semanticResult.regions.filter(isSemanticRegion).map((region) => compactSemanticRegion(region, DEFAULT_OPTIONS))
    : [];
  compacted.regions = regions;

  return compacted;
}

export function compactReportResult(result: unknown): CompactRecord | null {
  if (!isRecord(result)) return null;

  const compacted = compactValue(result, DEFAULT_OPTIONS) as CompactRecord;
  const displayWhitelist = collectDisplayFieldKeys(result);
  if (displayWhitelist.length) {
    compacted.rows = compactRowsWithWhitelist(result.rows, DEFAULT_OPTIONS, displayWhitelist);
  }
  if (isRecord(result.semantic_result)) {
    compacted.semantic_result = compactSemanticResult(result.semantic_result);
  }
  if (isRecord(result.structured_payload)) {
    const structuredPayload = compactValue(result.structured_payload, DEFAULT_OPTIONS) as CompactRecord;
    const structuredWhitelist = collectDisplayFieldKeys(result.structured_payload);
    if (structuredWhitelist.length) {
      structuredPayload.rows = compactRowsWithWhitelist(result.structured_payload.rows, DEFAULT_OPTIONS, structuredWhitelist);
    }
    if (isRecord(result.structured_payload.semantic_result)) {
      structuredPayload.semantic_result = compactSemanticResult(result.structured_payload.semantic_result);
    }
    compacted.structured_payload = structuredPayload;
  }

  return compacted;
}
