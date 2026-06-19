# AI Chat OS Execution Layer Pack — Combined Markdown

> Generated combined file. Prefer the folder structure in the zip for implementation.



---

<!-- Source: MANIFEST.json -->


# MANIFEST.json

```json
{
  "name": "AI_CHAT_OS_EXECUTION_LAYER_PACK",
  "version": "1.0.0",
  "created_at": "2026-05-28",
  "purpose": "Executable implementation layer for Enterprise AI Chat OS contracts, registry, adapters, guardrails and golden examples.",
  "depends_on": [
    "ENTERPRISE_AI_CHAT_OS_SPEC.md",
    "AI_CHAT_OS_SPEC_EXTENSION_PACK",
    "frontend/src/src/contracts semantic/runtime/renderer type true source"
  ],
  "primary_entry": "docs/architecture/01_EXECUTION_LAYER_INDEX.md",
  "key_files": [
    "frontend/src/src/contracts/validation/semantic-result-validator.ts",
    "frontend/src/src/contracts/validation/runtime-display-validator.ts",
    "frontend/src/src/contracts/renderer/component-registry-runtime.ts",
    "frontend/src/src/contracts/adapters/legacy-to-semantic.ts",
    "frontend/src/src/contracts/adapters/legacy-to-runtime.ts",
    "frontend/src/src/contracts/adapters/report-trend-adapter.ts",
    "frontend/src/src/contracts/examples/golden/semantic-result.report-trend.json",
    "scripts/guardrails/check-contract-governance.ts"
  ]
}

```



---

<!-- Source: README.md -->


# AI Chat OS Execution Layer Pack

> 配套 `ENTERPRISE_AI_CHAT_OS_SPEC.md` 与上一轮二级规范包。  
> 本包不是新增顶层概念，而是把“总纲 + 子规范 + 类型真源”推进到可执行落地层：运行时校验、组件注册、适配器、Golden Examples、Guardrail、Observability，以及首个业务用例“问数趋势展示”的契约化落地。

## 0. 本包定位

当前系统已经具备：

```txt
ENTERPRISE_AI_CHAT_OS_SPEC.md
00_SPEC_INDEX.md
semantic-contract/*
runtime/*
frontend-engineering/*
interaction-system/*
visual-system/visual-system-breakdown.md
migration/legacy-contract-mapping.md
frontend/src/src/contracts/* 类型真源
```

本包补齐的是：

```txt
1. Contract 运行时校验
2. Component Registry 实际实现
3. Legacy Schema -> SemanticResultContract / RuntimeDisplayProtocol 适配层
4. 问数趋势展示契约化实现
5. Golden Examples 与测试断言
6. Prompt / Runtime / Contract 的关系规范
7. Guardrail 深化检查
8. Observability / Audit 可执行事件结构
9. Visual System 独立治理文档拆分
```

## 1. 推荐落地路径

将本包内容复制到项目根目录后，建议形成：

```txt
项目根目录/
├─ docs/
│  └─ architecture/
│     ├─ 01_EXECUTION_LAYER_INDEX.md
│     ├─ semantic-contract/runtime-validation.md
│     ├─ frontend-engineering/component-registry-implementation.md
│     ├─ migration/contract-adapter-implementation.md
│     ├─ use-cases/report-trend-contract.md
│     ├─ prompting/prompt-runtime-contract.md
│     ├─ examples/golden-example-spec.md
│     ├─ guardrails/contract-guardrails.md
│     ├─ observability/audit-telemetry.md
│     └─ visual-system/
│        ├─ typography.md
│        ├─ color-system.md
│        ├─ icon-system.md
│        ├─ spacing-system.md
│        ├─ radius-border-system.md
│        ├─ elevation-shadow-system.md
│        └─ motion-system.md
│
├─ frontend/src/src/contracts/
│  ├─ validation/
│  ├─ renderer/
│  ├─ adapters/
│  ├─ observability/
│  ├─ examples/golden/
│  └─ __tests__/
│
└─ scripts/guardrails/
   └─ check-contract-governance.ts
```

如你的项目实际路径不是 `frontend/src/src/contracts`，请整体移动到当前类型真源所在目录，并保持内部相对 import 不变。

## 2. 推荐实施顺序

```txt
P0. 引入 validation/*，先让契约失败可以被显式捕获。
P0. 引入 examples/golden/* 与 __tests__/*，建立回归样例。
P1. 引入 renderer/component-registry-runtime.ts，建立统一 renderer 入口和 fallback。
P1. 引入 adapters/*，先把旧链路映射到 SemanticResultContract / RuntimeDisplayProtocol。
P1. 将问数趋势展示改造为 report-trend contract，用 validator 保护。
P2. 将 ChatContainer / ReportQueryResultCard 改为消费 registry.renderResult()/renderRegion()。
P2. 接入 observability/*，记录 action、renderer error、runtime latency、contract version。
P3. 启用 scripts/guardrails/check-contract-governance.ts 作为 CI 检查。
P3. 拆分 visual-system 文档，不改 5 月 27 的字体与色彩真源值。
```

## 3. 最重要的收口规则

```txt
凡是最终业务结果展示，必须先变成 SemanticResultContract。
凡是执行过程展示，必须先变成 RuntimeDisplayProtocol。
凡是具体 UI 渲染，只能通过 Component Registry 的 renderer 处理。
凡是用户动作，只能使用 ActionContract。
凡是洞察、判断、风险建议，必须挂 evidenceRefs / sourceRefs。
凡是旧 schema，只能作为 adapter 输入，不能作为最终页面渲染协议。
```

## 4. Codex CLI 第一轮指令建议

```txt
请根据 docs/architecture/01_EXECUTION_LAYER_INDEX.md 执行第一轮可执行落地：
1. 将 frontend/src/src/contracts/validation/* 引入项目。
2. 将 examples/golden/* 纳入测试。
3. 在最终结果渲染入口调用 validateSemanticResultContract。
4. 在 runtime 展示入口调用 validateRuntimeDisplayProtocol。
5. 将旧 ResponseContract / ReportQueryResult / ReportQueryViewModel / MetricExplainerUISchema / VizSpec / AgentProcessEvent 通过 adapters/* 转成新契约。
6. 禁止用户页面直接消费旧私有 schema 作为最终结果。
7. 建立 Component Registry，所有 region 渲染必须通过 registry.resolve(binding) 后执行。
```



---

<!-- Source: docs/architecture/01_EXECUTION_LAYER_INDEX.md -->


# AI Chat OS 可执行落地层索引

## 1. 文档关系

```txt
ENTERPRISE_AI_CHAT_OS_SPEC.md
└─ 定义 Enterprise AI Chat OS 顶层边界

00_SPEC_INDEX.md
└─ 定义二级规范地图

本文件 01_EXECUTION_LAYER_INDEX.md
└─ 定义可执行落地层：validator / adapter / registry / golden / guardrail / observability
```

## 2. 本层解决的问题

二级规范解决“应该是什么”。可执行落地层解决“代码如何保证它一定发生”。

| 问题 | 可执行落点 |
|---|---|
| LLM / 后端输出结构错误 | `validation/*` |
| 旧 schema 继续扩散 | `adapters/*` + guardrail |
| renderer 各自判断 binding | `component-registry-runtime.ts` |
| 图表动作、表格按钮、卡片 CTA 分裂 | `ActionContract` validator + guardrail |
| AI Insight 没证据 | semantic validator + AI Trust UX rule |
| Runtime 与 Result 混用 | Runtime validator + runtimeRefs 规则 |
| 趋势图只有一个日期点还画趋势 | report-trend validator |
| 无法回归 | golden examples + tests |
| 无法追踪线上错误 | observability telemetry contract |

## 3. 目录清单

```txt
docs/architecture/semantic-contract/runtime-validation.md
frontend/src/src/contracts/validation/contract-validator.ts
frontend/src/src/contracts/validation/semantic-result-validator.ts
frontend/src/src/contracts/validation/action-validator.ts
frontend/src/src/contracts/validation/runtime-display-validator.ts
frontend/src/src/contracts/validation/renderer-data-validator.ts

frontend/src/src/contracts/renderer/component-registry-runtime.ts
frontend/src/src/contracts/renderer/default-renderers.ts
frontend/src/src/contracts/renderer/RendererErrorBoundary.tsx

docs/architecture/migration/contract-adapter-implementation.md
frontend/src/src/contracts/adapters/legacy-to-semantic.ts
frontend/src/src/contracts/adapters/legacy-to-runtime.ts
frontend/src/src/contracts/adapters/report-trend-adapter.ts

docs/architecture/use-cases/report-trend-contract.md
frontend/src/src/contracts/validation/report-trend-validator.ts
frontend/src/src/contracts/examples/golden/*.json
frontend/src/src/contracts/__tests__/contract-validation.test.ts

scripts/guardrails/check-contract-governance.ts
frontend/src/src/contracts/observability/telemetry-contract.ts
```

## 4. 实施优先级

### P0：运行时校验

先在以下边界加入 validator：

```txt
后端响应进入前端缓存之前
LLM structured output 进入消息模型之前
消息渲染之前
Runtime event 进入 Timeline 之前
Renderer 执行之前
```

### P1：适配与 registry

旧链路不得直接进入页面。必须先经过 adapter：

```txt
Legacy DTO / UISchema / ViewModel
  -> Adapter
  -> SemanticResultContract / RuntimeDisplayProtocol
  -> Validator
  -> Component Registry
  -> Renderer
```

### P2：首个业务闭环：问数趋势展示

先用问数趋势打通完整链路：

```txt
prompt 约束
-> requestedView/dateRange/granularity/dataCoverage
-> SemanticResultContract
-> data-visualization region
-> validator
-> renderer
-> golden regression
```

### P3：CI Guardrail

把结构治理变成 CI 阻断：

```txt
禁止新增私有 action/source/evidence/region 结构
禁止页面绕过 contracts 真源
禁止 renderer 无 fallback
禁止 AI Insight 无 evidence/source
```



---

<!-- Source: docs/architecture/examples/golden-example-spec.md -->


# Golden Examples 与测试断言规范

## 1. 目标

Golden examples 是契约稳定性的回归基准。每次改 validator、adapter、renderer，都必须保证 Golden examples 的预期不变。

## 2. 必备样例

```txt
semantic-result.report-trend.json
semantic-result.insufficient-trend.json
runtime-display.tool-call.json
data-visualization.sankey.json
ai-trust.insight-with-evidence.json
```

## 3. 断言要求

### semantic-result.report-trend.json

```txt
validateSemanticResultContract = valid
validateRendererData(data-visualization) = valid
validateReportTrendData = valid
至少 2 个日期点
存在 sourceRefs / evidenceRefs
```

### semantic-result.insufficient-trend.json

```txt
validateSemanticResultContract = valid 或 warning-only
validateReportTrendData 返回 error 或 degraded warning
不得渲染成趋势折线图
必须包含 fallback/action
```

### runtime-display.tool-call.json

```txt
validateRuntimeDisplayProtocol = valid
至少包含 tool-call-started / tool-call-succeeded 或 failed
有 durationMs 或 timestamp
```

### data-visualization.sankey.json

```txt
validateRendererData(data-visualization) = valid
nodes / links 存在
sourceRefs / evidenceRefs 存在
```

### ai-trust.insight-with-evidence.json

```txt
所有 insight 必须有 evidenceRefs/sourceRefs
confidence 存在
freshness 存在
```



---

<!-- Source: docs/architecture/frontend-engineering/component-registry-implementation.md -->


# Component Registry 实际实现规范

## 1. 目标

Component Registry 是前端自主渲染的执行核心。

```txt
SemanticResultContract.regions[]
  -> componentBinding
  -> registry.resolve(binding)
  -> renderer.validate(data)
  -> renderer.render(region, context)
  -> fallback / telemetry / error boundary
```

页面组件不得直接使用 `switch(schema.type)`、`if (vizSpec.xxx)`、`if (metricExplainer.xxx)` 判断最终渲染结构。

## 2. Registry 必须提供的能力

```ts
createComponentRegistry()
registry.register(renderer)
registry.unregister(binding)
registry.resolve(binding)
registry.renderRegion(region, context)
registry.renderResult(result, context)
```

## 3. Renderer 必须包含

```ts
binding
version
displayName
supportedRegionTypes
capabilities
performance
validate(data, region)
render(region, context)
fallback(region, context, reason)
```

## 4. 默认 renderer

最小集：

```txt
markdown-result
data-visualization
ai-runtime
workflow-trace
asset-reference
decision-card
evidence-panel
source-list
action-bar
error-state
empty-state
permission-gate
```

如真实 UI 组件尚未完成，默认 renderer 可以先返回渲染描述对象，但不能缺席 fallback。

## 5. Resolver 接入

Renderer 不直接读全局 store。所有外部依赖通过 `RendererContext` 注入：

```txt
actionDispatcher
evidenceResolver
sourceResolver
runtimeResolver
artifactResolver
permissionChecker
visibilityEvaluator
telemetry
featureFlags
environment
```

## 6. Error Boundary

每个 renderer 必须被 error boundary 包裹。错误处理规则：

```txt
1. 捕获 renderer throw。
2. 记录 renderer_error telemetry。
3. 使用 renderer.fallback 或 registry fallback。
4. 不允许一个 region 错误导致整条消息崩溃。
```

## 7. ChatContainer / ReportQueryResultCard 改造路径

### 7.1 当前典型问题

```txt
ChatContainer 直接判断 MessagePart / ResponseContract / legacy schema。
ReportQueryResultCard 直接消费 ReportQueryViewModel / VizSpec。
图表组件内部各自定义 buttons/actions/source/evidence。
```

### 7.2 目标路径

```txt
backend response / legacy view model
  -> adapter
  -> SemanticResultContract
  -> validateSemanticResultContract
  -> registry.renderResult
```

### 7.3 迁移顺序

```txt
1. 保留旧组件，但包一层 legacy adapter。
2. 新增 SemanticResultRenderer。
3. ChatContainer 只识别：plain text / SemanticResultContract / RuntimeDisplayProtocol。
4. ReportQueryResultCard 改为 data-visualization renderer 的内部实现，而不是顶层协议。
5. 移除页面层对 ReportQueryViewModel / MetricExplainerUISchema 的直接最终渲染依赖。
```



---

<!-- Source: docs/architecture/guardrails/contract-guardrails.md -->


# Contract Guardrail 深化规范

## 1. 目标

Guardrail 不只检查文档是否存在，还要阻止结构分裂和绕过统一契约。

## 2. 必须检查的违规模式

### 2.1 私有动作字段

禁止新增：

```txt
chartActions
tableButtons
cardCta
ctaButtons
localActions
vizActions
messageActions
```

除非出现在 adapter 的 legacy 输入定义中，且最终映射到 `ActionContract`。

### 2.2 私有 evidence/source 字段

禁止新增：

```txt
dataSources
sourceItems
citationItems
evidenceItems
proofs
references
```

除非最终映射到 `EvidenceRef` / `SourceRef`。

### 2.3 绕过 contracts 真源

禁止在页面目录中重新定义：

