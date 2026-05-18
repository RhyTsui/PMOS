import { NextRequest, NextResponse } from 'next/server';
import { cozeLoopTracer, SpanKind } from '@cozeloop/ai';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import type { TraceConfig } from '@/lib/trace';

interface TraceTestRequestBody {
  config?: Partial<TraceConfig>;
}

function mergeConfig(base: TraceConfig, patch?: Partial<TraceConfig>): TraceConfig {
  return {
    ...base,
    ...patch,
  };
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

  try {
    cozeLoopTracer.initialize({
      apiClient: { baseURL: config.apiUrl, token: config.apiToken },
      workspaceId: config.workspaceId,
      processor: 'simple',
    });

    await cozeLoopTracer.traceable(async (span) => {
      cozeLoopTracer.setInput(span, {
        test: true,
        service_name: config.serviceName,
        env: config.env,
        project_id: config.projectId,
        app_id: config.appId,
      });
      cozeLoopTracer.setOutput(span, {
        status: 'success',
        message: 'trace test span',
      });
      return 'ok';
    }, {
      name: 'xiaoqiao.zhitou.chat',
      type: SpanKind.Tool,
    });

    cozeLoopTracer.forceFlush();

    return NextResponse.json({
      ok: true,
      latencyMs: Date.now() - startedAt,
      message: 'Trace 上报测试成功，最小 span 已发送。',
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
        message: 'Trace 上报被连弩拒绝：当前 Token 或 Workspace 没有写入权限。',
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
  }
}
