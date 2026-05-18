# PMOS v1.1 Studio Edition 需求文档

- 文档版本：v1.1 PRD
- 产品版本：PMOS v1.1 Studio Edition
- Runtime baseline：v0.8
- NPM package version：1.1.0
- 前端产品名：PMAIOS Studio
- 目标实施方：Codex CLI / 本地 CLI Agent
- 文档用途：作为一次性大版本升级的需求、设计、接口、实施与验收依据

---

## 1. 一句话定义

`PMOS v1.1 Studio Edition = 把当前 PMOS 从命令行驱动的本地 Agent Runtime，升级为一个可视化、可操作、可验证、可交付的 PMAIOS Studio 用户桌面。`

核心关系：

```text
用户
 ↓
PMAIOS Studio（用户桌面）
 ↓
PMOS Runtime（OS / 状态机 / 工作流 / 证据链）
 ↓
Codex CLI / Codex Client（代码执行器）
 ↓
本地代码 / Git / Preview / Test / Browser Verification
```

本版本必须明确：

```text
Codex 是执行器
PMOS 是 OS
PMAIOS Studio 是用户桌面
```

---

## 2. 背景与当前问题

### 2.1 当前已有基础

PMOS v1.0 已经具备：

1. 独立产品仓定位
2. 本地安装、构建、启动能力
3. 后端 Runtime 基础能力
4. workflow / scheduler / task ssot / proof-of-work / review / Hermes 治理
5. Dataki / WeKnora / Notion / GitHub / Figma / DingTalk 等连接器方向
6. Codex local state inspect / sync 能力
7. 文档真源与部署说明
8. `/workspace` React 前端入口

### 2.2 当前核心短板

当前短板不是“能力不存在”，而是：

1. 用户侧前台系统不完整
2. 很多操作仍依赖命令行或文档路径
3. 前端 `App.tsx` 过大，承载过多页面和状态
4. 用户无法通过一个清晰工作台看到：
   - 当前主线任务
   - 下一步安全动作
   - 哪个 workflow 卡住
   - 哪些证据已经准备好
   - Codex 状态是否 aligned
   - 代码任务是否完成、是否验证
5. Codex 目前偏“状态同步”，还没有形成受控的 coding execution gateway
6. “从需求到页面，再到代码执行和验收”的闭环尚未产品化

---

## 3. 版本目标

### 3.1 产品目标

PMOS v1.1 要完成以下转变：

```text
从：命令行 Runtime + 巨型 React 页面 + 文档真源
到：PMAIOS Studio + PMOS Runtime + Codex Execution Gateway + 证据验收闭环
```

### 3.2 用户目标

用户打开 PMAIOS Studio 后，应该能回答：

1. 当前 PMOS 在做什么？
2. 哪个项目需要我处理？
3. 哪个任务或 workflow 卡住了？
4. 下一步最安全动作是什么？
5. 我能不能直接发起一个页面 / coding 任务？
6. Codex 执行到了哪里？
7. 代码改了什么？
8. 有没有跑过 build / test / browser verification？
9. 证据链在哪里？
10. 是否可以 approve / rework / writeback？

### 3.3 工程目标

1. 将 `src/frontend/App.tsx` 模块化拆分
2. 新增 PMAIOS Studio 的路由、页面和主导航
3. 新增 Builder / Coding Console
4. 新增 CodexJob mock-first 状态机
5. 新增 PageSpec 数据模型
6. 新增 builder / codex 后端 route 与 service skeleton
7. 保留现有 v1.0 入口和 API，不破坏已有功能
8. 新增 v1.1 真源文档与验收标准

---

## 4. 非目标

本版本不做：

1. 不把 Codex CLI 暴露成普通用户必须直接操作的入口
2. 不强绑真实 Codex CLI 执行作为首版唯一实现
3. 不提交 secrets、token、真实私有路径、真实业务子项目主体
4. 不把业务子项目主体混进产品仓
5. 不重开 v2.0 / v3.0 叙事
6. 不一次性重写全部后端 Runtime
7. 不把 Studio 做成单纯聊天机器人
8. 不取消现有 `/workspace`、`/pmaios/wiki`、`/pmaios/graph`、`/api/health`
9. 不让前端继续堆成巨型单文件

