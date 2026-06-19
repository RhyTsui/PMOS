import { NextResponse } from 'next/server';
import { syncMemoriesToDataki } from '@/lib/dataki-memory-sync';
import { getPersonalKnowledgeScopeKey, resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(request: Request) {
  const scope = await resolveUserScopeFromRequest(request);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id') || undefined;
  const result = await syncMemoriesToDataki({
    user_id: userId,
    personal_config_scope_key: scope ? getPersonalKnowledgeScopeKey(scope) : userId,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const scope = await resolveUserScopeFromRequest(request);
  const body = await request.json().catch(() => ({})) as {
    user_id?: string;
    memory_ids?: string[];
  };
  const result = await syncMemoriesToDataki({
    user_id: body.user_id,
    memory_ids: Array.isArray(body.memory_ids) ? body.memory_ids : undefined,
    personal_config_scope_key: scope ? getPersonalKnowledgeScopeKey(scope) : body.user_id,
  });
  return NextResponse.json(result);
}
