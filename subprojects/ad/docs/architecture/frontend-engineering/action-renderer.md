# Action Renderer

> Scope: `action-bar`

## 目标

把结果页上的下一步动作统一成按钮/链接/下钻入口。

## 规则

1. 动作来源必须是 `ActionContract` 或经明确归一的 next action。
2. action renderer 不得私有定义行为协议。
3. 高风险动作必须有确认语义。

