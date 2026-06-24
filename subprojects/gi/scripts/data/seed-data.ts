/**
 * GI 种子数据定义
 *
 * 1000+ 种子：实体 500 + 事件 100 + 话题 300 + 源种子 100
 */

// ===== 实体种子 =====

export const GAME_ENTITIES: Array<{
  text: string;
  aliases: string[];
  category: string;
  market: string;
  tags: string[];
  score: number;
}> = [
  // === 头部手游（P0, score 80-95）===
  { text: '原神', aliases: ['Genshin Impact'], category: '二游', market: '全球', tags: ['头部', '开放世界'], score: 95 },
  { text: '崩坏：星穹铁道', aliases: ['星穹铁道', 'Honkai Star Rail', '星铁'], category: '二游', market: '全球', tags: ['头部', '回合制'], score: 92 },
  { text: '王者荣耀', aliases: ['Honor of Kings', '王者'], category: 'MOBA', market: '中国', tags: ['头部', 'MOBA'], score: 95 },
  { text: '明日方舟', aliases: ['Arknights', '方舟'], category: '二游', market: '全球', tags: ['头部', '塔防'], score: 88 },
  { text: '鸣潮', aliases: ['Wuthering Waves'], category: '二游', market: '全球', tags: ['新游', '开放世界'], score: 88 },
  { text: '绝区零', aliases: ['Zenless Zone Zero', 'ZZZ'], category: '二游', market: '全球', tags: ['新游', '动作'], score: 85 },
  { text: '恋与深空', aliases: ['Love and Deepspace'], category: '二游', market: '全球', tags: ['头部', '乙女'], score: 82 },
  { text: '和平精英', aliases: ['PUBG Mobile'], category: '射击', market: '全球', tags: ['头部', '射击'], score: 88 },
  { text: '蛋仔派对', aliases: ['Eggy Party'], category: '派对', market: '中国', tags: ['头部', 'UGC'], score: 82 },
  { text: '第五人格', aliases: ['Identity V'], category: '非对称竞技', market: '全球', tags: ['头部', '非对称'], score: 80 },
  { text: '金铲铲之战', aliases: ['TFT', '云顶之弈'], category: '自走棋', market: '中国', tags: ['头部', '自走棋'], score: 80 },
  { text: '黑神话：悟空', aliases: ['Black Myth Wukong', '黑神话'], category: '单机', market: '全球', tags: ['头部', '3A'], score: 92 },
  { text: '三角洲行动', aliases: ['Delta Force'], category: '射击', market: '全球', tags: ['新游', '射击'], score: 78 },
  { text: '燕云十六声', aliases: ['Where Winds Meet'], category: '开放世界', market: '全球', tags: ['新游', '武侠'], score: 80 },
  { text: '无限暖暖', aliases: ['Infinity Nikki'], category: '换装', market: '全球', tags: ['新游', '开放世界'], score: 78 },
  { text: '永劫无间', aliases: ['Naraka Bladepoint'], category: '动作', market: '全球', tags: ['头部', '吃鸡'], score: 82 },
  { text: '碧蓝航线', aliases: ['Azur Lane'], category: '二游', market: '全球', tags: ['头部', '舰娘'], score: 78 },
  { text: 'FGO', aliases: ['Fate/Grand Order', '命运冠位指定'], category: '二游', market: '全球', tags: ['头部', 'IP'], score: 80 },
  { text: '阴阳师', aliases: ['Onmyoji'], category: '二游', market: '中国', tags: ['头部', '卡牌'], score: 78 },
  { text: '梦幻西游', aliases: ['Fantasy Westward Journey'], category: 'MMO', market: '中国', tags: ['经典', '回合制'], score: 80 },
  // === 热门手游（P1, score 65-79）===
  { text: '崩坏3', aliases: ['Honkai Impact 3rd', '崩3'], category: '二游', market: '全球', tags: ['头部', '动作'], score: 78 },
  { text: '幻塔', aliases: ['Tower of Fantasy'], category: '开放世界', market: '全球', tags: ['开放世界', 'MMO'], score: 68 },
  { text: '光遇', aliases: ['Sky Children of the Light'], category: '社交', market: '全球', tags: ['独立', '社交'], score: 72 },
  { text: '重返未来1999', aliases: ['Reverse 1999'], category: '二游', market: '全球', tags: ['新锐', '回合制'], score: 75 },
  { text: '尘白禁区', aliases: ['Arena Breakout'], category: '射击', market: '全球', tags: ['新游', '射击'], score: 70 },
  { text: '白荆回廊', aliases: ['Ashes of the Kingdom'], category: '二游', market: '中国', tags: ['新游', '策略'], score: 68 },
  { text: '世界之外', aliases: ['Beyond the World'], category: '二游', market: '中国', tags: ['新游'], score: 65 },
  { text: '少女前线2', aliases: ['Girls Frontline 2'], category: '二游', market: '全球', tags: ['新游', '策略'], score: 72 },
  { text: '深空之眼', aliases: ['Eye of the Deep'], category: '二游', market: '中国', tags: ['动作'], score: 65 },
  { text: '战双帕弥什', aliases: ['Punishing Gray Raven'], category: '二游', market: '全球', tags: ['动作'], score: 72 },
  { text: '三国杀', aliases: ['Three Kingdoms Kill'], category: '卡牌', market: '中国', tags: ['经典', '卡牌'], score: 70 },
  { text: '大话西游', aliases: ['Westward Journey'], category: 'MMO', market: '中国', tags: ['经典', '回合制'], score: 72 },
  { text: '元梦之星', aliases: ['Star of Dreams'], category: '派对', market: '中国', tags: ['UGC', '派对'], score: 75 },
  { text: '暗区突围', aliases: ['Arena Breakout Infinite'], category: '射击', market: '全球', tags: ['新游', '撤离射击'], score: 72 },
  { text: '七日世界', aliases: ['Once Human'], category: '生存', market: '全球', tags: ['新游', '生存'], score: 75 },
  { text: '归龙潮', aliases: ['Return of the Dragon'], category: '动作', market: '中国', tags: ['新游'], score: 65 },
  { text: '潮汐守望者', aliases: ['Tide Watcher'], category: '策略', market: '全球', tags: ['新游'], score: 62 },
  { text: '如鸢', aliases: ['Ru Yuan'], category: '二游', market: '中国', tags: ['新游', '古风'], score: 65 },
  { text: '物华弥新', aliases: ['Cultural Relics RPG'], category: '二游', market: '中国', tags: ['新游'], score: 62 },
  { text: '解限机', aliases: ['Mecha Break'], category: '机甲', market: '全球', tags: ['新游', '机甲'], score: 68 },
  // === 端游/主机（P1）===
  { text: '英雄联盟', aliases: ['League of Legends', 'LOL'], category: 'MOBA', market: '全球', tags: ['头部', 'MOBA', '电竞'], score: 95 },
  { text: 'Dota2', aliases: ['Defense of the Ancients 2'], category: 'MOBA', market: '全球', tags: ['头部', 'MOBA', '电竞'], score: 85 },
  { text: 'APEX Legends', aliases: ['APEX', 'Apex英雄'], category: '射击', market: '全球', tags: ['头部', '射击', '吃鸡'], score: 82 },
  { text: 'VALORANT', aliases: ['瓦罗兰特', '无畏契约'], category: '射击', market: '全球', tags: ['头部', 'FPS', '电竞'], score: 85 },
  { text: 'CS2', aliases: ['Counter-Strike 2', 'CSGO'], category: '射击', market: '全球', tags: ['头部', 'FPS', '电竞'], score: 88 },
  { text: '幻兽帕鲁', aliases: ['Palworld'], category: '生存', market: '全球', tags: ['爆款', '生存'], score: 80 },
  { text: '艾尔登法环', aliases: ['Elden Ring'], category: '动作RPG', market: '全球', tags: ['头部', '魂系'], score: 90 },
  { text: '塞尔达传说', aliases: ['Zelda', '塞尔达'], category: '动作冒险', market: '全球', tags: ['头部', '任天堂'], score: 92 },
  { text: '马里奥', aliases: ['Mario', '超级马里奥'], category: '平台', market: '全球', tags: ['头部', '任天堂'], score: 90 },
  { text: '宝可梦', aliases: ['Pokemon', '精灵宝可梦'], category: 'RPG', market: '全球', tags: ['头部', 'IP'], score: 90 },
  { text: '动物森友会', aliases: ['Animal Crossing'], category: '社交模拟', market: '全球', tags: ['头部', '任天堂'], score: 82 },
  { text: 'GTA6', aliases: ['Grand Theft Auto 6'], category: '动作冒险', market: '全球', tags: ['最受期待', '3A'], score: 88 },
  { text: '星空', aliases: ['Starfield'], category: 'RPG', market: '全球', tags: ['头部', 'B社'], score: 75 },
  { text: '暗黑4', aliases: ['Diablo IV', '暗黑破坏神4'], category: 'ARPG', market: '全球', tags: ['头部', 'Blizzard'], score: 78 },
  { text: '博德之门3', aliases: ['Baldurs Gate 3', 'BG3'], category: 'RPG', market: '全球', tags: ['头部', 'CRPG'], score: 88 },
  { text: '最终幻想', aliases: ['Final Fantasy', 'FF'], category: 'RPG', market: '全球', tags: ['头部', 'IP'], score: 85 },
  { text: '龙珠', aliases: ['Dragon Ball'], category: '格斗', market: '全球', tags: ['头部', 'IP'], score: 78 },
  { text: '火影忍者', aliases: ['Naruto'], category: '动作', market: '全球', tags: ['头部', 'IP'], score: 78 },
  // === 更多手游（P2-P3）===
  { text: 'Roblox', aliases: ['罗布乐思'], category: 'UGC', market: '全球', tags: ['头部', 'UGC', '平台'], score: 88 },
  { text: 'Candy Crush', aliases: ['糖果传奇'], category: '休闲', market: '全球', tags: ['头部', '三消'], score: 75 },
  { text: 'Clash Royale', aliases: ['皇室战争'], category: '策略', market: '全球', tags: ['头部', 'Supercell'], score: 78 },
  { text: 'Clash of Clans', aliases: ['部落冲突'], category: '策略', market: '全球', tags: ['头部', 'Supercell'], score: 80 },
  { text: 'Brawl Stars', aliases: ['荒野乱斗'], category: '动作', market: '全球', tags: ['头部', 'Supercell'], score: 75 },
  { text: 'Hay Day', aliases: ['卡通农场'], category: '模拟经营', market: '全球', tags: ['头部', 'Supercell'], score: 68 },
  { text: 'Squad Busters', aliases: ['小队冲突'], category: '动作', market: '全球', tags: ['新游', 'Supercell'], score: 70 },
  { text: 'Monopoly GO', aliases: ['大富翁GO'], category: '休闲', market: '全球', tags: ['爆款', '休闲'], score: 80 },
  { text: 'Royal Match', aliases: ['皇家匹配'], category: '休闲', market: '全球', tags: ['爆款', '三消'], score: 78 },
  { text: 'Last War Survival', aliases: ['最后战争'], category: 'SLG', market: '全球', tags: ['爆款', 'SLG'], score: 72 },
  { text: 'Whiteout Survival', aliases: ['寒霜启示录'], category: 'SLG', market: '全球', tags: ['爆款', 'SLG', '出海'], score: 78 },
  { text: 'Puzzle & Survival', aliases: ['末日生存'], category: 'SLG', market: '全球', tags: ['头部', 'SLG', '出海'], score: 75 },
  { text: 'Rise of Kingdoms', aliases: ['万国觉醒'], category: 'SLG', market: '全球', tags: ['头部', 'SLG', '出海'], score: 78 },
  { text: 'Mobile Legends', aliases: ['MLBB', '无尽对决'], category: 'MOBA', market: '东南亚', tags: ['头部', 'MOBA', '出海'], score: 82 },
  { text: 'Free Fire', aliases: ['Garena Free Fire'], category: '射击', market: '东南亚', tags: ['头部', '射击'], score: 78 },
  { text: 'Call of Duty Mobile', aliases: ['CODM', '使命召唤手游'], category: '射击', market: '全球', tags: ['头部', '射击'], score: 80 },
  { text: 'Diablo Immortal', aliases: ['暗黑破坏神：不朽'], category: 'ARPG', market: '全球', tags: ['头部', 'Blizzard'], score: 72 },
  { text: 'Hearthstone', aliases: ['炉石传说'], category: '卡牌', market: '全球', tags: ['头部', '卡牌', 'Blizzard'], score: 75 },
  { text: 'Overwatch 2', aliases: ['守望先锋2'], category: '射击', market: '全球', tags: ['头部', 'Blizzard'], score: 72 },
  { text: 'World of Warcraft', aliases: ['魔兽世界', 'WOW'], category: 'MMO', market: '全球', tags: ['头部', 'Blizzard'], score: 85 },
];

