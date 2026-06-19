import { createHash } from 'node:crypto';
import { isUnsafePublicWebEndpoint, type PublicSearchProviderConfig, type PublicWebConfig } from '@/lib/runtime-config';
import type { WebFetchInput, WebSearchInput } from '@/contracts/public-web/source-grounding';
import { fetchWeatherSearchItems } from '@/lib/weather-search-provider';

/**
 * 从 HTML 中提取正文内容（纯文本）
 * 轻量实现：不依赖外部库，通过正则剥离标签和噪音
 */
function extractTextFromHtml(html: string): { title: string; text: string } {
  // 提取 title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // 移除 script / style / noscript
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // 优先从 <article> / <main> / role=main 提取
  const articleMatch = cleaned.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i);
  if (articleMatch) {
    cleaned = articleMatch[1];
  }

  // 移除 header / footer / nav / aside
  cleaned = cleaned
    .replace(/<(?:header|footer|nav|aside|form)[\s\S]*?<\/(?:header|footer|nav|aside|form)>/gi, '');

  // 将 <br> / <p> / <div> / <li> 等块级标签转为换行
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|tr|blockquote|section)>/gi, '\n')
    .replace(/<(?:h[1-6])[^>]*>/gi, '\n## ');

  // 剥离所有剩余标签
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // 解码常见 HTML 实体
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  // 清理多余空白
  const lines = cleaned
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter(line => line.length > 1);

  return { title, text: lines.join('\n').slice(0, 12000) };
}

/**
 * simple_fetch: 直接用 Node fetch 抓取 HTML 并提取正文
 */
