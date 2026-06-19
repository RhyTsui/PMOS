# MCP Business Error Normalization

> Priority: P0
> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 核心规则

MCP transport success 只表示工具调用链路可用，不表示业务成功。所有 MCP tool result 必须归一化为 business outcome。

## 状态模型

- `succeeded`：业务成功，有可消费结果。
- `business_failed`：业务失败，如数据不存在、权限不足、参数不支持、口径不存在。
- `tool_failed`：工具异常、schema 错误、server error。
- `unavailable`：超时、server 不可达、工具禁用。
- `partial`：部分成功，必须说明缺口。

## P0 禁止项

- 不得把 `business_failed` 当作成功回答。
- 不得让 LLM 用猜测补齐失败工具结果。
- 不得隐藏 normalized error，只在 trace 中记录。

## 输出要求

Normalized result 必须写入 Evidence Ledger、Runtime/Trace、DisclosureProjection，并被 ResponseContract 的错误/降级语义引用。
