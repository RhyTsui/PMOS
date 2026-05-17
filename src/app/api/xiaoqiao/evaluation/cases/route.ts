import { NextResponse } from 'next/server';

import { getEvaluationAdapterInfo, listEvaluationCases } from '@/lib/evaluation-adapter';

export async function GET() {
  const info = getEvaluationAdapterInfo();

  return NextResponse.json({
    cases: listEvaluationCases(),
    total: info.total_cases,
    adapter_version: info.adapter_version,
  });
}