```txt
type ActionType
interface ActionContract
interface SemanticResultContract
interface EvidenceRef
interface SourceRef
interface RuntimeDisplayProtocol
```

### 2.4 AI Insight 无证据

出现以下字段时必须检查 evidence/source：

```txt
insight
recommendation
risk
diagnosis
explanation
confidence
```

### 2.5 Renderer 无 fallback

每个 renderer 注册必须包含 fallback，或 registry 必须注入 global fallback。

### 2.6 用户页面直接消费旧 schema

禁止最终页面直接消费：

```txt
ResponseContract
ReportQueryViewModel
MetricExplainerUISchema
VizSpec
AgentProcessEvent
```

合法例外：

```txt
adapters/*
migration tests
legacy compatibility tests
```

## 3. CI 阻断等级

| 类型 | 等级 |
|---|---|
| 私有 Action 字段 | error |
| 重新定义契约真源 | error |
| 页面直接消费旧 schema | error |
| AI Insight 无 evidence/source | warning -> 两周后升级 error |
| renderer 无 fallback | error |
| Visual token 硬编码 | warning |

## 4. 执行方式

```bash
npx tsx scripts/guardrails/check-contract-governance.ts
```

建议加入：

```txt
pre-commit: warning
pull request: error
main branch CI: error
```



---

<!-- Source: docs/architecture/migration/contract-adapter-implementation.md -->


# Legacy Contract Adapter 实施规范

## 1. 目标

迁移期不要求一次性删除旧 schema，但所有旧 schema 必须进入统一适配层，最终输出只能是：

```txt
SemanticResultContract
RuntimeDisplayProtocol
```

## 2. 适配对象

必须覆盖：

```txt
ResponseContract -> SemanticResultContract
ReportQueryResult -> SemanticResultContract
ReportQueryViewModel -> SemanticResultContract
MetricExplainerUISchema -> SemanticResultContract
VizSpec -> data-visualization region.data
AgentProcessEvent -> RuntimeDisplayProtocol
process_events -> RuntimeDisplayProtocol.events
Timeline -> RuntimeDisplayProtocol / workflow-trace region
```

## 3. 禁止事项

```txt
1. 禁止页面组件继续把 MetricExplainerUISchema 当最终 UI 协议。
2. 禁止 VizSpec 独立携带 chartActions / tableButtons。
3. 禁止 ResponseContract 自己定义 evidence/source/action。
4. 禁止 AgentProcessEvent 混入 SemanticResultContract.regions[].data 作为业务结果。
```

## 4. 适配原则

### 4.1 Result Plane

业务结果进入：

```txt
SemanticResultContract.regions[]
```

典型映射：

| Legacy | Target |
|---|---|
| answer / summary | markdown-result region |
| report table | data-visualization region |
| chart / VizSpec | data-visualization region.data.vizSpec |
| metric insight | insight region / data-visualization.insights |
| source list | sourceRefs + source-list region |
| evidence bundle | evidenceRefs + evidence-panel region |
| CTA / buttons | ActionContract |

### 4.2 Runtime Plane

过程事件进入：

```txt
RuntimeDisplayProtocol.events
RuntimeDisplayProtocol.toolCalls
RuntimeDisplayProtocol.agents
RuntimeDisplayProtocol.workflows
```

最终结果如果需要引用过程，只使用：

```txt
region.runtimeRefs
```

## 5. Adapter 输出后必须校验

每个 adapter 末尾必须执行：

```ts
const validation = validateSemanticResultContract(result)
```

或：

```ts
const validation = validateRuntimeDisplayProtocol(runtime)
```

迁移初期可以允许 warning，但 error 必须 fallback 或阻断渲染。



---

<!-- Source: docs/architecture/observability/audit-telemetry.md -->


# Observability / Audit 可执行规范

## 1. 目标

AI Chat OS 的展示层必须可追踪：

```txt
谁触发了什么 action
哪个 renderer 出错
哪个 contract validation 失败
哪个 runtime 慢
哪个 prompt/tool/contract version 产生了结果
哪些高风险动作被审批或拒绝
```

## 2. 必须记录的事件

```txt
action_invoked
action_succeeded
action_failed
action_confirmed
action_cancelled
renderer_error
renderer_fallback_used
contract_validation_failed
runtime_latency_recorded
runtime_error_shown
prompt_contract_generated
audit_trail_recorded
```

## 3. Action Tracking 结构

必须包含：

```txt
eventName
actionId
actionType
actionIntent
resultId
regionId
conversationId
messageId
runtimeId
sourceRefs
evidenceRefs
userId/sessionId
confirmed
permissionState
timestamp
```

## 4. Renderer Error Telemetry

必须包含：

```txt
binding
rendererVersion
regionId
resultId
errorName
errorMessage
errorStackHash
fallbackUsed
contractVersion
producer
```

## 5. Runtime Latency

必须包含：

```txt
runtimeId
status
startedAt
endedAt
durationMs
agentCount
toolCallCount
retryCount
approvalWaitMs
slowestToolCall
```

## 6. Prompt / Tool / Contract Version 追踪

SemanticResultContract.metadata 建议包含：

```txt
promptVersion
toolVersion
contractVersion
adapterVersion
rendererVersion
model
workflowVersion
```

RuntimeDisplayProtocol.metadata 建议包含：

```txt
orchestratorVersion
agentVersion
toolVersions
workflowVersion
traceId
```

## 7. Audit Trail 与 ActionContract 的关系

高风险动作必须设置：

```ts
action.audit.required = true
action.confirm.required = true
```

包括：

```txt
approve
reject
run-workflow
destructive
risky
export sensitive data
request external tool execution
```

Audit 记录必须能回溯到：

```txt
ActionContract.id
SemanticResultContract.resultId
region.id
evidenceRefs/sourceRefs
runtimeRefs
user/session/role
```



---

<!-- Source: docs/architecture/prompting/prompt-runtime-contract.md -->


# Prompt / Runtime / Contract 关系规范

## 1. 三者边界

```txt
Prompt
负责约束模型或 agent 输出哪些语义字段。

Runtime Display Protocol
负责记录执行过程：模型、工具、agent、workflow、错误、重试、审批。

SemanticResultContract
负责最终业务结果如何被前端自主渲染。
```

## 2. Prompt 不能做的事

```txt
1. 不得输出具体 React 组件名。
2. 不得定义私有 chartActions/tableButtons/cardCta。
3. 不得绕过 ActionContract。
4. 不得把 tool call trace 混入业务结果正文。
5. 不得定义视觉 token、颜色值、字号、CSS 类名。
6. 不得伪造 evidence/source。
```

## 3. Prompt 必须输出的契约字段

当 prompt 要求结构化结果时，必须要求输出：

```txt
contractType = "semantic-result"
version
resultId
screenType
createdAt
regions[]
regions[].id
regions[].type
regions[].componentBinding
regions[].data
actions[] 如果有用户动作
evidenceRefs[] 如果有结论/洞察/建议/风险
sourceRefs[] 如果引用数据或资料
```

对于数据可视化：

```txt
region.componentBinding = "data-visualization"
region.data.viewType
region.data.requestedView
region.data.dataset 或 artifactRef
region.data.dataCoverage
region.data.insights[].evidenceRefs/sourceRefs
```

对于 runtime：

```txt
Prompt 不直接生成 RuntimeDisplayProtocol 作为业务结果。
RuntimeDisplayProtocol 由 runtime/orchestrator/tool layer 产生。
业务结果只通过 runtimeRefs 引用 runtime。
```

## 4. 输出失败时的要求

如果无法满足用户请求，仍然输出 SemanticResultContract：

```txt
screenType = "empty-result" | "error-result" | "permission-blocked"
region.componentBinding = "feedback-panel" | "error-state" | "permission-gate"
actions 包含 retry / request-access / continue-analysis 等 ActionContract
sourceRefs/evidenceRefs 如可用则保留
```

## 5. Prompt 片段模板

```txt
你必须输出一个符合 SemanticResultContract 的 JSON 对象。
所有用户可点击动作必须使用 ActionContract。
所有洞察、风险判断、结论、建议必须引用 evidenceRefs 或 sourceRefs。
如果结果包含数据可视化，必须放在 regions[].componentBinding = "data-visualization" 的 region 中。
如果用户请求趋势、走势、变化、环比、同比，必须输出 requestedView/dateRange/granularity/dataCoverage。
如果趋势数据点少于 2 个，不得绘制趋势图，必须返回 degraded 或 insufficient 数据状态。
不得输出 React 组件名、CSS 类名、私有 action 字段或未经证据支持的结论。
```



---

<!-- Source: docs/architecture/semantic-contract/runtime-validation.md -->


# Contract 运行时校验规范

## 1. 目标

TypeScript 类型只在编译期生效，无法约束后端、LLM、缓存、插件、MCP 或历史数据返回的运行时结构。运行时 validator 的职责是：

```txt
1. 在渲染前发现错误结构。
2. 将错误分为 error / warning。
3. 提供安全降级所需的 fallback reason。
4. 统一接入 telemetry，形成可观测性。
5. 用 golden examples 建立回归保护。
```

## 2. 必须暴露的函数

```ts
isSemanticResultContract(value): value is SemanticResultContract
validateSemanticResultContract(value): ContractValidationResult<SemanticResultContract>
validateActionContract(value): ContractValidationResult<ActionContract>
validateRuntimeDisplayProtocol(value): ContractValidationResult<RuntimeDisplayProtocol>
validateRendererData(binding, data, region): ContractValidationResult<unknown>
```

扩展函数：

```ts
validateEvidenceRef(value)
validateSourceRef(value)
validateReportTrendData(value, region)
```

## 3. 校验层级

### 3.1 Shape 校验

检查必填字段、枚举值、数组结构、ID 引用。

必须校验：

```txt
SemanticResultContract.contractType === "semantic-result"
SemanticResultContract.version 存在
resultId 存在
screenType 合法
regions 是非空数组
region.id / region.type / region.componentBinding / region.data 存在
ActionContract.id / type / intent / label 存在
RuntimeDisplayProtocol.contractType === "runtime-display"
RuntimeDisplayProtocol.runtimeId / status / events 存在
```

### 3.2 引用一致性校验

必须校验：

```txt
region.evidenceRefs 必须能在 result.evidenceRefs 中找到
region.sourceRefs 必须能在 result.sourceRefs 中找到
region.actions[].evidenceRefs 必须能在 result.evidenceRefs 中找到
region.actions[].sourceRefs 必须能在 result.sourceRefs 中找到
runtimeRefs 如果出现，必须是 RuntimeRef 或字符串 id
```

### 3.3 Trust 校验

以下 region 或 action 必须挂证据或来源：

```txt
region.type = "insight"
region.type = "warning"
region.componentBinding = "decision-card"
action.intent = "risky"
action.intent = "destructive"
action.type = "approve" / "reject" / "run-workflow"
```

### 3.4 Renderer Data 校验

每个 renderer 必须有自己的 data validator。全局入口为：

```ts
validateRendererData(region.componentBinding, region.data, region)
```

当前至少包含：

```txt
markdown-result
数据要求：markdown/text 至少一个存在

data-visualization
数据要求：viewType / requestedView / dataCoverage / dataset 或 chartSpec 合法

ai-runtime / workflow-trace
数据要求：runtimeRef 或 embedded runtime data 存在

asset-reference
数据要求：artifactId / assetType / title 存在
```

## 4. 错误等级

| Level | 含义 | 处理 |
|---|---|---|
| error | 结构无法安全渲染 | fallback renderer |
| warning | 可渲染但不符合治理 | 渲染 + telemetry |
| info | 兼容性提示 | 记录即可 |

## 5. 降级策略

```txt
unsupported-binding -> unknown binding fallback
invalid-data -> invalid region fallback
permission-denied -> permission gate
source-unavailable -> source unavailable hint
evidence-unavailable -> trust warning
runtime-unavailable -> runtime collapsed state
render-error -> renderer error boundary
```

## 6. Telemetry

每次失败必须记录：

```txt
contract_version
contract_type
result_id/runtime_id
region_id
binding
error_code
error_path
producer.kind/name/version
prompt_version/tool_version 如果可用
```



---

<!-- Source: docs/architecture/use-cases/report-trend-contract.md -->


# 问数趋势展示契约化实现规范

## 1. 背景

问数趋势展示不是单纯保护规则，而是统一语义契约落地的首个业务闭环。它必须同时约束：

```txt
prompt 输出
backend / agent result
SemanticResultContract
Data Visualization region.data
chart/table 派生优先级
renderer validator
回归用例
```

## 2. 必填字段

所有趋势类问数结果必须包含：

```ts
requestedView: "trend" | "table" | "chart" | "summary" | "auto"
dateRange: { start: string; end: string; timezone?: string }
granularity: "hour" | "day" | "week" | "month" | "quarter" | "year"
dataCoverage: {
  status: "complete" | "partial" | "insufficient" | "unknown"
  availablePoints: number
  requiredPoints: number
  missingReasons?: string[]
}
```

## 3. 趋势图最低数据要求

```txt
requestedView = trend 或 chartType = line/area/trend
=> 至少 2 个不同日期点。
```

否则必须降级：

```txt
1. 不画趋势线。
2. 输出 insufficient-trend region。
3. 提示数据不足原因。
4. 提供继续分析 / 扩大时间范围 / 查看表格 action。
```

## 4. chart/table MessagePart 派生优先级

当同一结果既可以展示图，也可以展示表时，优先级：

```txt
1. 用户明确 requestedView。
2. 数据覆盖度是否满足视图。
3. semantic region.layoutHints.preferredVariant。
4. renderer 能力与设备能力。
5. fallback 到 table / markdown summary。
```

## 5. SemanticResultContract 映射

趋势结果应该输出：

```txt
screenType = "report-result" 或 "analysis-result"
region.type = "data-view"
region.componentBinding = "data-visualization"
region.data.viewType = "trend"
region.data.requestedView = "trend"
```

如果数据不足：

```txt
region.state = "degraded"
region.fallback.reason = "empty-data" 或 "invalid-data"
region.data.dataCoverage.status = "insufficient"
```

## 6. Prompt 同步规则

任何趋势、环比、同比、变化、走势、波动类问题，prompt 必须要求模型或工具输出：

```txt
requestedView
dateRange
granularity
dataCoverage
series/dateField/metricField
sourceRefs/evidenceRefs
```

并明确：

```txt
数据点不足 2 个时，不得伪造趋势，不得画折线图，必须输出 insufficient-trend。
```

## 7. 回归用例

必须维护：

```txt
semantic-result.report-trend.json
semantic-result.insufficient-trend.json
```

测试断言：

```txt
1. report-trend 通过 validateSemanticResultContract。
2. report-trend 通过 validateReportTrendData。
3. insufficient-trend 通过 validateSemanticResultContract。
4. insufficient-trend 不允许渲染为趋势折线图。
5. 一日期点 + requestedView=trend 必须产生 error 或 degraded fallback。
```



---

<!-- Source: docs/architecture/visual-system/color-system.md -->


# Color System

> 本文档仅治理颜色系统分类与使用边界，不修改当前 5 月 27 色彩真源值。

## 1. Token 分类

