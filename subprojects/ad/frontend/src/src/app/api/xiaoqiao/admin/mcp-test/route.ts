import { NextRequest, NextResponse } from 'next/server';
import { discoverMcpServer } from '@/lib/mcp-discovery';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await discoverMcpServer({
      endpoint_url: String(body.endpoint_url || ''),
      transport: body.transport || 'streamable-http',
      auth_type: body.auth_type || 'none',
      auth_config: (body.auth_config || {}) as Record<string, string>,
    });

    return NextResponse.json({
      ...result,
      tools: result.tools.map(tool => tool.name),
      tool_count: result.tools.length,
    }, { status: result.ok ? 200 : 400 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      ok: false,
      msg: `测试失败: ${errMsg}`,
      tools: [],
      tool_count: 0,
      latency_ms: 0,
    }, { status: 500 });
  }
}
