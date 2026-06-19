import { NextResponse } from 'next/server';
import {
  buildRealDebugCreatePayload,
  DebugAutomationServiceError,
  ensureRealDebugAutomationMode,
  normalizeDebugTask,
  requestDebugAutomationService,
} from '@/lib/real-debug-automation-service';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const createPayload = buildRealDebugCreatePayload(body);

    await ensureRealDebugAutomationMode();
    const createdTask = await requestDebugAutomationService(`/tasks`, {
      method: 'POST',
      body: JSON.stringify(createPayload),
    });

    const taskId = createPayload.task_id;
    const startedTask = await requestDebugAutomationService(`/tasks/${encodeURIComponent(taskId)}/start`, {
      method: 'POST',
    }).catch(error => {
      if (error instanceof DebugAutomationServiceError && error.status === 409) return createdTask;
      throw error;
    });

    const [steps, result] = await Promise.all([
      requestDebugAutomationService(`/tasks/${encodeURIComponent(taskId)}/steps`).catch(() => []),
      requestDebugAutomationService(`/tasks/${encodeURIComponent(taskId)}/result`).catch(() => null),
    ]);

    return NextResponse.json({
      ok: true,
      status: 'started',
      message: '自动联调已按关闭 Mock 的真实模式发起。',
      server: 'pre-xiaoqiao-debug-automation',
      tool: 'debug-automation-service',
      result: {
        task_id: taskId,
        create_result: normalizeDebugTask(createdTask),
        start_result: normalizeDebugTask(startedTask),
        steps_result: steps,
        result_summary: result,
        observation_errors: [],
      },
    });
  } catch (error) {
    if (error instanceof DebugAutomationServiceError) {
      return NextResponse.json({
        ok: false,
        status: 'debug_service_call_failed',
        message: typeof error.body === 'string' ? error.body : JSON.stringify(error.body),
      }, { status: error.status });
    }
    return NextResponse.json({
      ok: false,
      status: 'debug_service_unavailable',
      message: '自动联调服务不可用',
    }, { status: 502 });
  }
}
