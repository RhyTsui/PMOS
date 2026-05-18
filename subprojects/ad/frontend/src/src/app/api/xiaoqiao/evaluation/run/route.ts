import { NextResponse } from 'next/server';

import { runEvaluationCase } from '@/lib/evaluation-adapter';
import type { EvaluationRunRequest } from '@/lib/evaluation-adapter';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as EvaluationRunRequest;
  const result = await runEvaluationCase(body);

  return NextResponse.json(result.response, { status: result.status });
}
