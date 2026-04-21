# data-service Adoption Decision

- version: v0.1
- date: 2026-04-21
- status: active
- purpose: 明确 `data-service` 在当前 `v0.4 / v0.5` 收口中的 workflow adoption 结论

## Current Evidence

根据当前仓库证据：

- `subprojects/data-service/docs/README.md` 存在
- 尚无项目级 execution workflow doc
- 尚无 PM task sheet
- 尚无 inbox-linked intake
- 尚无显式 review / governance 路径

当前最准确状态仍是：

- adoption status: `not-adopted`

## Decision

`data-service` 不进入本轮 `v0.4` 收口主线，也不作为今天必须补齐的 workflow rollout 对象。

本轮结论：

1. 保持 `not-adopted`
2. 不把它误算成当前 rollout 未完成的阻塞项
3. 作为后续单独决策项处理：
   - 如果 `data-service` 会进入活跃产品化协作，就补 baseline workflow
   - 如果它只是支撑型工程子项目，就走更轻的治理子集，而不是完整 PM workflow

## Impact On Current Plan

这份结论创建后，以下执行清单项可视为已关闭：

- `data-service adoption 是否进入下一轮要有明确结论`

但以下事项仍未发生：

- `data-service` 的真实 adoption rollout
- `data-service` 的 baseline workflow 文档化

## Next Trigger

当满足以下任一条件时，再重新打开这条线：

- `data-service` 开始承接独立产品需求
- 需要独立 roadmap / decision / project board
- 需要纳入统一 chief / PM 评审流
