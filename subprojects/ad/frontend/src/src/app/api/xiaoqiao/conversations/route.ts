import { NextResponse } from 'next/server';
import { createConversation, listConversations } from '@/lib/conversation-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';
import { getConversationHighlightSummary } from '@/lib/conversation-highlight-store';
import { listScheduledTasks } from '@/lib/scheduled-task-store';
import type { ProjectBinding } from '@/types';

function readProjectBinding(body: Record<string, unknown>): ProjectBinding | undefined {
  const value = body.project_binding;
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const projectRefs = Array.isArray(record.project_refs) ? record.project_refs.map((item) => String(item).trim()).filter(Boolean) : [];
  if (!projectRefs.length) return undefined;
  return {
    project_refs: projectRefs,
    default_project_ref: typeof record.default_project_ref === 'string' ? record.default_project_ref.trim() || undefined : undefined,
    last_active_project_ref: typeof record.last_active_project_ref === 'string' ? record.last_active_project_ref.trim() || undefined : undefined,
    source_project_refs: Array.isArray(record.source_project_refs) ? record.source_project_refs.map((item) => String(item).trim()).filter(Boolean) : undefined,
  };
}

export async function GET(request: Request) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || searchParams.get('page_size') || undefined;
  const cursor = searchParams.get('cursor') || undefined;
  const projectRefs = searchParams.get('project_refs')?.split(',').map((item) => item.trim()).filter(Boolean) || [];
  const conversations = await listConversations(scope.key, {
    limit: limit ? Number(limit) : undefined,
    cursor,
    project_refs: projectRefs,
  });

  // ─── Chat-first Task Center: 附加 taskBadge + unreadAutomation ─────
  try {
    const allTasks = await listScheduledTasks({});
    const userTasks = allTasks.filter((t) => t.created_by === scope.key && t.source_conversation_id);

    // 按会话分组
    const tasksByConv = new Map<string, typeof userTasks>();
    for (const task of userTasks) {
      const convId = task.source_conversation_id!;
      if (!tasksByConv.has(convId)) tasksByConv.set(convId, []);
      tasksByConv.get(convId)!.push(task);
    }

    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const tasks = tasksByConv.get(conv.conversation_id) || [];
        const activeTask = tasks.find((t) => t.status === 'active') || tasks[0];

        // task badge
        const taskBadge = activeTask ? {
          task_id: activeTask.id,
          status: activeTask.status === 'failed' ? 'failed' as const
            : activeTask.status === 'paused' ? 'paused' as const
            : activeTask.last_run_status === 'needs_action' ? 'needs_action' as const
            : 'active' as const,
          label: activeTask.name,
          next_run_at: activeTask.next_run_at ? new Date(activeTask.next_run_at).toISOString() : undefined,
        } : undefined;

        // unread automation
        const highlight = await getConversationHighlightSummary(scope.key, conv.conversation_id);
        const unreadAutomation = highlight ? {
          count: highlight.count,
          latest_run_id: highlight.latestRunId,
          latest_message_id: highlight.latestMessageId,
          severity: highlight.latestSeverity || 'info',
          label: highlight.latestLabel,
        } : undefined;

        // conversation type
        const conversationType = tasks.length > 0 ? 'automation' as const : 'normal' as const;

        return {
          ...conv,
          conversation_type: conversationType,
          task_badge: taskBadge,
          unread_automation: unreadAutomation,
        };
      }),
    );

    return NextResponse.json(enrichedConversations);
  } catch {
    // fail-open: 高亮查询失败不影响会话列表
    return NextResponse.json(conversations);
  }
}

export async function POST(request: Request) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const conv = await createConversation(scope.key, { title: body.title, project_binding: readProjectBinding(body) });
  return NextResponse.json(conv, { status: 201 });
}
