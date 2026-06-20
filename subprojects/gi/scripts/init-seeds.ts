/**
 * 批量初始化种子数据
 *
 * 根据角色-关注矩阵和游戏行业知识，初始化 80+ 条种子：
 * - 公司种子（20+）
 * - 游戏种子（25+）
 * - 人物种子（5+）
 * - 事件种子（12+）
 * - 话题种子（15+）
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/gi.db');

const db = new Database(DB_PATH);

// 先清理测试种子
db.prepare("DELETE FROM seeds WHERE text IN ('游戏', '苹果')").run();

interface SeedInput {
  seedType: 'entity' | 'event' | 'topic';
  text: string;
  score: number;
  tags: string[];
  // entity 特有
  entityType?: 'game' | 'company' | 'person' | 'brand' | 'ip';
  aliases?: string[];
  category?: string;
  market?: string;
  // event 特有
  eventType?: string;
  keywords?: string[];
  // topic 特有
  topicTag?: string;
  relatedEntities?: string[];
}

const seeds: SeedInput[] = [
  // ===== 公司种子 =====
  {
    seedType: 'entity', text: '腾讯游戏', score: 95,
    entityType: 'company', aliases: ['腾讯', 'Tencent', '天美', '光子', '北极光', '魔方'],
    category: '大厂', market: '国内', tags: ['P0公司', '大厂'],
  },
  {
    seedType: 'entity', text: '网易游戏', score: 90,
    entityType: 'company', aliases: ['网易', 'NetEase', '雷火', '盘古', 'Interworld'],
    category: '大厂', market: '国内', tags: ['P0公司', '大厂'],
  },
  {
    seedType: 'entity', text: '米哈游', score: 95,
    entityType: 'company', aliases: ['miHoYo', 'HoYoverse', '崩坏', '原神'],
    category: '大厂', market: '全球', tags: ['P0公司', '大厂', '出海'],
  },
  {
    seedType: 'entity', text: '莉莉丝', score: 75,
    entityType: 'company', aliases: ['Lilith', '莉莉丝游戏', '远光'],
    category: '出海', market: '全球', tags: ['P1公司', 'SLG', '出海'],
  },
  {
    seedType: 'entity', text: '鹰角网络', score: 75,
    entityType: 'company', aliases: ['鹰角', 'Hypergryph', '明日方舟'],
    category: '新锐', market: '国内', tags: ['P1公司', '二次元'],
  },
  {
    seedType: 'entity', text: '叠纸游戏', score: 70,
    entityType: 'company', aliases: ['叠纸', 'Papergames', '暖暖', '恋与'],
    category: '新锐', market: '全球', tags: ['P1公司', '女性向'],
  },
  {
    seedType: 'entity', text: '库洛科技', score: 70,
    entityType: 'company', aliases: ['库洛', 'Kuro Games', '鸣潮', '战双'],
    category: '新锐', market: '全球', tags: ['P1公司', '二次元', '动作'],
  },
  {
    seedType: 'entity', text: '散爆网络', score: 65,
    entityType: 'company', aliases: ['散爆', 'Sunborn', '少女前线', '暗区突围'],
    category: '新锐', market: '全球', tags: ['P1公司', '二次元'],
  },
  {
    seedType: 'entity', text: '完美世界', score: 70,
    entityType: 'company', aliases: ['完美', 'Perfect World'],
    category: '上市公司', market: '国内', tags: ['P1公司', '上市公司'],
  },
  {
    seedType: 'entity', text: '三七互娱', score: 65,
    entityType: 'company', aliases: ['三七', '37Games'],
    category: '上市公司', market: '全球', tags: ['P1公司', '买量', '出海'],
  },
  {
    seedType: 'entity', text: 'B站游戏', score: 70,
    entityType: 'company', aliases: ['B站', 'Bilibili', '哔哩哔哩', 'B服'],
    category: '平台', market: '国内', tags: ['P1公司', '渠道', '二次元'],
  },
  {
    seedType: 'entity', text: '朝夕光年', score: 65,
    entityType: 'company', aliases: ['字节游戏', '字节跳动', 'TikTok游戏'],
    category: '大厂', market: '全球', tags: ['P1公司', '大厂'],
  },
  {
    seedType: 'entity', text: '西山居', score: 60,
    entityType: 'company', aliases: ['西山居', 'Seasun'],
    category: '上市公司', market: '国内', tags: ['P2公司'],
  },
  {
    seedType: 'entity', text: '巨人网络', score: 55,
    entityType: 'company', aliases: ['巨人', 'Giant'],
    category: '上市公司', market: '国内', tags: ['P2公司'],
  },
  {
    seedType: 'entity', text: '沐瞳科技', score: 65,
    entityType: 'company', aliases: ['沐瞳', 'Moonton', 'Mobile Legends'],
    category: '出海', market: '东南亚', tags: ['P1公司', 'MOBA', '出海'],
  },
  {
    seedType: 'entity', text: 'IGG', score: 55,
    entityType: 'company', aliases: ['IGG', '王国纪元'],
    category: '出海', market: '全球', tags: ['P2公司', 'SLG', '出海'],
  },
  {
    seedType: 'entity', text: 'FunPlus', score: 60,
    entityType: 'company', aliases: ['趣加', 'FunPlus'],
    category: '出海', market: '全球', tags: ['P2公司', 'SLG', '出海'],
  },
  {
    seedType: 'entity', text: '深蓝互动', score: 55,
    entityType: 'company', aliases: ['深蓝', 'InfoldGames', '尘白禁区'],
    category: '新锐', market: '全球', tags: ['P2公司', '二次元'],
  },
  {
    seedType: 'entity', text: '紫龙游戏', score: 50,
    entityType: 'company', aliases: ['紫龙', 'Black Dragon'],
    category: '出海', market: '全球', tags: ['P2公司', 'SRPG'],
  },
  {
    seedType: 'entity', text: '游族网络', score: 50,
    entityType: 'company', aliases: ['游族', 'Yoozoo'],
    category: '上市公司', market: '全球', tags: ['P2公司'],
  },
  {
    seedType: 'entity', text: '智明星通', score: 50,
    entityType: 'company', aliases: ['ELEX', '智明星通'],
    category: '出海', market: '全球', tags: ['P2公司', 'SLG'],
  },
  {
    seedType: 'entity', text: '月之暗面', score: 60,
    entityType: 'company', aliases: ['Moonshot', 'Kimi', 'Moonshot AI'],
    category: 'AI', market: '国内', tags: ['P1公司', 'AI', '大模型'],
  },

  // ===== 游戏种子 =====
  {
    seedType: 'entity', text: '原神', score: 90,
    entityType: 'game', aliases: ['Genshin Impact', '原神'],
    category: '二次元', market: '全球', tags: ['P0游戏', '开放世界', '二次元'],
  },
  {
    seedType: 'entity', text: '王者荣耀', score: 90,
    entityType: 'game', aliases: ['Honor of Kings', '王者', '农药'],
    category: 'MOBA', market: '全球', tags: ['P0游戏', 'MOBA', '竞技'],
  },
  {
    seedType: 'entity', text: '崩坏：星穹铁道', score: 85,
    entityType: 'game', aliases: ['星穹铁道', '星铁', 'Honkai: Star Rail', 'SR'],
    category: '二次元', market: '全球', tags: ['P0游戏', '回合制', '二次元'],
  },
  {
    seedType: 'entity', text: '鸣潮', score: 80,
    entityType: 'game', aliases: ['Wuthering Waves', '鸣潮'],
    category: '二次元', market: '全球', tags: ['P0游戏', '开放世界', '动作'],
  },
  {
    seedType: 'entity', text: '黑神话：悟空', score: 85,
    entityType: 'game', aliases: ['黑神话', 'Black Myth: Wukong', '悟空'],
    category: '3A', market: '全球', tags: ['P0游戏', '3A', '单机', '动作'],
  },
  {
    seedType: 'entity', text: '绝区零', score: 75,
    entityType: 'game', aliases: ['Zenless Zone Zero', 'ZZZ', '绝区零'],
    category: '二次元', market: '全球', tags: ['P1游戏', '动作', '二次元'],
  },
  {
    seedType: 'entity', text: '明日方舟', score: 75,
    entityType: 'game', aliases: ['Arknights', '方舟', '舟游'],
    category: '二次元', market: '全球', tags: ['P1游戏', '塔防', '二次元'],
  },
  {
    seedType: 'entity', text: '和平精英', score: 70,
    entityType: 'game', aliases: ['PUBG Mobile', '和平精英', '吃鸡'],
    category: '射击', market: '全球', tags: ['P1游戏', 'FPS', '竞技'],
  },
  {
    seedType: 'entity', text: '蛋仔派对', score: 70,
    entityType: 'game', aliases: ['Eggy Party', '蛋仔'],
    category: '派对', market: '国内', tags: ['P1游戏', '派对', '休闲'],
  },
  {
    seedType: 'entity', text: '元梦之星', score: 65,
    entityType: 'game', aliases: ['元梦', 'Star of Dreams'],
    category: '派对', market: '国内', tags: ['P1游戏', '派对', '休闲'],
  },
  {
    seedType: 'entity', text: '三角洲行动', score: 70,
    entityType: 'game', aliases: ['Delta Force', '三角洲'],
    category: '射击', market: '全球', tags: ['P1游戏', 'FPS', '战术'],
  },
  {
    seedType: 'entity', text: '暗区突围', score: 65,
    entityType: 'game', aliases: ['Arena Breakout', '暗区'],
    category: '射击', market: '全球', tags: ['P1游戏', 'FPS', '撤离'],
  },
  {
    seedType: 'entity', text: '金铲铲之战', score: 65,
    entityType: 'game', aliases: ['TFT', '金铲铲', '云顶之弈手游'],
    category: '策略', market: '国内', tags: ['P1游戏', '自走棋'],
  },
  {
    seedType: 'entity', text: '燕云十六声', score: 65,
    entityType: 'game', aliases: ['燕云', 'Where Winds Meet'],
    category: '开放世界', market: '全球', tags: ['P1游戏', '开放世界', '武侠'],
  },
  {
    seedType: 'entity', text: '无限暖暖', score: 65,
    entityType: 'game', aliases: ['暖暖', 'Infinity Nikki'],
    category: '换装', market: '全球', tags: ['P1游戏', '开放世界', '女性向'],
  },
  {
    seedType: 'entity', text: '解限机', score: 60,
    entityType: 'game', aliases: ['Mecha Break', '解限机'],
    category: '机甲', market: '全球', tags: ['P1游戏', '机甲', '动作'],
  },
  {
    seedType: 'entity', text: '阴阳师', score: 55,
    entityType: 'game', aliases: ['Onmyoji', '阴阳师'],
    category: '二次元', market: '日本', tags: ['P2游戏', '回合制', '二次元'],
  },
  {
    seedType: 'entity', text: '逆水寒', score: 55,
    entityType: 'game', aliases: ['逆水寒', 'Justice Online'],
    category: 'MMO', market: '国内', tags: ['P2游戏', 'MMO', '武侠'],
  },
  {
    seedType: 'entity', text: '幻塔', score: 50,
    entityType: 'game', aliases: ['Tower of Fantasy', '幻塔'],
    category: '二次元', market: '全球', tags: ['P2游戏', '开放世界'],
  },
  {
    seedType: 'entity', text: '第五人格', score: 55,
    entityType: 'game', aliases: ['Identity V', '第五人格'],
    category: '非对称', market: '全球', tags: ['P2游戏', '非对称竞技'],
  },
  {
    seedType: 'entity', text: '永劫无间', score: 60,
    entityType: 'game', aliases: ['NARAKA', '永劫无间'],
    category: '动作', market: '全球', tags: ['P2游戏', '大逃杀', '动作'],
  },
  {
    seedType: 'entity', text: '杀戮尖塔2', score: 60,
    entityType: 'game', aliases: ['Slay the Spire 2', 'STS2'],
    category: '独立', market: '全球', tags: ['P1游戏', 'Roguelike', '卡牌'],
  },
  {
    seedType: 'entity', text: 'UFL', score: 50,
    entityType: 'game', aliases: ['UFL'],
    category: '体育', market: '全球', tags: ['P2游戏', '足球', '体育'],
  },
  {
    seedType: 'entity', text: '碧蓝幻想Relink', score: 50,
    entityType: 'game', aliases: ['Granblue Fantasy Relink', 'GBVS'],
    category: '动作', market: '日本', tags: ['P2游戏', '动作', 'RPG'],
  },

  // ===== 人物种子 =====
  {
    seedType: 'entity', text: '蔡浩宇', score: 60,
    entityType: 'person', aliases: ['蔡浩宇', '大伟哥'],
    category: 'CEO', market: '国内', tags: ['米哈游', '创始人'],
  },
  {
    seedType: 'entity', text: '丁磊', score: 55,
    entityType: 'person', aliases: ['丁磊'],
    category: 'CEO', market: '国内', tags: ['网易', '创始人'],
  },
  {
    seedType: 'entity', text: '金雯怡', score: 55,
    entityType: 'person', aliases: ['金雯怡'],
    category: '高管', market: '全球', tags: ['米哈游', '月之暗面', '出海'],
  },
  {
    seedType: 'entity', text: '袁菁', score: 50,
    entityType: 'person', aliases: ['袁菁'],
    category: 'CEO', market: '国内', tags: ['莉莉丝', '创始人'],
  },
  {
    seedType: 'entity', text: '黄一孟', score: 50,
    entityType: 'person', aliases: ['黄一孟'],
    category: 'CEO', market: '国内', tags: ['TapTap', '心动网络'],
  },

  // ===== 事件种子 =====
  {
    seedType: 'event', text: '游戏版号', score: 80,
    eventType: '版号', keywords: ['版号', '国产网络游戏审批', '进口游戏审批', '出版物号'],
    tags: ['P0事件', '政策'],
  },
  {
    seedType: 'event', text: '新游上线', score: 75,
    eventType: '上线', keywords: ['正式上线', '公测', '全平台上线', '不限号', '首发'],
    tags: ['P0事件', '发行'],
  },
  {
    seedType: 'event', text: '游戏测试', score: 60,
    eventType: '测试', keywords: ['测试', '内测', '删档测试', '不删档', '公测', '品鉴', '封测'],
    tags: ['P1事件', '研发'],
  },
  {
    seedType: 'event', text: '游戏融资', score: 75,
    eventType: '融资', keywords: ['融资', '投资', '天使轮', 'A轮', 'B轮', '战略投资'],
    tags: ['P0事件', '资本'],
  },
  {
    seedType: 'event', text: '游戏并购', score: 75,
    eventType: '融资', keywords: ['收购', '并购', '全资收购', '控股', '入股'],
    tags: ['P0事件', '资本'],
  },
  {
    seedType: 'event', text: '游戏出海', score: 70,
    eventType: '出海', keywords: ['出海', '海外发行', '全球化', '国际化', '海外市场'],
    tags: ['P1事件', '出海'],
  },
  {
    seedType: 'event', text: '游戏买量', score: 60,
    eventType: '买量', keywords: ['买量', '广告投放', '素材投放', 'UA', '用户获取', '效果广告'],
    tags: ['P1事件', '广告'],
  },
  {
    seedType: 'event', text: '游戏榜单', score: 55,
    eventType: '榜单变化', keywords: ['畅销榜', '下载榜', 'iOS榜单', 'Sensor Tower', 'data.ai'],
    tags: ['P2事件', '数据'],
  },
  {
    seedType: 'event', text: '组织架构调整', score: 65,
    eventType: '组织动作', keywords: ['裁员', '组织架构', '事业部', '人事变动', '高管', 'CEO', '调整'],
    tags: ['P1事件', '组织'],
  },
  {
    seedType: 'event', text: 'IP联动', score: 50,
    eventType: '合作', keywords: ['联动', '联名', 'IP合作', '跨界', '合作'],
    tags: ['P2事件', '运营'],
  },
  {
    seedType: 'event', text: '游戏停运', score: 55,
    eventType: '舆情', keywords: ['停运', '停服', '关服', '停止运营'],
    tags: ['P2事件', '运营'],
  },
  {
    seedType: 'event', text: '游戏政策监管', score: 70,
    eventType: '政策', keywords: ['防沉迷', '未成年人', '监管', '政策', '合规', '审查'],
    tags: ['P1事件', '政策'],
  },

  // ===== 话题种子 =====
  {
    seedType: 'topic', text: 'AI+游戏', score: 80,
    topicTag: 'AI应用', relatedEntities: ['米哈游', '腾讯游戏', '网易游戏', '月之暗面'],
    tags: ['P0话题', 'AI', '技术'],
  },
  {
    seedType: 'topic', text: '游戏出海', score: 75,
    topicTag: '出海', relatedEntities: ['米哈游', '莉莉丝', '沐瞳科技', '三七互娱', 'IGG'],
    tags: ['P0话题', '出海', '全球化'],
  },
  {
    seedType: 'topic', text: '二次元游戏', score: 70,
    topicTag: '二游', relatedEntities: ['原神', '明日方舟', '鸣潮', '崩坏：星穹铁道', '鹰角网络'],
    tags: ['P1话题', '二次元', '赛道'],
  },
  {
    seedType: 'topic', text: '微信小游戏', score: 70,
    topicTag: '小游戏', relatedEntities: ['腾讯游戏'],
    tags: ['P1话题', '小游戏', '休闲'],
  },
  {
    seedType: 'topic', text: '开放世界', score: 65,
    topicTag: '开放世界', relatedEntities: ['原神', '鸣潮', '燕云十六声', '幻塔', '无限暖暖'],
    tags: ['P1话题', '品类'],
  },
  {
    seedType: 'topic', text: '派对游戏', score: 65,
    topicTag: '派对游戏', relatedEntities: ['蛋仔派对', '元梦之星'],
    tags: ['P1话题', '品类', '休闲'],
  },
  {
    seedType: 'topic', text: 'SLG策略游戏', score: 60,
    topicTag: 'SLG', relatedEntities: ['莉莉丝', 'FunPlus', 'IGG', '三七互娱'],
    tags: ['P2话题', '品类', 'SLG'],
  },
  {
    seedType: 'topic', text: '女性向游戏', score: 55,
    topicTag: '女性向', relatedEntities: ['叠纸游戏', '无限暖暖'],
    tags: ['P2话题', '品类'],
  },
  {
    seedType: 'topic', text: '3A单机', score: 65,
    topicTag: '3A', relatedEntities: ['黑神话：悟空', '腾讯游戏'],
    tags: ['P1话题', '3A', '单机'],
  },
  {
    seedType: 'topic', text: 'FPS/射击游戏', score: 60,
    topicTag: 'FPS', relatedEntities: ['三角洲行动', '暗区突围', '和平精英', 'VALORANT'],
    tags: ['P2话题', '品类'],
  },
  {
    seedType: 'topic', text: 'Roguelike', score: 55,
    topicTag: 'Roguelike', relatedEntities: ['杀戮尖塔2'],
    tags: ['P2话题', '品类'],
  },
  {
    seedType: 'topic', text: '游戏直播/短视频营销', score: 55,
    topicTag: '营销', relatedEntities: ['B站游戏', '字节跳动'],
    tags: ['P2话题', '营销', '短视频'],
  },
  {
    seedType: 'topic', text: '游戏引擎/技术', score: 55,
    topicTag: '技术', relatedEntities: ['腾讯游戏', '米哈游'],
    tags: ['P2话题', '技术', '引擎'],
  },
  {
    seedType: 'topic', text: '体育/足球游戏', score: 50,
    topicTag: '体育', relatedEntities: ['UFL', 'EA Sports'],
    tags: ['P2话题', '品类', '体育'],
  },
  {
    seedType: 'topic', text: '游戏公司IPO', score: 60,
    topicTag: 'IPO', relatedEntities: [],
    tags: ['P1话题', '资本', '上市'],
  },
];

console.log(`准备初始化 ${seeds.length} 条种子...\n`);

const insertSQL = `
  INSERT OR IGNORE INTO seeds (
    id, seed_type, text, score, status,
    entity_type, aliases, category, market,
    event_type, keywords,
    topic_tag, related_entities,
    tags, discovery_count, fail_count,
    created_at, updated_at
  ) VALUES (
    @id, @seed_type, @text, @score, 'active',
    @entity_type, @aliases, @category, @market,
    @event_type, @keywords,
    @topic_tag, @related_entities,
    @tags, 0, 0,
    datetime('now'), datetime('now')
  )
`;

const insert = db.prepare(insertSQL);
let inserted = 0;
let skipped = 0;

for (const seed of seeds) {
  const params = {
    id: uuidv4(),
    seed_type: seed.seedType,
    text: seed.text,
    score: seed.score,
    entity_type: seed.entityType || null,
    aliases: JSON.stringify(seed.aliases || []),
    category: seed.category || null,
    market: seed.market || null,
    event_type: seed.eventType || null,
    keywords: JSON.stringify(seed.keywords || []),
    topic_tag: seed.topicTag || null,
    related_entities: JSON.stringify(seed.relatedEntities || []),
    tags: JSON.stringify(seed.tags || []),
  };

  const result = insert.run(params);
  if (result.changes > 0) {
    inserted++;
    console.log(`  ✅ [${seed.seedType}] ${seed.text} (score: ${seed.score})`);
  } else {
    skipped++;
    console.log(`  ⏭️  [${seed.seedType}] ${seed.text} (已存在)`);
  }
}

console.log(`\n=== 完成 ===`);
console.log(`新增: ${inserted} 条`);
console.log(`跳过: ${skipped} 条`);

// 统计
const total = db.prepare('SELECT count(*) as c FROM seeds').get().c;
const byType = db.prepare('SELECT seed_type, count(*) as c FROM seeds GROUP BY seed_type').all();
const byScore = db.prepare('SELECT count(*) as c FROM seeds WHERE score >= 70').get().c;

console.log(`\n=== 种子总数 ===`);
console.log(`总计: ${total} 条`);
console.log(`高分(≥70): ${byScore} 条`);
byType.forEach((r: any) => console.log(`  ${r.seed_type}: ${r.c} 条`));

db.close();
