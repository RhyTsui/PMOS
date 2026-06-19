import type { McpServerConfig, McpToolConfig } from '@/types';
import type {
  CapabilityManifest,
  SemanticCapabilityEvidence,
  SemanticCapabilitySurface,
  SemanticDimensionSupport,
  SemanticGranularitySupport,
  SemanticMetricSupport,
} from '../capability/capability-manifest';

type ToolWithCapabilityMetadata = McpToolConfig & {
  displayName?: string;
  examples?: string[];
  aliases?: string[];
  triggerHints?: string[];
  supportedServiceIntents?: CapabilityManifest['supportedServiceIntents'];
  toolPurpose?: CapabilityManifest['toolPurpose'];
  primaryGoal?: string;
  defaultInputs?: Record<string, unknown>;
  resolverDependencies?: CapabilityManifest['resolverDependencies'];
  outputContract?: CapabilityManifest['outputContract'];
  errorTaxonomy?: CapabilityManifest['errorTaxonomy'];
};

type ServiceIntent = NonNullable<CapabilityManifest['supportedServiceIntents']>[number];

const COMMON_REPORT_METRICS: Array<{
  key: string;
  variant?: 'd1' | 'standard';
  patterns: RegExp[];
}> = [
  {
    key: 'd1_roi',
    variant: 'd1',
    patterns: [
      /d1[_ -]?roi|roi[_ -]?d1|first[_ -]?day[_ -]?roi/i,
      /[\u9996][\u65e5]\s*roi/i,
      /[\u9996][\u65e5][\u56de][\u6536]/i,
      /[\u9996][\u65e5][\u5e7f][\u544a][\u56de][\u6536]/i,
    ],
  },
  {
    key: 'cost',
    patterns: [
      /cost|spend|stat_cost|cost_amount|cash_cost|rebate_cost/i,
      /[\u6d88][\u8017]|[\u82b1][\u8d39]|[\u6210][\u672c]/i,
    ],
  },
  {
    key: 'roi',
    variant: 'standard',
    patterns: [/\broi\b|roas/i, /[\u56de][\u6536]/i],
  },
  { key: 'roas', patterns: [/\broas\b/i] },
  {
    key: 'activation',
    patterns: [/activation|active_count|activation_count|active/i, /[\u6fc0][\u6d3b]/i],
  },
  {
    key: 'register',
    patterns: [/register|register_count/i, /[\u6ce8][\u518c]/i],
  },
  {
    key: 'payment',
    patterns: [/payment|pay_count/i, /[\u4ed8][\u8d39]|[\u652f][\u4ed8]/i],
  },
  {
    key: 'revenue',
    patterns: [/revenue|income|pay_amount/i, /[\u6536][\u5165]|[\u6d41][\u6c34]/i],
  },
  {
    key: 'retention_d1',
    variant: 'd1',
    patterns: [/retention[_ -]?d1|d1[_ -]?retention/i, /[\u9996][\u65e5][\u7559][\u5b58]|[\u7559][\u5b58]/i],
  },
  { key: 'arppu', patterns: [/\barppu\b/i] },
];

function inferToolPurpose(text: string, reportDeliveryCapability: boolean): NonNullable<CapabilityManifest['toolPurpose']> {
  const packageTypeOnly = /app[_ -]?package[_ -]?type|apppackagetype|package[_ -]?type|packagetype/i.test(text);
  const packageTerm = /package|pkg|apk|ipa|bundle|app[_ -]?package|\u5305\u4f53|\u5206\u5305|\u5b89\u88c5\u5305/i.test(text);
  const packageOperation = /detail|list|download|url|address|version|status|audit|review|available|cps|\u660e\u7ec6|\u5217\u8868|\u4e0b\u8f7d|\u5730\u5740|\u7248\u672c|\u72b6\u6001|\u5ba1\u6838|\u53ef\u7528/i.test(text);
  const integrationLike = /integration|integrat|workflow|step|screenshot|screen[_ -]?shot|status|log|record|\u8054\u8c03|\u6b65\u9aa4|\u622a\u56fe|\u72b6\u6001|\u65e5\u5fd7|\u8bb0\u5f55/i.test(text);
  const configLike = /config|setting|permission|auth|check|operation|operate|\u914d\u7f6e|\u6743\u9650|\u68c0\u67e5|\u64cd\u4f5c/i.test(text);
  if (packageTerm && packageOperation && !packageTypeOnly) return 'package_fetch';
  if (integrationLike) return 'integration_run';
  if (configLike) return 'config_check';
  if (reportDeliveryCapability) return 'report_generate';
  return 'data_fetch';
}

