/**
 * 证据账本 Repository
 *
 * EvidenceLedger 是多态关联的事实依据账本。
 * 一条 Ledger 记录可以关联多种目标（事件/观点/基准/简报/趋势），
 * 也可以关联多种来源（原文/模型/人工反馈）。
 *
 * @see docs/design/02-数据模型设计.md §6.6
 */
import { BaseRepository } from './base.js';
import type {
  EvidenceLedger,
  LedgerTargetType,
  LedgerEvidenceType,
  VerificationStatus,
} from '../models/types.js';

interface EvidenceLedgerRow {
  id: string;
  target_type: string;
  target_id: string;
  evidence_type: string;
  source_id: string | null;
  raw_evidence_id: string | null;
  structured_event_id: string | null;
  model_answer_id: string | null;
  model_claim_id: string | null;
  url: string | null;
  title: string;
  snippet: string | null;
  published_at: string | null;
  collected_at: string;
  verification_status: string;
  confidence: number;
  conflict_notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export class EvidenceLedgerRepository extends BaseRepository<
  EvidenceLedger,
  EvidenceLedgerRow
> {
  protected tableName = 'evidence_ledger';

  protected toModel(row: EvidenceLedgerRow): EvidenceLedger {
    return {
      id: row.id,
      targetType: row.target_type as LedgerTargetType,
      targetId: row.target_id,
      evidenceType: row.evidence_type as LedgerEvidenceType,
      sourceId: row.source_id ?? undefined,
      rawEvidenceId: row.raw_evidence_id ?? undefined,
      structuredEventId: row.structured_event_id ?? undefined,
      modelAnswerId: row.model_answer_id ?? undefined,
      modelClaimId: row.model_claim_id ?? undefined,
      url: row.url ?? undefined,
      title: row.title,
      snippet: row.snippet ?? undefined,
      publishedAt: row.published_at ?? undefined,
      collectedAt: row.collected_at,
      verificationStatus: row.verification_status as VerificationStatus,
      confidence: row.confidence,
      conflictNotes: row.conflict_notes ?? undefined,
      verifiedBy: row.verified_by ? (JSON.parse(row.verified_by) as string[]) : undefined,
      verifiedAt: row.verified_at ?? undefined,
      createdAt: row.created_at,
    };
  }

  protected toRow(model: Partial<EvidenceLedger>): Partial<EvidenceLedgerRow> {
    return {
      id: model.id,
      target_type: model.targetType,
      target_id: model.targetId,
      evidence_type: model.evidenceType,
      source_id: model.sourceId ?? null,
      raw_evidence_id: model.rawEvidenceId ?? null,
      structured_event_id: model.structuredEventId ?? null,
      model_answer_id: model.modelAnswerId ?? null,
      model_claim_id: model.modelClaimId ?? null,
      url: model.url ?? null,
      title: model.title,
      snippet: model.snippet ?? null,
      published_at: model.publishedAt ?? null,
      collected_at: model.collectedAt,
      verification_status: model.verificationStatus,
      confidence: model.confidence,
      conflict_notes: model.conflictNotes ?? null,
      verified_by: model.verifiedBy ? JSON.stringify(model.verifiedBy) : null,
      verified_at: model.verifiedAt ?? null,
      created_at: model.createdAt,
    };
  }

  /**
   * 按目标查询（最常用）
   *
   * 用于 Chat 回答"这条结论的依据是什么"
   */
  findByTarget(targetType: LedgerTargetType, targetId: string): EvidenceLedger[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE target_type = ? AND target_id = ?
         ORDER BY collected_at DESC`,
      )
      .all(targetType, targetId) as EvidenceLedgerRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按核验状态查找
   */
  findByStatus(
    status: VerificationStatus,
    limit: number = 100,
  ): EvidenceLedger[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE verification_status = ?
         ORDER BY collected_at DESC
         LIMIT ?`,
      )
      .all(status, limit) as EvidenceLedgerRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按来源查找
   */
  findBySource(sourceId: string): EvidenceLedger[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE source_id = ?
         ORDER BY collected_at DESC`,
      )
      .all(sourceId) as EvidenceLedgerRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按证据类型查找
   */
  findByEvidenceType(evidenceType: LedgerEvidenceType): EvidenceLedger[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE evidence_type = ?
         ORDER BY collected_at DESC`,
      )
      .all(evidenceType) as EvidenceLedgerRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 获取目标的核验状态汇总
   *
   * 用于在 API 响应中返回 summary（total/verified/conflicted/unverified）
   */
  summarizeByTarget(
    targetType: LedgerTargetType,
    targetId: string,
  ): {
    total: number;
    verified: number;
    conflicted: number;
    unverified: number;
    lowConfidence: number;
    rejected: number;
    expired: number;
  } {
    const rows = this.db
      .prepare(
        `SELECT verification_status, COUNT(*) as count
         FROM ${this.tableName}
         WHERE target_type = ? AND target_id = ?
         GROUP BY verification_status`,
      )
      .all(targetType, targetId) as Array<{ verification_status: string; count: number }>;

    const summary = {
      total: 0,
      verified: 0,
      conflicted: 0,
      unverified: 0,
      lowConfidence: 0,
      rejected: 0,
      expired: 0,
    };
    for (const row of rows) {
      summary.total += row.count;
      switch (row.verification_status) {
        case 'verified': summary.verified = row.count; break;
        case 'conflicted': summary.conflicted = row.count; break;
        case 'unverified': summary.unverified = row.count; break;
        case 'low_confidence': summary.lowConfidence = row.count; break;
        case 'rejected': summary.rejected = row.count; break;
        case 'expired': summary.expired = row.count; break;
      }
    }
    return summary;
  }

  /**
   * 更新核验状态
   */
  updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    options?: {
      conflictNotes?: string;
      verifiedBy?: string[];
    },
  ): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET verification_status = ?,
             conflict_notes = ?,
             verified_by = ?,
             verified_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        status,
        options?.conflictNotes ?? null,
        options?.verifiedBy ? JSON.stringify(options.verifiedBy) : null,
        id,
      );
    return result.changes > 0;
  }

  /**
   * 获取待核验队列
   */
  findPendingVerification(limit: number = 50): EvidenceLedger[] {
    return this.findByStatus('unverified', limit);
  }

  /**
   * 按目标类型统计
   */
  countByTargetType(): Record<LedgerTargetType, number> {
    const rows = this.db
      .prepare(
        `SELECT target_type, COUNT(*) as count
         FROM ${this.tableName}
         GROUP BY target_type`,
      )
      .all() as Array<{ target_type: string; count: number }>;
    const result: Record<string, number> = {
      structured_event: 0,
      model_claim: 0,
      benchmark: 0,
      intelligence_brief: 0,
      trend_cluster: 0,
    };
    for (const row of rows) {
      result[row.target_type] = row.count;
    }
    return result as Record<LedgerTargetType, number>;
  }
}
