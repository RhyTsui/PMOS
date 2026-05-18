# PMOS v1.1 Studio Edition 需求包

版本：`v1.1 Studio Edition`  
用途：交给 CLI / Codex / 开发执行，用于实现 PMOS v1.1 的产品化升级。  
范围：本需求包只定义产品目标、系统边界、主流程、Agent 动态路由、数据模型、API、实施计划与验收标准。  
不包含：UI 视觉设计、页面视觉稿、具体配色、组件视觉排版、最终界面细节。

## 一句话定义

PMOS v1.1 Studio Edition 是 PMOS 从本地 Runtime / CLI 系统升级为“可被用户操作的 AI Product Operating System”的关键版本。

核心关系：

```text
PMOS Studio = 用户桌面 / Copilot 入口
PMOS Runtime = OS 核心 / 状态与治理层
Codex CLI = 受控执行器
Task SSOT = 系统状态真源
Proof-of-Work = 交付证据
Review Gate = 质量门禁
Version Governance = 产品记忆
```

## 固定主链

```text
Original Demand
→ Requirement
→ PageSpec
→ CodexJob
→ Code Diff
→ Preview
→ Browser Verification
→ Review Gate
→ Proof-of-Work
→ Version Writeback
```

v1.1 的所有功能、接口、状态和前端交互都必须服务这条主链。

## 文件说明

| 文件 | 说明 |
|---|---|
| `00_executive_summary.md` | v1.1 总览、必要性、价值与边界 |
| `01_design_constitution.md` | 设计宪法：禁止跑偏的硬约束 |
| `02_product_requirements.md` | 完整 PRD，不含 UI 视觉设计 |
| `03_agent_dynamic_routing.md` | Agent 动态路由与 Copilot-first 交互需求 |
| `04_domain_model_and_state_machine.md` | 核心实体、状态机、数据模型 |
| `05_api_requirements.md` | 后端 API 需求与服务拆分 |
| `06_codex_execution_gateway.md` | Codex 受控执行网关需求 |
| `07_implementation_plan.md` | 分阶段实施计划 |
| `08_acceptance_standard.md` | v1.1 验收标准 |
| `09_cli_execution_prompt.md` | 可直接贴给 CLI / Codex 的实施指令 |
| `10_non_goals_and_risks.md` | 非目标、风险与防跑偏规则 |

## 推荐执行顺序

```text
1. 阅读 00 / 01 / 02
2. 冻结 03 / 04 / 05 的实体与接口
3. 按 07 分阶段实施
4. 每阶段按 08 验收
5. 使用 09 作为 CLI 总控提示词
```


---

# 00. PMOS v1.1 Studio Edition 总览

## 1. 背景

PMOS v1.0 已经完成独立产品仓、基础运行时、真源文档、Workflow、Task SSOT、Proof-of-Work、Review、Knowledge Connector、Codex Local State 等基础能力。

但当前系统仍存在核心产品瓶颈：

```text
有 Runtime
有 CLI
有 API
有文档
但缺少真正的用户操作入口
```

用户要推进一个产品交付任务时，仍然容易回到命令行、文件系统、分散 API 和人工上下文拼接。

v1.1 的目标不是“增加几个页面”，而是把 PMOS 从本地运行时升级为可被用户操作的 AI Product Operating System。

## 2. v1.1 一句话目标

```text
让用户不用直接进入命令行，也能通过 PMOS Copilot 把一个产品需求推进到可预览、可验证、可评审、可沉淀的代码交付状态。
```

## 3. 产品定位

PMOS v1.1 不做通用 Coze，不做普通 AI Studio，不做普通 Dashboard。

它的定位是：

```text
产品交付型 AI Studio / AI Product Operating System 用户桌面
```

核心场景：

```text
产品需求
→ 页面规格
→ 受控 Coding Job
→ 本地代码修改
→ 预览
→ 浏览器验证
→ 评审
→ 证据链
→ 版本沉淀
```

## 4. 核心架构

```text
用户
 ↓
PMOS Studio / PMOS Copilot
 ↓
Agent Router
 ↓
Dynamic Work Surface
 ↓
PMOS Runtime Gateway
 ↓
Task SSOT / Workflow / Proof / Review / Knowledge
 ↓
Codex Execution Gateway
 ↓
Codex CLI / Git / npm / Playwright
```

## 5. v1.1 必须回答的问题

1. 用户如何从一句需求进入 PMOS？
2. 用户如何不看命令行也能启动产品交付任务？
3. PMOS 如何把需求转成 PageSpec？
4. PMOS 如何创建受控 CodexJob？
5. Codex 执行过程如何被日志、状态机、diff 和验证追踪？
6. 什么条件下任务可以算 completed？
7. Proof-of-Work 如何生成并回写？
8. v1.1 如何为后续桌面客户端、Coze 集成、Workflow Canvas 留扩展空间？

## 6. v1.1 成功标志

v1.1 成功后，用户应该能完成：

```text
1. 打开 PMOS Studio / Copilot
2. 输入产品需求
3. 系统动态路由到合适 Agent
4. 生成 PageSpec
5. 确认后创建 CodexJob
6. 查看执行状态和日志
7. 查看 diff / preview / browser verification
8. 发起 review 或 rework
9. 查看 Proof-of-Work
10. 写入版本记录
```

## 7. v1.1 不做什么

v1.1 不追求：

```text
完整 Coze 复制
完整 AI Studio 复制
完整桌面客户端
完整 Workflow 拖拽编辑器
完整多租户 SaaS
完整权限系统
完整插件市场
完整 Agent 商店
```

v1.1 只打穿一条主链：

```text
Original Demand → PageSpec → CodexJob → Verify → Proof → Version
```


---

# 01. PMOS v1.1 Design Constitution

本文档是 v1.1 实施的硬约束。任何功能、接口、状态、页面或 Agent 能力都必须符合本文档。

## 1. Core Identity

PMOS v1.1 Studio Edition 不是：

```text
普通 Dashboard
普通聊天工具
Coze Clone
AI IDE
文档门户
纯 Workflow 编辑器
纯命令行包装器
```

PMOS v1.1 是：

```text
AI Product Operating System 的用户桌面和 Copilot 入口
```

## 2. 固定分层

