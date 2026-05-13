import { NextResponse } from 'next/server';
import { listReportDrafts } from '@/lib/report-template-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('templateId') || undefined;
  const drafts = await listReportDrafts(templateId);
  return NextResponse.json(drafts);
}
