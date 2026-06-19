# 小乔智投 (XiaoQiao Ad OS) - Project Documentation

## Project Overview
小乔智投是一套**广告支持与投放协同自动化工作台**。以前台单对话工作台为统一入口，以任务运行时为骨架，以现行广告能力封装为可调用能力层，承接使用帮助、需求沟通、问题排查、广告联调四条核心业务流。

### 产品定位 (业务视角补充)
- 当前阶段定位：**广告支持与投放协同自动化工作台**（不是泛化广告 AI 平台，不是自动投放系统）
- 核心判断：先实现支持侧自动化 → 先赋能投放团队 → 中长期逐步实现投放自动化
- 第一阶段聚焦：投放需求自动接入、标准联调自动化、异常排查自动化、对话式分析

### 自动化边界 (业务视角补充 §5)
- **可直接自动化**：需求收集、表单补齐、标准联调、日志归集、指标查询、常见诊断
- **适合人机协作**：异常根因判断、联调问题解释、分析结论确认、需求可行性判断
- **必须由人负责**：投放预算决策、重大活动排期、财务协调、商务策略、品牌合规

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + CSS Variables
- **UI 体系**: Ant Design 6 + Ant Design X（会话/Chat 默认真源）
- **Charts**: Recharts + @ant-design/plots
- **Icons**: Lucide React
- **LLM**: 通过 Model Service 层路由（model-router / model-use-case-runtime）
- **Runtime**: Node.js + tsx (dev) / tsup (prod)

## Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout + 字体加载
│   ├── page.tsx                # Main workspace (全屏对话 + 可折叠面板)
│   ├── admin/page.tsx          # Admin 管理页 (8 tabs: prompts/switches/mcp/demand/intent-route/entity-resolution/operation-logs/workflow)
│   ├── login/                  # 登录页（客户端动态加载登录 SDK）
│   ├── reports/                # 报表页
│   ├── security/               # 安全相关
│   ├── globals.css             # Global styles + XiaoQiao theme + CSS tokens
│   └── api/
│       ├── chat/route.ts       # POST /api/chat — Chat 主链路（SSE + Intent Router + Planner + 能力编排 + 模型调用）
│       └── xiaoqiao/           # BFF API routes (21 endpoints)
│           ├── conversations/          # 会话 CRUD + messages + attachments
│           ├── tasks/                  # 任务 CRUD + results + context + evidence
│           ├── workspace/              # 工作台视图
│           ├── automation-executions/  # 自动化执行
│           ├── automations/            # 自动化模板
│           ├── attachments/            # 附件管理
│           ├── chat-display-config/    # 会话展示配置
│           ├── memory/                 # 用户记忆
│           ├── notifications/          # 通知
│           ├── project-icon/           # 项目图标
│           ├── projects/               # 项目管理
│           ├── query-table/            # 数据查询
│           ├── recommendations/        # 推荐
│           ├── report-session/         # 问数会话
│           ├── runtime-version/        # 运行时版本
│           ├── scheduled-tasks/        # 定时任务
│           ├── skill-contracts/        # Skill 契约管理
│           ├── skills/                 # Skill 列表
│           └── web-search/             # 公开联网搜索
├── components/
│   ├── cognitive/              # 会话区核心组件
│   │   ├── ChatContainer.tsx          # 主对话区 + 欢迎页卡片
│   │   ├── Header.tsx                 # 顶部（logo + 标题 + admin 入口）
│   │   ├── InputArea.tsx              # Ant Design X 风格输入区
│   │   ├── MessageBubble.tsx          # 消息气泡（思维链折叠 + 工具调用标签）
│   │   ├── MessagePresentationRenderer.tsx  # MessagePart 渲染
│   │   ├── MessageDisclosureDrawer.tsx      # 披露抽屉
│   │   ├── DataVizRenderer.tsx              # 数据可视化渲染
│   │   ├── ContextSummaryBar.tsx            # 会话/任务上下文摘要
│   │   ├── MissingFieldsCard.tsx            # 缺字段卡片
│   │   ├── AttachmentBar.tsx                # 附件上传
│   │   ├── EvidenceCard.tsx                 # 证据卡片
│   │   ├── CallChainPanel.tsx               # 调用链面板
│   │   ├── CapabilityFollowUpCard.tsx       # 能力追问卡片
│   │   ├── AmbiguityConfirmCard.tsx         # 歧义确认卡片
│   │   ├── AssetPreview.tsx / Modal.tsx     # 资产预览
│   │   ├── ContextEditDrawer.tsx            # 上下文编辑
│   │   ├── ExportMenu.tsx                   # 导出菜单
│   │   ├── ToolBar.tsx                      # 工具栏
│   │   ├── AgentDock.tsx                    # Agent Dock
│   │   ├── ComposerMotionLab.tsx            # 输入区动效
│   │   ├── WelcomeMascotIcon.tsx            # 欢迎吉祥物
│   │   └── MessageErrorBoundary.tsx         # 消息错误边界
│   ├── admin/                  # 管理后台 Tab 组件
│   │   ├── IntentRouteRulesTab.tsx          # 意图路由规则
│   │   ├── OrchestrationGovernanceTab.tsx   # 编排治理
│   │   ├── EntityResolutionConfigTab.tsx    # 实体解析配置
│   │   ├── RoleProfileManagementTab.tsx     # 角色配置
│   │   ├── UserManagementTab.tsx            # 用户管理
│   │   ├── WorkflowManagementTab.tsx        # 工作流管理
│   │   ├── OperationLogsTab.tsx             # 操作日志
│   │   └── PublicWebConfigTab.tsx           # 公开联网配置
│   ├── agents/                 # Agent 面板
│   │   ├── AutoDebugWorkbench.tsx         # 自动联调工作台
│   │   └── MonitoringPanel.tsx            # 监控大屏
│   ├── workspace/              # 工作区面板
│   │   ├── ResultPanel.tsx                # 结构化结果区
│   │   ├── TaskSidebar.tsx                # 历史任务
│   │   ├── MemoryPanel.tsx                # 记忆面板
│   │   ├── ScheduledTaskPanel.tsx         # 定时任务
│   │   └── SkillManager.tsx               # Skill 管理
│   ├── ui/                     # 基础 UI 组件 (button/card/dialog/form/input/select/table/tabs...)
│   ├── login/                  # 登录页组件
│   └── yokaui/                 # 游卡 UI 组件
├── contracts/                  # ★ 前端契约类型真源（68 文件）
│   ├── semantic/               # Unified Semantic Contract (semantic-result / action / evidence / source)
│   ├── runtime/                # Runtime Display Protocol
│   ├── disclosure/             # Disclosure Contract + builders + validators
│   ├── renderer/               # Component Registry / Renderer / default-renderers
│   ├── validation/             # 契约校验器 (semantic-result / action / evidence / renderer-data / runtime-display / report-trend)
│   ├── request-understanding/  # 请求理解 (entity-resolution / fact-need / route-decision / user-requirement / info-source-arbitration)
│   ├── planner/                # Planner 计划契约
│   ├── retrieval/              # 检索层契约
│   ├── model-service/          # 模型服务 (llm-output / model-route / model-use-case-registry / prompt-variable)
│   ├── automation/             # 自动化 (agent-runtime-task / automation-task / mcp-workflow-status / operation-safety / task-artifact)
│   ├── business-semantics/     # 业务语义 (dataset-authority / dimension-catalog / metric-catalog)
│   ├── capability/             # 能力发现 (capability-gap / capability-manifest)
│   ├── mcp/                    # MCP 工具适配
│   ├── observability/          # 可观测性 (routing-trace / telemetry)
│   ├── presentation/           # 消息展示 (message-contract-field-bindings)
│   ├── public-web/             # 公开联网 (source-grounding)
│   ├── result-assembly/        # 结果组装 (semantic-result-assembly)
│   ├── skills/                 # Skill 契约（按业务域拆分，如 callback-attribution-diagnosis/）
│   └── examples/               # 示例
├── hooks/
│   ├── useAgent.tsx            # Agent context
│   └── useConversation.ts      # Conversation management with SSE streaming
├── lib/                        # ★ 运行时模块（120+ 文件）
│   ├── api.ts                  # Unified API client
│   ├── constants.ts            # Agent configs
│   │
│   │ # --- Orchestration Layer ---
│   ├── intent-router.ts        # 意图路由
│   ├── intent-route-engine.ts  # 路由引擎
│   ├── intent-route-rules.ts   # 路由规则
│   ├── intent-orch-enhancer.ts # 意图编排增强
│   ├── planner-orchestrator.ts # 计划编排器
│   ├── planner-contract-validator.ts  # 计划契约校验
│   ├── capability-orchestration.ts    # 能力编排
│   ├── skill-orchestration.ts         # Skill 编排
│   ├── context-engine.ts              # 上下文编译
│   ├── context-compiler.ts            # 上下文编译器
│   ├── slot-resolver.ts               # 参数补齐
│   ├── entity-resolution.ts           # 实体解析
│   ├── fact-need-reasoner.ts          # 事实需求推理
│   ├── information-source-arbitration.ts  # 信息源仲裁
│   ├── request-understanding.ts       # 请求理解
│   ├── request-understanding-merge.ts # 请求理解合并
│   │
│   │ # --- Execution Layer ---
│   ├── mcp-discovery.ts               # MCP 协议发现
│   ├── mcp-server-store.ts            # MCP 服务存储
│   ├── mcp-tool-output-adapter.ts     # MCP 工具输出适配
│   ├── model-router.ts                # 模型路由
│   ├── model-resilience.ts            # 模型容错 (breaker)
│   ├── model-use-case-runtime.ts      # 模型用例运行时
│   ├── search-orchestrator.ts         # 搜索编排
│   ├── search-provider-adapter.ts     # 搜索适配
│   ├── public-web-runtime.ts          # 公开联网运行时
│   ├── weather-search-provider.ts     # 天气搜索
│   ├── workflow-engine.ts             # 工作流引擎
│   ├── workflow-task-store.ts          # 工作流任务存储
│   ├── report-query-orchestrator.ts   # 问数编排
│   ├── report-agent.ts                # 问数 Agent
│   ├── callback-attribution-diagnosis-orchestration.ts  # 回传归因诊断
│   │
│   │ # --- Result & Presentation ---
│   ├── response-contract.ts           # 结果契约派生
│   ├── semantic-result-compaction.ts  # 语义结果压缩
│   ├── runtime-event-display.ts       # 运行时事件展示
│   ├── display-format.ts              # 展示格式
│   │
│   │ # --- Persistence & Config ---
│   ├── conversation-store.ts          # 会话持久化
│   ├── conversation-context.ts        # 会话上下文
│   ├── attachment-store.ts            # 附件存储
│   ├── user-memory-store.ts           # 用户记忆
│   ├── runtime-config.ts              # 运行时配置
│   ├── feature-switch-store.ts        # 功能开关
│   ├── prompt-store.ts                # 提示词存储
│   ├── managed-prompt-seeds.ts        # 提示词种子
│   ├── contract-safety.ts             # 契约安全检查
│   ├── trace.ts                       # Trace 追踪
│   └── ...                            # 其他 80+ 模块
├── features/                   # 功能模块
├── renderers/                  # 渲染器
└── types/
    └── index.ts                # TypeScript type definitions
