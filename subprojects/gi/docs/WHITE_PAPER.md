# 游戏内参 Game Insider（GI）行业情报平台产品白皮书

**版本**：VNext 规划版  
**日期**：2026-06-22  
**状态**：内部评审版  
**适用范围**：GI 游戏内参、Dataki 知识库、小乔智投 Chat、行业日报/资讯流/公众号草稿、行业情报采集与服务体系

---

## 0. 摘要

游戏内参 Game Insider（GI）当前已经形成一套面向游戏行业的情报采集与信号生产系统，覆盖网页、文章、RSS、微信公众号、图片 OCR、LLM 结构化抽取、Seed 种子系统、去重合并、趋势检测、Dataki 同步和 Web 信息流。

在现有 GI 1.0 基础上，下一阶段不应只把它理解为"爬虫系统"，而应升级为：

**游戏行业情报资产生产系统。**

它的核心价值不是简单抓取文章，而是持续生产以下资产：

- **内容资产**：文章、公告、榜单、公众号、图片 OCR、原文快照
- **信源资产**：网站、公众号、社区、KOL、数据库、榜单、公司、产品
- **事件资产**：上线、测试、预约、版号、买量、舆情、榜单变化、政策、AI 应用
- **信号资产**：高频变化、异常出现、趋势升温、讨论饱和、竞争动作
- **证据资产**：原文、来源、发布时间、采集时间、模型判断、核验状态
- **模型情报资产**：多模型回答、模型推荐信源、模型观点、模型认知变化
- **行业认知资产**：可复用的行业判断、基准参数、预测假设、策略经验

本白皮书的核心结论是：

**采集和使用必须分开。** GI 负责采集与情报资产生产；Dataki 负责知识化存储与检索；情报服务层负责日报、资讯流、专题动态、趋势信号、行业基准参数等稳定 API；Chat 负责自然语言入口、应用配置、解释与编排。

最终架构应从：

```
爬虫 → 知识库 → Chat
```

升级为：

```
GI 采集与情报生产
→ Intelligence Warehouse / Dataki
→ Intelligence Service API
→ Chat / 看板 / 日报 / 公众号 / 预测应用
```

---

## 1. 产品定位

### 1.1 产品名称

游戏内参 Game Insider，简称 GI。

### 1.2 当前定位

GI 当前是一个面向游戏行业的情报信号源平台，专注于：

- 纯文本情报采集
- 文章正文采集
- RSS/公众号采集
- 图片 OCR 提取
- 图片内容理解
- LLM 事件抽取
- 事件评分
- 趋势检测
- Dataki 知识库同步
- 信息流 Web UI

### 1.3 VNext 定位

VNext 后，GI 的定位应进一步升级为：

**游戏行业情报采集与资产生产平台。**

它不是最终的 Chat 产品，也不是日报写作器，而是公司级行业情报系统的底层生产引擎。

```
GI                = 情报采集与信号生产系统
Dataki            = 知识库、语义检索与内容资产底座
Intelligence API  = 情报服务接口层
小乔智投 Chat      = 对话消费入口与业务应用入口
日报/公众号/看板    = 情报分发与消费场景
```

### 1.4 核心使命

比人更快、更全、更稳定地发现游戏行业情报，并把零散内容沉淀为可检索、可追踪、可复用、可验证、可服务化的行业情报资产。

判断 GI 是否成功的标准不是"抓了多少文章"，而是：

- 用户自己看到了，但 GI 没采到 —— **失败**
- 模型提到了高价值信源，但系统没存档 —— **失败**
- 同一事件多源出现，但系统没有合并 —— **失败**
- 行业趋势升温，但系统无法解释依据 —— **失败**
- Chat 能回答，但没有证据链和历史沉淀 —— **失败**

---

## 2. 背景与问题

### 2.1 游戏行业情报的典型痛点

游戏行业情报分散在大量非结构化信息中：

- 游戏媒体
- 微信公众号
- 公司官网
- 产品公告
- App Store / TapTap / Steam / 小游戏平台
- 榜单与数据网站
- 从业者观点
- 社群讨论
- 投融资新闻
- 政策公告
- 招聘信息
- 公开演讲与会议内容
- 大模型回答中暴露出的信源、观点和线索

人工跟踪会遇到四类问题：

**第一，覆盖不全。**  
人只会固定看几个熟悉来源，很难持续扩展信源。

**第二，时效不稳。**  
人能发现热点，但无法保证每天稳定巡检。

**第三，难以沉淀。**  
文章看完就过去了，无法自动形成事件、趋势、证据链、基准参数。

**第四，无法复用到 Chat 和预测应用。**  
Chat 临时检索文章可以回答问题，但如果没有结构化资产层，就无法稳定支持日报、专题、趋势、预测和复盘。

### 2.2 为什么不能只靠实时问大模型

直接实时调用 GPT、Claude、Gemini、Qwen、Kimi、DeepSeek 等大模型，确实可以获得行业观点，但不能替代情报采集系统。

原因包括：

- **大模型没有稳定记忆**  
  今天和下周问同一个问题，答案可能不一样，无法追踪新增、消失、变化和错误判断。

