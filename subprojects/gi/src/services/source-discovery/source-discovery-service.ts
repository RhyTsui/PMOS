/**
 * 源发现服务
 *
 * 自动发现新的情报源，基于多种策略：
 * 1. LLM 推荐：基于高分种子让 LLM 推荐相关源
 * 2. 共现提取：从采集内容中提取提到的其他源
 * 3. 搜索引擎：使用搜索引擎查找相关源
 * 4. 交叉引用：从现有源中发现关联源
 *
 * @see docs/design/03-Seed种子系统设计.md
 */
import { SeedRepository } from '../../repositories/seed-repository.js';
import { IntelSourceRepository } from '../../repositories/intel-source-repository.js';
import { RawEvidenceRepository } from '../../repositories/raw-evidence-repository.js';
import { QwenClient, createLLMClient } from '../../lib/llm-client.js';
import type { Seed, IntelSource, RawEvidence } from '../../models/types.js';

/**
 * 源发现配置
 */
export interface SourceDiscoveryConfig {
  /** 触发发现的最低种子评分 */
  minSeedScore: number;
  /** 每次发现最多推荐的源数量 */
  maxDiscoveries: number;
  /** 是否启用 LLM 推荐 */
  enableLLMRecommendation: boolean;
  /** 是否启用共现提取 */
  enableCooccurrenceExtraction: boolean;
  /** 是否启用搜索引擎发现 */
  enableSearchDiscovery: boolean;
  /** 搜索使用的搜索引擎 */
  searchEngine: 'brave' | 'exa' | 'none';
}

const DEFAULT_CONFIG: SourceDiscoveryConfig = {
  minSeedScore: 70,
  maxDiscoveries: 20,
  enableLLMRecommendation: true,
  enableCooccurrenceExtraction: true,
  enableSearchDiscovery: false,
  searchEngine: 'none',
};

/**
 * 发现的源候选
 */
export interface DiscoveredSource {
  /** 源名称 */
  name: string;
  /** 源 URL */
  url: string;
  /** RSS feed URL（如果有） */
  feedUrl?: string;
  /** 源类型 */
  sourceType: 'media' | 'community' | 'official' | 'social' | 'wechat_mp' | 'forum' | 'api';
  /** 访问方式 */
  accessMethod: 'rss' | 'api' | 'static_crawl' | 'dynamic' | 'search';
  /** 发现策略 */
  discoveryMethod: 'llm_recommendation' | 'cooccurrence' | 'search' | 'cross_reference';
  /** 置信度 0-1 */
  confidence: number;
  /** 关联的种子 ID */
  relatedSeedIds: string[];
  /** 发现理由 */
  reason: string;
}

/**
 * 源发现报告
 */
export interface SourceDiscoveryReport {
  /** 发现时间 */
  discoveredAt: string;
  /** 检查的种子数量 */
  seedsChecked: number;
  /** 发现的源数量 */
  discoveredCount: number;
  /** 发现的源列表 */
  discoveries: DiscoveredSource[];
  /** 按策略分组的统计 */
  stats: {
    llm_recommendation: number;
    cooccurrence: number;
    search: number;
    cross_reference: number;
  };
}

/**
 * 源发现服务
 */
export class SourceDiscoveryService {
  private seedRepo: SeedRepository;
  private sourceRepo: IntelSourceRepository;
  private evidenceRepo: RawEvidenceRepository;
  private llm: QwenClient;
  private config: SourceDiscoveryConfig;

