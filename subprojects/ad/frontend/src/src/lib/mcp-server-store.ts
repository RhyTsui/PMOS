import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { McpServerConfig } from '@/types';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';

const MCP_SERVERS_PATH = runtimeDataPath('mcp-servers.json');
const LEGACY_MCP_SERVERS_PATH = legacyDataPath('mcp-servers.json');
const COLLECTION_GATEWAY_MCP_ID = 'mcp-collection-gateway';
const ZHITOU_CONFIG_MCP_ID = 'mcp-zhitou-config';
const OCEANENGINE_MCP_ID = 'mcp-oceanengine';
const DEBUG_AUTOMATION_MCP_ID = 'mcp-debug-automation';
const TRACKING_LINK_MCP_ID = 'mcp-tracking-link';
const REPORT_ORCHESTRATOR_MCP_ID = 'mcp-report-orchestrator';
const PIXSO_MCP_ID = 'mcp-pixso';

interface McpServersFile {
  servers: McpServerConfig[];
}

function nowTs(): number {
  return Date.now();
}

const BUILTIN_MCP_SERVERS: McpServerConfig[] = [
  {
    id: PIXSO_MCP_ID,
    name: 'Pixso MCP',
    description: 'Pixso design MCP endpoint for Zhitou Chat design artifact access.',
    category: 'function',
    endpoint_url: 'http://127.0.0.1:3667/mcp',
    transport: 'streamable-http',
    auth_type: 'none',
    auth_config: {},
    status: 'disconnected',
    enabled: true,
    business_domains: ['design', 'prototype', 'zhitou-chat'],
    bound_agents: ['demand', 'debugging'],
    tags: ['Pixso', 'design', 'MCP'],
    tools: [],
    health_check_url: 'http://127.0.0.1:3667/mcp',
    created_at: 0,
    updated_at: 0,
  },
  {
    id: COLLECTION_GATEWAY_MCP_ID,
    name: '统一采集网关 MCP',
    description: '承载监控巡检的采集链路观测能力，统一检查媒体报表、点击日志、自归因、平台上报、数据质量和调度状态。',
    category: 'data',
    endpoint_url: '',
    transport: 'streamable-http',
    auth_type: 'bearer_token',
    auth_config: { token: '' },
    status: 'disconnected',
    enabled: true,
    business_domains: ['监控巡检', '投放前质量保障', '指标差异排查'],
    bound_agents: ['monitor', 'monitoring', 'diagnosis'],
    tags: ['P0', '采集网关', '监控巡检', '真实MCP'],
    tools: [
      {
        tool_id: 'collect.media_metric_asset_status',
        name: 'collect.media_metric_asset_status',
        description: '检查媒体报表指标资产上下文是否可用，包括媒体、账户、应用、指标映射、字段资产和授权可见性。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'media'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' }, description: '项目ID、APPID或全部项目' },
            media: { type: 'string', description: '媒体平台，例如巨量、快手、广点通' },
            metric_keys: { type: 'array', items: { type: 'string' }, description: '需要检查的指标，如cost、activation、register、payment' },
          },
        },
        enabled: true,
        bound_agents: ['monitoring', 'diagnosis'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'collect.media_report_status',
        name: 'collect.media_report_status',
        description: '检查媒体 API 报表采集状态，包括采集成功率、延迟、空数据、字段缺失、异常响应和授权失效。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'media', 'time_range'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' }, description: '项目ID、APPID或全部项目' },
            media: { type: 'string', description: '媒体平台' },
            time_range: { type: 'string', description: '巡检时间范围，例如today、yesterday、last_24h' },
            metrics: { type: 'array', items: { type: 'string' }, description: '消耗、展示、点击等媒体报表指标' },
          },
        },
        enabled: true,
        bound_agents: ['monitoring', 'diagnosis'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'collect.click_log_status',
        name: 'collect.click_log_status',
        description: '检查媒体点击日志采集状态，包括点击量、参数完整性、渠道包/分包匹配、落地页参数和监测链接参数。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'media', 'time_range'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' } },
            media: { type: 'string' },
            time_range: { type: 'string' },
            channel_package: { type: 'string', description: '渠道包或分包标识，可选' },
          },
        },
        enabled: true,
        bound_agents: ['monitoring', 'diagnosis'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'collect.self_attribution_status',
        name: 'collect.self_attribution_status',
        description: '检查自归因结果采集状态，包括匹配率、归因失败原因、延迟、重复归因和归因窗口。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'media', 'time_range'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' } },
            media: { type: 'string' },
            time_range: { type: 'string' },
            event_keys: { type: 'array', items: { type: 'string' }, description: 'activation、register、payment、key_action' },
          },
        },
        enabled: true,
        bound_agents: ['monitoring', 'diagnosis'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'collect.platform_event_report_status',
        name: 'collect.platform_event_report_status',
        description: '检查平台数据上报报告，包括客户端/服务端事件上报、字段完整性、事件量、异常码和入库可见性。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'time_range'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' } },
            time_range: { type: 'string' },
            event_keys: { type: 'array', items: { type: 'string' } },
          },
        },
        enabled: true,
        bound_agents: ['monitoring', 'diagnosis', 'debugging'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'collect.data_quality_status',
        name: 'collect.data_quality_status',
        description: '检查数据质量监控，包括空值、突增突降、重复、延迟、跨表一致性和内置阈值规则。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'time_range'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' } },
            time_range: { type: 'string' },
            rule_keys: { type: 'array', items: { type: 'string' }, description: '可指定不能为0、突增突降、延迟等规则' },
          },
        },
        enabled: true,
        bound_agents: ['monitoring', 'diagnosis'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'collect.scheduler_status',
        name: 'collect.scheduler_status',
        description: '检查运维调度系统状态，包括采集任务、清洗任务、聚合任务、报表任务、告警任务的成功、重试、入库和更新时间。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'time_range'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' } },
            time_range: { type: 'string' },
            job_types: { type: 'array', items: { type: 'string' }, description: 'collect、clean、aggregate、report、alert' },
          },
        },
        enabled: true,
        bound_agents: ['monitoring', 'diagnosis'],
        access_mode: 'read',
        call_count: 0,
      },
    ],
    created_at: 0,
    updated_at: 0,
  },
  {
    id: ZHITOU_CONFIG_MCP_ID,
    name: '智投配置 MCP',
    description: '承载智投侧应用、官方渠道包和智投分包只读查询能力；v1 只获取已有分包，不自动创建分包。',
    category: 'data',
    endpoint_url: '',
    transport: 'streamable-http',
    auth_type: 'bearer_token',
    auth_config: { token: '' },
    status: 'disconnected',
    enabled: true,
    business_domains: ['投放前质量保障', '自动联调'],
    bound_agents: ['debugging', 'demand', 'monitoring'],
    tags: ['P0', '智投配置', '分包', '只读', '真实MCP'],
    tools: [
      {
        tool_id: 'zhitou_package.channel_package_query',
        name: 'zhitou_package.channel_package_query',
        description: '查询 QA 已通过的官方渠道包、指定媒体范围的智投已有分包、包版本、审核状态和下载地址；缺失时返回阻塞项，不创建分包。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'media_scope'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' }, description: '项目ID、APPID或应用名称' },
            media_scope: { type: 'array', items: { type: 'string' }, description: '媒体范围，例如巨量、腾讯、快手' },
            terminal: { type: 'string', description: 'android 或 ios' },
            official_channel_package: { type: 'string', description: '官方渠道包标识，例如 310003，可选' },
          },
        },
        enabled: true,
        bound_agents: ['debugging', 'demand', 'monitoring'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'zhitou_package.download_url_query',
        name: 'zhitou_package.download_url_query',
        description: '查询包体或分包下载地址、版本号、QA验收状态和适用媒体；只返回已有结果，不触发打包或分包。',
        input_schema: {
          type: 'object',
          required: ['project_scope'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' } },
            media_scope: { type: 'array', items: { type: 'string' } },
            terminal: { type: 'string' },
            package_name: { type: 'string' },
          },
        },
        enabled: true,
        bound_agents: ['debugging', 'demand', 'monitoring'],
        access_mode: 'read',
        call_count: 0,
      },
    ],
    created_at: 0,
    updated_at: 0,
  },
  {
    id: OCEANENGINE_MCP_ID,
    name: '巨量引擎 MCP',
    description: '通过巨量引擎官方 MCP 查询应用、账户与公共信息。使用 Access-Token 请求头接入，后台只保存服务地址和工具范围。',
    category: 'data',
    endpoint_url: 'https://open.oceanengine.com/ad/mcp',
    transport: 'streamable-http',
    auth_type: 'access_token',
    auth_config: {
      access_token: '',
      tool_range: '["tools_app_management_android_app_list_v2","advertiser_public_info_v2"]',
    },
    status: 'disconnected',
    enabled: true,
    business_domains: ['自动联调', '投放前质量保障'],
    bound_agents: ['debugging'],
    tags: ['P0', '巨量引擎', 'Streamable HTTP', 'Access-Token', '真实MCP'],
    tools: [],
    created_at: 0,
    updated_at: 0,
  },
  {
    id: DEBUG_AUTOMATION_MCP_ID,
    name: '自动联调 MCP',
    description: '承载巨量等媒体的自动联调准备、发起、步骤观测和结果生成能力。',
    category: 'function',
    endpoint_url: '',
    transport: 'streamable-http',
    auth_type: 'bearer_token',
    auth_config: { token: '' },
    status: 'disconnected',
    enabled: true,
    business_domains: ['自动联调', '投放前质量保障'],
    bound_agents: ['debugging'],
    tags: ['P0', '巨量', '自动联调', '真实MCP'],
    tools: [
      {
        tool_id: 'debug.config_check',
        name: 'debug.config_check',
        description: '检查后台联调配置是否完整，包括媒体账号、事件资产、回传查看位置、渠道包、自动化关键字、游戏登录和设备配置。',
        input_schema: {
          type: 'object',
          required: ['media', 'project_scope', 'terminal'],
          properties: {
            media: { type: 'string', description: '媒体平台，v1 优先巨量' },
            project_scope: { type: 'array', items: { type: 'string' }, description: '项目ID、APPID或应用名称' },
            terminal: { type: 'string', description: 'android 或 ios' },
            debug_targets: { type: 'array', items: { type: 'string' }, description: 'activation、register、payment、key_action' },
          },
        },
        enabled: true,
        bound_agents: ['debugging'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'debug.media_app_check',
        name: 'debug.media_app_check',
        description: '检查媒体后台是否存在目标应用、是否已共享到默认账号、事件资产是否可访问。',
        input_schema: {
          type: 'object',
          required: ['media', 'project_scope', 'terminal'],
          properties: {
            media: { type: 'string' },
            project_scope: { type: 'array', items: { type: 'string' } },
            terminal: { type: 'string' },
            default_account: { type: 'string', description: '后台配置的默认账户' },
          },
        },
        enabled: true,
        bound_agents: ['debugging'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'debug.event_report_check',
        name: 'debug.event_report_check',
        description: '联调前检查平台事件上报是否已有记录，确认激活、注册、付费、关键行为的可验证性。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'debug_targets'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' } },
            debug_targets: { type: 'array', items: { type: 'string' } },
          },
        },
        enabled: true,
        bound_agents: ['debugging'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'debug.start_task',
        name: 'debug.start_task',
        description: '发起自动联调任务，进入 Web、Mobile/Game、回传轮询的步骤观测。',
        input_schema: {
          type: 'object',
          required: ['media', 'project_scope', 'terminal', 'debug_targets'],
          properties: {
            media: { type: 'string' },
            project_scope: { type: 'array', items: { type: 'string' } },
            terminal: { type: 'string' },
            debug_targets: { type: 'array', items: { type: 'string' } },
          },
        },
        enabled: true,
        bound_agents: ['debugging'],
        access_mode: 'write',
        call_count: 0,
      },
      {
        tool_id: 'debug.watch_steps',
        name: 'debug.watch_steps',
        description: '读取自动联调步骤、截图、错误日志、轮询结果和最终结论。',
        input_schema: {
          type: 'object',
          required: ['task_id'],
          properties: {
            task_id: { type: 'string', description: '自动联调任务ID' },
          },
        },
        enabled: true,
        bound_agents: ['debugging'],
        access_mode: 'read',
        call_count: 0,
      },
    ],
    created_at: 0,
    updated_at: 0,
  },
  {
    id: TRACKING_LINK_MCP_ID,
    name: '监测链接 MCP',
    description: '承载监测链接查询、权限校验、创建前预检、创建和创建日志能力。',
    category: 'function',
    endpoint_url: '',
    transport: 'streamable-http',
    auth_type: 'bearer_token',
    auth_config: { token: '' },
    status: 'disconnected',
    enabled: true,
    business_domains: ['监测链接交付', '投放前质量保障', '对接'],
    bound_agents: ['demand', 'debugging'],
    tags: ['P1', '监测链接', '真实MCP'],
    tools: [
      {
        tool_id: 'tracking_link.permission_check',
        name: 'tracking_link.permission_check',
        description: '检查当前用户是否具备查询或创建监测链接的权限。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'media'],
          properties: {
            user_id: { type: 'string', description: '当前用户ID' },
            project_scope: { type: 'array', items: { type: 'string' }, description: '项目ID、APPID或应用名称' },
            media: { type: 'string', description: '媒体平台' },
            action: { type: 'string', enum: ['query', 'create'], description: '查询或创建' },
          },
        },
        enabled: true,
        bound_agents: ['demand', 'debugging'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'tracking_link.query',
        name: 'tracking_link.query',
        description: '查询已有可用监测链接，返回链接、适用包、分包、媒体、状态和校验结果。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'media'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' } },
            media: { type: 'string' },
            package_name: { type: 'string' },
            channel_package: { type: 'string' },
          },
        },
        enabled: true,
        bound_agents: ['demand', 'debugging'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'tracking_link.precheck',
        name: 'tracking_link.precheck',
        description: '创建监测链接前检查项目、媒体、包、分包、归因参数、事件配置和投放可用性。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'media'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' } },
            media: { type: 'string' },
            package_name: { type: 'string' },
            channel_package: { type: 'string' },
          },
        },
        enabled: true,
        bound_agents: ['demand', 'debugging'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'tracking_link.create',
        name: 'tracking_link.create',
        description: '有权限且预检通过后创建新监测链接。',
        input_schema: {
          type: 'object',
          required: ['project_scope', 'media', 'package_name'],
          properties: {
            project_scope: { type: 'array', items: { type: 'string' } },
            media: { type: 'string' },
            package_name: { type: 'string' },
            channel_package: { type: 'string' },
            attribution_params: { type: 'object', additionalProperties: true },
          },
        },
        enabled: true,
        bound_agents: ['demand', 'debugging'],
        access_mode: 'write',
        call_count: 0,
      },
      {
        tool_id: 'tracking_link.audit_log',
        name: 'tracking_link.audit_log',
        description: '记录监测链接查询或创建日志，包含用户、项目、媒体、动作、结果和失败原因。',
        input_schema: {
          type: 'object',
          required: ['action', 'status'],
          properties: {
            action: { type: 'string' },
            status: { type: 'string' },
            project_scope: { type: 'array', items: { type: 'string' } },
            media: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        enabled: true,
        bound_agents: ['demand', 'debugging'],
        access_mode: 'write',
        call_count: 0,
      },
    ],
    created_at: 0,
    updated_at: 0,
  },
  {
    id: REPORT_ORCHESTRATOR_MCP_ID,
    name: '报表编排 MCP',
    description: '承载自动报表模板解析、指标校验、数据预览和定时任务创建能力。',
    category: 'function',
    endpoint_url: '',
    transport: 'streamable-http',
    auth_type: 'bearer_token',
    auth_config: { token: '' },
    status: 'disconnected',
    enabled: true,
    business_domains: ['自动报表', '报表任务', '拼表'],
    bound_agents: ['help', 'monitoring'],
    tags: ['P1', '自动报表', '真实MCP'],
    tools: [
      {
        tool_id: 'report.parse_template',
        name: 'report.parse_template',
        description: '从文本模板或标准二维 Excel 模板中提炼报表结构、维度、指标、频率和接收对象。',
        input_schema: {
          type: 'object',
          required: ['requirement'],
          properties: {
            requirement: { type: 'string', description: '用户报表需求' },
            attachment_ids: { type: 'array', items: { type: 'string' }, description: 'Excel 模板附件 ID' },
          },
        },
        enabled: true,
        bound_agents: ['help', 'monitoring'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'report.validate_metrics',
        name: 'report.validate_metrics',
        description: '校验报表模板中的指标是否存在、口径是否明确，并返回问题指标列表。',
        input_schema: {
          type: 'object',
          required: ['template'],
          properties: {
            template: { type: 'object', additionalProperties: true },
            metric_names: { type: 'array', items: { type: 'string' } },
          },
        },
        enabled: true,
        bound_agents: ['help', 'monitoring'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'report.preview',
        name: 'report.preview',
        description: '基于已确认模板调用多个报表/数仓工具拉取数据并返回类 Excel 数据预览。',
        input_schema: {
          type: 'object',
          required: ['template'],
          properties: {
            template: { type: 'object', additionalProperties: true },
            report_date: { type: 'string' },
          },
        },
        enabled: true,
        bound_agents: ['help', 'monitoring'],
        access_mode: 'read',
        call_count: 0,
      },
      {
        tool_id: 'scheduled_report.create',
        name: 'scheduled_report.create',
        description: '基于已确认模板创建定时报表任务。',
        input_schema: {
          type: 'object',
          required: ['template', 'schedule'],
          properties: {
            template: { type: 'object', additionalProperties: true },
            schedule: { type: 'string', description: '自然语言或 cron 表达式' },
            recipients: { type: 'array', items: { type: 'string' } },
          },
        },
        enabled: true,
        bound_agents: ['help', 'monitoring'],
        access_mode: 'write',
        call_count: 0,
      },
    ],
    created_at: 0,
    updated_at: 0,
  },
];

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

function mergeBuiltinServers(servers: McpServerConfig[]): McpServerConfig[] {
  const customServers = servers.filter(server => !BUILTIN_MCP_SERVERS.some(builtin => builtin.id === server.id));
  const mergedBuiltins = BUILTIN_MCP_SERVERS.map((builtin) => {
    const override = servers.find(server => server.id === builtin.id);
    return normalizeServer({
      ...builtin,
      ...override,
      id: builtin.id,
      tools: override?.tools?.length ? override.tools : builtin.tools,
      created_at: override?.created_at || builtin.created_at || nowTs(),
      updated_at: Math.max(override?.updated_at || 0, builtin.updated_at || 0),
    });
  });

  return [...customServers, ...mergedBuiltins];
}

async function readMcpServersFile(): Promise<McpServersFile> {
  for (const serversPath of [MCP_SERVERS_PATH, LEGACY_MCP_SERVERS_PATH]) {
    try {
      const raw = await readFile(serversPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<McpServersFile>;
      const servers = Array.isArray(parsed.servers) ? parsed.servers.map(normalizeServer) : [];
      return { servers };
    } catch {
      // 尝试下一个存储位置。
    }
  }
  return { servers: [] };
}

async function writeMcpServersFile(file: McpServersFile): Promise<void> {
  await mkdir(path.dirname(MCP_SERVERS_PATH), { recursive: true });
  await writeFile(MCP_SERVERS_PATH, JSON.stringify(file, null, 2), 'utf8');
}

export async function listMcpServers(): Promise<McpServerConfig[]> {
  const file = await readMcpServersFile();
  return mergeBuiltinServers(file.servers).sort((a, b) => b.updated_at - a.updated_at);
}

export async function getMcpServer(id: string): Promise<McpServerConfig | undefined> {
  const servers = await listMcpServers();
  return servers.find(server => server.id === id);
}

export async function createMcpServer(data: Partial<McpServerConfig>): Promise<McpServerConfig> {
  const file = await readMcpServersFile();
  const id = data.id || `mcp-${nowTs()}`;
  const existing = mergeBuiltinServers(file.servers).find(server => server.id === id);
  if (existing) {
    const updated = normalizeServer({
      ...existing,
      ...data,
      id,
      created_at: existing.created_at,
      updated_at: nowTs(),
    });
    file.servers = [
      ...file.servers.filter(server => server.id !== id),
      updated,
    ];
    await writeMcpServersFile(file);
    return updated;
  }

  const next = normalizeServer({
    ...data,
    id,
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
  const current = mergeBuiltinServers(file.servers).find(server => server.id === id);
  if (!current) return undefined;

  const next = normalizeServer({
    ...current,
    ...patch,
    id,
    created_at: current.created_at,
    updated_at: nowTs(),
  });
  file.servers = [
    ...file.servers.filter(server => server.id !== id),
    next,
  ];
  await writeMcpServersFile(file);
  return next;
}

export async function deleteMcpServer(id: string): Promise<boolean> {
  const file = await readMcpServersFile();
  const builtin = BUILTIN_MCP_SERVERS.find(server => server.id === id);
  if (builtin) {
    const current = mergeBuiltinServers(file.servers).find(server => server.id === id);
    if (!current) return false;
    const disabled = normalizeServer({
      ...current,
      enabled: false,
      status: 'disconnected',
      endpoint_url: '',
      updated_at: nowTs(),
    });
    file.servers = [
      ...file.servers.filter(server => server.id !== id),
      disabled,
    ];
    await writeMcpServersFile(file);
    return true;
  }

  const before = file.servers.length;
  file.servers = file.servers.filter(server => server.id !== id);
  if (file.servers.length === before) return false;
  await writeMcpServersFile(file);
  return true;
}
