/**
 * 趋势簇 Repository
 */
import { BaseRepository } from './base.js';
import type { TrendCluster, EventType } from '../models/types.js';

interface TrendClusterRow {
  id: string;
  event_type: string;
  topic_tag: string;
  signal_count: number;
  source_count: number;
  entity_count: number;
  growth_rate: number;
  trend_direction: string;
  signal_ids: string;
  window_start: string;
  window_end: string;
  created_at: string;
  updated_at: string;
}

export class TrendClusterRepository extends BaseRepository<TrendCluster, TrendClusterRow> {
  protected tableName = 'trend_clusters';

  protected toModel(row: TrendClusterRow): TrendCluster {
    return {
      id: row.id,
      eventType: row.event_type as EventType,
      topicTag: row.topic_tag,
      signalCount: row.signal_count,
      sourceCount: row.source_count,
      entityCount: row.entity_count,
      growthRate: row.growth_rate,
      trendDirection: row.trend_direction as 'rising' | 'stable' | 'declining' | 'emerging',
      signalIds: JSON.parse(row.signal_ids) as string[],
      windowStart: row.window_start,
      windowEnd: row.window_end,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(model: Partial<TrendCluster>): Partial<TrendClusterRow> {
    return {
      id: model.id,
      event_type: model.eventType,
      topic_tag: model.topicTag,
      signal_count: model.signalCount,
      source_count: model.sourceCount,
      entity_count: model.entityCount,
      growth_rate: model.growthRate,
      trend_direction: model.trendDirection,
      signal_ids: model.signalIds ? JSON.stringify(model.signalIds) : undefined,
      window_start: model.windowStart,
      window_end: model.windowEnd,
      created_at: model.createdAt,
      updated_at: model.updatedAt,
    };
  }

  // 查找上升趋势
  findRising(limit: number = 50): TrendCluster[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE trend_direction IN ('rising', 'emerging') ORDER BY growth_rate DESC LIMIT ?`
    ).all(limit) as TrendClusterRow[];
    return rows.map(row => this.toModel(row));
  }

  // 按时间窗口查找
  findByWindow(start: string, end: string): TrendCluster[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE window_start >= ? AND window_end <= ? ORDER BY growth_rate DESC`
    ).all(start, end) as TrendClusterRow[];
    return rows.map(row => this.toModel(row));
  }

  // 按事件类型查找
  findByEventType(eventType: EventType): TrendCluster[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE event_type = ? ORDER BY window_end DESC`
    ).all(eventType) as TrendClusterRow[];
    return rows.map(row => this.toModel(row));
  }
}
