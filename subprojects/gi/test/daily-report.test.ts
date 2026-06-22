/**
 * Daily Report 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DailyReportService } from '../src/services/daily-report/daily-report-service.js';
import { RawEvidenceRepository } from '../src/repositories/raw-evidence-repository.js';
import { SignalRepository } from '../src/repositories/signal-repository.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { SourceHealthRepository } from '../src/repositories/source-health-repository.js';
import { getDatabase, initializeDatabase } from '../src/lib/database.js';
import type { RawEvidence, Signal, IntelSource, SourceHealth } from '../src/models/types.js';

describe('DailyReportService', () => {
  let service: DailyReportService;
  let evidenceRepo: RawEvidenceRepository;
  let signalRepo: SignalRepository;
  let sourceRepo: IntelSourceRepository;
  let healthRepo: SourceHealthRepository;

  beforeEach(() => {
    initializeDatabase();
    const db = getDatabase();
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM raw_evidence');
    db.exec('DELETE FROM signals');
    db.exec('DELETE FROM intel_sources');
    db.exec('DELETE FROM source_health');

    service = new DailyReportService({
      includeTrends: false, // 测试中禁用趋势分析，避免复杂性
      includeGapAlerts: false, // 测试中禁用漏采告警
    });

    evidenceRepo = new RawEvidenceRepository();
    signalRepo = new SignalRepository();
    sourceRepo = new IntelSourceRepository();
    healthRepo = new SourceHealthRepository();
  });

  it('应该正确初始化服务', () => {
    expect(service).toBeDefined();
  });

  it('应该生成每日报告', async () => {
    const report = await service.generateReport();

    expect(report).toBeDefined();
    expect(report.reportDate).toBeDefined();
    expect(report.generatedAt).toBeDefined();
    expect(report.collection).toBeDefined();
    expect(report.signals).toBeDefined();
    expect(report.sourceHealth).toBeDefined();
    expect(report.summary).toBeDefined();
  });

  it('应该正确统计采集数据', async () => {
    // 创建测试源
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

    // 创建今天的证据
    const today = new Date().toISOString().split('T')[0];
    evidenceRepo.create({
      sourceId: source.id,
      seedIds: [],
      url: 'https://example.com/1',
      title: '测试证据1',
      content: '内容1',
      hash: 'hash1',
      status: 'collected',
      collectedAt: `${today}T10:00:00.000Z`,
      metadata: {},
      images: [],
    } as any);

    evidenceRepo.create({
      sourceId: source.id,
      seedIds: [],
      url: 'https://example.com/2',
      title: '测试证据2',
      content: '内容2',
      hash: 'hash2',
      status: 'extracted',
      collectedAt: `${today}T11:00:00.000Z`,
      metadata: {},
      images: [],
    } as any);

    const report = await service.generateReport(today);

    expect(report.collection.newEvidenceCount).toBe(2);
    expect(report.collection.evidenceByStatus.collected).toBe(1);
    expect(report.collection.evidenceByStatus.extracted).toBe(1);
    expect(report.collection.evidenceBySource.length).toBe(1);
    expect(report.collection.evidenceBySource[0].count).toBe(2);
  });

  it('应该正确统计信号数据', async () => {
    // 创建测试源
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

    // 创建测试信号
    signalRepo.create({
      evidenceEventId: 'event-1',
      sourceId: source.id,
      title: '信号1',
      summary: '摘要1',
      eventType: '上线',
      priority: 'P0',
      impactScore: 85,
      audienceTags: ['老板'],
      topicTags: ['新游'],
      entityTags: ['米哈游'],
      status: 'new',
      readByRoles: [],
    } as any);

    signalRepo.create({
      evidenceEventId: 'event-2',
      sourceId: source.id,
      title: '信号2',
      summary: '摘要2',
      eventType: '融资',
      priority: 'P1',
      impactScore: 70,
      audienceTags: ['战略'],
      topicTags: ['资本'],
      entityTags: ['腾讯'],
      status: 'dispatched',
      readByRoles: [],
    } as any);

    const report = await service.generateReport();

    expect(report.signals.total).toBe(2);
    expect(report.signals.new).toBe(1);
    expect(report.signals.dispatched).toBe(1);
    expect(report.signals.byPriority.P0).toBe(1);
    expect(report.signals.byPriority.P1).toBe(1);
    expect(report.signals.byEventType['上线']).toBe(1);
    expect(report.signals.byEventType['融资']).toBe(1);
    expect(report.signals.topImpactSignals.length).toBe(2);
    expect(report.signals.topImpactSignals[0].impactScore).toBe(85);
  });

  it('应该正确统计源健康数据', async () => {
    // 创建测试源
    const source1 = sourceRepo.create({
      name: '健康源',
      shortName: '健康',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://example1.com',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: true,
      priority: 'P1',
      tags: [],
    } as any);

    const source2 = sourceRepo.create({
      name: '不健康源',
      shortName: '不健康',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://example2.com',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: true,
      priority: 'P1',
      tags: [],
    } as any);

    // 创建健康状态
    healthRepo.create({
      sourceId: source1.id,
      lastCollectedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
      totalCollections: 10,
      successCount: 10,
      failCount: 0,
      evidenceProduced: 50,
      avgResponseTime: 1000,
      healthStatus: 'healthy',
      healthScore: 95,
      consecutiveFailures: 0,
    } as any);

    healthRepo.create({
      sourceId: source2.id,
      lastCollectedAt: new Date().toISOString(),
      lastErrorAt: new Date().toISOString(),
      lastError: '连接超时',
      totalCollections: 10,
      successCount: 5,
      failCount: 5,
      evidenceProduced: 20,
      avgResponseTime: 5000,
      healthStatus: 'degraded',
      healthScore: 50,
      consecutiveFailures: 3,
    } as any);

    const report = await service.generateReport();

    expect(report.sourceHealth.total).toBe(2);
    expect(report.sourceHealth.enabled).toBe(2);
    expect(report.sourceHealth.byHealthStatus.healthy).toBe(1);
    expect(report.sourceHealth.byHealthStatus.degraded).toBe(1);
    expect(report.sourceHealth.unhealthySources.length).toBe(1);
    expect(report.sourceHealth.unhealthySources[0].name).toBe('不健康源');
  });

  it('应该生成汇总摘要', async () => {
    const report = await service.generateReport();

    expect(report.summary).toBeDefined();
    expect(report.summary.overallHealth).toBeDefined();
    expect(report.summary.overallHealth).toBeGreaterThanOrEqual(0);
    expect(report.summary.overallHealth).toBeLessThanOrEqual(100);
    expect(report.summary.keyMetricsDelta).toBeDefined();
    expect(report.summary.recommendations).toBeDefined();
    expect(report.summary.recommendations.length).toBeGreaterThan(0);
  });

  it('应该生成指定日期的报告', async () => {
    const date = '2026-01-15';
    const report = await service.generateReport(date);

    expect(report.reportDate).toBe(date);
  });

  it('应该获取报告统计', () => {
    const stats = service.getStats();

    expect(stats).toBeDefined();
    expect(stats.lastReportDate).toBeDefined();
    expect(stats.totalReportsGenerated).toBeDefined();
  });

  it('应该在无数据时正确处理', async () => {
    const report = await service.generateReport();

    expect(report.collection.newEvidenceCount).toBe(0);
    expect(report.signals.total).toBe(0);
    expect(report.sourceHealth.total).toBe(0);
    expect(report.summary.overallHealth).toBe(100); // 无源时默认健康度为100
  });

  it('应该生成建议操作', async () => {
    // 创建不健康的源
    const source = sourceRepo.create({
      name: '问题源',
      shortName: '问题',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://example.com',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: true,
      priority: 'P1',
      tags: [],
    } as any);

    healthRepo.create({
      sourceId: source.id,
      lastErrorAt: new Date().toISOString(),
      lastError: '连接失败',
      totalCollections: 5,
      successCount: 2,
      failCount: 3,
      evidenceProduced: 10,
      avgResponseTime: 3000,
      healthStatus: 'degraded',
      healthScore: 40,
      consecutiveFailures: 3,
    } as any);

    const report = await service.generateReport();

    expect(report.summary.recommendations.length).toBeGreaterThan(0);
    expect(report.summary.recommendations.some(r => r.includes('健康状态异常'))).toBe(true);
  });
  it('应该生成提示词控制的每日速览', async () => {
    const source = sourceRepo.create({
      name: '游戏葡萄',
      shortName: '葡萄',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://example.com',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: true,
      priority: 'P1',
      tags: [],
    } as any);

    const today = new Date().toISOString().split('T')[0];
    evidenceRepo.create({
      sourceId: source.id,
      seedIds: [],
      url: 'https://example.com/digest-1',
      title: '某新品开启预约并进入买量测试',
      content: '新品开启预约，素材投放节奏提前，可能意味着发行窗口临近。',
      summary: '新品预约和买量节奏同时出现，值得跟踪发行窗口。',
      hash: 'digest-hash-1',
      status: 'collected',
      collectedAt: `${today}T09:00:00.000Z`,
      metadata: {},
      images: [],
    } as any);

    signalRepo.create({
      evidenceEventId: 'digest-event-1',
      sourceId: source.id,
      title: '新品预约与买量同步升温',
      summary: '发行侧可能正在验证核心卖点和投放素材。',
      eventType: '预约',
      priority: 'P0',
      impactScore: 88,
      audienceTags: ['发行'],
      topicTags: ['新游'],
      entityTags: ['某新品'],
      status: 'new',
      readByRoles: [],
      createdAt: `${today}T10:00:00.000Z`,
    } as any);

    const digest = await service.generateDigest(today, {
      prompt: '请给 {{date}} 写速览。统计={{stats}} 内容={{items}} 信号={{signals}}',
      useLLM: false,
    });

    expect(digest.reportDate).toBe(today);
    expect(digest.source).toBe('fallback');
    expect(digest.prompt).toContain(today);
    expect(digest.prompt).toContain('某新品开启预约');
    expect(digest.shortArticle).toContain('共采集 1 条内容');
    expect(digest.qualityImpressions.length).toBeGreaterThan(0);
    expect(digest.highlights[0].title).toBe('某新品开启预约并进入买量测试');
    expect(digest.keySignals[0].priority).toBe('P0');
    expect(digest.stats.evidenceCount).toBe(1);
    expect(digest.stats.signalCount).toBe(1);
  });
});
