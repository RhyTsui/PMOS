/**
 * 搜狗微信公众号采集器
 *
 * 通过搜狗微信搜索 (https://weixin.sogou.com/) 采集微信公众号文章
 */
import { Collector } from './base.js';
import type { IntelSource, Seed, RawEvidence } from '../models/types.js';
import { computeSimHash } from '../lib/simhash.js';
import { normalizeUrl } from '../lib/url-normalizer.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 搜狗微信公众号采集器
 */
export class SogouWechatCollector implements Collector {
  readonly type = 'sogou_wechat' as const;
  private baseUrl = 'https://weixin.sogou.com';

  constructor() {}

  /**
   * 执行采集
   */
  async collect(source: IntelSource, seeds: Seed[]): Promise<RawEvidence[]> {
    const evidences: RawEvidence[] = [];

    try {
      // 构建搜索 URL
      const searchQuery = source.config.searchQuery || source.name;
      const searchUrl = `${this.baseUrl}/weixin?query=${encodeURIComponent(searchQuery)}&type=2`;

      // 使用 fetch 获取搜索结果
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Referer': this.baseUrl,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // 解析搜索结果
      const articles = this.parseSearchResults(html);

      // 转换为 RawEvidence
      for (const article of articles) {
        const evidence = this.toEvidence(article, source, seeds);
        if (evidence) {
          evidences.push(evidence);
        }
      }

      console.log(`[SogouWechat] 采集到 ${evidences.length} 篇文章`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[SogouWechat] 采集失败: ${message}`);
      throw error;
    }

    return evidences;
  }

  /**
   * 解析搜索结果
   */
  private parseSearchResults(html: string): Array<{
    title: string;
    url: string;
    account: string;
    summary: string;
    pubDate: string;
  }> {
    const articles: Array<{
      title: string;
      url: string;
      account: string;
      summary: string;
      pubDate: string;
    }> = [];

    // 使用正则表达式解析搜索结果
    // 注意：这只是示例，实际需要根据搜狗的 HTML 结构调整
    const articleRegex = /<div class="txt-box">[\s\S]*?<h3>[\s\S]*?<a href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<p class="txt-info">([^<]+)<\/p>[\s\S]*?<div class="s-p">[\s\S]*?<span class="all-time-y2">([^<]+)<\/span>/g;

    let match;
    while ((match = articleRegex.exec(html)) !== null) {
      articles.push({
        url: match[1],
        title: match[2].trim(),
        summary: match[3].trim(),
        pubDate: match[4].trim(),
        account: '', // 需要从其他元素提取
      });
    }

    return articles;
  }

  /**
   * 转换为 RawEvidence
   */
  private toEvidence(
    article: { title: string; url: string; account: string; summary: string; pubDate: string },
    source: IntelSource,
    seeds: Seed[]
  ): RawEvidence | null {
    if (!article.url || !article.title) return null;

    const url = normalizeUrl(article.url);
    const hash = computeSimHash(`${article.title} ${article.summary}`);

    return {
      id: uuidv4(),
      sourceId: source.id,
      seedIds: seeds.map(s => s.id),
      url,
      title: article.title,
      content: article.summary,
      summary: article.summary.substring(0, 200),
      collectedAt: new Date().toISOString(),
      publishedAt: article.pubDate,
      images: [],
      metadata: {
        collectorType: 'sogou_wechat',
        account: article.account,
      },
      hash,
      status: 'collected',
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
