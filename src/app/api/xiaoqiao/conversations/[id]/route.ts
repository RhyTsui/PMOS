import { NextResponse } from 'next/server';
import { deleteConversation, getConversation, updateConversation } from '@/lib/conversation-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const conversation = await getConversation(id);
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
  const body = await request.json();
  const conversation = await updateConversation(id, {
    title: body.title,
    status: body.status,
    current_mode: body.current_mode,
    latest_task_id: body.latest_task_id,
  });
  if (!conversation) {
    return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
  }
  return NextResponse.json(conversation);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const removed = await deleteConversation(id);
  if (!removed) {
    return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
