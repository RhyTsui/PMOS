import { NextResponse } from 'next/server';
import { getDemoMemories, createDemoMemory } from '@/lib/demo-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memoryType = searchParams.get('memory_type') || undefined;
  let memories = getDemoMemories();
  if (memoryType) memories = memories.filter(m => m.memory_type === memoryType);
  return NextResponse.json(memories);
}

export async function POST(request: Request) {
  const body = await request.json();
  const memory = createDemoMemory(body);
  return NextResponse.json(memory, { status: 201 });
}
