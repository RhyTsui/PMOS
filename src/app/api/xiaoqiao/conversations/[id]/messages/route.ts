import { NextResponse } from 'next/server';
import { addMessage, getConversation, listMessages } from '@/lib/conversation-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const conversation = await getConversation(id);
  if (!conversation) {
    return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
  }
  return NextResponse.json(await listMessages(id));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const body = await request.json();
  try {
    const message = await addMessage(id, {
      role: body.role || 'user',
      content: body.content || '',
      message_type: body.message_type,
      agent: body.agent,
      intent_type: body.intent_type,
      thinking: body.thinking,
      thinking_steps: body.thinking_steps,
      tool_calls: body.tool_calls,
      process_events: body.process_events,
      missing_fields: body.missing_fields,
      evidence_ids: body.evidence_ids,
      routing_decision: body.routing_decision,
      metadata: body.metadata,
    });
    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
  }
}
