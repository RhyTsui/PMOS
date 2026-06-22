/**
 * 禁用失败的源 + 运行 LLM 抽取
 */
import '../src/lib/load-env.js';
import { initializeDatabase, getDatabase, closeDatabase } from '../src/lib/database.js';
import { ExtractionService } from '../src/services/extraction/index.js';
import { RawEvidenceRepository } from '../src/repositories/raw-evidence-repository.js';

initializeDatabase();
const db = getDatabase();
const evidenceRepo = new RawEvidenceRepository();

// 1. 禁用失败源（根据 phase3 日志）
console.log('\n=== 1. 禁用失败的源 ===');
const failedSources = [
  '游戏葡萄', '竞核', '手游那点事', '游戏干线', '36氪-游戏',
  '游戏产业网', '中国音数协-版号', 'TapTap-热门', 'Epic-免费游戏', 'IGN', 'Kotaku',
];

for (const name of failedSources) {
  const r = db.prepare(`UPDATE intel_sources SET enabled = 0 WHERE name = ?`).run(name);
  console.log(`  ${name}: ${r.changes > 0 ? '已禁用' : '不存在'}`);
}

console.log('\n=== 当前启用的源 ===');
const enabled = db.prepare(`SELECT name FROM intel_sources WHERE enabled = 1`).all();
console.log(`${enabled.length} 个:`, enabled.map((s: any) => s.name));

// 2. 查看 raw_evidence
console.log('\n=== 2. 待抽取的 raw_evidence ===');
const rawEvidence = db.prepare(`
  SELECT id, source_id, title, status
  FROM raw_evidence
  WHERE status IN ('collected', 'extracting')
`).all() as any[];
console.log(`待抽取: ${rawEvidence.length} 条`);
for (const e of rawEvidence) {
  console.log(`  - [${e.status}] ${e.title.slice(0, 60)}`);
}

// 3. 运行 LLM 抽取
console.log('\n=== 3. 运行 LLM 抽取 ===');
const extractionService = new ExtractionService();
let extracted = 0;
let failed = 0;

for (const evidenceRow of rawEvidence) {
  try {
    const evidence = evidenceRepo.findById(evidenceRow.id);
    if (!evidence) {
      console.log(`  ❌ 找不到证据: ${evidenceRow.id}`);
      failed++;
      continue;
    }
    console.log(`\n抽取: ${evidence.title.slice(0, 50)}...`);
    db.prepare(`UPDATE raw_evidence SET status = 'extracting' WHERE id = ?`).run(evidence.id);

    const result = await extractionService.extractFromEvidence(evidence);
    if (result) {
      db.prepare(`UPDATE raw_evidence SET status = 'extracted' WHERE id = ?`).run(evidence.id);
      console.log(`  ✅ 抽取成功: ${result.eventTitle}`);
      extracted++;
    } else {
      db.prepare(`UPDATE raw_evidence SET status = 'failed' WHERE id = ?`).run(evidence.id);
      console.log('  ⚠️ 无结果');
      failed++;
    }
  } catch (err) {
    console.log(`  ❌ 失败: ${err instanceof Error ? err.message : String(err)}`);
    db.prepare(`UPDATE raw_evidence SET status = 'failed' WHERE id = ?`).run(evidenceRow.id);
    failed++;
  }
}

// 4. 查看抽取结果
console.log('\n=== 4. 抽取结果 ===');
console.log('成功:', extracted);
console.log('失败:', failed);

console.log('\n表数据统计:');
console.log('  raw_evidence:', (db.prepare('SELECT count(*) as n FROM raw_evidence').get() as any).n);
console.log('  raw_evidence (extracted):',
  (db.prepare(`SELECT count(*) as n FROM raw_evidence WHERE status='extracted'`).get() as any).n);
console.log('  structured_events:', (db.prepare('SELECT count(*) as n FROM structured_events').get() as any).n);
console.log('  evidence_events:', (db.prepare('SELECT count(*) as n FROM evidence_events').get() as any).n);
console.log('  signals:', (db.prepare('SELECT count(*) as n FROM signals').get() as any).n);

closeDatabase();
console.log('\n✅ 阶段 3 补充完成');
