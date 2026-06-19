import { NextResponse } from 'next/server';
import { createConversation, listConversations } from '@/lib/conversation-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';
import type { ProjectBinding } from '@/types';

function readProjectBinding(body: Record<string, unknown>): ProjectBinding | undefined {
  const value = body.project_binding;
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const projectRefs = Array.isArray(record.project_refs) ? record.project_refs.map((item) => String(item).trim()).filter(Boolean) : [];
  if (!projectRefs.length) return undefined;
  return {
    project_refs: projectRefs,
    default_project_ref: typeof record.default_project_ref === 'string' ? record.default_project_ref.trim() || undefined : undefined,
    last_active_project_ref: typeof record.last_active_project_ref === 'string' ? record.last_active_project_ref.trim() || undefined : undefined,
    source_project_refs: Array.isArray(record.source_project_refs) ? record.source_project_refs.map((item) => String(item).trim()).filter(Boolean) : undefined,
  };
}

export async function GET(request: Request) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || searchParams.get('page_size') || undefined;
  const cursor = searchParams.get('cursor') || undefined;
  const projectRefs = searchParams.get('project_refs')?.split(',').map((item) => item.trim()).filter(Boolean) || [];
  return NextResponse.json(await listConversations(scope.key, {
    limit: limit ? Number(limit) : undefined,
    cursor,
    project_refs: projectRefs,
  }));
}

export async function POST(request: Request) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const conv = await createConversation(scope.key, { title: body.title, project_binding: readProjectBinding(body) });
  return NextResponse.json(conv, { status: 201 });
}
