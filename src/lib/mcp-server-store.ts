import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { McpServerConfig } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const MCP_SERVERS_PATH = path.join(DATA_DIR, 'mcp-servers.json');

interface McpServersFile {
  servers: McpServerConfig[];
}

function nowTs(): number {
  return Date.now();
}

function normalizeServer(input: Partial<McpServerConfig>): McpServerConfig {
  return {
    id: input.id || `mcp-${nowTs()}`,
    name: input.name?.trim() || '未命名 MCP 服务',
    description: input.description?.trim() || '',
    category: input.category || 'data',
    endpoint_url: input.endpoint_url?.trim() || '',
    transport: input.transport || 'streamable-http',
    auth_type: input.auth_type || 'none',
    auth_config: input.auth_config || {},
    status: input.status || 'disconnected',
    tools: Array.isArray(input.tools) ? input.tools : [],
    enabled: input.enabled ?? true,
    business_domains: Array.isArray(input.business_domains) ? input.business_domains : [],
    bound_agents: Array.isArray(input.bound_agents) ? input.bound_agents : [],
    tags: Array.isArray(input.tags) ? input.tags : [],
    health_check_url: input.health_check_url?.trim() || undefined,
    last_health_check_at: input.last_health_check_at,
    last_ping_at: input.last_ping_at,
    latency_ms: input.latency_ms,
    error_message: input.error_message,
    created_at: input.created_at || nowTs(),
    updated_at: input.updated_at || nowTs(),
  };
}

async function readMcpServersFile(): Promise<McpServersFile> {
  try {
    const raw = await readFile(MCP_SERVERS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<McpServersFile>;
    const servers = Array.isArray(parsed.servers) ? parsed.servers.map(normalizeServer) : [];
    return { servers };
  } catch {
    return { servers: [] };
  }
}

async function writeMcpServersFile(file: McpServersFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(MCP_SERVERS_PATH, JSON.stringify(file, null, 2), 'utf8');
}

export async function listMcpServers(): Promise<McpServerConfig[]> {
  const file = await readMcpServersFile();
  return file.servers.sort((a, b) => b.updated_at - a.updated_at);
}

export async function getMcpServer(id: string): Promise<McpServerConfig | undefined> {
  const servers = await listMcpServers();
  return servers.find(server => server.id === id);
}

export async function createMcpServer(data: Partial<McpServerConfig>): Promise<McpServerConfig> {
  const file = await readMcpServersFile();
  const next = normalizeServer({
    ...data,
    id: data.id || `mcp-${nowTs()}`,
    created_at: nowTs(),
    updated_at: nowTs(),
  });
  file.servers = [...file.servers, next];
  await writeMcpServersFile(file);
  return next;
}

export async function updateMcpServer(
  id: string,
  patch: Partial<McpServerConfig>,
): Promise<McpServerConfig | undefined> {
  const file = await readMcpServersFile();
  const current = file.servers.find(server => server.id === id);
  if (!current) return undefined;

  const next = normalizeServer({
    ...current,
    ...patch,
    id,
    created_at: current.created_at,
    updated_at: nowTs(),
  });
  file.servers = file.servers.map(server => (server.id === id ? next : server));
  await writeMcpServersFile(file);
  return next;
}

export async function deleteMcpServer(id: string): Promise<boolean> {
  const file = await readMcpServersFile();
  const before = file.servers.length;
  file.servers = file.servers.filter(server => server.id !== id);
  if (file.servers.length === before) return false;
  await writeMcpServersFile(file);
  return true;
}
