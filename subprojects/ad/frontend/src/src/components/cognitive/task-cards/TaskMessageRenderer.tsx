'use client';

import type { Message } from '@/types';
import {
  TaskProposalCard,
  TaskStatusCard,
  TaskResultCard,
  TaskFailureCard,
  TaskNeedsActionCard,
  JoinTableResultRenderer,
  AggregateTableResultRenderer,
  DailyDigestResultRenderer,
  MetricMonitorResultRenderer,
} from '@/components/cognitive/task-cards';
import type { TaskProposalPayload, TaskResultMessagePayload } from '@/types';

/**
 * TaskMessageRenderer
 *
 * 根据 message_type 分发到对应的任务卡片组件。
 * 对未知任务消息类型 fallback 到 TaskStatusCard 安全渲染。
 */
export function TaskMessageRenderer({
  message,
  onSubmitFollowUp,
  onOpenDisclosure,
}: {
  message: Message;
  onSubmitFollowUp?: (content: string) => void;
  onOpenDisclosure?: (message: Message) => void;
}) {
  const messageType = message.message_type;
  const metadata = message.metadata || {};
  const content = message.content || '';

  // task_proposal: 任务确认卡
  if (messageType === 'task_proposal') {
    const proposal = (metadata.task_proposal || metadata.task_result_payload) as TaskProposalPayload | undefined;
    if (proposal && proposal.task_title) {
      return (
        <TaskProposalCard
          proposal={proposal}
          onConfirm={onSubmitFollowUp ? () => onSubmitFollowUp('确认') : undefined}
          onCancel={onSubmitFollowUp ? () => onSubmitFollowUp('取消') : undefined}
        />
      );
    }
    // fallback: 用 markdown 渲染
    return <TaskMessageFallback content={content} messageType={messageType} />;
  }

  // task_created / task_updated / task_paused / task_resumed / task_deleted: 状态变更卡
  if (
    messageType === 'task_created'
    || messageType === 'task_updated'
    || messageType === 'task_paused'
    || messageType === 'task_resumed'
    || messageType === 'task_deleted'
  ) {
    const actionMap: Record<string, 'created' | 'updated' | 'paused' | 'resumed' | 'deleted'> = {
      task_created: 'created',
      task_updated: 'updated',
      task_paused: 'paused',
      task_resumed: 'resumed',
      task_deleted: 'deleted',
    };
    const action = actionMap[messageType] || 'created';
    const taskTitle = typeof metadata.task_title === 'string' ? metadata.task_title : extractTaskTitle(content) || '任务';
    const changes = Array.isArray(metadata.changes) ? metadata.changes.map(String) : undefined;

    return (
      <TaskStatusCard
        action={action}
        taskTitle={taskTitle}
        changes={changes}
      />
    );
  }

  // task_run_completed: 任务结果卡（含模板渲染器）
  if (messageType === 'task_run_completed') {
    const payload = metadata.task_result_payload as TaskResultMessagePayload | undefined;
    if (payload && payload.task_title) {
      return (
        <TaskResultCardWrapper
          payload={payload}
          onOpenDisclosure={onOpenDisclosure ? () => onOpenDisclosure(message) : undefined}
        />
      );
    }
    // fallback: 用 markdown 渲染
    return <TaskMessageFallback content={content} messageType={messageType} />;
  }

  // task_run_failed: 失败卡
  if (messageType === 'task_run_failed') {
    const payload = metadata.task_result_payload as TaskResultMessagePayload | undefined;
    const taskTitle = payload?.task_title || extractTaskTitle(content) || '任务';
    const errorMessage = payload?.summary || content || '执行失败';

    return (
      <TaskFailureCard
        taskTitle={taskTitle}
        errorMessage={errorMessage}
        onRetry={onSubmitFollowUp ? () => onSubmitFollowUp('重新跑一次') : undefined}
        onViewDetails={onOpenDisclosure ? () => onOpenDisclosure(message) : undefined}
      />
    );
  }

  // task_needs_action: 需人工确认卡
  if (messageType === 'task_needs_action') {
    const payload = metadata.task_result_payload as TaskResultMessagePayload | undefined;
    const taskTitle = payload?.task_title || extractTaskTitle(content) || '任务';
    const actionRequired = payload?.summary || content || '需要您的处理';

    return (
      <TaskNeedsActionCard
        taskTitle={taskTitle}
        actionRequired={actionRequired}
        onConfirm={onSubmitFollowUp ? () => onSubmitFollowUp('确认处理') : undefined}
        onDismiss={onSubmitFollowUp ? () => onSubmitFollowUp('稍后处理') : undefined}
      />
    );
  }

  // task_run_started / task_run_skipped / unknown: fallback 安全渲染
  return <TaskMessageFallback content={content} messageType={messageType || 'task_status'} />;
}

// ─── TaskResultCard + 模板渲染器 ─────────────────────────────────────

function TaskResultCardWrapper({
  payload,
  onOpenDisclosure,
}: {
  payload: TaskResultMessagePayload;
  onOpenDisclosure?: () => void;
}) {
  const templateId = payload.template_id;
  const templateData = payload.template_data || {};

  return (
    <TaskResultCard
      payload={payload}
      onOpenSourcePanel={onOpenDisclosure}
    >
      {/* 模板专用渲染器 */}
      {templateId === 'scheduled_join_table' && (
        <JoinTableResultRenderer data={templateData as any} />
      )}
      {templateId === 'scheduled_aggregate_table' && (
        <AggregateTableResultRenderer data={templateData as any} />
      )}
      {templateId === 'gi_keyword_daily_digest' && (
        <DailyDigestResultRenderer data={templateData as any} />
      )}
      {templateId === 'scheduled_metric_monitor' && (
        <MetricMonitorResultRenderer data={templateData as any} />
      )}
    </TaskResultCard>
  );
}

// ─── 安全 Fallback ─────────────────────────────────────

function TaskMessageFallback({ content, messageType }: { content: string; messageType: string }) {
  // 对未知任务消息类型 fallback 成 TaskStatusCard，不崩溃
  if (!content.trim()) return null;

  return (
    <TaskStatusCard
      action="updated"
      taskTitle={extractTaskTitle(content) || '任务'}
    />
  );
}

// ─── 辅助函数 ─────────────────────────────────────

function extractTaskTitle(content: string): string | undefined {
  const match = /(?:任务|「)([^」\n]{1,30})(?:」|\s)/.exec(content);
  return match?.[1]?.trim();
}