```txt
color.brand.*
color.neutral.*
color.background.*
color.surface.*
color.text.*
color.border.*
color.state.hover
color.state.active
color.state.disabled
color.semantic.success
color.semantic.warning
color.semantic.error
color.semantic.info
color.ai.thinking
color.ai.running
color.ai.completed
color.ai.failed
color.chart.series.*
color.trust.high
color.trust.medium
color.trust.low
```

## 2. 使用规则

```txt
1. 禁止业务组件直接使用 hex/rgb/hsl。
2. 图表颜色必须来自 chart token，不得每个图自定义 palette。
3. AI Runtime 状态颜色必须来自 ai/state token。
4. 置信度、风险、权限等信号必须使用 semantic/trust token。
5. Dark Mode 通过 token 映射，不在组件里写条件色。
```

## 3. 特殊域映射

| 场景 | Token 域 |
|---|---|
| AI 正在生成 | color.ai.thinking |
| Tool running | color.ai.running |
| Evidence verified | color.trust.high |
| Data stale | color.semantic.warning |
| Permission blocked | color.semantic.error / neutral disabled |



---

<!-- Source: docs/architecture/visual-system/elevation-shadow-system.md -->


# Elevation / Shadow System

## 1. Token 分类

```txt
elevation.base
elevation.raised
elevation.dropdown
elevation.popover
elevation.modal
elevation.toast
elevation.command
elevation.runtime-overlay
shadow.none
shadow.sm
shadow.md
shadow.lg
shadow.overlay
zIndex.header
zIndex.sidebar
zIndex.dropdown
zIndex.popover
zIndex.modal
zIndex.toast
zIndex.commandPalette
```

## 2. 使用规则

```txt
1. 浮层层级统一由 elevation/zIndex token 管理。
2. Tooltip、Popover、Dropdown 不得各自设置任意 z-index。
3. Runtime detail panel 与 evidence/source panel 层级必须可预测。
4. Modal 永远高于 Drawer/Popover，但 Toast 与 Command Palette 规则单独定义。
```



---

<!-- Source: docs/architecture/visual-system/icon-system.md -->


# Icon System

## 1. 职责

Icon System 统一：

```txt
图标库来源
尺寸体系
描边粗细
语义命名
状态图标
AI / Agent / Tool 专属图标
数据可视化图标
权限 / 风险 / 证据图标
```

## 2. 尺寸层级

```txt
icon.size.xs
icon.size.sm
icon.size.md
icon.size.lg
icon.size.xl
```

## 3. 语义分类

```txt
navigation.*
action.*
status.*
ai.*
runtime.*
data.*
trust.*
permission.*
file.*
```

## 4. 使用规则

```txt
1. 组件不得直接导入随机第三方 icon 名称作为语义。
2. ActionContract.icon 只能填语义 icon key。
3. Runtime 状态图标必须和 RuntimeStatus 一一映射。
4. Source/Evidence 图标必须由 SourceType/EvidenceType 派生。
5. 危险动作图标不得只靠颜色表达，必须有形状语义。
```



---

<!-- Source: docs/architecture/visual-system/motion-system.md -->


# Motion System

## 1. 职责

Motion System 统一 AI Chat OS 中所有动效：消息进入、流式输出、工具调用、Timeline、Toast、Skeleton、图表渐进展示。

## 2. Token 分类

```txt
motion.duration.instant
motion.duration.fast
motion.duration.normal
motion.duration.slow
motion.easing.standard
motion.easing.enter
motion.easing.exit
motion.easing.emphasized
motion.pattern.fade
motion.pattern.slide
motion.pattern.expand
motion.pattern.stream
motion.pattern.skeleton
```

## 3. 使用规则

```txt
1. Streaming token append 不做大面积 layout shift。
2. 长消息折叠/展开必须保持滚动锚点。
3. Runtime Timeline 状态变化使用轻量动效，不阻塞主线程。
4. 大图表加载使用 skeleton + lazy render，不做昂贵动画。
5. reduced-motion 开启时必须禁用非必要动效。
```



---

<!-- Source: docs/architecture/visual-system/radius-border-system.md -->


# Radius / Border System

## 1. Token 分类

```txt
radius.none
radius.xs
radius.sm
radius.md
radius.lg
radius.xl
radius.full
border.width.hairline
border.width.default
border.color.default
border.color.subtle
border.color.strong
border.color.focus
border.color.error
```

## 2. 使用规则

```txt
1. Card / Message / Tooltip / Modal 的圆角必须来自 radius token。
2. Focus ring 必须可见，并使用 border.focus token。
3. 图表选中态、表格选中态、Runtime 当前步骤边框必须统一。
4. 禁止使用 box-shadow 伪装关键交互边框。
```



---

<!-- Source: docs/architecture/visual-system/spacing-system.md -->


# Spacing System

## 1. 职责

Spacing System 统一页面、卡片、消息、表单、图表、Runtime Timeline 的间距节奏。

## 2. Token 分类

```txt
space.0
space.1
space.2
space.3
space.4
space.5
space.6
space.8
space.10
space.12
space.16
space.20
space.24
layout.page.padding
layout.section.gap
layout.card.padding
layout.message.gap
layout.form.gap
layout.panel.gap
```

## 3. 使用规则

```txt
1. 禁止大量一次性硬编码 margin/padding。
2. Chat message 的 vertical rhythm 必须统一。
3. Runtime Timeline 的 step gap 使用 timeline token。
4. Data Visualization 的 chart padding、legend gap、tooltip spacing 映射 token。
5. 移动端使用 responsive spacing token，不在组件局部乱改。
```



---

<!-- Source: docs/architecture/visual-system/typography.md -->


# Typography System

> 本文档仅治理字体系统的使用边界与 token 分类，不修改当前 5 月 27 字体真源值。

## 1. 职责

Typography System 统一：

```txt
字体族
字号
字重
行高
字间距
标题层级
正文层级
Label / Caption
数字字体
代码字体
中英文混排
```

## 2. Token 分类

```txt
font.family.sans
font.family.mono
font.family.numeric
font.size.display
font.size.title
font.size.body
font.size.label
font.size.caption
font.weight.regular
font.weight.medium
font.weight.semibold
font.weight.bold
font.lineHeight.tight
font.lineHeight.normal
font.lineHeight.relaxed
font.letterSpacing.normal
font.letterSpacing.compact
```

## 3. 使用规则

```txt
1. 业务组件不得硬编码 font-size/font-weight。
2. Markdown renderer 必须映射到 Typography token。
3. Data Visualization 中的轴标签、tooltip、legend 也必须使用 token。
4. Runtime UI 中的状态、日志、trace 使用 mono/body/caption token，不得私有化。
5. 数字指标优先使用 numeric token。
```

## 4. Codex CLI 检查关键词

```txt
font-size:
fontWeight
text-[
font-[
px/rem 直接作为字号
```



---

<!-- Source: frontend/src/src/contracts/__tests__/contract-validation.test.ts -->

# frontend/src/src/contracts/__tests__/contract-validation.test.ts

```ts
import { describe, expect, it } from 'vitest';
import reportTrend from '../examples/golden/semantic-result.report-trend.json';
import insufficientTrend from '../examples/golden/semantic-result.insufficient-trend.json';
import runtimeToolCall from '../examples/golden/runtime-display.tool-call.json';
import sankey from '../examples/golden/data-visualization.sankey.json';
import trustInsight from '../examples/golden/ai-trust.insight-with-evidence.json';
import { validateSemanticResultContract } from '../validation/semantic-result-validator';
import { validateRuntimeDisplayProtocol } from '../validation/runtime-display-validator';
import { validateReportTrendData } from '../validation/report-trend-validator';

function firstRegion(contract: any) {
  return contract.regions[0];
}

describe('AI Chat OS contract golden examples', () => {
  it('validates report trend semantic result', () => {
    const result = validateSemanticResultContract(reportTrend);
    expect(result.valid).toBe(true);
    const region = firstRegion(reportTrend);
    expect(validateReportTrendData(region.data, region).valid).toBe(true);
  });

  it('keeps insufficient trend degraded instead of drawing a trend chart', () => {
    const result = validateSemanticResultContract(insufficientTrend);
    expect(result.valid).toBe(true);
    const region = firstRegion(insufficientTrend);
    const trendValidation = validateReportTrendData(region.data, region);
    expect(region.state).toBe('degraded');
    expect(region.data.chartType).not.toBe('line');
    expect(trendValidation.warnings.some((issue) => issue.code === 'trend_requires_at_least_two_date_points')).toBe(true);
  });

  it('validates runtime display protocol with tool calls', () => {
    const result = validateRuntimeDisplayProtocol(runtimeToolCall);
    expect(result.valid).toBe(true);
  });

  it('validates sankey semantic result', () => {
    const result = validateSemanticResultContract(sankey);
    expect(result.valid).toBe(true);
  });

  it('requires AI trust insight to include evidence and source', () => {
    const result = validateSemanticResultContract(trustInsight);
    expect(result.valid).toBe(true);
    const region = firstRegion(trustInsight);
    expect(region.evidenceRefs.length).toBeGreaterThan(0);
    expect(region.sourceRefs.length).toBeGreaterThan(0);
  });
});

```



---

<!-- Source: frontend/src/src/contracts/adapters/index.ts -->

# frontend/src/src/contracts/adapters/index.ts

```ts
export * from './legacy-to-semantic';
export * from './legacy-to-runtime';
export * from './report-trend-adapter';

```



---

<!-- Source: frontend/src/src/contracts/adapters/legacy-to-runtime.ts -->

# frontend/src/src/contracts/adapters/legacy-to-runtime.ts

```ts
import type {
  RuntimeDisplayProtocol,
  RuntimeEvent,
  RuntimeEventType,
  RuntimeStatus,
  ToolCallState,
} from '../runtime/runtime-display-protocol';

export interface LegacyAgentProcessEvent {
  id?: string;
  type?: string;
  status?: string;
  timestamp?: string;
  createdAt?: string;
  title?: string;
  summary?: string;
  agentId?: string;
  toolName?: string;
  toolCallId?: string;
  durationMs?: number;
  error?: unknown;
  payload?: unknown;
  [key: string]: unknown;
}

export interface RuntimeAdapterContext {
  runtimeId: string;
  conversationId?: string;
  messageId?: string;
  executionId?: string;
  now?: string;
  version?: string;
}

const STATUS_MAP: Record<string, RuntimeStatus> = {
  pending: 'queued',
  queued: 'queued',
  planning: 'planning',
  running: 'running',
  streaming: 'streaming',
  success: 'succeeded',
  succeeded: 'succeeded',
  partial: 'partially-succeeded',
  failed: 'failed',
  error: 'failed',
  cancelled: 'cancelled',
  retrying: 'retrying',
  recovering: 'recovering',
};

const TYPE_MAP: Record<string, RuntimeEventType> = {
  start: 'runtime-started',
  complete: 'runtime-completed',
  error: 'runtime-failed',
  model_start: 'model-started',
  model_stream_start: 'model-stream-started',
  model_token: 'model-token',
  model_stream_end: 'model-stream-ended',
  agent_start: 'agent-started',
  agent_complete: 'agent-completed',
  agent_error: 'agent-failed',
  tool_start: 'tool-call-started',
  tool_progress: 'tool-call-progress',
  tool_success: 'tool-call-succeeded',
  tool_error: 'tool-call-failed',
  workflow_start: 'workflow-started',
  step_start: 'workflow-step-started',
  step_complete: 'workflow-step-completed',
  step_error: 'workflow-step-failed',
};

function mapStatus(status: unknown): RuntimeStatus {
  if (typeof status !== 'string') return 'running';
  return STATUS_MAP[status] ?? (status as RuntimeStatus);
}

function mapType(type: unknown): RuntimeEventType {
  if (typeof type !== 'string') return 'runtime-started';
  return TYPE_MAP[type] ?? (type as RuntimeEventType);
}

export function agentProcessEventsToRuntimeDisplayProtocol(
  events: LegacyAgentProcessEvent[],
  context: RuntimeAdapterContext,
): RuntimeDisplayProtocol {
  const runtimeEvents: RuntimeEvent[] = events.map((event, index) => ({
    id: event.id ?? `legacy-runtime-event-${index + 1}`,
    runtimeId: context.runtimeId,
    type: mapType(event.type),
    status: mapStatus(event.status),
    timestamp: event.timestamp ?? event.createdAt ?? context.now ?? new Date().toISOString(),
    title: event.title,
    summary: event.summary,
    agentId: event.agentId,
    toolCallId: event.toolCallId,
    durationMs: event.durationMs,
    payload: event.payload ?? event,
    metadata: { migratedFrom: 'AgentProcessEvent' },
  }));

  const toolCalls = buildToolCallStates(events);
  const lastStatus = runtimeEvents.length > 0 ? runtimeEvents[runtimeEvents.length - 1].status : 'idle';

  return {
    contractType: 'runtime-display',
    version: context.version ?? '1.0.0',
    runtimeId: context.runtimeId,
    conversationId: context.conversationId,
    messageId: context.messageId,
    executionId: context.executionId,
    status: lastStatus,
    startedAt: runtimeEvents[0]?.timestamp,
    endedAt: ['succeeded', 'partially-succeeded', 'failed', 'cancelled'].includes(lastStatus) ? runtimeEvents[runtimeEvents.length - 1]?.timestamp : undefined,
    toolCalls,
    events: runtimeEvents,
    metadata: { migratedFrom: 'AgentProcessEvent[]' },
  };
}

function buildToolCallStates(events: LegacyAgentProcessEvent[]): ToolCallState[] {
  const map = new Map<string, ToolCallState>();

  for (const event of events) {
    const toolCallId = typeof event.toolCallId === 'string' ? event.toolCallId : undefined;
    if (!toolCallId) continue;

    const current = map.get(toolCallId) ?? {
      id: toolCallId,
      toolName: typeof event.toolName === 'string' ? event.toolName : 'unknown-tool',
      status: 'running' as RuntimeStatus,
    };

    current.status = mapStatus(event.status);
    current.startedAt = current.startedAt ?? event.timestamp ?? event.createdAt;
    current.endedAt = ['succeeded', 'failed', 'cancelled'].includes(current.status) ? (event.timestamp ?? event.createdAt) : current.endedAt;
    current.durationMs = typeof event.durationMs === 'number' ? event.durationMs : current.durationMs;
    current.outputSummary = typeof event.summary === 'string' ? event.summary : current.outputSummary;

    map.set(toolCallId, current);
  }

  return Array.from(map.values());
}

```



---

<!-- Source: frontend/src/src/contracts/adapters/legacy-to-semantic.ts -->

# frontend/src/src/contracts/adapters/legacy-to-semantic.ts

