/**
 * Dataki 同步服务
 *
 * 将事件同步推送到 Dataki 知识库
 */
import { EvidenceEventRepository } from '../../repositories/evidence-event-repository.js';
import { SignalRepository } from '../../repositories/signal-repository.js';
import type { EvidenceEvent, Signal } from '../../models/types.js';

/**
 * Dataki 客户端配置
 */
export interface DatakiConfig {
  baseUrl: string;
  apiKey: string;
  syncBatchSize: number;       // 每批同步数量
  syncIntervalMinutes: number; // 同步间隔（分钟）
}

/**
 * Dataki 同步服务
 */
export class DatakiSyncService {
  private evidenceEventRepo: EvidenceEventRepository;
  private signalRepo: SignalRepository;
  private config: DatakiConfig;
  private lastSyncTime: Date | null = null;

  constructor(config?: Partial<DatakiConfig>) {
    this.evidenceEventRepo = new EvidenceEventRepository();
    this.signalRepo = new SignalRepository();
    this.config = {
      baseUrl: config?.baseUrl || process.env.DATAKI_BASE_URL || '',
      apiKey: config?.apiKey || process.env.DATAKI_API_KEY || '',
      syncBatchSize: config?.syncBatchSize || 50,
      syncIntervalMinutes: config?.syncIntervalMinutes || 30,
    };
  }

  /**
   * 检查 Dataki 是否可用
   */
  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.apiKey);
  }

  /**
   * 同步事件到 Dataki
   */
  async sync(): Promise<SyncResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Dataki 未配置，请设置 DATAKI_BASE_URL 和 DATAKI_API_KEY',
        synced: 0,
        failed: 0,
        errors: [],
      };
    }

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 获取待同步的信号（status = 'new' 或上次同步后更新的）
      const signalsToSync = this.getSignalsToSync();

      if (signalsToSync.length === 0) {
        return result;
      }

      // 分批同步
      const batches = this.chunkArray(signalsToSync, this.config.syncBatchSize);

      for (const batch of batches) {
        const batchResult = await this.syncBatch(batch);
        result.synced += batchResult.synced;
        result.failed += batchResult.failed;
        result.errors.push(...batchResult.errors);
      }

      this.lastSyncTime = new Date();
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
  }

  /**
   * 获取待同步的信号
   */
  private getSignalsToSync(): Signal[] {
    // 获取新的信号
    const newSignals = this.signalRepo.findByStatus('new', 10000);

    // 如果之前同步过，也获取上次同步后更新已推送状态的信号
    // 这里简化处理，只同步新信号
    return newSignals;
  }

  /**
   * 分批同步
   */
  private async syncBatch(signals: Signal[]): Promise<BatchSyncResult> {
    const result: BatchSyncResult = {
      synced: 0,
      failed: 0,
      errors: [],
    };

    for (const signal of signals) {
      try {
        await this.pushToDataki(signal);
        // 标记为已推送
        this.signalRepo.markDispatched(signal.id);
        result.synced++;
      } catch (error) {
        result.failed++;
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`Signal ${signal.id}: ${message}`);
      }
    }

    return result;
  }

  /**
   * 推送单个信号到 Dataki
   */
  private async pushToDataki(signal: Signal): Promise<void> {
    // 获取关联的证据事件详情
    const event = this.evidenceEventRepo.findById(signal.evidenceEventId);
    if (!event) {
      throw new Error('关联事件不存在');
    }

    // 构建 Dataki 文档
    const doc = this.buildDatakiDocument(signal, event);

    // 调用 Dataki API
    const response = await fetch(`${this.config.baseUrl}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify(doc),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dataki API 错误: ${response.status} - ${errorText}`);
    }
  }

  /**
   * 构建 Dataki 文档
   */
  private buildDatakiDocument(signal: Signal, event: EvidenceEvent): DatakiDocument {
    return {
      id: signal.id,
      title: signal.title,
      content: this.buildContent(signal, event),
      metadata: {
        type: 'game_intelligence',
        eventType: signal.eventType,
        priority: signal.priority,
        impactScore: signal.impactScore,
        audienceTags: signal.audienceTags,
        entityTags: signal.entityTags,
        topicTags: signal.topicTags,
        sourceCount: event.sourceCount,
        firstSeenAt: event.firstSeenAt,
        lastSeenAt: event.lastSeenAt,
        keyFacts: event.keyFacts.map((f: { fact: string }) => f.fact),
        actionAdvice: event.actionAdvice.map((a: { role: string; advice: string }) => `[${a.role}] ${a.advice}`),
      },
      tags: [
        signal.eventType,
        signal.priority,
        ...signal.audienceTags,
        ...signal.entityTags,
      ],
      createdAt: signal.createdAt,
    };
  }

  /**
   * 构建文档内容
   */
  private buildContent(signal: Signal, event: EvidenceEvent): string {
    const parts: string[] = [];

    parts.push(`# ${signal.title}\n`);

    // 关键事实
    if (event.keyFacts.length > 0) {
      parts.push('## 关键事实\n');
      for (const fact of event.keyFacts) {
        parts.push(`- ${fact.fact}`);
      }
      parts.push('');
    }

    // 行动建议
    if (event.actionAdvice.length > 0) {
      parts.push('## 行动建议\n');
      for (const advice of event.actionAdvice) {
        parts.push(`- **${advice.role}**（${advice.urgency}）: ${advice.advice}`);
      }
      parts.push('');
    }

    // 摘要
    parts.push(`## 摘要\n`);
    parts.push(signal.summary);
    parts.push('');

    // 来源信息
    parts.push(`## 来源\n`);
    parts.push(`- 来源数量: ${event.sourceCount}`);
    parts.push(`- 首次发现: ${event.firstSeenAt}`);
    parts.push(`- 最近更新: ${event.lastSeenAt}`);

    return parts.join('\n');
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 获取同步状态
   */
  getStatus(): SyncStatus {
    return {
      configured: this.isConfigured(),
      lastSyncTime: this.lastSyncTime?.toISOString() || null,
      pendingCount: this.signalRepo.countByStatus().new,
    };
  }
}

/**
 * Dataki 文档结构
 */
interface DatakiDocument {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  tags: string[];
  createdAt: string;
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
  error?: string;
}

/**
 * 批量同步结果
 */
interface BatchSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * 同步状态
 */
export interface SyncStatus {
  configured: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
}
