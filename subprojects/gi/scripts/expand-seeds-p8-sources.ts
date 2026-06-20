/**
 * 大规模扩充种子 - Part 8: 信源（媒体/公众号/信息源）
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../data/gi.db'));

interface S { seedType: 'source'; text: string; score: number; tags: string[]; aliases: string[]; category: string; market: string; }
const M = (text: string, score: number, aliases: string[], category: string, tags: string[], market = '国内'): S => ({
  seedType: 'source', text, score, tags, aliases, category, market
});

const seeds: S[] = [
  // ===== 国内游戏行业媒体/公众号 =====
  M('GameLook', 80, ['GameLook','gamelook.com'], '行业媒体', ['P0信源','行业媒体']),
  M('游戏葡萄', 80, ['游戏葡萄','Youxiputao'], '行业媒体', ['P0信源','行业媒体']),
  M('游戏陀螺', 75, ['游戏陀螺','youxituoluo'], '行业媒体', ['P0信源','行业媒体']),
  M('触乐', 75, ['触乐','chuapp','触乐网'], '行业媒体', ['P0信源','深度报道']),
  M('游研社', 70, ['游研社','yystv'], '行业媒体', ['P1信源','游戏文化']),
  M('游戏茶馆', 70, ['游戏茶馆','youxichaguan'], '行业媒体', ['P1信源','行业媒体']),
  M('竞核', 70, ['竞核','Cores','竞核研究'], '行业媒体', ['P1信源','深度分析']),
  M('游戏干线', 65, ['游戏干线','GameExpress'], '行业媒体', ['P1信源','行业媒体']),
  M('手游那点事', 70, ['手游那点事'], '公众号', ['P1信源','公众号']),
  M('罗斯基', 60, ['罗斯基','luosiji'], '公众号', ['P2信源','公众号']),
  M('独立出海联合体', 60, ['独立出海联合体'], '公众号', ['P2信源','出海']),
  M('游戏新知', 60, ['游戏新知'], '公众号', ['P2信源','公众号']),
  M('游戏价值榜', 60, ['游戏价值榜'], '公众号', ['P2信源','公众号']),
  M('游戏产业时评', 60, ['游戏产业时评'], '公众号', ['P2信源','公众号']),
  M('独立游戏资讯', 55, ['独立游戏资讯'], '公众号', ['P2信源','独立游戏']),
  M('手游矩阵', 60, ['手游矩阵'], '公众号', ['P2信源','公众号']),
  M('游戏研究社', 65, ['游戏研究社'], '行业媒体', ['P1信源','深度']),
  M('游戏开发者GAD', 60, ['GAD','游戏开发者'], '社区', ['P2信源','开发者']),
  M('游戏策划实战', 55, ['游戏策划实战'], '公众号', ['P2信源','策划']),
  M('游戏数值策划', 55, ['游戏数值策划'], '公众号', ['P2信源','策划']),
  M('游戏策划笔记', 55, ['游戏策划笔记'], '公众号', ['P2信源','策划']),
  M('游戏设计理论', 55, ['游戏设计理论'], '公众号', ['P2信源','设计']),
  M('游戏策划入门', 50, ['游戏策划入门'], '公众号', ['P3信源','策划']),
  M('游戏美术资源', 55, ['游戏美术资源'], '公众号', ['P2信源','美术']),
  M('独立出海观察', 55, ['独立出海观察'], '公众号', ['P2信源','出海']),
  M('游戏出海指南', 60, ['游戏出海指南'], '公众号', ['P2信源','出海']),
  M('游戏茶馆小助手', 50, ['游戏茶馆小助手'], '公众号', ['P3信源']),
  M('游戏产业报告', 60, ['游戏产业报告'], '公众号', ['P2信源','报告']),
  M('游戏行业数据', 60, ['游戏行业数据'], '公众号', ['P2信源','数据']),

  // ===== 科技/商业媒体 =====
  M('36氪', 75, ['36氪','36kr','36氪游戏'], '科技媒体', ['P1信源','科技','创投']),
  M('虎嗅', 70, ['虎嗅','huxiu'], '科技媒体', ['P1信源','科技','商业']),
  M('钛媒体', 70, ['钛媒体','tmtpost'], '科技媒体', ['P1信源','科技']),
  M('极客公园', 65, ['极客公园','GeekPark'], '科技媒体', ['P2信源','科技']),
  M('品玩', 60, ['品玩','PingWest'], '科技媒体', ['P2信源','科技']),
  M('爱范儿', 60, ['爱范儿','ifanr'], '科技媒体', ['P2信源','科技']),
  M('少数派', 60, ['少数派','sspai'], '科技媒体', ['P2信源','科技']),
  M('机核', 65, ['机核','GCORES','机核网'], '游戏社区', ['P1信源','游戏文化','社区']),
  M('新浪科技', 65, ['新浪科技','tech.sina'], '科技媒体', ['P1信源','科技']),
  M('腾讯科技', 65, ['腾讯科技','tech.qq'], '科技媒体', ['P1信源','科技']),
  M('网易科技', 60, ['网易科技'], '科技媒体', ['P2信源','科技']),
  M('搜狐科技', 55, ['搜狐科技'], '科技媒体', ['P2信源','科技']),
  M('凤凰科技', 55, ['凤凰科技'], '科技媒体', ['P2信源','科技']),
  M('界面新闻', 60, ['界面','界面新闻','jiemian'], '新闻媒体', ['P2信源','新闻']),
  M('澎湃新闻', 60, ['澎湃','thepaper'], '新闻媒体', ['P2信源','新闻']),
  M('第一财经', 65, ['第一财经','CBN','yicai'], '财经媒体', ['P1信源','财经']),
  M('晚点LatePost', 70, ['晚点','LatePost'], '科技媒体', ['P1信源','深度','科技']),
  M('华尔街见闻', 65, ['华尔街见闻','wallstreetcn'], '财经媒体', ['P1信源','财经']),
  M('中国企业家', 55, ['中国企业家'], '商业媒体', ['P2信源','商业']),
  M('每日经济新闻', 60, ['每日经济新闻','NBD'], '财经媒体', ['P2信源','财经']),
  M('21世纪经济报道', 55, ['21世纪经济报道','21jingji'], '财经媒体', ['P2信源','财经']),
  M('证券时报', 55, ['证券时报','stcn'], '财经媒体', ['P2信源','财经']),
  M('经济观察报', 50, ['经济观察报','eeo'], '财经媒体', ['P3信源','财经']),
  M('财联社', 60, ['财联社','cls'], '财经媒体', ['P2信源','财经']),

  // ===== 国际游戏媒体 =====
  M('IGN', 75, ['IGN','ign.com'], '国际媒体', ['P0信源','国际','评测'], '全球'),
  M('Kotaku', 70, ['Kotaku','kotaku.com'], '国际媒体', ['P1信源','国际','评论'], '全球'),
  M('Polygon', 70, ['Polygon','polygon.com'], '国际媒体', ['P1信源','国际','评论'], '全球'),
  M('Eurogamer', 70, ['Eurogamer','eurogamer.net'], '国际媒体', ['P1信源','国际','评测'], '全球'),
  M('PC Gamer', 70, ['PC Gamer','pcgamer.com'], '国际媒体', ['P1信源','PC','评测'], '全球'),
  M('GamesIndustry.biz', 75, ['GI.biz','GamesIndustry','gamesindustry.biz'], '国际媒体', ['P0信源','行业','商业'], '全球'),
  M('Game Developer (Gamasutra)', 75, ['Gamasutra','Game Developer','gamedeveloper.com'], '国际媒体', ['P0信源','开发','行业'], '全球'),
  M('VG247', 65, ['VG247','vg247.com'], '国际媒体', ['P2信源','国际','新闻'], '全球'),
  M('Rock Paper Shotgun', 65, ['RPS','Rock Paper Shotgun','rockpapershotgun.com'], '国际媒体', ['P2信源','PC','评论'], '全球'),
  M('GameSpot', 70, ['GameSpot','gamespot.com'], '国际媒体', ['P1信源','国际','评测'], '全球'),
  M('Gematsu', 70, ['Gematsu','gematsu.com'], '国际媒体', ['P1信源','日系','新闻'], '全球'),
  M('Siliconera', 60, ['Siliconera','siliconera.com'], '国际媒体', ['P2信源','日系'], '全球'),
  M('Nintendo Life', 65, ['Nintendo Life','nintendolife.com'], '国际媒体', ['P2信源','任天堂'], '全球'),
  M('Push Square', 60, ['Push Square','pushsquare.com'], '国际媒体', ['P2信源','PlayStation'], '全球'),
  M('Pure Xbox', 60, ['Pure Xbox','purexbox.com'], '国际媒体', ['P2信源','Xbox'], '全球'),
  M('VGC', 65, ['VGC','Video Games Chronicle','videogameschronicle.com'], '国际媒体', ['P2信源','国际','新闻'], '全球'),
  M('The Gamer', 60, ['The Gamer','thegamer.com'], '国际媒体', ['P2信源','国际'], '全球'),
  M('Game Rant', 60, ['Game Rant','gamerant.com'], '国际媒体', ['P2信源','国际'], '全球'),
  M('Destructoid', 55, ['Destructoid','destructoid.com'], '国际媒体', ['P3信源','国际'], '全球'),
  M('PCGamesN', 55, ['PCGamesN','pcgamesn.com'], '国际媒体', ['P3信源','PC'], '全球'),
  M('The Verge', 65, ['The Verge','theverge.com'], '国际媒体', ['P1信源','科技','国际'], '全球'),
  M('Ars Technica', 60, ['Ars Technica','arstechnica.com'], '国际媒体', ['P2信源','科技'], '全球'),
  M('Engadget', 60, ['Engadget','engadget.com'], '国际媒体', ['P2信源','科技'], '全球'),
  M('Wired', 60, ['Wired','wired.com'], '国际媒体', ['P2信源','科技','文化'], '全球'),
  M('VentureBeat', 65, ['VentureBeat','venturebeat.com'], '国际媒体', ['P1信源','科技','投资'], '全球'),
  M('TechCrunch', 70, ['TechCrunch','techcrunch.com'], '国际媒体', ['P1信源','科技','投资'], '全球'),
  M('Forbes Games', 60, ['Forbes','福布斯'], '国际媒体', ['P2信源','商业'], '全球'),
  M('Bloomberg Technology', 65, ['Bloomberg','彭博'], '国际媒体', ['P1信源','财经','科技'], '全球'),
  M('Reuters Technology', 60, ['Reuters','路透社'], '国际媒体', ['P2信源','新闻'], '全球'),
  M('CNBC Technology', 55, ['CNBC'], '国际媒体', ['P3信源','财经'], '全球'),
  M('Famitsu', 70, ['Famitsu','ファミ通'], '国际媒体', ['P1信源','日系','评测'], '日本'),
  M('电击Online', 65, ['電撃Online','dengekionline'], '国际媒体', ['P2信源','日系'], '日本'),
  M('4Gamer', 65, ['4Gamer','4gamer.net'], '国际媒体', ['P2信源','日系'], '日本'),
  M('Game Watch', 60, ['Game Watch','game.watch.impress'], '国际媒体', ['P2信源','日系'], '日本'),
  M('インサイド', 55, ['Inside','inside-games.jp'], '国际媒体', ['P3信源','日系'], '日本'),
  M('This Is Game', 60, ['This Is Game','thisisgame.com'], '国际媒体', ['P2信源','韩系'], '韩国'),
  M('INVEN', 55, ['INVEN','inven.co.kr'], '国际媒体', ['P2信源','韩系','社区'], '韩国'),

  // ===== 数据/分析机构 =====
  M('Sensor Tower', 75, ['Sensor Tower','sensortower.com'], '数据机构', ['P0信源','数据','移动']),
  M('data.ai', 75, ['data.ai','App Annie'], '数据机构', ['P0信源','数据','移动']),
  M('伽马数据', 70, ['伽马数据','CNG','cgigc.com.cn'], '数据机构', ['P0信源','数据','国内']),
  M('七麦数据', 65, ['七麦','七麦数据','qimai'], '数据机构', ['P1信源','数据','iOS']),
  M('点点数据', 60, ['点点','点点数据','diandian'], '数据机构', ['P2信源','数据']),
  M('Newzoo', 70, ['Newzoo','newzoo.com'], '数据机构', ['P0信源','数据','全球']),
  M('Niko Partners', 65, ['Niko Partners','nikopartners.com'], '数据机构', ['P1信源','数据','亚洲']),
  M('Circana (NPD)', 65, ['Circana','NPD','circana.com'], '数据机构', ['P1信源','数据','零售']),
  M('SteamDB', 65, ['SteamDB','steamdb.info'], '数据机构', ['P1信源','数据','Steam']),
  M('SteamSpy', 60, ['SteamSpy','steamspy.com'], '数据机构', ['P2信源','数据','Steam']),
  M('VG Insights', 60, ['VG Insights','vginsights.com'], '数据机构', ['P2信源','数据','Steam']),
  M('VGChartz', 55, ['VGChartz','vgchartz.com'], '数据机构', ['P2信源','数据','主机']),
  M('ActivePlayer.io', 55, ['ActivePlayer','activeplayer.io'], '数据机构', ['P2信源','数据','在线']),
  M('PlayTracker', 50, ['PlayTracker','playtracker.net'], '数据机构', ['P3信源','数据']),
  M('Axyris', 50, ['Axyris'], '数据机构', ['P3信源','数据']),
  M('DataEye', 65, ['DataEye','dataeye.com'], '数据机构', ['P1信源','数据','买量']),
  M('热云数据', 60, ['热云','热云数据','reyun'], '数据机构', ['P2信源','数据','买量']),
  M('DataTalent', 55, ['DataTalent'], '数据机构', ['P2信源','数据']),
  M('广大大', 55, ['广大大','guangdada'], '数据机构', ['P2信源','数据','买量']),
  M('AppGrowing', 60, ['AppGrowing','appgrowing.cn'], '数据机构', ['P2信源','数据','买量']),

  // ===== 社区/论坛 =====
  M('TapTap', 80, ['TapTap','taptap.com','TapTap社区'], '社区', ['P0信源','社区','平台']),
  M('游民星空', 70, ['游民星空','gamersky'], '社区', ['P1信源','社区','PC']),
  M('3DM', 70, ['3DM','3dmgame','三大妈'], '社区', ['P1信源','社区','PC']),
  M('游侠网', 65, ['游侠网','ali213'], '社区', ['P1信源','社区','PC']),
  M('NGA玩家社区', 70, ['NGA','NGA社区','bbs.nga.cn'], '社区', ['P1信源','社区','精英玩家']),
  M('百度贴吧', 70, ['贴吧','百度贴吧','tieba'], '社区', ['P1信源','社区','大众']),
  M('小黑盒', 70, ['小黑盒','xiaoheihe'], '社区', ['P1信源','社区','Steam']),
  M('好游快爆', 65, ['好游快爆','3839'], '社区', ['P1信源','社区','手游']),
  M('摸摸鱼', 55, ['摸摸鱼'], '社区', ['P2信源','社区']),
  M('酷安', 60, ['酷安','coolapk'], '社区', ['P2信源','社区','Android']),
  M('Reddit', 70, ['Reddit','reddit.com'], '社区', ['P1信源','社区','国际'], '全球'),
  M('r/gaming', 60, ['r/gaming'], '社区', ['P2信源','社区','Reddit'], '全球'),
  M('r/Games', 60, ['r/Games'], '社区', ['P2信源','社区','Reddit'], '全球'),
  M('ResetEra', 60, ['ResetEra','resetera.com'], '社区', ['P2信源','社区','国际'], '全球'),
  M('NeoGAF', 50, ['NeoGAF'], '社区', ['P3信源','社区'], '全球'),
  M('Discord', 70, ['Discord','discord.com'], '社区', ['P1信源','社区','即时通讯'], '全球'),

  // ===== 视频/直播平台 =====
  M('B站游戏区', 75, ['B站','Bilibili','哔哩哔哩','游戏区'], '视频平台', ['P0信源','视频','社区']),
  M('抖音游戏', 70, ['抖音游戏','douyin'], '视频平台', ['P1信源','视频','短视频']),
  M('快手游戏', 65, ['快手游戏','kuaishou'], '视频平台', ['P1信源','视频','短视频']),
  M('西瓜视频游戏', 55, ['西瓜视频','xigua'], '视频平台', ['P2信源','视频']),
  M('斗鱼', 65, ['斗鱼','douyu'], '直播平台', ['P1信源','直播']),
  M('虎牙', 65, ['虎牙','huya'], '直播平台', ['P1信源','直播']),
  M('Twitch', 70, ['Twitch','twitch.tv'], '直播平台', ['P1信源','直播','国际'], '全球'),
  M('YouTube Gaming', 65, ['YouTube Gaming','YouTube游戏'], '视频平台', ['P1信源','视频','国际'], '全球'),
  M('CC直播', 55, ['CC直播','网易CC'], '直播平台', ['P2信源','直播','网易']),
  M('战旗直播', 50, ['战旗','zhanqi'], '直播平台', ['P3信源','直播']),
  M('企鹅电竞', 45, ['企鹅电竞'], '直播平台', ['P3信源','直播','腾讯']),
  M('火猫直播', 45, ['火猫直播'], '直播平台', ['P3信源','直播']),

  // ===== 应用商店/分发平台 =====
  M('App Store', 75, ['App Store','苹果商店','iOS商店'], '应用商店', ['P0信源','分发','iOS'], '全球'),
  M('Google Play', 75, ['Google Play','Google商店','安卓商店'], '应用商店', ['P0信源','分发','Android'], '全球'),
  M('Steam', 80, ['Steam','steam.com','Steam商店'], '分发平台', ['P0信源','PC','分发'], '全球'),
  M('Epic Games Store', 70, ['Epic Games Store','EGS'], '分发平台', ['P1信源','PC','分发'], '全球'),
  M('GOG', 60, ['GOG','gog.com'], '分发平台', ['P2信源','PC','分发'], '全球'),
  M('itch.io', 60, ['itch.io','itch'], '分发平台', ['P2信源','独立','PC'], '全球'),
  M('Microsoft Store', 60, ['Microsoft Store','微软商店'], '分发平台', ['P2信源','PC','分发'], '全球'),
  M('Xbox Store', 60, ['Xbox Store','Xbox商店'], '分发平台', ['P2信源','主机','分发'], '全球'),
  M('PlayStation Store', 65, ['PS Store','PS商店','PlayStation Store'], '分发平台', ['P1信源','主机','分发'], '全球'),
  M('Nintendo eShop', 60, ['eShop','任天堂商店'], '分发平台', ['P2信源','主机','分发'], '全球'),
  M('华为应用市场', 60, ['华为应用市场','华为商店','AppGallery'], '应用商店', ['P2信源','分发','华为']),
  M('小米应用商店', 55, ['小米应用商店','小米商店'], '应用商店', ['P2信源','分发','小米']),
  M('OPPO软件商店', 55, ['OPPO软件商店','OPPO商店'], '应用商店', ['P2信源','分发','OPPO']),
  M('vivo应用商店', 55, ['vivo应用商店','vivo商店'], '应用商店', ['P2信源','分发','vivo']),
  M('应用宝', 60, ['应用宝','腾讯应用宝'], '应用商店', ['P2信源','分发','腾讯']),
  M('TapTap商店', 65, ['TapTap商店'], '应用商店', ['P1信源','分发','TapTap']),
  M('好游快爆商店', 55, ['好游快爆商店'], '应用商店', ['P2信源','分发']),
  M('WeGame', 60, ['WeGame','腾讯WeGame'], '分发平台', ['P2信源','PC','分发','腾讯']),
  M('Steam China', 55, ['Steam中国','蒸汽平台'], '分发平台', ['P2信源','PC','分发']),

  // ===== 政府/行业组织 =====
  M('国家新闻出版署', 80, ['版号','国家新闻出版署','NPPA'], '政府', ['P0信源','版号','政策']),
  M('中国音数协', 70, ['音数协','中国音数协','ChinaJoy'], '行业组织', ['P1信源','版号','行业']),
  M('中国游戏产业报告', 65, ['中国游戏产业报告','CNG报告'], '报告', ['P1信源','报告','数据']),
  M('伽马数据年度报告', 60, ['伽马年度报告'], '报告', ['P2信源','报告','数据']),
  M('中国游戏产业年会', 60, ['游戏产业年会'], '行业活动', ['P2信源','行业活动']),
  M('游戏工委', 65, ['游戏工委','中国音像与数字出版协会'], '行业组织', ['P1信源','政策','行业']),
  M('上海市新闻出版局', 55, ['上海新闻出版局'], '政府', ['P2信源','版号','上海']),
  M('文化和旅游部', 55, ['文旅部','文化和旅游部'], '政府', ['P2信源','政策']),
  M('工信部', 55, ['工信部','工业和信息化部'], '政府', ['P2信源','政策']),
  M('网信办', 60, ['网信办','国家互联网信息办公室'], '政府', ['P1信源','政策','监管']),
  M('中宣部', 55, ['中宣部','中共中央宣传部'], '政府', ['P2信源','政策']),

  // ===== 海外行业组织/展会 =====
  M('ESA', 65, ['ESA','Entertainment Software Association'], '行业组织', ['P1信源','国际','E3'], '美国'),
  M('E3', 70, ['E3','Electronic Entertainment Expo'], '展会', ['P1信源','展会','国际'], '美国'),
  M('gamescom', 70, ['gamescom','科隆游戏展'], '展会', ['P1信源','展会','欧洲'], '德国'),
  M('TGS', 70, ['TGS','东京电玩展','Tokyo Game Show'], '展会', ['P1信源','展会','日本'], '日本'),
  M('ChinaJoy', 70, ['ChinaJoy','CJ','中国国际数码互动娱乐展'], '展会', ['P1信源','展会','国内']),
  M('GDC', 70, ['GDC','Game Developers Conference','游戏开发者大会'], '展会', ['P1信源','展会','开发'], '美国'),
  M('TGA', 70, ['TGA','The Game Awards','游戏大奖'], '展会', ['P1信源','奖项','国际'], '美国'),
  M('Bit Summits', 55, ['Bit Summits'], '展会', ['P2信源','展会','独立'], '日本'),
  M('PAX', 60, ['PAX','PAX East','PAX West'], '展会', ['P2信源','展会','玩家'], '美国'),
  M('QuakeCon', 50, ['QuakeCon'], '展会', ['P3信源','展会'], '美国'),
  M('BlizzCon', 60, ['BlizzCon','暴雪嘉年华'], '展会', ['P2信源','展会','暴雪'], '美国'),
  M('The Game Awards', 70, ['TGA','游戏大奖'], '展会', ['P1信源','奖项'], '美国'),

  // ===== 公司官方媒体/信源 =====
  M('腾讯游戏官方', 60, ['腾讯游戏','腾讯游戏官方'], '公司媒体', ['P2信源','腾讯']),
  M('网易游戏官方', 60, ['网易游戏','网易游戏官方'], '公司媒体', ['P2信源','网易']),
  M('米哈游官方', 65, ['米哈游','HoYoverse','miHoYo'], '公司媒体', ['P1信源','米哈游']),
  M('PlayStation Blog', 65, ['PS Blog','PlayStation Blog'], '公司媒体', ['P1信源','PlayStation','索尼']),
  M('Xbox Wire', 65, ['Xbox Wire','Xbox官方博客'], '公司媒体', ['P1信源','Xbox','微软']),
  M('Nintendo News', 65, ['Nintendo News','任天堂新闻'], '公司媒体', ['P1信源','任天堂']),
  M('Steam News', 65, ['Steam News','Steam新闻'], '公司媒体', ['P1信源','Steam','Valve']),
  M('Epic Games News', 60, ['Epic Games News'], '公司媒体', ['P2信源','Epic']),
  M('EA News', 55, ['EA News','EA新闻'], '公司媒体', ['P2信源','EA']),
  M('Ubisoft News', 55, ['Ubisoft News','育碧新闻'], '公司媒体', ['P2信源','育碧']),
  M('Activision Blog', 55, ['Activision Blog'], '公司媒体', ['P2信源','动视']),
  M('Riot Games News', 60, ['Riot News','拳头游戏新闻'], '公司媒体', ['P2信源','Riot']),
  M('Valve News', 60, ['Valve News'], '公司媒体', ['P2信源','Valve']),
  M('CD Projekt Red News', 55, ['CDPR News'], '公司媒体', ['P2信源','CDPR']),
  M('FromSoftware News', 55, ['FromSoftware News','FS社新闻'], '公司媒体', ['P2信源','FromSoftware']),
  M('Bethesda Blog', 55, ['Bethesda Blog'], '公司媒体', ['P2信源','Bethesda']),
  M('Square Enix News', 55, ['Square Enix News','SE新闻'], '公司媒体', ['P2信源','Square Enix']),
  M('Capcom News', 55, ['Capcom News','卡普空新闻'], '公司媒体', ['P2信源','Capcom']),
  M('Konami News', 50, ['Konami News'], '公司媒体', ['P3信源','Konami']),
  M('Sega News', 50, ['Sega News','世嘉新闻'], '公司媒体', ['P3信源','Sega']),

  // ===== 游戏 KOL/自媒体 =====
  M('老番茄', 55, ['老番茄'], 'KOL', ['P2信源','KOL','B站']),
  M('逍遥散人', 55, ['逍遥散人'], 'KOL', ['P2信源','KOL','B站']),
  M('敖厂长', 55, ['敖厂长'], 'KOL', ['P2信源','KOL','B站']),
  M('渗透之C君', 50, ['渗透之C君'], 'KOL', ['P2信源','KOL','B站']),
  M('某幻君', 50, ['某幻君'], 'KOL', ['P2信源','KOL','B站']),
  M('黑镖客梦回', 50, ['黑镖客梦回'], 'KOL', ['P2信源','KOL','B站']),
  M('STN工作室', 55, ['STN','STN工作室'], 'KOL', ['P2信源','KOL','评测']),
  M('游民编辑部', 50, ['游民编辑部'], 'KOL', ['P2信源','KOL','游民']),
  M('3DM游戏网', 55, ['3DM游戏网'], 'KOL', ['P2信源','KOL','3DM']),
  M('游戏知事', 50, ['游戏知事'], 'KOL', ['P2信源','KOL','公众号']),
  M('游戏时光VGTime', 60, ['VGTime','游戏时光'], '行业媒体', ['P1信源','行业媒体']),
  M(' indienova', 55, ['indienova','独立精神'], '行业媒体', ['P2信源','独立游戏']),
  M('游戏角', 50, ['游戏角'], '公众号', ['P2信源','公众号']),
  M('游戏圈的那些事儿', 50, ['游戏圈的那些事儿'], '公众号', ['P2信源','公众号']),
  M('游戏日报', 55, ['游戏日报'], '公众号', ['P2信源','公众号']),
  M('游戏圈头条', 50, ['游戏圈头条'], '公众号', ['P2信源','公众号']),
  M('游戏新知', 55, ['游戏新知'], '公众号', ['P2信源','公众号']),

  // ===== RSS 聚合/订阅源 =====
  M('Feedly', 55, ['Feedly','feedly.com'], '聚合平台', ['P2信源','RSS']),
  M('Inoreader', 50, ['Inoreader'], '聚合平台', ['P3信源','RSS']),
  M('RSSHub', 65, ['RSSHub','rsshub.app'], '聚合平台', ['P1信源','RSS','万物皆可RSS']),
  M('Follow', 55, ['Follow','follow.is'], '聚合平台', ['P2信源','RSS']),
  M('Hacker News', 60, ['HN','Hacker News','news.ycombinator'], '社区', ['P2信源','科技','RSS'], '全球'),
  M('Product Hunt', 55, ['Product Hunt','producthunt'], '社区', ['P2信源','产品']),
  M('InfoQ', 60, ['InfoQ','infoq.cn'], '科技媒体', ['P2信源','技术']),
  M('CSDN', 60, ['CSDN','csdn.net'], '社区', ['P2信源','技术','开发者']),
  M('掘金', 55, ['掘金','juejin'], '社区', ['P2信源','技术','开发者']),
  M('SegmentFault', 50, ['SegmentFault','sf'], '社区', ['P2信源','技术','开发者']),
];

// 去重插入
const existing = db.prepare('SELECT text FROM seeds').all().map((r: any) => r.text);
const uniqueSeeds = seeds.filter(s => !existing.includes(s.text));

const insertSQL = `
  INSERT OR IGNORE INTO seeds (id, seed_type, text, score, status, aliases, category, market, tags, discovery_count, fail_count, created_at, updated_at)
  VALUES (@id, @seed_type, @text, @score, 'active', @aliases, @category, @market, @tags, 0, 0, datetime('now'), datetime('now'))
`;
const insert = db.prepare(insertSQL);
let inserted = 0;
for (const seed of uniqueSeeds) {
  const r = insert.run({
    id: uuidv4(), seed_type: seed.seedType, text: seed.text, score: seed.score,
    aliases: JSON.stringify(seed.aliases),
    category: seed.category, market: seed.market, tags: JSON.stringify(seed.tags),
  });
  if (r.changes > 0) inserted++;
}

const total = db.prepare('SELECT count(*) as c FROM seeds').get().c;
console.log(`Part8 信源: 新增 ${inserted}/${uniqueSeeds.length} 条`);
console.log(`\n📰 最终种子总数: ${total} 条`);
console.log(`\n按类型:`);
db.prepare('SELECT seed_type, count(*) as c FROM seeds GROUP BY seed_type').all().forEach((r: any) => console.log(`  ${r.seed_type}: ${r.c}`));
console.log(`\n实体种子:`);
db.prepare("SELECT entity_type, count(*) as c FROM seeds WHERE seed_type='entity' AND entity_type IS NOT NULL GROUP BY entity_type").all().forEach((r: any) => console.log(`  ${r.entity_type}: ${r.c}`));
console.log(`\n信源种子（source类型）:`);
db.prepare("SELECT category, count(*) as c FROM seeds WHERE seed_type='source' GROUP BY category ORDER BY c DESC").all().forEach((r: any) => console.log(`  ${r.category}: ${r.c}`));
console.log(`\n信源总计: ${db.prepare("SELECT count(*) as c FROM seeds WHERE seed_type='source'").get().c}`);
db.close();
