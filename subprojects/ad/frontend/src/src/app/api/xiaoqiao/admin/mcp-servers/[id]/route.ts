import { NextResponse } from 'next/server';
import { deleteMcpServer, getMcpServer, updateMcpServer } from '@/lib/mcp-server-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const server = await getMcpServer(id);
  if (!server) return NextResponse.json({ error: 'MCP server not found' }, { status: 404 });
  return NextResponse.json(server);
}

export async function PUT(
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
  const before = await getMcpServer(id);
  const body = await request.json();
  const server = await updateMcpServer(id, body);
  if (!server) return NextResponse.json({ error: 'MCP server not found' }, { status: 404 });
  await logAdminOperation({
    context,
    module: 'mcp_server',
    action: 'update',
    targetType: 'mcp-server',
    targetId: server.id,
    targetName: server.name,
    summary: 'update mcp server ' + server.name,
    changes: before ? [
      describeFieldChange('name', before.name, server.name),
      describeFieldChange('category', before.category, server.category),
      describeFieldChange('enabled', before.enabled, server.enabled),
      describeFieldChange('endpoint_url', before.endpoint_url, server.endpoint_url),
      describeFieldChange('transport', before.transport, server.transport),
      describeFieldChange('status', before.status, server.status),
    ] : undefined,
  });
  return NextResponse.json(server);
}

export async function DELETE(
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
  const before = await getMcpServer(id);
  const ok = await deleteMcpServer(id);
  if (!ok) return NextResponse.json({ error: 'MCP server not found' }, { status: 404 });
  if (before) {
    await logAdminOperation({
      context,
      module: 'mcp_server',
      action: 'delete',
      targetType: 'mcp-server',
      targetId: before.id,
      targetName: before.name,
      summary: 'delete mcp server ' + before.name,
      changes: [describeFieldChange('status', before.status, 'deleted')],
    });
  }
  return NextResponse.json({ success: true });
}
