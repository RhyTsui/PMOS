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
- **Charts**: Recharts
- **Icons**: Lucide React
- **AI/Agent**: coze-coding-dev-sdk (LLM + Knowledge + Web Search)
- **LLM Model**: doubao-seed-1-8-251228 (Agent-optimized)

## Project Structure
```
src/
├── app/
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main workspace (full-screen chat + collapsible panels)
│   ├── admin/page.tsx     # Admin management page (5 tabs: prompts/switches/debug-config/demand/mcp)
│   ├── globals.css        # Global styles + XiaoQiao theme
│   └── api/
│       ├── chat/route.ts  # POST /api/chat - LLM streaming + knowledge + web search + MCP tools
│       └── xiaoqiao/      # BFF API routes (30 endpoints, demo mode returns mock data)
│           ├── workspace/route.ts
│           ├── conversations/             # CRUD + messages + attachments
│           ├── tasks/                      # CRUD + results + context + evidence
│           ├── admin/                      # prompts/switches/debug-config/demand-pool/mcp-servers
│           └── debug-automation/tasks/     # CRUD + start/pause/resume/takeover/steps/result
├── components/
│   ├── cognitive/         # Conversation Hub components
│   │   ├── ChatContainer.tsx     # Main chat area with welcome cards
│   │   ├── Header.tsx            # Minimal header (logo + title + admin link)
│   │   ├── InputArea.tsx         # X-style input: quick tags + tool/agent selectors + textarea
│   │   ├── MessageBubble.tsx     # Message with thinking fold + tool call tags
│   │   ├── ContextSummaryBar.tsx # Session/task context summary strip
│   │   ├── MissingFieldsCard.tsx # Missing fields card with fill-in entry
│   │   ├── AttachmentBar.tsx     # Attachment upload bar with status management
│   │   └── EvidenceCard.tsx      # Evidence item card with source references
│   ├── workspace/         # Workspace panel components
│   │   ├── ResultPanel.tsx       # Structured result area (4 result schemas + evidence)
│   │   └── TaskSidebar.tsx       # History task sidebar
│   ├── agents/            # Agent panel components
│   │   ├── AdAssistantPanel.tsx  # 使用帮助 (Help)
│   │   ├── DiagnosisPanel.tsx    # 问题排查 (Diagnosis)
│   │   ├── AnalysisPanel.tsx     # 对话式分析 (Analysis)
│   │   ├── IntegrationPanel.tsx  # 广告联调 (Integration)
│   │   ├── MonitoringPanel.tsx   # 监控大屏 (Monitoring)
│   │   ├── PostbackPanel.tsx     # 回传配置 (Postback)
│   │   └── PredictionPanel.tsx   # 广告预测 (Prediction)
│   └── ui/                # Custom UI components
│       ├── CodeBlock.tsx
│       ├── GlassPanel.tsx
│       ├── MetricCard.tsx
│       └── StatusBadge.tsx
├── hooks/
│   ├── useAgent.tsx       # Agent context (API-driven: workspace, tasks, results, evidence)
│   └── useConversation.ts # Conversation management with SSE streaming
├── lib/
│   ├── api.ts             # Unified API client (apiFetch + typed methods + demo/service mode)
│   ├── demo-data.ts       # Demo mock data + getter functions (used by BFF routes in demo mode)
│   └── constants.ts       # Agent configs (AGENT_MAP, AGENT_TOOLS, AGENT_ICONS)
└── types/
    └── index.ts           # TypeScript type definitions (matching real business objects)
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

### 第一阶段最小接口集
1. `POST /api/v1/xiaoqiao/conversations` - 创建会话
2. `POST /api/v1/xiaoqiao/conversations/{id}/messages` - 发送消息 (统一入口)
3. `GET /api/v1/xiaoqiao/tasks` - 获取任务列表
4. `GET /api/v1/xiaoqiao/tasks/{id}` - 获取单个任务
5. `GET /api/v1/xiaoqiao/tasks/{id}/results` - 获取任务结果
6. `GET /api/v1/xiaoqiao/workspace` - 获取工作台视图

### 会话支撑接口
7. `POST /api/v1/xiaoqiao/conversations/{id}/attachments` - 上传附件
8. `GET /api/v1/xiaoqiao/tasks/{id}/context` - 获取任务上下文
9. `PUT /api/v1/xiaoqiao/tasks/{id}/context` - 更新任务上下文
10. `GET /api/v1/xiaoqiao/tasks/{id}/evidence` - 获取证据链

### 管理接口
11. `GET /api/v1/xiaoqiao/admin/prompts` - 提示词列表
12. `GET /api/v1/xiaoqiao/admin/prompts/{id}` - 提示词详情
13. `POST /api/v1/xiaoqiao/admin/prompts` - 新建提示词
14. `PUT /api/v1/xiaoqiao/admin/prompts/{id}` - 编辑提示词
15. `GET /api/v1/xiaoqiao/admin/prompts/{id}/versions` - 版本历史
16. `PUT /api/v1/xiaoqiao/admin/prompts/{id}/binding` - 绑定配置
17. `GET /api/v1/xiaoqiao/admin/feature-switches` - 功能开关列表
18. `PUT /api/v1/xiaoqiao/admin/feature-switches/{key}` - 更新开关

### 自动联调专项接口 (自动联调实施方案 §6)
19. `POST /api/v1/xiaoqiao/debug-automation/tasks` - 创建自动联调任务
20. `POST /api/v1/xiaoqiao/debug-automation/tasks/{id}/start` - 启动执行
21. `POST /api/v1/xiaoqiao/debug-automation/tasks/{id}/pause` - 暂停执行
22. `POST /api/v1/xiaoqiao/debug-automation/tasks/{id}/resume` - 恢复执行
23. `POST /api/v1/xiaoqiao/debug-automation/tasks/{id}/takeover` - 人工接管
24. `GET /api/v1/xiaoqiao/debug-automation/tasks` - 任务列表
25. `GET /api/v1/xiaoqiao/debug-automation/tasks/{id}` - 任务详情
26. `GET /api/v1/xiaoqiao/debug-automation/tasks/{id}/steps` - 步骤列表
27. `GET /api/v1/xiaoqiao/debug-automation/tasks/{id}/result` - 执行结果
28. `GET /api/v1/xiaoqiao/admin/debug-automation/configs` - 配置列表
29. `POST /api/v1/xiaoqiao/admin/debug-automation/configs` - 新建配置
30. `PUT /api/v1/xiaoqiao/admin/debug-automation/configs/{id}` - 编辑配置

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

### Colors (Deep Space Theme)
- Primary: `#0A0E1A` (Deep Space)
- Accent: `#00D9FF` (Tech Cyan)
- Success: `#00FF88`
- Warning: `#FFB800`
- Danger: `#FF3366`

