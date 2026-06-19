import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpServerConfig, McpToolConfig } from '../src/types';
import {
  buildReportToolInput,
  buildToolArgumentPreflight,
  executeReportQueryStep,
  normalizeReportQueryResult,
} from '../src/lib/report-query-orchestrator';
import { selectNormalizationCapabilities } from '../src/lib/report-capability-manifest';
import { deriveUserRequirement } from '../src/lib/request-understanding';

const callMcpTool = vi.fn();

vi.mock('@/lib/mcp-discovery', () => ({
  callMcpTool: (...args: unknown[]) => callMcpTool(...args),
}));

function tool(name: string, description: string, properties: Record<string, unknown>, required = ['appId']): McpToolConfig {
  return {
    tool_id: name,
    name,
    description,
    input_schema: { type: 'object', required, properties },
    enabled: true,
    bound_agents: ['ad-assistant'],
    access_mode: 'read',
    call_count: 0,
  };
}

function reportTool(name = 'get_zt_ad_roi_report'): McpToolConfig {
  return tool(
    name,
    'ROI report with media and terminal filters',
    {
      appId: { type: 'string' },
      promotionSource: { type: 'string', enum: ['AD', 'ORGANIC,AD'] },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      timeType: { type: 'string', enum: ['DAY', 'NATURAL_WEEK', 'NATURAL_MONTH'] },
      dataType: { type: 'string', enum: ['total', 'section'] },
      mediaId: { type: 'array', items: { type: 'string' } },
      osTypes: { type: 'array', items: { type: 'string' }, description: 'resolved by terminal dictionary' },
    },
    ['appId', 'promotionSource', 'startDate', 'endDate', 'timeType', 'dataType'],
  );
}

