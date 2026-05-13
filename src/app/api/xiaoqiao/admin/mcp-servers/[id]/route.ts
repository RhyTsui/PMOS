import { NextResponse } from 'next/server';
import { getMcpServer, updateMcpServer, deleteMcpServer } from '@/lib/mcp-server-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const server = await getMcpServer(id);
  if (!server) return NextResponse.json({ error: 'MCP server not found' }, { status: 404 });
  return NextResponse.json(server);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const server = await updateMcpServer(id, body);
  if (!server) return NextResponse.json({ error: 'MCP server not found' }, { status: 404 });
  return NextResponse.json(server);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteMcpServer(id);
  if (!ok) return NextResponse.json({ error: 'MCP server not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
