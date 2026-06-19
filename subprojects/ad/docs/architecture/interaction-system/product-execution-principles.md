# Product Execution Principles

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 用户体验原则

- 先给结论，再给证据入口和下一步动作。
- 不把内部架构词、接口名、schema 名作为用户可见文案。
- 每个动作都要说明用户点击后会发生什么。
- 高风险动作必须确认或审批。
- 任务与产物必须能回到会话继续处理。

## 与架构契约关系

用户动作走 ActionContract；证据走 Evidence Ledger；报表走 Report Domain；长流程走 Task；产物走 Artifact；过程透明走 Disclosure。
