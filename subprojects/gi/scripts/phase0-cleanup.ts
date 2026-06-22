/**
 * 阶段 0：数据清理
 *
 * 清理孤儿数据 + 测试数据，建立干净的起点。
 *
 * 清理目标：
 * 1. 18 条孤儿 structured_events（无 raw_evidence 支撑）
 * 2. 测试 requirement_profile（owner='u'）
 * 3. 测试 intelligence_brief（关联上面的画像）
 * 4. 关联的 evidence_ledger 测试数据
 * 5. 重置 evidence_events（引用了被删的 structured_events）
 *
 * 保留：
 * - 3 个有效种子（腾讯 / 游戏版号发放 / AI+游戏）
 */
import '../src/lib/load-env.js';
import { getDatabase, closeDatabase } from '../src/lib/database.js';

const db = getDatabase();

function count(table: string): number {
  const row = db.prepare(`SELECT count(*) as n FROM ${table}`).get() as { n: number };
  return row.n;
}

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

// 清理前统计
section('清理前数据量');
console.log({
  structured_events: count('structured_events'),
  evidence_events: count('evidence_events'),
  raw_evidence: count('raw_evidence'),
  requirement_profiles: count('requirement_profiles'),
  intelligence_briefs: count('intelligence_briefs'),
  evidence_ledger: count('evidence_ledger'),
  signals: count('signals'),
  trend_clusters: count('trend_clusters'),
  seeds: count('seeds'),
});

// 1. 查找孤儿 structured_events
section('1. 检查孤儿 structured_events');
const orphans = db.prepare(`
  SELECT se.id, se.evidence_id
  FROM structured_events se
  LEFT JOIN raw_evidence re ON se.evidence_id = re.id
  WHERE re.id IS NULL
`).all();
console.log(`发现 ${orphans.length} 条孤儿 structured_events`);

if (orphans.length > 0) {
  // 2. 删除孤儿 structured_events
  section('2. 删除孤儿 structured_events');
  const delResult = db.prepare(`
    DELETE FROM structured_events
    WHERE evidence_id NOT IN (SELECT id FROM raw_evidence)
  `).run();
  console.log(`已删除 ${delResult.changes} 条`);

  // 3. 清理引用了这些 structured_events 的 evidence_events
  section('3. 清理失效的 evidence_events');
  const evidenceEvents = db.prepare('SELECT id, structured_event_ids FROM evidence_events').all() as any[];
  let cleanedEvents = 0;
  for (const ev of evidenceEvents) {
    const seIds = JSON.parse(ev.structured_event_ids) as string[];
    // 检查哪些 SE 还存在
    const remainingIds = seIds.filter((id) => {
      const exists = db.prepare('SELECT 1 FROM structured_events WHERE id = ?').get(id);
      return !!exists;
    });
    if (remainingIds.length === 0) {
      // 没有有效 SE 了，删除整个 evidence_event
      db.prepare('DELETE FROM evidence_events WHERE id = ?').run(ev.id);
      cleanedEvents++;
    } else if (remainingIds.length < seIds.length) {
      // 部分失效，更新
      db.prepare('UPDATE evidence_events SET structured_event_ids = ?, updated_at = datetime("now") WHERE id = ?')
        .run(JSON.stringify(remainingIds), ev.id);
    }
  }
  console.log(`清理了 ${cleanedEvents} 条完全失效的 evidence_events`);
}

// 4. 删除测试画像（owner='u' 或 name 包含"测试"）
section('4. 删除测试 requirement_profiles');
const testProfiles = db.prepare(`
  SELECT id, name, owner FROM requirement_profiles
  WHERE owner = 'u' OR name LIKE '%测试%' OR name LIKE '%E2E%'
`).all();
console.log(`发现 ${testProfiles.length} 个测试画像:`, testProfiles.map((p: any) => `${p.name}(${p.owner})`));

for (const p of testProfiles as any[]) {
  // 先删关联的 briefs
  db.prepare('DELETE FROM intelligence_briefs WHERE profile_id = ?').run(p.id);
  // 再删关联的 ledger
  db.prepare("DELETE FROM evidence_ledger WHERE target_type = 'intelligence_brief' AND target_id IN (SELECT id FROM intelligence_briefs WHERE profile_id = ?)").run(p.id);
  // 删画像
  db.prepare('DELETE FROM requirement_profiles WHERE id = ?').run(p.id);
}
console.log(`已删除测试画像`);

// 5. 清理残留的 intelligence_briefs（关联已删画像）
section('5. 清理残留 intelligence_briefs');
const orphanBriefs = db.prepare(`
  SELECT ib.id FROM intelligence_briefs ib
  LEFT JOIN requirement_profiles rp ON ib.profile_id = rp.id
  WHERE rp.id IS NULL
`).all();
if (orphanBriefs.length > 0) {
  db.prepare(`
    DELETE FROM intelligence_briefs
    WHERE profile_id NOT IN (SELECT id FROM requirement_profiles)
  `).run();
  console.log(`清理了 ${orphanBriefs.length} 条孤儿 briefs`);
} else {
  console.log('无孤儿 briefs');
}

// 6. 清理残留的 evidence_ledger（关联已删目标）
section('6. 清理残留 evidence_ledger');
const ledgerCleanup = db.prepare(`
  DELETE FROM evidence_ledger
  WHERE (target_type = 'intelligence_brief' AND target_id NOT IN (SELECT id FROM intelligence_briefs))
     OR (target_type = 'model_claim' AND target_id NOT IN (SELECT id FROM model_claims))
     OR (target_type = 'structured_event' AND target_id NOT IN (SELECT id FROM structured_events))
     OR (target_type = 'benchmark' AND target_id NOT IN (SELECT id FROM benchmark_parameters))
     OR (target_type = 'trend_cluster' AND target_id NOT IN (SELECT id FROM trend_clusters))
`).run();
console.log(`清理了 ${ledgerCleanup.changes} 条孤儿 ledger`);

// 7. 检查种子状态
section('7. 现有种子状态');
const seeds = db.prepare('SELECT seed_type, text, score, status, discovery_count FROM seeds').all();
console.log(`保留 ${seeds.length} 个种子:`, seeds);

// 清理后统计
section('清理后数据量');
console.log({
  structured_events: count('structured_events'),
  evidence_events: count('evidence_events'),
  raw_evidence: count('raw_evidence'),
  requirement_profiles: count('requirement_profiles'),
  intelligence_briefs: count('intelligence_briefs'),
  evidence_ledger: count('evidence_ledger'),
  signals: count('signals'),
  trend_clusters: count('trend_clusters'),
  seeds: count('seeds'),
});

console.log('\n✅ 阶段 0 完成');

closeDatabase();
