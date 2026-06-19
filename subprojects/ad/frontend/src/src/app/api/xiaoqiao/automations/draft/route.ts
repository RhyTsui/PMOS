import { NextRequest, NextResponse } from 'next/server';
import { buildAutomationDraftSuggestion } from '@/lib/automation-draft-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function POST(request: NextRequest) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const draft = await buildAutomationDraftSuggestion({
    scopeKey: scope.key,
    conversationId: typeof body?.conversation_id === 'string' ? body.conversation_id : undefined,
    attachmentIds: Array.isArray(body?.attachment_ids) ? body.attachment_ids.map((item: unknown) => String(item)) : [],
    message: typeof body?.message === 'string' ? body.message : '',
    templateId: typeof body?.template_id === 'string' ? body.template_id : undefined,
  });
  return NextResponse.json(draft);
}
