import { NextResponse } from 'next/server';
import { takeoverDemoDebugTask } from '@/lib/demo-data';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = takeoverDemoDebugTask(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  return NextResponse.json(task);
}
