import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  getKnowledgeApiBase,
  getKnowledgeBaseApiKey,
  getModelServiceConfig,
  hasConfiguredKnowledgeCredentials,
  type ModelServiceConfig,
} from './runtime-config';
import { runtimeDataPath } from './runtime-data-path';

export type IndustrySourceType = 'official' | 'industry_media' | 'community';
export type IndustryProvider = 'crawl4ai' | 'playwright' | 'source_fetch';
export type IndustryLogType = 'crawl' | 'ingestion' | 'dedupe' | 'failure';
export type IndustryTaskStatus = 'pending' | 'running' | 'completed' | 'failed';
export type IndustrySyncStatus = 'pending' | 'synced' | 'failed' | 'skipped';

export interface IndustrySourceConfig {
  id: string;
  name: string;
  url: string;
  platform: 'Meta' | 'TikTok' | 'Google' | 'ASA';
  sourceType: IndustrySourceType;
  enabled: boolean;
  weight: number;
}

export interface IndustryIntelConfig {
  enabled: boolean;
  industryKnowledgeBaseId: string;
  datakiTag: string;
  datakiNamespace: string;
  crawl4aiEndpoint: string;
  playwrightEndpoint: string;
  enablePlaywrightFallback: boolean;
  crawlFrequency: string;
  timeoutMs: number;
  maxArticles: number;
  hotwords: string[];
  sources: IndustrySourceConfig[];
  updatedAt: string;
}

export interface IndustryArticle {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  platform: string;
  title: string;
  url: string;
  summary: string;
  contentMarkdown: string;
  contentHash: string;
  tags: string[];
  eventType: 'industry_update';
  eventLabels: string[];
  impactScore: number;
  confidence: number;
  affectedCapabilities: string[];
  actionRecommendation: string;
  version: number;
  provider: IndustryProvider;
  crawledAt: string;
  publishedAt?: string;
  syncStatus: IndustrySyncStatus;
  datakiKnowledgeBaseId?: string;
  datakiDocumentId?: string;
  syncError?: string;
}

export interface IndustryIntelLog {
  id: string;
  type: IndustryLogType;
  status: 'success' | 'failed' | 'skipped';
  sourceName?: string;
  url?: string;
  provider?: IndustryProvider;
  message: string;
  articleId?: string;
  datakiDocumentId?: string;
  duplicateOf?: string;
  createdAt: string;
}

export interface IndustryIntelTask {
  id: string;
  question: string;
  status: IndustryTaskStatus;
  platforms: string[];
  hotwords: string[];
  createdAt: string;
  completedAt?: string;
  articleIds: string[];
  syncedCount: number;
  failedCount: number;
  message: string;
}

interface IndustryIntelFile {
  config: IndustryIntelConfig;
  articles: IndustryArticle[];
  logs: IndustryIntelLog[];
  tasks: IndustryIntelTask[];
}

export interface IndustryNewsResult {
  task: IndustryIntelTask;
  articles: IndustryArticle[];
  logs: IndustryIntelLog[];
  answer: string;
  sourceRefs: IndustryNewsSourceRef[];
}

export interface IndustryNewsSourceRef {
    title: string;
    source: string;
    url?: string;
    source_type: 'knowledge_base' | 'web_search' | 'skill';
    icon?: string;
    prompt?: string;
}

const STORE_PATH = runtimeDataPath('industry-intel.json');
const REQUEST_TIMEOUT_MS = 9000;

const DEFAULT_SOURCES: IndustrySourceConfig[] = [
  {
    id: 'meta-developer-blog',
    name: 'Meta Developer Blog',
    url: 'https://developers.facebook.com/blog/',
    platform: 'Meta',
    sourceType: 'official',
    enabled: true,
    weight: 0.95,
  },
  {
    id: 'tiktok-newsroom',
    name: 'TikTok Newsroom',
    url: 'https://newsroom.tiktok.com/en-us/',
    platform: 'TikTok',
    sourceType: 'official',
    enabled: true,
    weight: 0.92,
  },
  {
    id: 'google-ads-blog',
    name: 'Google Ads Blog',
    url: 'https://blog.google/products/ads-commerce/',
    platform: 'Google',
    sourceType: 'official',
    enabled: true,
    weight: 0.9,
  },
  {
    id: 'apple-search-ads',
    name: 'Apple Search Ads',
    url: 'https://searchads.apple.com/news',
    platform: 'ASA',
    sourceType: 'official',
    enabled: true,
    weight: 0.93,
  },
];