function inferSupportedServiceIntents(
  capabilityType: CapabilityManifest['capabilityType'],
  toolPurpose: NonNullable<CapabilityManifest['toolPurpose']>,
  reportDeliveryCapability: boolean,
): ServiceIntent[] | undefined {
  if (toolPurpose === 'package_fetch') return ['package_fetch', 'system_operation'];
  if (toolPurpose === 'integration_run') return ['integration_workflow', 'system_operation'];
  if (toolPurpose === 'config_check' || toolPurpose === 'log_check') return ['system_operation'];
  if (capabilityType === 'data.report') return reportDeliveryCapability ? ['data_query', 'report_delivery'] : ['data_query'];
  return undefined;
}

function schemaProperties(tool: McpToolConfig): Record<string, unknown> {
  const properties = (tool.input_schema || {}).properties;
  return properties && typeof properties === 'object' && !Array.isArray(properties)
    ? properties as Record<string, unknown>
    : {};
}

function schemaRequired(tool: McpToolConfig): string[] {
  const required = (tool.input_schema || {}).required;
  return Array.isArray(required) ? required.map(item => String(item)).filter(Boolean) : [];
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(item => String(item || '').trim()).filter(Boolean)));
}

function propertyDescription(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  return [
    record.title,
    record.description,
    Array.isArray(record.enum) ? record.enum.join(' ') : '',
    Array.isArray(record.examples) ? record.examples.join(' ') : '',
  ].map(item => String(item || '')).filter(Boolean).join(' ');
}

function schemaEnumValues(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  return Array.isArray(record.enum) ? record.enum.map(item => String(item)) : [];
}

function addEvidence(
  evidence: SemanticCapabilityEvidence[],
  source: SemanticCapabilityEvidence['source'],
  raw: string,
  normalized: string,
  confidence: SemanticCapabilityEvidence['confidence'] = 'high',
): void {
  if (!raw) return;
  if (evidence.some(item => item.source === source && item.raw === raw && item.normalized === normalized)) return;
  evidence.push({ source, raw, normalized, confidence });
}

function addDimension(
  list: SemanticDimensionSupport[],
  key: string,
  rawField: string,
  evidence: SemanticCapabilityEvidence[],
  supportLevel: SemanticDimensionSupport['supportLevel'] = 'supported',
): void {
  const existing = list.find(item => item.key === key);
  if (existing) {
    if (rawField && !existing.rawFields.includes(rawField)) existing.rawFields.push(rawField);
    for (const item of evidence) addEvidence(existing.evidence, item.source, item.raw, item.normalized, item.confidence);
    return;
  }
  list.push({ key, rawFields: rawField ? [rawField] : [], supportLevel, evidence });
}

function matchesAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(value));
}

function normalizeDateField(field: string): 'time_range_start' | 'time_range_end' | 'date' | undefined {
  const key = field.toLowerCase();
  if (/^(startdate|start_date|start|begindate|begin_date|date_start)$/.test(key)) return 'time_range_start';
  if (/^(enddate|end_date|end|finishdate|finish_date|date_end)$/.test(key)) return 'time_range_end';
  if (/^(data_day|dt|report_date|stat_date|day|date)$/.test(key)) return 'date';
  return undefined;
}

