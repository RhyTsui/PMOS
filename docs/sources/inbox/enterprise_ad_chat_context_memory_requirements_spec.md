# 1.背景
企业广告 Chat 的核心能力不是“聊天”，而是：
# AI 对当前业务环境的理解能力
因此：

- Context（上下文）
- Memory（记忆）

将成为系统核心基础设施。

---
产品思路：
当前已经对接了dataki知识库，通过api和key可同步知识，记忆自动同步到知识库中，每个用户新建一个知识库，专门用于存放记忆。然后agent需要检索时调用知识库的rag能力。当记忆有错误知识时我们取最新的一条，或许可以做自动更新。  Dataki 负责长期业务记忆；Context Engine 负责实时上下文；Memory Sync Agent 负责把有价值的上下文沉淀成记忆。记忆进知识库，上下文进状态系统；上下文经过总结和确认后，才能变成记忆。

# 2. 产品目标

构建一套企业级：

# Context Engine（上下文引擎）

与：

# Memory System（记忆系统）

用于支持：

- 多轮连续对话
- 业务环境自动理解
- 当前页面自动感知
- 广告分析连续性
- 排查链路连续性
- MCP执行连续性
- 长周期业务记忆
- AI Native 操作体验

最终目标：

# 让 AI 真正理解广告业务环境

而不是仅做普通聊天。

---

# 3. 核心设计原则

# 3.1 Context ≠ Chat History

上下文不是聊天记录。

上下文是：

# AI 当前任务执行环境

包括：

- 当前业务环境
- 当前页面状态
- 当前筛选条件
- 当前任务状态
- 当前MCP结果
- 当前数据状态
- 当前用户权限
- 当前会话状态

---

# 3.2 Memory ≠ 无限聊天历史

记忆不是无限堆积对话。

记忆应为：

# 结构化业务记忆

包括：

- 用户业务偏好
- 项目长期背景
- 排查历史
- 联调状态
- 历史异常
- 特殊业务规则

---

# 3.3 当前业务状态优先

广告系统属于强实时业务。

因此：

# 当前状态 > 长期历史

系统应优先感知：

- 当前页面
- 当前项目
- 当前媒体
- 当前数据状态
- 当前异常

而不是长历史聊天。

---

# 4. Context Engine 设计

# 4.1 Context Engine 定义

Context Engine 负责：

- 自动收集上下文
- 动态组装上下文
- 上下文生命周期管理
- 上下文路由
- 上下文压缩
- Prompt Context 注入
- Context Trace

---

# 4.2 Context Engine 架构

```text
┌──────────────────────────────┐
│        Context Engine        │
├──────────────────────────────┤
│ Session Context              │
│ Page Context                 │
│ Business Context             │
│ Data Context                 │
│ Operation Context            │
│ Knowledge Context            │
│ Memory Context               │
│ Context Router               │
│ Context Compressor           │
│ Context Trace                │
└──────────────────────────────┘
```

---

# 5. Context 分层设计

# 5.1 Session Context（会话上下文）

用于支持：

- 多轮对话
- 指代消解
- 连续追问
- 当前任务连续性

## 数据内容

```json
{
  "conversation_id": "conv_001",
  "recent_messages": [],
  "current_intent": "roi_analysis",
  "mentioned_entities": [
    "TikTok",
    "JP",
    "Android"
  ]
}
```

## 支持能力

- “这个”指代解析
- “继续查”任务延续
- 当前问题上下文恢复

---

# 5.2 Page Context（页面上下文）

企业广告 Chat 最重要的上下文层。

用于自动感知：

- 当前页面
- 当前模块
- 当前筛选
- 当前选中对象
- 当前操作对象

## 示例

当前页面：

- ROI分析页

当前筛选：

- JP
- TikTok
- Android
- 最近7天

当前对象：

- Campaign_001

系统自动注入 Prompt。

---

## 数据结构

```json
{
  "page": "roi_dashboard",
  "module": "campaign_analysis",
  "filters": {
    "country": "JP",
    "media": "TikTok",
    "platform": "Android",
    "time_range": "7d"
  },
  "selected_campaign": "campaign_001"
}
```

---

# 5.3 Business Context（业务上下文）

广告业务核心上下文。

## 包括

- 项目
- 游戏
- 渠道
- 国家
- ROI口径
- 时区
- 币种
- 归因模型
- BI体系

