# GI 情报服务 API 集成指南

> **版本**：1.0  
> **日期**：2026-06-22  
> **目标读者**：小乔智投 Chat 团队、看板团队、公众号草稿团队、其他情报消费端  
> **GI 服务端**：`http://<gi-host>:8003`  
> **API 基础路径**：`/api/v1`

---

## 0. TL;DR — 30 秒看懂

```
小乔智投需要做的就是一件事：
  当用户问到行业情报相关问题时，调用 GI 的 Intelligence Service API，
  把结果用友好的方式展示给用户。

最常用的 5 个端点：
  GET /api/v1/intelligence/briefs/daily?profileId=xxx   —— 今日日报
  GET /api/v1/intelligence/feed?eventType=上线,买量&sourceType=wechat_mp&since=7d&keyword=买量 —— 资讯流（支持历史+源+关键词）
  GET /api/v1/intelligence/topics/{topicId}/updates?since=7d      —— 专题动态（返回趋势）
  GET /api/v1/intelligence/benchmarks?segment=小游戏     —— 行业基准
  GET /api/v1/intelligence/evidence/:type/:id           —— 证据依据

其中：
- 今日日报：只做当日汇总（可指定 `date`）。
- 资讯流：支持按时间窗（since）、信源类型（sourceType）、信源ID（sourceId）、关键词（keyword）。
- 专题动态：topic/eventType 专用视角，保留趋势信号。

所有响应格式统一：
  {
    "data": { ... },          // 业务数据
    "meta": { "total": N }    // 可选的元信息
  }
```

---

## 1. 为什么需要 GI 情报服务

### 1.1 没有 GI 时 Chat 怎么做

```
用户问："最近小游戏买量有什么变化？"
Chat → 实时调用 LLM → 模型凭"印象"回答
    → 没有依据、没有时间、没有来源
    → 每次回答可能不同
    → 无法追溯、无法验证
```

### 1.2 有 GI 后 Chat 怎么做

```
用户问："最近小游戏买量有什么变化？"
Chat → 调用 Intelligence Service API
    → GI 返回：结构化的事件列表 + 证据账本 + 核验状态
    → Chat 基于真实数据回答，带来源、带时间、带置信度
    → 用户追问"依据呢" → Chat 再调 Evidence API 展示原始证据
```

### 1.3 一句话定位

| 系统 | 职责 |
|------|------|
| **GI** | 情报采集 + 情报资产生产（发现、抽取、去重、核验、沉淀） |
| **Dataki** | 知识库 + 语义检索（原文切片、向量搜索） |
| **Intelligence Service**（本指南） | 把情报资产封装为稳定 API |
| **小乔智投 Chat** | 自然语言入口 + 业务解释 + 个性化回答 |

---

## 2. 接入准备

### 2.1 网络

GI 服务默认运行在内网 `http://<gi-host>:8003`，Chat 通过 HTTP 直接调用。

> ⚠️ **当前无鉴权**（内部服务）。后续会加 API Key 机制，接入时请关注更新。

### 2.2 通用约定

| 项 | 约定 |
|----|------|
| 协议 | HTTP/HTTPS |
| 方法 | RESTful（GET 查询 / POST 创建 / PUT 更新 / PATCH 部分更新 / DELETE 删除） |
| 内容类型 | `application/json` |
| 时间格式 | ISO 8601（`2026-06-22T09:00:00+08:00`） |
| 分页 | `?page=1&pageSize=20`（默认 20，最大 100） |
| 排序 | `?sort=-createdAt`（`-` 表示降序） |
| 过滤 | `?status=active&priority=P0` |
| 多值 | `?priority=P0,P1`（逗号分隔） |

### 2.3 通用响应结构

```typescript
// 成功响应
{
  "data": T,                 // 业务数据（对象或数组）
  "meta"?: {                 // 可选的元信息
    "page"?: number,
    "pageSize"?: number,
    "total"?: number,
    "generatedAt"?: string
  }
}

// 错误响应
{
  "error": {
    "code": string,          // 错误码
    "message": string        // 人话描述
  }
}
```

### 2.4 通用错误码

