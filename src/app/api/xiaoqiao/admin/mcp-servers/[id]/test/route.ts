import { NextResponse } from 'next/server';
import { getMcpServer, updateMcpServer } from '@/lib/mcp-server-store';
import { discoverMcpServer } from '@/lib/mcp-discovery';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const server = await getMcpServer(id);
  if (!server) {
    return NextResponse.json({ ok: false, msg: 'MCP 服务不存在' }, { status: 404 });
  }

  const result = await discoverMcpServer({
    endpoint_url: server.endpoint_url,
    transport: server.transport,
    auth_type: server.auth_type,
    auth_config: server.auth_config,
  });

  await updateMcpServer(id, {
    status: result.ok ? 'connected' : 'error',
    latency_ms: result.latency_ms,
    last_ping_at: Date.now(),
    last_health_check_at: Date.now(),
    error_message: result.ok ? undefined : result.msg,
    tools: result.ok ? result.tools : server.tools,
  });

  return NextResponse.json({
    ...result,
    tool_count: result.tools.length,
  }, { status: result.ok ? 200 : 400 });
}
