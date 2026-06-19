import { NextRequest, NextResponse } from 'next/server';
import { getScheduledTask, pauseScheduledTask } from '@/lib/scheduled-task-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const current = await getScheduledTask(id);
  if (!current || current.created_by !== scope.key) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  const task = await pauseScheduledTask(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  return NextResponse.json(task);
}
