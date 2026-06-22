/**
 * 情报简报版本 Repository
 *
 * IntelligenceBrief 记录每次生成的日报/专题简报。
 * 支持版本管理、发布、用户反馈。
 *
 * @see docs/design/02-数据模型设计.md §6.8
 */
import { BaseRepository } from './base.js';
import { v4 as uuidv4 } from 'uuid';
import type {
  IntelligenceBrief,
  BriefType,
  BriefStatus,
  BriefSection,
} from '../models/types.js';

interface IntelligenceBriefRow {
  id: string;
  profile_id: string;
  brief_type: string;
  title: string;
  sections: string;
  evidence_ids: string;
  generated_at: string;
  published_at: string | null;
  status: string;
  feedback_score: number | null;
  feedback_notes: string | null;
  superseded_by: string | null;
}

export class IntelligenceBriefRepository extends BaseRepository<
  IntelligenceBrief,
  IntelligenceBriefRow
> {
  protected tableName = 'intelligence_briefs';

  protected toModel(row: IntelligenceBriefRow): IntelligenceBrief {
    return {
      id: row.id,
      profileId: row.profile_id,
      briefType: row.brief_type as BriefType,
      title: row.title,
      sections: JSON.parse(row.sections) as BriefSection[],
      evidenceIds: JSON.parse(row.evidence_ids) as string[],
      generatedAt: row.generated_at,
      publishedAt: row.published_at ?? undefined,
      status: row.status as BriefStatus,
      feedbackScore: row.feedback_score ?? undefined,
      feedbackNotes: row.feedback_notes ?? undefined,
      supersededBy: row.superseded_by ?? undefined,
    };
  }

  protected toRow(model: Partial<IntelligenceBrief>): Partial<IntelligenceBriefRow> {
    return {
      id: model.id,
      profile_id: model.profileId,
      brief_type: model.briefType,
      title: model.title,
      sections: model.sections ? JSON.stringify(model.sections) : undefined,
      evidence_ids: model.evidenceIds ? JSON.stringify(model.evidenceIds) : undefined,
      generated_at: model.generatedAt,
      published_at: model.publishedAt ?? null,
      status: model.status,
      feedback_score: model.feedbackScore ?? null,
      feedback_notes: model.feedbackNotes ?? null,
      superseded_by: model.supersededBy ?? null,
    };
  }

  /**
   * 重写 create：IntelligenceBrief 的时间字段是 generatedAt 而非 createdAt
   */
  create(model: Omit<IntelligenceBrief, 'id' | 'generatedAt'>): IntelligenceBrief {
    const now = new Date().toISOString();
    const fullModel = { ...model, id: uuidv4(), generatedAt: now } as unknown as IntelligenceBrief;
    const row = this.toRow(fullModel);

    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => (row as Record<string, unknown>)[col]);

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    this.db.prepare(sql).run(...values);

    return fullModel;
  }

  /**
   * 按画像查找简报（按生成时间倒序）
   */
  findByProfile(profileId: string, limit: number = 20): IntelligenceBrief[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE profile_id = ?
         ORDER BY generated_at DESC
         LIMIT ?`,
      )
      .all(profileId, limit) as IntelligenceBriefRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按类型查找
   */
  findByType(briefType: BriefType, limit: number = 20): IntelligenceBrief[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE brief_type = ?
         ORDER BY generated_at DESC
         LIMIT ?`,
      )
      .all(briefType, limit) as IntelligenceBriefRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按状态查找
   */
  findByStatus(status: BriefStatus, limit: number = 100): IntelligenceBrief[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE status = ?
         ORDER BY generated_at DESC
         LIMIT ?`,
      )
      .all(status, limit) as IntelligenceBriefRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 获取某画像的最新简报
   */
  findLatest(profileId: string, briefType?: BriefType): IntelligenceBrief | null {
    const sql = briefType
      ? `SELECT * FROM ${this.tableName}
         WHERE profile_id = ? AND brief_type = ?
         ORDER BY generated_at DESC LIMIT 1`
      : `SELECT * FROM ${this.tableName}
         WHERE profile_id = ?
         ORDER BY generated_at DESC LIMIT 1`;
    const row = (briefType
      ? this.db.prepare(sql).get(profileId, briefType)
      : this.db.prepare(sql).get(profileId)) as IntelligenceBriefRow | undefined;
    return row ? this.toModel(row) : null;
  }

  /**
   * 获取某日某画像的日报（daily 类型）
   */
  findDailyByDate(profileId: string, date: string): IntelligenceBrief | null {
    // date 格式：'YYYY-MM-DD'
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE profile_id = ?
           AND brief_type = 'daily'
           AND date(generated_at) = date(?)
         ORDER BY generated_at DESC
         LIMIT 1`,
      )
      .all(profileId, date) as IntelligenceBriefRow[];
    return rows[0] ? this.toModel(rows[0]) : null;
  }

  /**
   * 发布简报（草稿 → 已发布）
   */
  publish(id: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET status = 'published',
             published_at = datetime('now')
         WHERE id = ? AND status = 'draft'`,
      )
      .run(id);
    return result.changes > 0;
  }

  /**
   * 归档简报
   */
  archive(id: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET status = 'archived'
         WHERE id = ?`,
      )
      .run(id);
    return result.changes > 0;
  }

  /**
   * 标记被新版本取代
   */
  supersede(oldId: string, newId: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET status = 'superseded',
             superseded_by = ?
         WHERE id = ?`,
      )
      .run(newId, oldId);
    return result.changes > 0;
  }

  /**
   * 添加用户反馈
   */
  addFeedback(id: string, score: number, notes?: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET feedback_score = ?,
             feedback_notes = ?
         WHERE id = ?`,
      )
      .run(score, notes ?? null, id);
    return result.changes > 0;
  }

  /**
   * 按状态统计
   */
  countByStatus(): Record<BriefStatus, number> {
    const rows = this.db
      .prepare(
        `SELECT status, COUNT(*) as count
         FROM ${this.tableName}
         GROUP BY status`,
      )
      .all() as Array<{ status: string; count: number }>;
    const result: Record<string, number> = {
      draft: 0,
      published: 0,
      archived: 0,
      superseded: 0,
    };
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result as Record<BriefStatus, number>;
  }

  /**
   * 按类型统计
   */
  countByType(): Record<BriefType, number> {
    const rows = this.db
      .prepare(
        `SELECT brief_type, COUNT(*) as count
         FROM ${this.tableName}
         GROUP BY brief_type`,
      )
      .all() as Array<{ brief_type: string; count: number }>;
    const result: Record<string, number> = {
      daily: 0,
      topic: 0,
      alert: 0,
      custom: 0,
    };
    for (const row of rows) {
      result[row.brief_type] = row.count;
    }
    return result as Record<BriefType, number>;
  }

  /**
   * 清理旧草稿（超过 N 天的草稿自动归档）
   */
  archiveOldDrafts(daysOld: number = 7): number {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET status = 'archived'
         WHERE status = 'draft'
           AND generated_at < datetime('now', ?)`,
      )
      .run(`-${daysOld} days`);
    return result.changes;
  }
}
