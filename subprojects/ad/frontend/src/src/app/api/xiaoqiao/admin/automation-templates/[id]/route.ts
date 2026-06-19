import { NextResponse } from 'next/server';
import { deleteAutomationTemplate, getAutomationTemplate, updateAutomationTemplate } from '@/lib/automation-template-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import { getUserScopeKey } from '@/lib/user-scope';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const scopeKey = getUserScopeKey(context.user);
  const { id } = await params;
  const template = await getAutomationTemplate(scopeKey, id);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  return NextResponse.json(template);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const scopeKey = getUserScopeKey(context.user);
  const { id } = await params;
  const before = await getAutomationTemplate(scopeKey, id);
  const body = await request.json();
  const template = await updateAutomationTemplate(scopeKey, id, body);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  await logAdminOperation({
    context,
    module: 'automation_template',
    action: 'update',
    targetType: 'automation-template',
    targetId: template.id,
    targetName: template.name,
    summary: 'update automation template ' + template.name,
    changes: before ? [
      describeFieldChange('name', before.name, template.name),
      describeFieldChange('template_type', before.template_type, template.template_type),
      describeFieldChange('default_frequency', before.default_frequency, template.default_frequency),
      describeFieldChange('status', before.status, template.status),
    ] : undefined,
    metadata: { scopeKey },
  });
  return NextResponse.json(template);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const scopeKey = getUserScopeKey(context.user);
  const { id } = await params;
  const before = await getAutomationTemplate(scopeKey, id);
  const success = await deleteAutomationTemplate(scopeKey, id);
  if (success && before) {
    await logAdminOperation({
      context,
      module: 'automation_template',
      action: 'delete',
      targetType: 'automation-template',
      targetId: before.id,
      targetName: before.name,
      summary: 'delete automation template ' + before.name,
      changes: [describeFieldChange('status', before.status, 'deleted')],
      metadata: { scopeKey },
    });
  }
  return NextResponse.json({ success });
}
