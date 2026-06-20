/**
 * RSSHub 集成服务
 *
 * RSSHub 是开源的 RSS 订阅生成器，支持 1000+ 网站
 * 本服务负责：
 * 1. 从 RSSHub 实例获取游戏行业相关 RSS 源
 * 2. 自动注册新发现的源到 intel_sources
 * 3. 提供 RSS 路由发现功能
 *
 * @see https://docs.rsshub.app/
 */
import Parser from 'rss-parser';
import { IntelSourceRepository } from '../../repositories/intel-source-repository.js';
import type { IntelSource, SourceType, AccessMethod } from '../../models/types.js';

/**
 * RSSHub 配置
 */
export interface RSSHubConfig {
  /** RSSHub 实例地址 */
  baseUrl: string;
  /** 自动注册发现的源 */
  autoRegister: boolean;
  /** 请求超时时间（毫秒） */
  timeout: number;
  /** 自定义 User-Agent */
  userAgent: string;
}

const DEFAULT_CONFIG: RSSHubConfig = {
  baseUrl: process.env.RSSHUB_BASE_URL || 'https://rsshub.app',
  autoRegister: true,
  timeout: 30000,
  userAgent: 'GI-Bot/1.0 (Game Insider Intelligence)',
};

/**
 * RSSHub 路由定义
 */
export interface RSSHubRoute {
  /** 路由路径（如 /tapTap/topic/123） */
  path: string;
  /** 源名称 */
  name: string;
  /** 源类型 */
  sourceType: SourceType;
  /** 分类标签 */
  tags: string[];
  /** 优先级 */
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  /** 描述 */
  description?: string;
}

/**
 * 预定义的游戏行业 RSSHub 路由
 */