---

## 示例

```json
{
  "project": "ZGame",
  "roi_type": "7d_roi",
  "timezone": "UTC+8",
  "currency": "USD",
  "attribution_model": "hybrid"
}
```

---

# 5.4 Data Context（数据上下文）

用于支持：

- AI分析
- AI洞察
- 趋势解释
- 异常发现

## 包括

- 当前查询结果
- 当前指标变化
- 当前趋势
- 当前异常

---

## 示例

```json
{
  "metrics": {
    "roi": -22,
    "cpi": 31,
    "install": -15
  },
  "anomaly_detected": true
}
```

---

# 5.5 Operation Context（操作上下文）

企业 AI Chat 的关键壁垒。

用于支持：

- 联调
- MCP调用
- Trace分析
- 配置排查
- 自动诊断

---

## 包括

- MCP执行状态
- API结果
- 回传日志
- Trace
- Kafka状态
- 调度状态

---

## 示例

```json
{
  "mcp_status": "running",
  "postback_status": "timeout",
  "trace_id": "trace_001",
  "kafka_delay": 120
}
```

---

# 5.6 Knowledge Context（知识上下文）

传统 RAG 层。

## 包括

- 指标定义
- 联调文档
- API文档
- FAQ
- SOP
- 配置规范

---

# 5.7 Memory Context（记忆上下文）

用于恢复：

- 历史任务
- 用户偏好
- 长期业务背景

Memory 不直接作为 Prompt 全量注入。

应通过：

# Memory Retrieval

动态召回。

---

# 6. Context Router

# 6.1 目标

根据当前意图：

动态决定：

- 需要哪些上下文
- 需要哪些MCP
- 需要哪些知识
- 需要哪些Memory

---

# 6.2 路由示例

| Intent | Required Context |
|---|---|
| 指标解释 | Knowledge + Business |
| ROI分析 | Data + Business + Page |
| 联调 | Operation + Trace + MCP |
| 异常排查 | Operation + Data + Task |
| 配置辅助 | Page + MCP + Knowledge |
| 自动诊断 | Trace + Logs + MCP |

---

# 7. Context Assembly（上下文组装）

# 7.1 目标

动态组装：

# 最小有效上下文

避免：

- Prompt爆炸
- Token浪费
- 历史污染
- 无关信息干扰

---

# 7.2 组装流程

```text
User Input
    ↓
Intent Recognition
    ↓
Context Router
    ↓
Page Context
Business Context
Data Context
Operation Context
Knowledge Retrieval
Memory Retrieval
    ↓
Context Merge
    ↓
Prompt Builder
    ↓
LLM
```

---

# 8. Context Lifecycle（上下文生命周期）

# 8.1 生命周期阶段

```text
Create
Update
Compress
Archive
Expire
Restore
```

---

# 8.2 长会话压缩

系统需要：

- 自动摘要
- 任务阶段压缩
- MCP结果结构化缓存
- 中间结果归档

避免：

- Token无限增长
- Prompt污染
- 模型变笨

---

# 9. Memory System

# 9.1 Memory System 定义

Memory System 用于：

持续沉淀企业业务经验。

目标：

- 减少重复输入
- 提升AI业务理解
- 支持跨天任务恢复
- 支持长期业务协同

---

# 10. Memory 分层设计

# 10.1 Session Memory

短期会话记忆。

生命周期：

- 当前会话
- 当前任务

---

## 包括

- 当前分析目标
- 当前排查状态
- 当前步骤
- 当前异常

---

# 10.2 Task Memory

用于跨会话任务恢复。

## 包括

- 排查进度
- 联调状态
- 已确认结果
- 未完成任务

---

## 示例

```json
{
  "task_id": "trace_001",
  "status": "running",
  "checked": [
    "sdk",
    "event_upload"
  ],
  "suspected": [
    "postback_delay"
  ]
}
```

---

# 10.3 Preference Memory

用于沉淀用户业务偏好。

## 包括

- 常用项目
- 常看国家
- 常用ROI口径
- 常分析维度
- 常用媒体

---

## 示例

```json
{
  "default_roi": "7d_roi",
  "favorite_country": ["JP"],
  "favorite_media": ["TikTok"]
}
```

---

# 10.4 Business Memory

企业 AI 核心壁垒。

## 包括

