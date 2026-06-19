# Tool Contract

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 定位

Tool Contract 约束 MCP、文件解析器、任务执行器、报表生成器等可执行工具。Prompt 和 LLM 不得替代 Tool Contract。

## 字段

- `toolId`、`provider`、`sourceType`。
- `inputSchema`、`outputSchema`、`requiredParams`。
- `permission`、`riskLevel`、`confirmPolicy`。
- `timeout`、`retryPolicy`、`fallbackPolicy`。
- `businessOutcomeMapping`：MCP business error normalization。
- `evidencePolicy`：哪些输出必须写入 Evidence Ledger。

## 执行规则

Tool 成功必须同时满足 transport success 与 business outcome success。业务失败必须进入 ResponseContract、Disclosure 与 Trace。
