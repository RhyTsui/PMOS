import { NextResponse } from 'next/server';
import { getWorkflowTask } from '@/lib/workflow-task-store';
import { listConversations } from '@/lib/conversation-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const ownedConversationIds = new Set((await listConversations(scope.key)).map((conversation) => conversation.conversation_id));
  const task = await getWorkflowTask(id);
  if (!task || !ownedConversationIds.has(task.conversation_id)) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  return NextResponse.json(task);
}