const DEFAULT_CONFIG: IndustryIntelConfig = {
  enabled: true,
  industryKnowledgeBaseId: process.env.XIAOQIAO_INDUSTRY_KNOWLEDGE_BASE_ID || '',
  datakiTag: 'industry-news',
  datakiNamespace: 'ad-industry',
  crawl4aiEndpoint: process.env.XIAOQIAO_CRAWL4AI_ENDPOINT || '',
  playwrightEndpoint: process.env.XIAOQIAO_PLAYWRIGHT_CRAWLER_ENDPOINT || '',
  enablePlaywrightFallback: Boolean(process.env.XIAOQIAO_PLAYWRIGHT_CRAWLER_ENDPOINT),
  crawlFrequency: 'daily',
  timeoutMs: 9000,
  maxArticles: 8,
  hotwords: ['SKAN', 'AEO', 'ROAS', 'Creative', 'ASA'],
  sources: DEFAULT_SOURCES,
  updatedAt: new Date().toISOString(),
};

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' ? input as Record<string, unknown> : {};
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function normalizeSource(input: Partial<IndustrySourceConfig>, fallback: IndustrySourceConfig): IndustrySourceConfig {
  return {
    ...fallback,
    ...input,
    id: input.id?.trim() || fallback.id,
    name: input.name?.trim() || fallback.name,
    url: input.url?.trim() || fallback.url,
    platform: input.platform || fallback.platform,
    sourceType: input.sourceType || fallback.sourceType,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    weight: Number.isFinite(Number(input.weight)) ? Number(input.weight) : fallback.weight,
  };
}

function normalizeConfig(input?: Partial<IndustryIntelConfig>): IndustryIntelConfig {
  const sourcesInput = Array.isArray(input?.sources) && input?.sources.length ? input.sources : DEFAULT_SOURCES;
  return {
    ...DEFAULT_CONFIG,
    ...input,
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : DEFAULT_CONFIG.enabled,
    industryKnowledgeBaseId: input?.industryKnowledgeBaseId?.trim() || DEFAULT_CONFIG.industryKnowledgeBaseId,
    datakiTag: input?.datakiTag?.trim() || DEFAULT_CONFIG.datakiTag,
    datakiNamespace: input?.datakiNamespace?.trim() || DEFAULT_CONFIG.datakiNamespace,
    crawl4aiEndpoint: input?.crawl4aiEndpoint?.trim() || DEFAULT_CONFIG.crawl4aiEndpoint,
    playwrightEndpoint: input?.playwrightEndpoint?.trim() || DEFAULT_CONFIG.playwrightEndpoint,
    enablePlaywrightFallback: typeof input?.enablePlaywrightFallback === 'boolean' ? input.enablePlaywrightFallback : DEFAULT_CONFIG.enablePlaywrightFallback,
    crawlFrequency: input?.crawlFrequency?.trim() || DEFAULT_CONFIG.crawlFrequency,
    timeoutMs: Number.isFinite(Number(input?.timeoutMs)) ? Number(input?.timeoutMs) : DEFAULT_CONFIG.timeoutMs,
    maxArticles: Number.isFinite(Number(input?.maxArticles)) ? Number(input?.maxArticles) : DEFAULT_CONFIG.maxArticles,
    hotwords: Array.isArray(input?.hotwords) && input.hotwords.length ? input.hotwords.map(String).filter(Boolean) : DEFAULT_CONFIG.hotwords,
    sources: sourcesInput.map((source, index) => normalizeSource(source, DEFAULT_SOURCES[index] || DEFAULT_SOURCES[0])),
    updatedAt: input?.updatedAt || new Date().toISOString(),
  };
}

async function readStore(): Promise<IndustryIntelFile> {
  try {
    const raw = await readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<IndustryIntelFile>;
    return {
      config: normalizeConfig(parsed.config),
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    };
  } catch {
    return {
      config: normalizeConfig(),
      articles: [],
      logs: [],
      tasks: [],
    };
  }
}

