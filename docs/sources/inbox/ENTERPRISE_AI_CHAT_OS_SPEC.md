# Enterprise AI Chat OS Architecture & Design Specification

> 企业级 AI Chat OS 架构与设计总规范  
> Canonical file: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`  
> Version: `0.1.0`  
> Status: Draft / Project Guiding Specification  
> Last Updated: 2026-05-27

---

## 0. 文档定位

本文件是项目级总纲文档，用于约束企业级 AI Chat OS 的产品架构、交互体系、协议体系、渲染体系与前端工程实现。

它不是普通的 UI 规范，也不是单一前端组件规范，而是整个 AI Chat 产品系统的顶层设计说明。

本规范用于回答以下问题：

1. 企业级 AI Chat OS 由哪些设计与工程子系统组成。
2. Visual System、Interaction System、Frontend Engineering System、Unified Semantic Contract、Runtime Display Protocol 之间的边界是什么。
3. AI 或后端产出的结果如何进入前端并被自主、可靠、可控地渲染。
4. Data Visualization UX、AI Runtime UI、Workflow Trace、AI Insight 等能力应该挂在哪个层级。
5. 后续新增能力时，如何避免重复发明协议、重复定义 action、重复定义 evidence、重复定义 source、重复定义 region。
6. Codex CLI 遍历与重构代码时，应依据哪些统一规则收口。

---

## 1. 一句话定义

Enterprise AI Chat OS 不是一个普通 UI 项目，而是一套围绕 AI 对话、Agent Runtime、Semantic Rendering、Workflow Execution 与 Data Intelligence 构建的企业级 AI 操作系统。

在该系统中：

- **Enterprise AI Chat OS** 是总体系。
- **Unified Semantic Contract** 是最终业务结果的统一语义渲染协议。
- **Runtime Display Protocol** 是 AI 执行过程、工具调用、Trace、Workflow 状态的统一运行态展示协议。
- **Component Binding System** 是语义结果进入前端组件渲染器的唯一挂载机制。
- **Visual System** 是所有渲染域共享的视觉 token 与视觉语言。
- **Interaction System** 是所有用户交互行为、反馈、会话、数据展示、可信机制的体验规范层。
- **Frontend Engineering System** 是性能、状态、渲染、响应式、组件注册、可观测性的工程约束层。

---

## 2. 总体架构

```txt
Enterprise AI Chat OS
├─ Visual System
│  ├─ Typography
│  ├─ Color System
│  ├─ Icon System
│  ├─ Spacing System
│  ├─ Radius & Border
│  ├─ Shadow & Elevation
│  ├─ Motion System
│  └─ Illustration / Visual Language
│
├─ Interaction System
│  ├─ Conversation UX
│  ├─ Input UX
│  ├─ Feedback UX
│  ├─ AI Trust UX
│  ├─ Data Visualization UX
│  ├─ AI Runtime UX
│  ├─ Workflow UX
│  ├─ Permission UX
│  └─ Security / Risk UX
│
├─ Frontend Engineering System
│  ├─ Rendering Architecture
│  ├─ Frontend Autonomous Rendering Engine
│  ├─ Component Registry
│  ├─ State Management
│  ├─ Data Fetching
│  ├─ Performance
│  ├─ Responsive System
│  ├─ Accessibility
│  └─ Observability UX
│
├─ AI Chat System
│  ├─ Conversation Lifecycle
│  ├─ Message Model
│  ├─ Streaming Message UX
│  ├─ Long Conversation Loading
│  ├─ Context Compression
│  ├─ Attachment / Artifact UX
│  └─ Prompt / Command / Input System
│
├─ Unified Semantic Contract
│  └─ SemanticResultContract
│     ├─ screenType
│     ├─ regions
│     ├─ layoutHints
│     ├─ evidenceRefs
│     ├─ sourceRefs
│     ├─ action contract
│     ├─ runtimeRefs
│     └─ componentBindings
│        ├─ markdown-result
│        ├─ data-visualization
│        ├─ ai-runtime
│        ├─ workflow-trace
│        ├─ asset-reference
│        ├─ form-input
│        └─ decision-card
│
└─ Runtime Display Protocol
   ├─ Agent Runtime State
   ├─ Tool Call State
   ├─ Workflow Trace
   ├─ Streaming State
   ├─ Execution Timeline
   ├─ Retry / Error / Recovery
   └─ Runtime Observability
```

---

## 3. 核心设计原则

### 3.1 单一总体系原则

所有 UI、UX、Runtime、Workflow、Data Visualization、Frontend Engineering 规范都归入 Enterprise AI Chat OS。

禁止新增平行的总体系概念，例如：

- `Visualization OS`
- `Metric UI OS`
- `Runtime UI OS`
- `Report UI Protocol`
- `Agent UI Schema`

这些能力可以作为子系统、交互域或 component binding 存在，但不能与 Enterprise AI Chat OS 平级竞争。

---

### 3.2 单一结果渲染协议原则

凡是最终业务结果展示，必须进入 Unified Semantic Contract。

```txt
AI / Backend Result
    ↓
Unified Semantic Contract
    ↓
Frontend Autonomous Rendering Engine
    ↓
Component Binding Renderer
```

禁止业务模块各自定义独立的最终结果 UI 协议。

错误示例：

```txt
MetricExplainerUISchema
ReportQueryViewModel
InsightCardSchema
ChartResultSchema
ToolResultUISchema
```

如果它们用于最终前端自主渲染，则必须收口为：

```txt
SemanticResultContract.regions[].componentBinding
```

---

### 3.3 Result Plane 与 Runtime Plane 分离原则

系统中必须区分两条协议线：

```txt
Result Plane
= 最终给用户看的业务结果
= Unified Semantic Contract

