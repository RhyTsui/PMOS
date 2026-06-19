import { NextRequest, NextResponse } from 'next/server';
import { getAutomationExecution } from '@/lib/automation-execution-store';
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
  const execution = await getAutomationExecution(scope.key, id);
  if (!execution) {
    return NextResponse.json({ error: 'automation_execution_not_found' }, { status: 404 });
  }
  return NextResponse.json(execution);
}