| HTTP 状态 | 错误码 | 场景 |
|-----------|--------|------|
| 400 | `INVALID_INPUT` | 缺少必填参数 / 参数格式错误 |
| 400 | `CREATE_FAILED` | 创建失败（含业务校验失败） |
| 400 | `GENERATE_FAILED` | 简报生成失败 |
| 400 | `INVALID_STATUS` | 状态值非法 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 500 | `INTERNAL_ERROR` | 服务内部错误 |

---

## 3. 核心 API —— Chat 最常用的 5 个

### 3.1 今日日报 ⭐

```
GET /api/v1/intelligence/briefs/daily?profileId=xxx&date=2026-06-22
```

**什么时候调**：用户问"今天有什么行业新闻"/"给我看下今天的日报"

**响应示例**：
```json
{
  "data": {
    "id": "brief-uuid",
    "briefType": "daily",
    "title": "游戏行业日报 — 2026-06-22",
    "sections": [
      {
        "id": "section-1",
        "title": "今日重点事件",
        "order": 1,
        "items": [
          {
            "id": "1-1",
            "title": "米哈游《鸣潮》2.0 版本定档 6/28",
            "summary": "米哈游今日宣布《鸣潮》2.0 版本定档 6 月 28 日上线...",
            "eventType": "上线",
            "priority": "P0",
            "evidenceIds": ["ledger-001", "ledger-002"],
            "sourceCount": 5,
            "audienceTags": ["老板", "战略", "发行"],
            "verificationStatus": "verified"
          }
        ]
      },
      {
        "id": "section-unverified",
        "title": "需继续核验线索",
        "order": 99,
        "items": [...]
      }
    ],
    "generatedAt": "2026-06-22T09:00:00+08:00",
    "status": "published"
  }
}
```

**Chat 怎么用**：
- 直接把 `sections` 渲染成卡片列表
- 用户追问某条 → 拿到 `evidenceIds` → 调 Evidence API（见 3.5）
- `verificationStatus` 提示用户可信度

**404 处理**：今日日报尚未生成，可提示用户"今日日报正在生成中，请稍后查看"，或触发 `POST /intelligence/briefs/generate`（见 3.7）。

---

### 3.2 资讯流

```
GET /api/v1/intelligence/feed?eventType=上线,买量&priority=P0,P1&limit=20
```

**什么时候调**：用户问"最近有什么新闻"/"关于 X 的最新动态"

**查询参数**：
| 参数 | 说明 |
|------|------|
| `profileId` | 限定到某个画像 |
| `eventType` | 事件类型过滤（多值逗号分隔） |
| `priority` | 优先级过滤（`P0`/`P1`/`P2`/`P3`） |
| `audienceTag` | 适用角色过滤（`老板`/`发行`/`运营` 等） |
| `sourceType` | 信源类型过滤：`media`/`community`/`official`/`social`/`forum`/`wechat_mp`（兼容 `wewe`） |
| `sourceId` | 信源ID过滤（多值逗号分隔） |
| `keyword` | 关键词过滤（标题/事件类型/摘要） |
| `since` | 时间范围（`24h` / `7d` / ISO8601） |
| `limit` | 返回条数 |

**响应示例**：
```json
{
  "data": {
    "items": [
      {
        "id": "event_001",
        "title": "某产品开启预约",
        "summary": "某产品今日开启全平台预约...",
        "eventType": "预约",
        "priority": "P1",
        "audienceTags": ["发行", "产品"],
        "sourceCount": 3,
        "evidenceIds": ["ledger-1", "ledger-2"],
        "verificationStatus": "verified",
        "publishedAt": "2026-06-22T08:00:00+08:00",
        "impactScore": 85
      }
    ],
    "meta": {
      "total": 45,
      "generatedAt": "2026-06-22T09:00:00+08:00"
    }
  }
}
```

**相关端点**：
- `GET /feed/highlights` — 重点事件（P0/P1 优先），适合首页"要闻"

---

### 3.3 专题动态

**补充：专题动态的定位**
- 专题是“topicId 语义层”，本质上是对 `eventType`/topic 的专题化查询。
- 如果只是希望“按 topic + 时间 + 信源 + 关键词”检索，推荐使用 `/api/v1/intelligence/feed`。
- 如果你要拿趋势建议（上升/下降）保留，继续用 `/topics/{id}/updates`。


```
GET /api/v1/intelligence/topics/{topicId}/updates?since=7d
```

**什么时候调**：用户配置了专题，或问"X 最近有什么变化"

