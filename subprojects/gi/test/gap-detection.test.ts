/**
 * Gap Detection 单元测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GapDetectionService } from '../src/services/gap-detection/index.js';
import { SeedService } from '../src/services/seed/index.js';
import { initializeDatabase, getDatabase } from '../src/lib/database.js';

describe('GapDetectionService', () => {
  let gapService: GapDetectionService;
  let seedService: SeedService;

  beforeEach(() => {
    // 初始化数据库（确保表存在）
    initializeDatabase();
    // 清理测试数据
    const db = getDatabase();
    db.exec('DELETE FROM seeds');

    gapService = new GapDetectionService();
    seedService = new SeedService();
  });

  it('检测漏采：高分种子无产出', () => {
    // 创建高分种子（7天前创建，从未使用）
    const seed = seedService.createSeed({
      seedType: 'entity',
      text: '原神',
      entityType: 'game',
      aliases: ['Genshin Impact'],
      category: '游戏',
      score: 80,
      tags: ['P0游戏'],
    });

    // 手动设置创建时间为 7 天前
    const db = getDatabase();
    db.prepare("UPDATE seeds SET created_at = datetime('now', '-7 days') WHERE id = ?").run(seed.id);

    const report = gapService.detect();

    expect(report.totalSeedsChecked).toBeGreaterThan(0);
    expect(report.alerts.length).toBeGreaterThan(0);
    expect(report.alerts[0].seedId).toBe(seed.id);
    expect(report.alerts[0].severity).toBe('warning');
  });

  it('检测漏采：严重级别判定', () => {
    // 创建超高分种子（14天前创建，从未使用）
    const seed = seedService.createSeed({
      seedType: 'entity',
      text: '王者荣耀',
      entityType: 'game',
      score: 95,
      tags: ['P0游戏'],
    });

    // 手动设置创建时间为 14 天前
    const db = getDatabase();
    db.prepare("UPDATE seeds SET created_at = datetime('now', '-14 days') WHERE id = ?").run(seed.id);

    const report = gapService.detect();

    const gap = report.alerts.find(g => g.seedId === seed.id);
    expect(gap).toBeDefined();
    expect(gap?.severity).toBe('critical');
    expect(gap?.suggestion).toContain('已 14 天未产出');
  });

  it('低分种子不触发漏采检测', () => {
    // 创建低分种子（分数 < 70）
    seedService.createSeed({
      seedType: 'entity',
      text: '小型独立游戏',
      entityType: 'game',
      score: 50, // 低于阈值
      tags: ['P3游戏'],
    });

    const report = gapService.detect();

    // 低分种子应该被过滤掉
    const lowScoreGap = report.alerts.find(g => g.seedText === '小型独立游戏');
    expect(lowScoreGap).toBeUndefined();
  });

  it('已使用种子不触发漏采检测', () => {
    // 创建高分种子并标记为已使用
    const seed = seedService.createSeed({
      seedType: 'entity',
      text: '米哈游',
      entityType: 'company',
      score: 85,
      tags: ['P0公司'],
    });

    // 标记为已使用（lastUsedAt 为当前时间）
    const db = getDatabase();
    db.prepare("UPDATE seeds SET last_used_at = datetime('now') WHERE id = ?").run(seed.id);

    const report = gapService.detect();

    // 已使用的种子不应该出现在漏采列表中
    const usedSeedGap = report.alerts.find(g => g.seedId === seed.id);
    expect(usedSeedGap).toBeUndefined();
  });

  it('自定义阈值配置', () => {
    // 使用更严格的阈值（5天）
    const strictService = new GapDetectionService({
      gapDaysThreshold: 5,
      minSeedScore: 60,
    });

    // 创建种子（6天前创建）
    const seed = seedService.createSeed({
      seedType: 'entity',
      text: '测试种子',
      entityType: 'game',
      score: 70,
      tags: ['测试'],
    });

    const db = getDatabase();
    db.prepare("UPDATE seeds SET created_at = datetime('now', '-6 days') WHERE id = ?").run(seed.id);

    const report = strictService.detect();

    // 应该检测到漏采（6天 > 5天阈值）
    const gap = report.alerts.find(g => g.seedId === seed.id);
    expect(gap).toBeDefined();
  });

  it('漏采建议生成', () => {
    const seed = seedService.createSeed({
      seedType: 'entity',
      text: '崩坏：星穹铁道',
      entityType: 'game',
      score: 80,
      tags: ['P0游戏'],
    });

    const db = getDatabase();
    db.prepare("UPDATE seeds SET created_at = datetime('now', '-10 days') WHERE id = ?").run(seed.id);

    const report = gapService.detect();
    const gap = report.alerts.find(g => g.seedId === seed.id);

    expect(gap).toBeDefined();
    expect(gap?.suggestion).toBeDefined();
    expect(gap?.suggestion.length).toBeGreaterThan(0);
    expect(gap?.suggestion).toContain('建议');
  });

  it('空种子库不报错', () => {
    const report = gapService.detect();

    expect(report.totalSeedsChecked).toBe(0);
    expect(report.alerts.length).toBe(0);
  });

  it('多类型种子漏采检测', () => {
    // 创建不同类型的种子
    seedService.createSeed({
      seedType: 'entity',
      text: '腾讯',
      entityType: 'company',
      score: 90,
      tags: ['P0公司'],
    });

    seedService.createSeed({
      seedType: 'event',
      text: '游戏版号发放',
      eventType: '版号',
      keywords: ['版号', '审批'],
      score: 85,
      tags: ['P0事件'],
    });

    seedService.createSeed({
      seedType: 'topic',
      text: 'AI+游戏',
      topicTag: 'AI',
      score: 80,
      tags: ['P0话题'],
    });

    // 设置创建时间为 10 天前
    const db = getDatabase();
    db.prepare("UPDATE seeds SET created_at = datetime('now', '-10 days')").run();

    const report = gapService.detect();

    expect(report.alerts.length).toBe(3);
    const types = report.alerts.map(g => g.seedType);
    expect(types).toContain('entity');
    expect(types).toContain('event');
    expect(types).toContain('topic');
  });
});
