import { NextResponse } from 'next/server';
import { searchDemoMemories } from '@/lib/demo-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const results = searchDemoMemories(query);
  return NextResponse.json(results);
}
