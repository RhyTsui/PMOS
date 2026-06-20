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
import { PipelineService } from '../pipeline/index.js';
import type { IntelSource, AccessMethod, Priority, RawEvidence } from '../../models/types.js';

/**
 * 采集服务
 */
export class CollectionService {
  private router: CollectorRouter;
  private sourceRepo: IntelSourceRepository;
  private seedRepo: SeedRepository;
  private evidenceRepo: RawEvidenceRepository;
  private seedService: SeedService;
  private pipelineService: PipelineService;

  constructor() {
    this.router = new CollectorRouter();
    this.sourceRepo = new IntelSourceRepository();
    this.seedRepo = new SeedRepository();
    this.evidenceRepo = new RawEvidenceRepository();
    this.seedService = new SeedService();
    this.pipelineService = new PipelineService();
  }

  /**
   * 采集指定源，完成后自动触发管道处理
   */
  async collectSource(sourceId: string, maxSeeds: number = 10): Promise<CollectionResult> {
    // 检查源是否存在且启用
    const source = this.sourceRepo.findById(sourceId);
    if (!source) {
      return {
        success: false,
        totalCollected: 0,
        newCount: 0,
        duplicateCount: 0,
        duration: 0,
        errors: [`Source not found: ${sourceId}`],
        evidences: [],
      };
    }
    if (!source.enabled) {
      return {
        success: false,
        totalCollected: 0,
        newCount: 0,
        duplicateCount: 0,
        duration: 0,
        errors: [`Source is disabled: ${sourceId}`],
        evidences: [],
      };
    }

    const result = await this.router.quickCollect(sourceId, maxSeeds);

    // 采集成功后，异步触发管道处理（不阻塞采集返回）
    if (result.success && result.newCount > 0) {
      this.triggerPipelineAsync(result.evidences);
    }

    return result;
  }

  /**
   * 异步触发管道处理（LLM 抽取 + 信号生成）
   */
  private triggerPipelineAsync(evidences: RawEvidence[]): void {
    // 使用 setTimeout 异步执行，不阻塞采集流程
    setTimeout(async () => {
      console.log(`[Collection] 触发管道处理 ${evidences.length} 条新证据...`);
      for (const evidence of evidences) {
        try {
          await this.pipelineService.processEvidence(evidence.id);
        } catch (error) {
          console.error(`[Collection] 管道处理失败 [${evidence.id}]:`, error);
        }
      }
      console.log(`[Collection] 管道处理完成`);
    }, 0);
  }

  /**
   * 按优先级采集所有启用的源
   */
  async collectAll(priority?: Priority | Priority[]): Promise<CollectAllResult> {
    // 支持单个优先级或优先级数组
    const priorities = Array.isArray(priority) ? priority : priority ? [priority] : undefined;

    let sources;
    if (priorities && priorities.length > 0) {
      // 查询多个优先级的源
      sources = [];
      for (const p of priorities) {
        const pSources = this.sourceRepo.findEnabled(p);
        sources.push(...pSources);
      }
    } else {
      sources = this.sourceRepo.findEnabled();
    }

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
