# Tool-First Query Runtime

Status: P0.6 architecture refresh.

Tool-First Query Runtime makes capability and tool contracts the source of parameter requirements.

## Execution Order

```txt
Request Understanding
-> Capability Discovery
-> Tool Selection
-> Tool Required Inputs
-> Parameter Resolution
-> Clarification or Tool Execution
-> Result Adapter
```

## Rules

- Query Contract must not block capability discovery.
- Request Understanding must not pre-build the final Query Contract; it only emits user goal, domain signals, constraints, and ambiguity.
- Capability/Tool Contract decides required inputs after capability discovery; Parameter Resolution then fills them.
- `metric`, `time`, and `dimension` are not universal required fields.
- Daily report and project overview capabilities may provide default metric sets and dates.
- Media exact/alias/synonym unique match must fill `media_id` into tool input; low-confidence or multi-match cases must ask for confirmation.
- Tool execution count includes only real tool calls.
- If required tool inputs cannot be resolved, `tool_execution_status` must be `not_called`.

---

## v0.2 总纲一致性补充

Tool-first 已升级为 Enterprise AI Chat OS 的通用执行原则，详见 `runtime/tool-first-architecture.md`。查询类 runtime 必须遵守 MCP business error normalization：transport success 不代表业务成功，业务失败不得由 LLM 伪造成成功回答。
