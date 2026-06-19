/**
 * Scrapling 采集器
 *
 * 通过 HTTP 调用 Scrapling sidecar，获得：
 * - 自适应选择器（网站改版后自动定位元素）
 * - 反爬绕过（Cloudflare、DataDome 等）
 * - TLS 指纹伪装
 * - 浏览器指纹欺骗
 *
 * @see docs/design/05-采集器设计.md
 * @see https://github.com/D4Vinci/Scrapling
 */
import { v4 as uuidv4 } from 'uuid';
import type { Collector } from './base.js';
import type {
  IntelSource, Seed, RawEvidence, ImageRef, EvidenceMetadata,
} from '../models/types.js';
import { computeSimHash } from '../lib/simhash.js';
import { normalizeUrl } from '../lib/url-normalizer.js';

/**
 * Scrapling 采集请求
 */
interface ScraplingCrawlRequest {
  urls: string[];
  method: 'fetcher' | 'stealthy' | 'dynamic';
  css_selectors?: Record<string, string>;
  extract_images: boolean;
  ocr: boolean;
  timeout: number;
  impersonate?: string;
  headless: boolean;
  solve_cloudflare: boolean;
  adaptive: boolean;
}

/**
 * Scrapling 采集结果
 */
interface ScraplingCrawlResult {
  url: string;
  title: string;
  content: string;
  content_html: string;
  summary: string;
  images: Array<{
    url: string;
    alt: string;
    position: number;
    processed: boolean;
  }>;
  metadata: Record<string, any>;
  error?: string;
}

/**
 * Scrapling 采集器
 *
 * 根据源配置自动选择采集模式：
 * - fetcher: 普通HTTP（最快，无反爬的源）
 * - stealthy: 隐身模式（有反爬的源，绕过Cloudflare等）
 * - dynamic: 动态渲染（需要JS执行的源）
 */
export class ScraplingCollector implements Collector {
  readonly type = 'dynamic' as const; // 复用 dynamic 类型
  private sidecarUrl: string;

  constructor(sidecarUrl?: string) {
    this.sidecarUrl = sidecarUrl || process.env.SCRAPLING_URL || 'http://localhost:8888';
  }

  /**
   * 执行采集
   */
  async collect(source: IntelSource, seeds: Seed[]): Promise<RawEvidence[]> {
    // 确定采集模式
    const method = this.determineMethod(source);

    // 构建请求
    const request: ScraplingCrawlRequest = {
      urls: [source.baseUrl],
      method,
      css_selectors: source.config.cssSelectors,
      extract_images: true,
      ocr: false, // OCR 交给 Crawl4AI
      timeout: 30000,
      impersonate: this.getImpersonation(source),
      headless: true,
      solve_cloudflare: method === 'stealthy',
      adaptive: true, // 启用自适应选择器
    };

    // 调用 Scrapling sidecar
    const response = await fetch(`${this.sidecarUrl}/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Scrapling sidecar 错误: ${response.status}`);
    }

    const data = await response.json() as { results: ScraplingCrawlResult[] };

    // 转换为 RawEvidence
    const evidences: RawEvidence[] = [];
    for (const result of data.results) {
      if (result.error) continue;

      const evidence = this.toEvidence(result, source, seeds);
      if (evidence) {
        evidences.push(evidence);
      }
    }

    return evidences;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.sidecarUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json() as { scrapling_available: boolean };
      return data.scrapling_available;
    } catch {
      return false;
    }
  }

  /**
   * 测试反爬绕过
   */
  async testAntiBypass(url: string = 'https://www.gamelook.com.cn'): Promise<any> {
    const response = await fetch(`${this.sidecarUrl}/test-anti-bot?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(60000),
    });
    return response.json();
  }

  /**
   * 根据源配置确定采集模式
   */
  private determineMethod(source: IntelSource): 'fetcher' | 'stealthy' | 'dynamic' {
    // 如果源标记了需要反爬绕过
    if (source.config.requiresAuth || source.config.authMethod === 'cookie') {
      return 'stealthy';
    }

    // 如果源是动态页（需要JS渲染）
    if (source.accessMethod === 'dynamic') {
      return 'dynamic';
    }

    // 检查源是否有反爬历史（通过标签判断）
    if (source.tags.includes('反爬') || source.tags.includes('cloudflare')) {
      return 'stealthy';
    }

    // 默认使用 fetcher（最快）
    return 'fetcher';
  }

  /**
   * 获取 TLS 指纹伪装配置
   */
  private getImpersonation(source: IntelSource): string | undefined {
    // 默认伪装成最新版 Chrome
    return 'chrome-131';
  }

  /**
   * 转换为 RawEvidence
   */
  private toEvidence(
    result: ScraplingCrawlResult,
    source: IntelSource,
    seeds: Seed[]
  ): RawEvidence | null {
    if (!result.content?.trim()) return null;

    const url = normalizeUrl(result.url || source.baseUrl);
    const title = result.title?.trim() || '';
    const content = result.content.trim();

    // 图片
    const images: ImageRef[] = (result.images || []).map(img => ({
      url: img.url,
      alt: img.alt,
      position: img.position,
      processed: img.processed,
    }));

    // SimHash
    const hash = computeSimHash(`${title} ${content}`);

    const metadata: EvidenceMetadata = {
      collectorType: 'dynamic',
      ...result.metadata,
    };

    return {
      id: uuidv4(),
      sourceId: source.id,
      seedIds: seeds.map(s => s.id),
      url,
      title,
      content,
      contentHtml: result.content_html || undefined,
      summary: result.summary || content.substring(0, 200),
      collectedAt: new Date().toISOString(),
      images,
      metadata,
      hash,
      status: 'collected',
    };
  }
}