```text
PMOS Studio / Copilot = 用户入口
Agent Router = 意图识别与动态路由
Dynamic Work Surface = 按任务动态出现的交互工作面
PMOS Runtime = OS 核心
Task SSOT = 系统状态真源
Codex CLI = 受控执行器
Proof-of-Work = 交付证据
Review Gate = 质量门禁
Version Governance = 产品记忆
```

## 3. 固定主链

```text
Original Demand
→ Requirement
→ PageSpec
→ CodexJob
→ Code Diff
→ Preview
→ Browser Verification
→ Review Gate
→ Proof-of-Work
→ Version Writeback
```

所有 v1.1 功能必须服务这条链路。

## 4. 前端交互原则

v1.1 前端采用：

```text
Copilot-first
Agent Dynamic Routing
Dynamic Work Surface
```

而不是：

```text
平铺式功能后台
全量模块 Dashboard
固定多面板堆叠
```

用户默认面对 Copilot。  
系统根据用户意图动态选择合适 Agent 和交互 Surface。

## 5. 执行边界

禁止前端直接执行 shell。  
禁止前端直接调用 Codex CLI。  
禁止绕过 Runtime 创建本地代码变更。  
禁止无状态的一键执行。  
禁止没有验证和证据的 completed 状态。

正确路径：

```text
Studio / Copilot
→ PMOS Runtime API
→ CodexExecutionService
→ CodexJob
→ Logs / Diff / Preview / Verify
→ Proof-of-Work
```

## 6. 每个功能必须回答的问题

任何新增功能必须回答：

1. 谁使用它？
2. 用户输入是什么？
3. 它创建或更新哪个 PMOS 实体？
4. 它读取哪个 Runtime 状态？
5. 它产生什么证据？
6. 它解锁什么下一步动作？
7. 它如何连接 Proof / Review / Version？
8. 它是否保持 Studio / Runtime / Codex 边界？

如果无法回答，不进入 v1.1。

## 7. 禁止方向

v1.1 禁止：

```text
1. 把 PMOS Studio 做成普通聊天页面
2. 把 PMOS Studio 做成 Coze clone
3. 把前端做成平铺式管理后台
4. 前端直接 shell 执行
5. 直接暴露 Codex CLI 给普通用户
6. 无状态运行 Codex
7. completed 状态没有 proof
8. coding 交付没有 browser verification
9. mock 数据散落在 UI 组件里
10. 新增无法对应 Requirement / PageSpec / Task / Proof 的功能
```

## 8. v1.1 的判断标准

如果用户仍然需要进入命令行才能理解和推进主链，则 v1.1 未完成。

如果用户只看到一堆页面和卡片，但不知道下一步该做什么，则 v1.1 未完成。

如果 Codex 执行没有状态机、日志、diff、验证和 proof，则 v1.1 未完成。

如果系统不能把需求推进到 PageSpec / CodexJob / Verify / Proof，则 v1.1 未完成。


---

# 02. PMOS v1.1 Studio Edition 产品需求文档

## 1. 版本定义

```text
Product Version: PMOS v1.1 Studio Edition
Runtime Baseline: v0.8+
Package Version Target: 1.1.0
Frontend Mode: Copilot-first Web Studio
Future Packaging: Desktop Shell in v1.1.1
```

## 2. 用户角色

### 2.1 Product Chief

负责定义产品方向、确认 PageSpec、审批 Review Gate 和版本写入。

### 2.2 Project PM

负责把原始需求推进到结构化 Requirement、PageSpec 和 workflow task。

### 2.3 Designer / UX

负责补充页面意图、交互约束、信息架构和验收条件。

### 2.4 Developer

负责查看 CodexJob 结果、diff、测试结果和技术风险。

### 2.5 Reviewer / QA

负责验证 Browser Verification、Proof-of-Work 和 Review 结论。

### 2.6 Runtime Operator

负责检查 Codex、MCP、Provider、Connector、环境变量和系统健康。

## 3. 核心使用场景

### 3.1 从需求创建页面规格

用户输入：

```text
做一个 PMOS v1.1 Builder 页面，支持从需求生成 PageSpec，并创建 CodexJob。
```

系统行为：

```text
1. Agent Router 判断意图属于 BuilderAgent
2. 系统生成 PageSpec 草稿
3. 用户确认页面目标、数据需求、组件需求和验收条件
4. PageSpec 进入 ready 状态
```

### 3.2 从 PageSpec 创建 CodexJob

系统行为：

```text
1. 用户确认 PageSpec
2. Runtime 创建 CodexJob draft
3. 用户确认工作目录、允许修改范围、执行模式和验证命令
4. CodexJob 进入 queued / running 状态
```

### 3.3 Codex 执行代码任务

系统行为：

```text
1. CodexExecutionService 调用 Codex CLI
2. 系统记录 stdout / stderr
3. 系统记录 job events
4. 系统捕获 git diff
5. 系统触发 build / test / browser verification
```

### 3.4 验证与证据链

系统行为：

```text
1. Browser Verification 生成报告
2. Proof-of-Work 生成 bundle
3. Review Gate 判断 pass / conditional / reject
4. 用户 approve / rework
5. 结果写入 Version Governance
```

## 4. 功能需求

### 4.1 PMOS Copilot

PMOS Copilot 是 v1.1 的默认入口。

必须支持：

```text
1. 输入自然语言目标
2. 附加文档、截图、上下文文件
3. 展示 Agent Router 的路由结果
4. 展示当前任务状态
5. 展示下一步安全动作
6. 发起确认、重试、返工、写入版本等动作
```

不要求包含具体视觉设计。

### 4.2 Agent Router

Agent Router 负责把用户意图路由到合适 Agent 和 Runtime 功能。

必须支持路由到：

```text
IntakeAgent
BuilderAgent
CodexAgent
VerifierAgent
EvidenceAgent
WorkflowAgent
KnowledgeAgent
RuntimeAgent
```

每次路由必须记录：

```text
userIntent
selectedAgent
reason
targetEntityType
targetEntityId
nextAction
createdAt
```

### 4.3 Dynamic Work Surface

Dynamic Work Surface 是 Agent 根据任务动态打开的结构化交互面。

它不是固定页面，也不是平铺 Dashboard。

必须支持：

