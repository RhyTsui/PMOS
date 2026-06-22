import type { McpServerConfig, McpToolConfig } from '@/types';
import {
  identifierKeyForEntityType,
  type EntityType,
  type IdentifierKey,
} from '@/contracts/request-understanding/entity-resolution';
import {
  loadReportCapabilityOverridesSync,
  type ReportCapabilityOverride,
} from './report-capability-override-store';
import type { DictionaryOutputAdapterConfig } from './mcp-tool-output-adapter';
import type { ServiceIntent, ToolPurpose } from '@/contracts/request-understanding/route-decision-contract';

export type ReportCapabilityDomain =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'hourly'
  | 'roi'
  | 'retention'
  | 'dictionary'
  | 'project';

export type ReportCapabilityConfidence = 'schema_confirmed' | 'description_inferred' | 'manual_override';
export type CapabilityKind =
  | 'identifier_normalization'
  | 'context_lookup'
  | 'knowledge_lookup'
  | 'report_query'
  | 'workflow'
  | 'general';

export type CapabilityMismatchType =
  | 'capability_kind_mismatch'
  | 'entity_type_mismatch'
  | 'identifier_key_mismatch'
  | 'role_mismatch'
  | 'domain_mismatch'
  | 'input_schema_mismatch'
  | 'output_schema_mismatch'
  | 'capability_unavailable';

export interface CapabilityExpectation {
  expectedCapabilityKind: CapabilityKind;
  expectedEntityType?: EntityType;
  expectedIdentifierKey?: IdentifierKey;
  requiredRole?: string;
  expectedDomains?: ReportCapabilityDomain[];
  reason: string;
}

export interface CapabilityMismatch {
  type: CapabilityMismatchType;
  reason: string;
  expected?: unknown;
  actual?: unknown;
  capability_id?: string;
  tool_name?: string;
}

export interface RejectedCapabilityTool {
  capability_id: string;
  tool_name: string;
  server_name: string;
  capability_kind: CapabilityKind;
  mismatchReason: CapabilityMismatch[];
}

export interface CapabilitySlotMapping {
  entity_type: EntityType;
  identifier_key: IdentifierKey;
  target_keys: string[];
  value_format?: 'array' | 'string' | 'csv';
  required?: boolean;
}

export interface ReportToolCapability {
  capability_id: string;
  server_id: string;
  server_name: string;
  tool_name: string;
  description: string;
  report_domains: ReportCapabilityDomain[];
  required_fields: string[];
  optional_fields: string[];
  supported_granularity: Array<'hour' | 'day' | 'natural_week' | 'natural_month'>;
  supported_dimensions: string[];
  supported_entity_types: EntityType[];
  identifier_keys: IdentifierKey[];
  label_keys: string[];
  output_adapter?: DictionaryOutputAdapterConfig;
  slot_mappings?: CapabilitySlotMapping[];
  required_dictionary_tools: string[];
  route_terms: string[];
  confidence: ReportCapabilityConfidence;
  capability_kind: CapabilityKind;
  supported_service_intents: ServiceIntent[];
  tool_purpose: ToolPurpose;
  contract_version: 'capability-contract/v1';
  selection_policy_id: string;
  report_shape: {
    shape_type: 'table' | 'timeseries' | 'dictionary' | 'project_lookup' | 'generic';
    report_domains: ReportCapabilityDomain[];
    supported_granularity: Array<'hour' | 'day' | 'natural_week' | 'natural_month'>;
  };
  projection_contract: {
    display_fields: string[];
  };
  grouping_contract: {
    supported_dimensions: string[];
    time_dimension_keys: string[];
    allow_unrequested_specialized_grouping: boolean;
  };
  question_type_coverage: Array<{
    question_type: string;
    coverage: 'full' | 'partial' | 'none';
  }>;
  authority?: {
    authoritative_for: IdentifierKey[];
  };
}

type ToolWithCapabilityMetadata = McpToolConfig & {
  supportedServiceIntents?: ServiceIntent[];
  toolPurpose?: ToolPurpose;
};

export interface ReportCapabilityManifest {
  manifest_version: string;
  generated_at: string;
  tools: ReportToolCapability[];
  dictionary_tools: ReportToolCapability[];
  warnings: Array<{
    code: string;
    message: string;
    server_id?: string;
    tool_name?: string;
  }>;
}

const ENTITY_IDENTIFIER_MAP: Record<EntityType, IdentifierKey> = {
  media: 'media_id',
  app: 'app_id',
  campaign: 'campaign_id',
  material: 'material_id',
  account: 'account_id',
  team: 'team_id',
  app_package_type: 'app_package_type',
  package: 'app_package_id',
  terminal: 'terminal_id',
  terminal_os: 'os_type',
};

const IDENTIFIER_ENTITY_MAP = Object.fromEntries(
  Object.entries(ENTITY_IDENTIFIER_MAP).map(([entityType, identifierKey]) => [identifierKey, entityType]),
) as Record<IdentifierKey, EntityType>;

function normalize(value: unknown): string {
  return String(value || '').toLowerCase();
}

function schemaProperties(tool: McpToolConfig): Record<string, unknown> {
  const properties = (tool.input_schema || {}).properties;
  return properties && typeof properties === 'object' && !Array.isArray(properties)
    ? properties as Record<string, unknown>
    : {};
}