- **大模型回答本身也是情报资产**  
  模型提到的公司、产品、网站、公众号、榜单、KOL、数据库，都应该被采集、存档和评分。

- **模型会进化**  
  同一问题在不同时间、不同模型上的回答差异，本身就是"模型认知变化"数据。

- **无法形成趋势分析**  
  不存档就无法分析某个产品、公司、赛道、关键词在模型回答中的提及频率变化。

- **无法识别模型盲区**  
  长期存档后，可以发现哪些行业真实变化没有被模型提及，从而反向识别模型认知盲区。

- **成本不可控**  
  如果每个用户、每个场景、每天都实时调多模型，会出现大量重复调用。采集一次、复用多次更适合公司级系统。

- **缺少证据链**  
  模型回答不能直接作为事实入库，必须回源到网页、公告、榜单、公众号、社媒等证据。

因此，GI VNext 要新增 Model Intelligence，但大模型不是事实权威，而是：

- 线索发现器
- 信源发现器
- 观点生成器
- 趋势假设生成器
- 核验任务生成器
- 蒸馏数据生产器

---

## 3. 总体产品原则

### 3.1 采集与使用分离

采集系统不应直接承担所有业务消费逻辑。

**采集侧关注：**
- 哪里有信息
- 如何采到
- 是否去重
- 是否结构化
- 是否有证据
- 是否同步知识库

**使用侧关注：**
- 谁要看
- 看什么专题
- 如何排序
- 如何摘要
- 如何推送
- 如何问答
- 如何预测

### 3.2 知识库是底座，不是万能服务层

Dataki 知识库适合承载：
- 原文
- 切片
- 摘要
- 向量检索
- 语义问答
- 证据引用
- 知识归档

但日报资讯流、专题动态、趋势信号、订阅配置、行业基准参数，不应全部临时由 Chat 从知识库里拼出来。  
这些能力需要产品化为 **Intelligence Service API**。

### 3.3 Chat 是入口，不是情报生产系统

**Chat 应负责：**
- 理解用户意图
- 读取应用配置
- 调用知识库
- 调用情报服务 API
- 解释证据
- 生成个性化回答
- 引导用户订阅专题
- 创建新的 Requirement Profile

**Chat 不应负责：**
- 临时生成全量日报
- 维护资讯流排序逻辑
- 维护已读/未读状态
- 承担采集任务调度
- 直接判断事实可信度
- 替代 Evidence Ledger

### 3.4 LLM 只生成线索，事实必须核验

模型回答中的结论、信源、观点、预测，都必须进入以下流程：

```
模型输出
→ Claim 抽取
→ Source 抽取
→ 回源搜索/采集
→ 多源证据匹配
→ 可信度评分
→ 入库/待核验/丢弃
```

### 3.5 内容资产与信源资产分离

文章是内容资产，信源是更长期的资产。

- **内容资产**：某篇文章、某条公告、某张图片
- **信源资产**：这个网站、这个公众号、这个 KOL、这个榜单、这个数据库

GI 必须构建 **Source Graph**，而不是只保存文章。

### 3.6 配置驱动，不硬编码业务规则

用户想看什么、系统能采什么、去哪采、怎么采、如何核验、怎么输出，都要配置化。

```
Requirement Profile     控制用户想要什么
Information Type Catalog 控制系统能识别什么
Source Registry          控制去哪采
Runtime                  控制怎么采
Evidence Policy          控制怎么判断可信
Delivery Template        控制怎么输出
```

---

## 4. 用户与场景

### 4.1 目标用户

GI 与行业情报体系服务公司内部多个角色。

### 4.2 核心场景

**场景一：行业日报**  
用户希望每天早上看到游戏行业重点动态：
- 今日重点事件
- 新游上线/测试/预约
- 买量与素材变化
- 榜单变化
- 渠道和平台政策
- 重点公司动作
- 需继续核验的线索

建议实现方式：
```
GI 采集与结构化
→ Intelligence Service 生成日报素材和排序
→ Chat / 看板 / 公众号消费
```

日报不应只由 Chat 临时检索知识库生成，而应由情报系统封装为稳定接口。

**场景二：专项情报动态**  
例如：
- 小游戏买量
- 二游产品趋势
- SLG 出海
- AI 游戏
- 微信小游戏平台政策
- 某竞品产品动态
- 某公司近期动作

用户配置专题后，系统持续采集、合并、排序、摘要，并通过 API 暴露给 Chat。

**场景三：预测与行业基准参数**  
用户问：预测某类游戏 ROI 应该参考什么行业基准？

Chat 不应只检索文章，而应调用：
- 行业基准参数 API
- 历史案例库
- 投放结果经验库
- 知识库证据
- 模型观点库

行业基准参数可以来自：
- 公开文章
- 数据报告
- 榜单与数据库
- 内部投放结果
- 多模型推理结果
- 专家经验沉淀

**场景四：信源发现**  
系统定期问多模型：

> 如果你是游戏行业研究员，研究小游戏买量趋势，你会长期监控哪些网站、公众号、榜单、数据库、KOL、公司和社区？

模型输出的信源进入 Source Registry，经过采集可用性验证、价值评分、去重合并后，成为新的采集源。

