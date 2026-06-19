import { NextResponse } from 'next/server';
import { getIndustryIntelConfig, updateIndustryIntelConfig } from '@/lib/industry-intel-store';

export async function GET() {
  return NextResponse.json(await getIndustryIntelConfig());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const config = await updateIndustryIntelConfig(body);
  return NextResponse.json({ success: true, config });
}
