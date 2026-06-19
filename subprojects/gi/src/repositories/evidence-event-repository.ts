/**
 * 证据事件 Repository
 */
import { BaseRepository } from './base.js';
import type {
  EvidenceEvent, EventType, Priority, Sentiment,
  KeyFact, ActionAdvice, MentionedEntity,
} from '../models/types.js';

interface EvidenceEventRow {
  id: string;
  event_title: string;
  event_type: string;
  key_facts: string;
  action_advice: string;
  sentiment: string;
  evidence_ids: string;
  structured_event_ids: string;
  source_count: number;
  source_ids: string;
  impact_score: number;
  confidence_score: number;
  priority: string;
  audience_tags: string;
  entities: string;
  related_seed_ids: string;
  first_seen_at: string;
  last_seen_at: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  dedup_hash: string;
  merge_count: number;
}

export class EvidenceEventRepository extends BaseRepository<EvidenceEvent, EvidenceEventRow> {
  protected tableName = 'evidence_events';

  protected toModel(row: EvidenceEventRow): EvidenceEvent {
    return {
      id: row.id,
      eventTitle: row.event_title,
      eventType: row.event_type as EventType,
      keyFacts: JSON.parse(row.key_facts) as KeyFact[],
      actionAdvice: JSON.parse(row.action_advice) as ActionAdvice[],
      sentiment: JSON.parse(row.sentiment) as Sentiment,
      evidenceIds: JSON.parse(row.evidence_ids) as string[],
      structuredEventIds: JSON.parse(row.structured_event_ids) as string[],
      sourceCount: row.source_count,
      sourceIds: JSON.parse(row.source_ids) as string[],
      impactScore: row.impact_score,
      confidenceScore: row.confidence_score,
      priority: row.priority as Priority,
      audienceTags: JSON.parse(row.audience_tags) as string[],
      entities: JSON.parse(row.entities) as MentionedEntity[],
      relatedSeedIds: JSON.parse(row.related_seed_ids) as string[],
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      publishedAt: row.published_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      dedupHash: row.dedup_hash,
      mergeCount: row.merge_count,
    };
  }

  protected toRow(model: Partial<EvidenceEvent>): Partial<EvidenceEventRow> {
    return {
      id: model.id,
      event_title: model.eventTitle,
      event_type: model.eventType,
      key_facts: model.keyFacts ? JSON.stringify(model.keyFacts) : undefined,
      action_advice: model.actionAdvice ? JSON.stringify(model.actionAdvice) : undefined,
      sentiment: model.sentiment ? JSON.stringify(model.sentiment) : undefined,
      evidence_ids: model.evidenceIds ? JSON.stringify(model.evidenceIds) : undefined,
      structured_event_ids: model.structuredEventIds ? JSON.stringify(model.structuredEventIds) : undefined,
      source_count: model.sourceCount,
      source_ids: model.sourceIds ? JSON.stringify(model.sourceIds) : undefined,
      impact_score: model.impactScore,
      confidence_score: model.confidenceScore,
      priority: model.priority,
      audience_tags: model.audienceTags ? JSON.stringify(model.audienceTags) : undefined,
      entities: model.entities ? JSON.stringify(model.entities) : undefined,
      related_seed_ids: model.relatedSeedIds ? JSON.stringify(model.relatedSeedIds) : undefined,
      first_seen_at: model.firstSeenAt,
      last_seen_at: model.lastSeenAt,
      published_at: model.publishedAt,
      created_at: model.createdAt,
      updated_at: model.updatedAt,
      dedup_hash: model.dedupHash,
      merge_count: model.mergeCount,
    };
  }

  // 按去重哈希查找（用于合并）
  findByDedupHash(dedupHash: string): EvidenceEvent | null {
    const row = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE dedup_hash = ?`
    ).get(dedupHash) as EvidenceEventRow | undefined;
    return row ? this.toModel(row) : null;
  }

  // 按事件类型查找
  findByEventType(eventType: EventType, limit: number = 100): EvidenceEvent[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE event_type = ? ORDER BY impact_score DESC LIMIT ?`
    ).all(eventType, limit) as EvidenceEventRow[];
    return rows.map(row => this.toModel(row));
  }

  // 获取最近事件
  findRecent(limit: number = 50): EvidenceEvent[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} ORDER BY last_seen_at DESC LIMIT ?`
    ).all(limit) as EvidenceEventRow[];
    return rows.map(row => this.toModel(row));
  }

  // 按优先级和评分排序
  findTopPriority(limit: number = 50): EvidenceEvent[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} ORDER BY priority ASC, impact_score DESC LIMIT ?`
    ).all(limit) as EvidenceEventRow[];
    return rows.map(row => this.toModel(row));
  }
}
