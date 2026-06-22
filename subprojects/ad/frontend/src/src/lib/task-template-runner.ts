/**
 * Template Task Runner
 *
 * 4 类标准任务模板的运行入口。
 * 调用对应的 mock-safe executor，写回消息，触发高亮。
 */

import { executeTemplateTask, type TemplateTaskInput } from '@/lib/task-executors';
import { writeTaskRunMessage } from '@/lib/task-message-writer';
import { markAutomationUnread } from '@/lib/conversation-highlight-store';
import { getScheduledTask, updateScheduledTask } from '@/lib/scheduled-task-store';

export interface RunTemplateTaskInput {
  taskId: string;
  scopeKey: string;
  /** 测试模式（metric_monitor 专用） */
  testMode?: 'no_anomaly' | 'anomaly';
}

export interface RunTemplateTaskResult {
  success: boolean;
  taskId: string;
  runId: string;
  status: string;
  messageId?: string;
  skipped?: boolean;
  error?: string;
}

/**
 * 运行一个标准模板任务
 */
export async function runTemplateTask(input: RunTemplateTaskInput): Promise<RunTemplateTaskResult> {
  const task = await getScheduledTask(input.taskId);
  if (!task) {
    return {
      success: false,
      taskId: input.taskId,
      runId: '',
      status: 'failed',
      error: 'task not found',
    };
  }

  if (!task.template_id || task.template_id === 'custom') {
    return {
      success: false,
      taskId: input.taskId,
      runId: '',
      status: 'failed',
      error: 'not a template task',
    };
  }

  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const conversationId = task.source_conversation_id;

  // 执行模板任务
  const executorInput: TemplateTaskInput = {
    taskId: input.taskId,
    runId,
    templateId: task.template_id,
    params: task.custom_params || {},
    testMode: input.testMode,
  };

  let output;
  try {
    output = await executeTemplateTask(executorInput);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'executor failed';
    // 失败也要写回消息（如果有会话）
    if (conversationId) {
      await writeTaskRunMessage({
        conversationId,
        scopeKey: input.scopeKey,
        taskId: input.taskId,
        runId,
        taskTitle: task.name,
        status: 'failed',
        summary: `任务执行失败：${errorMessage}`,
        traceId: `task-run-${runId}`,
        templateId: task.template_id,
      }).catch(() => {});  // fail-open
    }
    return {
      success: false,
      taskId: input.taskId,
      runId,
      status: 'failed',
      error: errorMessage,
    };
  }

  // 更新 task 记录
  const now = Date.now();
  await updateScheduledTask(input.taskId, {
    last_run_at: now,
    last_run_status: output.status === 'completed' || output.status === 'partial' ? 'completed'
      : output.status === 'failed' ? 'failed'
      : output.status === 'needs_action' ? 'needs_action'
      : 'completed',
    last_result_summary: output.summary,
    next_run_at: computeNextRunAt(task, now),
  } as any);

  // 如果 skipUserMessage 或 status === 'skipped'，不写回消息（metric_monitor no_anomaly）
  if (output.skipUserMessage || output.status === 'skipped') {
    return {
      success: true,
      taskId: input.taskId,
      runId,
      status: output.status,
      skipped: true,
    };
  }

  // 写回消息
  if (conversationId) {
    const writeResult = await writeTaskRunMessage({
      conversationId,
      scopeKey: input.scopeKey,
      taskId: input.taskId,
      runId,
      taskTitle: task.name,
      status: output.status,
      summary: output.summary,
      keyFindings: output.keyFindings,
      artifacts: output.artifactRefs,
      evidenceRefs: output.evidenceRefs,
      sourceRefs: output.sourceRefs,
      traceId: `task-run-${runId}`,
      templateId: task.template_id,
      templateData: output.templateData,
    });

    // 标记未读高亮
    if (writeResult.success && writeResult.messageId) {
      const severity = output.status === 'failed' ? 'error'
        : output.status === 'needs_action' ? 'warning'
        : 'success';

      await markAutomationUnread({
        scopeKey: input.scopeKey,
        conversationId,
        messageId: writeResult.messageId,
        taskId: input.taskId,
        runId,
        severity,
        label: `${task.name} ${output.status === 'completed' ? '已完成' : output.status === 'failed' ? '执行失败' : output.status === 'needs_action' ? '需要处理' : '已完成'}`,
      }).catch(() => {});  // fail-open

      // 回填 last_result_message_id
      await updateScheduledTask(input.taskId, {
        last_result_message_id: writeResult.messageId,
      } as any);

      return {
        success: true,
        taskId: input.taskId,
        runId,
        status: output.status,
        messageId: writeResult.messageId,
      };
    }

    return {
      success: true,
      taskId: input.taskId,
      runId,
      status: output.status,
      messageId: writeResult.messageId,
      error: writeResult.error,
    };
  }

  // 没有 source_conversation_id：只更新 task，不写消息
  return {
    success: true,
    taskId: input.taskId,
    runId,
    status: output.status,
  };
}

function computeNextRunAt(task: { frequency?: string; next_run_at?: number }, from: number): number {
  const frequency = task.frequency || 'daily';
  const hour = 1000 * 60 * 60;
  const day = hour * 24;
  switch (frequency) {
    case 'hourly': return from + hour;
    case 'every_30min': return from + hour / 2;
    case 'every_15min': return from + hour / 4;
    case 'every_5min': return from + hour / 12;
    case 'weekly': return from + day * 7;
    case 'daily':
    default: return from + day;
  }
}