async function writeStore(file: IndustryIntelFile): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify({
    config: file.config,
    articles: file.articles.slice(-200),
    logs: file.logs.slice(-200),
    tasks: file.tasks.slice(-100),
  }, null, 2), 'utf8');
}

function logItem(input: Omit<IndustryIntelLog, 'id' | 'createdAt'>): IndustryIntelLog {
  return {
    id: `industry-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripHtml(html: string): string {
  return normalizeText(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'"));
}

function extractHtmlTitle(html: string, fallback: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return normalizeText(og[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title?.[1] ? normalizeText(stripHtml(title[1])) : fallback;
}

function extractHtmlDescription(html: string, fallback: string): string {
  const meta = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  return meta?.[1] ? normalizeText(meta[1]) : fallback;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function extractPlatforms(question: string): string[] {
  const platforms: string[] = [];
  if (/meta|facebook|instagram/i.test(question)) platforms.push('Meta');
  if (/tiktok|tik\s*tok|抖音/i.test(question)) platforms.push('TikTok');
  if (/google|adwords/i.test(question)) platforms.push('Google');
  if (/asa|apple search ads|苹果搜索广告|苹果广告/i.test(question)) platforms.push('ASA');
  return Array.from(new Set(platforms));
}

function extractHotwords(question: string, configured: string[]): string[] {
  const normalized = question.toLowerCase();
  return configured.filter(word => normalized.includes(word.toLowerCase()));
}

function selectSources(config: IndustryIntelConfig, question: string): IndustrySourceConfig[] {
  const platforms = extractPlatforms(question);
  const enabled = config.sources.filter(source => source.enabled);
  const selected = platforms.length
    ? enabled.filter(source => platforms.includes(source.platform))
    : enabled;
  return selected.slice(0, Math.max(1, config.maxArticles));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function callJsonProvider(
  endpoint: string,
  source: IndustrySourceConfig,
  provider: IndustryProvider,
  timeoutMs: number,
): Promise<{ provider: IndustryProvider; title: string; summary: string; content: string; url: string; publishedAt?: string }> {
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: source.url,
      source_name: source.name,
      platform: source.platform,
      output: 'markdown',
    }),
  }, timeoutMs);
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(pickString(data, ['message', 'error']) || `HTTP ${response.status}`);
  const nested = asRecord(data.data) || {};
  const title = pickString(data, ['title']) || pickString(nested, ['title']) || source.name;
  const content = pickString(data, ['markdown', 'content', 'text'])
    || pickString(nested, ['markdown', 'content', 'text']);
  if (!content || content.length < 80) throw new Error('未返回可用正文');
  return {
    provider,
    title,
    summary: pickString(data, ['summary', 'description']) || pickString(nested, ['summary', 'description']) || content.slice(0, 180),
    content,
    url: pickString(data, ['url']) || pickString(nested, ['url']) || source.url,
    publishedAt: pickString(data, ['published_at', 'publishedAt']) || pickString(nested, ['published_at', 'publishedAt']) || undefined,
  };
}

async function fetchSourcePage(
  source: IndustrySourceConfig,
  timeoutMs: number,
): Promise<{ provider: IndustryProvider; title: string; summary: string; content: string; url: string }> {
  const response = await fetchWithTimeout(source.url, {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'ZhitouChatIndustryIntel/0.7',
    },
  }, timeoutMs);
  const html = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const title = extractHtmlTitle(html, source.name);
  const description = extractHtmlDescription(html, '');
  const text = stripHtml(html);
  if (!text || text.length < 120) throw new Error('未抓取到足够正文');
  return {
    provider: 'source_fetch',
    title,
    summary: description || text.slice(0, 220),
    content: text.slice(0, 6000),
    url: source.url,
  };
}

async function crawlSource(
  config: IndustryIntelConfig,
  source: IndustrySourceConfig,
): Promise<{ provider: IndustryProvider; title: string; summary: string; content: string; url: string; publishedAt?: string }> {
  if (config.crawl4aiEndpoint) {
    try {
      return await callJsonProvider(config.crawl4aiEndpoint, source, 'crawl4ai', config.timeoutMs);
    } catch (error) {
      if (!config.enablePlaywrightFallback || !config.playwrightEndpoint) throw error;
    }
  }
  if (config.enablePlaywrightFallback && config.playwrightEndpoint) {
    try {
      return await callJsonProvider(config.playwrightEndpoint, source, 'playwright', config.timeoutMs);
    } catch {
      // 最后使用轻量源抓取兜底，让 v0.7 可以在 Crawl 服务未部署时暴露来源不足或可用摘要。
    }
  }
  return fetchSourcePage(source, config.timeoutMs);
}

function classifyArticle(
  source: IndustrySourceConfig,
  content: string,
  summary: string,
  hotwords: string[],
): Pick<IndustryArticle, 'tags' | 'eventLabels' | 'impactScore' | 'confidence' | 'affectedCapabilities' | 'actionRecommendation'> {
  const text = `${content} ${summary}`.toLowerCase();
  const matchedHotwords = hotwords.filter(word => text.includes(word.toLowerCase()));
  const labels = new Set<string>();
  const capabilities = new Set<string>();

  if (/policy|privacy|terms|requirement|guideline|政策|隐私|规则|要求|合规/i.test(text)) {
    labels.add('policy');
    capabilities.add('政策合规');
  }
  if (/creative|素材|创意|video|asset/i.test(text)) {
    labels.add('creative');
    capabilities.add('创意素材');
  }
  if (/skan|measurement|attribution|conversion|event|归因|回传|转化|事件/i.test(text)) {
    labels.add('measurement');
    capabilities.add('归因与数据');
  }
  if (/automation|ai|targeting|optimization|aeo|roas|bid|campaign|自动化|优化|出价/i.test(text)) {
    labels.add('platform_feature');
    capabilities.add('投放优化');
  }
  matchedHotwords.forEach(word => labels.add(word));
  const impactScore = Math.min(0.98, source.weight * 0.45 + matchedHotwords.length * 0.1 + labels.size * 0.08 + (labels.has('policy') ? 0.16 : 0));
  if (impactScore >= 0.68) labels.add('high_impact');

  const affected = Array.from(capabilities);
  return {
    tags: Array.from(new Set([source.platform, ...matchedHotwords, ...labels])),
    eventLabels: Array.from(labels),
    impactScore: Number(impactScore.toFixed(2)),
    confidence: Number(Math.min(0.95, source.weight * 0.75 + (content.length > 500 ? 0.12 : 0.05)).toFixed(2)),
    affectedCapabilities: affected.length ? affected : ['行业观察'],
    actionRecommendation: impactScore >= 0.68
      ? '建议相关同学关注，并结合当前投放、归因或素材口径确认是否需要调整。'
      : '暂不需要立即动作，建议持续观察后续官方更新。',
  };
}

function buildArticleDocument(config: IndustryIntelConfig, article: IndustryArticle): { title: string; content: string; metadata: Record<string, unknown> } {
  const title = `行业动态-${article.platform}-${article.title}`.slice(0, 120);
  const content = [
    `# ${title}`,
    '',
    `- 来源：${article.sourceName}`,
    `- 平台：${article.platform}`,
    `- 原文：${article.url}`,
    `- 采集时间：${article.crawledAt}`,
    `- 标签：${article.tags.join('、') || '无'}`,
    `- 影响程度：${article.impactScore}`,
    `- 可信度：${article.confidence}`,
    '',
    '## 摘要',
    article.summary,
    '',
    '## 业务影响判断',
    `影响能力：${article.affectedCapabilities.join('、')}`,
    article.actionRecommendation,
    '',
    '## 正文摘录',
    article.contentMarkdown.slice(0, 4000),
  ].join('\n');
  return {
    title,
    content,
    metadata: {
      source: 'industry_intel',
      namespace: config.datakiNamespace,
      tag: config.datakiTag,
      source_url: article.url,
      platform: article.platform,
      event_labels: article.eventLabels,
      impact_score: article.impactScore,
      confidence: article.confidence,
    },
  };
}

