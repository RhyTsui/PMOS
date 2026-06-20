/**
 * Dataki 同步服务单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatakiSyncService } from '../src/services/dataki/dataki-sync.js';
import { SignalRepository } from '../src/repositories/signal-repository.js';
import { EvidenceEventRepository } from '../src/repositories/evidence-event-repository.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { getDatabase, initializeDatabase } from '../src/lib/database.js';
import type { Signal, EvidenceEvent, IntelSource } from '../src/models/types.js';

// Mock fetch
global.fetch = vi.fn();

describe('DatakiSyncService', () => {
  let service: DatakiSyncService;
  let signalRepo: SignalRepository;
  let evidenceEventRepo: EvidenceEventRepository;
  let sourceRepo: IntelSourceRepository;

  beforeEach(() => {
    initializeDatabase();
    const db = getDatabase();
    // 禁用外键约束以便测试
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM signals');
    db.exec('DELETE FROM evidence_events');
    db.exec('DELETE FROM intel_sources');

    service = new DatakiSyncService({
      baseUrl: 'http://test-dataki.local',
      apiKey: 'test-api-key',
      syncBatchSize: 10,
      syncIntervalMinutes: 5,
    });

    signalRepo = new SignalRepository();
    evidenceEventRepo = new EvidenceEventRepository();
    sourceRepo = new IntelSourceRepository();

    // 创建测试用的情报源
    const testSource: IntelSource = {
      id: 'source-1',
      name: '测试源',
      shortName: 'TEST',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://example.com',
      config: {},
      schedule: { cron: '0 * * * *' },
      enabled: true,
      priority: 'P1',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sourceRepo.create(testSource);

    vi.clearAllMocks();
  });

  it('应该正确检查配置状态', () => {
    expect(service.isConfigured()).toBe(true);

    const unconfiguredService = new DatakiSyncService();
    expect(unconfiguredService.isConfigured()).toBe(false);
  });

  it('未配置时应该返回错误', async () => {
    const unconfiguredService = new DatakiSyncService();
    const result = await unconfiguredService.sync();

    expect(result.success).toBe(false);
    expect(result.error).toContain('未配置');
    expect(result.synced).toBe(0);
  });

  it('应该正确同步信号到 Dataki', async () => {
    // 创建测试数据
    const evidenceEvent: EvidenceEvent = {
      id: 'event-1',
      eventTitle: '原神4.0版本上线',
      eventType: '上线',
      keyFacts: [
        { fact: '原神4.0版本正式上线', importance: 'high', entities: ['米哈游'] },
      ],
      actionAdvice: [
        { role: '老板', advice: '关注竞品动态', urgency: 'watch' },
      ],
      sentiment: { polarity: 'positive', intensity: 0.9 },
      evidenceIds: ['evidence-1'],
      structuredEventIds: ['structured-1'],
      sourceCount: 1,
      sourceIds: ['source-1'],
      impactScore: 90,
      confidenceScore: 0.95,
      priority: 'P0',
      audienceTags: ['老板'],
      entities: [{ name: '米哈游', type: 'company', role: 'subject' }],
      relatedSeedIds: ['seed-1'],
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dedupHash: 'hash123',
      mergeCount: 0,
    };

    evidenceEventRepo.create(evidenceEvent);

    const signalData: Omit<Signal, 'id' | 'createdAt'> = {
      evidenceEventId: 'event-1',
      sourceId: 'source-1',
      title: '原神4.0版本上线',
      summary: '原神4.0版本正式上线，带来全新内容',
      eventType: '上线',
      priority: 'P0',
      impactScore: 90,
      audienceTags: ['老板'],
      topicTags: ['版本更新'],
      entityTags: ['米哈游', '原神'],
      status: 'new',
      readByRoles: [],
    };

    const signal = signalRepo.create(signalData as any);

    // 验证信号已创建
    const createdSignal = signalRepo.findById(signal.id);
    expect(createdSignal).toBeDefined();
    expect(createdSignal?.status).toBe('new');

    // 验证 findNew 能找到信号
    const newSignals = signalRepo.findNew(10);
    expect(newSignals.length).toBeGreaterThan(0);

    // Mock fetch 成功响应
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await service.sync();

    expect(result.success).toBe(true);
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://test-dataki.local/api/documents',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        }),
      })
    );

    // 验证信号状态已更新为 dispatched
    const updatedSignal = signalRepo.findById(signal.id);
    expect(updatedSignal?.status).toBe('dispatched');
  });

  it('应该处理同步失败的情况', async () => {
    // 创建测试数据
    const evidenceEvent: EvidenceEvent = {
      id: 'event-1',
      eventTitle: '测试事件',
      eventType: '上线',
      keyFacts: [],
      actionAdvice: [],
      sentiment: { polarity: 'neutral', intensity: 0.5 },
      evidenceIds: [],
      structuredEventIds: [],
      sourceCount: 1,
      sourceIds: ['source-1'],
      impactScore: 50,
      confidenceScore: 0.8,
      priority: 'P2',
      audienceTags: [],
      entities: [],
      relatedSeedIds: [],
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dedupHash: 'hash123',
      mergeCount: 0,
    };

    evidenceEventRepo.create(evidenceEvent);

    const signal: Signal = {
      id: 'signal-1',
      evidenceEventId: 'event-1',
      sourceId: 'source-1',
      title: '测试信号',
      summary: '测试摘要',
      eventType: '上线',
      priority: 'P2',
      impactScore: 50,
      audienceTags: [],
      topicTags: [],
      entityTags: [],
      status: 'new',
      readByRoles: [],
      createdAt: new Date().toISOString(),
    };

    signalRepo.create(signal);

    // Mock fetch 失败响应
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const result = await service.sync();

    expect(result.success).toBe(true); // 整体成功，但有个别失败
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);

    // 验证信号状态未更新
    const updatedSignal = signalRepo.findById('signal-1');
    expect(updatedSignal?.status).toBe('new');
  });

  it('应该正确分批处理大量信号', async () => {
    // 创建 25 个信号（超过 batchSize 10）
    const createdSignals: Signal[] = [];
    for (let i = 1; i <= 25; i++) {
      const evidenceEvent: EvidenceEvent = {
        id: `event-${i}`,
        eventTitle: `事件${i}`,
        eventType: '上线',
        keyFacts: [],
        actionAdvice: [],
        sentiment: { polarity: 'neutral', intensity: 0.5 },
        evidenceIds: [],
        structuredEventIds: [],
        sourceCount: 1,
        sourceIds: ['source-1'],
        impactScore: 50,
        confidenceScore: 0.8,
        priority: 'P2',
        audienceTags: [],
        entities: [],
        relatedSeedIds: [],
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dedupHash: `hash${i}`,
        mergeCount: 0,
      };

      evidenceEventRepo.create(evidenceEvent);

      const signalData: Omit<Signal, 'id' | 'createdAt'> = {
        evidenceEventId: `event-${i}`,
        sourceId: 'source-1',
        title: `信号${i}`,
        summary: `摘要${i}`,
        eventType: '上线',
        priority: 'P2',
        impactScore: 50,
        audienceTags: [],
        topicTags: [],
        entityTags: [],
        status: 'new',
        readByRoles: [],
      };

      const signal = signalRepo.create(signalData as any);
      createdSignals.push(signal);
    }

    // Mock fetch 成功响应
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await service.sync();

    expect(result.success).toBe(true);
    expect(result.synced).toBe(25);
    // 应该分 3 批处理（10 + 10 + 5）
    expect(global.fetch).toHaveBeenCalledTimes(25);
  });

  it('应该正确获取同步状态', () => {
    const status = service.getStatus();

    expect(status).toHaveProperty('configured');
    expect(status).toHaveProperty('lastSyncTime');
    expect(status).toHaveProperty('pendingCount');
    expect(status.configured).toBe(true);
  });
});
