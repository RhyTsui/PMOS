import assert from 'node:assert/strict';
import { buildCapabilityPreflight, buildReportToolInput, executeReportQueryStep, normalizeConfiguredMcpToolCallResult, selectReportQuestionType, selectReportTool, shouldAttemptReportToolFallback, type ReportQueryResult } from '../src/lib/report-query-orchestrator';
import { routeUserIntent } from '../src/lib/intent-router';
import { normalizeQuestionWithGlossary } from '../src/lib/controlled-glossary-index';
import { buildSemanticMessageContract, buildSemanticWorkflowResult } from '../src/contracts/result-assembly/semantic-result-assembly';
import { resolveKnowledgeBaseIds, type ModelServiceConfig } from '../src/lib/runtime-config';
import { resolveDictionaryEntity } from '../src/lib/entity-resolution';
import { buildReportCapabilityManifest, isExecutableReportCapability } from '../src/lib/report-capability-manifest';
import { findEntityResolutionCandidates } from '../src/lib/entity-resolution-config-store';
import { loadReportQueryPolicySync } from '../src/lib/report-query-policy-store';
import { projectMessagePresentation } from '../src/components/cognitive/message-presentation-projection';
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
      promotionSource: { type: 'string' },
      timeType: { type: 'string' },
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
    assert.deepEqual(calledTools, ['get_dw_zt_rs_app_report', 'get_zt_ad_day_report'], 'app scope failure must try fallback tool');
    assert.equal(result.report_query_result?.tool_name, 'get_zt_ad_day_report', 'final result must come from fallback tool');
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
    assert.ok(/巨量广告/.test(reportResult?.answer_markdown || ''), 'answer markdown should include media');
    assert.ok(/3,338\.59/.test(reportResult?.answer_markdown || ''), 'answer markdown should include formatted cost');
    assert.ok(/元/.test(reportResult?.answer_markdown || ''), 'answer markdown should include currency unit');
    assert.notEqual(reportResult?.answer_markdown, reportResult?.message, 'answer markdown must not be row-count-only message');
    const regions = Array.isArray(reportResult?.semantic_result?.regions) ? reportResult?.semantic_result?.regions : [];
    assert.ok(regions.some(region => region.componentBinding === 'data-visualization' && (region.data as { chartType?: string }).chartType === 'table'), 'detail result should generate table data region');
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
    assert.ok(answer.includes('| 日期 | 媒体 | 消耗 |'), 'multi-row detail answer should render a concise markdown table');
    assert.ok(answer.includes('3,338.59 元'), 'multi-row table should include formatted cost');
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

async function main(): Promise<void> {
  assertGlossaryAndComposer();
  assertDictionaryEntityResolution();
  assertReportCapabilityGate();
  assertToolArgumentContractMapping();
  assertMcpBusinessErrorNormalization();
  assertPreferredSelectionKeepsFullFallbackCandidates();
  await assertNestedKnowledgeBaseDiscovery();
  await assertAppScopeFallbackUsesAlternateReportTool();
  await assertFallbackCandidateMissingParamsAreRecorded();
  await assertDetailReportAnswerKeepsRequestedFields();
  await assertDetailReportMultiRowAnswerUsesTable();
  await assertDetailReportMainProjectionUsesMarkdown();
  await assertDetailMetricAliasDisplayNames();
  await assertSchemaOnlyEntityFiltersDoNotRequireDictionaries();
  await assertExplicitEntityMentionsTriggerDictionaries();
  await assertTrendFormattedLastDayValueDoesNotBecomeZero();
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
