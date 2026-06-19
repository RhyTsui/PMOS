import { NextResponse } from 'next/server';
import { createMcpServer, listMcpServers } from '@/lib/mcp-server-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const servers = await listMcpServers();
  const filtered = category ? servers.filter((s) => s.category === category) : servers;
  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const server = await createMcpServer(body);
  await logAdminOperation({
    context,
    module: 'mcp_server',
    action: 'create',
    targetType: 'mcp-server',
    targetId: server.id,
    targetName: server.name,
    summary: 'create mcp server ' + server.name,
    changes: [
      describeFieldChange('name', undefined, server.name),
      describeFieldChange('category', undefined, server.category),
      describeFieldChange('enabled', undefined, server.enabled),
      describeFieldChange('endpoint_url', undefined, server.endpoint_url),
      describeFieldChange('transport', undefined, server.transport),
    ],
  });
  return NextResponse.json(server, { status: 201 });
}
