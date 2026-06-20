/**
 * 大规模扩充种子 - Part 2: 微信小游戏 + 抖音小游戏 + 超休闲
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/gi.db');
const db = new Database(DB_PATH);

interface S { seedType: 'entity'; text: string; score: number; tags: string[]; entityType: 'game'; aliases: string[]; category: string; market: string; }
const G = (text: string, score: number, aliases: string[], category: string, tags: string[], market = '国内'): S => ({
  seedType: 'entity', text, score, tags, entityType: 'game', aliases, category, market
});

const seeds: S[] = [
  // ===== 微信小游戏（爆款） =====
  G('寻道大千', 60, ['寻道大千'], '放置', ['P2游戏','小游戏','放置','修仙']),
  G('咸鱼之王', 60, ['咸鱼之王'], '放置', ['P2游戏','小游戏','放置']),
  G('羊了个羊', 65, ['羊了个羊'], '消除', ['P1游戏','小游戏','消除','爆款']),
  G('跳一跳', 60, ['跳一跳'], '休闲', ['P1游戏','小游戏','休闲','微信']),
  G('合成大西瓜', 60, ['合成大西瓜'], '休闲', ['P1游戏','小游戏','休闲','爆款']),
  G('消灭病毒', 50, ['消灭病毒'], '射击', ['P2游戏','小游戏','射击']),
  G('疯狂动物园', 50, ['疯狂动物园','Zoo Browser'], '休闲', ['P2游戏','小游戏','休闲']),
  G('叫我大官人', 45, ['叫我大官人'], '模拟', ['P3游戏','小游戏','模拟','经营']),
  G('商道高手', 50, ['商道高手'], '模拟', ['P2游戏','小游戏','模拟','经营']),
  G('全民漂移', 45, ['全民漂移'], '竞速', ['P3游戏','小游戏','竞速']),
  G('最强蜗牛', 55, ['最强蜗牛'], '放置', ['P2游戏','小游戏','放置','青瓷']),
  G('我的小家', 50, ['我的小家'], '装修', ['P2游戏','小游戏','装修','休闲']),
  G('口袋奇兵', 55, ['口袋奇兵','Top War'], 'SLG', ['P2游戏','小游戏','SLG','江娱互动'], '全球'),
  G('无尽冬日', 60, ['Whiteout Survival','无尽冬日'], 'SLG', ['P1游戏','小游戏','SLG','点点互动'], '全球'),
  G('Last War: Survival', 60, ['Last War','Last War Survival'], 'SLG', ['P1游戏','小游戏','SLG','点点互动'], '全球'),
  G('欢乐斗地主', 55, ['欢乐斗地主'], '棋牌', ['P2游戏','小游戏','棋牌','腾讯']),
  G('欢乐麻将', 50, ['欢乐麻将'], '棋牌', ['P2游戏','小游戏','棋牌','腾讯']),
  G('地铁跑酷', 55, ['Subway Surfers','地铁跑酷'], '跑酷', ['P2游戏','小游戏','跑酷']),
  G('贪吃蛇大作战', 55, ['贪吃蛇大作战'], 'io', ['P2游戏','小游戏','io']),
  G('保卫萝卜4', 50, ['保卫萝卜4','保卫萝卜'], '塔防', ['P2游戏','小游戏','塔防']),
  G('天天爱消除', 50, ['天天爱消除'], '消除', ['P2游戏','小游戏','消除','腾讯']),
  G('节奏大师', 55, ['节奏大师'], '音乐', ['P2游戏','小游戏','音乐','腾讯']),
  G('弹球王者', 45, ['弹球王者'], '休闲', ['P3游戏','小游戏','休闲']),
  G('弓箭传说', 60, ['Archero','弓箭传说'], 'Roguelike', ['P2游戏','小游戏','Roguelike','Habby'], '全球'),
  G('我的安吉拉2', 40, ['我的安吉拉2'], '虚拟宠物', ['P3游戏','小游戏','虚拟宠物']),
  G('汤姆猫跑酷', 45, ['汤姆猫跑酷'], '跑酷', ['P3游戏','小游戏','跑酷']),
  G('开心消消乐', 60, ['开心消消乐'], '消除', ['P1游戏','小游戏','消除','乐元素']),
  G('JJ斗地主', 55, ['JJ斗地主'], '棋牌', ['P2游戏','小游戏','棋牌']),
  G('途游斗地主', 50, ['途游斗地主'], '棋牌', ['P2游戏','小游戏','棋牌']),
  G('逃跑吧少年', 50, ['逃跑吧少年'], '非对称', ['P2游戏','小游戏','非对称']),
  G('迷你世界', 55, ['迷你世界'], '沙盒', ['P2游戏','小游戏','沙盒','UGC']),
  G('我的世界', 65, ['Minecraft','我的世界'], '沙盒', ['P1游戏','小游戏','沙盒','UGC']),
  G('迷你都市', 40, ['迷你都市'], '模拟', ['P3游戏','小游戏','模拟']),
  G('模拟城市', 50, ['模拟城市','SimCity'], '模拟', ['P2游戏','小游戏','模拟','经营']),
  G('我是大东家', 45, ['我是大东家'], '模拟', ['P3游戏','小游戏','模拟','经营']),
  G('我的水果店', 40, ['我的水果店'], '模拟', ['P3游戏','小游戏','模拟','经营']),
  G('餐厅萌物语', 40, ['餐厅萌物语'], '模拟', ['P3游戏','小游戏','模拟','经营']),
  G('梦幻花园', 45, ['梦幻花园','Gardenscapes'], '消除', ['P3游戏','小游戏','消除','装修']),
  G('梦幻家园', 45, ['梦幻家园','Homescapes'], '消除', ['P3游戏','小游戏','消除','装修']),
  G('三消关卡', 40, ['三消关卡'], '消除', ['P3游戏','小游戏','消除']),
  G('球球大作战', 55, ['球球大作战'], 'io', ['P2游戏','小游戏','io','巨人']),
  G('香肠派对', 55, ['香肠派对'], '射击', ['P2游戏','小游戏','射击','心动']),

  // ===== 抖音小游戏 =====
  G('抖音贪吃蛇', 45, ['抖音贪吃蛇'], 'io', ['P3游戏','抖音小游戏','io']),
  G('抖音消消乐', 45, ['抖音消消乐'], '消除', ['P3游戏','抖音小游戏','消除']),
  G('抖地主', 50, ['抖地主'], '棋牌', ['P2游戏','抖音小游戏','棋牌']),
  G('抖音斗兽棋', 40, ['抖音斗兽棋'], '策略', ['P3游戏','抖音小游戏','策略']),
  G('抖音弹球', 45, ['抖音弹球'], '休闲', ['P3游戏','抖音小游戏','休闲']),
  G('合成大金砖', 45, ['合成大金砖'], '休闲', ['P3游戏','抖音小游戏','休闲']),
  G('脑洞大师', 50, ['脑洞大师','Brain Out'], '解谜', ['P2游戏','抖音小游戏','解谜','超休闲']),
  G('脑力大挑战', 45, ['脑力大挑战'], '解谜', ['P3游戏','抖音小游戏','解谜']),
  G('我的小店', 40, ['我的小店'], '模拟', ['P3游戏','抖音小游戏','模拟']),
  G('疯狂骑士团', 50, ['疯狂骑士团'], '放置', ['P2游戏','抖音小游戏','放置']),
  G('超能世界', 50, ['超能世界'], '放置', ['P2游戏','抖音小游戏','放置']),
  G('口袋异世界', 45, ['口袋异世界'], '放置', ['P3游戏','抖音小游戏','放置']),
  G('传奇霸主', 45, ['传奇霸主'], 'MMO', ['P3游戏','抖音小游戏','传奇']),
  G('一刀传世', 40, ['一刀传世'], 'MMO', ['P3游戏','抖音小游戏','传奇']),
  G('热血传奇', 50, ['热血传奇'], 'MMO', ['P2游戏','传奇','盛趣']),
  G('原始传奇', 45, ['原始传奇'], 'MMO', ['P3游戏','传奇','恺英']),

  // ===== 超休闲全球爆款 =====
  G('Candy Crush Saga', 60, ['Candy Crush','糖果传奇'], '消除', ['P2游戏','超休闲','消除','King'], '全球'),
  G('Royal Match', 60, ['Royal Match'], '消除', ['P2游戏','超休闲','消除','Dream Games'], '全球'),
  G('Roblox', 65, ['Roblox','罗布乐思'], '沙盒', ['P1游戏','超休闲','UGC','元宇宙'], '全球'),
  G('Among Us', 55, ['Among Us','太空狼人杀'], '社交', ['P2游戏','超休闲','社交','推理'], '全球'),
  G('Stumble Guys', 50, ['Stumble Guys'], '派对', ['P2游戏','超休闲','派对'], '全球'),
  G('Flappy Bird', 55, ['Flappy Bird','像素鸟'], '休闲', ['P2游戏','超休闲','休闲','爆款'], '全球'),
  G('Crossy Road', 45, ['Crossy Road'], '休闲', ['P3游戏','超休闲','休闲'], '全球'),
  G('Helix Jump', 40, ['Helix Jump'], '休闲', ['P3游戏','超休闲','休闲'], '全球'),
  G('Hill Climb Racing', 50, ['Hill Climb Racing'], '竞速', ['P2游戏','超休闲','竞速'], '全球'),
  G('Subway Surfers', 60, ['Subway Surfers'], '跑酷', ['P1游戏','超休闲','跑酷'], '全球'),
  G('Temple Run', 50, ['Temple Run'], '跑酷', ['P2游戏','超休闲','跑酷'], '全球'),
  G('Fruit Ninja', 50, ['Fruit Ninja','水果忍者'], '休闲', ['P2游戏','超休闲','休闲'], '全球'),
  G('Angry Birds', 55, ['Angry Birds','愤怒的小鸟'], '休闲', ['P2游戏','超休闲','物理'], '全球'),
  G('Clash of Clans', 65, ['Clash of Clans','COC','部落冲突'], 'SLG', ['P1游戏','SLG','Supercell'], '全球'),
  G('Clash Royale', 60, ['Clash Royale','皇室战争'], '卡牌', ['P1游戏','卡牌','竞技','Supercell'], '全球'),
  G('Brawl Stars', 60, ['Brawl Stars','荒野乱斗'], '射击', ['P1游戏','射击','Supercell'], '全球'),
  G('Hay Day', 50, ['Hay Day','卡通农场'], '模拟', ['P2游戏','模拟','经营','Supercell'], '全球'),
  G('PUBG Mobile', 70, ['PUBG Mobile','绝地求生手游'], '射击', ['P1游戏','射击','大逃杀'], '全球'),
  G('Call of Duty Mobile', 60, ['CODM','COD Mobile'], 'FPS', ['P2游戏','FPS','动视'], '全球'),
  G('Garena Free Fire', 60, ['Free Fire','Free Fire MAX'], '射击', ['P2游戏','射击','大逃杀','Garena'], '全球'),
  G('Mobile Legends', 65, ['MLBB','Mobile Legends'], 'MOBA', ['P1游戏','MOBA','沐瞳'], '全球'),
  G('League of Legends: Wild Rift', 70, ['Wild Rift','LOL手游'], 'MOBA', ['P1游戏','MOBA','Riot'], '全球'),
  G('Teamfight Tactics', 60, ['TFT','金铲铲之战'], '策略', ['P2游戏','自走棋','Riot'], '全球'),
  G('Valorant Mobile', 65, ['Valorant Mobile','无畏契约手游'], 'FPS', ['P1游戏','FPS','Riot'], '全球'),
  G('Pokémon GO', 60, ['Pokémon GO','Pokemon Go'], 'AR', ['P2游戏','AR','宝可梦','Niantic'], '全球'),
  G('Monopoly GO!', 65, ['Monopoly GO','大富翁GO'], '休闲', ['P1游戏','休闲','超休闲','爆款'], '全球'),
  G('Royal Kingdom', 50, ['Royal Kingdom'], '消除', ['P2游戏','超休闲','消除'], '全球'),
  G('Gossip Harbor', 50, ['Gossip Harbor'], '消除', ['P2游戏','超休闲','消除','装修'], '全球'),
  G('Travel Town', 50, ['Travel Town'], '合并', ['P2游戏','超休闲','合并'], '全球'),
  G('Merge Mansion', 50, ['Merge Mansion'], '合并', ['P2游戏','超休闲','合并'], '全球'),
  G('Toon Blast', 55, ['Toon Blast'], '消除', ['P2游戏','超休闲','消除'], '全球'),
  G('Homescapes', 50, ['Homescapes'], '消除', ['P2游戏','超休闲','消除','装修'], '全球'),
  G('Gardenscapes', 50, ['Gardenscapes'], '消除', ['P2游戏','超休闲','消除','装修'], '全球'),
  G('Fishdom', 45, ['Fishdom'], '消除', ['P3游戏','超休闲','消除'], '全球'),
  G('Match 3D', 40, ['Match 3D'], '消除', ['P3游戏','超休闲','消除'], '全球'),
  G('Project Makeover', 45, ['Project Makeover'], '休闲', ['P3游戏','超休闲','装修'], '全球'),
  G('Hero Wars', 50, ['Hero Wars'], 'RPG', ['P2游戏','超休闲','RPG'], '全球'),
  G('Raid: Shadow Legends', 55, ['Raid','Raid Shadow Legends'], 'RPG', ['P2游戏','超休闲','RPG'], '全球'),
  G('Evony', 50, ['Evony','Evony: The King\'s Group'], 'SLG', ['P2游戏','超休闲','SLG'], '全球'),
  G('Top War', 55, ['Top War','口袋奇兵'], 'SLG', ['P2游戏','超休闲','SLG'], '全球'),
  G('Lords Mobile', 55, ['Lords Mobile','王国纪元'], 'SLG', ['P2游戏','超休闲','SLG','IGG'], '全球'),
  G('Rise of Kingdoms', 65, ['ROK','万国觉醒'], 'SLG', ['P1游戏','超休闲','SLG','莉莉丝'], '全球'),
  G('Whiteout Survival', 60, ['Whiteout Survival','无尽冬日'], 'SLG', ['P1游戏','超休闲','SLG'], '全球'),
  G('Puzzle & Survival', 55, ['P&S','Puzzle Survival'], 'SLG', ['P2游戏','超休闲','SLG'], '全球'),
  G('Guns of Glory', 50, ['Guns of Glory'], 'SLG', ['P2游戏','超休闲','SLG'], '全球'),
  G('Game of War', 45, ['Game of War'], 'SLG', ['P3游戏','超休闲','SLG'], '全球'),

  // ===== 微信小游戏 - 传奇类/买量型 =====
  G('蓝月传奇2', 40, ['蓝月传奇2'], 'MMO', ['P3游戏','小游戏','传奇']),
  G('热血合击', 40, ['热血合击'], 'MMO', ['P3游戏','小游戏','传奇']),
  G('王者传奇', 40, ['王者传奇'], 'MMO', ['P3游戏','小游戏','传奇']),
  G('烈焰武尊', 35, ['烈焰武尊'], 'MMO', ['P3游戏','小游戏','传奇']),
  G('冰雪传奇', 40, ['冰雪传奇'], 'MMO', ['P3游戏','小游戏','传奇']),
  G('神龙传奇', 35, ['神龙传奇'], 'MMO', ['P3游戏','小游戏','传奇']),

  // ===== 抖音小游戏 - 模拟经营 =====
  G('我的超市', 40, ['我的超市'], '模拟', ['P3游戏','抖音小游戏','模拟','经营']),
  G('我的火锅', 40, ['我的火锅'], '模拟', ['P3游戏','抖音小游戏','模拟','经营']),
  G('我的宠物屋', 35, ['我的宠物屋'], '模拟', ['P3游戏','抖音小游戏','模拟']),
  G('网红奶茶店', 40, ['网红奶茶店'], '模拟', ['P3游戏','抖音小游戏','模拟','经营']),
  G('小小蚁国', 50, ['小小蚁国'], 'SLG', ['P2游戏','抖音小游戏','SLG']),
  G('巨兽战场', 45, ['巨兽战场'], 'SLG', ['P3游戏','抖音小游戏','SLG']),
  G('三国将列传', 40, ['三国将列传'], '策略', ['P3游戏','抖音小游戏','策略','三国']),
  G('小兵别嚣张', 45, ['小兵别嚣张'], '塔防', ['P3游戏','抖音小游戏','塔防']),
  G('守卫萝卜', 45, ['守卫萝卜'], '塔防', ['P3游戏','抖音小游戏','塔防']),
];

const existing = db.prepare('SELECT text FROM seeds').all().map((r: any) => r.text);
const uniqueSeeds = seeds.filter(s => !existing.includes(s.text));

const insertSQL = `
  INSERT OR IGNORE INTO seeds (id, seed_type, text, score, status, entity_type, aliases, category, market, tags, discovery_count, fail_count, created_at, updated_at)
  VALUES (@id, @seed_type, @text, @score, 'active', @entity_type, @aliases, @category, @market, @tags, 0, 0, datetime('now'), datetime('now'))
`;
const insert = db.prepare(insertSQL);
let inserted = 0;
for (const seed of uniqueSeeds) {
  const r = insert.run({
    id: uuidv4(), seed_type: seed.seedType, text: seed.text, score: seed.score,
    entity_type: seed.entityType, aliases: JSON.stringify(seed.aliases),
    category: seed.category, market: seed.market, tags: JSON.stringify(seed.tags),
  });
  if (r.changes > 0) inserted++;
}

console.log(`Part2 小游戏: 新增 ${inserted}/${uniqueSeeds.length} 条 (去重前 ${seeds.length})`);
const total = db.prepare('SELECT count(*) as c FROM seeds').get().c;
console.log(`当前种子总数: ${total}`);
db.close();
