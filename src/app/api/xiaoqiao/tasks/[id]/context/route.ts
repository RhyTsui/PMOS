import { NextResponse } from 'next/server';
import { getDemoTaskContext, updateDemoTaskContext } from '@/lib/demo-data';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = getDemoTaskContext(id);
  if (!ctx) return NextResponse.json({ error: 'Context not found' }, { status: 404 });
  return NextResponse.json(ctx);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const ctx = updateDemoTaskContext(id, body);
  return NextResponse.json(ctx);
}
