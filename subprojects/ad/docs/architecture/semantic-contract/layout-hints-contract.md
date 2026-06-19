# Layout Hints Contract

> Scope: region 的布局弱约束

## 规则

`layoutHints` 只表达“建议怎么排”，不表达“必须怎么渲染”。

允许字段：

- `priority`
- `placement`
- `width`
- `height`
- `minHeight`
- `maxHeight`
- `density`
- `collapsible`
- `defaultCollapsed`
- `sticky`
- `scrollMode`
- `responsiveBehavior`
- `preferredVariant`

## 禁止事项

- 不得直接写 CSS class。
- 不得替代 Visual System token。
- 不得覆盖权限、可见性和 fallback 规则。

