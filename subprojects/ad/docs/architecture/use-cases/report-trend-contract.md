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
