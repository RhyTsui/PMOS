import { NextResponse } from 'next/server';
import { getDemoSwitches } from '@/lib/demo-data';

export async function GET() {
  return NextResponse.json(getDemoSwitches());
}