function schemaRequired(tool: McpToolConfig): string[] {
  const required = tool.input_schema?.required;
  return Array.isArray(required) ? required.map(String) : [];
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(term.toLowerCase()));
}

function inferToolPurpose(text: string, tool: McpToolConfig): ToolPurpose {
  const schemaText = normalizedSchemaFields(tool).join(' ');
  const packageTypeOnly = /app[_-]?package[_-]?type|apppackagetype|package[_-]?type|packagetype/.test(text)
    || /apppackagetype|packagetype/.test(schemaText);
  const packageTerm = /package|pkg|apk|ipa|bundle|\u5305\u4f53|\u5206\u5305|\u5b89\u88c5\u5305/.test(text)
    || /packageid|apppackageid|pkgid/.test(schemaText);
  const packageOperation = /detail|list|download|url|address|version|status|audit|review|available|cps|\u660e\u7ec6|\u5217\u8868|\u4e0b\u8f7d|\u5730\u5740|\u7248\u672c|\u72b6\u6001|\u5ba1\u6838|\u53ef\u7528/.test(text);
  if (packageTerm && packageOperation && !packageTypeOnly) return 'package_fetch';
  if (/integration|integrat|workflow|step|screenshot|screen[_ -]?shot|status|log|record|\u8054\u8c03|\u6b65\u9aa4|\u622a\u56fe|\u72b6\u6001|\u65e5\u5fd7|\u8bb0\u5f55/.test(text)) return 'integration_run';
  if (/config|setting|permission|auth|check|operation|operate|\u914d\u7f6e|\u6743\u9650|\u68c0\u67e5|\u64cd\u4f5c/.test(text)) return 'config_check';
  if (/report|rpt|daily|weekly|monthly/.test(text)) return 'report_generate';
  return 'data_fetch';
}

function inferSupportedServiceIntents(toolPurpose: ToolPurpose, capabilityKind: CapabilityKind): ServiceIntent[] {
  if (toolPurpose === 'package_fetch') return ['package_fetch', 'system_operation'];
  if (toolPurpose === 'integration_run') return ['integration_workflow', 'system_operation'];
  if (toolPurpose === 'config_check' || toolPurpose === 'log_check') return ['system_operation'];
  if (toolPurpose === 'report_generate' || toolPurpose === 'report_schedule') return ['data_query', 'report_delivery'];
  if (capabilityKind === 'report_query') return ['data_query'];
  return [];
}

function isReportExecutionPurpose(toolPurpose: ToolPurpose): boolean {
  return toolPurpose === 'data_fetch'
    || toolPurpose === 'report_generate'
    || toolPurpose === 'report_schedule';
}

function normalizeIdentifierKey(value: string): IdentifierKey | null {
  const normalized = value
    .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    .replace(/__+/g, '_')
    .toLowerCase();
  const aliases: Record<string, IdentifierKey> = {
    mediaid: 'media_id',
    media_id: 'media_id',
    mediaids: 'media_id',
    media_ids: 'media_id',
    appid: 'app_id',
    app_id: 'app_id',
    projectid: 'app_id',
    project_id: 'app_id',
    campaignid: 'campaign_id',
    campaign_id: 'campaign_id',
    groupid: 'campaign_id',
    group_id: 'campaign_id',
    materialid: 'material_id',
    material_id: 'material_id',
    creativeid: 'material_id',
    creative_id: 'material_id',
    accountid: 'account_id',
    account_id: 'account_id',
    teamid: 'team_id',
    team_id: 'team_id',
    teamids: 'team_id',
    team_ids: 'team_id',
    apppackagetype: 'app_package_type',
    app_package_type: 'app_package_type',
    apppackagetypes: 'app_package_type',
    app_package_types: 'app_package_type',
    packagetype: 'app_package_type',
    package_type: 'app_package_type',
    packagetypes: 'app_package_type',
    package_types: 'app_package_type',
    packageid: 'app_package_id',
    package_id: 'app_package_id',
    apppackageid: 'app_package_id',
    app_package_id: 'app_package_id',
    pkgid: 'app_package_id',
    pkg_id: 'app_package_id',
    pkgids: 'app_package_id',
    pkg_ids: 'app_package_id',
    terminalid: 'terminal_id',
    terminal_id: 'terminal_id',
    ostype: 'os_type',
    os_type: 'os_type',
    ostypes: 'os_type',
    os_types: 'os_type',
  };
  return aliases[normalized] || aliases[normalized.replace(/_/g, '')] || null;
}

