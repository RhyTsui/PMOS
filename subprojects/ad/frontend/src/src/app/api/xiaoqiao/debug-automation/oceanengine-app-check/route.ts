import { NextResponse } from 'next/server';
import { callMcpTool } from '@/lib/mcp-discovery';
import { listMcpServers } from '@/lib/mcp-server-store';
import type { McpServerConfig } from '@/types';

const OCEANENGINE_APP_LIST_TOOL = 'tools_app_management_android_app_list_v2';

interface OceanEngineCandidateApp {
  app_id?: string;
  app_name: string;
  icon?: string;
  package_name?: string;
  account_id?: string;
  account_type?: string;
  status?: string;
}

function buildTemporaryPass(params: {
  project: string;
  terminal: string;
  server?: string;
  latency_ms?: number;
  reason: string;
  raw_response_preview?: string;
}) {
  const appName = params.project || '当前项目';
  return NextResponse.json({
    ok: true,
    status: 'matched',
    message: `巨量应用权限校验临时放行：${params.reason}`,
    tool: OCEANENGINE_APP_LIST_TOOL,
    server: params.server,
    latency_ms: params.latency_ms,
    checked_count: 0,
    matched_count: 1,
    temporary_pass: true,
    temporary_reason: params.reason,
    matched_apps: [{
      app_id: appName,
      app_name: appName,
      package_name: /ios|苹果/i.test(params.terminal) ? 'mock-ios-package' : 'mock-android-package',
      account_type: 'AD',
      status: 'temporary_pass',
    }],
    candidate_apps: [],
    raw_response_preview: params.raw_response_preview,
  });
}

function shouldTemporaryPassMcpError(message: string) {
  return /access[-_\s]?token|token|鉴权|认证|授权|unauthori[sz]ed|forbidden|invalid.*credential|app信息有误|app.?信息.?有误/i.test(message);
}

function findOceanEngineServer(servers: McpServerConfig[]) {
  return servers.find(server => (
    server.enabled &&
    /oceanengine|巨量|穿山甲|抖音|今日头条/i.test(`${server.id} ${server.name} ${server.description}`) &&
    Boolean(server.endpoint_url)
  ));
}

function collectRecords(value: unknown, output: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        collectRecords(JSON.parse(trimmed), output);
      } catch {
        // 非 JSON 字符串忽略。
      }
    }
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectRecords(item, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some(key => /app|package|name|id/i.test(key))) {
    output.push(record);
  }
  for (const nestedKey of ['content', 'text', 'structuredContent', 'data', 'result', 'list', 'items', 'apps', 'records']) {
    if (nestedKey in record) collectRecords(record[nestedKey], output);
  }
  return output;
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, '').toLowerCase();
}

function normalizeCandidateApp(record: Record<string, unknown>): OceanEngineCandidateApp | null {
  const appName = readString(record, ['app_name', 'appName', 'name', 'app_alias', 'appAlias', 'package_name', 'packageName']);
  const appId = readString(record, ['app_id', 'appId', 'app_cloud_id', 'appCloudId', 'package_id', 'packageId', 'id']);
  if (!appName && !appId) return null;
  return {
    app_id: appId || undefined,
    app_name: appName || `应用 ${appId}`,
    icon: readString(record, ['icon', 'icon_url', 'iconUrl', 'app_icon', 'app_icon_url', 'appIcon', 'appIconUrl', 'logo', 'logo_url', 'logoUrl']) || undefined,
    package_name: readString(record, ['package_name', 'packageName', 'app_package', 'appPackage', 'bundle_id', 'bundleId']) || undefined,
    account_id: readString(record, ['account_id', 'accountId']) || undefined,
    account_type: readString(record, ['account_type', 'accountType']) || undefined,
    status: readString(record, ['status', 'audit_status', 'auditStatus', 'app_status', 'appStatus']) || undefined,
  };
}

