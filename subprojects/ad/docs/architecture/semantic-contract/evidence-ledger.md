# Evidence Ledger

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 定义

Evidence Ledger 是可追溯证据账本，统一记录所有支持结论、建议、风险、报表、任务状态和工具执行的证据、来源、生成过程与审计线索。它不是展示字段集合，也不是 `evidenceRefs` 数组；EvidenceRef/SourceRef 只是进入 SemanticResultContract 和 Presentation 的引用视图，完整证据仍归档在账本中。

## Entry 类型

- `source_quote`：知识或网页引用。
- `tool_output`：MCP/tool 结构化结果。
- `file_chunk`：文件片段与解析结果。
- `calculation`：计算过程和口径。
- `model_inference`：模型推断，必须显式标记。
- `artifact`：产物引用。
- `task_state`：任务状态。
- `trace_event`：执行事件。

## 最小字段

`evidenceId`、`type`、`title`、`sourceRefIds`、`payloadRef`、`quote`、`confidence`、`generatedBy`、`createdAt`、`riskFlags`、`traceId`。

## 使用规则

主消息只引用摘要；右侧披露可展示明细。没有 Evidence Ledger 的结论必须标记为推断或建议。任何 renderer 不得把 EvidenceRef/SourceRef 当成完整证据容器，也不得私有化账本结构。
