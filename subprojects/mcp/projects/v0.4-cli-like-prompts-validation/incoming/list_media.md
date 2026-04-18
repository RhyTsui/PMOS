# MCP报表工具 - 媒体维度表接口使用说明

## 一、基本信息

| 项目 | 说明 |
|------|------|
| **接口名称** | 媒体维度表 |
| **Tool名称** | `list_media` |
| **描述** | 媒体名与媒体ID的映射关系，获取拥有权限的媒体列表，返回媒体ID、媒体名称、以及支持报表查询开始时间 |
| **业务领域** | 广告投放，游戏运营 |
| **版本号** | V1.2（内部版本） |
| **更新频率** | 20分钟 |
| **默认时间范围** | last_7_days |
| **最早可用日期** | 2025-01-01 |
| **最晚可用日期** | 可查当日数据 |
| **数据范围** | **包含所有媒体类型数据**，包括广告(AD)、市场(MKT)、ASO、自定义(CUSTOM)等全渠道媒体 |

### 1.1 重要说明：不同报表的数据范围

| 报表类型 | 支持的媒体类型 | 默认包含自然量 | 说明 |
|---------|--------------|--------------|------|
| **日周月报** | **仅广告(AD)媒体** | **否**（需显式指定） | 只能查询promotion_source=AD的媒体，自然量需通过media_id=99999显式查询 |
| **ROI报表** | **所有媒体类型** | 是（支持） | 支持查询AD/MKT/ASO/CUSTOM等所有类型媒体 |
| **留存报表** | **所有媒体类型** | 是（支持） | 支持查询AD/MKT/ASO/CUSTOM等所有类型媒体 |
| **小时报表** | **所有媒体类型** | 是（支持） | 支持查询AD/MKT/ASO/CUSTOM等所有类型媒体 |

---

## 二、媒体列表

### 2.1 国内主流广告媒体（promotion_source=AD）

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 |
|---------|-----------|-----------------|--------|--------------|---------|
| **10001** | 巨量广告 | AD | MAINLAND | COMMON | 巨量、头条、今日头条、巨量引擎、抖音广告、抖音、字节跳动、抖音平台 |
| **10002** | 腾讯广告 | AD | MAINLAND | COMMON | 腾讯、腾讯社交广告、微信广告、微信、QQ广告、QQ、广点通 |
| **10003** | 快手广告 | AD | MAINLAND | COMMON | 快手、快手信息流、快手商业 |
| **10004** | 百度搜索 | AD | MAINLAND | SEARCH | 百度、百度推广、百度搜索推广、百度SEM |
| **10005** | 百度信息流 | AD | MAINLAND | COMMON | 百度信息流、百度APP、百度FEED、百度信息流广告 |
| **10006** | 爱奇艺广告 | AD | MAINLAND | COMMON | 爱奇艺 |
| **10007** | B站广告 | AD | MAINLAND | COMMON | B站、哔哩哔哩、bilibili、B站信息流 |
| **10008** | UC头条 | AD | MAINLAND | COMMON | UC、UC头条、UC信息流 |
| **10009** | 神马搜索 | AD | MAINLAND | SEARCH | 神马、神马搜索 |
| **10010** | 超级粉丝通 | AD | MAINLAND | COMMON | 超级粉丝通、微博广告、微博粉丝通 |
| **10011** | 虎牙广告 | AD | MAINLAND | COMMON | 虎牙 |
| **10012** | Oppo广告 | AD | MAINLAND | HARDCORE | Oppo、Oppo商店、欧珀、Oppo应用商店 |
| **10013** | 华为商店广告 | AD | MAINLAND | HARDCORE | 华为、华为应用市场、华为商店、华为应用商店 |
| **10014** | Vivo广告 | AD | MAINLAND | HARDCORE | Vivo、Vivo商店、Vivo应用商店 |
| **10015** | 小米广告 | AD | MAINLAND | HARDCORE | 小米、小米应用商店、小米商店、小米应用市场 |
| **10016** | 苹果广告 | AD | MAINLAND | SEARCH | Apple Search Ads、苹果搜索、ASA、苹果搜索广告 |
| **10017** | Sigmob | AD | MAINLAND | COMMON | Sigmob |
| **10018** | Unity广告 | AD | MAINLAND | COMMON | Unity、Unity Ads |
| **10019** | TapTap广告 | AD | MAINLAND | COMMON | TapTap、TapTap广告 |
| **10020** | 斗鱼广告 | AD | MAINLAND | COMMON | 斗鱼 |
| **10021** | 知乎广告 | AD | MAINLAND | COMMON | 知乎 |
| **10022** | 网易有道 | AD | MAINLAND | COMMON | 网易有道 |
| **10023** | 网易云音乐 | AD | MAINLAND | COMMON | 网易云音乐、网易云 |
| **10024** | 支付宝广告 | AD | MAINLAND | COMMON | 支付宝 |
| **10025** | 优酷广告 | AD | MAINLAND | COMMON | 优酷 |
| **10104** | 陌陌原生广告平台 | AD | MAINLAND | COMMON | 陌陌 |
| **10105** | 汽车之家 | AD | MAINLAND | COMMON | 汽车之家 |
| **10107** | 搜狐 | AD | MAINLAND | COMMON | 搜狐 |
| **10108** | 趣头条 | AD | MAINLAND | COMMON | 趣头条 |
| **10114** | 东方头条 | AD | MAINLAND | COMMON | 东方头条 |
| **10115** | 新浪扶翼 | AD | MAINLAND | COMMON | 新浪扶翼、新浪 |
| **10120** | 极光精准广告 | AD | MAINLAND | COMMON | 极光 |
| **10121** | 金山游戏广告 | AD | MAINLAND | COMMON | 金山 |
| **10122** | 广告花火 | AD | MAINLAND | COMMON | 花火 |
| **10140** | 小红书 | AD | MAINLAND | COMMON | 小红书 |
| **10141** | 广告星图 | AD | MAINLAND | COMMON | 星图、抖音星图 |
| **10142** | 广告聚星 | AD | MAINLAND | COMMON | 聚星、快手聚星 |
| **10146** | 搜狗搜索 | AD | MAINLAND | SEARCH | 搜狗、搜狗搜索 |
| **10147** | 百度品专 | AD | MAINLAND | SEARCH | 百度品专 |
| **10148** | 巨量云游戏 | AD | MAINLAND | COMMON | 巨量云游戏 |
| **10149** | soul | AD | MAINLAND | COMMON | SOUL、Soul |
| **10163** | 腾讯互选 | AD | MAINLAND | COMMON | 腾讯互选 |

