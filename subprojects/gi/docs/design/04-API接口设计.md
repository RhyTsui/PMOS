# 04-API 接口设计

> 版本：1.0 | 创建时间：2026-06-18 | 状态：设计中
> GI 系统 RESTful API 完整定义。基础路径：`/api/v1`

---

## 一、API 规范

### 1.1 通用约定

```
基础路径：/api/v1
响应格式：JSON
分页：?page=1&pageSize=20（默认 20，最大 100）
排序：?sort=-createdAt（- 降序，无 - 升序）
过滤：?status=active&priority=P0
搜索：?q=关键词
时间格式：ISO 8601（2026-06-18T10:30:00.000Z）
```

### 1.2 统一响应格式

```typescript
// 成功响应
interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

// 错误响应
interface ApiError {
  error: {
    code: string;           // 错误码
    message: string;        // 错误描述
    details?: unknown;      // 详细信息
  };
}

// HTTP 状态码
// 200 OK        - 成功
// 201 Created   - 创建成功
// 400 Bad Request  - 参数错误
// 404 Not Found    - 资源不存在
// 500 Internal Error - 服务内部错误
```

---

## 二、情报源 API

```
GET    /api/v1/sources              # 源列表
POST   /api/v1/sources              # 创建源
GET    /api/v1/sources/:id          # 源详情
PUT    /api/v1/sources/:id          # 更新源
DELETE /api/v1/sources/:id          # 删除源
POST   /api/v1/sources/:id/test     # 测试源连通性
```

### 2.1 获取源列表

```
GET /api/v1/sources?page=1&pageSize=20&enabled=true&priority=P0&sourceType=media&sort=-createdAt
```

**响应**：
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "GameLook",
      "shortName": "GL",
      "sourceType": "media",
      "accessMethod": "rss",
      "baseUrl": "https://www.gamelook.com.cn",
      "feedUrl": "https://www.gamelook.com.cn/feed",
      "enabled": true,
      "priority": "P0",
      "tags": ["行业"],
      "health": {
        "status": "healthy",
        "score": 92,
        "lastCollectedAt": "2026-06-18T10:00:00Z"
      },
      "createdAt": "2026-06-01T00:00:00Z",
      "updatedAt": "2026-06-18T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 15
  }
}
```

### 2.2 创建源

```
POST /api/v1/sources
Content-Type: application/json

{
  "name": "GameLook",
  "shortName": "GL",
  "sourceType": "media",
  "accessMethod": "rss",
  "baseUrl": "https://www.gamelook.com.cn",
  "feedUrl": "https://www.gamelook.com.cn/feed",
  "priority": "P0",
  "tags": ["行业"],
  "config": {
    "requestDelay": 2000
  },
  "schedule": {
    "cron": "*/30 * * * *",
    "retryOnFail": true,
    "maxRetries": 3,
    "backoffMinutes": 5
  }
}
```

### 2.3 测试源连通性

```
POST /api/v1/sources/:id/test
```

**响应**：
```json
{
  "data": {
    "success": true,
    "responseTime": 1250,
    "evidenceFound": 12,
    "message": "源连通正常，找到 12 条内容"
  }
}
```

---

## 三、种子 API

```
GET    /api/v1/seeds                # 种子列表
POST   /api/v1/seeds                # 创建种子
GET    /api/v1/seeds/:id            # 种子详情
PUT    /api/v1/seeds/:id            # 更新种子
DELETE /api/v1/seeds/:id            # 删除种子

