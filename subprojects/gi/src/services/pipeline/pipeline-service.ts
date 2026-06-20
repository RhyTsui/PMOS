/**
 * 数据管道服务
 *
 * 编排完整的数据处理流程：
 * RawEvidence → [图片理解] → StructuredEvent → EvidenceEvent → Signal
 */
import { v4 as uuidv4 } from 'uuid';
import { RawEvidenceRepository } from '../../repositories/raw-evidence-repository.js';
import { StructuredEventRepository } from '../../repositories/structured-event-repository.js';
import { EvidenceEventRepository } from '../../repositories/evidence-event-repository.js';
import { SignalRepository } from '../../repositories/signal-repository.js';
import { ExtractionService } from '../extraction/index.js';
import { ImageUnderstandingService } from '../image/index.js';
import { computeSimHash } from '../../lib/simhash.js';
import type {
  RawEvidence, StructuredEvent, EvidenceEvent, Signal, EventType, Priority,
} from '../../models/types.js';

/**
 * 数据管道服务
 */
export class PipelineService {
  private evidenceRepo: RawEvidenceRepository;
  private structuredEventRepo: StructuredEventRepository;
  private evidenceEventRepo: EvidenceEventRepository;
  private signalRepo: SignalRepository;
  private extractionService: ExtractionService;
  private imageService: ImageUnderstandingService;

  constructor() {
    this.evidenceRepo = new RawEvidenceRepository();
    this.structuredEventRepo = new StructuredEventRepository();
    this.evidenceEventRepo = new EvidenceEventRepository();
    this.signalRepo = new SignalRepository();
    this.extractionService = new ExtractionService();
    this.imageService = new ImageUnderstandingService();
  }

  /**
   * 处理单条证据的完整流程
   */
  async processEvidence(evidenceId: string): Promise<PipelineResult> {
    const result: PipelineResult = {
      evidenceId,
      structuredEventId: null,
      evidenceEventId: null,
      signalId: null,
      success: false,
      errors: [],
    };

    // 1. 获取证据
    const evidence = this.evidenceRepo.findById(evidenceId);
    if (!evidence) {
      result.errors.push('证据不存在');
      return result;
    }

    if (evidence.status !== 'collected') {
      result.errors.push(`证据状态不是 collected: ${evidence.status}`);
      return result;
    }

    try {
      // 2. 图片理解（如有图片，先调用 Qwen-VL 描述）
      if (evidence.images && evidence.images.length > 0) {
        console.log(`[Pipeline] 处理 ${evidence.images.length} 张图片...`);
        const imgResult = await this.imageService.processImages(evidenceId);
        if (imgResult.processed > 0) {
          console.log(`[Pipeline] 图片理解完成: ${imgResult.processed} 张`);
          // 重新加载 evidence（已包含图片描述）
          const updatedEvidence = this.evidenceRepo.findById(evidenceId);
          if (updatedEvidence) {
            Object.assign(evidence, updatedEvidence);
          }
        }
      }

      // 3. LLM 抽取 → StructuredEvent
      console.log(`[Pipeline] 抽取证据: ${evidence.title.substring(0, 50)}...`);
      const structuredEvent = await this.extractionService.extractFromEvidence(evidence);

      if (!structuredEvent) {
        result.errors.push('LLM 抽取失败');
        return result;
      }

      // 注意：extraction-service 内部已保存 structuredEvent，此处不再重复保存
      result.structuredEventId = structuredEvent.id;
      console.log(`[Pipeline] 抽取完成: ${structuredEvent.eventTitle}`);

      // 4. 过滤无价值情报：LLM 判定为"无有效情报"的文章不进入后续流程
      if (structuredEvent.eventTitle === '无有效情报') {
        this.evidenceRepo.updateStatus(evidence.id, 'processed_no_value');
        console.log(`[Pipeline] 跳过无价值情报: ${evidence.title.substring(0, 50)}`);
        result.success = true;
        return result;
      }

      // 5. 合并到 EvidenceEvent（仅对有情报价值的内容做去重合并）
      const evidenceEvent = this.mergeToEvidenceEvent(structuredEvent, evidence);
      result.evidenceEventId = evidenceEvent.id;
      console.log(`[Pipeline] 事件合并: ${evidenceEvent.eventTitle} (来源: ${evidenceEvent.sourceCount})`);

      // 6. 生成 Signal（防止同一 evidenceEvent 重复生成信号）
      const existingSignal = this.signalRepo.findByEvidenceEventId(evidenceEvent.id);
      if (existingSignal) {
        result.signalId = existingSignal.id;
        console.log(`[Pipeline] 信号已存在，跳过: ${existingSignal.title}`);
      } else {
        const signal = this.generateSignal(evidenceEvent, evidence.sourceId);
        this.signalRepo.create(signal);
        result.signalId = signal.id;
        console.log(`[Pipeline] 信号生成: ${signal.title} (${signal.priority})`);
      }

      result.success = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(message);
      console.error(`[Pipeline] 处理失败: ${message}`);
    }

    return result;
  }

  /**
   * 处理所有待处理的证据
   */
  async processPending(limit: number = 10): Promise<PipelineResult[]> {
    const pendingEvidences = this.evidenceRepo.findPending(limit);
    console.log(`[Pipeline] 找到 ${pendingEvidences.length} 条待处理证据`);

    const results: PipelineResult[] = [];
    for (const evidence of pendingEvidences) {
      const result = await this.processEvidence(evidence.id);
      results.push(result);
    }

    return results;
  }

