import { NextResponse } from 'next/server';
import { updateFeatureSwitch } from '@/lib/feature-switch-store';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const body = await request.json();
  const sw = await updateFeatureSwitch(key, body);
  if (!sw) return NextResponse.json({ error: 'Switch not found' }, { status: 404 });
  return NextResponse.json(sw);
}
