import { NextResponse } from 'next/server';
import { listMetricExplainers, upsertMetricExplainer } from '@/lib/metric-explainer-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim().toLowerCase();
  const explainers = await listMetricExplainers();
  const filtered = q
    ? explainers.filter(item => `${item.metric_id || ''} ${item.metric_name || ''} ${item.summary || ''}`.toLowerCase().includes(q))
    : explainers;
  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const body = await request.json();
  const explainer = await upsertMetricExplainer(body);
  return NextResponse.json(explainer, { status: 201 });
}
