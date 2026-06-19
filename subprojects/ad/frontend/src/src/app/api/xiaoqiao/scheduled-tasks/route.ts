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
  const tasks = await listScheduledTasks({ task_type: taskType, status, project_refs: projectRefs });
  return NextResponse.json(tasks);
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
