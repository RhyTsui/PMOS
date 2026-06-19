import { describe, expect, it } from 'vitest';
import { selectNormalizationCapabilities } from '../src/lib/report-capability-manifest';
import { buildReportToolInput, buildToolArgumentPreflight, executeReportQueryStep } from '../src/lib/report-query-orchestrator';
import type { McpServerConfig, McpToolConfig } from '../src/types';

function tool(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[] = ['appId', 'startDate', 'endDate', 'timeType'],
): McpToolConfig {
  const base: McpToolConfig = {
    tool_id: name,
    name,
    description,
    input_schema: {
      type: 'object',
      required,
      properties,
    },
    enabled: true,
    bound_agents: ['ad-assistant'],
    access_mode: 'read',
    call_count: 0,
  };
  return {
    ...base,
    toolPurpose: name.startsWith('get_dict_') ? 'data_fetch' : 'report_generate',
    supportedServiceIntents: ['data_query'],
  } as McpToolConfig;
}

function server(tools: McpToolConfig[], tags: string[] = ['report']): McpServerConfig {
  return {
    id: 'mcp_zt_report',
    name: 'ZT Report',
    description: 'advertising report and dictionary server',
    category: 'data',
    endpoint_url: 'https://report.example.local/mcp',
    transport: 'streamable-http',
    auth_type: 'bearer_token',
    auth_config: {},
    status: 'connected',
    enabled: true,
    business_domains: ['advertising'],
    bound_agents: ['ad-assistant'],
    tags,
    tools,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

function reportProperties(promotionEnum: string[] = ['AD', 'ORGANIC,AD']): Record<string, unknown> {
  return {
    appId: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    timeType: { type: 'string', enum: ['DAY'] },
    dataType: { type: 'string' },
    promotionSource: { type: 'string', enum: promotionEnum },
    mediaId: { type: 'array', items: { type: 'string' } },
    osType: { type: 'string' },
    osTypes: { type: 'array', items: { type: 'string' } },
    customFilter: { type: 'array', items: { type: 'string' } },
    cost_amount: { type: 'number' },
    roi_d1: { type: 'number' },
  };
}

describe('report query P0 resolver and preflight', () => {
  it('keeps media, terminal/os and promotionSource in separate typed arguments', () => {
    const adapted = buildReportToolInput(
      tool('get_zt_ad_roi_report', 'ROI report supports mediaId osType promotionSource', reportProperties()),
      '安卓巨量近30天ROI',
      { appId: '100001' },
      {
        mediaId: ['10001'],
        terminalOs: ['ANDROID'],
        osTypes: ['ANDROID'],
        promotion_source: 'AD',
        dynamicFilters: {
          promotionSource: ['10001'],
          mediaId: ['bad-media'],
          customFilter: ['kept'],
        },
      },
    );

    expect(adapted.finalArgs.mediaId).toEqual(['10001']);
    expect(adapted.finalArgs.osType).toBe('ANDROID');
    expect(adapted.finalArgs.osTypes).toEqual(['ANDROID']);
    expect(adapted.finalArgs.promotionSource).toBe('AD');
    expect(adapted.finalArgs.customFilter).toEqual(['kept']);
    expect(adapted.finalArgs.promotionSource).not.toBe('10001');
    expect(adapted.sourceMapping.mediaId).toBe('resolved_filters.mediaId');
    expect(adapted.sourceMapping.osType).toBe('resolved_filters.terminalOs');
    expect(adapted.sourceMapping.promotionSource).toBe('promotion_source_resolver.external');
    expect(adapted.droppedKeys).toEqual(expect.arrayContaining(['mediaId', 'promotionSource']));
    expect(adapted.preflight.ok).toBe(true);
  });

  it('defaults media ROI to AD without requiring terminal/os', () => {
    const adapted = buildReportToolInput(
      tool('get_zt_ad_roi_report', 'ROI report supports mediaId promotionSource', reportProperties()),
      '巨量近30天ROI',
      { appId: '100001' },
      { mediaId: ['10001'], dynamicFilters: {} },
    );

    expect(adapted.finalArgs.mediaId).toEqual(['10001']);
    expect(adapted.finalArgs.promotionSource).toBe('AD');
    expect(adapted.finalArgs.osType).toBeUndefined();
    expect(adapted.preflight.ok).toBe(true);
  });

  it('does not turn android-only filters into mediaId or promotionSource', () => {
    const adapted = buildReportToolInput(
      tool('get_zt_ad_roi_report', 'ROI report supports optional terminal os', reportProperties()),
      '安卓近30天ROI',
      { appId: '100001' },
      { terminalOs: ['ANDROID'], osTypes: ['ANDROID'], dynamicFilters: {} },
    );

    expect(adapted.finalArgs.mediaId).toBeUndefined();
    expect(adapted.finalArgs.osType).toBe('ANDROID');
    expect(adapted.finalArgs.promotionSource).toBe('AD');
    expect(adapted.finalArgs.promotionSource).not.toBe('ANDROID');
    expect(adapted.preflight.ok).toBe(true);
  });

  it('maps organic traffic through adapter literals without sentinel media', () => {
    const adapted = buildReportToolInput(
      tool('get_zt_ad_roi_report', 'ROI report supports organic external literal', reportProperties(['AD', 'ORGANIC,AD'])),
      '自然量安卓近30天ROI',
      { appId: '100001' },
      { terminalOs: ['ANDROID'], osTypes: ['ANDROID'], dynamicFilters: {} },
    );

    expect(adapted.sourceMapping['promotionSource.internal']).toBe('ORGANIC');
    expect(adapted.finalArgs.promotionSource).toBe('ORGANIC,AD');
    expect(adapted.finalArgs.mediaId).toBeUndefined();
    expect(adapted.finalArgs.osType).toBe('ANDROID');
    expect(adapted.preflight.ok).toBe(true);
  });

  it('blocks promotionSource populated by media_id before MCP call', () => {
    const preflight = buildToolArgumentPreflight({
      finalArgs: {
        appId: '100001',
        startDate: '2026-05-08',
        endDate: '2026-06-06',
        timeType: 'DAY',
        promotionSource: '10001',
        mediaId: ['10001'],
      },
      requiredKeys: ['appId', 'startDate', 'endDate', 'timeType', 'promotionSource'],
      missingRequiredKeysBeforeCall: [],
      sourceMapping: {
        promotionSource: 'resolved_filters.mediaId',
        mediaId: 'resolved_filters.mediaId',
      },
      resolvedFilters: { mediaId: ['10001'], dynamicFilters: {} },
      promotionMapping: {
        internal: 'AD',
        external: '10001',
        source: 'promotion_source_resolver',
        adapter: 'tool_schema_adapter:get_zt_ad_roi_report:roi',
        allowedExternalValues: ['AD', 'ORGANIC,AD'],
        unsupported: false,
      },
    });

    expect(preflight.ok).toBe(false);
    expect(preflight.blockedBeforeCall).toBe(true);
    expect(preflight.status).toBe('invalid_params');
    expect(preflight.issues.map(item => item.code)).toEqual(expect.arrayContaining(['source_mapping_violation', 'invalid_external_enum']));
  });

  it('does not call MCP when organic mapping is unsupported by selected tool', async () => {
    const result = await executeReportQueryStep({
      servers: [server([
        tool('get_zt_ad_roi_report', 'ROI report supports only AD promotionSource', reportProperties(['AD']), ['appId', 'startDate', 'endDate', 'timeType', 'promotionSource']),
      ], ['report'])],
      message: '自然量近30天ROI',
      baseInput: { appId: '100001' },
    });

    const businessStep = result.tool_chain.find(item => item.key === 'business_report');
    const stepResult = businessStep?.result as Record<string, unknown> | undefined;

    expect(result.status).toBe('business_failed');
    expect(result.tool_execution_status).toBe('not_called');
    expect(stepResult?.blockedBeforeCall).toBe(true);
    expect(JSON.stringify(stepResult)).toContain('unsupported_query');
    expect(result.message).not.toContain('没有查到符合条件的数据');
  });

  it('selects get_dict_zt_rpt_os_type_v2 under terminal/os expectation', () => {
    const osTool = tool('get_dict_zt_rpt_os_type_v2', 'OS type dictionary for Android iOS os_type terminal list', {
      appId: { type: 'string' },
    }, ['appId']);
    const mediaTool = tool('get_dict_zt_all_media', 'media dictionary returns media_id', {
      appId: { type: 'string' },
    }, ['appId']);

    const terminalSelection = selectNormalizationCapabilities([server([osTool, mediaTool], ['dictionary'])], 'terminal_os', '安卓巨量近30天ROI');
    const mediaSelection = selectNormalizationCapabilities([server([osTool, mediaTool], ['dictionary'])], 'media', '安卓巨量近30天ROI');
    const terminalRejectedOsTool = terminalSelection.rejectedTools.find(item => item.tool_name === 'get_dict_zt_rpt_os_type_v2');
    const mediaRejectedOsTool = mediaSelection.rejectedTools.find(item => item.tool_name === 'get_dict_zt_rpt_os_type_v2');

    expect(terminalSelection.candidates.some(item => item.tool.name === 'get_dict_zt_rpt_os_type_v2')).toBe(true);
    expect(terminalRejectedOsTool?.mismatchReason.map(item => item.expected) || []).not.toContain('media');
    expect(mediaRejectedOsTool?.mismatchReason.some(item => item.type === 'entity_type_mismatch')).toBe(true);
  });
});