Runtime Plane
= AI / Agent / Tool / Workflow 的执行过程
= Runtime Display Protocol
```

二者可以在 UI 上同时出现，但协议职责不能混用。

#### Result Plane 负责

- 结论
- 摘要
- 指标解释
- 表格
- 图表
- 洞察
- 证据
- 来源
- 下一步动作
- 可交互结果区域

#### Runtime Plane 负责

- 模型生成状态
- Agent 执行状态
- Tool Call
- Trace
- Workflow Timeline
- Streaming State
- Retry
- Error Recovery
- Latency
- Execution Logs

---

### 3.4 Component Binding 是唯一渲染挂载入口

具体展示形态必须挂在：

```txt
regions[].componentBinding
```

例如：

```txt
regions[].componentBinding = "data-visualization"
regions[].componentBinding = "ai-runtime"
regions[].componentBinding = "workflow-trace"
regions[].componentBinding = "markdown-result"
regions[].componentBinding = "asset-reference"
```

任何渲染域只能定义自己的局部 data shape、交互方式、展示规则，不得重新定义顶层协议结构。

---

### 3.5 统一 action contract 原则

所有用户可点击动作必须走统一 action contract。

包括但不限于：

- 继续分析
- 重新生成
- 导出
- 下钻
- 打开来源
- 查看证据
- 复制
- 保存为报告
- 创建任务
- 运行 workflow
- 重试 tool call
- 申请权限

禁止每个模块自定义自己的 action 字段，例如：

```txt
chartActions
metricActions
runtimeActions
tableButtons
cardCta
workflowCommands
```

上述字段必须收口为统一的：

```txt
actions: ActionContract[]
```

---

### 3.6 统一 evidence / source 原则

凡是结论、洞察、风险判断、建议、归因、异常解释，必须挂：

```txt
evidenceRefs
sourceRefs
```

禁止某个模块私有化证据结构，例如：

```txt
chartEvidence
metricSources
insightReferences
runtimeCitations
```

所有证据与来源必须进入统一 evidence/source contract。

---

### 3.7 前端自主渲染原则

后端不直接控制 UI 组件细节，后端只输出语义结果。

前端基于：

- `screenType`
- `regions`
- `componentBinding`
- `layoutHints`
- `actions`
- `evidenceRefs`
- `sourceRefs`

自主选择合适的组件、布局、降级策略和交互方式。

错误方向：

```txt
后端返回 React 组件名
后端返回 CSS class
后端返回像素级布局
后端返回具体前端实现路径
```

正确方向：

```txt
后端返回语义区域、业务类型、数据结构、动作、证据、来源、渲染意图
```

---

### 3.8 性能是系统级约束原则

性能不是某个组件的局部优化，而是 Enterprise AI Chat OS 的系统级设计约束。

以下场景必须纳入 Frontend Engineering System：

- 长会话加载
- 大消息渲染
- Streaming 输出
- 大表格
- 大图表
- Markdown 渲染
- Trace Timeline
- Workflow DAG
- 附件 / Artifact
- 移动端降级
- 多面板并行渲染

---

## 4. 核心概念边界

| 概念 | 定位 | 负责什么 | 不负责什么 |
|---|---|---|---|
| Enterprise AI Chat OS | 总体系 | 产品、交互、协议、渲染、Runtime、工程的总框架 | 不替代具体协议或组件 API |
| Unified Semantic Contract | 结果渲染总协议 | 最终业务结果如何被前端自主渲染 | 不描述工具调用执行过程 |
| SemanticResultContract | Unified Semantic Contract 的核心数据结构 | screenType、regions、actions、evidence、source、componentBinding | 不承载完整 runtime trace |
| Runtime Display Protocol | 运行态展示协议 | Agent、Tool、Trace、Workflow、Streaming 状态 | 不替代业务结果协议 |
| AI Runtime UI | Runtime 类 region 的展示规范 | 执行步骤、模型状态、工具调用、错误重试 | 不定义新的 action/source/evidence 总协议 |
| Data Visualization UX | 数据展示交互域 | 指标卡、图表、表格、洞察、下钻、联动 | 不定义新的结果协议 |
| AI Trust UX | 可信体验域 | 证据、来源、置信度、风险提示、人工确认 | 不创建私有 evidence 结构 |
| Visual System | 视觉 token 层 | 字体、颜色、图标、间距、动效、阴影 | 不决定业务协议结构 |
| Frontend Engineering System | 工程约束层 | 渲染、性能、状态、缓存、响应式、组件注册 | 不直接定义业务语义 |
| Component Binding System | 渲染挂载层 | binding 到 renderer 的映射 | 不替代 SemanticResultContract |

---

## 5. Unified Semantic Contract

### 5.1 定义

Unified Semantic Contract 是系统唯一的最终业务结果渲染入口。

它定义 AI、Agent、后端服务或业务 API 产出的结果如何被前端解释、布局、渲染、交互、追溯与降级。

---

### 5.2 顶层结构

```ts
export interface SemanticResultContract {
  schemaVersion: string;
  resultId: string;
  conversationId?: string;
  messageId?: string;

  /** 页面或结果类型 */
  screenType: ScreenType;

  /** 语义区域，所有具体 UI 展示必须从 regions 进入 */
  regions: SemanticRegion[];

  /** 全局动作 */
  actions?: ActionContract[];

  /** 全局证据 */
  evidenceRefs?: EvidenceRef[];

  /** 全局来源 */
  sourceRefs?: SourceRef[];

  /** Runtime 引用，不承载完整 runtime 协议 */
  runtimeRefs?: RuntimeRef[];

  /** 布局提示，由前端自主解释 */
  layoutHints?: LayoutHints;

  /** 元信息 */
  meta?: SemanticResultMeta;
}
```

---

### 5.3 screenType

`screenType` 描述结果整体意图，不等于具体页面组件。

推荐枚举：

```ts
export type ScreenType =
  | "chat-answer"
  | "analysis-result"
  | "metric-explanation"
  | "report-result"
  | "dashboard-result"
  | "workflow-result"
  | "decision-support"
  | "asset-preview"
  | "error-result"
  | "empty-result";
