# Screen Type Spec

> Scope: 页面级语义类型

## 说明

`screenType` 只描述当前结果页的语义，不描述具体组件。

## 推荐枚举

- `conversation-answer`
- `analysis-result`
- `report-result`
- `dashboard-result`
- `metric-explainer`
- `decision-review`
- `workflow-result`
- `asset-viewer`
- `error-result`
- `empty-result`
- `permission-blocked`

## 规则

1. `screenType` 可以影响页面级布局和 region 排序。
2. 具体组件必须由 `componentBinding` 决定。

