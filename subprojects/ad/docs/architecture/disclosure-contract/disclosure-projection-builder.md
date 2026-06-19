# Disclosure Projection Builder

Projection Builder 的职责是把当前消息、运行态、证据、字段目录和权限策略，组装成 `MessageDisclosureView`。

## 输入

- Message
- SemanticResultContract
- RuntimeDisplayProtocol
- SourceRef / EvidenceRef
- Field Catalog
- Permission Policy

## 输出

- `MessageDisclosureView`

## 规则

1. 允许兼容旧元数据，但只能在 builder / adapter 层处理。
2. 不允许 renderer 直接读取旧字段名并自己推断。
3. 不允许用 `currentResult` 代替消息绑定。
4. 不允许把 raw payload 挂到 `overview` 或 `execution` 的主文案里。

