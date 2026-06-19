import { NextResponse } from 'next/server';
import { getMcpServer, updateMcpServer } from '@/lib/mcp-server-store';
import { discoverMcpServer } from '@/lib/mcp-discovery';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const server = await getMcpServer(id);
  if (!server) {
    return NextResponse.json({ ok: false, msg: 'MCP server not found' }, { status: 404 });
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

  await logAdminOperation({
    context,
    module: 'mcp_server',
    action: 'test',
    targetType: 'mcp-server',
    targetId: server.id,
    targetName: server.name,
    summary: 'test mcp server ' + server.name,
    changes: [
      describeFieldChange('status', server.status, result.ok ? 'connected' : 'error'),
      describeFieldChange('latency_ms', server.latency_ms, result.latency_ms),
    ],
    status: result.ok ? 'success' : 'failed',
    detail: result.ok ? 'test passed' : result.msg,
  });

  return NextResponse.json({
    ...result,
    tool_count: result.tools.length,
  }, { status: result.ok ? 200 : 400 });
}
