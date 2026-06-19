import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeMcpToolToCapability } from '../src/contracts/mcp/tool-capability-normalization';
import { selectCapabilityForRequirement } from '../src/lib/capability-orchestration';
import { findEntityResolutionCandidates, normalizeEntityResolutionConfig } from '../src/lib/entity-resolution-config-store';
import { normalizeIntentRouteRulesConfig } from '../src/lib/intent-route-rules';
import { normalizeReportQueryPolicy } from '../src/lib/report-query-policy-store';
import { buildReportToolInput } from '../src/lib/report-query-orchestrator';
import { deriveUserRequirement } from '../src/lib/request-understanding';
import type { McpServerConfig, McpToolConfig } from '../src/types';

function tool(name: string, description: string, properties: Record<string, unknown>): McpToolConfig {
  return {
    tool_id: name,
    name,
    description,
    input_schema: {
      type: 'object',
      required: ['appId', 'startDate', 'endDate'],
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
    id: 'mcp_report',
    name: 'Report Server',
    description: 'report capability server',
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

describe('P1 hardcode migration regression', () => {
  it('keeps public web execution governed by planner/config need instead of route-level business exclusions', () => {
    const routeSource = fs.readFileSync(path.resolve(__dirname, '../src/app/api/chat/route.ts'), 'utf8');

    expect(routeSource).not.toContain("!['help', 'diagnosis', 'debugging', 'demand', 'get_delivery_packages', 'monitor', 'forecast'].includes(route.intent_type)");
    expect(routeSource).not.toContain("!['diagnosis', 'debugging', 'get_delivery_packages', 'monitor'].includes(route.intent_type)");
  });

  it('keeps successful public web results as composer evidence instead of direct answer authority', () => {
    const routeSource = fs.readFileSync(path.resolve(__dirname, '../src/app/api/chat/route.ts'), 'utf8');

    expect(routeSource).toContain("const publicWebEvidenceRole: OpenAnswerPublicWebCandidate['evidence_role'] = 'candidate_evidence';");
    expect(routeSource).not.toContain("publicWebEvidenceRole === 'direct_answer_candidate'");
  });

  it('keeps migrated route fallback phrases in governed route rule seed', () => {
    const config = normalizeIntentRouteRulesConfig();
    const ruleIds = config.rules.map(rule => rule.id);

    expect(ruleIds).toEqual(expect.arrayContaining([
      'advertising-config-operation',
      'advertising-config-help',
      'advertising-deliverable-writing',
      'advertising-forecast',
      'advertising-monitoring',
      'advertising-diagnosis-detail',
      'advertising-help-lookup',
    ]));
  });

  it('recognizes report metrics and actions from domain pack request signals', () => {
    const requirement = deriveUserRequirement('昨天巨量激活多少，顺便看 ROI 趋势');

    expect(requirement.task).toBe('report_query');
    expect(requirement.taskAuthority).toBe('heuristic_candidate');
    expect(requirement.taskSource).toBe('request_understanding_structured_signals');
    expect(requirement.routeEvidence).toContain('task_authority:heuristic_candidate');
    expect(requirement.metrics).toEqual(expect.arrayContaining(['activation', 'roi']));
    expect(requirement.requestedView).toBe('trend');
    expect(requirement.dateRange.type).toBe('absolute');
    expect(requirement.dateRange.value).toMatch(/^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$/);
    expect(requirement.filters.media).toEqual(expect.arrayContaining(['巨量广告']));
  });

  it('normalizes Jiliang through resolver config seed instead of resolver code special cases', () => {
    const config = normalizeEntityResolutionConfig();
    const candidates = findEntityResolutionCandidates('Jiliang昨天消耗多少', 'media', config);

    expect(candidates[0]?.canonical).toBe('巨量广告');
    expect(candidates[0]?.source).toBe('domain_pack_seed');
  });

  it('keeps dictionary slot mappings in report policy tool contract', () => {
    const policy = normalizeReportQueryPolicy();
    const mediaCapability = policy.capabilities.find(item => item.capability_type === 'media_dictionary');

    expect(mediaCapability?.slot_mappings?.[0]).toEqual(expect.objectContaining({
      entity_type: 'media',
      identifier_key: 'media_id',
      target_keys: expect.arrayContaining(['mediaId', 'mediaIds', 'media_id']),
      summary_key: 'mediaId',
    }));
  });

  it('explains capability scoring with manifest source reasons', () => {
    const reportTool = tool('generic_report_fetch', 'fetch report data', {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      mediaId: { type: 'string' },
      roi: { type: 'number' },
      activation: { type: 'number' },
    });
    const capability = normalizeMcpToolToCapability(server([reportTool]), reportTool);
    capability.supports.metrics = ['roi', 'activation'];
    capability.supports.dimensions = ['date', 'media'];
    capability.supports.identifierTypes = ['media_id'];
    capability.supports.granularity = ['day'];
    const requirement = deriveUserRequirement('巨量昨天激活和 ROI 趋势');
    const decision = selectCapabilityForRequirement(requirement, [capability]);

    expect(decision.candidates[0]?.reasons.join('\n')).toContain('source_type:capability_manifest');
    expect(decision.candidates[0]?.reasons.join('\n')).toContain('score_delta');
  });

  it('does not boost report capability from metric keywords in tool name without manifest support', () => {
    const unsupportedTool = tool('roi_retention_daily_report', 'ROI and retention report text exists only in description', {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
    });
    const supportedTool = tool('generic_report_fetch', 'fetch report data', {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      roi: { type: 'number' },
    });
    const unsupportedCapability = normalizeMcpToolToCapability(server([unsupportedTool]), unsupportedTool);
    unsupportedCapability.supports.metrics = [];
    unsupportedCapability.supports.dimensions = ['date'];
    unsupportedCapability.supports.granularity = ['day'];
    const supportedCapability = normalizeMcpToolToCapability(server([supportedTool]), supportedTool);
    supportedCapability.supports.metrics = ['roi'];
    supportedCapability.supports.dimensions = ['date'];
    supportedCapability.supports.granularity = ['day'];

    const requirement = {
      ...deriveUserRequirement('昨天 ROI 趋势'),
      metrics: ['roi'],
      dimensions: [{ key: 'date', role: 'x_axis' as const }],
      dataRequirement: {
        requiredMetrics: ['roi'],
        requiredDimensions: ['date'],
        requiredGranularity: 'day' as const,
      },
      requestedView: 'trend' as const,
      dateRange: { type: 'absolute' as const, value: '2026-06-11~2026-06-11' },
    };
    const decision = selectCapabilityForRequirement(requirement, [unsupportedCapability, supportedCapability]);

    expect(decision.selected?.capabilityId).toBe(supportedCapability.capabilityId);
    expect(decision.candidates.find(item => item.capability.capabilityId === unsupportedCapability.capabilityId)?.reasons.join('\n') || '')
      .not.toContain('tool_name');
    expect(decision.candidates[0]?.reasons.join('\n')).toContain('source_type:capability_manifest');
  });

  it('builds metrics and dimensions from governed request signals instead of local fallbacks', () => {
    const reportTool = tool('generic_report_fetch', 'fetch report data', {
      appId: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      metric_keys: { type: 'array', items: { type: 'string' } },
      dimensions: { type: 'array', items: { type: 'string' } },
    });

    const built = buildReportToolInput(reportTool, '安卓巨量近30天ROI趋势', {
      appId: '123',
    });

    expect(built.input.metric_keys).toEqual(expect.arrayContaining(['roi']));
    expect(built.input.dimensions).toEqual(expect.arrayContaining(['terminal_os', 'date']));
    expect(built.input.dimensions).not.toEqual(expect.arrayContaining(['platform']));
  });
});