async function datakiFetch<T = Record<string, unknown>>(
  url: string,
  config: ModelServiceConfig,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': getKnowledgeBaseApiKey(config),
      ...(init.headers || {}),
    },
  }, REQUEST_TIMEOUT_MS);
  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }
  }
  const record = asRecord(data);
  const message = pickString(record, ['message', 'error']) || pickString(asRecord(record.error), ['message']) || (response.ok ? '' : `HTTP ${response.status}`);
  return {
    ok: response.ok && record.success !== false,
    status: response.status,
    data: data as T,
    error: message,
  };
}

function extractDocumentId(data: unknown): string {
  const record = asRecord(data);
  const dataRecord = asRecord(record.data);
  return pickString(record, ['id', 'document_id', 'doc_id', 'knowledge_id'])
    || pickString(dataRecord, ['id', 'document_id', 'doc_id', 'knowledge_id']);
}

function extractKnowledgeItems(data: unknown): Array<{ id: string; title: string }> {
  const record = asRecord(data);
  const candidates = [
    record.data,
    asRecord(record.data).items,
    asRecord(record.data).list,
    record.items,
    record.list,
  ];
  const list = candidates.find(Array.isArray) as unknown[] | undefined;
  return (list || [])
    .map(item => {
      const itemRecord = asRecord(item);
      return {
        id: pickString(itemRecord, ['id', 'knowledge_id', 'doc_id']),
        title: pickString(itemRecord, ['title', 'name', 'file_name']),
      };
    })
    .filter(item => item.id);
}

