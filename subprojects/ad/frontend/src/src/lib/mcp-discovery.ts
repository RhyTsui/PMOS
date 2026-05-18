import type { McpAuthType, McpServerConfig, McpToolConfig } from '@/types';

export interface McpDiscoveryInput {
  endpoint_url: string;
  transport?: McpServerConfig['transport'];
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

export interface McpToolCallResult {
  ok: boolean;
  msg: string;
  latency_ms: number;
  result?: unknown;
  raw_response_preview?: string;
  server_info?: Record<string, unknown>;
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

  if (input.auth_type === 'oauth2') {
    throw new Error('当前连通测试不支持直接使用 OAuth Client ID 和密钥。请先在服务方完成账号授权，再填写可访问的 Endpoint 或 Access-Token。');
  }

  if (input.auth_type === 'bearer_token' && input.auth_config?.token) {
    const normalized = normalizeBearerToken(input.auth_config.token);
    headers.Authorization = `Bearer ${normalized}`;
  } else if (input.auth_type === 'api_key' && input.auth_config?.api_key) {
    headers['X-API-Key'] = input.auth_config.api_key;
  } else if (input.auth_type === 'access_token' && input.auth_config?.access_token) {
    headers['Access-Token'] = input.auth_config.access_token;
  }
  if (input.auth_config?.tool_range) {
    headers['Tool-Range'] = input.auth_config.tool_range;
  }
  if (input.auth_config?.oceanengine_default_account) {
    headers['X-OceanEngine-Default-Account'] = input.auth_config.oceanengine_default_account;
  }

  return headers;
}

function buildSseHeaders(input: McpDiscoveryInput): Record<string, string> {
  const headers = buildHeaders(input);
  delete headers['Content-Type'];
  headers.Accept = 'text/event-stream';
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

async function resolveSseMessageEndpoint(
  endpoint: string,
  input: McpDiscoveryInput,
  timeoutMs: number,
): Promise<{ endpoint: string; rawText: string }> {
  const { controller, timer } = createTimeoutController(timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: buildSseHeaders(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`SSE HTTP ${response.status}: ${text.slice(0, 160)}`);
    }

    if (!response.body) {
      throw new Error('SSE 响应没有可读取的事件流');
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });

      const endpointEvent = parseSseEndpointEvent(buffer);
      if (endpointEvent) {
        return {
          endpoint: new URL(endpointEvent, endpoint).toString(),
          rawText: buffer.slice(0, 300),
        };
      }

      if (buffer.length > 4096) {
        buffer = buffer.slice(-2048);
      }
    }

    throw new Error('SSE 事件流未返回消息端点');
  } finally {
    clearTimeout(timer);
    await reader?.cancel().catch(() => undefined);
  }
}

function parseSseEndpointEvent(rawText: string): string | null {
  const events = rawText.split(/\n\n|\r\n\r\n/);
  for (const eventText of events) {
    const lines = eventText.split(/\r?\n/);
    const eventName = lines
      .find(line => line.startsWith('event:'))
      ?.slice(6)
      .trim();
    const data = lines
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trim())
      .join('\n')
      .trim();

    if (!data) continue;
    if (eventName === 'endpoint') return data;

    try {
      const parsed = JSON.parse(data) as { endpoint?: unknown; url?: unknown; messageEndpoint?: unknown };
      const candidate = parsed.endpoint || parsed.messageEndpoint || parsed.url;
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    } catch {
      if (/^\/|^https?:\/\//i.test(data)) return data;
    }
  }
  return null;
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
  const transport = input.transport || 'streamable-http';

  if (!input.endpoint_url) {
    return {
      ok: false,
      msg: '缺少 Endpoint URL',
      latency_ms: 0,
      tools: [],
    };
  }

  if (transport === 'stdio') {
    return {
      ok: false,
      msg: '后台连通测试暂不支持 stdio MCP，请使用 SSE 或 streamable-http。',
      latency_ms: 0,
      tools: [],
    };
  }

  const headers = buildHeaders(input);
  let rpcEndpoint = input.endpoint_url;
  let ssePreview = '';

  if (transport === 'sse') {
    try {
      const resolved = await resolveSseMessageEndpoint(input.endpoint_url, input, 8000);
      rpcEndpoint = resolved.endpoint;
      ssePreview = resolved.rawText;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        msg: message.includes('abort')
          ? 'SSE 连接超时(8s)，请检查后台填写的完整 SSE URL 是否正确。'
          : `SSE 连接失败: ${message}`,
        latency_ms: Date.now() - startTime,
        tools: [],
        raw_response_preview: ssePreview,
      };
    }
  }

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
    const initResult = await postJsonRpc(rpcEndpoint, headers, initRequest, 8000);
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

  await postNotification(rpcEndpoint, toolHeaders, {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {},
  }, 3000);

  const tools = await listAllTools(rpcEndpoint, toolHeaders, capabilities);

  return {
    ok: true,
    msg: `连接成功${serverInfo?.name ? ` - ${String(serverInfo.name)}` : ''}${serverInfo?.version ? ` v${String(serverInfo.version)}` : ''}`,
    latency_ms,
    tools,
    server_info: { ...serverInfo, transport, rpcEndpoint: transport === 'sse' ? rpcEndpoint : undefined },
    capabilities: Object.keys(capabilities),
    raw_response_preview: ssePreview || undefined,
  };
}

