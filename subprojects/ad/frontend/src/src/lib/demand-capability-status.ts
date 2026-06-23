/**
 * Demand Capability Status Resolver
 *
 * Uses Zhitou config MCP as the primary read-only fact source.
 * The local override registry is secondary and can only lift
 * not_integrated to integrated.
 */

import type {
  CapabilityStatus,
  DemandCapabilityLookupResult,
  DemandCapabilityNextAction,
  DemandCapabilityRequestMode,
  ServiceIntakeType,
} from '@/contracts/demand/demand-intake-types';
import { callMcpTool } from '@/lib/mcp-discovery';
import { getMcpServer } from '@/lib/mcp-server-store';

export type IntegrationStatus = CapabilityStatus;
export type CapabilityStatusResult = DemandCapabilityLookupResult;

export interface LookupZhitouConfigCapabilityInput {
  media?: string | null;
  appType?: string | null;
  serviceType: ServiceIntakeType;
  projectScope?: string[];
}

export interface ResolveDemandCapabilityStatusInput extends LookupZhitouConfigCapabilityInput {
  message?: string;
  lookup?: (input: LookupZhitouConfigCapabilityInput) => Promise<CapabilityStatusResult>;
}

const ZHITOU_CONFIG_MCP_ID = 'mcp-zhitou-config';
const ZHITOU_CONFIG_QUERY_TOOL = 'zhitou_package.channel_package_query';
const DEFAULT_PROJECT_SCOPE = ['全部项目'];
const TARGET_SERVICE_TYPES = new Set<ServiceIntakeType>(['monitoring_callback', 'data_collection']);

