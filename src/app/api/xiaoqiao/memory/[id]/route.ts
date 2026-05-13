import { NextResponse } from 'next/server';
import { getDemoMemory, updateDemoMemory, deleteDemoMemory, archiveDemoMemory } from '@/lib/demo-data';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memory = getDemoMemory(id);
  if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  return NextResponse.json(memory);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  if (body.action === 'archive') {
    const memory = archiveDemoMemory(id);
    if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    return NextResponse.json(memory);
  }
  const memory = updateDemoMemory(id, body);
  if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  return NextResponse.json(memory);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = deleteDemoMemory(id);
  return NextResponse.json({ success: ok });
}
