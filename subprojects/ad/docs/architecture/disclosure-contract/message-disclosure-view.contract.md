# MessageDisclosureView Contract

`MessageDisclosureView` 是右侧“过程与依据”面板的唯一消费对象。

## Contract Shape

```txt
MessageDisclosureView
├─ overview
├─ execution
├─ evidence
├─ fields
├─ qualityChecks
├─ rawInfo
├─ permissions
└─ emptyStates
```

## Contract Rules

1. 必须带 `messageId`，用于绑定消息。
2. `overview` 只负责摘要和状态，不负责拼接原始 JSON。
3. `execution` 只展示执行过程和步骤，不负责业务结论。
4. `evidence` 只展示来源与证据，不负责字段解释。
5. `fields` 只展示字段目录或显式输入，不靠字段名猜业务语义。
6. `rawInfo` 是唯一可放原始 JSON 的区域，并且默认折叠。
7. `permissions` 决定哪些区域可直接展开，哪些区域必须脱敏。

