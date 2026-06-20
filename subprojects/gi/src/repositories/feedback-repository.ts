/**
 * 反馈 Repository
 */
import { BaseRepository } from './base.js';
import type { Feedback, FeedbackType, FeedbackStatus } from '../models/types.js';

interface FeedbackRow {
  id: string;
  feedback_type: string;
  content: string;
  submitter: string | null;
  contact: string | null;
  status: string;
  related_ids: string;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export class FeedbackRepository extends BaseRepository<Feedback, FeedbackRow> {
  protected tableName = 'feedback';

  protected toModel(row: FeedbackRow): Feedback {
    return {
      id: row.id,
      feedbackType: row.feedback_type as FeedbackType,
      content: row.content,
      submitter: row.submitter || undefined,
      contact: row.contact || undefined,
      status: row.status as FeedbackStatus,
      relatedIds: JSON.parse(row.related_ids) as string[],
      adminNotes: row.admin_notes || undefined,
      processedAt: row.processed_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(model: Partial<Feedback>): Partial<FeedbackRow> {
    return {
      id: model.id,
      feedback_type: model.feedbackType,
      content: model.content,
      submitter: model.submitter,
      contact: model.contact,
      status: model.status,
      related_ids: model.relatedIds ? JSON.stringify(model.relatedIds) : undefined,
      admin_notes: model.adminNotes,
      processed_at: model.processedAt,
      created_at: model.createdAt,
      updated_at: model.updatedAt,
    };
  }

  /**
   * 按状态查找
   */
  findByStatus(status: FeedbackStatus, limit: number = 100): Feedback[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY created_at DESC LIMIT ?`
    ).all(status, limit) as FeedbackRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 按类型查找
   */
  findByType(feedbackType: FeedbackType, limit: number = 100): Feedback[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE feedback_type = ? ORDER BY created_at DESC LIMIT ?`
    ).all(feedbackType, limit) as FeedbackRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 按状态统计
   */
  countByStatus(): Record<FeedbackStatus, number> {
    const rows = this.db.prepare(
      `SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`
    ).all() as { status: string; count: number }[];

    const result: Record<string, number> = { pending: 0, processing: 0, accepted: 0, rejected: 0 };
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result as Record<FeedbackStatus, number>;
  }

  /**
   * 更新状态
   */
  updateStatus(id: string, status: FeedbackStatus, adminNotes?: string): void {
    const processedAt = status === 'accepted' || status === 'rejected' ? new Date().toISOString() : null;
    this.db.prepare(
      `UPDATE ${this.tableName} SET status = ?, admin_notes = ?, processed_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(status, adminNotes || null, processedAt, id);
  }
}
