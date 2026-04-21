# Browser UI Smoke Decision

- version: v0.1
- date: 2026-04-21
- status: active
- purpose: 明确浏览器端全面 UI smoke 在本轮 `v0.4` 收口中的位置，避免它继续作为模糊阻塞项存在

## Current Situation

当前已具备的验证包括：

- `npm run build`
- 多轮 API smoke
- Workspace 关键侧边栏能力的运行态验证

当前未完成的是：

- 全面浏览器端逐面板 smoke

## Decision

本轮结论：

1. 浏览器端全面 UI smoke 保持 `optional`
2. 它不是 `v0.4` 收口阻塞项
3. 今天不因为它继续拖住版本边界

## Reason

- 当前主线价值已经通过构建、API smoke、运行态面板增量得到证明
- 全面浏览器端 smoke 成本更高，且更适合作为补充验证
- 继续把它挂在主线清单里，只会制造“似乎还没收完”的假阻塞

## Follow-Up

如果后续出现以下任一情况，再重新打开这条线：

- 浏览器端出现明确白屏、导航错误或交互失效
- 需要做正式演示前的整体验收
- 需要对外共享固定浏览器入口时