```

规则：

1. `screenType` 只表达结果类型与页面意图。
2. `screenType` 不得指定具体 React 组件。
3. `screenType` 不得替代 `componentBinding`。
4. 相同 `screenType` 可以包含不同 `regions`。

---

### 5.4 regions

`regions` 是前端自主渲染的核心。

所有结构化展示内容都必须进入 `regions`。

```ts
export interface SemanticRegion<TData = unknown> {
  id: string;

  /** 区域语义类型 */
  regionType: RegionType;

  /** 唯一渲染挂载点 */
  componentBinding: ComponentBinding;

  title?: string;
  description?: string;

  /** 排序与重要性 */
  priority?: number;

  /** 区域数据，由 componentBinding 的子规范解释 */
  data: TData;

  /** 区域级动作，必须使用统一 ActionContract */
  actions?: ActionContract[];

  /** 区域级证据引用 */
  evidenceRefs?: string[];

  /** 区域级来源引用 */
  sourceRefs?: string[];

  /** Runtime 引用，只引用不复制 */
  runtimeRefs?: string[];

  /** 前端布局提示 */
  layout?: RegionLayoutHints;

  /** 权限、可见性、折叠策略 */
  visibility?: RegionVisibility;

  /** 降级渲染策略 */
  fallback?: RegionFallback;
}
```

推荐 `regionType`：

```ts
export type RegionType =
  | "summary"
  | "insight"
  | "metric"
  | "chart"
  | "table"
  | "markdown"
  | "evidence"
  | "source-list"
  | "runtime-status"
  | "workflow-trace"
  | "asset"
  | "form"
  | "decision"
  | "next-actions"
  | "error";
```

---

### 5.5 componentBinding

`componentBinding` 是语义区域进入前端渲染器的唯一挂载机制。

```ts
export type ComponentBinding =
  | "markdown-result"
  | "data-visualization"
  | "ai-runtime"
  | "workflow-trace"
  | "asset-reference"
  | "form-input"
  | "decision-card"
  | "evidence-panel"
  | "source-list"
  | "error-state";
```

规则：

1. 新增展示形态时，优先新增 component binding，而不是新增总协议。
2. component binding 只能定义局部 data shape 与 renderer 行为。
3. component binding 不得自定义顶层 action/evidence/source/runtime 结构。
4. component binding 必须支持 fallback 渲染。
5. component binding 必须注册到 Component Registry。

---

### 5.6 action contract

统一动作结构：

```ts
export interface ActionContract {
  id: string;
  type: ActionType;
  label: string;
  intent: ActionIntent;

  /** 用于执行动作的 payload 引用或轻量参数 */
  payload?: Record<string, unknown>;
  payloadRef?: string;

  /** 权限要求 */
  permission?: PermissionRequirement;

  /** 是否需要确认 */
  confirm?: ActionConfirm;

  /** 是否会触发异步任务 */
  async?: boolean;

  /** 动作执行后如何反馈 */
  feedback?: ActionFeedbackPolicy;

  /** 追踪与审计 */
  tracking?: ActionTrackingMeta;
}
```

推荐 `ActionType`：

```ts
export type ActionType =
  | "navigate"
  | "open-source"
  | "open-evidence"
  | "drill-down"
  | "continue-analysis"
  | "export"
  | "copy"
  | "save"
  | "create-task"
  | "run-workflow"
  | "retry"
  | "approve"
  | "reject"
  | "request-permission"
  | "toggle-view"
  | "filter"
  | "sort";
```

统一动作规则：

1. Tooltip、Drill-down、图表联动、导出、继续分析、重试、审批都必须复用 ActionContract。
2. 组件内部可以有 UI 事件，但跨组件、跨 region、跨系统的动作必须进入 ActionContract。
3. ActionContract 不应该包含具体组件实现细节。
4. 高风险动作必须带 `confirm` 与 `permission`。
5. 触发后端任务的动作必须带 `async: true` 或明确反馈策略。

---

### 5.7 evidenceRefs

统一证据结构：

```ts
export interface EvidenceRef {
  id: string;
  type: EvidenceType;
  title?: string;
  description?: string;

  /** 证据来源引用 */
  sourceRefIds?: string[];

  /** 证据对应的数据路径或片段 */
  dataPath?: string;
  quote?: string;
  metricRef?: string;

  /** 可信度、时间范围、生成方式 */
  confidence?: number;
  timeRange?: TimeRange;
  generatedBy?: "model" | "tool" | "human" | "system";

  /** 风险提示 */
  riskFlags?: string[];
}
```

推荐 `EvidenceType`：

```ts
export type EvidenceType =
  | "data-point"
  | "query-result"
  | "source-quote"
  | "calculation"
  | "model-inference"
  | "tool-output"
  | "human-note"
  | "system-log";
```

规则：

1. AI Insight 必须挂 evidenceRefs。
2. 风险判断必须挂 evidenceRefs。
3. 归因分析必须挂 evidenceRefs。
4. 指标解释必须挂 evidenceRefs。
5. 没有证据的结论必须显式标记为推断或建议。

---

### 5.8 sourceRefs

统一来源结构：

```ts
export interface SourceRef {
  id: string;
  type: SourceType;
  title?: string;
  uri?: string;

  /** 来源归属 */
  owner?: string;
  provider?: string;

  /** 数据时间 */
  createdAt?: string;
  updatedAt?: string;
  retrievedAt?: string;

  /** 权限与脱敏 */
  permission?: PermissionRequirement;
  redaction?: RedactionPolicy;

  /** 来源摘要 */
  summary?: string;
}
```

推荐 `SourceType`：

```ts
export type SourceType =
  | "database"
  | "api"
  | "file"
  | "document"
  | "dashboard"
  | "message"
  | "tool"
  | "workflow"
  | "external-url";