**topicId 取值**：事件类型（`上线` / `买量` / `版号` 等）或话题标签（`小游戏买量` / `AI游戏` 等）

**响应示例**：
```json
{
  "data": {
    "topicId": "上线",
    "topicName": "上线",
    "period": "7d",
    "updates": [
      {
        "id": "event_001",
        "title": "某产品公测",
        "summary": "...",
        "eventType": "上线",
        "publishedAt": "2026-06-21T10:00:00Z",
        "evidenceIds": [...],
        "verificationStatus": "verified"
      }
    ],
    "trendSignals": [
      {
        "direction": "rising",
        "growthRate": 0.45,
        "description": "上线 上升 45%"
      }
    ]
  }
}
```

**相关端点**：
- `GET /signals/trending` — 全局热门趋势（上升中的话题簇）
- `GET /signals/anomalies` — 异常信号（待实现）

---

### 3.4 行业基准参数

```
GET /api/v1/intelligence/benchmarks?segment=小游戏&metric=ROI
```

**什么时候调**：用户问"某类产品的 ROI 参考值"/"行业基准是多少"

**查询参数**：
| 参数 | 必填 | 说明 |
|------|------|------|
| `segment` | ✓ | 细分领域（`小游戏` / `二游` / `SLG` 等） |
| `metric` | | 指标名（`ROI` / `CPA` / `LTV_D7` 等） |
| `activeOnly` | | 只返回未过期的（`true`） |

**响应示例**：
```json
{
  "data": {
    "segment": "小游戏",
    "metric": "ROI",
    "parameters": [
      {
        "id": "bm-001",
        "name": "首日ROI",
        "valueRange": { "min": 0.08, "max": 0.15, "p50": 0.11 },
        "confidence": 0.72,
        "timeWindow": "2026-Q1",
        "evidenceIds": ["ledger-e1", "ledger-e2"],
        "applicableConditions": ["买量场景", "短周期回收判断"]
      }
    ]
  }
}
```

**辅助端点**：
- `GET /benchmarks/segments` — 列出所有细分领域（用于前端下拉框）

---

### 3.5 证据摘要（"依据是什么"）⭐

```
GET /api/v1/intelligence/evidence/{targetType}/{targetId}
```

**什么时候调**：用户追问"为什么这么说"/"依据呢"

**targetType 取值**：
- `structured_event` — 事件
- `model_claim` — 模型观点
- `benchmark` — 基准参数
- `intelligence_brief` — 简报

**响应示例**：
```json
{
  "data": {
    "target": { "type": "structured_event", "id": "event_001" },
    "evidence": [
      {
        "id": "ledger-001",
        "evidenceType": "raw_article",
        "title": "米哈游《鸣潮》2.0 版本定档 6/28",
        "url": "https://www.gamelook.com.cn/article/12345",
        "publishedAt": "2026-06-17T14:00:00Z",
        "collectedAt": "2026-06-17T14:30:00Z",
        "verificationStatus": "verified",
        "confidence": 0.95
      },
      {
        "id": "ledger-002",
        "evidenceType": "model_answer",
        "title": "Qwen 模型确认此信息",
        "publishedAt": null,
        "collectedAt": "2026-06-18T09:00:00Z",
        "verificationStatus": "verified",
        "confidence": 0.85
      }
    ],
    "summary": {
      "total": 5,
      "verified": 4,
      "conflicted": 0,
      "unverified": 1,
      "lowConfidence": 0,
      "rejected": 0,
      "expired": 0
    }
  }
}
```

**Chat 怎么用**：
- 展示 `evidence` 列表，每条带来源 URL、发布时间、核验状态
- `summary` 用于可视化：4/5 已核验 ✅、1/5 待核验 ⚠️
- 用户点击证据 → 打开 `url` 查看原文

---

### 3.6 模型观点聚合

```
GET /api/v1/intelligence/model-opinions?claimType=trend&limit=20
```

**什么时候调**：用户问"AI 怎么看待 X"/"多个模型对这件事有什么看法"

**响应示例**：
```json
{
  "data": {
    "claims": [
      {
        "id": "claim-001",
        "summary": "小游戏买量市场预计 Q3 进入饱和期",
        "claimType": "trend",
        "confidence": 0.78,
        "verificationStatus": "verified",
        "evidenceIds": ["ledger-c1", "ledger-c2"],
        "createdAt": "2026-06-21T03:00:00Z"
      }
    ]
  }
}
```

