import type { McpAuthType, McpToolConfig } from '@/types';

export interface McpDiscoveryInput {
  endpoint_url: string;
  auth_type: McpAuthType;
  auth_config: Record<string, string>;
}

export interface McpDiscoveryResult {
  ok: boolean;
  msg: string;
  latency_ms: number;
  tools: McpToolConfig[];
  server_info?: Record<string, unknown>;
  capabilities?: string[];
  raw_response_preview?: string;
}

interface JsonRpcEnvelope {
  jsonrpc?: string;
  id?: string | number | null;
  result?: Record<string, unknown>;
  error?: { code?: number; message?: string; data?: unknown } | string;
}

const MCP_SESSION_HEADER = 'mcp-session-id';

function normalizeBearerToken(raw: string): string {
  return raw
    .replace(/^Authorization\s*[:=]\s*Bearer\s+/i, '')
    .replace(/^Bearer\s+/i, '')
    .trim();
}

function buildHeaders(input: McpDiscoveryInput): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };

  if (input.auth_type === 'bearer_token' && input.auth_config?.token) {
    const normalized = normalizeBearerToken(input.auth_config.token);
    headers.Authorization = `Bearer ${normalized}`;
  } else if (input.auth_type === 'api_key' && input.auth_config?.api_key) {
    headers['X-API-Key'] = input.auth_config.api_key;
  }

  return headers;
}

function createTimeoutController(timeoutMs: number): { controller: AbortController; timer: NodeJS.Timeout } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

async function postJsonRpc(
  endpoint: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ response: Response; envelope: JsonRpcEnvelope | null; rawText: string }> {
  const { controller, timer } = createTimeoutController(timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const rawText = await response.text();
    const envelope = parseJsonRpcResponse(rawText);
    return { response, envelope, rawText };
  } finally {
    clearTimeout(timer);
  }
}