function normalizeFilterDimension(field: string): string | undefined {
  const key = field.toLowerCase();
  if (/media(ids?|_ids?|id|_id)?$|^media(name)?$/i.test(field)) return 'media';
  if (/apppackagetypes?$|app_package_types?$|package_type|packagetype|applicationtype/i.test(key)) return 'app_package_type';
  if (/ostypes?$|os_type|device_os/i.test(key)) return 'terminal_os';
  if (/terminal(_id)?/i.test(key)) return 'terminal';
  if (/account(ids?|_ids?)?$|account_id/i.test(key)) return 'account';
  if (/team(ids?|_ids?)?$|team_id/i.test(key)) return 'team';
  if (/pkg(ids?|_ids?)?$|package(ids?|_ids?)?$|package_id/i.test(key)) return 'package';
  if (/campaign(ids?|_ids?)?$|campaign_id|attrcampaign/i.test(key)) return 'campaign';
  if (/material|creative|mat(ids?|_ids?)?/i.test(key)) return 'material';
  if (/optimizer(ids?|_ids?)?/i.test(key)) return 'optimizer';
  if (/group|subgroup/i.test(key)) return 'group';
  return undefined;
}

function inferIdentifierTypes(server: McpServerConfig, tool: McpToolConfig): string[] {
  const text = `${server.id} ${server.name} ${server.description || ''} ${tool.name} ${tool.description || ''}`.toLowerCase();
  const fields = Object.keys(schemaProperties(tool));
  const identifiers = new Set<string>();
  if (/media|tencent|oceanengine|\u5a92\u4f53|\u5de8\u91cf|\u6296\u97f3|\u5feb\u624b/i.test(text) || fields.some(field => /media/i.test(field))) identifiers.add('media_id');
  if (/app|project|\u5e94\u7528|\u9879\u76ee/i.test(text) || fields.some(field => /app|project/i.test(field))) identifiers.add('app_id');
  if (/campaign|\u8ba1\u5212/i.test(text) || fields.some(field => /campaign|group/i.test(field))) identifiers.add('campaign_id');
  if (/material|creative|\u7d20\u6750|\u521b\u610f/i.test(text) || fields.some(field => /material|creative/i.test(field))) identifiers.add('material_id');
  if (/account|\u8d26\u6237/i.test(text) || fields.some(field => /account/i.test(field))) identifiers.add('account_id');
  if (/team|\u56e2\u961f/i.test(text) || fields.some(field => /team/i.test(field))) identifiers.add('team_id');
  if (/package|pkg|\u5305\u4f53/i.test(text) || fields.some(field => /package|pkg/i.test(field))) identifiers.add('app_package_id');
  if (/os|android|ios|安卓|苹果/i.test(text) || fields.some(field => /os/i.test(field))) identifiers.add('os_type');
  if (/terminal|\u7ec8\u7aef|终端/i.test(text) || fields.some(field => /terminal/i.test(field))) identifiers.add('terminal_id');
  return Array.from(identifiers);
}

