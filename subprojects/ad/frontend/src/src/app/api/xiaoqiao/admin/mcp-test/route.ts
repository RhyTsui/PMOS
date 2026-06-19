import { NextRequest, NextResponse } from 'next/server';
import { discoverMcpServer } from '@/lib/mcp-discovery';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function POST(request: NextRequest) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = await discoverMcpServer({
      endpoint_url: String(body.endpoint_url || ''),
      transport: body.transport || 'streamable-http',
      auth_type: body.auth_type || 'none',
      auth_config: (body.auth_config || {}) as Record<string, string>,
    });

    await logAdminOperation({
      context,
      module: 'mcp_server',
      action: 'test',
      targetType: 'mcp-test',
      targetName: String(body.endpoint_url || ''),
      summary: 'test mcp endpoint ' + String(body.endpoint_url || ''),
      changes: [
        describeFieldChange('endpoint_url', undefined, String(body.endpoint_url || '')),
        describeFieldChange('transport', undefined, body.transport || 'streamable-http'),
        describeFieldChange('auth_type', undefined, body.auth_type || 'none'),
      ],
      status: result.ok ? 'success' : 'failed',
      detail: result.ok ? 'test passed' : result.msg,
    });

    return NextResponse.json({
      ...result,
      tools: result.tools.map((tool) => tool.name),
      tool_count: result.tools.length,
    }, { status: result.ok ? 200 : 400 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    await logAdminOperation({
      context,
      module: 'mcp_server',
      action: 'test',
      targetType: 'mcp-test',
      targetName: String(request.url),
      summary: 'test mcp endpoint failed',
      status: 'failed',
      detail: errMsg,
    });
    return NextResponse.json({
      ok: false,
      msg: `test failed: ${errMsg}`,
      tools: [],
      tool_count: 0,
      latency_ms: 0,
    }, { status: 500 });
  }
}