```

规则：

1. 所有可追溯内容必须引用 sourceRefs。
2. 前端不得从 renderer 私有字段中解析来源。
3. 权限不足时，sourceRefs 仍可展示脱敏摘要。
4. sourceRefs 是 AI Trust UX 的基础数据。

---

### 5.9 runtimeRefs

SemanticResultContract 可以引用 Runtime Display Protocol 中的 runtime 对象，但不应该复制完整 runtime trace。

```ts
export interface RuntimeRef {
  id: string;
  runId: string;
  type: "agent-run" | "tool-call" | "workflow-run" | "trace" | "stream";
  label?: string;
  status?: RuntimeStatus;
}
```

规则：

1. `runtimeRefs` 只做引用，不承载完整 Runtime Display Protocol。
2. 需要展示 runtime 时，通过 `componentBinding = "ai-runtime"` 或 `componentBinding = "workflow-trace"` 绑定到 runtime renderer。
3. Runtime 的状态流、事件流、日志、重试、错误恢复应由 Runtime Display Protocol 管理。

---

## 6. Runtime Display Protocol

### 6.1 定义

Runtime Display Protocol 是系统唯一的运行态展示协议。

它描述 AI、Agent、Tool、Workflow 在执行过程中的状态、事件、Trace、错误、重试和可观测性信息。

---

### 6.2 Runtime 与 Semantic Result 的关系

```txt
Runtime Display Protocol
= 过程
= AI 是如何执行的

Unified Semantic Contract
= 结果
= 最终给用户看什么
```

两者可以通过 `runtimeRefs` 与 `componentBinding = "ai-runtime"` 连接，但不能互相替代。

---

### 6.3 推荐结构

```ts
export interface RuntimeDisplayProtocol {
  protocolVersion: string;
  runId: string;
  conversationId?: string;
  messageId?: string;

  state: RuntimeStatus;
  startedAt?: string;
  endedAt?: string;

  agents?: AgentRuntimeState[];
  toolCalls?: ToolCallState[];
  workflow?: WorkflowRuntimeState;
  stream?: StreamingState;
  events?: RuntimeEvent[];
  errors?: RuntimeError[];

  actions?: ActionContract[];
  observability?: RuntimeObservability;
}
```

推荐 Runtime 状态：

```ts
export type RuntimeStatus =
  | "idle"
  | "queued"
  | "running"
  | "streaming"
  | "waiting-for-user"
  | "waiting-for-tool"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "retrying"
  | "partially-succeeded";
```

推荐 Runtime Event：

```ts
export interface RuntimeEvent {
  id: string;
  type:
    | "agent.started"
    | "agent.completed"
    | "tool.called"
    | "tool.succeeded"
    | "tool.failed"
    | "workflow.step.started"
    | "workflow.step.completed"
    | "stream.chunk"
    | "stream.completed"
    | "runtime.error"
    | "runtime.retry"
    | "user.approval.required";

  timestamp: string;
  status?: RuntimeStatus;
  title?: string;
  summary?: string;
  payload?: Record<string, unknown>;
  sourceRefs?: string[];
  evidenceRefs?: string[];
}
```

---

### 6.4 Runtime UI 展示规则

AI Runtime UI 是 Runtime Display Protocol 的展示规范，不是新的顶层协议。

AI Runtime UI 可在 SemanticResultContract 中通过以下方式展示：

```txt
regions[].componentBinding = "ai-runtime"
```

但 `ai-runtime` region 不应重新定义 runtime 总协议，只应引用 Runtime Display Protocol 中的数据。

---

## 7. Data Visualization UX

### 7.1 定位

Data Visualization UX 是 Interaction System 下的数据展示交互域，同时也是 Unified Semantic Contract 中的一个 component binding 渲染域。

它不是新的总协议。

正确定位：

```txt
Interaction System
└─ Data Visualization UX

Unified Semantic Contract
└─ regions[].componentBinding = "data-visualization"
```

---

### 7.2 覆盖范围

Data Visualization UX 覆盖：

- 指标卡
- KPI Summary
- 表格
- 图表
- 趋势分析
- 对比分析
- Sankey
- 路径分析
- Funnel
- Cohort
- Drill-down
- Tooltip
- 图表联动
- 导出
- 继续分析
- AI Insight
- 异常解释
- 归因分析

---

### 7.3 与 Semantic Contract 的关系

Data Visualization 的所有结果必须进入：

```txt
SemanticResultContract.regions[]
```

示例：

```json
{
  "id": "region-roas-trend",
  "regionType": "chart",
  "componentBinding": "data-visualization",
  "title": "ROAS 趋势分析",
  "data": {
    "vizType": "line-chart",
    "metric": "roas",
    "dimensions": ["date"],
    "datasetRef": "dataset-roas-daily"
  },
  "actions": [
    {
      "id": "drilldown-by-campaign",
      "type": "drill-down",
      "label": "按 Campaign 下钻",
      "intent": "analyze-dimension",
      "payload": {
        "dimension": "campaign"
      }
    }
  ],
  "evidenceRefs": ["ev-roas-calc"],
  "sourceRefs": ["src-ads-db"]
}
```

---

### 7.4 VizSpec 的边界

可以存在 `VizSpec`，但它只能是 `SemanticResultContract.regions[].data` 的子结构。

正确：

```txt
SemanticResultContract
└─ regions[]
   └─ componentBinding = "data-visualization"
      └─ data: VizSpec
