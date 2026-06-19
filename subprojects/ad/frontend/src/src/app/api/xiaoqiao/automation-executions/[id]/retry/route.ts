import { NextRequest, NextResponse } from 'next/server';
import { getAutomationExecution, retryAutomationExecution } from '@/lib/automation-execution-store';
import { getScheduledTask, runScheduledTask } from '@/lib/scheduled-task-store';
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
  const execution = await getAutomationExecution(scope.key, id);
  if (!execution) {
    return NextResponse.json({ error: 'automation_execution_not_found' }, { status: 404 });
  }
  const task = await getScheduledTask(execution.task_id);
  if (!task || task.created_by !== scope.key) {
    return NextResponse.json({ error: 'automation_not_found' }, { status: 404 });
  }
  await retryAutomationExecution(scope.key, id);
  const result = await runScheduledTask(task.id, scope.key);
  if (!result) {
    return NextResponse.json({ error: 'automation_retry_failed' }, { status: 500 });
  }
  return NextResponse.json(result.execution);
}