function inferDomains(server: McpServerConfig, tool: McpToolConfig): ReportCapabilityDomain[] {
  const toolName = tool.name.toLowerCase();
  if (/get_.*retention.*report/.test(toolName)) return ['retention'];
  if (/get_.*roi.*report/.test(toolName)) return ['roi'];
  if (/get_.*hour.*report/.test(toolName)) return ['hourly'];
  if (/get_.*(day|daily).*report/.test(toolName)) return ['daily', 'weekly', 'monthly'];
  const text = normalize([
    server.id,
    server.name,
    server.description,
    server.tags?.join(' '),
    server.business_domains?.join(' '),
    tool.name,
    tool.description,
  ].join(' '));
  const domains = new Set<ReportCapabilityDomain>();
  if (includesAny(text, ['list_all_apps', 'app_list', 'project list', 'application list', '应用列表', '项目列表'])) domains.add('project');
  if (includesAny(text, ['get_dict_', 'dictionary', 'dict_', '字典', '列表'])) domains.add('dictionary');
  if (includesAny(text, ['hour', 'hourly', '小时', '分时', '实时'])) domains.add('hourly');
  if (includesAny(text, ['roi', 'roas', '回收', '投入产出'])) domains.add('roi');
  if (includesAny(text, ['retention', '留存', '次留', 'arppu'])) domains.add('retention');
  if (includesAny(text, ['week', 'natural_week', '周报'])) domains.add('weekly');
  if (includesAny(text, ['month', 'natural_month', '月报'])) domains.add('monthly');
  if (includesAny(text, ['day_report', 'daily', '日报', '报表', '消耗', '投放'])) domains.add('daily');
  if (hasDateRangeShape(tool) && includesAny(text, ['report', 'metric', 'analytics', 'analysis', 'trend', '报表', '指标', '分析', '趋势'])) domains.add('daily');
  if (domains.size === 0 && includesAny(text, ['query', 'search', 'analysis', 'analytics', 'trend', 'metric', 'table', 'chart', 'summary', 'detail', 'report', 'data', 'list', 'fetch', 'get'])) domains.add('daily');
  return Array.from(domains);
}

function isOperationalOrCheckTool(server: McpServerConfig, tool: McpToolConfig): boolean {
  const text = normalize([
    server.id,
    server.name,
    server.description,
    tool.name,
    tool.description,
  ].join(' '));
  if (includesAny(text, ['dictionary', 'dict_', 'get_dict_', 'list_all_apps', '应用列表', '项目列表'])) return false;
  return includesAny(text, [
    'check_callback_config',
    'event_report_check',
    'media_config.',
    'parse_template',
    'analyze_attribution_stats',
    'attribution',
    'backflow',
    'app_check',
    'config_check',
    'callback',
    'postback',
    'tracking',
    'debug',
    'diagnos',
    '配置检查',
    '回传',
    '联调',
    '诊断',
    '检查',
  ]);
}

function isCapabilityCandidateTool(server: McpServerConfig, tool: McpToolConfig, domains: ReportCapabilityDomain[]): boolean {
  if (domains.includes('dictionary') || domains.includes('project')) return true;
  const text = normalize([
    server.id,
    server.name,
    server.description,
    server.tags?.join(' '),
    server.business_domains?.join(' '),
    tool.name,
    tool.description,
  ].join(' '));
  return includesAny(text, ['query', 'search', 'analysis', 'analytics', 'trend', 'metric', 'table', 'chart', 'summary', 'detail', 'report', 'data', 'list', 'fetch', 'get'])
    || schemaRequired(tool).length > 0
    || Object.keys(schemaProperties(tool)).length > 0;
}

function inferGranularity(domains: ReportCapabilityDomain[]): ReportToolCapability['supported_granularity'] {
  const output = new Set<ReportToolCapability['supported_granularity'][number]>();
  if (domains.includes('hourly')) output.add('hour');
  if (domains.some(domain => ['daily', 'roi', 'retention'].includes(domain))) output.add('day');
  if (domains.includes('weekly')) output.add('natural_week');
  if (domains.includes('monthly')) output.add('natural_month');
  return Array.from(output);
}

function inferDictionaryDependencies(tool: McpToolConfig): string[] {
  const fields = [...schemaRequired(tool), ...Object.keys(schemaProperties(tool))];
  const dependencies = new Set<string>();
  if (fields.some(field => /media/i.test(field))) dependencies.add('media_dictionary');
  if (fields.some(field => /os|terminal|device/i.test(field))) dependencies.add('terminal_dictionary');
  if (fields.some(field => /team/i.test(field))) dependencies.add('team_dictionary');
  if (fields.some(field => /account/i.test(field))) dependencies.add('account_dictionary');
  if (fields.some(field => /appPackageType|app_package_type|packageType|package_type/i.test(field))) dependencies.add('app_package_type_dictionary');
  if (fields.some(field => /package|pkg/i.test(field)) && !fields.some(field => /appPackageType|app_package_type|packageType|package_type/i.test(field))) dependencies.add('package_dictionary');
  if (fields.some(field => /optimizer|user/i.test(field))) dependencies.add('optimizer_dictionary');
  return Array.from(dependencies);
}

function inferRouteTerms(tool: McpToolConfig, domains: ReportCapabilityDomain[]): string[] {
  const terms = new Set<string>(domains);
  for (const part of tool.name.split(/[_\-.]+/)) {
    if (part.length >= 3) terms.add(part);
  }
  if (domains.includes('hourly')) ['小时', '分时', '实时'].forEach(term => terms.add(term));
  if (domains.includes('roi')) ['ROI', 'ROAS', '回收', '首日'].forEach(term => terms.add(term));
  if (domains.includes('retention')) ['留存', '次留', 'ARPPU'].forEach(term => terms.add(term));
  if (tool.description) {
    const cnTerms = tool.description.match(/[一-龥]{2,4}/g) || [];
    for (const term of cnTerms) {
      if (term.length >= 2 && !/^(查询|获取|返回|支持|提供|包含|参数|输入|输出|接口|工具|数据|报表|信息)$/.test(term)) {
        terms.add(term);
      }
    }
  }
  const propKeys = Object.keys(schemaProperties(tool));
  for (const key of propKeys) {
    if (/retention|留存/i.test(key)) ['留存', '次留'].forEach(term => terms.add(term));
    if (/roi|roas/i.test(key)) ['ROI', 'ROAS'].forEach(term => terms.add(term));
    if (/hour/i.test(key)) ['小时', '分时'].forEach(term => terms.add(term));
  }
  return Array.from(terms);
}

