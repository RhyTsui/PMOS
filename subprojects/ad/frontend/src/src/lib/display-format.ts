const EMPTY_DISPLAY = '--';

const MISSING_VALUE_SET = new Set([
  '',
  '--',
  '-',
  '\u2013',
  '\u2014',
  '?',
  '\uff1f',
  'N/A',
  'NA',
  'NULL',
  'UNDEFINED',
  'NONE',
  'null',
  'undefined',
  'none',
]);

const PERCENT_KEYWORDS = [
  'rate',
  'ratio',
  'ctr',
  'cvr',
  'roi',
  'roas',
  'conversion_rate',
  'conversion-rate',
  'conversionrate',
  '\u8f6c\u5316\u7387',
];

const MONEY_KEYWORDS = [
  'cost',
  'amount',
  'spend',
  'cash',
  'price',
  'revenue',
  'gmv',
  'consume',
  'budget',
  'budgeted',
  'spending',
  'turnover',
  '\u603b\u989d',
  '\u6210\u672c',
  '\u6536\u5165',
];

const COUNT_KEYWORDS = [
  'count',
  'num',
  'pv',
  'uv',
  'click',
  'impression',
  'activation',
  'register',
  'pay',
  'active',
  'total',
  '\u6d4f\u89c8\u91cf',
  '\u70b9\u51fb\u91cf',
  '\u6ce8\u518c\u91cf',
  '\u7d2f\u8ba1',
];

export type DisplayValueType = 'percent' | 'money' | 'count' | 'number' | 'text';

export type DisplayValueResult = {
  text: string;
  type: DisplayValueType;
  numericValue: number | null;
};

export function inferDisplayValueType(field?: string): DisplayValueType {
  const normalized = String(field || '').toLowerCase();
  if (PERCENT_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'percent';
  if (MONEY_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'money';
  if (COUNT_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'count';
  return 'number';
}

function toNumericValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || MISSING_VALUE_SET.has(trimmed.toUpperCase())) return null;
  const normalized = trimmed
    .replace(/,/g, '')
    .replace(/%/g, '')
    .replace(/\u00a5/g, '')
    .replace(/\s+/g, '');
  if (!normalized || !Number.isFinite(Number(normalized))) return null;
  return Number(normalized);
}

export function isNumericLike(value: unknown): boolean {
  return toNumericValue(value) !== null;
}

export function describeDisplayValue(value: unknown, field?: string): DisplayValueResult {
  if (value === null || value === undefined) return { text: EMPTY_DISPLAY, type: 'text', numericValue: null };
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || MISSING_VALUE_SET.has(trimmed.toUpperCase())) {
      return { text: EMPTY_DISPLAY, type: 'text', numericValue: null };
    }
  }

  const text = typeof value === 'string' ? value.trim() : String(value);
  const number = toNumericValue(value);
  if (number === null) {
    return { text, type: 'text', numericValue: null };
  }

  const isExplicitPercent = typeof value === 'string' && value.trim().endsWith('%');
  const type = isExplicitPercent ? 'percent' : inferDisplayValueType(field);

  if (type === 'percent') {
    const percentValue = isExplicitPercent || Math.abs(number) > 1 ? number : number * 100;
    return {
      text: `${percentValue.toFixed(2)}%`,
      type: 'percent',
      numericValue: percentValue,
    };
  }

  if (type === 'money') {
    return {
      text: `${number < 0 ? '-' : ''}\u00a5${Math.abs(number).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      type: 'money',
      numericValue: number,
    };
  }

  if (type === 'count') {
    return {
      text: Math.round(number).toLocaleString('zh-CN'),
      type: 'count',
      numericValue: number,
    };
  }

  return {
    text: number.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    type: 'number',
    numericValue: number,
  };
}

export function formatDisplayValue(value: unknown, field?: string): string {
  return describeDisplayValue(value, field).text;
}

export function formatDisplayValueNumeric(value: unknown, field?: string): number | null {
  return describeDisplayValue(value, field).numericValue;
}

export function formatDisplayRow(row: Record<string, unknown>, columns: string[]): Record<string, string> {
  return Object.fromEntries(
    columns.map((column) => [column, formatDisplayValue(row[column], column)]),
  );
}

