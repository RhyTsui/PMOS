import { NextResponse } from 'next/server';
import {
  DebugAutomationServiceError,
  normalizeDebugStep,
  requestDebugAutomationService,
} from '@/lib/real-debug-automation-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const steps = await requestDebugAutomationService<unknown[]>(`/tasks/${encodeURIComponent(id)}/steps`);
    return NextResponse.json(Array.isArray(steps) ? steps.map((step, index) => normalizeDebugStep(step, index, id)) : []);
  } catch (error) {
    if (error instanceof DebugAutomationServiceError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ error: 'get debug automation steps failed' }, { status: 502 });
  }
}