export const COMPANY_ENTITIES: Array<{
  text: string;
  aliases: string[];
  category: string;
  market: string;
  tags: string[];
  score: number;
}> = [
  // === 国内大厂（P0）===
  { text: '腾讯游戏', aliases: ['Tencent', '腾讯互娱', '腾讯'], category: '大厂', market: '全球', tags: ['头部', '大厂'], score: 95 },
  { text: '网易游戏', aliases: ['NetEase', '网易'], category: '大厂', market: '全球', tags: ['头部', '大厂'], score: 90 },
  { text: '米哈游', aliases: ['miHoYo', 'HoYoverse'], category: '二游', market: '全球', tags: ['头部', '二游'], score: 92 },
  // === 国内头部（P1）===
  { text: '莉莉丝游戏', aliases: ['Lilith Games', '莉莉丝'], category: '出海', market: '全球', tags: ['头部', '出海'], score: 85 },
  { text: '三七互娱', aliases: ['37Games', '37互娱', '三七'], category: '买量', market: '全球', tags: ['头部', '买量'], score: 82 },
  { text: '完美世界', aliases: ['Perfect World'], category: '大厂', market: '中国', tags: ['头部', '大厂'], score: 80 },
  { text: '鹰角网络', aliases: ['Hypergryph', '鹰角'], category: '二游', market: '全球', tags: ['新锐', '二游'], score: 85 },
  { text: '叠纸游戏', aliases: ['Papergames', '叠纸'], category: '二游', market: '全球', tags: ['新锐', '二游'], score: 82 },
  { text: '库洛游戏', aliases: ['Kuro Games', '库洛'], category: '二游', market: '全球', tags: ['新锐', '二游'], score: 85 },
  { text: '心动网络', aliases: ['XD Inc', '心动'], category: '平台', market: '全球', tags: ['平台', '社区'], score: 80 },
  { text: 'B站游戏', aliases: ['bilibili', '哔哩哔哩'], category: '平台', market: '中国', tags: ['平台', '发行'], score: 85 },
  { text: '沐瞳科技', aliases: ['Moonton', '沐瞳'], category: '出海', market: '东南亚', tags: ['出海', 'MOBA'], score: 78 },
  { text: 'IGG', aliases: ['IGG Inc'], category: '出海', market: '全球', tags: ['出海', 'SLG'], score: 75 },
  { text: 'FunPlus', aliases: ['趣加游戏'], category: '出海', market: '全球', tags: ['出海', 'SLG'], score: 75 },
  { text: '紫龙游戏', aliases: ['紫龙', 'Black Dragon'], category: '二游', market: '全球', tags: ['二游'], score: 72 },
  { text: '散爆网络', aliases: ['Sunborn', '散爆'], category: '二游', market: '全球', tags: ['二游'], score: 72 },
  { text: '蛮啾网络', aliases: ['Manjuu', '蛮啾'], category: '二游', market: '全球', tags: ['二游'], score: 68 },
  { text: '深蓝互动', aliases: ['Infold Games', '深蓝'], category: '二游', market: '全球', tags: ['二游'], score: 70 },
  { text: '西山居', aliases: ['Seasun'], category: '大厂', market: '中国', tags: ['大厂', 'MMO'], score: 72 },
  { text: '游族网络', aliases: ['Yoozoo', '游族'], category: '出海', market: '全球', tags: ['出海'], score: 65 },
  { text: '巨人网络', aliases: ['巨人', '征途'], category: '大厂', market: '中国', tags: ['大厂'], score: 65 },
  { text: '世纪华通', aliases: ['盛趣游戏'], category: '大厂', market: '中国', tags: ['大厂'], score: 65 },
  { text: '恺英网络', aliases: ['恺英'], category: '大厂', market: '中国', tags: ['大厂'], score: 62 },
  { text: '字节跳动', aliases: ['ByteDance', '朝夕光年'], category: '大厂', market: '全球', tags: ['头部', '跨界'], score: 78 },
  { text: '快手游戏', aliases: ['快手'], category: '平台', market: '中国', tags: ['平台'], score: 65 },
  { text: '灵犀互娱', aliases: ['灵犀', '阿里游戏'], category: '大厂', market: '中国', tags: ['大厂'], score: 68 },
  { text: '祖龙娱乐', aliases: ['祖龙'], category: '大厂', market: '中国', tags: ['MMO'], score: 60 },
  { text: '中手游', aliases: ['CMGE'], category: '大厂', market: '中国', tags: ['IP'], score: 62 },
  { text: '友谊时光', aliases: ['Youzu'], category: '大厂', market: '中国', tags: ['大厂'], score: 58 },
  { text: '吉比特', aliases: ['雷霆游戏'], category: '大厂', market: '中国', tags: ['独立'], score: 65 },
  { text: '心动TapTap', aliases: ['TapTap', 'XD'], category: '平台', market: '全球', tags: ['平台'], score: 80 },
  // === 海外大厂（P1）===
  { text: 'Supercell', aliases: [], category: '大厂', market: '全球', tags: ['头部', '芬兰'], score: 88 },
  { text: 'Riot Games', aliases: ['拳头游戏'], category: '大厂', market: '全球', tags: ['头部', '电竞'], score: 90 },
  { text: 'Blizzard', aliases: ['暴雪'], category: '大厂', market: '全球', tags: ['头部'], score: 88 },
  { text: 'EA', aliases: ['Electronic Arts'], category: '大厂', market: '全球', tags: ['头部'], score: 85 },
  { text: 'Ubisoft', aliases: ['育碧'], category: '大厂', market: '全球', tags: ['头部'], score: 82 },
  { text: 'Nintendo', aliases: ['任天堂'], category: '大厂', market: '全球', tags: ['头部', '主机'], score: 92 },
  { text: 'Sony Interactive', aliases: ['PlayStation', '索尼互动'], category: '大厂', market: '全球', tags: ['头部', '主机'], score: 88 },
  { text: 'Microsoft Gaming', aliases: ['Xbox', '微软游戏'], category: '大厂', market: '全球', tags: ['头部'], score: 85 },
  { text: 'Krafton', aliases: ['蓝洞'], category: '大厂', market: '韩国', tags: ['头部'], score: 78 },
  { text: 'NCSoft', aliases: [], category: '大厂', market: '韩国', tags: ['MMO'], score: 72 },
  { text: 'Nexon', aliases: [], category: '大厂', market: '韩国', tags: ['头部'], score: 75 },
  { text: 'Netmarble', aliases: ['网石'], category: '大厂', market: '韩国', tags: ['头部'], score: 72 },
  { text: 'Kakao Games', aliases: ['Kakao'], category: '平台', market: '韩国', tags: ['平台'], score: 68 },
  { text: 'Com2uS', aliases: [], category: '大厂', market: '韩国', tags: ['出海'], score: 65 },
  { text: 'Square Enix', aliases: ['史克威尔艾尼克斯'], category: '大厂', market: '日本', tags: ['头部', 'RPG'], score: 82 },
  { text: 'Capcom', aliases: ['卡普空'], category: '大厂', market: '日本', tags: ['头部'], score: 80 },
  { text: 'Bandai Namco', aliases: ['万代南梦宫'], category: '大厂', market: '日本', tags: ['头部', 'IP'], score: 80 },
  { text: 'Konami', aliases: ['科乐美'], category: '大厂', market: '日本', tags: ['头部'], score: 72 },
  { text: 'Sega', aliases: ['世嘉'], category: '大厂', market: '日本', tags: ['头部'], score: 72 },
  { text: 'Cygames', aliases: [], category: '二游', market: '日本', tags: ['二游'], score: 75 },
  { text: 'Aniplex', aliases: [], category: '发行', market: '日本', tags: ['发行', 'IP'], score: 70 },
  { text: 'GungHo', aliases: [], category: '大厂', market: '日本', tags: [' puzzle'], score: 62 },
  { text: 'mixi', aliases: [], category: '大厂', market: '日本', tags: ['社交'], score: 60 },
  { text: 'Scopely', aliases: [], category: '大厂', market: '美国', tags: ['发行'], score: 68 },
  { text: 'Zynga', aliases: [], category: '大厂', market: '美国', tags: ['社交'], score: 65 },
  { text: 'Playtika', aliases: [], category: '大厂', market: '美国', tags: ['休闲'], score: 62 },
  { text: 'King', aliases: [], category: '大厂', market: '全球', tags: ['休闲'], score: 72 },
  { text: 'Epic Games', aliases: ['Epic'], category: '平台', market: '全球', tags: ['平台', '引擎'], score: 88 },
  { text: 'Valve', aliases: [], category: '平台', market: '全球', tags: ['平台', 'Steam'], score: 90 },
  { text: 'Garena', aliases: ['Sea Limited'], category: '平台', market: '东南亚', tags: ['平台'], score: 72 },
  { text: 'SensorTower', aliases: ['Sensor Tower'], category: '数据', market: '全球', tags: ['数据'], score: 70 },
  { text: 'data.ai', aliases: ['App Annie'], category: '数据', market: '全球', tags: ['数据'], score: 70 },
  { text: '伽马数据', aliases: ['CNG Data'], category: '数据', market: '中国', tags: ['数据'], score: 68 },
  { text: '七麦数据', aliases: ['Qimai'], category: '数据', market: '中国', tags: ['数据'], score: 65 },
];

