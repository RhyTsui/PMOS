/**
 * 大规模扩充种子 - Part 6: 最终冲刺 1000
 * 补充更多国际手游、日本游戏、人物、话题
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../data/gi.db'));

interface S { seedType: 'entity' | 'event' | 'topic'; text: string; score: number; tags: string[]; entityType?: string; aliases?: string[]; category?: string; market?: string; eventType?: string; keywords?: string[]; topicTag?: string; relatedEntities?: string[]; }

const seeds: S[] = [
  // ===== 更多国际手游 =====
  { seedType: 'entity', text: 'Candy Crush Soda Saga', score: 45, entityType: 'game', aliases: ['Candy Crush Soda'], category: '消除', market: '全球', tags: ['P3游戏','超休闲','King'] },
  { seedType: 'entity', text: 'Farm Heroes Saga', score: 40, entityType: 'game', aliases: ['Farm Heroes'], category: '消除', market: '全球', tags: ['P3游戏','超休闲','King'] },
  { seedType: 'entity', text: 'Pet Rescue', score: 45, entityType: 'game', aliases: ['Pet Rescue'], category: '消除', market: '全球', tags: ['P3游戏','超休闲','King'] },
  { seedType: 'entity', text: 'Puzzle & Dragons', score: 55, entityType: 'game', aliases: ['PAD','龙族拼图','P&D'], category: 'RPG', market: '日本', tags: ['P2游戏','RPG','GungHo'] },
  { seedType: 'entity', text: 'Monster Strike', score: 50, entityType: 'game', aliases: ['モンスターストライク','怪物弹珠'], category: 'RPG', market: '日本', tags: ['P2游戏','RPG','Mixi'] },
  { seedType: 'entity', text: 'Fate/Grand Order', score: 65, entityType: 'game', aliases: ['FGO','FGO手游'], category: 'RPG', market: '日本', tags: ['P1游戏','RPG','二次元','Type-Moon'] },
  { seedType: 'entity', text: 'Uma Musume', score: 55, entityType: 'game', aliases: ['ウマ娘','赛马娘'], category: '养成', market: '日本', tags: ['P2游戏','养成','二次元','Cygames'] },
  { seedType: 'entity', text: 'Granblue Fantasy', score: 50, entityType: 'game', aliases: ['GBF','グランブルーファンタジー'], category: 'RPG', market: '日本', tags: ['P2游戏','RPG','Cygames'] },
  { seedType: 'entity', text: 'Idoly Pride', score: 45, entityType: 'game', aliases: ['アイドリープライド','偶像荣耀'], category: '养成', market: '日本', tags: ['P3游戏','养成','偶像'] },
  { seedType: 'entity', text: 'Project SEKAI', score: 55, entityType: 'game', aliases: ['プロセカ','世界计划','pjsk'], category: '音游', market: '日本', tags: ['P2游戏','音游','二次元','SEGA'] },
  { seedType: 'entity', text: 'BanG Dream!', score: 50, entityType: 'game', aliases: ['ガルパ','BanG Dream','邦邦'], category: '音游', market: '日本', tags: ['P2游戏','音游','二次元'] },
  { seedType: 'entity', text: 'Ensemble Stars', score: 50, entityType: 'game', aliases: ['あんさんぶるスターズ','偶像梦幻祭'], category: '养成', market: '日本', tags: ['P2游戏','养成','偶像'] },
  { seedType: 'entity', text: 'Touhou LostWord', score: 45, entityType: 'game', aliases: ['東方LostWord'], category: 'RPG', market: '日本', tags: ['P3游戏','RPG','东方'] },
  { seedType: 'entity', text: 'Dragon Quest Walk', score: 50, entityType: 'game', aliases: ['ドラクエウォーク','DQW'], category: 'RPG', market: '日本', tags: ['P2游戏','RPG','AR'] },
  { seedType: 'entity', text: 'Honkai Impact 3rd', score: 70, entityType: 'game', aliases: ['崩坏3','崩3','HI3'], category: '动作', market: '全球', tags: ['P1游戏','动作','米哈游'] },
  { seedType: 'entity', text: 'Tower of Fantasy', score: 55, entityType: 'game', aliases: ['幻塔','ToC'], category: '开放世界', market: '全球', tags: ['P2游戏','开放世界','完美世界'] },
  { seedType: 'entity', text: 'Punishing Gray Raven', score: 55, entityType: 'game', aliases: ['战双帕弥什','PGR'], category: '动作', market: '全球', tags: ['P2游戏','动作','库洛'] },
  { seedType: 'entity', text: 'Reverse: 1999', score: 60, entityType: 'game', aliases: ['重返未来1999','1999'], category: '卡牌', market: '全球', tags: ['P2游戏','卡牌','深蓝'] },
  { seedType: 'entity', text: 'AFK Journey', score: 55, entityType: 'game', aliases: ['剑与远征2','AFK2'], category: '放置', market: '全球', tags: ['P2游戏','放置','莉莉丝'] },
  { seedType: 'entity', text: 'Wuthering Waves', score: 85, entityType: 'game', aliases: ['鸣潮','WW'], category: '开放世界', market: '全球', tags: ['P0游戏','开放世界','库洛'] },
  { seedType: 'entity', text: 'Zenless Zone Zero', score: 80, entityType: 'game', aliases: ['绝区零','ZZZ'], category: '动作', market: '全球', tags: ['P1游戏','动作','米哈游'] },
  { seedType: 'entity', text: 'Identity V', score: 60, entityType: 'game', aliases: ['第五人格'], category: '非对称', market: '全球', tags: ['P2游戏','非对称','网易'] },
  { seedType: 'entity', text: 'Sky: Children of the Light', score: 60, entityType: 'game', aliases: ['光遇','Sky光遇'], category: '冒险', market: '全球', tags: ['P2游戏','社交','陈星汉'] },
  { seedType: 'entity', text: 'Diablo Immortal', score: 55, entityType: 'game', aliases: ['暗黑破坏神不朽','暗黑不朽'], category: 'ARPG', market: '全球', tags: ['P2游戏','ARPG','暴雪'] },
  { seedType: 'entity', text: 'Hearthstone', score: 60, entityType: 'game', aliases: ['炉石传说'], category: '卡牌', market: '全球', tags: ['P2游戏','卡牌','暴雪'] },
  { seedType: 'entity', text: 'Marvel Snap', score: 55, entityType: 'game', aliases: ['Marvel Snap','漫威终极逆转'], category: '卡牌', market: '全球', tags: ['P2游戏','卡牌','IP'] },
  { seedType: 'entity', text: 'Call of Duty: Warzone Mobile', score: 55, entityType: 'game', aliases: ['COD Warzone Mobile'], category: 'FPS', market: '全球', tags: ['P2游戏','FPS','动视'] },
  { seedType: 'entity', text: 'Assassin\'s Creed Jade', score: 55, entityType: 'game', aliases: ['刺客信条Jade','AC手游'], category: '动作', market: '全球', tags: ['P2游戏','动作','育碧'] },
  { seedType: 'entity', text: 'Rainbow Six Mobile', score: 50, entityType: 'game', aliases: ['R6手游','彩六手游'], category: 'FPS', market: '全球', tags: ['P2游戏','FPS','育碧'] },
  { seedType: 'entity', text: 'The Division Resurgence', score: 50, entityType: 'game', aliases: ['全境封锁手游'], category: '射击', market: '全球', tags: ['P2游戏','射击','育碧'] },
  { seedType: 'entity', text: 'Avatar: Reckoning', score: 50, entityType: 'game', aliases: ['阿凡达手游'], category: 'FPS', market: '全球', tags: ['P2游戏','FPS','IP'] },
  { seedType: 'entity', text: 'Judas', score: 50, entityType: 'game', aliases: ['Judas'], category: 'FPS', market: '全球', tags: ['P2游戏','FPS','Gears'] },
  { seedType: 'entity', text: 'Silent Hill: Ascension', score: 45, entityType: 'game', aliases: ['寂静岭：升天'], category: '恐怖', market: '全球', tags: ['P3游戏','恐怖','互动剧'] },
  { seedType: 'entity', text: 'Sonic Frontiers', score: 55, entityType: 'game', aliases: ['索尼克未知边境','ソニックフロンティア'], category: '动作', market: '全球', tags: ['P2游戏','动作','SEGA'] },
  { seedType: 'entity', text: 'Persona 5: The Phantom X', score: 55, entityType: 'game', aliases: ['P5X','女神异闻录夜幕魅影'], category: 'RPG', market: '全球', tags: ['P2游戏','RPG','Atlus'] },
  { seedType: 'entity', text: 'Sword of Convallaria', score: 45, entityType: 'game', aliases: ['钢岚'], category: 'SRPG', market: '全球', tags: ['P3游戏','SRPG','紫龙'] },
  { seedType: 'entity', text: 'Dislyte', score: 45, entityType: 'game', aliases: ['神位纷争'], category: 'RPG', market: '全球', tags: ['P3游戏','RPG','莉莉丝'] },
  { seedType: 'entity', text: 'Watcher of Realms', score: 50, entityType: 'game', aliases: ['Watcher of Realms'], category: 'RPG', market: '全球', tags: ['P2游戏','RPG','出海'] },
  { seedType: 'entity', text: 'Dragonheir: Silent Gods', score: 50, entityType: 'game', aliases: ['龙息：神寂'], category: 'RPG', market: '全球', tags: ['P2游戏','RPG','出海'] },
  { seedType: 'entity', text: 'Dark Tide: Aftermath', score: 40, entityType: 'game', aliases: ['暗潮'], category: 'SLG', market: '全球', tags: ['P3游戏','SLG'] },

  // ===== 更多日本手游 =====
  { seedType: 'entity', text: 'Arknights', score: 80, entityType: 'game', aliases: ['明日方舟'], category: '塔防', market: '全球', tags: ['P1游戏','塔防','鹰角'] },
  { seedType: 'entity', text: 'Azur Lane', score: 55, entityType: 'game', aliases: ['碧蓝航线'], category: '射击', market: '全球', tags: ['P2游戏','二次元','B站'] },
  { seedType: 'entity', text: 'Princess Connect! Re:Dive', score: 45, entityType: 'game', aliases: ['公主连结Re:Dive','PCR'], category: 'RPG', market: '日本', tags: ['P3游戏','RPG','Cygames'] },
  { seedType: 'entity', text: 'Blue Archive', score: 60, entityType: 'game', aliases: ['蔚蓝档案','BA'], category: 'RPG', market: '日本', tags: ['P2游戏','RPG','二次元'] },
  { seedType: 'entity', text: 'NIKKE: Goddess of Victory', score: 60, entityType: 'game', aliases: ['妮姬','胜利女神NIKKE'], category: '射击', market: '全球', tags: ['P2游戏','射击','Shift Up'] },
  { seedType: 'entity', text: 'Goddess of Victory: NIKKE', score: 60, entityType: 'game', aliases: ['NIKKE','妮姬'], category: '射击', market: '全球', tags: ['P2游戏','射击','韩系'] },
  { seedType: 'entity', text: 'Stellar Blade', score: 55, entityType: 'game', aliases: ['剑星'], category: '动作', market: '全球', tags: ['P2游戏','动作','Shift Up'] },
  { seedType: 'entity', text: 'Love and Deepspace', score: 55, entityType: 'game', aliases: ['恋与深空'], category: '女性向', market: '全球', tags: ['P2游戏','乙女','叠纸'] },
  { seedType: 'entity', text: 'Shining Nikki', score: 50, entityType: 'game', aliases: ['闪耀暖暖'], category: '女性向', market: '全球', tags: ['P2游戏','换装','叠纸'] },
  { seedType: 'entity', text: 'Infinity Nikki', score: 65, entityType: 'game', aliases: ['无限暖暖'], category: '开放世界', market: '全球', tags: ['P1游戏','开放世界','叠纸'] },
  { seedType: 'entity', text: 'Life Makeover', score: 50, entityType: 'game', aliases: ['以闪亮之名'], category: '女性向', market: '全球', tags: ['P2游戏','换装'] },

  // ===== 更多人物 =====
  { seedType: 'entity', text: '沈杰', score: 45, entityType: 'person', aliases: ['沈杰'], category: '制作人', market: '国内', tags: ['灵犀互娱','三国志战略版'] },
  { seedType: 'entity', text: '陈默', score: 45, entityType: 'person', aliases: ['陈默'], category: '制作人', market: '国内', tags: ['三七互娱'] },
  { seedType: 'entity', text: '戴坤', score: 45, entityType: 'person', aliases: ['戴坤'], category: '高管', market: '国内', tags: ['三七互娱'] },
  { seedType: 'entity', text: '陈菲', score: 45, entityType: 'person', aliases: ['陈菲'], category: '高管', market: '国内', tags: ['完美世界'] },
  { seedType: 'entity', text: '王巍', score: 50, entityType: 'person', aliases: ['王巍'], category: 'CEO', market: '国内', tags: ['散爆网络','少女前线'] },
  { seedType: 'entity', text: '海猫络合物', score: 55, entityType: 'person', aliases: ['海猫','钟祺翔'], category: '制作人', market: '国内', tags: ['鹰角','明日方舟'] },
  { seedType: 'entity', text: '唯@工作室', score: 45, entityType: 'person', aliases: ['唯'], category: '制作人', market: '国内', tags: ['鹰角','明日方舟','美术'] },
  { seedType: 'entity', text: 'Inazo', score: 45, entityType: 'person', aliases: ['Inazo','稻叶_at'], category: '制作人', market: '国内', tags: ['深蓝互动','尘白禁区'] },
  { seedType: 'entity', text: '李松伦', score: 50, entityType: 'person', aliases: ['李松伦','Solazero'], category: 'CEO', market: '国内', tags: ['库洛科技','鸣潮'] },
  { seedType: 'entity', text: '姚润昊', score: 55, entityType: 'person', aliases: ['姚润昊','暖暖系列'], category: 'CEO', market: '国内', tags: ['叠纸游戏','创始人'] },
  { seedType: 'entity', text: '大黑', score: 45, entityType: 'person', aliases: ['大黑','大黑狼'], category: '制作人', market: '国内', tags: ['散爆网络'] },
  { seedType: 'entity', text: '羽中', score: 50, entityType: 'person', aliases: ['羽中','MICA'], category: '制作人', market: '国内', tags: ['散爆网络','少女前线'] },
  { seedType: 'entity', text: '藤井毅', score: 45, entityType: 'person', aliases: ['藤井毅'], category: '制作人', market: '日本', tags: ['Cygames'] },
  { seedType: 'entity', text: '金亨泰', score: 55, entityType: 'person', aliases: ['Kim Hyung-Tae','김형태'], category: '制作人', market: '韩国', tags: ['Shift Up','妮姬','剑星'] },
  { seedType: 'entity', text: '冈部真央', score: 45, entityType: 'person', aliases: ['冈部真央'], category: '制作人', market: '日本', tags: ['Square Enix'] },
  { seedType: 'entity', text: '吉田直树', score: 55, entityType: 'person', aliases: ['Naoki Yoshida','P叔'], category: '制作人', market: '日本', tags: ['FF14','Square Enix'] },
  { seedType: 'entity', text: '横尾太郎', score: 55, entityType: 'person', aliases: ['Yoko Taro'], category: '制作人', market: '日本', tags: ['尼尔','龙背上的骑兵'] },
  { seedType: 'entity', text: '野村哲也', score: 50, entityType: 'person', aliases: ['Tetsuya Nomura'], category: '制作人', market: '日本', tags: ['王国之心','最终幻想'] },
  { seedType: 'entity', text: '桥野桂', score: 50, entityType: 'person', aliases: ['Katsura Hashino'], category: '制作人', market: '日本', tags: ['女神异闻录','真女神转生'] },
  { seedType: 'entity', text: '樱井政博', score: 50, entityType: 'person', aliases: ['Masahiro Sakurai'], category: '制作人', market: '日本', tags: ['大乱斗','任天堂'] },
  { seedType: 'entity', text: '须田刚一', score: 50, entityType: 'person', aliases: ['Suda51','Goichi Suda'], category: '制作人', market: '日本', tags: ['Grasshopper','杀手7'] },
  { seedType: 'entity', text: '稻叶敦志', score: 50, entityType: 'person', aliases: ['Atsushi Inaba'], category: '制作人', market: '日本', tags: ['白金工作室'] },
  { seedType: 'entity', text: '小林裕幸', score: 45, entityType: 'person', aliases: ['Hiroyuki Kobayashi'], category: '制作人', market: '日本', tags: ['卡普空','生化危机'] },
  { seedType: 'entity', text: '竹内润', score: 45, entityType: 'person', aliases: ['Jun Takeuchi'], category: '高管', market: '日本', tags: ['卡普空','COO'] },
  { seedType: 'entity', text: '松田洋祐', score: 50, entityType: 'person', aliases: ['Yosuke Matsuda'], category: '高管', market: '日本', tags: ['Square Enix','前社长'] },
  { seedType: 'entity', text: '桐生隆司', score: 45, entityType: 'person', aliases: ['Takashi Kiryu'], category: '高管', market: '日本', tags: ['Square Enix','社长'] },
  { seedType: 'entity', text: 'Phil Harrison', score: 45, entityType: 'person', aliases: ['Phil Harrison'], category: '高管', market: '美国', tags: ['Atari','微软','前高管'] },
  { seedType: 'entity', text: 'Larry Hryb', score: 40, entityType: 'person', aliases: ['Major Nelson','Larry Hryb'], category: '高管', market: '美国', tags: ['Xbox','发言人'] },
  { seedType: 'entity', text: 'Aaron Greenberg', score: 45, entityType: 'person', aliases: ['Aaron Greenberg'], category: '高管', market: '美国', tags: ['Xbox','营销'] },
  { seedType: 'entity', text: 'Matt Booty', score: 45, entityType: 'person', aliases: ['Matt Booty'], category: '高管', market: '美国', tags: ['Xbox','工作室'] },
  { seedType: 'entity', text: 'Sarah Bond', score: 50, entityType: 'person', aliases: ['Sarah Bond'], category: '高管', market: '美国', tags: ['Xbox','CEO'] },
  { seedType: 'entity', text: 'Hugo Martin', score: 45, entityType: 'person', aliases: ['Hugo Martin'], category: '制作人', market: '美国', tags: ['id Software','DOOM'] },
  { seedType: 'entity', text: 'Marty Stratton', score: 45, entityType: 'person', aliases: ['Marty Stratton'], category: '制作人', market: '美国', tags: ['id Software','DOOM'] },
  { seedType: 'entity', text: 'Tim Willits', score: 45, entityType: 'person', aliases: ['Tim Willits'], category: '制作人', market: '美国', tags: ['id Software'] },
  { seedType: 'entity', text: 'Jesse Rapczak', score: 45, entityType: 'person', aliases: ['Jesse Rapczak'], category: 'CEO', market: '美国', tags: ['Epic','Fortnite'] },
  { seedType: 'entity', text: 'Donald Mustard', score: 45, entityType: 'person', aliases: ['Donald Mustard'], category: '制作人', market: '美国', tags: ['Epic','Chair'] },
  { seedType: 'entity', text: 'Cliff Bleszinski', score: 50, entityType: 'person', aliases: ['CliffyB','Cliff Bleszinski'], category: '制作人', market: '美国', tags: ['Epic','Gears of War','创始人'] },
  { seedType: 'entity', text: 'Mark Rein', score: 45, entityType: 'person', aliases: ['Mark Rein'], category: '高管', market: '美国', tags: ['Epic','VP'] },
  { seedType: 'entity', text: 'Sylvain Cornillon', score: 40, entityType: 'person', aliases: ['Sylvain Cornillon'], category: '高管', market: '法国', tags: ['育碧','CTO'] },
  { seedType: 'entity', text: 'Marie-Sophie de Waubert', score: 40, entityType: 'person', aliases: ['Marie-Sophie de Waubert'], category: '高管', market: '法国', tags: ['育碧'] },
  { seedType: 'entity', text: 'Stephane Carriere', score: 40, entityType: 'person', aliases: ['Stephane Carriere'], category: '高管', market: '法国', tags: ['育碧','CFO'] },
  { seedType: 'entity', text: 'Ariel Waislitz', score: 40, entityType: 'person', aliases: ['Ariel Waislitz'], category: '高管', market: '以色列', tags: ['Playtika'] },
  { seedType: 'entity', text: 'Robert Antokol', score: 45, entityType: 'person', aliases: ['Robert Antokol'], category: 'CEO', market: '以色列', tags: ['Playtika','CEO'] },
  { seedType: 'entity', text: 'Frank Gibeau', score: 45, entityType: 'person', aliases: ['Frank Gibeau'], category: '高管', market: '美国', tags: ['EA','高管'] },
  { seedType: 'entity', text: 'Laura Miele', score: 50, entityType: 'person', aliases: ['Laura Miele'], category: '高管', market: '美国', tags: ['EA','COO'] },
  { seedType: 'entity', text: 'Jörg Swoboda', score: 40, entityType: 'person', aliases: ['Jörg Swoboda'], category: '高管', market: '奥地利', tags: ['EA','CFO'] },
  { seedType: 'entity', text: 'Vince Zampella', score: 50, entityType: 'person', aliases: ['Vince Zampella'], category: '制作人', market: '美国', tags: ['Respawn','Apex','Titanfall'] },
  { seedType: 'entity', text: 'Jason West', score: 45, entityType: 'person', aliases: ['Jason West'], category: '制作人', market: '美国', tags: ['Respawn','联合创始人'] },
  { seedType: 'entity', text: 'Mackey McCandlish', score: 40, entityType: 'person', aliases: ['Mackey McCandlish'], category: '制作人', market: '美国', tags: ['Respawn'] },
  { seedType: 'entity', text: 'Stig Asmussen', score: 45, entityType: 'person', aliases: ['Stig Asmussen'], category: '制作人', market: '美国', tags: ['Respawn','Star Wars Jedi'] },
  { seedType: 'entity', text: 'Peter Moore', score: 45, entityType: 'person', aliases: ['Peter Moore'], category: '高管', market: '美国', tags: ['EA','ESPN','Xbox'] },
  { seedType: 'entity', text: 'Patrick Söderlund', score: 45, entityType: 'person', aliases: ['Patrick Söderlund'], category: '高管', market: '瑞典', tags: ['EA','前高管'] },

  // ===== 更多话题/事件 =====
  { seedType: 'topic', text: '游戏改编动画', score: 55, topicTag: '游戏改动画', relatedEntities: ['英雄联盟','原神','赛博朋克'], tags: ['P2话题','IP'] },
  { seedType: 'topic', text: '游戏直播', score: 55, topicTag: '游戏直播', relatedEntities: ['斗鱼','虎牙','Twitch','B站直播'], tags: ['P2话题','直播'] },
  { seedType: 'topic', text: '游戏短视频', score: 60, topicTag: '游戏短视频', relatedEntities: ['抖音','快手','B站'], tags: ['P1话题','短视频','营销'] },
  { seedType: 'topic', text: '游戏周边', score: 50, topicTag: '游戏周边', relatedEntities: [], tags: ['P2话题','周边','衍生品'] },
  { seedType: 'topic', text: '游戏音乐', score: 50, topicTag: '游戏音乐', relatedEntities: ['原神OST','最终幻想'], tags: ['P2话题','音乐'] },
  { seedType: 'topic', text: '游戏美术', score: 50, topicTag: '游戏美术', relatedEntities: [], tags: ['P2话题','美术'] },
  { seedType: 'topic', text: '游戏剧情', score: 50, topicTag: '游戏剧情', relatedEntities: [], tags: ['P2话题','剧情'] },
  { seedType: 'topic', text: '游戏设计', score: 55, topicTag: '游戏设计', relatedEntities: [], tags: ['P2话题','设计'] },
  { seedType: 'topic', text: '游戏引擎技术', score: 55, topicTag: '引擎技术', relatedEntities: ['虚幻引擎','Unity','自研引擎'], tags: ['P2话题','技术'] },
  { seedType: 'topic', text: '游戏服务器架构', score: 50, topicTag: '服务器架构', relatedEntities: [], tags: ['P2话题','技术'] },
  { seedType: 'topic', text: '游戏数据分析', score: 55, topicTag: '数据分析', relatedEntities: ['Sensor Tower','data.ai','七麦'], tags: ['P2话题','数据'] },
  { seedType: 'topic', text: '游戏用户增长', score: 55, topicTag: '用户增长', relatedEntities: [], tags: ['P2话题','运营'] },
  { seedType: 'topic', text: '游戏付费设计', score: 55, topicTag: '付费设计', relatedEntities: [], tags: ['P2话题','商业化'] },
  { seedType: 'topic', text: '游戏广告创意', score: 55, topicTag: '广告创意', relatedEntities: ['买量素材'], tags: ['P2话题','买量'] },
  { seedType: 'topic', text: '游戏行业并购', score: 60, topicTag: '行业并购', relatedEntities: ['微软收购动视暴雪'], tags: ['P1话题','资本'] },
  { seedType: 'topic', text: '游戏行业裁员', score: 60, topicTag: '行业裁员', relatedEntities: [], tags: ['P1话题','行业'] },
  { seedType: 'topic', text: '游戏公司上市', score: 55, topicTag: '公司上市', relatedEntities: ['心动网络','创梦天地'], tags: ['P2话题','资本'] },
  { seedType: 'topic', text: '游戏出海合规', score: 50, topicTag: '出海合规', relatedEntities: [], tags: ['P2话题','合规','出海'] },
  { seedType: 'topic', text: '游戏数据安全', score: 50, topicTag: '数据安全', relatedEntities: [], tags: ['P2话题','合规'] },
  { seedType: 'topic', text: '游戏反外挂', score: 55, topicTag: '反外挂', relatedEntities: [], tags: ['P2话题','安全'] },
  { seedType: 'topic', text: '游戏社区管理', score: 50, topicTag: '社区管理', relatedEntities: ['TapTap','Discord'], tags: ['P2话题','运营'] },
  { seedType: 'topic', text: '游戏本地化', score: 55, topicTag: '本地化', relatedEntities: [], tags: ['P2话题','出海'] },
  { seedType: 'topic', text: 'UGC游戏平台', score: 55, topicTag: 'UGC', relatedEntities: ['Roblox','我的世界','蛋仔派对'], tags: ['P2话题','UGC'] },
  { seedType: 'topic', text: '区块链游戏', score: 45, topicTag: '链游', relatedEntities: [], tags: ['P3话题','区块链'] },
  { seedType: 'topic', text: '元宇宙游戏', score: 45, topicTag: '元宇宙', relatedEntities: ['Roblox','Fortnite'], tags: ['P3话题','元宇宙'] },
  { seedType: 'topic', text: 'VR游戏', score: 50, topicTag: 'VR', relatedEntities: ['Meta Quest','PSVR'], tags: ['P2话题','VR'] },
  { seedType: 'topic', text: 'AR游戏', score: 50, topicTag: 'AR', relatedEntities: ['Pokémon GO'], tags: ['P2话题','AR'] },
  { seedType: 'topic', text: '主机游戏市场', score: 55, topicTag: '主机市场', relatedEntities: ['PlayStation','Xbox','任天堂'], tags: ['P2话题','主机'] },
  { seedType: 'topic', text: 'PC游戏市场', score: 55, topicTag: 'PC市场', relatedEntities: ['Steam','Epic Games Store'], tags: ['P2话题','PC'] },
  { seedType: 'topic', text: '移动游戏市场', score: 60, topicTag: '手游市场', relatedEntities: [], tags: ['P1话题','手游'] },
  { seedType: 'topic', text: '网页游戏', score: 40, topicTag: '页游', relatedEntities: [], tags: ['P3话题','页游'] },
  { seedType: 'topic', text: 'H5游戏', score: 45, topicTag: 'H5游戏', relatedEntities: [], tags: ['P3话题','H5'] },
  { seedType: 'topic', text: '小游戏平台', score: 60, topicTag: '小游戏平台', relatedEntities: ['微信小游戏','抖音小游戏','支付宝小游戏'], tags: ['P1话题','小游戏','平台'] },
  { seedType: 'topic', text: 'ChinaJoy', score: 60, topicTag: 'ChinaJoy', relatedEntities: [], tags: ['P1话题','展会'] },
  { seedType: 'topic', text: 'TGS东京电玩展', score: 55, topicTag: 'TGS', relatedEntities: [], tags: ['P2话题','展会','日本'] },
  { seedType: 'topic', text: 'gamescom科隆游戏展', score: 55, topicTag: 'gamescom', relatedEntities: [], tags: ['P2话题','展会','欧洲'] },
  { seedType: 'topic', text: 'GDC游戏开发者大会', score: 60, topicTag: 'GDC', relatedEntities: [], tags: ['P1话题','展会','开发'] },
  { seedType: 'topic', text: 'TGA游戏大奖', score: 60, topicTag: 'TGA', relatedEntities: [], tags: ['P1话题','奖项'] },
  { seedType: 'topic', text: 'Golden Joystick', score: 45, topicTag: '金摇杆', relatedEntities: [], tags: ['P3话题','奖项'] },
  { seedType: 'topic', text: 'BAFTA游戏奖', score: 45, topicTag: 'BAFTA', relatedEntities: [], tags: ['P3话题','奖项'] },

  { seedType: 'event', text: 'ChinaJoy', score: 60, eventType: '合作', keywords: ['ChinaJoy','CJ','中国国际数码互动娱乐展'], tags: ['P1事件','展会'] },
  { seedType: 'event', text: '游戏开发者大会', score: 55, eventType: '合作', keywords: ['GDC','Game Developers Conference'], tags: ['P2事件','展会'] },
  { seedType: 'event', text: '东京电玩展', score: 55, eventType: '合作', keywords: ['TGS','东京电玩展','Tokyo Game Show'], tags: ['P2事件','展会'] },
  { seedType: 'event', text: '科隆游戏展', score: 55, eventType: '合作', keywords: ['gamescom','科隆游戏展'], tags: ['P2事件','展会'] },
  { seedType: 'event', text: 'TGA颁奖典礼', score: 60, eventType: '舆情', keywords: ['TGA','The Game Awards','游戏大奖'], tags: ['P1事件','奖项'] },
  { seedType: 'event', text: 'Steam大促', score: 55, eventType: '榜单变化', keywords: ['Steam促销','夏促','冬促','秋促','春促'], tags: ['P2事件','促销'] },
  { seedType: 'event', text: 'PSN会员免费游戏', score: 50, eventType: '榜单变化', keywords: ['PS Plus','会免','免费游戏'], tags: ['P2事件','索尼'] },
  { seedType: 'event', text: 'Xbox Game Pass新增', score: 50, eventType: '榜单变化', keywords: ['XGP','Game Pass','新增游戏'], tags: ['P2事件','微软'] },
  { seedType: 'event', text: 'Switch新游发布', score: 55, eventType: '上线', keywords: ['Nintendo Direct','任天堂直面会','Switch新游'], tags: ['P2事件','任天堂'] },
  { seedType: 'event', text: '苹果App Store推荐', score: 55, eventType: '榜单变化', keywords: ['App Store','编辑推荐','今日推荐'], tags: ['P2事件','苹果'] },
  { seedType: 'event', text: 'Google Play推荐', score: 50, eventType: '榜单变化', keywords: ['Google Play','Google Play推荐'], tags: ['P2事件','Google'] },
  { seedType: 'event', text: 'Steam新品节', score: 50, eventType: '合作', keywords: ['Steam Next Fest','Steam新品节','试玩'], tags: ['P2事件','Steam'] },
  { seedType: 'event', text: 'TapTap年度颁奖', score: 50, eventType: '舆情', keywords: ['TapTap年度','TapTap颁奖','TAP Awards'], tags: ['P2事件','TapTap'] },
  { seedType: 'event', text: 'B站游戏新品发布', score: 50, eventType: '上线', keywords: ['B站游戏','bilibili游戏','新品'], tags: ['P2事件','B站'] },
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

console.log(`Part6 冲刺: 新增 ${inserted}/${uniqueSeeds.length} 条`);
const total = db.prepare('SELECT count(*) as c FROM seeds').get().c;
console.log(`\n==============================`);
console.log(`  种子总数: ${total} 条`);
console.log(`==============================`);
console.log(`\n按类型:`);
db.prepare('SELECT seed_type, count(*) as c FROM seeds GROUP BY seed_type').all().forEach((r: any) => console.log(`  ${r.seed_type}: ${r.c}`));
console.log(`\n实体种子按细分:`);
db.prepare("SELECT entity_type, count(*) as c FROM seeds WHERE seed_type='entity' AND entity_type IS NOT NULL GROUP BY entity_type").all().forEach((r: any) => console.log(`  ${r.entity_type}: ${r.c}`));
console.log(`\n高分(≥70): ${db.prepare('SELECT count(*) as c FROM seeds WHERE score >= 70').get().c}`);
db.close();