---

### 3.7 触发生成简报

```
POST /api/v1/intelligence/briefs/generate
```

**什么时候调**：用户要求"现在就生成一份日报"/专题简报

**请求体**：
```json
{
  "profileId": "xxx",
  "briefType": "daily",
  "title": "可选自定义标题",
  "windowHours": 24,
  "autoPublish": true,
  "date": "2026-06-22"
}
```

**响应**：
```json
{
  "data": {
    "brief": { "id": "...", "status": "published", ... },
    "sectionsGenerated": 6,
    "itemsGenerated": 23,
    "evidenceBound": 47
  }
}
```

---


### 3.8 关键词实时拓展（种子/信源）

```
POST /api/v1/intelligence/expansion/keyword
```

当用户提交关键词后，可按关键词实时创建种子或信源（支持干跑）。

**请求体**：
```json
{
  "keyword": "原神",
  "scope": "all",
  "seedType": "event",
  "sourceType": "media",
  "createSeed": true,
  "createSource": true,
  "dryRun": false
}
```

- `scope`: `seed` | `source` | `all`（默认 `all`）
- `seedType`: `entity` / `event` / `topic` / `source`（默认 `event`）
- `sourceType`: `media` / `community` / `official` / `social` / `wechat_mp`（兼容 `wewe`）
- `createSeed`: 是否真的创建种子（默认 `true`）
- `createSource`: 是否真的创建信源（默认 `true`）
- `dryRun`: `true` 时只返回候选，不落库（默认 `false`）

**响应摘要**：返回候选 `candidates`、已创建 `created` 与跳过 `skipped`，以及 `meta` 创建计数。

```json
{
  "data": {
    "keyword": "原神",
    "scope": "all",
    "request": {
      "seedType": "event",
      "sourceType": "media",
      "createSeed": true,
      "createSource": true,
      "dryRun": false
    },
    "created": {
      "seeds": [{ "id": "seed-001", "seedType": "event", "text": "原神" }],
      "sources": [{ "id": "src-001", "name": "原神", "baseUrl": "https://原神.com" }]
    },
    "skipped": { "seeds": [], "sources": [] },
    "candidates": {
      "seeds": [{ "seedType": "event", "text": "原神" }],
      "sources": [{ "sourceType": "media", "name": "原神" }]
    },
    "meta": { "createdSeedCount": 1, "createdSourceCount": 1 }
  }
}
```

**curl 样例**：
```bash
# 真实创建：按关键词同时拓展种子和信源
curl -X POST "http://localhost:8003/api/v1/intelligence/expansion/keyword" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "原神",
    "scope": "all",
    "seedType": "event",
    "sourceType": "media",
    "createSeed": true,
    "createSource": true,
    "dryRun": false
  }'

# 预览模式：只返回候选，不落库
curl -X POST "http://localhost:8003/api/v1/intelligence/expansion/keyword" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "小游戏买量",
    "scope": "all",
    "seedType": "topic",
    "sourceType": "wechat_mp",
    "dryRun": true
  }'
```

**错误码**：

| HTTP 状态 | 错误码 | 场景 | 建议处理 |
|-----------|--------|------|----------|
| 400 | `INVALID_INPUT` | `keyword` 为空或缺失 | 提示用户补充关键词 |
| 500 | `CREATE_FAILED` | 种子/信源创建过程异常 | 展示失败原因，可引导用户稍后重试或改用 `dryRun` |

**说明**：
- 关键词检索仍建议优先使用 `GET /api/v1/intelligence/feed?keyword=...`
- 该接口用于“提交关键词后，触发拓展动作（种子/信源）”

---

## 4. 完整端点清单

