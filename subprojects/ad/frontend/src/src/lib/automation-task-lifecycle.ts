import { createScheduledTask, getScheduledTask, updateScheduledTask, deleteScheduledTask, listScheduledTasks } from './scheduled-task-store';
import { writeTaskStatusMessage, writeTaskProposalMessage } from './task-message-writer';
import { getTaskRiskPolicy } from '@/contracts/automation/task-risk-policy';
import type { AutomationIntentResult, ScheduledTask, TaskProposalPayload } from '@/types';
import type { TaskMessageStatus } from '@/contracts/automation/task-message-contract';

/**
 * Automation Task Lifecycle
 *
 * 封装任务创建/修改/删除/暂停/恢复/重跑的生命周期操作。
 * 协调 scheduled-task-store + task-message-writer + 风险策略。
 */

export interface TaskLifecycleContext {
  scopeKey: string;
  conversationId: string;
  userId: string;
}

/**
 * 处理自动化意图
 */
export async function handleAutomationIntent(
  intent: AutomationIntentResult,
  ctx: TaskLifecycleContext,
): Promise<{
  success: boolean;
  messageType: string;
  content: string;
  taskId?: string;
  error?: string;
}> {
  switch (intent.automation_intent) {
    case 'create':
      return handleCreateTask(intent, ctx);
    case 'update':
      return handleUpdateTask(intent, ctx);
    case 'pause':
      return handlePauseTask(intent, ctx);
    case 'resume':
      return handleResumeTask(intent, ctx);
    case 'delete':
      return handleDeleteTask(intent, ctx);
    case 'rerun':
      return handleRerunTask(intent, ctx);
    case 'ask_status':
      return handleAskStatus(intent, ctx);
    case 'ask_history':
      return handleAskHistory(intent, ctx);
    default:
      return { success: false, messageType: 'assistant_reply', content: '未识别到自动化意图。', error: 'unknown intent' };
  }
}

// ─── Create ─────────────────────────────────────

async function handleCreateTask(
  intent: AutomationIntentResult,
  ctx: TaskLifecycleContext,
): Promise<{ success: boolean; messageType: string; content: string; taskId?: string; error?: string }> {
  // 检查风险策略
  const riskPolicy = getTaskRiskPolicy(intent.risk_level);
  if (riskPolicy.forbidAutoExecute) {
    return {
      success: false,
      messageType: 'task_proposal',
      content: riskPolicy.confirmationMessage || '该任务涉及高风险操作，需要人工确认。',
    };
  }

  // 构建 proposal
  const proposal = buildProposalFromIntent(intent);

  // 写 proposal 消息
  const proposalResult = await writeTaskProposalMessage({
    conversationId: ctx.conversationId,
    scopeKey: ctx.scopeKey,
    taskId: `pending-${Date.now()}`,
    proposal,
  });

  if (!proposalResult.success) {
    return {
      success: false,
      messageType: 'assistant_reply',
      content: '创建任务确认卡失败，请重试。',
      error: proposalResult.error,
    };
  }

  return {
    success: true,
    messageType: 'task_proposal',
    content: proposalResult.messageId || 'proposal created',
    taskId: proposalResult.messageId,
  };
}

/**
 * 确认创建任务（用户确认 proposal 后调用）
 */
export async function confirmCreateTask(input: {
  scopeKey: string;
  conversationId: string;
  userId: string;
  proposal: TaskProposalPayload;
}): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const task = await createScheduledTask({
    name: input.proposal.task_title,
    description: input.proposal.description,
    task_type: 'custom',
    status: 'active',
    frequency: resolveFrequencyFromLabel(input.proposal.schedule_label),
    created_by: input.scopeKey,
    account_ids: [],
    app_names: [],
    monitor_metrics: [],
    alert_conditions: [],
    alert_channels: ['in_app'],
    alert_targets: [],
    custom_params: {
      template_id: input.proposal.template_id,
      risk_level: input.proposal.risk_level,
      scope_summary: input.proposal.scope_summary,
      output_summary: input.proposal.output_summary,
    },
    recent_executions: [],
    total_executions: 0,
    success_count: 0,
    failure_count: 0,
    enabled: true,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_conversation_id: input.conversationId,
    risk_level: input.proposal.risk_level,
    template_id: input.proposal.template_id as ScheduledTask['template_id'],
  });

  // 写状态消息
  await writeTaskStatusMessage({
    conversationId: input.conversationId,
    scopeKey: input.scopeKey,
    taskId: task.id,
    taskTitle: task.name,
    action: 'created',
  });

  return { success: true, taskId: task.id };
}

// ─── Update ─────────────────────────────────────

