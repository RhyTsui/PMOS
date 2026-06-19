import type { AgentProcessEvent, ProcessEventType } from '@/types';

type SsePayload = Record<string, unknown>;

function nowIso() {
  return new Date().toISOString();
}

function eventId(type: string) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asRecord(value: unknown): SsePayload | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as SsePayload
    : undefined;
}

function safeJson(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'string') return undefined;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { text: value };
  }
}

function normalizeToolEventType(kind: unknown, phase: 'call' | 'result'): ProcessEventType {
  const normalized = String(kind || '').toLowerCase();
  if (normalized === 'skill') return phase === 'call' ? 'skill.started' : 'skill.finished';
  if (normalized === 'knowledge') return phase === 'call' ? 'knowledge.search' : 'knowledge.result';
  if (normalized === 'web_search') return phase === 'call' ? 'web.search' : 'web.result';
  return phase === 'call' ? 'mcp.tool_call' : 'mcp.tool_result';
}

function humanizeToolName(value: string): string {
  const name = value.trim();
  const lower = name.toLowerCase();
  const mappings: Array<[RegExp, string]> = [
    [/get_app_package_list/i, '应用列表工具'],
    [/debug_automation_get_result/i, '联调结果工具'],
    [/debug_automation_get_steps/i, '联调步骤工具'],
    [/debug_automation_create_task/i, '联调任务创建工具'],
    [/debug_automation_start_task/i, '联调任务启动工具'],
    [/zhitou_package\.channel_package_query/i, '项目包查询工具'],
    [/zhitou_package\.download_url_query/i, '下载地址查询工具'],
    [/zhitou_package\.create_sub_package/i, '分包生成工具'],
    [/zhitou_package\.sync_media_sub_package/i, '分包同步工具'],
    [/media_config\.share_app/i, '媒体应用授权工具'],
    [/debug\.event_report_check/i, '回传结果检查工具'],
    [/collect\.platform_event_report_status/i, '上报结果检查工具'],
    [/get_zt_hour_report|get_ads_report|query_report/i, '报表查询工具'],
    [/search_knowledge/i, '知识库检索'],
  ];
  const matched = mappings.find(([pattern]) => pattern.test(lower));
  if (matched) return matched[1];
  const withoutServer = name.split('.').pop() || name;
  if (/^[a-z0-9_.-]+$/i.test(withoutServer)) return '业务工具';
  return withoutServer || '业务工具';
}

function buildToolSummary(toolLabel: string, phase: 'call' | 'result', status?: unknown): string {
  if (phase === 'call') return `正在调用${toolLabel}，请求内容已收起。`;
  const normalizedStatus = String(status || '').toLowerCase();
  if (/failed|error|not_configured|missing/.test(normalizedStatus)) {
    return `${toolLabel}返回异常，展开查看原因。`;
  }
  return `${toolLabel}已返回，展开查看结果。`;
}

