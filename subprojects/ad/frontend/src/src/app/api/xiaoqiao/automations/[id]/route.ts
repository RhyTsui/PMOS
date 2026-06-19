import { NextRequest, NextResponse } from 'next/server';
import { deleteScheduledTask, getScheduledTask, updateScheduledTask } from '@/lib/scheduled-task-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = await getScheduledTask(id);
  if (!task) return NextResponse.json({ error: 'automation_not_found' }, { status: 404 });
  if (task.created_by !== scope.key) {
    return NextResponse.json({ error: 'automation_not_found' }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const current = await getScheduledTask(id);
  if (!current || current.created_by !== scope.key) {
    return NextResponse.json({ error: 'automation_not_found' }, { status: 404 });
  }
  const body = await request.json();
  const task = await updateScheduledTask(id, {
    ...body,
    created_by: current.created_by,
  });
  if (!task) return NextResponse.json({ error: 'automation_not_found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = await getScheduledTask(id);
  if (!task || task.created_by !== scope.key) {
    return NextResponse.json({ error: 'automation_not_found' }, { status: 404 });
  }
  const ok = await deleteScheduledTask(id);
  return NextResponse.json({ success: ok });
}