```text
1. 展示结构化实体，例如 PageSpec、CodexJob、Proof
2. 支持用户编辑关键字段
3. 支持确认 / 取消 / 重试 / 返工
4. 支持将确认动作提交给 Runtime
5. 支持显示当前 Surface 与主链的关系
```

### 4.4 Product Intake

Product Intake 负责把原始输入转成 Requirement。

必须支持：

```text
1. 接收手动输入
2. 接收附件或外部来源引用
3. 生成 Requirement 草稿
4. 提取目标用户、场景、痛点、验收条件
5. 绑定 subproject
6. 转入 Builder 或 Workflow
```

### 4.5 PageSpec Builder

PageSpec Builder 负责把 Requirement 或用户目标转成页面规格。

PageSpec 至少包括：

```text
title
route
userGoal
pageType
layoutRegions
componentRequirements
dataRequirements
apiRequirements
acceptanceCriteria
codingInstructions
linkedRequirementIds
linkedSubprojectId
```

### 4.6 CodexJob Console

CodexJob Console 负责管理受控 coding 任务。

必须支持：

```text
1. 创建 CodexJob draft
2. 展示工作目录
3. 展示允许修改范围
4. 展示执行模式
5. 展示状态机
6. 展示执行日志
7. 展示 diff
8. 展示 preview
9. 展示 verification
10. 支持 approve / rework / cancel
```

### 4.7 Verification

必须支持：

```text
1. 运行 build / test
2. 运行 browser verification
3. 生成 verification report
4. 将结果关联 CodexJob 和 Proof
```

### 4.8 Proof-of-Work

必须支持：

```text
1. 生成 proof bundle
2. 汇总 diff、preview、verification、review、artifact paths
3. 给出 ready / rework / blocked 结论
4. 允许用户 approve / rework
5. 写入 version entry
```

### 4.9 Runtime Admin

Runtime Admin 只作为技术运维入口，不作为默认用户入口。

必须支持：

```text
1. Codex local state
2. Skills / Plugins
3. Providers
4. MCP Registry
5. Connector status
6. Environment check
7. Build / test / verification status
```

## 5. 非功能需求

### 5.1 可审计

所有 Codex 执行必须有：

```text
job id
events
logs
diff summary
verification result
proof link
```

### 5.2 可回放

关键状态必须能从 Task SSOT / CodexJob / Proof 恢复。

### 5.3 可扩展

v1.1 必须为后续支持以下能力预留：

```text
Desktop Shell
Coze Plugin
Gemini CLI Executor
Workflow Canvas
Team Collaboration
Cloud latest-state
```

### 5.4 安全

```text
前端不得直接 shell
执行目录必须受控
允许修改范围必须明确
敏感配置不得进入公开输出
CLI 执行必须经过 Runtime Gateway
```


---

# 03. Agent 动态路由需求

## 1. 核心原则

v1.1 前端不是平铺页面，而是：

```text
Copilot-first
Agent Dynamic Routing
Dynamic Work Surface
```

用户不需要先选择模块。用户只需要表达目标，系统自动判断应该进入哪个 Agent 和哪种工作面。

## 2. Agent Router 职责

Agent Router 负责：

```text
1. 分析用户意图
2. 判断当前任务阶段
3. 选择目标 Agent
4. 创建或打开对应 PMOS 实体
5. 返回 Dynamic Work Surface 配置
6. 提供 Next Safe Step
```

## 3. Agent 列表

### 3.1 IntakeAgent

职责：

```text
原始需求 → Requirement
```

输入：

```text
自然语言需求
会议纪要
文档片段
附件
外部系统引用
```

输出：

```text
RequirementDraft
clarificationQuestions
sourceRefs
nextAction
```

### 3.2 BuilderAgent

职责：

```text
Requirement / user goal → PageSpec
```

输出：

```text
PageSpecDraft
componentRequirements
apiRequirements
acceptanceCriteria
codingInstructions
```

### 3.3 CodexAgent

职责：

```text
PageSpec → CodexJob
```

输出：

```text
CodexJobDraft
executionScope
allowedPaths
verificationCommands
riskLevel
```

### 3.4 VerifierAgent

职责：

```text
CodexJob result → VerificationReport
```

输出：

```text
buildStatus
testStatus
browserVerificationReport
blockingIssues
```

### 3.5 EvidenceAgent

职责：

```text
Verification + Review → Proof-of-Work
```

输出：

```text
ProofOfWorkBundle
acceptancePackage
missingEvidence
handoffSummary
```

### 3.6 WorkflowAgent

职责：

```text
WorkflowRun / Task SSOT → resume / rework / gate action
```

输出：

```text
currentStage
gateStatus
nextSafeStep
operatorEntries
```

### 3.7 KnowledgeAgent

职责：

```text
查询真源、知识库、上下文和 grounding 状态
```

输出：

```text
truthSourceRefs
retrievalResults
groundingStatus
contextForCodex
```

### 3.8 RuntimeAgent

职责：

```text
检查系统状态、Codex、MCP、Provider、Connector
```

输出：

```text
runtimeHealth
codexLocalState
connectorStatus
driftStatus
repairActions
```

## 4. 路由请求

```ts
type AgentRouteRequest = {
  sessionId: string;
  userInput: string;
  currentSubprojectId: string | null;
  currentTaskId: string | null;
  currentEntityRefs: Array<{
    entityType: string;
    entityId: string;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    mimeType: string;
    sourcePath?: string;
  }>;
};
```

## 5. 路由响应

```ts
type AgentRouteResponse = {
  routeId: string;
  selectedAgentId:
    | 'intake-agent'
    | 'builder-agent'
    | 'codex-agent'
    | 'verifier-agent'
    | 'evidence-agent'
    | 'workflow-agent'
    | 'knowledge-agent'
    | 'runtime-agent';
  confidence: number;
  reason: string;
  targetEntityType:
    | 'requirement'
    | 'page-spec'
    | 'codex-job'
    | 'verification-report'
    | 'proof-of-work'
    | 'workflow-run'
    | 'knowledge-query'
    | 'runtime-check';
  targetEntityId: string | null;
  dynamicSurface: DynamicSurfaceDescriptor;
  nextSafeStep: string;
  blockedReason: string | null;
};
```

## 6. Dynamic Surface Descriptor

