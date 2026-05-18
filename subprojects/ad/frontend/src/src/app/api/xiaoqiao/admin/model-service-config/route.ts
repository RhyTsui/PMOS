import { NextResponse } from 'next/server';
import { getModelServiceConfig, updateModelServiceConfig } from '@/lib/runtime-config';

export async function GET() {
  const config = await getModelServiceConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const config = await updateModelServiceConfig(body);
  return NextResponse.json({ success: true, config });
}