  constructor(config: Partial<SourceDiscoveryConfig> = {}) {
    this.seedRepo = new SeedRepository();
    this.sourceRepo = new IntelSourceRepository();
    this.evidenceRepo = new RawEvidenceRepository();
    this.llm = createLLMClient();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行源发现
   */
  async discover(): Promise<SourceDiscoveryReport> {
    const report: SourceDiscoveryReport = {
      discoveredAt: new Date().toISOString(),
      seedsChecked: 0,
      discoveredCount: 0,
      discoveries: [],
      stats: {
        llm_recommendation: 0,
        cooccurrence: 0,
        search: 0,
        cross_reference: 0,
      },
    };

    try {
      // 1. 获取高分种子
      const highScoreSeeds = this.getHighScoreSeeds();
      report.seedsChecked = highScoreSeeds.length;

      if (highScoreSeeds.length === 0) {
        return report;
      }

      // 2. LLM 推荐
      if (this.config.enableLLMRecommendation) {
        const llmDiscoveries = await this.discoverByLLM(highScoreSeeds);
        report.discoveries.push(...llmDiscoveries);
        report.stats.llm_recommendation = llmDiscoveries.length;
      }

      // 3. 共现提取
      if (this.config.enableCooccurrenceExtraction) {
        const cooccurrenceDiscoveries = await this.discoverByCooccurrence(highScoreSeeds);
        report.discoveries.push(...cooccurrenceDiscoveries);
        report.stats.cooccurrence = cooccurrenceDiscoveries.length;
      }

      // 4. 去重和过滤
      report.discoveries = this.deduplicateAndFilter(report.discoveries);

      // 5. 限制数量
      report.discoveries = report.discoveries.slice(0, this.config.maxDiscoveries);
      report.discoveredCount = report.discoveries.length;

    } catch (error) {
      console.error('[SourceDiscovery] 发现失败:', error);
    }

    return report;
  }

  /**
   * 获取高分种子
   */
  private getHighScoreSeeds(): Seed[] {
    const allSeeds = this.seedRepo.findAll({ limit: 1000 });
    return allSeeds.filter(seed =>
      seed.status === 'active' &&
      seed.score >= this.config.minSeedScore
    );
  }

  /**
   * 使用 LLM 推荐源
   */
  private async discoverByLLM(seeds: Seed[]): Promise<DiscoveredSource[]> {
    const discoveries: DiscoveredSource[] = [];

    // 选择评分最高的 5 个种子
    const topSeeds = seeds
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const seed of topSeeds) {
      try {
        const prompt = this.buildLLMPrompt(seed);
        const response = await this.llm.call({
          model: 'Qwen3.5-397B',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          maxTokens: 2000,
        });

        const parsed = this.parseLLMResponse(response.content, seed);
        discoveries.push(...parsed);
      } catch (error) {
        console.warn(`[SourceDiscovery] LLM 推荐失败 [${seed.text}]:`, error);
      }
    }

    return discoveries;
  }

  /**
   * 构建 LLM 提示词
   */
  private buildLLMPrompt(seed: Seed): string {
    return `你是一个游戏行业情报专家。当前有一个高效种子：

种子文本：${seed.text}
种子类型：${seed.seedType}
种子评分：${seed.score}
种子分类：${seed.category || '未分类'}

请推荐 3-5 个可能包含与该种子相关情报的新信息来源（网站、公众号、媒体等）。

要求：
1. 源必须是真实存在的
2. 优先推荐有 RSS 订阅的源
3. 涵盖不同类型（媒体、社区、官方等）
4. 每个源说明为什么推荐

请以 JSON 数组格式输出，每个源包含：
{
  "name": "源名称",
  "url": "源网址",
  "feedUrl": "RSS地址（如果有）",
  "sourceType": "media|community|official|social|wechat_mp|forum",
  "accessMethod": "rss|static_crawl|dynamic",
  "confidence": 0.8,
  "reason": "推荐理由"
}

直接输出 JSON 数组，不要包裹在代码块中。`;
  }