```ts
type DynamicSurfaceDescriptor = {
  id: string;
  type:
    | 'requirement-intake'
    | 'page-spec-builder'
    | 'codex-job-console'
    | 'verification-report'
    | 'proof-viewer'
    | 'workflow-operator'
    | 'knowledge-search'
    | 'runtime-inspector';
  title: string;
  entityType: string;
  entityId: string | null;
  mode: 'view' | 'edit' | 'confirm' | 'review';
  requiredUserAction:
    | 'none'
    | 'clarify'
    | 'confirm'
    | 'approve'
    | 'rework'
    | 'cancel'
    | 'writeback';
  payloadRef: string | null;
  actions: Array<{
    id: string;
    label: string;
    kind: 'primary' | 'secondary' | 'danger';
    requiresConfirmation: boolean;
  }>;
};
```

## 7. 路由示例

### 示例 1：创建页面

用户输入：

```text
做一个 v1.1 Builder 页面，能从需求生成 PageSpec。
```

路由：

```text
BuilderAgent
→ page-spec-builder surface
→ 创建 PageSpecDraft
```

### 示例 2：执行代码

用户输入：

```text
按刚才的 PageSpec 让 Codex 写出来。
```

路由：

```text
CodexAgent
→ codex-job-console surface
→ 创建 CodexJobDraft
```

### 示例 3：判断是否可交付

用户输入：

```text
这个任务现在能交付了吗？
```

路由：

```text
EvidenceAgent
→ proof-viewer surface
→ 查看 verification / review / proof
```

## 8. 路由验收标准

1. 用户不需要手动进入固定模块也能推进主链。
2. 路由结果必须解释为什么选择该 Agent。
3. 每次路由必须产生 Next Safe Step。
4. 每个 Dynamic Surface 必须绑定 PMOS 实体。
5. Agent 不能直接执行 Codex，必须通过 Runtime 创建 CodexJob。


---

# 04. 核心实体与状态机

## 1. 核心实体

v1.1 必须围绕以下实体设计：

```text
Requirement
PageSpec
CodexJob
CodexJobEvent
CodexJobArtifact
VerificationReport
ProofOfWorkBundle
ReviewDecision
VersionEntry
AgentRoute
DynamicSurface
StudioSession
```

## 2. PageSpec

```ts
type PageSpecStatus =
  | 'draft'
  | 'ready'
  | 'linked_to_codex_job'
  | 'implemented'
  | 'archived';

type PageSpec = {
  id: string;
  title: string;
  status: PageSpecStatus;
  subprojectId: string | null;
  linkedRequirementIds: string[];
  route: string | null;
  userGoal: string;
  pageType:
    | 'dashboard'
    | 'form'
    | 'detail'
    | 'workflow'
    | 'review'
    | 'admin'
    | 'copilot-surface';
  layoutRegions: Array<{
    id: string;
    name: string;
    purpose: string;
    priority: 'P0' | 'P1' | 'P2';
  }>;
  componentRequirements: Array<{
    id: string;
    name: string;
    purpose: string;
    dataDependencies: string[];
  }>;
  dataRequirements: Array<{
    id: string;
    name: string;
    source: 'existing-api' | 'new-api' | 'mock' | 'runtime-state';
    endpoint?: string;
    fields: string[];
  }>;
  apiRequirements: Array<{
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    purpose: string;
    requestSchema?: unknown;
    responseSchema?: unknown;
  }>;
  acceptanceCriteria: string[];
  codingInstructions: string[];
  createdAt: string;
  updatedAt: string;
};
```

## 3. CodexJob

```ts
type CodexJobStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'awaiting_approval'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rework_required';

type CodexJobMode =
  | 'plan-only'
  | 'edit'
  | 'full-auto-sandbox';

type CodexJob = {
  id: string;
  title: string;
  status: CodexJobStatus;
  mode: CodexJobMode;
  subprojectId: string | null;
  requirementIds: string[];
  pageSpecId: string | null;
  workflowRunId: string | null;
  taskId: string | null;
  workingDirectory: string;
  allowedPaths: string[];
  blockedPaths: string[];
  branchName: string | null;
  prompt: string;
  executionPlan: string[];
  verificationCommands: string[];
  previewUrl: string | null;
  diffSummary: string | null;
  proofOfWorkBundleId: string | null;
  riskLevel: 'L1' | 'L2' | 'L3' | 'L4';
  requiresHumanApproval: boolean;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedReason: string | null;
};
```

## 4. CodexJobEvent

```ts
type CodexJobEventKind =
  | 'job_created'
  | 'job_queued'
  | 'job_started'
  | 'prompt_prepared'
  | 'codex_invoked'
  | 'stdout'
  | 'stderr'
  | 'file_changed'
  | 'diff_captured'
  | 'command_started'
  | 'command_completed'
  | 'verification_started'
  | 'verification_completed'
  | 'approval_requested'
  | 'approved'
  | 'rework_requested'
  | 'job_completed'
  | 'job_failed'
  | 'job_cancelled';

type CodexJobEvent = {
  id: string;
  jobId: string;
  kind: CodexJobEventKind;
  status: 'ok' | 'warning' | 'error';
  timestamp: string;
  message: string;
  artifactRefs: string[];
  metadata: Record<string, unknown>;
};
```

## 5. CodexJobArtifact

```ts
type CodexJobArtifact = {
  id: string;
  jobId: string;
  kind:
    | 'log'
    | 'diff'
    | 'preview'
    | 'verification-report'
    | 'proof-of-work'
    | 'source-file'
    | 'screenshot';
  path: string;
  title: string;
  createdAt: string;
};
```

## 6. CodexJob 状态机

```text
draft
  ↓ submit
queued
  ↓ start
running
  ↓ require approval
awaiting_approval
  ↓ approve
verifying
  ↓ verification pass
completed

running
  ↓ fail
failed

verifying
  ↓ verification fail
rework_required

any active state
  ↓ cancel
cancelled
```

## 7. 状态机规则

### draft

允许：

```text
编辑 prompt
编辑工作目录
编辑 allowedPaths
编辑 verificationCommands
提交 queued
```

禁止：

```text
执行 CLI
标记 completed
生成 proof
```

### queued

允许：

```text
开始执行
取消
```

### running

允许：

```text
记录日志
记录事件
捕获文件变更
捕获 diff
取消
```

禁止：

```text
无验证直接 completed
```

### awaiting_approval

允许：

```text
用户 approve
用户 reject
用户 request rework
```

