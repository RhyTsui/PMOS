import { describe, expect, it } from 'vitest';
import { normalizeMcpToolToCapability } from '../src/contracts/mcp/tool-capability-normalization';
import { selectCapabilityForRequirement } from '../src/lib/capability-orchestration';
import { buildCapabilityGapSemanticResult } from '../src/lib/capability-gap-result';
import { executeReportQueryStep } from '../src/lib/report-query-orchestrator';
import { deriveUserRequirement } from '../src/lib/request-understanding';
import { selectSkillCandidate } from '../src/lib/skill-orchestration';
import type { CapabilityManifest } from '../src/contracts/capability/capability-manifest';
import type { McpServerConfig, McpToolConfig } from '../src/types';

function tool(name: string, description: string, properties: Record<string, unknown>): McpToolConfig {
  return {
    tool_id: name,
    name,
    description,
    input_schema: {
      type: 'object',
      required: ['appId', 'startDate', 'endDate', 'timeType'],
      properties,
    },
    enabled: true,
    bound_agents: ['ad-assistant'],
    access_mode: 'read',
    call_count: 0,
  };
}

function server(tools: McpToolConfig[]): McpServerConfig {
  return {
    id: 'mcp_zt_report',
    name: 'ZT Report',
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

function baseReportProperties(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    appId: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    timeType: { type: 'string', enum: ['DAY', 'WEEK', 'MONTH'] },
    mediaId: { type: 'string' },
    osTypes: { type: 'array', items: { type: 'string' } },
    appPackageType: { type: 'string' },
    ...extra,
  };
}

function manualCapability(supports: CapabilityManifest['supports']): CapabilityManifest {
  return {
    capabilityId: 'manual.report',
    provider: 'mcp',
    capabilityType: 'data.report',
    dataDomain: 'advertising',
    supports,
    source: {
      sourceType: 'mcp',
      toolName: 'manual_report',
    },
  };
}

describe('report query capability coverage', () => {
  it('understands android as terminal os and d1 roi as a metric variant', () => {
    const requirement = deriveUserRequirement('近30天巨量安卓的首日ROI和消耗趋势对比');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const end = fmt(today);
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    const expectedRange = `${fmt(start)}~${end}`;
    expect(requirement.dateRange).toEqual({ type: 'absolute', value: expectedRange });
    expect(requirement.granularity).toBe('day');
    expect(requirement.dataRequirement.requiredDimensions).toContain('date');
    expect(requirement.filters.media).toContain('巨量广告');
    expect(requirement.filters.terminal_os).toEqual(expect.arrayContaining(['Android']));
    expect(requirement.metrics).toEqual(expect.arrayContaining(['cost', 'd1_roi']));
    expect(requirement.requiredIdentifiers).toEqual(expect.arrayContaining(['media_id', 'os_type']));
    expect(requirement.requiredIdentifiers).not.toContain('terminal_id');
    expect(requirement.requiredIdentifiers).not.toContain('app_package_type');
  });

  it('does not reject executable report tools for date output, day granularity or comparison view', () => {
    const requirement = deriveUserRequirement('近30天巨量安卓的首日ROI和消耗趋势对比');
    const tools = [
      tool('get_zt_ad_day_report', 'daily day report with cost metrics', baseReportProperties({ cost_amount: { type: 'number' } })),
      tool('get_zt_ad_roi_report', 'ROI report supports first day ROI and cost trend', baseReportProperties({ first_day_roi: { type: 'number' }, cost_amount: { type: 'number' } })),
      tool('get_zt_lhrb_roi_d', 'ROI day report supports first day ROI and cost', baseReportProperties({ roi_d1: { type: 'number' }, cost_amount: { type: 'number' } })),
    ];
    const capabilities = tools.map(item => normalizeMcpToolToCapability(server([item]), item));
    const decision = selectCapabilityForRequirement(requirement, capabilities);
    const byTool = new Map(decision.candidates.map(candidate => [candidate.capability.source.toolName, candidate]));

    expect(decision.selected?.source.toolName).toMatch(/^get_zt_/);
    expect(decision.executionDecision).toBe('executable_with_presentation_fallback');
    for (const toolName of ['get_zt_ad_day_report', 'get_zt_ad_roi_report', 'get_zt_lhrb_roi_d']) {
      const missing = byTool.get(toolName)?.dataCoverage?.missing || [];
      expect(missing).not.toContain('dimension:date');
      expect(missing).not.toContain('output_dimension:date');
      expect(missing).not.toContain('granularity:day');
      expect(missing).not.toContain('view:comparison');
    }
  });

  it('returns structured metric gap instead of asking for date when d1 roi is unsupported', () => {
    const requirement = deriveUserRequirement('近30天巨量安卓的首日ROI和消耗趋势对比');
    const decision = selectCapabilityForRequirement(requirement, [
      manualCapability({
        metrics: ['cost'],
        dimensions: ['date', 'media', 'terminal_os'],
        identifierTypes: ['media_id', 'os_type'],
        granularity: ['day'],
        views: ['summary', 'table'],
      }),
    ]);
    const gap = buildCapabilityGapSemanticResult({ requirement, decision });
    const text = JSON.stringify(gap.businessSummary.capability_gap);

    expect(decision.selected).toBeUndefined();
    expect(decision.dataCoverage.missing).toContain('metric:d1_roi');
    expect(text).toContain('首日ROI');
    expect(text).not.toContain('补充date');
    expect(text).not.toContain('还需要补充date');
  });

  it('does not call knowledge search for deterministic no full coverage report gaps', async () => {
    const result = await executeReportQueryStep({
      servers: [],
      message: '近30天巨量安卓的首日ROI和消耗趋势对比',
      baseInput: {},
      capabilityDecision: {
        fallbackReason: 'no_full_coverage',
        warnings: ['coverage gap'],
        candidates: [],
        dataCoverage: { covered: false, missing: ['metric:d1_roi'], supportLevel: 'partial_match' },
        presentationCoverage: { covered: false, missing: ['view:comparison'] },
      },
    });

    expect(result.tool_execution_status).toBe('not_called');
    expect(result.tool_chain.some(item => item.tool_name === 'knowledge.search')).toBe(false);
    expect(result.tool_chain.some(item => item.key === 'structured_capability_gap')).toBe(true);
  });

  it('keeps metric explainer for definitions but suppresses it for report queries', async () => {
    const definition = await selectSkillCandidate('首日ROI是什么', 'help', 'metric definition');
    const definitionWithDataWords = await selectSkillCandidate('近30天巨量安卓的首日ROI是什么', 'help', 'metric definition');
    const dataQuery = await selectSkillCandidate('近30天巨量安卓的首日ROI趋势', 'report_query', 'report route');

    expect(definition.selected?.skill.skill_id).toBe('metric_explainer_skill');
    expect(definitionWithDataWords.selected?.skill.skill_id).toBe('metric_explainer_skill');
    expect(dataQuery.selected?.skill.skill_id).not.toBe('metric_explainer_skill');
    expect(dataQuery.candidates.some(candidate => candidate.skill.skill_id === 'metric_explainer_skill')).toBe(false);
  });
});
