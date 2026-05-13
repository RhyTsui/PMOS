import { NextResponse } from 'next/server';
import { getDemoDebugTasks, createDemoDebugTask } from '@/lib/demo-data';

export async function GET() {
  return NextResponse.json(getDemoDebugTasks());
}

export async function POST(request: Request) {
  const body = await request.json();
  const task = createDemoDebugTask(body);
  return NextResponse.json(task, { status: 201 });
}
