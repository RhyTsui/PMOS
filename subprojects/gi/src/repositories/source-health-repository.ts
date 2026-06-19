/**
 * 源健康监控 Repository
 */
import { BaseRepository } from './base.js';
import type { SourceHealth, HealthStatus } from '../models/types.js';

interface SourceHealthRow {
  id: string;
  source_id: string;
  last_collected_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
  total_collections: number;
  success_count: number;
  fail_count: number;
  evidence_produced: number;
  avg_response_time: number;
  health_status: string;
  health_score: number;
  consecutive_failures: number;
  updated_at: string;
}

export class SourceHealthRepository extends BaseRepository<SourceHealth, SourceHealthRow> {
  protected tableName = 'source_health';

  protected toModel(row: SourceHealthRow): SourceHealth {
    return {
      id: row.id,
      sourceId: row.source_id,
      lastCollectedAt: row.last_collected_at || undefined,
      lastSuccessAt: row.last_success_at || undefined,
      lastErrorAt: row.last_error_at || undefined,
      lastError: row.last_error || undefined,
      totalCollections: row.total_collections,
      successCount: row.success_count,
      failCount: row.fail_count,
      evidenceProduced: row.evidence_produced,
      avgResponseTime: row.avg_response_time,
      healthStatus: row.health_status as HealthStatus,
      healthScore: row.health_score,
      consecutiveFailures: row.consecutive_failures,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(model: Partial<SourceHealth>): Partial<SourceHealthRow> {
    return {
      id: model.id,
      source_id: model.sourceId,
      last_collected_at: model.lastCollectedAt,
      last_success_at: model.lastSuccessAt,
      last_error_at: model.lastErrorAt,
      last_error: model.lastError,
      total_collections: model.totalCollections,
      success_count: model.successCount,
      fail_count: model.failCount,
      evidence_produced: model.evidenceProduced,
      avg_response_time: model.avgResponseTime,
      health_status: model.healthStatus,
      health_score: model.healthScore,
      consecutive_failures: model.consecutiveFailures,
      updated_at: model.updatedAt,
    };
  }

  // 按源 ID 查找
  findBySourceId(sourceId: string): SourceHealth | null {
    const row = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE source_id = ?`
    ).get(sourceId) as SourceHealthRow | undefined;
    return row ? this.toModel(row) : null;
  }

  // 获取所有健康状态
  findAll(): SourceHealth[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} ORDER BY health_score ASC`
    ).all() as SourceHealthRow[];
    return rows.map(row => this.toModel(row));
  }

  // 获取不健康的源
  findUnhealthy(): SourceHealth[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE health_status IN ('degraded', 'down') ORDER BY health_score ASC`
    ).all() as SourceHealthRow[];
    return rows.map(row => this.toModel(row));
  }

  // 按状态统计
  countByStatus(): Record<HealthStatus, number> {
    const rows = this.db.prepare(
      `SELECT health_status, COUNT(*) as count FROM ${this.tableName} GROUP BY health_status`
    ).all() as { health_status: string; count: number }[];

    const result: Record<string, number> = { healthy: 0, degraded: 0, down: 0, unknown: 0 };
    for (const row of rows) {
      result[row.health_status] = row.count;
    }
    return result as Record<HealthStatus, number>;
  }
}