  /**
   * 将 StructuredEvent 合并到 EvidenceEvent
   */
  private mergeToEvidenceEvent(
    structuredEvent: StructuredEvent,
    evidence: RawEvidence
  ): EvidenceEvent {
    // 生成去重哈希（基于事件标题）
    const dedupHash = computeSimHash(structuredEvent.eventTitle);

    // 查找是否已存在相似事件
    let existingEvent = this.evidenceEventRepo.findByDedupHash(dedupHash);

    if (existingEvent) {
      // 合并到已存在的事件
      return this.mergeIntoExistingEvent(existingEvent, structuredEvent, evidence);
    } else {
      // 创建新事件
      return this.createNewEvidenceEvent(structuredEvent, evidence, dedupHash);
    }
  }

  /**
   * 合并到已存在的事件
   */
  private mergeIntoExistingEvent(
    existing: EvidenceEvent,
    newEvent: StructuredEvent,
    evidence: RawEvidence
  ): EvidenceEvent {
    const now = new Date().toISOString();

    // 合并证据 ID
    const evidenceIds = [...new Set([...existing.evidenceIds, evidence.id])];
    const structuredEventIds = [...new Set([...existing.structuredEventIds, newEvent.id])];
    const sourceIds = [...new Set([...existing.sourceIds, evidence.sourceId])];

    // 更新事件
    const updated: EvidenceEvent = {
      ...existing,
      evidenceIds,
      structuredEventIds,
      sourceIds,
      sourceCount: sourceIds.length,
      lastSeenAt: now,
      updatedAt: now,
      mergeCount: existing.mergeCount + 1,
      // 重新计算评分（多源交叉验证提升可信度）
      confidenceScore: Math.min(1.0, 0.5 + sourceIds.length * 0.1),
      impactScore: this.recalculateImpactScore(existing, sourceIds.length),
    };

    this.evidenceEventRepo.update(existing.id, updated);
    return updated;
  }

  /**
   * 创建新的 EvidenceEvent
   */
  private createNewEvidenceEvent(
    structuredEvent: StructuredEvent,
    evidence: RawEvidence,
    dedupHash: string
  ): EvidenceEvent {
    const now = new Date().toISOString();

    const event: EvidenceEvent = {
      id: uuidv4(),
      eventTitle: structuredEvent.eventTitle,
      eventType: structuredEvent.eventType,
      keyFacts: structuredEvent.keyFacts,
      actionAdvice: structuredEvent.actionAdvice,
      sentiment: structuredEvent.sentiment,
      evidenceIds: [evidence.id],
      structuredEventIds: [structuredEvent.id],
      sourceCount: 1,
      sourceIds: [evidence.sourceId],
      impactScore: structuredEvent.impactScore,
      confidenceScore: 0.5, // 单源初始可信度
      priority: structuredEvent.priority,
      audienceTags: structuredEvent.audienceTags,
      entities: structuredEvent.entities,
      relatedSeedIds: evidence.seedIds,
      firstSeenAt: now,
      lastSeenAt: now,
      publishedAt: evidence.publishedAt,
      createdAt: now,
      updatedAt: now,
      dedupHash,
      mergeCount: 0,
    };

    this.evidenceEventRepo.create(event);
    return event;
  }

  /**
   * 从 EvidenceEvent 生成 Signal
   */
  private generateSignal(evidenceEvent: EvidenceEvent, sourceId: string): Signal {
    const now = new Date().toISOString();

    // 生成摘要
    const summary = this.generateSummary(evidenceEvent);

    // 提取标签
    const entityTags = evidenceEvent.entities.map((e: { name: string }) => e.name);
    const topicTags = [evidenceEvent.eventType];

    return {
      id: uuidv4(),
      evidenceEventId: evidenceEvent.id,
      sourceId,
      title: evidenceEvent.eventTitle,
      summary,
      eventType: evidenceEvent.eventType,
      priority: evidenceEvent.priority,
      impactScore: evidenceEvent.impactScore,
      audienceTags: evidenceEvent.audienceTags,
      topicTags,
      entityTags,
      status: 'new',
      readByRoles: [],
      createdAt: now,
    };
  }

  /**
   * 生成信号摘要
   */
  private generateSummary(event: EvidenceEvent): string {
    const facts = event.keyFacts.slice(0, 3).map((f: { fact: string }) => f.fact).join('；');
    const sourceInfo = event.sourceCount > 1 ? `（${event.sourceCount} 个来源报道）` : '';
    return `${facts}${sourceInfo}`;
  }

  /**
   * 重新计算影响评分（多源交叉验证加成）
   */
  private recalculateImpactScore(event: EvidenceEvent, sourceCount: number): number {
    // 多源加成（最多 +20 分）
    const multiSourceBonus = Math.min(20, (sourceCount - 1) * 5);
    return Math.min(100, event.impactScore + multiSourceBonus);
  }

  /**
   * 获取管道统计
   */
  getStats(): PipelineStats {
    return {
      evidence: {
        total: this.evidenceRepo.count(),
        pending: this.evidenceRepo.countByStatus().collected,
      },
      structuredEvents: this.structuredEventRepo.count(),
      evidenceEvents: this.evidenceEventRepo.count(),
      signals: {
        total: this.signalRepo.count(),
        byStatus: this.signalRepo.countByStatus(),
      },
    };
  }
}

/**
 * 管道处理结果
 */
export interface PipelineResult {
  evidenceId: string;
  structuredEventId: string | null;
  evidenceEventId: string | null;
  signalId: string | null;
  success: boolean;
  errors: string[];
}

/**
 * 管道统计
 */
export interface PipelineStats {
  evidence: {
    total: number;
    pending: number;
  };
  structuredEvents: number;
  evidenceEvents: number;
  signals: {
    total: number;
    byStatus: Record<string, number>;
  };
}
