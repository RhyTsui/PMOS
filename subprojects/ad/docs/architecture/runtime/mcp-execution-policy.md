# MCP Execution Policy

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 执行阶段

`preflight -> call -> normalize -> evidence -> result assembly -> disclosure -> trace`

## 归一化

MCP transport succeeded 只表示调用链路成功返回，不等于 business succeeded。MCP 结果必须映射为 `succeeded`、`business_failed`、`tool_failed`、`unavailable`、`partial`。归一化发生在进入模型总结和前端渲染之前，且不得把 transport success 直接渲染成业务成功。

## 证据与披露

所有 MCP output、error、参数、server、tool version、duration 必须进入 Evidence Ledger 或 Trace；主消息展示用户可理解结果，右侧披露展示细节。