**场景五：Chat 行业情报问答**  
用户问：
- 最近小游戏买量有什么变化？
- 为什么说某类产品热度上升？
- 某公司最近有什么动作？
- 今天有哪些值得老板关注的行业变化？

Chat 调用：
- 专题动态 API
- 趋势信号 API
- 知识库检索
- Evidence Ledger
- 模型观点库

最终返回带依据、带时间、带来源、带可追溯证据的回答。

---

## 5. 总体架构

### 5.1 分层架构

```
┌──────────────────────────────────────────────┐
│ Application Layer 应用层                       │
│ Chat / 看板 / 日报 / 公众号草稿 / 订阅推送       │
└──────────────────────────────────────────────┘
                    ↑
┌──────────────────────────────────────────────┐
│ Intelligence Service Layer 情报服务层          │
│ 资讯流 API / 日报 API / 专题动态 API / 趋势 API │
│ 行业基准参数 API / 证据 API / 信源 API          │
└──────────────────────────────────────────────┘
                    ↑
┌──────────────────────────────────────────────┐
│ Intelligence Warehouse 情报仓库                │
│ Raw Content / Source Graph / Event Store       │
│ Signal Store / Evidence Ledger / Model Store   │
│ Benchmark Store / Dataki Knowledge Base        │
└──────────────────────────────────────────────┘
                    ↑
┌──────────────────────────────────────────────┐
│ Evidence Verification Center 证据核验中心       │
│ 回源搜索 / 多源匹配 / 冲突检测 / 可信度评分       │
└──────────────────────────────────────────────┘
                    ↑
┌──────────────────────────────────────────────┐
│ Collection & Intelligence Runtime 采集运行时    │
│ Crawler Runtime + LLM Intelligence Runtime     │
│ RSS / WeWe RSS / Crawl4AI / Playwright / API   │
│ 多模型问答 / 模型信源抽取 / 模型观点抽取          │
└──────────────────────────────────────────────┘
                    ↑
┌──────────────────────────────────────────────┐
│ Configuration Center 配置中心                  │
│ Requirement Profile / Source Registry          │
│ Information Type Catalog / LLM Task Library    │
│ Verification Policy / Delivery Template        │
└──────────────────────────────────────────────┘
```

### 5.2 当前 GI 数据流

GI 当前已经形成以下数据流：

```
情报源 IntelSource
    ↓ 采集器
原始证据 RawEvidence ← Seed 种子驱动
    ↓ LLM 抽取
结构化事件 StructuredEvent
    ↓ 去重 + 合并
证据事件 EvidenceEvent
    ↓ 评分
信号 Signal
    ↓ 聚合
趋势簇 TrendCluster
    ↓ 同步
Dataki 知识库
```

### 5.3 VNext 扩展数据流

VNext 需要在当前数据流两侧补齐：

```
用户/团队/专题配置
    ↓
Requirement Profile
    ↓
Source Planner / Task Planner
    ↓
GI Crawler Runtime + Model Intelligence Runtime
    ↓
RawEvidence + ModelAnswer
    ↓
Claim / Source / Event / Signal 抽取
    ↓
Evidence Verification
    ↓
Intelligence Warehouse + Dataki
    ↓
Intelligence Service API
    ↓
Chat / 日报 / 资讯流 / 公众号 / 预测应用
```

---

## 6. GI 当前实施基础

### 6.1 当前系统状态

GI 1.0 当前状态为生产就绪，系统地址为内部服务地址，后端运行在 8003 端口。

当前已经完成：
- 文档体系建设
- 项目骨架
- SQLite 数据库
- Express 后端
- Seed 种子系统
- RSS 采集
- Crawl4AI 静态页采集
- Playwright 动态页采集
- LLM 事件抽取
- 图片 OCR
- 信号评分
- 去重与事件合并
- Dataki 同步
- Web UI 信息流与统计
- WeWe RSS 公众号集成
- 健康监控与告警

### 6.2 当前技术栈

（见 CLAUDE.md）

### 6.3 当前 Seed 系统

GI 的核心发动机是 Seed 种子系统。采集上限由种子质量决定，而不是由爬虫数量决定。

当前四类种子：
- 实体 Seed
- 事件 Seed
- 话题 Seed
- 源 Seed

种子状态机：
```
active → degraded → dormant → retired
  ↑           ↑
  └───────────┘
```

种子评分维度：
- 产出因子 40%：产出多少有效证据
- 新鲜度因子 20%：是否持续产出新内容
- 覆盖率因子 20%：是否覆盖关键信息源
- 效率因子 20%：采集耗时与成功率

### 6.4 当前结构化抽取

当前 LLM 从 RawEvidence 中抽取：
- 事件标题
- 关键事实
- 行动建议
- 事件类型
- 情绪倾向
- 影响评分
- 优先级
- 适用角色
- 实体
- 标签

当前事件类型包括：  
上线、测试、预约、版号、榜单变化、买量、舆情、融资、组织动作、版本更新、出海、合作、政策、AI 应用

### 6.5 当前去重与趋势检测

当前已具备：
- URL 规范化
- SimHash 去重
- 语义相似内容借助 Dataki 判断
- 多源事件合并
- 情绪综合
- 可信度评分
- 增长检测
- 异常检测
- 饱和检测

