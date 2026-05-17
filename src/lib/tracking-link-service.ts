export interface TrackingLinkRequestContext {
  project_scope: string[];
  media: string;
  package_name?: string;
  channel_package?: string;
  action: 'query' | 'create';
}

export function buildTrackingLinkRequestContext(message: string): TrackingLinkRequestContext {
  const mediaMatch = message.match(/(巨量|穿山甲|抖音|快手|广点通|腾讯|小米|UC|Applovin|Google|Meta|TikTok)/i);
  const appIdMatch = message.match(/(?:APPID|app_id|appid)[:：\s]*([A-Za-z0-9_-]+)/i);
  const packageMatch = message.match(/(?:包名|package)[:：\s]*([A-Za-z0-9_.-]+)/i);
  const channelMatch = message.match(/(?:渠道包|分包|channel)[:：\s]*([A-Za-z0-9_.-]+)/i);
  const shouldCreate = /(创建|新建|生成|没有.*链接|出一个|给我建)/i.test(message);

  return {
    project_scope: appIdMatch?.[1] ? [appIdMatch[1]] : ['current_project'],
    media: mediaMatch?.[1] || 'auto_detect',
    package_name: packageMatch?.[1],
    channel_package: channelMatch?.[1],
    action: shouldCreate ? 'create' : 'query',
  };
}

export function buildTrackingLinkCardPayload(input: TrackingLinkRequestContext, steps: Array<{
  key: string;
  label: string;
  toolName: string;
  output: Record<string, unknown>;
}>): Record<string, unknown> {
  const toolStates = steps
    .filter(step => step.key.startsWith('mcp_tracking_link_'))
    .map((step, index) => {
      const status = String(step.output?.status || 'unknown');
      return {
        index: index + 1,
        key: step.key,
        name: step.label,
        tool: String(step.output?.selected_tool || step.toolName),
        status,
        available: status === 'success',
        message: String(step.output?.message || step.output?.error || ''),
        response: step.output?.response,
      };
    });
  const blocked = toolStates.some(step => !step.available);
  const queryStep = toolStates.find(step => step.key === 'mcp_tracking_link_query');
  const createStep = toolStates.find(step => step.key === 'mcp_tracking_link_create');

  return {
    action: input.action,
    project_scope: input.project_scope,
    media: input.media,
    package_name: input.package_name || '',
    channel_package: input.channel_package || '',
    status: blocked ? 'blocked' : 'ready',
    link_source: createStep?.available ? 'created' : queryStep?.available ? 'existing' : 'unavailable',
    conclusion: blocked
      ? '监测链接依赖的真实 MCP 未配置、无权限或调用失败，当前不能生成或确认可用链接。'
      : '监测链接能力已完成调用，可基于返回结果交付链接。',
    steps: toolStates,
  };
}
