/**
 * Dimension Normalizer — 维度归一化
 *
 * 将多个 MCP 工具返回的数据做维度对齐，确保 JOIN 时键值一致。
 *
 * 归一化内容：
 * 1. 日期格式 → 统一为 YYYY-MM-DD
 * 2. 实体名称 → 使用 entity resolution alias maps 归一为 canonical key
 * 3. 枚举值 → 统一为标准 key（如 media "巨量引擎" → "巨量"）
 *
 * 设计原则：
 * - 复用已有的 entity-resolution-config-store 基础设施
 * - 不修改原始数据，返回新的归一化副本
 * - 记录应用的归一化规则，便于追溯
 */

import type {
  Column,
  DimensionNormalizationRule,
  NormalizedDataSet,
  Row,
  SubQueryResult,
} from '@/contracts/multi-query';
import { getEntityResolutionAliasMaps } from './entity-resolution-config-store';

// ─── Date Normalization ─────────────────────────────────

/**
 * 常见日期格式正则和标准化。
 */
const DATE_PATTERNS: Array<{
  pattern: RegExp;
  normalize: (match: string) => string;
}> = [
  // YYYY-MM-DD (already standard)
  { pattern: /^\d{4}-\d{2}-\d{2}$/, normalize: (m) => m },
  // YYYYMMDD → YYYY-MM-DD
  { pattern: /^(\d{4})(\d{2})(\d{2})$/, normalize: (m) => `${m.slice(0, 4)}-${m.slice(4, 6)}-${m.slice(6, 8)}` },
  // YYYY/MM/DD → YYYY-MM-DD
  { pattern: /^(\d{4})\/(\d{2})\/(\d{2})$/, normalize: (m) => m.replace(/\//g, '-') },
  // YYYY.MM.DD → YYYY-MM-DD
  { pattern: /^(\d{4})\.(\d{2})\.(\d{2})$/, normalize: (m) => m.replace(/\./g, '-') },
  // YYYY-MM-DDTHH:mm:ss → YYYY-MM-DD (strip time)
  { pattern: /^(\d{4}-\d{2}-\d{2})T/, normalize: (m) => m.slice(0, 10) },
];

/**
 * 归一化日期值到 YYYY-MM-DD 格式。
 * 如果无法识别格式，返回原值。
 */
export function normalizeDateValue(raw: unknown): string {
  if (raw == null) return '';
  const str = String(raw).trim();
  if (!str) return '';

  for (const { pattern, normalize } of DATE_PATTERNS) {
    if (pattern.test(str)) {
      return normalize(str);
    }
  }
  return str;
}

// ─── Name Alias Normalization ────────────────────────────

/**
 * 维度名 → entity resolution alias map key 的映射。
 */
const DIMENSION_TO_ALIAS_MAP: Record<string, string> = {
  media: 'media_aliases',
  terminal: 'terminal_aliases',
  team: 'team_aliases',
  account: 'account_aliases',
  package: 'package_aliases',
};

/**
 * 归一化实体名称。
 * 使用 entity resolution alias maps 将别名映射为 canonical key。
 *
 * alias maps 结构：Record<canonical, alias[]> — key 是 canonical，value 包含所有别名。
 * 需要反向查找：给定 alias，找到对应的 canonical。
 */
export function normalizeEntityValue(
  dimension: string,
  raw: unknown,
  aliasMaps?: Record<string, Record<string, string[]>>,
): string {
  if (raw == null) return '';
  const str = String(raw).trim();
  if (!str) return '';

  const aliasMapKey = DIMENSION_TO_ALIAS_MAP[dimension];
  if (!aliasMapKey || !aliasMaps) return str;

  const map = aliasMaps[aliasMapKey];
  if (!map) return str;

  // 反向查找：找到 canonical whose alias list contains the input (case-insensitive)
  const lowerStr = str.toLowerCase();
  for (const [canonical, aliases] of Object.entries(map)) {
    if (canonical.toLowerCase() === lowerStr) return canonical;
    for (const alias of aliases) {
      if (alias.toLowerCase() === lowerStr) return canonical;
    }
  }

  return str;
}

// ─── Normalize Sub-Query Result ─────────────────────────

/**
 * 对单个子查询结果做维度归一化。
 *
 * @param result 子查询原始结果
 * @param dimensionColumns 该结果中的维度列（需要归一化的列）
 * @param aliasMaps entity resolution alias maps（可选）
 */
export function normalizeSubQueryResult(
  result: SubQueryResult,
  dimensionColumns: string[],
  aliasMaps?: Record<string, Record<string, string[]>>,
): NormalizedDataSet {
  const appliedRules: DimensionNormalizationRule[] = [];

  // 1. 归一化列定义（确保维度列 key 一致）
  const normalizedColumns: Column[] = result.columns.map(col => ({
    ...col,
    // 维度列统一使用标准 key
    key: col.dimension
      ? normalizeDimensionKey(col.dimension)
      : col.key,
  }));

  // 2. 归一化行数据
  const normalizedRows: Row[] = result.rows.map(row => {
    const newRow: Row = {};
    for (const [key, value] of Object.entries(row)) {
      const col = result.columns.find(c => c.key === key);
      if (!col) {
        newRow[key] = value;
        continue;
      }

      if (col.type === 'dimension') {
        // 维度列做归一化
        if (col.dimension === 'date' || key.toLowerCase().includes('date')) {
          newRow[col.dimension ? normalizeDimensionKey(col.dimension) : key] = normalizeDateValue(value);
          if (!appliedRules.some(r => r.dimension === 'date')) {
            appliedRules.push({ dimension: 'date', type: 'date_format', target: 'YYYY-MM-DD' });
          }
        } else if (col.dimension && DIMENSION_TO_ALIAS_MAP[col.dimension]) {
          const normalized = normalizeEntityValue(col.dimension, value, aliasMaps);
          newRow[normalizeDimensionKey(col.dimension)] = normalized;
          if (normalized !== String(value)) {
            appliedRules.push({
              dimension: col.dimension,
              type: 'name_alias',
              target: { [String(value)]: normalized },
            });
          }
        } else {
          newRow[normalizeDimensionKey(col.dimension || key)] = value;
        }
      } else {
        // 指标列保持不变
        newRow[key] = value;
      }
    }
    return newRow;
  });

  return {
    subQueryId: result.subQueryId,
    toolName: result.toolName,
    columns: normalizedColumns,
    rows: normalizedRows,
    appliedRules,
  };
}

// ─── Dimension Key Normalization ─────────────────────────

/**
 * 标准化维度 key。
 * 将各种变体统一为标准 key（如 "日期" → "date"）
 */
const DIMENSION_KEY_ALIASES: Record<string, string> = {
  '日期': 'date',
  '时间': 'date',
  'date': 'date',
  'dt': 'date',
  '媒体': 'media',
  'media': 'media',
  '渠道': 'channel',
  'channel': 'channel',
  '项目': 'project',
  'project': 'project',
  '应用': 'app',
  'app': 'app',
  '终端': 'terminal',
  'terminal': 'terminal',
  '平台': 'platform',
  'platform': 'platform',
  '素材': 'creative',
  '创意': 'creative',
  'creative': 'creative',
  '账号': 'account',
  'account': 'account',
  '团队': 'team',
  'team': 'team',
};

/**
 * 标准化维度 key
 */
export function normalizeDimensionKey(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  return DIMENSION_KEY_ALIASES[trimmed] || trimmed;
}

// ─── Batch Normalize ─────────────────────────────────────

/**
 * 批量归一化多个子查询结果。
 * 自动加载 entity resolution alias maps。
 */
export function normalizeAllSubQueryResults(
  results: SubQueryResult[],
  dimensionColumns: string[],
): NormalizedDataSet[] {
  const aliasMaps = getEntityResolutionAliasMaps();

  return results.map(result =>
    normalizeSubQueryResult(result, dimensionColumns, aliasMaps),
  );
}
