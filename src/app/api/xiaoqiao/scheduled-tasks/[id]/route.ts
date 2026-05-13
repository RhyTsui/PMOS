import { NextResponse } from 'next/server';
import { getDemoScheduledTask, updateDemoScheduledTask, deleteDemoScheduledTask } from '@/lib/demo-data';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = getDemoScheduledTask(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const task = updateDemoScheduledTask(id, body);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = deleteDemoScheduledTask(id);
  return NextResponse.json({ success: ok });
}
