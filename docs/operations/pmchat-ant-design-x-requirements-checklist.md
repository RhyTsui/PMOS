# PMChat Ant Design X Requirements Checklist

版本：2026-05-12

## A. 产品定位

- [ ] 外显产品名使用 `PMChat`
- [ ] 当前目标是一款 `benchmark chat`
- [ ] 后续从这一套母体衍生多个统一审美的 chat
- [ ] 不做 `workspace`
- [ ] 不做 `workbench`
- [ ] 不做 `command-center`
- [ ] 不做“控制台”
- [ ] 不做“工作台”
- [ ] 首页只保留一个主 chat
- [ ] 次级能力按需展开
- [ ] 左侧会话列表与主对话区用线分区，不做厚重卡片分区

## B. 技术基线

- [ ] 前端使用 `React`
- [ ] AI UI 生态使用 `Ant Design X`
- [ ] 基础组件层使用 `antd`
- [ ] 默认模型口径使用 `Qwen`
- [ ] 会话数据使用 `useXConversations`
- [ ] 聊天数据流使用 `useXChat`
- [ ] 请求层使用 `XRequest`
- [ ] 流式层使用 `XStream / Stream`
- [ ] 聊天服务提供商纳入 `OpenAIChatProvider` 口径
- [ ] 集成 `@ant-design/x-markdown`
- [ ] 集成 `@ant-design/x-card`
- [ ] 集成 `@ant-design/x-skill`
- [ ] 纳入 `A2UI v0.9`

## C. RICH

### C1. Intention

- [ ] 提供明确意图类型示例
- [ ] 提供意图预期示例
- [ ] 提供引导意图表达示例
- [ ] AI 能理解意图并协助拆解方案与步骤

### C2. Role

- [ ] AI 角色真实一致
- [ ] 角色边界清晰
- [ ] 角色语气自然
- [ ] 具备人情味

### C3. Conversation

- [ ] 开始示例
- [ ] 追问示例
- [ ] 提示示例
- [ ] 确认示例
- [ ] 错误示例
- [ ] 结束示例

### C4. Hybrid UI

- [ ] 文本承接
- [ ] 卡片承接
- [ ] 代码承接
- [ ] 图表承接
- [ ] 文件承接
- [ ] 来源承接
- [ ] 折叠内容承接
- [ ] 消息下动作承接

## D. Streaming Chat

- [ ] 生成中状态
- [ ] 流式追加
- [ ] 尾后缀
- [ ] 动画
- [ ] 打字机效果
- [ ] 不完整 Markdown 承接
- [ ] 中断
- [ ] 重试
- [ ] partial result
- [ ] 异常状态

### D1. 流式消息内联动

- [ ] `Markdown`
- [ ] `Code`
- [ ] `Think`
- [ ] `Sources`
- [ ] `Actions`

## E. XMarkdown

### E1. Minimum Setup

- [ ] 最小渲染示例
- [ ] 标题
- [ ] 段落
- [ ] 列表
- [ ] 引用

### E2. Streaming

- [ ] `hasNextChunk`
- [ ] `enableAnimation`
- [ ] `animationConfig`
- [ ] `tail`
- [ ] `incompleteMarkdownComponentMap`

### E3. 组件映射

- [ ] 代码块映射到 `CodeHighlighter`
- [ ] 图表映射到 `Mermaid`

### E4. 插件扩展

- [ ] `Latex`
- [ ] `CustomPlugins`
- [ ] Markdown 语法扩展

### E5. 安全

- [ ] `openLinksInNewTab`
- [ ] `dompurifyConfig`
- [ ] `escapeRawHtml`
- [ ] 原始 HTML 转义后保持可见

### E6. 容器与调试

- [ ] `content / children`
- [ ] `components`
- [ ] `className / rootClassName / style / prefixCls`
- [ ] `paragraphTag`
- [ ] `debug`

## F. 组件总表

### F1. 通用功能

- [ ] `Bubble`
- [ ] `Conversations`
- [ ] `Notification`

### F2. 唤醒

- [ ] `Welcome`
- [ ] `Prompts`

### F3. 表达

- [ ] `Sender`
- [ ] `Attachments`
- [ ] `Suggestion`

### F4. 确认

- [ ] `Think`
- [ ] `ThoughtChain`

### F5. 反馈

- [ ] `Actions`
- [ ] `FileCard`
- [ ] `Sources`
- [ ] `CodeHighlighter`
- [ ] `Mermaid`
- [ ] `Folder`

### F6. 其他

- [ ] `XProvider`

## G. 每个组件都要检查的维度

- [ ] `Basic`
- [ ] 核心状态
- [ ] 核心交互
- [ ] `Semantic DOM`
- [ ] `Design Token`
- [ ] 样式变体
- [ ] 自适应表现

## H. 重点组件专项

### H1. Think

- [ ] `Basic`
- [ ] `Status`
- [ ] `Expand`
- [ ] `Semantic DOM`
- [ ] `Design Token`
- [ ] 从左到右高光推进动效
- [ ] 默认折叠
- [ ] 只有提问后触发

### H2. Sources

- [ ] `Basic`
- [ ] `Icon`
- [ ] `Expand`
- [ ] `Inline`
- [ ] `Semantic DOM`
- [ ] `Design Token`
- [ ] 内容干净
- [ ] 来源引用明确
- [ ] 不罗列杂乱说明文字

### H3. CodeHighlighter

- [ ] `Basic`
- [ ] `Streaming`
- [ ] 明显高亮
- [ ] 代码块外壳清晰
- [ ] 深色 / 浅色主题状态明确

### H4. Sender

- [ ] `Basic`
- [ ] `loading`
- [ ] `disabled`
- [ ] `prefix / suffix`
- [ ] `header / footer`
- [ ] `reference`

### H5. Bubble

- [ ] `Bubble.List`
- [ ] `assistant / user / system`
- [ ] `filled / outlined / shadow / borderless`
- [ ] `typing / loading`

### H6. Notification

- [ ] `success`
- [ ] `warning`
- [ ] `error`
- [ ] 按钮宽度自适应
- [ ] 按钮高度自适应
- [ ] 触发后动作示例

### H7. Folder

- [ ] 文件树不能太窄
- [ ] 容器宽度自适应
- [ ] 左树与右侧预览关系清晰

## I. 输入与消息交互

### I1. 唤醒与标识

- [ ] AI 标识方案
- [ ] 欢迎提示
- [ ] 角色可见性

### I2. 用户输入

- [ ] 文本输入
- [ ] 语音输入
- [ ] 文件输入
- [ ] 快捷命令
- [ ] 槽位填词
- [ ] 引用输入

### I3. 用户发送后气泡类型

- [ ] 图片类
- [ ] 文档类
- [ ] 混合类

### I4. 结果应用

- [ ] 复制
- [ ] 重新生成
- [ ] 反馈

### I5. 结果展示

- [ ] 文字
- [ ] 图片
- [ ] 代码
- [ ] 卡片
- [ ] 文件
- [ ] 图表
- [ ] 混合内容

### I6. 内容组织

- [ ] 折叠
- [ ] 展开
- [ ] 参考来源
- [ ] 结构分段