function server(tools: McpToolConfig[]): McpServerConfig {
  return {
    id: 'mcp_zt_report',
    name: 'Report MCP',
    description: 'advertising report server',
    category: 'data',
    endpoint_url: 'https://report.example.local/mcp',
    transport: 'streamable-http',
    auth_type: 'bearer_token',
    auth_config: {},
    status: 'connected',
    enabled: true,
    business_domains: ['advertising'],
    bound_agents: ['ad-assistant'],
    tags: ['report'],
    tools,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

function testServer() {
  return server([
    reportTool(),
    tool('get_dict_zt_all_media', 'media dictionary', {
      appId: { type: 'string' },
    }),
    tool('get_dict_zt_rpt_os_type_v2', 'terminal os dictionary', {
      appId: { type: 'string' },
    }),
  ]);
}

beforeEach(() => {
  callMcpTool.mockReset();
  callMcpTool.mockImplementation((_input, toolName: string) => {
    if (toolName === 'get_dict_zt_all_media') {
      return Promise.resolve({
        ok: true,
        result: { rows: [{ mediaId: '10001', mediaName: '巨量', aliases: ['巨量', '巨量广告'] }] },
        latency_ms: 1,
      });
    }
    if (toolName === 'get_dict_zt_rpt_os_type_v2') {
      return Promise.resolve({
        ok: true,
        result: { rows: [{ osType: 'ANDROID', osName: 'Android', aliases: ['安卓', 'Android'] }] },
        latency_ms: 1,
      });
    }
    return Promise.resolve({
      ok: true,
      result: { rows: [{ date: '2026-06-01', roi: 1.2, cost: 100 }] },
      latency_ms: 1,
    });
  });
});

describe('report query terminal_os and promotion source mapping', () => {
  it('keeps Android as terminal_os in request understanding', () => {
    const requirement = deriveUserRequirement('安卓巨量近30天ROI');

    expect(requirement.filters.media).toEqual(expect.arrayContaining(['巨量广告']));
    expect(requirement.filters.terminal_os).toEqual(expect.arrayContaining(['Android']));
    expect(requirement.metrics).toContain('roi');
    expect(requirement.requiredIdentifiers).toEqual(expect.arrayContaining(['media_id', 'os_type']));
    expect(requirement.requiredIdentifiers).not.toContain('terminal_id');
    expect(requirement.requiredIdentifiers).not.toContain('app_package_type');
  });

  it('resolves media and terminal_os independently and never maps media id into promotionSource', async () => {
    const result = await executeReportQueryStep({
      servers: [testServer()],
      message: '安卓巨量近30天ROI',
      baseInput: { appId: '10001' },
    });

    const businessStep = result.tool_chain.find(item => item.key === 'business_report');
    expect(result.tool_execution_status).toBe('called_success');
    expect(result.resolved_filters?.mediaId).toEqual(['10001']);
    expect(result.resolved_filters?.osTypes).toEqual(['ANDROID']);
    expect(result.resolved_filters?.promotion_source).toBe('AD');
    expect(businessStep?.input?.promotionSource).toBe('AD');
    expect(businessStep?.input?.promotionSource).not.toBe('10001');
    expect(businessStep?.input?.mediaId).toEqual(['10001']);
    expect(businessStep?.input?.osTypes).toEqual(['ANDROID']);
    expect(businessStep?.argument_contract?.sourceMapping['promotionSource.internal']).toBe('AD');
    expect(businessStep?.argument_contract?.sourceMapping.promotionSource).toContain('promotion_source_resolver');
  });

  it('maps internal ORGANIC to the selected tool external enum without adding mediaId', () => {
    const adapted = buildReportToolInput(reportTool(), '自然量安卓近30天ROI', { appId: '10001' }, {
      osTypes: ['ANDROID'],
      terminalOs: ['ANDROID'],
      dynamicFilters: {},
      entity_resolutions: [],
      resolution_trace: [],
      missing_context_fields: [],
      missing_capabilities: [],
      quality_risks: [],
      dictionary_steps: [],
      summary: {
        mediaKeys: [],
        terminalKeys: ['android'],
        teamKeys: [],
        appPackageTypeKeys: [],
        accountKeys: [],
        packageKeys: [],
        optimizerKeys: [],
        source: {},
      },
    });

    expect(adapted.finalArgs.promotionSource).toBe('ORGANIC,AD');
    expect(adapted.finalArgs.mediaId).toBeUndefined();
    expect(adapted.sourceMapping['promotionSource.internal']).toBe('ORGANIC');
    expect(adapted.sourceMapping['promotionSource.external']).toBe('ORGANIC,AD');
    expect(adapted.sourceMapping['promotionSource.adapter']).toContain('tool_schema_adapter');
    expect(adapted.preflight.ok).toBe(true);
  });

  it('blocks promotionSource populated by media_id before MCP call', () => {
    const preflight = buildToolArgumentPreflight({
      finalArgs: {
        appId: '10001',
        promotionSource: '10001',
        mediaId: ['10001'],
      },
      requiredKeys: ['appId', 'promotionSource'],
      missingRequiredKeysBeforeCall: [],
      sourceMapping: {
        appId: 'baseInput.appId_alias',
        promotionSource: 'resolved_filters.mediaId',
      },
      resolvedFilters: {
        mediaId: ['10001'],
        dynamicFilters: {},
      },
      promotionMapping: {
        internal: 'AD',
        external: '10001',
        source: 'resolved_filters.mediaId',
        adapter: 'test-adapter',
        allowedExternalValues: ['AD', 'ORGANIC,AD'],
        unsupported: false,
      },
    });

    expect(preflight.ok).toBe(false);
    expect(preflight.blockedBeforeCall).toBe(true);
    expect(preflight.status).toBe('invalid_params');
    expect(preflight.issues.map(item => item.code)).toContain('source_mapping_violation');
  });

  it('selects get_dict_zt_rpt_os_type_v2 under terminal_os expectation', () => {
    const selected = selectNormalizationCapabilities([testServer()], 'terminal_os', '安卓巨量近30天ROI');

    expect(selected.expectation.expectedEntityType).toBe('terminal_os');
    expect(selected.expectation.expectedIdentifierKey).toBe('os_type');
    expect(selected.candidates.map(item => item.tool.name)).toContain('get_dict_zt_rpt_os_type_v2');
    const rejectedOsTool = selected.rejectedTools.find(item => item.tool_name === 'get_dict_zt_rpt_os_type_v2');
    expect(rejectedOsTool?.mismatchReason.some(item => item.expected === 'media')).not.toBe(true);
  });

  it('marks account-granular output as invalid when rows omit accountId', async () => {
    const result = normalizeReportQueryResult({
      question_type: 'daily',
      server: server([]),
      tool: tool(
        'get_zt_ad_day_report',
        'account report with account granularity',
        {
          appId: { type: 'string' },
          promotionSource: { type: 'string', enum: ['AD', 'ORGANIC,AD'] },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          timeType: { type: 'string', enum: ['DAY', 'NATURAL_WEEK', 'NATURAL_MONTH'] },
          dataType: { type: 'string', enum: ['total', 'section'] },
          accountId: { type: 'array', items: { type: 'string' } },
        },
        ['appId', 'promotionSource', 'startDate', 'endDate', 'timeType', 'dataType'],
      ),
      input: { appId: '10001' },
      metrics: ['cost'],
      dimensions: ['account'],
      date_range: { start_date: '2026-06-07', end_date: '2026-06-07' },
      call_result: {
        status: 'success',
        server: 'Report MCP',
        tool: 'get_zt_ad_day_report',
        response: { rows: [{ date: '2026-06-07', cost: 100 }] },
        business_payload: { rows: [{ date: '2026-06-07', cost: 100 }] },
      },
      selection_trace: {
        selected_question_type: 'daily',
        selected_tool: 'get_zt_ad_day_report',
        selected_server: 'Report MCP',
        reason: 'selected for regression',
        hour_decision: 'selected',
        hour_reason: 'selected for regression',
        requested_granularity: 'day',
      } as never,
      selected_capability: {
        capability_id: 'mcp_zt_report:get_zt_ad_day_report',
        identifier_keys: ['account_id'],
      } as never,
      quality_risks: [],
      missing_context_fields: [],
      missing_capabilities: [],
      preflight: { ok: true, capability_checks: [], missing_capabilities: [], missing_context_fields: [] },
      resolved_filters: {
        mediaKeys: [],
        terminalKeys: [],
        teamKeys: [],
        appPackageTypeKeys: [],
        accountKeys: ['Test Account'],
        packageKeys: [],
        optimizerKeys: [],
        source: {},
        accountId: ['acct-001'],
      } as never,
      message: '请查巨量账户昨天花费多少报表',
    });

    expect(result.status).toBe('success');
    expect(result.quality_check.ok).toBe(false);
    expect(result.quality_check.root_cause).toBe('output_invalid');
    expect(result.quality_check.missing_fields).toContain('accountId');
    expect(result.quality_check.issues.join(' ')).toContain('accountId');
  });

  it('exposes candidate lifecycle for report tool selection', async () => {
    const result = await executeReportQueryStep({
      servers: [server([
        reportTool('get_zt_ad_day_report'),
        reportTool('get_zt_ad_roi_report'),
        tool('get_dict_zt_all_media', 'media dictionary', {
          appId: { type: 'string' },
        }),
      ])],
      message: '巨量昨天消耗多少',
      baseInput: { appId: '10001' },
    });

    expect(result.status).toBe('success');
    expect(result.selection_trace?.selected_tool).toBe('get_zt_ad_day_report');
    expect(result.selection_trace?.candidate_lifecycle?.some(item => item.state === 'selected' && item.tool_name === 'get_zt_ad_day_report')).toBe(true);
    expect(result.selection_trace?.candidate_lifecycle?.some(item => item.state === 'rejected' && item.tool_name === 'get_zt_ad_roi_report')).toBe(true);
    expect(result.selection_trace?.candidate_lifecycle?.some(item => item.state === 'not_discovered' && item.tool_name === 'get_dict_zt_all_media')).toBe(true);
  });
});
