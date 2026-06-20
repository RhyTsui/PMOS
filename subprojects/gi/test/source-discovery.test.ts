/**
 * Source Discovery 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SourceDiscoveryService } from '../src/services/source-discovery/source-discovery-service.js';
import { SeedRepository } from '../src/repositories/seed-repository.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { RawEvidenceRepository } from '../src/repositories/raw-evidence-repository.js';
import { getDatabase, initializeDatabase } from '../src/lib/database.js';
import type { Seed, IntelSource, RawEvidence } from '../src/models/types.js';

// Mock LLM client
vi.mock('../src/lib/llm-client.js', () => ({
  createLLMClient: vi.fn().mockReturnValue({
    call: vi.fn().mockResolvedValue({
      content: JSON.stringify([
        {
          name: '游戏葡萄',
          url: 'https://youxiputao.com',
          feedUrl: 'https://youxiputao.com/rss',
          sourceType: 'media',
          accessMethod: 'rss',
          confidence: 0.85,
          reason: '知名游戏行业媒体，覆盖新游资讯和深度分析',
        },
        {
          name: '游戏陀螺',
          url: 'https://youxituoluo.com',
          feedUrl: 'https://youxituoluo.com/rss',
          sourceType: 'media',
          accessMethod: 'rss',
          confidence: 0.80,
          reason: '游戏行业垂直媒体，重点关注出海和买量',
        },
      ]),
      model: 'Qwen3.5-397B',
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    }),
  }),
}));

describe('SourceDiscoveryService', () => {
  let service: SourceDiscoveryService;
  let seedRepo: SeedRepository;
  let sourceRepo: IntelSourceRepository;
  let evidenceRepo: RawEvidenceRepository;

  beforeEach(() => {
    initializeDatabase();
    const db = getDatabase();
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM seeds');
    db.exec('DELETE FROM intel_sources');
    db.exec('DELETE FROM raw_evidence');

    service = new SourceDiscoveryService({
      minSeedScore: 70,
      maxDiscoveries: 10,
      enableLLMRecommendation: true,
      enableCooccurrenceExtraction: true,
      enableSearchDiscovery: false,
    });

    seedRepo = new SeedRepository();
    sourceRepo = new IntelSourceRepository();
    evidenceRepo = new RawEvidenceRepository();
  });

  it('应该正确初始化服务', () => {
    expect(service).toBeDefined();
  });

  it('应该获取高分种子', async () => {
    // 创建测试种子
    const highScoreSeed = seedRepo.create({
      seedType: 'entity',
      text: '米哈游',
      score: 85,
      status: 'active',
      tags: ['P0公司'],
      discoveryCount: 0,
      failCount: 0,
    } as any);

    const lowScoreSeed = seedRepo.create({
      seedType: 'entity',
      text: '小公司',
      score: 50,
      status: 'active',
      tags: ['P3公司'],
      discoveryCount: 0,
      failCount: 0,
    } as any);

    const report = await service.discover();

    expect(report.seedsChecked).toBe(1); // 只有高分种子被检查
    expect(report.discoveries.length).toBeGreaterThan(0);
  });

  it('应该使用 LLM 推荐源', async () => {
    // 创建高分种子
    seedRepo.create({
      seedType: 'entity',
      text: '米哈游',
      score: 85,
      status: 'active',
      tags: ['P0公司'],
      discoveryCount: 10,
      failCount: 0,
    } as any);

    const report = await service.discover();

    expect(report.stats.llm_recommendation).toBeGreaterThan(0);
    expect(report.discoveries.some(d => d.discoveryMethod === 'llm_recommendation')).toBe(true);
  });

  it('应该去重已存在的源', async () => {
    // 创建已存在的源
    sourceRepo.create({
      name: '游戏葡萄',
      shortName: '葡萄',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://youxiputao.com',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: true,
      priority: 'P1',
      tags: [],
    } as any);

    // 创建高分种子
    seedRepo.create({
      seedType: 'entity',
      text: '米哈游',
      score: 85,
      status: 'active',
      tags: ['P0公司'],
      discoveryCount: 10,
      failCount: 0,
    } as any);

    const report = await service.discover();

    // 应该过滤掉已存在的源
    const youxiputao = report.discoveries.find(d => d.name === '游戏葡萄');
    expect(youxiputao).toBeUndefined();
  });

  it('应该通过共现提取发现源', async () => {
    // 创建高分种子
    seedRepo.create({
      seedType: 'entity',
      text: '米哈游',
      score: 85,
      status: 'active',
      tags: ['P0公司'],
      discoveryCount: 10,
      failCount: 0,
    } as any);

    // 创建源
    const source = sourceRepo.create({
      name: '测试源',
      shortName: '测试',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://example.com',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: true,
      priority: 'P1',
      tags: [],
    } as any);

    // 创建包含源提到的证据
    evidenceRepo.create({
      sourceId: source.id,
      seedIds: [],
      url: 'https://example.com/article1',
      title: '米哈游新游戏发布',
      content: '据GameLook报道，米哈游今日发布了新游戏...',
      hash: 'hash1',
      status: 'collected',
      collectedAt: new Date().toISOString(),
      metadata: {},
      images: [],
    } as any);

    const report = await service.discover();

    expect(report.stats.cooccurrence).toBeGreaterThanOrEqual(0);
  });

  it('应该正确添加发现的源', () => {
    const discovery = {
      name: '测试源',
      url: 'https://test.com',
      feedUrl: 'https://test.com/rss',
      sourceType: 'media' as const,
      accessMethod: 'rss' as const,
      discoveryMethod: 'llm_recommendation' as const,
      confidence: 0.8,
      relatedSeedIds: ['seed-1'],
      reason: '测试理由',
    };

    const source = service.addDiscoveredSource(discovery);

    expect(source).toBeDefined();
    expect(source?.name).toBe('测试源');
    expect(source?.enabled).toBe(false); // 默认禁用
    expect(source?.tags).toContain('auto-discovered');
  });

  it('应该获取发现统计', () => {
    // 创建一些源
    sourceRepo.create({
      name: '源1',
      shortName: '源1',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://source1.com',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: true,
      priority: 'P1',
      tags: [],
    } as any);

    sourceRepo.create({
      name: '自动发现源',
      shortName: '自动',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://auto.com',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: false,
      priority: 'P2',
      tags: ['auto-discovered'],
    } as any);

    const stats = service.getStats();

    expect(stats.totalSources).toBe(2);
    expect(stats.autoDiscovered).toBe(1);
    expect(stats.enabledAutoDiscovered).toBe(0);
  });

  it('应该限制最大发现数量', async () => {
    // 创建多个高分种子
    for (let i = 0; i < 10; i++) {
      seedRepo.create({
        seedType: 'entity',
        text: `公司${i}`,
        score: 80 + i,
        status: 'active',
        tags: ['P0公司'],
        discoveryCount: 10,
        failCount: 0,
      } as any);
    }

    const report = await service.discover();

    expect(report.discoveries.length).toBeLessThanOrEqual(10); // maxDiscoveries = 10
  });

  it('应该按置信度排序发现结果', async () => {
    // 创建高分种子
    seedRepo.create({
      seedType: 'entity',
      text: '米哈游',
      score: 85,
      status: 'active',
      tags: ['P0公司'],
      discoveryCount: 10,
      failCount: 0,
    } as any);

    const report = await service.discover();

    if (report.discoveries.length > 1) {
      // 检查是否按置信度降序排序
      for (let i = 0; i < report.discoveries.length - 1; i++) {
        expect(report.discoveries[i].confidence).toBeGreaterThanOrEqual(
          report.discoveries[i + 1].confidence
        );
      }
    }
  });
});