function inferGranularities(params: {
  text: string;
  toolName: string;
  properties: Record<string, unknown>;
}): SemanticGranularitySupport[] {
  const output: SemanticGranularitySupport[] = [];
  const add = (
    key: SemanticGranularitySupport['key'],
    source: SemanticCapabilityEvidence['source'],
    raw: string,
    confidence: SemanticCapabilityEvidence['confidence'] = 'high',
  ) => {
    const existing = output.find(item => item.key === key);
    const evidence: SemanticCapabilityEvidence = { source, raw, normalized: key, confidence };
    if (existing) {
      if (!existing.evidence.some(item => item.source === source && item.raw === raw)) existing.evidence.push(evidence);
      return;
    }
    output.push({ key, supportLevel: 'supported', evidence: [evidence] });
  };

  for (const [field, value] of Object.entries(params.properties)) {
    if (!/timetype|time_type|granularity|period|date_type/i.test(field)) continue;
    for (const enumValue of schemaEnumValues(value)) {
      const normalized = enumValue.toLowerCase();
      if (normalized === 'day' || normalized === 'daily') add('day', 'schema_enum', `${field}:${enumValue}`);
      if (normalized === 'hour' || normalized === 'hourly') add('hour', 'schema_enum', `${field}:${enumValue}`);
      if (normalized === 'week' || normalized === 'weekly') add('week', 'schema_enum', `${field}:${enumValue}`);
      if (normalized === 'month' || normalized === 'monthly') add('month', 'schema_enum', `${field}:${enumValue}`);
    }
  }

  if (/hour_report|hourly|hour|[\u5c0f][\u65f6]|[\u5206][\u65f6]|[\u5b9e][\u65f6]/i.test(params.text)) add('hour', 'tool_name', params.toolName);
  if (/day_report|daily|[\u65e5][\u62a5]|[\u6309][\u65e5]|[\u6309][\u65e5][\u671f]|[\u65e5][\u7c92][\u5ea6]/i.test(params.text)) add('day', 'tool_name', params.toolName);
  if (/week_report|weekly|week|[\u5468][\u62a5]|[\u6309][\u5468]/i.test(params.text)) add('week', 'tool_name', params.toolName);
  if (/month_report|monthly|month|[\u6708][\u62a5]|[\u6309][\u6708]/i.test(params.text)) add('month', 'tool_name', params.toolName);
  if (!output.length) add('day', 'inferred', params.toolName, 'medium');
  return output;
}

function inferMetricSupport(params: {
  text: string;
  rawFields: string[];
  reportDeliveryLike: boolean;
}): SemanticMetricSupport[] {
  const fieldText = params.rawFields.join(' ');
  const output: SemanticMetricSupport[] = [];

  for (const alias of COMMON_REPORT_METRICS) {
    const matchedFields = params.rawFields.filter(field => matchesAny(field, alias.patterns));
    const fieldMatched = matchedFields.length > 0 || matchesAny(fieldText, alias.patterns);
    const textMatched = matchesAny(params.text, alias.patterns);
    if (!fieldMatched && !textMatched) continue;
    const evidence: SemanticCapabilityEvidence[] = [];
    if (fieldMatched) addEvidence(evidence, 'schema_field', matchedFields.join(',') || fieldText, alias.key);
    if (textMatched) addEvidence(evidence, 'description', params.text.slice(0, 300), alias.key, 'medium');
    output.push({
      key: alias.key,
      supportLevel: 'supported',
      variant: alias.variant,
      rawFields: matchedFields,
      evidence,
    });
  }

  if (params.reportDeliveryLike) {
    for (const alias of COMMON_REPORT_METRICS) {
      if (output.some(item => item.key === alias.key)) continue;
      output.push({
        key: alias.key,
        supportLevel: 'unknown',
        variant: alias.variant,
        rawFields: [],
        evidence: [{
          source: 'inferred',
          raw: 'report tool without explicit metric field metadata',
          normalized: alias.key,
          confidence: 'low',
        }],
      });
    }
  }

  return output;
}