  /**
   * 解析 LLM 响应
   */
  private parseLLMResponse(content: string, seed: Seed): DiscoveredSource[] {
    const discoveries: DiscoveredSource[] = [];

    try {
      // 尝试解析 JSON
      let jsonStr = content.trim();

      // 移除可能的代码块标记
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // 提取 JSON 数组
      const match = jsonStr.match(/\[[\s\S]*\]/);
      if (match) {
        jsonStr = match[0];
      }

      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.name && item.url) {
            discoveries.push({
              name: item.name,
              url: item.url,
              feedUrl: item.feedUrl,
              sourceType: item.sourceType || 'media',
              accessMethod: item.accessMethod || 'static_crawl',
              discoveryMethod: 'llm_recommendation',
              confidence: item.confidence || 0.7,
              relatedSeedIds: [seed.id],
              reason: item.reason || 'LLM 推荐',
            });
          }
        }
      }
    } catch (error) {
      console.warn('[SourceDiscovery] 解析 LLM 响应失败:', error);
    }

    return discoveries;
  }

  /**
   * 通过共现提取发现源
   */
  private async discoverByCooccurrence(seeds: Seed[]): Promise<DiscoveredSource[]> {
    const discoveries: DiscoveredSource[] = [];

    // 获取最近的证据
    const recentEvidence = this.evidenceRepo.findAll({
      limit: 100,
      orderBy: 'collected_at',
      order: 'DESC',
    });

    // 提取提到的源
    const mentionedSources = this.extractMentionedSources(recentEvidence, seeds);
    discoveries.push(...mentionedSources);

    return discoveries;
  }

  /**
   * 从证据中提取提到的源
   */
  private extractMentionedSources(evidence: RawEvidence[], seeds: Seed[]): DiscoveredSource[] {
    const discoveries: DiscoveredSource[] = [];
    const sourcePattern = /(?:据|来源|转自|来自|参考)[：:]\s*([^\s,，。]+)/g;

    for (const ev of evidence) {
      const matches = ev.content.matchAll(sourcePattern);
      for (const match of matches) {
        const sourceName = match[1].trim();
        if (sourceName.length > 2 && sourceName.length < 20) {
          // 检查是否已存在
          const existingSource = this.sourceRepo.findAll().find(
            s => s.name === sourceName || s.baseUrl.includes(sourceName)
          );

          if (!existingSource) {
            discoveries.push({
              name: sourceName,
              url: `https://${sourceName.toLowerCase().replace(/\s+/g, '')}.com`,
              sourceType: 'media',
              accessMethod: 'static_crawl',
              discoveryMethod: 'cooccurrence',
              confidence: 0.5,
              relatedSeedIds: seeds.slice(0, 3).map(s => s.id),
              reason: `在证据 "${ev.title}" 中被提及`,
            });
          }
        }
      }
    }

    return discoveries;
  }

  /**
   * 去重和过滤
   */
  private deduplicateAndFilter(discoveries: DiscoveredSource[]): DiscoveredSource[] {
    const seen = new Set<string>();
    const filtered: DiscoveredSource[] = [];

    for (const discovery of discoveries) {
      const key = discovery.name.toLowerCase();

      // 检查是否已存在
      if (seen.has(key)) continue;

      // 检查是否已是现有源
      const existingSource = this.sourceRepo.findAll().find(
        s => s.name.toLowerCase() === key || s.baseUrl.toLowerCase().includes(key)
      );
      if (existingSource) continue;

      seen.add(key);
      filtered.push(discovery);
    }

    // 按置信度排序
    return filtered.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 将发现的源添加为情报源
   */
  addDiscoveredSource(discovery: DiscoveredSource): IntelSource | null {
    try {
      const source = this.sourceRepo.create({
        name: discovery.name,
        shortName: discovery.name.substring(0, 10),
        sourceType: discovery.sourceType,
        accessMethod: discovery.accessMethod,
        baseUrl: discovery.url,
        feedUrl: discovery.feedUrl,
        config: {},
        schedule: { cron: '0 */6 * * *' }, // 默认每6小时采集一次
        enabled: false, // 默认禁用，需要人工审核
        priority: 'P2',
        tags: ['auto-discovered', discovery.discoveryMethod],
      });

      return source;
    } catch (error) {
      console.error('[SourceDiscovery] 添加源失败:', error);
      return null;
    }
  }

  /**
   * 获取发现统计
   */
  getStats(): SourceDiscoveryStats {
    const allSources = this.sourceRepo.findAll();
    const autoDiscovered = allSources.filter(s =>
      s.tags.includes('auto-discovered')
    );

    return {
      totalSources: allSources.length,
      autoDiscovered: autoDiscovered.length,
      enabledAutoDiscovered: autoDiscovered.filter(s => s.enabled).length,
    };
  }
}

/**
 * 源发现统计
 */
export interface SourceDiscoveryStats {
  totalSources: number;
  autoDiscovered: number;
  enabledAutoDiscovered: number;
}
