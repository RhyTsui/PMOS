# Semantic Result Adapter Policy

> Scope: legacy payload -> `SemanticResultContract`

## 定位

适配器只负责把旧输入归一为当前契约，不负责展示。

## 规则

1. 兼容逻辑只能存在于 adapter 层。
2. renderer 和页面层不得直接读旧 payload。
3. 旧结构必须转换成 `screenType + regions + componentBinding`。
4. 若旧结构无法稳定映射，必须显式落入 empty/error/permission 状态。

