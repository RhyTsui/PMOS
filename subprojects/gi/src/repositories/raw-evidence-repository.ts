/**
 * 原始证据 Repository
 */
import { BaseRepository } from './base.js';
import type {
  RawEvidence, EvidenceStatus, ImageRef, EvidenceMetadata, AccessMethod,
} from '../models/types.js';

interface RawEvidenceRow {
  id: string;
  source_id: string;
  seed_ids: string;
  url: string;
  title: string;
  content: string;
  content_html: string | null;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  collected_at: string;
  images: string;
  metadata: string;
  hash: string;
  status: string;
  error_message: string | null;
}

export class RawEvidenceRepository extends BaseRepository<RawEvidence, RawEvidenceRow> {
  protected tableName = 'raw_evidence';

  protected toModel(row: RawEvidenceRow): RawEvidence {
    return {
      id: row.id,
      sourceId: row.source_id,
      seedIds: JSON.parse(row.seed_ids) as string[],
      url: row.url,
      title: row.title,
      content: row.content,
      contentHtml: row.content_html || undefined,
      summary: row.summary || undefined,
      author: row.author || undefined,
      publishedAt: row.published_at || undefined,
      collectedAt: row.collected_at,
      images: JSON.parse(row.images) as ImageRef[],
      metadata: JSON.parse(row.metadata) as EvidenceMetadata,
      hash: row.hash,
      status: row.status as EvidenceStatus,
      errorMessage: row.error_message || undefined,
    };
  }

  protected toRow(model: Partial<RawEvidence>): Partial<RawEvidenceRow> {
    return {
      id: model.id,
      source_id: model.sourceId,
      seed_ids: model.seedIds ? JSON.stringify(model.seedIds) : undefined,
      url: model.url,
      title: model.title,
      content: model.content,
      content_html: model.contentHtml,
      summary: model.summary,
      author: model.author,
      published_at: model.publishedAt,
      collected_at: model.collectedAt,
      images: model.images ? JSON.stringify(model.images) : undefined,
      metadata: model.metadata ? JSON.stringify(model.metadata) : undefined,
      hash: model.hash,
      status: model.status,
      error_message: model.errorMessage,
    };
  }

  // ===== 自定义查询 =====

  /**
   * 根据 URL 查找（去重用）
   */
  findByUrl(url: string): RawEvidence | null {
    const row = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE url = ?`
    ).get(url) as RawEvidenceRow | undefined;
    return row ? this.toModel(row) : null;
  }

  /**
   * 查找待处理的证据
   */
  findPending(limit: number = 50): RawEvidence[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE status = 'collected' ORDER BY collected_at ASC LIMIT ?`
    ).all(limit) as RawEvidenceRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 按状态查找
   */
  findByStatus(status: EvidenceStatus, limit: number = 100): RawEvidence[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY collected_at DESC LIMIT ?`
    ).all(status, limit) as RawEvidenceRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 查找指定源的证据
   */
  findBySource(sourceId: string, limit: number = 100): RawEvidence[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE source_id = ? ORDER BY collected_at DESC LIMIT ?`
    ).all(sourceId, limit) as RawEvidenceRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 按时间范围查找
   */
  findByDateRange(from: string, to: string): RawEvidence[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE collected_at >= ? AND collected_at <= ? ORDER BY collected_at DESC`
    ).all(from, to) as RawEvidenceRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 更新状态
   */
  updateStatus(id: string, status: EvidenceStatus, errorMessage?: string): void {
    this.db.prepare(
      `UPDATE ${this.tableName} SET status = ?, error_message = ? WHERE id = ?`
    ).run(status, errorMessage || null, id);
  }

  /**
   * 检查 URL 是否已存在
   */
  existsByUrl(url: string): boolean {
    const count = this.db.prepare(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE url = ?`
    ).get(url) as { count: number };
    return count.count > 0;
  }

  /**
   * 按状态统计
   */
  countByStatus(): Record<EvidenceStatus, number> {
    const rows = this.db.prepare(
      `SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`
    ).all() as { status: string; count: number }[];

    const result: Record<string, number> = {
      collected: 0, extracting: 0, extracted: 0,
      failed: 0, duplicate: 0, filtered: 0, processed_no_value: 0,
    };
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result as Record<EvidenceStatus, number>;
  }

  /**
   * 今日采集统计
   */
  countToday(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const result = this.db.prepare(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE collected_at >= ?`
    ).get(todayStr) as { count: number };
    return result.count;
  }
}
