import type { SourceRef } from '@/types';

export type GiFeedMode = 'daily_brief' | 'feed' | 'seed_expand';

export interface GiQueryOptions {
  mode: GiFeedMode;
  profileId?: string;
  date?: string;
  since?: string;
  sourceType?: string;
  sourceId?: string;
  keyword?: string;
  eventType?: string[];
  priority?: string[];
  audienceTag?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
  expandSeeds?: boolean;
}

export interface GiArticleItem {
  id: string;
  title: string;
  summary: string;
  url?: string;
  sourceName?: string;
  sourceType?: string;
  eventType?: string;
  priority?: string;
  audienceTags: string[];
  sourceCount?: number;
  evidenceIds: string[];
  verificationStatus?: string;
  publishedAt?: string;
  collectedAt?: string;
  impactScore?: number;
}

export interface GiBriefSection {
  id: string;
  title: string;
  order?: number;
  items: GiArticleItem[];
}

export interface GiIntelligenceResult {
  mode: GiFeedMode;
  status: 'success' | 'empty' | 'not_configured' | 'failed' | 'partial';
  title: string;
  summary: string;
  generatedAt?: string;
  total?: number;
  items: GiArticleItem[];
  sections: GiBriefSection[];
  sourceRefs: SourceRef[];
  evidenceRefs: string[];
  query: GiQueryOptions;
  warnings: string[];
  seedExpansion?: {
    status: 'success' | 'failed' | 'skipped' | 'partial';
    createdSeedIds: string[];
    expandedSeedIds: string[];
    message: string;
  };
}

const DEFAULT_TIMEOUT_MS = 10000;

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

function asArray(input: unknown): unknown[] {
  return Array.isArray(input) ? input : [];
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeBaseUrl(input?: string): string {
  const raw = (input || process.env.XIAOQIAO_GI_BASE_URL || process.env.GI_BASE_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '').endsWith('/api/v1')
    ? raw.replace(/\/+$/, '')
    : `${raw.replace(/\/+$/, '')}/api/v1`;
}

function resolveProfileId(input?: string): string | undefined {
  return input || process.env.XIAOQIAO_GI_PROFILE_ID || process.env.GI_PROFILE_ID || undefined;
}

async function fetchJsonWithTimeout(url: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    let data: unknown = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { text };
      }
    }
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeItem(input: unknown, index: number): GiArticleItem {
  const record = asRecord(input);
  const structuredEvent = asRecord(record.structuredEvent);
  const title = pickString(record, ['title', 'eventTitle', 'name'])
    || pickString(structuredEvent, ['eventTitle'])
    || `情报 ${index + 1}`;
  const id = pickString(record, ['id', 'eventId', 'targetId']) || `gi-item-${index + 1}`;
  return {
    id,
    title,
    summary: pickString(record, ['summary', 'description'])
      || pickString(structuredEvent, ['summary', 'eventTitle'])
      || title,
    url: pickString(record, ['url', 'link', 'sourceUrl']) || undefined,
    sourceName: pickString(record, ['sourceName', 'source', 'publisher']) || undefined,
    sourceType: pickString(record, ['sourceType']) || undefined,
    eventType: pickString(record, ['eventType']) || pickString(structuredEvent, ['eventType']) || undefined,
    priority: pickString(record, ['priority']) || pickString(structuredEvent, ['priority']) || undefined,
    audienceTags: stringArray(record.audienceTags),
    sourceCount: pickNumber(record, ['sourceCount']),
    evidenceIds: stringArray(record.evidenceIds),
    verificationStatus: pickString(record, ['verificationStatus', 'status']) || undefined,
    publishedAt: pickString(record, ['publishedAt', 'firstSeenAt', 'lastSeenAt']) || undefined,
    collectedAt: pickString(record, ['collectedAt']) || undefined,
    impactScore: pickNumber(record, ['impactScore']),
  };
}

function sourceTypeForItem(item: GiArticleItem): SourceRef['source_type'] {
  return item.url ? 'web_fetch' : 'skill';
}

