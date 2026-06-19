import { NextResponse } from 'next/server';
import { getIndustryTask } from '@/lib/industry-intel-store';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getIndustryTask(id);
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  return NextResponse.json(task);
}
