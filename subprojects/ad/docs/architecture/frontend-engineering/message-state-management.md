# Message State Management

> Scope: 消息级状态、结果绑定、披露绑定

## 核心原则

1. 状态按 `message_id` 绑定，不读全局 `currentResult`。
2. 正文、结果、过程与依据必须分别绑定到对应消息。
3. 运行态、来源、证据、字段目录只做消息级投影，不做全局拼接。

## 关键状态

- `messageContract`
- `semanticResult`
- `disclosureView`
- `runtimeDisplay`
- `messageFeedback`
- `messageVersions`

## 禁止事项

- 不允许用最后一次查询结果覆盖当前消息。
- 不允许将旧消息的 disclosure 绑定到新消息。
- 不允许把展示态当作全局缓存。

