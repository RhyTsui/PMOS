import { NextResponse } from 'next/server';
import { getProjectServiceConfig, updateProjectServiceConfig } from '@/lib/runtime-config';

export async function GET() {
  const config = await getProjectServiceConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const config = await updateProjectServiceConfig(body);
  return NextResponse.json({ success: true, config });
}
