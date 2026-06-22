/**
 * VNext Service 层单元测试
 *
 * 覆盖：
 * - RequirementProfileService
 * - IntelligenceApiService
 * - BriefGenerationService
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeDatabase, getDatabase, closeDatabase } from '../src/lib/database.js';
import { RequirementProfileService } from '../src/services/profile/index.js';
import { IntelligenceApiService } from '../src/services/intelligence/index.js';
import { BriefGenerationService } from '../src/services/brief/index.js';
import { EvidenceEventRepository } from '../src/repositories/evidence-event-repository.js';
import { TrendClusterRepository } from '../src/repositories/trend-cluster-repository.js';
import type { EvidenceEvent, TrendCluster } from '../src/models/types.js';
import { v4 as uuidv4 } from 'uuid';

describe('VNext Service 层', () => {
  let profileService: RequirementProfileService;
  let intelligenceService: IntelligenceApiService;
  let briefService: BriefGenerationService;
  let eventRepo: EvidenceEventRepository;
  let trendRepo: TrendClusterRepository;

  const createdProfileIds: string[] = [];

  beforeEach(() => {
    initializeDatabase();
    const db = getDatabase();
    // 清空相关表（按外键依赖顺序）
    db.exec(`
      DELETE FROM intelligence_briefs;
      DELETE FROM evidence_ledger;
      DELETE FROM benchmark_parameters;
      DELETE FROM model_claims;
      DELETE FROM model_answers;
      DELETE FROM model_query_tasks;
      DELETE FROM requirement_profiles;
      DELETE FROM evidence_events;
      DELETE FROM trend_clusters;
    `);
    profileService = new RequirementProfileService();
    intelligenceService = new IntelligenceApiService();
    briefService = new BriefGenerationService();
    eventRepo = new EvidenceEventRepository();
    trendRepo = new TrendClusterRepository();
  });

  afterEach(() => {
    closeDatabase();
    createdProfileIds.length = 0;
  });

  // ========== RequirementProfileService ==========

  describe('RequirementProfileService', () => {
    it('创建画像（使用最小参数）', () => {
      const profile = profileService.createProfile({
        name: '测试画像',
        owner: 'user-001',
        deliveryPolicy: { format: 'daily_brief', frequency: '每天9点' },
      });

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('测试画像');
      expect(profile.status).toBe('active');
      expect(profile.industry).toBe('游戏');
      expect(profile.verificationPolicy.required).toBe(true);
      expect(profile.verificationPolicy.minSources).toBe(2);
      createdProfileIds.push(profile.id);
    });

    it('创建画像（使用完整参数）', () => {
      const profile = profileService.createProfile({
        name: '小游戏买量日报',
        owner: 'user-001',
        industry: '游戏',
        purpose: ['发行', '买量'],
        focusTopics: ['新游上线', '买量素材'],
        entities: {
          companies: ['腾讯', '三七'],
          products: ['微信小游戏'],
          platforms: ['巨量引擎'],
        },
        deliveryPolicy: {
          format: 'daily_brief',
          frequency: '每天9点',
          channels: ['chat'],
          excludeContent: ['八卦'],
        },
        priority: { 新游上线: 'high' },
      });

      expect(profile.entities.companies).toEqual(['腾讯', '三七']);
      expect(profile.deliveryPolicy.excludeContent).toEqual(['八卦']);
      createdProfileIds.push(profile.id);
    });

    it('名称为空时抛错', () => {
      expect(() => {
        profileService.createProfile({
          name: '',
          owner: 'u',
          deliveryPolicy: { format: 'daily_brief', frequency: '每天' },
        });
      }).toThrow('画像名称不能为空');
    });

    it('更新画像', () => {
      const profile = profileService.createProfile({
        name: '原始',
        owner: 'u',
        deliveryPolicy: { format: 'daily_brief', frequency: '每天' },
      });
      createdProfileIds.push(profile.id);

      const updated = profileService.updateProfile(profile.id, {
        name: '更新后',
        focusTopics: ['新游'],
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('更新后');
      expect(updated?.focusTopics).toEqual(['新游']);
    });

    it('列出活跃画像', () => {
      const p1 = profileService.createProfile({
        name: 'P1', owner: 'u1',
        deliveryPolicy: { format: 'daily_brief', frequency: '每天' },
      });
      const p2 = profileService.createProfile({
        name: 'P2', owner: 'u2',
        deliveryPolicy: { format: 'topic_feed', frequency: '每周' },
      });
      createdProfileIds.push(p1.id, p2.id);

      const active = profileService.listActive();
      expect(active.length).toBe(2);
    });

    it('提取画像实体（用于种子生成）', () => {
      const profile = profileService.createProfile({
        name: 'P',
        owner: 'u',
        focusTopics: ['小游戏买量'],
        entities: {
          companies: ['腾讯'],
          products: ['微信小游戏'],
          platforms: [],
        },
        deliveryPolicy: { format: 'daily_brief', frequency: '每天' },
      });
      createdProfileIds.push(profile.id);

      const entities = profileService.extractEntities(profile.id);
      expect(entities).toContain('腾讯');
      expect(entities).toContain('微信小游戏');
      expect(entities).toContain('小游戏买量');
    });
  });

  // ========== IntelligenceApiService ==========

  describe('IntelligenceApiService', () => {
    it('资讯流：返回最近事件', () => {
      // 创建一些测试事件
      insertTestEvent('上线', '某新游今日公测', 85, 'P1');
      insertTestEvent('买量', '某游戏大规模投放', 72, 'P2');
      insertTestEvent('版号', '某公司获得版号', 90, 'P0');

      const feed = intelligenceService.getFeed({ limit: 10 });
      expect(feed.items.length).toBeGreaterThan(0);
      expect(feed.meta.total).toBe(feed.items.length);
      expect(feed.meta.generatedAt).toBeDefined();
    });

    it('资讯流：按事件类型过滤', () => {
      insertTestEvent('上线', 'A 上线', 80, 'P1');
      insertTestEvent('买量', 'B 投放', 70, 'P2');

      const feed = intelligenceService.getFeed({ eventType: ['上线'], limit: 10 });
      expect(feed.items.every((i) => i.eventType === '上线')).toBe(true);
    });

    it('行业基准：查询参数', () => {
      const db = getDatabase();
      const bmId = uuidv4();
      db.prepare(`
        INSERT INTO benchmark_parameters
          (id, industry, segment, metric_name, value_range, time_window, source_type, confidence, applicable_conditions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bmId, '游戏', '小游戏', '首日ROI',
        JSON.stringify({ min: 0.08, max: 0.15, p50: 0.11 }),
        '2026-Q1', 'report', 0.72, JSON.stringify(['买量场景']),
      );

      const result = intelligenceService.getBenchmarks({ segment: '小游戏', metric: '首日ROI' });
      expect(result.parameters.length).toBe(1);
      expect(result.parameters[0].name).toBe('首日ROI');
      expect(result.parameters[0].confidence).toBe(0.72);
    });

    it('证据摘要：Chat 查询依据', () => {
      // 创建画像 + 简报
      const profile = profileService.createProfile({
        name: 'P', owner: 'u',
        deliveryPolicy: { format: 'daily_brief', frequency: '每天' },
      });
      createdProfileIds.push(profile.id);

      const db = getDatabase();
      const ledgerId1 = uuidv4();
      const ledgerId2 = uuidv4();
      db.prepare(`
        INSERT INTO evidence_ledger
          (id, target_type, target_id, evidence_type, title, confidence, verification_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(ledgerId1, 'intelligence_brief', profile.id, 'raw_article', '证据1', 0.9, 'verified');
      db.prepare(`
        INSERT INTO evidence_ledger
          (id, target_type, target_id, evidence_type, title, confidence, verification_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(ledgerId2, 'intelligence_brief', profile.id, 'model_answer', '证据2', 0.7, 'unverified');

      const summary = intelligenceService.getEvidenceSummary('intelligence_brief', profile.id);
      expect(summary.evidence.length).toBe(2);
      expect(summary.summary.total).toBe(2);
      expect(summary.summary.verified).toBe(1);
      expect(summary.summary.unverified).toBe(1);
    });

    it('热门趋势：返回上升中的趋势', () => {
      insertTestTrend('AI应用', 'AI NPC', 0.45, 'rising');
      insertTestTrend('买量', '小游戏投放', 0.1, 'stable');

      const result = intelligenceService.getTrendingSignals(10);
      expect(result.trends.length).toBeGreaterThanOrEqual(1);
      expect(result.trends[0].direction).toBe('rising');
    });
  });

  // ========== BriefGenerationService ==========

  describe('BriefGenerationService', () => {
    it('生成日报', () => {
      // 创建画像
      const profile = profileService.createProfile({
        name: '游戏行业日报',
        owner: 'user-001',
        focusTopics: ['新游', '买量'],
        entities: { companies: ['腾讯'], products: [], platforms: [] },
        deliveryPolicy: {
          format: 'daily_brief',
          frequency: '每天9点',
          excludeContent: ['八卦'],
        },
      });
      createdProfileIds.push(profile.id);

      // 插入一些测试事件
      insertTestEvent('上线', '腾讯新游公测', 90, 'P0');
      insertTestEvent('买量', '某游戏大规模投放', 75, 'P1');
      insertTestEvent('版号', '某公司获得版号', 85, 'P0');
      insertTestEvent('舆情', '玩家抗议某游戏', 60, 'P2');

      const result = briefService.generateDaily(profile.id);

      expect(result.brief).toBeDefined();
      expect(result.brief.briefType).toBe('daily');
      expect(result.brief.status).toBe('draft');
      expect(result.sectionsGenerated).toBeGreaterThan(0);
      expect(result.itemsGenerated).toBeGreaterThan(0);
    });

    it('生成日报并自动发布', () => {
      const profile = profileService.createProfile({
        name: '自动日报',
        owner: 'u',
        deliveryPolicy: { format: 'daily_brief', frequency: '每天' },
      });
      createdProfileIds.push(profile.id);

      const result = briefService.generateDaily(profile.id, { autoPublish: true });
      expect(result.brief.status).toBe('published');
      expect(result.brief.publishedAt).toBeDefined();
    });

    it('按画像过滤：排除八卦', () => {
      const profile = profileService.createProfile({
        name: '过滤日报',
        owner: 'u',
        focusTopics: ['新游'],
        deliveryPolicy: {
          format: 'daily_brief',
          frequency: '每天',
          excludeContent: ['八卦'],
        },
      });
      createdProfileIds.push(profile.id);

      insertTestEvent('上线', '新游公测', 80, 'P1');
      insertTestEvent('舆情', '某明星八卦', 50, 'P3');

      const result = briefService.generateDaily(profile.id);
      // 八卦应该被排除
      const allTitles = result.brief.sections
        .flatMap((s) => s.items.map((i) => i.title))
        .join(' ');
      expect(allTitles).not.toContain('八卦');
    });
  });

  // ===== 辅助函数 =====

  function insertTestEvent(
    eventType: string,
    title: string,
    score: number,
    priority: string,
  ): string {
    const id = uuidv4();
    const now = new Date().toISOString();
    const db = getDatabase();
    db.prepare(`
      INSERT INTO evidence_events
        (id, event_title, event_type, key_facts, action_advice, sentiment,
         evidence_ids, structured_event_ids, source_count, source_ids,
         impact_score, confidence_score, priority, audience_tags, entities,
         related_seed_ids, first_seen_at, last_seen_at, dedup_hash, merge_count)
      VALUES (?, ?, ?, '[]', '[]', '{}', '[]', '[]', 1, '[]', ?, 0.8, ?, '[]', '[]', '[]', ?, ?, ?, 0)
    `).run(id, title, eventType, score, priority, now, now, `hash-${id}`);
    return id;
  }

  function insertTestTrend(
    eventType: string,
    topicTag: string,
    growthRate: number,
    direction: string,
  ): string {
    const id = uuidv4();
    const now = new Date().toISOString();
    const db = getDatabase();
    db.prepare(`
      INSERT INTO trend_clusters
        (id, event_type, topic_tag, signal_count, source_count, entity_count,
         growth_rate, trend_direction, signal_ids, window_start, window_end)
      VALUES (?, ?, ?, 10, 5, 3, ?, ?, '[]', ?, ?)
    `).run(id, eventType, topicTag, growthRate, direction, now, now);
    return id;
  }
});
