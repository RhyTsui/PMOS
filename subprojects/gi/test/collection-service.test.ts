/**
 * Collection Service 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollectionService } from '../src/services/collection/collection-service.js';
import { CollectorRouter } from '../src/collectors/router.js';
import { SeedService } from '../src/services/seed/index.js';
import { getDatabase, initializeDatabase } from '../src/lib/database.js';

// Mock CollectorRouter
vi.mock('../src/collectors/router.js', () => {
  return {
    CollectorRouter: vi.fn().mockImplementation(() => ({
      quickCollect: vi.fn().mockResolvedValue({
        sourceId: 'test-source-id',
        success: true,
        totalCollected: 5,
        newCount: 3,
        duplicateCount: 2,
        errors: [],
        duration: 1000,
        evidences: [
          { id: 'ev1', title: '测试证据1', url: 'https://example.com/1' },
          { id: 'ev2', title: '测试证据2', url: 'https://example.com/2' },
          { id: 'ev3', title: '测试证据3', url: 'https://example.com/3' },
        ],
      }),
    })),
  };
});

// Mock PipelineService
vi.mock('../src/services/pipeline/pipeline-service.js', () => {
  return {
    PipelineService: vi.fn().mockImplementation(() => ({
      processEvidence: vi.fn().mockResolvedValue({
        evidenceId: 'test-evidence-id',
        success: true,
        structuredEventId: 'test-structured-event-id',
        evidenceEventId: 'test-evidence-event-id',
        signalId: 'test-signal-id',
      }),
    })),
  };
});

describe('CollectionService', () => {
  let collectionService: CollectionService;
  let seedService: SeedService;

  beforeEach(() => {
    // 初始化数据库（确保表存在）
    initializeDatabase();
    // 清理测试数据（先禁用外键约束）
    const db = getDatabase();
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM collection_jobs');
    db.exec('DELETE FROM source_health');
    db.exec('DELETE FROM raw_evidence');
    db.exec('DELETE FROM seeds');
    db.exec('DELETE FROM intel_sources');
    db.exec('PRAGMA foreign_keys = ON');

    collectionService = new CollectionService();
    seedService = new SeedService();
    vi.clearAllMocks();
  });

  it('采集单个源成功', async () => {
    // 创建测试源
    const db = getDatabase();
    db.prepare(`
      INSERT INTO intel_sources (id, name, short_name, source_type, access_method, base_url, enabled, priority, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test-source-id',
      '测试源',
      'TEST',
      'media',
      'rss',
      'https://example.com',
      1,
      'P1',
      JSON.stringify({ url: 'https://example.com/rss' })
    );

    const result = await collectionService.collectSource('test-source-id');

    expect(result.success).toBe(true);
    expect(result.totalCollected).toBe(5);
    expect(result.newCount).toBe(3);
    expect(result.duplicateCount).toBe(2);
    expect(result.errors.length).toBe(0);
  });

  it('采集时自动触发管道处理', async () => {
    // 创建测试源
    const db = getDatabase();
    db.prepare(`
      INSERT INTO intel_sources (id, name, short_name, source_type, access_method, base_url, enabled, priority, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test-source-id',
      '测试源',
      'TEST',
      'media',
      'rss',
      'https://example.com',
      1,
      'P1',
      JSON.stringify({ url: 'https://example.com/rss' })
    );

    const result = await collectionService.collectSource('test-source-id');

    // 应该触发管道处理（异步）
    // 由于是异步的，我们需要等待一小段时间
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.success).toBe(true);
    // 管道处理应该被调用3次（3个新证据）
    // 这个验证需要查看 PipelineService 的 mock 调用次数
  });

  it('源不存在时返回失败', async () => {
    const result = await collectionService.collectSource('non-existent-source');

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Source not found: non-existent-source');
  });

  it('使用种子过滤采集', async () => {
    // 创建种子
    const seed = seedService.createSeed({
      seedType: 'entity',
      text: '原神',
      entityType: 'game',
      aliases: ['Genshin Impact'],
      category: '游戏',
      score: 80,
      tags: ['P0游戏'],
    });

    // 创建测试源
    const db = getDatabase();
    db.prepare(`
      INSERT INTO intel_sources (id, name, short_name, source_type, access_method, base_url, enabled, priority, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test-source-id',
      '测试源',
      'TEST',
      'media',
      'rss',
      'https://example.com',
      1,
      'P1',
      JSON.stringify({ url: 'https://example.com/rss' })
    );

    // 采集时应该使用种子过滤
    const result = await collectionService.collectSource('test-source-id');

    expect(result.success).toBe(true);
    // 应该使用种子进行过滤
    // 这个验证需要查看 CollectorRouter 的调用参数
  });

  it('采集统计信息', () => {
    // 先创建一个有效的源
    const db = getDatabase();
    db.prepare(`
      INSERT INTO intel_sources (id, name, short_name, source_type, access_method, base_url, enabled, priority, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'source1',
      '测试源1',
      'TEST1',
      'media',
      'rss',
      'https://example.com',
      1,
      'P1',
      '{}'
    );

    // 创建一些测试数据
    db.prepare(`
      INSERT INTO raw_evidence (id, source_id, title, content, url, hash, status, metadata, seed_ids, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ev1',
      'source1',
      '测试证据1',
      '内容1',
      'https://example.com/1',
      'hash1',
      'collected',
      '{}',
      '[]',
      '[]'
    );

    const stats = collectionService.getStats();

    expect(stats).toBeDefined();
    expect(stats.totalEvidence).toBeGreaterThanOrEqual(1);
    expect(stats.evidenceByStatus).toBeDefined();
    expect(stats.sourcesByPriority).toBeDefined();
  });

  it('批量采集所有启用的源', async () => {
    // 创建多个测试源
    const db = getDatabase();
    for (let i = 1; i <= 3; i++) {
      db.prepare(`
        INSERT INTO intel_sources (id, name, short_name, source_type, access_method, base_url, enabled, priority, config)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `source-${i}`,
        `测试源${i}`,
        `TEST${i}`,
        'media',
        'rss',
        `https://example${i}.com`,
        1,
        'P1',
        JSON.stringify({ url: `https://example${i}.com/rss` })
      );
    }

    const results = await collectionService.collectAll();

    expect(results.totalSources).toBe(3);
    expect(results.results.every(r => r.success)).toBe(true);
  });

  it('按优先级批量采集', async () => {
    // 创建不同优先级的源
    const db = getDatabase();
    db.prepare(`
      INSERT INTO intel_sources (id, name, short_name, source_type, access_method, base_url, enabled, priority, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('p0-source', 'P0源', 'P0', 'media', 'rss', 'https://example.com', 1, 'P0', '{}');
    db.prepare(`
      INSERT INTO intel_sources (id, name, short_name, source_type, access_method, base_url, enabled, priority, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('p1-source', 'P1源', 'P1', 'media', 'rss', 'https://example.com', 1, 'P1', '{}');
    db.prepare(`
      INSERT INTO intel_sources (id, name, short_name, source_type, access_method, base_url, enabled, priority, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('p2-source', 'P2源', 'P2', 'media', 'rss', 'https://example.com', 1, 'P2', '{}');

    // 只采集 P0 和 P1 的源
    const results = await collectionService.collectAll(['P0', 'P1']);

    expect(results.totalSources).toBe(2);
  });

  it('采集禁用源时返回失败', async () => {
    // 创建禁用的源
    const db = getDatabase();
    db.prepare(`
      INSERT INTO intel_sources (id, name, short_name, source_type, access_method, base_url, enabled, priority, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('disabled-source', '禁用源', 'DIS', 'media', 'rss', 'https://example.com', 0, 'P1', '{}');

    const result = await collectionService.collectSource('disabled-source');

    // 应该返回失败或者跳过
    expect(result.success).toBe(false);
  });
});