---

## 5. 用户角色

### 5.1 Product Chief

关注：跨项目状态、主线任务、评审、证据链、版本进度。

核心动作：

1. 查看总控台
2. 确认下一步安全动作
3. 审核 proof-of-work
4. approve / rework
5. 查看多项目状态

### 5.2 Project PM

关注：需求拆解、页面设计、workflow 执行、交付状态。

核心动作：

1. 输入原始需求
2. 生成 PageSpec
3. 创建 workflow / CodexJob
4. 跟踪任务进度
5. 检查验收条件

### 5.3 Designer / UX

关注：页面结构、组件层级、体验目标、设计验证。

核心动作：

1. 查看页面结构
2. 调整 PageSpec
3. 查看 preview
4. 查看 browser verification
5. 提交设计 rework 意见

### 5.4 Developer

关注：Codex 任务、代码变更、diff、build/test、接口契约。

核心动作：

1. 查看 CodexJob
2. 查看执行日志
3. 查看 diff
4. 跑 verification
5. 提交或回滚变更

### 5.5 Operator / Admin

关注：系统状态、连接器、Codex local state、MCP、provider、环境变量。

核心动作：

1. 查看 connector 状态
2. 查看 Codex local diff
3. 同步 skills / plugins
4. 查看 runtime health
5. 验证 build / test / browser

---

## 6. 产品信息架构

PMAIOS Studio 包含 7 个一级功能区：

```text
PMAIOS Studio
├── 1. Command Center 总控台
├── 2. Product Inbox 需求入口
├── 3. AI Builder / Coding Console 构建台
├── 4. Workflow & DAG Center 工作流中心
├── 5. Evidence & Review Hub 证据与评审中心
├── 6. Knowledge & Connectors 知识与连接器
└── 7. Runtime Admin 系统运行管理
```

### 6.1 路由规划

必须新增或整理以下路由：

```text
/workspace
/workspace/command
/workspace/inbox
/workspace/builder
/workspace/workflow
/workspace/evidence
/workspace/knowledge
/workspace/runtime
```

兼容旧入口：

```text
/
/workspace
/pmaios/wiki
/pmaios/graph
/api/health
```

---

## 7. 页面需求

## 7.1 Command Center 总控台

### 7.1.1 页面目标

用户进入 Studio 后，第一眼看到 PMOS 当前状态和下一步动作。

必须回答：

1. 当前选择的是哪个项目？
2. 当前主线任务是什么？
3. 当前 workflow 是否在跑？
4. 是否有阻塞？
5. 下一步安全动作是什么？
6. 证据链是否 ready？
7. Codex 状态是否 aligned？
8. 外部连接器是否正常？

### 7.1.2 页面模块

```text
- ProjectScopeSelector
- RoleModeSwitcher
- SystemHealthCard
- ActiveMainlineCard
- CurrentAttentionPanel
- SchedulerSummaryPanel
- ProofSummaryCard
- ConnectorStatusStrip
- CodexLocalStateSummaryCard
- RecentExecutionTimeline
- NextSafeActionBar
```

### 7.1.3 数据来源

```text
GET /api/health
GET /api/subprojects
GET /api/task-ssot/state
GET /api/scheduler/runs
GET /api/proof-of-work/bundle
GET /api/mcp-context/state
GET /api/external-connectors/status
GET /api/codex/local-state 或现有 codex state inspect endpoint
```

### 7.1.4 交互要求

1. 支持项目切换
2. 支持进入当前主线任务详情
3. 支持触发 refresh proof
4. 支持跳转到 Builder / Workflow / Evidence
5. 对 blocker 显示原因和 next safe step

---

## 7.2 Product Inbox 需求入口

### 7.2.1 页面目标

把 `docs/sources/inbox` 和原始输入规则产品化，作为统一需求入口。

流程：

```text
原始输入
 → 需求澄清
 → 需求归一化
 → Requirement
 → Function
 → API
 → Task
 → Workflow / Builder
```

### 7.2.2 页面模块

```text
- RawDemandComposer
- SourceSelector
- RequirementExtractionPreview
- RequirementTable
- RequirementDetailDrawer
- FunctionBreakdownPanel
- AcceptanceCriteriaEditor
- CreateWorkflowButton
- SendToBuilderButton
```

