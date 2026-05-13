import { NextResponse } from 'next/server';
import { createConversation, listConversations } from '@/lib/conversation-store';

export async function GET() {
  return NextResponse.json(await listConversations());
}

export async function POST(request: Request) {
  const body = await request.json();
  const conv = await createConversation({ title: body.title });
  return NextResponse.json(conv, { status: 201 });
}