export const PLATFORM_ENTITIES: Array<{
  text: string;
  aliases: string[];
  category: string;
  market: string;
  tags: string[];
  score: number;
}> = [
  { text: 'TapTap', aliases: [], category: '社区', market: '全球', tags: ['平台', '社区'], score: 85 },
  { text: 'Steam', aliases: [], category: '商店', market: '全球', tags: ['平台', 'PC'], score: 92 },
  { text: 'Epic Games Store', aliases: ['Epic Store'], category: '商店', market: '全球', tags: ['平台', 'PC'], score: 78 },
  { text: 'App Store', aliases: ['iOS'], category: '商店', market: '全球', tags: ['平台', '移动端'], score: 90 },
  { text: 'Google Play', aliases: [], category: '商店', market: '全球', tags: ['平台', '移动端'], score: 88 },
  { text: 'WeGame', aliases: [], category: '商店', market: '中国', tags: ['平台', 'PC'], score: 70 },
  { text: 'Nintendo eShop', aliases: ['Switch商店'], category: '商店', market: '全球', tags: ['平台', '主机'], score: 78 },
  { text: 'PlayStation Store', aliases: ['PS Store'], category: '商店', market: '全球', tags: ['平台', '主机'], score: 80 },
  { text: 'Xbox Store', aliases: ['Microsoft Store'], category: '商店', market: '全球', tags: ['平台', '主机'], score: 75 },
  { text: 'GOG', aliases: [], category: '商店', market: '全球', tags: ['平台', 'PC'], score: 62 },
  { text: 'itch.io', aliases: [], category: '商店', market: '全球', tags: ['平台', '独立'], score: 65 },
  { text: 'Xbox Game Pass', aliases: ['XGP'], category: '订阅', market: '全球', tags: ['订阅'], score: 78 },
  { text: 'PS Plus', aliases: [], category: '订阅', market: '全球', tags: ['订阅'], score: 72 },
  { text: 'EA App', aliases: ['Origin'], category: '平台', market: '全球', tags: ['平台'], score: 65 },
  { text: 'Ubisoft Connect', aliases: ['Uplay'], category: '平台', market: '全球', tags: ['平台'], score: 62 },
  { text: '好游快爆', aliases: [], category: '社区', market: '中国', tags: ['社区'], score: 65 },
  { text: '小黑盒', aliases: ['Heybox'], category: '社区', market: '中国', tags: ['社区'], score: 68 },
  { text: 'NGA', aliases: [], category: '社区', market: '中国', tags: ['社区'], score: 70 },
  { text: '米游社', aliases: ['HoYoLAB'], category: '社区', market: '全球', tags: ['社区'], score: 75 },
  { text: 'Discord', aliases: [], category: '社区', market: '全球', tags: ['社区'], score: 80 },
];

