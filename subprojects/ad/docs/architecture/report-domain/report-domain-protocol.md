# Report Domain Protocol

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 定位

Report Domain 是报表业务域协议，不是 UI schema。它定义报表请求、指标口径、数据来源、生成过程、证据、产物、任务与动作。

本文件是报表业务域协议真源。Request Understanding 只识别报表目标、业务域信号、约束与歧义；不得在 `request-understanding` 下重复维护报表协议或提前生成最终 Query Contract。

## Contract

- `reportId`、`reportType`、`title`。
- `metricDefinitions`：指标名、口径、单位、时间范围。
- `dataSources`：SourceRef、MCP tool、file、retrievedAt。
- `generationSteps`：查询、计算、汇总、模型解释。
- `evidenceLedgerRefs`。
- `artifactRefs`：PDF、Excel、图表、分析包。
- `taskRef`：异步生成状态。
- `actions`：导出、继续分析、创建任务、打开证据。

## 收口

报表摘要进入 SemanticResultContract；生成过程进入 Disclosure；报表文件进入 Artifact；长流程进入 Task；所有结论引用 Evidence Ledger。
