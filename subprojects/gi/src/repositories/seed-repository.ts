/**
 * 种子 Repository
 */
import { BaseRepository } from './base.js';
import type {
  Seed, SeedType, SeedStatus, EventType, SourceType,
  EntitySeed, EventSeed, TopicSeed, SourceSeed,
} from '../models/types.js';

interface SeedRow {
  id: string;
  seed_type: string;
  text: string;
  score: number;
  status: string;
  // 实体种子
  entity_type: string | null;
  aliases: string | null;
  category: string | null;
  market: string | null;
  // 事件种子
  event_type: string | null;
  keywords: string | null;
  // 话题种子
  topic_tag: string | null;
  related_entities: string | null;
  trend_direction: string | null;
  // 源种子
  discovery_url: string | null;
  discovery_method: string | null;
  verified: number | null;
  // 通用
  discovery_count: number;
  last_used_at: string | null;
  last_effective_at: string | null;
  fail_count: number;
  tags: string;
  created_at: string;
  updated_at: string;
}

export class SeedRepository extends BaseRepository<Seed, SeedRow> {
  protected tableName = 'seeds';

  protected toModel(row: SeedRow): Seed {
    const base = {
      id: row.id,
      seedType: row.seed_type as SeedType,
      text: row.text,
      score: row.score,
      status: row.status as SeedStatus,
      discoveryCount: row.discovery_count,
      lastUsedAt: row.last_used_at || undefined,
      lastEffectiveAt: row.last_effective_at || undefined,
      failCount: row.fail_count,
      tags: JSON.parse(row.tags) as string[],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    switch (row.seed_type) {
      case 'entity':
        return {
          ...base,
          seedType: 'entity',
          entityType: row.entity_type as EntitySeed['entityType'],
          aliases: JSON.parse(row.aliases || '[]'),
          category: row.category || undefined,
          market: row.market || undefined,
        } as EntitySeed;

      case 'event':
        return {
          ...base,
          seedType: 'event',
          eventType: row.event_type as EventType,
          keywords: JSON.parse(row.keywords || '[]'),
        } as EventSeed;

      case 'topic':
        return {
          ...base,
          seedType: 'topic',
          topicTag: row.topic_tag || '',
          relatedEntities: JSON.parse(row.related_entities || '[]'),
          trendDirection: row.trend_direction as 'rising' | 'stable' | 'declining' | undefined,
        } as TopicSeed;

      case 'source':
        return {
          ...base,
          seedType: 'source',
          sourceType: (row.entity_type as SourceType) || 'media', // 复用 entity_type 字段
          discoveryUrl: row.discovery_url || undefined,
          discoveryMethod: row.discovery_method || '',
          verified: (row.verified || 0) === 1,
        } as SourceSeed;

      default:
        throw new Error(`Unknown seed type: ${row.seed_type}`);
    }
  }

  protected toRow(model: Partial<Seed>): Partial<SeedRow> {
    const row: Partial<SeedRow> = {
      id: model.id,
      seed_type: model.seedType,
      text: model.text,
      score: model.score,
      status: model.status,
      discovery_count: model.discoveryCount,
      last_used_at: model.lastUsedAt,
      last_effective_at: model.lastEffectiveAt,
      fail_count: model.failCount,
      tags: model.tags ? JSON.stringify(model.tags) : undefined,
      created_at: model.createdAt,
      updated_at: model.updatedAt,
    };

    // 根据种子类型填充特有字段
    if (model.seedType === 'entity') {
      const entity = model as Partial<EntitySeed>;
      row.entity_type = entity.entityType;
      row.aliases = entity.aliases ? JSON.stringify(entity.aliases) : undefined;
      row.category = entity.category;
      row.market = entity.market;
    } else if (model.seedType === 'event') {
      const event = model as Partial<EventSeed>;
      row.event_type = event.eventType;
      row.keywords = event.keywords ? JSON.stringify(event.keywords) : undefined;
    } else if (model.seedType === 'topic') {
      const topic = model as Partial<TopicSeed>;
      row.topic_tag = topic.topicTag;
      row.related_entities = topic.relatedEntities ? JSON.stringify(topic.relatedEntities) : undefined;
      row.trend_direction = topic.trendDirection;
    } else if (model.seedType === 'source') {
      const source = model as Partial<SourceSeed>;
      row.entity_type = source.sourceType; // 复用 entity_type 字段存储 sourceType
      row.discovery_url = source.discoveryUrl;
      row.discovery_method = source.discoveryMethod;
      row.verified = source.verified ? 1 : 0;
    }

    return row;
  }

  // ===== 自定义查询 =====

  /**
   * 按类型查找
   */
  findByType(seedType: SeedType, status?: SeedStatus): Seed[] {
    let sql = `SELECT * FROM ${this.tableName} WHERE seed_type = ?`;
    const params: unknown[] = [seedType];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY score DESC`;

    const rows = this.db.prepare(sql).all(...params) as SeedRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 查找活跃种子（按评分排序）
   */
  findActive(limit: number = 100): Seed[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE status = 'active' ORDER BY score DESC LIMIT ?`
    ).all(limit) as SeedRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 查找需要评估的种子（评分低于阈值或长期未使用）
   */
  findNeedsEvaluation(daysInactive: number = 7): Seed[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    const cutoff = cutoffDate.toISOString();

    const rows = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE status IN ('active', 'degraded')
        AND (score < 30 OR (last_used_at IS NOT NULL AND last_used_at < ?))
      ORDER BY score ASC
    `).all(cutoff) as SeedRow[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 更新种子评分
   */
  updateScore(id: string, score: number): void {
    this.db.prepare(
      `UPDATE ${this.tableName} SET score = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(score, id);
  }

  /**
   * 更新种子使用记录
   */
  markUsed(id: string, effective: boolean): void {
    const now = new Date().toISOString();
    if (effective) {
      this.db.prepare(`
        UPDATE ${this.tableName}
        SET last_used_at = ?, last_effective_at = ?, discovery_count = discovery_count + 1,
            fail_count = 0, updated_at = datetime('now')
        WHERE id = ?
      `).run(now, now, id);
    } else {
      this.db.prepare(`
        UPDATE ${this.tableName}
        SET last_used_at = ?, fail_count = fail_count + 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(now, id);
    }
  }

  /**
   * 按状态统计
   */
  countByStatus(): Record<SeedStatus, number> {
    const rows = this.db.prepare(
      `SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`
    ).all() as { status: string; count: number }[];

    const result: Record<string, number> = { active: 0, dormant: 0, degraded: 0, retired: 0 };
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result as Record<SeedStatus, number>;
  }

  /**
   * 按文本查找（去重用）
   */
  findByText(text: string, seedType: SeedType): Seed | null {
    const row = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE text = ? AND seed_type = ?`
    ).get(text, seedType) as SeedRow | undefined;
    return row ? this.toModel(row) : null;
  }
}
