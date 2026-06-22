# Task Message Lifecycle

## 任务消息类型

| MessageType | 触发条件 | 面向用户 |
|---|---|---|
| `task_proposal` | 用户表达创建任务意图，系统生成确认卡 | 普通用户 |
| `task_created` | 用户确认 proposal，任务创建成功 | 普通用户 |
| `task_updated` | 用户修改任务参数 | 普通用户 |
| `task_paused` | 用户暂停任务 | 普通用户 |
| `task_resumed` | 用户恢复任务 | 普通用户 |
| `task_deleted` | 用户删除任务（需二次确认） | 普通用户 |
| `task_run_started` | 任务开始执行 | 内部/Debug |
| `task_run_completed` | 任务执行成功（含 partial） | 普通用户 |
| `task_run_failed` | 任务执行失败 | 普通用户 |
| `task_run_skipped` | 任务跳过（如无变化） | 不生成消息 |
| `task_needs_action` | 任务需要人工处理 | 普通用户 |

## 消息写入规则

### TaskMessageWriter.writeTaskRunMessage

```typescript
interface WriteTaskRunMessageInput {
  conversationId: string;
  taskId: string;
  runId: string;
  messageType: ChatMessageType;
  payload: TaskResultMessagePayload;
  evidenceRefs?: EvidenceRef[];
  sourceRefs?: SourceRef[];
  artifactRefs?: ArtifactRef[];
  traceId?: string;
}
```

### 状态映射

| TaskRun.status | MessageType | 说明 |
|---|---|---|
| `completed` | `task_run_completed` | payload.runStatus = completed |
| `partial` | `task_run_completed` | payload.runStatus = partial |
| `failed` | `task_run_failed` | 含 errorMessage + 补救动作 |
| `needs_action` | `task_needs_action` | 含确认按钮 |
| `skipped` / `no_change` | 不写消息 | 只记录 TaskRun |

### 回填

- 消息写入成功后，`TaskRun.outputMessageId` 必须回填。
- 消息写入失败不吞 TaskRun 状态，必须记录 error 到 admin/debug metadata。

## 消息 Payload 规范

### TaskResultMessagePayload

```typescript
interface TaskResultMessagePayload {
  taskId: string;
  runId: string;
  taskTitle: string;
  runStatus: 'completed' | 'failed' | 'partial' | 'skipped' | 'needs_action';
  completedAt?: string;
  summary: string;            // 用户可读摘要
  keyFindings?: string[];     // 关键发现
  nextActions?: Action[];     // 建议动作
  artifacts?: ArtifactRef[];  // 生成的文件
  evidenceRefs?: EvidenceRef[];
  sourceRefs?: SourceRef[];
  traceId?: string;
  displayMode: 'compact' | 'expanded';  // 默认 compact
}
```

### 约束

- `summary` 必须是用户可读的自然语言，不暴露内部字段。
- 数据事实必须来自 evidenceRefs / sourceRefs / tool result，不得编造。
- `displayMode` 默认 `compact`，明细进入展开区或右侧面板。
