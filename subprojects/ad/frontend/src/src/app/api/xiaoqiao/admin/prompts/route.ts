import { NextResponse } from 'next/server';
import { createPrompt, listPrompts } from '@/lib/prompt-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const status = searchParams.get('status') || undefined;
  const prompts = await listPrompts({ category, status });
  return NextResponse.json(prompts);
}

export async function POST(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const prompt = await createPrompt(body);
  await logAdminOperation({
    context,
    module: 'prompt',
    action: 'create',
    targetType: 'prompt',
    targetId: prompt.id,
    targetName: prompt.name,
    summary: 'create prompt ' + prompt.name,
    changes: [
      describeFieldChange('status', undefined, prompt.status),
      describeFieldChange('version', undefined, prompt.current_version),
      describeFieldChange('binding', undefined, prompt.binding),
    ],
    metadata: { scope: prompt.scope, category: prompt.category || '' },
  });
  return NextResponse.json(prompt, { status: 201 });
}