```

## Core Business Flows (四条核心业务流)

1. **使用帮助 (Help)** - 指标口径解释、系统路径导航、广告规则说明、常见技术问题
2. **需求沟通 (Demand)** - 媒体回传接入、事件映射、埋点/归因/配置类需求、结构化需求单
3. **问题排查 (Diagnosis)** - 激活/付费/回传/归因/BI不一致、证据链收集、结论与建议
4. **广告联调 (Debugging)** - 联调准备项检查、执行状态与日志、联调结果报告
   - **自动联调专项** - 半自动执行(协同工作台+半自动执行)、状态机(10状态)、人工接管、结果留痕
   - 第一批范围：巨量/抖音 + Android + 扫码联调

## Special Pages (专项能力页)

5. **监控大屏 (Monitoring)** - 操作监控、上报监控、回推监控、归因监控
6. **素材分析 (Material)** - 创意脚本解析、相似度匹配、报表生成
7. **广告预测 (Prediction)** - ROI预测、LTV预测、回本测算

## Workspace Layout (全屏对话 + 可折叠面板)

- **主区域**: 全屏对话区 (消息流 + 思维链折叠 + 工具调用标签)
- **输入区**: 阿里X风格 (快捷标签 + 工具选择器 + Agent选择器 + 文本框)
- **欢迎页**: 快捷入口卡片 (6个双列卡片: 指标解释/排查问题/提交需求/联调支持/看监控/ROI预测)
- **右栏**: 结构化结果区 (可折叠, 帮助结果/需求单/排查报告/联调报告)
- **左栏**: 历史任务区 (可折叠, 任务列表 + 状态)

### 六层交互模型
1. **对话承接层** - 接住自然语言输入、发出追问、维持多轮上下文
2. **卡片组织层** - 展示任务摘要、缺失字段、附件摘要、步骤状态
3. **表单补录层** - 补录媒体、应用、设备、时间范围、需求字段
4. **抽屉编辑层** - 承接复杂对象编辑
5. **结果工作板层** - 把聊天输出沉淀为正式结果对象
6. **证据回显层** - 展示截图、日志、附件、引用来源

## Key Data Objects

| Object | Description |
|--------|-------------|
| `WorkspaceResponse` | 工作台状态 (会话数、任务数、当前模式、应用支撑摘要) |
| `Conversation` | 会话 (标题、类型、状态、current_mode: natural-chat/light-workflow/heavy-workflow) |
| `Message` | 消息 (含路由决策、意图类型、附件列表) |
| `RoutingDecision` | 路由判断 (is_business_related、意图、业务域、工作流层级、是否追问) |
| `Task` | 任务 (task_type、workflow_level、status、owner_type) |
| `TaskContext` | 任务上下文 (媒体、应用、缺失字段列表、附件) |
| `WorkflowResult` | 工作流结果 (result_type、structured_payload、confidence、next_action) |
| `HelpResult` | 帮助结果 (question_type、subject、definition_text、system_path、source_refs) |
| `DiagnosisResult` | 排查结果 (conclusion、evidence_ids、confidence、risk_level) |
| `DemandResult` | 需求结果 (demand_summary、fields、missing_fields、dependencies) |
| `DebuggingResult` | 联调结果 (current_stage、stages、logs、success) |
| `AttachmentRecord` | 附件记录 (kind、status、preview_url、source_type) |
| `AttachmentSummary` | 附件摘要 (summary、keywords、parse_status) |
| `EvidenceItem` | 证据项 (evidence_type、title、summary、confidence、source_attachment_id) |
| `CaseRecord` | Case 沉淀 (source_task_id、case_type、reusable_points) |
| `MissingField` | 缺失字段 (field_key、field_label、why_required、suggested_question) |
| `PromptConfig` | 提示词配置 (name、category、applicable_flows、current_version、status) |
| `PromptVersion` | 提示词版本 (version_number、content、variables、published_at) |
| `PromptBinding` | 提示词绑定 (bound_flows、bound_agents、bound_models、enabled) |
| `FeatureSwitch` | 功能开关 (switch_key、switch_type、enabled、config) |
| `DebugAutomationTask` | 自动联调任务 (media、debug_type、status、current_stage、requires_manual_confirm) |
| `DebugAutomationConfig` | 自动联调配置 (media、terminal、executor_type、vision_provider、keywords_json、timeouts_json) |
| `DebugExecutionStep` | 自动联调执行步骤 (stage、step_name、status、screenshot_url、log_summary) |
| `DebugExecutionResult` | 自动联调执行结果 (success、failure_code、evidence_json、manual_takeover_flag、final_report_markdown) |
| `DebugTaskInitForm` | 自动联调任务发起表单 (media、debug_type、account、app_name、device_id、environment、current_blocker) |

## API Resources (接口真源)

所有 BFF 路由均在 `app/api/xiaoqiao/` 下，前缀为 `/api/xiaoqiao/`。

### Chat 主链路
- `POST /api/chat` — Chat 主入口（SSE 流式 + Intent Router + Planner + 能力编排 + 模型调用 + MCP 工具）

### 会话与任务
- `/api/xiaoqiao/conversations` — 会话 CRUD + messages + attachments
- `/api/xiaoqiao/tasks` — 任务 CRUD + results + context + evidence
- `/api/xiaoqiao/workspace` — 工作台视图
- `/api/xiaoqiao/attachments` — 附件管理
- `/api/xiaoqiao/memory` — 用户记忆

### 自动化
- `/api/xiaoqiao/automations` — 自动化模板 CRUD
- `/api/xiaoqiao/automation-executions` — 自动化执行

### 问数与搜索
- `/api/xiaoqiao/report-session` — 问数会话
- `/api/xiaoqiao/query-table` — 数据查询
- `/api/xiaoqiao/web-search` — 公开联网搜索

### 配置与管理
- `/api/xiaoqiao/chat-display-config` — 会话展示配置
- `/api/xiaoqiao/skill-contracts` — Skill 契约管理
- `/api/xiaoqiao/skills` — Skill 列表
- `/api/xiaoqiao/scheduled-tasks` — 定时任务
- `/api/xiaoqiao/projects` — 项目管理
- `/api/xiaoqiao/project-icon` — 项目图标
- `/api/xiaoqiao/recommendations` — 推荐
- `/api/xiaoqiao/notifications` — 通知
- `/api/xiaoqiao/runtime-version` — 运行时版本

## Management Pages (管理页)

- **提示词管理 (3-column layout)**:
  - 左栏: 分类筛选导航 (按业务流/状态筛选)
  - 中栏: Prompt 列表 (名称/分类/版本/状态)
  - 右栏: 详情/编辑区 (正文/变量/版本历史/发布回滚)
- **功能开关**: 灰度/全量/按角色控制
- **自动联调配置 (3-column layout)**:
  - 左栏: 媒体/终端/环境/状态筛选
  - 中栏: 模板列表 (名称/媒体/终端/执行器类型/状态)
  - 右栏: 详情/编辑区 (关键词配置/超时配置/说明文案/启停开关)
- **集成状态**: MCP/Skill/Tool 绑定查看
- **集成状态**: MCP/Skill/Tool 绑定查看

## Design System

> 当前设计系统真源：`docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md`
> Visual System 规范：`docs/architecture/visual-system/`
> 色彩 token：`lib/zhitou-chat-colors.ts` + `globals.css` CSS 变量 + Ant Design token

色彩、字体、图标、间距、动效均通过上述真源管理，禁止新增硬编码色值。

## Mock Contract Strategy

- Chat 主链路 (`/api/chat`) 直接对接 LLM + MCP + Skill 能力层
- BFF 路由 (`/api/xiaoqiao/*`) 提供会话、任务、配置等管理接口
- 运行时配置通过 `lib/runtime-config.ts` 管理
- MCP 服务通过 `lib/mcp-server-store.ts` + `lib/mcp-discovery.ts` 动态发现和调用
- 模型路由通过 `lib/model-router.ts` + `lib/model-use-case-runtime.ts` 管理

## Development Commands

```bash
pnpm install              # 安装依赖
pnpm dev                  # 启动开发服务器 (port 8002)
pnpm lint                 # ESLint
pnpm ts-check             # TypeScript 类型检查
pnpm build                # 生产构建 (next build + tsup)
pnpm start                # 生产服务
pnpm validate:ad-ui       # UI 门禁（migration gate + rule debt + ts-check + guardrail）
pnpm test:report-query    # 问数链路自测
pnpm test:chat-runtime-regression  # Chat 运行时回归
pnpm check:encoding       # 编码检查（防乱码）
```

## Notes

- All times in milliseconds (ms) or seconds (s)
- Task statuses: created, clarifying, running, waiting, completed, archived, downgraded
- Task types: help, diagnosis, demand, debugging, monitor, material-analysis, forecast
- Workflow levels: light (帮助类), heavy (排查/联调/需求类)
- Evidence source_types: upload, knowledge, media-data, callback-log, client-log, report
- Attachment kinds: image, document, spreadsheet, log
- Attachment statuses: uploading, uploaded, parsing, parsed, upload_failed, parse_failed
