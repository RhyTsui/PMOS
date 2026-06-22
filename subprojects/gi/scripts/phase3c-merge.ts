/**
 * 阶段 3c：合并 structured_events → evidence_events → signals
 */
import '../src/lib/load-env.js';
import { initializeDatabase, getDatabase, closeDatabase } from '../src/lib/database.js';
import { EvidenceEventRepository } from '../src/repositories/evidence-event-repository.js';
import { SignalRepository } from '../src/repositories/signal-repository.js';
import { v4 as uuidv4 } from 'uuid';

initializeDatabase();
const db = getDatabase();
const evidenceEventRepo = new EvidenceEventRepository();
const signalRepo = new SignalRepository();

// 1. 获取所有 structured_events
console.log('\n=== 1. 读取 structured_events ===');
const structuredEvents = db.prepare(`
  SELECT se.*, re.title as raw_title, re.source_id as raw_source_id
  FROM structured_events se
  JOIN raw_evidence re ON se.evidence_id = re.id
`).all() as any[];
console.log(`找到 ${structuredEvents.length} 条结构化事件`);

// 2. 过滤掉"无有效情报"
const validEvents = structuredEvents.filter((se: any) => se.event_title !== '无有效情报');
console.log(`有效事件: ${validEvents.length} 条 (过滤掉 ${structuredEvents.length - validEvents.length} 条"无有效情报")`);

// 3. 为每个 structured_event 创建 evidence_event + signal
console.log('\n=== 2. 合并为 evidence_events + 生成 signals ===');
let created = 0;
for (const se of validEvents) {
  try {
    // 检查是否已存在（避免重复）
    const existingEE = db.prepare(`
      SELECT id FROM evidence_events
      WHERE json_array_length(structured_event_ids) > 0
        AND json_extract(structured_event_ids, '$[0]') = ?
    `).get(se.id);
    if (existingEE) {
      console.log(`  跳过已存在: ${se.event_title.slice(0, 50)}`);
      continue;
    }

    // 构造 EvidenceEvent
    const now = new Date().toISOString();
    const eeId = uuidv4();
    const evidenceEvent = {
      id: eeId,
      eventTitle: se.event_title,
      eventType: se.event_type,
      keyFacts: JSON.parse(se.key_facts || '[]'),
      actionAdvice: JSON.parse(se.action_advice || '[]'),
      sentiment: JSON.parse(se.sentiment || '{}'),
      evidenceIds: [se.evidence_id],
      structuredEventIds: [se.id],
      sourceCount: 1,
      sourceIds: [se.source_id],
      impactScore: se.impact_score || 50,
      confidenceScore: se.confidence || 0.7,
      priority: se.priority || 'P2',
      audienceTags: JSON.parse(se.audience_tags || '[]'),
      entities: JSON.parse(se.entities || '[]'),
      relatedSeedIds: [],
      firstSeenAt: now,
      lastSeenAt: now,
      publishedAt: now,
      dedupHash: `dedup-${eeId}`,
      mergeCount: 0,
    };

    evidenceEventRepo.create(evidenceEvent as any);

    // 生成 Signal
    const signalId = uuidv4();
    const signal = {
      id: signalId,
      evidenceEventId: eeId,
      sourceId: se.source_id,
      title: se.event_title,
      summary: (JSON.parse(se.key_facts || '[]')[0]?.fact || se.event_title).slice(0, 200),
      eventType: se.event_type,
      priority: se.priority || 'P2',
      impactScore: se.impact_score || 50,
      audienceTags: JSON.parse(se.audience_tags || '[]'),
      topicTags: [],
      entityTags: JSON.parse(se.entities || '[]').map((e: any) => e.name).filter(Boolean),
      status: 'new',
      readByRoles: [],
    };
    signalRepo.create(signal as any);

    console.log(`  ✅ ${se.event_title.slice(0, 60)}`);
    console.log(`     类型: ${se.event_type}, 优先级: ${se.priority}, 评分: ${se.impact_score}`);
    created++;
  } catch (err) {
    console.log(`  ❌ 失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// 4. 最终统计
console.log('\n=== 3. 最终统计 ===');
console.log(`创建 evidence_events: ${created}`);
console.log(`创建 signals: ${created}`);

console.log('\n表数据统计:');
console.log('  raw_evidence:', (db.prepare('SELECT count(*) as n FROM raw_evidence').get() as any).n);
console.log('  structured_events:', (db.prepare('SELECT count(*) as n FROM structured_events').get() as any).n);
console.log('  evidence_events:', (db.prepare('SELECT count(*) as n FROM evidence_events').get() as any).n);
console.log('  signals:', (db.prepare('SELECT count(*) as n FROM signals').get() as any).n);

console.log('\n信号详情:');
console.log(db.prepare(`SELECT id, title, event_type, priority, impact_score FROM signals`).all());

closeDatabase();
console.log('\n✅ 阶段 3 全链路完成');