---

## 7. VNext 新增核心能力

### 7.1 Source Intelligence Center 信源情报中心

当前 GI 已有 IntelSource 和 Seed，但 VNext 需要把信源能力升级为一级中心。

**Source Intelligence Center 负责：**
- 信源注册
- 信源分类
- 信源评分
- 信源健康监控
- 信源失效检测
- 信源价值评估
- 信源去重合并
- 信源发现
- 信源图谱
- 信源订阅
- 信源权限

信源类型包括：
- 游戏媒体
- 微信公众号
- 公司官网
- 产品官网
- 社区
- 榜单
- 数据库
- 应用商店
- KOL
- 从业者
- 投融资平台
- 政策公告源
- 社媒账号
- 大模型推荐信源

信源不是一次性配置，而是需要持续自进化。

```
模型推荐新信源
→ 系统验证可采性
→ 试采
→ 评估产出质量
→ 加入 Source Registry
→ 进入定时采集
```

### 7.2 Model Intelligence Center 模型情报中心

VNext 需要新增模型情报采集能力。

它不只是调用模型回答问题，而是定时向多个模型发起行业研究任务，并采集：
- 模型回答
- 模型观点
- 模型推荐信源
- 模型提到的公司
- 模型提到的产品
- 模型提到的趋势
- 模型提到的风险
- 模型提到的关键词
- 模型给出的核验线索
- 模型认知变化
- 模型之间的共识和分歧

核心流程：
```
Requirement Profile
→ LLM Task Generator
→ Multi-Model Query
→ Answer Collector
→ Claim Extractor
→ Source Miner
→ Conflict Resolver
→ Evidence Verifier
→ Model Intelligence Store
→ Distillation Dataset Builder
```

**模型情报必须长期存档，不能只实时调用后丢弃。**

### 7.3 Evidence Verification Center 证据核验中心

模型输出和单篇文章都不能直接作为最终事实。

**证据核验中心负责：**
- 回源搜索
- 原文抓取
- 多源匹配
- 时间校验
- 来源可信度校验
- 冲突检测
- 事实与观点分离
- 置信度评分
- 待核验队列
- 证据链沉淀

证据状态建议包括：
- `unverified` — 未核验
- `verified` — 已核验
- `conflicted` — 存在冲突
- `low_confidence` — 低置信度
- `rejected` — 已丢弃
- `expired` — 已过期

### 7.4 Intelligence Warehouse 情报仓库

VNext 后，GI 不应只把内容同步到 Dataki，还要形成结构化情报仓库。

建议包含：
- **Raw Content Store** — 原始内容库
- **Source Graph** — 信源图谱
- **Entity Graph** — 实体图谱
- **Event Store** — 事件库
- **Signal Store** — 信号库
- **Trend Store** — 趋势库
- **Evidence Ledger** — 证据账本
- **Model Intelligence Store** — 模型情报库
- **Benchmark Store** — 行业基准参数库
- **Distillation Dataset** — 蒸馏训练数据集

GI 不在本地重复建设向量库，语义检索统一走 Dataki。

### 7.5 Intelligence Service API 情报服务层

日报、资讯流、专题动态、趋势信号、行业基准参数，不应只由 Chat 临时从知识库生成，而应封装为稳定服务。

建议提供：
```
GET /api/intelligence/feed
GET /api/intelligence/briefs/daily
GET /api/intelligence/topics/:id/updates
GET /api/intelligence/signals/trending
GET /api/intelligence/benchmarks
GET /api/intelligence/sources
GET /api/intelligence/evidence/:id
GET /api/intelligence/model-opinions
POST /api/intelligence/profiles
POST /api/intelligence/profiles/:id/run
```

这样 Chat、看板、公众号、日报系统都能复用同一套情报服务。

---

## 8. 配置中心设计

### 8.1 控制"想看什么"的层级

用户想要哪类信息，不应该写死在 Prompt，也不应该写死在爬虫代码里，而应放在：

**Requirement Profile 情报需求画像。**

```
用户想要什么
→ Requirement Profile
→ Source Planner
→ Crawler Runtime / LLM Runtime
→ Evidence / Warehouse
→ Intelligence Service
→ Chat / 日报 / 看板
```

### 8.2 Requirement Profile 示例

```yaml
profile_name: 小游戏买量日报
industry: 游戏
purpose:
  - 发行
  - 买量
focus_topics:
  - 新游上线
  - 预约
  - 测试
  - 公测
  - 买量素材变化
  - 投放平台变化
  - 竞品动作
  - 榜单排名变化
  - 渠道政策变化
entities:
  companies:
    - 腾讯
    - 三七
    - 点点互动
    - 豪腾
  products:
    - 微信小游戏
    - SLG
    - 二游
  platforms:
    - 巨量引擎
    - 微信广告
    - 快手
time_window: 最近7天
priority:
  新游上线: high
  买量素材变化: high
  投放平台变化: medium
exclude:
  - 泛娱乐八卦
  - 低质量搬运内容
  - 无明确来源的传闻
output:
  format: daily_brief
  frequency: 每天9点
verification:
  required: true
  min_sources: 2
```

