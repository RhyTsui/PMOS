import { NextRequest, NextResponse } from 'next/server';
import { listAutomationExecutions } from '@/lib/automation-execution-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('task_id') || undefined;
  const projectRefs = searchParams.get('project_refs')?.split(',').map((item) => item.trim()).filter(Boolean) || [];
  const executions = await listAutomationExecutions(scope.key, taskId);
  return NextResponse.json(
    projectRefs.length
      ? executions.filter((execution) => {
        const projectBinding = execution.project_binding;
        if (!projectBinding || projectBinding.project_refs.length === 0) return true;
        return projectRefs.some((ref) => projectBinding.project_refs.includes(ref));
      })
      : executions,
  );
}