const GAME_INDUSTY_ROUTES: RSSHubRoute[] = [
  // ===== TapTap =====
  { path: '/taptap/topic/hot', name: 'TapTap-热门话题', sourceType: 'community', tags: ['TapTap', '社区', '热门'], priority: 'P0', description: 'TapTap 热门话题' },
  { path: '/taptap/review/hot', name: 'TapTap-热门评测', sourceType: 'community', tags: ['TapTap', '评测'], priority: 'P1', description: 'TapTap 热门游戏评测' },
  { path: '/taptap/feed/hot', name: 'TapTap-热门动态', sourceType: 'community', tags: ['TapTap', '动态'], priority: 'P1', description: 'TapTap 热门动态' },

  // ===== Steam =====
  { path: '/steam/news/cn', name: 'Steam-国区新闻', sourceType: 'official', tags: ['Steam', '新闻'], priority: 'P1', description: 'Steam 国区新闻' },
  { path: '/steam/search/cn', name: 'Steam-搜索', sourceType: 'official', tags: ['Steam', '搜索'], priority: 'P2', description: 'Steam 搜索结果' },

  // ===== Bilibili =====
  { path: '/bilibili/rank/0/3', name: 'B站-游戏区排行榜', sourceType: 'social', tags: ['B站', '游戏', '排行'], priority: 'P1', description: 'B站游戏区排行榜' },
  { path: '/bilibili/hot-search', name: 'B站-热搜', sourceType: 'social', tags: ['B站', '热搜'], priority: 'P2', description: 'B站热搜' },

  // ===== 微博 =====
  { path: '/weibo/search/hot', name: '微博-热搜', sourceType: 'social', tags: ['微博', '热搜'], priority: 'P2', description: '微博热搜榜' },

  // ===== 游戏媒体 =====
  { path: '/gamelook', name: 'GameLook', sourceType: 'media', tags: ['GameLook', '行业媒体'], priority: 'P0', description: 'GameLook 游戏行业媒体' },
  { path: '/youxituoluo', name: '游戏陀螺', sourceType: 'media', tags: ['游戏陀螺', '行业媒体'], priority: 'P0', description: '游戏陀螺' },
  { path: '/youxiputao', name: '游戏葡萄', sourceType: 'media', tags: ['游戏葡萄', '行业媒体'], priority: 'P0', description: '游戏葡萄' },

  // ===== Epic Games =====
  { path: '/epicgames/freegames', name: 'Epic-免费游戏', sourceType: 'official', tags: ['Epic', '免费'], priority: 'P2', description: 'Epic Games 免费游戏' },

  // ===== Nintendo =====
  { path: '/nintendo/eshop/jp', name: '任天堂-eShop日区', sourceType: 'official', tags: ['任天堂', 'eShop'], priority: 'P2', description: '任天堂 eShop 日区' },
  { path: '/nintendo/eshop/us', name: '任天堂-eShop美区', sourceType: 'official', tags: ['任天堂', 'eShop'], priority: 'P2', description: '任天堂 eShop 美区' },

  // ===== PlayStation =====
  { path: '/psn/product/jp', name: 'PSN-日区', sourceType: 'official', tags: ['PlayStation', 'PSN'], priority: 'P2', description: 'PSN 日区' },
  { path: '/psn/product/us', name: 'PSN-美区', sourceType: 'official', tags: ['PlayStation', 'PSN'], priority: 'P2', description: 'PSN 美区' },

  // ===== Xbox =====
  { path: '/xbox/games', name: 'Xbox-游戏', sourceType: 'official', tags: ['Xbox', '游戏'], priority: 'P2', description: 'Xbox 游戏' },

  // ===== 36氪游戏 =====
  { path: '/36kr/motif/327685554177', name: '36氪-游戏', sourceType: 'media', tags: ['36氪', '游戏'], priority: 'P1', description: '36氪游戏频道' },

  // ===== 机核 =====
  { path: '/gcores/category/news', name: '机核-资讯', sourceType: 'media', tags: ['机核', '资讯'], priority: 'P1', description: '机核游戏资讯' },
  { path: '/gcores/category/article', name: '机核-文章', sourceType: 'media', tags: ['机核', '文章'], priority: 'P1', description: '机核游戏文章' },

  // ===== 游研社 =====
  { path: '/yystv/category/recommend', name: '游研社-推荐', sourceType: 'media', tags: ['游研社', '推荐'], priority: 'P1', description: '游研社推荐文章' },

  // ===== 触乐 =====
  { path: '/chuapp/index/daily', name: '触乐-每日', sourceType: 'media', tags: ['触乐', '每日'], priority: 'P1', description: '触乐每日推荐' },
];

/**
 * 源发现结果
 */
export interface RSSHubDiscoveryResult {
  /** 发现时间 */
  discoveredAt: string;
  /** 检查的路由数量 */
  routesChecked: number;
  /** 新发现的源 */
  newSources: Array<{
    route: RSSHubRoute;
    feedUrl: string;
    title: string;
    description: string;
    itemCount: number;
    registered: boolean;
  }>;
  /** 已存在的源 */
  existingSources: string[];
  /** 失败的源 */
  failedSources: Array<{ route: RSSHubRoute; error: string }>;
}

/**
 * RSSHub 集成服务
 */
export class RSSHubService {
  private config: RSSHubConfig;
  private sourceRepo: IntelSourceRepository;
  private parser: Parser;

  constructor(config: Partial<RSSHubConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sourceRepo = new IntelSourceRepository();
    this.parser = new Parser({
      timeout: this.config.timeout,
      headers: { 'User-Agent': this.config.userAgent },
    });
  }

  /**
   * 获取预定义的游戏行业路由
   */
  getGameIndustryRoutes(): RSSHubRoute[] {
    return [...GAME_INDUSTY_ROUTES];
  }

