import { NextResponse } from 'next/server';
import { getPrompt, updatePromptBinding } from '@/lib/prompt-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

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
  const binding = await updatePromptBinding(id, body);
  if (!binding) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }
  await logAdminOperation({
    context,
    module: 'prompt',
    action: 'binding',
    targetType: 'prompt',
    targetId: id,
    targetName: before?.name || id,
    summary: 'update binding ' + (before?.name || id),
    changes: before ? [describeFieldChange('binding', before.binding, binding)] : undefined,
    metadata: { scope: before?.scope || '' },
  });
  return NextResponse.json(binding);
}
