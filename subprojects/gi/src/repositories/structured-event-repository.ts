/**
 * 结构化事件 Repository
 */
import { BaseRepository } from './base.js';
import type {
  StructuredEvent, EventType, Priority, Sentiment,
  KeyFact, ActionAdvice, MentionedEntity,
} from '../models/types.js';

interface StructuredEventRow {
  id: string;
  evidence_id: string;
  source_id: string;
  event_title: string;
  key_facts: string;
  action_advice: string;
  event_type: string;
  sentiment: string;
  impact_score: number;
  priority: string;
  audience_tags: string;
  entities: string;
  extracted_at: string;
  model: string;
  confidence: number;
}

export class StructuredEventRepository extends BaseRepository<StructuredEvent, StructuredEventRow> {
  protected tableName = 'structured_events';

  protected toModel(row: StructuredEventRow): StructuredEvent {
    return {
      id: row.id,
      evidenceId: row.evidence_id,
      sourceId: row.source_id,
      eventTitle: row.event_title,
      keyFacts: JSON.parse(row.key_facts) as KeyFact[],
      actionAdvice: JSON.parse(row.action_advice) as ActionAdvice[],
      eventType: row.event_type as EventType,
      sentiment: JSON.parse(row.sentiment) as Sentiment,
      impactScore: row.impact_score,
      priority: row.priority as Priority,
      audienceTags: JSON.parse(row.audience_tags) as string[],
      entities: JSON.parse(row.entities) as MentionedEntity[],
      extractedAt: row.extracted_at,
      model: row.model,
      confidence: row.confidence,
    };
  }

  protected toRow(model: Partial<StructuredEvent>): Partial<StructuredEventRow> {
    return {
      id: model.id,
      evidence_id: model.evidenceId,
      source_id: model.sourceId,
      event_title: model.eventTitle,
      key_facts: model.keyFacts ? JSON.stringify(model.keyFacts) : undefined,
      action_advice: model.actionAdvice ? JSON.stringify(model.actionAdvice) : undefined,
      event_type: model.eventType,
      sentiment: model.sentiment ? JSON.stringify(model.sentiment) : undefined,
      impact_score: model.impactScore,
      priority: model.priority,
      audience_tags: model.audienceTags ? JSON.stringify(model.audienceTags) : undefined,
      entities: model.entities ? JSON.stringify(model.entities) : undefined,
      extracted_at: model.extractedAt,
      model: model.model,
      confidence: model.confidence,
    };
  }

  // 按证据 ID 查找
  findByEvidenceId(evidenceId: string): StructuredEvent | null {
    const row = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE evidence_id = ?`
    ).get(evidenceId) as StructuredEventRow | undefined;
    return row ? this.toModel(row) : null;
  }

  // 按事件类型查找
  findByEventType(eventType: EventType, limit: number = 100): StructuredEvent[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE event_type = ? ORDER BY impact_score DESC LIMIT ?`
    ).all(eventType, limit) as StructuredEventRow[];
    return rows.map(row => this.toModel(row));
  }

  // 按评分排序
  findTopScored(limit: number = 50): StructuredEvent[] {
    const rows = this.db.prepare(
      `SELECT * FROM ${this.tableName} ORDER BY impact_score DESC LIMIT ?`
    ).all(limit) as StructuredEventRow[];
    return rows.map(row => this.toModel(row));
  }
}
