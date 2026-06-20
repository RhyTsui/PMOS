/**
 * WeWe RSS 集成服务
 *
 * WeWe RSS 是微信公众号 RSS 订阅服务
 * 基于微信读书获取公众号文章
 * 本服务负责：
 * 1. 从 WeWe RSS 实例获取公众号文章
 * 2. 自动注册公众号为情报源
 * 3. 管理公众号订阅列表
 *
 * @see https://github.com/cooderl/wewe-rss
 */
import Parser from 'rss-parser';
import { IntelSourceRepository } from '../../repositories/intel-source-repository.js';
import type { IntelSource, AccessMethod } from '../../models/types.js';

/**
 * WeWe RSS 配置
 */
export interface WeWeConfig {
  /** WeWe RSS 实例地址 */
  baseUrl: string;
  /** API Token（如果有） */
  apiToken?: string;
  /** 自动注册发现的公众号 */
  autoRegister: boolean;
  /** 请求超时时间（毫秒） */
  timeout: number;
  /** User-Agent */
  userAgent: string;
}

const DEFAULT_CONFIG: WeWeConfig = {
  baseUrl: process.env.WEWE_BASE_URL || 'http://localhost:4000',
  apiToken: process.env.WEWE_API_TOKEN,
  autoRegister: true,
  timeout: 30000,
  userAgent: 'GI-Bot/1.0 (Game Insider Intelligence)',
};

/**
 * 公众号定义
 */
export interface WeChatAccount {
  /** 公众号 ID（WeWe RSS 中的 ID） */
  id: string;
  /** 公众号名称 */
  name: string;
  /** 公众号微信号 */
  wechatId?: string;
  /** 分类标签 */
  tags: string[];
  /** 优先级 */
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  /** 描述 */
  description?: string;
}

/**
 * 预定义的游戏行业公众号
 */
