/**
 * 大规模扩充种子 - Part 5: 更多公司 + 话题/事件补全 → 冲刺 1000
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../data/gi.db'));

interface SeedInput { seedType: 'entity' | 'event' | 'topic'; text: string; score: number; tags: string[]; entityType?: string; aliases?: string[]; category?: string; market?: string; eventType?: string; keywords?: string[]; topicTag?: string; relatedEntities?: string[]; }

const seeds: SeedInput[] = [
  // ===== 更多公司 =====
  { seedType: 'entity', text: '游戏科学', score: 70, entityType: 'company', aliases: ['Game Science','游戏科学'], category: '新锐', market: '国内', tags: ['P1公司','黑神话'] },
  { seedType: 'entity', text: '灵犀互娱', score: 55, entityType: 'company', aliases: ['灵犀互娱','灵犀'], category: '大厂', market: '国内', tags: ['P2公司','阿里','SLG'] },
  { seedType: 'entity', text: '多益网络', score: 50, entityType: 'company', aliases: ['多益','多益网络'], category: '上市公司', market: '国内', tags: ['P2公司','回合制'] },
  { seedType: 'entity', text: '乐元素', score: 50, entityType: 'company', aliases: ['乐元素','Happy Elements'], category: '上市公司', market: '国内', tags: ['P2公司','消除'] },
  { seedType: 'entity', text: '青瓷游戏', score: 55, entityType: 'company', aliases: ['青瓷','青瓷游戏'], category: '新锐', market: '国内', tags: ['P2公司','放置'] },
  { seedType: 'entity', text: '勇仕网络', score: 50, entityType: 'company', aliases: ['勇仕','勇仕网络'], category: '新锐', market: '国内', tags: ['P2公司','二次元'] },
  { seedType: 'entity', text: '凉屋游戏', score: 55, entityType: 'company', aliases: ['凉屋','凉屋游戏'], category: '独立', market: '国内', tags: ['P2公司','Roguelike'] },
  { seedType: 'entity', text: '重组游戏', score: 50, entityType: 'company', aliases: ['重组游戏','Recreate Games'], category: '独立', market: '国内', tags: ['P2公司','猛兽派对'] },
  { seedType: 'entity', text: '柚子游戏', score: 50, entityType: 'company', aliases: ['柚子游戏'], category: '独立', market: '国内', tags: ['P2公司','戴森球'] },
  { seedType: 'entity', text: '鬼谷工作室', score: 45, entityType: 'company', aliases: ['鬼谷工作室'], category: '独立', market: '国内', tags: ['P3公司','鬼谷八荒'] },
  { seedType: 'entity', text: '螺舟工作室', score: 45, entityType: 'company', aliases: ['螺舟工作室'], category: '独立', market: '国内', tags: ['P3公司','太吾绘卷'] },
  { seedType: 'entity', text: '拾元工作室', score: 45, entityType: 'company', aliases: ['拾元工作室'], category: '独立', market: '国内', tags: ['P3公司','三伏'] },
  { seedType: 'entity', text: '烛龙', score: 55, entityType: 'company', aliases: ['烛龙','上海烛龙'], category: '上市公司', market: '国内', tags: ['P2公司','古剑奇谭'] },
  { seedType: 'entity', text: '大宇资讯', score: 55, entityType: 'company', aliases: ['大宇','大宇资讯','Softstar'], category: '上市公司', market: '台湾', tags: ['P2公司','仙剑','轩辕剑'] },
  { seedType: 'entity', text: '智冠科技', score: 45, entityType: 'company', aliases: ['智冠','智冠科技'], category: '上市公司', market: '台湾', tags: ['P3公司'] },
  { seedType: 'entity', text: '游戏橘子', score: 45, entityType: 'company', aliases: ['游戏橘子','Gamania'], category: '上市公司', market: '台湾', tags: ['P3公司'] },
  { seedType: 'entity', text: '江娱互动', score: 50, entityType: 'company', aliases: ['江娱互动','Imba Games'], category: '出海', market: '全球', tags: ['P2公司','SLG'] },
  { seedType: 'entity', text: '点点互动', score: 55, entityType: 'company', aliases: ['点点互动','37Games'], category: '出海', market: '全球', tags: ['P1公司','SLG'] },
  { seedType: 'entity', text: '壳木游戏', score: 50, entityType: 'company', aliases: ['壳木游戏','CamelGames'], category: '出海', market: '全球', tags: ['P2公司','SLG'] },
  { seedType: 'entity', text: '友塔网络', score: 50, entityType: 'company', aliases: ['友塔','友塔网络','Yotta'], category: '出海', market: '全球', tags: ['P2公司','SLG'] },
  { seedType: 'entity', text: '龙创悦动', score: 50, entityType: 'company', aliases: ['龙创悦动','IM30'], category: '出海', market: '全球', tags: ['P2公司','SLG'] },
  { seedType: 'entity', text: '星合互娱', score: 45, entityType: 'company', aliases: ['星合互娱','StarUnion'], category: '出海', market: '全球', tags: ['P3公司','SLG'] },
  { seedType: 'entity', text: '赤子城', score: 45, entityType: 'company', aliases: ['赤子城','赤子城科技'], category: '出海', market: '全球', tags: ['P3公司'] },
  { seedType: 'entity', text: '易幻网络', score: 50, entityType: 'company', aliases: ['易幻','Efun','易幻网络'], category: '出海', market: '全球', tags: ['P2公司'] },
  { seedType: 'entity', text: '创梦天地', score: 50, entityType: 'company', aliases: ['创梦天地','iDreamSky'], category: '上市公司', market: '国内', tags: ['P2公司'] },
  { seedType: 'entity', text: '飞鱼科技', score: 45, entityType: 'company', aliases: ['飞鱼科技'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '中手游', score: 50, entityType: 'company', aliases: ['中手游','CMGE'], category: '上市公司', market: '国内', tags: ['P2公司','IP'] },
  { seedType: 'entity', text: '祖龙娱乐', score: 45, entityType: 'company', aliases: ['祖龙','祖龙娱乐'], category: '上市公司', market: '国内', tags: ['P3公司','MMO'] },
  { seedType: 'entity', text: '火凤燎原', score: 40, entityType: 'company', aliases: ['火凤燎原'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '网龙', score: 50, entityType: 'company', aliases: ['网龙','NetDragon'], category: '上市公司', market: '国内', tags: ['P2公司'] },
  { seedType: 'entity', text: '天盟数码', score: 45, entityType: 'company', aliases: ['天盟','IAG'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '昆仑万维', score: 55, entityType: 'company', aliases: ['昆仑','昆仑万维','Kunlun'], category: '上市公司', market: '国内', tags: ['P2公司','出海','AI'] },
  { seedType: 'entity', text: '掌趣科技', score: 50, entityType: 'company', aliases: ['掌趣','Ourpalm'], category: '上市公司', market: '国内', tags: ['P2公司'] },
  { seedType: 'entity', text: '凯撒文化', score: 45, entityType: 'company', aliases: ['凯撒文化'], category: '上市公司', market: '国内', tags: ['P3公司','IP'] },
  { seedType: 'entity', text: '文投控股', score: 40, entityType: 'company', aliases: ['文投控股'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '天舟文化', score: 40, entityType: 'company', aliases: ['天舟文化'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '晨之科', score: 45, entityType: 'company', aliases: ['晨之科'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '游久游戏', score: 40, entityType: 'company', aliases: ['游久游戏'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '电魂网络', score: 50, entityType: 'company', aliases: ['电魂','电魂网络'], category: '上市公司', market: '国内', tags: ['P2公司','梦三国'] },
  { seedType: 'entity', text: '冰川网络', score: 50, entityType: 'company', aliases: ['冰川网络'], category: '上市公司', market: '国内', tags: ['P2公司'] },
  { seedType: 'entity', text: '百纳千成', score: 40, entityType: 'company', aliases: ['百纳千成'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '富春通信', score: 40, entityType: 'company', aliases: ['富春通信'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '顺网科技', score: 50, entityType: 'company', aliases: ['顺网','顺网科技'], category: '上市公司', market: '国内', tags: ['P2公司','网吧'] },
  { seedType: 'entity', text: '金科文化', score: 45, entityType: 'company', aliases: ['金科文化'], category: '上市公司', market: '国内', tags: ['P3公司'] },
  { seedType: 'entity', text: '杭州电魂', score: 50, entityType: 'company', aliases: ['杭州电魂'], category: '上市公司', market: '国内', tags: ['P2公司'] },
  { seedType: 'entity', text: 'Riot Games', score: 70, entityType: 'company', aliases: ['Riot','拳头游戏'], category: '国际大厂', market: '全球', tags: ['P1公司','LOL','VALORANT'] },
  { seedType: 'entity', text: 'Respawn Entertainment', score: 55, entityType: 'company', aliases: ['Respawn'], category: '国际大厂', market: '全球', tags: ['P2公司','Apex','Titanfall'] },
  { seedType: 'entity', text: 'FromSoftware', score: 65, entityType: 'company', aliases: ['FS社','FromSoftware','FS社'], category: '国际大厂', market: '日本', tags: ['P1公司','魂系','装甲核心'] },
  { seedType: 'entity', text: 'CD Projekt Red', score: 60, entityType: 'company', aliases: ['CDPR','CD Projekt','蠢驴'], category: '国际大厂', market: '全球', tags: ['P2公司','赛博朋克','巫师'] },
  { seedType: 'entity', text: 'Larian Studios', score: 60, entityType: 'company', aliases: ['Larian','拉瑞安'], category: '国际大厂', market: '全球', tags: ['P2公司','博德之门3'] },
  { seedType: 'entity', text: 'Supergiant Games', score: 55, entityType: 'company', aliases: ['Supergiant'], category: '独立', market: '全球', tags: ['P2公司','哈迪斯'] },
  { seedType: 'entity', text: 'Team Cherry', score: 55, entityType: 'company', aliases: ['Team Cherry'], category: '独立', market: '全球', tags: ['P2公司','空洞骑士'] },
  { seedType: 'entity', text: 'Thatgamecompany', score: 55, entityType: 'company', aliases: ['TGC','Thatgamecompany'], category: '独立', market: '全球', tags: ['P2公司','光遇','陈星汉'] },
  { seedType: 'entity', text: 'Atlus', score: 55, entityType: 'company', aliases: ['Atlus','アトラス'], category: '国际大厂', market: '日本', tags: ['P2公司','女神异闻录'] },
  { seedType: 'entity', text: 'SNK', score: 50, entityType: 'company', aliases: ['SNK','拳皇'], category: '国际大厂', market: '日本', tags: ['P2公司','格斗','饿狼传说'] },
  { seedType: 'entity', text: 'Cygames', score: 55, entityType: 'company', aliases: ['Cygames'], category: '国际大厂', market: '日本', tags: ['P2公司','二次元','影之诗'] },
  { seedType: 'entity', text: 'Niantic', score: 55, entityType: 'company', aliases: ['Niantic'], category: '国际大厂', market: '全球', tags: ['P2公司','AR','宝可梦GO'] },
  { seedType: 'entity', text: 'King', score: 55, entityType: 'company', aliases: ['King','Candy Crush'], category: '国际大厂', market: '全球', tags: ['P2公司','超休闲','消除'] },
  { seedType: 'entity', text: 'Dream Games', score: 55, entityType: 'company', aliases: ['Dream Games'], category: '国际大厂', market: '全球', tags: ['P2公司','超休闲','Royal Match'] },
  { seedType: 'entity', text: 'Scopely', score: 50, entityType: 'company', aliases: ['Scopely'], category: '国际大厂', market: '全球', tags: ['P2公司','手游'] },
  { seedType: 'entity', text: 'Zynga', score: 50, entityType: 'company', aliases: ['Zynga'], category: '国际大厂', market: '全球', tags: ['P2公司','社交游戏'] },
  { seedType: 'entity', text: 'Machine Zone', score: 45, entityType: 'company', aliases: ['MZ','Machine Zone'], category: '国际大厂', market: '全球', tags: ['P3公司','SLG'] },
  { seedType: 'entity', text: 'Plarium', score: 45, entityType: 'company', aliases: ['Plarium'], category: '国际大厂', market: '全球', tags: ['P3公司','SLG'] },
  { seedType: 'entity', text: 'Playrix', score: 50, entityType: 'company', aliases: ['Playrix'], category: '国际大厂', market: '全球', tags: ['P2公司','超休闲'] },
  { seedType: 'entity', text: 'Supercell', score: 65, entityType: 'company', aliases: ['Supercell','超级细胞'], category: '国际大厂', market: '全球', tags: ['P1公司','部落冲突'] },
  { seedType: 'entity', text: 'Habby', score: 55, entityType: 'company', aliases: ['Habby','海彼'], category: '出海', market: '全球', tags: ['P2公司','弓箭传说'] },
  { seedType: 'entity', text: 'Nexon', score: 60, entityType: 'company', aliases: ['Nexon'], category: '国际大厂', market: '韩国', tags: ['P2公司','冒险岛'] },
  { seedType: 'entity', text: 'NCsoft', score: 55, entityType: 'company', aliases: ['NCsoft','恩西'], category: '国际大厂', market: '韩国', tags: ['P2公司','天堂'] },
  { seedType: 'entity', text: 'Pearl Abyss', score: 50, entityType: 'company', aliases: ['Pearl Abyss','黑色沙漠'], category: '国际大厂', market: '韩国', tags: ['P2公司','黑色沙漠'] },
  { seedType: 'entity', text: 'Smilegate', score: 50, entityType: 'company', aliases: ['Smilegate'], category: '国际大厂', market: '韩国', tags: ['P2公司','穿越火线'] },
  { seedType: 'entity', text: 'Netmarble', score: 50, entityType: 'company', aliases: ['Netmarble','网石'], category: '国际大厂', market: '韩国', tags: ['P2公司'] },
  { seedType: 'entity', text: 'Com2uS', score: 45, entityType: 'company', aliases: ['Com2uS',' Summoners War'], category: '国际大厂', market: '韩国', tags: ['P3公司'] },
  { seedType: 'entity', text: 'Kakao Games', score: 50, entityType: 'company', aliases: ['Kakao'], category: '国际大厂', market: '韩国', tags: ['P2公司'] },
  { seedType: 'entity', text: 'Sea', score: 55, entityType: 'company', aliases: ['Sea Group','Sea Limited','冬海'], category: '国际大厂', market: '东南亚', tags: ['P2公司','Garena'] },
  { seedType: 'entity', text: 'VNG', score: 50, entityType: 'company', aliases: ['VNG','VNG Games'], category: '国际大厂', market: '东南亚', tags: ['P2公司'] },

  // ===== 更多话题 =====
  { seedType: 'topic', text: '超休闲游戏', score: 60, topicTag: '超休闲', relatedEntities: ['Candy Crush','Royal Match','Monopoly GO'], tags: ['P1话题','品类'] },
  { seedType: 'topic', text: 'SLG策略游戏', score: 65, topicTag: 'SLG', relatedEntities: ['万国觉醒','口袋奇兵','无尽冬日'], tags: ['P1话题','品类','出海'] },
  { seedType: 'topic', text: '传奇游戏', score: 55, topicTag: '传奇', relatedEntities: ['热血传奇','原始传奇'], tags: ['P2话题','品类','买量'] },
  { seedType: 'topic', text: '仙侠游戏', score: 55, topicTag: '仙侠', relatedEntities: ['仙剑奇侠传','古剑奇谭','诛仙'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '武侠游戏', score: 55, topicTag: '武侠', relatedEntities: ['剑网3','逆水寒','天涯明月刀'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '消除游戏', score: 55, topicTag: '消除', relatedEntities: ['开心消消乐','Candy Crush','Royal Match'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '棋牌游戏', score: 55, topicTag: '棋牌', relatedEntities: ['欢乐斗地主','JJ斗地主'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '放置游戏', score: 55, topicTag: '放置', relatedEntities: ['咸鱼之王','寻道大千','剑与远征'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '派对游戏', score: 65, topicTag: '派对', relatedEntities: ['蛋仔派对','元梦之星','猛兽派对'], tags: ['P1话题','品类'] },
  { seedType: 'topic', text: '魂系游戏', score: 60, topicTag: '魂系', relatedEntities: ['艾尔登法环','黑暗之魂','只狼'], tags: ['P1话题','品类','FromSoftware'] },
  { seedType: 'topic', text: 'Roguelike', score: 60, topicTag: 'Roguelike', relatedEntities: ['哈迪斯','杀戮尖塔','元气骑士'], tags: ['P1话题','品类'] },
  { seedType: 'topic', text: '沙盒游戏', score: 55, topicTag: '沙盒', relatedEntities: ['我的世界','迷你世界','Roblox'], tags: ['P2话题','品类','UGC'] },
  { seedType: 'topic', text: '塔防游戏', score: 50, topicTag: '塔防', relatedEntities: ['明日方舟','保卫萝卜'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '自走棋', score: 55, topicTag: '自走棋', relatedEntities: ['金铲铲之战','云顶之弈'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '非对称竞技', score: 50, topicTag: '非对称', relatedEntities: ['第五人格','逃跑吧少年'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '银河恶魔城', score: 55, topicTag: '银河恶魔城', relatedEntities: ['空洞骑士','死亡细胞'], tags: ['P2话题','品类','独立'] },
  { seedType: 'topic', text: '4X策略', score: 50, topicTag: '4X', relatedEntities: ['文明7','群星'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '恐怖游戏', score: 55, topicTag: '恐怖', relatedEntities: ['生化危机','寂静岭','烟火'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '格斗游戏', score: 50, topicTag: '格斗', relatedEntities: ['街霸6','拳皇','铁拳'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '音游', score: 50, topicTag: '音游', relatedEntities: ['节奏大师','跳舞的线','钢琴块2'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: 'AR游戏', score: 50, topicTag: 'AR', relatedEntities: ['Pokémon GO'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: 'RTS即时战略', score: 55, topicTag: 'RTS', relatedEntities: ['星际争霸2','帝国时代4'], tags: ['P2话题','品类','电竞'] },
  { seedType: 'topic', text: 'JRPG', score: 55, topicTag: 'JRPG', relatedEntities: ['最终幻想','女神异闻录','勇者斗恶龙'], tags: ['P2话题','品类','日系'] },
  { seedType: 'topic', text: '共斗游戏', score: 55, topicTag: '共斗', relatedEntities: ['怪物猎人','噬神者'], tags: ['P2话题','品类'] },
  { seedType: 'topic', text: '独立游戏', score: 60, topicTag: '独立', relatedEntities: ['空洞骑士','哈迪斯','太吾绘卷'], tags: ['P1话题','独立游戏'] },
  { seedType: 'topic', text: '游戏IP', score: 55, topicTag: 'IP', relatedEntities: ['黑神话悟空','仙剑','原神'], tags: ['P2话题','IP'] },
  { seedType: 'topic', text: '云游戏', score: 50, topicTag: '云游戏', relatedEntities: ['腾讯云游戏','网易云游戏'], tags: ['P2话题','技术'] },
  { seedType: 'topic', text: '订阅制游戏', score: 55, topicTag: '订阅', relatedEntities: ['Xbox Game Pass','Apple Arcade'], tags: ['P2话题','商业模式'] },
  { seedType: 'topic', text: '买量投放', score: 60, topicTag: '买量', relatedEntities: ['三七互娱','贪玩'], tags: ['P1话题','商业模式'] },
  { seedType: 'topic', text: '游戏变现', score: 55, topicTag: '变现', relatedEntities: [], tags: ['P2话题','商业模式'] },
  { seedType: 'topic', text: '游戏出海东南亚', score: 55, topicTag: '东南亚出海', relatedEntities: ['Mobile Legends','Garena','VNG'], tags: ['P2话题','出海','东南亚'] },
  { seedType: 'topic', text: '游戏出海中东', score: 50, topicTag: '中东出海', relatedEntities: [], tags: ['P2话题','出海','中东'] },
  { seedType: 'topic', text: '游戏出海日韩', score: 55, topicTag: '日韩出海', relatedEntities: ['原神','明日方舟','碧蓝航线'], tags: ['P2话题','出海','日韩'] },
  { seedType: 'topic', text: '游戏出海欧美', score: 55, topicTag: '欧美出海', relatedEntities: ['万国觉醒','Puzzles & Survival'], tags: ['P2话题','出海','欧美'] },
  { seedType: 'topic', text: '小游戏变现', score: 60, topicTag: '小游戏变现', relatedEntities: ['寻道大千','咸鱼之王'], tags: ['P1话题','小游戏','商业模式'] },
  { seedType: 'topic', text: 'AIGC+游戏', score: 65, topicTag: 'AIGC', relatedEntities: ['月之暗面','腾讯','网易'], tags: ['P1话题','AI','AIGC'] },
  { seedType: 'topic', text: '游戏版号发放', score: 70, topicTag: '版号', relatedEntities: [], tags: ['P0话题','政策'] },
  { seedType: 'topic', text: '游戏未成年人保护', score: 60, topicTag: '未成年人保护', relatedEntities: [], tags: ['P1话题','政策'] },

  // ===== 更多事件 =====
  { seedType: 'event', text: '游戏奖项', score: 55, eventType: '舆情', keywords: ['TGA','Golden Joystick','BAFTA','游戏大奖'], tags: ['P2事件','奖项'] },
  { seedType: 'event', text: '游戏展会', score: 65, eventType: '合作', keywords: ['E3','gamescom','ChinaJoy','TGS','GDC','PSX','Xbox Showcase'], tags: ['P1事件','展会'] },
  { seedType: 'event', text: '游戏公司财报', score: 60, eventType: '组织动作', keywords: ['财报','年报','季报','营收','利润','业绩'], tags: ['P1事件','财报'] },
  { seedType: 'event', text: '游戏公司IPO', score: 65, eventType: '融资', keywords: ['IPO','上市','招股书','挂牌'], tags: ['P1事件','资本'] },
  { seedType: 'event', text: '游戏改编影视', score: 55, eventType: '合作', keywords: ['改编','电影','电视剧','动画','影视'], tags: ['P2事件','IP'] },
  { seedType: 'event', text: '游戏社区运营', score: 50, eventType: '舆情', keywords: ['社区','Discord','TapTap','B站','玩家反馈','口碑'], tags: ['P2事件','运营'] },
  { seedType: 'event', text: '游戏安全/外挂', score: 55, eventType: '舆情', keywords: ['外挂','作弊','安全','封号','反外挂'], tags: ['P2事件','安全'] },
  { seedType: 'event', text: '游戏服务器故障', score: 50, eventType: '舆情', keywords: ['服务器','宕机','维护','故障','补偿'], tags: ['P2事件','运营'] },
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

console.log(`Part5 公司+话题+事件: 新增 ${inserted}/${uniqueSeeds.length} 条`);
const total = db.prepare('SELECT count(*) as c FROM seeds').get().c;
console.log(`\n===== 种子总计 =====`);
console.log(`总计: ${total} 条`);
console.log(`\n按类型:`);
db.prepare('SELECT seed_type, count(*) as c FROM seeds GROUP BY seed_type').all().forEach((r: any) => console.log(`  ${r.seed_type}: ${r.c}`));
console.log(`\n实体种子按细分:`);
db.prepare("SELECT entity_type, count(*) as c FROM seeds WHERE seed_type='entity' AND entity_type IS NOT NULL GROUP BY entity_type").all().forEach((r: any) => console.log(`  ${r.entity_type}: ${r.c}`));
db.close();