### 8.3 Information Type Catalog

系统能识别什么，由 Information Type Catalog 控制。

示例：
```yaml
information_types:
  - id: new_game_launch
    name: 新游上线
    signals:
      - 上线
      - 公测
      - 首发
      - 不删档
    entities:
      - product
      - company
      - platform
    default_sources:
      - TapTap
      - App Store
      - 官网公告
      - 游戏媒体

  - id: game_license
    name: 版号情报
    signals:
      - 版号
      - 审批
      - 国家新闻出版署
    entities:
      - product
      - company
      - publisher
    default_sources:
      - 国家新闻出版署
      - 游戏媒体
      - 公众号

  - id: buying_signal
    name: 买量信号
    signals:
      - 投放
      - 素材
      - 消耗
      - 激活成本
      - ROI
      - 巨量
      - 微信广告
    entities:
      - product
      - company
      - platform
      - creative_style
```

### 8.4 Source Registry

信源扩展由 Source Registry 控制。

```yaml
sources:
  - id: gamelook
    name: GameLook
    type: media
    access_method: rss
    topics:
      - 游戏行业
      - 发行
      - 买量
    reliability: high
    priority: P0

  - id: wechat_game_grape
    name: 游戏葡萄
    type: wechat_mp
    access_method: wewe_rss
    topics:
      - 游戏行业
      - 产品
      - 发行
    reliability: high
    priority: P0
```

### 8.5 LLM Task Library

模型任务不应散落在代码里，而应配置化。

```yaml
llm_tasks:
  - id: discover_sources
    name: 发现新信源
    prompt_template: |
      你是游戏行业研究员。围绕 {{topic}}，请列出值得长期监控的网站、公众号、数据库、榜单、社区、KOL 和公司。
      要求输出信源名称、类型、价值、适合监控的原因、推荐关键词。

  - id: discover_trend_hypothesis
    name: 发现趋势假设
    prompt_template: |
      请从游戏发行和买量视角，分析 {{topic}} 最近可能出现的趋势变化。
      不要直接给事实结论，请输出待核验假设、相关实体、核验关键词和优先级。

  - id: generate_verification_queries
    name: 生成核验关键词
    prompt_template: |
      根据以下模型观点，生成用于搜索和爬虫回源核验的关键词组合。
```

### 8.6 Delivery Template

输出模板控制日报、专题、公众号草稿的结构。

```yaml
brief_templates:
  - id: game_buying_daily
    name: 小游戏买量日报
    sections:
      - 今日重点事件
      - 新游/测试/预约
      - 买量素材变化
      - 渠道与平台变化
      - 榜单与热度变化
      - 需继续核验线索
      - 对发行/投放的建议
```

---

## 9. 知识库、情报服务与 Chat 的分工

### 9.1 推荐分工

- **GI**：负责采集、抽取、去重、合并、信号生产、证据沉淀。
- **Dataki**：负责知识库、语义检索、原文切片、知识沉淀。
- **Intelligence Service**：负责日报、资讯流、专题动态、趋势信号、行业基准参数、订阅服务。
- **Chat**：负责自然语言入口、应用配置、服务调用、证据解释、个性化回答。

### 9.2 为什么日报资讯流不应只放在 Chat

日报和资讯流本质是产品化服务，不是一次性问答。

它需要：
- 订阅配置
- 用户/团队视角
- 内容去重
- 重要性排序
- 时间窗口
- 已读/未读
- 专题聚合
- 实体聚合
- 证据链接
- 摘要版本
- 推送记录
- 权限过滤
- 点击反馈
- 质量评估

这些逻辑应沉淀在 Intelligence Service，而不是每次由 Chat 临时从知识库检索后拼接。

### 9.3 Chat 的调用方式

**用户问今日行业日报**  
Chat → 调用 Daily Brief API → 展示日报卡片 → 可追问任意条目的证据

**用户问某专题最近变化**  
Chat → 调用 Topic Updates API → 调用 Trend Signal API → 调用 Dataki 检索原文 → 输出带证据的解释

**用户问预测参数**  
Chat → 调用 Benchmark Parameter API → 调用历史案例库 → 调用知识库证据 → 输出预测所需参数与使用边界

**用户问为什么某结论成立**  
Chat → 调用 Evidence Ledger → 展示原文来源、采集时间、模型观点、核验状态

---

## 10. 数据模型扩展

### 10.1 当前核心模型

当前 GI 已有：
- IntelSource
- Seed
- RawEvidence
- StructuredEvent
- EvidenceEvent
- Signal
- TrendCluster
- CollectionJob
- SourceHealth
- DedupRecord

### 10.2 VNext 新增模型

#### RequirementProfile
记录用户、团队、专题想看什么。

| 字段 | 说明 |
|------|------|
| id | 主键 |
| name | 名称 |
| owner | 所有者 |
| industry | 行业 |
| purpose | 目的 |
| focus_topics | 关注话题 |
| entities | 关注实体 |
| source_policy | 源策略 |
| verification_policy | 核验策略 |
| delivery_policy | 分发策略 |
| status | 状态 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

#### ModelQueryTask
记录一次模型情报任务。

