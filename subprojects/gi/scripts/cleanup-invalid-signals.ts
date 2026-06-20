/**
 * 清理"无有效情报"相关的错误数据
 *
 * 原因：Pipeline 之前的 bug 导致：
 * 1. "无有效情报"文章也生成了信号
 * 2. SimHash 将不同的"无有效情报"错误合并
 * 3. 同一 evidence_event 重复生成信号
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/gi.db');

const db = new Database(DB_PATH);

console.log('=== 清理前 ===');
['raw_evidence', 'structured_events', 'evidence_events', 'signals'].forEach(t => {
  console.log(`  ${t}:`, db.prepare(`SELECT count(*) as c FROM ${t}`).get().c);
});

// 1. 删除错误的 signals（标题为"无有效情报"）
const sigDel = db.prepare("DELETE FROM signals WHERE title = '无有效情报'");
console.log('\n删除 signals:', sigDel.run().changes, '条');

// 2. 删除错误的 evidence_events
const evDel = db.prepare("DELETE FROM evidence_events WHERE event_title = '无有效情报'");
console.log('删除 evidence_events:', evDel.run().changes, '条');

// 3. 删除"无有效情报"的 structured_events
const seDel = db.prepare("DELETE FROM structured_events WHERE event_title = '无有效情报'");
console.log('删除 structured_events:', seDel.run().changes, '条');

// 4. 将对应的 raw_evidence 标记为 processed_no_value
const reUpd = db.prepare(
  "UPDATE raw_evidence SET status = 'processed_no_value' WHERE title LIKE '%少数派%新玩意%' OR (title LIKE '%天选%' AND title LIKE '%华硕%')"
);
console.log('标记 raw_evidence:', reUpd.run().changes, '条');

console.log('\n=== 清理后 ===');
['raw_evidence', 'structured_events', 'evidence_events', 'signals'].forEach(t => {
  console.log(`  ${t}:`, db.prepare(`SELECT count(*) as c FROM ${t}`).get().c);
});

const st = db.prepare('SELECT status, count(*) as c FROM raw_evidence GROUP BY status').all();
console.log('\n=== raw_evidence 状态分布 ===');
st.forEach(r => console.log(`  ${r.status}: ${r.c}`));

db.close();
console.log('\n清理完成！');
