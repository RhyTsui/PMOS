# Resolver Chain Architecture

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 定义

Resolver Chain 是从 Request Understanding 到执行决策的确定性链路。它让系统解释“为什么选择这个工具/模型/任务，以及为什么没有选择其他候选”。

## 链路

1. `intentResolver`：读取 `userGoal/topIntent`、domainSignals、constraints、ambiguity、risk，只校准理解结果，不生成最终 Query Contract。
2. `capabilityResolver`：根据 Capability Source Registry 得到候选能力，并按 intent fit、domain fit、contract fit、权限/风险、可用性、证据质量排序。
3. `toolResolver`：将能力映射到 MCP tool、file parser、task runner、LLM 或 report generator，并读取 Capability/Tool Contract 的 required slots。
4. `parameterResolver`：基于 Contract 解析参数、补齐默认值、输出 missingInfo，并执行 exact/alias/synonym 解析。
5. `preflightResolver`：检查权限、配额、可达性、风险确认和低置信确认。
6. `executionResolver`：决定 execute、ask-user、degrade、reject、queue-task、model-only。
7. `resultResolver`：组装 Evidence Ledger、SemanticResultContract、DisclosureProjection。

## 观测字段

每个 resolver 必须记录 input、candidate、rankingScore、rankingFactors、decision、reason、rejectedCandidates、requiredSlots、resolvedParams、confidence、confirmationRequired、policyVersion、traceId。Trace 写入失败必须 fail-open。

## P0 参数补齐规则

媒体类请求中，若用户输入通过 exact / alias / synonym 唯一命中媒体对象，`parameterResolver` 必须自动补齐 `media_id` 并写回 tool input；若命中多个候选或置信度低，必须把候选交给 `preflightResolver` 触发用户确认，不得把自然语言媒体名直接传给工具，也不得猜测 `media_id`。
