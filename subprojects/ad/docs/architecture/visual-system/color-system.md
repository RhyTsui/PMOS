# Color System

> 本文档仅治理颜色系统分类与使用边界，不修改当前 5 月 27 色彩真源值。

## 1. Token 分类

```txt
color.brand.*
color.neutral.*
color.background.*
color.surface.*
color.text.*
color.border.*
color.state.hover
color.state.active
color.state.disabled
color.semantic.success
color.semantic.warning
color.semantic.error
color.semantic.info
color.ai.thinking
color.ai.running
color.ai.completed
color.ai.failed
color.chart.series.*
color.trust.high
color.trust.medium
color.trust.low
```

## 2. 使用规则

```txt
1. 禁止业务组件直接使用 hex/rgb/hsl。
2. 图表颜色必须来自 chart token，不得每个图自定义 palette。
3. AI Runtime 状态颜色必须来自 ai/state token。
4. 置信度、风险、权限等信号必须使用 semantic/trust token。
5. Dark Mode 通过 token 映射，不在组件里写条件色。
```

## 3. 特殊域映射

| 场景 | Token 域 |
|---|---|
| AI 正在生成 | color.ai.thinking |
| Tool running | color.ai.running |
| Evidence verified | color.trust.high |
| Data stale | color.semantic.warning |
| Permission blocked | color.semantic.error / neutral disabled |
