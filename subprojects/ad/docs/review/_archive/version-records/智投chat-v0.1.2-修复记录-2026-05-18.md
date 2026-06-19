# 智投chat v0.1.2 修复记录

## 目标

修复“获取应用列表”这类请求的能力发现与业务歧义问题，避免普通对话直接掉到知识库或错误命中单一 MCP 工具。

## 本次修复内容

### 功能需求

- 普通对话路径支持能力发现：当用户提到“应用、项目、包、分包、列表、状态”等可执行对象时，会先搜索 MCP 工具。
- “应用列表”先做歧义确认：当用户没有明确查询对象时，展示简洁确认卡，让用户选择“巨量应用”或“智投配置”。
- 补齐智投配置 MCP 工具发现：`get_app_package_list` 可被能力发现命中。
- 巨量应用缺参时进入追问卡：用户选择“巨量应用”后，如果缺少 `account_id`、`account_type`，不在正文里解释，改为展示“继续补充信息”卡片。
- 修复 SSE 断流：提前返回确认卡或补参卡时不再重复关闭 stream。
- 修复空正文 fallback：确认卡和补参卡场景不再生成“未生成有效回复”。

### 提示词 / 知识库需求

- “应用”作为歧义词处理：知识库可说明“巨量应用”和“智投配置应用”的不同含义。
- 文案从“确认媒体”改为“确认查询对象”，避免把智投误写成媒体。
- 执行顺序调整为：先查歧义知识，再确认对象，再做 MCP 能力发现，最后执行或追问。

### 前端交互需求

- 新增 `AmbiguityConfirmCard`：用于“巨量应用 / 智投配置”选择。
- 新增 `CapabilityFollowUpCard`：用于缺少必填参数时继续追问。
- 保持联调组件、项目选择器不变。
- 修复输入区 hydration 警告。
- 新建会话首条消息不再触发无效标题 PATCH，避免浏览器控制台 404。

## 验收结果

- `npm.cmd run validate:ad-ui` 通过。
- `npm.cmd run build` 通过。
- 浏览器验收通过：
  - 输入“获取指间山海的应用列表”，展示“先确认查询对象”。
  - 页面展示“巨量应用”和“智投配置”按钮。
  - 点击“巨量应用”后，展示“继续补充信息”。
  - 追问项包含“账户ID”和“账户类型”。
  - 未出现“未生成有效回复”。
  - 控制台无 error / 404。

## 回退方式

如需回退 v0.1.2，本次主要恢复以下文件：

- `frontend/src/src/app/api/chat/route.ts`
- `frontend/src/src/hooks/useConversation.ts`
- `frontend/src/src/components/cognitive/ChatContainer.tsx`
- `frontend/src/src/components/cognitive/InputArea.tsx`

并删除新增组件：

- `frontend/src/src/components/cognitive/AmbiguityConfirmCard.tsx`
- `frontend/src/src/components/cognitive/CapabilityFollowUpCard.tsx`
