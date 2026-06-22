/**
 * WeWe RSS 服务单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeWeService } from '../src/services/wewe/wewe-service.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { RawEvidenceRepository } from '../src/repositories/raw-evidence-repository.js';
import { getDatabase, initializeDatabase } from '../src/lib/database.js';

// Mock rss-parser
vi.mock('rss-parser', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      parseURL: vi.fn().mockImplementation((url: string) => {
        // 模拟不同公众号的返回
        if (url.includes('/feeds/gamelook.xml')) {
          return Promise.resolve({
            title: 'GameLook',
            description: '游戏行业权威媒体',
            link: 'https://www.gamelook.com.cn',
            items: [
              { title: '游戏行业周报', link: 'https://example.com/1', pubDate: new Date().toISOString() },
              { title: '新游评测', link: 'https://example.com/2', pubDate: new Date().toISOString() },
            ],
          });
        }
        if (url.includes('/feeds/youxiputao.xml')) {
          return Promise.resolve({
            title: '游戏葡萄',
            description: '游戏行业深度分析',
            link: 'https://youxiputao.com',
            items: [
              { title: '行业分析报告', link: 'https://example.com/3', pubDate: new Date().toISOString() },
            ],
          });
        }
        // 模拟失败的公众号
        if (url.includes('/feeds/invalid.xml')) {
          return Promise.reject(new Error('公众号不存在'));
        }
        return Promise.resolve({
          title: '测试公众号',
          description: '测试描述',
          link: 'https://example.com',
          items: [],
        });
      }),
    })),
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('WeWeService', () => {
  let service: WeWeService;
  let sourceRepo: IntelSourceRepository;
  let evidenceRepo: RawEvidenceRepository;

  beforeEach(() => {
    initializeDatabase();
    const db = getDatabase();
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM raw_evidence');
    db.exec('DELETE FROM intel_sources');

    service = new WeWeService({
      baseUrl: 'http://wewe.test',
      autoRegister: true,
      timeout: 5000,
    });

    sourceRepo = new IntelSourceRepository();
    evidenceRepo = new RawEvidenceRepository();
    vi.clearAllMocks();
  });

  it('应该正确初始化服务', () => {
    expect(service).toBeDefined();
  });

  it('应该获取预定义的游戏行业公众号', () => {
    const accounts = service.getGameAccounts();
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts.some(a => a.id === 'gamelook')).toBe(true);
    expect(accounts.some(a => a.id === 'youxiputao')).toBe(true);
  });

  it('应该发现并注册公众号 RSS 源', async () => {
    const result = await service.discoverAndRegister();

    expect(result.discoveredAt).toBeDefined();
    expect(result.accountsChecked).toBeGreaterThan(0);
    expect(result.newAccounts.length).toBeGreaterThanOrEqual(0);
  });

  it('应该正确注册新公众号', async () => {
    const account = {
      id: 'gamelook',
      name: 'GameLook',
      tags: ['行业媒体', 'P0'],
      priority: 'P0' as const,
      description: '游戏行业权威媒体',
    };

    const feedUrl = 'http://wewe.test/feeds/gamelook.xml';
    const source = service.registerAccount(account, feedUrl, 'GameLook');

    expect(source).toBeDefined();
    expect(source.name).toBe('GameLook');
    expect(source.feedUrl).toBe(feedUrl);
    expect(source.sourceType).toBe('wechat_mp');
    expect(source.tags).toContain('wewe');
    expect(source.tags).toContain('wechat');
    expect(source.enabled).toBe(true);
  });

  it('应该避免重复注册已存在的公众号', async () => {
    const account = {
      id: 'gamelook',
      name: 'GameLook',
      tags: ['行业媒体'],
      priority: 'P0' as const,
    };

    const feedUrl = 'http://wewe.test/feeds/gamelook.xml';

    // 第一次注册
    const source1 = service.registerAccount(account, feedUrl, 'GameLook');
    // 第二次注册（应该返回已存在的源）
    const source2 = service.registerAccount(account, feedUrl, 'GameLook');

    expect(source1.id).toBe(source2.id);

    const allSources = sourceRepo.findAll();
    const gamelookSources = allSources.filter(s => s.feedUrl === feedUrl);
    expect(gamelookSources.length).toBe(1);
  });

  it('应该获取指定公众号的 RSS 内容', async () => {
    const feed = await service.fetchAccount('gamelook');

    expect(feed).toBeDefined();
    expect(feed?.title).toBe('GameLook');
    expect(feed?.items?.length).toBeGreaterThan(0);
  });

  it('应该正确处理公众号获取失败', async () => {
    const feed = await service.fetchAccount('invalid');
    expect(feed).toBeNull();
  });

  it('应该在 WeWe 文章 API 数据中返回文章链接', () => {
    const source = service.registerAccount({
      id: 'gamelook',
      name: 'GameLook',
      tags: ['行业媒体', 'P0'],
      priority: 'P0' as const,
    }, 'http://wewe.test/feeds/gamelook.xml', 'GameLook');

    evidenceRepo.create({
      sourceId: source.id,
      seedIds: [],
      url: 'https://mp.weixin.qq.com/s/test-article',
      title: '带链接的 WeWe 文章',
      content: '正文内容',
      summary: '正文摘要',
      publishedAt: '2026-06-22T00:00:00.000Z',
      collectedAt: '2026-06-22T01:00:00.000Z',
      images: [],
      metadata: {
        collectorType: 'rss',
        source: 'wewe',
        accountId: 'gamelook',
      },
      hash: 'wewe-link-hash',
      status: 'collected',
    } as any);

    const result = service.listArticles({ accountId: 'gamelook' });

    expect(result.total).toBe(1);
    expect(result.articles[0].url).toBe('https://mp.weixin.qq.com/s/test-article');
    expect(result.articles[0].link).toBe('https://mp.weixin.qq.com/s/test-article');
    expect(result.articles[0].articleUrl).toBe('https://mp.weixin.qq.com/s/test-article');
    expect(result.articles[0].accountId).toBe('gamelook');
  });

  it('应该检查 WeWe RSS 实例健康状态', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const health = await service.healthCheck();
    expect(health.ok).toBe(true);
  });

  it('应该处理 WeWe RSS 实例不可达的情况', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const health = await service.healthCheck();
    expect(health.ok).toBe(false);
    expect(health.message).toContain('不可达');
  });

  it('应该获取统计信息', () => {
    // 创建一些测试源
    sourceRepo.create({
      name: '测试公众号1',
      shortName: '测试1',
      sourceType: 'wechat_mp',
      accessMethod: 'rss',
      baseUrl: 'http://wewe.test/feeds/test1.xml',
      feedUrl: 'http://wewe.test/feeds/test1.xml',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: true,
      priority: 'P1',
      tags: ['wewe', 'wechat', 'test'],
    } as any);

    sourceRepo.create({
      name: '测试公众号2',
      shortName: '测试2',
      sourceType: 'wechat_mp',
      accessMethod: 'rss',
      baseUrl: 'http://wewe.test/feeds/test2.xml',
      feedUrl: 'http://wewe.test/feeds/test2.xml',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: false,
      priority: 'P2',
      tags: ['wewe', 'wechat', 'test'],
    } as any);

    const stats = service.getStats();

    expect(stats.totalSources).toBe(2);
    expect(stats.wechatSources).toBe(2);
    expect(stats.enabledWechatSources).toBe(1);
    expect(stats.configuredAccounts).toBeGreaterThan(0);
  });

  it('应该正确分类不同优先级的公众号', () => {
    const accounts = service.getGameAccounts();

    const p0Accounts = accounts.filter(a => a.priority === 'P0');
    const p1Accounts = accounts.filter(a => a.priority === 'P1');
    const p2Accounts = accounts.filter(a => a.priority === 'P2');

    expect(p0Accounts.length).toBeGreaterThan(0);
    expect(p1Accounts.length).toBeGreaterThan(0);
    expect(p2Accounts.length).toBeGreaterThan(0);
  });

  it('应该包含游戏公司官方公众号', () => {
    const accounts = service.getGameAccounts();

    const companyAccounts = accounts.filter(a => a.tags.includes('公司'));
    expect(companyAccounts.length).toBeGreaterThan(0);
    expect(companyAccounts.some(a => a.id === 'mihoyo')).toBe(true);
    expect(companyAccounts.some(a => a.id === 'tencentgames')).toBe(true);
  });
});