### 2.2 海外主流广告媒体（promotion_source=AD）

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 |
|---------|-----------|-----------------|--------|--------------|---------|
| **20001** | Facebook | AD | OVERSEAS | COMMON | 脸书、FB、Facebook Ads |
| **20002** | Tiktok | AD | OVERSEAS | COMMON | 国际版抖音、TikTok Ads、TikTok广告 |
| **20003** | Google | AD | OVERSEAS | COMMON | 谷歌、Google Ads、谷歌广告 |

### 2.3 市场推广媒体（promotion_source=MKT）

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 |
|---------|-----------|-----------------|--------|--------------|---------|
| **10030** | 市场星图 | MKT | MAINLAND | MARKET | 市场星图 |
| **10031** | 抖音游戏 | MKT | MAINLAND | MARKET | 抖音游戏、抖音游戏推广 |
| **10032** | 市场聚星 | MKT | MAINLAND | MARKET | 市场聚星 |
| **10138** | 飞火 | MKT | MAINLAND | MARKET | 飞火 |
| **10143** | 市场花火 | MKT | MAINLAND | MARKET | 市场花火 |
| **10144** | 市场星图结算类 | MKT | MAINLAND | MARKET | 市场星图结算类 |

### 2.4 ASO优化服务媒体（promotion_source=UNKNOWN）

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 |
|---------|-----------|-----------------|--------|--------------|---------|
| **10029** | 七麦ASO | UNKNOWN | MAINLAND | ASO | 七麦、七麦ASO、七麦推广 |
| **10123** | imoney | UNKNOWN | MAINLAND | ASO | imoney |
| **10124** | 寸之金 | UNKNOWN | MAINLAND | ASO | 寸之金 |
| **10125** | 聚点ASO | UNKNOWN | MAINLAND | ASO | 聚点ASO |
| **10126** | 叁特 | UNKNOWN | MAINLAND | ASO | 叁特 |
| **10127** | 内涵ASO | UNKNOWN | MAINLAND | ASO | 内涵ASO |
| **10129** | 云测ASO | UNKNOWN | MAINLAND | ASO | 云测ASO、Testin |
| **10136** | 蝉大师ASO | AD | MAINLAND | ASO | 蝉大师、蝉大师ASO |
| **10150** | 试客ASO | UNKNOWN | MAINLAND | ASO | 试客ASO |

