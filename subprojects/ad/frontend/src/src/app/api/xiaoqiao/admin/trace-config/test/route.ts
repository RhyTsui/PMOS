import { NextRequest, NextResponse } from 'next/server';
import { cozeLoopTracer } from '@cozeloop/ai';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import { buildChatTraceInput, buildStandardTraceInput, buildStandardTraceTags, flushTrace, resetTraceState, type TraceConfig } from '@/lib/trace';

interface TraceTestRequestBody {
  config?: Partial<TraceConfig>;
}

function mergeConfig(base: TraceConfig, patch?: Partial<TraceConfig>): TraceConfig {
  return { ...base, ...patch };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as TraceTestRequestBody;
  const config = mergeConfig(getTraceConfigSync(), body.config);

  if (!config.apiUrl || !config.workspaceId || !config.apiToken) {
    return NextResponse.json({
      ok: false,
      message: '请补齐 Trace API 地址、Workspace ID 和 API Token 后再测试。',
    }, { status: 400 });
  }

  const startedAt = Date.now();
  const localTraceId = `trace-test-${Date.now()}`;
  let sdkTraceId = '';

  try {
    cozeLoopTracer.initialize({
      apiClient: { baseURL: config.apiUrl, token: config.apiToken },
      workspaceId: config.workspaceId,
      processor: 'simple',
    });

    await cozeLoopTracer.traceable(async (span) => {
      sdkTraceId = span.spanContext().traceId;
      const input = buildStandardTraceInput(buildChatTraceInput('trace test', {
        trace_id: sdkTraceId,
        sdk_trace_id: sdkTraceId,
        local_trace_id: localTraceId,
        conversation_id: localTraceId,
        agent_id: 'agent_trace_test',
      }), {
        trace_id: sdkTraceId,
        sdk_trace_id: sdkTraceId,
        local_trace_id: localTraceId,
        conversation_id: localTraceId,
        workflow_name: 'trace_config_test',
      });
      cozeLoopTracer.setInput(span, input);
      cozeLoopTracer.setTags(span, buildStandardTraceTags({
        trace_id: sdkTraceId,
        sdk_trace_id: sdkTraceId,
        local_trace_id: localTraceId,
        conversation_id: localTraceId,
        workflow_name: 'trace_config_test',
        span_name: 'trace-config.test',
        span_type: 'custom',
      }));
      cozeLoopTracer.setOutput(span, {
        status: 'success',
        message: 'trace test span',
      });
    }, {
      name: 'trace-config.test',
      type: 'custom',
    });

    await flushTrace();

    return NextResponse.json({
      ok: true,
      latencyMs: Date.now() - startedAt,
      message: 'Trace 上报测试成功，标准参数已写入。',
      trace_id: sdkTraceId || localTraceId,
      sdk_trace_id: sdkTraceId || localTraceId,
      local_trace_id: localTraceId,
    });
  } catch (error: unknown) {
    const latencyMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    const detail = (error as { _detail?: { result?: { code?: number; msg?: string } } })?._detail?.result;

    if (detail?.code === 600900101) {
      return NextResponse.json({
        ok: false,
        latencyMs,
        code: detail.code,
        message: 'Trace 上报被拒绝：当前 Token 或 Workspace 没有写入权限。',
      }, { status: 403 });
    }

    if (detail?.code === 600904002) {
      return NextResponse.json({
        ok: false,
        latencyMs,
        code: detail.code,
        message: 'Trace 上报失败：当前导出的 span 为空，请继续检查 SDK 链路。',
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: false,
      latencyMs,
      message: `Trace 上报失败：${detail?.msg || message}`,
    }, { status: 500 });
  } finally {
    try {
      cozeLoopTracer.shutdown();
    } catch {
      // ignore shutdown errors in test mode
    }
    resetTraceState();
  }
}