async function postNotification(
  endpoint: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<void> {
  const { controller, timer } = createTimeoutController(timeoutMs);
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    // best effort only
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonRpcResponse(rawText: string): JsonRpcEnvelope | null {
  try {
    return JSON.parse(rawText) as JsonRpcEnvelope;
  } catch {
    const lines = rawText.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      try {
        return JSON.parse(line.slice(5).trim()) as JsonRpcEnvelope;
      } catch {
        continue;
      }
    }
  }
  return null;
}

function normalizeTool(tool: Record<string, unknown>, index: number): McpToolConfig {
  return {
    tool_id: String(tool.name || `tool-${index}`),
    name: String(tool.name || `tool-${index}`),
    description: String(tool.description || ''),
    input_schema: (tool.inputSchema as Record<string, unknown>) || (tool.input_schema as Record<string, unknown>) || {},
    enabled: true,
    bound_agents: [],
    access_mode: 'read',
    call_count: 0,
  };
}

function readStringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function pickCursor(source?: Record<string, unknown>): string | undefined {
  if (!source) return undefined;
  return (
    readStringField(source.nextCursor) ||
    readStringField(source.cursor) ||
    readStringField(source.next_cursor) ||
    readStringField(source.pageToken) ||
    readStringField(source.nextPageToken) ||
    readStringField(source.next_page_token)
  );
}

function extractNextCursor(resultBody: Record<string, unknown>): string | undefined {
  const direct = pickCursor(resultBody);
  if (direct) return direct;

  const nestedCandidates = [
    resultBody.tools,
    resultBody.data,
    resultBody.meta,
    resultBody.pagination,
    resultBody.page,
  ];

  for (const candidate of nestedCandidates) {
    if (candidate && typeof candidate === 'object') {
      const nested = pickCursor(candidate as Record<string, unknown>);
      if (nested) return nested;
    }
  }

  return undefined;
}

function extractRawTools(resultBody: Record<string, unknown>): unknown[] {
  const directCandidates = [
    resultBody.tools,
    resultBody.items,
    resultBody.list,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
    if (candidate && typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      if (Array.isArray(record.items)) return record.items;
      if (Array.isArray(record.tools)) return record.tools;
      if (Array.isArray(record.list)) return record.list;
      if (Array.isArray(record.data)) return record.data;
    }
  }

  const nestedCandidates = [
    resultBody.data,
    resultBody.result,
    resultBody.meta,
  ];

  for (const candidate of nestedCandidates) {
    if (candidate && typeof candidate === 'object') {
      const nested = extractRawTools(candidate as Record<string, unknown>);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

export async function discoverMcpServer(input: McpDiscoveryInput): Promise<McpDiscoveryResult> {
  const startTime = Date.now();

  if (!input.endpoint_url) {
    return {
      ok: false,
      msg: '缺少 Endpoint URL',
      latency_ms: 0,
      tools: [],
    };
  }

  const headers = buildHeaders(input);
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'xiaoqiao-zhitou',
        version: '1.0.0',
      },
    },
  };

  let initResponse: Response;
  let initEnvelope: JsonRpcEnvelope | null;
  let initText = '';

  try {
    const initResult = await postJsonRpc(input.endpoint_url, headers, initRequest, 8000);
    initResponse = initResult.response;
    initEnvelope = initResult.envelope;
    initText = initResult.rawText;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      msg: message.includes('abort')
        ? '连接超时(8s)，请检查服务地址是否正确且可达'
        : `网络错误: ${message}`,
      latency_ms: Date.now() - startTime,
      tools: [],
    };
  }

  const latency_ms = Date.now() - startTime;
  if (!initResponse.ok) {
    return {
      ok: false,
      msg: `HTTP ${initResponse.status}: ${initText.slice(0, 200)}`,
      latency_ms,
      tools: [],
    };
  }

  if (!initEnvelope) {
    return {
      ok: true,
      msg: `端点可达(HTTP ${initResponse.status})，但响应不是标准 MCP 格式`,
      latency_ms,
      tools: [],
      raw_response_preview: initText.slice(0, 300),
    };
  }

  if (initEnvelope.error) {
    const message = typeof initEnvelope.error === 'string'
      ? initEnvelope.error
      : initEnvelope.error.message || '未知 MCP 错误';
    return {
      ok: false,
      msg: `MCP 错误: ${message}`,
      latency_ms,
      tools: [],
    };
  }

  const initResult = initEnvelope.result || {};
  const capabilities = (initResult.capabilities || {}) as Record<string, unknown>;
  const serverInfo = (initResult.serverInfo || {}) as Record<string, unknown>;
  const sessionId = initResponse.headers.get(MCP_SESSION_HEADER);
  const toolHeaders = sessionId ? { ...headers, [MCP_SESSION_HEADER]: sessionId } : headers;

  await postNotification(input.endpoint_url, toolHeaders, {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {},
  }, 3000);

  const tools = await listAllTools(input.endpoint_url, toolHeaders, capabilities);

  return {
    ok: true,
    msg: `连接成功${serverInfo?.name ? ` - ${String(serverInfo.name)}` : ''}${serverInfo?.version ? ` v${String(serverInfo.version)}` : ''}`,
    latency_ms,
    tools,
    server_info: serverInfo,
    capabilities: Object.keys(capabilities),
  };
}

async function listAllTools(
  endpoint: string,
  headers: Record<string, string>,
  _capabilities: Record<string, unknown>,
): Promise<McpToolConfig[]> {
  const tools: McpToolConfig[] = [];
  let cursor: string | undefined;
  let requestId = 2;

  for (;;) {
    const requestPayload = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'tools/list',
      params: cursor ? { cursor } : {},
    };

    let response: Response;
    let envelope: JsonRpcEnvelope | null;
    try {
      const result = await postJsonRpc(endpoint, headers, requestPayload, 6000);
      response = result.response;
      envelope = result.envelope;
    } catch {
      break;
    }

    if (!response.ok || !envelope?.result) break;
    const resultBody = envelope.result;
    const rawTools = extractRawTools(resultBody);

    const batch = rawTools.map((tool, index) => normalizeTool(tool as Record<string, unknown>, tools.length + index));

    for (const tool of batch) {
      if (!tools.some(existing => existing.name === tool.name)) {
        tools.push(tool);
      }
    }

    const nextCursor = extractNextCursor(resultBody);

    if (!nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
  }

  if (tools.length > 0) {
    return tools;
  }

  try {
    const retry = await postJsonRpc(endpoint, headers, {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'tools/list',
      params: { cursor: '', pageToken: '' },
    }, 6000);

    const retryResult = retry.envelope?.result || {};
    const retryTools = extractRawTools(retryResult);

    return retryTools.map((tool, index) => normalizeTool(tool as Record<string, unknown>, index));
  } catch {
    // ignore retry failure
  }

  return tools;
}