### 2.5 DSP广告平台媒体（promotion_source=AD）

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 |
|---------|-----------|-----------------|--------|--------------|---------|
| **10036** | 优源 | AD | MAINLAND | DSP | 优源 |
| **10037** | 一栗 | AD | MAINLAND | DSP | 一栗 |
| **10038** | 点点ASO | AD | MAINLAND | DSP | 点点ASO |
| **10039** | Inmobi | AD | MAINLAND | DSP | Inmobi |
| **10040** | 懒鱼 | AD | MAINLAND | DSP | 懒鱼 |
| **10041** | 熊猫试玩 | AD | MAINLAND | DSP | 熊猫试玩 |
| **10042** | 扬京 | AD | MAINLAND | DSP | 扬京 |
| **10043** | 脉络时代 | AD | MAINLAND | DSP | 脉络时代 |
| **10044** | 棉花糖 | AD | MAINLAND | DSP | 棉花糖 |
| **10045** | Vungle | AD | MAINLAND | DSP | Vungle |
| **10046** | 有米 | AD | MAINLAND | DSP | 有米、有米广告 |
| **10047** | AppLovin | AD | MAINLAND | DSP | AppLovin |
| **10048** | 聚告 | AD | MAINLAND | DSP | 聚告 |
| **10049** | 舜飞DSP | AD | MAINLAND | DSP | 舜飞DSP、舜飞 |
| **10050** | Lingkmedia | AD | MAINLAND | DSP | Lingkmedia |
| **10051** | 新数DSP | AD | MAINLAND | DSP | 新数DSP |
| **10052** | 射手 | AD | MAINLAND | DSP | 射手 |
| **10053** | 济南九神 | AD | MAINLAND | DSP | 济南九神 |
| **10054** | 中旭 | AD | MAINLAND | DSP | 中旭 |
| **10055** | 迈腾 | AD | MAINLAND | DSP | 迈腾 |
| **10056** | mediaMob | AD | MAINLAND | DSP | mediaMob |
| **10057** | AdBright | AD | MAINLAND | DSP | AdBright |
| **10058** | 氪金 | AD | MAINLAND | DSP | 氪金 |
| **10059** | 旺脉 | AD | MAINLAND | DSP | 旺脉 |
| **10060** | Yeahmobi | AD | MAINLAND | DSP | Yeahmobi |
| **10061** | wifi万能钥匙 | AD | MAINLAND | COMMON | wifi万能钥匙、WiFi万能钥匙 |
| **10062** | adpotato | AD | MAINLAND | DSP | adpotato |
| **10063** | 仁玺 | AD | MAINLAND | DSP | 仁玺 |
| **10064** | coinads | AD | MAINLAND | DSP | coinads |
| **10065** | 畅思 | AD | MAINLAND | DSP | 畅思 |
| **10066** | 点点CPA | AD | MAINLAND | DSP | 点点CPA |
| **10067** | 卓塔 | AD | MAINLAND | DSP | 卓塔 |
| **10068** | Adcolony | AD | MAINLAND | DSP | Adcolony |
| **10069** | Mintegral | AD | MAINLAND | DSP | Mintegral |
| **10070** | 微博WAX | AD | MAINLAND | COMMON | 微博WAX |
| **10071** | Pingme | AD | MAINLAND | DSP | Pingme |
| **10072** | 懂球帝 | AD | MAINLAND | COMMON | 懂球帝 |
| **10073** | 畅迈 | AD | MAINLAND | DSP | 畅迈 |
| **10074** | 纵驰信息 | AD | MAINLAND | DSP | 纵驰信息 |
| **10075** | 伟创 | AD | MAINLAND | DSP | 伟创 |
| **10076** | 银橙 | AD | MAINLAND | DSP | 银橙 |
| **10077** | 非凡DSP | AD | MAINLAND | DSP | 非凡DSP |
| **10078** | 兔迪 | AD | MAINLAND | DSP | 兔迪 |
| **10079** | 京盟世纪 | AD | MAINLAND | DSP | 京盟世纪 |
| **10080** | 飞扬 | AD | MAINLAND | DSP | 飞扬 |
| **10081** | 多盟 | AD | MAINLAND | DSP | 多盟 |
| **10082** | 聚点互动 | AD | MAINLAND | DSP | 聚点互动 |
| **10083** | PLUSADS | AD | MAINLAND | DSP | PLUSADS |
| **10084** | 天资 | AD | MAINLAND | DSP | 天资 |
| **10085** | appcoach | AD | MAINLAND | DSP | appcoach |
| **10086** | 微传播 | AD | MAINLAND | DSP | 微传播 |
| **10087** | global | AD | MAINLAND | DSP | global |
| **10088** | 掌游天下 | AD | MAINLAND | DSP | 掌游天下 |
| **10089** | 联动卓越 | AD | MAINLAND | DSP | 联动卓越 |
| **10090** | Xmob | AD | MAINLAND | DSP | Xmob |
| **10091** | 苍鹿 | AD | MAINLAND | DSP | 苍鹿 |
| **10092** | mobvista | AD | MAINLAND | DSP | mobvista |
| **10093** | 安尚 | AD | MAINLAND | DSP | 安尚 |
| **10094** | 旺翔 | AD | MAINLAND | DSP | 旺翔 |
| **10095** | 乐游 | AD | MAINLAND | DSP | 乐游 |
| **10096** | 千易 | AD | MAINLAND | DSP | 千易 |
| **10097** | 点锐 | AD | MAINLAND | DSP | 点锐 |
| **10098** | goldentraffic | AD | MAINLAND | DSP | goldentraffic |
| **10099** | 七麦 | AD | MAINLAND | DSP | 七麦 |
| **10100** | 龙域之星 | AD | MAINLAND | DSP | 龙域之星 |
| **10101** | 脚印 | AD | MAINLAND | DSP | 脚印 |
| **10102** | 蓝蛙 | AD | MAINLAND | DSP | 蓝蛙 |
| **10103** | Novad | AD | MAINLAND | DSP | Novad |
| **10109** | 科大讯飞 | AD | MAINLAND | DSP | 科大讯飞 |
| **10110** | 巨鲨 | AD | MAINLAND | DSP | 巨鲨 |
| **10111** | glispa | AD | MAINLAND | DSP | glispa |
| **10112** | 玄籍 | AD | MAINLAND | DSP | 玄籍 |
| **10113** | cobelab | AD | MAINLAND | DSP | cobelab |
| **10116** | 美图 | AD | MAINLAND | DSP | 美图 |
| **10117** | 艾凯伯思 | AD | MAINLAND | DSP | 艾凯伯思 |
| **10118** | 分享未央 | AD | MAINLAND | DSP | 分享未央 |
| **10119** | 游卡长尾 | AD | MAINLAND | DSP | 游卡长尾 |
| **10128** | 360搜索 | AD | MAINLAND | SEARCH | 360搜索、360 |
| **10135** | 星广联投 | AD | MAINLAND | COMMON | 星广联投 |
| **10137** | 掌上互动 | AD | MAINLAND | DSP | 掌上互动 |
| **10139** | 好游快爆 | AD | MAINLAND | COMMON | 好游快爆 |
| **10145** | 轩沐 | AD | MAINLAND | DSP | 轩沐 |
| **10151** | 起点互动 | AD | MAINLAND | DSP | 起点互动 |
| **10152** | 开瑞 | AD | MAINLAND | DSP | 开瑞 |
| **10153** | mobring | AD | MAINLAND | DSP | mobring |
| **10154** | 水毅云 | AD | MAINLAND | DSP | 水毅云 |
| **10155** | 优思 | AD | MAINLAND | DSP | 优思 |
| **10156** | 汇川 | AD | MAINLAND | DSP | 汇川 |
| **10157** | 麦萌 | AD | MAINLAND | DSP | 麦萌 |
| **10158** | Neomobi | AD | MAINLAND | DSP | Neomobi |
| **10159** | 电视直通车 | AD | MAINLAND | DSP | 电视直通车 |
| **10160** | 战旗 | AD | MAINLAND | DSP | 战旗 |
| **10162** | 华为鲸鸿广告 | AD | MAINLAND | HARDCORE | 华为鲸鸿、华为鲸鸿广告 |

