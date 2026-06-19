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