function buildSourceRefs(items: GiArticleItem[]): SourceRef[] {
  return items.map((item, index) => ({
    id: `gi-source-${item.id || index + 1}`.replace(/[^a-zA-Z0-9:_./-]+/g, '_'),
    title: item.title,
    source: item.sourceName || item.sourceType || 'GI 情报服务',
    url: item.url,
    source_type: sourceTypeForItem(item),
    icon: item.sourceType === 'wechat_mp' ? 'wechat_mp' : item.url ? 'web_fetch' : 'skill',
    snippet: item.summary,
    prompt: [
      item.eventType ? `事件：${item.eventType}` : '',
      item.priority ? `优先级：${item.priority}` : '',
      item.verificationStatus ? `核验：${item.verificationStatus}` : '',
      item.publishedAt ? `发布时间：${item.publishedAt}` : '',
    ].filter(Boolean).join('；'),
    status: item.verificationStatus === 'conflicted' || item.verificationStatus === 'low_confidence' ? 'waiting' : 'success',
  }));
}

function buildSummary(mode: GiFeedMode, items: GiArticleItem[], total?: number): string {
  if (!items.length) {
    return mode === 'daily_brief'
      ? '今天暂时没有可展示的情报摘要。'
      : '当前条件下暂时没有找到可展示的文章。';
  }
  const countText = total && total > items.length ? `${items.length}/${total}` : String(items.length);
  const label = mode === 'daily_brief' ? '今日摘要' : '文章流';
  return `已获取 ${countText} 条${label}，优先展示高影响和已核验内容。`;
}

function normalizeBrief(data: unknown, query: GiQueryOptions): GiIntelligenceResult {
  const root = asRecord(data);
  const payload = asRecord(root.data);
  const sections = asArray(payload.sections).map((section, sectionIndex) => {
    const sectionRecord = asRecord(section);
    return {
      id: pickString(sectionRecord, ['id']) || `section-${sectionIndex + 1}`,
      title: pickString(sectionRecord, ['title']) || `分组 ${sectionIndex + 1}`,
      order: pickNumber(sectionRecord, ['order']),
      items: asArray(sectionRecord.items).map(normalizeItem),
    };
  });
  const items = sections.flatMap((section) => section.items);
  const meta = asRecord(root.meta);
  const total = pickNumber(meta, ['total']) ?? items.length;
  return {
    mode: 'daily_brief',
    status: items.length ? 'success' : 'empty',
    title: pickString(payload, ['title']) || '今日行业情报',
    summary: buildSummary('daily_brief', items, total),
    generatedAt: pickString(payload, ['generatedAt']) || pickString(meta, ['generatedAt']) || undefined,
    total,
    items,
    sections,
    sourceRefs: buildSourceRefs(items),
    evidenceRefs: Array.from(new Set(items.flatMap((item) => item.evidenceIds))),
    query,
    warnings: [],
  };
}

function normalizeFeed(data: unknown, query: GiQueryOptions): GiIntelligenceResult {
  const root = asRecord(data);
  const payload = asRecord(root.data);
  const meta = asRecord(payload.meta || root.meta);
  const itemInput = Array.isArray(payload.items) ? payload.items : Array.isArray(root.data) ? root.data : [];
  const items = itemInput.map(normalizeItem);
  const total = pickNumber(meta, ['total']) ?? items.length;
  return {
    mode: 'feed',
    status: items.length ? 'success' : 'empty',
    title: query.keyword ? `${query.keyword} 相关情报` : '行业文章流',
    summary: buildSummary('feed', items, total),
    generatedAt: pickString(meta, ['generatedAt']) || undefined,
    total,
    items,
    sections: [{
      id: 'feed',
      title: '文章流',
      items,
    }],
    sourceRefs: buildSourceRefs(items),
    evidenceRefs: Array.from(new Set(items.flatMap((item) => item.evidenceIds))),
    query,
    warnings: [],
  };
}

function parseWindow(message: string): string {
  if (/今日|今天|日报|24\s*h/i.test(message)) return '24h';
  if (/近\s*1\s*个?月|最近\s*1\s*个?月|近\s*30\s*天|最近\s*30\s*天|一个月/i.test(message)) return '30d';
  if (/近\s*7\s*天|最近\s*7\s*天|一周|本周/i.test(message)) return '7d';
  return '30d';
}