// ===== 事件种子 =====

export const EVENT_SEEDS: Array<{
  text: string;
  eventType: string;
  keywords: string[];
  tags: string[];
  score: number;
}> = [
  // 版号（5）
  { text: '版号发放', eventType: '版号', keywords: ['版号', '游戏版号', '版号下发', '进口版号', '国产版号'], tags: ['政策'], score: 88 },
  { text: '国产版号', eventType: '版号', keywords: ['国产版号', '国产网游版号', '版号审批'], tags: ['政策'], score: 82 },
  { text: '进口版号', eventType: '版号', keywords: ['进口版号', '进口游戏版号', '进口审批'], tags: ['政策'], score: 80 },
  { text: '版号公示', eventType: '版号', keywords: ['版号公示', '版号名单', '审批结果'], tags: ['政策'], score: 78 },
  { text: '版号审批', eventType: '版号', keywords: ['版号审批', '版号审核', '游戏审批'], tags: ['政策'], score: 75 },
  // 上线（6）
  { text: '新游公测', eventType: '上线', keywords: ['公测', '正式上线', '全球上线', '全平台上线'], tags: ['核心'], score: 90 },
  { text: '新游首发', eventType: '上线', keywords: ['首发', '全球首发', '首日上架', '正式上架'], tags: ['核心'], score: 85 },
  { text: 'iOS上线', eventType: '上线', keywords: ['iOS上线', 'App Store上架', '苹果上架'], tags: ['平台'], score: 75 },
  { text: '安卓上线', eventType: '上线', keywords: ['安卓上线', 'Google Play上架', '安卓首发'], tags: ['平台'], score: 75 },
  { text: 'Steam发售', eventType: '上线', keywords: ['Steam发售', 'Steam上线', 'EA上线'], tags: ['平台'], score: 78 },
  { text: '主机发售', eventType: '上线', keywords: ['PS5', 'Xbox', 'Switch', '主机发售'], tags: ['平台'], score: 78 },
  // 测试（6）
  { text: '删档测试', eventType: '测试', keywords: ['删档测试', '删档内测', '限号删档'], tags: ['核心'], score: 85 },
  { text: '不删档测试', eventType: '测试', keywords: ['不删档测试', '不删档内测', '公测前测'], tags: ['核心'], score: 82 },
  { text: '封闭测试', eventType: '测试', keywords: ['封测', '封闭测试', '限量测试', '技术测试'], tags: ['核心'], score: 78 },
  { text: '首测', eventType: '测试', keywords: ['首测', '首次测试', '一轮测试'], tags: ['核心'], score: 80 },
  { text: '终极测试', eventType: '测试', keywords: ['终极测试', '终测', '公测前夕'], tags: ['核心'], score: 78 },
  { text: '付费测试', eventType: '测试', keywords: ['付费测试', '付费删档', '充值返还'], tags: ['商业化'], score: 75 },
  // 预约（4）
  { text: '新游预约', eventType: '预约', keywords: ['预约', '预约开启', '预约人数', '预约突破'], tags: ['核心'], score: 80 },
  { text: '预约里程碑', eventType: '预约', keywords: ['预约破', '百万预约', '千万预约'], tags: ['核心'], score: 78 },
  { text: '预下载', eventType: '预约', keywords: ['预下载', '提前下载'], tags: ['核心'], score: 72 },
  { text: '预约奖励', eventType: '预约', keywords: ['预约奖励', '预约福利'], tags: ['运营'], score: 68 },
  // 融资（5）
  { text: '游戏融资', eventType: '融资', keywords: ['融资', '游戏融资', 'A轮', 'B轮', 'C轮'], tags: ['资本'], score: 82 },
  { text: '游戏收购', eventType: '融资', keywords: ['收购', '并购', '游戏并购'], tags: ['资本'], score: 85 },
  { text: '战略投资', eventType: '融资', keywords: ['战略投资', '投资游戏', '注资'], tags: ['资本'], score: 78 },
  { text: '游戏IPO', eventType: '融资', keywords: ['IPO', '上市', '游戏上市', '港股上市'], tags: ['资本'], score: 82 },
  { text: '估值变化', eventType: '融资', keywords: ['估值', '独角兽', '市值'], tags: ['资本'], score: 72 },
  // 版本更新（5）
  { text: '大版本更新', eventType: '版本更新', keywords: ['大版本', '版本更新', '新版本'], tags: ['运营'], score: 70 },
  { text: '新赛季', eventType: '版本更新', keywords: ['新赛季', '赛季更新', '排位赛季'], tags: ['运营'], score: 72 },
  { text: '新资料片', eventType: '版本更新', keywords: ['资料片', '新资料片', 'DLC'], tags: ['运营'], score: 75 },
  { text: '周年庆', eventType: '版本更新', keywords: ['周年庆', '周年', '周年活动'], tags: ['运营'], score: 78 },
  { text: '新角色上线', eventType: '版本更新', keywords: ['新角色', '新英雄', '新干员', '新卡'], tags: ['运营'], score: 68 },
  // 出海（6）
  { text: '游戏出海', eventType: '出海', keywords: ['出海', '海外上线', '全球化'], tags: ['核心'], score: 85 },
  { text: '日韩市场', eventType: '出海', keywords: ['日韩', '日本上线', '韩国上线'], tags: ['区域'], score: 78 },
  { text: '东南亚市场', eventType: '出海', keywords: ['东南亚', '东南亚上线', '泰国', '越南'], tags: ['区域'], score: 75 },
  { text: '欧美市场', eventType: '出海', keywords: ['欧美', '北美上线', '欧洲上线'], tags: ['区域'], score: 78 },
  { text: '中东市场', eventType: '出海', keywords: ['中东', '沙特', '阿联酋'], tags: ['区域'], score: 72 },
  { text: '拉美市场', eventType: '出海', keywords: ['拉美', '巴西', '墨西哥'], tags: ['区域'], score: 68 },
  // 买量（5）
  { text: '买量投放', eventType: '买量', keywords: ['买量', '投放', '广告投放', '效果广告'], tags: ['核心'], score: 85 },
  { text: '素材量变化', eventType: '买量', keywords: ['素材量', '广告素材', '创意素材'], tags: ['核心'], score: 80 },
  { text: '投放策略', eventType: '买量', keywords: ['投放策略', 'UA策略', '获客策略'], tags: ['核心'], score: 78 },
  { text: 'CPA变化', eventType: '买量', keywords: ['CPA', '获客成本', 'CPI'], tags: ['数据'], score: 75 },
  { text: '投放渠道', eventType: '买量', keywords: ['投放渠道', '广告平台', '媒体渠道'], tags: ['渠道'], score: 72 },
  // 舆情（5）
  { text: '游戏舆情', eventType: '舆情', keywords: ['舆情', '争议', '风波'], tags: ['风险'], score: 78 },
  { text: '差评风暴', eventType: '舆情', keywords: ['差评', '差评轰炸', '好评率下降'], tags: ['风险'], score: 75 },
  { text: '道歉公告', eventType: '舆情', keywords: ['道歉', '致歉', '官方道歉'], tags: ['风险'], score: 72 },
  { text: '游戏整改', eventType: '舆情', keywords: ['整改', '下架', '停运'], tags: ['风险'], score: 80 },
  { text: '停服关服', eventType: '舆情', keywords: ['停服', '关服', '停运', '终止运营'], tags: ['风险'], score: 78 },
  // 榜单变化（3）
  { text: '畅销榜变化', eventType: '榜单变化', keywords: ['畅销榜', '收入榜', '流水排名'], tags: ['数据'], score: 75 },
  { text: '下载榜变化', eventType: '榜单变化', keywords: ['下载榜', '免费榜', '下载排名'], tags: ['数据'], score: 72 },
  { text: '热门榜变化', eventType: '榜单变化', keywords: ['热门榜', '热玩榜', '人气榜'], tags: ['数据'], score: 70 },
  // 合作（3）
  { text: 'IP联动', eventType: '合作', keywords: ['联动', 'IP联动', '跨界联动'], tags: ['运营'], score: 72 },
  { text: '品牌合作', eventType: '合作', keywords: ['品牌合作', '联名', '跨界合作'], tags: ['运营'], score: 68 },
  { text: '电竞合作', eventType: '合作', keywords: ['电竞合作', '赛事合作', '赞助商'], tags: ['电竞'], score: 65 },
  // AI应用（4）
  { text: 'AI游戏应用', eventType: 'AI应用', keywords: ['AI游戏', 'AIGC', 'AI生成'], tags: ['技术'], score: 80 },
  { text: 'AI NPC', eventType: 'AI应用', keywords: ['AI NPC', '智能NPC', 'AI对话'], tags: ['技术'], score: 75 },
  { text: 'AI美术生成', eventType: 'AI应用', keywords: ['AI美术', 'AI绘画', 'AI生成美术'], tags: ['技术'], score: 72 },
  { text: 'AI配音', eventType: 'AI应用', keywords: ['AI配音', '语音合成', 'TTS'], tags: ['技术'], score: 65 },
  // 组织动作（3）
  { text: '裁员', eventType: '组织动作', keywords: ['裁员', '人员优化', '缩编'], tags: ['组织'], score: 75 },
  { text: '组织架构调整', eventType: '组织动作', keywords: ['组织架构', '管理层变动', '战略调整'], tags: ['组织'], score: 72 },
  { text: '工作室变动', eventType: '组织动作', keywords: ['工作室', '关闭工作室', '新工作室'], tags: ['组织'], score: 70 },
  // 政策（3）
  { text: '游戏监管', eventType: '政策', keywords: ['监管', '政策', '新规'], tags: ['政策'], score: 82 },
  { text: '未成年人保护', eventType: '政策', keywords: ['未成年', '防沉迷', '青少年'], tags: ['政策'], score: 78 },
  { text: '内容审核', eventType: '政策', keywords: ['审核', '内容审核', '版署'], tags: ['政策'], score: 75 },
];

