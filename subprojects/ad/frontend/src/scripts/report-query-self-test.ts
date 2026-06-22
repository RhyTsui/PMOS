import assert from 'node:assert/strict';
import { buildCapabilityPreflight, buildReportToolInput, executeReportQueryStep, normalizeConfiguredMcpToolCallResult, normalizeRows, selectReportQuestionType, selectReportTool, shouldAttemptReportToolFallback, type ReportQueryResult } from '../src/lib/report-query-orchestrator';
import { routeUserIntent } from '../src/lib/intent-router';
import { deriveRequestRouteDecision, deriveUserRequirement } from '../src/lib/request-understanding';
import { normalizeQuestionWithGlossary } from '../src/lib/controlled-glossary-index';
import { buildSemanticMessageContract, buildSemanticWorkflowResult } from '../src/contracts/result-assembly/semantic-result-assembly';
import { resolveKnowledgeBaseIds, type ModelServiceConfig } from '../src/lib/runtime-config';
import { resolveDictionaryEntity } from '../src/lib/entity-resolution';
import { buildReportCapabilityManifest, isExecutableReportCapability } from '../src/lib/report-capability-manifest';
import { findEntityResolutionCandidates } from '../src/lib/entity-resolution-config-store';
import { loadReportQueryPolicySync } from '../src/lib/report-query-policy-store';
import { buildReportQueryInput } from '../src/lib/chat-runtime/report-query-input';
import { parseRelativeDateRange } from '../src/lib/date-range-resolver';
import { projectMessagePresentation } from '../src/components/cognitive/message-presentation-projection';
import { resolveEnumParameter, isHintAllowedField, toParameterResolutionEvent } from '../src/lib/enum-parameter-resolver';
import type { SemanticResultContract } from '../src/contracts/semantic/semantic-result-contract';
import type { McpServerConfig, McpToolConfig, Message } from '../src/types';

function reportSchema() {
  return {
    type: 'object',
    required: ['appId', 'startDate', 'endDate', 'timeType'],
    properties: {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      timeType: { type: 'string' },
      promotionSource: { type: 'string' },
      granularity: { type: 'string' },
      metrics: { type: 'array', items: { type: 'string' } },
      subGroup: { type: 'string' },
      mediaId: { type: 'array', items: { type: 'string' } },
    },
  };
}

function reportSchemaWithOptionalEntityFilters() {
  return {
    type: 'object',
    required: ['appId', 'startDate', 'endDate', 'timeType'],
    properties: {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      timeType: { type: 'string' },
      metrics: { type: 'array', items: { type: 'string' } },
      osTypes: { type: 'array', items: { type: 'string' }, description: 'terminal filter' },
      accountId: { type: 'string', description: 'account filter' },
      optimizerIds: { type: 'array', items: { type: 'string' }, description: 'optimizer filter' },
      appPackageType: { type: 'string', description: 'application type filter' },
    },
  };
}

function reportSchemaWithRequiredPromotionSource() {
  return {
    type: 'object',
    required: ['appId', 'startDate', 'endDate', 'promotionSource', 'timeType'],
    properties: {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      promotionSource: { type: 'string', enum: ['AD', 'ORGANIC', 'ORGANIC,AD'] },
      timeType: { type: 'string' },
      dataType: { type: 'string' },
      mediaId: { type: 'array', items: { type: 'string' } },
      subGroup: { type: 'string' },
    },
  };
}

function snakeCaseReportSchema() {
  return {
    type: 'object',
    required: ['project_id', 'start_date', 'end_date', 'media_id'],
    properties: {
      project_id: { type: 'string' },
      start_date: { type: 'string' },
      end_date: { type: 'string' },
      media_id: { type: 'array', items: { type: 'string' } },
    },
  };
}

function schemaWithUnresolvedRequiredField() {
  return {
    type: 'object',
    required: ['appId', 'accountId'],
    properties: {
      appId: { type: 'string' },
      accountId: { type: 'string' },
    },
  };
}

function ztDayReportSchema() {
  return {
    type: 'object',
    required: ['appId', 'startDate', 'endDate', 'timeType'],
    properties: {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      timeType: { type: 'string' },
      mediaId: { type: 'array', items: { type: 'string' } },
      subGroup: { type: 'string' },
      metrics: { type: 'array', items: { type: 'string' } },
      dimensions: { type: 'array', items: { type: 'string' } },
    },
  };
}

function tool(name: string, description: string, input_schema: McpToolConfig['input_schema'] = reportSchema()): McpToolConfig {
  return {
    tool_id: name,
    name,
    description,
    input_schema,
    enabled: true,
    bound_agents: ['ad-assistant'],
    access_mode: 'read',
    call_count: 0,
  };
}