function normalizeText(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function normalizeCapabilityMedia(value: unknown): string {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function normalizeCapabilityAppType(value: unknown): string {
  const raw = String(value || '').trim();
  const normalized = normalizeText(raw);
  if (!normalized) return '';
  if (/^(android|安卓|andriod)$/.test(normalized)) return 'ANDROID';
  if (/^(ios|iphone|ipad|苹果)$/.test(normalized)) return 'IOS';
  if (/^(harmony|harmonyos|鸿蒙)$/.test(normalized)) return 'HARMONY';
  return raw.replace(/\s+/g, ' ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readArrayCandidate(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  const candidates = [
    value.items,
    value.list,
    value.rows,
    value.data,
    value.result,
    value.records,
    value.packages,
  ];

  for (const candidate of candidates) {
    const rows = readArrayCandidate(candidate);
    if (rows.length) return rows;
  }

  return [];
}

function flattenText(value: unknown, depth = 0): string {
  if (depth > 6 || value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(item => flattenText(item, depth + 1)).join(' ');
  if (isRecord(value)) return Object.values(value).map(item => flattenText(item, depth + 1)).join(' ');
  return '';
}

function parseContentText(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const content = value.content;
  if (!Array.isArray(content)) return value;

  const text = content
    .map((item) => isRecord(item) && typeof item.text === 'string' ? item.text : '')
    .filter(Boolean)
    .join('\n')
    .trim();
  if (!text) return value;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function findMatchedConfig(result: unknown, media: string, appType: string): Record<string, unknown> | undefined {
  const normalizedMedia = normalizeText(media);
  const normalizedAppType = normalizeText(appType);
  const parsed = parseContentText(result);
  const rows = readArrayCandidate(parsed);

  for (const row of rows) {
    const rowText = normalizeText(flattenText(row));
    if (rowText.includes(normalizedMedia) && rowText.includes(normalizedAppType)) {
      return isRecord(row) ? row : { value: row };
    }
  }

  const allText = normalizeText(flattenText(parsed));
  if (allText.includes(normalizedMedia) && allText.includes(normalizedAppType) && !/(无数据|未找到|不存在|notfound|nodata|empty)/i.test(allText)) {
    return isRecord(parsed) ? parsed : { value: parsed };
  }

  return undefined;
}

function baseResult(args: {
  status: CapabilityStatus;
  source: DemandCapabilityLookupResult['source'];
  media: string;
  appType: string;
  reason: string;
  matchedConfig?: Record<string, unknown>;
  requestMode?: DemandCapabilityRequestMode;
  nextAction?: DemandCapabilityNextAction;
}): CapabilityStatusResult {
  const requestMode = args.requestMode || (args.status === 'integrated' ? 'usage_help' : args.status === 'not_integrated' ? 'collect_inputs' : 'unknown');
  const nextAction = args.nextAction || (requestMode === 'usage_help' ? 'usage_help' : requestMode === 'change_request' ? 'change_request' : 'collect_inputs');
  return {
    status: args.status,
    requestMode,
    source: args.source,
    media: args.media,
    appType: args.appType,
    matchedConfig: args.matchedConfig,
    reason: args.reason,
    nextAction,
  };
}

export async function lookupZhitouConfigCapability(
  input: LookupZhitouConfigCapabilityInput,
): Promise<CapabilityStatusResult> {
  const media = normalizeCapabilityMedia(input.media);
  const appType = normalizeCapabilityAppType(input.appType);

  if (!media) {
    return baseResult({
      status: 'unknown',
      source: 'default',
      media: '',
      appType,
      reason: '缺少媒体平台，无法查询智投配置报表。',
      requestMode: 'unknown',
      nextAction: 'ask_missing_media',
    });
  }
  if (!appType) {
    return baseResult({
      status: 'unknown',
      source: 'default',
      media,
      appType: '',
      reason: '缺少应用类型，无法查询智投配置报表。',
      requestMode: 'unknown',
      nextAction: 'ask_missing_app_type',
    });
  }

  const server = await getMcpServer(ZHITOU_CONFIG_MCP_ID);
  if (!server?.enabled || !server.endpoint_url) {
    return baseResult({
      status: 'unknown',
      source: 'zhitou_config_error',
      media,
      appType,
      reason: '智投配置 MCP 未配置或未启用。',
      requestMode: 'unknown',
      nextAction: 'collect_inputs',
    });
  }

  const args = {
    project_scope: input.projectScope?.length ? input.projectScope : DEFAULT_PROJECT_SCOPE,
    media_scope: [media],
    terminal: appType,
  };

  const result = await callMcpTool(server, ZHITOU_CONFIG_QUERY_TOOL, args, {
    timeout_ms: 12000,
    tool_policy: {
      allowedTools: [ZHITOU_CONFIG_QUERY_TOOL],
      fallbackPolicy: 'deny',
    },
    execution_contract: {
      requires_execution: true,
      execution_confidence: 'high',
      route_intent: 'demand_capability_status',
      route_reason: 'read zhitou config report by media and appType',
      expected_capability_id: 'zhitou_config_capability_status',
      expected_tool_name: ZHITOU_CONFIG_QUERY_TOOL,
    },
  });

  if (!result.ok) {
    return baseResult({
      status: 'unknown',
      source: 'zhitou_config_error',
      media,
      appType,
      reason: `智投配置 MCP 查询失败：${result.msg}`,
      requestMode: 'unknown',
      nextAction: 'collect_inputs',
    });
  }

  const matchedConfig = findMatchedConfig(result.result, media, appType);
  if (matchedConfig) {
    return baseResult({
      status: 'integrated',
      source: 'zhitou_config_report',
      media,
      appType,
      matchedConfig,
      reason: '智投配置报表存在该媒体与应用类型组合。',
      requestMode: 'usage_help',
      nextAction: 'usage_help',
    });
  }

  return baseResult({
    status: 'not_integrated',
    source: 'zhitou_config_report',
    media,
    appType,
    reason: '智投配置报表未找到该媒体与应用类型组合。',
    requestMode: 'collect_inputs',
    nextAction: 'collect_inputs',
  });
}

function readOverrideRegistry(): Record<string, { status: CapabilityStatus; reason?: string }> {
  const raw = process.env.XIAOQIAO_DEMAND_CAPABILITY_OVERRIDES;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed as Record<string, { status: CapabilityStatus; reason?: string }> : {};
  } catch {
    return {};
  }
}

function overrideKey(input: { media: string; appType: string; serviceType: ServiceIntakeType }): string {
  return [normalizeText(input.serviceType), normalizeText(input.media), normalizeText(input.appType)].join('|');
}

function applyOverride(result: CapabilityStatusResult, serviceType: ServiceIntakeType): CapabilityStatusResult {
  if (result.status !== 'not_integrated') return result;
  const registry = readOverrideRegistry();
  const override = registry[overrideKey({ media: result.media, appType: result.appType, serviceType })];
  if (!override || override.status !== 'integrated') return result;
  return {
    ...result,
    status: 'integrated',
    requestMode: 'usage_help',
    nextAction: 'usage_help',
    matchedConfig: {
      ...(result.matchedConfig || {}),
      override_registry: {
        status: override.status,
        reason: override.reason,
      },
    },
    reason: `${result.reason || '智投配置报表未命中'}；override registry 声明该组合已接好。`,
  };
}

export function detectDemandCapabilityRequestMode(
  message: string,
  status: CapabilityStatus,
): { requestMode: DemandCapabilityRequestMode; nextAction: DemandCapabilityNextAction } {
  if (status !== 'integrated') {
    return { requestMode: status === 'not_integrated' ? 'collect_inputs' : 'unknown', nextAction: 'collect_inputs' };
  }

  const text = normalizeText(message);
  if (/(更新|新增|变更|调整|升级|补充|修改|改造|增加)/.test(text)) {
    return { requestMode: 'change_request', nextAction: 'change_request' };
  }
  if (/(怎么用|如何配置|怎么配置|测试|验收|使用|配置方法|检查)/.test(text)) {
    return { requestMode: 'usage_help', nextAction: 'usage_help' };
  }

  return { requestMode: 'usage_help', nextAction: 'usage_help' };
}

export async function resolveDemandCapabilityStatus(
  input: ResolveDemandCapabilityStatusInput,
): Promise<CapabilityStatusResult | null> {
  if (!TARGET_SERVICE_TYPES.has(input.serviceType)) return null;

  const media = normalizeCapabilityMedia(input.media);
  const appType = normalizeCapabilityAppType(input.appType);
  if (!media) {
    return baseResult({
      status: 'unknown',
      source: 'default',
      media: '',
      appType,
      reason: '缺少媒体平台。',
      requestMode: 'unknown',
      nextAction: 'ask_missing_media',
    });
  }
  if (!appType) {
    return baseResult({
      status: 'unknown',
      source: 'default',
      media,
      appType: '',
      reason: '缺少应用类型。',
      requestMode: 'unknown',
      nextAction: 'ask_missing_app_type',
    });
  }

  const lookup = input.lookup || lookupZhitouConfigCapability;
  const lookedUp = await lookup({ media, appType, serviceType: input.serviceType, projectScope: input.projectScope });
  const withOverride = applyOverride(lookedUp, input.serviceType);
  const mode = detectDemandCapabilityRequestMode(input.message || '', withOverride.status);

  return {
    ...withOverride,
    media,
    appType,
    requestMode: mode.requestMode,
    nextAction: mode.nextAction,
  };
}

export function getCapabilityStatus(serviceType: ServiceIntakeType): CapabilityStatusResult {
  return baseResult({
    status: 'unknown',
    source: 'default',
    media: '',
    appType: '',
    reason: `未执行 ${serviceType} 的智投配置报表查询。`,
    requestMode: 'unknown',
    nextAction: 'collect_inputs',
  });
}

export function getCapabilityStatusAction(status: IntegrationStatus): {
  action: 'help' | 'demand_intake' | 'collect_info';
  message: string;
} {
  if (status === 'integrated') {
    return { action: 'help', message: '能力已接好，可以进入使用帮助流程。' };
  }
  if (status === 'not_integrated') {
    return { action: 'demand_intake', message: '能力未接好，进入需求收集流程。' };
  }
  return { action: 'collect_info', message: '能力状态未知，需要补充信息确认。' };
}