async function handleUpdateTask(
  intent: AutomationIntentResult,
  ctx: TaskLifecycleContext,
): Promise<{ success: boolean; messageType: string; content: string; taskId?: string }> {
  const task = await resolveTargetTask(intent, ctx);
  if (!task) {
    return { success: false, messageType: 'assistant_reply', content: '没有找到要修改的任务。请指定任务名称。' };
  }

  const changes: string[] = [];
  const updates: Partial<ScheduledTask> = {};

  if (intent.slots.media && intent.slots.media.length > 0) {
    updates.custom_params = { ...task.custom_params, media_filter: intent.slots.media };
    changes.push(`媒体范围改为${intent.slots.media.join('、')}`);
  }

  if (intent.slots.schedule) {
    updates.frequency = resolveFrequencyFromLabel(intent.slots.schedule);
    changes.push(`频率改为${intent.slots.schedule}`);
  }

  await updateScheduledTask(task.id, updates);

  // 写状态消息
  const convId = task.source_conversation_id || ctx.conversationId;
  await writeTaskStatusMessage({
    conversationId: convId,
    scopeKey: ctx.scopeKey,
    taskId: task.id,
    taskTitle: task.name,
    action: 'updated',
    changes,
  });

  return {
    success: true,
    messageType: 'task_updated',
    content: `已更新任务"${task.name}"：${changes.join('；')}`,
    taskId: task.id,
  };
}

// ─── Pause ─────────────────────────────────────

async function handlePauseTask(
  intent: AutomationIntentResult,
  ctx: TaskLifecycleContext,
): Promise<{ success: boolean; messageType: string; content: string; taskId?: string }> {
  const task = await resolveTargetTask(intent, ctx);
  if (!task) {
    return { success: false, messageType: 'assistant_reply', content: '没有找到要暂停的任务。' };
  }

  await updateScheduledTask(task.id, { status: 'paused' });
  const convId = task.source_conversation_id || ctx.conversationId;
  await writeTaskStatusMessage({
    conversationId: convId,
    scopeKey: ctx.scopeKey,
    taskId: task.id,
    taskTitle: task.name,
    action: 'paused',
  });

  return { success: true, messageType: 'task_paused', content: `已暂停任务"${task.name}"`, taskId: task.id };
}

// ─── Resume ─────────────────────────────────────

async function handleResumeTask(
  intent: AutomationIntentResult,
  ctx: TaskLifecycleContext,
): Promise<{ success: boolean; messageType: string; content: string; taskId?: string }> {
  const task = await resolveTargetTask(intent, ctx);
  if (!task) {
    return { success: false, messageType: 'assistant_reply', content: '没有找到要恢复的任务。' };
  }

  await updateScheduledTask(task.id, { status: 'active' });
  const convId = task.source_conversation_id || ctx.conversationId;
  await writeTaskStatusMessage({
    conversationId: convId,
    scopeKey: ctx.scopeKey,
    taskId: task.id,
    taskTitle: task.name,
    action: 'resumed',
  });

  return { success: true, messageType: 'task_resumed', content: `已恢复任务"${task.name}"`, taskId: task.id };
}

// ─── Delete ─────────────────────────────────────

async function handleDeleteTask(
  intent: AutomationIntentResult,
  ctx: TaskLifecycleContext,
): Promise<{ success: boolean; messageType: string; content: string; taskId?: string }> {
  const task = await resolveTargetTask(intent, ctx);
  if (!task) {
    return { success: false, messageType: 'assistant_reply', content: '没有找到要删除的任务。' };
  }

  const convId = task.source_conversation_id || ctx.conversationId;
  await writeTaskStatusMessage({
    conversationId: convId,
    scopeKey: ctx.scopeKey,
    taskId: task.id,
    taskTitle: task.name,
    action: 'deleted',
  });

  await deleteScheduledTask(task.id);
  return { success: true, messageType: 'task_deleted', content: `已删除任务"${task.name}"`, taskId: task.id };
}

// ─── Rerun ─────────────────────────────────────

async function handleRerunTask(
  intent: AutomationIntentResult,
  ctx: TaskLifecycleContext,
): Promise<{ success: boolean; messageType: string; content: string; taskId?: string }> {
  const task = await resolveTargetTask(intent, ctx);
  if (!task) {
    return { success: false, messageType: 'assistant_reply', content: '没有找到要重跑的任务。' };
  }

  return {
    success: true,
    messageType: 'assistant_reply',
    content: `正在重新执行任务"${task.name}"，请稍候。`,
    taskId: task.id,
  };
}

// ─── Status / History ─────────────────────────────────────

