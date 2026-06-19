# Trace Fail-Open Policy

> Priority: P0
> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 原则

Trace/Observability 是观测面，不是业务成功条件。Trace 写入、上报、span 追加或 replay 记录失败不得导致 chat 主链路失败，也不得改变 ResponseContract 的业务成功/失败语义。

## 行为

- trace sink 不可用：主链路继续，记录本地降级事件或 best-effort buffer。
- span 写入失败：不抛业务错误，只标记 observability degraded。
- replay 缺失：评估标记缺口，不改用户结果。

## P0 禁止项

不得把 trace 写入失败返回为业务失败；不得把业务失败隐藏为 trace 异常。
