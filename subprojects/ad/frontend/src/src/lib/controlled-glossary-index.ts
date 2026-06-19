import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getControlledGlossaryKnowledgeBaseId,
  getKnowledgeBaseApiKey,
  getKnowledgeSearchEndpoint,
  getModelServiceConfig,
  hasConfiguredKnowledgeCredentials,
} from './runtime-config';
import { runtimeDataPath } from './runtime-data-path';

export type ControlledGlossarySource = 'knowledge_base_sync' | 'runtime_config' | 'built_in_seed';

export interface ControlledGlossaryTerm {
  term_id: string;
  canonical: string;
  aliases: string[];
  normalized_terms?: string[];
  domain?: 'report_query' | 'delivery_package' | 'debugging' | 'general';
  priority?: number;
  source: ControlledGlossarySource;
  source_ref?: string;
  updated_at?: string;
}

export interface ControlledGlossaryIndex {
  schema_version: 1;
  index_version: string;
  generated_at: string;
  source: ControlledGlossarySource;
  terms: ControlledGlossaryTerm[];
}

export interface GlossaryNormalizationResult {
  original_text: string;
  normalized_text: string;
  matched_terms: Array<{
    term_id: string;
    canonical: string;
    alias: string;
    source: ControlledGlossarySource;
  }>;
  index_version: string;
}

export interface ControlledGlossarySyncResult {
  status: 'success' | 'skipped' | 'failed';
  message: string;
  index?: ControlledGlossaryIndex;
  source_count?: number;
  errors?: string[];
}

const STORE_PATH = runtimeDataPath('controlled-glossary-index.json');

const BUILT_IN_TERMS: ControlledGlossaryTerm[] = [
  {
    term_id: 'report.media.oceanengine',
    canonical: '巨量',
    aliases: ['巨量', '巨量引擎', '抖音', '今日头条', 'oceanengine'],
    normalized_terms: ['巨量', '媒体'],
    domain: 'report_query',
    priority: 80,
    source: 'built_in_seed',
  },
  {
    term_id: 'report.media.tencent',
    canonical: '腾讯',
    aliases: ['腾讯', '广点通', 'gdt', 'tencent'],
    normalized_terms: ['腾讯', '媒体'],
    domain: 'report_query',
    priority: 80,
    source: 'built_in_seed',
  },
  {
    term_id: 'report.media.kuaishou',
    canonical: '快手',
    aliases: ['快手', 'kuaishou'],
    normalized_terms: ['快手', '媒体'],
    domain: 'report_query',
    priority: 80,
    source: 'built_in_seed',
  },
  {
    term_id: 'report.metric.first_day_paid_account_retention',
    canonical: '首日付费账号留存',
    aliases: ['首日付费账号留存', '付费账号留存', '付费留存'],
    normalized_terms: ['留存', '首日付费账号留存'],
    domain: 'report_query',
    priority: 100,
    source: 'built_in_seed',
  },
  {
    term_id: 'report.metric.roi',
    canonical: 'ROI',
    aliases: ['ROI', 'ROAS', '回收', '投入产出', '回本'],
    normalized_terms: ['ROI'],
    domain: 'report_query',
    priority: 90,
    source: 'built_in_seed',
  },
];