function inferDimensions(tool: McpToolConfig): string[] {
  const keys = Object.keys(schemaProperties(tool));
  return keys.filter(key => /media|team|account|appPackageType|app_package_type|package|pkg|optimizer|os|terminal|material|creative|campaign|group|date/i.test(key));
}

function inferDisplayFields(tool: McpToolConfig): string[] {
  const keys = Object.keys(schemaProperties(tool));
  const preferred = keys.filter(key => /date|day|hour|cost|spend|roi|roas|revenue|retention|activation|register|payment|media|team|account|material|creative|campaign|package|os|terminal/i.test(key));
  return Array.from(new Set(preferred.length ? preferred : keys)).slice(0, 24);
}

function inferShapeType(domains: ReportCapabilityDomain[]): ReportToolCapability['report_shape']['shape_type'] {
  if (domains.includes('dictionary')) return 'dictionary';
  if (domains.includes('project')) return 'project_lookup';
  if (domains.includes('hourly') || domains.includes('daily') || domains.includes('weekly') || domains.includes('monthly')) return 'timeseries';
  if (domains.includes('roi') || domains.includes('retention')) return 'table';
  return 'generic';
}

function inferQuestionTypeCoverage(domains: ReportCapabilityDomain[]): ReportToolCapability['question_type_coverage'] {
  const questionTypes = ['daily', 'hour', 'roi', 'retention'] as const;
  return questionTypes.map(questionType => {
    const covered = questionType === 'hour'
      ? domains.includes('hourly')
      : domains.includes(questionType);
    const partial = questionType === 'daily'
      && domains.some(domain => ['weekly', 'monthly'].includes(domain));
    return {
      question_type: questionType,
      coverage: covered ? 'full' : partial ? 'partial' : 'none',
    };
  });
}

function identifierKeysFromText(text: string): IdentifierKey[] {
  const identifiers = new Set<IdentifierKey>();
  if (/\bmedia\b|media[_-]?id|媒体/.test(text)) identifiers.add('media_id');
  if (/\bapp\b|app[_-]?id|\bproject\b|project[_-]?id|应用|项目/.test(text)) identifiers.add('app_id');
  if (/\bcampaign\b|campaign[_-]?id|\bgroup\b|group[_-]?id|计划/.test(text)) identifiers.add('campaign_id');
  if (/\bmaterial\b|material[_-]?id|\bcreative\b|creative[_-]?id|素材|创意/.test(text)) identifiers.add('material_id');
  if (/\baccount\b|account[_-]?id|账户/.test(text)) identifiers.add('account_id');
  if (/\bteam\b|team[_-]?id|团队/.test(text)) identifiers.add('team_id');
  if (/\bpackage\b|package[_-]?id|\bpkg\b|pkg[_-]?id|app[_-]?package|包体|包名/.test(text)) identifiers.add('app_package_id');
  if (/\bos\b|os[_-]?type|\bandroid\b|\bios\b|安卓|苹果/.test(text)) identifiers.add('os_type');
  if (/\bterminal\b|terminal[_-]?id|终端/.test(text)) identifiers.add('terminal_id');
  return Array.from(identifiers);
}

function inferPrimaryEntityTypes(server: McpServerConfig, tool: McpToolConfig): EntityType[] {
  const text = normalize([
    server.id,
    server.name,
    server.description,
    tool.name,
    tool.description,
  ].join(' '));
  const entities = new Set<EntityType>();
  if (/\bmedia\b|media[_-]?(dict|dictionary|list|name)|媒体/.test(text)) entities.add('media');
  if (/\bteam\b|team[_-]?(dict|dictionary|list|name)|团队/.test(text)) entities.add('team');
  if (/\baccount\b|account[_-]?(dict|dictionary|list|name)|账户/.test(text)) entities.add('account');
  if (/\bcampaign\b|campaign[_-]?(dict|dictionary|list|name)|\bgroup\b|计划/.test(text)) entities.add('campaign');
  if (/\bmaterial\b|material[_-]?(dict|dictionary|list|name)|\bcreative\b|素材|创意/.test(text)) entities.add('material');
  if (/\bos\b|os[_-]?type|\bandroid\b|\bios\b|安卓|苹果/.test(text)) entities.add('terminal_os');
  if (/\bterminal\b|terminal[_-]?(dict|dictionary|list|name)|终端|终端/.test(text)) entities.add('terminal');
  if (/\bpackage\b|\bpkg\b|app[_-]?package|channel[_-]?package|包体|包名/.test(text)) entities.add('package');
  if (/\bapp\b|app[_-]?(dict|dictionary|list|name)|\bproject\b|应用|项目/.test(text)) entities.add('app');
  return Array.from(entities);
}

