# Conversation Highlight 会话高亮

## 概述

Conversation Highlight 是任务结果提醒机制。当任务运行完成后，在左侧历史会话列表中出现高亮点、未读数、状态文案，引导用户查看结果。

## 数据模型

```typescript
interface ConversationHighlight {
  id: string;
  conversationId: string;
  messageId: string;
  taskId: string;
  runId: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  label: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
  readBy?: string;
}
```

## API

### ConversationHighlightService

```typescript
// 标记未读
markAutomationUnread(input: {
  conversationId: string;
  messageId: string;
  taskId: string;
  runId: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  label: string;
}): Promise<ConversationHighlight>;

// 标记已读
markAutomationRead(input: {
  conversationId: string;
  messageId: string;
  userId: string;
}): Promise<void>;

// 获取未读高亮
getUnreadHighlights(conversationId: string): Promise<ConversationHighlight[]>;

// 获取会话高亮摘要
getConversationHighlightSummary(conversationId: string): Promise<{
  count: number;
  latestSeverity: 'info' | 'success' | 'warning' | 'error';
  latestLabel: string;
}>;
```

## 规则

1. 用户打开会话并滚动/定位到该消息后，标记已读。
2. 刷新页面后 unread 状态不能丢（持久化到文件）。
3. 多条未读任务结果显示 count。
4. failed / needs_action 优先级高于 completed。
5. 有未读任务结果的会话在历史列表中强化显示。

## 持久化

存储在 `.runtime/{scope}/conversation-highlights.json`，与 conversation-store 同一作用域。

## UI 表现

| 状态 | 左侧列表显示 |
|---|---|
| 无未读 | 正常 |
| 1 条 completed | 绿色小点 |
| 多条 completed | 绿色数字角标 |
| 1 条 failed | 红色小点 + "待处理" |
| 多条 failed | 红色数字角标 + "N 条待处理" |
| needs_action | 橙色小点 + "需确认" |