### verifying

允许：

```text
运行 build
运行 test
运行 browser verification
生成 verification report
```

### completed

必须满足：

```text
有 diff 或明确 no-op 说明
有 verification report
有 proof-of-work
有 review 或 human approval
```

### rework_required

必须提供：

```text
失败原因
需要返工的 PageSpec / Requirement / CodexJob 引用
next safe step
```

## 8. StudioSession

```ts
type StudioSession = {
  id: string;
  title: string;
  subprojectId: string | null;
  activeAgentId: string | null;
  activeSurfaceId: string | null;
  linkedEntityRefs: Array<{
    entityType: string;
    entityId: string;
  }>;
  createdAt: string;
  updatedAt: string;
};
```

## 9. StudioOverview

```ts
type StudioOverview = {
  generatedAt: string;
  selectedSubprojectId: string | null;
  activeMainlineTaskId: string | null;
  activeMainlineLabel: string | null;
  nextSafeStep: string | null;
  activeAgentId: string | null;
  activeSurface: DynamicSurfaceDescriptor | null;
  schedulerSummary: {
    running: number;
    paused: number;
    blocked: number;
    completed: number;
  };
  proofSummary: {
    ready: number;
    rework: number;
    blocked: number;
  };
  codexSummary: {
    aligned: boolean;
    activeJobs: number;
    failedJobs: number;
    driftReasons: string[];
  };
  connectorSummary: {
    configured: number;
    connected: number;
    blocked: number;
  };
};
```


---

# 05. API 与服务需求

## 1. 服务拆分目标

v1.1 后端需要新增或拆分以下服务：

```text
AgentRouterService
DynamicSurfaceService
BuilderPageSpecService
CodexExecutionService
PreviewService
StudioOverviewService
VerificationService
```

## 2. Agent Router API

### POST /api/studio/agent-route

用途：根据用户输入和当前上下文选择 Agent 和 Dynamic Surface。

请求：

```ts
AgentRouteRequest
```

响应：

```ts
AgentRouteResponse
```

## 3. Studio Overview API

### GET /api/studio/overview

用途：返回当前 Studio 运行总览。

Query：

```text
subprojectId?
sessionId?
```

响应：

```ts
StudioOverview
```

## 4. Dynamic Surface API

### GET /api/studio/surfaces/:surfaceId

用途：读取当前 Dynamic Surface 描述与绑定实体。

### POST /api/studio/surfaces/:surfaceId/actions/:actionId

用途：执行 Surface 上的用户动作，例如 confirm / approve / rework / cancel / writeback。

## 5. PageSpec API

### POST /api/builder/page-specs

创建 PageSpec draft。

### GET /api/builder/page-specs

列出 PageSpec。

### GET /api/builder/page-specs/:id

读取 PageSpec。

### PATCH /api/builder/page-specs/:id

更新 PageSpec。

### POST /api/builder/page-specs/:id/mark-ready

将 PageSpec 标记为 ready。

### POST /api/builder/page-specs/:id/create-codex-job

基于 PageSpec 创建 CodexJob draft。

## 6. CodexJob API

### POST /api/codex/jobs

创建 CodexJob draft。

### GET /api/codex/jobs

列出 CodexJob。

### GET /api/codex/jobs/:id

读取 CodexJob。

### PATCH /api/codex/jobs/:id

更新 CodexJob draft。

### POST /api/codex/jobs/:id/queue

提交到 queued。

### POST /api/codex/jobs/:id/start

开始执行。

### POST /api/codex/jobs/:id/cancel

取消执行。

### POST /api/codex/jobs/:id/approve

人工 approve。

### POST /api/codex/jobs/:id/rework

请求返工。

### GET /api/codex/jobs/:id/events

读取事件。

### GET /api/codex/jobs/:id/logs

读取日志。

### GET /api/codex/jobs/:id/diff

读取 diff。

### GET /api/codex/jobs/:id/artifacts

读取 artifacts。

### POST /api/codex/jobs/:id/run-verification

运行验证。

### POST /api/codex/jobs/:id/writeback

写入 proof / version。

## 7. Preview API

### GET /api/preview/status

读取本地 preview 状态。

### POST /api/preview/start

启动或确认 preview 服务。

### GET /api/preview/jobs/:jobId

读取 CodexJob 关联 preview。

## 8. Verification API

### POST /api/verification/jobs/:jobId/run

运行 CodexJob 的 verificationCommands 和 browser verification。

### GET /api/verification/jobs/:jobId/report

读取 VerificationReport。

## 9. Proof API 扩展

### POST /api/proof-of-work/from-codex-job/:jobId

从 CodexJob 生成 ProofOfWorkBundle。

### GET /api/proof-of-work/jobs/:jobId

读取 CodexJob 关联 proof。

## 10. API 规则

所有 API 必须：

```text
1. 返回结构化 JSON
2. 包含 error code
3. 不暴露本地 secrets
4. 不允许前端传入任意 shell command 并直接执行
5. 将执行类动作封装成 Job 状态变更
6. 支持 subprojectId 作用域
7. 关键动作写入 event log
```

## 11. Mock-first 要求

v1.1 初始实施必须先支持 mock-first：

```text
PageSpec 可以创建
CodexJob 可以创建和推进状态
events/logs/diff/verification/proof 可以返回 mock artifact
真实 Codex CLI 执行最后接入
```

目的：

```text
先验证产品主链和状态机
再接入真实执行风险
```


---

# 06. Codex Execution Gateway 需求

## 1. 定位

Codex CLI 是 PMOS 的受控执行器，不是用户直接操作的前台。

正确关系：

```text
PMOS Studio
→ PMOS Runtime
→ CodexExecutionService
→ Codex CLI
```

## 2. 目标

Codex Execution Gateway 必须实现：

```text
1. 创建 CodexJob
2. 校验工作目录和允许修改范围
3. 生成 Codex prompt
4. 调用 Codex CLI
5. 捕获 stdout / stderr
6. 记录 CodexJobEvent
7. 捕获 git diff
8. 运行 verification
9. 生成 proof 引用
10. 支持 approve / rework / cancel
```

## 3. 安全边界

禁止：

```text
前端直接执行 shell
前端传入任意命令直接运行
Codex 访问未授权路径
没有 allowedPaths 的写文件
没有 verification 的 completed
没有 proof 的 writeback
```

