import { NextResponse } from 'next/server';
import { deleteReportTemplate, getReportTemplate, updateReportTemplate } from '@/lib/report-template-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: 'please login' }, { status: 401 });
  }
  if (!context.access.can_operate_admin && !context.access.can_view_admin) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const template = await getReportTemplate(id);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  return NextResponse.json(template);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: 'please login' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const before = await getReportTemplate(id);
  const body = await request.json();
  const template = await updateReportTemplate(id, body);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  await logAdminOperation({
    context,
    module: 'report_template',
    action: 'update',
    targetType: 'report-template',
    targetId: template.id,
    targetName: template.name,
    summary: 'update report template ' + template.name,
    changes: before ? [
      describeFieldChange('name', before.name, template.name),
      describeFieldChange('scene', before.scene, template.scene),
      describeFieldChange('frequency', before.frequency, template.frequency),
      describeFieldChange('enabled', before.enabled, template.enabled),
      describeFieldChange('reviewRequired', before.reviewRequired, template.reviewRequired),
    ] : undefined,
  });
  return NextResponse.json(template);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: 'please login' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const before = await getReportTemplate(id);
  const success = await deleteReportTemplate(id);
  if (success && before) {
    await logAdminOperation({
      context,
      module: 'report_template',
      action: 'delete',
      targetType: 'report-template',
      targetId: before.id,
      targetName: before.name,
      summary: 'delete report template ' + before.name,
      changes: [describeFieldChange('enabled', before.enabled, false)],
    });
  }
  return NextResponse.json({ success });
}