```

错误：

```txt
VizSpec 替代 SemanticResultContract
VizSpec 自己定义 actions
VizSpec 自己定义 evidence
VizSpec 自己定义 sources
VizSpec 自己定义 regions
```

---

### 7.5 AI Insight 的双重归属

AI Insight 同时属于：

```txt
Data Visualization UX
AI Trust UX
```

原因：

- 它是数据结果的一种展示形态。
- 它也是 AI 对数据的解释、判断、建议，因此必须具备可信机制。

AI Insight 必须满足：

1. 必须挂 evidenceRefs。
2. 必须挂 sourceRefs。
3. 必须标明是否为模型推断。
4. 必须支持查看证据。
5. 高风险建议必须支持人工确认。
6. 后续动作必须走统一 action contract。

---

## 8. AI Trust UX

### 8.1 定位

AI Trust UX 是 Interaction System 下的可信体验域。

它用于保证 AI 输出的结论、洞察、建议、归因、风险判断可追溯、可解释、可确认、可审计。

---

### 8.2 覆盖范围

AI Trust UX 覆盖：

- Evidence 展示
- Source 展示
- Citation / 引用
- Confidence
- 推断标记
- 数据新鲜度
- 风险提示
- 脱敏提示
- 权限提示
- 人工确认
- 反事实解释
- 错误恢复
- 审计记录

---

### 8.3 强制规则

以下内容必须挂 evidenceRefs/sourceRefs：

- 指标异常判断
- 归因结论
- 优化建议
- 风险判断
- 预算调整建议
- 自动化执行建议
- AI Insight
- 报告摘要中的关键结论
- 影响业务决策的任何断言

---

## 9. AI Chat System

### 9.1 定位

AI Chat System 是 Enterprise AI Chat OS 的核心产品体验系统，负责会话生命周期、消息展示、输入、流式生成、上下文恢复与长历史处理。

---

### 9.2 覆盖范围

AI Chat System 包含：

- Conversation List
- Conversation Detail
- Message Surface
- Message Renderer
- Streaming Output
- Long Conversation Loading
- Context Compression
- Message Search
- Message Jump
- Attachment / Artifact
- Prompt Shortcut
- Slash Command
- Mention
- Multi-modal Input
- AI Response Feedback

---

### 9.3 长会话加载全局规范

会话历史不得一次性全量加载。

必须采用：

```txt
会话列表轻量化
+ 消息窗口化
+ 向上滚动加载历史
+ 虚拟列表
+ Artifact 懒加载
+ 历史摘要压缩
```

强制规则：

1. 会话列表接口不得返回完整 messages。
2. 打开会话时默认只加载最近 N 条消息。
3. 向上滚动加载更早消息，使用 cursor 或 before_message_id。
4. 超过阈值的消息列表必须使用虚拟滚动。
5. evidence_bundle、execution_context、raw_result、visualizations 不进入首屏消息加载。
6. 搜索消息必须走后端 search API，不允许前端全量加载后过滤。
7. 支持 around_message_id 的消息窗口加载，用于搜索跳转和引用跳转。
8. 大表格、图表、文件必须作为 artifact_ref 懒加载。
9. 前端状态只保留当前窗口所需消息，不保留全量历史。
10. 长会话必须支持 summary block 折叠展示。

---

## 10. Frontend Engineering System

### 10.1 定位

Frontend Engineering System 是 Enterprise AI Chat OS 的工程约束层，负责保证系统在复杂 AI 场景下仍然可维护、可扩展、可观测、可高性能运行。

---

### 10.2 Rendering Architecture

必须支持：

- Contract-driven rendering
- Component Registry
- Renderer fallback
- Error boundary
- Region-level lazy loading
- Streaming rendering
- Virtual list
- Markdown chunk rendering
- Large artifact lazy hydration
- Suspense / async boundary

---

### 10.3 Frontend Autonomous Rendering Engine

前端自主渲染引擎负责：

```txt
SemanticResultContract
    ↓
validate contract
    ↓
resolve screenType
    ↓
sort regions
    ↓
resolve componentBinding
    ↓
load renderer
    ↓
render region
    ↓
connect actions/evidence/source/runtime
```

推荐结构：

```ts
export interface ComponentRenderer<TData = unknown> {
  binding: ComponentBinding;
  validate?: (data: unknown) => data is TData;
  render: (props: RegionRenderProps<TData>) => React.ReactNode;
  fallback?: (props: RegionFallbackProps) => React.ReactNode;
}
```

---

### 10.4 Component Registry

Component Registry 是 componentBinding 到前端 renderer 的映射表。

规则：

1. 所有 componentBinding 必须注册。
2. 未注册 binding 必须进入 fallback 渲染。
3. renderer 不得直接绕过 ActionContract。
4. renderer 不得私有化 Evidence/Source 结构。
5. renderer 必须处理权限不足、数据为空、加载失败、移动端降级。

---

### 10.5 Performance

性能规范必须覆盖：

- 首屏加载
- 会话列表分页
- 消息窗口加载
- 虚拟列表
- Markdown 渲染性能
- 图表渲染性能
- 大表格分页与列虚拟化
- Trace Timeline 虚拟化
- Workflow DAG 渲染
- 图片与附件懒加载
- Bundle splitting
- Code splitting
- Memoization
- Web Worker / Offscreen 计算
- Streaming backpressure
- 移动端降级

---

### 10.6 State Management

推荐状态分层：

```txt
Server Cache State
= conversation list / messages / artifacts / semantic results / runtime states

UI State
= selected panel / expanded region / active tab / local filter / modal state

Ephemeral Runtime State
= streaming chunks / pending actions / optimistic updates

