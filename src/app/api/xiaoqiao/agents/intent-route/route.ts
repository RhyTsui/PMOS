import { NextRequest, NextResponse } from 'next/server';
import { routeUserIntent } from '@/lib/intent-router';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    input?: string;
    message?: string;
    history?: Array<{ role: string; content: string }>;
  };

  const input = String(body.input || body.message || '').trim();
  if (!input) {
    return NextResponse.json({
      error: 'input_required',
      message: '请提供 input 或 message。',
    }, { status: 400 });
  }

  const route = routeUserIntent(input);

  return NextResponse.json({
    trace_id: `intent-route-${Date.now()}`,
    input,
    route,
    agent: route.agent,
    intent_type: route.intent_type,
    workflow_level: route.workflow_level,
    required_slots: route.required_slots,
    missing_fields: route.missing_fields,
    clarification_needed: route.clarification_needed,
    suggested_actions: route.suggested_actions,
    tracking_target: route.tracking_target || null,
    history_count: Array.isArray(body.history) ? body.history.length : 0,
  });
}
