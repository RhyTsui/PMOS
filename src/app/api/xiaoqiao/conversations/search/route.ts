import { NextResponse } from 'next/server';
import { searchConversations } from '@/lib/conversation-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  return NextResponse.json(await searchConversations(query));
}
