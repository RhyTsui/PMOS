import { NextResponse } from 'next/server';
import { createUserMemory, listUserMemories, upsertUserMemoryByKey } from '@/lib/user-memory-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memoryType = searchParams.get('memory_type') || undefined;
  const userId = searchParams.get('user_id') || undefined;
  const businessDomain = searchParams.get('business_domain') || undefined;
  const memories = await listUserMemories({
    user_id: userId,
    memory_type: memoryType,
    business_domain: businessDomain,
  });
  return NextResponse.json(memories);
}

export async function POST(request: Request) {
  const body = await request.json();
  const memory = body?.key
    ? await upsertUserMemoryByKey(body)
    : await createUserMemory(body);
  return NextResponse.json(memory, { status: 201 });
}