export function processEventsFromSsePayload(payload: unknown): AgentProcessEvent[] {
  const data = asRecord(payload);
  if (!data) return [];
  if (data.type === 'process_event') {
    const event = asRecord(data.event);
    return event ? [event as unknown as AgentProcessEvent] : [];
  }
  const type = String(data.type || '');
  const createdAt = nowIso();

  if (type === 'route') {
    const intent = String(data.intent || 'general');
    return [{
      id: eventId('intent'),
      type: 'intent.detected',
      label: '识别服务意图',
      status: 'success',
      visibility: 'user',
      summary: `已进入 ${intent} 处理路径`,
      started_at: createdAt,
      completed_at: createdAt,
      intent_type: intent,
      input: { intent },
      output: {
        tools_used: Array.isArray(data.toolsUsed) ? data.toolsUsed : [],
        has_thinking: Boolean(data.hasThinking),
      },
    }];
  }

  if (type === 'thinking_step') {
    const step = asRecord(data.step);
    if (!step) return [];
    const key = String(step.key || step.label || 'model-step');
    const statusText = String(step.status || 'success');
    const status = statusText === 'loading' ? 'running' : statusText === 'completed' ? 'success' : statusText === 'error' ? 'error' : 'success';
    const eventType: ProcessEventType = key.includes('knowledge')
      ? (status === 'running' ? 'knowledge.search' : 'knowledge.result')
      : key.includes('skill')
        ? 'skill.step'
        : key.includes('mcp') || key.includes('tool')
          ? (status === 'running' ? 'mcp.tool_call' : 'mcp.tool_result')
          : 'model.step';
    const startedAt = typeof step.started_at === 'number' ? new Date(step.started_at).toISOString() : createdAt;
    return [{
      id: eventId(key),
      type: eventType,
      label: String(step.label || '处理步骤'),
      status,
      visibility: 'user',
      summary: String(step.content || ''),
      started_at: startedAt,
      completed_at: status === 'running' ? undefined : createdAt,
      duration_ms: typeof step.duration_ms === 'number' ? step.duration_ms : undefined,
      input: asRecord(step.input),
      output: asRecord(step.output),
    }];
  }

  if (type === 'tool_call' || type === 'tool_result') {
    const phase = type === 'tool_call' ? 'call' : 'result';
    const toolName = String(data.display_name || data.name || '工具调用');
    const toolLabel = humanizeToolName(toolName);
    const kind = String(data.kind || 'mcp');
    const output = phase === 'result' ? safeJson(data.result) : undefined;
    return [{
      id: eventId(`${phase}-${String(data.name || toolName)}`),
      type: normalizeToolEventType(kind, phase),
      label: phase === 'call' ? `调用${toolLabel}` : `${toolLabel}返回`,
      status: phase === 'call' ? 'running' : 'success',
      visibility: 'user',
      summary: buildToolSummary(toolLabel, phase, output?.status),
      started_at: createdAt,
      completed_at: phase === 'call' ? undefined : createdAt,
      skill_name: kind === 'skill' ? toolName : undefined,
      tool_name: String(data.name || toolName),
      provider: String(data.provider_url || ''),
      prompt: typeof data.prompt === 'string' ? data.prompt : undefined,
      input: safeJson(data.arguments),
      output,
    }];
  }

  return [];
}

export function attachProcessEventsToDonePayload(payload: unknown, events: AgentProcessEvent[]) {
  const data = asRecord(payload);
  if (!data || data.type !== 'done') return payload;
  const metadata = asRecord(data.metadata) || {};
  return {
    ...data,
    metadata: {
      ...metadata,
      process_events: events,
    },
  };
}

export function thinkingStepFromProcessEvent(event: AgentProcessEvent) {
  return {
    key: event.id,
    label: event.label,
    content: event.summary || '',
    status: event.status === 'running' ? 'loading' as const : event.status === 'error' ? 'error' as const : 'completed' as const,
    started_at: event.started_at ? new Date(event.started_at).getTime() : undefined,
    duration_ms: event.duration_ms,
    input: event.input,
    output: event.output,
  };
}

export function toolCallFromProcessEvent(event: AgentProcessEvent) {
  if (!event.type.includes('tool') && !event.type.startsWith('skill.') && !event.type.startsWith('knowledge.') && !event.type.startsWith('web.')) {
    return null;
  }
  const kind = event.type.startsWith('skill.')
    ? 'skill'
    : event.type.startsWith('knowledge.')
      ? 'knowledge'
      : event.type.startsWith('web.')
        ? 'web_search'
        : 'mcp';
  return {
    name: event.tool_name || event.skill_name || event.label,
    query: event.summary || '',
    arguments: event.input ? JSON.stringify(event.input) : undefined,
    result: event.output ? JSON.stringify(event.output) : undefined,
    kind,
    display_name: event.skill_name || event.tool_name || event.label,
    provider_url: event.provider,
    prompt: event.prompt,
    step_key: event.id,
    status: event.status === 'running' ? 'calling' as const : event.status === 'error' ? 'error' as const : 'done' as const,
  };
}