function inferIdentifierKeys(server: McpServerConfig, tool: McpToolConfig, primaryEntityTypes = inferPrimaryEntityTypes(server, tool)): IdentifierKey[] {
  const schemaKeys = [...schemaRequired(tool), ...Object.keys(schemaProperties(tool))];
  const text = normalize([
    server.id,
    server.name,
    server.description,
    tool.name,
    tool.description,
  ].join(' '));
  const identifiers = new Set<IdentifierKey>();
  if (/app[_-]?package[_-]?type|package[_-]?type/.test(text)) identifiers.add('app_package_type');
  for (const identifier of identifierKeysFromText(text)) identifiers.add(identifier);
  for (const field of schemaKeys) {
    const exact = normalizeIdentifierKey(field);
    const entityType = exact ? IDENTIFIER_ENTITY_MAP[exact] : undefined;
    if (exact && entityType && primaryEntityTypes.includes(entityType)) identifiers.add(exact);
  }
  return Array.from(identifiers);
}

function inferSupportedEntityTypes(identifierKeys: IdentifierKey[]): EntityType[] {
  return Array.from(new Set(identifierKeys.map(identifier => IDENTIFIER_ENTITY_MAP[identifier]).filter(Boolean)));
}

function inferLabelKeys(tool: McpToolConfig): string[] {
  const keys = [...schemaRequired(tool), ...Object.keys(schemaProperties(tool))];
  return Array.from(new Set(keys.filter(key => /name|label|title|text|display/i.test(key))));
}

function inferSlotMappings(tool: McpToolConfig): CapabilitySlotMapping[] {
  const mappings = new Map<string, CapabilitySlotMapping>();
  for (const field of Object.keys(schemaProperties(tool))) {
    const identifierKey = normalizeIdentifierKey(field);
    if (!identifierKey) continue;
    const entityType = IDENTIFIER_ENTITY_MAP[identifierKey];
    if (!entityType) continue;
    const key = `${entityType}:${identifierKey}`;
    const existing = mappings.get(key);
    if (existing) {
      existing.target_keys.push(field);
    } else {
      mappings.set(key, {
        entity_type: entityType,
        identifier_key: identifierKey,
        target_keys: [field],
      });
    }
  }
  return Array.from(mappings.values()).map(mapping => ({
    ...mapping,
    target_keys: Array.from(new Set(mapping.target_keys)),
  }));
}

function hasDateRangeShape(tool: McpToolConfig): boolean {
  const fields = [...schemaRequired(tool), ...Object.keys(schemaProperties(tool))].map(key => normalize(key));
  return fields.some(key => /^(start[_-]?date|starttime|begin[_-]?date)$/.test(key))
    && fields.some(key => /^(end[_-]?date|endtime|finish[_-]?date)$/.test(key));
}

function normalizedSchemaFields(tool: McpToolConfig): string[] {
  return [...schemaRequired(tool), ...Object.keys(schemaProperties(tool))].map(key =>
    key
      .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      .replace(/__+/g, '_')
      .toLowerCase()
      .replace(/_/g, ''),
  );
}

function hasExecutableReportShape(tool: McpToolConfig, domains: ReportCapabilityDomain[]): boolean {
  const reportDomains: ReportCapabilityDomain[] = ['daily', 'weekly', 'monthly', 'hourly', 'roi', 'retention'];
  if (!domains.some(domain => reportDomains.includes(domain))) return false;
  const fields = normalizedSchemaFields(tool);
  if (fields.length === 0) return false;
  const hasProjectField = fields.some(field => field === 'appid' || field === 'projectid');
  const hasTimeField = hasDateRangeShape(tool)
    || fields.some(field => ['daterange', 'timerange', 'timetype', 'basetimetype', 'granularity', 'reporttype'].includes(field));
  const hasReportControlField = fields.some(field =>
    /metric|dimension|subgroup|mediaid|teamid|accountid|ostype|terminal|campaign|material|creative|promotion/.test(field),
  );
  return hasProjectField && hasTimeField && hasReportControlField;
}

export function isExecutableReportCapability(capability: ReportToolCapability): boolean {
  const reportDomains: ReportCapabilityDomain[] = ['daily', 'weekly', 'monthly', 'hourly', 'roi', 'retention'];
  const reportServiceIntent = capability.supported_service_intents.some(intent => intent === 'data_query' || intent === 'report_delivery');
  return capability.capability_kind === 'report_query'
    && reportServiceIntent
    && isReportExecutionPurpose(capability.tool_purpose)
    && (
      hasExecutableReportShape({
      tool_id: capability.tool_name,
      name: capability.tool_name,
      description: capability.description,
      input_schema: {
        type: 'object',
        required: capability.required_fields,
        properties: Object.fromEntries([...capability.required_fields, ...capability.optional_fields].map(field => [field, {}])),
      },
      enabled: true,
      bound_agents: [],
      access_mode: 'read',
      call_count: 0,
      }, capability.report_domains)
      || (
        capability.tool_purpose !== 'data_fetch'
        && capability.report_domains.some(domain => reportDomains.includes(domain))
      )
    );
}