| 字段 | 说明 |
|------|------|
| id | 主键 |
| profile_id | 关联画像 |
| task_type | 任务类型 |
| prompt_template_id | 模板 ID |
| prompt_variables | 模板变量 |
| models | 使用模型 |
| schedule | 调度配置 |
| status | 状态 |
| created_at | 创建时间 |

#### ModelAnswer
记录模型原始回答。

| 字段 | 说明 |
|------|------|
| id | 主键 |
| task_id | 任务 ID |
| model_provider | 提供商 |
| model_name | 模型名称 |
| prompt_version | 提示版本 |
| answer_text | 原文 |
| answer_json | 结构化 JSON |
| created_at | 创建时间 |
| token_cost | Token 消耗 |
| latency | 延迟 |
| status | 状态 |

#### ModelClaim
记录模型回答中的观点和结论。

| 字段 | 说明 |
|------|------|
| id | 主键 |
| answer_id | 回答 ID |
| claim_type | 观点类型 |
| summary | 摘要 |
| entities | 关联实体 |
| confidence | 置信度 |
| freshness | 时效性 |
| verification_required | 是否需核验 |
| verification_status | 核验状态 |
| created_at | 创建时间 |

#### ModelSourceMention
记录模型提到的信源。

| 字段 | 说明 |
|------|------|
| id | 主键 |
| answer_id | 回答 ID |
| source_name | 信源名称 |
| source_type | 信源类型 |
| reason | 推荐理由 |
| recommended_use | 推荐用途 |
| confidence | 置信度 |
| matched_source_id | 已匹配源 ID |
| created_at | 创建时间 |

#### EvidenceLedger
记录事实依据。

| 字段 | 说明 |
|------|------|
| id | 主键 |
| target_type | 目标类型 |
| target_id | 目标 ID |
| evidence_type | 证据类型 |
| source_id | 信源 ID |
| raw_evidence_id | 原始证据 ID |
| url | URL |
| title | 标题 |
| published_at | 发布时间 |
| collected_at | 采集时间 |
| verification_status | 核验状态 |
| confidence | 置信度 |
| conflict_notes | 冲突说明 |
| created_at | 创建时间 |

#### BenchmarkParameter
记录预测和分析需要的行业基准参数。

| 字段 | 说明 |
|------|------|
| id | 主键 |
| industry | 行业 |
| segment | 细分领域 |
| metric_name | 指标名称 |
| metric_value | 指标值 |
| value_range | 取值范围 |
| time_window | 时间窗口 |
| source_type | 来源类型 |
| evidence_ids | 证据 ID 列表 |
| confidence | 置信度 |
| applicable_conditions | 适用场景 |
| expired_at | 过期时间 |
| created_at | 创建时间 |

#### IntelligenceBrief
记录已经生成的日报/专题简报版本。

| 字段 | 说明 |
|------|------|
| id | 主键 |
| profile_id | 画像 ID |
| brief_type | 简报类型 |
| title | 标题 |
| sections | 内容段落 |
| evidence_ids | 证据 ID 列表 |
| generated_at | 生成时间 |
| published_at | 发布时间 |
| status | 状态 |
| feedback_score | 反馈分数 |

---

## 11. 关键流程设计

### 11.1 日报生成流程

```
定时触发
→ 读取 Requirement Profile
→ 拉取过去24小时 RawEvidence / Events / Signals
→ 去重合并
→ 按角色和专题排序
→ 生成日报结构
→ 绑定 Evidence Ledger
→ 保存 IntelligenceBrief
→ 暴露 Daily Brief API
→ Chat / 看板 / 公众号消费
```

### 11.2 专题动态流程

```
用户配置专题
→ 系统生成实体种子、事件种子、话题种子、源种子
→ GI 定时采集
→ LLM 结构化抽取
→ 事件合并与趋势检测
→ 输出专题动态 API
→ Chat 展示实时资讯流
```

### 11.3 大模型信源发现流程

```
定时选择专题
→ 多模型提问信源
→ 抽取网站/公众号/KOL/数据库/榜单
→ 与 Source Registry 去重
→ 生成候选信源
→ 试采验证
→ 评分
→ 加入正式采集源
```

### 11.4 模型观点核验流程

```
模型回答
→ Claim 抽取
→ 生成核验关键词
→ 搜索/爬虫回源
→ 证据匹配
→ 多源交叉验证
→ 标记 verified / conflicted / low_confidence
→ 入 Evidence Ledger
```

### 11.5 预测参数沉淀流程

```
文章/报告/榜单/模型观点/内部数据
→ 抽取指标和参数
→ 识别适用场景
→ 绑定证据
→ 进入 Benchmark Store
→ Chat 在预测场景调用
```

---

## 12. 产品界面设计

### 12.1 GI 管理端

GI 管理端继续承载采集与情报生产视角。

菜单建议：
- 信息流 `/events`
- 趋势分析 `/trends`
- 信源与种子 `/sources`
- 模型情报 `/model-intelligence`
- 证据账本 `/evidence`
- 专题配置 `/profiles`
- 源发现 `/discovery`
- 漏采告警 `/gaps`
- 反馈管理 `/feedback`
- 系统管理 `/admin`
- 统计看板 `/`