- 项目特殊规则
- 历史异常
- 特殊归因逻辑
- 渠道问题
- 已知限制

---

## 示例

```json
{
  "project": "ZGame",
  "known_issues": [
    "TikTok postback delay"
  ],
  "special_rules": [
    "exclude_brand_organic"
  ]
}
```

---

# 10.5 Organization Memory

组织级知识沉淀。

## 包括

- FAQ
- SOP
- 历史事故
- 排查案例
- 最佳实践

---

# 11. Memory Retrieval

Memory 不应：

- 全量注入Prompt
- 无限拼接聊天历史

应通过：

# Retrieval

动态召回。

---

# 11.1 Retrieval 维度

## 基于：

- 当前项目
- 当前意图
- 当前页面
- 当前媒体
- 当前任务
- 当前用户

动态召回相关记忆。

---

# 12. Context Trace（强烈建议实现）

# 12.1 目标

增强：

- 可观测性
- 可解释性
- 企业信任
- Debug能力

---

# 12.2 展示内容

## 当前 Prompt 来源

包括：

- 页面上下文
- MCP结果
- Memory
- Knowledge
- 会话历史

---

## 示例

```text
Prompt Sources:

- Page Context
- ROI Dashboard
- JP / TikTok / Android

- MCP
- campaign_report_mcp
- attribution_trace_mcp

- Memory
- default_roi = 7d_roi

- Knowledge
- roi_definition.md
```

---

# 13. 前端设计要求

# 13.1 Context 感知 UI

Chat UI 需要展示：

- 当前项目
- 当前页面
- 当前筛选
- 当前分析对象
- 当前任务状态

---

# 13.2 Task Continuation UI

支持：

- 继续分析
- 恢复排查
- 查看历史任务
- 查看历史Trace

---

# 13.3 Context Trace UI

支持查看：

- 当前上下文来源
- 当前MCP调用
- 当前知识命中
- 当前Memory命中

---

# 13.4 Suggested Components

建议使用：

- Ant Design X
- x-chat
- x-cards
- x-flow
- x-agent

---

# 14. 后端设计要求

# 14.1 Core Services

```text
context-service
memory-service
context-router
prompt-builder
trace-service
session-service
task-state-service
```

---

# 14.2 Storage

建议：

```text
Redis        -> Session Context
PostgreSQL   -> Task / Memory
Vector DB    -> Knowledge / Memory Retrieval
Object Store -> Trace / Logs
```

---

# 14.3 Cache Strategy

需要：

- MCP结果缓存
- Context缓存
- Prompt缓存
- Retrieval缓存

避免重复请求。

---

# 15. MCP Integration Requirements

Context Engine 需要支持：

- MCP自动路由
- MCP结果结构化
- MCP Trace
- MCP状态共享
- MCP结果缓存

---

# 16. Prompt Builder Requirements

Prompt Builder 负责：

- Context Merge
- Prompt Compression
- Dynamic Injection
- Role Prompt
- Tool Prompt
- MCP Prompt
- Memory Prompt

---

# 17. 非功能要求

# 17.1 性能

Context Assembly：

- < 300ms

Memory Retrieval：

- < 200ms

Prompt Build：

- < 100ms

---

# 17.2 可观测性

需要支持：

- Prompt Trace
- Context Trace
- MCP Trace
- Token Trace
- Retrieval Trace

---

# 17.3 安全性

需要支持：

- 用户权限隔离
- 项目隔离
- Context权限过滤
- MCP权限校验
- 敏感信息脱敏

---

# 18. 推荐技术栈

# Frontend

```text
React
Ant Design
Ant Design X
Zustand
React Query
```

---

# Backend

```text
FastAPI
LangGraph (optional)
Redis
PostgreSQL
Kafka
```

---

# AI Layer

```text
OpenAI Compatible Gateway
MCP Runtime
Prompt Builder
RAG Engine
Memory Retrieval
```

---

# 19. 最终产品目标

系统最终应实现：

# AI 真正理解企业广告业务环境

达到：

- 减少业务重复输入
- 提升分析准确率
- 提升排查效率
- 提升联调效率
- 提升业务自助率
- 提升AI可信度

最终形成：

# Enterprise Ad Intelligence Copilot

而不是普通聊天机器人。

注意：强调不要改变现有UI架构，如果有冲突请和我先确认。

