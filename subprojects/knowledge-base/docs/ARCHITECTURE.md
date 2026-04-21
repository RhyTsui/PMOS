# 知识库 v1.0 架构设计

- 版本：v1.0
- 日期：2026-04-14
- 状态：Draft

> 说明：本文件形成于总体服务架构确认之前。自 `2026-04-19` 起，本文件仅作为知识库子项目候选架构输入，不代表已完成主管级架构拍板；当前执行顺序以 `知识库项目执行工作流.md` 为准。

---

## 1. 系统概述

知识库 v1.0 是一个分层式知识管理与问答系统，核心架构如下：

```
┌─────────────────────────────────────────────────────────┐
│                    Chat 会话层                            │
│              (小闪平台集成 / Web 界面)                       │
├─────────────────────────────────────────────────────────┤
│                    应用层 (L4)                            │
│              问答对 / 场景方案 / 最佳实践                   │
├─────────────────────────────────────────────────────────┤
│                    语义层 (L3)                            │
│           术语表 / 概念关系 / 业务语义                      │
├─────────────────────────────────────────────────────────┤
│                  结构化层 (L2)                            │
│         知识点 / 规则 / 参数定义 / API 文档                  │
├─────────────────────────────────────────────────────────┤
│                  原始文档层 (L1)                          │
│      Markdown / DOCX / PDF / 媒体官方文档                   │
├─────────────────────────────────────────────────────────┤
│                  基础设施层                               │
│   ChromaDB 向量存储 / 文件系统 / Agent 注册表               │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 核心模块

### 2.1 知识库分层模块

**目录结构**：
```
knowledge-base/
└── data/
    ├── L1-raw/              # 原始文档层
    │   ├── media/           # 媒体文档
    │   │   ├── oceanengine/ # 巨量引擎
    │   │   ├── tencent/     # 腾讯广告
    │   │   └── kuaishou/    # 快手磁力引擎
    │   └── internal/        # 内部文档
    ├── L2-structured/       # 结构化层
    │   ├── api-specs/       # API 规范
    │   ├── rules/           # 规则库
    │   └── parameters/      # 参数定义
    ├── L3-semantic/         # 语义层
    │   ├── glossary/        # 术语表
    │   ├── concepts/        # 概念关系
    │   └── business-logic/  # 业务逻辑
    └── L4-application/      # 应用层
        ├── qa-pairs/        # 问答对
        ├── solutions/       # 场景方案
        └── best-practices/  # 最佳实践
