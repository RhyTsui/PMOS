/**
 * 行业基准参数 Repository
 *
 * @see docs/design/02-数据模型设计.md §6.7
 */
import { BaseRepository } from './base.js';
import type {
  BenchmarkParameter,
  BenchmarkSourceType,
  ValueRange,
} from '../models/types.js';

interface BenchmarkParameterRow {
  id: string;
  industry: string;
  segment: string;
  metric_name: string;
  metric_value: number | null;
  value_range: string | null;
  time_window: string;
  source_type: string;
  evidence_ids: string;
  confidence: number;
  applicable_conditions: string;
  expired_at: string | null;
  created_at: string;
}

export class BenchmarkParameterRepository extends BaseRepository<
  BenchmarkParameter,
  BenchmarkParameterRow
> {
  protected tableName = 'benchmark_parameters';

  protected toModel(row: BenchmarkParameterRow): BenchmarkParameter {
    return {
      id: row.id,
      industry: row.industry,
      segment: row.segment,
      metricName: row.metric_name,
      metricValue: row.metric_value ?? undefined,
      valueRange: row.value_range ? (JSON.parse(row.value_range) as ValueRange) : undefined,
      timeWindow: row.time_window,
      sourceType: row.source_type as BenchmarkSourceType,
      evidenceIds: JSON.parse(row.evidence_ids) as string[],
      confidence: row.confidence,
      applicableConditions: JSON.parse(row.applicable_conditions) as string[],
      expiredAt: row.expired_at ?? undefined,
      createdAt: row.created_at,
    };
  }

  protected toRow(model: Partial<BenchmarkParameter>): Partial<BenchmarkParameterRow> {
    return {
      id: model.id,
      industry: model.industry,
      segment: model.segment,
      metric_name: model.metricName,
      metric_value: model.metricValue ?? null,
      value_range: model.valueRange ? JSON.stringify(model.valueRange) : null,
      time_window: model.timeWindow,
      source_type: model.sourceType,
      evidence_ids: model.evidenceIds ? JSON.stringify(model.evidenceIds) : undefined,
      confidence: model.confidence,
      applicable_conditions: model.applicableConditions
        ? JSON.stringify(model.applicableConditions)
        : undefined,
      expired_at: model.expiredAt ?? null,
      created_at: model.createdAt,
    };
  }

  /**
   * 按细分领域查找
   */
  findBySegment(segment: string): BenchmarkParameter[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE segment = ?
         ORDER BY created_at DESC`,
      )
      .all(segment) as BenchmarkParameterRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按指标名查找
   */
  findByMetric(metricName: string): BenchmarkParameter[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE metric_name = ?
         ORDER BY created_at DESC`,
      )
      .all(metricName) as BenchmarkParameterRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按细分领域 + 指标查找（最常用）
   */
  findBySegmentAndMetric(segment: string, metricName: string): BenchmarkParameter[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE segment = ? AND metric_name = ?
         ORDER BY created_at DESC`,
      )
      .all(segment, metricName) as BenchmarkParameterRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 查找未过期的基准参数
   */
  findActive(): BenchmarkParameter[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE expired_at IS NULL OR expired_at > datetime('now')
         ORDER BY created_at DESC`,
      )
      .all() as BenchmarkParameterRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按细分领域查找未过期的基准参数
   */
  findActiveBySegment(segment: string): BenchmarkParameter[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE segment = ?
           AND (expired_at IS NULL OR expired_at > datetime('now'))
         ORDER BY created_at DESC`,
      )
      .all(segment) as BenchmarkParameterRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 列出所有细分领域（用于前端筛选下拉框）
   */
  listSegments(): string[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT segment FROM ${this.tableName} ORDER BY segment`,
      )
      .all() as Array<{ segment: string }>;
    return rows.map((r) => r.segment);
  }

  /**
   * 列出所有指标名（用于前端筛选下拉框）
   */
  listMetrics(segment?: string): string[] {
    const sql = segment
      ? `SELECT DISTINCT metric_name FROM ${this.tableName}
         WHERE segment = ?
         ORDER BY metric_name`
      : `SELECT DISTINCT metric_name FROM ${this.tableName}
         ORDER BY metric_name`;
    const rows = (segment
      ? this.db.prepare(sql).all(segment)
      : this.db.prepare(sql).all()) as Array<{ metric_name: string }>;
    return rows.map((r) => r.metric_name);
  }

  /**
   * 标记为过期
   */
  expire(id: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET expired_at = datetime('now')
         WHERE id = ?`,
      )
      .run(id);
    return result.changes > 0;
  }
}
