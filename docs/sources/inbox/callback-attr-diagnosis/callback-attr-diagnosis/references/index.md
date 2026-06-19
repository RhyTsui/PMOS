# Callback Attr Diagnosis References Index

推荐加载顺序：

1. [execution-mode.md](./execution-mode.md)
2. [checklist.md](./checklist.md)
3. [rubric.md](./rubric.md)
4. [concepts.md](./concepts.md)

## Guardrails

- [checklist.md](./checklist.md)：使用前、调用中、结论前的轻量检查清单。
- [rubric.md](./rubric.md)：复盘或自检输出质量的评分维度与严重扣分项。

## Android Tips

- `diag.check_callback_rule_match` 是 Android 主入口。
- `diag.query_callback_rule_config` 只是低频补证据工具。
- `event_type=PAY` 时，除非用户明确要求，不要优先调用 `diag.query_attr_clue_event_detail`。


## iOS/鸿蒙 Tips

- `diag.resolve_callback_diagnosis_branch` 是 iOS/鸿蒙 分支主入口。
- 优先向用户解释“激活-SDK初始化/虚拟激活参考分支”“API回推分支”等中文含义，再附带 `branch_key`。
- `diag.check_callback_rule_match` 只做规则侧补证据。
- `diag.query_fusion_attr_config`、`diag.query_sdk_init_delivery` 只在明确需要时再调用。
