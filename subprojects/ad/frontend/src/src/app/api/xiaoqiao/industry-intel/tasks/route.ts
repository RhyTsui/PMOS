import { NextResponse } from 'next/server';
import { runIndustryNewsSkill } from '@/lib/industry-intel-store';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { question?: string };
  const result = await runIndustryNewsSkill(body.question || '最近广告行业有什么变化？');
  return NextResponse.json(result, { status: result.task.status === 'failed' ? 202 : 201 });
}