必须：

```text
1. 工作目录必须在允许 workspace 内
2. allowedPaths 必须显式声明
3. blockedPaths 默认包含 secrets、.env、私有记忆、系统目录
4. 所有命令必须进入 event log
5. 所有结果必须绑定 jobId
```

## 4. 执行模式

### plan-only

只让 Codex 生成计划，不改文件。

用途：

```text
需求澄清
实现方案
风险评估
```

### edit

允许 Codex 修改 allowedPaths 内的文件。

用途：

```text
普通开发任务
页面实现
重构
```

### full-auto-sandbox

允许更完整的自动执行，但必须运行在受控目录和受控命令集内。

用途：

```text
后续增强，不作为 v1.1 默认模式
```

## 5. Prompt 生成规则

Codex prompt 必须包含：

```text
1. PMOS v1.1 Design Constitution 摘要
2. 目标 PageSpec
3. linked Requirement
4. allowedPaths
5. blockedPaths
6. expectedFiles
7. verificationCommands
8. acceptanceCriteria
9. output expectations
10. 禁止直接跳过 proof / verification 的提醒
```

## 6. 日志与事件

必须记录：

```text
job_created
job_queued
job_started
prompt_prepared
codex_invoked
stdout
stderr
file_changed
diff_captured
command_started
command_completed
verification_started
verification_completed
approval_requested
approved
rework_requested
job_completed
job_failed
job_cancelled
```

## 7. Diff 捕获

CodexJob 执行后必须捕获：

```text
1. git status
2. changed files
3. diff summary
4. patch artifact path
5. 是否包含 blockedPaths
```

如果没有 diff，也必须生成 no-op 说明。

## 8. Verification

至少支持：

```text
npm run lint
npm run build
npm run test
npm run verify:frontend-browser
```

具体命令由 CodexJob.verificationCommands 指定，但必须经过 Runtime 白名单或配置校验。

## 9. Completion Gate

CodexJob 进入 completed 必须满足：

```text
1. 状态为 verifying 后通过验证
2. 有 event log
3. 有 diff summary 或 no-op reason
4. 有 verification report
5. 有 proof-of-work bundle
6. 有人工 approve 或 review decision
```

## 10. Rework

如果验证失败或用户 reject，必须进入：

```text
rework_required
```

并生成：

```text
failedChecks
reworkReason
suggestedNextAction
linkedPreviousJobId
```

## 11. v1.1 最小实现

v1.1 最小可接受版本：

```text
1. mock CodexJob 状态机完整
2. real Codex execution 可选，但接口预留
3. logs / events 可读
4. diff / verification / proof 可 mock
5. 禁止无状态直接 CLI
```

v1.1.1 或后续版本再增强真实执行稳定性。


---

# 07. v1.1 分阶段实施计划

## Phase 0：真源文档

目标：先锁定定义，不写功能代码。

新增或更新：

```text
docs/operations/pmaios-v1.1-studio-direction.md
docs/operations/pmaios-v1.1-design-constitution.md
docs/operations/pmaios-v1.1-agent-routing.md
docs/operations/codex-execution-boundary.md
docs/operations/v1.1-acceptance-standard.md
docs/operations/current-version-progress.md
README.md
CHANGELOG.md
```

验收：

```text
文档明确说明 v1.1 是 Copilot-first + Agent Dynamic Routing
文档明确说明 Studio / Runtime / Codex 边界
文档明确说明 v1.1 做什么、不做什么
```

## Phase 1：shared schema

目标：先锁实体和状态机。

新增或补齐：

```text
PageSpec
CodexJob
CodexJobEvent
CodexJobArtifact
AgentRoute
DynamicSurfaceDescriptor
StudioSession
StudioOverview
VerificationReport
```

验收：

```text
npm run build 通过
前后端可共同引用类型
状态机明确
```

## Phase 2：后端服务 skeleton

新增：

```text
AgentRouterService
DynamicSurfaceService
BuilderPageSpecService
CodexExecutionService
StudioOverviewService
PreviewService
VerificationService
```

新增 routes：

```text
studioRoutes.ts
builderRoutes.ts
codexRoutes.ts
previewRoutes.ts
verificationRoutes.ts
```

验收：

```text
API 返回结构化 mock 数据
CodexJob 可创建、读取、推进状态
不真实执行 shell
```

## Phase 3：前端 Copilot Shell

目标：实现 Copilot-first 基础结构，不做视觉终稿。

需要实现：

```text
StudioSession
Copilot 输入
Agent Route result
Dynamic Surface 容器
Next Safe Step
```

验收：

```text
用户输入目标后，可以看到路由到哪个 Agent
系统可以打开对应 Dynamic Surface
```

## Phase 4：Agent Router mock-first

实现路由规则：

```text
需求类 → IntakeAgent
页面类 → BuilderAgent
代码执行类 → CodexAgent
验证类 → VerifierAgent
证据类 → EvidenceAgent
工作流类 → WorkflowAgent
知识类 → KnowledgeAgent
系统状态类 → RuntimeAgent
```

验收：

```text
至少 8 类常见输入能路由到正确 Agent
每次路由有 reason 和 nextSafeStep
```

## Phase 5：PageSpec Builder

实现：

```text
从用户输入创建 PageSpec draft
编辑 PageSpec
mark ready
create CodexJob draft
```

验收：

```text
用户可以从一句需求生成 PageSpec
确认后创建 CodexJob draft
```

## Phase 6：CodexJob Console mock-first

实现：

```text
CodexJob 状态机
events
logs
diff mock
preview mock
verification mock
proof mock
approve / rework / cancel
```

验收：

```text
不接真实 Codex CLI，也能跑通：
PageSpec → CodexJob → verifying → proof → completed
```

## Phase 7：真实 Codex 执行接入

实现：

```text
child_process 调用 Codex CLI
stdout / stderr 捕获
git diff 捕获
verificationCommands 执行
artifact 写入
proof 生成
```

验收：

```text
前端不直接 shell
所有执行有 jobId
所有输出有 events/logs/artifacts
失败可进入 rework_required
```

## Phase 8：Evidence / Workflow / Knowledge / Runtime 收口

把现有能力接入 Dynamic Surface：

```text
proof-viewer
workflow-operator
knowledge-search
runtime-inspector
```