### 4.1 情报服务 `/intelligence`（Chat 主力）

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/intelligence/feed` | 资讯流 |
| GET | `/intelligence/feed/highlights` | 重点事件 |
| GET | `/intelligence/briefs` | 简报列表 |
| GET | `/intelligence/briefs/daily` | **当日日报** ⭐ |
| GET | `/intelligence/briefs/:id` | 简报详情 |
| POST | `/intelligence/briefs/generate` | **触发生成简报** |
| GET | `/intelligence/topics` | 专题列表 |
| GET | `/intelligence/topics/:id/updates` | **专题动态** |
| GET | `/intelligence/signals/trending` | 热门趋势 |
| GET | `/intelligence/signals/anomalies` | 异常信号 |
| GET | `/intelligence/signals/saturated` | 饱和信号 |
| GET | `/intelligence/benchmarks` | **行业基准** |
| GET | `/intelligence/benchmarks/segments` | 细分领域列表 |
| GET | `/intelligence/model-opinions` | 模型观点 |
| GET | `/intelligence/evidence/:type/:id` | **证据摘要** ⭐ |
| POST | `/api/v1/intelligence/expansion/keyword` | 关键词实时拓展（种子/信源） |
| GET | `/intelligence/sources` | 信源总览 |

### 4.2 画像管理 `/profiles`（运营配置）

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/profiles` | 画像列表 |
| GET | `/profiles/stats` | 画像统计 |
| POST | `/profiles` | 创建画像 |
| GET | `/profiles/:id` | 画像详情 |
| PUT | `/profiles/:id` | 更新画像 |
| PATCH | `/profiles/:id/status` | 切换状态 |
| GET | `/profiles/:id/entities` | 提取实体 |
| DELETE | `/profiles/:id` | 删除画像 |

### 4.3 证据账本 `/ledger`（深度调查）

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/ledger` | 证据列表 |
| GET | `/ledger/stats` | 按类型统计 |
| GET | `/ledger/by-target` | 按目标查询（含汇总） |
| GET | `/ledger/pending/list` | 待核验队列 |
| GET | `/ledger/:id` | 证据详情 |
| PATCH | `/ledger/:id/verify` | 更新核验状态 |

### 4.4 模型情报 `/model`（AI 洞察）

| 方法 | 路径 | 用途 |
|------|------|------|
| GET/POST | `/model/tasks` | 任务列表/创建 |
| GET/PATCH/DELETE | `/model/tasks/:id` | 任务详情/更新/删除 |
| GET | `/model/answers` | 回答列表 |
| GET | `/model/answers/:id` | 回答详情 |
| GET | `/model/claims` | 观点列表 |
| GET | `/model/claims/stats` | 观点统计 |
| PATCH | `/model/claims/:id/verify` | 更新观点核验状态 |
| GET | `/model/source-mentions` | 信源提及列表 |
| PATCH | `/model/source-mentions/:id/bind` | 绑定到 Source Registry |

---

## 5. Chat 集成模板

### 5.1 用户问今日行业日报

```javascript
// Chat 处理流程
async function handleDailyBrief(userId) {
  // 1. 查找用户的画像（如果没有则用默认画像）
  const profileId = await getUserProfileId(userId) || 'default-profile-id';
  
  // 2. 调用 GI 日报 API
  const res = await fetch(`http://gi-host:8003/api/v1/intelligence/briefs/daily?profileId=${profileId}`);
  
  if (res.status === 404) {
    return '今日日报正在生成中，请稍后查看，或我现在帮您生成？';
  }
  
  const { data: brief } = await res.json();
  
  // 3. 渲染为卡片
  return renderBriefCards(brief);
}

function renderBriefCards(brief) {
  return brief.sections.map(section => ({
    title: section.title,
    items: section.items.map(item => ({
      headline: item.title,
      summary: item.summary,
      tags: item.audienceTags,
      priority: item.priority,
      badge: verificationBadge(item.verificationStatus),
      evidenceCount: item.evidenceIds.length,
      sourceCount: item.sourceCount,
      // 点击跳转到证据详情
      onDetail: () => showEvidence(item.evidenceIds)
    }))
  }));
}

