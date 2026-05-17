import { NextResponse } from 'next/server';
import { listFeatureSwitches } from '@/lib/feature-switch-store';

export async function GET() {
  return NextResponse.json(await listFeatureSwitches());
}