### 12.2 信息流页面

信息流页面展示原始采集与结构化事件：
- 标题
- 来源
- 发布时间
- 采集时间
- 事件类型
- 优先级
- 适用角色
- 核验状态
- 证据数量
- 是否已同步 Dataki

### 12.3 源发现页面

源发现页面展示：
- 模型推荐信源
- 用户反馈信源
- 爬虫发现信源
- 候选信源状态
- 可采性检测
- 产出质量
- 是否入库
- 对应专题

### 12.4 证据账本页面

证据账本页面展示：
- 某条结论对应哪些证据
- 哪些来源支持
- 哪些来源冲突
- 证据发布时间
- 采集时间
- 模型观点来源
- 核验状态
- 置信度

### 12.5 Chat 展示形态

Chat 前端不展示后台细节，但需要结构化卡片：
- 行业日报卡
- 专题动态卡
- 趋势信号卡
- 证据卡
- 信源卡
- 预测参数卡
- 待核验线索卡

---

## 13. API 设计建议

### 13.1 情报资讯流

```
GET /api/intelligence/feed?profileId=xxx&since=24h
```

返回：
```json
{
  "items": [
    {
      "id": "event_001",
      "title": "某产品开启了预约",
      "summary": "核心摘要",
      "eventType": "预约",
      "priority": "P1",
      "audienceTags": ["发行", "产品"],
      "sourceCount": 3,
      "evidenceIds": ["ev_1", "ev_2"],
      "verificationStatus": "verified",
      "publishedAt": "2026-06-22T08:00:00+08:00"
    }
  ]
}
```

### 13.2 日报 API

```
GET /api/intelligence/briefs/daily?profileId=xxx&date=2026-06-22
```

返回已生成并保存的日报版本，而不是临时生成。

### 13.3 专题动态 API

```
GET /api/intelligence/topics/{topicId}/updates
```

用于 Chat 和看板展示某个专题的最新变化。

### 13.4 行业基准参数 API

```
GET /api/intelligence/benchmarks?segment=小游戏&metric=ROI
```

返回：
```json
{
  "segment": "小游戏",
  "metric": "ROI",
  "parameters": [
    {
      "name": "首日 ROI 参考区间",
      "valueRange": "待内部数据校准",
      "confidence": 0.72,
      "evidenceIds": ["e1", "e2"],
      "applicableConditions": ["买量场景", "短周期回收判断"]
    }
  ]
}
```

### 13.5 证据 API

```
GET /api/intelligence/evidence/{id}
```

用于 Chat 回答"依据是什么"。

---

## 14. 质量指标

### 14.1 采集质量指标
（待定义）

### 14.2 情报质量指标
（待定义）

### 14.3 使用质量指标
（待定义）

### 14.4 模型情报指标
（待定义）

---

## 15. 系统边界与不变量

### 15.1 GI 继续坚持的边界

GI 核心仍然不做以下事项：
- 不做广告视频采集
- 不做视频 OCR / ASR
- 不做广告创意 Hook / 卖点 / CTA 结构化
- 不做广告家族/变体聚合
- 不做多账号反风控体系
- 不替代 Dataki 做本地向量库
- 不让 LLM 输出直接成为事实
- 不把 Chat 临时回答当作情报资产闭环

### 15.2 可调整的边界

原有"日报生成在小乔智投侧，不在 GI"的边界需要进一步精确定义：

GI 不负责最终面向人的日报表达和业务解释，但 GI/情报服务层需要提供日报素材、日报事件集合、排序结果和证据接口。

推荐边界：
- **GI Runtime**：负责采集、抽取、合并、评分、趋势检测、证据绑定。
- **Intelligence Service**：负责日报素材聚合、资讯流排序、专题动态、基准参数 API。
- **小乔智投 Chat**：负责自然语言解释、用户视角改写、追问、订阅配置、业务动作建议。

这样既保留采集和使用分离，也避免 Chat 每次临时检索导致结果不稳定。

### 15.3 开源与成本原则

现有 GI 工具链应继续保持：
- 采集工具优先开源免费
- 部署尽量轻量
- 不引入不必要的中间件
- 单机 Docker Compose 可运行
- 模型调用成本单独治理
- 多模型调用按任务优先级控制频率

---

## 16. 演进路线

### P0：统一情报资产底座

**目标**：在现有 GI 基础上补齐情报资产模型和服务边界。

**交付**：
- Requirement Profile 数据模型
- Evidence Ledger 标准化
- Source Registry 扩展
- ModelAnswer / ModelClaim / ModelSourceMention 表
- Intelligence Feed API
- Daily Brief API 雏形
- Dataki 同步字段增强
- Chat 调用情报 API 的最小闭环

**验收**：
```
用户配置一个专题
→ GI 自动采集
→ 结构化事件
→ 绑定证据
→ 同步 Dataki
→ Intelligence API 输出
→ Chat 可查看专题动态和证据
```

### P1：模型情报与信源发现闭环

**目标**：让大模型成为新信源发现器和趋势假设生成器。

