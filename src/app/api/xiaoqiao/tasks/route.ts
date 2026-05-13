import { NextResponse } from 'next/server';
import { getDemoTasks } from '@/lib/demo-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const type = searchParams.get('type') || undefined;
  const tasks = getDemoTasks();
  const filtered = tasks.filter(t => (!status || t.status === status) && (!type || t.task_type === type));
  return NextResponse.json(filtered);
}
