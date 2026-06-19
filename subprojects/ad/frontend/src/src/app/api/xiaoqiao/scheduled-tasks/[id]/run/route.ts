import { NextRequest, NextResponse } from 'next/server';
import { runScheduledTask } from '@/lib/scheduled-task-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const result = await runScheduledTask(id, scope.key);
  if (!result) {
    return NextResponse.json({ error: 'scheduled_task_not_found' }, { status: 404 });
  }

  return NextResponse.json(result);
}