POST   /api/v1/seeds/:id/evaluate   # 手动评估种子
POST   /api/v1/seeds/:id/expand     # 手动扩展种子
POST   /api/v1/seeds/batch/evaluate # 批量评估
POST   /api/v1/seeds/batch/expand   # 批量扩展
```

### 3.1 获取种子列表

```
GET /api/v1/seeds?seedType=entity&status=active&minScore=50&sort=-score
```

**响应**：
```json
{
  "data": [
    {
      "id": "uuid",
      "seedType": "entity",
      "text": "米哈游",
      "entityType": "company",
      "aliases": ["HoYoverse", "miHoYo"],
      "score": 85,
      "status": "active",
      "discoveryCount": 156,
      "lastUsedAt": "2026-06-18T08:00:00Z",
      "lastEffectiveAt": "2026-06-18T08:00:00Z",
      "tags": ["公司", "头部"],
      "createdAt": "2026-06-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 234
  }
}
```

### 3.2 创建实体种子

```
POST /api/v1/seeds
Content-Type: application/json

{
  "seedType": "entity",
  "text": "米哈游",
  "entityType": "company",
  "aliases": ["HoYoverse", "miHoYo"],
  "category": "二游",
  "market": "全球",
  "tags": ["头部公司"]
}
```

---

## 四、证据 API

```
GET    /api/v1/evidence             # 证据列表
GET    /api/v1/evidence/:id         # 证据详情
DELETE /api/v1/evidence/:id         # 删除证据
POST   /api/v1/evidence/:id/reprocess  # 重新处理
```

### 4.1 获取证据列表

```
GET /api/v1/evidence?sourceId=xxx&status=collected&fromDate=2026-06-01&toDate=2026-06-18&sort=-collectedAt
```

**响应**：
```json
{
  "data": [
    {
      "id": "uuid",
      "sourceId": "uuid",
      "sourceName": "GameLook",
      "url": "https://www.gamelook.com.cn/article/12345",
      "title": "米哈游《鸣潮》2.0 版本定档 6/28",
      "summary": "米哈游今日宣布...",
      "status": "extracted",
      "publishedAt": "2026-06-17T14:00:00Z",
      "collectedAt": "2026-06-17T14:30:00Z",
      "imageCount": 3,
      "seedIds": ["seed-1", "seed-2"],
      "structuredEvent": {
        "eventTitle": "米哈游《鸣潮》2.0 版本 6/28 上线",
        "eventType": "上线",
        "impactScore": 87,
        "priority": "P0"
      }
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 456
  }
}
```

---

## 五、事件 API

```
GET    /api/v1/events               # 事件列表（EvidenceEvent）
GET    /api/v1/events/:id           # 事件详情
PUT    /api/v1/events/:id           # 更新事件（手动合并/修正）
DELETE /api/v1/events/:id           # 删除事件
POST   /api/v1/events/:id/merge     # 手动合并事件
```

### 5.1 获取事件列表

```
GET /api/v1/events?eventType=上线&priority=P0&minScore=60&fromDate=2026-06-01&sort=-impactScore
```

**响应**：
```json
{
  "data": [
    {
      "id": "uuid",
      "eventTitle": "米哈游《鸣潮》2.0 版本 6/28 上线",
      "eventType": "上线",
      "impactScore": 87,
      "confidenceScore": 0.92,
      "priority": "P0",
      "sourceCount": 5,
      "audienceTags": ["老板", "战略", "发行"],
      "entities": [
        { "name": "米哈游", "type": "company" },
        { "name": "鸣潮", "type": "game" }
      ],
      "firstSeenAt": "2026-06-17T14:00:00Z",
      "lastSeenAt": "2026-06-18T08:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 89
  }
}
```

### 5.2 获取事件详情

```
GET /api/v1/events/:id
```

**响应**：
```json
{
  "data": {
    "id": "uuid",
    "eventTitle": "米哈游《鸣潮》2.0 版本 6/28 上线",
    "eventType": "上线",
    "keyFacts": [
      {
        "fact": "《鸣潮》2.0 版本定档 6 月 28 日上线",
        "importance": "high",
        "entities": ["鸣潮"]
      },
      {
        "fact": "新版本将加入新角色和开放世界新区域",
        "importance": "high",
        "entities": ["鸣潮"]
      }
    ],
    "actionAdvice": [
      {
        "role": "发行",
        "advice": "关注竞品上线节奏，调整自家产品排期避免正面冲突",
        "urgency": "watch"
      },
      {
        "role": "老板",
        "advice": "二游赛道竞争加剧，评估自身产品竞争力",
        "urgency": "info"
      }
    ],
    "sentiment": {
      "polarity": "positive",
      "intensity": 0.8,
      "target": "鸣潮"
    },
    "impactScore": 87,
    "confidenceScore": 0.92,
    "priority": "P0",
    "audienceTags": ["老板", "战略", "发行"],
    "entities": [
      { "name": "米哈游", "type": "company", "role": "subject" },
      { "name": "鸣潮", "type": "game", "role": "subject" }
    ],
    "evidenceIds": ["ev-1", "ev-2", "ev-3", "ev-4", "ev-5"],
    "sourceIds": ["src-1", "src-2", "src-3"],
    "sourceCount": 5,
    "firstSeenAt": "2026-06-17T14:00:00Z",
    "lastSeenAt": "2026-06-18T08:00:00Z"
  }
}
```

---

## 六、信号 API

```
GET    /api/v1/signals              # 信号列表
GET    /api/v1/signals/:id          # 信号详情
PUT    /api/v1/signals/:id          # 更新信号状态
POST   /api/v1/signals/:id/dispatch # 推送信号
```

### 6.1 获取信号列表

```
GET /api/v1/signals?status=new&audienceTag=老板&sort=-impactScore
```

### 6.2 推送信号

```
POST /api/v1/signals/:id/dispatch
Content-Type: application/json

{
  "targets": ["dataki", "daily_report", "webhook"]
}
```

---

## 七、趋势 API

```
GET    /api/v1/trends               # 趋势簇列表
GET    /api/v1/trends/:id           # 趋势簇详情
GET    /api/v1/trends/analytics     # 趋势分析总览
```

### 7.1 获取趋势列表

```
GET /api/v1/trends?direction=rising&sort=-growthRate
```

**响应**：
```json
{
  "data": [
    {
      "id": "uuid",
      "eventType": "AI应用",
      "topicTag": "AI NPC",
      "signalCount": 23,
      "sourceCount": 8,
      "growthRate": 0.45,
      "trendDirection": "rising",
      "windowStart": "2026-06-11T00:00:00Z",
      "windowEnd": "2026-06-18T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 12
  }
}
```

---

## 八、采集任务 API

```
GET    /api/v1/jobs                 # 任务列表
GET    /api/v1/jobs/:id             # 任务详情
POST   /api/v1/jobs                 # 手动创建采集任务
POST   /api/v1/jobs/:id/cancel      # 取消任务
POST   /api/v1/jobs/:id/retry       # 重试任务
```

### 8.1 手动创建采集任务

```
POST /api/v1/jobs
Content-Type: application/json

{
  "sourceId": "uuid",
  "seedIds": ["seed-1", "seed-2"],
  "trigger": "manual"
}
```

---

## 九、系统 API

```
GET    /api/v1/system/health        # 系统健康状态
GET    /api/v1/system/metrics       # 系统指标
POST   /api/v1/system/scheduler/pause   # 暂停调度
POST   /api/v1/system/scheduler/resume  # 恢复调度
GET    /api/v1/system/scheduler/status  # 调度状态
```

### 9.1 系统健康

```
GET /api/v1/system/health
```

**响应**：
```json
{
  "data": {
    "status": "healthy",
    "uptime": 86400,
    "components": {
      "database": "ok",
      "pythonSidecar": "ok",
      "playwright": "ok",
      "llm": "ok",
      "dataki": "ok"
    },
    "sources": {
      "total": 15,
      "healthy": 13,
      "degraded": 1,
      "down": 1
    },
    "jobs": {
      "pending": 2,
      "running": 1,
      "failed": 0
    }
  }
}
```

### 9.2 系统指标

```
GET /api/v1/system/metrics
```

**响应**：
```json
{
  "data": {
    "evidence": {
      "total": 5678,
      "today": 45,
      "thisWeek": 234,
      "duplicates": 1234
    },
    "events": {
      "total": 890,
      "today": 12,
      "byPriority": { "P0": 5, "P1": 15, "P2": 45, "P3": 120 }
    },
    "seeds": {
      "total": 234,
      "active": 156,
      "dormant": 45,
      "degraded": 23,
      "retired": 10
    },
    "sources": {
      "total": 15,
      "healthy": 13,
      "degraded": 1,
      "down": 1
    },
    "performance": {
      "avgCollectionTime": 3500,
      "avgExtractionTime": 8000,
      "deduplicationRate": 0.22,
      "llmSuccessRate": 0.98
    }
  }
}
```

---

## 十、漏采检测 API

```
GET    /api/v1/coverage/report      # 覆盖率报告
GET    /api/v1/coverage/missed      # 漏采记录
POST   /api/v1/coverage/feedback    # 提交漏采反馈
```

### 10.1 提交漏采反馈

```
POST /api/v1/coverage/feedback
Content-Type: application/json

{
  "description": "某公司今天发了融资消息但系统没采到",
  "url": "https://example.com/article/123",
  "eventType": "融资",
  "relatedEntities": ["某公司"]
}
```

**响应**：
```json
{
  "data": {
    "id": "feedback-uuid",
    "analysis": {
      "rootCause": "missing_seed",
      "detail": "没有找到关于'某公司'的实体种子",
      "suggestedAction": {
        "type": "add_seed",
        "seed": {
          "seedType": "entity",
          "text": "某公司",
          "entityType": "company"
        }
      }
    }
  }
}
```

---

## 十一、Dataki 同步 API

```
GET    /api/v1/dataki/status        # Dataki 同步状态
POST   /api/v1/dataki/sync          # 手动触发同步
GET    /api/v1/dataki/queue         # 同步队列状态
```

---

## 十二点五、情报查询 API（客户端侧）

在对接小乔等消费端时，情报查询分 3 类：

### 4.1 信息流查询（推荐）

```
GET /api/v1/intelligence/feed
```

**查询参数**

| 参数 | 说明 |
|------|------|
| `since` | 时间窗口（`24h` / `7d` / ISO8601） |
| `eventType` | 多值（逗号分隔） |
| `priority` | 多值（`P0,P1`） |
| `sourceType` | 信源类型过滤（`media`/`community`/`official`/`social`/`forum`/`wechat_mp`，兼容 `wewe`） |
| `sourceId` | 信源 ID 过滤（逗号分隔） |
| `keyword` | 标题、事件类型、关键事实关键字过滤 |
| `profileId` | 可选：画像过滤 |
| `audienceTag` | 可选：受众标签 |
| `limit` | 返回条数 |


### 4.2 专题动态

```
GET /api/v1/intelligence/topics/:id/updates?since=7d
```

**说明**：返回专题事件与趋势信号，适合需要专题结构的场景；
若只做通用检索，可改用 `feed` 并带上 `eventType=<topicId>`。


### 4.3 今日日报

```
GET /api/v1/intelligence/briefs/daily?profileId=xxx
```

**说明**：仅返回 profile 的当日日报（`date` 不传默认当天）。

### 4.4 关键词实时拓展（种子 / 信源）

**用途**：当用户输入新关键词后，服务端可按该关键词实时尝试创建种子与信源。

```
POST /api/v1/intelligence/expansion/keyword
```

**字段说明**：
| 参数 | 说明 |
|------|------|
| `keyword` | 关键词（必填） |
| `scope` | `seed` / `source` / `all`，默认 `all` |
| `seedType` | 种子类型：`entity` / `event` / `topic` / `source` |
| `sourceType` | 信源类型：`media` / `community` / `official` / `social` / `wechat_mp`（兼容 `wewe`） |
| `createSeed` | 是否创建种子（默认 true） |
| `createSource` | 是否创建信源（默认 true） |
| `dryRun` | true 时仅预览，不落库 |

**参数约束**：
| 参数 | 枚举/取值 | 默认值 |
|------|-----------|--------|
| `scope` | `seed` / `source` / `all` | `all` |
| `seedType` | `entity` / `event` / `topic` / `source` | `event` |
| `sourceType` | `media` / `community` / `official` / `social` / `forum` / `wechat_mp` | `media` |
| `createSeed` | `true` / `false` | `true` |
| `createSource` | `true` / `false` | `true` |
| `dryRun` | `true` / `false` | `false` |

**路由对照**：
| 目标 | 路由 |
|------|------|
| 关键词实时拓展 | `POST /api/v1/intelligence/expansion/keyword` |

**返回建议**：`candidates`（候选）、`created`（已创建）、`skipped`（跳过原因）、`meta`（创建计数）。

**错误码（客户端侧）**：

| HTTP 状态 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | `INVALID_INPUT` | `keyword` 为空、非法字符、长度不足 |
| 500 | `CREATE_FAILED` | 信源/种子创建异常，需重试或切换 `dryRun` |

### 4.5 接口路由对照

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/v1/intelligence/feed` | 情报流检索 |
| GET | `/api/v1/intelligence/topics/:id/updates` | 专题动态 |
| GET | `/api/v1/intelligence/briefs/daily` | 当日日报 |
| POST | `/api/v1/intelligence/expansion/keyword` | 用户提交关键词后，实时拓展种子/信源 |

## 十二、路由注册

```typescript
// src/routes/index.ts
import { Router } from 'express';
import { sourcesRouter } from './sources';
import { seedsRouter } from './seeds';
import { evidenceRouter } from './evidence';
import { eventsRouter } from './events';
import { signalsRouter } from './signals';
import { trendsRouter } from './trends';
import { jobsRouter } from './jobs';
import { systemRouter } from './system';
import { coverageRouter } from './coverage';
import { datakiRouter } from './dataki';

const router = Router();

router.use('/sources', sourcesRouter);
router.use('/seeds', seedsRouter);
router.use('/evidence', evidenceRouter);
router.use('/events', eventsRouter);
router.use('/signals', signalsRouter);
router.use('/trends', trendsRouter);
router.use('/jobs', jobsRouter);
router.use('/system', systemRouter);
router.use('/coverage', coverageRouter);
router.use('/dataki', datakiRouter);

export { router as apiRouter };
```

---

## 十三、设计决策

| 决策 | 结论 | 理由 |
|------|------|------|
| API 版本 | /api/v1 | 预留版本迭代空间 |
| 分页方式 | page + pageSize | 简单直观 |
| 排序方式 | -field 表示降序 | 常见惯例 |
| 事件 vs 证据 | 分开 API | 不同层级，不同消费场景 |
| 信号 vs 事件 | 分开 API | 信号是面向用户的最终产出 |
| 手动操作 | 独立端点 | 和自动流程分开，方便追踪 |
| 漏采反馈 | POST 接口 | 接受人工输入，自动分析归因 |