### 2.6 自定义媒体（promotion_source=CUSTOM）

| media_id | media_name | promotion_source | region | media_ad_type | 说明 |
|---------|-----------|-----------------|--------|--------------|------|
| **30002** | 测试 | OP | CUSTOM | OTHER | 测试媒体 |
| **30004** | test | AD | CUSTOM | OTHER | 测试媒体 |
| **30008** | 33 | AD | CUSTOM | OTHER | 测试媒体 |
| **30009** | 其他 | UNKNOWN | CUSTOM | OTHER | 其他媒体 |
| **30010** | 123 | MKT | CUSTOM | OTHER | 测试媒体 |
| **30012** | 社区 | OP | CUSTOM | OTHER | 社区媒体 |
| **30013** | 12312 | MKT | CUSTOM | OTHER | 测试媒体 |
| **30014** | TapTap运营 | OP | CUSTOM | OTHER | TapTap运营 |
| **30016** | 好游快爆运营 | OP | CUSTOM | OTHER | 好游快爆运营 |
| **30017** | TapTap运营 | OP | CUSTOM | OTHER | TapTap运营 |
| **30018** | test_new_custom_media_0314 | MKT | CUSTOM | OTHER | 测试媒体 |
| **30019** | 官网运营 | OP | CUSTOM | OTHER | 官网运营 |
| **30020** | 官网 | OP | CUSTOM | OTHER | 官网 |
| **30022** | 自定义1 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30023** | 自定义2 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30025** | 自定义媒体1 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30026** | 自定义媒体2 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30027** | 自定义1 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30028** | 自定义2 | AD | CUSTOM | OTHER | 自定义媒体 |
| **30029** | mumuPC合作 | OP | CUSTOM | OTHER | mumuPC合作 |
| **30030** | 雷电PC合作 | OP | CUSTOM | OTHER | 雷电PC合作 |
| **30031** | 官方社区 | OP | CUSTOM | OTHER | 官方社区 |
| **30032** | test_0514 | MKT | CUSTOM | OTHER | 测试媒体 |
| **30034** | B站 | MKT | CUSTOM | OTHER | B站 |
| **30035** | 夺帅三测投放 | OP | CUSTOM | OTHER | 夺帅三测投放 |
| **30037** | test2 | AD | CUSTOM | OTHER | 测试媒体 |
| **30038** | 自定义跳转 | AD | CUSTOM | OTHER | 自定义跳转 |
| **30039** | 市场（官包） | MKT | CUSTOM | OTHER | 市场（官包） |
| **30040** | UC开屏 | AD | CUSTOM | OTHER | UC开屏 |
| **30041** | 抖音（官方） | OP | CUSTOM | OTHER | 抖音（官方） |
| **30042** | 夺帅731付费测运营投放 | OP | CUSTOM | OTHER | 夺帅731付费测运营投放 |
| **30043** | 抖音 | MKT | CUSTOM | OTHER | 抖音 |
| **30044** | 社群专用 | OP | CUSTOM | OTHER | 社群专用 |
| **30045** | QA测试 | OP | CUSTOM | OTHER | QA测试 |
| **30046** | PC百度 | AD | CUSTOM | OTHER | PC百度 |
| **30047** | 百度搜索 | AD | CUSTOM | OTHER | 百度搜索 |
| **30048** | 夺帅公测运营投放 | OP | CUSTOM | OTHER | 夺帅公测运营投放 |
| **30049** | hykb | OP | CUSTOM | OTHER | hykb |
| **30050** | 公司内测 | OP | CUSTOM | OTHER | 公司内测 |
| **30051** | 用户首测 | OP | CUSTOM | OTHER | 用户首测 |
| **30052** | Q群 | OP | CUSTOM | OTHER | Q群 |
| **30053** | 主播专用 | UNKNOWN | CUSTOM | OTHER | 主播专用 |
| **30054** | 老用户 | UNKNOWN | CUSTOM | OTHER | 老用户 |
| **30056** | B站社媒 | OP | CUSTOM | OTHER | B站社媒 |
| **30057** | 先锋测试服 | OP | CUSTOM | OTHER | 先锋测试服 |

