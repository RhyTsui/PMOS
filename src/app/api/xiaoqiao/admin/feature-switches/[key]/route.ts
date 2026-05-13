import { NextResponse } from 'next/server';
import { updateDemoSwitch } from '@/lib/demo-data';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const body = await request.json();
  const sw = updateDemoSwitch(key, body);
  if (!sw) return NextResponse.json({ error: 'Switch not found' }, { status: 404 });
  return NextResponse.json(sw);
}