验收：

```text
用户能从 Copilot 问：
这个任务能交付了吗？
为什么卡住了？
Codex 状态正常吗？
需要什么证据？
```

## Phase 9：回归与发布

执行：

```bash
npm run lint
npm run build
npm run test
npm run verify:frontend-browser
npm start
```

验收：

```text
/ 可访问
/workspace 可访问
/api/health 200
主链可 mock-first 跑通
无 secrets 泄漏
文档口径一致
```


---

# 08. PMOS v1.1 Studio Edition 验收标准

## 1. 产品级验收原则

v1.1 不按“页面是否存在”验收，而按“主链是否跑通”验收。

主链：

```text
Original Demand
→ Requirement
→ PageSpec
→ CodexJob
→ Code Diff
→ Preview
→ Browser Verification
→ Review Gate
→ Proof-of-Work
→ Version Writeback
```

## 2. 必须满足

### 2.1 Copilot-first

用户打开 PMOS Studio 后，默认能通过 Copilot 输入目标，而不是必须先理解模块菜单。

验收：

```text
用户输入“做一个页面”
系统能路由到 BuilderAgent
系统能生成 Dynamic Surface
```

### 2.2 Agent Router

必须支持至少以下路由：

```text
IntakeAgent
BuilderAgent
CodexAgent
VerifierAgent
EvidenceAgent
WorkflowAgent
KnowledgeAgent
RuntimeAgent
```

验收：

```text
每次路由有 selectedAgent、reason、nextSafeStep、targetEntityType
```

### 2.3 PageSpec

必须能从需求创建 PageSpec。

验收：

```text
PageSpec 包含目标、页面类型、组件需求、数据需求、API 需求、验收条件、coding instructions
```

### 2.4 CodexJob

必须能从 PageSpec 创建 CodexJob。

验收：

```text
CodexJob 有状态机
CodexJob 有 workingDirectory
CodexJob 有 allowedPaths
CodexJob 有 verificationCommands
CodexJob 有 events/logs
```

### 2.5 状态机

CodexJob 必须支持：

```text
draft
queued
running
awaiting_approval
verifying
completed
failed
cancelled
rework_required
```

### 2.6 执行边界

必须满足：

```text
前端不能直接 shell
前端不能直接调用 Codex CLI
CLI 执行必须通过 Runtime
所有执行必须绑定 jobId
```

### 2.7 验证和证据

completed 必须满足：

```text
有 diff 或 no-op reason
有 verification report
有 proof-of-work
有 approval 或 review decision
```

### 2.8 Runtime 状态

必须能查看：

```text
Codex local state
Connector status
Provider / MCP 状态
active jobs
failed jobs
drift reasons
```

## 3. 验收命令

必须通过：

```bash
npm run lint
npm run build
npm run test
npm run verify:frontend-browser
npm start
```

## 4. 文档验收

必须更新：

```text
README.md
CHANGELOG.md
docs/operations/current-version-progress.md
docs/operations/pmaios-v1.1-studio-direction.md
docs/operations/pmaios-v1.1-design-constitution.md
docs/operations/v1.1-acceptance-standard.md
docs/operations/codex-execution-boundary.md
```

## 5. 不通过条件

任一情况成立，则 v1.1 不通过：

```text
1. 用户仍必须进入命令行才能创建主链任务
2. 前端直接 shell
3. Codex 执行没有状态机
4. Codex 执行没有 events/logs
5. completed 没有 proof
6. coding 交付没有 verification
7. Dynamic Surface 没有绑定 PMOS 实体
8. Agent Router 不能解释路由原因
9. mock 数据散落在 UI 层
10. 文档和代码版本口径不一致
```

## 6. 最小可接受版本

v1.1 最小可接受版本允许真实 Codex 执行仍为 mock-first，但必须：

```text
1. 主链完整
2. 状态机完整
3. API skeleton 完整
4. Dynamic Surface 可用
5. CodexJob 可 mock 执行
6. proof / verification 可 mock 生成
7. 后续接真实 CLI 的边界已固定
```


---

# 09. CLI / Codex 实施指令

以下内容可直接复制给 CLI / Codex 作为 v1.1 实施总控提示词。

---

你正在 RhyTsui/PMOS 仓库中实施 PMOS v1.1 Studio Edition。

这不是普通前端改版，不是 Dashboard，不是 Coze clone，也不是 AI IDE。

PMOS v1.1 的核心定义：

```text
PMOS Studio / Copilot = 用户入口
PMOS Runtime = OS 核心
Codex CLI = 受控执行器
Task SSOT = 系统状态真源
Proof-of-Work = 交付证据
Review Gate = 质量门禁
Version Governance = 产品记忆
```

v1.1 固定主链：

```text
Original Demand
→ Requirement
→ PageSpec
→ CodexJob
→ Code Diff
→ Preview
→ Browser Verification
→ Review Gate
→ Proof-of-Work
→ Version Writeback
```

前端交互方向：

```text
Copilot-first
Agent Dynamic Routing
Dynamic Work Surface
```

不要做平铺式功能后台。不要把所有模块一次性展示给用户。用户只表达目标，Agent Router 判断意图并打开对应的 Dynamic Surface。

必须完成：

## 1. 文档

新增或更新：

```text
docs/operations/pmaios-v1.1-studio-direction.md
docs/operations/pmaios-v1.1-design-constitution.md
docs/operations/pmaios-v1.1-agent-routing.md
docs/operations/codex-execution-boundary.md
docs/operations/v1.1-acceptance-standard.md
docs/operations/current-version-progress.md
README.md
CHANGELOG.md
```

## 2. Shared Schema

新增或补齐：

```text
PageSpec
CodexJob
CodexJobEvent
CodexJobArtifact
AgentRoute
DynamicSurfaceDescriptor
StudioSession
StudioOverview
VerificationReport
```

## 3. 后端服务与路由

新增：

```text
src/backend/routes/studioRoutes.ts
src/backend/routes/builderRoutes.ts
src/backend/routes/codexRoutes.ts
src/backend/routes/previewRoutes.ts
src/backend/routes/verificationRoutes.ts

src/backend/services/agentRouterService.ts
src/backend/services/dynamicSurfaceService.ts
src/backend/services/builderPageSpecService.ts
src/backend/services/codexExecutionService.ts
src/backend/services/studioOverviewService.ts
src/backend/services/previewService.ts
src/backend/services/verificationService.ts
```

