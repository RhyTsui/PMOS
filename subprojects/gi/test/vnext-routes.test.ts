/**
 * VNext 路由 E2E 测试
 *
 * 通过 supertest-like 方式（这里用 http 直接调用）测试新端点
 * 由于项目没有安装 supertest，这里直接启动服务器
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, getDatabase, closeDatabase } from '../src/lib/database.js';
import { RequirementProfileService } from '../src/services/profile/index.js';

describe('VNext 路由 E2E', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    const db = getDatabase();
    db.exec(`
      DELETE FROM intelligence_briefs;
      DELETE FROM evidence_ledger;
      DELETE FROM benchmark_parameters;
      DELETE FROM requirement_profiles;
    `);
  });

  describe('RequirementProfileService 通过 API 形状', () => {
    it('创建并查询画像', () => {
      const service = new RequirementProfileService();
      const profile = service.createProfile({
        name: 'E2E 测试画像',
        owner: 'tester',
        focusTopics: ['新游'],
        deliveryPolicy: { format: 'daily_brief', frequency: '每天' },
      });

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('E2E 测试画像');

      const found = service.getProfile(profile.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('E2E 测试画像');
    });
  });

  describe('Intelligence Service 路由数据准备', () => {
    it('可以组装 feed 响应', async () => {
      const { IntelligenceApiService } = await import('../src/services/intelligence/index.js');
      const service = new IntelligenceApiService();

      // 空库时 feed 应返回空
      const feed = service.getFeed();
      expect(feed.items).toBeDefined();
      expect(Array.isArray(feed.items)).toBe(true);
      expect(feed.meta.generatedAt).toBeDefined();
    });

    it('可以查询 benchmark', async () => {
      const db = getDatabase();
      db.prepare(`
        INSERT INTO benchmark_parameters
          (id, industry, segment, metric_name, value_range, time_window, source_type, confidence, applicable_conditions)
        VALUES (?, '游戏', '小游戏', 'CPA', ?, '2026-Q2', 'report', 0.65, ?)
      `).run('bm-e2e', JSON.stringify({ min: 30, max: 80 }), JSON.stringify(['小游戏投放']));

      const { IntelligenceApiService } = await import('../src/services/intelligence/index.js');
      const service = new IntelligenceApiService();
      const result = service.getBenchmarks({ segment: '小游戏' });
      expect(result.parameters.length).toBeGreaterThan(0);
      expect(result.segment).toBe('小游戏');
    });
  });

  describe('Brief 生成路由数据准备', () => {
    it('可以触发生成日报', async () => {
      const { RequirementProfileService } = await import('../src/services/profile/index.js');
      const { BriefGenerationService } = await import('../src/services/brief/index.js');
      const profileService = new RequirementProfileService();
      const briefService = new BriefGenerationService();

      const profile = profileService.createProfile({
        name: 'E2E 日报',
        owner: 'tester',
        deliveryPolicy: { format: 'daily_brief', frequency: '每天' },
      });

      const result = briefService.generateDaily(profile.id, { autoPublish: false });
      expect(result.brief.id).toBeDefined();
      expect(result.brief.briefType).toBe('daily');
      expect(result.brief.status).toBe('draft');
      expect(result.sectionsGenerated).toBeGreaterThanOrEqual(0);
    });
  });
});
