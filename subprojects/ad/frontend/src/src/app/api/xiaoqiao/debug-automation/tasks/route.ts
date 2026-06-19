import { NextResponse } from 'next/server';
import {
  buildRealDebugCreatePayload,
  DebugAutomationServiceError,
  ensureRealDebugAutomationMode,
  normalizeDebugTask,
  requestDebugAutomationService,
} from '@/lib/real-debug-automation-service';

export async function GET() {
  try {
    const tasks = await requestDebugAutomationService<unknown[]>('/tasks');
    return NextResponse.json(Array.isArray(tasks) ? tasks.map(normalizeDebugTask) : []);
  } catch (error) {
    if (error instanceof DebugAutomationServiceError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ error: 'debug automation service unavailable' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    await ensureRealDebugAutomationMode();
    const task = await requestDebugAutomationService('/tasks', {
      method: 'POST',
      body: JSON.stringify(buildRealDebugCreatePayload(body)),
    });
    return NextResponse.json(normalizeDebugTask(task), { status: 201 });
  } catch (error) {
    if (error instanceof DebugAutomationServiceError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ error: 'create debug automation task failed' }, { status: 502 });
  }
}
