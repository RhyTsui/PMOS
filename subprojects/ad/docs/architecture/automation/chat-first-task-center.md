# Chat-first Task Center 架构

## 定位

Chat-first Task Center 是小乔智投自动化任务的交互范式。核心理念：

1. **Chat-first，不是 Chat-only**：创建/修改/消费在 Chat 中完成，保留轻量任务列表做集中管理。
2. **普通用户不看复杂配置**：不看 raw config、cron、tool params、debug trace。
3. **管理员保留完整视图**：TaskRun / Trace / Artifact / Error 进入 admin/debug。

## 信息架构

```
普通用户可见：

Chat
├─ 左侧历史会话列表
│  ├─ 普通会话
│  ├─ 自动化任务会话 task badge
│  ├─ 未读任务结果高亮点
│  ├─ 未读任务结果数字角标
│  └─ 失败/待处理状态
│
├─ 轻量"自动化"任务列表
│  ├─ 任务名 + 状态 + 下次运行
│  ├─ 最近一次结果摘要
│  ├─ 暂停 / 恢复 / 删除
│  ├─ 按模板筛选
│  └─ 打开原会话
│
├─ 会话消息列表
│  ├─ task_proposal / task_created / task_updated
│  ├─ task_paused / task_resumed / task_deleted
│  ├─ task_run_completed / task_run_failed
│  ├─ task_run_skipped / task_needs_action
│  └─ TaskInlineActions
│
└─ 右侧过程与依据
   └─ 当前选中消息的 evidenceRefs / sourceRefs / artifactRefs / traceId

管理员可见：
Admin / Runtime Debug
├─ AutomationTask / TaskRun / TaskArtifact
├─ TaskTrace / TaskError
└─ Evidence Ledger + Raw tool result
```

## 核心数据流

```
用户输入 → Chat API → Understanding Stage
                         ↓
                  自动化意图识别
                         ↓
              ┌──────────┼──────────┐
              ↓          ↓          ↓
          create     update      pause/resume/delete/rerun
              ↓          ↓          ↓
         Proposal Card  确认卡    状态变更消息
              ↓
         用户确认
              ↓
         TaskCreated Message + ScheduledTask 创建
              ↓
         定时触发 / 手动触发
              ↓
         TaskExecutor 执行
              ↓
         TaskRun 记录
              ↓
         TaskMessageWriter → 写入 ChatMessage
              ↓
         ConversationHighlightService → 标记未读
              ↓
         用户打开会话 → 看到结果 → 标记已读
```

## 事实分层

| 层 | 角色 | 面向 |
|---|---|---|
| TaskRun | 运行事实 | Admin / Debug |
| ChatMessage | 用户可见事实 | 普通用户 |
| ConversationHighlight | 提醒事实 | 普通用户（左侧列表） |

## 不变量

1. TaskRun 是运行事实，ChatMessage 是用户可见事实。
2. 任务结果通过 conversation highlight 提醒，不通过独立通知系统。
3. 高风险动作必须确认。
4. Trace 失败不影响任务结果写入（fail-open）。
5. 主消息不泄露 cron、raw params、tool debug、trace raw payload。
