import { NextResponse } from 'next/server';
import { createReportDraftFromTemplate, getReportTemplate } from '@/lib/report-template-store';

export async function POST(request: Request) {
  const body = await request.json();
  const templateId = String(body.templateId || '');
  const reportDate = String(body.reportDate || '').trim();
  if (!templateId || !reportDate) {
    return NextResponse.json({ error: 'templateId and reportDate are required' }, { status: 400 });
  }

  const template = await getReportTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: 'report template not found' }, { status: 404 });
  }

  const draft = await createReportDraftFromTemplate(template, reportDate);
  return NextResponse.json(draft, { status: 201 });
}