async function syncArticleToDataki(config: IndustryIntelConfig, article: IndustryArticle): Promise<{ status: IndustrySyncStatus; documentId?: string; error?: string }> {
  if (!config.industryKnowledgeBaseId) {
    return { status: 'skipped', error: '行业动态知识库 ID 未配置' };
  }
  const modelConfig = await getModelServiceConfig();
  if (!hasConfiguredKnowledgeCredentials(modelConfig)) {
    return { status: 'skipped', error: 'Dataki 知识库地址或 Key 未配置' };
  }
  const apiBase = getKnowledgeApiBase(modelConfig);
  if (!apiBase) return { status: 'failed', error: 'Dataki 知识库地址未配置' };

  const document = buildArticleDocument(config, article);
  const listUrl = new URL(`${apiBase}/knowledge-bases/${encodeURIComponent(config.industryKnowledgeBaseId)}/knowledge`);
  listUrl.searchParams.set('page', '1');
  listUrl.searchParams.set('page_size', '20');
  listUrl.searchParams.set('keyword', document.title);
  listUrl.searchParams.set('file_type', 'manual');
  const listed = await datakiFetch(listUrl.toString(), modelConfig, { method: 'GET' }).catch(error => ({ ok: false, status: 0, data: {}, error: String(error) }));
  const existing = listed.ok ? extractKnowledgeItems(listed.data).find(item => item.title === document.title) : undefined;

  if (existing?.id) {
    const updated = await datakiFetch(`${apiBase}/knowledge/manual/${encodeURIComponent(existing.id)}`, modelConfig, {
      method: 'PUT',
      body: JSON.stringify({
        title: document.title,
        content: document.content,
        status: 'publish',
        channel: 'api',
      }),
    }).catch(error => ({ ok: false, status: 0, data: {}, error: String(error) }));
    if (updated.ok) {
      return { status: 'synced', documentId: extractDocumentId(updated.data) || existing.id };
    }
  }

  const created = await datakiFetch(`${apiBase}/knowledge-bases/${encodeURIComponent(config.industryKnowledgeBaseId)}/knowledge/manual`, modelConfig, {
    method: 'POST',
    body: JSON.stringify({
      title: document.title,
      content: document.content,
      status: 'publish',
      channel: 'api',
    }),
  }).catch(error => ({ ok: false, status: 0, data: {}, error: String(error) }));
  if (created.ok) {
    return { status: 'synced', documentId: extractDocumentId(created.data) || document.title };
  }
  return { status: 'failed', error: created.error || `HTTP ${created.status}` };
}

function buildIndustryAnswer(articles: IndustryArticle[], logs: IndustryIntelLog[]): string {
  const surfaced = articles
    .filter(article => article.impactScore >= 0.5)
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 3);
  if (!surfaced.length) {
    const hasFailure = logs.some(log => log.status === 'failed');
    return hasFailure
      ? '当前行业动态来源不足，暂时不能形成可靠判断。已记录采集失败信息，建议稍后重试。'
      : '最近没有发现需要立即跟进的广告行业变化。';
  }
  const lines = surfaced.map((article, index) => (
    `${index + 1}. ${article.platform}：${article.summary.slice(0, 120)}。影响方向：${article.affectedCapabilities.join('、')}。${article.actionRecommendation}`
  ));
  return [
    `最近广告行业有 ${surfaced.length} 个值得关注的变化：`,
    '',
    ...lines,
    '',
    '建议先关注高影响平台更新，并结合当前投放、归因和素材口径判断是否需要调整。',
  ].join('\n');
}

