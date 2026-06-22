import { addMessage } from './conversation-store';
import { buildTaskResultPayload, resolveTaskMessageType, shouldGenerateTaskMessage, type TaskMessageStatus } from '@/contracts/automation/task-message-contract';
import type { MessageType, TaskResultMessagePayload } from '@/types';

/**
 * TaskMessageWriter
 *
 * 将任务运行结果写入原始会话消息列表。
 * 所有重要任务运行结果必须通过此模块写入 ChatMessage。
 */

export interface WriteTaskRunMessageInput {
  conversationId: string;
  scopeKey: string;
  taskId: string;
  runId: string;
  taskTitle: string;
  status: TaskMessageStatus;
  summary: string;
  keyFindings?: string[];
  nextActions?: TaskResultMessagePayload['next_actions'];
  artifacts?: TaskResultMessagePayload['artifacts'];
  evidenceRefs?: TaskResultMessagePayload['evidence_refs'];
  sourceRefs?: TaskResultMessagePayload['source_refs'];
  traceId?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export interface WriteTaskRunMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * 将任务运行结果写入会话消息列表
 *
 * 规则：
 * - completed → task_run_completed
 * - partial → task_run_completed (payload.runStatus = partial)
 * - failed → task_run_failed
 * - needs_action → task_needs_action
 * - skipped → 不生成用户消息，只记录 TaskRun
 * - 写入失败不吞 TaskRun 状态
 */
export async function writeTaskRunMessage(input: WriteTaskRunMessageInput): Promise<WriteTaskRunMessageResult> {
  // skipped 不生成用户消息
  if (!shouldGenerateTaskMessage(input.status)) {
    return { success: true, skipped: true };
  }

  const messageType = resolveTaskMessageType(input.status) as MessageType;
  const payload = buildTaskResultPayload({
    taskId: input.taskId,
    runId: input.runId,
    taskTitle: input.taskTitle,
    runStatus: input.status,
    summary: input.summary,
    keyFindings: input.keyFindings,
    nextActions: input.nextActions,
    artifacts: input.artifacts,
    evidenceRefs: input.evidenceRefs,
    sourceRefs: input.sourceRefs,
    traceId: input.traceId,
    templateId: input.templateId,
    templateData: input.templateData,
  });

  // 构建用户可读的消息内容
  const content = buildTaskResultContent(input.taskTitle, input.status, input.summary, input.keyFindings);

  try {
    const message = await addMessage(input.conversationId, {
      role: 'assistant',
      content,
      message_type: messageType,
      metadata: {
        task_result_payload: payload,
        task_id: input.taskId,
        run_id: input.runId,
        trace_id: input.traceId,
        template_id: input.templateId,
      },
    }, input.scopeKey);

    return {
      success: true,
      messageId: message.message_id,
    };
  } catch (error) {
    // 写入失败不吞 TaskRun 状态，只记录 error
    return {
      success: false,
      error: error instanceof Error ? error.message : 'write task message failed',
    };
  }
}

/**
 * 写入任务状态变更消息（创建/更新/暂停/恢复/删除）
 */
export async function writeTaskStatusMessage(input: {
  conversationId: string;
  scopeKey: string;
  taskId: string;
  taskTitle: string;
  action: 'created' | 'updated' | 'paused' | 'resumed' | 'deleted';
  changes?: string[];
  effectiveAt?: string;
}): Promise<WriteTaskRunMessageResult> {
  const messageTypeMap: Record<string, string> = {
    created: 'task_created',
    updated: 'task_updated',
    paused: 'task_paused',
    resumed: 'task_resumed',
    deleted: 'task_deleted',
  };

  const content = buildTaskStatusContent(input.taskTitle, input.action, input.changes);

  try {
    const message = await addMessage(input.conversationId, {
      role: 'assistant',
      content,
      message_type: messageTypeMap[input.action] as MessageType,
      metadata: {
        task_id: input.taskId,
        task_action: input.action,
        changes: input.changes,
        effective_at: input.effectiveAt,
      },
    }, input.scopeKey);

    return {
      success: true,
      messageId: message.message_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'write task status message failed',
    };
  }
}

/**
 * 写入任务 Proposal 消息
 */
export async function writeTaskProposalMessage(input: {
  conversationId: string;
  scopeKey: string;
  taskId: string;
  proposal: {
    task_title: string;
    description: string;
    template_id?: string;
    schedule_label: string;
    risk_level: string;
    risk_description?: string;
    scope_summary: string;
    output_summary: string;
    missing_slots?: string[];
    clarifying_question?: string;
  };
}): Promise<WriteTaskRunMessageResult> {
  const content = input.proposal.clarifying_question
    || buildTaskProposalContent(input.proposal);

  try {
    const message = await addMessage(input.conversationId, {
      role: 'assistant',
      content,
      message_type: 'task_proposal',
      metadata: {
        task_id: input.taskId,
        task_proposal: input.proposal,
      },
    }, input.scopeKey);

    return {
      success: true,
      messageId: message.message_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'write task proposal message failed',
    };
  }
}

// ─── 内部辅助 ─────────────────────────────────────

function buildTaskResultContent(
  taskTitle: string,
  status: TaskMessageStatus,
  summary: string,
  keyFindings?: string[],
): string {
  const statusEmoji: Record<TaskMessageStatus, string> = {
    completed: '✅',
    partial: '⚠️',
    failed: '❌',
    needs_action: '🔔',
    skipped: '⏭️',
  };

  const statusLabel: Record<TaskMessageStatus, string> = {
    completed: '已完成',
    partial: '部分完成',
    failed: '执行失败',
    needs_action: '需要处理',
    skipped: '已跳过',
  };

  let content = `${statusEmoji[status]} **${taskTitle}** — ${statusLabel[status]}\n\n${summary}`;

  if (keyFindings && keyFindings.length > 0) {
    content += '\n\n**关键发现：**\n';
    for (const finding of keyFindings.slice(0, 5)) {
      content += `- ${finding}\n`;
    }
  }

  return content;
}

function buildTaskStatusContent(
  taskTitle: string,
  action: string,
  changes?: string[],
): string {
  const actionLabel: Record<string, string> = {
    created: '已创建',
    updated: '已更新',
    paused: '已暂停',
    resumed: '已恢复',
    deleted: '已删除',
  };

  let content = `任务 **${taskTitle}** ${actionLabel[action] || action}`;

  if (changes && changes.length > 0) {
    content += '\n\n**变更内容：**\n';
    for (const change of changes) {
      content += `- ${change}\n`;
    }
  }

  return content;
}

function buildTaskProposalContent(proposal: {
  task_title: string;
  description: string;
  schedule_label: string;
  risk_level: string;
  risk_description?: string;
  scope_summary: string;
  output_summary: string;
}): string {
  let content = `📋 **任务确认：${proposal.task_title}**\n\n`;
  content += `${proposal.description}\n\n`;
  content += `**执行频率：** ${proposal.schedule_label}\n`;
  content += `**数据范围：** ${proposal.scope_summary}\n`;
  content += `**输出内容：** ${proposal.output_summary}\n`;

  if (proposal.risk_description) {
    content += `\n**风险说明：** ${proposal.risk_description}\n`;
  }

  content += '\n请确认是否创建此任务？回复"确认"创建，回复"取消"放弃。';
  return content;
}
