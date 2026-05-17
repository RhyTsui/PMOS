import { NextResponse } from 'next/server';

import { getEvaluationAdapterInfo } from '@/lib/evaluation-adapter';

export async function GET() {
  const info = getEvaluationAdapterInfo();

  return NextResponse.json({
    service: 'zhitou-chat-evaluation-adapter',
    status: 'ok',
    version: info.adapter_version,
    capabilities: [
      'list_cases',
      'run_single_case',
      'return_answer',
      'return_process_events',
      'return_sources',
      'return_scores',
    ],
    endpoints: {
      cases: '/api/xiaoqiao/evaluation/cases',
      run: '/api/xiaoqiao/evaluation/run',
    },
    total_cases: info.total_cases,
  });
}
