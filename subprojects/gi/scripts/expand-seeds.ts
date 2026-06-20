/**
 * 扩充种子数据（第二轮）
 *
 * 补充更多国际厂商、热门游戏、行业人物
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/gi.db');

const db = new Database(DB_PATH);

interface SeedInput {
  seedType: 'entity' | 'event' | 'topic';
  text: string;
  score: number;
  tags: string[];
  entityType?: 'game' | 'company' | 'person' | 'brand' | 'ip';
  aliases?: string[];
  category?: string;
  market?: string;
  eventType?: string;
  keywords?: string[];
  topicTag?: string;
  relatedEntities?: string[];
}

const seeds: SeedInput[] = [
  // ===== 国际大厂 =====
  {
    seedType: 'entity', text: 'EA (艺电)', score: 80,
    entityType: 'company', aliases: ['EA', 'Electronic Arts', '艺电', 'EA Sports'],
    category: '国际大厂', market: '全球', tags: ['P0公司', '国际', '体育'],
  },
  {
    seedType: 'entity', text: '育碧', score: 75,
    entityType: 'company', aliases: ['Ubisoft', '育碧', 'Assassin Creed'],
    category: '国际大厂', market: '全球', tags: ['P1公司', '国际', '3A'],
  },
  {
    seedType: 'entity', text: '动视暴雪', score: 80,
    entityType: 'company', aliases: ['Activision Blizzard', '暴雪', 'Blizzard', '动视', 'Call of Duty'],
    category: '国际大厂', market: '全球', tags: ['P0公司', '国际', 'FPS'],
  },
  {
    seedType: 'entity', text: '任天堂', score: 85,
    entityType: 'company', aliases: ['Nintendo', '任天堂', 'Switch', 'Mario'],
    category: '国际大厂', market: '全球', tags: ['P0公司', '国际', '主机'],
  },
  {
    seedType: 'entity', text: '索尼 PlayStation', score: 80,
    entityType: 'company', aliases: ['Sony', 'PlayStation', 'PS5', '索尼互动娱乐', 'SIE'],
    category: '国际大厂', market: '全球', tags: ['P0公司', '国际', '主机'],
  },
  {
    seedType: 'entity', text: '微软 Xbox', score: 80,
    entityType: 'company', aliases: ['Microsoft', 'Xbox', '微软游戏', 'Game Pass', 'Bethesda'],
    category: '国际大厂', market: '全球', tags: ['P0公司', '国际', '订阅'],
  },
  {
    seedType: 'entity', text: 'Valve', score: 75,
    entityType: 'company', aliases: ['Valve', 'V社', 'Steam', 'CS2', 'Dota 2'],
    category: '国际大厂', market: '全球', tags: ['P1公司', '国际', '平台'],
  },
  {
    seedType: 'entity', text: 'Take-Two', score: 70,
    entityType: 'company', aliases: ['Take-Two', 'T2', 'Rockstar', 'GTA', '2K'],
    category: '国际大厂', market: '全球', tags: ['P1公司', '国际', '3A'],
  },
  {
    seedType: 'entity', text: 'Epic Games', score: 75,
    entityType: 'company', aliases: ['Epic', 'Epic Games', 'Fortnite', '虚幻引擎', 'Unreal'],
    category: '国际大厂', market: '全球', tags: ['P1公司', '国际', '引擎'],
  },
  {
    seedType: 'entity', text: '卡普空', score: 65,
    entityType: 'company', aliases: ['Capcom', '卡普空', '生化危机', '怪物猎人'],
    category: '国际大厂', market: '全球', tags: ['P1公司', '国际', '日系'],
  },
  {
    seedType: 'entity', text: '万代南梦宫', score: 65,
    entityType: 'company', aliases: ['Bandai Namco', '万代', '南梦宫'],
    category: '国际大厂', market: '全球', tags: ['P1公司', '国际', '日系', 'IP'],
  },
  {
    seedType: 'entity', text: 'Square Enix', score: 65,
    entityType: 'company', aliases: ['SE', '史克威尔艾尼克斯', 'Square Enix', '最终幻想'],
    category: '国际大厂', market: '全球', tags: ['P1公司', '国际', '日系', 'RPG'],
  },
  {
    seedType: 'entity', text: '科乐美', score: 55,
    entityType: 'company', aliases: ['Konami', '科乐美', '实况足球'],
    category: '国际大厂', market: '全球', tags: ['P2公司', '国际', '日系'],
  },
  {
    seedType: 'entity', text: '世嘉', score: 55,
    entityType: 'company', aliases: ['Sega', '世嘉', '如龙'],
    category: '国际大厂', market: '全球', tags: ['P2公司', '国际', '日系'],
  },
  {
    seedType: 'entity', text: 'Nexon', score: 60,
    entityType: 'company', aliases: ['Nexon', '奈克逊'],
    category: '国际大厂', market: '韩国', tags: ['P2公司', '国际', '韩系'],
  },
  {
    seedType: 'entity', text: 'Krafton', score: 60,
    entityType: 'company', aliases: ['Krafton', '蓝洞', 'PUBG'],
    category: '国际大厂', market: '韩国', tags: ['P2公司', '国际', '韩系', 'FPS'],
  },
  {
    seedType: 'entity', text: 'Shift Up', score: 60,
    entityType: 'company', aliases: ['Shift Up', '妮姬', 'NIKKE', '剑星'],
    category: '国际大厂', market: '韩国', tags: ['P1公司', '国际', '韩系', '二次元'],
  },
  {
    seedType: 'entity', text: 'Supercell', score: 65,
    entityType: 'company', aliases: ['Supercell', '部落冲突', '皇室战争'],
    category: '国际大厂', market: '全球', tags: ['P1公司', '国际', '手游'],
  },
  {
    seedType: 'entity', text: 'Roblox', score: 60,
    entityType: 'company', aliases: ['Roblox', '罗布乐思'],
    category: '国际大厂', market: '全球', tags: ['P2公司', '国际', 'UGC', '元宇宙'],
  },
  {
    seedType: 'entity', text: 'Garena', score: 55,
    entityType: 'company', aliases: ['Garena', 'Sea Limited', 'Sea'],
    category: '国际大厂', market: '东南亚', tags: ['P2公司', '国际', '东南亚'],
  },
  {
    seedType: 'entity', text: 'Sea Group', score: 55,
    entityType: 'company', aliases: ['Sea Group', '冬海集团'],
    category: '国际大厂', market: '东南亚', tags: ['P2公司', '国际', '东南亚'],
  },

  // ===== 国内其他厂商 =====
  {
    seedType: 'entity', text: '心动网络', score: 65,
    entityType: 'company', aliases: ['心动', 'XD Inc', 'TapTap'],
    category: '平台', market: '全球', tags: ['P1公司', '平台', 'TapTap'],
  },
  {
    seedType: 'entity', text: '恺英网络', score: 50,
    entityType: 'company', aliases: ['恺英'],
    category: '上市公司', market: '国内', tags: ['P2公司'],
  },
  {
    seedType: 'entity', text: '吉比特', score: 55,
    entityType: 'company', aliases: ['吉比特', '雷霆游戏'],
    category: '上市公司', market: '国内', tags: ['P2公司', '独立游戏'],
  },
  {
    seedType: 'entity', text: '世纪华通', score: 50,
    entityType: 'company', aliases: ['世纪华通', '盛趣游戏', '盛大'],
    category: '上市公司', market: '国内', tags: ['P2公司'],
  },
  {
    seedType: 'entity', text: '中青宝', score: 45,
    entityType: 'company', aliases: ['中青宝'],
    category: '上市公司', market: '国内', tags: ['P3公司'],
  },
  {
    seedType: 'entity', text: '神州泰岳', score: 45,
    entityType: 'company', aliases: ['神州泰岳'],
    category: '上市公司', market: '国内', tags: ['P3公司'],
  },
  {
    seedType: 'entity', text: '姚记科技', score: 45,
    entityType: 'company', aliases: ['姚记科技'],
    category: '上市公司', market: '国内', tags: ['P3公司'],
  },
  {
    seedType: 'entity', text: '宝通科技', score: 45,
    entityType: 'company', aliases: ['宝通科技'],
    category: '上市公司', market: '国内', tags: ['P3公司'],
  },
  {
    seedType: 'entity', text: '掌趣科技', score: 50,
    entityType: 'company', aliases: ['掌趣科技'],
    category: '上市公司', market: '国内', tags: ['P2公司'],
  },
  {
    seedType: 'entity', text: '冰川网络', score: 50,
    entityType: 'company', aliases: ['冰川网络'],
    category: '上市公司', market: '国内', tags: ['P2公司'],
  },
  {
    seedType: 'entity', text: '贪玩', score: 50,
    entityType: 'company', aliases: ['贪玩', '江西贪玩'],
    category: '买量', market: '国内', tags: ['P2公司', '买量'],
  },

  // ===== 热门游戏 =====
  // FPS/射击
  {
    seedType: 'entity', text: 'VALORANT', score: 70,
    entityType: 'game', aliases: ['瓦罗兰特', '无畏契约', 'VALORANT'],
    category: 'FPS', market: '全球', tags: ['P1游戏', 'FPS', '竞技', '电竞'],
  },
  {
    seedType: 'entity', text: '英雄联盟', score: 80,
    entityType: 'game', aliases: ['LOL', 'League of Legends', '英雄联盟', '撸啊撸'],
    category: 'MOBA', market: '全球', tags: ['P0游戏', 'MOBA', '电竞'],
  },
  {
    seedType: 'entity', text: 'CS2', score: 70,
    entityType: 'game', aliases: ['CS2', 'Counter-Strike 2', 'CSGO'],
    category: 'FPS', market: '全球', tags: ['P1游戏', 'FPS', '电竞'],
  },
  {
    seedType: 'entity', text: '使命召唤', score: 65,
    entityType: 'game', aliases: ['Call of Duty', 'COD', '使命召唤', '使命召唤手游'],
    category: 'FPS', market: '全球', tags: ['P1游戏', 'FPS'],
  },
  {
    seedType: 'entity', text: 'PUBG', score: 65,
    entityType: 'game', aliases: ['PUBG', '绝地求生', 'PUBG Mobile'],
    category: '射击', market: '全球', tags: ['P1游戏', '大逃杀'],
  },
  {
    seedType: 'entity', text: 'APEX Legends', score: 60,
    entityType: 'game', aliases: ['APEX', 'Apex Legends', ' Apex英雄'],
    category: 'FPS', market: '全球', tags: ['P2游戏', 'FPS', '大逃杀'],
  },
  {
    seedType: 'entity', text: '守望先锋2', score: 55,
    entityType: 'game', aliases: ['Overwatch 2', 'OW2', '守望先锋'],
    category: 'FPS', market: '全球', tags: ['P2游戏', 'FPS'],
  },
  // MOBA/竞技
  {
    seedType: 'entity', text: 'Dota 2', score: 60,
    entityType: 'game', aliases: ['Dota 2', 'DOTA2', '刀塔'],
    category: 'MOBA', market: '全球', tags: ['P2游戏', 'MOBA', '电竞'],
  },
  // 开放世界/RPG
  {
    seedType: 'entity', text: '塞尔达传说', score: 75,
    entityType: 'game', aliases: ['Zelda', '塞尔达', '王国之泪', '旷野之息'],
    category: '开放世界', market: '全球', tags: ['P1游戏', '开放世界', '任天堂'],
  },
  {
    seedType: 'entity', text: '最终幻想', score: 60,
    entityType: 'game', aliases: ['Final Fantasy', 'FF', '最终幻想'],
    category: 'RPG', market: '全球', tags: ['P2游戏', 'RPG', '日系'],
  },
  {
    seedType: 'entity', text: 'GTA', score: 75,
    entityType: 'game', aliases: ['GTA', 'GTA 6', 'Grand Theft Auto', '侠盗猎车手'],
    category: '开放世界', market: '全球', tags: ['P1游戏', '开放世界', '3A'],
  },
  {
    seedType: 'entity', text: '艾尔登法环', score: 65,
    entityType: 'game', aliases: ['Elden Ring', '老头环', '艾尔登法环'],
    category: '动作', market: '全球', tags: ['P1游戏', '开放世界', '魂系'],
  },
  {
    seedType: 'entity', text: '空洞骑士：丝之歌', score: 60,
    entityType: 'game', aliases: ['Hollow Knight: Silksong', '丝之歌'],
    category: '独立', market: '全球', tags: ['P1游戏', '独立', '银河恶魔城'],
  },
  {
    seedType: 'entity', text: '怪物猎人：荒野', score: 65,
    entityType: 'game', aliases: ['Monster Hunter Wilds', '怪猎荒野', '怪物猎人'],
    category: '动作', market: '全球', tags: ['P1游戏', '共斗', '日系'],
  },
  // 日系/二次元
  {
    seedType: 'entity', text: '崩坏3', score: 60,
    entityType: 'game', aliases: ['崩坏3', 'Honkai Impact 3rd', '崩3'],
    category: '二次元', market: '全球', tags: ['P2游戏', '动作', '二次元'],
  },
  {
    seedType: 'entity', text: '战双帕弥什', score: 55,
    entityType: 'game', aliases: ['战双', '战双帕弥什', 'Punishing: Gray Raven'],
    category: '二次元', market: '全球', tags: ['P2游戏', '动作', '二次元'],
  },
  {
    seedType: 'entity', text: '重返未来：1999', score: 60,
    entityType: 'game', aliases: ['1999', '重返未来1999', 'Reverse: 1999'],
    category: '二次元', market: '全球', tags: ['P2游戏', '二次元', '卡牌'],
  },
  {
    seedType: 'entity', text: '白夜极光', score: 55,
    entityType: 'game', aliases: ['白夜极光', 'Alchemy Stars'],
    category: '二次元', market: '全球', tags: ['P2游戏', '二次元', '战棋'],
  },
  {
    seedType: 'entity', text: '尘白禁区', score: 55,
    entityType: 'game', aliases: ['尘白禁区', 'Arena Breakout: Infinite', '白禁区'],
    category: '二次元', market: '全球', tags: ['P2游戏', '二次元', 'FPS'],
  },
  {
    seedType: 'entity', text: '少女前线2：追放', score: 55,
    entityType: 'game', aliases: ['少女前线2', '少前2', 'Girls Frontline 2'],
    category: '二次元', market: '全球', tags: ['P2游戏', '二次元', '战棋'],
  },
  {
    seedType: 'entity', text: '蔚蓝档案', score: 60,
    entityType: 'game', aliases: ['Blue Archive', '蔚蓝档案', 'BA'],
    category: '二次元', market: '日本', tags: ['P2游戏', '二次元', 'RPG'],
  },
  {
    seedType: 'entity', text: '妮姬：胜利女神', score: 60,
    entityType: 'game', aliases: ['NIKKE', '妮姬', '胜利女神'],
    category: '二次元', market: '全球', tags: ['P2游戏', '二次元', '射击'],
  },
  {
    seedType: 'entity', text: '剑星', score: 55,
    entityType: 'game', aliases: ['Stellar Blade', '剑星'],
    category: '动作', market: '全球', tags: ['P2游戏', '动作', '韩系'],
  },
  // 女性向
  {
    seedType: 'entity', text: '恋与深空', score: 60,
    entityType: 'game', aliases: ['恋与深空', 'Love and Deepspace'],
    category: '女性向', market: '全球', tags: ['P2游戏', '女性向', '乙女'],
  },
  {
    seedType: 'entity', text: '光与夜之恋', score: 55,
    entityType: 'game', aliases: ['光夜', '光与夜之恋'],
    category: '女性向', market: '国内', tags: ['P2游戏', '女性向', '乙女'],
  },
  {
    seedType: 'entity', text: '以闪亮之名', score: 55,
    entityType: 'game', aliases: ['以闪亮之名', 'Life Makeover'],
    category: '女性向', market: '全球', tags: ['P2游戏', '女性向', '换装'],
  },
  {
    seedType: 'entity', text: '世界之外', score: 55,
    entityType: 'game', aliases: ['世界之外'],
    category: '女性向', market: '国内', tags: ['P2游戏', '女性向'],
  },
  // 体育/竞速
  {
    seedType: 'entity', text: 'EA SPORTS FC', score: 55,
    entityType: 'game', aliases: ['FC 24', 'FC 25', 'FIFA', 'EA FC'],
    category: '体育', market: '全球', tags: ['P2游戏', '足球', '体育'],
  },
  {
    seedType: 'entity', text: 'NBA 2K', score: 50,
    entityType: 'game', aliases: ['NBA 2K', 'NBA2K'],
    category: '体育', market: '全球', tags: ['P2游戏', '篮球', '体育'],
  },
  {
    seedType: 'entity', text: '极限竞速', score: 55,
    entityType: 'game', aliases: ['Forza', '极限竞速', 'Forza Horizon'],
    category: '竞速', market: '全球', tags: ['P2游戏', '竞速', '赛车'],
  },
  // 休闲/沙盒
  {
    seedType: 'entity', text: 'Minecraft', score: 65,
    entityType: 'game', aliases: ['Minecraft', '我的世界', 'MC'],
    category: '沙盒', market: '全球', tags: ['P1游戏', '沙盒', 'UGC'],
  },
  {
    seedType: 'entity', text: 'Fortnite', score: 60,
    entityType: 'game', aliases: ['Fortnite', '堡垒之夜'],
    category: '射击', market: '全球', tags: ['P2游戏', '大逃杀', 'UGC'],
  },
  {
    seedType: 'entity', text: 'Candy Crush', score: 50,
    entityType: 'game', aliases: ['Candy Crush', '糖果传奇'],
    category: '休闲', market: '全球', tags: ['P2游戏', '消除', '休闲'],
  },
  {
    seedType: 'entity', text: 'Royal Match', score: 55,
    entityType: 'game', aliases: ['Royal Match'],
    category: '休闲', market: '全球', tags: ['P2游戏', '消除', '休闲'],
  },
  // 策略/卡牌
  {
    seedType: 'entity', text: '炉石传说', score: 55,
    entityType: 'game', aliases: ['Hearthstone', '炉石传说'],
    category: '卡牌', market: '全球', tags: ['P2游戏', '卡牌', '暴雪'],
  },
  {
    seedType: 'entity', text: '万智牌', score: 50,
    entityType: 'game', aliases: ['MTG', 'Magic: The Gathering', '万智牌'],
    category: '卡牌', market: '全球', tags: ['P2游戏', '卡牌', 'TCG'],
  },
  // 国内其他热门
  {
    seedType: 'entity', text: '寻道大千', score: 55,
    entityType: 'game', aliases: ['寻道大千'],
    category: '修仙', market: '国内', tags: ['P2游戏', '小游戏', '放置'],
  },
  {
    seedType: 'entity', text: '咸鱼之王', score: 55,
    entityType: 'game', aliases: ['咸鱼之王'],
    category: '休闲', market: '国内', tags: ['P2游戏', '小游戏', '放置'],
  },
  {
    seedType: 'entity', text: '冒险岛', score: 50,
    entityType: 'game', aliases: ['冒险岛', 'MapleStory'],
    category: 'MMO', market: '全球', tags: ['P2游戏', 'MMO', '韩系'],
  },
  {
    seedType: 'entity', text: '跑跑卡丁车', score: 45,
    entityType: 'game', aliases: ['跑跑卡丁车', 'KartRider'],
    category: '竞速', market: '全球', tags: ['P3游戏', '竞速'],
  },
  // 近期热门新品
  {
    seedType: 'entity', text: '夺宝奇兵：古老之圈', score: 60,
    entityType: 'game', aliases: ['Indiana Jones', '夺宝奇兵'],
    category: '动作', market: '全球', tags: ['P1游戏', '3A', 'FPS'],
  },
  {
    seedType: 'entity', text: '文明7', score: 60,
    entityType: 'game', aliases: ['Civilization VII', '文明7', '文明'],
    category: '策略', market: '全球', tags: ['P1游戏', '策略', '4X'],
  },
  {
    seedType: 'entity', text: '羊蹄山之魂', score: 55,
    entityType: 'game', aliases: ['Ghost of Yotei', '羊蹄山之魂'],
    category: '动作', market: '全球', tags: ['P2游戏', '3A', '开放世界'],
  },

  // ===== 行业人物 =====
  {
    seedType: 'entity', text: '马化腾', score: 60,
    entityType: 'person', aliases: ['马化腾', 'Pony Ma'],
    category: 'CEO', market: '国内', tags: ['腾讯', '创始人'],
  },
  {
    seedType: 'entity', text: '刘炽平', score: 55,
    entityType: 'person', aliases: ['刘炽平', 'Martin Lau'],
    category: 'CEO', market: '国内', tags: ['腾讯', '总裁'],
  },
  {
    seedType: 'entity', text: '宫本茂', score: 55,
    entityType: 'person', aliases: ['宫本茂', 'Shigeru Miyamoto'],
    category: '制作人', market: '日本', tags: ['任天堂', '传奇制作人'],
  },
  {
    seedType: 'entity', text: '小岛秀夫', score: 60,
    entityType: 'person', aliases: ['小岛秀夫', 'Hideo Kojima'],
    category: '制作人', market: '日本', tags: ['Kojima Productions', '传奇制作人'],
  },
  {
    seedType: 'entity', text: 'Gabe Newell', score: 55,
    entityType: 'person', aliases: ['Gabe Newell', 'G胖', 'Gaben'],
    category: 'CEO', market: '美国', tags: ['Valve', 'Steam', '创始人'],
  },
  {
    seedType: 'entity', text: 'Tim Cook', score: 50,
    entityType: 'person', aliases: ['Tim Cook', '库克'],
    category: 'CEO', market: '美国', tags: ['Apple', 'CEO', '游戏生态'],
  },
  {
    seedType: 'entity', text: '菲尔·斯宾塞', score: 55,
    entityType: 'person', aliases: ['Phil Spencer', '菲尔·斯宾塞'],
    category: '高管', market: '美国', tags: ['微软', 'Xbox', 'CEO'],
  },
  {
    seedType: 'entity', text: 'Jim Ryan', score: 50,
    entityType: 'person', aliases: ['Jim Ryan'],
    category: '高管', market: '美国', tags: ['索尼', 'PlayStation', '前CEO'],
  },
  {
    seedType: 'entity', text: '西木裕贵', score: 50,
    entityType: 'person', aliases: ['西木裕贵'],
    category: '制作人', market: '日本', tags: ['卡普空', '怪物猎人'],
  },
  {
    seedType: 'entity', text: '藤林秀麿', score: 50,
    entityType: 'person', aliases: ['藤林秀麿', 'Hideaki Fujibayashi'],
    category: '制作人', market: '日本', tags: ['任天堂', '塞尔达'],
  },
  {
    seedType: 'entity', text: '青柳洋介', score: 45,
    entityType: 'person', aliases: ['青柳洋介'],
    category: '制作人', market: '日本', tags: ['Square Enix', '最终幻想'],
  },
  {
    seedType: 'entity', text: '陈天桥', score: 50,
    entityType: 'person', aliases: ['陈天桥'],
    category: '创始人', market: '国内', tags: ['盛大', '游戏先驱'],
  },
  {
    seedType: 'entity', text: '池宇峰', score: 50,
    entityType: 'person', aliases: ['池宇峰'],
    category: 'CEO', market: '国内', tags: ['完美世界', '创始人'],
  },
  {
    seedType: 'entity', text: '李逸飞', score: 50,
    entityType: 'person', aliases: ['李逸飞'],
    category: 'CEO', market: '国内', tags: ['三七互娱', '创始人'],
  },
  {
    seedType: 'entity', text: '陈睿', score: 55,
    entityType: 'person', aliases: ['陈睿'],
    category: 'CEO', market: '国内', tags: ['B站', 'CEO'],
  },
  {
    seedType: 'entity', text: '梁汝波', score: 50,
    entityType: 'person', aliases: ['梁汝波'],
    category: 'CEO', market: '国内', tags: ['字节跳动', 'CEO'],
  },

  // ===== 补充话题种子 =====
  {
    seedType: 'topic', text: '主机游戏/3A大作', score: 65,
    topicTag: '主机', relatedEntities: ['PlayStation', 'Xbox', '任天堂', 'EA', '育碧'],
    tags: ['P1话题', '主机', '3A'],
  },
  {
    seedType: 'topic', text: '电竞/赛事', score: 65,
    topicTag: '电竞', relatedEntities: ['英雄联盟', 'VALORANT', 'CS2', 'Dota 2'],
    tags: ['P1话题', '电竞', '赛事'],
  },
  {
    seedType: 'topic', text: '游戏引擎', score: 60,
    topicTag: '引擎', relatedEntities: ['Epic Games', 'Unity'],
    tags: ['P1话题', '技术', '引擎'],
  },
  {
    seedType: 'topic', text: '独立游戏', score: 55,
    topicTag: '独立', relatedEntities: ['Steam'],
    tags: ['P2话题', '独立游戏'],
  },
  {
    seedType: 'topic', text: '游戏上市公司', score: 55,
    topicTag: '上市公司', relatedEntities: ['腾讯', '网易', '完美世界', '三七互娱'],
    tags: ['P2话题', '资本', '财报'],
  },
  {
    seedType: 'topic', text: '乙女/女性向', score: 55,
    topicTag: '乙女', relatedEntities: ['叠纸游戏', '恋与深空', '光与夜之恋'],
    tags: ['P2话题', '女性向', '品类'],
  },
  {
    seedType: 'topic', text: '韩系游戏', score: 55,
    topicTag: '韩系', relatedEntities: ['Shift Up', 'Nexon', 'Krafton', '妮姬', '剑星'],
    tags: ['P2话题', '韩系', '出海'],
  },
  {
    seedType: 'topic', text: '日系游戏', score: 60,
    topicTag: '日系', relatedEntities: ['任天堂', '卡普空', '万代南梦宫', 'Square Enix'],
    tags: ['P1话题', '日系'],
  },
];

console.log(`准备扩充 ${seeds.length} 条种子...\n`);

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
const byEntityType = db.prepare("SELECT entity_type, count(*) as c FROM seeds WHERE seed_type = 'entity' AND entity_type IS NOT NULL GROUP BY entity_type").all();
const byScore = db.prepare('SELECT count(*) as c FROM seeds WHERE score >= 70').get().c;

console.log(`\n=== 种子总数 ===`);
console.log(`总计: ${total} 条`);
console.log(`高分(≥70): ${byScore} 条`);
byType.forEach((r: any) => console.log(`  ${r.seed_type}: ${r.c} 条`));
console.log('\n=== 实体种子按类型 ===');
byEntityType.forEach((r: any) => console.log(`  ${r.entity_type}: ${r.c} 条`));

db.close();
