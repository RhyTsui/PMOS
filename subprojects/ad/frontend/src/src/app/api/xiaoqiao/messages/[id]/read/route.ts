import { NextResponse } from 'next/server';
import { markAutomationRead } from '@/lib/conversation-highlight-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function POST(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // id here is the message_id; we need conversation_id from the body
  const body = await request.json().catch(() => ({}));
  const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id : '';
  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
  }

  await markAutomationRead({
    scopeKey: scope.key,
    conversationId,
    messageId: id,
    userId: scope.key,
  });

  return NextResponse.json({ success: true });
}
