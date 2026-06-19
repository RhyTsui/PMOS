import { NextResponse } from 'next/server';
import { getPrompt, updatePrompt } from '@/lib/prompt-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const prompt = await getPrompt(id);
  if (!prompt) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  return NextResponse.json(prompt);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const before = await getPrompt(id);
  const body = await request.json();
  const prompt = await updatePrompt(id, body);
  if (!prompt) return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  const changes: string[] = [];
  if (before) {
    changes.push(
      describeFieldChange('name', before.name, prompt.name),
      describeFieldChange('scope', before.scope, prompt.scope),
      describeFieldChange('status', before.status, prompt.status),
      describeFieldChange('version', before.current_version, prompt.current_version),
      describeFieldChange('binding', JSON.stringify(before.binding), JSON.stringify(prompt.binding)),
    );
  }
  if (typeof body.content === 'string' && body.content.trim()) {
    changes.push('content updated');
  }
  if (typeof body.change_note === 'string' && body.change_note.trim()) {
    changes.push(`note: ${body.change_note.trim()}`);
  }
  await logAdminOperation({
    context,
    module: 'prompt',
    action: 'update',
    targetType: 'prompt',
    targetId: prompt.id,
    targetName: prompt.name,
    summary: 'update prompt ' + prompt.name,
    changes,
    metadata: { scope: prompt.scope, version: prompt.current_version },
  });
  return NextResponse.json(prompt);
}