```ts
import type { SemanticResultContract, SemanticRegion } from '../semantic/semantic-result-contract';
import type { ActionContract } from '../semantic/action-contract';
import type { EvidenceRef } from '../semantic/evidence-contract';
import type { SourceRef } from '../semantic/source-contract';

export interface LegacyResponseContract {
  id?: string;
  conversationId?: string;
  messageId?: string;
  title?: string;
  answer?: string;
  summary?: string;
  markdown?: string;
  actions?: unknown[];
  sources?: unknown[];
  evidence?: unknown[];
  [key: string]: unknown;
}

export interface LegacyReportQueryResult {
  id?: string;
  title?: string;
  summary?: string;
  viewModel?: LegacyReportQueryViewModel;
  data?: unknown;
  chart?: unknown;
  table?: unknown;
  sources?: unknown[];
  evidence?: unknown[];
  [key: string]: unknown;
}

export interface LegacyReportQueryViewModel {
  id?: string;
  title?: string;
  chartSpec?: unknown;
  vizSpec?: unknown;
  tableData?: unknown;
  insights?: unknown[];
  actions?: unknown[];
  sources?: unknown[];
  evidence?: unknown[];
  [key: string]: unknown;
}

export interface LegacyMetricExplainerUISchema {
  id?: string;
  metricName?: string;
  title?: string;
  explanation?: string;
  drivers?: unknown[];
  chart?: unknown;
  sources?: unknown[];
  evidence?: unknown[];
  actions?: unknown[];
  [key: string]: unknown;
}

export interface AdapterContext {
  conversationId?: string;
  messageId?: string;
  now?: string;
  producer?: SemanticResultContract['producer'];
  version?: string;
}

function nowIso(context: AdapterContext): string {
  return context.now ?? new Date().toISOString();
}

function normalizeAction(action: unknown, index: number): ActionContract {
  if (typeof action === 'object' && action !== null && 'id' in action && 'type' in action && 'intent' in action && 'label' in action) {
    return action as ActionContract;
  }

  return {
    id: `legacy-action-${index + 1}`,
    type: 'custom',
    intent: 'secondary',
    label: typeof action === 'string' ? action : '操作',
    payload: { legacy: action },
    metadata: { migratedFrom: 'legacy-action' },
  };
}

function normalizeSource(source: unknown, index: number): SourceRef {
  if (typeof source === 'object' && source !== null && 'id' in source && 'type' in source && 'title' in source) {
    return source as SourceRef;
  }

  return {
    id: `legacy-source-${index + 1}`,
    type: 'unknown',
    title: typeof source === 'string' ? source : `Legacy Source ${index + 1}`,
    metadata: { legacy: source },
  };
}

function normalizeEvidence(evidence: unknown, index: number): EvidenceRef {
  if (typeof evidence === 'object' && evidence !== null && 'id' in evidence && 'type' in evidence && 'title' in evidence) {
    return evidence as EvidenceRef;
  }

  return {
    id: `legacy-evidence-${index + 1}`,
    type: 'unknown',
    title: typeof evidence === 'string' ? evidence : `Legacy Evidence ${index + 1}`,
    metadata: { legacy: evidence },
  };
}

export function responseContractToSemanticResult(
  legacy: LegacyResponseContract,
  context: AdapterContext = {},
): SemanticResultContract {
  const evidenceRefs = Array.isArray(legacy.evidence) ? legacy.evidence.map(normalizeEvidence) : [];
  const sourceRefs = Array.isArray(legacy.sources) ? legacy.sources.map(normalizeSource) : [];
  const actions = Array.isArray(legacy.actions) ? legacy.actions.map(normalizeAction) : [];

  const regions: SemanticRegion[] = [
    {
      id: 'answer',
      type: 'primary-result',
      componentBinding: 'markdown-result',
      title: legacy.title,
      data: {
        markdown: legacy.markdown ?? legacy.answer ?? legacy.summary ?? '',
      },
      actions,
      evidenceRefs: evidenceRefs.map((item) => item.id),
      sourceRefs: sourceRefs.map((item) => item.id),
      metadata: { migratedFrom: 'ResponseContract' },
    },
  ];

  return {
    contractType: 'semantic-result',
    version: context.version ?? '1.0.0',
    resultId: legacy.id ?? `legacy-response-${Date.now()}`,
    conversationId: context.conversationId ?? legacy.conversationId,
    messageId: context.messageId ?? legacy.messageId,
    screenType: 'conversation-answer',
    title: legacy.title,
    createdAt: nowIso(context),
    producer: context.producer ?? { kind: 'backend', name: 'legacy-response-adapter' },
    regions,
    actions,
    evidenceRefs,
    sourceRefs,
    metadata: { migratedFrom: 'ResponseContract' },
  };
}

export function reportQueryResultToSemanticResult(
  legacy: LegacyReportQueryResult,
  context: AdapterContext = {},
): SemanticResultContract {
  return reportQueryViewModelToSemanticResult(
    legacy.viewModel ?? {
      id: legacy.id,
      title: legacy.title,
      tableData: legacy.table ?? legacy.data,
      chartSpec: legacy.chart,
      sources: legacy.sources,
      evidence: legacy.evidence,
    },
    context,
  );
}

export function reportQueryViewModelToSemanticResult(
  legacy: LegacyReportQueryViewModel,
  context: AdapterContext = {},
): SemanticResultContract {
  const evidenceRefs = Array.isArray(legacy.evidence) ? legacy.evidence.map(normalizeEvidence) : [];
  const sourceRefs = Array.isArray(legacy.sources) ? legacy.sources.map(normalizeSource) : [];
  const actions = Array.isArray(legacy.actions) ? legacy.actions.map(normalizeAction) : [];

  const regions: SemanticRegion[] = [
    {
      id: 'report-data-view',
      type: 'data-view',
      componentBinding: 'data-visualization',
      title: legacy.title,
      data: {
        viewType: 'auto',
        requestedView: 'auto',
        chartSpec: legacy.chartSpec,
        vizSpec: legacy.vizSpec,
        tableData: legacy.tableData,
        insights: legacy.insights,
        migratedFrom: 'ReportQueryViewModel',
      },
      actions,
      evidenceRefs: evidenceRefs.map((item) => item.id),
      sourceRefs: sourceRefs.map((item) => item.id),
      layoutHints: { placement: 'main', width: 'full', scrollMode: 'virtualized' },
      metadata: { migratedFrom: 'ReportQueryViewModel' },
    },
  ];

  return {
    contractType: 'semantic-result',
    version: context.version ?? '1.0.0',
    resultId: legacy.id ?? `legacy-report-${Date.now()}`,
    conversationId: context.conversationId,
    messageId: context.messageId,
    screenType: 'report-result',
    title: legacy.title,
    createdAt: nowIso(context),
    producer: context.producer ?? { kind: 'backend', name: 'legacy-report-query-adapter' },
    regions,
    actions,
    evidenceRefs,
    sourceRefs,
    metadata: { migratedFrom: 'ReportQueryViewModel' },
  };
}

export function metricExplainerUISchemaToSemanticResult(
  legacy: LegacyMetricExplainerUISchema,
  context: AdapterContext = {},
): SemanticResultContract {
  const evidenceRefs = Array.isArray(legacy.evidence) ? legacy.evidence.map(normalizeEvidence) : [];
  const sourceRefs = Array.isArray(legacy.sources) ? legacy.sources.map(normalizeSource) : [];
  const actions = Array.isArray(legacy.actions) ? legacy.actions.map(normalizeAction) : [];

  const regions: SemanticRegion[] = [
    {
      id: 'metric-explanation',
      type: 'insight',
      componentBinding: 'decision-card',
      title: legacy.title ?? legacy.metricName,
      data: {
        metricName: legacy.metricName,
        explanation: legacy.explanation,
        drivers: legacy.drivers,
        chart: legacy.chart,
        migratedFrom: 'MetricExplainerUISchema',
      },
      actions,
      evidenceRefs: evidenceRefs.map((item) => item.id),
      sourceRefs: sourceRefs.map((item) => item.id),
      metadata: { migratedFrom: 'MetricExplainerUISchema' },
    },
  ];

  return {
    contractType: 'semantic-result',
    version: context.version ?? '1.0.0',
    resultId: legacy.id ?? `legacy-metric-explainer-${Date.now()}`,
    conversationId: context.conversationId,
    messageId: context.messageId,
    screenType: 'metric-explainer',
    title: legacy.title ?? legacy.metricName,
    createdAt: nowIso(context),
    producer: context.producer ?? { kind: 'backend', name: 'legacy-metric-explainer-adapter' },
    regions,
    actions,
    evidenceRefs,
    sourceRefs,
    metadata: { migratedFrom: 'MetricExplainerUISchema' },
  };
}

```



---

<!-- Source: frontend/src/src/contracts/adapters/report-trend-adapter.ts -->

# frontend/src/src/contracts/adapters/report-trend-adapter.ts

```ts
import type { SemanticResultContract } from '../semantic/semantic-result-contract';
import type { ActionContract } from '../semantic/action-contract';
import type { EvidenceRef } from '../semantic/evidence-contract';
import type { SourceRef } from '../semantic/source-contract';
import type { ReportTrendData } from '../validation/report-trend-validator';

export interface ReportTrendAdapterInput {
  resultId: string;
  conversationId?: string;
  messageId?: string;
  title: string;
  requestedView: ReportTrendData['requestedView'];
  dateRange: NonNullable<ReportTrendData['dateRange']>;
  granularity: NonNullable<ReportTrendData['granularity']>;
  dataCoverage: NonNullable<ReportTrendData['dataCoverage']>;
  dataset?: ReportTrendData['dataset'];
  series?: ReportTrendData['series'];
  metricName?: string;
  dimensions?: string[];
  insights?: ReportTrendData['insights'];
  sourceRefs: SourceRef[];
  evidenceRefs: EvidenceRef[];
  actions?: ActionContract[];
  createdAt?: string;
}

export function reportTrendToSemanticResult(input: ReportTrendAdapterInput): SemanticResultContract<ReportTrendData> {
  const insufficient = input.dataCoverage.status === 'insufficient' || input.dataCoverage.availablePoints < 2;

  const defaultActions: ActionContract[] = insufficient
    ? [
        {
          id: 'expand-date-range',
          type: 'continue-analysis',
          intent: 'primary',
          label: '扩大时间范围继续分析',
          target: { kind: 'semantic-query', value: 'expand_date_range' },
          payload: { dateRange: input.dateRange, granularity: input.granularity },
          feedbackPolicy: { resultHandling: 'append-message', showToast: true },
        },
        {
          id: 'show-table',
          type: 'filter',
          intent: 'secondary',
          label: '改为表格查看',
          target: { kind: 'local-state', value: 'requestedView' },
          payload: { requestedView: 'table' },
        },
      ]
    : [];

  return {
    contractType: 'semantic-result',
    version: '1.0.0',
    resultId: input.resultId,
    conversationId: input.conversationId,
    messageId: input.messageId,
    screenType: 'report-result',
    title: input.title,
    createdAt: input.createdAt ?? new Date().toISOString(),
    producer: { kind: 'backend', name: 'report-trend-adapter', version: '1.0.0' },
    regions: [
      {
        id: 'trend-data-view',
        type: 'data-view',
        componentBinding: 'data-visualization',
        title: input.title,
        state: insufficient ? 'degraded' : 'ready',
        data: {
          viewType: 'trend',
          requestedView: input.requestedView,
          chartType: insufficient ? 'table' : 'line',
          dateRange: input.dateRange,
          granularity: input.granularity,
          dataCoverage: input.dataCoverage,
          dataset: input.dataset,
          series: input.series,
          metricName: input.metricName,
          dimensions: input.dimensions,
          insights: input.insights,
        },
        actions: input.actions ?? defaultActions,
        evidenceRefs: input.evidenceRefs.map((item) => item.id),
        sourceRefs: input.sourceRefs.map((item) => item.id),
        layoutHints: {
          placement: 'main',
          width: 'full',
          scrollMode: insufficient ? 'normal' : 'virtualized',
          preferredVariant: insufficient ? 'table' : 'line-chart',
        },
        fallback: insufficient
          ? {
              reason: 'empty-data',
              title: '趋势数据不足',
              message: '当前时间范围内少于 2 个日期点，无法生成趋势图。',
              actionIds: ['expand-date-range', 'show-table'],
            }
          : undefined,
      },
    ],
    actions: input.actions ?? defaultActions,
    evidenceRefs: input.evidenceRefs,
    sourceRefs: input.sourceRefs,
    metadata: {
      useCase: 'report-trend',
      requestedView: input.requestedView,
      granularity: input.granularity,
      dataCoverageStatus: input.dataCoverage.status,
    },
  };
}

```



---

<!-- Source: frontend/src/src/contracts/examples/golden/ai-trust.insight-with-evidence.json -->


# frontend/src/src/contracts/examples/golden/ai-trust.insight-with-evidence.json

```json
{
  "contractType": "semantic-result",
  "version": "1.0.0",
  "resultId": "golden-ai-trust-001",
  "screenType": "analysis-result",
  "title": "预算调整建议",
  "createdAt": "2026-05-28T00:00:00.000Z",
  "producer": { "kind": "agent", "name": "budget-analysis-agent", "version": "1.0.0" },
  "regions": [
    {
      "id": "budget-recommendation",
      "type": "insight",
      "componentBinding": "decision-card",
      "title": "建议降低低效 Campaign 预算",
      "data": {
        "recommendation": "将 Campaign B 的预算下调 15%，并观察 48 小时。",
        "riskLevel": "medium",
        "confidence": { "level": "medium", "score": 0.74, "basis": "mixed" },
        "reasoningSummary": "Campaign B 的 CPA 连续三天高于账户均值，且转化量没有同步增长。"
      },
      "evidenceRefs": ["ev-cpa-above-average", "ev-conversion-flat"],
      "sourceRefs": ["src-campaign-performance"],
      "actions": [
        {
          "id": "approve-budget-change",
          "type": "approve",
          "intent": "risky",
          "label": "确认调整预算",
          "confirm": {
            "required": true,
            "title": "确认预算调整",
            "description": "该操作会影响 Campaign B 的投放预算。",
            "riskLevel": "medium",
            "consequences": ["预算下调 15%", "可能影响曝光量"]
          },
          "audit": { "required": true, "eventName": "budget_change_approved", "riskCategory": "budget" },
          "evidenceRefs": ["ev-cpa-above-average", "ev-conversion-flat"],
          "sourceRefs": ["src-campaign-performance"]
        }
      ]
    }
  ],
  "evidenceRefs": [
    {
      "id": "ev-cpa-above-average",
      "type": "metric-value",
      "title": "CPA 高于均值",
      "summary": "Campaign B CPA 连续三天高于账户均值。",
      "sourceRefIds": ["src-campaign-performance"],
      "confidence": { "level": "medium", "basis": "calculation" },
      "freshness": { "status": "fresh", "asOf": "2026-05-27T23:59:59.000Z" }
    },
    {
      "id": "ev-conversion-flat",
      "type": "chart-observation",
      "title": "转化量持平",
      "summary": "预算消耗增长但转化量未同步增长。",
      "sourceRefIds": ["src-campaign-performance"],
      "confidence": { "level": "medium", "basis": "source" },
      "freshness": { "status": "fresh", "asOf": "2026-05-27T23:59:59.000Z" }
    }
  ],
  "sourceRefs": [
    {
      "id": "src-campaign-performance",
      "type": "warehouse-query",
      "title": "Campaign performance query",
      "retrievedAt": "2026-05-28T00:00:00.000Z",
      "reliability": { "level": "trusted" }
    }
  ]
}

```