Persistent User Preference
= layout preference / theme / density / pinned panels
```

规则：

1. 不得把全量历史消息放入全局状态。
2. 不得把大表格全量数据塞入普通 React state。
3. Runtime streaming chunk 应有生命周期清理。
4. SemanticResultContract 应作为 server cache 或 immutable snapshot 管理。
5. UI 展开状态不得污染协议数据。

---

### 10.7 Responsive System

响应式设计必须覆盖：

- Desktop
- Wide Screen
- Tablet
- Mobile
- Split Pane
- Drawer Mode
- Bottom Sheet
- Command Palette
- Single Column Degradation
- Chart Mobile Simplification
- Table Mobile Transformation
- Runtime Timeline Collapse

---

### 10.8 Accessibility

必须覆盖：

- Keyboard Navigation
- Focus Ring
- ARIA
- Screen Reader
- Color Contrast
- Reduced Motion
- High Contrast Mode
- Semantic HTML
- Accessible Table
- Accessible Chart Summary
- Tooltip 可访问性
- Modal / Drawer Focus Trap

---

## 11. Visual System

Visual System 是所有 componentBinding 共享的视觉基础，不属于任何单一业务模块。

### 11.1 Typography

覆盖：

- 字体族
- 字号
- 字重
- 行高
- 字间距
- 标题层级
- Body / Label / Caption
- 等宽字体
- 数字字体
- 中英文混排
- Markdown 排版
- Code Block 排版

---

### 11.2 Color System

覆盖：

- 主色
- 功能色
- 中性色
- 背景层级
- Border
- Divider
- Hover / Active / Disabled
- Focus Ring
- Risk Level
- AI State Color
- Chart Palette
- Dark Mode
- 透明度
- 渐变

---

### 11.3 Icon System

覆盖：

- 图标库
- 图标尺寸
- 描边粗细
- Filled / Outlined
- 状态图标
- 数据类图标
- Runtime 图标
- Workflow 图标
- AI Trust 图标
- Hover / Active / Disabled
- 图标与文字间距

---

### 11.4 Spacing / Radius / Shadow / Motion

覆盖：

- Spacing scale
- 页面边距
- Card padding
- Section gap
- Modal spacing
- Drawer spacing
- Radius token
- Border token
- Elevation token
- Motion duration
- Easing
- Skeleton
- Streaming animation
- Loading animation
- Tooltip animation

---

## 12. Interaction System

Interaction System 定义用户如何与 AI Chat OS 交互。

必须覆盖：

- Conversation UX
- Input UX
- Feedback UX
- Data Visualization UX
- AI Runtime UX
- Workflow UX
- AI Trust UX
- Permission UX
- Security UX

所有交互域共享：

```txt
ActionContract
EvidenceRef
SourceRef
Visual Token
Frontend Engineering Constraints
```

---

## 13. 文档目录建议

建议项目目录采用：

```txt
docs/
└─ architecture/
   ├─ ENTERPRISE_AI_CHAT_OS_SPEC.md
   │
   ├─ visual-system/
   │  ├─ typography.md
   │  ├─ color-system.md
   │  ├─ icon-system.md
   │  ├─ spacing-system.md
   │  └─ motion-system.md
   │
   ├─ interaction-system/
   │  ├─ conversation-ux.md
   │  ├─ input-ux.md
   │  ├─ feedback-system.md
   │  ├─ data-visualization-ux.md
   │  ├─ ai-runtime-ux.md
   │  ├─ ai-trust-ux.md
   │  └─ workflow-ux.md
   │
   ├─ semantic-contract/
   │  ├─ semantic-result-contract.md
   │  ├─ action-contract.md
   │  ├─ evidence-contract.md
   │  ├─ source-contract.md
   │  ├─ component-binding.md
   │  └─ screen-type-spec.md
   │
   ├─ runtime/
   │  ├─ runtime-display-protocol.md
   │  ├─ agent-runtime-ui.md
   │  ├─ workflow-trace-protocol.md
   │  └─ streaming-state-spec.md
   │
   ├─ frontend-engineering/
   │  ├─ rendering-architecture.md
   │  ├─ autonomous-rendering-engine.md
   │  ├─ component-registry.md
   │  ├─ performance-spec.md
   │  ├─ state-management.md
   │  ├─ virtualization-spec.md
   │  └─ responsive-system.md
   │
   └─ component-system/
      ├─ markdown-renderer.md
      ├─ data-visualization-renderer.md
      ├─ runtime-renderer.md
      ├─ workflow-renderer.md
      └─ asset-renderer.md
