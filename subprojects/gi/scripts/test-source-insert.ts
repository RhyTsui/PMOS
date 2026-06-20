import Database from 'better-sqlite3';
const db = new Database('data/gi.db');

// 尝试手动插入一条 source 种子
try {
  const r = db.prepare(`
    INSERT INTO seeds (id, seed_type, text, score, status, entity_type, aliases, category, market, tags, discovery_count, fail_count, created_at, updated_at)
    VALUES (?, 'source', 'TestMedia', 75, 'active', NULL, '[]', '测试', '国内', '[]', 0, 0, datetime('now'), datetime('now'))
  `).run(require('crypto').randomUUID());
  console.log('手动插入 (entity_type=NULL):', r.changes, '条');
} catch(e) {
  console.log('手动插入失败:', e.message);
}

// 测试 entity_type='media'
try {
  const r = db.prepare(`
    INSERT INTO seeds (id, seed_type, text, score, status, entity_type, aliases, category, market, tags, discovery_count, fail_count, created_at, updated_at)
    VALUES (?, 'source', 'TestMedia2', 75, 'active', 'media', '[]', '测试', '国内', '[]', 0, 0, datetime('now'), datetime('now'))
  `).run(require('crypto').randomUUID());
  console.log('手动插入 (entity_type=media):', r.changes, '条');
} catch(e) {
  console.log('entity_type=media 失败:', e.message);
}

// 清理测试数据
db.prepare("DELETE FROM seeds WHERE text LIKE 'TestMedia%'").run();

// 现在用 entity_type=NULL 重新插入所有 source 种子
const { v4: uuidv4 } = await import('uuid');
const existing = db.prepare('SELECT text FROM seeds').all().map((r) => r.text);

// 读取 Part 8 脚本的内容来提取种子数据
// 这里简单重试
const insertSQL = `
  INSERT OR IGNORE INTO seeds (id, seed_type, text, score, status, aliases, category, market, tags, discovery_count, fail_count, created_at, updated_at)
  VALUES (@id, @seed_type, @text, @score, 'active', @aliases, @category, @market, @tags, 0, 0, datetime('now'), datetime('now'))
`;

// 测试一个简单的插入
const testSeed = {
  id: uuidv4(),
  seed_type: 'source',
  text: 'GameLook',
  score: 80,
  aliases: JSON.stringify(['GameLook', 'gamelook.com']),
  category: '行业媒体',
  market: '国内',
  tags: JSON.stringify(['P0信源', '行业媒体']),
};

try {
  const r = db.prepare(insertSQL).run(testSeed);
  console.log('\nGameLook 插入:', r.changes, '条');
  if (r.changes === 0) console.log('  (可能已存在)');
} catch(e) {
  console.log('GameLook 插入失败:', e.message);
}

// 统计
console.log('\n=== 当前状态 ===');
console.log('总数:', db.prepare('SELECT count(*) as c FROM seeds').get().c);
console.log('source类型:', db.prepare("SELECT count(*) as c FROM seeds WHERE seed_type='source'").get().c);
console.log('entity类型:', db.prepare("SELECT count(*) as c FROM seeds WHERE seed_type='entity'").get().c);

db.close();