const GAME_WECHAT_ACCOUNTS: WeChatAccount[] = [
  // ===== P0 核心公众号 =====
  { id: 'gamelook', name: 'GameLook', tags: ['行业媒体', 'P0'], priority: 'P0', description: '游戏行业权威媒体' },
  { id: 'youxiputao', name: '游戏葡萄', tags: ['行业媒体', 'P0'], priority: 'P0', description: '游戏行业深度分析' },
  { id: 'youxituoluo', name: '游戏陀螺', tags: ['行业媒体', 'P0'], priority: 'P0', description: '游戏行业资讯' },
  { id: 'chuapp', name: '触乐', tags: ['行业媒体', 'P0'], priority: 'P0', description: '游戏文化深度报道' },

  // ===== P1 重要公众号 =====
  { id: 'yystv', name: '游研社', tags: ['行业媒体', 'P1'], priority: 'P1', description: '游戏文化社区' },
  { id: 'youxichaguan', name: '游戏茶馆', tags: ['行业媒体', 'P1'], priority: 'P1', description: '游戏行业资讯' },
  { id: 'cores', name: '竞核', tags: ['行业研究', 'P1'], priority: 'P1', description: '游戏行业深度研究' },
  { id: 'gameexpress', name: '游戏干线', tags: ['行业媒体', 'P1'], priority: 'P1', description: '游戏行业资讯' },
  { id: 'shouyounadianshi', name: '手游那点事', tags: ['手游', 'P1'], priority: 'P1', description: '手游行业分析' },
  { id: 'gcourses', name: '游戏开发者GAD', tags: ['开发者', 'P1'], priority: 'P1', description: '游戏开发者社区' },

  // ===== P2 一般公众号 =====
  { id: 'luosiji', name: '罗斯基', tags: ['独立游戏', 'P2'], priority: 'P2', description: '独立游戏资讯' },
  { id: 'chuhai', name: '独立出海联合体', tags: ['出海', 'P2'], priority: 'P2', description: '游戏出海资讯' },
  { id: 'youxixinzhi', name: '游戏新知', tags: ['行业媒体', 'P2'], priority: 'P2', description: '游戏行业资讯' },
  { id: 'youxijiazhilib', name: '游戏价值榜', tags: ['数据', 'P2'], priority: 'P2', description: '游戏数据榜单' },
  { id: 'youxichanyehip', name: '游戏产业时评', tags: ['产业', 'P2'], priority: 'P2', description: '游戏产业评论' },
  { id: 'youximeishu', name: '游戏美术资源', tags: ['美术', 'P2'], priority: 'P2', description: '游戏美术资源' },
  { id: 'youxicehua', name: '游戏策划实战', tags: ['策划', 'P2'], priority: 'P2', description: '游戏策划经验' },
  { id: 'shouzhuju', name: '手游矩阵', tags: ['手游', 'P2'], priority: 'P2', description: '手游行业资讯' },

  // ===== 游戏公司官方公众号 =====
  { id: 'mihoyo', name: '米哈游', tags: ['公司', '官方'], priority: 'P1', description: '米哈游官方' },
  { id: 'tencentgames', name: '腾讯游戏', tags: ['公司', '官方'], priority: 'P1', description: '腾讯游戏官方' },
  { id: 'neteasegames', name: '网易游戏', tags: ['公司', '官方'], priority: 'P1', description: '网易游戏官方' },
  { id: 'lilithgames', name: '莉莉丝游戏', tags: ['公司', '官方'], priority: 'P2', description: '莉莉丝游戏官方' },
  { id: 'yingjiaonet', name: '鹰角网络', tags: ['公司', '官方'], priority: 'P2', description: '鹰角网络官方' },
  { id: 'papergames', name: '叠纸游戏', tags: ['公司', '官方'], priority: 'P2', description: '叠纸游戏官方' },
  { id: 'kurogames', name: '库洛游戏', tags: ['公司', '官方'], priority: 'P2', description: '库洛游戏官方' },

  // ===== 行业数据/分析 =====
  { id: 'cngdata', name: '伽马数据', tags: ['数据', '分析'], priority: 'P1', description: '游戏行业数据' },
  { id: 'sensortower', name: 'Sensor Tower', tags: ['数据', '分析'], priority: 'P1', description: '移动应用数据' },
  { id: 'dataai', name: 'data.ai', tags: ['数据', '分析'], priority: 'P1', description: '应用数据平台' },
];

/**
 * WeWe RSS 发现结果
 */
export interface WeWeDiscoveryResult {
  /** 发现时间 */
  discoveredAt: string;
  /** 检查的公众号数量 */
  accountsChecked: number;
  /** 新发现的公众号 */
  newAccounts: Array<{
    account: WeChatAccount;
    feedUrl: string;
    title: string;
    description: string;
    itemCount: number;
    registered: boolean;
  }>;
  /** 已存在的公众号 */
  existingAccounts: string[];
  /** 失败的公众号 */
  failedAccounts: Array<{ account: WeChatAccount; error: string }>;
}

/**
 * WeWe RSS 集成服务
 */
export class WeWeService {
  private config: WeWeConfig;
  private sourceRepo: IntelSourceRepository;
  private parser: Parser;

