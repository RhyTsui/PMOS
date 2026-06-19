import assert from 'node:assert/strict';
import {
  buildReportCapabilityManifest,
  selectNormalizationCapabilities,
  type ReportToolCapability,
} from '../src/lib/report-capability-manifest';
import { resolveDictionaryEntity } from '../src/lib/entity-resolution';
import { adaptDictionaryToolOutput, normalizeMcpBusinessError } from '../src/lib/mcp-tool-output-adapter';
import {
  buildBusinessFailedMessage,
  buildReportToolInput,
  normalizeConfiguredMcpToolCallResult,
  selectFallbackToolsForAppScope,
  selectReportTool,
} from '../src/lib/report-query-orchestrator';
import type { ReportCapabilityOverride } from '../src/lib/report-capability-override-store';
import type { McpServerConfig, McpToolConfig } from '../src/types';

function tool(name: string, description: string, properties: Record<string, unknown>, required: string[] = []): McpToolConfig {
  return {
    tool_id: name,
    name,
    description,
    input_schema: {
      type: 'object',
      properties,
      required,
    },
    enabled: true,
    bound_agents: ['ad-assistant'],
    access_mode: 'read',
    call_count: 0,
  };
}

function server(tools: McpToolConfig[]): McpServerConfig {
  return {
    id: 'dictionary-mcp',
    name: 'Dictionary MCP',
    description: 'entity dictionary tools',
    category: 'data',
    endpoint_url: 'https://dictionary-mcp.example.local/mcp',
    transport: 'streamable-http',
    auth_type: 'bearer_token',
    auth_config: {},
    status: 'connected',
    enabled: true,
    business_domains: ['ad-dictionary'],
    bound_agents: ['ad-assistant'],
    tags: ['dictionary'],
    tools,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

function reportServer(tools: McpToolConfig[]): McpServerConfig {
  return {
    id: 'report-mcp',
    name: 'Report MCP',
    description: 'report tools',
    category: 'data',
    endpoint_url: 'https://report-mcp.example.local/mcp',
    transport: 'streamable-http',
    auth_type: 'bearer_token',
    auth_config: {},
    status: 'connected',
    enabled: true,
    business_domains: ['ad-report'],
    bound_agents: ['ad-assistant'],
    tags: ['report'],
    tools,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

function assertContract(toolCapability: ReportToolCapability): void {
  const legacyRoleKey = ['capability', 'role'].join('_');
  const legacyIdentifierTypesKey = ['supported', 'identifier', 'types'].join('_');
  assert.equal(toolCapability.contract_version, 'capability-contract/v1');
  assert.ok(toolCapability.capability_kind, 'capability_kind is required');
  assert.ok(!(legacyRoleKey in toolCapability), 'legacy role field must not be emitted');
  assert.ok(!(legacyIdentifierTypesKey in toolCapability), 'legacy identifier field must not be emitted');
}

const servers = [
  server([
    tool('list_team_dictionary', 'team dictionary returns teamId and teamName', {
      teamId: { type: 'string' },
      teamName: { type: 'string' },
    }),
    tool('list_media_dictionary', 'media dictionary returns mediaId and mediaName', {
      mediaId: { type: 'string' },
      mediaName: { type: 'string' },
    }),
    tool('get_ad_activity_report', 'report query with mediaIds from the media dictionary capability', {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      timeType: { type: 'string' },
      mediaIds: { type: 'string' },
      metrics: { type: 'array' },
    }, ['appId', 'startDate', 'endDate', 'timeType']),
    tool('get_dict_media', 'dictionary media id list for downstream report queries', {
      appId: { type: 'string' },
    }, ['appId']),
    tool('get_dict_zt_app_package_type', 'application package type dictionary returns appPackageType and appPackageTypeName', {
      appId: { type: 'string' },
    }, ['appId']),
    tool('get_app_type_report', 'report query with appPackageType from the application type dictionary capability', {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      timeType: { type: 'string' },
      appPackageType: { type: 'string', description: 'application type filter from get_dict_zt_app_package_type' },
      metrics: { type: 'array' },
    }, ['appId', 'startDate', 'endDate', 'timeType']),
    tool('get_channel_package_list', 'channel package list with an optional platform filter', {
      appId: { type: 'integer' },
      packageStr: { type: 'string' },
      channelId: { type: 'string' },
      mediaId: { type: 'integer' },
    }),
  ]),
  reportServer([
    tool('get_daily_report_fallback', 'daily report query fallback with media id filter', {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      timeType: { type: 'string' },
      mediaId: { type: 'array' },
      metrics: { type: 'array' },
    }, ['appId', 'startDate', 'endDate', 'timeType']),
    tool('get_daily_report_fallback_backup', 'daily report query backup fallback with media id filter', {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      timeType: { type: 'string' },
      mediaId: { type: 'array' },
      metrics: { type: 'array' },
    }, ['appId', 'startDate', 'endDate', 'timeType']),
  ]),
];

const manifest = buildReportCapabilityManifest(servers);
const teamCapability = manifest.dictionary_tools.find(item => item.tool_name === 'list_team_dictionary');
const mediaCapability = manifest.dictionary_tools.find(item => item.tool_name === 'list_media_dictionary');
const activityReportCapability = manifest.tools.find(item => item.tool_name === 'get_ad_activity_report')
  || manifest.dictionary_tools.find(item => item.tool_name === 'get_ad_activity_report');
const activityReportTool = servers[0].tools.find(item => item.name === 'get_ad_activity_report');
const inferredMediaCapability = manifest.dictionary_tools.find(item => item.tool_name === 'get_dict_media');
const appPackageTypeCapability = manifest.dictionary_tools.find(item => item.tool_name === 'get_dict_zt_app_package_type');
const appTypeReportCapability = manifest.tools.find(item => item.tool_name === 'get_app_type_report')
  || manifest.dictionary_tools.find(item => item.tool_name === 'get_app_type_report');
const appTypeReportTool = servers[0].tools.find(item => item.name === 'get_app_type_report');
const channelPackageCapability = manifest.tools.find(item => item.tool_name === 'get_channel_package_list')
  || manifest.dictionary_tools.find(item => item.tool_name === 'get_channel_package_list');

assert.ok(teamCapability, 'team dictionary capability should be discovered');
assert.ok(mediaCapability, 'media dictionary capability should be discovered');
assertContract(teamCapability);
assertContract(mediaCapability);
assert.equal(teamCapability.capability_kind, 'identifier_normalization');
assert.deepEqual(teamCapability.supported_entity_types, ['team']);
assert.deepEqual(teamCapability.identifier_keys, ['team_id']);
assert.equal(mediaCapability.capability_kind, 'identifier_normalization');
assert.deepEqual(mediaCapability.supported_entity_types, ['media']);
assert.deepEqual(mediaCapability.identifier_keys, ['media_id']);
assert.ok(activityReportCapability, 'activity report capability should be discovered');
assert.equal(activityReportCapability.capability_kind, 'report_query');
assert.ok(inferredMediaCapability, 'media dictionary should be discovered from generic dictionary metadata');
assert.equal(inferredMediaCapability.capability_kind, 'identifier_normalization');
assert.ok(inferredMediaCapability.supported_entity_types.includes('media'));
assert.ok(inferredMediaCapability.identifier_keys.includes('media_id'));
assert.ok(appPackageTypeCapability, 'app package type dictionary should be discovered from MCP metadata');
assert.equal(appPackageTypeCapability.capability_kind, 'identifier_normalization');
assert.ok(appPackageTypeCapability.supported_entity_types.includes('app_package_type'));
assert.ok(appPackageTypeCapability.identifier_keys.includes('app_package_type'));
assert.ok(appTypeReportCapability, 'app type report capability should be discovered');
assert.ok(appTypeReportCapability.slot_mappings?.some(mapping =>
  mapping.entity_type === 'app_package_type' && mapping.target_keys.includes('appPackageType')));
assert.ok(activityReportCapability.slot_mappings?.some(mapping => mapping.entity_type === 'media' && mapping.target_keys.includes('mediaIds')));
assert.ok(channelPackageCapability, 'channel package capability should be discovered');
assert.notEqual(channelPackageCapability.capability_kind, 'identifier_normalization');
assert.ok(!channelPackageCapability.identifier_keys.includes('media_id'));

const mediaSelection = selectNormalizationCapabilities(servers, 'media', '查询媒体 AAA 的消耗');
assert.equal(mediaSelection.expectation.expectedCapabilityKind, 'identifier_normalization');
assert.equal(mediaSelection.expectation.expectedEntityType, 'media');
assert.equal(mediaSelection.expectation.expectedIdentifierKey, 'media_id');
assert.ok(
  mediaSelection.candidates.some(candidate => candidate.tool.name === 'list_media_dictionary'),
  'media dictionary should enter candidates for media normalization',
);
assert.ok(
  mediaSelection.rejectedTools.some(item => item.tool_name === 'list_team_dictionary'
    && item.mismatchReason.some(reason => reason.type === 'entity_type_mismatch' || reason.type === 'identifier_key_mismatch')),
  'team dictionary must be rejected for media normalization',
);
assert.ok(
  !mediaSelection.candidates.some(candidate => candidate.tool.name === 'list_team_dictionary'),
  'team dictionary must not remain callable for media normalization',
);
assert.ok(
  !mediaSelection.candidates.some(candidate => candidate.tool.name === 'get_ad_activity_report'),
  'report query tool must not remain callable for media normalization',
);
assert.ok(
  mediaSelection.rejectedTools.some(item => item.tool_name === 'get_ad_activity_report'
    && item.mismatchReason.some(reason => reason.type === 'capability_kind_mismatch')),
  'report query tool must be rejected with capability_kind_mismatch for media normalization',
);
assert.ok(
  !mediaSelection.candidates.some(candidate => candidate.tool.name === 'get_channel_package_list'),
  'channel package list must not remain callable for media normalization',
);
assert.ok(
  mediaSelection.rejectedTools.some(item => item.tool_name === 'get_channel_package_list'
    && item.mismatchReason.some(reason => reason.type === 'capability_kind_mismatch' || reason.type === 'identifier_key_mismatch')),
  'input filter mediaId must not be treated as media normalization capability',
);

const overrides: ReportCapabilityOverride[] = [{
  id: 'force-team-as-media',
  enabled: true,
  server_id: 'dictionary-mcp',
  tool_name: 'list_team_dictionary',
  capability_kind: 'identifier_normalization',
  supported_entity_types: ['media'],
  identifier_keys: ['media_id'],
  label_keys: ['mediaName'],
  report_domains: ['dictionary'],
}];
const overrideSelection = selectNormalizationCapabilities(servers, 'media', '查询媒体 AAA 的消耗', overrides);
assert.ok(
  overrideSelection.candidates.some(candidate => candidate.tool.name === 'list_team_dictionary'),
  'manual override should be able to declare an explicit media normalization contract',
);

const mediaContract = mediaSelection.candidates.find(candidate => candidate.tool.name === 'list_media_dictionary');
assert.ok(mediaContract, 'media contract should be selected before adapter tests');

const rowCodeAdapter = adaptDictionaryToolOutput({
  raw: { data: [{ code: '10001', name: '巨量广告' }] },
  capability: mediaContract.capability,
  expectation: mediaSelection.expectation,
  idKeys: ['mediaId', 'media_id', 'id', 'code'],
  nameKeys: ['mediaName', 'media_name', 'name'],
  toolName: 'list_media_dictionary',
});
assert.equal(rowCodeAdapter.business_status, undefined, 'dictionary row code must not be treated as business error code');
assert.deepEqual(rowCodeAdapter.candidates.map(candidate => candidate.id), ['10001']);

const matchedIdsAdapter = adaptDictionaryToolOutput({
  raw: { matched_ids: ['7', '8'] },
  capability: mediaContract.capability,
  expectation: mediaSelection.expectation,
  idKeys: ['mediaId', 'media_id', 'id'],
  nameKeys: ['mediaName', 'media_name', 'name'],
  toolName: 'list_media_dictionary',
});
assert.deepEqual(matchedIdsAdapter.candidates.map(candidate => candidate.id), ['7', '8']);
assert.ok(matchedIdsAdapter.candidates.every(candidate => candidate.qualityFlags?.includes('id_only')));
const selectionResolution = resolveDictionaryEntity({
  entityType: 'media',
  rawText: '巨量',
  label: '媒体平台',
  identifierKey: 'media_id',
  aliases: ['巨量'],
  rows: matchedIdsAdapter.rows,
  candidates: matchedIdsAdapter.candidates,
  idKeys: ['mediaId', 'media_id', 'id'],
  nameKeys: ['mediaName', 'media_name', 'name'],
  capabilityAvailable: true,
  capabilityId: mediaContract.capability.capability_id,
  toolName: 'list_media_dictionary',
});
assert.equal(selectionResolution.resolution.status, 'needs_user_selection');
assert.deepEqual(selectionResolution.candidateIds, ['7', '8']);

const singleIdAdapter = adaptDictionaryToolOutput({
  raw: { matched_ids: ['7'] },
  capability: mediaContract.capability,
  expectation: mediaSelection.expectation,
  idKeys: ['mediaId', 'media_id', 'id'],
  nameKeys: ['mediaName', 'media_name', 'name'],
  toolName: 'list_media_dictionary',
});
const enrichmentResolution = resolveDictionaryEntity({
  entityType: 'media',
  rawText: '巨量',
  label: '媒体平台',
  identifierKey: 'media_id',
  aliases: ['巨量'],
  rows: singleIdAdapter.rows,
  candidates: singleIdAdapter.candidates,
  idKeys: ['mediaId', 'media_id', 'id'],
  nameKeys: ['mediaName', 'media_name', 'name'],
  capabilityAvailable: true,
  capabilityId: mediaContract.capability.capability_id,
  toolName: 'list_media_dictionary',
});
assert.equal(enrichmentResolution.resolution.status, 'resolved');
assert.equal(enrichmentResolution.resolution.normalizedId, '7');

const businessFailedAdapter = adaptDictionaryToolOutput({
  raw: {
    content: [{
      type: 'text',
      text: JSON.stringify({ code: 400, msg: '缺少必填字段: endDate' }),
    }],
    isError: false,
  },
  capability: mediaContract.capability,
  expectation: mediaSelection.expectation,
  idKeys: ['mediaId', 'media_id', 'id'],
  nameKeys: ['mediaName', 'media_name', 'name'],
  toolName: 'list_media_dictionary',
});
assert.equal(businessFailedAdapter.business_status, 'failed');
assert.equal(businessFailedAdapter.business_code, 400);
assert.equal(businessFailedAdapter.business_error, '缺少必填字段: endDate');
assert.ok(businessFailedAdapter.warnings.includes('business_failed'));

const unsupportedAppPayload = {
  content: [{
    type: 'text',
    text: JSON.stringify({ code: 400, msg: 'This tool not support app_id: 10100042' }),
  }],
  isError: false,
};
const unsupportedAppError = normalizeMcpBusinessError(unsupportedAppPayload);
assert.equal(unsupportedAppError?.tool_execution_status, 'business_failed');
assert.equal(unsupportedAppError?.business_outcome, 'capability_not_available');
assert.equal(unsupportedAppError?.error_code, 'app_scope_not_supported');
assert.equal(unsupportedAppError?.canRetryWithSameTool, false);
assert.equal(unsupportedAppError?.suggestedAction, 'select_supported_tool_or_check_project_capability');
const unsupportedAppCall = normalizeConfiguredMcpToolCallResult({
  ok: true,
  msg: 'MCP tool call completed',
  result: unsupportedAppPayload,
  latency_ms: 12,
  serverName: 'Report MCP',
  toolName: 'generic_report_tool',
});
assert.equal(unsupportedAppCall.status, 'business_failed');
assert.equal(unsupportedAppCall.business_outcome, 'capability_not_available');
assert.equal(unsupportedAppCall.error_code, 'app_scope_not_supported');
const unsupportedAppMessage = buildBusinessFailedMessage({
  input: { project_id: '10100042', media_id: ['10001'] },
  resolved_filters: {
    appId: '10100042',
    mediaKeys: [],
    terminalKeys: [],
    teamKeys: [],
    appPackageTypeKeys: [],
    accountKeys: [],
    packageKeys: [],
    optimizerKeys: [],
    mediaId: ['10001'],
    source: {},
  },
  call_result: unsupportedAppCall,
});
assert.equal(unsupportedAppMessage, '当前报表工具不支持你选择的项目，暂时无法完成这次查询。请检查该项目是否已接入对应报表能力，或切换到支持该项目的报表工具。');
assert.ok(!unsupportedAppMessage.includes('没有查到符合条件的数据'));

const emptyPayload = { rows: [], row_count: 0 };
assert.equal(normalizeMcpBusinessError(emptyPayload), undefined, 'real empty payload must not become business_failed');
const emptyCall = normalizeConfiguredMcpToolCallResult({
  ok: true,
  msg: 'MCP tool call completed',
  result: emptyPayload,
  latency_ms: 10,
  serverName: 'Report MCP',
  toolName: 'generic_report_tool',
});
assert.equal(emptyCall.status, 'success', 'real empty result keeps outer call success for downstream empty normalization');

const fallbackSelected = selectReportTool(servers, '查询昨天 ROI 报表');
assert.ok(fallbackSelected, 'report query should select a primary report tool before fallback test');
const fallbackCandidates = selectFallbackToolsForAppScope({
  servers,
  selected: fallbackSelected!,
  attemptedToolNames: new Set([fallbackSelected!.tool.name]),
});
assert.ok(fallbackCandidates.every(candidate => candidate.tool.name !== fallbackSelected!.tool.name), 'fallback must skip the failed primary tool');
assert.ok(fallbackCandidates.length > 0, 'fallback candidate report tool should be available when manifest has another candidate');

const nestedMediaAdapter = adaptDictionaryToolOutput({
  raw: { data: { allMedia: [{ mediaId: '11', mediaName: 'Alpha Ads' }] } },
  capability: mediaContract.capability,
  expectation: mediaSelection.expectation,
  idKeys: ['mediaId', 'media_id', 'id'],
  nameKeys: ['mediaName', 'media_name', 'name'],
  toolName: 'list_media_dictionary',
});
assert.deepEqual(nestedMediaAdapter.candidates.map(candidate => candidate.id), ['11']);
assert.equal(nestedMediaAdapter.candidates[0]?.name, 'Alpha Ads');
const nestedResolution = resolveDictionaryEntity({
  entityType: 'media',
  rawText: 'Alpha',
  label: 'media platform',
  identifierKey: 'media_id',
  aliases: ['Alpha'],
  rows: nestedMediaAdapter.rows,
  candidates: nestedMediaAdapter.candidates,
  idKeys: ['mediaId', 'media_id', 'id'],
  nameKeys: ['mediaName', 'media_name', 'name'],
  capabilityAvailable: true,
  capabilityId: mediaContract.capability.capability_id,
  toolName: 'list_media_dictionary',
});
assert.equal(nestedResolution.resolution.status, 'resolved');
assert.deepEqual(nestedResolution.candidateIds, ['11']);

const reportInput = buildReportToolInput(
  activityReportTool!,
  'show Alpha ROI',
  { appId: 'app-1' },
  { mediaId: ['11'] },
  activityReportCapability,
);
assert.equal(reportInput.input.mediaIds, '11');

const appTypeInput = buildReportToolInput(
  appTypeReportTool!,
  'show APP_TYPE_A cost',
  { appId: 'app-1' },
  { appPackageType: ['APP_TYPE_A'], dynamicFilters: { appPackageType: ['APP_TYPE_A'] } },
  appTypeReportCapability,
);
assert.equal(appTypeInput.input.appPackageType, 'APP_TYPE_A');

console.log('capability contract self-test passed');
