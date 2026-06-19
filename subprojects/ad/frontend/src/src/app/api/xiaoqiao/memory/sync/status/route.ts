import { NextResponse } from 'next/server';
import { getMemorySyncStatus } from '@/lib/dataki-memory-sync';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id') || undefined;
  const status = await getMemorySyncStatus(userId);
  return NextResponse.json(status);
}