function extractKeyword(message: string): string | undefined {
  const patterns = [
    /(?:关键词|关键字|关于|围绕|检索|搜索|查看|看看)\s*[:：]?\s*["“]?([^"”？，。；\n]{2,40})/i,
    /["“]([^"”]{2,40})["”]/,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

export function buildGiQueryFromMessage(message: string, metadata?: Record<string, unknown>): GiQueryOptions | null {
  const text = message.trim();
  const metadataQuery = asRecord(metadata?.giIntelligenceQuery);
  if (Object.keys(metadataQuery).length) {
    return {
      mode: (pickString(metadataQuery, ['mode']) as GiFeedMode) || 'feed',
      profileId: pickString(metadataQuery, ['profileId']) || undefined,
      date: pickString(metadataQuery, ['date']) || undefined,
      since: pickString(metadataQuery, ['since']) || undefined,
      sourceType: pickString(metadataQuery, ['sourceType']) || undefined,
      sourceId: pickString(metadataQuery, ['sourceId']) || undefined,
      keyword: pickString(metadataQuery, ['keyword']) || undefined,
      eventType: stringArray(metadataQuery.eventType),
      priority: stringArray(metadataQuery.priority),
      audienceTag: pickString(metadataQuery, ['audienceTag']) || undefined,
      limit: pickNumber(metadataQuery, ['limit']) || 20,
      page: pickNumber(metadataQuery, ['page']),
      pageSize: pickNumber(metadataQuery, ['pageSize']),
      expandSeeds: metadataQuery.expandSeeds === true,
    };
  }
  const looksLikeDaily = /今日|今天|日报|摘要|早报|简报/.test(text);
  const looksLikeFeed = /情报|行业|资讯|文章|新闻|动态|信源|种子|公众号|微信|wechat|feed|买量|版号|上线|预约|舆情|AI游戏|小游戏/i.test(text);
  if (!looksLikeDaily && !looksLikeFeed) return null;
  const sourceType = /公众号|微信|wechat|wewe/i.test(text) ? 'wechat_mp' : undefined;
  const expandSeeds = /种子|信源|拓展|扩展|扩源|实时拓展|实时扩展/.test(text);
  return {
    mode: looksLikeDaily && !/文章流|资讯流|feed|近\s*1\s*个?月|最近\s*1\s*个?月|近\s*30\s*天|最近\s*30\s*天/i.test(text)
      ? 'daily_brief'
      : expandSeeds
        ? 'seed_expand'
        : 'feed',
    profileId: resolveProfileId(),
    since: parseWindow(text),
    sourceType,
    keyword: extractKeyword(text),
    limit: 20,
    expandSeeds,
  };
}

async function expandSeeds(baseUrl: string, query: GiQueryOptions): Promise<GiIntelligenceResult['seedExpansion']> {
  if (!query.keyword || !query.expandSeeds) {
    return { status: 'skipped', createdSeedIds: [], expandedSeedIds: [], message: '未请求关键词种子拓展。' };
  }
  const created = await fetchJsonWithTimeout(`${baseUrl}/seeds`, {
    method: 'POST',
    body: JSON.stringify({
      seedType: 'keyword',
      text: query.keyword,
      tags: ['chat-requested', 'realtime-expansion'],
    }),
  }).catch((error) => ({ ok: false, status: 0, data: { error: { message: String(error) } } }));
  if (!created.ok) {
    return { status: 'failed', createdSeedIds: [], expandedSeedIds: [], message: `关键词种子创建失败（HTTP ${created.status}）。` };
  }
  const createdPayload = asRecord(asRecord(created.data).data);
  const seedId = pickString(createdPayload, ['id']);
  if (!seedId) {
    return { status: 'partial', createdSeedIds: [], expandedSeedIds: [], message: 'GI 已接受关键词，但未返回种子 ID。' };
  }
  const expanded = await fetchJsonWithTimeout(`${baseUrl}/seeds/${encodeURIComponent(seedId)}/expand`, { method: 'POST' })
    .catch(() => ({ ok: false, status: 0, data: {} }));
  return {
    status: expanded.ok ? 'success' : 'failed',
    createdSeedIds: [seedId],
    expandedSeedIds: expanded.ok ? [seedId] : [],
    message: expanded.ok ? '已提交关键词种子拓展。' : `关键词种子已创建，拓展触发失败（HTTP ${expanded.status}）。`,
  };
}

export async function fetchGiIntelligence(query: GiQueryOptions): Promise<GiIntelligenceResult> {
  const baseUrl = normalizeBaseUrl();
  if (!baseUrl) {
    return {
      mode: query.mode,
      status: 'not_configured',
      title: '行业情报暂不可用',
      summary: 'GI 服务地址未配置，暂时不能获取实时情报。',
      items: [],
      sections: [],
      sourceRefs: [],
      evidenceRefs: [],
      query,
      warnings: ['gi_base_url_not_configured'],
    };
  }

  const effectiveQuery = { ...query, profileId: resolveProfileId(query.profileId) };
  let seedExpansion: GiIntelligenceResult['seedExpansion'] | undefined;
  if (effectiveQuery.expandSeeds || effectiveQuery.mode === 'seed_expand') {
    seedExpansion = await expandSeeds(baseUrl, effectiveQuery);
  }

  const params = new URLSearchParams();
  if (effectiveQuery.profileId) params.set('profileId', effectiveQuery.profileId);
  if (effectiveQuery.date) params.set('date', effectiveQuery.date);
  if (effectiveQuery.since) params.set('since', effectiveQuery.since);
  if (effectiveQuery.sourceType) params.set('sourceType', effectiveQuery.sourceType);
  if (effectiveQuery.sourceId) params.set('sourceId', effectiveQuery.sourceId);
  if (effectiveQuery.keyword) params.set('keyword', effectiveQuery.keyword);
  if (effectiveQuery.eventType?.length) params.set('eventType', effectiveQuery.eventType.join(','));
  if (effectiveQuery.priority?.length) params.set('priority', effectiveQuery.priority.join(','));
  if (effectiveQuery.audienceTag) params.set('audienceTag', effectiveQuery.audienceTag);
  if (effectiveQuery.limit) params.set('limit', String(effectiveQuery.limit));
  if (effectiveQuery.page) params.set('page', String(effectiveQuery.page));
  if (effectiveQuery.pageSize) params.set('pageSize', String(effectiveQuery.pageSize));

  const path = effectiveQuery.mode === 'daily_brief'
    ? `/intelligence/briefs/daily?${params.toString()}`
    : `/intelligence/feed?${params.toString()}`;
  const response = await fetchJsonWithTimeout(`${baseUrl}${path}`)
    .catch((error) => ({ ok: false, status: 0, data: { error: { message: String(error) } } }));
  if (!response.ok) {
    const error = asRecord(asRecord(response.data).error);
    return {
      mode: effectiveQuery.mode,
      status: response.status === 404 ? 'empty' : 'failed',
      title: '行业情报暂不可用',
      summary: response.status === 404
        ? '当前还没有生成可展示的行业情报。'
        : pickString(error, ['message']) || `GI 服务请求失败（HTTP ${response.status}）。`,
      items: [],
      sections: [],
      sourceRefs: [],
      evidenceRefs: [],
      query: effectiveQuery,
      warnings: [`gi_http_${response.status || 'network_error'}`],
      seedExpansion,
    };
  }
  const result = effectiveQuery.mode === 'daily_brief'
    ? normalizeBrief(response.data, effectiveQuery)
    : normalizeFeed(response.data, effectiveQuery);
  return {
    ...result,
    seedExpansion,
    status: seedExpansion?.status === 'failed' && result.status === 'success' ? 'partial' : result.status,
    warnings: [
      ...result.warnings,
      ...(seedExpansion?.status === 'failed' ? ['gi_seed_expansion_failed'] : []),
    ],
  };
}
