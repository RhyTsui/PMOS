/**
 * Part 7: 最终冲刺到 1000+
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../data/gi.db'));

interface S { seedType: string; text: string; score: number; tags: string[]; entityType?: string; aliases?: string[]; category?: string; market?: string; eventType?: string; keywords?: string[]; topicTag?: string; relatedEntities?: string[]; }

const seeds: S[] = [
  // 更多公司
  { seedType: 'entity', text: '紫龙游戏', score: 55, entityType: 'company', aliases: ['紫龙','Black Dragon'], category: '出海', market: '全球', tags: ['P2公司','SRPG'] },
  { seedType: 'entity', text: '游戏科学的日常', score: 40, entityType: 'company', aliases: [], category: '其他', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '数字天空', score: 45, entityType: 'company', aliases: ['数字天空','Digital Sky'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '游奕互动', score: 45, entityType: 'company', aliases: ['游奕互动'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '乐港科技', score: 45, entityType: 'company', aliases: ['乐港科技'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '网元圣唐', score: 45, entityType: 'company', aliases: ['网元圣唐'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '九凤', score: 45, entityType: 'company', aliases: ['九凤'], category: '独立', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '铃空游戏', score: 45, entityType: 'company', aliases: ['铃空游戏'], category: '独立', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '椰岛游戏', score: 50, entityType: 'company', aliases: ['椰岛','Coconut Island'], category: '独立', market: '国内', tags: ['P2公司','独立'] },
  { seedType: 'entity', text: '帕斯亚科技', score: 50, entity_type: 'company', aliases: ['帕斯亚','Pathea Games'], category: '独立', market: '国内', tags: ['P2公司','沙石镇'] },
  { seedType: 'entity', text: 'Ultimate Games', score: 45, entityType: 'company', aliases: ['Ultimate Games'], category: '国际大厂', market: '波兰', tags: ['P3公司'] },
  { seedType: 'entity', text: 'Techland', score: 50, entityType: 'company', aliases: ['Techland'], category: '国际大厂', market: '波兰', tags: ['P2公司','消逝的光芒'] },
  { seedType: 'entity', text: 'People Can Fly', score: 45, entityType: 'company', aliases: ['People Can Fly'], category: '国际大厂', market: '波兰', tags: ['P3公司'] },
  { seedType: 'entity', text: '11 bit studios', score: 55, entityType: 'company', aliases: ['11 bit','11比特'], category: '独立', market: '波兰', tags: ['P2公司','冰汽时代','这是我的战争'] },
  { seedType: 'entity', text: 'IO Interactive', score: 50, entityType: 'company', aliases: ['IOI','IO Interactive'], category: '国际大厂', market: '丹麦', tags: ['P2公司','杀手'] },
  { seedType: 'entity', text: 'Guerrilla Games', score: 50, entityType: 'company', aliases: ['Guerrilla'], category: '国际大厂', market: '荷兰', tags: ['P2公司','地平线','索尼'] },
  { seedType: 'entity', text: 'Media Molecule', score: 45, entityType: 'company', aliases: ['Mol'], category: '国际大厂', market: '英国', tags: ['P3公司',' Dreams','索尼'] },
  { seedType: 'entity', text: 'Sucker Punch', score: 50, entityType: 'company', aliases: ['Sucker Punch'], category: '国际大厂', market: '美国', tags: ['P2公司','对马岛','索尼'] },
  { seedType: 'entity', text: 'Insomniac Games', score: 55, entityType: 'company', aliases: ['Insomniac'], category: '国际大厂', market: '美国', tags: ['P2公司','蜘蛛侠','索尼'] },
  { seedType: 'entity', text: 'Naughty Dog', score: 60, entityType: 'company', aliases: ['顽皮狗'], category: '国际大厂', market: '美国', tags: ['P1公司','最后生还者','索尼'] },
  { seedType: 'entity', text: 'Santa Monica Studio', score: 55, entityType: 'company', aliases: ['SMS'], category: '国际大厂', market: '美国', tags: ['P2公司','战神','索尼'] },
  { seedType: 'entity', text: 'Bungie', score: 55, entityType: 'company', aliases: ['Bungie'], category: '国际大厂', market: '美国', tags: ['P2公司','命运','HALO'] },
  { seedType: 'entity', text: 'id Software', score: 55, entityType: 'company', aliases: ['id'], category: '国际大厂', market: '美国', tags: ['P2公司','DOOM','Quake'] },
  { seedType: 'entity', text: 'Treyarch', score: 50, entityType: 'company', aliases: ['Treyarch'], category: '国际大厂', market: '美国', tags: ['P2公司','COD','动视'] },
  { seedType: 'entity', text: 'Infinity Ward', score: 50, entityType: 'company', aliases: ['IW'], category: '国际大厂', market: '美国', tags: ['P2公司','COD','动视'] },
  { seedType: 'entity', text: 'Sledgehammer Games', score: 45, entityType: 'company', aliases: ['SHG'], category: '国际大厂', market: '美国', tags: ['P3公司','COD','动视'] },
  { seedType: 'entity', text: 'Raven Software', score: 45, entityType: 'company', aliases: ['Raven'], category: '国际大厂', market: '美国', tags: ['P3公司','COD','动视'] },
  { seedType: 'entity', text: 'DICE', score: 55, entityType: 'company', aliases: ['DICE'], category: '国际大厂', market: '瑞典', tags: ['P2公司','战地','EA'] },
  { seedType: 'entity', text: 'Motive Studio', score: 45, entityType: 'company', aliases: ['Motive'], category: '国际大厂', market: '加拿大', tags: ['P3公司','EA','死亡空间'] },
  { seedType: 'entity', text: 'Criterion Games', score: 45, entityType: 'company', aliases: ['Criterion'], category: '国际大厂', market: '英国', tags: ['P3公司','极品飞车','EA'] },

  // 更多人物
  { seedType: 'entity', text: '冯骏', score: 45, entityType: 'person', aliases: ['冯骏'], category: '制作人', market: '国内', tags: ['游戏科学','黑神话'] },
  { seedType: 'entity', text: '江柳明', score: 45, entityType: 'person', aliases: ['江柳明'], category: '制作人', market: '国内', tags: ['椰岛游戏'] },
  { seedType: 'entity', text: '李舟', score: 45, entityType: 'person', aliases: ['李舟'], category: '制作人', market: '国内', tags: ['帕斯亚科技'] },
  { seedType: 'entity', text: 'Hajime Tabata', score: 50, entityType: 'person', aliases: ['田畑端'], category: '制作人', market: '日本', tags: ['最终幻想15'] },
  { seedType: 'entity', text: 'Naoki Yoshida', score: 55, entityType: 'person', aliases: ['吉田直树'], category: '制作人', market: '日本', tags: ['FF14','制作人'] },
  { seedType: 'entity', text: 'Tetsuya Nomura', score: 50, entityType: 'person', aliases: ['野村哲也'], category: '制作人', market: '日本', tags: ['王国之心'] },
  { seedType: 'entity', text: 'Katsura Hashino', score: 50, entityType: 'person', aliases: ['桥野桂'], category: '制作人', market: '日本', tags: ['女神异闻录'] },
  { seedType: 'entity', text: 'Yoko Taro', score: 55, entityType: 'person', aliases: ['横尾太郎'], category: '制作人', market: '日本', tags: ['尼尔'] },
  { seedType: 'entity', text: 'Masahiro Sakurai', score: 50, entityType: 'person', aliases: ['樱井政博'], category: '制作人', market: '日本', tags: ['大乱斗'] },
  { seedType: 'entity', text: 'Goichi Suda', score: 50, entityType: 'person', aliases: ['须田刚一','Suda51'], category: '制作人', market: '日本', tags: ['Grasshopper'] },
  { seedType: 'entity', text: 'Atsushi Inaba', score: 50, entityType: 'person', aliases: ['稻叶敦志'], category: '制作人', market: '日本', tags: ['白金工作室'] },
  { seedType: 'entity', text: 'Marty Stratton', score: 45, entityType: 'person', aliases: ['Marty Stratton'], category: '制作人', market: '美国', tags: ['id Software','DOOM'] },
  { seedType: 'entity', text: 'Vince Zampella', score: 50, entityType: 'person', aliases: ['Vince Zampella'], category: '制作人', market: '美国', tags: ['Respawn','Apex'] },

  // 更多话题
  { seedType: 'topic', text: '游戏公司ESG', score: 45, topicTag: 'ESG', relatedEntities: [], tags: ['P3话题','ESG'] },
  { seedType: 'topic', text: '游戏无障碍', score: 50, topicTag: '无障碍', relatedEntities: [], tags: ['P2话题','无障碍'] },
  { seedType: 'topic', text: '游戏叙事', score: 55, topicTag: '游戏叙事', relatedEntities: [], tags: ['P2话题','叙事'] },
  { seedType: 'topic', text: '游戏关卡设计', score: 55, topicTag: '关卡设计', relatedEntities: [], tags: ['P2话题','设计'] },
  { seedType: 'topic', text: '游戏战斗设计', score: 55, topicTag: '战斗设计', relatedEntities: [], tags: ['P2话题','设计'] },
  { seedType: 'topic', text: '游戏数值策划', score: 50, topicTag: '数值策划', relatedEntities: [], tags: ['P2话题','策划'] },
  { seedType: 'topic', text: '游戏系统策划', score: 50, topicTag: '系统策划', relatedEntities: [], tags: ['P2话题','策划'] },
  { seedType: 'topic', text: '游戏运营活动', score: 50, topicTag: '运营活动', relatedEntities: [], tags: ['P2话题','运营'] },
  { seedType: 'topic', text: '游戏商业化', score: 55, topicTag: '商业化', relatedEntities: [], tags: ['P2话题','商业化'] },
  { seedType: 'topic', text: '游戏社区文化', score: 50, topicTag: '社区文化', relatedEntities: [], tags: ['P2话题','社区'] },
  { seedType: 'topic', text: '二次元文化', score: 55, topicTag: 'ACG文化', relatedEntities: ['原神','明日方舟'], tags: ['P2话题','ACG'] },
  { seedType: 'topic', text: '国产游戏崛起', score: 60, topicTag: '国产崛起', relatedEntities: ['黑神话悟空','原神','鸣潮'], tags: ['P1话题','国产'] },
  { seedType: 'topic', text: '游戏产业年度报告', score: 55, topicTag: '产业报告', relatedEntities: ['伽马数据','CNG'], tags: ['P2话题','数据'] },
  { seedType: 'topic', text: 'Sensor Tower数据', score: 50, topicTag: 'SensorTower', relatedEntities: ['Sensor Tower'], tags: ['P2话题','数据'] },
  { seedType: 'topic', text: 'data.ai数据', score: 50, topicTag: 'data.ai', relatedEntities: ['data.ai','App Annie'], tags: ['P2话题','数据'] },
  { seedType: 'topic', text: '七麦数据', score: 45, topicTag: '七麦', relatedEntities: ['七麦数据'], tags: ['P3话题','数据'] },
];

const existing = db.prepare('SELECT text FROM seeds').all().map((r: any) => r.text);
const uniqueSeeds = seeds.filter(s => !existing.includes(s.text));

const insertSQL = `
  INSERT OR IGNORE INTO seeds (id, seed_type, text, score, status, entity_type, aliases, category, market, event_type, keywords, topic_tag, related_entities, tags, discovery_count, fail_count, created_at, updated_at)
  VALUES (@id, @seed_type, @text, @score, 'active', @entity_type, @aliases, @category, @market, @event_type, @keywords, @topic_tag, @related_entities, @tags, 0, 0, datetime('now'), datetime('now'))
`;
const insert = db.prepare(insertSQL);
let inserted = 0;
for (const seed of uniqueSeeds) {
  const r = insert.run({
    id: uuidv4(), seed_type: seed.seedType, text: seed.text, score: seed.score,
    entity_type: seed.entityType || null,
    aliases: JSON.stringify(seed.aliases || []),
    category: seed.category || null,
    market: seed.market || null,
    event_type: seed.eventType || null,
    keywords: JSON.stringify(seed.keywords || []),
    topic_tag: seed.topicTag || null,
    related_entities: JSON.stringify(seed.relatedEntities || []),
    tags: JSON.stringify(seed.tags || []),
  });
  if (r.changes > 0) inserted++;
}

const total = db.prepare('SELECT count(*) as c FROM seeds').get().c;
console.log(`Part7: 新增 ${inserted}/${uniqueSeeds.length} 条`);
console.log(`\n🎯 最终种子总数: ${total} 条 🎯`);
console.log(`\n按类型:`);
db.prepare('SELECT seed_type, count(*) as c FROM seeds GROUP BY seed_type').all().forEach((r: any) => console.log(`  ${r.seed_type}: ${r.c}`));
console.log(`\n实体种子:`);
db.prepare("SELECT entity_type, count(*) as c FROM seeds WHERE seed_type='entity' AND entity_type IS NOT NULL GROUP BY entity_type").all().forEach((r: any) => console.log(`  ${r.entity_type}: ${r.c}`));
console.log(`\n高分(≥70): ${db.prepare('SELECT count(*) as c FROM seeds WHERE score >= 70').get().c}`);
console.log(`人物: ${db.prepare("SELECT count(*) as c FROM seeds WHERE seed_type='entity' AND entity_type='person'").get().c}`);
console.log(`游戏: ${db.prepare("SELECT count(*) as c FROM seeds WHERE seed_type='entity' AND entity_type='game'").get().c}`);
console.log(`公司: ${db.prepare("SELECT count(*) as c FROM seeds WHERE seed_type='entity' AND entity_type='company'").get().c}`);
db.close();
