import { NextResponse } from 'next/server';
import { syncMemoriesToDataki } from '@/lib/dataki-memory-sync';
import { archiveUserMemory, deleteUserMemory, getUserMemory, updateUserMemory } from '@/lib/user-memory-store';
import { getPersonalKnowledgeScopeKey, resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memory = await getUserMemory(id);
  if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  return NextResponse.json(memory);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await resolveUserScopeFromRequest(request);
  const personalConfigScopeKey = scope ? getPersonalKnowledgeScopeKey(scope) : undefined;
  const { id } = await params;
  const body = await request.json();
  if (body.action === 'archive') {
    const memory = await archiveUserMemory(id);
    if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    const syncResult = await syncMemoriesToDataki({
      user_id: memory.user_id,
      memory_ids: [memory.id],
      personal_config_scope_key: personalConfigScopeKey || memory.user_id,
    }).catch((error) => ({ success: false, status: 'failed', error: error instanceof Error ? error.message : String(error) }));
    const syncedMemory = await getUserMemory(memory.id);
    return NextResponse.json({ ...(syncedMemory || memory), sync_result: syncResult });
  }
  const memory = await updateUserMemory(id, body);
  if (!memory) return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  const syncResult = await syncMemoriesToDataki({
    user_id: memory.user_id,
    memory_ids: [memory.id],
    personal_config_scope_key: personalConfigScopeKey || memory.user_id,
  }).catch((error) => ({ success: false, status: 'failed', error: error instanceof Error ? error.message : String(error) }));
  const syncedMemory = await getUserMemory(memory.id);
  return NextResponse.json({ ...(syncedMemory || memory), sync_result: syncResult });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await resolveUserScopeFromRequest(request);
  const personalConfigScopeKey = scope ? getPersonalKnowledgeScopeKey(scope) : undefined;
  const { id } = await params;
  const memory = await getUserMemory(id);
  if (memory) {
    await archiveUserMemory(id);
    await syncMemoriesToDataki({
      user_id: memory.user_id,
      memory_ids: [memory.id],
      personal_config_scope_key: personalConfigScopeKey || memory.user_id,
    }).catch(() => undefined);
  }
  const ok = await deleteUserMemory(id);
  return NextResponse.json({ success: ok });
}
