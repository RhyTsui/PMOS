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

## 5. P0.6 / P0.7 Executable Checks

Additional executable anchors:

```txt
frontend/src/scripts/route-runtime-golden.ts
frontend/src/src/contracts/automation/
frontend/src/src/lib/mcp-tool-output-adapter.ts
```

Rules:

1. Tool-first query runtime must be covered by runtime golden.
2. `tool_execution_status=not_called` must not count as a real tool execution.
3. MCP workflow and automation status adapters must be compatible mappings only.
4. Automation protocol must stay a minimal task/run/status/artifact/notification closure.
