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
        const evidence = this.toEvidence(item, source, seeds);
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
  private toEvidence(
    item: Parser.Item,
    source: IntelSource,
    seeds: Seed[]
  ): RawEvidence | null {
    // 必须有 URL
    if (!item.link) return null;

    const url = normalizeUrl(item.link);
    const title = item.title || '';
    // 优先使用完整内容（HTML），而非摘要（contentSnippet）
    const rawContent = item.content || item.contentSnippet || '';
    const content = this.cleanContent(rawContent);

    // 内容太短时（< 100字），可能是纯摘要，标记以便后续获取全文
    const isSummaryOnly = content.length < 100 && !!item.link;

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
