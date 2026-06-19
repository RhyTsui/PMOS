import { NextResponse } from 'next/server';
import { listIndustryArticles } from '@/lib/industry-intel-store';

export async function GET() {
  return NextResponse.json(await listIndustryArticles());
}
