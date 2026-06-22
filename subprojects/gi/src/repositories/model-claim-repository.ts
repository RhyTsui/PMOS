/**
 * 模型观点 Repository
 *
 * @see docs/design/02-数据模型设计.md §6.4
 */
import { BaseRepository } from './base.js';
import type {
  ModelClaim,
  ClaimType,
  ClaimEntity,
  VerificationStatus,
  Freshness,
} from '../models/types.js';

interface ModelClaimRow {
  id: string;
  answer_id: string;
  claim_type: string;
  summary: string;
  entities: string;
  confidence: number;
  freshness: string;
  verification_required: number;
  verification_status: string;
  verified_at: string | null;
  verified_evidence_ids: string;
  created_at: string;
}

export class ModelClaimRepository extends BaseRepository<ModelClaim, ModelClaimRow> {
  protected tableName = 'model_claims';

  protected toModel(row: ModelClaimRow): ModelClaim {
    return {
      id: row.id,
      answerId: row.answer_id,
      claimType: row.claim_type as ClaimType,
      summary: row.summary,
      entities: JSON.parse(row.entities) as ClaimEntity[],
      confidence: row.confidence,
      freshness: row.freshness as Freshness,
      verificationRequired: row.verification_required === 1,
      verificationStatus: row.verification_status as VerificationStatus,
      verifiedAt: row.verified_at ?? undefined,
      verifiedEvidenceIds: JSON.parse(row.verified_evidence_ids) as string[],
      createdAt: row.created_at,
    };
  }

  protected toRow(model: Partial<ModelClaim>): Partial<ModelClaimRow> {
    return {
      id: model.id,
      answer_id: model.answerId,
      claim_type: model.claimType,
      summary: model.summary,
      entities: model.entities ? JSON.stringify(model.entities) : undefined,
      confidence: model.confidence,
      freshness: model.freshness,
      verification_required: model.verificationRequired === true ? 1 : model.verificationRequired === false ? 0 : undefined,
      verification_status: model.verificationStatus,
      verified_at: model.verifiedAt ?? null,
      verified_evidence_ids: model.verifiedEvidenceIds
        ? JSON.stringify(model.verifiedEvidenceIds)
        : undefined,
      created_at: model.createdAt,
    };
  }

  findByAnswer(answerId: string): ModelClaim[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE answer_id = ? ORDER BY created_at DESC`)
      .all(answerId) as ModelClaimRow[];
    return rows.map((r) => this.toModel(r));
  }

  findByStatus(status: VerificationStatus, limit: number = 100): ModelClaim[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE verification_status = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(status, limit) as ModelClaimRow[];
    return rows.map((r) => this.toModel(r));
  }

  findByType(claimType: ClaimType, limit: number = 100): ModelClaim[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE claim_type = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(claimType, limit) as ModelClaimRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 查找待核验观点
   */
  findPendingVerification(limit: number = 50): ModelClaim[] {
    return this.findByStatus('unverified', limit);
  }

  /**
   * 更新核验状态（关联证据）
   */
  updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    evidenceIds?: string[],
  ): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET verification_status = ?,
             verified_evidence_ids = ?,
             verified_at = datetime('now')
         WHERE id = ?`,
      )
      .run(status, evidenceIds ? JSON.stringify(evidenceIds) : '[]', id);
    return result.changes > 0;
  }

  /**
   * 按核验状态统计
   */
  countByStatus(): Record<VerificationStatus, number> {
    const rows = this.db
      .prepare(
        `SELECT verification_status, COUNT(*) as count
         FROM ${this.tableName}
         GROUP BY verification_status`,
      )
      .all() as Array<{ verification_status: string; count: number }>;
    const result: Record<string, number> = {
      unverified: 0,
      verified: 0,
      conflicted: 0,
      low_confidence: 0,
      rejected: 0,
      expired: 0,
    };
    for (const row of rows) {
      result[row.verification_status] = row.count;
    }
    return result as Record<VerificationStatus, number>;
  }

  /**
   * 按类型统计
   */
  countByType(): Record<ClaimType, number> {
    const rows = this.db
      .prepare(
        `SELECT claim_type, COUNT(*) as count
         FROM ${this.tableName}
         GROUP BY claim_type`,
      )
      .all() as Array<{ claim_type: string; count: number }>;
    const result: Record<string, number> = {
      fact: 0,
      prediction: 0,
      opinion: 0,
      trend: 0,
      benchmark: 0,
      source_recommendation: 0,
    };
    for (const row of rows) {
      result[row.claim_type] = row.count;
    }
    return result as Record<ClaimType, number>;
  }
}
