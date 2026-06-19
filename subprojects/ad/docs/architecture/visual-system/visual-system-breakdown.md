# Visual System Breakdown Specification

> Canonical path: `docs/architecture/visual-system/visual-system-breakdown.md`  
> Scope: Visual System 的拆分目录与 token 收口规则
> Current token source: `docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md`

## 1. 文档定位

Visual System 是所有 region、renderer、runtime、data visualization、conversation surface 共用的视觉基础。

它不定义业务协议，不定义 renderer data shape。

本文件只定义 Visual System 的拆分目录与治理边界，不覆盖当前已经落地的字体、字号、颜色和 token 值。当前字体与颜色真源保持为：

- `docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md`
- `frontend/src/src/app/globals.css`
- `frontend/src/src/lib/zhitou-chat-colors.ts`
- `frontend/src/src/components/AntdProvider.tsx`

## 2. 推荐拆分文档

```txt
visual-system/
├─ typography.md
├─ color-system.md
├─ icon-system.md
├─ spacing-system.md
├─ radius-border-system.md
├─ elevation-shadow-system.md
├─ motion-system.md
├─ chat-presentation-visual-system.md
└─ illustration-visual-language.md
```

`chat-presentation-visual-system.md` 是 Chat 会话区视觉表现的主定义区，负责 Message Shell、Result Panel、过程与依据面板、Chat 专用 token 和正常链路视觉模板。它不定义新的语义协议，不替代 `SemanticResultContract`、`RuntimeDisplayProtocol` 或 Component Registry。

## 3. Typography

已覆盖项继续保留：

```txt
font family
font size
font weight
line height
letter spacing
数字字体
中英文混排
标题层级
body / label / caption
code / monospace
```

约束：

1. 字号、字重、行高必须 token 化。
2. Chat message、Data card、Runtime timeline 不得私有定义字体层级。
3. 不得恢复 `Inter` 首选字体、负字距或非 400/500/600/700 的散落字重。

## 4. Color System

已覆盖项继续保留：

```txt
brand color
neutral color
semantic color
background layer
text color
border color
status color
chart color
AI status color
```

约束：

1. 颜色不得散落硬编码。
2. AI Trust、Runtime、Data Visualization 必须复用 semantic color。
3. 风险、错误、警告颜色必须一致。
4. 不得替换当前 `ZHITOU_CHAT_COLORS` 语义色值；新增色阶必须先更新 2026-05-27 设计系统文档。

## 5. Icon System

待补重点：

```txt
icon library
icon size scale
stroke width
filled / outlined rule
status icon
AI / agent icon
tool icon
data source icon
evidence icon
action icon
```

约束：

1. 同一语义只允许一个主图标。
2. 图标不可替代文本说明。
3. 高风险动作图标必须匹配 intent。

## 6. Spacing System

待补重点：

```txt
base spacing scale
page padding
card padding
section gap
message gap
form gap
timeline gap
data table density
responsive spacing
```

约束：

1. 不允许随意 `margin: 13px`。
2. Chat、Runtime、Data Visualization 的间距必须来自同一 scale。
3. compact / comfortable / spacious 与 layoutHints.density 对齐。

## 7. Radius / Border

待补重点：

```txt
radius scale
card radius
button radius
input radius
modal radius
border color
divider
focus ring
selected border
error border
```

约束：

1. focus ring 不能被去掉。
2. selected / active / error border 必须与 Color System 对齐。
3. Card / Panel / Message bubble 使用统一圆角等级。

## 8. Elevation / Shadow

待补重点：

```txt
layer scale
shadow token
modal elevation
drawer elevation
tooltip elevation
popover elevation
sticky header elevation
runtime floating panel elevation
```

约束：

1. z-index 必须 token 化。
2. modal / drawer / popover / tooltip 层级不得互相覆盖失控。
3. Runtime overlay 不得遮挡关键确认动作。

## 9. Motion System

待补重点：

```txt
duration scale
easing
hover motion
collapse / expand
streaming reveal
skeleton
loading shimmer
message insertion
runtime timeline update
toast animation
modal transition
reduced motion
```

约束：

1. 流式输出动效不得影响阅读。
2. Runtime 高频更新不得全部做动画。
3. 尊重 reduced motion。
4. 动效时长必须 token 化。

## 10. Codex CLI 检查项

```txt
1. 搜索硬编码颜色。
2. 搜索硬编码字号、字重、行高。
3. 搜索随意 margin / padding。
4. 搜索散落 z-index。
5. 搜索未 token 化 box-shadow。
6. 搜索未统一 icon import。
7. 搜索 transition duration magic number。
```
