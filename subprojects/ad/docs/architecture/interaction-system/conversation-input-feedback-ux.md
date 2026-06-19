# Conversation UX / Input UX / Feedback UX Specification

> Canonical path: `docs/architecture/interaction-system/conversation-input-feedback-ux.md`  
> Scope: AI Chat OS 的会话、输入、反馈核心体验域

## 1. 文档定位

Conversation UX、Input UX、Feedback UX 是 AI Chat OS 的核心交互域。

它们必须复用：

```txt
SemanticResultContract
RuntimeDisplayProtocol
ActionContract
EvidenceRef
SourceRef
Component Registry
```

## 2. 消息布局

消息类型：

```txt
user-message
assistant-message
semantic-result-message
runtime-status-message
system-notice
error-message
artifact-message
```

规则：

1. 普通文本可以 markdown 渲染。
2. 结构化结果必须使用 SemanticResultContract。
3. Runtime 状态必须使用 RuntimeDisplayProtocol。
4. Artifact 只显示引用，不内联大对象。

## 3. 长消息折叠

默认折叠对象：

```txt
超长 Markdown
大表格
长 evidence 列表
长 source 列表
runtime trace
工具调用详情
```

规则：

1. 折叠不应隐藏关键结论。
2. 展开后保持滚动锚点。
3. 搜索命中区域应自动展开。
4. 管理员详情默认折叠。

## 4. Streaming UX

阶段：

```txt
thinking / planning
running tools
generating
finalizing
completed
```

规则：

1. 流式输出应稳定，不跳动。
2. 工具调用和生成状态要区分。
3. 用户可见输出优先展示自然语言摘要。
4. 结构化结果应在完成后固化为 SemanticResultContract。

## 5. 多轮追问

规则：

1. 追问建议使用 ActionContract(type=continue-analysis)。
2. 追问按钮应携带上下文引用。
3. 追问产生新消息，不直接改写旧结果，除非 action.resultHandling 明确指定。
4. 长会话应使用 context compression 和 summary block。

## 6. Input UX

输入能力：

```txt
文本输入
多行输入
文件上传
粘贴图片 / 表格
Mention
Slash command
Prompt shortcut
语音，可选
```

规则：

1. 输入框要显示当前模式。
2. 文件上传必须显示状态、大小、权限。
3. Slash command 不应绕过 ActionContract。
4. 输入过长时提示上下文限制或自动摘要策略。

## 7. Feedback UX

反馈类型：

```txt
toast
inline status
error card
warning card
empty state
permission state
retry state
success state
```

规则：

1. 异步 action 必须有 loading / success / error。
2. 错误必须可理解。
3. 用户可恢复错误提供 action。
4. 权限错误提供解释和申请入口。
5. 空状态不等于错误。

## 8. ResponseContract 升级规则

旧响应如果只是文本：

```txt
ResponseContract.text -> markdown-result region
```

旧响应如果带图表 / 表格：

```txt
ResponseContract.visualization -> data-visualization region
```

旧响应如果带来源：

```txt
ResponseContract.sources -> SourceRef[]
```

旧响应如果带证据：

```txt
ResponseContract.evidence -> EvidenceRef[]
```

## 9. 验收清单

- [ ] 消息结构化结果使用 SemanticResultContract。
- [ ] Runtime 状态不混入普通消息 schema。
- [ ] Streaming 有阶段展示。
- [ ] 长消息和 trace 可折叠。
- [ ] 输入、反馈、错误可恢复。