### 2.7 特殊媒体

| media_id | media_name | promotion_source | region | media_ad_type | 常用别名 | 说明 |
|---------|-----------|-----------------|--------|--------------|---------|------|
| **99999** | 自然量 | UNKNOWN | MAINLAND | OTHER | 自然量、非广告用户 | 非广告带来的自然用户 |

---

## 三、媒体名称匹配规则

### 3.1 匹配优先级

#### 1. 精确匹配优先
- **规则**：用户输入的名称与媒体名称完全一致时，直接返回该媒体
- **示例**：
  - 用户说"巨量广告" → 直接匹配 media_id=10001
  - 用户说"腾讯广告" → 直接匹配 media_id=10002
  - 用户说"Facebook" → 直接匹配 media_id=20001

#### 2. 别名匹配
- **规则**：如果没有精确匹配，尝试匹配常用别名
- **示例**：
  - 用户说"巨量" → 匹配 media_id=10001 "巨量广告"
  - 用户说"头条" → 匹配 media_id=10001 "巨量广告"
  - 用户说"抖音广告" → 匹配 media_id=10001 "巨量广告"
  - 用户说"微信广告" → 匹配 media_id=10002 "腾讯广告"
  - 用户说"FB" → 匹配 media_id=20001 "Facebook"

#### 3. 模糊匹配
- **规则**：如果没有精确匹配和别名匹配，则进行模糊匹配
- **示例**：
  - 用户说"百度" → 可匹配 media_id=10004 "百度搜索"、media_id=10005 "百度信息流"
  - 用户说"华为" → 匹配 media_id=10013 "华为商店广告" 或 media_id=10162 "华为鲸鸿广告"
  - 用户说"B站" → 可匹配："B站广告"(10007)、"B站"(30034)、"B站社媒"(30056)

