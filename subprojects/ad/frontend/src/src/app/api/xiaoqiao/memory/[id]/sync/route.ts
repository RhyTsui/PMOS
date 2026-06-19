import { NextResponse } from 'next/server';
import { syncMemoriesToDataki } from '@/lib/dataki-memory-sync';
import { getUserMemory } from '@/lib/user-memory-store';
import { getPersonalKnowledgeScopeKey, resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await resolveUserScopeFromRequest(request);
  const { id } = await params;
  const memory = await getUserMemory(id);
  if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  const result = await syncMemoriesToDataki({
    user_id: memory.user_id,
    memory_ids: [memory.id],
    personal_config_scope_key: scope ? getPersonalKnowledgeScopeKey(scope) : memory.user_id,
  });
  return NextResponse.json(result);
}