function isReportQueryShape(text: string, tool: McpToolConfig): boolean {
  const name = normalize(tool.name);
  if (/^get_dict[_-]/.test(name) || /dictionary|字典|列表/.test(text)) return false;
  const fields = [...schemaRequired(tool), ...Object.keys(schemaProperties(tool))].map(key => normalize(key));
  const hasMetricOrDimensionField = fields.some(key => /metric|dimension|granularity|time[_-]?type|sub[_-]?group/.test(key));
  if (/report|rpt|trend|analysis|analytics|summary|detail|stat|stats|metric|table|chart|roi|retention|ltv|activity/.test(name)) return true;
  if (/get_.*_(day|hour|roi|retention|ltv|activity|account|adset|ad|mat|keyword|live|report|rpt)/.test(name)) return true;
  if (hasDateRangeShape(tool) && (/report|rpt|trend|metric|analytics|analysis|summary|detail|table|chart|data|query|报表|查询|分析|数据|消耗|激活|注册|付费|转化/.test(text) || hasMetricOrDimensionField)) return true;
  return false;
}

function isIdentifierNormalizationShape(
  text: string,
  tool: McpToolConfig,
  domains: ReportCapabilityDomain[],
  identifierKeys: IdentifierKey[],
  labelKeys: string[],
): boolean {
  if (!identifierKeys.length || isReportQueryShape(text, tool)) return false;
  const name = normalize(tool.name);
  const dictionaryLike = domains.includes('dictionary')
    || /^get_dict[_-]/.test(name)
    || /dictionary|dict|lookup|list|search|select|option|enum|mapping|map|字典|列表|枚举|映射|名称|媒体id/.test(text);
  const hasLabelSignal = labelKeys.length > 0
    || /^get_dict[_-]/.test(name)
    || /name|label|title|display|alias|名称|名字|中文名|别名/.test(text);
  return dictionaryLike && hasLabelSignal;
}

function inferCapabilityKind(
  text: string,
  domains: ReportCapabilityDomain[],
  identifierKeys: IdentifierKey[],
  labelKeys: string[],
  tool: McpToolConfig,
): CapabilityKind {
  if (/knowledge|search_knowledge|knowledge_search|知识库/.test(text)) return 'knowledge_lookup';
  if (domains.includes('project')) return 'context_lookup';
  if (hasExecutableReportShape(tool, domains)) return 'report_query';
  if (isReportQueryShape(text, tool) && domains.some(domain => ['daily', 'weekly', 'monthly', 'hourly', 'roi', 'retention'].includes(domain))) return 'report_query';
  if (
    /context|lookup|config|配置|上下文|证据/.test(text)
    || text.includes('attribution_app_media')
    || text.includes('sys_media')
  ) return 'context_lookup';
  if (isIdentifierNormalizationShape(text, tool, domains, identifierKeys, labelKeys)) return 'identifier_normalization';
  if (/workflow|flow|task/.test(text)) return 'workflow';
  if (!hasExecutableReportShape(tool, domains)) return 'general';
  if (/report|query|trend|table|chart|summary|detail|analysis|data|报表|查询|分析|数据/.test(text)) return 'report_query';
  return 'general';
}

function findCapabilityOverride(
  capability: ReportToolCapability,
  overrides: ReportCapabilityOverride[],
): ReportCapabilityOverride | undefined {
  return overrides.find(override => (
    override.capability_id === capability.capability_id
    || (override.server_id === capability.server_id && override.tool_name === capability.tool_name)
  ));
}

function applyCapabilityOverride(
  capability: ReportToolCapability,
  override?: ReportCapabilityOverride,
): ReportToolCapability {
  if (!override) return capability;
  const reportDomains = override.report_domains?.length ? override.report_domains : capability.report_domains;
  const supportedGranularity = inferGranularity(reportDomains);
  const supportedDimensions = capability.supported_dimensions;
  return {
    ...capability,
    capability_kind: override.capability_kind || capability.capability_kind,
    supported_entity_types: override.supported_entity_types?.length ? override.supported_entity_types : capability.supported_entity_types,
    identifier_keys: override.identifier_keys?.length ? override.identifier_keys : capability.identifier_keys,
    label_keys: override.label_keys?.length ? override.label_keys : capability.label_keys,
    output_adapter: override.output_adapter || capability.output_adapter,
    slot_mappings: override.slot_mappings?.length ? override.slot_mappings : capability.slot_mappings,
    report_domains: reportDomains,
    supported_granularity: supportedGranularity,
    report_shape: {
      ...capability.report_shape,
      shape_type: inferShapeType(reportDomains),
      report_domains: reportDomains,
      supported_granularity: supportedGranularity,
    },
    grouping_contract: {
      ...capability.grouping_contract,
      supported_dimensions: supportedDimensions,
      time_dimension_keys: supportedDimensions.filter(key => /date|day|hour|time/i.test(key)),
    },
    question_type_coverage: inferQuestionTypeCoverage(reportDomains),
    required_dictionary_tools: override.required_dictionary_tools?.length
      ? override.required_dictionary_tools
      : capability.required_dictionary_tools,
    route_terms: override.route_terms?.length
      ? Array.from(new Set([...capability.route_terms, ...override.route_terms]))
      : capability.route_terms,
    confidence: 'manual_override',
  };
}

