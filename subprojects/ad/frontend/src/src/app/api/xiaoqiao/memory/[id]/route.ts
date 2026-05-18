import { NextResponse } from 'next/server';
import { archiveUserMemory, deleteUserMemory, getUserMemory, updateUserMemory } from '@/lib/user-memory-store';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memory = await getUserMemory(id);
  if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  return NextResponse.json(memory);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  if (body.action === 'archive') {
    const memory = await archiveUserMemory(id);
    if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    return NextResponse.json(memory);
  }
  const memory = await updateUserMemory(id, body);
  if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  return NextResponse.json(memory);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteUserMemory(id);
  return NextResponse.json({ success: ok });
}
