import { NextResponse } from 'next/server';
import { getDemoDebugConfig, updateDemoDebugConfig } from '@/lib/demo-data';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const config = getDemoDebugConfig(id);
  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });
  return NextResponse.json(config);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const config = updateDemoDebugConfig(id, body);
  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });
  return NextResponse.json(config);
}
