# 小乔智投 (XiaoQiao Ad OS) 架构文档

> 本文是项目架构概览。详细规范以 `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` 为总纲，二级索引以 `docs/architecture/00_SPEC_INDEX.md` 为准。

## 1. 系统定位

小乔智投是广告支持与投放协同自动化工作台，不是通用聊天机器人，不是后台菜单搜索框。

系统采用 **Fat MCP / Fat Skill + Thin Chat Runtime** 架构：MCP / Skill 承载业务能力、步骤、状态和 workflow；Chat Runtime 只做轻编排、上下文治理和协议转换；UI 只消费标准 Result / Timeline / MessagePart，不反推业务事实。

## 2. 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| UI 体系 | Ant Design 6 + Ant Design X（会话/Chat 默认真源） |
| 样式 | Tailwind CSS 4 + CSS Variables |
| 图表 | Recharts + @ant-design/plots |
| 图标 | Lucide React |
| 运行时 | Node.js + tsx (开发) / tsup (生产构建) |
| 数据存储 | `.runtime/` 文件系统 + 配置驱动 |
| 历史遗留 | Python + FastAPI (`src/ad/`) — 仅原型保留，非主链路 |

## 3. 总体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户（广告优化师）                            │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ 自然语言 / 动作
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Presentation Layer                                                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ChatContainer│ │MessageBubble│ │InputArea (X) │  │ ResultPanel  │  │
│  └──────────┘  └───────────┘  └──────────────┘  └───────────────┘  │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │DataViz    │  │Tool Card  │  │Disclosure     │  │ MissingFields │  │
│  │Renderer   │  │           │  │Drawer         │  │ Card          │  │
│  └──────────┘  └───────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ 消费 MessagePart / Timeline / Result
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Disclosure Contract                                                 │
│  buildDisclosureView → MessageDisclosureView                        │
│  证据披露 / 执行步骤披露 / 质量检查披露 / 字段目录披露                  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Component Binding / Registry / Renderer                             │
│  regions[].componentBinding → ComponentRegistry → Renderer           │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Unified Semantic Contract                                           │
│  SemanticResultContract / ActionContract / EvidenceContract /        │
│  SourceContract / ComponentBinding                                   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Runtime Display Protocol                                            │
│  AgentProcessEvent / ProcessEventType / TimelineEvent                │
│  Streaming State / Trace Fail-Open Policy                            │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Result Assembly                                                     │
│  ResponseContract → MessagePart[] → 派生函数                         │
│  ResultStatus: success | empty | partial_success | missing_input |   │
│                blocked | failed | not_configured                      │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Orchestration Layer                                                 │
│  ┌────────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │Request Understanding│  │ Planner          │  │ Capability     │  │
│  │ intent-router       │  │ planner-orchestr.│  │ Discovery      │  │
│  │ intent-route-engine │  │ plan-contract-   │  │ capability-    │  │
│  │ entity-resolution   │  │   validator      │  │ orchestration  │  │
│  │ fact-need-reasoner  │  │ planner-shadow   │  │ execution-     │  │
│  │ info-source-arbitr. │  │                  │  │   policy       │  │
│  └────────────────────┘  └──────────────────┘  └────────────────┘  │
│  ┌────────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ Context Compiler    │  │ Skill Router     │  │ Slot Resolver  │  │
│  │ context-engine      │  │ skill-orchestr.  │  │ slot-resolver  │  │
│  │ conversation-ctx    │  │ skill-contract-  │  │                │  │
│  │                     │  │   store          │  │                │  │
│  └────────────────────┘  └──────────────────┘  └────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Execution Layer                                                     │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────────────────┐ │
│  │ MCP / Tool     │  │ Model Service │  │ Search / Retrieval     │ │
│  │ mcp-discovery  │  │ model-router  │  │ search-orchestrator    │ │
│  │ mcp-server-    │  │ model-        │  │ search-provider-       │ │
│  │   store        │  │   resilience  │  │   adapter              │ │
│  │ mcp-tool-      │  │ model-use-    │  │ public-web-runtime     │ │
│  │   output-adapt │  │   case-runtime│  │ weather-search-provider│ │
│  └────────────────┘  └───────────────┘  └────────────────────────┘ │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────────────────┐ │
│  │ Workflow       │  │ Report Query  │  │ Automation             │ │
│  │ workflow-engine│  │ report-query- │  │ automation-scheduler   │ │
│  │ workflow-task- │  │   orchestrator│  │ automation-execution-  │ │
│  │   store        │  │ report-agent  │  │   store                │ │
│  └────────────────┘  └───────────────┘  └────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Persistence & Observability                                         │
│  conversation-store / attachment-store / user-memory-store           │
│  trace / routing-trace / telemetry-contract                          │
│  evaluation-adapter / evaluation-runtime-runner                      │
│  contract-safety (后置安全检查)                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 4. 分层职责

