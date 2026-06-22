/**
 * 情报需求画像 Repository
 *
 * RequirementProfile 驱动采集方向与日报/专题生成。
 * 是 VNext 配置中心的核心实体。
 *
 * @see docs/design/02-数据模型设计.md §6.1
 */
import { BaseRepository } from './base.js';
import type {
  RequirementProfile,
  ProfileStatus,
  BriefFormat,
} from '../models/types.js';

interface RequirementProfileRow {
  id: string;
  name: string;
  owner: string;
  industry: string;
  purpose: string;
  focus_topics: string;
  entities: string;
  source_policy: string;
  verification_policy: string;
  delivery_policy: string;
  priority: string;
  time_window: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class RequirementProfileRepository extends BaseRepository<
  RequirementProfile,
  RequirementProfileRow
> {
  protected tableName = 'requirement_profiles';

  protected toModel(row: RequirementProfileRow): RequirementProfile {
    return {
      id: row.id,
      name: row.name,
      owner: row.owner,
      industry: row.industry,
      purpose: JSON.parse(row.purpose) as string[],
      focusTopics: JSON.parse(row.focus_topics) as string[],
      entities: JSON.parse(row.entities) as RequirementProfile['entities'],
      sourcePolicy: JSON.parse(row.source_policy) as RequirementProfile['sourcePolicy'],
      verificationPolicy: JSON.parse(row.verification_policy) as RequirementProfile['verificationPolicy'],
      deliveryPolicy: JSON.parse(row.delivery_policy) as RequirementProfile['deliveryPolicy'],
      priority: JSON.parse(row.priority) as RequirementProfile['priority'],
      timeWindow: row.time_window,
      status: row.status as ProfileStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(model: Partial<RequirementProfile>): Partial<RequirementProfileRow> {
    return {
      id: model.id,
      name: model.name,
      owner: model.owner,
      industry: model.industry,
      purpose: model.purpose ? JSON.stringify(model.purpose) : undefined,
      focus_topics: model.focusTopics ? JSON.stringify(model.focusTopics) : undefined,
      entities: model.entities ? JSON.stringify(model.entities) : undefined,
      source_policy: model.sourcePolicy ? JSON.stringify(model.sourcePolicy) : undefined,
      verification_policy: model.verificationPolicy ? JSON.stringify(model.verificationPolicy) : undefined,
      delivery_policy: model.deliveryPolicy ? JSON.stringify(model.deliveryPolicy) : undefined,
      priority: model.priority ? JSON.stringify(model.priority) : undefined,
      time_window: model.timeWindow,
      status: model.status,
      created_at: model.createdAt,
      updated_at: model.updatedAt,
    };
  }

  /**
   * 按所有者查找
   */
  findByOwner(owner: string, status?: ProfileStatus): RequirementProfile[] {
    if (status) {
      const rows = this.db
        .prepare(
          `SELECT * FROM ${this.tableName}
           WHERE owner = ? AND status = ?
           ORDER BY updated_at DESC`,
        )
        .all(owner, status) as RequirementProfileRow[];
      return rows.map((r) => this.toModel(r));
    }
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE owner = ?
         ORDER BY updated_at DESC`,
      )
      .all(owner) as RequirementProfileRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按状态查找（默认 active）
   */
  findByStatus(status: ProfileStatus = 'active'): RequirementProfile[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE status = ?
         ORDER BY updated_at DESC`,
      )
      .all(status) as RequirementProfileRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按名称模糊查找
   */
  searchByName(keyword: string): RequirementProfile[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE name LIKE ?
         ORDER BY updated_at DESC`,
      )
      .all(`%${keyword}%`) as RequirementProfileRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按状态统计
   */
  countByStatus(): Record<ProfileStatus, number> {
    const rows = this.db
      .prepare(
        `SELECT status, COUNT(*) as count
         FROM ${this.tableName}
         GROUP BY status`,
      )
      .all() as Array<{ status: string; count: number }>;
    const result: Record<string, number> = { active: 0, paused: 0, archived: 0 };
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result as Record<ProfileStatus, number>;
  }

  /**
   * 切换状态
   */
  updateStatus(id: string, status: ProfileStatus): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET status = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(status, id);
    return result.changes > 0;
  }
}
