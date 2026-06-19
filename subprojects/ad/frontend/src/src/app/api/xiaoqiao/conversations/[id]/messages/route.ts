import { NextResponse } from 'next/server';
import { addMessage, getConversation, listMessages } from '@/lib/conversation-store';
import { commitAttachments } from '@/lib/attachment-store';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-service';
import { scheduleRecommendationRefresh } from '@/lib/recommendation-service';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

function readToken(request: Request): string {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

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
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || undefined;
  const before = searchParams.get('before') || undefined;
  return NextResponse.json(await listMessages(id, scope.key, {
    limit: limit ? Number(limit) : 30,
    before,
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  try {
    const message = await addMessage(id, {
      role: body.role || 'user',
      content: body.content || '',
      message_type: body.message_type,
      agent: body.agent,
      intent_type: body.intent_type,
      tool_calls: body.tool_calls,
      process_events: body.process_events,
      missing_fields: body.missing_fields,
      evidence_ids: body.evidence_ids,
      routing_decision: body.routing_decision,
      metadata: body.metadata,
    }, scope.key);
    if ((body.role || 'user') === 'user' && Array.isArray(body.attachments) && body.attachments.length > 0) {
      message.attachments = await commitAttachments(
        body.attachments.map((item: unknown) => String(item)).filter(Boolean),
        id,
        message.message_id,
        scope.key,
      );
    }
    if ((body.role || 'user') === 'assistant') {
      const token = readToken(request);
      if (token) {
        void scheduleRecommendationRefresh({
          token,
          conversationId: id,
        });
      }
    }
    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
  }
}