| 层 | 职责 | 核心模块 |
|---|------|---------|
| **Presentation** | 渲染会话、消息、结果卡片、图表、工具卡 | `components/cognitive/`, `components/workspace/`, `renderers/` |
| **Disclosure** | 将运行过程、证据、依据转化为用户可理解的披露视图 | `contracts/disclosure/` |
| **Component Binding** | `regions[].componentBinding` → renderer 的唯一挂载 | `contracts/renderer/` |
| **Semantic Contract** | 最终业务结果的统一语义渲染协议 | `contracts/semantic/` |
| **Runtime Display** | AI / Agent / Tool / Workflow 执行过程展示协议 | `contracts/runtime/` |
| **Result Assembly** | 从 MCP/Skill/Workflow 返回派生 `ResponseContract` 和 `MessagePart[]` | `contracts/result-assembly/`, `lib/response-contract.ts` |
| **Orchestration** | 意图理解 → 计划仲裁 → 能力发现 → 执行策略 → 参数补齐 | `lib/intent-router.ts`, `lib/planner-orchestrator.ts`, `lib/capability-orchestration.ts` |
| **Execution** | MCP/Tool 调用、模型路由、搜索编排、工作流执行 | `lib/mcp-*`, `lib/model-*`, `lib/search-*`, `lib/workflow-*` |
| **Validation** | 契约校验、编码检查、UI 门禁 | `contracts/validation/`, `scripts/` |
| **Observability** | Trace、评测、审计 | `lib/trace.ts`, `lib/evaluation-*`, `contracts/observability/` |

## 5. 目录结构

```
ad/
├── CLAUDE.md                # 本文件 — 项目配置与架构概览
├── ARCHITECTURE.md          # 架构文档（本文件）
├── AGENTS.md                # 仓库级执行规则
├── MASTER_SPEC.md           # 系统主规格
├── NEXT_IMPLEMENTATION_PLAN.md  # 实施计划
├── README.md                # 项目说明
├── frontend/src/            # 前端项目根目录
│   └── src/
│       ├── app/             # Next.js App Router（页面 + API Routes）
│       ├── components/      # React 组件
│       ├── contracts/       # 契约类型真源（68 文件）
│       ├── lib/             # 运行时模块（120+ 文件）
│       ├── hooks/           # React Hooks
│       ├── types/           # 全局类型
│       ├── features/        # 功能模块
│       └── renderers/       # 渲染器
├── docs/
│   ├── architecture/        # 架构规范（119 文件）
│   ├── review/              # 评审与验收文档
│   ├── operations/          # 运维与门禁
│   └── memory/              # 项目记忆
├── src/ad/                  # Python 后端（历史遗留原型，非主链路）
├── automation/              # 自动化模块设计
├── schemas/                 # JSON Schema
├── scripts/                 # 共享脚本
└── .runtime/                # 运行时数据（会话、用户、配置）
```

## 6. API 路由

| 路由 | 职责 |
|------|------|
| `POST /api/chat` | Chat 主链路（SSE + 意图路由 + 能力编排 + 模型调用） |
| `/api/xiaoqiao/conversations` | 会话 CRUD + 消息 + 附件 |
| `/api/xiaoqiao/tasks` | 任务 CRUD + 结果 + 证据 |
| `/api/xiaoqiao/workspace` | 工作区数据 |
| `/api/xiaoqiao/automation-*` | 自动化执行 |
| `/api/xiaoqiao/admin/*` | 管理后台（prompts / switches / mcp / demand） |
| `/api/xiaoqiao/web-search` | 公开联网搜索 |
| `/api/xiaoqiao/report-session` | 问数会话 |
| `/api/xiaoqiao/skill-contracts` | Skill 契约管理 |

## 7. 不变量

1. 真实业务事实来自 MCP / Skill / workflow / 知识库 / 用户输入，不来自 UI 猜测
2. Chat Runtime 只做薄编排和协议转换，MCP / Skill 是厚能力层
3. Timeline 是可披露过程，不是模型私有思考
4. MessagePart 是展示协议，不是业务事实源
5. Result Protocol 是 UI 判断状态的唯一入口
6. 无权限、未配置、缺字段、空结果、失败必须区分
7. 未配置真实能力时，不展示为已完成
8. 数据卡和图表必须来自结构化数据
9. 所有新能力必须能映射到当前代码文件和协议字段
10. 不得新增平行总体系绕开 Enterprise AI Chat OS
