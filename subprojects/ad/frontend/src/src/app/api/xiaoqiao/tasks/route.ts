import { NextResponse } from 'next/server';
import { listWorkflowTasks } from '@/lib/workflow-task-store';
import { listConversations } from '@/lib/conversation-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(request: Request) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const type = searchParams.get('type') || undefined;
  const ownedConversationIds = new Set((await listConversations(scope.key)).map((conversation) => conversation.conversation_id));
  const tasks = await listWorkflowTasks();
  const filtered = tasks.filter((t) => (
    ownedConversationIds.has(t.conversation_id)
    && (!status || t.status === status)
    && (!type || t.task_type === type)
  ));
  return NextResponse.json(filtered);
}
