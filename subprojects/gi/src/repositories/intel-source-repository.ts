/**
 * 情报源 Repository
 */
import { BaseRepository } from './base.js';
import type { IntelSource, SourceConfig, ScheduleConfig, Priority, SourceType, AccessMethod } from '../models/types.js';

interface IntelSourceRow {
  id: string;
  name: string;
  short_name: string;
  source_type: string;
  access_method: string;
  base_url: string;
  feed_url: string | null;
  config: string;
  schedule: string;
  enabled: number;
  priority: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export class IntelSourceRepository extends BaseRepository<IntelSource, IntelSourceRow> {
  protected tableName = 'intel_sources';

  protected toModel(row: IntelSourceRow): IntelSource {
    return {
      id: row.id,
      name: row.name,
      shortName: row.short_name,
      sourceType: row.source_type as SourceType,
      accessMethod: row.access_method as AccessMethod,
      baseUrl: row.base_url,
      feedUrl: row.feed_url || undefined,
      config: JSON.parse(row.config) as SourceConfig,
      schedule: JSON.parse(row.schedule) as ScheduleConfig,
      enabled: row.enabled === 1,
      priority: row.priority as Priority,
      tags: JSON.parse(row.tags) as string[],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(model: Partial<IntelSource>): Partial<IntelSourceRow> {
    return {
      id: model.id,
      name: model.name,
      short_name: model.shortName,
      source_type: model.sourceType,
      access_method: model.accessMethod,
      base_url: model.baseUrl,
      feed_url: model.feedUrl,
      config: model.config ? JSON.stringify(model.config) : undefined,
      schedule: model.schedule ? JSON.stringify(model.schedule) : undefined,
      enabled: model.enabled !== undefined ? (model.enabled ? 1 : 0) : undefined,
      priority: model.priority,
      tags: model.tags ? JSON.stringify(model.tags) : undefined,
      created_at: model.createdAt,
      updated_at: model.updatedAt,
    };
  }

  // ===== 自定义查询 =====

  /**
   * 根据名称查找
   */
  findByName(name: string): IntelSource | null {
    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE name = ?`).get(name) as IntelSourceRow | undefined;
    return row ? this.toModel(row) : null;
  }

  /**
   * 查找已启用的源
   */
  findEnabled(priority?: Priority): IntelSource[] {
    let sql = `SELECT * FROM ${this.tableName} WHERE enabled = 1`;
    const params: unknown[] = [];

    if (priority) {
      sql += ` AND priority = ?`;
      params.push(priority);
    }

    sql += ` ORDER BY priority ASC, created_at DESC`;

    const rows = this.db.prepare(sql).all(...params) as IntelSourceRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 按采集方式查找
   */
  findByAccessMethod(method: AccessMethod): IntelSource[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE access_method = ? AND enabled = 1`
    ).all(method) as IntelSourceRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 按来源类型查找启用的源
   */
  findByTypes(sourceTypes: SourceType[]): IntelSource[] {
    if (sourceTypes.length === 0) return [];

    const placeholders = sourceTypes.map(() => '?').join(', ');
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE enabled = 1 AND source_type IN (${placeholders})`
    ).all(...sourceTypes) as IntelSourceRow[];

    return rows.map((row) => this.toModel(row));
  }

  /**
   * 按优先级统计
   */
  countByPriority(): Record<Priority, number> {
    const rows = this.db.prepare(
      `SELECT priority, COUNT(*) as count FROM ${this.tableName} GROUP BY priority`
    ).all() as { priority: string; count: number }[];

    const result: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    for (const row of rows) {
      result[row.priority] = row.count;
    }
    return result as Record<Priority, number>;
  }
}
