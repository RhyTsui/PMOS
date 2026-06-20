/**
 * 大规模扩充种子 - Part 3: PC 游戏（国内 + 国际热门）
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../data/gi.db'));

interface S { seedType: 'entity'; text: string; score: number; tags: string[]; entityType: 'game'; aliases: string[]; category: string; market: string; }
const G = (text: string, score: number, aliases: string[], category: string, tags: string[], market = '国内'): S => ({
  seedType: 'entity', text, score, tags, entityType: 'game', aliases, category, market
});

const seeds: S[] = [
  // ===== 国产 PC 单机 =====
  G('黑神话：悟空', 95, ['Black Myth: Wukong','黑神话','悟空'], '3A', ['P0游戏','3A','动作','游戏科学'], '全球'),
  G('太吾绘卷', 65, ['太吾绘卷'], '独立', ['P1游戏','独立','武侠','螺舟工作室']),
  G('鬼谷八荒', 60, ['鬼谷八荒'], '独立', ['P1游戏','独立','修仙']),
  G('戴森球计划', 70, ['Dyson Sphere Program','戴森球计划'], '独立', ['P1游戏','独立','策略','柚子游戏']),
  G('光明记忆：无限', 55, ['Bright Memory: Infinite','光明记忆'], 'FPS', ['P2游戏','FPS','独立']),
  G('昭和米国物语', 55, ['昭和米国物语'], '冒险', ['P2游戏','冒险','独立']),
  G('暖雪', 55, ['暖雪','Warm Snow'], 'Roguelike', ['P2游戏','Roguelike','动作']),
  G('烟火', 55, ['烟火','Firework'], '解谜', ['P2游戏','解谜','恐怖']),
  G('三伏', 55, ['三伏'], '解谜', ['P2游戏','解谜','恐怖','拾元工作室']),
  G('纸嫁衣系列', 50, ['纸嫁衣','纸嫁衣2','纸嫁衣3','纸嫁衣4','纸嫁衣5','纸嫁衣6'], '解谜', ['P2游戏','解谜','恐怖']),
  G('部落与弯刀', 50, ['部落与弯刀','Sands of Salzaar'], 'RPG', ['P2游戏','独立','RPG']),
  G('山河旅探', 50, ['山河旅探'], '解谜', ['P2游戏','解谜','独立']),
  G('侠隐阁', 50, ['侠隐阁'], 'RPG', ['P2游戏','RPG','武侠']),
  G('紫塞秋风', 45, ['紫塞秋风'], '动作', ['P3游戏','动作','武侠']),
  G('天命奇御', 50, ['天命奇御'], 'RPG', ['P2游戏','RPG','武侠']),
  G('大侠立志传', 55, ['大侠立志传'], 'RPG', ['P2游戏','RPG','武侠','独立']),
  G('逸剑风云决', 50, ['逸剑风云决'], 'RPG', ['P2游戏','RPG','武侠']),
  G('饿狼传说：City of the Wolves', 50, ['Fatal Fury','饿狼传说'], '格斗', ['P2游戏','格斗','SNK']),
  G('完蛋！我被美女包围了', 60, ['完蛋美女','完蛋！我被美女包围了'], '冒险', ['P1游戏','独立','恋爱','爆款']),
  G('猛兽派对', 60, ['Party Animals','猛兽派对'], '派对', ['P1游戏','派对','休闲','重组游戏'], '全球'),
  G('火山的女儿', 50, ['火山的女儿'], '养成', ['P2游戏','养成','独立']),
  G('风来之国', 45, ['风来之国','East of the Moon'], '冒险', ['P3游戏','冒险','独立']),
  G('山海旅人', 45, ['山海旅人'], '解谜', ['P3游戏','解谜','独立']),
  G('落叶岛', 40, ['落叶岛'], '冒险', ['P3游戏','冒险','独立']),
  G('泡沫冬景', 40, ['泡沫冬景'], '冒险', ['P3游戏','冒险','独立']),

  // ===== 经典国产 RPG =====
  G('仙剑奇侠传七', 60, ['仙剑7','仙剑奇侠传七'], 'RPG', ['P2游戏','RPG','仙侠','大宇']),
  G('仙剑奇侠传四', 65, ['仙剑4','仙剑四','仙剑奇侠传四'], 'RPG', ['P1游戏','RPG','仙侠','大宇']),
  G('古剑奇谭三', 60, ['古剑三','古剑奇谭三'], 'RPG', ['P2游戏','RPG','仙侠','烛龙']),
  G('古剑奇谭', 55, ['古剑奇谭'], 'RPG', ['P2游戏','RPG','仙侠','烛龙']),
  G('轩辕剑七', 50, ['轩辕剑7','轩辕剑七'], 'RPG', ['P2游戏','RPG','大宇']),
  G('轩辕剑', 50, ['轩辕剑'], 'RPG', ['P2游戏','RPG','大宇']),
  G('侠客风云传', 50, ['侠客风云传'], 'RPG', ['P2游戏','RPG','武侠']),
  G('河洛群侠传', 45, ['河洛群侠传'], 'RPG', ['P3游戏','RPG','武侠']),
  G('武林志', 45, ['武林志'], 'RPG', ['P3游戏','RPG','武侠']),

  // ===== PC 端网游（国服热门） =====
  G('英雄联盟', 85, ['LOL','League of Legends','英雄联盟'], 'MOBA', ['P0游戏','MOBA','电竞','Riot'], '全球'),
  G('VALORANT', 75, ['无畏契约','VALORANT'], 'FPS', ['P1游戏','FPS','电竞','Riot'], '全球'),
  G('CS2', 75, ['Counter-Strike 2','CSGO','CS2'], 'FPS', ['P1游戏','FPS','电竞','Valve'], '全球'),
  G('Dota 2', 65, ['DOTA2','Dota2'], 'MOBA', ['P2游戏','MOBA','电竞','Valve'], '全球'),
  G('绝地求生', 70, ['PUBG','PUBG PC','绝地求生'], '射击', ['P1游戏','大逃杀','Krafton'], '全球'),
  G('永劫无间', 65, ['NARAKA: BLADEPOINT','永劫无间'], '动作', ['P1游戏','大逃杀','动作','网易'], '全球'),
  G('穿越火线', 60, ['CF','CrossFire','穿越火线'], 'FPS', ['P2游戏','FPS','腾讯']),
  G('逆战', 50, ['逆战'], 'FPS', ['P2游戏','FPS','腾讯']),
  G('使命召唤', 70, ['Call of Duty','COD','使命召唤'], 'FPS', ['P1游戏','FPS','动视暴雪'], '全球'),
  G('守望先锋2', 60, ['Overwatch 2','OW2','守望先锋'], 'FPS', ['P2游戏','FPS','暴雪']),
  G('炉石传说', 65, ['Hearthstone','炉石传说'], '卡牌', ['P1游戏','卡牌','暴雪']),
  G('魔兽世界', 75, ['WoW','World of Warcraft','魔兽世界'], 'MMO', ['P1游戏','MMO','暴雪'], '全球'),
  G('暗黑破坏神4', 65, ['Diablo IV','暗黑4','暗黑破坏神4'], 'ARPG', ['P1游戏','ARPG','暴雪'], '全球'),
  G('暗黑破坏神：不朽', 55, ['Diablo Immortal','暗黑不朽'], 'ARPG', ['P2游戏','ARPG','暴雪']),
  G('风暴英雄', 45, ['Heroes of the Storm','风暴英雄'], 'MOBA', ['P3游戏','MOBA','暴雪']),
  G('星际争霸2', 55, ['StarCraft II','星际争霸2'], 'RTS', ['P2游戏','RTS','电竞','暴雪']),
  G('梦幻西游（端游）', 60, ['梦幻西游端游','梦幻西游电脑版'], 'MMO', ['P2游戏','MMO','网易']),
  G('大话西游2', 50, ['大话西游2','大话西游端游'], 'MMO', ['P2游戏','MMO','网易']),
  G('剑网3', 65, ['剑网3','剑侠情缘3','JX3'], 'MMO', ['P1游戏','MMO','武侠','西山居']),
  G('天涯明月刀', 55, ['天涯明月刀端游','天涯明月刀OL'], 'MMO', ['P2游戏','MMO','武侠','腾讯']),
  G('逆水寒端游', 60, ['逆水寒端游','逆水寒OL'], 'MMO', ['P2游戏','MMO','武侠','网易']),
  G('诛仙世界', 55, ['诛仙世界'], 'MMO', ['P2游戏','MMO','仙侠','完美世界']),
  G('流放之路', 60, ['Path of Exile','POE','流放之路'], 'ARPG', ['P2游戏','ARPG','GGG'], '全球'),
  G('最终幻想14', 70, ['FF14','Final Fantasy XIV','最终幻想14'], 'MMO', ['P1游戏','MMO','Square Enix'], '全球'),
  G('激战2', 55, ['Guild Wars 2','激战2'], 'MMO', ['P2游戏','MMO','NCsoft']),
  G('黑色沙漠', 55, ['Black Desert','黑色沙漠'], 'MMO', ['P2游戏','MMO',' Pearl Abyss']),
  G('天堂W', 45, ['Lineage W','天堂W'], 'MMO', ['P3游戏','MMO','NCsoft']),
  G('失落的方舟', 55, ['Lost Ark','失落的方舟'], 'ARPG', ['P2游戏','ARPG','Smilegate']),
  G('地下城与勇士', 65, ['DNF','Dungeon & Fighter','地下城与勇士'], '动作', ['P1游戏','动作','格斗','腾讯']),
  G('冒险岛', 50, ['MapleStory','冒险岛'], 'MMO', ['P2游戏','MMO','Nexon']),
  G('跑跑卡丁车', 50, ['KartRider','跑跑卡丁车'], '竞速', ['P2游戏','竞速','Nexon']),
  G('枫之谷', 50, ['MapleStory','枫之谷'], 'MMO', ['P2游戏','MMO','Nexon']),
  G('龙之谷', 50, ['Dragon Nest','龙之谷'], '动作', ['P2游戏','动作','Nexon']),

  // ===== Steam 国际热门 =====
  G('GTA 6', 85, ['GTA VI','GTA6','Grand Theft Auto 6'], '开放世界', ['P0游戏','开放世界','Rockstar'], '全球'),
  G('GTA 5', 70, ['GTA V','GTA5'], '开放世界', ['P1游戏','开放世界','Rockstar'], '全球'),
  G('艾尔登法环', 75, ['Elden Ring','老头环','艾尔登法环'], '动作', ['P1游戏','开放世界','魂系','FromSoftware'], '全球'),
  G('塞尔达传说：王国之泪', 80, ['TotK','王国之泪'], '开放世界', ['P1游戏','开放世界','任天堂'], '全球'),
  G('塞尔达传说：旷野之息', 75, ['BotW','旷野之息'], '开放世界', ['P1游戏','开放世界','任天堂'], '全球'),
  G('博德之门3', 80, ['Baldur\'s Gate 3','BG3','博德之门3'], 'RPG', ['P0游戏','RPG','Larian'], '全球'),
  G('星空', 65, ['Starfield','星空'], 'RPG', ['P1游戏','RPG','Bethesda'], '全球'),
  G('赛博朋克2077', 70, ['Cyberpunk 2077','赛博朋克2077'], 'RPG', ['P1游戏','RPG','CDPR'], '全球'),
  G('巫师3', 70, ['The Witcher 3','巫师3'], 'RPG', ['P1游戏','RPG','CDPR'], '全球'),
  G('霍格沃茨之遗', 65, ['Hogwarts Legacy','霍格沃茨之遗'], 'RPG', ['P1游戏','RPG','IP'], '全球'),
  G('战神：诸神黄昏', 70, ['God of War Ragnarok','战神5'], '动作', ['P1游戏','动作','索尼'], '全球'),
  G('蜘蛛侠2', 65, ['Spider-Man 2','蜘蛛侠2'], '动作', ['P1游戏','动作','索尼'], '全球'),
  G('最后生还者2', 65, ['The Last of Us Part II','最后生还者2'], '动作', ['P1游戏','动作','索尼'], '全球'),
  G('对马岛之魂', 60, ['Ghost of Tsushima','对马岛之魂'], '动作', ['P2游戏','动作','索尼'], '全球'),
  G('羊蹄山之魂', 55, ['Ghost of Yotei','羊蹄山之魂'], '动作', ['P2游戏','动作','索尼'], '全球'),
  G('怪物猎人：荒野', 70, ['Monster Hunter Wilds','怪猎荒野'], '动作', ['P1游戏','共斗','卡普空'], '全球'),
  G('怪物猎人：世界', 65, ['Monster Hunter: World','MHW','怪物猎人世界'], '动作', ['P1游戏','共斗','卡普空'], '全球'),
  G('生化危机4 重制版', 65, ['Resident Evil 4','生化危机4重制版'], '动作', ['P1游戏','恐怖','卡普空'], '全球'),
  G('街头霸王6', 60, ['Street Fighter 6','街霸6'], '格斗', ['P2游戏','格斗','卡普空'], '全球'),
  G('恶魔之魂', 55, ['Demon\'s Souls','恶魔之魂'], '动作', ['P2游戏','魂系','索尼'], '全球'),
  G('黑暗之魂3', 60, ['Dark Souls 3','黑魂3'], '动作', ['P2游戏','魂系','FromSoftware'], '全球'),
  G('只狼', 65, ['Sekiro','只狼'], '动作', ['P1游戏','魂系','FromSoftware'], '全球'),
  G('血源诅咒', 60, ['Bloodborne','血源诅咒'], '动作', ['P2游戏','魂系','FromSoftware'], '全球'),
  G('空洞骑士：丝之歌', 65, ['Hollow Knight: Silksong','丝之歌'], '独立', ['P1游戏','银河恶魔城','Team Cherry'], '全球'),
  G('空洞骑士', 60, ['Hollow Knight','空洞骑士'], '独立', ['P2游戏','银河恶魔城','Team Cherry'], '全球'),
  G('哈迪斯2', 65, ['Hades II','哈迪斯2'], 'Roguelike', ['P1游戏','Roguelike','Supergiant'], '全球'),
  G('哈迪斯', 65, ['Hades','哈迪斯'], 'Roguelike', ['P1游戏','Roguelike','Supergiant'], '全球'),
  G('死亡细胞', 55, ['Dead Cells','死亡细胞'], 'Roguelike', ['P2游戏','Roguelike','动作']),
  G('以撒的结合：忏悔', 60, ['The Binding of Isaac: Repentance','以撒的结合'], 'Roguelike', ['P2游戏','Roguelike']),
  G('杀戮尖塔2', 65, ['Slay the Spire 2','STS2'], '卡牌', ['P1游戏','Roguelike','卡牌']),
  G('文明7', 65, ['Civilization VII','文明7'], '策略', ['P1游戏','策略','4X','2K']),
  G('文明6', 60, ['Civilization VI','文明6'], '策略', ['P2游戏','策略','4X','2K']),
  G('十字军之王3', 60, ['Crusader Kings III','CK3'], '策略', ['P2游戏','策略','P社']),
  G('欧陆风云4', 55, ['Europa Universalis IV','EU4'], '策略', ['P2游戏','策略','P社']),
  G('群星', 60, ['Stellaris','群星'], '策略', ['P2游戏','策略','P社','太空']),
  G('维多利亚3', 55, ['Victoria 3','维多利亚3'], '策略', ['P2游戏','策略','P社']),
  G('城市：天际线2', 55, ['Cities: Skylines II','天际线2'], '模拟', ['P2游戏','模拟','经营']),
  G('模拟人生4', 60, ['The Sims 4','模拟人生4'], '模拟', ['P2游戏','模拟','EA'], '全球'),
  G('双点医院', 50, ['Two Point Hospital','双点医院'], '模拟', ['P2游戏','模拟','经营']),
  G('双点校园', 45, ['Two Point Campus','双点校园'], '模拟', ['P3游戏','模拟','经营']),
  G('星露谷物语', 65, ['Stardew Valley','星露谷物语'], '模拟', ['P1游戏','模拟','独立','农场']),
  G('动物森友会', 70, ['Animal Crossing','动物森友会','动森'], '模拟', ['P1游戏','模拟','任天堂'], '全球'),
  G('集合啦！动物森友会', 65, ['集合啦动森'], '模拟', ['P1游戏','模拟','任天堂']),
  G('宝可梦 朱/紫', 65, ['Pokémon Scarlet/Violet','宝可梦朱紫'], 'RPG', ['P1游戏','RPG','任天堂'], '全球'),
  G('马里奥：惊奇', 65, ['Super Mario Bros. Wonder','马里奥惊奇'], '平台', ['P1游戏','平台','任天堂'], '全球'),
  G('马里奥赛车8', 60, ['Mario Kart 8','马车8'], '竞速', ['P2游戏','竞速','任天堂'], '全球'),
  G('任天堂明星大乱斗', 60, ['Super Smash Bros','大乱斗'], '格斗', ['P2游戏','格斗','任天堂'], '全球'),
  G('火焰纹章：Engage', 55, ['Fire Emblem Engage','火焰纹章Engage'], 'SRPG', ['P2游戏','SRPG','任天堂'], '全球'),
  G('异度神剑3', 60, ['Xenoblade Chronicles 3','异度神剑3'], 'RPG', ['P2游戏','RPG','任天堂'], '全球'),
  G('女神异闻录5 皇家版', 65, ['P5R','Persona 5 Royal'], 'RPG', ['P1游戏','RPG','Atlus'], '全球'),
  G('女神异闻录3 Reload', 60, ['P3R','Persona 3 Reload'], 'RPG', ['P2游戏','RPG','Atlus'], '全球'),
  G('最终幻想7 重生', 70, ['FF7 Rebirth','最终幻想7重生'], 'RPG', ['P1游戏','RPG','Square Enix'], '全球'),
  G('最终幻想16', 60, ['FF16','最终幻想16'], 'RPG', ['P2游戏','RPG','Square Enix'], '全球'),
  G('勇者斗恶龙12', 55, ['DQ12','勇者斗恶龙12'], 'RPG', ['P2游戏','RPG','Square Enix'], '全球'),
  G('如龙8', 60, ['Like a Dragon: Infinite Wealth','如龙8'], 'RPG', ['P2游戏','RPG','世嘉'], '全球'),
  G('龙珠：电光炸裂！ZERO', 55, ['Dragon Ball: Sparking! ZERO','龙珠电光炸裂'], '格斗', ['P2游戏','格斗','万代'], '全球'),
  G('海贼王：时光旅诗', 50, ['One Piece Odyssey','海贼王时光旅诗'], 'RPG', ['P2游戏','RPG','万代'], '全球'),
  G('火影忍者：终极风暴', 55, ['Naruto Ultimate Ninja Storm','火影忍者终极风暴'], '格斗', ['P2游戏','格斗','万代'], '全球'),
  G('七龙珠Z：卡卡罗特', 55, ['Dragon Ball Z: Kakarot','龙珠卡卡罗特'], 'RPG', ['P2游戏','RPG','万代'], '全球'),
  G('刺客信条：影', 60, ['Assassin\'s Creed Shadow','刺客信条影'], '动作', ['P1游戏','动作','育碧'], '全球'),
  G('刺客信条：幻景', 55, ['Assassin\'s Creed Mirage','刺客信条幻景'], '动作', ['P2游戏','动作','育碧'], '全球'),
  G('孤岛惊魂', 55, ['Far Cry','孤岛惊魂'], 'FPS', ['P2游戏','FPS','育碧'], '全球'),
  G('看门狗', 50, ['Watch Dogs','看门狗'], '动作', ['P2游戏','动作','育碧'], '全球'),
  G('彩虹六号：围攻', 60, ['Rainbow Six Siege','R6','彩六'], 'FPS', ['P2游戏','FPS','育碧'], '全球'),
  G('阿凡达：潘多拉边境', 55, ['Avatar: Frontiers of Pandora','阿凡达潘多拉'], '动作', ['P2游戏','动作','育碧','IP'], '全球'),
  G('星球大战：亡命之徒', 55, ['Star Wars Outlaws','星战亡命之徒'], '动作', ['P2游戏','动作','育碧','IP'], '全球'),
  G('帝国时代4', 55, ['Age of Empires IV','帝国时代4'], 'RTS', ['P2游戏','RTS','微软'], '全球'),
  G('极限竞速：地平线5', 60, ['Forza Horizon 5','极限竞速地平线5'], '竞速', ['P2游戏','竞速','微软'], '全球'),
  G('微软飞行模拟', 55, ['Microsoft Flight Simulator','微软飞行模拟'], '模拟', ['P2游戏','模拟','微软'], '全球'),
  G('光环：无限', 55, ['Halo Infinite','光环无限'], 'FPS', ['P2游戏','FPS','微软'], '全球'),
  G('EA SPORTS FC 25', 55, ['EA FC 25','FC 25','EA SPORTS FC'], '体育', ['P2游戏','足球','体育','EA'], '全球'),
  G('NBA 2K25', 50, ['NBA 2K25'], '体育', ['P2游戏','篮球','体育','2K'], '全球'),
  G('F1 24', 50, ['F1 24'], '竞速', ['P2游戏','竞速','体育','EA'], '全球'),
  G('WWE 2K', 45, ['WWE 2K24'], '格斗', ['P3游戏','格斗','体育','2K'], '全球'),
  G('火箭联盟', 55, ['Rocket League','火箭联盟'], '体育', ['P2游戏','体育','竞速','Psyonix'], '全球'),
  G('Fortnite', 65, ['堡垒之夜','Fortnite'], '射击', ['P1游戏','大逃杀','Epic'], '全球'),
  G('Apex Legends', 65, ['Apex','Apex英雄','Apex Legends'], 'FPS', ['P1游戏','FPS','EA','Respawn'], '全球'),
  G('Titanfall 2', 55, ['Titanfall 2','泰坦陨落2'], 'FPS', ['P2游戏','FPS','EA','Respawn'], '全球'),
  G('战地2042', 55, ['Battlefield 2042','战地2042'], 'FPS', ['P2游戏','FPS','EA'], '全球'),
  G('质量效应：传奇版', 55, ['Mass Effect Legendary','质量效应传奇版'], 'RPG', ['P2游戏','RPG','EA'], '全球'),
  G('死亡空间', 55, ['Dead Space','死亡空间'], '恐怖', ['P2游戏','恐怖','EA'], '全球'),
  G('木卫四协议', 45, ['The Callisto Protocol','木卫四协议'], '恐怖', ['P3游戏','恐怖'], '全球'),
  G('生化危机：村庄', 60, ['Resident Evil Village','生化8'], '恐怖', ['P2游戏','恐怖','卡普空'], '全球'),
  G('寂静岭2 重制版', 60, ['Silent Hill 2 Remake','寂静岭2重制版'], '恐怖', ['P2游戏','恐怖','KONAMI'], '全球'),
  G('心灵杀手2', 55, ['Alan Wake 2','心灵杀手2'], '恐怖', ['P2游戏','恐怖','Remedy'], '全球'),
  G('控制', 50, ['Control','控制'], '动作', ['P2游戏','动作','Remedy']),
  G('Returnal', 55, ['Returnal','_RETURNAL'], 'Roguelike', ['P2游戏','Roguelike','索尼'], '全球'),
  G('最后生还者', 65, ['The Last of Us','最后生还者'], '动作', ['P1游戏','动作','索尼'], '全球'),
  G('地平线：西之绝境', 60, ['Horizon Forbidden West','地平线2'], '动作', ['P2游戏','动作','索尼'], '全球'),
  G('瑞奇与叮当：时空跳转', 55, ['Ratchet & Clank: Rift Apart'], '动作', ['P2游戏','动作','索尼'], '全球'),
  G('最终幻想7 重制版', 65, ['FF7 Remake','最终幻想7重制版'], 'RPG', ['P1游戏','RPG','Square Enix'], '全球'),
  G('尼尔：自动人形', 60, ['NieR: Automata','尼尔自动人形'], '动作', ['P2游戏','动作','Square Enix'], '全球'),
  G('王国之心3', 55, ['Kingdom Hearts III','王国之心3'], 'RPG', ['P2游戏','RPG','Square Enix'], '全球'),
  G('装甲核心6', 60, ['Armored Core VI','装甲核心6'], '动作', ['P2游戏','机甲','FromSoftware'], '全球'),
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

console.log(`Part3 PC游戏: 新增 ${inserted}/${uniqueSeeds.length} 条`);
const total = db.prepare('SELECT count(*) as c FROM seeds').get().c;
console.log(`当前种子总数: ${total}`);
db.close();
