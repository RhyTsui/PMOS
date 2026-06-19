import { NextResponse } from 'next/server';
import { createReportTemplate, listReportTemplates } from '@/lib/report-template-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: 'please login' }, { status: 401 });
  }
  if (!context.access.can_operate_admin && !context.access.can_view_admin) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }
  const templates = await listReportTemplates();
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: 'please login' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const template = await createReportTemplate(body);
  await logAdminOperation({
    context,
    module: 'report_template',
    action: 'create',
    targetType: 'report-template',
    targetId: template.id,
    targetName: template.name,
    summary: 'create report template ' + template.name,
    changes: [
      describeFieldChange('scene', undefined, template.scene),
      describeFieldChange('frequency', undefined, template.frequency),
      describeFieldChange('enabled', undefined, template.enabled),
      describeFieldChange('reviewRequired', undefined, template.reviewRequired),
    ],
  });
  return NextResponse.json(template, { status: 201 });
}
