import { NextResponse } from 'next/server';
import { getDemoDebugResult } from '@/lib/demo-data';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = getDemoDebugResult(id);
  if (!result) return NextResponse.json({ error: 'Result not found' }, { status: 404 });
  return NextResponse.json(result);
}
