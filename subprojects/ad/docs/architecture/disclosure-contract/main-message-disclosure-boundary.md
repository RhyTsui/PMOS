# Main Message & Right-Side Disclosure Boundary

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 主消息负责

- 用户可消费的结论、摘要、关键证据和下一步动作。
- Artifact/Task/Report 的摘要与入口。
- 明确业务失败、缺少信息、降级或不可执行原因。

## 右侧披露负责

- Resolver Chain 决策、候选能力与未选原因。
- MCP/tool 原始输出、normalized business outcome。
- Evidence Ledger 明细、source、file chunk、calculation、model inference。
- Trace、runtime timeline、质量检查、字段目录、raw data。

## 禁止项

主消息不得塞入内部默认策略、完整 trace、原始 payload、tool arguments、trace 原始参数、内部枚举、冗余项目参数或调试字段；右侧披露不得替代主消息回答。主消息只能保留用户可理解的结论、关键证据摘要、业务失败/缺失信息说明和下一步动作。
