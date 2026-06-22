/**
 * 模型信源提及 Repository
 *
 * 记录模型回答中提到的信源，是 Source Discovery 的关键输入。
 *
 * @see docs/design/02-数据模型设计.md §6.5
 */
import { BaseRepository } from './base.js';
import type {
  ModelSourceMention,
  SourceType,
  DiscoveryStatus,
} from '../models/types.js';

interface ModelSourceMentionRow {
  id: string;
  answer_id: string;
  source_name: string;
  source_type: string;
  reason: string;
  recommended_use: string;
  confidence: number;
  matched_source_id: string | null;
  discovery_status: string;
  created_at: string;
}

export class ModelSourceMentionRepository extends BaseRepository<
  ModelSourceMention,
  ModelSourceMentionRow
> {
  protected tableName = 'model_source_mentions';

  protected toModel(row: ModelSourceMentionRow): ModelSourceMention {
    return {
      id: row.id,
      answerId: row.answer_id,
      sourceName: row.source_name,
      sourceType: row.source_type as SourceType | 'unknown',
      reason: row.reason,
      recommendedUse: row.recommended_use,
      confidence: row.confidence,
      matchedSourceId: row.matched_source_id ?? undefined,
      discoveryStatus: row.discovery_status as DiscoveryStatus,
      createdAt: row.created_at,
    };
  }

  protected toRow(model: Partial<ModelSourceMention>): Partial<ModelSourceMentionRow> {
    return {
      id: model.id,
      answer_id: model.answerId,
      source_name: model.sourceName,
      source_type: model.sourceType,
      reason: model.reason,
      recommended_use: model.recommendedUse,
      confidence: model.confidence,
      matched_source_id: model.matchedSourceId ?? null,
      discovery_status: model.discoveryStatus,
      created_at: model.createdAt,
    };
  }

  findByAnswer(answerId: string): ModelSourceMention[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE answer_id = ? ORDER BY confidence DESC`)
      .all(answerId) as ModelSourceMentionRow[];
    return rows.map((r) => this.toModel(r));
  }

  findByStatus(status: DiscoveryStatus): ModelSourceMention[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE discovery_status = ? ORDER BY created_at DESC`)
      .all(status) as ModelSourceMentionRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 查找新发现的信源（候选进入 trial）
   */
  findNew(limit: number = 50): ModelSourceMention[] {
    return this.findByStatus('new').slice(0, limit);
  }

  findCandidates(): ModelSourceMention[] {
    return this.findByStatus('candidate');
  }

  /**
   * 按信源名称查找（去重用）
   */
  findByName(sourceName: string): ModelSourceMention[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE source_name = ? ORDER BY created_at DESC`)
      .all(sourceName) as ModelSourceMentionRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 更新发现状态
   */
  updateDiscoveryStatus(id: string, status: DiscoveryStatus): boolean {
    const result = this.db
      .prepare(`UPDATE ${this.tableName} SET discovery_status = ? WHERE id = ?`)
      .run(status, id);
    return result.changes > 0;
  }

  /**
   * 绑定到 Source Registry 中的已有信源
   */
  bindToSource(id: string, sourceId: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET matched_source_id = ?, discovery_status = 'accepted'
         WHERE id = ?`,
      )
      .run(sourceId, id);
    return result.changes > 0;
  }

  /**
   * 按状态统计
   */
  countByStatus(): Record<DiscoveryStatus, number> {
    const rows = this.db
      .prepare(
        `SELECT discovery_status, COUNT(*) as count
         FROM ${this.tableName}
         GROUP BY discovery_status`,
      )
      .all() as Array<{ discovery_status: string; count: number }>;
    const result: Record<string, number> = {
      new: 0,
      candidate: 0,
      trial: 0,
      accepted: 0,
      rejected: 0,
    };
    for (const row of rows) {
      result[row.discovery_status] = row.count;
    }
    return result as Record<DiscoveryStatus, number>;
  }
}