export async function callMcpTool(
  input: McpDiscoveryInput,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolCallResult> {
  const startTime = Date.now();
  const transport = input.transport || 'streamable-http';

  if (!input.endpoint_url) {
    return { ok: false, msg: '缺少 Endpoint URL', latency_ms: 0 };
  }
  if (transport === 'stdio') {
    return { ok: false, msg: '后台暂不支持 stdio MCP 调用，请使用 SSE 或 streamable-http。', latency_ms: 0 };
  }

  const headers = buildHeaders(input);
  let rpcEndpoint = input.endpoint_url;
  let ssePreview = '';

  if (transport === 'sse') {
    try {
      const resolved = await resolveSseMessageEndpoint(input.endpoint_url, input, 8000);
      rpcEndpoint = resolved.endpoint;
      ssePreview = resolved.rawText;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        msg: message.includes('abort') ? 'SSE 连接超时(8s)' : `SSE 连接失败: ${message}`,
        latency_ms: Date.now() - startTime,
        raw_response_preview: ssePreview,
      };
    }
  }

  try {
    const init = await postJsonRpc(rpcEndpoint, headers, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'xiaoqiao-zhitou', version: '1.0.0' },
      },
    }, 8000);

    if (!init.response.ok) {
      return {
        ok: false,
        msg: `HTTP ${init.response.status}: ${init.rawText.slice(0, 200)}`,
        latency_ms: Date.now() - startTime,
        raw_response_preview: init.rawText.slice(0, 300),
      };
    }
    if (!init.envelope) {
      return {
        ok: false,
        msg: '响应不是标准 MCP JSON-RPC 格式',
        latency_ms: Date.now() - startTime,
        raw_response_preview: init.rawText.slice(0, 300),
      };
    }
    if (init.envelope.error) {
      const message = typeof init.envelope.error === 'string'
        ? init.envelope.error
        : init.envelope.error.message || '未知 MCP 错误';
      return { ok: false, msg: `MCP 初始化失败: ${message}`, latency_ms: Date.now() - startTime };
    }

    const sessionId = init.response.headers.get(MCP_SESSION_HEADER);
    const toolHeaders = sessionId ? { ...headers, [MCP_SESSION_HEADER]: sessionId } : headers;
    await postNotification(rpcEndpoint, toolHeaders, {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    }, 3000);

    const call = await postJsonRpc(rpcEndpoint, toolHeaders, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    }, 12000);

    if (!call.response.ok) {
      return {
        ok: false,
        msg: `HTTP ${call.response.status}: ${call.rawText.slice(0, 200)}`,
        latency_ms: Date.now() - startTime,
        raw_response_preview: call.rawText.slice(0, 300),
      };
    }
    if (call.envelope?.error) {
      const message = typeof call.envelope.error === 'string'
        ? call.envelope.error
        : call.envelope.error.message || '未知 MCP 错误';
      return {
        ok: false,
        msg: `MCP 工具调用失败: ${message}`,
        latency_ms: Date.now() - startTime,
        raw_response_preview: call.rawText.slice(0, 300),
      };
    }

    return {
      ok: true,
      msg: '调用成功',
      latency_ms: Date.now() - startTime,
      result: call.envelope?.result,
      raw_response_preview: ssePreview || call.rawText.slice(0, 300),
      server_info: init.envelope.result?.serverInfo as Record<string, unknown> | undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      msg: message.includes('abort') ? '调用超时' : `网络错误: ${message}`,
      latency_ms: Date.now() - startTime,
    };
  }
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
