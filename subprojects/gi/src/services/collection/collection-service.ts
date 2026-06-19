/**
 * 采集服务
 *
 * 统一管理采集任务的执行、调度
 */
import { CollectorRouter, CollectionResult } from '../../collectors/index.js';
import { IntelSourceRepository } from '../../repositories/intel-source-repository.js';
import { SeedRepository } from '../../repositories/seed-repository.js';
import { RawEvidenceRepository } from '../../repositories/raw-evidence-repository.js';
import { SeedService } from '../seed/index.js';
import type { IntelSource, AccessMethod, Priority } from '../../models/types.js';

/**
 * 采集服务
 */
export class CollectionService {
  private router: CollectorRouter;
  private sourceRepo: IntelSourceRepository;
  private seedRepo: SeedRepository;
  private evidenceRepo: RawEvidenceRepository;
  private seedService: SeedService;

  constructor() {
    this.router = new CollectorRouter();
    this.sourceRepo = new IntelSourceRepository();
    this.seedRepo = new SeedRepository();
    this.evidenceRepo = new RawEvidenceRepository();
    this.seedService = new SeedService();
  }

  /**
   * 采集指定源
   */
  async collectSource(sourceId: string, maxSeeds: number = 10): Promise<CollectionResult> {
    return this.router.quickCollect(sourceId, maxSeeds);
  }

  /**
   * 按优先级采集所有启用的源
   */
  async collectAll(priority?: Priority): Promise<CollectAllResult> {
    const sources = this.sourceRepo.findEnabled(priority);
    const results: CollectAllResult = {
      totalSources: sources.length,
      successCount: 0,
      failCount: 0,
      totalNew: 0,
      results: [],
    };

    for (const source of sources) {
      try {
        const result = await this.collectSource(source.id);
        results.results.push({
          sourceId: source.id,
          sourceName: source.name,
          ...result,
        });

        if (result.success) {
          results.successCount++;
          results.totalNew += result.newCount;
        } else {
          results.failCount++;
        }
      } catch (error) {
        results.failCount++;
        results.results.push({
          sourceId: source.id,
          sourceName: source.name,
          success: false,
          totalCollected: 0,
          newCount: 0,
          duplicateCount: 0,
          duration: 0,
          evidences: [],
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * 按采集方式采集
   */
  async collectByMethod(method: AccessMethod): Promise<CollectAllResult> {
    const sources = this.sourceRepo.findByAccessMethod(method);
    const results: CollectAllResult = {
      totalSources: sources.length,
      successCount: 0,
      failCount: 0,
      totalNew: 0,
      results: [],
    };

    for (const source of sources) {
      try {
        const result = await this.collectSource(source.id);
        results.results.push({
          sourceId: source.id,
          sourceName: source.name,
          ...result,
        });

        if (result.success) {
          results.successCount++;
          results.totalNew += result.newCount;
        } else {
          results.failCount++;
        }
      } catch (error) {
        results.failCount++;
      }
    }

    return results;
  }

  /**
   * 获取采集统计
   */
  getStats(): CollectionStats {
    const evidenceStats = this.evidenceRepo.countByStatus();
    const sourceStats = this.sourceRepo.countByPriority();

    return {
      totalEvidence: Object.values(evidenceStats).reduce((sum, c) => sum + c, 0),
      todayEvidence: this.evidenceRepo.countToday(),
      evidenceByStatus: evidenceStats,
      sourcesByPriority: sourceStats,
    };
  }
}

/**
 * 批量采集结果
 */
export interface CollectAllResult {
  totalSources: number;
  successCount: number;
  failCount: number;
  totalNew: number;
  results: Array<CollectionResult & { sourceId: string; sourceName: string }>;
}

/**
 * 采集统计
 */
export interface CollectionStats {
  totalEvidence: number;
  todayEvidence: number;
  evidenceByStatus: Record<string, number>;
  sourcesByPriority: Record<string, number>;
}
