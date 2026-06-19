# Typography System

> 本文档仅治理字体系统的使用边界与 token 分类，不修改当前 5 月 27 字体真源值。

## 1. 职责

Typography System 统一：

```txt
字体族
字号
字重
行高
字间距
标题层级
正文层级
Label / Caption
数字字体
代码字体
中英文混排
```

## 2. Token 分类

```txt
font.family.sans
font.family.mono
font.family.numeric
font.size.display
font.size.title
font.size.body
font.size.label
font.size.caption
font.weight.regular
font.weight.medium
font.weight.semibold
font.weight.bold
font.lineHeight.tight
font.lineHeight.normal
font.lineHeight.relaxed
font.letterSpacing.normal
font.letterSpacing.compact
```

## 3. 使用规则

```txt
1. 业务组件不得硬编码 font-size/font-weight。
2. Markdown renderer 必须映射到 Typography token。
3. Data Visualization 中的轴标签、tooltip、legend 也必须使用 token。
4. Runtime UI 中的状态、日志、trace 使用 mono/body/caption token，不得私有化。
5. 数字指标优先使用 numeric token。
```

## 4. Codex CLI 检查关键词

```txt
font-size:
fontWeight
text-[
font-[
px/rem 直接作为字号
```