function buildSemanticSurface(args: {
  server: McpServerConfig;
  tool: McpToolConfig;
  capabilityId: string;
  supportedServiceIntents?: CapabilityManifest['supportedServiceIntents'];
  views: CapabilityManifest['supports']['views'];
  reportDeliveryLike: boolean;
}): SemanticCapabilitySurface {
  const properties = schemaProperties(args.tool);
  const rawSchemaFields = Object.keys(properties);
  const text = `${args.server.id} ${args.server.name} ${args.server.description || ''} ${args.tool.name} ${args.tool.description || ''} ${rawSchemaFields.map(field => `${field} ${propertyDescription(properties[field])}`).join(' ')}`;
  const evidence: SemanticCapabilityEvidence[] = [];
  const timeRangeInputs: string[] = [];
  const supportedOutputDimensions: SemanticDimensionSupport[] = [];
  const supportedFilterDimensions: SemanticDimensionSupport[] = [];
  const supportedGranularities = inferGranularities({ text, toolName: args.tool.name, properties });

  for (const field of rawSchemaFields) {
    const dateKind = normalizeDateField(field);
    if (dateKind === 'time_range_start' || dateKind === 'time_range_end') {
      timeRangeInputs.push(field);
      addEvidence(evidence, 'schema_field', field, dateKind);
    }
    if (dateKind === 'date') {
      timeRangeInputs.push(field);
      const itemEvidence: SemanticCapabilityEvidence[] = [];
      addEvidence(itemEvidence, 'schema_field', field, 'date');
      addDimension(supportedOutputDimensions, 'date', field, itemEvidence);
      addEvidence(evidence, 'schema_field', field, 'date');
    }

    const filterDimension = normalizeFilterDimension(field);
    if (filterDimension) {
      const itemEvidence: SemanticCapabilityEvidence[] = [];
      addEvidence(itemEvidence, 'schema_field', field, filterDimension);
      addDimension(supportedFilterDimensions, filterDimension, field, itemEvidence);
      addEvidence(evidence, 'schema_field', field, filterDimension);
    }
  }

  const hasTimeRangePair = timeRangeInputs.some(field => normalizeDateField(field) === 'time_range_start')
    && timeRangeInputs.some(field => normalizeDateField(field) === 'time_range_end');
  const hasDayGranularity = supportedGranularities.some(item => item.key === 'day' && item.supportLevel === 'supported');
  if (!supportedOutputDimensions.some(item => item.key === 'date') && hasTimeRangePair && hasDayGranularity && args.reportDeliveryLike) {
    addDimension(supportedOutputDimensions, 'date', '', [{
      source: 'inferred',
      raw: 'time range inputs plus day granularity',
      normalized: 'date',
      confidence: 'medium',
    }]);
  }

  return {
    toolName: args.tool.name,
    capabilityId: args.capabilityId,
    serviceIntents: args.supportedServiceIntents || [],
    dataViews: args.views,
    timeRangeInputs: Array.from(new Set(timeRangeInputs)),
    supportedOutputDimensions,
    supportedFilterDimensions,
    supportedGranularities,
    supportedMetrics: inferMetricSupport({ text, rawFields: rawSchemaFields, reportDeliveryLike: args.reportDeliveryLike }),
    requiredToolInputs: schemaRequired(args.tool),
    rawSchemaFields,
    evidence,
  };
}

function identifierTypesFromSurface(surface: SemanticCapabilitySurface, fallback: string[]): string[] {
  const identifiers = new Set(fallback);
  for (const dimension of surface.supportedFilterDimensions) {
    if (dimension.key === 'media') identifiers.add('media_id');
    if (dimension.key === 'app') identifiers.add('app_id');
    if (dimension.key === 'campaign') identifiers.add('campaign_id');
    if (dimension.key === 'material') identifiers.add('material_id');
    if (dimension.key === 'account') identifiers.add('account_id');
    if (dimension.key === 'team') identifiers.add('team_id');
    if (dimension.key === 'app_package_type' || dimension.key === 'package') identifiers.add('app_package_id');
    if (dimension.key === 'terminal_os') identifiers.add('os_type');
    if (dimension.key === 'terminal') identifiers.add('terminal_id');
  }
  return Array.from(identifiers);
}