  constructor(config: Partial<WeWeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sourceRepo = new IntelSourceRepository();
    this.parser = new Parser({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        ...(this.config.apiToken ? { 'Authorization': `Bearer ${this.config.apiToken}` } : {}),
      },
    });
  }

  /**
   * 获取预定义的游戏行业公众号
   */
  getGameAccounts(): WeChatAccount[] {
    return [...GAME_WECHAT_ACCOUNTS];
  }

  /**
   * 发现并注册公众号 RSS 源
   */
  async discoverAndRegister(): Promise<WeWeDiscoveryResult> {
    const result: WeWeDiscoveryResult = {
      discoveredAt: new Date().toISOString(),
      accountsChecked: 0,
      newAccounts: [],
      existingAccounts: [],
      failedAccounts: [],
    };

    const accounts = this.getGameAccounts();
    const existingSources = this.sourceRepo.findAll();
    const existingUrls = new Set(existingSources.map(s => s.feedUrl || s.baseUrl));

    for (const account of accounts) {
      result.accountsChecked++;

      // WeWe RSS 的 feed URL 格式：/feeds/{id}.xml
      const feedUrl = `${this.config.baseUrl}/feeds/${account.id}.xml`;

      try {
        // 检查是否已存在
        if (existingUrls.has(feedUrl)) {
          result.existingAccounts.push(account.name);
          continue;
        }

        // 尝试获取 RSS feed
        const feed = await this.parser.parseURL(feedUrl);

        if (feed && feed.items && feed.items.length > 0) {
          const newAccount = {
            account,
            feedUrl,
            title: feed.title || account.name,
            description: feed.description || account.description || '',
            itemCount: feed.items.length,
            registered: false,
          };

          // 自动注册
          if (this.config.autoRegister) {
            try {
              this.registerAccount(account, feedUrl, feed.title || account.name);
              newAccount.registered = true;
              console.log(`[WeWe] 注册公众号: ${account.name} (${feed.items.length} 条)`);
            } catch (err) {
              console.warn(`[WeWe] 注册失败: ${account.name}`, err);
            }
          }

          result.newAccounts.push(newAccount);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.failedAccounts.push({ account, error: message });
      }
    }

    return result;
  }

  /**
   * 注册公众号到 intel_sources
   */
  registerAccount(account: WeChatAccount, feedUrl: string, name: string): IntelSource {
    // 检查是否已存在
    const existing = this.sourceRepo.findAll().find(
      s => s.feedUrl === feedUrl || s.name === name
    );
    if (existing) {
      return existing;
    }

    return this.sourceRepo.create({
      name,
      shortName: name.substring(0, 10),
      sourceType: 'wechat_mp',
      accessMethod: 'rss' as AccessMethod,
      baseUrl: `${this.config.baseUrl}/feeds/${account.id}.xml`,
      feedUrl,
      config: {
        weweAccountId: account.id,
        wechatId: account.wechatId,
        tags: account.tags,
      },
      schedule: { cron: '*/30 * * * *' },
      enabled: true,
      priority: account.priority,
      tags: ['wewe', 'wechat', ...account.tags],
    } as any);
  }

  /**
   * 获取指定公众号的 RSS 内容
   */
  async fetchAccount(accountId: string): Promise<Parser.Output | null> {
    try {
      const feedUrl = `${this.config.baseUrl}/feeds/${accountId}.xml`;
      return await this.parser.parseURL(feedUrl);
    } catch (error) {
      console.error(`[WeWe] 获取公众号失败: ${accountId}`, error);
      return null;
    }
  }

  /**
   * 验证 WeWe RSS 实例是否可用
   */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      // 尝试获取 WeWe RSS 首页
      const response = await fetch(this.config.baseUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { ok: true, message: 'WeWe RSS 实例正常' };
      }

      return { ok: false, message: `WeWe RSS 实例响应异常: ${response.status}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, message: `WeWe RSS 实例不可达: ${message}` };
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): WeWeStats {
    const allSources = this.sourceRepo.findAll();
    const weweSources = allSources.filter(s =>
      s.tags.includes('wewe') || s.sourceType === 'wechat_mp'
    );

    return {
      totalSources: allSources.length,
      wechatSources: weweSources.length,
      enabledWechatSources: weweSources.filter(s => s.enabled).length,
      configuredAccounts: GAME_WECHAT_ACCOUNTS.length,
      baseUrl: this.config.baseUrl,
    };
  }
}

/**
 * WeWe RSS 统计信息
 */
export interface WeWeStats {
  totalSources: number;
  wechatSources: number;
  enabledWechatSources: number;
  configuredAccounts: number;
  baseUrl: string;
}
