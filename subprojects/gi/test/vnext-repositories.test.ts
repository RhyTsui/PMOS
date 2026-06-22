/**
 * VNext Repository 单元测试
 *
 * 覆盖 8 个新 Repository 的基本 CRUD + 自定义查询
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initializeDatabase, getDatabase, closeDatabase } from '../src/lib/database.js';
import {
  RequirementProfileRepository,
  EvidenceLedgerRepository,
  ModelQueryTaskRepository,
  ModelAnswerRepository,
  ModelClaimRepository,
  ModelSourceMentionRepository,
  BenchmarkParameterRepository,
  IntelligenceBriefRepository,
} from '../src/repositories/index.js';
import { v4 as uuidv4 } from 'uuid';

describe('VNext Repository', () => {
  let profileRepo: RequirementProfileRepository;
  let ledgerRepo: EvidenceLedgerRepository;
  let taskRepo: ModelQueryTaskRepository;
  let answerRepo: ModelAnswerRepository;
  let claimRepo: ModelClaimRepository;
  let mentionRepo: ModelSourceMentionRepository;
  let benchmarkRepo: BenchmarkParameterRepository;
  let briefRepo: IntelligenceBriefRepository;

  const ids: string[] = [];
  const trackId = (id: string): string => {
    ids.push(id);
    return id;
  };

  beforeEach(() => {
    initializeDatabase();
    const db = getDatabase();
    // 清空 VNext 表（按外键依赖顺序）
    db.exec(`
      DELETE FROM intelligence_briefs;
      DELETE FROM benchmark_parameters;
      DELETE FROM evidence_ledger;
      DELETE FROM model_source_mentions;
      DELETE FROM model_claims;
      DELETE FROM model_answers;
      DELETE FROM model_query_tasks;
      DELETE FROM requirement_profiles;
    `);
    profileRepo = new RequirementProfileRepository();
    ledgerRepo = new EvidenceLedgerRepository();
    taskRepo = new ModelQueryTaskRepository();
    answerRepo = new ModelAnswerRepository();
    claimRepo = new ModelClaimRepository();
    mentionRepo = new ModelSourceMentionRepository();
    benchmarkRepo = new BenchmarkParameterRepository();
    briefRepo = new IntelligenceBriefRepository();
  });

  afterEach(() => {
    closeDatabase();
    ids.length = 0;
  });

  // ========== RequirementProfile ==========

  describe('RequirementProfileRepository', () => {
    it('创建并读取画像', () => {
      const profile = profileRepo.create({
        name: '小游戏买量日报',
        owner: 'user-001',
        industry: '游戏',
        purpose: ['发行', '买量'],
        focusTopics: ['新游上线', '买量素材变化'],
        entities: { companies: ['腾讯'], products: ['微信小游戏'], platforms: [] },
        sourcePolicy: { preferredSourceIds: [], excludeSourceIds: [] },
        verificationPolicy: { required: true, minSources: 2 },
        deliveryPolicy: { format: 'daily_brief', frequency: '每天9点', channels: [], excludeContent: [] },
        priority: { 新游上线: 'high' },
        timeWindow: '最近7天',
        status: 'active',
      } as any);

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('小游戏买量日报');
      trackId(profile.id);

      const found = profileRepo.findById(profile.id);
      expect(found).not.toBeNull();
      expect(found?.purpose).toEqual(['发行', '买量']);
      expect(found?.entities.companies).toEqual(['腾讯']);
    });

    it('按所有者查找', () => {
      const p1 = profileRepo.create({
        name: 'P1', owner: 'u1', industry: '游戏', purpose: [],
        focusTopics: [], entities: { companies: [], products: [], platforms: [] },
        sourcePolicy: { preferredSourceIds: [], excludeSourceIds: [] },
        verificationPolicy: { required: false, minSources: 1 },
        deliveryPolicy: { format: 'daily_brief', frequency: '每天', channels: [], excludeContent: [] },
        priority: {}, timeWindow: '最近7天', status: 'active',
      } as any);
      const p2 = profileRepo.create({
        name: 'P2', owner: 'u2', industry: '游戏', purpose: [],
        focusTopics: [], entities: { companies: [], products: [], platforms: [] },
        sourcePolicy: { preferredSourceIds: [], excludeSourceIds: [] },
        verificationPolicy: { required: false, minSources: 1 },
        deliveryPolicy: { format: 'daily_brief', frequency: '每天', channels: [], excludeContent: [] },
        priority: {}, timeWindow: '最近7天', status: 'active',
      } as any);
      trackId(p1.id); trackId(p2.id);

      const u1Profiles = profileRepo.findByOwner('u1');
      expect(u1Profiles.length).toBe(1);
      expect(u1Profiles[0].name).toBe('P1');
    });

    it('按状态查找 + 切换状态', () => {
      const p = profileRepo.create({
        name: 'P', owner: 'u1', industry: '游戏', purpose: [],
        focusTopics: [], entities: { companies: [], products: [], platforms: [] },
        sourcePolicy: { preferredSourceIds: [], excludeSourceIds: [] },
        verificationPolicy: { required: false, minSources: 1 },
        deliveryPolicy: { format: 'daily_brief', frequency: '每天', channels: [], excludeContent: [] },
        priority: {}, timeWindow: '最近7天', status: 'active',
      } as any);
      trackId(p.id);

      expect(profileRepo.findByStatus('active').length).toBe(1);
      expect(profileRepo.findByStatus('paused').length).toBe(0);

      profileRepo.updateStatus(p.id, 'paused');
      expect(profileRepo.findByStatus('active').length).toBe(0);
      expect(profileRepo.findByStatus('paused').length).toBe(1);
    });

    it('按状态统计', () => {
      const counts = profileRepo.countByStatus();
      expect(counts.active).toBe(0);
      expect(counts.paused).toBe(0);
      expect(counts.archived).toBe(0);
    });
  });

  // ========== EvidenceLedger ==========

  describe('EvidenceLedgerRepository', () => {
    it('创建证据并查询', () => {
      const ledger = ledgerRepo.create({
        targetType: 'model_claim',
        targetId: 'claim-001',
        evidenceType: 'cross_verified',
        title: '米哈游发布新游',
        confidence: 0.9,
        collectedAt: new Date().toISOString(),
        verificationStatus: 'verified',
      } as any);
      trackId(ledger.id);

      const found = ledgerRepo.findById(ledger.id);
      expect(found).not.toBeNull();
      expect(found?.targetType).toBe('model_claim');
    });

    it('按目标查找', () => {
      ledgerRepo.create({
        targetType: 'model_claim', targetId: 'claim-A', evidenceType: 'raw_article',
        title: '证据1', confidence: 0.8,
        collectedAt: new Date().toISOString(), verificationStatus: 'verified',
      } as any);
      ledgerRepo.create({
        targetType: 'model_claim', targetId: 'claim-A', evidenceType: 'raw_article',
        title: '证据2', confidence: 0.7,
        collectedAt: new Date().toISOString(), verificationStatus: 'unverified',
      } as any);
      ledgerRepo.create({
        targetType: 'model_claim', targetId: 'claim-B', evidenceType: 'raw_article',
        title: '证据3', confidence: 0.6,
        collectedAt: new Date().toISOString(), verificationStatus: 'verified',
      } as any);

      const claimA = ledgerRepo.findByTarget('model_claim', 'claim-A');
      expect(claimA.length).toBe(2);

      const summary = ledgerRepo.summarizeByTarget('model_claim', 'claim-A');
      expect(summary.total).toBe(2);
      expect(summary.verified).toBe(1);
      expect(summary.unverified).toBe(1);
    });

    it('更新核验状态', () => {
      const ledger = ledgerRepo.create({
        targetType: 'benchmark', targetId: 'bm-001', evidenceType: 'benchmark_source',
        title: '基准证据', confidence: 0.5,
        collectedAt: new Date().toISOString(), verificationStatus: 'unverified',
      } as any);
      trackId(ledger.id);

      ledgerRepo.updateVerificationStatus(ledger.id, 'verified', { verifiedBy: ['src-1', 'src-2'] });
      const updated = ledgerRepo.findById(ledger.id);
      expect(updated?.verificationStatus).toBe('verified');
      expect(updated?.verifiedBy).toEqual(['src-1', 'src-2']);
    });
  });

  // ========== 模型情报完整流程 ==========

  describe('模型情报完整流程', () => {
    it('Task → Answer → Claim → Mention', () => {
      // 1. 创建画像
      const profile = profileRepo.create({
        name: '测试画像', owner: 'tester', industry: '游戏', purpose: [],
        focusTopics: [], entities: { companies: [], products: [], platforms: [] },
        sourcePolicy: { preferredSourceIds: [], excludeSourceIds: [] },
        verificationPolicy: { required: false, minSources: 1 },
        deliveryPolicy: { format: 'daily_brief', frequency: '每天', channels: [], excludeContent: [] },
        priority: {}, timeWindow: '最近7天', status: 'active',
      } as any);
      trackId(profile.id);

      // 2. 创建任务
      const task = taskRepo.create({
        profileId: profile.id,
        taskType: 'discover_sources',
        promptTemplateId: 'discover_sources',
        promptVariables: { topic: '小游戏买量' },
        models: [{ provider: 'qwen', model: 'qwen-max', weight: 1 }],
        schedule: { runOnce: true },
        status: 'pending',
      } as any);
      trackId(task.id);

      expect(taskRepo.findByProfile(profile.id).length).toBe(1);

      // 3. 创建回答
      const answer = answerRepo.create({
        taskId: task.id,
        modelProvider: 'qwen',
        modelName: 'qwen-max',
        promptVersion: 'v1',
        answerText: '推荐 GameLook、游戏葡萄...',
        tokenCost: { input: 100, output: 200, total: 300 },
        latencyMs: 1500,
        status: 'success',
      } as any);
      trackId(answer.id);

      expect(answerRepo.findByTask(task.id).length).toBe(1);

      // 4. 创建观点
      const claim = claimRepo.create({
        answerId: answer.id,
        claimType: 'trend',
        summary: '小游戏买量市场 Q3 饱和',
        entities: [{ name: '小游戏', type: 'trend' }],
        confidence: 0.75,
        freshness: 'recent',
        verificationRequired: true,
        verificationStatus: 'unverified',
        verifiedEvidenceIds: [],
      } as any);
      trackId(claim.id);

      expect(claimRepo.findByAnswer(answer.id).length).toBe(1);
      expect(claimRepo.findPendingVerification(10).length).toBe(1);

      // 5. 创建信源提及
      const mention = mentionRepo.create({
        answerId: answer.id,
        sourceName: 'GameLook',
        sourceType: 'media',
        reason: '游戏行业权威媒体',
        recommendedUse: '监控行业动态',
        confidence: 0.9,
        discoveryStatus: 'new',
      } as any);
      trackId(mention.id);

      expect(mentionRepo.findByAnswer(answer.id).length).toBe(1);
      expect(mentionRepo.findNew(10).length).toBe(1);

      // 6. 观点核验
      claimRepo.updateVerificationStatus(claim.id, 'verified', ['ev-1']);
      const verifiedClaim = claimRepo.findById(claim.id);
      expect(verifiedClaim?.verificationStatus).toBe('verified');

      // 7. Token 统计
      const cost = answerRepo.sumTokenCost(task.id);
      expect(cost.total).toBe(300);
    });
  });

  // ========== BenchmarkParameter ==========

  describe('BenchmarkParameterRepository', () => {
    it('创建并查找基准参数', () => {
      const bm = benchmarkRepo.create({
        industry: '游戏',
        segment: '小游戏',
        metricName: '首日ROI',
        valueRange: { min: 0.08, max: 0.15, p50: 0.11 },
        timeWindow: '2026-Q1',
        sourceType: 'report',
        evidenceIds: ['e1', 'e2'],
        confidence: 0.72,
        applicableConditions: ['买量场景'],
      } as any);
      trackId(bm.id);

      expect(benchmarkRepo.findBySegment('小游戏').length).toBe(1);
      expect(benchmarkRepo.findBySegmentAndMetric('小游戏', '首日ROI').length).toBe(1);
      expect(benchmarkRepo.listSegments()).toContain('小游戏');
      expect(benchmarkRepo.listMetrics('小游戏')).toContain('首日ROI');
    });

    it('过期处理', () => {
      const bm = benchmarkRepo.create({
        industry: '游戏', segment: 'SLG', metricName: 'LTV_D7',
        timeWindow: '2026-Q1', sourceType: 'internal',
        evidenceIds: [], confidence: 0.5, applicableConditions: [],
      } as any);
      trackId(bm.id);

      expect(benchmarkRepo.findActive().length).toBe(1);
      benchmarkRepo.expire(bm.id);
      expect(benchmarkRepo.findActive().length).toBe(0);
    });
  });

  // ========== IntelligenceBrief ==========

  describe('IntelligenceBriefRepository', () => {
    it('创建并发布日报', () => {
      const profile = profileRepo.create({
        name: '日报画像', owner: 'tester', industry: '游戏', purpose: [],
        focusTopics: [], entities: { companies: [], products: [], platforms: [] },
        sourcePolicy: { preferredSourceIds: [], excludeSourceIds: [] },
        verificationPolicy: { required: false, minSources: 1 },
        deliveryPolicy: { format: 'daily_brief', frequency: '每天', channels: [], excludeContent: [] },
        priority: {}, timeWindow: '最近7天', status: 'active',
      } as any);
      trackId(profile.id);

      const brief = briefRepo.create({
        profileId: profile.id,
        briefType: 'daily',
        title: '游戏行业日报 2026-06-22',
        sections: [
          {
            id: 'sec-1',
            title: '今日重点事件',
            order: 1,
            items: [
              {
                id: 'item-1',
                title: '米哈游发布新游',
                summary: '...',
                evidenceIds: ['ev-1'],
                sourceCount: 3,
                audienceTags: ['老板'],
              },
            ],
          },
        ],
        evidenceIds: ['ev-1'],
        status: 'draft',
      } as any);
      trackId(brief.id);

      // 查找
      expect(briefRepo.findByProfile(profile.id).length).toBe(1);
      expect(briefRepo.findLatest(profile.id, 'daily')?.id).toBe(brief.id);

      // 发布
      briefRepo.publish(brief.id);
      expect(briefRepo.findById(brief.id)?.status).toBe('published');

      // 反馈
      briefRepo.addFeedback(brief.id, 4.5, '内容质量不错');
      expect(briefRepo.findById(brief.id)?.feedbackScore).toBe(4.5);
    });

    it('按日期查找日报', () => {
      const profile = profileRepo.create({
        name: 'P', owner: 'u', industry: '游戏', purpose: [],
        focusTopics: [], entities: { companies: [], products: [], platforms: [] },
        sourcePolicy: { preferredSourceIds: [], excludeSourceIds: [] },
        verificationPolicy: { required: false, minSources: 1 },
        deliveryPolicy: { format: 'daily_brief', frequency: '每天', channels: [], excludeContent: [] },
        priority: {}, timeWindow: '最近7天', status: 'active',
      } as any);
      trackId(profile.id);

      briefRepo.create({
        profileId: profile.id, briefType: 'daily', title: '今日日报',
        sections: [], evidenceIds: [], status: 'published',
      } as any);

      const today = new Date().toISOString().split('T')[0];
      const found = briefRepo.findDailyByDate(profile.id, today);
      expect(found).not.toBeNull();
      expect(found?.briefType).toBe('daily');
    });
  });
});
