/**
 * RSS 采集器
 *
 * 最稳定、最快的采集方式。优先使用。
 *
 * @see docs/design/05-采集器设计.md
 */
import Parser from 'rss-parser';
import { v4 as uuidv4 } from 'uuid';
import type { Collector } from './base.js';
import type {
  IntelSource, Seed, RawEvidence, EntitySeed, ImageRef, EvidenceMetadata,
} from '../models/types.js';
import { computeSimHash } from '../lib/simhash.js';
import { normalizeUrl } from '../lib/url-normalizer.js';

/**
 * RSS 采集器
 */
export class RssCollector implements Collector {
  readonly type = 'rss' as const;
  private parser: Parser;
  private readonly minFullContentLength = 100;

  constructor() {
    this.parser = new Parser({
      timeout: 30000,
      headers: {
        'User-Agent': 'GI-Bot/1.0 (Game Insider Intelligence)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });
  }

  /**
   * 执行 RSS 采集
   */
  async collect(source: IntelSource, seeds: Seed[]): Promise<RawEvidence[]> {
    const feedUrl = source.feedUrl || source.baseUrl;

    try {
      // 1. 解析 RSS feed
      const feed = await this.parser.parseURL(feedUrl);

      // 2. 用种子过滤
      const filteredItems = this.filterBySeeds(feed.items, seeds);

      // 3. 转为 RawEvidence
      const evidences: RawEvidence[] = [];
      for (const item of filteredItems) {
        const evidence = await this.toEvidence(item, source, seeds);
        if (evidence) {
          evidences.push(evidence);
        }
      }

      return evidences;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new CollectorError(`RSS 解析失败: ${message}`, source.id, source.name, error);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    // 简单检查：尝试解析一个测试 URL
    return true;
  }

  /**
   * 用种子过滤 RSS 条目
   */
  private filterBySeeds(
    items: Parser.Item[],
    seeds: Seed[]
  ): Parser.Item[] {
    // 如果没有种子，不过滤（全量采集）
    if (seeds.length === 0) return items;

    // 收集所有关键词
    const keywords: string[] = [];
    for (const seed of seeds) {
      keywords.push(seed.text.toLowerCase());

      // 实体种子的别名也加入
      if (seed.seedType === 'entity') {
        const entity = seed as EntitySeed;
        for (const alias of entity.aliases) {
          keywords.push(alias.toLowerCase());
        }
      }

      // 事件种子的关键词也加入
      if (seed.seedType === 'event') {
        for (const kw of (seed as any).keywords || []) {
          keywords.push(kw.toLowerCase());
        }
      }
    }

    // 去重关键词
    const uniqueKeywords = [...new Set(keywords)];

    // 过滤：标题或内容包含任一关键词
    return items.filter(item => {
      const text = `${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`.toLowerCase();
      return uniqueKeywords.some(kw => text.includes(kw));
    });
  }

  /**
   * 将 RSS 条目转为 RawEvidence
   */
  private async toEvidence(
    item: Parser.Item,
    source: IntelSource,
    seeds: Seed[]
  ): Promise<RawEvidence | null> {
    // 必须有 URL
    if (!item.link) return null;

    const url = normalizeUrl(item.link);
    const title = item.title || '';
    // 优先使用完整内容（HTML），而非摘要（contentSnippet）
    let rawContent = item.content || item.contentSnippet || '';
    let content = this.cleanContent(rawContent);

    // 内容太短时（< 100字），RSS 很可能只给摘要或链接；主动下载文章页补全文。
    let isSummaryOnly = content.length < this.minFullContentLength && !!item.link;
    let responseTime: number | undefined;
    let httpStatus: number | undefined;

    if (isSummaryOnly) {
      const fetched = await this.fetchFullArticle(url, source).catch(() => null);
      if (fetched && fetched.content.length > content.length) {
        rawContent = fetched.html;
        content = fetched.content;
        responseTime = fetched.responseTime;
        httpStatus = fetched.httpStatus;
        isSummaryOnly = content.length < this.minFullContentLength;
      }
    }

    // 提取图片
    const images = this.extractImages(rawContent);

    // 计算 SimHash
    const hash = computeSimHash(`${title} ${content}`);

    // 构建 metadata
    const metadata: EvidenceMetadata = {
      collectorType: 'rss',
      guid: item.guid,
      categories: (item.categories || []).map((c: any) =>
        typeof c === 'string' ? c : (c._ || c.name || '')
      ).filter(Boolean),
      isSummaryOnly,
      responseTime,
      httpStatus,
      wordCount: content.length,
    };

    return {
      id: uuidv4(),
      sourceId: source.id,
      seedIds: seeds.map(s => s.id),
      url,
      title,
      content,
      contentHtml: rawContent || undefined,
      summary: item.contentSnippet?.substring(0, 200),
      author: (item as any).author || item.creator || undefined,
      publishedAt: item.isoDate || item.pubDate || undefined,
      collectedAt: new Date().toISOString(),
      images,
      metadata,
      hash,
      status: 'collected',
    };
  }

  /**
   * 从 HTML 内容中提取图片
   */
  private extractImages(html: string): ImageRef[] {
    const images: ImageRef[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    let position = 0;

    while ((match = imgRegex.exec(html)) !== null) {
      position++;
      const url = match[1];

      // 提取 alt 文本
      const altMatch = match[0].match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? altMatch[1] : undefined;

      images.push({
        url,
        alt,
        position,
        processed: false,
      });
    }

    return images;
  }

  /**
   * 下载 RSS 条目链接并提取文章正文。
   */
  private async fetchFullArticle(
    url: string,
    source: IntelSource
  ): Promise<{ html: string; content: string; httpStatus: number; responseTime: number } | null> {
    const startedAt = Date.now();
    const headers = {
      'User-Agent': source.config.userAgent || 'GI-Bot/1.0 (Game Insider Intelligence)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...source.config.headers,
    };

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30000),
    });

    const responseTime = Date.now() - startedAt;
    const httpStatus = response.status;
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return null;
    }

    const html = await response.text();
    if (this.isBlockedArticlePage(html, response.url)) return null;
    const articleHtml = this.extractArticleHtml(html);
    const content = this.cleanContent(articleHtml);

    if (!content) return null;
    return { html: articleHtml || html, content, httpStatus, responseTime };
  }

  /**
   * 微信风控/验证码页不能作为正文入库。
   */
  private isBlockedArticlePage(html: string, url: string): boolean {
    return url.includes('wappoc_appmsgcaptcha')
      || html.includes('环境异常')
      || html.includes('当前环境异常')
      || html.includes('暂无权限查看')
      || html.includes('未知错误，请稍后再试');
  }

  /**
   * 从页面 HTML 中截取最像正文的区域。
   */
  private extractArticleHtml(html: string): string {
    const candidates = [
      new RegExp('\\x3cdiv[\\s\\S]*?id=[\\x22\\x27]js_content[\\x22\\x27][\\s\\S]*?\\x3e([\\\\s\\\\S]*?)\\x3c\\\\/div\\x3e\\\\s*\\x3cscript', 'i'),
      new RegExp('\\x3cdiv[\\s\\S]*?id=[\\x22\\x27]js_content[\\x22\\x27][\\s\\S]*?\\x3e([\\\\s\\\\S]*?)\\x3c\\\\/div\\x3e', 'i'),
      new RegExp('\\x3carticle[\\s\\S]*?\\x3e([\\\\s\\\\S]*?)\\x3c\\\\/article\\x3e', 'i'),
      new RegExp('\\x3cmain[\\s\\S]*?\\x3e([\\\\s\\\\S]*?)\\x3c\\\\/main\\x3e', 'i'),
      new RegExp('\\x3cbody[\\s\\S]*?\\x3e([\\\\s\\\\S]*?)\\x3c\\\\/body\\x3e', 'i'),
    ];

    for (const pattern of candidates) {
      const match = html.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return html;
  }

  /**
   * 清洗内容
   */
  private cleanContent(content: string): string {
    return content
      // 去除 HTML 标签
      .replace(/<[^>]+>/g, '')
      // 去除多余空白
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * 采集器错误
 */
export class CollectorError extends Error {
  constructor(
    message: string,
    public readonly sourceId: string,
    public readonly sourceName: string,
    public readonly cause?: unknown,
  ) {
    super(`[${sourceName}] ${message}`);
    this.name = 'CollectorError';
  }
}
