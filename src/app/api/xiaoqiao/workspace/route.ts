import { NextResponse } from 'next/server';
import { getDemoWorkspace } from '@/lib/demo-data';

export async function GET() {
  return NextResponse.json(getDemoWorkspace());
}
