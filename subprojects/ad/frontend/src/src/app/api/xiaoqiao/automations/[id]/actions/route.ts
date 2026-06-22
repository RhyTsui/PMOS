import { NextResponse } from 'next/server';
import { getConversation, addMessage } from '@/lib/conversation-store';
import { getScheduledTask, updateScheduledTask, deleteScheduledTask, runScheduledTask } from '@/lib/scheduled-task-store';
import { writeTaskStatusMessage } from '@/lib/task-message-writer';
import { runTemplateTask } from '@/lib/task-template-runner';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

type TaskAction = 'pause' | 'resume' | 'delete' | 'rerun' | 'update';

export async function POST(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action as TaskAction;
  if (!action || !['pause', 'resume', 'delete', 'rerun', 'update'].includes(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }

  const task = await getScheduledTask(id);
  if (!task) {
    return NextResponse.json({ error: 'task not found' }, { status: 404 });
  }

  if (task.created_by !== scope.key) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 删除必须检查 confirmed=true
  if (action === 'delete' && !body.confirmed) {
    return NextResponse.json({ error: 'deletion requires confirmed=true', requires_confirmation: true }, { status: 409 });
  }

  const conversationId = task.source_conversation_id || '';

  try {
    switch (action) {
      case 'pause': {
        await updateScheduledTask(id, { status: 'paused' });
        if (conversationId) {
          await writeTaskStatusMessage({
            conversationId,
            scopeKey: scope.key,
            taskId: id,
            taskTitle: task.name,
            action: 'paused',
          });
        }
        return NextResponse.json({ success: true, action: 'paused' });
      }

      case 'resume': {
        await updateScheduledTask(id, { status: 'active' });
        if (conversationId) {
          await writeTaskStatusMessage({
            conversationId,
            scopeKey: scope.key,
            taskId: id,
            taskTitle: task.name,
            action: 'resumed',
          });
        }
        return NextResponse.json({ success: true, action: 'resumed' });
      }

      case 'delete': {
        if (conversationId) {
          await writeTaskStatusMessage({
            conversationId,
            scopeKey: scope.key,
            taskId: id,
            taskTitle: task.name,
            action: 'deleted',
          });
        }
        await deleteScheduledTask(id);
        return NextResponse.json({ success: true, action: 'deleted' });
      }

      case 'rerun': {
        // 标准模板任务使用 template runner；其他任务走 legacy 路径
        if (task.template_id && task.template_id !== 'custom') {
          const templateResult = await runTemplateTask({
            taskId: id,
            scopeKey: scope.key,
            testMode: body.testMode,
          });
          return NextResponse.json({
            success: templateResult.success,
            action: 'rerun',
            result: {
              run_id: templateResult.runId,
              status: templateResult.status,
              message_id: templateResult.messageId,
              skipped: templateResult.skipped,
              error: templateResult.error,
            },
          });
        }
        const result = await runScheduledTask(id, scope.key);
        return NextResponse.json({ success: true, action: 'rerun', result: result ? { execution_id: result.execution.id } : null });
      }

      case 'update': {
        const updates: Record<string, unknown> = {};
        if (body.name) updates.name = body.name;
        if (body.description) updates.description = body.description;
        if (body.frequency) updates.frequency = body.frequency;
        if (body.cron_expression) updates.cron_expression = body.cron_expression;
        if (body.custom_params) updates.custom_params = body.custom_params;

        await updateScheduledTask(id, updates);
        if (conversationId) {
          const changes: string[] = [];
          if (body.name) changes.push(`任务名改为"${body.name}"`);
          if (body.frequency) changes.push(`频率改为${body.frequency}`);
          await writeTaskStatusMessage({
            conversationId,
            scopeKey: scope.key,
            taskId: id,
            taskTitle: body.name || task.name,
            action: 'updated',
            changes,
          });
        }
        return NextResponse.json({ success: true, action: 'updated' });
      }

      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'action failed',
      detail: error instanceof Error ? error.message : 'unknown error',
    }, { status: 500 });
  }
}
