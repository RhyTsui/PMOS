/**
 * 信号 Repository
 */
import { BaseRepository } from './base.js';
import type { Signal, SignalStatus, EventType, Priority } from '../models/types.js';

interface SignalRow {
  id: string;
  evidence_event_id: string;
  source_id: string;
  title: string;
  summary: string;
  event_type: string;
  priority: string;
  impact_score: number;
  audience_tags: string;
  topic_tags: string;
  entity_tags: string;
  status: string;
  read_by_roles: string;
  dispatched_at: string | null;
  created_at: string;
}

export class SignalRepository extends BaseRepository<Signal, SignalRow> {
  protected tableName = 'signals';

  protected toModel(row: SignalRow): Signal {
    return {
      id: row.id,
      evidenceEventId: row.evidence_event_id,
      sourceId: row.source_id,
      title: row.title,
      summary: row.summary,
      eventType: row.event_type as EventType,
      priority: row.priority as Priority,
      impactScore: row.impact_score,
      audienceTags: JSON.parse(row.audience_tags) as string[],
      topicTags: JSON.parse(row.topic_tags) as string[],
      entityTags: JSON.parse(row.entity_tags) as string[],
      status: row.status as SignalStatus,
      readByRoles: JSON.parse(row.read_by_roles) as string[],
      dispatchedAt: row.dispatched_at || undefined,
      createdAt: row.created_at,
    };
  }

  protected toRow(model: Partial<Signal>): Partial<SignalRow> {
    return {
      id: model.id,
      evidence_event_id: model.evidenceEventId,
      source_id: model.sourceId,
      title: model.title,
      summary: model.summary,
      event_type: model.eventType,
      priority: model.priority,
      impact_score: model.impactScore,
      audience_tags: model.audienceTags ? JSON.stringify(model.audienceTags) : undefined,
      topic_tags: model.topicTags ? JSON.stringify(model.topicTags) : undefined,
      entity_tags: model.entityTags ? JSON.stringify(model.entityTags) : undefined,
      status: model.status,
      read_by_roles: model.readByRoles ? JSON.stringify(model.readByRoles) : undefined,
      dispatched_at: model.dispatchedAt,
      created_at: model.createdAt,
    };
  }

  // 获取新信号
  findNew(limit: number = 50): Signal[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE status = 'new' ORDER BY impact_score DESC LIMIT ?`
    ).all(limit) as SignalRow[];
    return rows.map(row => this.toModel(row));
  }

  // 按状态查找
  findByStatus(status: SignalStatus, limit: number = 100): Signal[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY created_at DESC LIMIT ?`
    ).all(status, limit) as SignalRow[];
    return rows.map(row => this.toModel(row));
  }

  // 根据证据事件 ID 查找（防止重复生成信号）
  findByEvidenceEventId(evidenceEventId: string): Signal | null {
    const row = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE evidence_event_id = ? ORDER BY created_at DESC LIMIT 1`
    ).get(evidenceEventId) as SignalRow | undefined;
    return row ? this.toModel(row) : null;
  }

  // 按优先级查找
  findByPriority(priority: Priority, limit: number = 100): Signal[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE priority = ? ORDER BY impact_score DESC LIMIT ?`
    ).all(priority, limit) as SignalRow[];
    return rows.map(row => this.toModel(row));
  }

  // 按受众标签查找
  findByAudienceTag(tag: string, limit: number = 100): Signal[] {
    // SQLite JSON 查询
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE json_extract(audience_tags, '$') LIKE ? ORDER BY impact_score DESC LIMIT ?`
    ).all(`%"${tag}"%`, limit) as SignalRow[];
    return rows.map(row => this.toModel(row));
  }

  // 更新状态
  updateStatus(id: string, status: SignalStatus): void {
    this.db.prepare(
      `UPDATE ${this.tableName} SET status = ? WHERE id = ?`
    ).run(status, id);
  }

  // 标记为已推送
  markDispatched(id: string): void {
    this.db.prepare(
      `UPDATE ${this.tableName} SET status = 'dispatched', dispatched_at = datetime('now') WHERE id = ?`
    ).run(id);
  }

  // 统计
  countByStatus(): Record<SignalStatus, number> {
    const rows = this.db.prepare(
      `SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`
    ).all() as { status: string; count: number }[];

    const result: Record<string, number> = { new: 0, dispatched: 0, consumed: 0, archived: 0 };
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result as Record<SignalStatus, number>;
  }
}
