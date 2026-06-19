import { NextResponse } from 'next/server';
import { createAutomationTemplate, listAutomationTemplates } from '@/lib/automation-template-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import { getUserScopeKey } from '@/lib/user-scope';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const scopeKey = getUserScopeKey(context.user);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const templateType = searchParams.get('template_type');
  return NextResponse.json(
    await listAutomationTemplates(scopeKey, {
      status: status || undefined,
      template_type: templateType || undefined,
    }),
  );
}

export async function POST(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const scopeKey = getUserScopeKey(context.user);
  const body = await request.json();
  const template = await createAutomationTemplate(scopeKey, {
    ...body,
    created_by: context.user.user_name || context.user.account,
  });
  await logAdminOperation({
    context,
    module: 'automation_template',
    action: 'create',
    targetType: 'automation-template',
    targetId: template.id,
    targetName: template.name,
    summary: 'create automation template ' + template.name,
    changes: [
      describeFieldChange('template_type', undefined, template.template_type),
      describeFieldChange('default_frequency', undefined, template.default_frequency),
      describeFieldChange('status', undefined, template.status),
    ],
    metadata: { scopeKey },
  });
  return NextResponse.json(template, { status: 201 });
}
