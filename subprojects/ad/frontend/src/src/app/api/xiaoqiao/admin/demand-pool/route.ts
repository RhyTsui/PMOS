import { NextResponse } from 'next/server';
import { listDemandPoolItems } from '@/lib/demand-pool-store';

export async function GET() {
  return NextResponse.json(await listDemandPoolItems());
}
