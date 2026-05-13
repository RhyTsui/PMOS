import { NextResponse } from 'next/server';
import { getTraceConfigSync, updateTraceConfig } from '@/lib/trace-config-store';

export async function GET() {
  return NextResponse.json(getTraceConfigSync());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const config = await updateTraceConfig(body);
  console.log('[TraceConfig] Update:', config);
  return NextResponse.json({ success: true, config });
}