```

---

## 14. Codex CLI 实施指导

### 14.1 遍历目标

Codex CLI 遍历代码库时，应优先识别以下内容：

1. 是否存在多个 UI schema。
2. 是否存在多个 action 定义。
3. 是否存在多个 evidence/source 定义。
4. Data Visualization 是否绕过 SemanticResultContract。
5. Runtime UI 是否把 trace/tool call 直接塞进业务结果结构。
6. 组件是否直接依赖后端 UI 字段。
7. 大表格、大图表、长消息是否全量加载。
8. 组件是否缺少 fallback。
9. componentBinding 是否存在统一 registry。
10. AI Insight 是否缺少 evidence/source。

---

### 14.2 需要收口的常见重复结构

如果发现以下命名，应判断是否需要迁移到统一协议：

```txt
UISchema
GoldenSchema
ReportQueryViewModel
MetricExplainerUISchema
ChartSchema
TableSchema
InsightSchema
AgentUISchema
RuntimeUISchema
WorkflowUISchema
ToolResultSchema
ActionButtonSchema
CardAction
ChartAction
MetricAction
EvidenceBundle
CitationList
SourceList
TraceViewModel
```

迁移方向：

```txt
最终结果 → SemanticResultContract
具体展示 → regions[].componentBinding
用户动作 → ActionContract
证据 → EvidenceRef
来源 → SourceRef
执行过程 → Runtime Display Protocol
Runtime 展示 → componentBinding = "ai-runtime" / "workflow-trace"
数据展示 → componentBinding = "data-visualization"
```

---

### 14.3 重构原则

Codex CLI 修改代码时必须遵循：

1. 不新增平行的总协议。
2. 不新增私有 action 协议。
3. 不新增私有 evidence/source 协议。
4. 不让后端返回具体 React 组件名控制 UI。
5. 不把完整 runtime trace 复制进 SemanticResultContract。
6. 不让 Data Visualization 替代 SemanticResultContract。
7. 不让 AI Runtime UI 替代 Runtime Display Protocol。
8. 不把大数据、大表格、大附件放进首屏消息 payload。
9. 不把全量会话历史放进前端全局状态。
10. 所有新 renderer 必须注册 componentBinding，并提供 fallback。

---

### 14.4 推荐实施阶段

#### Phase 1: 概念与类型收口

目标：建立统一类型与目录。

建议动作：

1. 新增 `SemanticResultContract` 类型定义。
2. 新增 `ActionContract` 类型定义。
3. 新增 `EvidenceRef` / `SourceRef` 类型定义。
4. 新增 `RuntimeDisplayProtocol` 类型定义。
5. 新增 `ComponentBinding` 类型定义。
6. 新增 Component Registry。
7. 标记旧 schema 为 deprecated。

---

#### Phase 2: Renderer 收口

目标：所有结果展示经过 componentBinding 渲染。

建议动作：

1. 建立 `markdown-result` renderer。
2. 建立 `data-visualization` renderer。
3. 建立 `ai-runtime` renderer。
4. 建立 `workflow-trace` renderer。
5. 建立 `asset-reference` renderer。
6. 为所有 renderer 增加 fallback。
7. 为所有 renderer 接入统一 action/evidence/source。

---

#### Phase 3: 性能与交互治理

目标：修复长会话、大数据、Streaming、Trace、Workflow 的性能风险。

建议动作：

1. 会话列表改为轻量分页。
2. 消息详情改为窗口加载。
3. 消息列表接入虚拟滚动。
4. Artifact 懒加载。
5. 大表格分页与列虚拟化。
6. 图表懒加载与降级。
7. Runtime Timeline 虚拟化。
8. Workflow DAG 懒渲染。
9. 搜索改为后端 search API。
10. around_message_id 支持跳转窗口加载。

---

#### Phase 4: Trust 与治理增强

目标：所有 AI 结论可追溯、可解释、可审计。

建议动作：

1. AI Insight 增加 evidenceRefs/sourceRefs。
2. 风险建议增加确认机制。
3. 权限不足增加脱敏展示。
4. 关键动作增加 audit tracking。
5. 数据新鲜度展示。
6. 置信度与推断标记展示。
7. Source panel / Evidence panel 统一化。

---

## 15. 验收清单

### 15.1 架构验收

- [ ] 项目存在 Enterprise AI Chat OS 总纲文档。
- [ ] Unified Semantic Contract 是唯一最终业务结果协议。
- [ ] Runtime Display Protocol 是唯一运行态展示协议。
- [ ] Data Visualization UX 没有成为平行总协议。
- [ ] AI Runtime UI 没有成为平行总协议。
- [ ] Component Binding System 是唯一渲染挂载机制。

---

### 15.2 协议验收

- [ ] 所有最终结果都有 `screenType`。
- [ ] 所有结构化展示都进入 `regions[]`。
- [ ] 所有 region 都有 `componentBinding`。
- [ ] 所有用户动作都走 `ActionContract`。
- [ ] 所有结论、洞察、风险判断都挂 `evidenceRefs/sourceRefs`。
- [ ] Runtime 过程不直接污染 SemanticResultContract。
- [ ] runtimeRefs 只引用，不复制完整 runtime trace。

---

### 15.3 前端验收

- [ ] 所有 componentBinding 都注册到 Component Registry。
- [ ] 未知 binding 有 fallback。
- [ ] renderer 有错误边界。
- [ ] 长消息使用窗口加载与虚拟化。
- [ ] 大表格分页或虚拟化。
- [ ] 图表按需加载。
- [ ] Artifact 懒加载。
- [ ] 搜索不依赖前端全量数据。
- [ ] 移动端有降级策略。

---

### 15.4 Trust 验收

- [ ] AI Insight 可查看证据。
- [ ] 关键结论可查看来源。
- [ ] 风险建议有确认机制。
- [ ] 权限不足有清晰反馈。
- [ ] 数据新鲜度可见。
- [ ] 推断类内容明确标识。

---

## 16. 反模式清单

以下情况应视为架构风险：

1. 某个业务模块新增独立 UI schema，并试图绕过 SemanticResultContract。
2. Data Visualization 自己定义完整 action/source/evidence。
3. Runtime UI 把完整 trace 塞进业务结果 payload。
4. 后端返回具体 React 组件名。
5. 前端根据后端返回的 CSS class 渲染核心业务 UI。
6. 图表点击、表格下钻、继续分析各自定义动作结构。
7. AI Insight 没有 evidenceRefs/sourceRefs。
8. 会话打开时一次性加载全部历史。
9. 大表格直接塞进消息 Markdown。
10. Renderer 没有 fallback。
11. 组件状态污染协议数据。
12. Visual token 与业务组件样式硬编码混用。
13. Workflow Trace 与业务结果结构混在一起。
14. Source / Citation / Evidence 多套结构并存。
15. 新增协议没有明确归属到 Result Plane 或 Runtime Plane。

---

## 17. 示例：完整 Semantic Result

```json
{
  "schemaVersion": "1.0",
  "resultId": "result-20260527-001",
  "conversationId": "conv-001",
  "messageId": "msg-009",
  "screenType": "analysis-result",
  "regions": [
    {
      "id": "summary",
      "regionType": "summary",
      "componentBinding": "markdown-result",
      "title": "分析摘要",
      "data": {
        "markdown": "过去 7 天 ROAS 下降主要由 Campaign A 转化率下滑和 CPC 上升共同导致。"
      },
      "evidenceRefs": ["ev-001", "ev-002"],
      "sourceRefs": ["src-ads-db"]
    },
    {
      "id": "roas-trend-chart",
      "regionType": "chart",
      "componentBinding": "data-visualization",
      "title": "ROAS 趋势",
      "data": {
        "vizType": "line-chart",
        "datasetRef": "dataset-roas-7d",
        "x": "date",
        "y": "roas"
      },
      "actions": [
        {
          "id": "drilldown-campaign",
          "type": "drill-down",
          "label": "按 Campaign 下钻",
          "intent": "analyze-dimension",
          "payload": {
            "dimension": "campaign"
          }
        }
      ],
      "evidenceRefs": ["ev-001"],
      "sourceRefs": ["src-ads-db"]
    },
    {
      "id": "runtime-status",
      "regionType": "runtime-status",
      "componentBinding": "ai-runtime",
      "title": "分析执行过程",
      "data": {
        "runtimeRefId": "runtime-run-001",
        "displayMode": "collapsed"
      },
      "runtimeRefs": ["runtime-run-001"]
    }
  ],
  "actions": [
    {
      "id": "continue-analysis",
      "type": "continue-analysis",
      "label": "继续分析预算优化方案",
      "intent": "continue-analysis",
      "payload": {
        "topic": "budget-optimization"
      },
      "async": true
    },
    {
      "id": "export-report",
      "type": "export",
      "label": "导出报告",
      "intent": "export-result",
      "payload": {
        "format": "pdf"
      }
    }
  ],
  "evidenceRefs": [
    {
      "id": "ev-001",
      "type": "query-result",
      "title": "ROAS 7 日趋势查询结果",
      "sourceRefIds": ["src-ads-db"],
      "confidence": 0.97
    },
    {
      "id": "ev-002",
      "type": "calculation",
      "title": "CPC 与 CVR 对 ROAS 的影响拆解",
      "sourceRefIds": ["src-ads-db"],
      "confidence": 0.91
    }
  ],
  "sourceRefs": [
    {
      "id": "src-ads-db",
      "type": "database",
      "title": "广告投放数据仓库",
      "provider": "internal-ads-warehouse",
      "retrievedAt": "2026-05-27T10:00:00+08:00"
    }
  ],
  "runtimeRefs": [
    {
      "id": "runtime-run-001",
      "runId": "run-001",
      "type": "agent-run",
      "label": "ROAS 分析 Agent Run",
      "status": "succeeded"
    }
  ]
}
```

---

## 18. 示例：Runtime Display Protocol

```json
{
  "protocolVersion": "1.0",
  "runId": "run-001",
  "conversationId": "conv-001",
  "messageId": "msg-009",
  "state": "succeeded",
  "startedAt": "2026-05-27T09:59:00+08:00",
  "endedAt": "2026-05-27T10:00:00+08:00",
  "agents": [
    {
      "id": "agent-metric-analyst",
      "name": "Metric Analyst Agent",
      "status": "succeeded"
    }
  ],
  "toolCalls": [
    {
      "id": "tool-query-roas",
      "toolName": "ads_warehouse_query",
      "status": "succeeded",
      "startedAt": "2026-05-27T09:59:10+08:00",
      "endedAt": "2026-05-27T09:59:20+08:00"
    }
  ],
  "events": [
    {
      "id": "event-001",
      "type": "agent.started",
      "timestamp": "2026-05-27T09:59:00+08:00",
      "status": "running",
      "title": "开始分析 ROAS 变化"
    },
    {
      "id": "event-002",
      "type": "tool.called",
      "timestamp": "2026-05-27T09:59:10+08:00",
      "status": "running",
      "title": "查询广告数据仓库"
    },
    {
      "id": "event-003",
      "type": "tool.succeeded",
      "timestamp": "2026-05-27T09:59:20+08:00",
      "status": "succeeded",
      "title": "数据查询完成"
    },
    {
      "id": "event-004",
      "type": "agent.completed",
      "timestamp": "2026-05-27T10:00:00+08:00",
      "status": "succeeded",
      "title": "分析完成"
    }
  ],
  "actions": [
    {
      "id": "retry-run",
      "type": "retry",
      "label": "重新执行",
      "intent": "retry-runtime-run",
      "payload": {
        "runId": "run-001"
      }
    }
  ]
}
```

---

## 19. 后续新增能力归属判断

新增任何能力前，必须先回答：

```txt
1. 它属于最终业务结果，还是执行过程？
2. 如果是结果，是否应进入 SemanticResultContract？
3. 如果是过程，是否应进入 Runtime Display Protocol？
4. 它是否只是一个新的展示形态？如果是，应新增 componentBinding。
5. 它是否需要用户动作？如果是，必须走 ActionContract。
6. 它是否包含结论或建议？如果是，必须挂 EvidenceRef / SourceRef。
7. 它是否影响性能？如果是，必须进入 Frontend Engineering System 约束。
8. 它是否影响交互体验？如果是，必须归入 Interaction System。
9. 它是否需要新的视觉 token？如果是，必须归入 Visual System。
10. 它是否真的需要新增协议？如果需要，为什么不能复用现有协议？
```

---

## 20. 最终收口规则

本项目后续所有 UI、UX、Runtime、Data Visualization、Workflow、Agent、Frontend Engineering 相关设计与实现，必须遵循以下收口规则：

```txt
Enterprise AI Chat OS
= 总体系

