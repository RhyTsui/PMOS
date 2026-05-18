import { NextResponse } from 'next/server';
import {
  deleteReportTemplate,
  getReportTemplate,
  updateReportTemplate,
} from '@/lib/report-template-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const template = await getReportTemplate(id);
  if (!template) {
    return NextResponse.json({ error: 'report template not found' }, { status: 404 });
  }
  return NextResponse.json(template);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const template = await updateReportTemplate(id, body);
  if (!template) {
    return NextResponse.json({ error: 'report template not found' }, { status: 404 });
  }
  return NextResponse.json(template);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteReportTemplate(id);
  if (!ok) {
    return NextResponse.json({ error: 'report template not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
