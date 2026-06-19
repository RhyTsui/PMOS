import { NextResponse } from 'next/server';
import {
  DebugAutomationServiceError,
  normalizeDebugTask,
  requestDebugAutomationService,
} from '@/lib/real-debug-automation-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const task = await requestDebugAutomationService(`/tasks/${encodeURIComponent(id)}`);
    return NextResponse.json(normalizeDebugTask(task));
  } catch (error) {
    if (error instanceof DebugAutomationServiceError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ error: 'get debug automation task failed' }, { status: 502 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await requestDebugAutomationService(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DebugAutomationServiceError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ error: 'delete debug automation task failed' }, { status: 502 });
  }
}
