import { NextResponse } from 'next/server';
import { getChatDisplayConfig } from '@/lib/runtime-config';

export async function GET() {
  const config = await getChatDisplayConfig();
  return NextResponse.json({
    ...config,
    starters: config.starters.filter((item) => item.enabled),
  });
}