**交付**：
- LLM Task Library
- 多模型调用网关
- 模型回答存档
- 模型信源抽取
- 候选信源试采
- 信源评分
- 源发现页面
- 模型观点核验流程

**验收**：
```
系统定期问多个模型
→ 发现新信源
→ 自动注册候选源
→ 试采验证
→ 有效源进入正式采集
```

### P2：专题动态、日报与行业基准参数

**目标**：把情报从内容库升级为业务可消费服务。

**交付**：
- 专题动态 API
- 日报版本管理
- 已读/未读与订阅配置
- Benchmark Store
- 预测参数 API
- Chat 预测场景调用
- 用户反馈闭环

**验收**：
```
用户可配置小游戏买量日报
→ 每天生成稳定版本
→ Chat 可展示日报
→ 用户可追问依据
→ 预测场景可调用行业基准参数
```

### P3：认知沉淀与蒸馏数据集

**目标**：形成行业认知库和蒸馏训练数据。

**交付**：
- 高质量问答样本库
- 模型观点正确/错误标注
- 多模型共识/分歧数据集
- 行业判断 Playbook
- 蒸馏数据导出
- 游戏买量认知模型训练数据

**验收**：
```
系统能沉淀：
输入：行业问题 + 已采集证据 + 多模型观点
输出：结构化情报判断 + 证据 + 行动建议
```

### P4：图谱、预测与多语言

**目标**：面向长期行业洞察和出海情报。

**交付**：
- Source Graph
- Entity Graph
- Event Graph
- 多语言采集
- 出海专题
- 趋势预测
- 竞品动作预警
- 战略情报看板

---

## 17. 与小乔智投和 Dataki 的关系

### 17.1 与 Dataki

Dataki 是知识库与语义检索底座。

GI 同步到 Dataki 的内容应包括：
- 原文
- 摘要
- 切片
- 事件
- 标签
- 实体
- 来源
- 证据引用
- 核验状态
- 适用角色
- 关联专题

GI 不在本地重复建设向量库，语义检索统一走 Dataki。

### 17.2 与小乔智投 Chat

小乔智投 Chat 是行业情报消费入口之一，不是唯一入口。

Chat 应通过工具/API 调用：
- Dataki 检索
- Daily Brief API
- Topic Updates API
- Trend Signal API
- Benchmark API
- Evidence API
- Source API
- Model Opinion API

**Chat 的价值是：**
- 理解用户问题
- 选择合适 API
- 组合多个来源
- 解释依据
- 个性化回答
- 引导配置订阅
- 生成业务动作建议

### 17.3 与公众号/日报

公众号和日报是分发形态。

推荐链路：
```
GI 采集
→ Intelligence Service 生成日报素材和版本
→ Chat 或内容助手改写为公众号草稿
→ 人工审核
→ 发布
```

公众号草稿不应直接从原始文章拼接，而应基于已经去重、排序、核验和结构化的情报版本。

---

## 18. 最终产品蓝图

GI VNext 的最终形态不是一个单纯爬虫后台，而是公司级游戏行业情报系统中的核心生产引擎。

```
Configuration Center
    ↓
Source Intelligence Center
    ↓
Crawler Runtime + Model Intelligence Runtime
    ↓
Evidence Verification Center
    ↓
Intelligence Warehouse + Dataki
    ↓
Intelligence Service API
    ↓
Chat / 看板 / 日报 / 公众号 / 预测应用
```

**一句话定义：**

> GI 负责发现和生产可信行业情报资产；Dataki 负责知识化和检索；情报服务层负责把资产变成稳定可消费的产品能力；Chat 负责把这些能力变成用户可自然使用的智能入口。

最终目标不是"多采几篇文章"，而是建立一套长期可积累的游戏行业认知系统：

- 从内容采集
- 到信源图谱
- 到事件信号
- 到证据账本
- 到模型情报
- 到行业基准
- 到预测参数
- 到决策支持

当系统可以持续回答：
- 最近发生了什么？
- 为什么重要？
- 依据是什么？
- 谁应该关注？
- 趋势是否变化？
- 对发行/运营/投放/产品有什么影响？
- 有哪些信源还没覆盖？
- 哪些模型判断是错的？
- 哪些行业参数可以复用到预测？

**GI 才真正从"采集系统"升级为"行业情报基础设施"。**

---

## 19. 管理层汇报口径

GI VNext 的管理层汇报口径可以简化为：

> **我们不是做一个爬虫工具，而是建设公司级游戏行业情报基础设施。**

它解决三件事：

**1. 比人更快发现信息**  
通过 RSS、公众号、网页、榜单、变更监控、搜索和大模型信源发现，提升行业信息覆盖率。

**2. 比人更稳沉淀信息**  
将文章、信源、事件、证据、趋势、模型观点、行业基准参数全部结构化入库，避免信息看完即丢。

**3. 比普通知识库更可服务业务**  
通过 Intelligence Service API，把日报、资讯流、专题动态、趋势信号、预测参数封装给 Chat、看板、公众号和后续 AI 应用调用。

最终形成：

```
采集能力
+
知识库能力
+
情报服务能力
+
Chat 使用能力
+
行业认知沉淀能力
```

**这才是 GI 从 1.0 走向 VNext 的核心价值。**