#### 4. 歧义检测与确认
- **规则**：当用户输入可能匹配多个媒体时，返回候选列表让用户确认
- **示例**：
  - 用户说"百度" → 可能匹配："百度搜索"(10004)、"百度信息流"(10005)、"百度品专"(10147)
  - 用户说"B站" → 可能匹配："B站广告"(10007)、"B站"(30034)、"B站社媒"(30056)

---

## 四、推荐使用方式

### 4.1 单个媒体查询

| 用户输入 | Filter配置 | 说明 |
|---------|-----------|------|
| 巨量广告 | `{"field": "media_id", "operator": "eq", "value": "10001"}` | 精确匹配巨量广告 |
| 头条 | `{"field": "media_id", "operator": "eq", "value": "10001"}` | 通过别名匹配巨量广告 |
| 腾讯广告 | `{"field": "media_id", "operator": "eq", "value": "10002"}` | 精确匹配腾讯广告 |
| 微信广告 | `{"field": "media_id", "operator": "eq", "value": "10002"}` | 通过别名匹配腾讯广告 |
| Facebook | `{"field": "media_id", "operator": "eq", "value": "20001"}` | 精确匹配Facebook |
| 自然量 | `{"field": "media_id", "operator": "eq", "value": "99999"}` | 查询自然量数据 |

### 4.2 多个媒体查询

| 用户输入 | Filter配置 | 说明 |
|---------|-----------|------|
| 头条和腾讯 | `{"field": "media_id", "operator": "in", "value": "10001,10002"}` | 查询巨量广告和腾讯广告 |
| 国内主流媒体 | `{"field": "media_id", "operator": "in", "value": "10001,10002,10003,10004,10007"}` | 查询国内五大主流媒体 |
| 海外媒体 | `{"field": "media_id", "operator": "in", "value": "20001,20002,20003"}` | 查询三大海外媒体 |

### 4.3 按媒体类型查询

