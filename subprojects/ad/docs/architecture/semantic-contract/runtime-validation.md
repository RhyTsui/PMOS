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
