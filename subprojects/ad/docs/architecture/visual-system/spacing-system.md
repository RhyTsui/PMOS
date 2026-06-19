# Spacing System

## 1. 职责

Spacing System 统一页面、卡片、消息、表单、图表、Runtime Timeline 的间距节奏。

## 2. Token 分类

```txt
space.0
space.1
space.2
space.3
space.4
space.5
space.6
space.8
space.10
space.12
space.16
space.20
space.24
layout.page.padding
layout.section.gap
layout.card.padding
layout.message.gap
layout.form.gap
layout.panel.gap
```

## 3. 使用规则

```txt
1. 禁止大量一次性硬编码 margin/padding。
2. Chat message 的 vertical rhythm 必须统一。
3. Runtime Timeline 的 step gap 使用 timeline token。
4. Data Visualization 的 chart padding、legend gap、tooltip spacing 映射 token。
5. 移动端使用 responsive spacing token，不在组件局部乱改。
```