export function isIndustryNewsQuestion(message: string): boolean {
  const clean = message.replace(/\[项目上下文\][\s\S]*?\[用户要求\]/g, '').trim();
  if (/(行业创意|素材榜|小游戏排行榜|应用商店榜单|买量榜单)/i.test(clean)) return false;
  return /(行业动态|广告行业.*变化|最近.*广告行业|Meta\s*最近|TikTok\s*Ads|TikTok.*趋势|ASA\s*政策|Apple Search Ads|SKAN|AEO|ROAS.*趋势|Creative.*趋势|媒体政策|平台更新|广告平台.*趋势)/i.test(clean);
}

export async function getIndustryIntelConfig(): Promise<IndustryIntelConfig> {
  const store = await readStore();
  return store.config;
}

export async function updateIndustryIntelConfig(patch: Partial<IndustryIntelConfig>): Promise<IndustryIntelConfig> {
  const store = await readStore();
  const next = normalizeConfig({
    ...store.config,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  await writeStore({ ...store, config: next });
  return next;
}

export async function listIndustryArticles(): Promise<IndustryArticle[]> {
  const store = await readStore();
  return store.articles.slice().sort((a, b) => b.crawledAt.localeCompare(a.crawledAt));
}

export async function getIndustryArticle(id: string): Promise<IndustryArticle | null> {
  const store = await readStore();
  return store.articles.find(article => article.id === id) || null;
}

export async function listIndustryLogs(type?: IndustryLogType): Promise<IndustryIntelLog[]> {
  const store = await readStore();
  return store.logs
    .filter(log => !type || log.type === type)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getIndustryTask(id: string): Promise<IndustryIntelTask | null> {
  const store = await readStore();
  return store.tasks.find(task => task.id === id) || null;
}

export async function runIndustryNewsSkill(question: string): Promise<IndustryNewsResult> {
  const store = await readStore();
  const config = store.config;
  const task: IndustryIntelTask = {
    id: `industry-task-${Date.now()}`,
    question,
    status: 'running',
    platforms: extractPlatforms(question),
    hotwords: extractHotwords(question, config.hotwords),
    createdAt: new Date().toISOString(),
    articleIds: [],
    syncedCount: 0,
    failedCount: 0,
    message: '正在更新行业动态。',
  };
  const nextStore: IndustryIntelFile = {
    ...store,
    tasks: [...store.tasks, task],
    logs: [...store.logs],
    articles: [...store.articles],
  };

  if (!config.enabled) {
    const log = logItem({ type: 'failure', status: 'failed', message: '行业动态能力未启用' });
    task.status = 'failed';
    task.message = log.message;
    nextStore.logs.push(log);
    await writeStore(nextStore);
    return { task, articles: [], logs: [log], answer: '当前行业动态能力未启用，暂时不能形成可靠判断。', sourceRefs: [] };
  }

  const selectedSources = selectSources(config, question);
  const taskLogs: IndustryIntelLog[] = [];
  const taskArticles: IndustryArticle[] = [];
  const crawledResults = await Promise.all(
    selectedSources.map(async source => {
      try {
        return { source, crawled: await crawlSource(config, source) };
      } catch (error) {
        return { source, error };
      }
    }),
  );

  for (const result of crawledResults) {
    const { source } = result;
    if ('error' in result) {
      const log = logItem({
        type: 'failure',
        status: 'failed',
        sourceName: source.name,
        url: source.url,
        provider: config.crawl4aiEndpoint ? 'crawl4ai' : 'source_fetch',
        message: result.error instanceof Error ? result.error.message : String(result.error),
      });
      nextStore.logs.push(log);
      taskLogs.push(log);
      task.failedCount += 1;
      continue;
    }

    try {
      const { crawled } = result;
      const contentHash = sha256(`${crawled.title}\n${crawled.content}`);
      const duplicate = nextStore.articles.find(article => article.url === crawled.url || article.contentHash === contentHash);
      if (duplicate && duplicate.contentHash === contentHash) {
        const log = logItem({
          type: 'dedupe',
          status: 'skipped',
          sourceName: source.name,
          url: crawled.url,
          provider: crawled.provider,
          message: '内容已存在，未重复入库。',
          duplicateOf: duplicate.id,
        });
        nextStore.logs.push(log);
        taskLogs.push(log);
        taskArticles.push(duplicate);
        task.articleIds.push(duplicate.id);
        continue;
      }
      const classified = classifyArticle(source, crawled.content, crawled.summary, config.hotwords);
      const article: IndustryArticle = {
        id: duplicate?.id || `industry-article-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.url,
        platform: source.platform,
        title: crawled.title,
        url: crawled.url,
        summary: crawled.summary.slice(0, 260),
        contentMarkdown: crawled.content,
        contentHash,
        ...classified,
        eventType: 'industry_update',
        version: duplicate ? duplicate.version + 1 : 1,
        provider: crawled.provider,
        crawledAt: new Date().toISOString(),
        publishedAt: crawled.publishedAt,
        syncStatus: 'pending',
        datakiKnowledgeBaseId: config.industryKnowledgeBaseId || undefined,
      };
      const syncResult = await syncArticleToDataki(config, article);
      article.syncStatus = syncResult.status;
      article.datakiDocumentId = syncResult.documentId;
      article.syncError = syncResult.error;
      if (syncResult.status === 'synced') task.syncedCount += 1;
      if (syncResult.status === 'failed') task.failedCount += 1;

      if (duplicate) {
        nextStore.articles = nextStore.articles.map(item => item.id === duplicate.id ? article : item);
      } else {
        nextStore.articles.push(article);
      }
      taskArticles.push(article);
      task.articleIds.push(article.id);
      const crawlLog = logItem({
        type: 'crawl',
        status: 'success',
        sourceName: source.name,
        url: article.url,
        provider: article.provider,
        articleId: article.id,
        message: '已获取行业动态内容。',
      });
      const ingestionLog = logItem({
        type: 'ingestion',
        status: article.syncStatus === 'synced' ? 'success' : article.syncStatus === 'skipped' ? 'skipped' : 'failed',
        sourceName: source.name,
        url: article.url,
        provider: article.provider,
        articleId: article.id,
        datakiDocumentId: article.datakiDocumentId,
        message: article.syncStatus === 'synced'
          ? '已同步到行业动态知识库。'
          : article.syncError || '行业动态知识库未完成同步。',
      });
      nextStore.logs.push(crawlLog, ingestionLog);
      taskLogs.push(crawlLog, ingestionLog);
    } catch (error) {
      const log = logItem({
        type: 'failure',
        status: 'failed',
        sourceName: source.name,
        url: source.url,
        provider: config.crawl4aiEndpoint ? 'crawl4ai' : 'source_fetch',
        message: error instanceof Error ? error.message : String(error),
      });
      nextStore.logs.push(log);
      taskLogs.push(log);
      task.failedCount += 1;
    }
  }

  const uniqueArticles = Array.from(new Map(taskArticles.map(article => [article.id, article])).values());
  task.status = uniqueArticles.length ? 'completed' : 'failed';
  task.completedAt = new Date().toISOString();
  task.message = uniqueArticles.length ? '行业动态已更新。' : '当前没有获取到可用行业动态。';
  nextStore.tasks = nextStore.tasks.map(item => item.id === task.id ? task : item);
  await writeStore(nextStore);

  const sourceRefs: IndustryNewsSourceRef[] = uniqueArticles.slice(0, 5).map(article => ({
    title: article.title,
    source: article.sourceName,
    url: article.url,
    source_type: article.syncStatus === 'synced' ? 'knowledge_base' as const : 'web_search' as const,
    icon: article.syncStatus === 'synced' ? 'knowledge' : 'web_search',
    prompt: `平台：${article.platform}；影响能力：${article.affectedCapabilities.join('、')}；可信度：${article.confidence}`,
  }));
  sourceRefs.unshift({
    title: 'Industry News Skill',
    source: 'Skill',
    source_type: 'skill',
    icon: 'skill',
    prompt: '识别行业动态问题，生成广告业务影响判断。',
  });

  return {
    task,
    articles: uniqueArticles,
    logs: taskLogs,
    answer: buildIndustryAnswer(uniqueArticles, taskLogs),
    sourceRefs,
  };
}