---

<!-- Source: frontend/src/src/contracts/examples/golden/data-visualization.sankey.json -->


# frontend/src/src/contracts/examples/golden/data-visualization.sankey.json

```json
{
  "contractType": "semantic-result",
  "version": "1.0.0",
  "resultId": "golden-sankey-001",
  "screenType": "analysis-result",
  "title": "转化路径分析",
  "createdAt": "2026-05-28T00:00:00.000Z",
  "producer": { "kind": "backend", "name": "path-analysis-service" },
  "regions": [
    {
      "id": "conversion-sankey",
      "type": "data-view",
      "componentBinding": "data-visualization",
      "title": "转化路径 Sankey",
      "data": {
        "viewType": "sankey",
        "requestedView": "chart",
        "chartType": "sankey",
        "nodes": [
          { "id": "impression", "label": "曝光" },
          { "id": "click", "label": "点击" },
          { "id": "purchase", "label": "购买" }
        ],
        "links": [
          { "source": "impression", "target": "click", "value": 1200 },
          { "source": "click", "target": "purchase", "value": 86 }
        ],
        "insights": [
          {
            "id": "insight-click-to-purchase",
            "title": "点击到购买转化较低",
            "summary": "点击到购买路径转化为 7.2%。",
            "evidenceRefs": ["ev-sankey-calc-001"],
            "sourceRefs": ["src-path-query-001"],
            "confidence": { "level": "medium", "basis": "calculation" }
          }
        ]
      },
      "evidenceRefs": ["ev-sankey-calc-001"],
      "sourceRefs": ["src-path-query-001"]
    }
  ],
  "evidenceRefs": [
    {
      "id": "ev-sankey-calc-001",
      "type": "calculation",
      "title": "点击到购买转化率",
      "summary": "86 / 1200 = 7.2%",
      "sourceRefIds": ["src-path-query-001"],
      "confidence": { "level": "medium", "basis": "calculation" },
      "freshness": { "status": "fresh", "retrievedAt": "2026-05-28T00:00:00.000Z" }
    }
  ],
  "sourceRefs": [
    {
      "id": "src-path-query-001",
      "type": "warehouse-query",
      "title": "Conversion path query",
      "retrievedAt": "2026-05-28T00:00:00.000Z",
      "reliability": { "level": "trusted" }
    }
  ]
}

```



---

<!-- Source: frontend/src/src/contracts/examples/golden/runtime-display.tool-call.json -->


# frontend/src/src/contracts/examples/golden/runtime-display.tool-call.json

```json
{
  "contractType": "runtime-display",
  "version": "1.0.0",
  "runtimeId": "runtime-tool-call-001",
  "conversationId": "conv-001",
  "messageId": "msg-003",
  "executionId": "exec-001",
  "status": "succeeded",
  "startedAt": "2026-05-28T00:00:00.000Z",
  "endedAt": "2026-05-28T00:00:03.500Z",
  "toolCalls": [
    {
      "id": "tool-call-report-query-001",
      "toolName": "report_query",
      "toolDisplayName": "报表查询",
      "status": "succeeded",
      "startedAt": "2026-05-28T00:00:00.500Z",
      "endedAt": "2026-05-28T00:00:03.300Z",
      "durationMs": 2800,
      "inputSummary": "查询过去 7 天花费",
      "outputSummary": "返回 7 个日期点"
    }
  ],
  "events": [
    {
      "id": "evt-runtime-started",
      "runtimeId": "runtime-tool-call-001",
      "type": "runtime-started",
      "status": "running",
      "timestamp": "2026-05-28T00:00:00.000Z",
      "title": "开始执行"
    },
    {
      "id": "evt-tool-started",
      "runtimeId": "runtime-tool-call-001",
      "type": "tool-call-started",
      "status": "running",
      "timestamp": "2026-05-28T00:00:00.500Z",
      "toolCallId": "tool-call-report-query-001",
      "title": "开始查询报表"
    },
    {
      "id": "evt-tool-succeeded",
      "runtimeId": "runtime-tool-call-001",
      "type": "tool-call-succeeded",
      "status": "succeeded",
      "timestamp": "2026-05-28T00:00:03.300Z",
      "toolCallId": "tool-call-report-query-001",
      "durationMs": 2800,
      "title": "报表查询完成"
    },
    {
      "id": "evt-runtime-completed",
      "runtimeId": "runtime-tool-call-001",
      "type": "runtime-completed",
      "status": "succeeded",
      "timestamp": "2026-05-28T00:00:03.500Z",
      "title": "执行完成"
    }
  ],
  "metadata": {
    "orchestratorVersion": "1.0.0",
    "toolVersions": { "report_query": "1.0.0" },
    "traceId": "trace-001"
  }
}

```



---

<!-- Source: frontend/src/src/contracts/examples/golden/semantic-result.insufficient-trend.json -->


# frontend/src/src/contracts/examples/golden/semantic-result.insufficient-trend.json

```json
{
  "contractType": "semantic-result",
  "version": "1.0.0",
  "resultId": "golden-insufficient-trend-001",
  "conversationId": "conv-001",
  "messageId": "msg-002",
  "screenType": "report-result",
  "title": "今日花费趋势",
  "createdAt": "2026-05-28T00:00:00.000Z",
  "producer": {
    "kind": "backend",
    "name": "report-query-service",
    "version": "1.0.0"
  },
  "regions": [
    {
      "id": "trend-data-view",
      "type": "data-view",
      "componentBinding": "data-visualization",
      "title": "趋势数据不足",
      "state": "degraded",
      "data": {
        "viewType": "trend",
        "requestedView": "trend",
        "chartType": "table",
        "dateRange": {
          "start": "2026-05-28",
          "end": "2026-05-28",
          "timezone": "Asia/Singapore"
        },
        "granularity": "day",
        "dataCoverage": {
          "status": "insufficient",
          "availablePoints": 1,
          "requiredPoints": 2,
          "missingReasons": ["当前查询范围只有一个日期点，无法形成趋势线。"]
        },
        "metricName": "spend",
        "dataset": [
          { "date": "2026-05-28", "value": 980 }
        ],
        "insights": [
          {
            "id": "insight-insufficient-trend",
            "title": "无法生成趋势图",
            "summary": "趋势至少需要两个日期点。当前只有 2026-05-28 一个数据点。",
            "evidenceRefs": ["ev-single-point-001"],
            "sourceRefs": ["src-report-query-002"],
            "confidence": { "level": "high", "basis": "calculation" }
          }
        ]
      },
      "evidenceRefs": ["ev-single-point-001"],
      "sourceRefs": ["src-report-query-002"],
      "actions": [
        {
          "id": "expand-date-range",
          "type": "continue-analysis",
          "intent": "primary",
          "label": "扩大时间范围继续分析",
          "target": { "kind": "semantic-query", "value": "expand_date_range" },
          "payload": { "suggestedRange": "last_7_days" },
          "evidenceRefs": ["ev-single-point-001"],
          "sourceRefs": ["src-report-query-002"],
          "feedbackPolicy": { "resultHandling": "append-message", "showToast": true }
        },
        {
          "id": "show-table",
          "type": "filter",
          "intent": "secondary",
          "label": "查看当前数据表格",
          "target": { "kind": "local-state", "value": "requestedView" },
          "payload": { "requestedView": "table" }
        }
      ],
      "layoutHints": {
        "placement": "main",
        "width": "full",
        "preferredVariant": "table"
      },
      "fallback": {
        "reason": "empty-data",
        "title": "趋势数据不足",
        "message": "当前时间范围只有一个日期点，无法生成趋势图。",
        "actionIds": ["expand-date-range", "show-table"]
      }
    }
  ],
  "evidenceRefs": [
    {
      "id": "ev-single-point-001",
      "type": "data-snapshot",
      "title": "单日期数据点",
      "summary": "查询结果只包含 2026-05-28 一个日期点。",
      "sourceRefIds": ["src-report-query-002"],
      "confidence": { "level": "high", "basis": "source" },
      "freshness": { "status": "fresh", "retrievedAt": "2026-05-28T00:00:00.000Z" }
    }
  ],
  "sourceRefs": [
    {
      "id": "src-report-query-002",
      "type": "warehouse-query",
      "title": "Ad spend daily report query",
      "retrievedAt": "2026-05-28T00:00:00.000Z",
      "freshness": { "status": "fresh", "asOf": "2026-05-28T00:00:00.000Z" },
      "reliability": { "level": "trusted" }
    }
  ]
}

```



---

<!-- Source: frontend/src/src/contracts/examples/golden/semantic-result.report-trend.json -->


# frontend/src/src/contracts/examples/golden/semantic-result.report-trend.json

```json
{
  "contractType": "semantic-result",
  "version": "1.0.0",
  "resultId": "golden-report-trend-001",
  "conversationId": "conv-001",
  "messageId": "msg-001",
  "screenType": "report-result",
  "title": "过去 7 天花费趋势",
  "createdAt": "2026-05-28T00:00:00.000Z",
  "producer": {
    "kind": "backend",
    "name": "report-query-service",
    "version": "1.0.0"
  },
  "regions": [
    {
      "id": "trend-data-view",
      "type": "data-view",
      "componentBinding": "data-visualization",
      "title": "花费趋势",
      "state": "ready",
      "data": {
        "viewType": "trend",
        "requestedView": "trend",
        "chartType": "line",
        "dateRange": {
          "start": "2026-05-21",
          "end": "2026-05-27",
          "timezone": "Asia/Singapore"
        },
        "granularity": "day",
        "dataCoverage": {
          "status": "complete",
          "availablePoints": 7,
          "requiredPoints": 2
        },
        "metricName": "spend",
        "dataset": [
          { "date": "2026-05-21", "value": 1200 },
          { "date": "2026-05-22", "value": 1180 },
          { "date": "2026-05-23", "value": 1320 },
          { "date": "2026-05-24", "value": 1400 },
          { "date": "2026-05-25", "value": 1380 },
          { "date": "2026-05-26", "value": 1500 },
          { "date": "2026-05-27", "value": 1475 }
        ],
        "insights": [
          {
            "id": "insight-spend-up",
            "title": "花费较周初上升",
            "summary": "5 月 27 日花费相比 5 月 21 日上升约 22.9%。",
            "evidenceRefs": ["ev-spend-calc-001"],
            "sourceRefs": ["src-report-query-001"],
            "confidence": { "level": "high", "basis": "calculation" }
          }
        ]
      },
      "evidenceRefs": ["ev-spend-calc-001"],
      "sourceRefs": ["src-report-query-001"],
      "actions": [
        {
          "id": "drill-down-campaign",
          "type": "drill-down",
          "intent": "secondary",
          "label": "按 Campaign 下钻",
          "target": { "kind": "semantic-query", "value": "drilldown_campaign" },
          "sourceRefs": ["src-report-query-001"],
          "evidenceRefs": ["ev-spend-calc-001"],
          "feedbackPolicy": { "resultHandling": "append-message", "showToast": true }
        }
      ],
      "layoutHints": {
        "placement": "main",
        "width": "full",
        "scrollMode": "virtualized",
        "preferredVariant": "line-chart"
      }
    }
  ],
  "evidenceRefs": [
    {
      "id": "ev-spend-calc-001",
      "type": "calculation",
      "title": "花费变化率计算",
      "summary": "1475 / 1200 - 1 = 22.9%",
      "sourceRefIds": ["src-report-query-001"],
      "confidence": { "level": "high", "score": 0.98, "basis": "calculation" },
      "freshness": { "status": "fresh", "retrievedAt": "2026-05-28T00:00:00.000Z" }
    }
  ],
  "sourceRefs": [
    {
      "id": "src-report-query-001",
      "type": "warehouse-query",
      "title": "Ad spend daily report query",
      "retrievedAt": "2026-05-28T00:00:00.000Z",
      "freshness": { "status": "fresh", "asOf": "2026-05-27T23:59:59.000Z" },
      "reliability": { "level": "trusted" }
    }
  ],
  "metadata": {
    "promptVersion": "report-query-v1",
    "contractVersion": "1.0.0"
  }
}

```



---

<!-- Source: frontend/src/src/contracts/observability/index.ts -->

# frontend/src/src/contracts/observability/index.ts

```ts
export * from './telemetry-contract';

```



---

<!-- Source: frontend/src/src/contracts/observability/telemetry-contract.ts -->

# frontend/src/src/contracts/observability/telemetry-contract.ts

```ts
import type { ActionContract } from '../semantic/action-contract';

export type AIChatOSTelemetryEventName =
  | 'action_invoked'
  | 'action_succeeded'
  | 'action_failed'
  | 'action_confirmed'
  | 'action_cancelled'
  | 'renderer_error'
  | 'renderer_fallback_used'
  | 'contract_validation_failed'
  | 'runtime_latency_recorded'
  | 'runtime_error_shown'
  | 'prompt_contract_generated'
  | 'audit_trail_recorded';

export interface BaseTelemetryEvent {
  eventName: AIChatOSTelemetryEventName;
  timestamp: string;
  conversationId?: string;
  messageId?: string;
  resultId?: string;
  regionId?: string;
  runtimeId?: string;
  userId?: string;
  sessionId?: string;
  contractVersion?: string;
  promptVersion?: string;
  toolVersion?: string;
  metadata?: Record<string, unknown>;
}

export interface ActionTrackingEvent extends BaseTelemetryEvent {
  eventName:
    | 'action_invoked'
    | 'action_succeeded'
    | 'action_failed'
    | 'action_confirmed'
    | 'action_cancelled';
  actionId: string;
  actionType: string;
  actionIntent: string;
  sourceRefs?: string[];
  evidenceRefs?: string[];
  confirmed?: boolean;
  permissionState?: 'allowed' | 'denied' | 'unknown';
  errorCode?: string;
  errorMessage?: string;
}

export interface RendererErrorTelemetryEvent extends BaseTelemetryEvent {
  eventName: 'renderer_error' | 'renderer_fallback_used';
  binding: string;
  rendererVersion?: string;
  errorName?: string;
  errorMessage?: string;
  errorStackHash?: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export interface ContractValidationTelemetryEvent extends BaseTelemetryEvent {
  eventName: 'contract_validation_failed';
  contractType: 'semantic-result' | 'runtime-display' | 'action' | 'evidence' | 'source' | 'renderer-data';
  issueCode: string;
  issuePath?: string;
  issueMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface RuntimeLatencyTelemetryEvent extends BaseTelemetryEvent {
  eventName: 'runtime_latency_recorded';
  status: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  agentCount?: number;
  toolCallCount?: number;
  retryCount?: number;
  approvalWaitMs?: number;
  slowestToolCall?: string;
}

export interface AuditTrailEvent extends BaseTelemetryEvent {
  eventName: 'audit_trail_recorded';
  auditId: string;
  actionId: string;
  actionType: string;
  actionIntent: string;
  actorId?: string;
  actorRole?: string;
  decision?: 'approved' | 'rejected' | 'executed' | 'cancelled';
  riskLevel?: string;
  evidenceRefs?: string[];
  sourceRefs?: string[];
}

export type AIChatOSTelemetryEvent =
  | ActionTrackingEvent
  | RendererErrorTelemetryEvent
  | ContractValidationTelemetryEvent
  | RuntimeLatencyTelemetryEvent
  | AuditTrailEvent
  | BaseTelemetryEvent;

export interface ActionTelemetryContext {
  conversationId?: string;
  messageId?: string;
  resultId?: string;
  regionId?: string;
  runtimeId?: string;
  userId?: string;
  sessionId?: string;
  contractVersion?: string;
}

export function createActionTrackingEvent(
  eventName: ActionTrackingEvent['eventName'],
  action: ActionContract,
  context: ActionTelemetryContext = {},
): ActionTrackingEvent {
  return {
    eventName,
    timestamp: new Date().toISOString(),
    ...context,
    actionId: action.id,
    actionType: action.type,
    actionIntent: action.intent,
    sourceRefs: action.sourceRefs,
    evidenceRefs: action.evidenceRefs,
    confirmed: action.confirm?.required ? eventName === 'action_confirmed' : undefined,
    metadata: action.telemetry,
  };
}

export function createAuditTrailEvent(
  action: ActionContract,
  context: ActionTelemetryContext & { auditId: string; actorId?: string; actorRole?: string; decision?: AuditTrailEvent['decision'] } ,
): AuditTrailEvent {
  return {
    eventName: 'audit_trail_recorded',
    timestamp: new Date().toISOString(),
    ...context,
    actionId: action.id,
    actionType: action.type,
    actionIntent: action.intent,
    riskLevel: action.confirm?.riskLevel,
    evidenceRefs: action.evidenceRefs,
    sourceRefs: action.sourceRefs,
  };
}

```