// ===== 话题种子 =====

export const TOPIC_SEEDS: Array<{
  text: string;
  topicTag: string;
  tags: string[];
  score: number;
  category: string;
}> = [
  // === 用户指定的核心话题（P0）===
  { text: '微信小游戏', topicTag: '微信小游戏', tags: ['趋势'], score: 90, category: '平台' },
  { text: '抖音小游戏', topicTag: '抖音小游戏', tags: ['趋势'], score: 88, category: '平台' },
  { text: '广告素材创意', topicTag: '广告素材创意', tags: ['买量'], score: 85, category: '广告' },
  { text: 'AI+游戏', topicTag: 'AI+游戏', tags: ['技术', '趋势'], score: 88, category: '技术' },
  { text: '游戏AI应用', topicTag: '游戏AI应用', tags: ['技术'], score: 85, category: '技术' },
  { text: '游戏数据', topicTag: '游戏数据', tags: ['数据'], score: 82, category: '数据' },
  { text: '卡牌游戏', topicTag: '卡牌', tags: ['品类'], score: 78, category: '品类' },
  { text: '游戏榜单', topicTag: '游戏榜单', tags: ['数据'], score: 80, category: '数据' },
  { text: '游戏品类', topicTag: '游戏品类', tags: ['趋势'], score: 75, category: '品类' },
  { text: '巨量广告', topicTag: '巨量广告', tags: ['广告'], score: 85, category: '广告' },
  { text: '腾讯广告', topicTag: '腾讯广告', tags: ['广告'], score: 82, category: '广告' },
  { text: '快手广告', topicTag: '快手广告', tags: ['广告'], score: 78, category: '广告' },
  { text: '磁力引擎', topicTag: '磁力引擎', tags: ['广告'], score: 75, category: '广告' },
  { text: '游戏买量', topicTag: '游戏买量', tags: ['买量'], score: 88, category: '商业化' },
  { text: '广告投放', topicTag: '广告投放', tags: ['广告'], score: 85, category: '广告' },
  // === 品类赛道 ===
  { text: '二次元赛道', topicTag: '二次元赛道', tags: ['品类'], score: 85, category: '品类' },
  { text: 'SLG赛道', topicTag: 'SLG赛道', tags: ['品类', '出海'], score: 82, category: '品类' },
  { text: 'MMORPG', topicTag: 'MMORPG', tags: ['品类'], score: 78, category: '品类' },
  { text: '卡牌RPG', topicTag: '卡牌RPG', tags: ['品类'], score: 75, category: '品类' },
  { text: '开放世界', topicTag: '开放世界', tags: ['品类', '趋势'], score: 85, category: '品类' },
  { text: 'Roguelike', topicTag: 'Roguelike', tags: ['品类'], score: 72, category: '品类' },
  { text: '放置游戏', topicTag: '放置游戏', tags: ['品类'], score: 68, category: '品类' },
  { text: '模拟经营', topicTag: '模拟经营', tags: ['品类'], score: 70, category: '品类' },
  { text: '塔防游戏', topicTag: '塔防游戏', tags: ['品类'], score: 68, category: '品类' },
  { text: '射击游戏', topicTag: '射击游戏', tags: ['品类'], score: 78, category: '品类' },
  { text: 'MOBA', topicTag: 'MOBA', tags: ['品类', '电竞'], score: 80, category: '品类' },
  { text: '竞速游戏', topicTag: '竞速游戏', tags: ['品类'], score: 65, category: '品类' },
  { text: '休闲游戏', topicTag: '休闲游戏', tags: ['品类'], score: 75, category: '品类' },
  { text: '解谜游戏', topicTag: '解谜游戏', tags: ['品类'], score: 65, category: '品类' },
  { text: '音游', topicTag: '音游', tags: ['品类'], score: 62, category: '品类' },
  { text: '派对游戏', topicTag: '派对游戏', tags: ['品类', '趋势'], score: 78, category: '品类' },
  { text: '合成游戏', topicTag: '合成游戏', tags: ['品类'], score: 65, category: '品类' },
  { text: 'io游戏', topicTag: 'io游戏', tags: ['品类'], score: 60, category: '品类' },
  { text: '互动影视', topicTag: '互动影视', tags: ['品类'], score: 62, category: '品类' },
  { text: '文字冒险', topicTag: '文字冒险', tags: ['品类'], score: 60, category: '品类' },
  { text: '乙女游戏', topicTag: '乙女游戏', tags: ['品类', '趋势'], score: 75, category: '品类' },
  { text: '女性向游戏', topicTag: '女性向游戏', tags: ['品类', '趋势'], score: 78, category: '品类' },
  { text: '独立游戏', topicTag: '独立游戏', tags: ['品类'], score: 72, category: '品类' },
  { text: '主机游戏', topicTag: '主机游戏', tags: ['品类'], score: 72, category: '品类' },
  { text: '沙盒游戏', topicTag: '沙盒游戏', tags: ['品类'], score: 68, category: '品类' },
  { text: '生存游戏', topicTag: '生存游戏', tags: ['品类'], score: 70, category: '品类' },
  // === 广告平台 ===
  { text: '穿山甲', topicTag: '穿山甲', tags: ['广告', '平台'], score: 80, category: '广告' },
  { text: '优量汇', topicTag: '优量汇', tags: ['广告', '平台'], score: 78, category: '广告' },
  { text: '快手联盟', topicTag: '快手联盟', tags: ['广告', '平台'], score: 72, category: '广告' },
  { text: '百度联盟', topicTag: '百度联盟', tags: ['广告', '平台'], score: 68, category: '广告' },
  { text: 'AdMob', topicTag: 'AdMob', tags: ['广告', '平台'], score: 75, category: '广告' },
  { text: 'Unity Ads', topicTag: 'Unity Ads', tags: ['广告', '平台'], score: 78, category: '广告' },
  { text: 'ironSource', topicTag: 'ironSource', tags: ['广告', '平台'], score: 75, category: '广告' },
  { text: 'AppLovin', topicTag: 'AppLovin', tags: ['广告', '平台'], score: 78, category: '广告' },
  { text: 'Mintegral', topicTag: 'Mintegral', tags: ['广告', '平台'], score: 72, category: '广告' },
  { text: 'Pangle', topicTag: 'Pangle', tags: ['广告', '平台'], score: 75, category: '广告' },
  { text: 'Liftoff', topicTag: 'Liftoff', tags: ['广告', '平台'], score: 70, category: '广告' },
  { text: 'Singular', topicTag: 'Singular', tags: ['广告', '平台'], score: 65, category: '广告' },
  { text: 'Adjust', topicTag: 'Adjust', tags: ['广告', '归因'], score: 68, category: '广告' },
  { text: 'AppsFlyer', topicTag: 'AppsFlyer', tags: ['广告', '归因'], score: 70, category: '广告' },
  // === 业务维度 ===
  { text: '用户增长', topicTag: '用户增长', tags: ['业务'], score: 80, category: '业务' },
  { text: '留存优化', topicTag: '留存优化', tags: ['业务'], score: 78, category: '业务' },
  { text: '变现策略', topicTag: '变现策略', tags: ['商业化'], score: 82, category: '业务' },
  { text: 'LTV模型', topicTag: 'LTV', tags: ['数据'], score: 78, category: '业务' },
  { text: 'ROI分析', topicTag: 'ROI', tags: ['数据'], score: 80, category: '业务' },
  { text: '买量成本', topicTag: '买量成本', tags: ['数据', '买量'], score: 82, category: '业务' },
  { text: '素材生命周期', topicTag: '素材生命周期', tags: ['买量'], score: 75, category: '业务' },
  { text: '投放自动化', topicTag: '投放自动化', tags: ['广告', '技术'], score: 78, category: '业务' },
  { text: '创意生产', topicTag: '创意生产', tags: ['广告', 'AIGC'], score: 80, category: '业务' },
  { text: 'AB测试', topicTag: 'AB测试', tags: ['数据'], score: 72, category: '业务' },
  { text: '付费设计', topicTag: '付费设计', tags: ['商业化'], score: 78, category: '业务' },
  { text: '内购优化', topicTag: '内购优化', tags: ['商业化'], score: 75, category: '业务' },
  { text: '广告变现', topicTag: '广告变现', tags: ['商业化'], score: 80, category: '业务' },
  { text: 'IAA模式', topicTag: 'IAA模式', tags: ['商业化', '趋势'], score: 82, category: '业务' },
  { text: 'IAP模式', topicTag: 'IAP模式', tags: ['商业化'], score: 75, category: '业务' },
  { text: '混合变现', topicTag: '混合变现', tags: ['商业化'], score: 78, category: '业务' },
  { text: 'Battle Pass', topicTag: 'Battle Pass', tags: ['商业化'], score: 72, category: '业务' },
  { text: '抽卡机制', topicTag: '抽卡机制', tags: ['商业化'], score: 70, category: '业务' },
  // === 技术趋势 ===
  { text: '云游戏', topicTag: '云游戏', tags: ['技术', '趋势'], score: 72, category: '技术' },
  { text: 'AI NPC', topicTag: 'AI NPC', tags: ['技术', '趋势'], score: 82, category: '技术' },
  { text: 'AIGC美术', topicTag: 'AIGC美术', tags: ['技术', '趋势'], score: 85, category: '技术' },
  { text: '程序化生成', topicTag: '程序化生成', tags: ['技术'], score: 72, category: '技术' },
  { text: '引擎升级', topicTag: '引擎升级', tags: ['技术'], score: 70, category: '技术' },
  { text: '跨平台游戏', topicTag: '跨平台', tags: ['趋势'], score: 78, category: '技术' },
  { text: '云渲染', topicTag: '云渲染', tags: ['技术'], score: 68, category: '技术' },
  { text: 'WebGPU', topicTag: 'WebGPU', tags: ['技术'], score: 65, category: '技术' },
  { text: 'UE5', topicTag: 'UE5', tags: ['技术'], score: 75, category: '技术' },
  { text: 'Unity 6', topicTag: 'Unity 6', tags: ['技术'], score: 72, category: '技术' },
  { text: 'AI大模型', topicTag: 'AI大模型', tags: ['技术', '趋势'], score: 85, category: '技术' },
  { text: 'AIGC视频', topicTag: 'AIGC视频', tags: ['技术', '趋势'], score: 78, category: '技术' },
  { text: 'AI测试', topicTag: 'AI测试', tags: ['技术'], score: 68, category: '技术' },
  { text: 'AI翻译', topicTag: 'AI翻译', tags: ['技术', '出海'], score: 70, category: '技术' },
  // === 市场区域 ===
  { text: '日韩出海', topicTag: '日韩出海', tags: ['出海', '区域'], score: 82, category: '区域' },
  { text: '东南亚出海', topicTag: '东南亚出海', tags: ['出海', '区域'], score: 80, category: '区域' },
  { text: '欧美出海', topicTag: '欧美出海', tags: ['出海', '区域'], score: 82, category: '区域' },
  { text: '中东出海', topicTag: '中东出海', tags: ['出海', '区域'], score: 78, category: '区域' },
  { text: '拉美市场', topicTag: '拉美市场', tags: ['出海', '区域'], score: 72, category: '区域' },
  { text: '独联体市场', topicTag: '独联体市场', tags: ['出海', '区域'], score: 68, category: '区域' },
  { text: '港澳台市场', topicTag: '港澳台市场', tags: ['出海', '区域'], score: 70, category: '区域' },
  { text: '北美市场', topicTag: '北美市场', tags: ['区域'], score: 78, category: '区域' },
  { text: '欧洲市场', topicTag: '欧洲市场', tags: ['区域'], score: 75, category: '区域' },
  { text: '日本市场', topicTag: '日本市场', tags: ['区域'], score: 82, category: '区域' },
  { text: '韩国市场', topicTag: '韩国市场', tags: ['区域'], score: 78, category: '区域' },
  { text: '印度市场', topicTag: '印度市场', tags: ['区域'], score: 72, category: '区域' },
  // === 运营话题 ===
  { text: '社区运营', topicTag: '社区运营', tags: ['运营'], score: 72, category: '运营' },
  { text: '用户运营', topicTag: '用户运营', tags: ['运营'], score: 75, category: '运营' },
  { text: '活动运营', topicTag: '活动运营', tags: ['运营'], score: 72, category: '运营' },
  { text: '内容运营', topicTag: '内容运营', tags: ['运营'], score: 70, category: '运营' },
  { text: '游戏直播', topicTag: '游戏直播', tags: ['营销'], score: 72, category: '运营' },
  { text: '电竞', topicTag: '电竞', tags: ['电竞', '趋势'], score: 80, category: '运营' },
  { text: 'IP联动', topicTag: 'IP联动', tags: ['运营'], score: 75, category: '运营' },
  { text: '品牌营销', topicTag: '品牌营销', tags: ['营销'], score: 72, category: '运营' },
  { text: 'UGC生态', topicTag: 'UGC生态', tags: ['趋势'], score: 78, category: '运营' },
  { text: '游戏短视频', topicTag: '游戏短视频', tags: ['营销'], score: 76, category: '运营' },
  // === 综合趋势 ===
  { text: '游戏出海', topicTag: '游戏出海', tags: ['趋势'], score: 88, category: '趋势' },
  { text: '小游戏', topicTag: '小游戏', tags: ['趋势'], score: 90, category: '趋势' },
  { text: '小游戏买量', topicTag: '小游戏买量', tags: ['趋势', '买量'], score: 85, category: '趋势' },
  { text: '小游戏IAA', topicTag: '小游戏IAA', tags: ['趋势', '商业化'], score: 82, category: '趋势' },
  { text: 'H5游戏', topicTag: 'H5游戏', tags: ['趋势'], score: 68, category: '趋势' },
  { text: '二游赛道', topicTag: '二游赛道', tags: ['趋势'], score: 85, category: '趋势' },
  { text: '游戏AI', topicTag: '游戏AI', tags: ['技术', '趋势'], score: 85, category: '趋势' },
  { text: '游戏行业寒冬', topicTag: '行业寒冬', tags: ['趋势'], score: 78, category: '趋势' },
  { text: '游戏投资', topicTag: '游戏投资', tags: ['资本'], score: 75, category: '趋势' },
  { text: '游戏并购', topicTag: '游戏并购', tags: ['资本'], score: 78, category: '趋势' },
];

