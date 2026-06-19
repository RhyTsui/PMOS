# Radius / Border System

## 1. Token 分类

```txt
radius.none
radius.xs
radius.sm
radius.md
radius.lg
radius.xl
radius.full
border.width.hairline
border.width.default
border.color.default
border.color.subtle
border.color.strong
border.color.focus
border.color.error
```

## 2. 使用规则

```txt
1. Card / Message / Tooltip / Modal 的圆角必须来自 radius token。
2. Focus ring 必须可见，并使用 border.focus token。
3. 图表选中态、表格选中态、Runtime 当前步骤边框必须统一。
4. 禁止使用 box-shadow 伪装关键交互边框。
```