---

<!-- Source: frontend/src/src/contracts/renderer/RendererErrorBoundary.tsx -->

# frontend/src/src/contracts/renderer/RendererErrorBoundary.tsx

```tsx
import React from 'react';

export interface RendererErrorBoundaryProps {
  regionId: string;
  binding: string;
  rendererVersion?: string;
  onError?: (error: Error, info: React.ErrorInfo, context: { regionId: string; binding: string; rendererVersion?: string }) => void;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export interface RendererErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class RendererErrorBoundary extends React.Component<RendererErrorBoundaryProps, RendererErrorBoundaryState> {
  state: RendererErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): RendererErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info, {
      regionId: this.props.regionId,
      binding: this.props.binding,
      rendererVersion: this.props.rendererVersion,
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" data-renderer-error-boundary="true" data-region-id={this.props.regionId}>
          当前区域渲染失败，已降级展示。
        </div>
      );
    }

    return this.props.children;
  }
}

```



---

<!-- Source: frontend/src/src/contracts/renderer/component-registry-runtime.ts -->

# frontend/src/src/contracts/renderer/component-registry-runtime.ts

```ts
import type { SemanticRegion, SemanticResultContract, ComponentBinding } from '../semantic/semantic-result-contract';
import type {
  ComponentRegistry,
  RegisteredRenderer,
  RendererContext,
  ValidationResult,
} from './component-registry';

export interface RenderedFallbackRegion {
  kind: 'renderer-fallback';
  binding: string;
  regionId: string;
  title?: string;
  reason: string;
  message?: string;
  rawData?: unknown;
}

export interface RenderedResult<TRendered = unknown> {
  kind: 'semantic-result-rendered';
  resultId: string;
  screenType: string;
  regions: TRendered[];
}

export interface ComponentRegistryOptions<TRendered = unknown> {
  fallbackRenderer?: (region: SemanticRegion, context: RendererContext, reason: string) => TRendered;
  onRendererError?: (error: unknown, region: SemanticRegion, binding: string) => void;
  sortRegions?: (regions: SemanticRegion[]) => SemanticRegion[];
}

export function createComponentRegistry<TRendered = unknown>(
  options: ComponentRegistryOptions<TRendered> = {},
): ComponentRegistry<TRendered> {
  const renderers = new Map<ComponentBinding, RegisteredRenderer<unknown, unknown, TRendered>>();

  const fallbackRenderer = options.fallbackRenderer ?? ((region, _context, reason) => ({
    kind: 'renderer-fallback',
    binding: region.componentBinding,
    regionId: region.id,
    title: region.title,
    reason,
    message: region.fallback?.message ?? `无法渲染该区域：${reason}`,
    rawData: region.data,
  }) as TRendered);

  const sortRegions = options.sortRegions ?? ((regions: SemanticRegion[]) => [...regions].sort((a, b) => {
    const ap = a.layoutHints?.priority ?? a.priority ?? 100;
    const bp = b.layoutHints?.priority ?? b.priority ?? 100;
    return ap - bp;
  }));

  function register(renderer: RegisteredRenderer<unknown, unknown, TRendered>): void {
    if (!renderer.binding) throw new Error('Renderer binding is required.');
    if (!renderer.validate) throw new Error(`Renderer ${renderer.binding} must define validate().`);
    if (!renderer.render) throw new Error(`Renderer ${renderer.binding} must define render().`);
    renderers.set(renderer.binding, renderer);
  }

  function unregister(binding: ComponentBinding): void {
    renderers.delete(binding);
  }

  function resolve(binding: ComponentBinding): RegisteredRenderer<unknown, unknown, TRendered> | undefined {
    return renderers.get(binding);
  }

  function renderRegion(region: SemanticRegion, context: RendererContext): TRendered {
    const renderer = resolve(region.componentBinding);

    if (!renderer) {
      context.telemetry?.track('renderer_fallback_used', {
        reason: 'unknown_binding',
        binding: region.componentBinding,
        regionId: region.id,
      });
      return fallbackRenderer(region, context, 'unknown_binding');
    }

    const permissionAllowed = context.permissionChecker?.(region.permission?.requiredPermissions) ?? true;
    const visible = context.visibilityEvaluator?.(region) ?? region.visibility?.defaultVisible ?? true;

    if (!visible) {
      return fallbackRenderer(region, context, 'hidden_by_visibility_policy');
    }

    if (!permissionAllowed) {
      context.telemetry?.track('renderer_fallback_used', {
        reason: 'permission_denied',
        binding: region.componentBinding,
        regionId: region.id,
      });
      return renderer.fallback?.(region, context, 'permission_denied') ?? fallbackRenderer(region, context, 'permission_denied');
    }

    let validation: ValidationResult<unknown>;
    try {
      validation = renderer.validate(region.data, region);
    } catch (error) {
      options.onRendererError?.(error, region, region.componentBinding);
      context.telemetry?.track('renderer_validation_threw', {
        binding: region.componentBinding,
        regionId: region.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return renderer.fallback?.(region, context, 'validator_error') ?? fallbackRenderer(region, context, 'validator_error');
    }

    if (!validation.valid) {
      context.telemetry?.track('renderer_fallback_used', {
        reason: 'invalid_data',
        binding: region.componentBinding,
        regionId: region.id,
        errors: validation.errors,
        warnings: validation.warnings,
      });
      return renderer.fallback?.(region, context, 'invalid_data') ?? fallbackRenderer(region, context, 'invalid_data');
    }

    try {
      return renderer.render(region, context);
    } catch (error) {
      options.onRendererError?.(error, region, region.componentBinding);
      context.telemetry?.track('renderer_error', {
        binding: region.componentBinding,
        regionId: region.id,
        rendererVersion: renderer.version,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        fallbackUsed: true,
      });
      return renderer.fallback?.(region, context, 'render_error') ?? fallbackRenderer(region, context, 'render_error');
    }
  }

  function renderResult(result: SemanticResultContract, context: RendererContext): TRendered {
    const regions = sortRegions(result.regions).map((region) => renderRegion(region, context));
    return {
      kind: 'semantic-result-rendered',
      resultId: result.resultId,
      screenType: result.screenType,
      regions,
    } as TRendered;
  }

  return {
    register,
    unregister,
    resolve,
    renderRegion,
    renderResult,
  };
}

```



---

<!-- Source: frontend/src/src/contracts/renderer/default-renderers.ts -->

# frontend/src/src/contracts/renderer/default-renderers.ts

```ts
import type { SemanticRegion } from '../semantic/semantic-result-contract';
import type { RegisteredRenderer, RendererContext, ValidationResult } from './component-registry';
import { validateRendererData } from '../validation/renderer-data-validator';
import { createComponentRegistry } from './component-registry-runtime';

export interface RendererViewModel {
  kind: string;
  regionId: string;
  title?: string;
  data?: unknown;
  actions?: unknown[];
  evidenceRefs?: string[];
  sourceRefs?: string[];
  runtimeRefs?: unknown[];
  fallbackReason?: string;
}

function validationToRendererResult(validation: ReturnType<typeof validateRendererData>): ValidationResult<unknown> {
  return {
    valid: validation.valid,
    errors: validation.errors.map((issue) => ({ code: issue.code, message: issue.message, path: issue.path })),
    warnings: validation.warnings.map((issue) => ({ code: issue.code, message: issue.message, path: issue.path })),
    normalizedData: validation.value,
  };
}

function createRenderer(binding: SemanticRegion['componentBinding'], kind = binding): RegisteredRenderer<unknown, unknown, RendererViewModel> {
  return {
    binding,
    version: '1.0.0',
    displayName: `${binding} default renderer`,
    validate: (data, region) => validationToRendererResult(validateRendererData(binding, data, region)),
    render: (region: SemanticRegion, _context: RendererContext): RendererViewModel => ({
      kind,
      regionId: region.id,
      title: region.title,
      data: region.data,
      actions: region.actions,
      evidenceRefs: region.evidenceRefs,
      sourceRefs: region.sourceRefs,
      runtimeRefs: region.runtimeRefs,
    }),
    fallback: (region: SemanticRegion, _context: RendererContext, reason: string): RendererViewModel => ({
      kind: 'fallback',
      regionId: region.id,
      title: region.title,
      data: region.data,
      fallbackReason: reason,
    }),
  };
}

export function createDefaultRendererRegistry() {
  const registry = createComponentRegistry<RendererViewModel>();

  const bindings: Array<SemanticRegion['componentBinding']> = [
    'markdown-result',
    'data-visualization',
    'ai-runtime',
    'workflow-trace',
    'asset-reference',
    'decision-card',
    'evidence-panel',
    'source-list',
    'action-bar',
    'form-input',
    'feedback-panel',
    'permission-gate',
    'empty-state',
    'error-state',
  ];

  for (const binding of bindings) {
    registry.register(createRenderer(binding));
  }

  return registry;
}

```



---

<!-- Source: frontend/src/src/contracts/renderer/index.execution.ts -->

# frontend/src/src/contracts/renderer/index.execution.ts

```ts
export * from './component-registry-runtime';
export * from './default-renderers';
export * from './RendererErrorBoundary';

```



---

<!-- Source: frontend/src/src/contracts/validation/action-validator.ts -->

# frontend/src/src/contracts/validation/action-validator.ts

```ts
import type { ActionContract } from '../semantic/action-contract';
import {
  addIssue,
  createValidationResult,
  enumSet,
  isRecord,
  requireEnum,
  requireString,
  type ContractValidationOptions,
  type ContractValidationResult,
} from './contract-validator';

const ACTION_TYPES = enumSet([
  'navigate',
  'open-url',
  'open-source',
  'open-evidence',
  'open-artifact',
  'query',
  'drill-down',
  'filter',
  'sort',
  'export',
  'copy',
  'share',
  'continue-analysis',
  'regenerate',
  'retry',
  'run-workflow',
  'approve',
  'reject',
  'request-access',
  'create-task',
  'submit-feedback',
  'dismiss',
  'custom',
] as const);

const ACTION_INTENTS = enumSet([
  'primary',
  'secondary',
  'tertiary',
  'destructive',
  'risky',
  'system',
  'background',
] as const);

const HIGH_RISK_TYPES = new Set(['approve', 'reject', 'run-workflow', 'export']);

export function isActionContract(value: unknown): value is ActionContract {
  return validateActionContract(value).valid;
}

export function validateActionContract(
  value: unknown,
  options: ContractValidationOptions = {},
  path = '$',
): ContractValidationResult<ActionContract> {
  const result = createValidationResult<ActionContract>(value as ActionContract);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'action_not_object',
      message: 'ActionContract must be an object.',
      path,
    });
  }

  requireString(result, value, 'id', path);
  requireString(result, value, 'label', path);
  requireEnum(result, value.type, ACTION_TYPES, `${path}.type`, 'ActionType');
  requireEnum(result, value.intent, ACTION_INTENTS, `${path}.intent`, 'ActionIntent');

  const actionType = typeof value.type === 'string' ? value.type : undefined;
  const actionIntent = typeof value.intent === 'string' ? value.intent : undefined;
  const confirm = value.confirm;
  const audit = value.audit;

  if ((HIGH_RISK_TYPES.has(actionType ?? '') || actionIntent === 'destructive' || actionIntent === 'risky') && isRecord(confirm)) {
    if (confirm.required !== true) {
      addIssue(result, {
        level: options.strict ? 'error' : 'warning',
        code: 'high_risk_action_confirm_not_required',
        message: 'High-risk actions should require confirmation.',
        path: `${path}.confirm.required`,
      });
    }
  }

  if ((HIGH_RISK_TYPES.has(actionType ?? '') || actionIntent === 'destructive' || actionIntent === 'risky') && !isRecord(confirm)) {
    addIssue(result, {
      level: options.strict ? 'error' : 'warning',
      code: 'high_risk_action_missing_confirm',
      message: 'High-risk actions should define ActionConfirm.',
      path: `${path}.confirm`,
    });
  }

  if ((HIGH_RISK_TYPES.has(actionType ?? '') || actionIntent === 'destructive' || actionIntent === 'risky') && (!isRecord(audit) || audit.required !== true)) {
    addIssue(result, {
      level: options.strict ? 'error' : 'warning',
      code: 'high_risk_action_missing_audit',
      message: 'High-risk actions should define audit.required = true.',
      path: `${path}.audit.required`,
    });
  }

  if (value.target !== undefined && !isRecord(value.target)) {
    addIssue(result, {
      level: 'error',
      code: 'action_target_invalid',
      message: 'ActionContract.target must be an object when provided.',
      path: `${path}.target`,
    });
  }

  return result;
}

```



---

<!-- Source: frontend/src/src/contracts/validation/contract-validator.ts -->

# frontend/src/src/contracts/validation/contract-validator.ts

