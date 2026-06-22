/**
 * Enumerate local WeWe articles from 2026-06-01 to now.
 *
 * WeWe's public feed/trpc endpoints expose article metadata but not article bodies.
 * This script downloads all available June-to-now metadata, probes article.byId for
 * body fields, writes full bodies to raw_evidence only when present, and exports a
 * JSON report that explicitly lists body-missing articles.
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase, getDatabase, closeDatabase } from '../src/lib/database.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { computeSimHash } from '../src/lib/simhash.js';
import { normalizeUrl } from '../src/lib/url-normalizer.js';
import type { IntelSource } from '../src/models/types.js';

const WEWE_BASE_URL = (process.env.WEWE_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const WEWE_AUTH_CODE = process.env.WEWE_AUTH_CODE || '';
const START = new Date(process.env.WEWE_START_DATE || '2026-06-01T00:00:00+08:00');
const END = process.env.WEWE_END_DATE ? new Date(process.env.WEWE_END_DATE) : new Date();
const EXPORT_PATH = process.env.WEWE_EXPORT_PATH || path.join('data', `wewe-articles-${datePart(START)}_${datePart(END)}.json`);
const PAGE_SIZE = Number(process.env.WEWE_PAGE_SIZE || 100);
const MAX_PAGES = Number(process.env.WEWE_MAX_PAGES || 200);

type SaveStatus = 'inserted' | 'updated' | 'skipped_existing' | 'skipped_no_body';

interface WeWeFeed {
  id: string;
  name: string;
  intro?: string | null;
  cover?: string | null;
  updateTime?: number | null;
}

interface WeWeArticle {
  id: string;
  mpId: string;
  title: string;
  picUrl?: string | null;
  publishTime?: number | null;
  url?: string | null;
  link?: string | null;
  content?: string | null;
  contentHtml?: string | null;
  content_html?: string | null;
  digest?: string | null;
  summary?: string | null;
  author?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface ExportArticle {
  id: string;
  mpId: string;
  sourceName: string;
  title: string;
  url?: string;
  publishedAt?: string;
  picUrl?: string | null;
  hasBody: boolean;
  bodyLength: number;
  status: SaveStatus;
  bodyMissingReason?: string;
}

async function main(): Promise<void> {
  initializeDatabase();

  const sourceRepo = new IntelSourceRepository();
  const feeds = await fetchFeeds();
  const sourceByMpId = new Map<string, IntelSource>();
  const feedByMpId = new Map(feeds.map((feed) => [feed.id, feed]));
  for (const feed of feeds) {
    sourceByMpId.set(feed.id, ensureSource(sourceRepo, feed));
  }

  const result = {
    startedAt: new Date().toISOString(),
    range: { from: START.toISOString(), to: END.toISOString() },
    weweBaseUrl: WEWE_BASE_URL,
    feedsChecked: feeds.length,
    articlesSeen: 0,
    inRange: 0,
    withBody: 0,
    missingBody: 0,
    inserted: 0,
    updated: 0,
    skippedExisting: 0,
    errors: [] as Array<{ step: string; message: string }>,
    articles: [] as ExportArticle[],
  };

  let cursor: string | undefined;
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const pageData = await fetchArticlePage(cursor);
    const items = pageData.items || [];
    if (items.length === 0) break;

    let pageHasInRange = false;
    let newItemsOnPage = 0;
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      newItemsOnPage += 1;
      result.articlesSeen += 1;

      const publishedAt = parsePublishTime(item.publishTime);
      if (!publishedAt || publishedAt < START) {
        if (publishedAt && publishedAt < START) pageHasInRange = false;
        continue;
      }
      if (publishedAt > END) continue;

      pageHasInRange = true;
      result.inRange += 1;

      const detail = await fetchArticleById(item.id).catch((error) => {
        result.errors.push({ step: `article.byId:${item.id}`, message: error instanceof Error ? error.message : String(error) });
        return item;
      });
      const merged = { ...item, ...detail };
      const source = sourceByMpId.get(merged.mpId);
      const feed = feedByMpId.get(merged.mpId);
      const saved = saveArticle(source, feed, merged, publishedAt);

      if (saved.hasBody) result.withBody += 1;
      else result.missingBody += 1;
      if (saved.status === 'inserted') result.inserted += 1;
      if (saved.status === 'updated') result.updated += 1;
      if (saved.status === 'skipped_existing') result.skippedExisting += 1;
      result.articles.push(saved);
    }

    process.stdout.write(`[WeWe] page ${page}: ${items.length} items, in-range total ${result.inRange}\n`);
    cursor = pageData.nextCursor;
    if (!cursor || newItemsOnPage === 0) break;
    if (!pageHasInRange && page > 1) {
      const oldest = items
        .map((item) => parsePublishTime(item.publishTime))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      if (oldest && oldest < START) break;
    }
  }

  fs.mkdirSync(path.dirname(EXPORT_PATH), { recursive: true });
  fs.writeFileSync(EXPORT_PATH, JSON.stringify(result, null, 2), 'utf8');

  console.log('\n=== WeWe 6月至今下载完成 ===');
  console.log(`时间范围: ${result.range.from} ~ ${result.range.to}`);
  console.log(`信源: ${result.feedsChecked}`);
  console.log(`枚举文章: ${result.articlesSeen}`);
  console.log(`范围内文章: ${result.inRange}`);
  console.log(`有正文: ${result.withBody}`);
  console.log(`缺正文: ${result.missingBody}`);
  console.log(`新增: ${result.inserted}`);
  console.log(`更新: ${result.updated}`);
  console.log(`已存在跳过: ${result.skippedExisting}`);
  console.log(`导出: ${EXPORT_PATH}`);

  closeDatabase();
}

function authHeaders(): Record<string, string> {
  return WEWE_AUTH_CODE ? { Authorization: WEWE_AUTH_CODE } : {};
}
async function fetchFeeds(): Promise<WeWeFeed[]> {
  const response = await fetch(`${WEWE_BASE_URL}/feeds`);
  if (!response.ok) throw new Error(`GET /feeds failed: ${response.status} ${await response.text()}`);
  return await response.json() as WeWeFeed[];
}

async function fetchArticlePage(cursor?: string): Promise<{ items: WeWeArticle[]; nextCursor?: string }> {
  const input: Record<string, unknown> = { limit: PAGE_SIZE };
  if (cursor) input.cursor = cursor;

  const url = new URL(`${WEWE_BASE_URL}/trpc/article.list`);
  url.searchParams.set('input', JSON.stringify({ json: input }));
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(`article.list failed: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { result?: { data?: { items?: WeWeArticle[]; nextCursor?: string } } };
  return { items: payload.result?.data?.items || [], nextCursor: payload.result?.data?.nextCursor };
}

async function fetchArticleById(id: string): Promise<Partial<WeWeArticle>> {
  const url = new URL(`${WEWE_BASE_URL}/trpc/article.byId`);
  url.searchParams.set('input', JSON.stringify(id));
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(`article.byId failed: ${response.status} ${await response.text()}`);
  const payload = await response.json() as { result?: { data?: Partial<WeWeArticle> } };
  return payload.result?.data || {};
}

function ensureSource(sourceRepo: IntelSourceRepository, feed: WeWeFeed): IntelSource {
  const feedUrl = `${WEWE_BASE_URL}/feeds/${feed.id}.xml`;
  const existing = sourceRepo.findAll({ limit: 10000 }).find((source) => (
    source.feedUrl === feedUrl
    || source.name === feed.name
    || String(source.config?.weweAccountId || '') === feed.id
  ));
  if (existing) return existing;

  return sourceRepo.create({
    name: feed.name,
    shortName: feed.name.substring(0, 10),
    sourceType: 'wechat_mp',
    accessMethod: 'rss',
    baseUrl: feedUrl,
    feedUrl,
    config: {
      weweAccountId: feed.id,
      intro: feed.intro || undefined,
      cover: feed.cover || undefined,
      downloadedSince: START.toISOString(),
    },
    schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
    enabled: true,
    priority: 'P1',
    tags: ['wewe', 'wechat', 'game'],
  });
}

function saveArticle(source: IntelSource | undefined, feed: WeWeFeed | undefined, article: WeWeArticle, publishedAt: Date): ExportArticle {
  const contentHtml = firstString(article.contentHtml, article.content_html, article.content);
  const content = cleanContent(contentHtml || '');
  const url = normalizeUrl(firstString(article.url, article.link) || `${WEWE_BASE_URL}/dash/article/${article.id}`);
  const title = article.title || '(无标题)';
  const base: ExportArticle = {
    id: article.id,
    mpId: article.mpId,
    sourceName: source?.name || feed?.name || article.mpId,
    title,
    url,
    publishedAt: publishedAt.toISOString(),
    picUrl: article.picUrl,
    hasBody: Boolean(content),
    bodyLength: content.length,
    status: content ? 'inserted' : 'skipped_no_body',
    bodyMissingReason: content ? undefined : 'WeWe /feeds, article.list, and article.byId expose metadata only; content fields are empty or absent.',
  };

  if (!content || !source) return base;

  const db = getDatabase();
  const existing = db.prepare('SELECT id, length(content) as content_length FROM raw_evidence WHERE url = ?').get(url) as { id: string; content_length: number } | undefined;
  const metadata = {
    collectorType: 'wewe',
    source: 'wewe',
    accountId: article.mpId,
    articleId: article.id,
    picUrl: article.picUrl,
    downloadedBy: 'scripts/download-wewe-june.ts',
    downloadedAt: new Date().toISOString(),
  };
  const hash = computeSimHash(`${title} ${content}`);
  const summary = firstString(article.summary, article.digest) || content.slice(0, 200);

  if (existing) {
    if (content.length <= existing.content_length) return { ...base, status: 'skipped_existing' };
    db.prepare(`
      UPDATE raw_evidence
      SET title = ?, content = ?, content_html = ?, summary = ?, author = ?, published_at = ?,
          images = ?, metadata = ?, hash = ?, status = 'collected', error_message = NULL
      WHERE id = ?
    `).run(title, content, contentHtml || null, summary, article.author || null, publishedAt.toISOString(), JSON.stringify(extractImages(contentHtml || '')), JSON.stringify(metadata), hash, existing.id);
    return { ...base, status: 'updated' };
  }

  db.prepare(`
    INSERT INTO raw_evidence (
      id, source_id, seed_ids, url, title, content, content_html, summary, author,
      published_at, collected_at, images, metadata, hash, status
    ) VALUES (?, ?, '[]', ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, 'collected')
  `).run(uuidv4(), source.id, url, title, content, contentHtml || null, summary, article.author || null, publishedAt.toISOString(), JSON.stringify(extractImages(contentHtml || '')), JSON.stringify(metadata), hash);

  return base;
}

function parsePublishTime(value: number | null | undefined): Date | null {
  if (!value) return null;
  const millis = value > 100000000000 ? value : value * 1000;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

function cleanContent(content: string): string {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImages(html: string): Array<{ url: string; alt?: string; position: number; processed: boolean }> {
  const images: Array<{ url: string; alt?: string; position: number; processed: boolean }> = [];
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  let position = 0;
  while ((match = regex.exec(html)) !== null) {
    position += 1;
    const alt = match[0].match(/alt=["']([^"']*)["']/i)?.[1];
    images.push({ url: match[1], alt, position, processed: false });
  }
  return images;
}

function datePart(date: Date): string {
  return date.toISOString().slice(0, 10);
}

main().catch((error) => {
  console.error(error);
  closeDatabase();
  process.exit(1);
});
