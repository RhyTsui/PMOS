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