新增 API：

```text
POST /api/studio/agent-route
GET  /api/studio/overview
GET  /api/studio/surfaces/:surfaceId
POST /api/studio/surfaces/:surfaceId/actions/:actionId

POST /api/builder/page-specs
GET  /api/builder/page-specs
GET  /api/builder/page-specs/:id
PATCH /api/builder/page-specs/:id
POST /api/builder/page-specs/:id/mark-ready
POST /api/builder/page-specs/:id/create-codex-job

POST /api/codex/jobs
GET  /api/codex/jobs
GET  /api/codex/jobs/:id
PATCH /api/codex/jobs/:id
POST /api/codex/jobs/:id/queue
POST /api/codex/jobs/:id/start
POST /api/codex/jobs/:id/cancel
POST /api/codex/jobs/:id/approve
POST /api/codex/jobs/:id/rework
GET  /api/codex/jobs/:id/events
GET  /api/codex/jobs/:id/logs
GET  /api/codex/jobs/:id/diff
GET  /api/codex/jobs/:id/artifacts
POST /api/codex/jobs/:id/run-verification
POST /api/codex/jobs/:id/writeback
```

## 4. 前端结构

实现 Copilot-first 基础结构，不要求完成最终 UI 视觉设计。

需要具备：

```text
Studio Session
Copilot 输入
Agent Route 展示
Dynamic Surface 容器
Next Safe Step
PageSpec Surface
CodexJob Surface
Proof / Verification Surface
Runtime Inspector Surface
```

不要实现固定平铺 Dashboard 作为主入口。

## 5. Codex 执行边界

禁止：

```text
前端直接 shell
前端直接调用 Codex CLI
无状态执行 Codex
没有 verification 直接 completed
没有 proof 直接 writeback
```

必须：

```text
通过 CodexJob
通过 Runtime API
记录 events/logs
捕获 diff
运行 verification
生成 proof
```

## 6. Mock-first

先实现 mock-first：

```text
Agent Router 可路由
PageSpec 可创建
CodexJob 可创建
状态机可推进
events/logs/diff/verification/proof 可 mock
```

真实 Codex CLI 执行放在后续阶段接入，但接口和边界必须先固定。

## 7. 每阶段完成后输出回查表

每次修改完成后输出：

```text
1. 本次服务主链哪一环？
2. 修改了哪些文件？
3. 新增了哪些实体？
4. 新增了哪些 API？
5. 解锁了哪些用户动作？
6. 产生了什么 evidence？
7. 是否改变 Studio / Runtime / Codex 边界？
8. 是否存在前端直接 shell？
9. mock 数据是否集中在 service？
10. lint / build / test 结果？
```

## 8. 验收命令

必须通过：

```bash
npm run lint
npm run build
npm run test
npm run verify:frontend-browser
npm start
```

## 9. 不要做

不要做：

```text
完整 Coze clone
完整 AI Studio clone
完整桌面客户端
完整 workflow 拖拽编辑器
完整权限系统
完整插件市场
完整 Agent 商店
```

v1.1 只需要打穿：

```text
用户目标
→ Agent Router
→ Dynamic Surface
→ PageSpec
→ CodexJob
→ Verify
→ Proof
```


---

# 10. 非目标、风险与防跑偏规则

## 1. v1.1 非目标

v1.1 不做：

```text
1. 完整 Coze Studio 复制
2. 完整 Google AI Studio 复制
3. 完整桌面客户端
4. 完整 Workflow 拖拽编辑器
5. 多租户 SaaS
6. 完整权限系统
7. 插件市场
8. Agent 商店
9. 外部 Bot 多渠道发布
10. 完整云端协作平台
```

## 2. 主要风险

### 2.1 做成平铺 Dashboard

风险表现：

```text
左侧菜单 + 中间多个卡片 + 右侧状态
所有能力都展示出来
用户不知道下一步
```

防范：

```text
采用 Copilot-first + Agent Dynamic Routing
默认只暴露当前意图需要的 Dynamic Surface
```

### 2.2 做成普通聊天页

风险表现：

```text
只有对话，没有结构化实体
没有 PageSpec / CodexJob / Proof
```

防范：

```text
每个 Agent 输出必须绑定 PMOS entity
每个 Surface 必须有 action 和 nextSafeStep
```

### 2.3 Codex 失控

风险表现：

```text
前端直接 shell
用户直接操作 Codex
没有状态机
没有日志
没有 diff
```

防范：

```text
所有执行进入 CodexJob
所有执行由 Runtime 调用
所有输出写入 event log / artifact
```

### 2.4 没有证据链

风险表现：

```text
任务 completed 但无法说明为什么完成
没有 verification
没有 proof
没有 review
```

防范：

```text
completed 必须有 verification report 和 proof-of-work
```

### 2.5 UI 设计先行导致流程弱

风险表现：

```text
界面好看但实体和流程不清楚
```

防范：

```text
先冻结实体、状态机和 API
UI 单独设计，但不得改变主链和边界
```

## 3. 防跑偏检查清单

每个功能进入 v1.1 前检查：

```text
1. 是否服务主链？
2. 是否创建或更新 PMOS 实体？
3. 是否有 nextSafeStep？
4. 是否有 evidence？
5. 是否经过 Runtime？
6. 是否保持 Codex 受控？
7. 是否支持 mock-first？
8. 是否能被验收命令覆盖？
```

## 4. 版本边界

### v1.1 必须完成

```text
Copilot-first shell
Agent Router
Dynamic Surface
PageSpec
CodexJob mock-first
状态机
events/logs
verification/proof mock
API skeleton
文档与验收
```

### v1.1 可选

```text
真实 Codex CLI 执行
真实 preview
真实 browser verification 自动触发
真实 version writeback 自动化
```

### v1.1.1 建议

```text
真实 Codex CLI 稳定执行
Desktop Shell
项目目录选择
本地权限提示
托盘入口
```

### v1.2 建议

```text
Workflow Canvas
多角色协作
更完整知识连接器
Coze Plugin
Gemini CLI executor
```

## 5. 最终原则

```text
Agent decides UI.
User stays in flow.
Runtime owns state.
Codex only executes.
Proof decides delivery.
```


---