export function normalizeMcpToolToCapability(server: McpServerConfig, tool: McpToolConfig): CapabilityManifest {
  const metadata = tool as ToolWithCapabilityMetadata;
  const text = `${server.id} ${server.name} ${server.description || ''} ${tool.name} ${tool.description || ''}`.toLowerCase();
  const properties = Object.keys(schemaProperties(tool));
  const requiredInputs = schemaRequired(tool);
  const views: CapabilityManifest['supports']['views'] = ['summary', 'trend', 'table'];
  if (/detail|\u660e\u7ec6/i.test(text)) views.push('detail');
  if (/compare|comparison|\u5bf9\u6bd4/i.test(text)) views.push('comparison');
  const capabilityType: CapabilityManifest['capabilityType'] = /get[_-]?dict|dictionary|list|lookup/i.test(text) ? 'data.dictionary' : 'data.report';
  const reportDeliveryLike = /report|rpt|daily|weekly|monthly|\u65e5\u62a5|\u5468\u62a5|\u6708\u62a5|\u62a5\u8868|\u62a5\u544a/i.test(text);
  const statusOrInspectionLike = /status|check|log|quality|scheduler|collect|\u72b6\u6001|\u68c0\u67e5|\u5de1\u68c0|\u65e5\u5fd7|\u8d28\u91cf/i.test(tool.name);
  const reportDeliveryCapability = reportDeliveryLike && !statusOrInspectionLike;
  const toolPurpose = metadata.toolPurpose || inferToolPurpose(text, reportDeliveryCapability);
  const derivedTriggerHints = new Set<string>(stringList(metadata.triggerHints));
  const supportedServiceIntents = metadata.supportedServiceIntents
    || inferSupportedServiceIntents(capabilityType, toolPurpose, reportDeliveryCapability);
  const capabilityId = `mcp.${server.id}.${tool.name}`;
  const semanticSurface = buildSemanticSurface({
    server,
    tool,
    capabilityId,
    supportedServiceIntents,
    views,
    reportDeliveryLike: reportDeliveryCapability,
  });
  const granularity = semanticSurface.supportedGranularities
    .filter(item => item.supportLevel === 'supported')
    .map(item => item.key);
  const dimensions = Array.from(new Set([
    ...semanticSurface.supportedOutputDimensions.map(item => item.key),
    ...semanticSurface.supportedFilterDimensions.map(item => item.key),
  ]));
  const metrics = semanticSurface.supportedMetrics
    .filter(item => item.supportLevel === 'supported')
    .map(item => item.key);

  if (capabilityType === 'data.report' && reportDeliveryCapability) {
    derivedTriggerHints.add('\u62a5\u8868');
    derivedTriggerHints.add('\u62a5\u544a');
    if (granularity.includes('day')) derivedTriggerHints.add('\u65e5\u62a5');
    if (granularity.includes('week')) derivedTriggerHints.add('\u5468\u62a5');
    if (granularity.includes('month')) derivedTriggerHints.add('\u6708\u62a5');
  }

  return {
    capabilityId,
    displayName: metadata.displayName || tool.name,
    description: tool.description,
    provider: 'mcp',
    capabilityType,
    dataDomain: server.business_domains?.[0] || 'advertising',
    supportedServiceIntents,
    toolPurpose,
    primaryGoal: metadata.primaryGoal,
    requiredInputs,
    optionalInputs: properties.filter(key => !requiredInputs.includes(key)),
    defaultInputs: metadata.defaultInputs,
    examples: stringList(metadata.examples),
    aliases: stringList(metadata.aliases),
    triggerHints: Array.from(derivedTriggerHints),
    resolverDependencies: metadata.resolverDependencies,
    outputContract: metadata.outputContract || {
      contractType: capabilityType === 'data.report' ? 'semantic_result' : 'tool_payload',
      requiredFields: requiredInputs,
    },
    errorTaxonomy: metadata.errorTaxonomy || ['business_failed', 'tool_failed', 'unavailable', 'schema_mismatch', 'empty_result'],
    supports: {
      metrics: Array.from(new Set(metrics)),
      dimensions,
      identifierTypes: identifierTypesFromSurface(semanticSurface, inferIdentifierTypes(server, tool)),
      granularity: Array.from(new Set(granularity)),
      views,
    },
    semanticSurface,
    source: {
      sourceType: 'mcp',
      toolName: tool.name,
      serverId: server.id,
    },
  };
}
