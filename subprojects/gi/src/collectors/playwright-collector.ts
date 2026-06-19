/**
 * Playwright 动态页采集器
 *
 * 用于需要 JavaScript 渲染的页面
 */
import { v4 as uuidv4 } from 'uuid';
import type { Collector } from './base.js';
import type {
  IntelSource, Seed, RawEvidence, ImageRef, EvidenceMetadata,
} from '../models/types.js';
import { computeSimHash } from '../lib/simhash.js';
import { normalizeUrl } from '../lib/url-normalizer.js';

/**
 * Playwright 采集器
 *
 * 注意：需要安装 playwright 和 chromium
 * npm install playwright
 * npx playwright install chromium
 */
export class PlaywrightCollector implements Collector {
  readonly type = 'dynamic' as const;
  private browser: any = null;
  private maxConcurrentPages = 3;
  private activePages = 0;

  /**
   * 获取或创建浏览器实例
   */
  private async getBrowser(): Promise<any> {
    if (!this.browser) {
      try {
        const { chromium } = await import('playwright');
        this.browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      } catch (error) {
        throw new Error('Playwright 未安装。请运行: npm install playwright && npx playwright install chromium');
      }
    }
    return this.browser;
  }

  /**
   * 等待可用的页面槽位
   */
  private async waitForSlot(): Promise<void> {
    while (this.activePages >= this.maxConcurrentPages) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.activePages++;
  }

  /**
   * 释放页面槽位
   */
  private releaseSlot(): void {
    this.activePages--;
  }

  /**
   * 执行采集
   */
  async collect(source: IntelSource, seeds: Seed[]): Promise<RawEvidence[]> {
    await this.waitForSlot();

    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      try {
        // 设置超时
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(60000);

        // 导航到目标页面
        await page.goto(source.baseUrl, {
          waitUntil: 'networkidle',
        });

        // 如果源配置了 CSS 选择器，等待内容加载
        if (source.config.cssSelectors?.content) {
          await page.waitForSelector(source.config.cssSelectors.content, {
            timeout: 10000,
          }).catch(() => {
            // 选择器没找到也继续
          });
        }

        // 提取内容
        const content = await page.evaluate((selectors: any) => {
          const extractText = (element: Element): string => {
            return element.textContent || '';
          };

          const extractImages = (root: Element | Document): Array<{ url: string; alt: string }> => {
            const imgs = root.querySelectorAll('img');
            return Array.from(imgs).map(img => ({
              url: img.src,
              alt: img.alt || '',
            })).filter(img => img.url.startsWith('http'));
          };

          // 根据选择器提取
          if (selectors?.content) {
            const elements = document.querySelectorAll(selectors.content);
            return {
              items: Array.from(elements).map(el => ({
                title: selectors.title ? (el.querySelector(selectors.title)?.textContent || '') : '',
                content: extractText(el),
                images: extractImages(el),
              })),
            };
          }

          // 默认提取文章列表
          const articles = document.querySelectorAll('article, .article, .post, .entry');
          if (articles.length > 0) {
            return {
              items: Array.from(articles).map(el => ({
                title: el.querySelector('h1, h2, h3, .title')?.textContent || '',
                content: extractText(el),
                images: extractImages(el),
              })),
            };
          }

          // 最后兜底：提取整个页面
          return {
            items: [{
              title: document.title,
              content: document.body.textContent || '',
              images: extractImages(document),
            }],
          };
        }, source.config.cssSelectors);

        // 转换为 RawEvidence
        const evidences: RawEvidence[] = [];
        const items = (content as any).items || [];

        for (let i = 0; i < Math.min(items.length, source.config.maxPages || 10); i++) {
          const item = items[i];
          if (!item.content?.trim()) continue;

          const evidence = this.toEvidence(item, source, seeds, i);
          if (evidence) {
            evidences.push(evidence);
          }
        }

        return evidences;
      } finally {
        await page.close();
      }
    } finally {
      this.releaseSlot();
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      await page.goto('https://example.com', { timeout: 10000 });
      await page.close();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 转换为 RawEvidence
   */
  private toEvidence(
    item: any,
    source: IntelSource,
    seeds: Seed[],
    index: number
  ): RawEvidence | null {
    if (!item.content?.trim()) return null;

    const url = normalizeUrl(source.baseUrl + `#item-${index}`);
    const title = item.title?.trim() || `页面内容 ${index + 1}`;
    const content = item.content.trim();

    // 提取图片
    const images: ImageRef[] = (item.images || []).map((img: any, i: number) => ({
      url: img.url,
      alt: img.alt,
      position: i + 1,
      processed: false,
    }));

    // 计算 SimHash
    const hash = computeSimHash(`${title} ${content}`);

    const metadata: EvidenceMetadata = {
      collectorType: 'dynamic',
    };

    return {
      id: uuidv4(),
      sourceId: source.id,
      seedIds: seeds.map(s => s.id),
      url,
      title,
      content,
      collectedAt: new Date().toISOString(),
      images,
      metadata,
      hash,
      status: 'collected',
    };
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
