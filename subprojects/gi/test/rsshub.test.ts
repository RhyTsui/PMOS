/**
 * RSSHub 服务单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RSSHubService } from '../src/services/rsshub/rsshub-service.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { getDatabase, initializeDatabase } from '../src/lib/database.js';

// Mock rss-parser
vi.mock('rss-parser', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      parseURL: vi.fn().mockImplementation((url: string) => {
        // 模拟不同路由的返回
        if (url.includes('/taptap/topic/hot')) {
          return Promise.resolve({
            title: 'TapTap 热门话题',
            description: 'TapTap 热门话题列表',
            link: 'https://www.taptap.com',
            items: [
              { title: '热门游戏推荐', link: 'https://example.com/1', pubDate: new Date().toISOString() },
              { title: '新游评测', link: 'https://example.com/2', pubDate: new Date().toISOString() },
            ],
          });
        }
        if (url.includes('/steam/news/cn')) {
          return Promise.resolve({
            title: 'Steam 国区新闻',
            description: 'Steam 国区新闻',
            link: 'https://store.steampowered.com',
            items: [
              { title: 'Steam 促销信息', link: 'https://example.com/3', pubDate: new Date().toISOString() },
            ],
          });
        }
        // 模拟失败的路由
        if (url.includes('/invalid')) {
          return Promise.reject(new Error('RSS 源不存在'));
        }
        return Promise.resolve({
          title: '测试源',
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

describe('RSSHubService', () => {
  let service: RSSHubService;
  let sourceRepo: IntelSourceRepository;

  beforeEach(() => {
    initializeDatabase();
    const db = getDatabase();
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM intel_sources');

    service = new RSSHubService({
      baseUrl: 'https://rsshub.test',
      autoRegister: true,
      timeout: 5000,
    });

    sourceRepo = new IntelSourceRepository();
    vi.clearAllMocks();
  });

  it('应该正确初始化服务', () => {
    expect(service).toBeDefined();
  });

  it('应该获取预定义的游戏行业路由', () => {
    const routes = service.getGameIndustryRoutes();
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.some(r => r.path.includes('taptap'))).toBe(true);
    expect(routes.some(r => r.path.includes('steam'))).toBe(true);
  });

  it('应该发现并注册 RSS 源', async () => {
    const result = await service.discoverAndRegister();

    expect(result.discoveredAt).toBeDefined();
    expect(result.routesChecked).toBeGreaterThan(0);
    expect(result.newSources.length).toBeGreaterThanOrEqual(0);
  });

  it('应该正确注册新源', async () => {
    const route = {
      path: '/taptap/topic/hot',
      name: 'TapTap-热门话题',
      sourceType: 'community' as const,
      tags: ['TapTap', '社区'],
      priority: 'P0' as const,
      description: '测试描述',
    };

    const feedUrl = 'https://rsshub.test/taptap/topic/hot';
    const source = service.registerSource(route, feedUrl, 'TapTap 热门话题');

    expect(source).toBeDefined();
    expect(source.name).toBe('TapTap 热门话题');
    expect(source.feedUrl).toBe(feedUrl);
    expect(source.tags).toContain('rsshub');
    expect(source.enabled).toBe(true);
  });

  it('应该避免重复注册已存在的源', async () => {
    const route = {
      path: '/taptap/topic/hot',
      name: 'TapTap-热门话题',
      sourceType: 'community' as const,
      tags: ['TapTap'],
      priority: 'P0' as const,
    };

    const feedUrl = 'https://rsshub.test/taptap/topic/hot';

    // 第一次注册
    const source1 = service.registerSource(route, feedUrl, 'TapTap 热门话题');
    expect(source1).toBeDefined();
    expect(source1.feedUrl).toBe(feedUrl);

    // 第二次注册（应该返回已存在的源）
    const source2 = service.registerSource(route, feedUrl, 'TapTap 热门话题');
    expect(source2).toBeDefined();
    expect(source1.id).toBe(source2.id);

    // 验证数据库中只有一个源
    const allSources = sourceRepo.findAll();
    const tapTapSources = allSources.filter(s => s.feedUrl === feedUrl);
    expect(tapTapSources.length).toBe(1);
  });

  it('应该获取指定路由的 RSS 内容', async () => {
    const feed = await service.fetchRoute('/taptap/topic/hot');

    expect(feed).toBeDefined();
    expect(feed?.title).toBe('TapTap 热门话题');
    expect(feed?.items?.length).toBeGreaterThan(0);
  });

  it('应该正确处理路由获取失败', async () => {
    const feed = await service.fetchRoute('/invalid');
    expect(feed).toBeNull();
  });

  it('应该检查 RSSHub 实例健康状态', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const health = await service.healthCheck();
    expect(health.ok).toBe(true);
  });

  it('应该处理 RSSHub 实例不可达的情况', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const health = await service.healthCheck();
    expect(health.ok).toBe(false);
    expect(health.message).toContain('不可达');
  });

  it('应该获取统计信息', () => {
    // 创建一些测试源
    sourceRepo.create({
      name: '测试源1',
      shortName: '测试1',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://rsshub.test/test1',
      feedUrl: 'https://rsshub.test/test1',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: true,
      priority: 'P1',
      tags: ['rsshub', 'test'],
    } as any);

    sourceRepo.create({
      name: '测试源2',
      shortName: '测试2',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://rsshub.test/test2',
      feedUrl: 'https://rsshub.test/test2',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: false,
      priority: 'P2',
      tags: ['rsshub', 'test'],
    } as any);

    const stats = service.getStats();

    expect(stats.totalSources).toBe(2);
    expect(stats.rsshubSources).toBe(2);
    expect(stats.enabledRsshubSources).toBe(1);
    expect(stats.configuredRoutes).toBeGreaterThan(0);
  });
});
