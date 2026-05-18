# 小乔智投-Ant-Design-X默认规范-2026-05-09

- 版本：v0.1
- 状态：active
- 日期：2026-05-09
- 负责人：Codex + 用户

---

## 0. 文档目标

本文件将 Ant Design X 官方体系正式沉淀为小乔智投前端的默认设计规范、设计规格、设计框架和开发基线。

从本文件生效后，相关页面和前端实现默认不再把 Ant Design X 视为“可选参考”，而视为当前主线真源。

---

## 1. 默认真源结论

小乔智投前端默认采用 Ant Design X 官方体系作为主线真源，分为六层：

1. `RICH 设计范式`
2. `Ant Design X Components / React AI Interface Solution`
3. `X SDK`
4. `X Markdown`
5. `Ultramodern Playground`
6. `X Skill`

这六层不是平级资料堆叠，而是职责分层。

---

## 2. 六层职责

### 2.1 最高层设计范式：RICH

来源：

- https://x.ant.design/docs/spec/introduce/

定位：

1. 默认 AI 产品交互设计范式
2. 默认会话与 GUI 混合界面方法论
3. 默认页面交互抽象依据

它回答的不是“组件怎么写”，而是：

1. `Role`
2. `Intention`
3. `Conversation`
4. `Hybrid UI`

如何共同构成一个 AI 产品界面。

小乔智投默认要求：

1. 页面设计先按 RICH 判断当前能力属于哪种交互阶段
2. 不再把页面理解为单纯聊天页或传统后台页
3. 结果区、提示区、补录区、操作区必须视作 `Hybrid UI`

### 2.2 默认前端设计框架与组件体系：Ant Design X

来源：

- https://x.ant.design/components/introduce/
- https://x.ant.design/docs/react/introduce/

定位：

1. 默认 AI 前端组件体系
2. 默认 AI 页面构建框架
3. 默认会话组件真源

默认组件能力包括：

1. `Bubble`
2. `Conversations`
3. `Notification`
4. `Welcome`
5. `Prompts`
6. `Attachments`
7. `Sender`
8. `Suggestion`
9. `Think`
10. `ThoughtChain`
11. `Actions`
12. `FileCard`
13. `Sources`
14. `Mermaid`
15. `CodeHighlighter`
16. `XProvider`

小乔智投默认要求：

1. 会话相关 UI 优先从 Ant Design X 组件体系中选型
2. 不再优先手搓会话组件替代其官方能力
3. 结果反馈、来源、思考链等能力优先复用其现成组件

### 2.3 默认 AI 会话数据流框架：X SDK

来源：

- https://x.ant.design/x-sdks/introduce/

定位：

1. 默认会话数据流管理基线
2. 默认流式请求与消息管理基线
3. 默认多会话管理基线

默认能力包括：

1. `useXChat`
2. `useXConversations`
3. `Chat Provider`
4. `XRequest`
5. `XStream`

小乔智投默认要求：

1. 会话数据流优先通过 `X SDK` 管理
2. 多会话、流式更新、消息同步优先复用其机制
3. 不再把会话请求逻辑长期散落在页面级手写 fetch 中

### 2.4 默认流式富文本与说明渲染框架：X Markdown

来源：

- https://x.ant.design/x-markdowns/introduce/

定位：

1. 默认流式 Markdown 渲染方案
2. 默认结果说明渲染方案
3. 默认代码高亮 / Mermaid / 公式扩展方案

小乔智投默认要求：

1. 会话回复区的长文本说明优先用 `X Markdown`
2. 结果说明区、证据区、操作说明区优先用 `X Markdown`
3. 不再长期依赖原始字符串拼接或脆弱的 HTML 注入方案

### 2.5 默认页面样板参考：Ultramodern Playground

来源：

- https://x.ant.design/docs/playground/ultramodern

定位：

1. 默认页面实现参考
2. 默认布局与交互样板参考
3. 默认视觉气质参考

明确边界：

1. 它是默认样板间，不是直接照抄的最终产品
2. 它提供页面骨架和交互节奏参考
3. 不替代业务信息架构和结果区设计真源

### 2.6 默认开发辅助能力：X Skill

来源：

- https://x.ant.design/x-skills/introduce/

定位：

1. 默认 Ant Design X 开发辅助工具链
2. 默认最佳实践与开发提示来源
3. 默认 agent / IDE 辅助开发能力补充

明确边界：

1. `X Skill` 不属于产品交互真源
2. 它属于开发与协作辅助真源
3. 可用于提升开发效率，但不取代设计和实现决策

---

## 3. 对 PMOS / 小乔智投的含义

这套默认规范对当前项目意味着：

1. 前端主线正式切到 Ant Design X 全体系
2. 不再把 `CopilotKit` 视为当前主线依赖
3. 结果区产品化优先通过 `Structured Result Renderer + X Markdown + X Card` 方向推进
4. 会话工作台优先基于 `Ant Design X + X SDK`
5. 设计层默认用 `RICH` 解释会话、追问、确认、结果反馈与混合界面

---

## 4. 当前默认落地顺序

1. `Ant Design + Ant Design X Components`
2. `X SDK`
3. `Structured Result Renderer`
4. `X Markdown`
5. `X Card`
6. `X Skill`

含义是：

1. 先收口会话与工作台组件
2. 再收口数据流
3. 再收口结果区差异化能力
4. 再增强富文本与动态卡片能力

---

## 5. 默认禁令

从本文件生效后，默认禁止以下行为：

1. 把会话框架选型长期作为开放讨论，不形成真源结论
2. 在已有 Ant Design X 官方能力下继续优先手搓重复组件
3. 让页面主线偏离 `RICH`，退回纯聊天页或伪后台页
4. 在没有充分理由时，额外引入第二套 AI 前端主框架抢主线

---

## 6. 回查

- 是否已把 Ant Design X 沉淀为默认主设计规范：`solved`
- 是否已把 X SDK / X Markdown 纳入默认主开发基线：`solved`
- 是否已把 Ultramodern 定义为默认样板参考：`solved`
- 是否已把 X Skill 定位为开发辅助，而不是产品真源：`solved`
- 是否已完成代码层全面迁移：`unsolved`