export function buildNormalizationExpectation(entityType: EntityType): CapabilityExpectation {
  const identifierKey = identifierKeyForEntityType(entityType);
  return {
    expectedCapabilityKind: 'identifier_normalization',
    expectedEntityType: entityType,
    expectedIdentifierKey: identifierKey,
    requiredRole: entityType === 'terminal_os' ? 'os_identifier_normalization' : `${entityType}_identifier_normalization`,
    expectedDomains: ['dictionary'],
    reason: `Resolve ${entityType} to ${identifierKey} before calling downstream tools.`,
  };
}

export function validateCapabilityAgainstExpectation(
  capability: ReportToolCapability,
  expectation: CapabilityExpectation,
): CapabilityMismatch[] {
  const mismatches: CapabilityMismatch[] = [];
  const add = (type: CapabilityMismatchType, reason: string, expected?: unknown, actual?: unknown) => {
    mismatches.push({
      type,
      reason,
      expected,
      actual,
      capability_id: capability.capability_id,
      tool_name: capability.tool_name,
    });
  };

  if (capability.capability_kind !== expectation.expectedCapabilityKind) {
    add('capability_kind_mismatch', 'Capability kind does not match the task expectation.', expectation.expectedCapabilityKind, capability.capability_kind);
  }
  if (expectation.expectedEntityType && !capability.supported_entity_types.includes(expectation.expectedEntityType)) {
    add('entity_type_mismatch', 'Capability does not support the expected entity type.', expectation.expectedEntityType, capability.supported_entity_types);
  }
  if (expectation.expectedIdentifierKey && !capability.identifier_keys.includes(expectation.expectedIdentifierKey)) {
    add('identifier_key_mismatch', 'Capability does not return the expected identifier key.', expectation.expectedIdentifierKey, capability.identifier_keys);
  }
  if (expectation.expectedDomains?.length && !expectation.expectedDomains.some(domain => capability.report_domains.includes(domain))) {
    add('domain_mismatch', 'Capability domains do not satisfy the task expectation.', expectation.expectedDomains, capability.report_domains);
  }
  return mismatches;
}

export function buildReportCapabilityManifest(
  servers: McpServerConfig[],
  overrides = loadReportCapabilityOverridesSync(),
): ReportCapabilityManifest {
  const generatedAt = new Date().toISOString();
  const tools: ReportToolCapability[] = [];
  const dictionaryTools: ReportToolCapability[] = [];
  const warnings: ReportCapabilityManifest['warnings'] = [];
  const matchedOverrideIds = new Set<string>();

  for (const server of servers) {
    if (!server.enabled) continue;
    if (server.status !== 'connected') {
      warnings.push({ code: 'server_not_connected', message: `${server.name} is not connected.`, server_id: server.id });
    }
    if (!server.endpoint_url) {
      warnings.push({ code: 'server_endpoint_missing', message: `${server.name} is missing endpoint_url.`, server_id: server.id });
    }
    for (const tool of server.tools || []) {
      if (!tool.enabled || tool.access_mode === 'write') continue;
      const domains = inferDomains(server, tool);
      if (isOperationalOrCheckTool(server, tool) && !domains.includes('dictionary') && !domains.includes('project')) continue;
      if (domains.length === 0 && !isCapabilityCandidateTool(server, tool, domains)) continue;
      const properties = Object.keys(schemaProperties(tool));
      const required = schemaRequired(tool);
      const identifierKeys = inferIdentifierKeys(server, tool);
      const capabilityText = normalize([
        server.id,
        server.name,
        server.description,
        tool.name,
        tool.description,
        JSON.stringify(schemaProperties(tool)),
      ].join(' '));
      const labelKeys = inferLabelKeys(tool);
      const supportedGranularity = inferGranularity(domains);
      const supportedDimensions = inferDimensions(tool);
      const metadata = tool as ToolWithCapabilityMetadata;
      const toolPurpose = metadata.toolPurpose || inferToolPurpose(capabilityText, tool);
      const inferredCapabilityKind = inferCapabilityKind(capabilityText, domains, identifierKeys, labelKeys, tool);
      const capabilityKind: CapabilityKind = isReportExecutionPurpose(toolPurpose)
        ? inferredCapabilityKind
        : toolPurpose === 'integration_run'
          ? 'workflow'
          : 'general';
      const capability: ReportToolCapability = {
        capability_id: `${server.id}:${tool.name}`,
        server_id: server.id,
        server_name: server.name,
        tool_name: tool.name,
        description: tool.description,
        report_domains: domains,
        required_fields: required,
        optional_fields: properties.filter(key => !required.includes(key)),
        supported_granularity: supportedGranularity,
        supported_dimensions: supportedDimensions,
        supported_entity_types: inferSupportedEntityTypes(identifierKeys),
        identifier_keys: identifierKeys,
        label_keys: labelKeys,
        slot_mappings: inferSlotMappings(tool),
        required_dictionary_tools: inferDictionaryDependencies(tool),
        route_terms: inferRouteTerms(tool, domains),
        confidence: required.length || properties.length ? 'schema_confirmed' : 'description_inferred',
        capability_kind: capabilityKind,
        supported_service_intents: metadata.supportedServiceIntents || inferSupportedServiceIntents(toolPurpose, capabilityKind),
        tool_purpose: toolPurpose,
        contract_version: 'capability-contract/v1',
        selection_policy_id: 'manifest:' + server.id + ':' + tool.name,
        report_shape: {
          shape_type: inferShapeType(domains),
          report_domains: domains,
          supported_granularity: supportedGranularity,
        },
        projection_contract: {
          display_fields: inferDisplayFields(tool),
        },
        grouping_contract: {
          supported_dimensions: supportedDimensions,
          time_dimension_keys: supportedDimensions.filter(key => /date|day|hour|time/i.test(key)),
          allow_unrequested_specialized_grouping: false,
        },
        question_type_coverage: inferQuestionTypeCoverage(domains),
        authority: identifierKeys.length ? { authoritative_for: identifierKeys } : undefined,
      };
      const override = findCapabilityOverride(capability, overrides);
      if (override) matchedOverrideIds.add(override.id);
      const finalCapability = applyCapabilityOverride(capability, override);
      if (finalCapability.capability_kind === 'identifier_normalization') {
        if (!finalCapability.supported_entity_types.length) {
          warnings.push({ code: 'capability_contract_incomplete', message: `${finalCapability.tool_name} is missing supported_entity_types.`, server_id: finalCapability.server_id, tool_name: finalCapability.tool_name });
        }
        if (!finalCapability.identifier_keys.length) {
          warnings.push({ code: 'capability_contract_incomplete', message: `${finalCapability.tool_name} is missing identifier_keys.`, server_id: finalCapability.server_id, tool_name: finalCapability.tool_name });
        }
      }
      if (finalCapability.capability_kind === 'identifier_normalization' || finalCapability.report_domains.includes('project')) {
        dictionaryTools.push(finalCapability);
      } else {
        tools.push(finalCapability);
      }
    }
  }

  for (const override of overrides) {
    if (!matchedOverrideIds.has(override.id)) {
      warnings.push({
        code: 'manual_override_unmatched',
        message: `Capability override did not match a runtime tool: ${override.capability_id || `${override.server_id}:${override.tool_name}`}`,
        server_id: override.server_id,
        tool_name: override.tool_name,
      });
    }
  }

  return {
    manifest_version: `report-manifest:${generatedAt}:${tools.length}:${dictionaryTools.length}`,
    generated_at: generatedAt,
    tools,
    dictionary_tools: dictionaryTools,
    warnings,
  };
}