### Animations
- Breathing: 3s ease-in-out infinite
- Fade-in-up: 400ms ease-out

### Font Stack
- UI: Inter, PingFang SC, Microsoft YaHei, Noto Sans SC
- Data/Mono: JetBrains Mono

## Mock Contract Strategy

- Demo/Service mode switch via `XIAOQIAO_MODE` env var (default: `demo`)
- **Demo mode**: BFF routes return mock data from `lib/demo-data.ts` (fully functional demo)
- **Service mode**: BFF routes proxy to real backend API (`XIAOQIAO_API_BASE` env var)
- Frontend uses `lib/api.ts` typed client, which calls BFF routes via relative paths
- All 30 API endpoints are implemented as BFF routes in `app/api/xiaoqiao/`
- MCP server configs are loaded into chat route as dynamic tools
- Current stage defaults to demo; switch to service mode when backend is ready

## Development Commands

```bash
pnpm install    # Install dependencies
pnpm dev       # Start development server (port 5000)
pnpm lint      # Run ESLint
pnpm ts-check  # Run TypeScript type check
pnpm build     # Build for production
pnpm start     # Start production server
```

## Notes

- All times in milliseconds (ms) or seconds (s)
- Task statuses: created, clarifying, running, waiting, completed, archived, downgraded
- Task types: help, diagnosis, demand, debugging, monitor, material-analysis, forecast
- Workflow levels: light (帮助类), heavy (排查/联调/需求类)
- Evidence source_types: upload, knowledge, media-data, callback-log, client-log, report
- Attachment kinds: image, document, spreadsheet, log
- Attachment statuses: uploading, uploaded, parsing, parsed, upload_failed, parse_failed
