/**
 * 采集路由分发器
 *
 * 根据源的 accessMethod 自动选择最佳采集器
 *
 * @see docs/design/05-采集器设计.md
 */
import { collectorFactory } from './base.js';
import { RssCollector } from './rss-collector.js';
import { PlaywrightCollector } from './playwright-collector.js';
import { ScraplingCollector } from './scrapling-collector.js';
import { IntelSourceRepository } from '../repositories/intel-source-repository.js';
import { SeedRepository } from '../repositories/seed-repository.js';
import { RawEvidenceRepository } from '../repositories/raw-evidence-repository.js';
import { SourceHealthService } from '../services/health/index.js';
import type { IntelSource, Seed, RawEvidence, CollectionJob, AccessMethod } from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';

// 注册默认采集器
collectorFactory.register(new RssCollector());

// Scrapling 优先（反爬 + 自适应），Playwright 作为 fallback
const scraplingCollector = new ScraplingCollector();
const playwrightCollector = new PlaywrightCollector();

/**
 * 智能采集器：优先用 Scrapling，不可用时回退 Playwright
 */
const smartDynamicCollector = {
  type: 'dynamic' as const,
  async collect(source: IntelSource, seeds: Seed[]): Promise<RawEvidence[]> {
    // 先尝试 Scrapling
    try {
      const healthy = await scraplingCollector.healthCheck();
      if (healthy) {
        return scraplingCollector.collect(source, seeds);
      }
    } catch (error) {
      console.warn('[Router] Scrapling 不可用，回退 Playwright:', error);
    }
    // 回退 Playwright
    return playwrightCollector.collect(source, seeds);
  },
  async healthCheck(): Promise<boolean> {
    return (
      (await scraplingCollector.healthCheck().catch(() => false)) ||
      (await playwrightCollector.healthCheck().catch(() => false))
    );
  },
};

collectorFactory.register(smartDynamicCollector);

/**
 * 采集路由
 */
export class CollectorRouter {
  private sourceRepo: IntelSourceRepository;
  private seedRepo: SeedRepository;
  private evidenceRepo: RawEvidenceRepository;
  private healthService: SourceHealthService;

  constructor() {
    this.sourceRepo = new IntelSourceRepository();
    this.seedRepo = new SeedRepository();
    this.evidenceRepo = new RawEvidenceRepository();
    this.healthService = new SourceHealthService();
  }

  /**
   * 执行一次采集任务
   */
  async route(job: CollectionJob): Promise<CollectionResult> {
    const source = this.sourceRepo.findById(job.sourceId);
    if (!source) {
      throw new Error(`Source not found: ${job.sourceId}`);
    }

    const seeds = job.seedIds
      .map(id => this.seedRepo.findById(id))
      .filter((s): s is Seed => s !== null);

    // 获取采集器
    if (!collectorFactory.hasCollector(source.accessMethod)) {
      throw new Error(`No collector for method: ${source.accessMethod}`);
    }
    const collector = collectorFactory.getCollector(source.accessMethod);

    const startedAt = new Date();

    try {
      // 执行采集
      const allEvidences = await collector.collect(source, seeds);

      // 去重
      const newEvidences = await this.deduplicate(allEvidences);

      // 保存到数据库
      for (const evidence of newEvidences) {
        this.evidenceRepo.create(evidence);
      }

      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      // 记录采集成功（健康监控）
      this.healthService.recordSuccess(source.id, duration, newEvidences.length);

      return {
        success: true,
        totalCollected: allEvidences.length,
        newCount: newEvidences.length,
        duplicateCount: allEvidences.length - newEvidences.length,
        duration,
        evidences: newEvidences,
      };
    } catch (error) {
      const duration = Date.now() - startedAt.getTime();
      const message = error instanceof Error ? error.message : String(error);

      // 记录采集失败（健康监控）
      this.healthService.recordFailure(source.id, message);

      return {
        success: false,
        totalCollected: 0,
        newCount: 0,
        duplicateCount: 0,
        duration,
        errorMessage: message,
        evidences: [],
      };
    }
  }

  /**
   * 去重：URL + SimHash
   */
  private async deduplicate(evidences: RawEvidence[]): Promise<RawEvidence[]> {
    const result: RawEvidence[] = [];

    for (const evidence of evidences) {
      // URL 去重
      if (this.evidenceRepo.existsByUrl(evidence.url)) {
        evidence.status = 'duplicate';
        continue;
      }

      // 检查本轮内是否重复
      const isDuplicateInBatch = result.some(
        existing => existing.url === evidence.url || existing.hash === evidence.hash
      );
      if (isDuplicateInBatch) {
        evidence.status = 'duplicate';
        continue;
      }

      result.push(evidence);
    }

    return result;
  }

  /**
   * 快速采集：只指定源 ID，自动选择种子
   */
  async quickCollect(sourceId: string, maxSeeds: number = 10): Promise<CollectionResult> {
    const source = this.sourceRepo.findById(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    // 获取活跃种子（按评分排序）
    const seeds = this.seedRepo.findActive(maxSeeds);

    const job: CollectionJob = {
      id: uuidv4(),
      sourceId,
      seedIds: seeds.map(s => s.id),
      trigger: 'manual',
      collectorType: source.accessMethod,
      startedAt: new Date().toISOString(),
      status: 'running',
      evidenceCount: 0,
      newEvidenceCount: 0,
      errorCount: 0,
      retryCount: 0,
      maxRetries: 3,
    };

    return this.route(job);
  }
}

/**
 * 采集结果
 */
export interface CollectionResult {
  success: boolean;
  totalCollected: number;
  newCount: number;
  duplicateCount: number;
  duration: number;
  evidences: RawEvidence[];
  errorMessage?: string;
}