### 7.2.3 输入来源

```text
manual
notion
dingtalk
github
figma
file
web-fetch
```

### 7.2.4 数据模型

```ts
type IntakeDraft = {
  id: string;
  sourceType: 'manual' | 'notion' | 'dingtalk' | 'github' | 'figma' | 'file' | 'web-fetch';
  rawContent: string;
  normalizedTitle: string;
  targetUsers: string[];
  scenarios: string[];
  painPoints: string[];
  acceptanceCriteria: string[];
  linkedSubprojectId: string | null;
  status: 'draft' | 'normalized' | 'converted' | 'archived';
  createdAt: string;
  updatedAt: string;
};
```

### 7.2.5 v1.1 范围

v1.1 首版允许 mock / local state：

1. 能创建 draft
2. 能展示 normalized preview
3. 能写入 Requirement 或构造 Requirement payload
4. 能跳转 Builder
5. 不要求所有外部来源真实接线完成

---

## 7.3 AI Builder / Coding Console 构建台

### 7.3.1 页面目标

这是 v1.1 的核心页面。

目标是完成：

```text
页面需求
 → PageSpec
 → CodexJob
 → 执行日志
 → diff
 → preview
 → browser verification
 → proof-of-work
 → approve / rework / writeback
```

### 7.3.2 页面布局

```text
左侧：页面树 / 功能树 / PageSpec 列表
中间：PageSpec 编辑与页面预览
右侧：Codex 执行器 / diff / verification / proof
底部：事件流 / 日志
```

### 7.3.3 页面模块

```text
- PageSpecComposer
- PageTreePanel
- ComponentTreePanel
- ApiContractPanel
- CodexTaskBuilder
- CodexExecutionConsole
- DiffViewer
- PreviewFrame
- BrowserVerificationPanel
- AcceptOrReworkBar
- BuilderEventTimeline
```

### 7.3.4 PageSpec 数据模型

```ts
type PageSpec = {
  id: string;
  title: string;
  route: string;
  subprojectId: string | null;
  userGoal: string;
  pageType: 'dashboard' | 'form' | 'detail' | 'workflow' | 'review' | 'admin';
  layout: {
    regions: Array<{
      id: string;
      name: string;
      purpose: string;
      components: string[];
    }>;
  };
  dataRequirements: Array<{
    name: string;
    source: 'existing-api' | 'new-api' | 'mock';
    endpoint?: string;
    fields: string[];
  }>;
  acceptanceCriteria: string[];
  codingInstructions: string[];
  createdAt: string;
  updatedAt: string;
};
```

### 7.3.5 CodexJob 数据模型