```ts
export type ValidationLevel = 'error' | 'warning' | 'info';

export interface ContractValidationIssue {
  level: ValidationLevel;
  code: string;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface ContractValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  errors: ContractValidationIssue[];
  warnings: ContractValidationIssue[];
  infos: ContractValidationIssue[];
}

export interface ContractValidationOptions {
  strict?: boolean;
  allowWarnings?: boolean;
  requireEvidenceForInsights?: boolean;
  requireSourceForDataViews?: boolean;
  now?: string;
}

export function createValidationResult<T>(value?: T): ContractValidationResult<T> {
  return {
    valid: true,
    value,
    errors: [],
    warnings: [],
    infos: [],
  };
}

export function addIssue<T>(
  result: ContractValidationResult<T>,
  issue: ContractValidationIssue,
): ContractValidationResult<T> {
  if (issue.level === 'error') {
    result.errors.push(issue);
    result.valid = false;
  } else if (issue.level === 'warning') {
    result.warnings.push(issue);
  } else {
    result.infos.push(issue);
  }
  return result;
}

export function mergeValidationResults<T>(
  target: ContractValidationResult<T>,
  child: ContractValidationResult<unknown>,
): ContractValidationResult<T> {
  for (const issue of child.errors) addIssue(target, issue);
  for (const issue of child.warnings) addIssue(target, issue);
  for (const issue of child.infos) addIssue(target, issue);
  return target;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function requireString<T>(
  result: ContractValidationResult<T>,
  obj: Record<string, unknown>,
  key: string,
  path: string,
): void {
  if (!isNonEmptyString(obj[key])) {
    addIssue(result, {
      level: 'error',
      code: 'required_string_missing',
      message: `Required string field is missing: ${key}`,
      path: `${path}.${key}`,
    });
  }
}

export function requireArray<T>(
  result: ContractValidationResult<T>,
  obj: Record<string, unknown>,
  key: string,
  path: string,
  options?: { nonEmpty?: boolean },
): void {
  if (!Array.isArray(obj[key])) {
    addIssue(result, {
      level: 'error',
      code: 'required_array_missing',
      message: `Required array field is missing: ${key}`,
      path: `${path}.${key}`,
    });
    return;
  }
  if (options?.nonEmpty && (obj[key] as unknown[]).length === 0) {
    addIssue(result, {
      level: 'error',
      code: 'required_array_empty',
      message: `Required array field must not be empty: ${key}`,
      path: `${path}.${key}`,
    });
  }
}

export function enumSet<T extends string>(values: readonly T[]): ReadonlySet<string> {
  return new Set(values);
}

export function requireEnum<T>(
  result: ContractValidationResult<T>,
  value: unknown,
  allowed: ReadonlySet<string>,
  path: string,
  fieldName = 'value',
): void {
  if (typeof value !== 'string' || !allowed.has(value)) {
    addIssue(result, {
      level: 'error',
      code: 'invalid_enum_value',
      message: `Invalid ${fieldName}: ${String(value)}`,
      path,
    });
  }
}

```



---

<!-- Source: frontend/src/src/contracts/validation/evidence-source-validator.ts -->

# frontend/src/src/contracts/validation/evidence-source-validator.ts

```ts
import type { EvidenceRef } from '../semantic/evidence-contract';
import type { SourceRef } from '../semantic/source-contract';
import {
  addIssue,
  createValidationResult,
  enumSet,
  isRecord,
  requireEnum,
  requireString,
  type ContractValidationResult,
} from './contract-validator';

const EVIDENCE_TYPES = enumSet([
  'metric-value',
  'data-row',
  'data-snapshot',
  'query-result',
  'calculation',
  'chart-observation',
  'document-excerpt',
  'tool-output',
  'runtime-trace',
  'human-approval',
  'model-output',
  'experiment-result',
  'external-reference',
  'policy-rule',
  'unknown',
] as const);

const SOURCE_TYPES = enumSet([
  'warehouse-table',
  'warehouse-query',
  'api',
  'file',
  'document',
  'url',
  'email',
  'spreadsheet',
  'chart',
  'report',
  'artifact',
  'tool',
  'runtime',
  'human',
  'model',
  'system',
  'policy',
  'unknown',
] as const);

export function validateEvidenceRef(value: unknown, path = '$'): ContractValidationResult<EvidenceRef> {
  const result = createValidationResult<EvidenceRef>(value as EvidenceRef);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'evidence_not_object',
      message: 'EvidenceRef must be an object.',
      path,
    });
  }

  requireString(result, value, 'id', path);
  requireString(result, value, 'title', path);
  requireEnum(result, value.type, EVIDENCE_TYPES, `${path}.type`, 'EvidenceType');

  if (value.confidence !== undefined && !isRecord(value.confidence)) {
    addIssue(result, {
      level: 'warning',
      code: 'evidence_confidence_invalid',
      message: 'EvidenceRef.confidence should be an object when provided.',
      path: `${path}.confidence`,
    });
  }

  if (value.freshness !== undefined && !isRecord(value.freshness)) {
    addIssue(result, {
      level: 'warning',
      code: 'evidence_freshness_invalid',
      message: 'EvidenceRef.freshness should be an object when provided.',
      path: `${path}.freshness`,
    });
  }

  return result;
}

export function validateSourceRef(value: unknown, path = '$'): ContractValidationResult<SourceRef> {
  const result = createValidationResult<SourceRef>(value as SourceRef);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'source_not_object',
      message: 'SourceRef must be an object.',
      path,
    });
  }

  requireString(result, value, 'id', path);
  requireString(result, value, 'title', path);
  requireEnum(result, value.type, SOURCE_TYPES, `${path}.type`, 'SourceType');

  if (value.locator !== undefined && !isRecord(value.locator)) {
    addIssue(result, {
      level: 'warning',
      code: 'source_locator_invalid',
      message: 'SourceRef.locator should be an object when provided.',
      path: `${path}.locator`,
    });
  }

  return result;
}

```



---

<!-- Source: frontend/src/src/contracts/validation/index.ts -->

# frontend/src/src/contracts/validation/index.ts

```ts
export * from './contract-validator';
export * from './action-validator';
export * from './evidence-source-validator';
export * from './renderer-data-validator';
export * from './report-trend-validator';
export * from './runtime-display-validator';
export * from './semantic-result-validator';

```



---

<!-- Source: frontend/src/src/contracts/validation/renderer-data-validator.ts -->

# frontend/src/src/contracts/validation/renderer-data-validator.ts

```ts
import type { ComponentBinding, SemanticRegion } from '../semantic/semantic-result-contract';
import {
  addIssue,
  createValidationResult,
  isRecord,
  type ContractValidationResult,
} from './contract-validator';
import { validateReportTrendData } from './report-trend-validator';

export function validateRendererData(
  binding: ComponentBinding | string,
  data: unknown,
  region?: SemanticRegion,
  path = '$.data',
): ContractValidationResult<unknown> {
  switch (binding) {
    case 'markdown-result':
      return validateMarkdownData(data, path);
    case 'data-visualization':
      return validateDataVisualizationData(data, region, path);
    case 'ai-runtime':
    case 'workflow-trace':
      return validateRuntimeBindingData(data, region, path);
    case 'asset-reference':
      return validateAssetReferenceData(data, path);
    default:
      return validateUnknownBindingData(binding, data, path);
  }
}

function validateMarkdownData(data: unknown, path: string): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: 'markdown_data_not_object',
      message: 'markdown-result data must be an object.',
      path,
    });
  }
  if (typeof data.markdown !== 'string' && typeof data.text !== 'string') {
    addIssue(result, {
      level: 'error',
      code: 'markdown_text_missing',
      message: 'markdown-result requires markdown or text.',
      path,
    });
  }
  return result;
}

function validateDataVisualizationData(
  data: unknown,
  region: SemanticRegion | undefined,
  path: string,
): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: 'data_visualization_data_not_object',
      message: 'data-visualization data must be an object.',
      path,
    });
  }

  const viewType = data.viewType;
  const requestedView = data.requestedView;
  if (typeof viewType !== 'string' && typeof requestedView !== 'string') {
    addIssue(result, {
      level: 'warning',
      code: 'data_visualization_view_type_missing',
      message: 'data-visualization should define viewType or requestedView.',
      path,
    });
  }

  if (viewType === 'trend' || requestedView === 'trend' || data.chartType === 'line' || data.chartType === 'area') {
    const trendResult = validateReportTrendData(data, region, path);
    result.errors.push(...trendResult.errors);
    result.warnings.push(...trendResult.warnings);
    result.infos.push(...trendResult.infos);
    result.valid = result.errors.length === 0;
  }

  if (viewType === 'sankey' || data.chartType === 'sankey') {
    if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) {
      addIssue(result, {
        level: 'error',
        code: 'sankey_nodes_links_missing',
        message: 'Sankey visualization requires nodes and links arrays.',
        path,
      });
    }
  }

  return result;
}

function validateRuntimeBindingData(
  data: unknown,
  region: SemanticRegion | undefined,
  path: string,
): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  const hasRegionRuntimeRefs = Array.isArray(region?.runtimeRefs) && region.runtimeRefs.length > 0;
  const hasRuntimeRef = isRecord(data) && (typeof data.runtimeId === 'string' || typeof data.runtimeRef === 'string');
  if (!hasRegionRuntimeRefs && !hasRuntimeRef) {
    addIssue(result, {
      level: 'warning',
      code: 'runtime_binding_missing_runtime_ref',
      message: 'Runtime renderer should receive region.runtimeRefs or data.runtimeId/runtimeRef.',
      path,
    });
  }
  return result;
}

function validateAssetReferenceData(data: unknown, path: string): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: 'asset_data_not_object',
      message: 'asset-reference data must be an object.',
      path,
    });
  }
  if (typeof data.artifactId !== 'string' && typeof data.assetId !== 'string') {
    addIssue(result, {
      level: 'error',
      code: 'asset_id_missing',
      message: 'asset-reference requires artifactId or assetId.',
      path,
    });
  }
  return result;
}

function validateUnknownBindingData(binding: string, data: unknown, path: string): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  addIssue(result, {
    level: 'warning',
    code: 'unknown_component_binding',
    message: `Unknown componentBinding: ${binding}. Global fallback renderer should be used.`,
    path,
  });
  return result;
}

```



---

<!-- Source: frontend/src/src/contracts/validation/report-trend-validator.ts -->

# frontend/src/src/contracts/validation/report-trend-validator.ts

```ts
import type { SemanticRegion } from '../semantic/semantic-result-contract';
import {
  addIssue,
  createValidationResult,
  isRecord,
  type ContractValidationResult,
} from './contract-validator';

export interface ReportTrendDataPoint {
  date: string;
  value: number;
  series?: string;
  [key: string]: unknown;
}

export interface ReportTrendData {
  viewType?: 'trend' | 'table' | 'chart' | 'summary' | 'sankey' | string;
  requestedView?: 'trend' | 'table' | 'chart' | 'summary' | 'auto' | string;
  chartType?: 'line' | 'area' | 'bar' | 'sankey' | string;
  dateRange?: {
    start: string;
    end: string;
    timezone?: string;
  };
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | string;
  dataCoverage?: {
    status: 'complete' | 'partial' | 'insufficient' | 'unknown' | string;
    availablePoints: number;
    requiredPoints: number;
    missingReasons?: string[];
  };
  dataset?: ReportTrendDataPoint[];
  series?: Array<{ name: string; points: ReportTrendDataPoint[] }>;
  insights?: Array<{
    id: string;
    title: string;
    summary?: string;
    evidenceRefs?: string[];
    sourceRefs?: string[];
    confidence?: unknown;
  }>;
  [key: string]: unknown;
}

function countDistinctDatePoints(data: ReportTrendData): number {
  const dates = new Set<string>();
  for (const point of Array.isArray(data.dataset) ? data.dataset : []) {
    if (typeof point.date === 'string') dates.add(point.date);
  }
  for (const series of Array.isArray(data.series) ? data.series : []) {
    for (const point of Array.isArray(series.points) ? series.points : []) {
      if (typeof point.date === 'string') dates.add(point.date);
    }
  }
  return dates.size;
}

export function isTrendRequested(data: ReportTrendData): boolean {
  return (
    data.requestedView === 'trend' ||
    data.viewType === 'trend' ||
    data.chartType === 'line' ||
    data.chartType === 'area' ||
    data.chartType === 'trend'
  );
}

export function validateReportTrendData(
  value: unknown,
  region?: SemanticRegion,
  path = '$.data',
): ContractValidationResult<ReportTrendData> {
  const result = createValidationResult<ReportTrendData>(value as ReportTrendData);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'report_trend_data_not_object',
      message: 'Report trend data must be an object.',
      path,
    });
  }

  const data = value as ReportTrendData;
  const trendRequested = isTrendRequested(data);

  if (trendRequested) {
    if (!isRecord(data.dateRange)) {
      addIssue(result, {
        level: 'error',
        code: 'trend_date_range_missing',
        message: 'Trend view requires dateRange.',
        path: `${path}.dateRange`,
      });
    }

    if (typeof data.granularity !== 'string') {
      addIssue(result, {
        level: 'error',
        code: 'trend_granularity_missing',
        message: 'Trend view requires granularity.',
        path: `${path}.granularity`,
      });
    }

    if (!isRecord(data.dataCoverage)) {
      addIssue(result, {
        level: 'error',
        code: 'trend_data_coverage_missing',
        message: 'Trend view requires dataCoverage.',
        path: `${path}.dataCoverage`,
      });
    }

    const distinctDatePoints = countDistinctDatePoints(data);
    const availablePoints = isRecord(data.dataCoverage) && typeof data.dataCoverage.availablePoints === 'number'
      ? data.dataCoverage.availablePoints
      : distinctDatePoints;

    if (distinctDatePoints < 2 || availablePoints < 2) {
      addIssue(result, {
        level: region?.state === 'degraded' ? 'warning' : 'error',
        code: 'trend_requires_at_least_two_date_points',
        message: 'Trend visualization requires at least two distinct date points. Use degraded insufficient-trend fallback instead.',
        path,
        details: { distinctDatePoints, availablePoints },
      });
    }
  }

  if (Array.isArray(data.insights)) {
    data.insights.forEach((insight, index) => {
      const hasEvidence = Array.isArray(insight.evidenceRefs) && insight.evidenceRefs.length > 0;
      const hasSource = Array.isArray(insight.sourceRefs) && insight.sourceRefs.length > 0;
      if (!hasEvidence && !hasSource) {
        addIssue(result, {
          level: 'warning',
          code: 'trend_insight_missing_evidence_or_source',
          message: 'Trend insight should reference evidenceRefs or sourceRefs.',
          path: `${path}.insights[${index}]`,
        });
      }
    });
  }

  return result;
}

```



---

<!-- Source: frontend/src/src/contracts/validation/runtime-display-validator.ts -->

# frontend/src/src/contracts/validation/runtime-display-validator.ts