async function handleAskStatus(
  intent: AutomationIntentResult,
  ctx: TaskLifecycleContext,
): Promise<{ success: boolean; messageType: string; content: string; taskId?: string }> {
  const task = await resolveTargetTask(intent, ctx);
  if (!task) {
    // 列出所有任务
    const tasks = await listScheduledTasks({});
    const userTasks = tasks.filter((t) => t.created_by === ctx.scopeKey);
    if (userTasks.length === 0) {
      return { success: true, messageType: 'assistant_reply', content: '你目前没有任何自动化任务。可以通过对话创建任务，例如"每天 9 点给我看昨天巨量和腾讯 ROI 异常"。' };
    }

    const statusLabels: Record<string, string> = {
      active: '运行中',
      paused: '已暂停',
      failed: '失败',
      completed: '已完成',
    };

    let content = `你当前有 ${userTasks.length} 个自动化任务：\n\n`;
    for (const t of userTasks.slice(0, 10)) {
      content += `- **${t.name}** — ${statusLabels[t.status] || t.status}\n`;
      if (t.last_result_summary) {
        content += `  最近结果：${t.last_result_summary}\n`;
      }
    }
    return { success: true, messageType: 'assistant_reply', content };
  }

  const statusLabels: Record<string, string> = {
    active: '运行中',
    paused: '已暂停',
    failed: '失败',
    completed: '已完成',
  };

  let content = `**${task.name}**\n\n`;
  content += `状态：${statusLabels[task.status] || task.status}\n`;
  if (task.last_run_status) content += `最近运行：${task.last_run_status}\n`;
  if (task.last_result_summary) content += `最近结果：${task.last_result_summary}\n`;
  if (task.next_run_at) content += `下次执行：${new Date(task.next_run_at).toLocaleString('zh-CN')}\n`;

  return { success: true, messageType: 'assistant_reply', content, taskId: task.id };
}

async function handleAskHistory(
  intent: AutomationIntentResult,
  ctx: TaskLifecycleContext,
): Promise<{ success: boolean; messageType: string; content: string; taskId?: string }> {
  const task = await resolveTargetTask(intent, ctx);
  if (!task) {
    return { success: false, messageType: 'assistant_reply', content: '没有找到要查看历史的任务。' };
  }

  const executions = task.recent_executions || [];
  if (executions.length === 0) {
    return { success: true, messageType: 'assistant_reply', content: `任务"${task.name}"暂无执行记录。`, taskId: task.id };
  }

  let content = `**${task.name}** 最近执行记录：\n\n`;
  for (const exec of executions.slice(0, 10)) {
    const statusIcon = exec.status === 'success' || exec.status === 'succeeded' ? '✅' : exec.status === 'failed' ? '❌' : '⚠️';
    content += `${statusIcon} ${new Date(exec.started_at).toLocaleString('zh-CN')} — ${exec.result_summary}\n`;
  }

  return { success: true, messageType: 'assistant_reply', content, taskId: task.id };
}

// ─── 辅助函数 ─────────────────────────────────────

async function resolveTargetTask(
  intent: AutomationIntentResult,
  ctx: TaskLifecycleContext,
): Promise<ScheduledTask | undefined> {
  const tasks = await listScheduledTasks({});
  const userTasks = tasks.filter((t) => t.created_by === ctx.scopeKey);

  if (intent.target_task_ref === 'current' || intent.target_task_ref === 'latest') {
    // 优先当前会话的最近任务
    const convTask = userTasks.find((t) => t.source_conversation_id === ctx.conversationId);
    if (convTask) return convTask;
    // 退而求其次，最近创建的任务
    return userTasks.sort((a, b) => b.created_at - a.created_at)[0];
  }

  return userTasks[0];
}

function buildProposalFromIntent(intent: AutomationIntentResult): TaskProposalPayload {
  const templateName: Record<string, string> = {
    scheduled_join_table: '拼表定时更新',
    scheduled_aggregate_table: '聚合表定时更新',
    gi_keyword_daily_digest: 'GI 日报',
    scheduled_metric_monitor: '指标监控',
  };

  const templateNameStr = intent.template_id ? (templateName[intent.template_id] || '自动化任务') : '自动化任务';
  const scheduleLabel = intent.slots.schedule || '每天';
  const scopeParts: string[] = [];
  if (intent.slots.media?.length) scopeParts.push(`媒体：${intent.slots.media.join('、')}`);
  if (intent.slots.metrics?.length) scopeParts.push(`指标：${intent.slots.metrics.join('、')}`);
  if (intent.slots.time_range) scopeParts.push(`时间范围：${intent.slots.time_range}`);
  if (intent.slots.project) scopeParts.push(`项目：${intent.slots.project}`);

  const riskPolicy = getTaskRiskPolicy(intent.risk_level);

  return {
    task_title: `${templateNameStr}${scheduleLabel}`,
    description: `定时执行${templateNameStr}任务`,
    template_id: intent.template_id,
    schedule_label: scheduleLabel,
    risk_level: intent.risk_level,
    risk_description: riskPolicy.description,
    scope_summary: scopeParts.join('；') || '按当前配置',
    output_summary: '结果将发送到当前会话',
    missing_slots: intent.missing_slots,
    clarifying_question: intent.clarifying_question,
  };
}

function resolveFrequencyFromLabel(label: string): ScheduledTask['frequency'] {
  if (/hourly|每小时/.test(label)) return 'hourly';
  if (/weekly|每周/.test(label)) return 'weekly';
  if (/daily|每天|每日/.test(label)) return 'daily';
  return 'daily';
}
