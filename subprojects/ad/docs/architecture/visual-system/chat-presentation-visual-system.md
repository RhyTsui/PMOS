# Chat Presentation Visual System

> Canonical path: `docs/architecture/visual-system/chat-presentation-visual-system.md`  
> Scope: Chat 会话区视觉表现层、消息壳、结果容器、过程与依据面板、Chat 专用 token  
> Depends on: `SemanticResultContract`, `Component Registry`, `Message Rendering Architecture`

## 1. 定位

本文档是当前 Chat 会话区 UI/UX 视觉表现的主定义区。

它只定义“结果如何被专业、清晰、可信地呈现”，不定义新的语义协议、不定义新的渲染主链、不替代 `SemanticResultContract`、`RuntimeDisplayProtocol` 或 `Component Registry`。

当前渲染主链保持为：

```txt
MessageContract / SemanticResultContract
→ regions[]
→ componentBinding
→ registry
→ MessagePresentationRenderer
→ React UI
```

## 2. 硬性边界

允许优化：

- 用户消息与 AI 消息的视觉层级
- 普通回答、报表查询成功、分析洞察、执行任务结果的视觉模板
- 右侧“过程与依据”面板的信息层级
- Chat 专用 token、卡片基座、按钮、状态、表格、指标卡、折叠区
- 桌面、平板、移动端响应式体验

禁止修改：

- Runtime、Entity Resolution、Tool Calling、Tool Output Adapter、Slot Filling、PlannerInput 注入
- MCP 调用链路和工具选择逻辑
- 第二套 renderer、第二套 message service 或 legacy UI 分支
- 基于 `message.content.includes(...)` 的样式判断
- 基于 MCP 工具名、广告业务字段、报表名称的视觉硬编码

## 3. 视觉目标

Chat 会话区应呈现为企业级 AI 工作台：

- 结果优先：用户第一眼看到结论、关键数据和下一步动作。
- 层级清晰：正文、结构化结果、依据入口、动作区职责分明。
- 可信可追溯：来源、证据、执行过程进入可控披露入口。
- 克制专业：少边框、弱阴影、高密度数据区、稳定组件风格。
- 可扩展：新增 MCP 或 Agent 时通过 `regions[].componentBinding` 扩展，不改主消息壳。

## 4. Message Shell

### 4.1 用户消息

- 右侧对齐，轻量气泡或弱容器。
- 最大宽度控制在 68%-72%，移动端为 100%。
- 不显示标题，不显示“消息”等内部标签。
- 复制、编辑、版本切换等操作 hover 或聚焦时出现。
- 用户消息是上下文，不是结果卡片。

### 4.2 AI 消息

AI 消息使用结果容器，而不是普通聊天气泡。

```txt
ResultPanel
├─ Header / 结论标题
├─ Summary / 核心摘要
├─ Structured Regions / 数据、图表、表格、洞察
├─ Evidence Entry / 依据入口
└─ Action Bar / 后续动作
```

要求：

- 左侧对齐，白底或轻 surface，弱边框，无重阴影。
- 内部使用 section 分层，不把所有内容堆成大 Markdown。
- 主结果常显，过程和 raw 信息不在主消息区默认展开。
- 不显示 `message`、`content`、`raw`、`trace`、`payload`、`prompt` 等调试词。

### 4.3 系统状态

- 正在分析、已完成、部分完成、已保存、正在生成等状态使用 inline status、轻量 badge 或小型状态条。
- 状态提示不抢主内容权重。
- 缺字段、实体解析、工具选择错误不由视觉层兜底。

## 5. 正常链路模板

### 5.1 普通回答

- 主结论：`markdown-result` 首段或 summary region。
- 解释正文：`markdown-result`。
- 关键点：最多 3-5 条，可由结构化 region 承载。
- 依据入口：`disclosure-panel` / `evidence-panel` 的轻入口。
- 后续建议：`action-bar`，主操作最多 1 个，次操作最多 3 个。

### 5.2 报表查询成功

- 标题区：报表名称、时间范围、数据状态。
- 摘要区：整体趋势、关键异动、核心判断。
- 指标区：3-5 个核心指标，数值突出，单位清晰。
- 图表区：趋势、对比或分组图，少装饰，突出变化。
- 明细表：紧凑密度、数值右对齐、横向滚动。
- 口径说明：弱化但可见，进入来源或依据区域。
- 动作区：继续分析、导出、保存、生成报告等。

### 5.3 分析洞察

- 核心判断：顶部结论卡。
- 关键证据：按重要性排序。
- 原因假设：按可信度排序。
- 风险提示：轻 warning，不大面积警告。
- 建议动作：明确优先级和下一步。

### 5.4 执行任务结果

- 明确做了什么、是否成功、产物在哪、下一步能做什么。
- 执行状态使用小型状态条或 badge。
- 产物入口使用 `asset-reference` 或 action。
- 影响范围使用弱提示文本。

## 6. 过程与依据面板

右侧“过程与依据”是可信披露系统，不是主流程兜底系统。

信息层级：

1. 概览：最终状态、使用能力、数据来源、质量提示，默认打开。
2. 执行：步骤时间线、状态、耗时、简短说明。
3. 数据结果：结构化数据摘要、字段摘要、表格摘要。
4. 原始信息：Raw、Trace、Payload、Prompt，受权限控制且默认收起。
5. 更多：字段、质量、来源、工具调用详情。

工具调用默认只展示工具名、状态、耗时、参数摘要、结果摘要；完整参数、完整结果、错误栈、trace 片段只能在有权限的详情中展开。

## 7. Chat Token

Chat 组件只能消费 token，不允许散落样式常量。

```txt
chat.surface.canvas
chat.surface.panel
chat.surface.panelSubtle
chat.surface.user
chat.surface.assistant
chat.border.subtle
chat.border.default
chat.border.focus
chat.text.primary
chat.text.secondary
chat.text.muted
chat.status.success
chat.status.warning
chat.status.danger
chat.status.info
chat.status.degraded
chat.radius.message
chat.radius.panel
chat.radius.badge
chat.shadow.message
chat.shadow.panel
chat.spacing.messageGap
chat.spacing.sectionGap
chat.spacing.blockGap
chat.spacing.inlineGap
chat.motion.enter
chat.motion.expand
```

调整视觉时优先改 token，不逐组件改颜色、间距、圆角、阴影。

## 8. 后台提示词边界

后台提示词可以在线修改：

- 主回答顺序和语气
- 是否隐藏内部详情
- 来源、证据、执行详情的可见层级
- 追问和下一步动作的业务表达
- 问数结果偏好：趋势优先图表、明细优先表格、数据不足降级说明

后台提示词不得管理：

- CSS、HTML、React 组件名
- 颜色、圆角、阴影、间距、动效
- 断点、布局、组件注册表
- renderer 选择逻辑
- 权限绕过或 raw 信息暴露

## 9. 验收

- 主会话区不出现“消息”“文本内容”等调试标签。
- 用户消息轻量，AI 消息结果化。
- 报表结果像专业 BI 卡片。
- 分析结果结构化，不是大段散文式 Markdown。
- 任务结果有明确产物和动作。
- 右侧过程面板层级清晰，Raw 信息弱化且权限可控。
- 无新增 renderer 主链。
- 无业务硬编码、工具名判断、文案 includes 判断。
- 视觉样式使用 token。