```ts
import type { RuntimeDisplayProtocol } from '../runtime/runtime-display-protocol';
import {
  addIssue,
  createValidationResult,
  enumSet,
  isRecord,
  requireArray,
  requireEnum,
  requireString,
  type ContractValidationOptions,
  type ContractValidationResult,
} from './contract-validator';

const RUNTIME_STATUS = enumSet([
  'idle',
  'queued',
  'planning',
  'running',
  'streaming',
  'waiting-for-user',
  'waiting-for-approval',
  'retrying',
  'recovering',
  'succeeded',
  'partially-succeeded',
  'failed',
  'cancelled',
  'expired',
] as const);

export function isRuntimeDisplayProtocol(value: unknown): value is RuntimeDisplayProtocol {
  return validateRuntimeDisplayProtocol(value).valid;
}

export function validateRuntimeDisplayProtocol(
  value: unknown,
  _options: ContractValidationOptions = {},
  path = '$',
): ContractValidationResult<RuntimeDisplayProtocol> {
  const result = createValidationResult<RuntimeDisplayProtocol>(value as RuntimeDisplayProtocol);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'runtime_not_object',
      message: 'RuntimeDisplayProtocol must be an object.',
      path,
    });
  }

  if (value.contractType !== 'runtime-display') {
    addIssue(result, {
      level: 'error',
      code: 'runtime_contract_type_invalid',
      message: 'RuntimeDisplayProtocol.contractType must be "runtime-display".',
      path: `${path}.contractType`,
    });
  }

  requireString(result, value, 'version', path);
  requireString(result, value, 'runtimeId', path);
  requireEnum(result, value.status, RUNTIME_STATUS, `${path}.status`, 'RuntimeStatus');
  requireArray(result, value, 'events', path);

  if (Array.isArray(value.events)) {
    value.events.forEach((event, index) => {
      const eventPath = `${path}.events[${index}]`;
      if (!isRecord(event)) {
        addIssue(result, {
          level: 'error',
          code: 'runtime_event_not_object',
          message: 'RuntimeEvent must be an object.',
          path: eventPath,
        });
        return;
      }
      requireString(result, event, 'id', eventPath);
      requireString(result, event, 'runtimeId', eventPath);
      requireString(result, event, 'type', eventPath);
      requireString(result, event, 'timestamp', eventPath);
      requireEnum(result, event.status, RUNTIME_STATUS, `${eventPath}.status`, 'RuntimeStatus');

      if (event.runtimeId !== value.runtimeId) {
        addIssue(result, {
          level: 'warning',
          code: 'runtime_event_id_mismatch',
          message: 'RuntimeEvent.runtimeId should match RuntimeDisplayProtocol.runtimeId.',
          path: `${eventPath}.runtimeId`,
        });
      }
    });
  }

  if (value.status === 'failed' && (!Array.isArray(value.errors) || value.errors.length === 0)) {
    addIssue(result, {
      level: 'warning',
      code: 'failed_runtime_missing_errors',
      message: 'Failed runtime should include errors[].',
      path: `${path}.errors`,
    });
  }

  return result;
}

```



---

<!-- Source: frontend/src/src/contracts/validation/semantic-result-validator.ts -->

# frontend/src/src/contracts/validation/semantic-result-validator.ts

```ts
import type { SemanticResultContract, SemanticRegion } from '../semantic/semantic-result-contract';
import {
  addIssue,
  createValidationResult,
  enumSet,
  isRecord,
  mergeValidationResults,
  requireArray,
  requireEnum,
  requireString,
  type ContractValidationOptions,
  type ContractValidationResult,
} from './contract-validator';
import { validateActionContract } from './action-validator';
import { validateEvidenceRef, validateSourceRef } from './evidence-source-validator';
import { validateRendererData } from './renderer-data-validator';

const SCREEN_TYPES = enumSet([
  'conversation-answer',
  'analysis-result',
  'report-result',
  'dashboard-result',
  'metric-explainer',
  'decision-review',
  'workflow-result',
  'asset-viewer',
  'error-result',
  'empty-result',
  'permission-blocked',
] as const);

const REGION_TYPES = enumSet([
  'summary',
  'primary-result',
  'supporting-detail',
  'insight',
  'metric',
  'data-view',
  'evidence',
  'source',
  'action-bar',
  'runtime',
  'workflow',
  'asset',
  'form',
  'warning',
  'error',
  'metadata',
] as const);

const COMPONENT_BINDINGS = enumSet([
  'markdown-result',
  'data-visualization',
  'ai-runtime',
  'workflow-trace',
  'asset-reference',
  'decision-card',
  'evidence-panel',
  'source-list',
  'action-bar',
  'form-input',
  'feedback-panel',
  'permission-gate',
  'empty-state',
  'error-state',
] as const);

export function isSemanticResultContract(value: unknown): value is SemanticResultContract {
  return validateSemanticResultContract(value).valid;
}

export function validateSemanticResultContract(
  value: unknown,
  options: ContractValidationOptions = { requireEvidenceForInsights: true, requireSourceForDataViews: true },
  path = '$',
): ContractValidationResult<SemanticResultContract> {
  const result = createValidationResult<SemanticResultContract>(value as SemanticResultContract);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'semantic_result_not_object',
      message: 'SemanticResultContract must be an object.',
      path,
    });
  }

  if (value.contractType !== 'semantic-result') {
    addIssue(result, {
      level: 'error',
      code: 'semantic_contract_type_invalid',
      message: 'SemanticResultContract.contractType must be "semantic-result".',
      path: `${path}.contractType`,
    });
  }

  requireString(result, value, 'version', path);
  requireString(result, value, 'resultId', path);
  requireString(result, value, 'createdAt', path);
  requireEnum(result, value.screenType, SCREEN_TYPES, `${path}.screenType`, 'ScreenType');
  requireArray(result, value, 'regions', path, { nonEmpty: true });

  const evidenceIds = new Set<string>();
  const sourceIds = new Set<string>();
  const actionIds = new Set<string>();

  if (Array.isArray(value.evidenceRefs)) {
    value.evidenceRefs.forEach((evidence, index) => {
      if (isRecord(evidence) && typeof evidence.id === 'string') evidenceIds.add(evidence.id);
      mergeValidationResults(result, validateEvidenceRef(evidence, `${path}.evidenceRefs[${index}]`));
    });
  }

  if (Array.isArray(value.sourceRefs)) {
    value.sourceRefs.forEach((source, index) => {
      if (isRecord(source) && typeof source.id === 'string') sourceIds.add(source.id);
      mergeValidationResults(result, validateSourceRef(source, `${path}.sourceRefs[${index}]`));
    });
  }

  if (Array.isArray(value.actions)) {
    value.actions.forEach((action, index) => {
      if (isRecord(action) && typeof action.id === 'string') actionIds.add(action.id);
      mergeValidationResults(result, validateActionContract(action, options, `${path}.actions[${index}]`));
      validateActionReferences(result, action, evidenceIds, sourceIds, `${path}.actions[${index}]`);
    });
  }

  if (Array.isArray(value.regions)) {
    const regionIds = new Set<string>();
    value.regions.forEach((region, index) => {
      const regionPath = `${path}.regions[${index}]`;
      if (isRecord(region) && typeof region.id === 'string') {
        if (regionIds.has(region.id)) {
          addIssue(result, {
            level: 'error',
            code: 'duplicate_region_id',
            message: `Duplicate region id: ${region.id}`,
            path: `${regionPath}.id`,
          });
        }
        regionIds.add(region.id);
      }
      validateRegion(result, region, evidenceIds, sourceIds, actionIds, options, regionPath);
    });
  }

  return result;
}

function validateRegion(
  result: ContractValidationResult<SemanticResultContract>,
  region: unknown,
  evidenceIds: Set<string>,
  sourceIds: Set<string>,
  _rootActionIds: Set<string>,
  options: ContractValidationOptions,
  path: string,
): void {
  if (!isRecord(region)) {
    addIssue(result, {
      level: 'error',
      code: 'region_not_object',
      message: 'SemanticRegion must be an object.',
      path,
    });
    return;
  }

  requireString(result, region, 'id', path);
  requireEnum(result, region.type, REGION_TYPES, `${path}.type`, 'RegionType');
  requireEnum(result, region.componentBinding, COMPONENT_BINDINGS, `${path}.componentBinding`, 'ComponentBinding');

  if (!('data' in region)) {
    addIssue(result, {
      level: 'error',
      code: 'region_data_missing',
      message: 'SemanticRegion.data is required.',
      path: `${path}.data`,
    });
  }

  validateStringRefs(result, region.evidenceRefs, evidenceIds, `${path}.evidenceRefs`, 'evidence_ref_not_found');
  validateStringRefs(result, region.sourceRefs, sourceIds, `${path}.sourceRefs`, 'source_ref_not_found');

  if (Array.isArray(region.actions)) {
    region.actions.forEach((action, index) => {
      mergeValidationResults(result, validateActionContract(action, options, `${path}.actions[${index}]`));
      validateActionReferences(result, action, evidenceIds, sourceIds, `${path}.actions[${index}]`);
    });
  }

  const type = typeof region.type === 'string' ? region.type : undefined;
  const binding = typeof region.componentBinding === 'string' ? region.componentBinding : undefined;
  const evidenceCount = Array.isArray(region.evidenceRefs) ? region.evidenceRefs.length : 0;
  const sourceCount = Array.isArray(region.sourceRefs) ? region.sourceRefs.length : 0;

  if (options.requireEvidenceForInsights !== false && (type === 'insight' || type === 'warning' || binding === 'decision-card')) {
    if (evidenceCount === 0 && sourceCount === 0) {
      addIssue(result, {
        level: 'warning',
        code: 'trust_region_missing_evidence_or_source',
        message: 'Insight/warning/decision regions should reference evidenceRefs or sourceRefs.',
        path,
      });
    }
  }

  if (options.requireSourceForDataViews !== false && binding === 'data-visualization' && sourceCount === 0) {
    addIssue(result, {
      level: 'warning',
      code: 'data_visualization_missing_source',
      message: 'Data visualization region should reference sourceRefs.',
      path: `${path}.sourceRefs`,
    });
  }

  mergeValidationResults(
    result,
    validateRendererData(binding ?? 'unknown', region.data, region as SemanticRegion, `${path}.data`),
  );
}

function validateStringRefs(
  result: ContractValidationResult<SemanticResultContract>,
  refs: unknown,
  allowedIds: Set<string>,
  path: string,
  code: string,
): void {
  if (refs === undefined) return;
  if (!Array.isArray(refs)) {
    addIssue(result, {
      level: 'error',
      code: 'refs_not_array',
      message: 'Reference field must be an array of ids.',
      path,
    });
    return;
  }
  refs.forEach((ref, index) => {
    if (typeof ref !== 'string') {
      addIssue(result, {
        level: 'error',
        code: 'ref_not_string',
        message: 'Reference id must be a string.',
        path: `${path}[${index}]`,
      });
      return;
    }
    if (allowedIds.size > 0 && !allowedIds.has(ref)) {
      addIssue(result, {
        level: 'warning',
        code,
        message: `Reference id was not found in top-level refs: ${ref}`,
        path: `${path}[${index}]`,
      });
    }
  });
}

function validateActionReferences(
  result: ContractValidationResult<SemanticResultContract>,
  action: unknown,
  evidenceIds: Set<string>,
  sourceIds: Set<string>,
  path: string,
): void {
  if (!isRecord(action)) return;
  validateStringRefs(result, action.evidenceRefs, evidenceIds, `${path}.evidenceRefs`, 'action_evidence_ref_not_found');
  validateStringRefs(result, action.sourceRefs, sourceIds, `${path}.sourceRefs`, 'action_source_ref_not_found');
}

```



---

<!-- Source: scripts/guardrails/check-contract-governance.ts -->

# scripts/guardrails/check-contract-governance.ts

```ts
import fs from 'node:fs';
import path from 'node:path';

interface Violation {
  level: 'error' | 'warning';
  file: string;
  line: number;
  code: string;
  message: string;
}

const root = process.cwd();
const includeDirs = ['frontend/src', 'src', 'app', 'components'].filter((dir) => fs.existsSync(path.join(root, dir)));
const allowedLegacyDirs = [
  'adapters',
  'migration',
  '__tests__',
  'examples/golden',
  'legacy',
];

const privateActionPatterns = [
  'chartActions',
  'tableButtons',
  'cardCta',
  'ctaButtons',
  'localActions',
  'vizActions',
  'messageActions',
];

const privateEvidenceSourcePatterns = [
  'dataSources',
  'sourceItems',
  'citationItems',
  'evidenceItems',
  'proofs',
  'references',
];

const contractRedefinitions = [
  /interface\s+ActionContract\b/,
  /type\s+ActionType\b/,
  /interface\s+SemanticResultContract\b/,
  /interface\s+EvidenceRef\b/,
  /interface\s+SourceRef\b/,
  /interface\s+RuntimeDisplayProtocol\b/,
];

const legacyFinalRenderTypes = [
  'ResponseContract',
  'ReportQueryViewModel',
  'MetricExplainerUISchema',
  'AgentProcessEvent',
];

function shouldSkipDir(dir: string): boolean {
  return dir.includes('node_modules') || dir.includes('.next') || dir.includes('dist') || dir.includes('build');
}

function isAllowedLegacyFile(file: string): boolean {
  return allowedLegacyDirs.some((part) => file.includes(`${path.sep}${part}${path.sep}`));
}

function walk(dir: string, files: string[] = []): string[] {
  if (shouldSkipDir(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const violations: Violation[] = [];

function addViolation(level: Violation['level'], file: string, line: number, code: string, message: string) {
  violations.push({ level, file: path.relative(root, file), line, code, message });
}

for (const includeDir of includeDirs) {
  for (const file of walk(path.join(root, includeDir))) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    const allowedLegacy = isAllowedLegacyFile(file);
    const inContracts = file.includes(`${path.sep}contracts${path.sep}`);

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;

      for (const pattern of privateActionPatterns) {
        if (line.includes(pattern) && !allowedLegacy) {
          addViolation('error', file, lineNo, 'private_action_field', `禁止新增私有动作字段 ${pattern}，请映射到 ActionContract。`);
        }
      }

      for (const pattern of privateEvidenceSourcePatterns) {
        if (line.includes(pattern) && !allowedLegacy) {
          addViolation('warning', file, lineNo, 'private_evidence_source_field', `疑似私有 source/evidence 字段 ${pattern}，请映射到 EvidenceRef/SourceRef。`);
        }
      }

      for (const regexp of contractRedefinitions) {
        if (regexp.test(line) && !inContracts) {
          addViolation('error', file, lineNo, 'contract_redefinition', '禁止在 contracts 真源外重新定义统一契约类型。');
        }
      }

      for (const legacyType of legacyFinalRenderTypes) {
        if (line.includes(legacyType) && !allowedLegacy) {
          addViolation('error', file, lineNo, 'legacy_schema_direct_consumption', `禁止用户页面直接消费旧 schema ${legacyType} 作为最终结果，请通过 adapter。`);
        }
      }
    });

    if (/register\s*\(\s*\{[\s\S]*binding:/.test(text) && !/fallback\s*:/.test(text)) {
      addViolation('error', file, 1, 'renderer_missing_fallback', 'Renderer 注册必须提供 fallback，或确认走全局 fallback。');
    }

    if (/insight|recommendation|risk|diagnosis|confidence/.test(text) && !/evidenceRefs|sourceRefs/.test(text) && !allowedLegacy) {
      addViolation('warning', file, 1, 'trust_content_missing_refs', '包含 insight/recommendation/risk/confidence 的代码应检查 evidenceRefs/sourceRefs。');
    }
  }
}

if (violations.length > 0) {
  console.error('\nAI Chat OS contract governance violations:\n');
  for (const violation of violations) {
    console.error(`${violation.level.toUpperCase()} ${violation.file}:${violation.line} [${violation.code}] ${violation.message}`);
  }
  const hasError = violations.some((violation) => violation.level === 'error');
  process.exit(hasError ? 1 : 0);
}

console.log('AI Chat OS contract governance check passed.');

```
