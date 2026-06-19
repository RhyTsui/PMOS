import { NextResponse } from 'next/server';
import { syncMemoriesToDataki } from '@/lib/dataki-memory-sync';
import { createUserMemory, getUserMemory, listUserMemories, upsertUserMemoryByKey } from '@/lib/user-memory-store';
import { getPersonalKnowledgeScopeKey, resolveUserScopeFromRequest } from '@/lib/user-scope';

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
  const scope = await resolveUserScopeFromRequest(request);
  const body = await request.json();
  const scopedBody = scope && !body.user_id
    ? { ...body, user_id: scope.key }
    : body;
  const memory = body?.key
    ? await upsertUserMemoryByKey(scopedBody)
    : await createUserMemory(scopedBody);
  const syncResult = await syncMemoriesToDataki({
    user_id: memory.user_id,
    memory_ids: [memory.id],
    personal_config_scope_key: scope ? getPersonalKnowledgeScopeKey(scope) : memory.user_id,
  }).catch((error) => ({
    success: false,
    status: 'failed',
    error: error instanceof Error ? error.message : String(error),
  }));
  const syncedMemory = await getUserMemory(memory.id);
  return NextResponse.json({ ...(syncedMemory || memory), sync_result: syncResult }, { status: 201 });
}