  /**
   * 发现并注册 RSS 源
   */
  async discoverAndRegister(): Promise<RSSHubDiscoveryResult> {
    const result: RSSHubDiscoveryResult = {
      discoveredAt: new Date().toISOString(),
      routesChecked: 0,
      newSources: [],
      existingSources: [],
      failedSources: [],
    };

    const routes = this.getGameIndustryRoutes();
    const existingSources = this.sourceRepo.findAll();
    const existingUrls = new Set(existingSources.map(s => s.feedUrl || s.baseUrl));

    for (const route of routes) {
      result.routesChecked++;
      const feedUrl = `${this.config.baseUrl}${route.path}`;

      try {
        // 检查是否已存在
        if (existingUrls.has(feedUrl)) {
          result.existingSources.push(route.name);
          continue;
        }

        // 尝试获取 RSS feed
        const feed = await this.parser.parseURL(feedUrl);

        if (feed && feed.items && feed.items.length > 0) {
          const newSource = {
            route,
            feedUrl,
            title: feed.title || route.name,
            description: feed.description || route.description || '',
            itemCount: feed.items.length,
            registered: false,
          };

          // 自动注册
          if (this.config.autoRegister) {
            try {
              this.registerSource(route, feedUrl, feed.title || route.name);
              newSource.registered = true;
              console.log(`[RSSHub] 注册新源: ${route.name} (${feed.items.length} 条)`);
            } catch (err) {
              console.warn(`[RSSHub] 注册失败: ${route.name}`, err);
            }
          }

          result.newSources.push(newSource);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.failedSources.push({ route, error: message });
      }
    }

    return result;
  }

  /**
   * 注册 RSS 源到 intel_sources
   */
  registerSource(route: RSSHubRoute, feedUrl: string, name: string): IntelSource {
    // 检查是否已存在
    const existing = this.sourceRepo.findAll().find(
      s => s.feedUrl === feedUrl || s.baseUrl === feedUrl
    );
    if (existing) {
      return existing;
    }

    return this.sourceRepo.create({
      name,
      shortName: name.substring(0, 10),
      sourceType: route.sourceType,
      accessMethod: 'rss' as AccessMethod,
      baseUrl: `${this.config.baseUrl}${route.path.split('/').slice(0, 2).join('/')}`,
      feedUrl,
      config: {
        rsshubRoute: route.path,
        tags: route.tags,
      },
      schedule: { cron: '*/30 * * * *' },
      enabled: true,
      priority: route.priority,
      tags: ['rsshub', ...route.tags],
    } as any);
  }

  /**
   * 获取指定路由的 RSS 内容
   */
  async fetchRoute(routePath: string): Promise<Parser.Output | null> {
    try {
      const feedUrl = `${this.config.baseUrl}${routePath}`;
      return await this.parser.parseURL(feedUrl);
    } catch (error) {
      console.error(`[RSSHub] 获取路由失败: ${routePath}`, error);
      return null;
    }
  }

  /**
   * 验证 RSSHub 实例是否可用
   */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/healthz`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { ok: true, message: 'RSSHub 实例正常' };
      }

      // 某些 RSSHub 实例没有 /healthz，尝试获取首页
      const homeResponse = await fetch(this.config.baseUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (homeResponse.ok) {
        return { ok: true, message: 'RSSHub 实例可访问' };
      }

      return { ok: false, message: `RSSHub 实例响应异常: ${homeResponse.status}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, message: `RSSHub 实例不可达: ${message}` };
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): RSSHubStats {
    const allSources = this.sourceRepo.findAll();
    const rsshubSources = allSources.filter(s =>
      s.tags.includes('rsshub') || s.feedUrl?.includes(this.config.baseUrl)
    );

    return {
      totalSources: allSources.length,
      rsshubSources: rsshubSources.length,
      enabledRsshubSources: rsshubSources.filter(s => s.enabled).length,
      configuredRoutes: GAME_INDUSTY_ROUTES.length,
      baseUrl: this.config.baseUrl,
    };
  }
}

/**
 * RSSHub 统计信息
 */
export interface RSSHubStats {
  totalSources: number;
  rsshubSources: number;
  enabledRsshubSources: number;
  configuredRoutes: number;
  baseUrl: string;
}
