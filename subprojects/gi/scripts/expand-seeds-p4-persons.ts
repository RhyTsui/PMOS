/**
 * 大规模扩充种子 - Part 4: 行业人物 100+
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../data/gi.db'));

interface S { seedType: 'entity'; text: string; score: number; tags: string[]; entityType: 'person'; aliases: string[]; category: string; market: string; }
const P = (text: string, score: number, aliases: string[], category: string, tags: string[], market = '国内'): S => ({
  seedType: 'entity', text, score, tags, entityType: 'person', aliases, category, market
});

const seeds: S[] = [
  // ===== 中国游戏公司创始人/CEO =====
  P('马化腾', 65, ['马化腾','Pony Ma'], 'CEO', ['腾讯','创始人']),
  P('刘炽平', 60, ['刘炽平','Martin Lau'], 'CEO', ['腾讯','总裁']),
  P('任宇昕', 55, ['任宇昕'], '高管', ['腾讯','COO','互娱']),
  P('马晓轶', 55, ['马晓轶'], '高管', ['腾讯','高级副总裁','游戏']),
  P('Steven Ma', 50, ['Steven Ma','马晓轶'], '高管', ['腾讯','游戏发行']),
  P('丁磊', 60, ['丁磊'], 'CEO', ['网易','创始人']),
  P('王怡', 55, ['王怡'], '高管', ['网易','游戏','总裁']),
  P('蔡浩宇', 65, ['蔡浩宇','大伟哥'], 'CEO', ['米哈游','创始人']),
  P('刘伟', 60, ['刘伟','大伟哥'], 'CEO', ['米哈游','总裁']),
  P('罗宇皓', 55, ['罗宇皓'], '创始人', ['米哈游','联合创始人']),
  P('袁菁', 55, ['袁菁'], 'CEO', ['莉莉丝','创始人']),
  P('王信文', 50, ['王信文'], 'CEO', ['莉莉丝','联合创始人']),
  P('黄一孟', 60, ['黄一孟'], 'CEO', ['心动网络','TapTap','创始人']),
  P('戴云杰', 50, ['戴云杰'], '高管', ['心动网络','TapTap']),
  P('陈睿', 60, ['陈睿'], 'CEO', ['B站','哔哩哔哩','CEO']),
  P('梁汝波', 55, ['梁汝波'], 'CEO', ['字节跳动','朝夕光年','CEO']),
  P('严授', 50, ['严授'], '高管', ['字节跳动','游戏','负责人']),
  P('池宇峰', 55, ['池宇峰'], 'CEO', ['完美世界','创始人']),
  P('李逸飞', 55, ['李逸飞'], 'CEO', ['三七互娱','创始人']),
  P('吴绪清', 50, ['吴绪清'], '高管', ['三七互娱']),
  P('郭炜炜', 55, ['郭炜炜'], '制作人', ['西山居','剑网3','制作人']),
  P('邹涛', 50, ['邹涛'], '高管', ['西山居']),
  P('纪学锋', 50, ['纪学锋'], '高管', ['巨人网络']),
  P('吴萌', 50, ['吴萌'], '制作人', ['巨人网络']),
  P('陈天桥', 55, ['陈天桥'], '创始人', ['盛大游戏','游戏先驱']),
  P('唐彦文', 50, ['唐彦文'], '高管', ['盛趣游戏']),
  P('黄伟', 50, ['黄伟'], '高管', ['恺英网络']),
  P('卢竑岩', 50, ['卢竑岩'], 'CEO', ['吉比特','雷霆游戏']),
  P('翟健', 45, ['翟健'], '高管', ['雷霆游戏']),
  P('蒋凡', 50, ['蒋凡'], '高管', ['阿里','大文娱']),
  P('詹钟晖', 50, ['詹钟晖','叮当'], '创始人', ['简悦科技','前网易']),
  P('徐元欣', 45, ['徐元欣'], '高管', ['沐瞳科技']),
  P('袁菁', 55, ['袁菁'], 'CEO', ['莉莉丝']),
  P('金雯怡', 55, ['金雯怡'], '高管', ['米哈游','月之暗面','HoYoverse']),
  P('王巍', 50, ['王巍'], '创始人', ['散爆网络']),
  P('钟祺翔', 50, ['钟祺翔','海猫络合物'], '制作人', ['鹰角','明日方舟','制作人']),
  P('李恒达', 50, ['李恒达'], '高管', ['鹰角']),
  P('姚润昊', 55, ['姚润昊'], 'CEO', ['叠纸游戏','创始人']),
  P('李锡民', 50, ['李锡民'], '制作人', ['叠纸','恋与深空']),
  P('李松伦', 50, ['李松伦'], '高管', ['库洛科技']),
  P(' Solas', 45, ['Solas'], '制作人', ['库洛','鸣潮','制作人']),

  // ===== 国内游戏行业知名人物 =====
  P('姚壮宪', 55, ['姚壮宪','姚仙'], '制作人', ['大宇','仙剑奇侠传','之父']),
  P('张毅君', 55, ['张毅君','工长君'], '制作人', ['烛龙','古剑奇谭','制作人']),
  P('蔡明宏', 50, ['蔡明宏'], '制作人', ['大宇','轩辕剑','之父']),
  P('徐昌平', 45, ['徐昌平'], '制作人', ['螺舟工作室','太吾绘卷']),
  P('陈星汉', 60, ['陈星汉','Jenova Chen'], '制作人', ['光遇','Thatgamecompany','华人']),
  P('冯骥', 65, ['冯骥','Yocar'], 'CEO', ['游戏科学','黑神话悟空','制作人']),
  P('杨奇', 55, ['杨奇'], '制作人', ['游戏科学','黑神话悟空','美术总监']),
  P('江柏清', 50, ['江柏清'], '制作人', ['柚子游戏','戴森球计划']),
  P('郑子乔', 50, ['郑子乔'], '制作人', ['鬼谷工作室','鬼谷八荒']),
  P('张亚青', 45, ['张亚青'], '制作人', ['拾元工作室','烟火','三伏']),
  P('李易霖', 45, ['李易霖'], '制作人', ['重组游戏','猛兽派对']),

  // ===== 海外大厂 CEO/高管 =====
  P('Tim Cook', 55, ['Tim Cook','库克'], 'CEO', ['Apple','库克'], '美国'),
  P('Satya Nadella', 55, ['Satya Nadella','纳德拉'], 'CEO', ['Microsoft','纳德拉'], '美国'),
  P('Phil Spencer', 60, ['Phil Spencer','菲尔·斯宾塞'], 'CEO', ['Xbox','微软游戏','CEO'], '美国'),
  P('Bobby Kotick', 55, ['Bobby Kotick','考迪克'], 'CEO', ['动视暴雪','前CEO'], '美国'),
  P('Andrew Wilson', 55, ['Andrew Wilson'], 'CEO', ['EA','艺电','CEO'], '美国'),
  P('Yves Guillemot', 55, ['Yves Guillemot'], 'CEO', ['育碧','CEO'], '法国'),
  P('Jensen Huang', 60, ['Jensen Huang','黄仁勋'], 'CEO', ['NVIDIA','英伟达','GPU','AI'], '美国'),
  P('Gabe Newell', 60, ['Gabe Newell','G胖','Gaben'], 'CEO', ['Valve','Steam','创始人'], '美国'),
  P('Tim Sweeney', 55, ['Tim Sweeney'], 'CEO', ['Epic Games','创始人'], '美国'),
  P('Hidetaka Miyazaki', 65, ['宮崎英高','Hidetaka Miyazaki','宫崎英高'], '制作人', ['FromSoftware','社长','魂系'], '日本'),
  P('Todd Howard', 55, ['Todd Howard'], '制作人', ['Bethesda','总监'], '美国'),
  P('Neil Druckmann', 55, ['Neil Druckmann'], '制作人', ['Naughty Dog','最后生还者'], '美国'),
  P('Cory Barlog', 50, ['Cory Barlog'], '制作人', ['Santa Monica','战神'], '美国'),
  P('Shuhei Yoshida', 50, ['Shuhei Yoshida','吉田修平'], '高管', ['索尼','PlayStation','独立游戏'], '日本'),
  P('Jim Ryan', 50, ['Jim Ryan'], '高管', ['索尼','PlayStation','前CEO'], '美国'),
  P('Herman Hulst', 50, ['Herman Hulst'], '高管', ['索尼','PlayStation','工作室'], '美国'),

  // ===== 日本游戏界传奇 =====
  P('宫本茂', 60, ['宮本茂','Shigeru Miyamoto','宫本茂'], '制作人', ['任天堂','传奇制作人'], '日本'),
  P('小岛秀夫', 65, ['小岛秀夫','Hideo Kojima'], '制作人', ['Kojima Productions','传奇制作人'], '日本'),
  P('青沼英二', 55, ['青沼英二','Eiji Aonuma'], '制作人', ['任天堂','塞尔达','制作人'], '日本'),
  P('藤林秀麿', 50, ['藤林秀麿','Hideaki Fujibayashi'], '制作人', ['任天堂','塞尔达','王国之泪'], '日本'),
  P('桜井政博', 50, ['桜井政博','Masahiro Sakurai'], '制作人', ['大乱斗','制作人'], '日本'),
  P('三上真司', 55, ['三上真司','Shinji Mikami'], '制作人', ['生化危机','Tango Gameworks','恐怖之父'], '日本'),
  P('神谷英树', 55, ['神谷英树','Hideki Kamiya'], '制作人', ['白金工作室','动作'], '日本'),
  P('铃木裕', 50, ['鈴木裕','Yu Suzuki'], '制作人', ['世嘉','VR战士','莎木'], '日本'),
  P('坂口博信', 50, ['坂口博信','Hironobu Sakaguchi'], '制作人', ['最终幻想','之父'], '日本'),
  P('田畑端', 45, ['田畑端','Hajime Tabata'], '制作人', ['最终幻想15'], '日本'),
  P('堀井雄二', 55, ['堀井雄二','Yuji Horii'], '制作人', ['勇者斗恶龙','之父'], '日本'),
  P('鸟山明', 60, ['鸟山明','Akira Toriyama'], '艺术家', ['龙珠','龙珠战士Z','人设','已故'], '日本'),
  P('天野喜孝', 50, ['天野喜孝','Yoshitaka Amano'], '艺术家', ['最终幻想','人设'], '日本'),
  P('小的英嗣', 45, ['西木裕贵','Yasunori Nishiki'], '作曲家', ['卡普空','怪物猎人','音乐'], '日本'),
  P('光田康典', 50, ['光田康典','Yasunori Mitsuda'], '作曲家', ['异度神剑','chrono trigger'], '日本'),
  P('植松伸夫', 55, ['植松伸夫','Nobuo Uematsu'], '作曲家', ['最终幻想','音乐之父'], '日本'),
  P('岩田聪', 60, ['岩田聪','Satoru Iwata','已故'], 'CEO', ['任天堂','前社长','传奇'], '日本'),
  P('古川俊太郎', 55, ['古川俊太郎','Shuntaro Furukawa'], 'CEO', ['任天堂','社长'], '日本'),
  P('辻本宪三', 55, ['辻本宪三','Kenzo Tsujimoto'], 'CEO', ['卡普空','会长'], '日本'),
  P('辻本春弘', 50, ['辻本春弘','Haruhiro Tsujimoto'], 'CEO', ['卡普空','社长'], '日本'),

  // ===== 韩国游戏界 =====
  P('Kim Taek-jin', 50, ['Kim Taek-jin','김택진'], 'CEO', ['NCsoft','社长'], '韩国'),
  P('Bang Jun-hyuk', 50, ['Bang Jun-hyuk','방준혁'], 'CEO', ['Krafton','会长'], '韩国'),
  P('Chang Byung-gyu', 45, ['Chang Byung-gyu'], 'CEO', ['Shift Up'], '韩国'),
  P('김형태', 50, ['Kim Hyung-Tae','김형태','金亨泰'], '制作人', ['Shift Up','妮姬','剑星','制作人'], '韩国'),
  P('Lee Jang-mo', 45, ['Lee Jang-mo'], '高管', ['Nexon'], '韩国'),

  // ===== 欧美知名制作人 =====
  P('Sid Meier', 55, ['Sid Meier','席德·梅尔'], '制作人', ['文明','之父'], '美国'),
  P('Markus Persson', 50, ['Markus Persson','Notch'], '创始人', ['Minecraft','创始人'], '瑞典'),
  P('Markus Ilsemann', 45, ['Markus Ilsemann'], '制作人', ['Mojang'], '瑞典'),
  P('Henrik Kniberg', 50, ['Henrik Kniberg'], '制作人', ['Mojang','Minecraft'], '瑞典'),
  P('Sam Lake', 55, ['Sam Lake'], '制作人', ['Remedy','心灵杀手','控制'], '芬兰'),
  P('Hironobu Sakaguchi', 50, ['Hironobu Sakaguchi'], '制作人', ['最终幻想','之父'], '日本'),
  P('Jonathan Blow', 55, ['Jonathan Blow'], '制作人', ['Braid','The Witness','独立游戏'], '美国'),
  P('Toby Fox', 55, ['Toby Fox'], '制作人', ['Undertale','Deltarune','独立游戏'], '美国'),
  P('Lucas Pope', 50, ['Lucas Pope'], '制作人', ['Papers Please','Return of the Obra Dinn'], '美国'),
  P('Shigesato Itoi', 50, ['糸井重里','Shigesato Itoi'], '制作人', ['地球冒险','Mother'], '日本'),
  P('横尾太郎', 55, ['横尾太郎','Yoko Taro'], '制作人', ['尼尔','龙背上的骑兵'], '日本'),
  P('齐藤阳介', 50, ['齐藤阳介','Yosuke Saito'], '制作人', ['Square Enix','尼尔'], '日本'),
  P('吉田直树', 55, ['吉田直树','Naoki Yoshida','P叔'], '制作人', ['最终幻想14','制作人'], '日本'),
  P('前广和宏', 45, ['前广和宏','Kazutoyo Maehiro'], '制作人', ['最终幻想14'], '日本'),
  P('河津秋敏', 50, ['河津秋敏','Akitoshi Kawazu'], '制作人', ['Square','沙加'], '日本'),
  P('名越稔洋', 55, ['名越稔洋','Toshihiro Nagoshi'], '制作人', ['如龙','世嘉'], '日本'),
  P('神藤盛一', 45, ['神藤盛一'], '制作人', ['万代','如龙'], '日本'),

  // ===== 中国游戏行业分析师/媒体人 =====
  P('洪涛', 50, ['洪涛'], '媒体', ['游戏陀螺','创始人']),
  P('郑江', 45, ['郑江'], '媒体', ['游戏陀螺']),
  P('刘尊', 45, ['刘尊'], '媒体', ['游戏葡萄','创始人']),
  P('赵旭', 45, ['赵旭'], '媒体', ['游戏葡萄']),
  P('孙永立', 45, ['孙永立'], '媒体', ['游戏茶馆','创始人']),
  P('李亚', 45, ['李亚'], '媒体', ['游戏茶馆']),
  P('黄尹', 45, ['黄尹'], '媒体', ['竞核','创始人']),
  P('章岱', 45, ['章岱'], '媒体', ['触乐','总编辑']),
  P('祝佳音', 50, ['祝佳音','@priests'], '媒体', ['触乐','资深编辑']),
  P('潘文怡', 45, ['潘文怡'], '媒体', ['触乐']),
  P('陈一斌', 45, ['陈一斌'], '媒体', ['游戏干线']),
  P('张书乐', 50, ['张书乐'], '分析师', ['游戏行业','评论人']),
  P('丁鹏', 45, ['丁鹏'], '媒体', ['游研社']),
  P('果脯1166', 40, ['果脯1166'], '媒体', ['游研社']),
  P('萧何', 45, ['萧何'], '分析师', ['游戏行业']),

  // ===== 投资人 =====
  P('曹曦', 45, ['曹曦'], '投资人', ['红杉中国','游戏投资']),
  P('李宏玮', 45, ['李宏玮'], '投资人', ['GGV纪源资本']),
  P('徐霄', 40, ['徐霄'], '投资人', ['腾讯投资']),
  P('王灏', 40, ['王灏'], '投资人', ['网易投资']),
  P('李谢', 40, ['李谢'], '投资人', ['米哈游','投资']),
  P('王一', 45, ['王一'], '创始人', ['Unity中国']),
  P('张俊涛', 40, ['张俊涛'], '高管', ['Unity中国']),
  P('沈黎', 45, ['沈黎'], '制作人', ['腾讯','天美工作室群']),
  P('姚晓光', 55, ['姚晓光'], '制作人', ['腾讯','天美','王者荣耀','制作人']),
  P('光子工作室群', 50, ['光子工作室群'], '工作室', ['腾讯','和平精英']),
  P('北极光工作室群', 45, ['北极光工作室群'], '工作室', ['腾讯','天涯明月刀']),
  P('魔方工作室群', 45, ['魔方工作室群'], '工作室', ['腾讯','火影忍者手游']),
  P('雷霆工作室', 40, ['雷霆工作室'], '工作室', ['网易','逆水寒']),
  P('雷火工作室', 40, ['雷火工作室'], '工作室', ['网易','逆水寒','梦幻西游']),
  P('盘古工作室', 40, ['盘古工作室'], '工作室', ['网易','游戏']),
  P('Interworld工作室', 40, ['Interworld'], '工作室', ['网易','游戏']),
  P('Zen工作室', 40, ['Zen工作室'], '工作室', ['米哈游','原神']),
  P('Hoyoverse', 50, ['HoYoverse','HoYoverse'], '品牌', ['米哈游','海外发行']),
  P('天美J6工作室', 40, ['天美J6'], '工作室', ['腾讯','王者荣耀']),
  P('天美L1工作室', 40, ['天美L1'], '工作室', ['腾讯','游戏']),
  P('天美T1工作室', 40, ['天美T1'], '工作室', ['腾讯','游戏']),
  P('天美Y1工作室', 40, ['天美Y1'], '工作室', ['腾讯','游戏']),
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

console.log(`Part4 人物: 新增 ${inserted}/${uniqueSeeds.length} 条`);
const total = db.prepare('SELECT count(*) as c FROM seeds').get().c;
console.log(`当前种子总数: ${total}`);
const personCount = db.prepare("SELECT count(*) as c FROM seeds WHERE seed_type = 'entity' AND entity_type = 'person'").get().c;
console.log(`人物种子总数: ${personCount}`);
db.close();
