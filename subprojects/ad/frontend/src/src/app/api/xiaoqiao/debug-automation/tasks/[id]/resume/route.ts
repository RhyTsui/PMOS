import { NextResponse } from 'next/server';
import {
  DebugAutomationServiceError,
  ensureRealDebugAutomationMode,
  normalizeDebugTask,
  requestDebugAutomationService,
} from '@/lib/real-debug-automation-service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await ensureRealDebugAutomationMode();
    const task = await requestDebugAutomationService(`/tasks/${encodeURIComponent(id)}/start`, { method: 'POST' });
    return NextResponse.json(normalizeDebugTask(task));
  } catch (error) {
    if (error instanceof DebugAutomationServiceError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ error: 'resume debug automation task failed' }, { status: 502 });
  }
}
