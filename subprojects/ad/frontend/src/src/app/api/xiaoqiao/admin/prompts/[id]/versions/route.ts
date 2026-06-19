import { NextResponse } from 'next/server';
import { getPrompt, listPromptVersions, rollbackPrompt } from '@/lib/prompt-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(await listPromptVersions(id));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { version?: number };
  const version = Number(body.version);
  if (!Number.isInteger(version) || version < 1) {
    return NextResponse.json({ error: 'invalid version' }, { status: 400 });
  }
  const versions = await listPromptVersions(id);
  const before = versions.find((item) => item.version === version);
  const current = await getPrompt(id);
  if (!before) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }
  const prompt = await rollbackPrompt(id, version);
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }
  await logAdminOperation({
    context,
    module: 'prompt',
    action: 'rollback',
    targetType: 'prompt',
    targetId: id,
    targetName: id,
    summary: `rollback prompt version ${version}`,
    changes: [
      describeFieldChange('current_version', current?.current_version, version),
      `rollback to version ${version}`,
    ],
    metadata: { version },
  });
  return NextResponse.json({ prompt, version });
}
