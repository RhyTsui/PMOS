import { NextResponse } from 'next/server';
import { getDemoDebugConfigs, createDemoDebugConfig } from '@/lib/demo-data';

export async function GET() {
  return NextResponse.json(getDemoDebugConfigs());
}

export async function POST(request: Request) {
  const body = await request.json();
  const config = createDemoDebugConfig(body);
  return NextResponse.json(config, { status: 201 });
}
