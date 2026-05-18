import { NextResponse } from 'next/server';
import { callMcpTool } from '@/lib/mcp-discovery';
import { listMcpServers } from '@/lib/mcp-server-store';

function findDebugAutomationServer(servers: Awaited<ReturnType<typeof listMcpServers>>) {
  return servers.find(server => (
    server.enabled &&
    Boolean(server.endpoint_url) &&
    (
      /自动联调|debug.*automation|auto.*debug/i.test(`${server.id} ${server.name} ${server.description}`) ||
      server.tools.some(tool => tool.name === 'debug.start_task' || tool.tool_id === 'debug.start_task')
    )
  ));
}

function getToolNames(server: NonNullable<ReturnType<typeof findDebugAutomationServer>>) {
  return new Set(server.tools.flatMap(tool => [tool.name, tool.tool_id].filter(Boolean)));
}

function pickTool(toolNames: Set<string>, candidates: string[]) {
  return candidates.find(name => toolNames.has(name));
}

function pickTaskId(value: unknown): string {
  const visited = new Set<unknown>();
  const walk = (input: unknown): string => {
    if (!input || visited.has(input)) return '';
    visited.add(input);
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return walk(JSON.parse(trimmed));
        } catch {
          return '';
        }
      }
      return '';
    }
    if (Array.isArray(input)) {
      for (const item of input) {
        const found = walk(item);
        if (found) return found;
      }
      return '';
    }
    if (typeof input !== 'object') return '';
    const record = input as Record<string, unknown>;
    for (const key of ['task_id', 'taskId', 'id']) {
      const raw = record[key];
      if (typeof raw === 'string' && raw.trim()) return raw.trim();
      if (typeof raw === 'number') return String(raw);
    }
    for (const key of ['result', 'data', 'task', 'content', 'structuredContent', 'text']) {
      const found = walk(record[key]);
      if (found) return found;
    }
    return '';
  };
  return walk(value);
}

function isMcpResultError(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.isError === true) return true;
  if (record.error) return true;
  if (Array.isArray(record.content)) {
    return record.content.some(item => {
      if (!item || typeof item !== 'object') return false;
      const text = (item as Record<string, unknown>).text;
      if (typeof text !== 'string') return false;
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        return Boolean(parsed.error || parsed.isError);
      } catch {
        return /^error[:：]|失败|required/i.test(text.trim());
      }
    });
  }
  return false;
}

function stringifyMcpResult(value: unknown) {
  if (!value) return '';
  try {
    return JSON.stringify(value).slice(0, 300);
  } catch {
    return String(value).slice(0, 300);
  }
}

function parseMcpTextPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.content)) {
    const textItem = record.content.find(item => (
      item &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).text === 'string'
    ));
    const text = textItem && typeof textItem === 'object'
      ? (textItem as Record<string, unknown>).text
      : '';
    if (typeof text === 'string' && text.trim()) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }
  return value;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const requestedTaskId = typeof body.task_id === 'string' && body.task_id.trim()
    ? body.task_id.trim()
    : `debug-task-${Date.now()}`;
  const servers = await listMcpServers();
  const configuredDebugServers = servers.filter(server => (
    server.enabled &&
    (
      /自动联调|debug.*automation|auto.*debug/i.test(`${server.id} ${server.name} ${server.description}`) ||
      server.tools.some(tool => tool.name === 'debug.start_task' || tool.tool_id === 'debug.start_task')
    )
  ));
  const server = findDebugAutomationServer(servers);

  if (!server) {
    return NextResponse.json({
      ok: false,
      status: 'missing_debug_mcp_endpoint',
      message: configuredDebugServers.length > 0
        ? '自动联调 Skill 已绑定联调 MCP，但当前启用的联调 MCP 未配置可调用 Endpoint。'
        : '未找到已启用的自动联调 MCP，请先在后台配置联调 MCP 服务。',
      configured_servers: configuredDebugServers.map(item => ({
        id: item.id,
        name: item.name,
        endpoint_configured: Boolean(item.endpoint_url),
        tool_count: item.tools.length,
      })),
    }, { status: 409 });
  }

  const toolNames = getToolNames(server);
  const createTool = pickTool(toolNames, ['debug_automation_create_task', 'debug.create_task']);
  const startTool = pickTool(toolNames, ['debug_automation_start_task', 'debug.start_task']);
  const stepsTool = pickTool(toolNames, ['debug_automation_get_steps', 'debug.watch_steps']);
  const resultTool = pickTool(toolNames, ['debug_automation_get_result', 'debug.get_result']);
  if (!startTool) {
    return NextResponse.json({
      ok: false,
      status: 'debug_mcp_tool_missing',
      message: '自动联调 MCP 未发现可发起任务的工具，请检查 MCP 工具发现结果。',
      server: server.name,
      available_tools: Array.from(toolNames).slice(0, 30),
    }, { status: 409 });
  }

  const serverConfig = {
    endpoint_url: server.endpoint_url,
    transport: server.transport,
    auth_type: server.auth_type,
    auth_config: server.auth_config,
  };

  const createArgs = { task_id: requestedTaskId, config: body };
  const createCall = createTool
    ? await callMcpTool(serverConfig, createTool, createArgs)
    : null;
  if (createCall && (!createCall.ok || isMcpResultError(createCall.result))) {
    return NextResponse.json({
      ok: false,
      status: 'debug_mcp_create_failed',
      message: createCall.ok ? stringifyMcpResult(createCall.result) || '自动联调 MCP 创建任务失败。' : createCall.msg,
      server: server.name,
      tool: createTool,
      latency_ms: createCall.latency_ms,
      raw_response_preview: createCall.raw_response_preview,
    }, { status: 502 });
  }

  const taskId = pickTaskId(createCall?.result) || requestedTaskId;
  const startArgs = { task_id: taskId };
  const call = await callMcpTool(serverConfig, startTool, startArgs);
  const buildStartedResponse = async (message: string, startResult: unknown, latencyMs: number) => {
    const [stepsCall, resultCall] = await Promise.all([
      stepsTool ? callMcpTool(serverConfig, stepsTool, { task_id: taskId }) : Promise.resolve(null),
      resultTool ? callMcpTool(serverConfig, resultTool, { task_id: taskId }) : Promise.resolve(null),
    ]);
    return NextResponse.json({
      ok: true,
      status: 'started',
      message,
      server: server.name,
      tool: startTool,
      latency_ms: latencyMs,
      result: {
        task_id: taskId,
        create_result: parseMcpTextPayload(createCall?.result),
        start_result: parseMcpTextPayload(startResult),
        steps_result: stepsCall?.ok ? parseMcpTextPayload(stepsCall.result) : null,
        result_summary: resultCall?.ok ? parseMcpTextPayload(resultCall.result) : null,
        observation_errors: [
          stepsCall && !stepsCall.ok ? stepsCall.msg : '',
          resultCall && !resultCall.ok ? resultCall.msg : '',
        ].filter(Boolean),
      },
    });
  };

  if (!call.ok || isMcpResultError(call.result)) {
    const resultText = stringifyMcpResult(call.result);
    if (resultText.includes('Cannot transition from DISPATCHING to DISPATCHING')) {
      return buildStartedResponse('自动联调 MCP 已创建任务，任务已在调度中。', call.result, call.latency_ms);
    }
    return NextResponse.json({
      ok: false,
      status: 'debug_mcp_call_failed',
      message: call.ok ? resultText || '自动联调 MCP 发起任务失败。' : call.msg,
      server: server.name,
      tool: startTool,
      latency_ms: call.latency_ms,
      raw_response_preview: call.raw_response_preview,
    }, { status: 502 });
  }

  return buildStartedResponse('自动联调 MCP 已发起任务。', call.result, call.latency_ms);
}