function fakeReportServers(): McpServerConfig[] {
  return [
    {
      id: 'report-mcp',
      name: 'Report MCP',
      description: 'production reporting tool',
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
      tools: [
        tool('get_zt_hour_report', 'hour report'),
        tool('get_ads_daily_report', 'daily report'),
        tool('get_ads_roi_trend_report', 'roi trend report'),
        tool('get_ads_retention_report', 'retention report'),
      ],
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ];
}

function mockMcpFetch(handler: (toolName: string, args: Record<string, unknown>) => unknown): typeof fetch {
  return (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : {};
    if (body.method === 'tools/call') {
      const params = body.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
      const result = handler(String(params?.name || ''), params?.arguments || {});
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id || 1, result: { serverInfo: { name: 'mock' } } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

function assertSelection(message: string, expectedType: string, expectedTool: string): void {
  const servers = fakeReportServers();
  const type = selectReportQuestionType(message);
  const selected = selectReportTool(servers, message);
  assert.equal(type, expectedType, `${message} question type`);
  assert.ok(selected, `${message} selected tool`);
  assert.equal(selected?.tool.name, expectedTool, `${message} tool`);
  const adapted = buildReportToolInput(selected!.tool, message, {});
  assert.equal(adapted.input.granularity, expectedType === 'hour' ? 'hour' : 'day');
  if (expectedType !== 'hour') {
    assert.notEqual(selected?.tool.name, 'get_zt_hour_report', `${message} must not use hour report`);
  }
}

function assertReportSelectionUsesCapabilityContract(): void {
  const selected = selectReportTool(fakeReportServers(), '换一种说法：按时间拆开项目表现，列出花费明细');
  assert.ok(selected, 'contract-backed selection should still discover a report tool');
  assert.ok(selected!.capability?.selection_policy_id, 'selected capability must expose selection policy id');
  assert.equal(selected!.capability?.contract_version, 'capability-contract/v1', 'selected capability must expose contract version');
  assert.ok(selected!.capability?.report_shape?.shape_type, 'selected capability must expose report shape');
  assert.ok(selected!.capability?.projection_contract?.display_fields.length, 'selected capability must expose projection contract fields');
  assert.ok(selected!.capability?.grouping_contract?.time_dimension_keys.length, 'selected capability must expose grouping contract');
  assert.ok(
    selected!.candidate_tools?.some(candidate => candidate.policy_id && candidate.contract_version && candidate.coverage_basis?.length),
    'candidate tools must carry policy id, contract version, and coverage basis',
  );
  assert.ok(
    selected!.candidate_lifecycle?.some(item => item.policy_id && item.contract_version),
    'candidate lifecycle must carry policy id and contract version',
  );
}

function daysBetween(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00.000Z`).getTime();
  const endTime = new Date(`${end}T00:00:00.000Z`).getTime();
  return Math.round((endTime - startTime) / 86400000) + 1;
}

function assertRecentRange(message: string, days: number): void {
  const selected = selectReportTool(fakeReportServers(), message);
  assert.ok(selected, `${message} selected tool`);
  const adapted = buildReportToolInput(selected!.tool, message, {
    start_date: '2099-01-01',
    end_date: '2099-01-01',
  });
  assert.equal(daysBetween(String(adapted.date_range.start_date), String(adapted.date_range.end_date)), days, `${message} must preserve requested range length`);
  assert.notEqual(adapted.date_range.start_date, '2099-01-01', `${message} must not use inherited single-day range`);
  assert.notEqual(adapted.date_range.end_date, '2099-01-01', `${message} must not use inherited single-day range`);
}

function assertReportCapabilityGate(): void {
  const servers = fakeReportServers();
  servers[0].tools.unshift(tool('get_app_package_cps_detail', 'application package detail list', {
    type: 'object',
    properties: {
      appPackageId: { type: 'integer' },
    },
  }));
  servers[0].tools.unshift(tool('get_campaign_list', 'campaign configuration list filtered by creation time', {
    type: 'object',
    properties: {
      appId: { type: 'string' },
      createStartTime: { type: 'string' },
      createEndTime: { type: 'string' },
      mediaId: { type: 'string' },
    },
  }));
  const manifest = buildReportCapabilityManifest(servers);
  const packageDetail = [...manifest.tools, ...manifest.dictionary_tools].find(item => item.tool_name === 'get_app_package_cps_detail');
  const campaignList = [...manifest.tools, ...manifest.dictionary_tools].find(item => item.tool_name === 'get_campaign_list');
  assert.ok(packageDetail, 'package detail capability should still be discoverable');
  assert.equal(isExecutableReportCapability(packageDetail!), false, 'package detail list must not be executable as report query');
  assert.equal(packageDetail?.tool_purpose, 'package_fetch', 'package detail list must be classified as package_fetch');
  assert.ok(packageDetail?.supported_service_intents.includes('package_fetch'), 'package detail list must support package_fetch');
  assert.equal(packageDetail?.supported_service_intents.includes('data_query'), false, 'package detail list must not support data_query');
  assert.ok(campaignList, 'campaign list capability should still be discoverable');
  assert.equal(isExecutableReportCapability(campaignList!), false, 'configuration list with creation time must not be executable as report query');
  const reportMessage = 'tap近10日的激活数和付费数';
  assert.ok(findEntityResolutionCandidates(reportMessage, 'media').some(item => item.canonical === 'TapTap'), 'tap should be discovered as media entity text');
  const selected = selectReportTool(servers, reportMessage);
  assert.ok(selected, 'valid report tool should still be selected');
  assert.notEqual(selected?.tool.name, 'get_app_package_cps_detail', 'package detail list must not be selected for report query');
  const adapted = buildReportToolInput(selected!.tool, reportMessage, { appId: '10100335' });
  assert.equal(daysBetween(String(adapted.date_range.start_date), String(adapted.date_range.end_date)), 10, '近10日 must preserve requested range length');
  assert.notDeepEqual(adapted.input, {}, 'report input must not be empty');
}

function assertUnspecifiedBreakdownPrefersAggregateDailyReport(): void {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_account_daily_report', 'daily report by account dimension', {
      type: 'object',
      required: ['appId', 'startDate', 'endDate', 'timeType'],
      properties: {
        appId: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        timeType: { type: 'string' },
        accountId: { type: 'string' },
      },
    }),
    tool('get_zt_ad_day_report', 'daily aggregate ad day report', ztDayReportSchema()),
  ];
  const aggregateSelected = selectReportTool(servers, '昨天消耗是多少');
  assert.equal(
    aggregateSelected?.tool.name,
    'get_zt_ad_day_report',
    'unspecified breakdown should prefer aggregate daily report over dimension-specific report',
  );

  const accountSelected = selectReportTool(servers, '昨天各账户消耗是多少');
  assert.equal(
    accountSelected?.tool.name,
    'get_account_daily_report',
    'explicit account breakdown may select the account-dimension report',
  );
}

function assertGlossaryAndComposer(): void {
  const normalized = normalizeQuestionWithGlossary('验证首日付费账号留存月报中的30日留存计算是否正确');
  assert.ok(normalized.normalized_text.length > 0, 'controlled glossary must normalize text');

  const selected = selectReportTool(fakeReportServers(), '验证首日付费账号留存月报中的30日留存计算是否正确');
  assert.ok(selected?.glossary, 'selection trace must carry glossary evidence');

  const result: ReportQueryResult = {
    result_type: 'ReportQueryResult',
    status: 'success',
    question_type: 'roi',
    tool_name: 'get_ads_roi_trend_report',
    server_name: 'Report MCP',
    input: { appId: '10100011' },
    rows: [{ date: '2026-05-25', cost: 100, roi: 0.32 }],
    columns: ['date', 'cost', 'roi'],
    metrics: ['cost', 'roi'],
    dimensions: ['date'],
    date_range: { start_date: '2026-05-25', end_date: '2026-05-25' },
    quality_check: {
      ok: true,
      empty_table: false,
      missing_fields: [],
      date_gaps: [],
      anomaly_warnings: [],
      metric_risks: [],
      issues: [],
      root_cause: 'none',
    },
    message: 'retrieved 1 row',
    selection_trace: {
      selected_question_type: 'roi',
      selected_tool: 'get_ads_roi_trend_report',
      selected_server: 'Report MCP',
      reason: 'test',
      hour_decision: 'rejected',
      hour_reason: 'no hour requirement',
      requested_granularity: 'day',
      manifest_version: 'manifest-test',
      glossary: normalized,
    },
    query_plan: {
      plan_id: 'plan-test',
      original_question: 'cost ROI retention together',
      normalized_question: 'cost ROI retention',
      primary_question_type: 'roi',
      project_context: { appId: '10100011' },
      sub_queries: [
        { sub_query_id: 'sub-1', question_type: 'roi', tool_name: 'get_ads_roi_trend_report', server_name: 'Report MCP', status: 'success', row_count: 1 },
        { sub_query_id: 'sub-2', question_type: 'retention', tool_name: 'get_ads_retention_report', server_name: 'Report MCP', status: 'success', row_count: 1 },
      ],
      required_slots: ['appId'],
      resolved_slots: { appId: '10100011' },
      pending_slots: [],
      merge_rules: ['merge by same project and date range'],
      failed_items: [],
      evidence_refs: ['report-mcp:get_ads_roi_trend_report'],
      status: 'success',
      updated_at: '2026-05-25T00:00:00.000Z',
    },
  };

  const semanticResult: SemanticResultContract = {
    contractType: 'semantic-result',
    version: '1.0.0',
    resultId: 'semantic-test',
    screenType: 'report-result',
    createdAt: '2026-05-25T00:00:00.000Z',
    regions: [
      {
        id: 'trend-data-view',
        type: 'data-view',
        componentBinding: 'data-visualization',
        data: {
          viewType: 'trend',
          requestedView: 'trend',
          chartType: 'table',
          dataset: result.rows.map((row) => ({
            date: String(row.date ?? ''),
            value: Number(row.cost ?? row.roi ?? 0),
          })),
          dimensions: [],
        },
      },
    ],
  };
  const assembled = buildSemanticMessageContract({
    type: 'report_query',
    answerMarkdown: 'trend assembled',
    businessSummary: { title: 'trend result', brief: 'assembled trend', confidence: 'high' },
    semanticResult,
  });
  assert.ok(assembled.visualizations?.tables?.length === 1, 'semantic assembly must preserve table visualization');

  const workflowSuccess = buildSemanticWorkflowResult({
    taskId: 'task-success',
    kind: 'report_query',
    resultType: 'report_query_result',
    answer: 'ok',
    businessSummary: { title: 'ok', brief: 'ok', confidence: 'high' },
    reportQueryResult: { status: 'success' },
  });
  const workflowFailed = buildSemanticWorkflowResult({
    taskId: 'task-failed',
    kind: 'report_query',
    resultType: 'report_query_result',
    answer: 'fail',
    businessSummary: { title: 'fail', brief: 'fail', confidence: 'low' },
    reportQueryResult: { status: 'failed' },
  });
  assert.equal(workflowSuccess.confidence, 'high', 'successful workflow should keep high confidence');
  assert.equal(workflowFailed.confidence, 'low', 'failed workflow should downgrade confidence');
}

function assertDictionaryEntityResolution(): void {
  const resolved = resolveDictionaryEntity({
    entityType: 'media',
    rawText: '巨量',
    label: '媒体平台',
    identifierKey: 'media_id',
    aliases: ['巨量'],
    rows: [],
    candidates: [
      { id: '1', name: '巨量广告', confidence: 0.84, source: 'dictionary' },
      { id: '2', name: '腾讯广告', confidence: 0.84, source: 'dictionary' },
      { id: '3', name: '快手广告', confidence: 0.84, source: 'dictionary' },
    ],
    idKeys: ['id'],
    nameKeys: ['name'],
    capabilityAvailable: true,
  });
  assert.equal(resolved.resolution.status, 'resolved', 'unique high-confidence contains match should resolve directly');
  assert.equal(resolved.resolution.normalizedId, '1', 'resolved candidate id should come from dictionary candidate');

  const ambiguous = resolveDictionaryEntity({
    entityType: 'media',
    rawText: '腾讯',
    label: '媒体平台',
    identifierKey: 'media_id',
    aliases: ['腾讯'],
    rows: [],
    candidates: [
      { id: '10', name: '腾讯广告', confidence: 0.84, source: 'dictionary' },
      { id: '11', name: '腾讯视频', confidence: 0.84, source: 'dictionary' },
    ],
    idKeys: ['id'],
    nameKeys: ['name'],
    capabilityAvailable: true,
  });
  assert.equal(ambiguous.resolution.status, 'needs_user_selection', 'multiple high-confidence candidates should ask user to choose');

  const exactWithFuzzyCandidates = resolveDictionaryEntity({
    entityType: 'media',
    rawText: 'ocean ads',
    label: 'media platform',
    identifierKey: 'media_id',
    aliases: ['ocean ads'],
    rows: [],
    candidates: [
      { id: '10001', name: 'ocean ads', confidence: 0.84, source: 'dictionary' },
      { id: '10031', name: 'ocean ads video', confidence: 0.84, source: 'dictionary' },
      { id: '10148', name: 'ocean ads search', confidence: 0.84, source: 'dictionary' },
    ],
    idKeys: ['id'],
    nameKeys: ['name'],
    capabilityAvailable: true,
  });
  assert.equal(exactWithFuzzyCandidates.resolution.status, 'resolved', 'single exact canonical match should beat fuzzy candidates');
  assert.equal(exactWithFuzzyCandidates.resolution.normalizedId, '10001', 'single exact canonical match should return exact id');

  const multipleExactCandidates = resolveDictionaryEntity({
    entityType: 'media',
    rawText: 'ocean ads',
    label: 'media platform',
    identifierKey: 'media_id',
    aliases: ['ocean ads'],
    rows: [],
    candidates: [
      { id: '10001', name: 'ocean ads', confidence: 0.84, source: 'dictionary' },
      { id: '10002', name: 'ocean ads', confidence: 0.84, source: 'dictionary' },
    ],
    idKeys: ['id'],
    nameKeys: ['name'],
    capabilityAvailable: true,
  });
  assert.equal(multipleExactCandidates.resolution.status, 'needs_user_selection', 'multiple exact candidates must still ask user to choose');
}

function assertToolArgumentContractMapping(): void {
  const message = '\u5de8\u91cf\u6628\u5929\u6d88\u8017\u591a\u5c11';
  const camelTool = tool(
    'daily_report_camel',
    'daily report. required params: appId, startDate, endDate, promotionSource, timeType, isDevide',
    reportSchemaWithRequiredPromotionSource(),
  );
  const camelInput = buildReportToolInput(
    camelTool,
    message,
    { appId: '10100042' },
    { mediaId: ['10001'] },
  );
  assert.deepEqual(camelInput.missingRequiredKeysBeforeCall, [], 'selected schema required fields must be complete before MCP call');
  assert.deepEqual(camelInput.missing_fields, [], 'legacy missing_fields must mirror schema preflight');
  assert.equal(camelInput.finalArgs, camelInput.input, 'legacy input must point to final MCP arguments');
  assert.ok(camelInput.finalArgKeys.includes('appId'), 'camel schema must send appId');
  assert.ok(camelInput.finalArgKeys.includes('mediaId'), 'camel schema must send mediaId');
  assert.ok(!camelInput.finalArgKeys.includes('project_id'), 'camel schema must not send project_id alias');
  assert.ok(!camelInput.finalArgKeys.includes('media_id'), 'camel schema must not send media_id alias');
  assert.ok(!camelInput.finalArgKeys.includes('isDevide'), 'description-only field must not enter final arguments');
  assert.ok(!camelInput.requiredKeys.includes('isDevide'), 'description-only field must not enter required keys');
  assert.equal(camelInput.sourceMapping.appId, 'baseInput.appId_alias');
  assert.equal(camelInput.sourceMapping.mediaId, 'resolved_filters.mediaId');

  const snakeTool = tool('daily_report_snake', 'daily report', snakeCaseReportSchema());
  const snakeInput = buildReportToolInput(
    snakeTool,
    message,
    { appId: '10100042' },
    { mediaId: ['10001'] },
  );
  assert.ok(snakeInput.finalArgKeys.includes('project_id'), 'snake schema may send project_id when schema declares it');
  assert.ok(snakeInput.finalArgKeys.includes('media_id'), 'snake schema may send media_id when schema declares it');
  assert.ok(!snakeInput.finalArgKeys.includes('appId'), 'snake schema must not send appId when schema does not declare it');
  assert.ok(!snakeInput.finalArgKeys.includes('mediaId'), 'snake schema must not send mediaId when schema does not declare it');
  assert.deepEqual(snakeInput.missingRequiredKeysBeforeCall, [], 'snake schema aliases must fill selected schema required fields');

  const missingInput = buildReportToolInput(
    tool('daily_report_missing_required', 'daily report', schemaWithUnresolvedRequiredField()),
    message,
    { appId: '10100042' },
  );
  assert.deepEqual(missingInput.missingRequiredKeysBeforeCall, ['accountId'], 'unresolved schema.required field must be detected before MCP call');
}

function assertMcpBusinessErrorNormalization(): void {
  const missingParamCall = normalizeConfiguredMcpToolCallResult({
    ok: false,
    msg: 'HTTP 400: missing required parameter',
    result: undefined,
    latency_ms: 18,
    serverName: 'Report MCP',
    toolName: 'daily_report_camel',
    raw_response_preview: '{"code":400,"msg":"missing required"}',
  });
  assert.equal(missingParamCall.status, 'business_failed', 'inner 400 missing parameter must not normalize as empty');
  assert.equal(missingParamCall.error_code, 'missing_required_input');
  assert.equal(missingParamCall.normalizedStatus, 'business_failed');
  assert.equal(missingParamCall.raw_response_preview, '{"code":400,"msg":"missing required"}');
  assert.equal(shouldAttemptReportToolFallback(missingParamCall), false, 'missing required input must not trigger tool fallback');

  const permissionCall = normalizeConfiguredMcpToolCallResult({
    ok: true,
    result: { code: 403, msg: 'permission denied' },
    serverName: 'Report MCP',
    toolName: 'daily_report_camel',
  });
  assert.equal(permissionCall.status, 'business_failed', 'inner permission error must not normalize as empty');
  assert.equal(permissionCall.error_code, 'permission_or_scope');
  assert.equal(shouldAttemptReportToolFallback(permissionCall), false, 'permission errors must not fallback to another business report tool');

  const unsupportedAppCall = normalizeConfiguredMcpToolCallResult({
    ok: true,
    result: { code: 400, msg: 'appId not support current report tool' },
    serverName: 'Report MCP',
    toolName: 'daily_report_camel',
  });
  assert.equal(unsupportedAppCall.status, 'business_failed');
  assert.equal(unsupportedAppCall.error_code, 'app_scope_not_supported');
  assert.equal(shouldAttemptReportToolFallback(unsupportedAppCall), true, 'app scope unsupported is the only P0 fallback trigger');
}

function assertPreferredSelectionKeepsFullFallbackCandidates(): void {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_dw_zt_rs_app_report', 'daily ocean engine app report', ztDayReportSchema()),
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', ztDayReportSchema()),
  ];
  const selected = selectReportTool(servers, 'yesterday cost', {
    preferredToolName: 'get_dw_zt_rs_app_report',
    requirePreferred: true,
  });
  assert.ok(selected, 'preferred report tool should be selected');
  assert.equal(selected?.tool.name, 'get_dw_zt_rs_app_report', 'preferred tool remains primary');
  assert.ok(
    selected?.candidate_tools?.some(item => item.tool_name === 'get_zt_ad_day_report'),
    'preferred selection must keep non-preferred fallback candidate',
  );
}

async function assertAppScopeFallbackUsesAlternateReportTool(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_dw_zt_rs_app_report', 'daily ocean engine app report', ztDayReportSchema()),
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', ztDayReportSchema()),
  ];
  const originalFetch = globalThis.fetch;
  const calledTools: string[] = [];
  globalThis.fetch = mockMcpFetch((toolName, args) => {
    calledTools.push(toolName);
    if (toolName === 'get_dw_zt_rs_app_report') {
      return { code: 400, msg: 'appId not support current report tool' };
    }
    assert.equal(toolName, 'get_zt_ad_day_report', 'fallback should call zt ad day report');
    assert.equal(args.appId, '10100042', 'fallback must reuse resolved appId');
    assert.ok(Array.isArray(args.metrics), 'fallback must remap metrics for fallback schema');
    assert.ok(Array.isArray(args.dimensions), 'fallback must remap dimensions for fallback schema');
    assert.equal(typeof args.startDate, 'string', 'fallback must remap startDate');
    assert.equal(typeof args.endDate, 'string', 'fallback must remap endDate');
    return { rows: [{ date: args.startDate, cost: 123.45 }], code: 0, msg: 'ok' };
  });
  try {
    const result = await executeReportQueryStep({
      servers,
      message: 'yesterday cost',
      baseInput: { appId: '10100042' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_dw_zt_rs_app_report' } },
      },
    });
    assert.equal(result.status, 'success', 'fallback result should succeed');
    assert.equal(result.business_outcome, 'partial_success', 'fallback success must be exposed as degraded/partial success');
    assert.deepEqual(calledTools, ['get_dw_zt_rs_app_report', 'get_zt_ad_day_report'], 'app scope failure must try fallback tool');
    assert.equal(result.report_query_result?.tool_name, 'get_zt_ad_day_report', 'final result must come from fallback tool');
    assert.equal(result.report_query_result?.business_outcome, 'partial_success', 'report result must keep fallback degradation');
    assert.ok(!String(result.message).includes('已改用可用的数据能力继续查询'), 'main message must not expose internal fallback process copy');
    assert.ok(result.report_query_result?.quality_check.issues.some(issue => issue.includes('已改用可用能力继续查询')), 'quality check must keep fallback process note for disclosure/trace');
    assert.equal(result.selection_trace?.selected_tool, 'get_zt_ad_day_report', 'top trace must record final tool');
    assert.equal(result.selection_trace?.fallback?.originalTool, 'get_dw_zt_rs_app_report', 'trace must keep original tool');
    assert.equal(result.selection_trace?.fallback?.fallbackTool, 'get_zt_ad_day_report', 'trace must keep fallback tool');
    assert.equal(result.selection_trace?.fallback?.finalTool, 'get_zt_ad_day_report', 'trace must keep final tool');
    assert.equal(result.selection_trace?.fallback?.fallbackReason, 'app_scope_not_supported', 'trace must keep fallback reason');
    assert.ok(result.tool_chain.some(item => item.key.startsWith('fallback_success:get_zt_ad_day_report')), 'tool chain must record fallback success');
    assert.ok(!String(result.message).includes('get_zt_ad_day_report'), 'main message must not leak internal fallback tool name');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertFallbackCandidateMissingParamsAreRecorded(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_dw_zt_rs_app_report', 'daily ocean engine app report', ztDayReportSchema()),
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', schemaWithUnresolvedRequiredField()),
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch((toolName) => {
    assert.equal(toolName, 'get_dw_zt_rs_app_report', 'only primary tool should be called when fallback misses required fields');
    return { code: 400, msg: 'appId not support current report tool' };
  });
  try {
    const result = await executeReportQueryStep({
      servers,
      message: 'yesterday cost',
      baseInput: { appId: '10100042' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_dw_zt_rs_app_report' } },
      },
    });
    const skipped = result.tool_chain.find(item => item.key.startsWith('fallback_skipped:get_zt_ad_day_report'));
    assert.ok(skipped, 'fallback candidate with missing params must be recorded as skipped');
    assert.deepEqual((skipped?.result as { missingFields?: string[] } | undefined)?.missingFields, ['accountId'], 'fallback skipped record must keep missing fields');
    assert.equal((skipped?.result as { skippedReason?: string } | undefined)?.skippedReason, 'missing_required_fields', 'fallback skipped record must keep reason');
    assert.ok((skipped?.result as { draftArguments?: Record<string, unknown> } | undefined)?.draftArguments?.appId, 'fallback skipped record must keep draft arguments');
    assert.equal(result.selection_trace?.fallback?.skippedCandidates?.[0]?.skippedReason, 'missing_required_fields', 'top trace must keep skipped fallback reason');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function assertInvalidCalendarDateBlocksBeforeMcpCall(): void {
  const input = buildReportToolInput(
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', ztDayReportSchema()),
    '查询指间2026年2月30日广告投放部激活数',
    { appId: '10100042' },
  );
  assert.equal(input.date_range.start_date, '2026-02-30', 'invalid date should be preserved for user-facing correction');
  assert.equal(input.preflight.ok, false, 'invalid date must block argument preflight');
  assert.equal(input.preflight.status, 'invalid_params', 'invalid date should be an invalid_params preflight failure');
  assert.ok(input.preflight.issues.some(item => item.code === 'invalid_date'), 'preflight must record invalid_date issue');
  assert.equal(input.finalArgs.startDate, '2026-02-30', 'draft MCP args should keep the invalid date for trace only');
}

async function assertInvalidCalendarDateReturnsUserCorrection(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', ztDayReportSchema()),
  ];
  const result = await executeReportQueryStep({
    servers,
    message: '指间山海 2026 年 2 月 29 日的数据',
    baseInput: { appId: '10100042' },
    capabilityDecision: {
      selected: { source: { toolName: 'get_zt_ad_day_report' } },
    },
  });
  assert.equal(result.status, 'business_failed', 'runtime status should keep execution failure semantics');
  assert.equal(result.contract_status, 'attempted', 'invalid user input should produce degraded response contract');
  assert.equal(result.tool_execution_status, 'not_called', 'invalid date must not call report MCP');
  assert.match(result.message, /不是有效日历日期/, 'message should ask the user to correct the invalid date');
  assert.ok(result.tool_chain.some(item => item.status === 'skipped'), 'tool chain should record skipped business report');
}

function assertMediaBreakdownRoiDoesNotUseNarrowDefaultPromotionSource(): void {
  const input = buildReportToolInput(
    tool('get_zt_ad_roi_report', 'roi report', reportSchemaWithRequiredPromotionSource()),
    '指间山海 20250325 哪个媒体的 首日ROI 最高？数据是多少？',
    { appId: '10100042' },
    {},
    {
      capability_id: 'roi',
      tool_name: 'get_zt_ad_roi_report',
      report_domains: ['roi'],
      supported_metrics: ['d1_roi'],
      supported_dimensions: ['media'],
      identifier_keys: ['media_id'],
    } as any,
  );
  assert.deepEqual(input.metrics, ['d1_roi'], '首日ROI should not also request generic ROI');
  assert.equal(input.finalArgs.promotionSource, 'ORGANIC,AD', 'media ranking without explicit source should query the broad media scope');
  assert.equal(input.finalArgs.subGroup, 'media_id', 'media ranking should request media breakdown from the ROI tool');
  assert.equal(input.sourceMapping['promotionSource.source'], 'promotion_source_resolver.breakdown_scope', 'promotion scope source must be traceable');
  assert.equal(input.preflight.ok, true, 'broad media scope must pass tool argument preflight');
}

async function assertDetailReportAnswerKeepsRequestedFields(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', ztDayReportSchema()),
  ];
  const extraFields = Object.fromEntries(Array.from({ length: 330 }, (_, index) => [`extra_${index}`, index]));
  const row = {
    ...extraFields,
    dt: '2026-06-05',
    media_id: '巨量广告',
    cost_amount: 3338.59,
    cash_cost_amount: 3338.59,
    rebate_cost_amount: 3253.669233018225,
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch((toolName, args) => {
    assert.equal(toolName, 'get_zt_ad_day_report', 'detail display regression should call configured report tool');
    assert.ok(Array.isArray(args.metrics), 'detail query should carry requested metrics');
    return {
      code: 0,
      msg: 'ok',
      data: {
        reportDetails: {
          5: {
            tableContent: [row],
            columnConfig: {
              dt: { columnName: '日期' },
              media_id: { columnName: '媒体' },
              cost_amount: { columnName: '消耗' },
              cash_cost_amount: { columnName: '现金消耗' },
              rebate_cost_amount: { columnName: '折后消耗' },
            },
          },
        },
      },
    };
  });
  try {
    const result = await executeReportQueryStep({
      servers,
      message: 'yesterday cost',
      baseInput: { appId: '10100042' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_zt_ad_day_report' } },
      },
    });
    const reportResult = result.report_query_result;
    assert.equal(result.status, 'success', 'detail query should succeed');
    assert.equal(reportResult?.rows[0]?.cost_amount, 3338.59, 'normalized rows must keep cost_amount');
    assert.equal(reportResult?.rows[0]?.dt, '2026-06-05', 'normalized rows must keep dt');
    assert.equal(reportResult?.rows[0]?.media_id, '巨量广告', 'normalized rows must keep media_id');
    assert.ok(reportResult?.display_fields?.some(field => field.key === 'cost_amount' && field.displayName === '消耗'), 'cost metric must map to cost_amount via columnConfig');
    assert.ok(/2026-06-05/.test(reportResult?.answer_markdown || ''), 'answer markdown should include date');
    assert.ok(!/巨量广告/.test(reportResult?.answer_markdown || ''), 'answer markdown must not add media breakdown when user did not request it');
    assert.ok(/3,338\.59/.test(reportResult?.answer_markdown || ''), 'answer markdown should include formatted cost');
    assert.ok(/元/.test(reportResult?.answer_markdown || ''), 'answer markdown should include currency unit');
    assert.notEqual(reportResult?.answer_markdown, reportResult?.message, 'answer markdown must not be row-count-only message');
    const regions = Array.isArray(reportResult?.semantic_result?.regions) ? reportResult?.semantic_result?.regions : [];
    assert.ok(regions.some(region => region.componentBinding === 'data-visualization' && (region.data as { chartType?: string }).chartType === 'table'), 'detail result should generate table data region');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertDetailReportUsesD1RoiFieldForFirstDayRoi(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_zt_ad_roi_report', 'roi report', reportSchemaWithRequiredPromotionSource()),
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch((toolName, args) => {
    assert.equal(toolName, 'get_zt_ad_roi_report', 'first-day ROI detail should call ROI report');
    assert.equal(args.promotionSource, 'ORGANIC,AD', 'first-day ROI media ranking should use broad media scope');
    assert.equal(args.subGroup, 'media_id', 'first-day ROI media ranking should request media breakdown');
    return {
      code: 0,
      msg: 'ok',
      data: {
        rows: [
          { dt: '2025-03-25', media_id: '苹果广告', roi1_rate: 0.559, roi3_rate: 0 },
        ],
        columnConfig: {
          dt: { columnName: '日期' },
          media_id: { columnName: '媒体' },
          roi1_rate: { columnName: '首日ROI' },
          roi3_rate: { columnName: '3日ROI' },
        },
      },
    };
  });
  try {
    const result = await executeReportQueryStep({
      servers,
      message: '指间山海 20250325 哪个媒体的 首日ROI 最高？数据是多少？',
      baseInput: { appId: '10100042' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_zt_ad_roi_report' } },
      },
    });
    const reportResult = result.report_query_result;
    assert.equal(result.status, 'success', 'first-day ROI detail query should succeed');
    assert.ok(reportResult?.display_fields?.some(field => field.key === 'roi1_rate' && field.displayName === '首日ROI'), 'd1_roi must map to roi1_rate');
    assert.ok((reportResult?.answer_markdown || '').includes('苹果广告'), 'answer should include media winner');
    assert.ok((reportResult?.answer_markdown || '').includes('首日ROI为 55.90%'), 'answer should include first-day ROI value');
    assert.ok(!(reportResult?.answer_markdown || '').includes('3日ROI'), 'answer must not project 3-day ROI for first-day ROI request');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertDetailReportMultiRowAnswerUsesTable(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', ztDayReportSchema()),
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch(() => ({
    code: 0,
    msg: 'ok',
    data: {
      reportDetails: {
        5: {
          tableContent: [
            { dt: '2026-06-05', media_id: '巨量广告', cost_amount: 3338.59 },
            { dt: '2026-06-05', media_id: '腾讯广告', cost_amount: 1000 },
          ],
          columnConfig: {
            dt: { columnName: '日期' },
            media_id: { columnName: '媒体' },
            cost_amount: { columnName: '消耗' },
          },
        },
      },
    },
  }));
  try {
    const result = await executeReportQueryStep({
      servers,
      message: 'yesterday cost',
      baseInput: { appId: '10100042' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_zt_ad_day_report' } },
      },
    });
    const answer = result.report_query_result?.answer_markdown || '';
    assert.ok(answer.includes('| 日期 | 消耗 |'), 'multi-row detail answer should render a concise markdown table');
    assert.ok(!answer.includes('| 日期 | 媒体 | 消耗 |'), 'multi-row detail answer must not add media breakdown without an explicit dimension request');
    assert.ok(answer.includes('3,338.59 元'), 'multi-row table should include formatted cost');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertExplicitMediaBreakdownKeepsDateAndMediaDimensions(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', ztDayReportSchema()),
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch((_toolName, args) => {
    assert.equal(args.subGroup, 'media_id', 'explicit media breakdown should request media subGroup');
    return {
      code: 0,
      msg: 'ok',
      data: {
        reportDetails: {
          5: {
            tableContent: [
              { dt: '2026-06-05', media_id: '巨量广告', cost_amount: 3338.59 },
              { dt: '2026-06-05', media_id: '腾讯广告', cost_amount: 1000 },
            ],
            columnConfig: {
              dt: { columnName: '日期' },
              media_id: { columnName: '媒体' },
              cost_amount: { columnName: '消耗' },
            },
          },
        },
      },
    };
  });
  try {
    const result = await executeReportQueryStep({
      servers,
      message: '昨天各媒体消耗',
      baseInput: { appId: '10100042' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_zt_ad_day_report' } },
      },
    });
    const reportResult = result.report_query_result;
    const answer = reportResult?.answer_markdown || '';
    assert.equal(result.status, 'success', 'explicit media breakdown should succeed');
    assert.ok(answer.includes('| 日期 | 媒体 | 消耗 |'), 'explicit breakdown should render date + media dimensions');
    const tableData = reportResult?.semantic_result?.regions.find(region => region.componentBinding === 'data-visualization')?.data as { dimensions?: string[] } | undefined;
    assert.deepEqual(tableData?.dimensions, ['dt', 'media_id'], 'semantic table should expose both date and media dimensions');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertCompleteDetailRequestShowsFiveHundredRowsAndDisclosesTruncation(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', ztDayReportSchema()),
  ];
  const rows = Array.from({ length: 505 }, (_, index) => ({
    dt: '2026-06-05',
    media_id: `媒体${index + 1}`,
    cost_amount: index + 1,
  }));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch(() => ({
    code: 0,
    msg: 'ok',
    data: {
      reportDetails: {
        5: {
          tableContent: rows,
          columnConfig: {
            dt: { columnName: '日期' },
            media_id: { columnName: '媒体' },
            cost_amount: { columnName: '消耗' },
          },
        },
      },
    },
  }));
  try {
    const result = await executeReportQueryStep({
      servers,
      message: '继续查看昨天的完整日报数据',
      baseInput: { appId: '10100042', metrics: ['cost'] },
      capabilityDecision: {
        selected: { source: { toolName: 'get_zt_ad_day_report' } },
      },
    });
    const answer = result.report_query_result?.answer_markdown || '';
    assert.equal(result.status, 'success', 'complete detail query should succeed');
    assert.ok(answer.includes('当前回复展示前 500 行，共 505 行'), 'truncated full-detail answer should disclose visible and total row counts');
    assert.ok(answer.includes('500.00 元'), 'complete detail answer should show up to 500 rows');
    assert.ok(!answer.includes('501.00 元'), 'complete detail answer should still cap very large inline replies');
    const dataset = (result.report_query_result?.semantic_result?.regions[0]?.data as { dataset?: unknown[] } | undefined)?.dataset || [];
    assert.equal(dataset.length, 505, 'semantic detail dataset should retain all rows for detail/export surfaces');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertDetailReportMainProjectionUsesMarkdown(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', ztDayReportSchema()),
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch(() => ({
    code: 0,
    msg: 'ok',
    data: {
      reportDetails: {
        5: {
          tableContent: [
            { dt: '2026-06-05', media_id: '巨量广告', cost_amount: 3338.59 },
          ],
          columnConfig: {
            dt: { columnName: '日期' },
            media_id: { columnName: '媒体' },
            cost_amount: { columnName: '消耗' },
          },
        },
      },
    },
  }));
  try {
    const result = await executeReportQueryStep({
      servers,
      message: 'yesterday cost',
      baseInput: { appId: '10100042' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_zt_ad_day_report' } },
      },
    });
    const reportResult = result.report_query_result;
    assert.ok(reportResult?.semantic_result, 'detail result must keep semantic table region for detail/export surfaces');
    const message = {
      role: 'assistant',
      intent_type: 'report_query',
      content: reportResult?.answer_markdown || '',
      metadata: {
        message_contract: {
          type: 'report_query',
          answer_markdown: reportResult?.answer_markdown,
        },
      },
    } as unknown as Message;
    const projection = projectMessagePresentation({
      message,
      result: reportResult!.semantic_result!,
    });
    assert.equal(projection.dataRegions.length, 0, 'report detail table must not render as main inline data region');
    assert.ok(projection.markdownRegion, 'report detail main presentation must keep markdown answer');
    assert.ok(projection.suppressedRegions.some(region => region.componentBinding === 'data-visualization'), 'table region should be retained outside main inline rendering');
    const markdown = (projection.markdownRegion?.data as { markdown?: string } | undefined)?.markdown || '';
    assert.ok(markdown.includes('消耗'), 'main markdown should use Chinese metric display name');
    assert.ok(!/\|\s*(date|dt|media_id|cost_amount)\s*\|/i.test(markdown), 'main markdown must not expose raw table headers');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertDetailMetricAliasDisplayNames(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_zt_ad_day_report', 'daily ocean engine ad day report', ztDayReportSchema()),
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch(() => ({
    code: 0,
    msg: 'ok',
    data: {
      rows: [
        { dt: '2026-06-05', media_id: '巨量广告', activation_count: 12 },
      ],
    },
  }));
  try {
    const result = await executeReportQueryStep({
      servers,
      message: 'yesterday activation',
      baseInput: { appId: '10100042' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_zt_ad_day_report' } },
      },
    });
    const reportResult = result.report_query_result;
    assert.ok(reportResult?.display_fields?.some(field => field.key === 'activation_count' && field.displayName === '激活'), 'activation_count alias should display as 激活');
    assert.ok((reportResult?.answer_markdown || '').includes('激活为 12'), 'activation detail answer should use Chinese metric name');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertNestedKnowledgeBaseDiscovery(): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    data: {
      items: [
        { id: 'kb-nested-1' },
        { knowledge_base_id: 'kb-nested-2' },
      ],
    },
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;

  try {
    const config = {
      enabled: true,
      provider: 'coze_openai_compatible',
      providerLabel: 'test',
      apiKey: 'api-key',
      baseUrl: 'https://example.com',
      modelBaseUrl: 'https://example.com',
      modelName: 'model',
      knowledgeBaseUrl: 'https://knowledge.example.com',
      knowledgeBaseApiKey: 'kb-key',
      knowledgeBaseDataset: '',
      controlledGlossaryKnowledgeBaseId: '',
      datakiBaseUrl: 'https://dataki.dobest.com',
      datakiAdminEmail: '',
      datakiAdminPassword: '',
      notes: '',
      updatedAt: '2026-05-29T00:00:00.000Z',
    } satisfies ModelServiceConfig;
    const ids = await resolveKnowledgeBaseIds(config);
    assert.deepEqual(ids, ['kb-nested-1', 'kb-nested-2'], 'nested knowledge base list should be parsed');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function runLiveSmoke(): Promise<void> {
  if (process.env.REPORT_QUERY_LIVE_SMOKE !== '1') return;
  const { listMcpServers } = await import('../src/lib/mcp-server-store');
  const servers = await listMcpServers();
  const message = 'What is the total Android spend for Tencent Ads media last week?';
  const result = await executeReportQueryStep({ servers, message, baseInput: {} });
  assert.notEqual(result.status, 'not_configured', 'configured report MCP is required');
  assert.notEqual(result.status, 'missing_input', `missing input: ${result.missing_fields?.join(',')}`);
  assert.notEqual(result.status, 'blocked', result.message);
  assert.ok(result.selection_trace, 'selection trace is required');
  assert.notEqual(result.selection_trace?.selected_question_type, 'hour', 'weekly total cost must not use hour report');
}

async function assertSchemaOnlyEntityFiltersDoNotRequireDictionaries(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_ads_daily_report', 'daily activation trend report', reportSchemaWithOptionalEntityFilters()),
  ];
  const selected = selectReportTool(servers, '\u8fd130\u5929\u7684\u6bcf\u5929\u7684\u6fc0\u6d3b\u6570\u8d8b\u52bf');
  assert.ok(selected, 'pure trend question should still select a report tool');
  const preflight = buildCapabilityPreflight({
    servers,
    selected: selected!,
    message: '\u8fd130\u5929\u7684\u6bcf\u5929\u7684\u6fc0\u6d3b\u6570\u8d8b\u52bf',
    baseInput: { appId: '10100335' },
    appId: '10100335',
    policy: loadReportQueryPolicySync(),
  });
  const missingCapabilities = preflight.missing_capabilities || [];
  assert.deepEqual(missingCapabilities, [], 'optional entity filter schema must not trigger dictionary capability requirements');
  assert.equal(preflight.capability_checks.find(item => item.capability_type === 'terminal_dictionary')?.status, 'skipped', 'terminal capability must not be required for pure trend queries');
  assert.equal(preflight.capability_checks.find(item => item.capability_type === 'account_dictionary')?.status, 'skipped', 'account capability must not be required for pure trend queries');
  assert.equal(preflight.capability_checks.find(item => item.capability_type === 'optimizer_dictionary')?.status, 'skipped', 'optimizer capability must not be required for pure trend queries');
}

async function assertExplicitEntityMentionsTriggerDictionaries(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_ads_daily_report', 'daily activation trend report', reportSchemaWithOptionalEntityFilters()),
  ];
  const terminalSelected = selectReportTool(servers, 'Android\u8fd130\u5929\u7684\u6bcf\u5929\u7684\u6fc0\u6d3b\u6570\u8d8b\u52bf');
  const accountSelected = selectReportTool(servers, '\u8d26\u623730\u5929\u7684\u6bcf\u5929\u7684\u6fc0\u6d3b\u6570\u8d8b\u52bf');
  const optimizerSelected = selectReportTool(servers, '\u4f18\u5316\u5e0830\u5929\u7684\u6bcf\u5929\u7684\u6fc0\u6d3b\u6570\u8d8b\u52bf');
  assert.ok(terminalSelected && accountSelected && optimizerSelected, 'explicit entity questions should still select report tools');

  const commonInput = { appId: '10100335' };
  const terminalPreflight = buildCapabilityPreflight({
    servers,
    selected: terminalSelected!,
    message: 'Android\u8fd130\u5929\u7684\u6bcf\u5929\u7684\u6fc0\u6d3b\u6570\u8d8b\u52bf',
    baseInput: commonInput,
    appId: '10100335',
    policy: loadReportQueryPolicySync(),
  });
  const accountPreflight = buildCapabilityPreflight({
    servers,
    selected: accountSelected!,
    message: '\u8d26\u623730\u5929\u7684\u6bcf\u5929\u7684\u6fc0\u6d3b\u6570\u8d8b\u52bf',
    baseInput: commonInput,
    appId: '10100335',
    policy: loadReportQueryPolicySync(),
  });
  const optimizerPreflight = buildCapabilityPreflight({
    servers,
    selected: optimizerSelected!,
    message: '\u4f18\u5316\u5e0830\u5929\u7684\u6bcf\u5929\u7684\u6fc0\u6d3b\u6570\u8d8b\u52bf',
    baseInput: commonInput,
    appId: '10100335',
    policy: loadReportQueryPolicySync(),
  });

  assert.equal(terminalPreflight.capability_checks.find(item => item.capability_type === 'terminal_dictionary')?.status, 'missing', 'explicit terminal mention must require terminal normalization');
  assert.equal(accountPreflight.capability_checks.find(item => item.capability_type === 'account_dictionary')?.status, 'missing', 'explicit account mention must require account normalization');
  assert.equal(optimizerPreflight.capability_checks.find(item => item.capability_type === 'optimizer_dictionary')?.status, 'missing', 'explicit optimizer mention must require optimizer normalization');
}

async function assertTrendFormattedLastDayValueDoesNotBecomeZero(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_ads_daily_report', 'daily cost trend report', reportSchemaWithOptionalEntityFilters()),
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch((toolName) => {
    assert.equal(toolName, 'get_ads_daily_report', 'formatted trend regression should call daily report tool');
    return {
      code: 0,
      msg: 'ok',
      data: {
        rows: [
          { date: '2026-06-01', cost: 100 },
          { date: '2026-06-02', cost: 200 },
          { date: '2026-06-03', cost: 300 },
          { date: '2026-06-04', cost: '¥1,234.56' },
        ],
      },
    };
  });
  try {
    const result = await executeReportQueryStep({
      servers,
      message: '近7天每日消耗趋势',
      baseInput: { appId: '10100335' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_ads_daily_report' } },
      },
    });
    const reportResult = result.report_query_result;
    assert.equal(result.status, 'success', 'formatted trend query should succeed');
    assert.equal(reportResult?.rows.at(-1)?.cost, '¥1,234.56', 'raw rows should preserve formatted last-day value');
    const dataRegion = reportResult?.semantic_result?.regions.find(region => region.componentBinding === 'data-visualization');
    const data = dataRegion?.data as {
      dataset?: Array<Record<string, unknown>>;
      series?: Array<{ metricKey?: string; points?: Array<Record<string, unknown>> }>;
      chartSpec?: { series?: Array<{ metricKey?: string; points?: Array<Record<string, unknown>> }> };
    } | undefined;
    const lastDatasetPoint = data?.dataset?.at(-1);
    const costSeries = data?.series?.find(series => series.metricKey === 'cost')
      || data?.chartSpec?.series?.find(series => series.metricKey === 'cost');
    const lastSeriesPoint = costSeries?.points?.at(-1);
    assert.equal(lastDatasetPoint?.cost, 1234.56, 'semantic dataset must parse formatted last-day cost');
    assert.equal(lastDatasetPoint?.value, 1234.56, 'semantic dataset primary value must not become zero');
    assert.equal(lastSeriesPoint?.value, 1234.56, 'semantic series point must parse formatted last-day cost');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertTruncatedMcpTextPayloadStillBuildsTrend(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_zt_ad_roi_report', 'daily ROI trend report', ztDayReportSchema()),
  ];
  const truncatedText = '{"code":0,"data":{"rows":[{"date":"2026-06-01","roi1_rate":"10.00%"},{"date":"2026-06-02","roi1_rate":"12.50%"},{"date":"2026-06-03","roi1_rate":"11.00%"}...[truncated]';
  assert.equal(normalizeRows(truncatedText).length, 3, 'truncated JSON text should recover complete row objects');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch((toolName) => {
    assert.equal(toolName, 'get_zt_ad_roi_report', 'truncated ROI trend regression should call ROI report tool');
    return {
      content: [
        {
          type: 'text',
          text: truncatedText,
        },
      ],
    };
  });
  try {
    const result = await executeReportQueryStep({
      servers,
      message: '近七天的首日ROI趋势',
      baseInput: { appId: '10100335' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_zt_ad_roi_report' } },
      },
    });
    const reportResult = result.report_query_result;
    assert.equal(result.status, 'success', 'truncated ROI trend query should still succeed when complete rows are recoverable');
    assert.equal(reportResult?.rows.length, 3, 'report rows should come from recoverable truncated MCP text');
    assert.equal(reportResult?.quality_check.empty_table, false, 'recoverable truncated MCP text must not be marked as empty');
    const dataRegion = reportResult?.semantic_result?.regions.find(region => region.componentBinding === 'data-visualization');
    const data = dataRegion?.data as {
      dataCoverage?: { availablePoints?: number; status?: string };
      series?: Array<{ metricKey?: string; points?: Array<Record<string, unknown>> }>;
    } | undefined;
    assert.equal(data?.dataCoverage?.availablePoints, 3, 'trend coverage should count recovered dates');
    assert.notEqual(data?.dataCoverage?.status, 'insufficient', 'three recovered dates should be sufficient for trend');
    const roiSeries = data?.series?.find(series => series.metricKey === 'roi1_rate');
    assert.equal(roiSeries?.points?.at(1)?.value, 12.5, 'percent ROI values should be parsed from recovered rows');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function assertEmptyPrimaryReportDoesNotHideRoiTrendResult(): Promise<void> {
  const servers = fakeReportServers();
  servers[0].tools = [
    tool('get_zt_ad_account_report', 'account daily report', ztDayReportSchema()),
    tool('get_zt_ad_roi_report', 'daily ROI trend report', ztDayReportSchema()),
  ];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockMcpFetch((toolName) => {
    if (toolName === 'get_zt_ad_account_report') {
      return {
        code: 0,
        msg: 'ok',
        data: {
          rows: [],
        },
      };
    }
    assert.equal(toolName, 'get_zt_ad_roi_report', 'ROI candidate should be executed when ROI trend is requested');
    return {
      code: 0,
      msg: 'ok',
      data: {
        rows: [
          { date: '2026-06-01', roi1_rate: '10.00%' },
          { date: '2026-06-02', roi1_rate: '12.50%' },
          { date: '2026-06-03', roi1_rate: '11.00%' },
        ],
      },
    };
  });
  try {
    const result = await executeReportQueryStep({
      servers,
      message: '近七天的首日ROI趋势',
      baseInput: { appId: '10100335' },
      capabilityDecision: {
        selected: { source: { toolName: 'get_zt_ad_account_report' } },
      },
    });
    const reportResult = result.report_query_result;
    assert.equal(result.status, 'success', 'data-bearing ROI candidate should prevent final empty result');
    assert.equal(reportResult?.tool_name, 'get_zt_ad_roi_report', 'final result should use the data-bearing ROI report');
    assert.equal(reportResult?.rows.length, 3, 'final ROI result should keep returned trend rows');
    assert.equal(reportResult?.query_plan?.sub_queries.some(item => item.tool_name === 'get_zt_ad_account_report' && item.status === 'empty'), true, 'empty primary candidate should stay visible in query plan');
    const dataRegion = reportResult?.semantic_result?.regions.find(region => region.componentBinding === 'data-visualization');
    const data = dataRegion?.data as { dataCoverage?: { availablePoints?: number; status?: string } } | undefined;
    assert.equal(data?.dataCoverage?.availablePoints, 3, 'final semantic trend should use ROI report dates');
    assert.notEqual(data?.dataCoverage?.status, 'insufficient', 'ROI trend should not be degraded when enough points exist');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function assertSameYearChineseRangeKeepsEndDate(): void {
  const parsed = parseRelativeDateRange('指间山海 2026 年 3 月 1 日至 3 月 15 日的激活数和注册数');
  assert.equal(parsed.start_date, '2026-03-01', 'same-year Chinese range should keep start date');
  assert.equal(parsed.end_date, '2026-03-15', 'same-year Chinese range should keep omitted-year end date');
  assert.equal(parsed.invalid_reason, undefined, 'valid same-year Chinese range should not be invalid');
}

function assertMetricDateSentenceRoutesToReportQuery(): void {
  const message = '指间山海 2026 年 3 月 1 日至 3 月 15 日的激活数和注册数';
  const businessContext = {};
  const requirement = deriveUserRequirement(message, businessContext as any);
  const route = deriveRequestRouteDecision(message, {
    businessContext: businessContext as any,
    slotState: { missingSlots: [], filledSlots: {}, confidence: 1 } as any,
    routeRules: { rules: [] } as any,
  });
  assert.equal(requirement.task, 'report_query', 'absolute date plus governed metrics should be a report requirement');
  assert.equal(requirement.serviceIntent, 'data_query', 'metric date report requirement should map to data_query');
  assert.equal(route.intent_type, 'report_query', 'metric date sentence should enter report_query route');
  assert.equal(route.requiresExecution, true, 'metric date report route should require execution');
}

function assertConcatenatedProjectMentionOverridesCurrentProject(): void {
  const input = buildReportQueryInput('指间山海2026-03-25日报中，查询广告投放部 各媒体激活数、注册数和消耗', {
    businessContext: {
      app: { value: '10100552' },
      timeRange: { value: '2026-03-25~2026-03-25' },
      metrics: { value: ['activation', 'register', 'cost'] },
      dimensions: { value: ['media'] },
    },
    project: {
      currentProject: {
        appId: '10100552',
        appName: '另一个当前项目',
        projectName: '另一个当前项目',
      },
      availableProjects: [
        {
          appId: '10100042',
          appName: '指间山海-国内',
          projectName: '指间山海',
          packageName: '指间山海国内包',
        },
        {
          appId: '10100552',
          appName: '指间山海-港澳台',
          projectName: '指间山海港澳台',
        },
      ],
    },
  } as any);
  assert.equal(input.appId, '10100042', 'concatenated project mention should override stale current project');
  assert.deepEqual(input.project_scope, ['10100042'], 'project scope should follow matched project');
  assert.equal((input.project_context as any)?.appId, '10100042', 'project context should describe matched project');
}

// ─── EnumParameterResolver 单元测试 ──────────────────────────

const RETENTION_SCHEMA_ENUM = ['DEVICE_RETENTION', 'REG_RETENTION', 'PAY_D1_RETENTION'];
const DATA_TYPE_SCHEMA_ENUM = ['total', 'section'];
const RETENTION_POLICY_SIGNALS = [
  {
    field: 'retentionType',
    signals: {
      DEVICE_RETENTION: ['设备留存', '新增设备留存', '新增设备次留', '设备次留'],
      REG_RETENTION: ['注册留存', '注册用户留存'],
      PAY_D1_RETENTION: ['首日付费留存', '首日付费账号留存', '付费账号留存', '付费留存'],
    },
  },
];
const DATA_TYPE_POLICY_SIGNALS = [
  {
    field: 'dataType',
    signals: {
      section: ['区间ROI'],
      total: ['累计ROI'],
    },
  },
];

function assertEnumResolverRejectsHighRiskField(): void {
  // H2 + H3: appId 是高风险字段，hint 不允许覆盖
  assert.equal(isHintAllowedField('appId'), false, 'appId must not be hint-allowed');
  assert.equal(isHintAllowedField('mediaId'), false, 'mediaId must not be hint-allowed');
  assert.equal(isHintAllowedField('startDate'), false, 'startDate must not be hint-allowed');
  assert.equal(isHintAllowedField('retentionType'), true, 'retentionType must be hint-allowed');
  assert.equal(isHintAllowedField('dataType'), true, 'dataType must be hint-allowed');
}

function assertEnumResolverRejectsIllegalEnum(): void {
  // H1: 非法 enum 一律拒绝（用户原文不明确，让 hint 进入 schema gate 被拒）
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下这个留存', // 不明确，不触发 policy signal
    schemaEnum: RETENTION_SCHEMA_ENUM,
    explicitInput: {},
    intentOrchHint: {
      toolName: 'get_zt_ad_retention_report',
      parameters: { retentionType: 'DEVICE' }, // 非法值
      confidence: 0.9,
    },
    policyEnumSignals: RETENTION_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_retention_report',
  });
  // hint 被 schema gate 拒绝，最终进入 needs_user_input（无 schema default / safe default）
  assert.equal(result.accepted, false, 'illegal enum hint should not be accepted');
  assert.equal(result.source, 'needs_user_input', 'source should be needs_user_input after all paths fail');
  assert.ok(
    result.conflict_trace.some(record => record.reason === 'not_in_schema_enum'),
    'rejected hint should be recorded with not_in_schema_enum',
  );
}

function assertEnumResolverAcceptsIntentOrchHint(): void {
  // 路径 A: hint 合法 + tool_name 匹配 + confidence 高 → 接受
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下留存',
    schemaEnum: RETENTION_SCHEMA_ENUM,
    explicitInput: {},
    intentOrchHint: {
      toolName: 'get_zt_ad_retention_report',
      parameters: { retentionType: 'DEVICE_RETENTION' },
      confidence: 0.9,
    },
    policyEnumSignals: RETENTION_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_retention_report',
  });
  assert.equal(result.resolved_value, 'DEVICE_RETENTION', 'should accept hint value');
  assert.equal(result.source, 'intentorch_hint', 'source should be intentorch_hint');
  assert.equal(result.accepted, true, 'should be accepted');
}

function assertEnumResolverRejectsLowConfidence(): void {
  // hint confidence 低于阈值 → 拒绝，降级到 policy signal
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下设备留存',
    schemaEnum: RETENTION_SCHEMA_ENUM,
    explicitInput: {},
    intentOrchHint: {
      toolName: 'get_zt_ad_retention_report',
      parameters: { retentionType: 'REG_RETENTION' },
      confidence: 0.3, // 低于默认 0.7 阈值
    },
    policyEnumSignals: RETENTION_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_retention_report',
  });
  assert.equal(result.resolved_value, 'DEVICE_RETENTION', 'low confidence hint should fall through to policy signal');
  assert.equal(result.source, 'policy_enum_signal', 'should fall back to policy_enum_signal');
  assert.ok(
    result.conflict_trace.some(record => record.reason === 'low_confidence'),
    'low_confidence rejection should be recorded',
  );
}

function assertEnumResolverRejectsToolNameMismatch(): void {
  // hint tool_name 不匹配当前 selected tool → 拒绝
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下设备留存',
    schemaEnum: RETENTION_SCHEMA_ENUM,
    explicitInput: {},
    intentOrchHint: {
      toolName: 'get_ads_daily_report', // 不匹配
      parameters: { retentionType: 'DEVICE_RETENTION' },
      confidence: 0.9,
    },
    policyEnumSignals: RETENTION_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_retention_report',
  });
  assert.equal(result.resolved_value, 'DEVICE_RETENTION', 'tool mismatch should fall through to policy signal');
  assert.equal(result.source, 'policy_enum_signal', 'should fall back to policy_enum_signal');
  assert.ok(
    result.conflict_trace.some(record => record.reason === 'tool_name_mismatch'),
    'tool_name_mismatch should be recorded',
  );
}

function assertEnumResolverUserTextBeatsHint(): void {
  // H5-1: 用户原文被 policy 明确命中单一 enum，且 hint 不一致 → 用户原文优先
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '验证指间山海新增设备留存日报中的次留计算是否正确',
    schemaEnum: RETENTION_SCHEMA_ENUM,
    explicitInput: {},
    intentOrchHint: {
      toolName: 'get_zt_ad_retention_report',
      parameters: { retentionType: 'REG_RETENTION' }, // hint 与用户原文冲突
      confidence: 0.9,
    },
    policyEnumSignals: RETENTION_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_retention_report',
  });
  assert.equal(result.resolved_value, 'DEVICE_RETENTION', 'user text should win over conflicting hint');
  assert.equal(result.source, 'policy_enum_signal', 'source should be policy_enum_signal');
  assert.ok(
    result.conflict_trace.some(record => record.reason === 'conflicts_with_user_text'),
    'conflicts_with_user_text should be recorded',
  );
}

function assertEnumResolverAmbiguousUserText(): void {
  // H5-2: 用户原文命中多个 enum → needs_user_input
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下设备留存和注册留存',
    schemaEnum: RETENTION_SCHEMA_ENUM,
    explicitInput: {},
    policyEnumSignals: RETENTION_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_retention_report',
  });
  assert.equal(result.accepted, false, 'ambiguous user text should not resolve');
  assert.equal(result.source, 'needs_user_input', 'should fall back to needs_user_input');
  assert.ok(
    result.conflict_trace.some(record => record.reason === 'ambiguous_user_text'),
    'ambiguous_user_text should be recorded',
  );
}

function assertEnumResolverHintBeatsSchemaDefault(): void {
  // H5-4: hint 与 schema default 冲突 → hint 优先
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下留存', // 用户原文不明确
    schemaEnum: RETENTION_SCHEMA_ENUM,
    schemaDefault: 'REG_RETENTION', // schema default
    explicitInput: {},
    intentOrchHint: {
      toolName: 'get_zt_ad_retention_report',
      parameters: { retentionType: 'DEVICE_RETENTION' }, // hint 与 schema default 冲突
      confidence: 0.9,
    },
    policyEnumSignals: RETENTION_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_retention_report',
  });
  assert.equal(result.resolved_value, 'DEVICE_RETENTION', 'hint should beat schema default');
  assert.equal(result.source, 'intentorch_hint', 'source should be intentorch_hint');
}

function assertEnumResolverHintBeatsPolicyDefault(): void {
  // H5-5: hint 与 policy required_default 冲突 → hint 优先
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下留存',
    schemaEnum: RETENTION_SCHEMA_ENUM,
    explicitInput: {},
    intentOrchHint: {
      toolName: 'get_zt_ad_retention_report',
      parameters: { retentionType: 'DEVICE_RETENTION' },
      confidence: 0.9,
    },
    policyEnumSignals: [], // 无 policy signal
    policySafeDefault: 'REG_RETENTION', // policy 默认
    selectedToolName: 'get_zt_ad_retention_report',
  });
  assert.equal(result.resolved_value, 'DEVICE_RETENTION', 'hint should beat policy safe default');
  assert.equal(result.source, 'intentorch_hint', 'source should be intentorch_hint');
}

function assertEnumResolverSchemaDefaultUsed(): void {
  // schema 显式 default 在无 hint、无 policy signal 时使用
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下留存',
    schemaEnum: RETENTION_SCHEMA_ENUM,
    schemaDefault: 'DEVICE_RETENTION',
    explicitInput: {},
    selectedToolName: 'get_zt_ad_retention_report',
  });
  assert.equal(result.resolved_value, 'DEVICE_RETENTION', 'schema default should be used when no hint/signal');
  assert.equal(result.source, 'schema_default', 'source should be schema_default');
}

function assertEnumResolverNoEnum0Fallback(): void {
  // H4: enum[0] 不作为业务字段默认兜底
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下留存',
    schemaEnum: RETENTION_SCHEMA_ENUM, // enum[0] 是 DEVICE_RETENTION
    explicitInput: {},
    selectedToolName: 'get_zt_ad_retention_report',
    // 注意：不传 schemaDefault、不传 policySafeDefault
  });
  assert.equal(result.accepted, false, 'should not resolve without schema default or safe default');
  assert.equal(result.source, 'needs_user_input', 'should fall back to needs_user_input');
  assert.notEqual(result.resolved_value, 'DEVICE_RETENTION', 'must not silently use enum[0]');
}

function assertEnumResolverSafeDefaultUsed(): void {
  // policy safe_default 在 schema 无 default 时使用
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下留存',
    schemaEnum: RETENTION_SCHEMA_ENUM,
    explicitInput: {},
    policySafeDefault: 'REG_RETENTION',
    selectedToolName: 'get_zt_ad_retention_report',
  });
  assert.equal(result.resolved_value, 'REG_RETENTION', 'policy safe default should be used');
  assert.equal(result.source, 'policy_safe_default', 'source should be policy_safe_default');
}

function assertEnumResolverDataTypeSignalMatching(): void {
  // ROI 数据类型：区间 ROI → section
  const sectionResult = resolveEnumParameter({
    field: 'dataType',
    message: '查询区间ROI',
    schemaEnum: DATA_TYPE_SCHEMA_ENUM,
    explicitInput: {},
    policyEnumSignals: DATA_TYPE_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_roi_report',
  });
  assert.equal(sectionResult.resolved_value, 'section', '"区间ROI" should resolve to section');
  assert.equal(sectionResult.source, 'policy_enum_signal', 'source should be policy_enum_signal');

  // 累计 ROI → total
  const totalResult = resolveEnumParameter({
    field: 'dataType',
    message: '查询累计ROI',
    schemaEnum: DATA_TYPE_SCHEMA_ENUM,
    explicitInput: {},
    policyEnumSignals: DATA_TYPE_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_roi_report',
  });
  assert.equal(totalResult.resolved_value, 'total', '"累计ROI" should resolve to total');
}

function assertEnumResolverEventTraceFormat(): void {
  // H6: resolver 输出格式正确，可进入 process_events.parameter_resolution
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下设备留存',
    schemaEnum: RETENTION_SCHEMA_ENUM,
    explicitInput: {},
    policyEnumSignals: RETENTION_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_retention_report',
  });
  const event = toParameterResolutionEvent(result);
  assert.equal(event.type, 'parameter_resolution', 'event type should be parameter_resolution');
  assert.equal(event.stage, 'tool_input_building', 'stage should be tool_input_building');
  assert.equal(event.field, 'retentionType', 'field should match');
  assert.equal(event.accepted, true, 'accepted should be true');
  assert.ok(Array.isArray(event.fallback_chain), 'fallback_chain should be array');
  // H3: event 不暴露 hint 原文，只展示结果 + 来源
  assert.ok(!JSON.stringify(event).includes('intentOrchHint'), 'event should not expose raw hint');
}

function assertEnumResolverExplicitInputWins(): void {
  // explicit_slot 优先级最高
  const result = resolveEnumParameter({
    field: 'retentionType',
    message: '看下设备留存',
    schemaEnum: RETENTION_SCHEMA_ENUM,
    explicitInput: { retentionType: 'PAY_D1_RETENTION' }, // 用户已显式指定
    intentOrchHint: {
      toolName: 'get_zt_ad_retention_report',
      parameters: { retentionType: 'DEVICE_RETENTION' }, // hint 与 explicit 冲突
      confidence: 0.9,
    },
    policyEnumSignals: RETENTION_POLICY_SIGNALS,
    selectedToolName: 'get_zt_ad_retention_report',
  });
  assert.equal(result.resolved_value, 'PAY_D1_RETENTION', 'explicit input should win');
  assert.equal(result.source, 'explicit_slot', 'source should be explicit_slot');
}

async function main(): Promise<void> {
  assertGlossaryAndComposer();
  assertDictionaryEntityResolution();
  assertReportCapabilityGate();
  assertReportSelectionUsesCapabilityContract();
  assertUnspecifiedBreakdownPrefersAggregateDailyReport();
  assertToolArgumentContractMapping();
  assertMcpBusinessErrorNormalization();
  assertPreferredSelectionKeepsFullFallbackCandidates();
  await assertNestedKnowledgeBaseDiscovery();
  await assertAppScopeFallbackUsesAlternateReportTool();
  await assertFallbackCandidateMissingParamsAreRecorded();
  assertInvalidCalendarDateBlocksBeforeMcpCall();
  await assertInvalidCalendarDateReturnsUserCorrection();
  assertMediaBreakdownRoiDoesNotUseNarrowDefaultPromotionSource();
  await assertDetailReportAnswerKeepsRequestedFields();
  await assertDetailReportUsesD1RoiFieldForFirstDayRoi();
  await assertDetailReportMultiRowAnswerUsesTable();
  await assertExplicitMediaBreakdownKeepsDateAndMediaDimensions();
  await assertCompleteDetailRequestShowsFiveHundredRowsAndDisclosesTruncation();
  await assertDetailReportMainProjectionUsesMarkdown();
  await assertDetailMetricAliasDisplayNames();
  await assertSchemaOnlyEntityFiltersDoNotRequireDictionaries();
  await assertExplicitEntityMentionsTriggerDictionaries();
  await assertTrendFormattedLastDayValueDoesNotBecomeZero();
  await assertTruncatedMcpTextPayloadStillBuildsTrend();
  await assertEmptyPrimaryReportDoesNotHideRoiTrendResult();
  assertSameYearChineseRangeKeepsEndDate();
  assertMetricDateSentenceRoutesToReportQuery();
  assertConcatenatedProjectMentionOverridesCurrentProject();
  // EnumParameterResolver 测试
  assertEnumResolverRejectsHighRiskField();
  assertEnumResolverRejectsIllegalEnum();
  assertEnumResolverAcceptsIntentOrchHint();
  assertEnumResolverRejectsLowConfidence();
  assertEnumResolverRejectsToolNameMismatch();
  assertEnumResolverUserTextBeatsHint();
  assertEnumResolverAmbiguousUserText();
  assertEnumResolverHintBeatsSchemaDefault();
  assertEnumResolverHintBeatsPolicyDefault();
  assertEnumResolverSchemaDefaultUsed();
  assertEnumResolverNoEnum0Fallback();
  assertEnumResolverSafeDefaultUsed();
  assertEnumResolverDataTypeSignalMatching();
  assertEnumResolverEventTraceFormat();
  assertEnumResolverExplicitInputWins();
  assertSelection('近30天媒体安卓日消耗和首日ROI趋势对比', 'roi', 'get_ads_roi_trend_report');
  assert.equal(
    routeUserIntent('近30天媒体安卓日消耗和首日ROI趋势对比').intent_type,
    'report_query',
    'trend report question must route to report_query',
  );
  assertRecentRange('查看近30天趋势', 30);
  assertRecentRange('近7天每日消耗趋势', 7);
  assertSelection('上周腾讯广告媒体安卓总消耗是多少', 'daily', 'get_ads_daily_report');
  assertSelection('看下近2小时的消耗', 'hour', 'get_zt_hour_report');
  await runLiveSmoke();
  console.log('report-query self-test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
