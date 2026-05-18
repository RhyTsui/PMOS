import { NextResponse } from 'next/server';
import { getReportDraft, updateReportDraft } from '@/lib/report-template-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const draft = await getReportDraft(id);
  if (!draft) {
    return NextResponse.json({ error: 'report draft not found' }, { status: 404 });
  }
  return NextResponse.json(draft);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const draft = await updateReportDraft(id, body);
  if (!draft) {
    return NextResponse.json({ error: 'report draft not found' }, { status: 404 });
  }
  return NextResponse.json(draft);
}