Unified Semantic Contract
= 最终业务结果的唯一语义渲染协议

Runtime Display Protocol
= AI / Agent / Tool / Workflow 执行过程的唯一展示协议

Component Binding System
= 具体展示形态进入前端 renderer 的唯一挂载机制

ActionContract
= 所有用户可点击动作的统一动作协议

EvidenceRef / SourceRef
= 所有结论、洞察、风险、建议的统一可信机制

Frontend Engineering System
= 所有性能、状态、渲染、响应式、可观测性的统一工程约束
```

禁止规则：

```txt
不得新增平行总协议。
不得让 Data Visualization UX 替代 Unified Semantic Contract。
不得让 AI Runtime UI 替代 Runtime Display Protocol。
不得让具体 renderer 私有化 action/evidence/source。
不得让后端直接控制具体 UI 组件。
不得把执行过程和最终业务结果混为一个协议。
```

---

## 21. 推荐文档标题与文件名

推荐文件名：

```txt
docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md
```

推荐中文标题：

```txt
企业级 AI Chat OS 架构与设计总规范
```

推荐英文标题：

```txt
Enterprise AI Chat OS Architecture & Design Specification
```

---

## 22. 结论

Enterprise AI Chat OS 是项目的顶层系统地图。

Unified Semantic Contract 负责最终业务结果如何被前端自主渲染。

Runtime Display Protocol 负责 AI、Agent、Tool、Workflow 的执行过程如何被展示。

Data Visualization UX 与 AI Runtime UX 都是 Interaction System 下的体验域，同时可以通过 `regions[].componentBinding` 在 SemanticResultContract 中被渲染。

所有新增能力必须挂载到现有体系中，不得创建平行协议体系。

