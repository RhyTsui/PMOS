import { NextResponse } from 'next/server';
import { searchUserMemories } from '@/lib/user-memory-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const userId = searchParams.get('user_id') || undefined;
  const results = await searchUserMemories(query, userId);
  return NextResponse.json(results);
}
