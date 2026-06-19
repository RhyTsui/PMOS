# Capability Source Architecture

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 能力来源

Capability Source Registry 统一治理 Knowledge、Web、MCP、File、Task、LLM 六类来源。来源只声明能力与边界，不直接决定前端 UI。

| Source | 可做什么 | 不可做什么 |
|---|---|---|
| Knowledge | 内部规则、文档、知识问答 | 伪造实时数据 |
| Web | 外部公开信息检索 | 替代内部系统事实 |
| MCP | 真实业务查询和动作 | 用 transport success 代表业务成功 |
| File | 附件解析、文件引用 | 忽略 hash/chunk/source |
| Task | 长流程、审批、异步执行 | 伪装为同步完成 |
| LLM | 总结、解释、追问、草稿 | 替代 Tool Contract 或事实执行 |

## Source Contract 要求

每个来源必须声明：`sourceId`、`sourceType`、`capabilities`、`permissions`、`inputSchema`、`outputSchema`、`evidencePolicy`、`failureSemantics`、`configVersion`。

## 治理规则

- 能力来源由 Admin 控制面配置或注册，不得散落为 if/else。
- 运行结果必须进入 Evidence Ledger 或明确标记为不可验证。
- 来源变化必须进入 Observability，便于回放与评估。