```

**数据模型**：
```typescript
interface KnowledgeNode {
  id: string;
  layer: 'L1' | 'L2' | 'L3' | 'L4';
  title: string;
  content: string;
  tags: string[];
  source?: string;        // 来源文档 ID
  relations?: Relation[]; // 关联节点
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Relation {
  type: 'parent' | 'child' | 'related' | 'synonym';
  targetId: string;
}
```

### 2.2 Agent 注册模块

**注册表结构**：
```typescript
interface AgentRegistry {
  agentId: string;
  name: string;
  description: string;
  capabilities: string[];
  knowledgeScope: string[];  // 可访问的知识范围
  permissions: Permission[];
  registeredAt: Date;
  lastActiveAt: Date;
  status: 'active' | 'inactive' | 'suspended';
}

interface Permission {
  resource: string;  // 知识路径
  action: 'read' | 'write' | 'admin';
}
```

**API 接口**：
```
POST   /api/agents/register      # 注册 Agent
GET    /api/agents/:id           # 获取 Agent 信息
PUT    /api/agents/:id           # 更新 Agent
DELETE /api/agents/:id           # 注销 Agent
GET    /api/agents               # 列出所有 Agent
POST   /api/agents/:id/query     # Agent 查询知识
```

### 2.3 统一语义层模块

**术语表结构**：
```typescript
interface Term {
  id: string;
  name: string;
  definition: string;
  category: string;           // 分类：出价 / 定向 / 创意 / 数据
  synonyms: string[];         // 同义词
  relatedTerms: string[];     // 相关术语
  parentTerm?: string;        // 上位词
  childTerms?: string[];      // 下位词
  examples: string[];         // 使用示例
  source?: string;            // 来源
}
```

**示例数据**：
```json
{
  "id": "term-ocpm-001",
  "name": "oCPM",
  "definition": "优化千次展现出价（Optimized Cost Per Mille），按转化目标智能出价",
  "category": "出价",
  "synonyms": ["智能 oCPM", "自动 oCPM"],
  "relatedTerms": ["oCPC", "oCPA", "CPM"],
  "parentTerm": "智能出价",
  "childTerms": ["深转 oCPM", "浅转 oCPM"],
  "examples": ["设置 oCPM 出价，目标转化成本为 100 元"]
}
```

### 2.4 问答图谱模块

**图谱结构**：
```typescript
interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

interface Entity {
  id: string;
  name: string;
  type: '平台' | '产品' | '功能' | '指标' | '规则';
  properties: Record<string, any>;
}

interface GraphRelation {
  id: string;
  source: string;
  target: string;
  type: '支持' | '适用于' | '要求' | '包含' | '相关';
  properties?: Record<string, any>;
}
```

**问答流程**：
```
用户问题 → 实体识别 → 关系查询 → 路径推理 → 答案生成
    ↓           ↓           ↓           ↓           ↓
 NLP 处理    图谱匹配    图数据库    推理引擎    LLM 生成
```

### 2.5 Chat 会话模块

**会话状态**：
```typescript
interface ChatSession {
  sessionId: string;
  userId: string;
  messages: Message[];
  context: Context;
  createdAt: Date;
  lastActiveAt: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Citation[];  // 引用来源
  feedback?: 'up' | 'down';
}

interface Citation {
  nodeId: string;
  title: string;
  layer: string;
  confidence: number;
}
```

---

## 3. 技术栈

| 模块 | 技术选型 | 说明 |
|------|----------|------|
| 向量存储 | ChromaDB | 本地向量数据库 |
| 图谱存储 | Neo4j / Memgraph | 图数据库（可选） |
| 后端框架 | FastAPI | Python 异步 API |
| 前端框架 | React + TypeScript | Chat 界面 |
| LLM | Claude API / 本地模型 | 问答生成 |
| 文档解析 | python-docx, PyPDF2 | 文档导入 |
| 部署平台 | 小闪 | 目标上线平台 |

---

## 4. API 设计

### 4.1 知识查询 API

```
POST /api/knowledge/query
{
  "query": "巨量引擎 oCPM 出价策略",
  "layers": ["L2", "L3", "L4"],
  "limit": 10
}

Response:
{
  "results": [
    {
      "id": "node-001",
      "title": "oCPM 出价策略",
      "content": "...",
      "layer": "L2",
      "confidence": 0.95,
      "sources": ["doc-oceanengine-001"]
    }
  ],
  "suggestedQuestions": ["oCPM 和 oCPC 有什么区别？"]
}
```

### 4.2 Chat 会话 API

```
POST /api/chat
{
  "sessionId": "session-001",
  "message": "如何设置 oCPM 出价？",
  "context": {...}
}

Response:
{
  "message": "设置 oCPM 出价的步骤如下：...",
  "sources": [
    {"title": "巨量引擎 oCPM 指南", "url": "..."}
  ],
  "suggestedQuestions": ["oCPM 最低出价是多少？"]
}
```

### 4.3 Agent 注册 API

```
POST /api/agents/register
{
  "name": "广告优化 Agent",
  "capabilities": ["投放策略", "创意优化"],
  "knowledgeScope": ["媒体政策", "API 文档"]
}

Response:
{
  "agentId": "agent-001",
  "apiKey": "sk-xxx",
  "status": "active"
}
```

---

## 5. 数据流

```
用户输入
    ↓
Chat 界面
    ↓
问题解析 (NLP)
    ↓
实体识别 → 知识图谱查询
    ↓           ↓
向量检索 ← 语义层匹配
    ↓
结果融合 (L1-L4)
    ↓
答案生成 (LLM)
    ↓
引用标注
    ↓
返回用户
```

---

## 6. 部署架构

```
┌─────────────────────────────────────┐
│          小闪平台                     │
│  ┌─────────────────────────────┐    │
│  │      Chat Web 界面            │    │
│  └─────────────────────────────┘    │
└──────────────┬──────────────────────┘
               │ HTTP/WebSocket
               ↓
┌─────────────────────────────────────┐
│          知识库后端                   │
│  ┌─────────┐  ┌─────────┐          │
│  │ FastAPI │  │  LLM    │          │
│  │  Server │  │ Gateway │          │
│  └─────────┘  └─────────┘          │
│  ┌─────────┐  ┌─────────┐          │
│  │ChromaDB │  │  Neo4j  │          │
│  │ (向量)  │  │  (图谱) │          │
│  └─────────┘  └─────────┘          │
└─────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│          文件系统                     │
│  ┌─────────────────────────────┐    │
│  │   knowledge-base/data/      │    │
│  │   L1-raw / L2-structured /  │    │
│  │   L3-semantic / L4-app      │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## 7. 安全与权限

### 7.1 认证机制
- API Key 认证（Agent 访问）
- Session Token（用户 Chat）
- JWT（管理接口）

### 7.2 权限控制
- 基于角色的访问控制（RBAC）
- 知识范围隔离
- 操作审计日志

---

## 8. 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 查询响应时间 | < 2s | P95 |
| 向量检索延迟 | < 500ms | 10 万级向量 |
| 图谱查询延迟 | < 1s | 3 跳以内 |
| 并发用户数 | 100+ | 同时在线 |
| 知识更新延迟 | < 1min | 文档导入到可检索 |

---

## 9. 待确认事项

1. **小闪平台集成方式**：需要确认小闪的插件/应用接入规范
2. **图谱数据库选型**：Neo4j vs Memgraph vs 轻量级方案
3. **LLM 接入方式**：Claude API vs 本地模型
4. **文档自动采集**：是否需要自动爬取媒体文档

---

**下一步**：
- [ ] 确认小闪平台接入方式
- [ ] 完成 API 详细设计
- [ ] 开始核心模块开发