export function findRuntimeToolByCapability(
  servers: McpServerConfig[],
  capability: ReportToolCapability,
): { server: McpServerConfig; tool: McpToolConfig } | null {
  const server = servers.find(item => item.id === capability.server_id);
  const tool = server?.tools?.find(item => item.name === capability.tool_name);
  return server && tool ? { server, tool } : null;
}

export function selectNormalizationCapabilities(
  servers: McpServerConfig[],
  entityType: EntityType,
  message = '',
  overrides = loadReportCapabilityOverridesSync(),
): {
  expectation: CapabilityExpectation;
  candidates: Array<{ capability: ReportToolCapability; server: McpServerConfig; tool: McpToolConfig; score: number; reason: string }>;
  rejectedTools: RejectedCapabilityTool[];
  manifest: ReportCapabilityManifest;
} {
  const manifest = buildReportCapabilityManifest(servers, overrides);
  const expectation = buildNormalizationExpectation(entityType);
  const normalizedMessage = normalize(message);
  const rejectedTools: RejectedCapabilityTool[] = [];
  const candidates = [...manifest.dictionary_tools, ...manifest.tools]
    .map((capability) => {
      const mismatches = validateCapabilityAgainstExpectation(capability, expectation);
      if (mismatches.length) {
        rejectedTools.push({
          capability_id: capability.capability_id,
          tool_name: capability.tool_name,
          server_name: capability.server_name,
          capability_kind: capability.capability_kind,
          mismatchReason: mismatches,
        });
        return null;
      }
      const runtimeTool = findRuntimeToolByCapability(servers, capability);
      if (!runtimeTool) {
        rejectedTools.push({
          capability_id: capability.capability_id,
          tool_name: capability.tool_name,
          server_name: capability.server_name,
          capability_kind: capability.capability_kind,
          mismatchReason: [{
            type: 'capability_unavailable',
            reason: 'Runtime tool is unavailable for the accepted capability.',
            capability_id: capability.capability_id,
            tool_name: capability.tool_name,
          }],
        });
        return null;
      }
      const routeHits = capability.route_terms.filter(term => normalizedMessage.includes(term.toLowerCase()));
      const authorityHit = expectation.expectedIdentifierKey && capability.authority?.authoritative_for.includes(expectation.expectedIdentifierKey) ? 40 : 0;
      return {
        capability,
        server: runtimeTool.server,
        tool: runtimeTool.tool,
        score: 100 + authorityHit + (routeHits.length * 15),
        reason: routeHits.length ? `terms:${routeHits.join(',')}` : `contract:${expectation.expectedCapabilityKind}`,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.score - a.score);

  return { expectation, candidates, rejectedTools, manifest };
}

export function findNormalizationCapabilityCandidates(
  servers: McpServerConfig[],
  entityType: EntityType,
  message = '',
): Array<{ capability: ReportToolCapability; server: McpServerConfig; tool: McpToolConfig; score: number; reason: string }> {
  return selectNormalizationCapabilities(servers, entityType, message).candidates;
}
