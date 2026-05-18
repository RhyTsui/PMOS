import { NextResponse } from 'next/server';
import { listMcpServers, createMcpServer } from '@/lib/mcp-server-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const servers = await listMcpServers();
  const filtered = category ? servers.filter(s => s.category === category) : servers;
  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const body = await request.json();
  const server = await createMcpServer(body);
  return NextResponse.json(server, { status: 201 });
}