function verificationBadge(status) {
  switch (status) {
    case 'verified':      return { icon: '✅', text: '已核验' };
    case 'conflicted':    return { icon: '⚠️', text: '存在冲突' };
    case 'unverified':    return { icon: '⏳', text: '待核验' };
    case 'low_confidence':return { icon: '🔻', text: '低置信度' };
    default:              return { icon: '❓', text: status };
  }
}
```

### 5.2 用户问依据 / "为什么这么说"

```javascript
async function handleEvidenceQuery(targetType, targetId) {
  const res = await fetch(
    `http://gi-host:8003/api/v1/intelligence/evidence/${targetType}/${targetId}`
  );
  const { data } = await res.json();
  
  // 展示证据列表
  return {
    summary: `${data.summary.verified}/${data.summary.total} 条证据已核验`,
    evidence: data.evidence.map(e => ({
      title: e.title,
      url: e.url,
      source: e.evidenceType,
      publishedAt: e.publishedAt,
      status: verificationBadge(e.verificationStatus),
      confidence: `${Math.round(e.confidence * 100)}%`
    }))
  };
}
```

### 5.3 用户问预测参数 / 行业基准

```javascript
async function handleBenchmarkQuery(segment, metric) {
  let url = `http://gi-host:8003/api/v1/intelligence/benchmarks?segment=${segment}`;
  if (metric) url += `&metric=${metric}`;
  
  const res = await fetch(url);
  const { data } = await res.json();
  
  return data.parameters.map(p => ({
    name: p.name,
    range: p.valueRange 
      ? `${p.valueRange.min} ~ ${p.valueRange.max} (中位数 ${p.valueRange.p50})`
      : '待校准',
    confidence: `${Math.round(p.confidence * 100)}%`,
    timeWindow: p.timeWindow,
    conditions: p.applicableConditions.join('、'),
    // 点击可查证据
    evidenceIds: p.evidenceIds
  }));
}
```

### 5.4 用户问"AI 怎么看待 X"

```javascript
async function handleModelOpinionQuery(topic) {
  const res = await fetch(
    `http://gi-host:8003/api/v1/intelligence/model-opinions?topic=${topic}&limit=10`
  );
  const { data } = await res.json();
  
  return data.claims.map(c => ({
    summary: c.summary,
    type: c.claimType,
    confidence: `${Math.round(c.confidence * 100)}%`,
    status: verificationBadge(c.verificationStatus),
    // 注意：模型观点必须标注为"AI 观点"，不要让用户误以为是事实
    label: '🤖 AI 观点',
    evidenceIds: c.evidenceIds
  }));
}
```

---

## 6. 关键概念速查

### 6.1 核验状态（VerificationStatus）

| 状态 | 含义 | Chat 展示建议 |
|------|------|---------------|
| `verified` | 已多源核验为可信 | ✅ 已核验 / 绿色徽章 |
| `unverified` | 待核验 | ⏳ 待核验 / 黄色徽章 |
| `conflicted` | 多源间存在冲突 | ⚠️ 存在冲突 / 橙色徽章 |
| `low_confidence` | 低置信度 | 🔻 低置信度 / 灰色徽章 |
| `rejected` | 已丢弃（核验失败） | ❌ 已丢弃 |
| `expired` | 已过期 | ⏰ 已过期 |

> **重要原则**：模型观点（`claim`）默认必须标注为"AI 观点"，不得让用户误以为是事实。只有 `verified` 状态的才能作为事实引用。

### 6.2 事件类型（EventType）

`上线` / `测试` / `预约` / `版号` / `榜单变化` / `买量` / `舆情` / `融资` / `组织动作` / `版本更新` / `出海` / `合作` / `政策` / `AI应用`

### 6.3 优先级（Priority）

| 等级 | 含义 |
|------|------|
| P0 | 重大事件，需要立即关注 |
| P1 | 重要事件，应当日内关注 |
| P2 | 一般事件，可稍后查看 |
| P3 | 次要事件，仅作记录 |

### 6.4 证据类型（LedgerEvidenceType）

| 类型 | 来源 |
|------|------|
| `raw_article` | 原文 |
| `raw_image_ocr` | 图片 OCR |
| `raw_rss` | RSS 条目 |
| `model_answer` | 模型直接回答 |
| `model_claim` | 模型观点 |
| `cross_verified` | 多源交叉验证 |
| `benchmark_source` | 基准参数来源 |
| `human_feedback` | 人工反馈 |

---

## 7. 错误处理建议

```javascript
async function callGI(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      timeout: 10000,
    });
    
    if (res.status === 200) {
      return await res.json();
    }
    
    if (res.status === 404) {
      // 资源不存在 — 给用户友好的提示
      return { notFound: true };
    }
    
    if (res.status === 400) {
      const { error } = await res.json();
      console.warn('[GI] Bad request:', error);
      return { badRequest: true, error };
    }
    
    // 其他错误 — 降级处理
    console.error('[GI] Unexpected status:', res.status);
    return { error: true, status: res.status };
  } catch (err) {
    // 网络错误 — 降级到 Chat 自己回答
    console.error('[GI] Network error:', err);
    return { networkError: true };
  }
}
```

**降级策略**：
- GI 不可用时，Chat 可以退化为"基于通用知识回答，但明确告知用户未接入情报系统"
- 重要场景（日报、证据）不应降级，应明确告知用户"情报服务暂时不可用"

---

## 8. 后续规划

| 时间 | 能力 | 影响 Chat |
|------|------|----------|
| P0（当前） | Intelligence Service API 基础 | Chat 可调用日报/资讯流/证据/基准 |
| P1 | 模型情报闭环 | Chat 可展示"多个模型怎么看"+ 模型推荐信源 |
| P2 | 专题动态 + 订阅 | Chat 可让用户订阅专题 + 推送 |
| P3 | 认知沉淀 | Chat 可引用历史判断 / Playbook |
| P4 | 图谱 + 预测 | Chat 可做趋势预测 / 竞品预警 |

---

## 9. 联系与反馈

- **GI 服务维护**：[待填写]
- **API 文档**：`http://<gi-host>:8003/api/v1/` （服务启动后可访问）
- **问题反馈**：[待填写]
- **紧急联系**：[待填写]