function domainMatches(host: string, domains: string[]): boolean {
  const normalizedHost = host.replace(/^www\./, '').toLowerCase();
  return domains
    .map(domain => domain.trim().replace(/^www\./, '').toLowerCase())
    .filter(Boolean)
    .some(domain => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`));
}

function isPrivateIpAddress(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost') return true;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
  const parts = host.split('.').map(part => Number(part));
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10
    || a === 127
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 169 && b === 254)
    || a === 0;
}

function isMetadataHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return host === 'metadata.google.internal'
    || host === 'metadata'
    || host === '169.254.169.254'
    || host.endsWith('.metadata.google.internal');
}

function assertSimpleFetchUrlAllowed(rawUrl: string, config: PublicWebConfig): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('simple_fetch_invalid_url');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('simple_fetch_non_http_url');
  if (isMetadataHost(url.hostname)) throw new Error('simple_fetch_metadata_blocked');
  if (isPrivateIpAddress(url.hostname)) throw new Error('simple_fetch_private_ip_blocked');
  if (isUnsafePublicWebEndpoint(url.toString())) throw new Error('simple_fetch_unsafe_url');
  if (config.blockedDomains.length && domainMatches(url.hostname, config.blockedDomains)) throw new Error('simple_fetch_blocked_domain');
  if (config.allowedDomains.length && !domainMatches(url.hostname, config.allowedDomains)) throw new Error('simple_fetch_domain_not_allowed');
  return url;
}

async function fetchWithSimpleProvider(input: WebFetchInput, provider: PublicSearchProviderConfig, config: PublicWebConfig): Promise<FetchProviderResult> {
  const timeoutMs = input.timeoutMs || provider.timeoutMs || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let currentUrl = assertSimpleFetchUrlAllowed(input.url, config);
    let response: Response | null = null;
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      response = await fetch(currentUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; XiaoQiao/1.0; +https://xiaoqiao.example.com)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
        redirect: 'manual',
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location) throw new Error('simple_fetch_redirect_missing_location');
      currentUrl = assertSimpleFetchUrlAllowed(new URL(location, currentUrl).toString(), config);
    }
    if (!response) throw new Error('simple_fetch_no_response');
    if ([301, 302, 303, 307, 308].includes(response.status)) throw new Error('simple_fetch_redirect_limit');
    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain|application\/xml|text\/xml/i.test(contentType)) {
      throw new Error('simple_fetch_unsupported_content_type');
    }
    const html = await response.text();
    const { title, text } = extractTextFromHtml(html);
    const content = text;
    return {
      url: currentUrl.toString(),
      title,
      text: content,
      markdown: content,
      provider: provider.id,
      contentHash: content ? createHash('sha1').update(content).digest('hex') : undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface SearchProviderResultItem {
  title: string;
  url: string;
  snippet: string;
  siteName?: string;
  publisher?: string;
  publishedAt?: string;
  updatedAt?: string;
  provider: string;
}

export interface FetchProviderResult {
  url: string;
  title?: string;
  markdown?: string;
  text?: string;
  publishedAt?: string;
  updatedAt?: string;
  provider: string;
  contentHash?: string;
}

export interface ProviderCallRecord {
  provider_id: string;
  provider_kind: string;
  capability: 'search' | 'deep_search' | 'fetch';
  status: 'success' | 'failed' | 'skipped';
  duration_ms: number;
  query?: string;
  url?: string;
  result_count?: number;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readPath(value: unknown, path: string): unknown {
  if (!path) return value;
  return path.split('.').filter(Boolean).reduce((current, key) => {
    if (Array.isArray(current)) return current[Number(key)];
    if (isRecord(current)) return current[key];
    return undefined;
  }, value);
}

function findArrayCandidate(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  const candidates = [
    value.results,
    value.items,
    value.data,
    value.list,
    value.web,
    value.organic,
    value.organic_results,
    value.sources,
    value.citations,
    value.webPages,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      const nested = findArrayCandidate(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function buildProviderHeaders(provider: PublicSearchProviderConfig, defaults: PublicWebConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const authType = provider.authType || defaults.authType;
  const apiKey = provider.apiKey || defaults.apiKey;
  if (authType === 'bearer' && apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (authType === 'api_key_header' && apiKey) headers[provider.apiKeyHeader || defaults.apiKeyHeader || 'X-API-Key'] = apiKey;
  if (authType === 'custom_headers') Object.assign(headers, defaults.headers || {});
  return headers;
}

function normalizeSearchItems(data: unknown, provider: PublicSearchProviderConfig, config: PublicWebConfig): SearchProviderResultItem[] {
  const rawItems = config.resultsPath ? readPath(data, config.resultsPath) : findArrayCandidate(data);
  const list = Array.isArray(rawItems) ? rawItems : findArrayCandidate(rawItems);
  return list
    .map((item): SearchProviderResultItem | null => {
      if (!isRecord(item)) return null;
      const source = isRecord(item.source) ? item.source : {};
      const profile = isRecord(item.profile) ? item.profile : {};
      const url = asString(readPath(item, config.urlPath))
        || asString(item.url)
        || asString(item.link)
        || asString(item.href)
        || asString(source.url);
      if (!url || isUnsafePublicWebEndpoint(url)) return null;
      const title = asString(readPath(item, config.titlePath))
        || asString(item.title)
        || asString(item.name)
        || url;
      // Exa returns `highlights` as array of strings; join them into snippet
      const highlights = Array.isArray(item.highlights)
        ? (item.highlights as unknown[]).map(h => asString(h)).filter(Boolean).join(' ... ')
        : '';
      // Tavily returns `content` field for the main text
      const snippet = asString(readPath(item, config.snippetPath))
        || asString(item.snippet)
        || asString(item.description)
        || highlights
        || asString(item.content)
        || asString(item.text)
        || asString(item.summary);
      // Exa returns `publishedDate` and `updatedDate` in ISO format
      const publishedAt = asString(item.publishedDate)
        || asString(item.published_at)
        || asString(item.publishedAt)
        || asString(item.date);
      const updatedAt = asString(item.updatedDate)
        || asString(item.updated_at)
        || asString(item.updatedAt);
      return {
        title,
        url,
        snippet,
        siteName: asString(readPath(item, config.siteNamePath)) || asString(source.name) || asString(profile.name) || hostOf(url),
        publisher: asString(readPath(item, config.publisherPath)) || asString(source.publisher) || asString(profile.publisher),
        publishedAt,
        updatedAt,
        provider: provider.id,
      };
    })
    .filter((item): item is SearchProviderResultItem => Boolean(item));
}

function normalizeFetchResult(data: unknown, input: WebFetchInput, provider: PublicSearchProviderConfig): FetchProviderResult {
  const record = isRecord(data) ? data : {};
  const dataNode = isRecord(record.data) ? record.data : record.data;
  const firstItem = Array.isArray(dataNode) && isRecord(dataNode[0]) ? dataNode[0] : undefined;
  const extractNode = isRecord(record.extract) ? record.extract : undefined;
  const nested = firstItem || (isRecord(dataNode) ? dataNode : undefined) || extractNode || record;
  const markdown = asString(nested.markdown)
    || asString(nested.content)
    || asString(nested.extract)
    || asString(readPath(nested, 'markdown.raw'))
    || asString(readPath(nested, 'content.markdown'));
  const text = asString(nested.text)
    || asString(nested.htmlText)
    || asString(nested.description)
    || asString(nested.summary)
    || asString(readPath(nested, 'content.text'));
  const title = asString(nested.title) || asString(record.title);
  const content = markdown || text;
  return {
    url: input.url,
    title,
    markdown,
    text,
    publishedAt: asString(nested.published_at) || asString(nested.publishedAt),
    updatedAt: asString(nested.updated_at) || asString(nested.updatedAt),
    provider: provider.id,
    contentHash: content ? createHash('sha1').update(content).digest('hex') : undefined,
  };
}

function resolveFetchMode(provider: PublicSearchProviderConfig): 'scrape' | 'extract' {
  if (/\/scrape(?:\?|$|\/)/i.test(provider.endpoint)) return 'scrape';
  if (/\/extract(?:\?|$|\/)/i.test(provider.endpoint)) return 'extract';
  if (provider.fetchMode === 'extract') return 'extract';
  return 'scrape';
}

/**
 * Build search request body for different providers.
 * Each provider has its own API format requirements.
 */
function buildSearchRequestBody(
  input: WebSearchInput,
  provider: PublicSearchProviderConfig,
  config: PublicWebConfig,
): Record<string, unknown> {
  const numResults = input.maxResults || provider.maxResults || config.maxResults;

  if (provider.kind === 'exa') {
    // Exa API: https://docs.exa.ai/reference/search-api-guide-for-coding-agents
    // Use highlights for token-efficient excerpts, cap text to avoid token blowup
    // Map searchDepth to Exa's type parameter:
    //   - 'standard' -> 'auto' (balanced relevance and speed)
    //   - 'deep' -> 'deep' (multi-step reasoning, 4-15 seconds)
    const exaType = input.searchDepth === 'deep' ? 'deep' : 'auto';
    const body: Record<string, unknown> = {
      query: input.query,
      type: exaType,
      numResults,
      contents: {
        highlights: true,
        text: { maxCharacters: 4000 }, // capped to control token usage
      },
    };
    // Add freshness filter if specified
    if (input.freshness === 'realtime' || input.freshness === 'today') {
      body.contents = { ...body.contents as Record<string, unknown>, maxAgeHours: 24 };
    } else if (input.freshness === 'recent') {
      body.contents = { ...body.contents as Record<string, unknown>, maxAgeHours: 168 }; // 7 days
    }
    return body;
  }

  if (provider.kind === 'tavily') {
    // Tavily API: https://docs.tavily.com/docs/rest-api/api-reference
    // API key is sent in the body as api_key field
    // search_depth: 'basic' (fast) or 'advanced' (thorough)
    const tavilyDepth = input.searchDepth === 'deep' ? 'advanced' : 'basic';
    return {
      api_key: provider.apiKey,
      query: input.query,
      max_results: numResults,
      search_depth: tavilyDepth,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
    };
  }

  // Generic POST format for other providers
  return {
    query: input.query,
    numResults,
    locale: input.locale,
    freshness: input.freshness,
  };
}

function buildFetchRequestBody(input: WebFetchInput, provider: PublicSearchProviderConfig): Record<string, unknown> {
  if (provider.kind === 'firecrawl' && resolveFetchMode(provider) === 'extract') {
    return {
      urls: [input.url],
      prompt: 'Extract the main article or documentation body as clean Markdown. Remove navigation, ads, footers, cookie notices, and repeated boilerplate. Preserve title, publish date, update date, and source facts when available.',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          markdown: { type: 'string' },
          text: { type: 'string' },
          published_at: { type: 'string' },
          updated_at: { type: 'string' },
        },
      },
    };
  }
  return {
    url: input.url,
    formats: ['markdown'],
    onlyMainContent: true,
    maxAge: 0,
  };
}

async function fetchJson(endpoint: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  if (!endpoint) throw new Error('provider_endpoint_missing');
  if (isUnsafePublicWebEndpoint(endpoint)) throw new Error('unsafe_public_web_endpoint');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, { ...init, cache: 'no-store', signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = isRecord(data) ? String(data.error || data.message || '') : '';
      throw new Error(`provider_http_${response.status}${detail ? `:${detail}` : ''}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchWithProviderAdapter(
  input: WebSearchInput,
  provider: PublicSearchProviderConfig,
  config: PublicWebConfig,
): Promise<{ items: SearchProviderResultItem[]; call: ProviderCallRecord }> {
  const startedAt = Date.now();
  try {
    if (!provider.enabled || !provider.capabilities.some(item => item === 'search' || item === 'deep_search')) {
      return {
        items: [],
        call: {
          provider_id: provider.id,
          provider_kind: provider.kind,
          capability: provider.capabilities.includes('deep_search') ? 'deep_search' : 'search',
          status: 'skipped',
          duration_ms: 0,
          query: input.query,
          result_count: 0,
          error: 'provider_disabled_or_not_search_capable',
        },
      };
    }
    if (provider.kind === 'weather') {
      const weatherItems = await fetchWeatherSearchItems(input.query, input.maxResults || provider.maxResults || config.maxResults);
      const items = weatherItems.map((item): SearchProviderResultItem => ({
        ...item,
        provider: provider.id,
      }));
      return {
        items,
        call: {
          provider_id: provider.id,
          provider_kind: provider.kind,
          capability: 'search',
          status: 'success',
          duration_ms: Date.now() - startedAt,
          query: input.query,
          result_count: items.length,
        },
      };
    }
    const timeoutMs = provider.timeoutMs || config.timeoutMs;
    const headers = buildProviderHeaders(provider, config);
    let data: unknown;
    if ((provider.method || 'GET') === 'POST') {
      // Build provider-specific request body
      const requestBody = buildSearchRequestBody(input, provider, config);
      data = await fetchJson(provider.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      }, timeoutMs);
    } else {
      const url = new URL(provider.endpoint);
      url.searchParams.set(config.queryParam || 'q', input.query);
      url.searchParams.set('count', String(input.maxResults || provider.maxResults || config.maxResults));
      url.searchParams.set('maxResults', String(input.maxResults || provider.maxResults || config.maxResults));
      if (input.locale) url.searchParams.set('locale', input.locale);
      data = await fetchJson(url.toString(), { method: 'GET', headers }, timeoutMs);
    }
    const items = normalizeSearchItems(data, provider, config);
    return {
      items,
      call: {
        provider_id: provider.id,
        provider_kind: provider.kind,
        capability: provider.capabilities.includes('deep_search') ? 'deep_search' : 'search',
        status: 'success',
        duration_ms: Date.now() - startedAt,
        query: input.query,
        result_count: items.length,
      },
    };
  } catch (error) {
    return {
      items: [],
      call: {
        provider_id: provider.id,
        provider_kind: provider.kind,
        capability: provider.capabilities.includes('deep_search') ? 'deep_search' : 'search',
        status: 'failed',
        duration_ms: Date.now() - startedAt,
        query: input.query,
        result_count: 0,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function fetchWithProviderAdapter(
  input: WebFetchInput,
  provider: PublicSearchProviderConfig,
  config: PublicWebConfig,
): Promise<{ item?: FetchProviderResult; call: ProviderCallRecord }> {
  const startedAt = Date.now();
  try {
    if (!provider.enabled || !provider.capabilities.includes('fetch')) {
      return {
        call: {
          provider_id: provider.id,
          provider_kind: provider.kind,
          capability: 'fetch',
          status: 'skipped',
          duration_ms: 0,
          url: input.url,
          error: 'provider_disabled_or_not_fetch_capable',
        },
      };
    }
    // simple_fetch: 直接用 Node fetch 抓取 HTML，不依赖外部服务
    if (provider.kind === 'simple_fetch') {
      const item = await fetchWithSimpleProvider(input, provider, config);
      return {
        item,
        call: {
          provider_id: provider.id,
          provider_kind: provider.kind,
          capability: 'fetch',
          status: 'success',
          duration_ms: Date.now() - startedAt,
          url: input.url,
          result_count: item.markdown || item.text ? 1 : 0,
        },
      };
    }
    const data = await fetchJson(provider.endpoint, {
      method: 'POST',
      headers: buildProviderHeaders(provider, config),
      body: JSON.stringify(buildFetchRequestBody(input, provider)),
    }, input.timeoutMs || provider.timeoutMs || config.timeoutMs);
    const item = normalizeFetchResult(data, input, provider);
    return {
      item,
      call: {
        provider_id: provider.id,
        provider_kind: provider.kind,
        capability: 'fetch',
        status: 'success',
        duration_ms: Date.now() - startedAt,
        url: input.url,
        result_count: item.markdown || item.text ? 1 : 0,
      },
    };
  } catch (error) {
    return {
      call: {
        provider_id: provider.id,
        provider_kind: provider.kind,
        capability: 'fetch',
        status: 'failed',
        duration_ms: Date.now() - startedAt,
        url: input.url,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