function normalizeIndex(input: Partial<ControlledGlossaryIndex> | ControlledGlossaryTerm[]): ControlledGlossaryIndex {
  const rawTerms = Array.isArray(input) ? input : input.terms;
  const terms = Array.isArray(rawTerms)
    ? rawTerms
      .map((term, index) => ({
        term_id: String(term.term_id || `term-${index}`).trim(),
        canonical: String(term.canonical || '').trim(),
        aliases: Array.isArray(term.aliases) ? term.aliases.map(String).map(item => item.trim()).filter(Boolean) : [],
        normalized_terms: Array.isArray(term.normalized_terms) ? term.normalized_terms.map(String).map(item => item.trim()).filter(Boolean) : undefined,
        domain: term.domain,
        priority: Number.isFinite(term.priority) ? Number(term.priority) : 50,
        source: term.source || 'runtime_config',
        source_ref: term.source_ref,
        updated_at: term.updated_at,
      }))
      .filter(term => term.canonical && term.aliases.length)
    : [];
  return {
    schema_version: 1,
    index_version: Array.isArray(input)
      ? `built-in:${terms.length}`
      : String(input.index_version || `runtime:${terms.length}`).trim(),
    generated_at: Array.isArray(input) ? new Date().toISOString() : String(input.generated_at || new Date().toISOString()),
    source: Array.isArray(input) ? 'built_in_seed' : (input.source || 'runtime_config'),
    terms: terms.length ? terms : BUILT_IN_TERMS,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function pickText(value: unknown): string {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  for (const key of ['content', 'text', 'body', 'answer', 'document', 'snippet']) {
    const next = record[key];
    if (typeof next === 'string') return next;
  }
  return '';
}

function extractJsonBlocks(text: string): unknown[] {
  const blocks: unknown[] = [];
  const trimmed = text.trim();
  if (!trimmed) return blocks;
  const fenced = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(match => match[1]);
  for (const candidate of [trimmed, ...fenced]) {
    try {
      blocks.push(JSON.parse(candidate));
    } catch {
      // Ignore non-JSON text.
    }
  }
  return blocks;
}

function parseGlossaryTermsFromKnowledgeResponse(data: unknown): { terms: ControlledGlossaryTerm[]; sourceCount: number; errors: string[] } {
  const record = asRecord(data);
  const candidates = [
    record.data,
    record.items,
    record.results,
    record.documents,
  ].find(Array.isArray) as unknown[] | undefined;
  const items = candidates || [];
  const terms: ControlledGlossaryTerm[] = [];
  const errors: string[] = [];
  for (const item of items) {
    const text = pickText(item);
    for (const parsed of extractJsonBlocks(text)) {
      const index = normalizeIndex(parsed as Partial<ControlledGlossaryIndex> | ControlledGlossaryTerm[]);
      terms.push(...index.terms.map(term => ({
        ...term,
        source: 'knowledge_base_sync' as const,
        source_ref: term.source_ref || asRecord(item).id?.toString() || asRecord(item).document_id?.toString(),
      })));
    }
    if (text && extractJsonBlocks(text).length === 0) errors.push('知识片段不是合法 JSON，已跳过。');
  }
  return { terms, sourceCount: items.length, errors };
}

export async function saveControlledGlossaryIndex(index: ControlledGlossaryIndex): Promise<ControlledGlossaryIndex> {
  const normalized = normalizeIndex(index);
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

export async function syncControlledGlossaryIndexFromKnowledgeBase(): Promise<ControlledGlossarySyncResult> {
  const config = await getModelServiceConfig();
  if (!hasConfiguredKnowledgeCredentials(config)) {
    return { status: 'skipped', message: '知识库地址或 Key 未配置，已跳过受控术语同步。' };
  }
  const endpoint = getKnowledgeSearchEndpoint(config);
  const knowledgeBaseId = getControlledGlossaryKnowledgeBaseId(config);
  if (!endpoint || !knowledgeBaseId) {
    return { status: 'skipped', message: '受控术语知识库 ID 未配置，已跳过同步。' };
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': getKnowledgeBaseApiKey(config),
    },
    body: JSON.stringify({
      query: 'controlled_glossary 受控术语 术语归一化 JSON',
      top_k: 20,
      knowledge_base_ids: [knowledgeBaseId],
    }),
  }).catch(error => ({ ok: false, status: 0, json: async () => ({ error: String(error) }) } as Response));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { status: 'failed', message: `受控术语知识库检索失败：HTTP ${response.status}`, errors: [JSON.stringify(data).slice(0, 500)] };
  }
  const parsed = parseGlossaryTermsFromKnowledgeResponse(data);
  if (!parsed.terms.length) {
    return {
      status: 'failed',
      message: '知识库未返回可用的受控术语 JSON，当前索引未被覆盖。',
      source_count: parsed.sourceCount,
      errors: parsed.errors,
    };
  }
  const index = await saveControlledGlossaryIndex({
    schema_version: 1,
    index_version: `knowledge:${knowledgeBaseId}:${Date.now()}`,
    generated_at: new Date().toISOString(),
    source: 'knowledge_base_sync',
    terms: parsed.terms,
  });
  return {
    status: 'success',
    message: `已同步 ${index.terms.length} 条受控术语。`,
    index,
    source_count: parsed.sourceCount,
    errors: parsed.errors,
  };
}

export function loadControlledGlossaryIndexSync(): ControlledGlossaryIndex {
  try {
    if (existsSync(STORE_PATH)) {
      const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as Partial<ControlledGlossaryIndex> | ControlledGlossaryTerm[];
      return normalizeIndex(parsed);
    }
  } catch {
    // Fall back to built-in seed; runtime config errors must not break report routing.
  }
  return normalizeIndex(BUILT_IN_TERMS);
}

export function normalizeQuestionWithGlossary(
  text: string,
  index = loadControlledGlossaryIndexSync(),
): GlossaryNormalizationResult {
  let normalized = text;
  const matched: GlossaryNormalizationResult['matched_terms'] = [];
  const sortedTerms = [...index.terms].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (const term of sortedTerms) {
    for (const alias of term.aliases) {
      if (!alias || !normalized.toLowerCase().includes(alias.toLowerCase())) continue;
      matched.push({
        term_id: term.term_id,
        canonical: term.canonical,
        alias,
        source: term.source,
      });
      const appended = term.normalized_terms || [term.canonical];
      for (const normalizedTerm of appended) {
        if (!normalized.toLowerCase().includes(normalizedTerm.toLowerCase())) {
          normalized = `${normalized} ${normalizedTerm}`;
        }
      }
      break;
    }
  }
  return {
    original_text: text,
    normalized_text: normalized,
    matched_terms: matched,
    index_version: index.index_version,
  };
}
