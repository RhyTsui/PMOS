import { NextRequest, NextResponse } from 'next/server';
import { createScheduledTask, listScheduledTasks } from '@/lib/scheduled-task-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskType = searchParams.get('task_type') || undefined;
  const status = searchParams.get('status') || undefined;
  const projectRefs = searchParams.get('project_refs')?.split(',').map((item) => item.trim()).filter(Boolean) || [];
  const templateFilter = searchParams.get('template_id') || undefined;
  const lightweight = searchParams.get('lightweight') === 'true';

  const tasks = await listScheduledTasks({ task_type: taskType, status, project_refs: projectRefs });
  let userTasks = tasks.filter((task) => task.created_by === scope.key);

  // 按模板筛选
  if (templateFilter) {
    userTasks = userTasks.filter((task) => task.template_id === templateFilter);
  }

  // 轻量模式：只返回普通用户可见字段
  if (lightweight) {
    return NextResponse.json(userTasks.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      template_id: task.template_id,
      risk_level: task.risk_level,
      source_conversation_id: task.source_conversation_id,
      next_run_at: task.next_run_at,
      last_run_at: task.last_run_at,
      last_run_status: task.last_run_status,
      last_result_summary: task.last_result_summary,
      last_result_message_id: task.last_result_message_id,
      created_at: task.created_at,
      updated_at: task.updated_at,
    })));
  }

  return NextResponse.json(userTasks);
}

export async function POST(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const task = await createScheduledTask({
    ...body,
    created_by: scope.key,
  });
  return NextResponse.json(task, { status: 201 });
}
