# Observability & Trace Architecture

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 观测范围

必须覆盖 Request Understanding、Capability Discovery、Resolver Chain、Execution Policy、MCP/Tool、Model、Evidence Ledger、SemanticResultContract、DisclosureProjection、Frontend render、Admin config version。

## Trace fail-open（P0）

观测写入或上报失败不得导致 chat 主链路失败。业务失败和观测失败必须分离：业务失败进入 ResponseContract；观测失败进入 observability degraded 标记，并尽最大可能记录本地降级事件或补偿上报。

## 评估

Evaluation 以真实链路为准：请求、理解结果、候选能力、工具归一化、证据、最终结果、右侧披露。脚本通过不能替代真实 `/api/chat` 回放。