| 用户输入 | Filter配置 | 说明 |
|---------|-----------|------|
| 硬核媒体 | `{"field": "media_ad_type", "operator": "eq", "value": "HARDCORE"}` | 查询所有手机厂商媒体 |
| 搜索媒体 | `{"field": "media_ad_type", "operator": "eq", "value": "SEARCH"}` | 查询所有搜索类媒体 |
| DSP平台 | `{"field": "media_ad_type", "operator": "eq", "value": "DSP"}` | 查询所有DSP广告平台 |
| ASO媒体 | `{"field": "media_ad_type", "operator": "eq", "value": "ASO"}` | 查询所有ASO优化服务 |

---

## 五、媒体类型说明

### 5.1 media_ad_type 类型说明

| 类型 | 说明 | 包含媒体示例 |
|------|------|------------|
| **COMMON** | 通用信息流媒体 | 巨量广告、腾讯广告、快手广告、B站广告、小红书等约50+个媒体 |
| **SEARCH** | 搜索广告媒体 | 百度搜索、苹果广告、360搜索、搜狗搜索、百度品专等约10+个媒体 |
| **HARDCORE** | 硬核媒体（手机厂商） | Oppo广告、华为商店广告、Vivo广告、小米广告、华为鲸鸿广告等约8+个媒体 |
| **ASO** | ASO优化服务 | 七麦ASO、蝉大师ASO、寸之金、聚点ASO等约10+个媒体 |
| **MARKET** | 市场推广渠道 | 市场星图、抖音游戏、市场聚星、飞火等约10+个媒体 |
| **DSP** | DSP广告平台 | 优源、一栗、Inmobi、AppLovin、有米等约80+个媒体 |
| **OTHER** | 其他类型媒体 | 自然量、官网、测试媒体、自定义媒体等约30+个媒体 |

### 5.2 promotion_source 推广类型说明

| 类型 | 说明 | 适用报表 |
|------|------|---------|
| **AD** | 广告投放渠道 | 所有报表（ROI、留存、小时报表、日周月报） |
| **MKT** | 市场推广渠道 | ROI、留存、小时报表（不支持日周月报） |
| **UNKNOWN** | 未知类型（ASO、自然量等） | ROI、留存、小时报表（日周月报仅支持自然量99999） |
| **OP** | 运营渠道 | ROI、留存、小时报表（不支持日周月报） |
| **CUSTOM** | 自定义渠道 | ROI、留存、小时报表（不支持日周月报） |

### 5.3 region 地区说明

| 类型 | 说明 |
|------|------|
| **MAINLAND** | 中国大陆 |
| **OVERSEAS** | 海外地区 |
| **CUSTOM** | 自定义地区 |

---

## 六、注意事项

### 6.1 权限与认证
- 需使用内部授权的API Token进行访问
- Token有效期根据公司安全策略，过期需重新申请
- 不同Token可能有不同的媒体访问权限

### 6.2 数据时效性
- **更新频率**：20分钟
- **数据延迟**：媒体配置变更后，最多延迟20分钟生效

### 6.3 媒体名称匹配注意事项
1. **优先使用精确匹配**：尽可能使用完整的媒体名称
2. **注意歧义情况**：当用户输入可能匹配多个媒体时，必须返回候选列表让用户确认
3. **支持别名输入**：用户可以使用常用别名来指代媒体，提高使用便利性
4. **特殊值处理**："自然量"、"全部媒体"等特殊值需要特别处理

### 6.4 不同报表的媒体范围
**重要提示**：不同报表支持查询的媒体类型不同
- **日周月报**：只能查询promotion_source=AD的媒体，如需查询自然量需显式指定media_id=99999
- **ROI报表**：支持查询所有类型媒体（AD/MKT/ASO/CUSTOM等）
- **留存报表**：支持查询所有类型媒体（AD/MKT/ASO/CUSTOM等）
- **小时报表**：支持查询所有类型媒体（AD/MKT/ASO/CUSTOM等）

### 6.5 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| 0 | 成功 | - |
| 400 | 参数错误 | 检查参数格式、必填项是否完整 |
| 401 | 未授权 | Token无效或已过期，需重新获取 |
| 403 | 权限不足 | 无该媒体的数据访问权限 |
| 404 | 媒体未找到 | 检查媒体名称是否正确，或查看完整的媒体列表 |
| 429 | 请求超频 | 降低请求频率，避免超过并发限制 |
| 500 | 服务器错误 | 联系技术支持 |

---

*文档版本：V1.2*
*更新日期：2026-03-26*
*维护方：数据平台团队*
