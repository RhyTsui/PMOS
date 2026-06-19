# Component Binding Contract

> Scope: `region.type -> renderer` 的挂载规则

## 定位

`componentBinding` 是唯一渲染入口，用于把 region 绑定到前端组件。

## 规则

1. binding 必须在 registry 中注册。
2. renderer 只能消费 region.data 和统一 context。
3. renderer 不得直接读取 raw backend payload。
4. renderer 不得私有定义 action、evidence、source、runtime。

## 目标绑定

- `markdown-result`
- `data-visualization`
- `ai-runtime`
- `workflow-trace`
- `decision-card`
- `asset-reference`
- `evidence-panel`
- `source-list`
- `action-bar`
- `disclosure-panel`
- `empty-state`
- `error-state`
- `permission-gate`

