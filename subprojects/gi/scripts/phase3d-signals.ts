import '../src/lib/load-env.js';
import { getDatabase, closeDatabase } from '../src/lib/database.js';
import { SignalRepository } from '../src/repositories/signal-repository.js';
import { v4 as uuidv4 } from 'uuid';

const db = getDatabase();
const signalRepo = new SignalRepository();

console.log('\n=== 为 evidence_events 生成 signals ===');

const evidenceEvents = db.prepare(`
  SELECT ee.*, re.source_id
  FROM evidence_events ee
  JOIN raw_evidence re ON json_extract(ee.evidence_ids, '$[0]') = re.id
`).all() as any[];

console.log(`找到 ${evidenceEvents.length} 个 evidence_events`);

let created = 0;
for (const ee of evidenceEvents) {
  // 检查是否已有 signal
  const existing = db.prepare(`SELECT id FROM signals WHERE evidence_event_id = ?`).get(ee.id);
  if (existing) {
    console.log(`  跳过已存在: ${ee.event_title.slice(0, 50)}`);
    continue;
  }

  const keyFacts = JSON.parse(ee.key_facts || '[]');
  const entities = JSON.parse(ee.entities || '[]');

  const signal = {
    id: uuidv4(),
    evidenceEventId: ee.id,
    sourceId: ee.source_id,
    title: ee.event_title,
    summary: (keyFacts[0]?.fact || ee.event_title).slice(0, 200),
    eventType: ee.event_type,
    priority: ee.priority,
    impactScore: ee.impact_score,
    audienceTags: JSON.parse(ee.audience_tags || '[]'),
    topicTags: [],
    entityTags: entities.map((e: any) => e.name).filter(Boolean),
    status: 'new',
    readByRoles: [],
  };

  try {
    signalRepo.create(signal as any);
    console.log(`  ✅ ${ee.event_title.slice(0, 60)}`);
    console.log(`     类型: ${ee.event_type}, 优先级: ${ee.priority}, 评分: ${ee.impact_score}`);
    created++;
  } catch (err) {
    console.log(`  ❌ 失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(`\n创建了 ${created} 个 signals`);
console.log('\n所有 signals:');
console.log(db.prepare(`SELECT id, title, event_type, priority, impact_score FROM signals`).all());

closeDatabase();
console.log('\n✅ signals 生成完成');
