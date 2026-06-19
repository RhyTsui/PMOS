# 小乔智投 (XiaoQiao Ad OS) — CLAUDE 配置

## 项目定位
广告支持与投放协同自动化工作台。以前台单对话工作台为统一入口，采用 Enterprise AI Chat OS 分层架构，承接使用帮助、需求沟通、问题排查、广告联调四条核心业务流。

## 技术栈
- 前端框架：Next.js 16 (App Router) + React 19 + TypeScript 5
- UI 体系：Ant Design 6 + Ant Design X（会话/Chat 默认真源）
- 样式：Tailwind CSS 4 + CSS Variables
- 图表：Recharts + @ant-design/plots
- 图标：Lucide React
- 运行时：Node.js + tsx (开发) / tsup (生产构建)
- 数据存储：`.runtime/` 文件系统 + 配置驱动（无独立后端数据库）

## 开发规范
- 前端项目根目录：`frontend/src/`
- 启动命令：`pnpm dev`（执行 `tsx src/server.ts`）
- 端口：8002（监听 `0.0.0.0:8002`）
- 包管理器：pnpm 9+（强制，`preinstall` 脚本拦截其他包管理器）
- 构建：`pnpm build`（next build + tsup 编译 server.ts）
- 类型检查：`pnpm ts-check`
- UI 门禁：`pnpm validate:ad-ui`

## 架构概览

```
Enterprise AI Chat OS
├─ Request Understanding    — 意图理解、实体解析、信息源仲裁
├─ Planner                  — 候选计划生成与仲裁
├─ Capability Discovery     — 能力发现、执行策略、MCP 治理
├─ Execution                — MCP/Tool/API 调用、Skill 编排
├─ Result Assembly          — 统一结果契约派生
├─ Disclosure Contract      — 过程/证据/依据披露
├─ Component Binding        — region 到 renderer 的挂载
├─ Renderer                 — 前端自主渲染
├─ Visual System            — 字体、色彩、图标、间距 token
└─ Interaction System       — 会话、数据可视化、AI Runtime、AI Trust 体验域
```

核心原则：Fat MCP / Fat Skill + Thin Chat Runtime。Chat Runtime 只做薄编排和协议转换，MCP/Skill 是业务能力事实源。

## 核心目录结构

```
frontend/src/src/
├── app/                    # Next.js App Router 页面与 API Routes
│   ├── page.tsx            # 主工作台
│   ├── admin/              # 管理后台
│   ├── login/              # 登录页
│   └── api/
│       ├── chat/route.ts   # Chat 主链路（SSE + 意图路由 + 能力编排）
│       └── xiaoqiao/       # BFF API（21 个端点）
├── components/
│   ├── cognitive/          # 会话区核心组件（ChatContainer, MessageBubble, InputArea 等）
│   ├── admin/              # 管理后台 Tab 组件（8 个）
│   ├── agents/             # Agent 面板（AutoDebugWorkbench, MonitoringPanel）
│   ├── workspace/          # 工作区面板（ResultPanel, TaskSidebar, MemoryPanel 等）
│   ├── ui/                 # 基础 UI 组件
│   └── yokaui/             # 游卡 UI 组件
├── contracts/              # 前端契约类型真源（68 个文件）
│   ├── semantic/           # Unified Semantic Contract
│   ├── runtime/            # Runtime Display Protocol
│   ├── disclosure/         # Disclosure Contract
│   ├── renderer/           # Component Registry / Renderer
│   ├── validation/         # 契约校验器
│   ├── request-understanding/  # 请求理解契约
│   ├── planner/            # 计划契约
│   ├── retrieval/          # 检索层契约
│   ├── model-service/      # 模型服务契约
│   ├── automation/         # 自动化任务契约
│   ├── business-semantics/ # 业务语义契约
│   ├── capability/         # 能力发现契约
│   ├── mcp/                # MCP 工具适配
│   ├── observability/      # 可观测性契约
│   ├── presentation/       # 消息展示契约
│   ├── public-web/         # 公开联网契约
│   ├── result-assembly/    # 结果组装
│   ├── skills/             # Skill 契约（按业务域拆分）
│   └── examples/           # 示例
├── lib/                    # 运行时模块（120+ 文件）
├── hooks/                  # React Hooks
├── types/                  # 全局类型定义
├── features/               # 功能模块
└── renderers/              # 渲染器
```

## 关键真源入口

1. `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` — 总纲
2. `docs/architecture/00_SPEC_INDEX.md` — 二级规范索引
3. `MASTER_SPEC.md` — 当前实现阶段主规格
4. `NEXT_IMPLEMENTATION_PLAN.md` — 下一阶段实施计划
5. `AGENTS.md` — 仓库级执行规则
6. `frontend/src/src/contracts/` — 前端契约类型真源

## 核心业务流

1. **使用帮助** — 指标口径解释、系统路径导航、广告规则说明
2. **需求沟通** — 媒体回传接入、事件映射、结构化需求单
3. **问题排查** — 激活/付费/回传/归因异常、证据链收集、根因分析
4. **广告联调** — 联调准备项检查、半自动执行、状态机、人工接管、结果留痕

## 门禁命令

```bash
pnpm ts-check                           # 类型检查
pnpm validate:ad-ui                     # UI 门禁（migration gate + rule debt + ts-check + guardrail）
pnpm test:report-query                  # 问数链路自测
pnpm test:chat-runtime-regression       # Chat 运行时回归
pnpm check:encoding                     # 编码检查（防乱码）
```

## 注意事项

- 禁止在通用 Chat Core 中硬编码广告业务关键词路由；业务差异必须进入 capability manifest 或 route rules
- 页面文案必须使用产品语言，不得混入工程黑话（如 `子项目`、`聚合`、`contract`、`mock`）
- UI 不得退回传统 antd admin dashboard；会话区是 AI 驱动的工作台
- 字体、色彩、token 以 2026-05-27 设计系统文档为准，禁止新增硬编码色值
- Python 后端 (`src/ad/`) 为历史遗留原型，当前主链路全部在 Next.js API Routes

## 不变量（不得被局部需求覆盖）

1. 真实业务事实来自 MCP / Skill / workflow / 知识库 / 用户输入，不来自 UI 猜测
2. Chat Runtime 只做薄编排和协议转换，MCP / Skill 是厚能力层
3. Timeline 是可披露过程，不是模型私有思考
4. MessagePart 是展示协议，不是业务事实源
5. Result Protocol 是 UI 判断状态的唯一入口
6. 无权限、未配置、缺字段、空结果、失败必须区分
7. 未配置真实能力时，不展示为已完成
8. 数据卡和图表必须来自结构化数据
