# Legacy Runtime to Disclosure Adapter

这是唯一允许接触旧链路字段的地方。

## 兼容范围

- `tool_calls`
- `process_events`
- `runtime_state`
- `workflow_result`
- `message_contract`
- `semantic_result`
- `report_query_result`
- `evidence_bundle`
- `execution_context`
- `agent_runtime`

## 规则

1. 只做适配，不做业务判断。
2. 只输出 disclosure projection seed，不直接渲染 UI。
3. 兼容逻辑不得扩散到 renderer、page、message state。
4. 迁移完成后，旧字段只能作为输入，不再作为展示源。