// ===== 源种子 =====

export const SOURCE_SEEDS: Array<{
  text: string;
  sourceType: string;
  discoveryUrl?: string;
  discoveryMethod: string;
  tags: string[];
  score: number;
}> = [
  // 媒体
  { text: 'GameLook', sourceType: 'media', discoveryUrl: 'https://www.gamelook.com.cn', discoveryMethod: 'manual', tags: ['行业媒体'], score: 90 },
  { text: '游戏葡萄', sourceType: 'media', discoveryUrl: 'https://youxiputao.com', discoveryMethod: 'manual', tags: ['行业媒体'], score: 88 },
  { text: '游戏陀螺', sourceType: 'media', discoveryUrl: 'https://youxituoluo.com', discoveryMethod: 'manual', tags: ['行业媒体'], score: 88 },
  { text: '触乐', sourceType: 'media', discoveryUrl: 'https://www.chuapp.com', discoveryMethod: 'manual', tags: ['深度报道'], score: 85 },
  { text: '游研社', sourceType: 'media', discoveryUrl: 'https://www.yystv.com', discoveryMethod: 'manual', tags: ['社区'], score: 82 },
  { text: '机核', sourceType: 'media', discoveryUrl: 'https://www.gcores.com', discoveryMethod: 'manual', tags: ['社区'], score: 82 },
  { text: '36氪游戏', sourceType: 'media', discoveryUrl: 'https://36kr.com', discoveryMethod: 'manual', tags: ['科技媒体'], score: 78 },
  { text: '游戏茶馆', sourceType: 'media', discoveryMethod: 'manual', tags: ['行业'], score: 75 },
  { text: '竞核', sourceType: 'media', discoveryMethod: 'manual', tags: ['研究'], score: 75 },
  { text: '手游那点事', sourceType: 'media', discoveryMethod: 'manual', tags: ['手游'], score: 72 },
  // 社区
  { text: 'TapTap社区', sourceType: 'community', discoveryUrl: 'https://www.taptap.cn', discoveryMethod: 'manual', tags: ['社区', '平台'], score: 88 },
  { text: 'NGA论坛', sourceType: 'community', discoveryUrl: 'https://nga.178.com', discoveryMethod: 'manual', tags: ['社区'], score: 80 },
  { text: '小黑盒', sourceType: 'community', discoveryUrl: 'https://www.xiaoheihe.cn', discoveryMethod: 'manual', tags: ['社区'], score: 78 },
  { text: '好游快爆', sourceType: 'community', discoveryUrl: 'https://www.3839.com', discoveryMethod: 'manual', tags: ['社区'], score: 75 },
  { text: 'Discord游戏社区', sourceType: 'community', discoveryMethod: 'manual', tags: ['社区', '海外'], score: 80 },
  { text: 'Reddit游戏', sourceType: 'community', discoveryUrl: 'https://reddit.com/r/gaming', discoveryMethod: 'manual', tags: ['社区', '海外'], score: 78 },
  { text: 'Steam社区', sourceType: 'community', discoveryUrl: 'https://steamcommunity.com', discoveryMethod: 'manual', tags: ['社区'], score: 82 },
  // 数据
  { text: 'Sensor Tower', sourceType: 'api', discoveryUrl: 'https://sensortower.com', discoveryMethod: 'manual', tags: ['数据'], score: 85 },
  { text: 'data.ai', sourceType: 'api', discoveryUrl: 'https://www.data.ai', discoveryMethod: 'manual', tags: ['数据'], score: 82 },
  { text: '伽马数据', sourceType: 'api', discoveryUrl: 'https://www.cngdata.com', discoveryMethod: 'manual', tags: ['数据'], score: 80 },
  { text: '七麦数据', sourceType: 'api', discoveryUrl: 'https://www.qimai.cn', discoveryMethod: 'manual', tags: ['数据'], score: 75 },
  { text: 'SteamDB', sourceType: 'api', discoveryUrl: 'https://steamdb.info', discoveryMethod: 'manual', tags: ['数据'], score: 78 },
  // 官方
  { text: '米哈游官网', sourceType: 'official', discoveryUrl: 'https://www.mihoyo.com', discoveryMethod: 'manual', tags: ['公司'], score: 80 },
  { text: '腾讯游戏官网', sourceType: 'official', discoveryUrl: 'https://games.qq.com', discoveryMethod: 'manual', tags: ['公司'], score: 82 },
  { text: '网易游戏官网', sourceType: 'official', discoveryUrl: 'https://game.163.com', discoveryMethod: 'manual', tags: ['公司'], score: 80 },
  { text: 'Steam新闻', sourceType: 'official', discoveryUrl: 'https://store.steampowered.com/news', discoveryMethod: 'manual', tags: ['平台'], score: 82 },
];
