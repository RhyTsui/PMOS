import { NextResponse } from 'next/server';
import { getDemoDemandPool } from '@/lib/demo-data';

export async function GET() {
  return NextResponse.json(getDemoDemandPool());
}
