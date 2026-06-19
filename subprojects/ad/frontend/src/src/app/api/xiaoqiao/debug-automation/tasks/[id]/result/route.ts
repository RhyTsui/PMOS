import { NextResponse } from 'next/server';
import {
  DebugAutomationServiceError,
  normalizeDebugResult,
  requestDebugAutomationService,
} from '@/lib/real-debug-automation-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [task, result] = await Promise.all([
      requestDebugAutomationService(`/tasks/${encodeURIComponent(id)}`).catch(() => null),
      requestDebugAutomationService(`/tasks/${encodeURIComponent(id)}/result`),
    ]);
    return NextResponse.json(normalizeDebugResult(result, id, task));
  } catch (error) {
    if (error instanceof DebugAutomationServiceError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ error: 'get debug automation result failed' }, { status: 502 });
  }
}