```ts
type CodexJob = {
  id: string;
  title: string;
  subprojectId: string | null;
  pageSpecId?: string;
  requirementIds: string[];
  mode: 'plan-only' | 'edit' | 'full-auto';
  approvalPolicy: 'manual' | 'auto-edit' | 'full-auto-sandbox';
  workingDirectory: string;
  branchName: string;
  status:
    | 'draft'
    | 'queued'
    | 'running'
    | 'awaiting-approval'
    | 'completed'
    | 'failed'
    | 'cancelled';
  prompt: string;
  expectedFiles: string[];
  commands: string[];
  diffSummary?: string;
  previewUrl?: string;
  proofOfWorkBundleId?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 7.3.6 CodexJobEvent 数据模型

```ts
type CodexJobEvent = {
  id: string;
  jobId: string;
  kind:
    | 'created'
    | 'queued'
    | 'started'
    | 'log'
    | 'diff_captured'
    | 'preview_ready'
    | 'verification_started'
    | 'verification_completed'
    | 'awaiting_approval'
    | 'approved'
    | 'rework_requested'
    | 'writeback_completed'
    | 'failed'
    | 'cancelled';
  status: 'ok' | 'warning' | 'error';
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
```

### 7.3.7 v1.1 实施原则：mock-first

第一阶段必须先实现 mock-first CodexJob 状态机：

```text
create job
 → queued
 → running
 → awaiting-approval
 → completed / failed / cancelled
```

先做到：

1. 能创建 PageSpec
2. 能创建 CodexJob
3. 能展示日志
4. 能展示 mock diff
5. 能展示 preview 占位
6. 能展示 browser verification 占位或接入已有 verification report
7. 能 approve / cancel / request rework

第二阶段再接真实 Codex CLI 执行。

### 7.3.8 真实 Codex 执行边界

当接入真实 Codex CLI 时，必须满足：

1. 必须指定 working directory
2. 必须记录 job prompt
3. 必须记录 stdout / stderr
4. 必须捕获 git diff
5. 必须支持人工 approval
6. 必须支持 cancel
7. 必须跑 build / test / browser verification
8. 必须生成 proof-of-work 引用
9. 不允许在未确认目录中执行危险命令
10. 不允许把 secrets 写入日志或文档

---

## 7.4 Workflow & DAG Center 工作流中心

### 7.4.1 页面目标

把 PMOS workflow、scheduler、DAG、gate、rework 产品化展示。

### 7.4.2 页面模块

```text
- WorkflowCenterPage
- DagCanvas
- RunTimeline
- StageDetailDrawer
- SchedulerRunPanel
- GateHistoryPanel
- ManualGateModal
- HermesLoopPanel
- ReworkDecisionPanel
```

### 7.4.3 必须支持

1. 查看 workflow run 列表
2. 查看当前 run 状态
3. 查看阶段状态
4. 查看 DAG 依赖
5. 查看 scheduler 当前模式
6. 查看 blocked reason
7. 查看 gate history
8. 支持 resume current stage
9. 支持 resume rework stage
10. 支持 manual approve / send to rework

---

## 7.5 Evidence & Review Hub 证据与评审中心

### 7.5.1 页面目标

把“是否完成”从主观回答变成证据链判断。

必须回答：

1. final state 是否 ready？
2. proof-of-work 是否完整？
3. browser verification 是否通过？
4. review committee 是否通过？
5. Hermes 是否要求 revise / block / promote？
6. missing evidence 是什么？
7. 用户原始需求是否回查？

### 7.5.2 页面模块

```text
- EvidenceHubPage
- ProofOfWorkViewer
- FinalStateValidationPanel
- BrowserVerificationReport
- ReviewCommitteePanel
- HermesPolicyPanel
- AcceptancePackagePanel
- MissingEvidenceList
- ApprovalDecisionBar
```

### 7.5.3 必须支持

1. 查看 proof-of-work bundle
2. 查看 final state validation
3. 查看 browser verification result
4. 查看 gate summary
5. 查看 review summary
6. 查看 acceptance package
7. approve / conditional / reject
8. send to rework

---

## 7.6 Knowledge & Connectors 知识与连接器

### 7.6.1 页面目标

把外部知识源、真源文档、retrieval governance、Dataki / WeKnora 状态统一展示。

### 7.6.2 页面模块

```text
- KnowledgeCenterPage
- ConnectorStatusCards
- DatakiKnowledgeBaseList
- KnowledgeSearchPanel
- RetrievalGatePanel
- TruthSourceIndexPanel
- CloudMirrorStatusPanel
- ExternalImportPanel
```

### 7.6.3 必须支持

1. 查看 Notion / Figma / DingTalk / Dataki / WebFetch 状态
2. 查看 Dataki 知识库摘要
3. 执行知识检索测试
4. 查看 retrieval gate
5. 查看 truth source refs
6. 查看 cloud mirror latest-state 状态

---

## 7.7 Runtime Admin 系统运行管理

### 7.7.1 页面目标

给技术用户和维护者查看 PMOS Runtime 与 Codex / MCP / Provider / Skills 状态。

### 7.7.2 页面模块

```text
- RuntimeAdminPage
- ProviderRoutingPanel
- McpRegistryPanel
- CodexStateDiffPanel
- SkillRegistryPanel
- PluginRegistryPanel
- EnvironmentCheckPanel
- BuildVerificationPanel
- VersionAlignmentPanel
```

### 7.7.3 Codex State UI 必须展示

1. codexHome
2. configPath
3. skillsPath
4. pluginsPath
5. configExists
6. localSkills
7. runtimeVisibleSkills
8. governedRuntimeCapabilities
9. governedPlugins
10. enabledPluginIds
11. pmaiosExternalSkills
12. pmaiosReadiness
13. diff：
    - localOnlySkills
    - pmaiosOnlyExternalSkills
    - localVisibleAndRegisteredSkills
    - runtimeVisibleOnlySkills
    - enabledPluginsNotTrackedByPmaios

### 7.7.4 推荐同步动作

在 UI 中明确显示：

```bash
npm run cli -- codex-state sync
```

---

## 8. 前端工程需求

### 8.1 当前问题

`src/frontend/App.tsx` 当前过大，承担过多职责。

### 8.2 目标结构

必须重构为：

```text
src/frontend/
  app/
    AppShell.tsx
    routes.tsx
    apiClient.ts
    queryClient.ts
    navigation.ts
    workspaceStore.ts

  features/
    command-center/
      CommandCenterPage.tsx
      components/
      hooks.ts
      types.ts

    intake/
      ProductInboxPage.tsx
      components/
      hooks.ts
      types.ts

    builder/
      BuilderPage.tsx
      components/
      hooks.ts
      types.ts

    workflow/
      WorkflowCenterPage.tsx
      components/
      hooks.ts
      types.ts

    evidence/
      EvidenceHubPage.tsx
      components/
      hooks.ts
      types.ts

    knowledge/
      KnowledgeCenterPage.tsx
      components/
      hooks.ts
      types.ts

    runtime-admin/
      RuntimeAdminPage.tsx
      components/
      hooks.ts
      types.ts

  components/
    layout/
    cards/
    status/
    timeline/
    inspector/
    diff/
    empty-state/

  shared/
    formatters.ts
    statusTone.ts
    constants.ts
```

### 8.3 App.tsx 要求

`App.tsx` 最终只负责：

1. 全局 provider
2. route 挂载
3. shell 入口
4. error boundary

验收要求：

```text
App.tsx < 300 行
```

### 8.4 API 调用要求

1. 禁止在多个页面散落重复 `fetchJson`
2. 统一放到 `src/frontend/app/apiClient.ts`
3. feature 内可有 hooks，但底层必须复用统一 client
4. 错误状态必须有 UI 展示
5. loading / empty / error 三态必须完整

---

## 9. 后端工程需求

### 9.1 新增路由文件

```text
src/backend/routes/builderRoutes.ts
src/backend/routes/codexRoutes.ts
src/backend/routes/studioRoutes.ts
```

### 9.2 新增服务文件

```text
src/backend/services/builderPageSpecService.ts
src/backend/services/codexExecutionService.ts
src/backend/services/previewService.ts
src/backend/services/studioOverviewService.ts
```

### 9.3 Builder API

```text
POST /api/builder/page-specs
GET  /api/builder/page-specs
GET  /api/builder/page-specs/:id
POST /api/builder/page-specs/:id/refine
POST /api/builder/page-specs/:id/create-codex-job
```

### 9.4 Codex API

```text
POST /api/codex/jobs
GET  /api/codex/jobs
GET  /api/codex/jobs/:id
GET  /api/codex/jobs/:id/events
GET  /api/codex/jobs/:id/logs
GET  /api/codex/jobs/:id/diff
POST /api/codex/jobs/:id/approve
POST /api/codex/jobs/:id/cancel
POST /api/codex/jobs/:id/run-verification
POST /api/codex/jobs/:id/writeback
```

### 9.5 Studio Overview API

建议新增：

```text
GET /api/studio/overview
```

返回 Command Center 所需聚合信息。

```ts
type StudioOverview = {
  generatedAt: string;
  health: {
    ok: boolean;
    service: string;
  };
  selectedSubprojectId: string | null;
  taskSsotSummary: {
    total: number;
    active: number;
    blocked: number;
    completed: number;
    activeMainlineTaskId: string | null;
    activeMainlineLabel: string | null;
  };
  schedulerSummary: {
    total: number;
    running: number;
    paused: number;
    blocked: number;
    completed: number;
  };
  proofSummary: {
    status: 'ready' | 'rework' | 'blocked' | 'unknown';
    summary: string;
  } | null;
  connectorSummary: {
    notionConfigured: boolean;
    figmaConfigured: boolean;
    datakiConfigured: boolean;
    dingtalkConfigured: boolean;
  };
  codexSummary: {
    configExists: boolean;
    localSkillCount: number;
    enabledPluginCount: number;
    driftDetected: boolean;
  } | null;
};
```

---

## 10. 数据持久化建议

v1.1 可以先使用 FileStore 落地。

建议路径：

```text
docs/operations/studio/
  page-specs.json
  codex-jobs.json
  codex-job-events.json
  studio-overview-cache.json
```

或在 runtime state 下建立：

```text
runtime/studio/
  page-specs.json
  codex-jobs.json
  codex-job-events.json
```

原则：

1. 不写 secrets
2. 不写本地私有绝对路径到公开 docs，除非明确脱敏
3. job logs 可放 runtime，不一定放 docs
4. 真源文档只写产品级状态和验收结论

---

## 11. Codex Execution Boundary

### 11.1 边界定义

Codex 是 PMOS 的代码执行器，不是 PMOS 的用户界面。

```text
PMAIOS Studio：发起、观察、审批、验收
PMOS Runtime：建模、调度、治理、证据链
Codex CLI：读取代码、修改代码、运行命令、产出 diff
```

### 11.2 安全要求

真实 Codex 执行前必须校验：

1. workingDirectory 在允许目录内
2. branchName 合法
3. commands 属于允许列表或需要人工确认
4. prompt 不包含 secrets
5. 日志脱敏
6. diff 可查看
7. approvalPolicy 清晰
8. full-auto 只允许 sandbox 或明确授权

### 11.3 执行状态机

```text
draft
 → queued
 → running
 → awaiting-approval
 → completed
```

异常分支：

```text
running → failed
running → cancelled
awaiting-approval → rework_requested
awaiting-approval → cancelled
```

---

## 12. 文档需求

必须新增：

```text
docs/operations/pmaios-v1.1-studio-direction.md
docs/operations/v1.1-acceptance-standard.md
docs/operations/codex-execution-boundary.md
docs/operations/frontend-modularization-standard.md
docs/operations/v1.1-upgrade-plan.md
```

必须更新：

```text
README.md
CHANGELOG.md
package.json
docs/operations/current-version-progress.md
docs/deployment/api-overview.md
docs/deployment/first-run.md
```

---

## 13. 实施里程碑

## M0：版本与真源统一

### 任务

1. `package.json` version 改为 `1.1.0`
2. 新增 v1.1 Studio 文档
3. 更新 README / CHANGELOG / current-version-progress
4. 明确 v1.1 与 v1.0 的关系

### 验收

1. 文档口径一致
2. 不出现 v2.0 / v3.0 叙事
3. 明确 PMAIOS Studio、PMOS Runtime、Codex Execution Gateway 三层关系

---

## M1：前端模块化骨架

### 任务

1. 新增 `src/frontend/app`
2. 新增 `src/frontend/features/*`
3. 新增 `AppShell`
4. 新增 routes
5. 迁移或包裹现有 `/workspace`
6. 将 `App.tsx` 降到 300 行以内

### 验收

1. `/workspace` 可打开
2. 新路由可访问
3. 旧入口不破坏
4. lint/build 通过

---

## M2：Command Center

### 任务

1. 建立 CommandCenterPage
2. 接入 health / task ssot / scheduler / proof / connector / codex state
3. 实现 CurrentAttentionPanel
4. 实现 NextSafeActionBar

### 验收

1. 用户能看到当前主线任务
2. 用户能看到 blocker 和 next safe step
3. 用户能看到 Codex drift 状态
4. 用户能跳转到 Builder / Workflow / Evidence

---

## M3：Builder / Coding Console mock-first

### 任务

1. 新增 PageSpec schema
2. 新增 CodexJob schema
3. 新增 builderRoutes
4. 新增 codexRoutes
5. 新增 mock CodexExecutionService
6. 前端 BuilderPage 支持 PageSpec 和 CodexJob

### 验收

1. 能创建 PageSpec
2. 能创建 CodexJob
3. CodexJob 有状态变化
4. UI 能展示 logs / diff / preview / verification 区域
5. 能 approve / cancel / rework

---

## M4：Workflow / Evidence / Knowledge 页面整理

### 任务

1. 将现有 workflow 能力迁移到 WorkflowCenterPage
2. 将 proof/review 能力迁移到 EvidenceHubPage
3. 将 connector/retrieval/dataki 能力迁移到 KnowledgeCenterPage

### 验收

1. 页面职责清晰
2. 数据来源清晰
3. 不继续塞入 App.tsx
4. 旧功能不退化

---

## M5：Runtime Admin

### 任务

1. 新增 RuntimeAdminPage
2. 展示 Codex local state diff
3. 展示 provider / mcp / skill / plugin 状态
4. 展示推荐同步命令
5. 展示版本对齐状态

### 验收

1. 能看到 localOnlySkills
2. 能看到 pmaiosOnlyExternalSkills
3. 能看到 enabled plugins
4. 能看到 drift detected / aligned
5. 能看到 `npm run cli -- codex-state sync`

---

## M6：真实 Codex 执行预留

### 任务

1. CodexExecutionService 中预留 real executor interface
2. mock executor 与 real executor 分离
3. 支持环境变量开关
4. 支持 command allowlist
5. 支持日志脱敏

### 验收

1. 默认 mock-first
2. 不配置真实 Codex 时系统仍能运行
3. 打开真实执行需要显式配置
4. 不破坏 build/test

---

## M7：最终验收

必须通过：

```bash
npm run lint
npm run build
npm run test
npm run verify:frontend-browser
npm start
```

必须验证：

```text
GET /api/health -> 200
GET /workspace -> 200
GET /workspace/command -> 可访问
GET /workspace/builder -> 可访问
GET /api/studio/overview -> 可响应
GET /api/builder/page-specs -> 可响应
GET /api/codex/jobs -> 可响应
```

---

## 14. v1.1 总体验收标准

v1.1 完成后必须满足：

1. `/workspace` 打开的是 PMAIOS Studio，而不是无结构堆叠页面
2. `App.tsx < 300 行`
3. 至少 7 个主功能区可路由访问
4. Command Center 能显示当前主线任务、proof、scheduler、connector、Codex 状态
5. Product Inbox 能创建结构化需求草稿或至少有完整入口骨架
6. Builder 能从页面需求生成 PageSpec
7. Builder 能创建 CodexJob
8. CodexJob 至少支持 mock / dry-run 状态机
9. CodexJob 能展示日志、diff、preview、verification 区域
10. Proof-of-Work 能关联到 Builder / Workflow 输出
11. Runtime Admin 能展示 Codex local state diff
12. 新增 API 有 route/service skeleton
13. 所有新能力有 v1.1 真源文档
14. README、CHANGELOG、current-version-progress、acceptance-standard 版本口径一致
15. lint / build / test / browser verification 通过
16. 不提交 secrets
17. 不引入真实业务子项目主体
18. 不破坏已有 v1.0 首跑能力

---

## 15. CLI 实施指令

以下内容可直接给 Codex CLI / 本地 CLI Agent 执行。

```text
你在 RhyTsui/PMOS 仓库中工作。

目标：把当前 PMOS v1.0 产品仓一次性升级为 PMOS v1.1 Studio Edition。

核心定位：
- Codex 是执行器
- PMOS Runtime 是 OS
- PMAIOS Studio 是用户桌面

请按以下要求实施。

一、版本与文档
1. 将 package.json version 改为 1.1.0。
2. 新增：
   - docs/operations/pmaios-v1.1-studio-direction.md
   - docs/operations/v1.1-acceptance-standard.md
   - docs/operations/codex-execution-boundary.md
   - docs/operations/frontend-modularization-standard.md
   - docs/operations/v1.1-upgrade-plan.md
3. 更新：
   - README.md
   - CHANGELOG.md
   - docs/operations/current-version-progress.md
   - docs/deployment/api-overview.md
4. 文档必须说明：PMAIOS Studio 是用户桌面，PMOS Runtime 是 OS，Codex 是 coding executor。

二、前端模块化
1. 将 src/frontend/App.tsx 拆成 AppShell + routes + features。
2. App.tsx 最终不得超过 300 行。
3. 新增目录：
   - src/frontend/app
   - src/frontend/features/command-center
   - src/frontend/features/intake
   - src/frontend/features/builder
   - src/frontend/features/workflow
   - src/frontend/features/evidence
   - src/frontend/features/knowledge
   - src/frontend/features/runtime-admin
   - src/frontend/components
   - src/frontend/shared
4. 新增路由：
   - /workspace/command
   - /workspace/inbox
   - /workspace/builder
   - /workspace/workflow
   - /workspace/evidence
   - /workspace/knowledge
   - /workspace/runtime
5. 保留旧入口 /workspace、/pmaios/wiki、/pmaios/graph、/api/health。

三、Command Center
实现 CommandCenterPage，展示：
- system health
- selected subproject
- active mainline task
- task ssot current attention
- scheduler summary
- proof-of-work summary
- connector status
- Codex local state summary
- next safe action

四、Builder / Coding Console
实现 mock-first Builder：
- PageSpecComposer
- PageTreePanel
- ComponentTreePanel
- ApiContractPanel
- CodexTaskBuilder
- CodexExecutionConsole
- DiffViewer
- PreviewFrame
- BrowserVerificationPanel
- AcceptOrReworkBar

先支持 mock CodexJob 状态机，不要直接强绑真实 CLI 执行。

五、后端接口
新增：
- src/backend/routes/builderRoutes.ts
- src/backend/routes/codexRoutes.ts
- src/backend/routes/studioRoutes.ts
- src/backend/services/builderPageSpecService.ts
- src/backend/services/codexExecutionService.ts
- src/backend/services/previewService.ts
- src/backend/services/studioOverviewService.ts

实现接口：
- POST /api/builder/page-specs
- GET  /api/builder/page-specs
- GET  /api/builder/page-specs/:id
- POST /api/builder/page-specs/:id/refine
- POST /api/builder/page-specs/:id/create-codex-job
- POST /api/codex/jobs
- GET  /api/codex/jobs
- GET  /api/codex/jobs/:id
- GET  /api/codex/jobs/:id/events
- GET  /api/codex/jobs/:id/logs
- GET  /api/codex/jobs/:id/diff
- POST /api/codex/jobs/:id/approve
- POST /api/codex/jobs/:id/cancel
- POST /api/codex/jobs/:id/run-verification
- POST /api/codex/jobs/:id/writeback
- GET  /api/studio/overview

六、共享 schema
在 shared schemas 中增加或补齐：
- PageSpec
- CodexJob
- CodexJobEvent
- CodexJobArtifact
- StudioOverview

七、Runtime Admin
实现 RuntimeAdminPage，展示：
- Codex local state diff
- provider routing
- MCP registry
- skills
- plugins
- environment check
- version alignment
- 推荐命令 npm run cli -- codex-state sync

八、验收
必须通过：
- npm run lint
- npm run build
- npm run test
- npm run verify:frontend-browser

限制：
- 不提交 secrets
- 不引入真实业务子项目主体
- 不破坏现有 /api/health、/workspace、/pmaios/wiki、/pmaios/graph
- 不把 Codex CLI 暴露成普通用户必须直接操作的入口
- 所有新增功能必须能被真源文档解释
- 默认 mock-first；真实 Codex 执行必须通过显式配置开启
```

---

## 16. 推荐实施顺序

```text
1. 文档与版本
2. 前端目录骨架
3. AppShell + Routes
4. Command Center
5. PageSpec / CodexJob schema
6. Builder + mock CodexJob
7. 后端 builder/codex/studio routes
8. Workflow/Evidence/Knowledge 页面迁移
9. Runtime Admin
10. lint/build/test/browser verification
11. 更新验收文档和 CHANGELOG
```

---

## 17. 最终交付形态

v1.1 交付后，PMOS 应呈现为：

```text
PMAIOS Studio
  - 用户可操作
  - 可看状态
  - 可发起需求
  - 可生成 PageSpec
  - 可创建 CodexJob
  - 可看 diff / preview / verification
  - 可 approve / rework

PMOS Runtime
  - workflow
  - task ssot
  - scheduler
  - review
  - proof-of-work
  - knowledge grounding
  - connector governance

Codex Execution Gateway
  - mock-first job state machine
  - real executor interface reserved
  - controlled execution boundary
  - logs / diff / verification / proof writeback
```

一句话验收：

`用户打开 Studio 后，不再需要先问“我要敲什么命令”，而是能直接看到当前系统状态、下一步动作，并通过 Builder 把需求推进到 Codex 执行与证据验收。`