---

## 附录 A：Postman / curl 测试样例

```bash
# 今日日报
curl "http://localhost:8003/api/v1/intelligence/briefs/daily?profileId=xxx"

# 资讯流
curl "http://localhost:8003/api/v1/intelligence/feed?eventType=上线,买量&limit=10"

# 专题动态
curl "http://localhost:8003/api/v1/intelligence/topics/上线/updates?since=7d"

# 行业基准
curl "http://localhost:8003/api/v1/intelligence/benchmarks?segment=小游戏"

# 证据
curl "http://localhost:8003/api/v1/intelligence/evidence/structured_event/event_001"

# 模型观点
curl "http://localhost:8003/api/v1/intelligence/model-opinions?claimType=trend"

# 创建画像
curl -X POST http://localhost:8003/api/v1/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "小游戏买量日报",
    "owner": "user-001",
    "purpose": ["发行", "买量"],
    "focusTopics": ["新游上线", "买量素材变化"],
    "entities": {
      "companies": ["腾讯", "三七"],
      "products": ["微信小游戏"]
    },
    "deliveryPolicy": {
      "format": "daily_brief",
      "frequency": "每天9点"
    }
  }'
```

## 附录 B：SDK 封装建议

```typescript
// gi-client.ts — 建议 Chat 团队封装一个轻量 SDK
export class GIClient {
  constructor(private baseUrl: string = 'http://gi-host:8003/api/v1') {}

  async getDailyBrief(profileId: string, date?: string) {
    const url = `${this.baseUrl}/intelligence/briefs/daily?profileId=${profileId}`;
    const res = await fetch(date ? `${url}&date=${date}` : url);
    return res.json();
  }

  async getFeed(options: FeedOptions = {}) {
    const params = new URLSearchParams();
    if (options.profileId) params.set('profileId', options.profileId);
    if (options.eventType) params.set('eventType', options.eventType.join(','));
    if (options.priority) params.set('priority', options.priority.join(','));
    if (options.limit) params.set('limit', String(options.limit));
    const res = await fetch(`${this.baseUrl}/intelligence/feed?${params}`);
    return res.json();
  }

  async getEvidence(targetType: string, targetId: string) {
    const res = await fetch(`${this.baseUrl}/intelligence/evidence/${targetType}/${targetId}`);
    return res.json();
  }

  async getBenchmarks(segment: string, metric?: string) {
    const params = new URLSearchParams({ segment });
    if (metric) params.set('metric', metric);
    const res = await fetch(`${this.baseUrl}/intelligence/benchmarks?${params}`);
    return res.json();
  }
}
```

### 4.2 接口差异与建议

- `briefs/daily`：仅保留“今日日报”语义，不做通用检索。
- `topics/:id/updates`：保留“专题视图 + 趋势信号”语义，适合卡片化专题呈现。
- `feed`：新增通用检索参数，支持 `since/sourceType/sourceId/keyword`，可替代大部分“按条件查 feed”的场景。
- `wewe` 场景建议统一写法：`sourceType=wechat_mp`（兼容 `sourceType=wewe`）。