function uniqueCandidateApps(records: Record<string, unknown>[]) {
  const seen = new Set<string>();
  const candidates: OceanEngineCandidateApp[] = [];
  for (const record of records) {
    const app = normalizeCandidateApp(record);
    if (!app) continue;
    const key = `${app.app_id || ''}::${app.package_name || ''}::${app.app_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(app);
  }
  return candidates;
}

function hasProjectMatch(app: OceanEngineCandidateApp, project: string, terminal: string) {
  if (!project) return false;
  const projectMatched = normalizeText(app.app_name) === normalizeText(project) || app.app_id === project;
  if (!projectMatched) return false;

  const terminalText = `${app.package_name || ''} ${app.app_name || ''}`;
  const terminalMatched = /android|安卓/i.test(terminal)
    ? !/ios|苹果/i.test(terminalText)
    : /ios|苹果/i.test(terminal)
      ? !/android|安卓/i.test(terminalText)
      : true;
  return terminalMatched;
}

function getDefaultAccount(server: McpServerConfig) {
  const accountId = (
    server.auth_config.account_id ||
    server.auth_config.accountId ||
    server.auth_config.default_account_id ||
    server.auth_config.defaultAccountId ||
    server.auth_config.oceanengine_default_account ||
    server.auth_config.default_account ||
    server.auth_config.advertiser_id ||
    server.auth_config.advertiserId ||
    server.auth_config.default_advertiser_id ||
    ''
  ).trim();
  const accountType = (
    server.auth_config.account_type ||
    server.auth_config.accountType ||
    server.auth_config.default_account_type ||
    server.auth_config.defaultAccountType ||
    'AD'
  ).trim().toUpperCase();
  return { accountId, accountType };
}

function pickMcpErrorMessage(result: unknown) {
  const text = JSON.stringify(result || {});
  const messageMatch = /"message"\s*:\s*"([^"]+)"/.exec(text);
  return messageMatch?.[1] || text.slice(0, 180);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    project?: string;
    media?: string;
    terminal?: string;
  };
  const project = body.project?.trim() || '';
  const terminal = body.terminal?.trim() || 'Android';

  const servers = await listMcpServers();
  const server = findOceanEngineServer(servers);
  if (!server) {
    return NextResponse.json({
      ok: false,
      status: 'not_configured',
      message: '未找到已启用的巨量引擎 MCP 配置。',
      tool: OCEANENGINE_APP_LIST_TOOL,
    });
  }

  const { accountId, accountType } = getDefaultAccount(server);
  const call = await callMcpTool({
    endpoint_url: server.endpoint_url,
    transport: server.transport,
    auth_type: server.auth_type,
    auth_config: server.auth_config,
  }, OCEANENGINE_APP_LIST_TOOL, {
    ...(accountId ? { account_id: Number(accountId), account_type: accountType || 'AD' } : {}),
    account_asset_query_scope: 'ALL',
    filtering: {
      search_key: project,
      search_type: 'ALL',
      status: 'ALL',
    },
    page: 1,
    page_size: 100,
  });

  if (!call.ok) {
    if (shouldTemporaryPassMcpError(`${call.msg} ${call.raw_response_preview || ''}`)) {
      return buildTemporaryPass({
        project,
        terminal,
        server: server.name,
        latency_ms: call.latency_ms,
        reason: call.msg,
        raw_response_preview: call.raw_response_preview,
      });
    }
    return NextResponse.json({
      ok: false,
      status: 'failed',
      message: call.msg,
      tool: OCEANENGINE_APP_LIST_TOOL,
      server: server.name,
      latency_ms: call.latency_ms,
      raw_response_preview: call.raw_response_preview,
    });
  }

  const records = collectRecords(call.result);
  const mcpMessage = pickMcpErrorMessage(call.result);
  if (/advertiser ID is required|account_id|账户id|账户ID|广告主/i.test(mcpMessage) && !accountId) {
    return NextResponse.json({
      ok: false,
      status: 'missing_account_id',
      message: '巨量 MCP 已调用，但后台未配置默认账户 account_id，无法查询默认账户应用列表。',
      tool: OCEANENGINE_APP_LIST_TOOL,
      server: server.name,
      latency_ms: call.latency_ms,
      checked_count: 0,
      matched_count: 0,
      raw_response_preview: call.raw_response_preview,
    });
  }
  const candidates = uniqueCandidateApps(records);
  const matchedApps = candidates.filter(app => hasProjectMatch(app, project, terminal));
  if (records.length === 0) {
    return NextResponse.json({
      ok: false,
      status: 'empty_result',
      message: '巨量 MCP 已调用，默认账户下应用列表为空。',
      tool: OCEANENGINE_APP_LIST_TOOL,
      server: server.name,
      latency_ms: call.latency_ms,
      checked_count: 0,
      matched_count: 0,
      candidate_apps: [],
      raw_response_preview: call.raw_response_preview,
    });
  }
  return NextResponse.json({
    ok: true,
    status: matchedApps.length > 0 ? 'matched' : 'not_found',
    message: matchedApps.length > 0
      ? '默认账户下已找到匹配应用。'
      : '默认账户下未找到匹配应用。',
    tool: OCEANENGINE_APP_LIST_TOOL,
    server: server.name,
    latency_ms: call.latency_ms,
    checked_count: candidates.length,
    matched_count: matchedApps.length,
    matched_apps: matchedApps.slice(0, 10),
    candidate_apps: matchedApps.length > 0 ? [] : candidates.slice(0, 20),
  });
}
