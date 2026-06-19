# Capability Discovery & Execution Policy

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## Discovery 输入

Capability Discovery 只能消费 Request Understanding 的输出：`userGoal/topIntent`、`domainSignals`、constraints、contextRefs、ambiguity/missingInfo、risk，不得重新定义用户意图。Discovery 必须早于最终 Query Contract、最终 required slots 和参数补齐；它只产生候选能力与执行路径，不负责把自然语言直接固化为工具参数。

## Discovery 输出

- `candidates[]`：候选能力、来源、置信度、依赖、风险。
- `selectedCapability`：被选中的能力及选择原因。
- `rejectedCandidates[]`：未选择原因。
- `requiredTools[]`：MCP/File/Task/LLM/Report 执行单元。
- `executionMode`：sync、async-task、model-only、ask-user、blocked。
- `slotSource`：标记 required slots 来自 Capability Contract 还是 Tool Contract；不得来自 Request Understanding 的提前推断。
- `ranking`：候选排序依据，至少包含 intent fit、domain fit、contract fit、permission/risk、availability、evidence quality。

## Execution Policy

- 事实、计算、业务动作：tool-required。
- 缺少必填参数：ask-user。
- 高风险动作：confirm/approve 后执行。
- MCP 不可达：degrade 或 ask-user，不得由模型伪造结果。
- model-only：仅用于解释、草稿、开放式生成，并标记为 inference。
## 参数与低置信确认

Tool/Capability Contract 决定最终 required slots；Resolver Chain 的 Parameter Resolver 负责 exact/alias/synonym 解析、默认值补齐、缺失项追问和低置信确认。媒体类请求若 exact / alias / synonym 唯一命中媒体对象，必须自动补齐 `media_id` 并写回 tool input；多候选或低置信时必须 ask-user 确认，不得猜测执行。

## 失败处理

执行失败必须进入 Evidence Ledger 与 Disclosure。业务失败使用 normalized business outcome，不得渲染为成功。
