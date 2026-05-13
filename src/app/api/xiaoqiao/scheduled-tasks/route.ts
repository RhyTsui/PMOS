import { NextResponse } from 'next/server';
import { getDemoScheduledTasks, createDemoScheduledTask } from '@/lib/demo-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskType = searchParams.get('task_type') || undefined;
  const status = searchParams.get('status') || undefined;
  let tasks = getDemoScheduledTasks();
  if (taskType) tasks = tasks.filter(t => t.task_type === taskType);
  if (status) tasks = tasks.filter(t => t.status === status);
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const body = await request.json();
  const task = createDemoScheduledTask(body);
  return NextResponse.json(task, { status: 201 });
}
