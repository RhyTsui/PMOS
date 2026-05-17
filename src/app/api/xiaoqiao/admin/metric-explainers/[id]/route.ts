import { NextResponse } from 'next/server';
import { deleteMetricExplainer, getMetricExplainer, upsertMetricExplainer } from '@/lib/metric-explainer-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const explainer = await getMetricExplainer(id);
  if (!explainer) return NextResponse.json({ error: 'Metric explainer not found' }, { status: 404 });
  return NextResponse.json(explainer);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const body = await request.json();
  const explainer = await upsertMetricExplainer({ ...body, metric_id: id });
  return NextResponse.json(explainer);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const ok = await deleteMetricExplainer(id);
  if (!ok) return NextResponse.json({ error: 'Metric explainer not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
