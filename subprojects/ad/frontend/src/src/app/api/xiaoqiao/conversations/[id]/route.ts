import { NextResponse } from 'next/server';
import { deleteConversation, getConversation, updateConversation } from '@/lib/conversation-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';
import type { Conversation } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const conversation = await getConversation(id, scope.key);
  if (!conversation) {
    return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
  }
  return NextResponse.json(conversation);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({})) as (Partial<Pick<Conversation, 'title' | 'status' | 'current_mode' | 'latest_task_id' | 'project_binding'>> & {
    normalize_title?: boolean;
  });
  const conversation = await updateConversation(id, {
    title: body.title,
    status: body.status,
    current_mode: body.current_mode,
    latest_task_id: body.latest_task_id,
    project_binding: body.project_binding,
  }, scope.key, body.normalize_title === false ? { truncate: false } : {});
  if (!conversation) {
    return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
  }
  return NextResponse.json(conversation);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const removed = await deleteConversation(id, scope.key);
  if (!removed) {
    return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
