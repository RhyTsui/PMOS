import { NextResponse } from 'next/server';
import { createReportTemplate, listReportTemplates } from '@/lib/report-template-store';

export async function GET() {
  const templates = await listReportTemplates();
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const body = await request.json();
  const template = await createReportTemplate(body);
  return NextResponse.json(template, { status: 201 });
}
