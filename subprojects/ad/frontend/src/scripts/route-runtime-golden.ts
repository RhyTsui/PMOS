import assert from 'node:assert/strict';
import { deriveUserRequirement, deriveRequestRouteDecision } from '../src/lib/request-understanding';
import { matchesReportQueryRoute } from '../src/lib/intent-route-rules';
import { buildCapabilityPreflight, buildReportToolInput, executeReportQueryStep, selectReportQuestionType, selectReportTool } from '../src/lib/report-query-orchestrator';
import { buildCapabilityManifest, discoverCapabilityCandidatesForMessage, selectCapabilityForRequirement } from '../src/lib/capability-orchestration';
import { loadReportQueryPolicySync } from '../src/lib/report-query-policy-store';
import type { CapabilityManifest } from '../src/contracts/capability/capability-manifest';
import type { McpServerConfig, McpToolConfig } from '../src/types';

function tool(name: string): McpToolConfig {
  return {
    tool_id: name,
    name,
    description: `${name} report tool`,
    input_schema: {
      type: 'object',
      required: ['appId', 'startDate', 'endDate', 'timeType'],
      properties: {
        appId: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        timeType: { type: 'string' },
        metric: { type: 'string' },
        metrics: { type: 'array', items: { type: 'string' } },
        dimension: { type: 'string' },
        granularity: { type: 'string' },
      },
    },
    enabled: true,
    bound_agents: ['ad-assistant'],
    access_mode: 'read',
    call_count: 0,
  };
}
function adGroupTool(name: string): McpToolConfig {
  return {
    tool_id: name,
    name,
    description: `${name} ad group report tool`,
    input_schema: {
      type: 'object',
      required: ['adGroupId', 'startDate', 'endDate', 'timeType'],
      properties: {
        adGroupId: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        timeType: { type: 'string' },
        metric: { type: 'string' },
        metrics: { type: 'array', items: { type: 'string' } },
        dimension: { type: 'string' },
        granularity: { type: 'string' },
      },
    },
    enabled: true,
    bound_agents: ['ad-assistant'],
    access_mode: 'read',
    call_count: 0,
  };
}

function server(id: string, name: string, tools: McpToolConfig[]): McpServerConfig {
  return {
    id,
    name,
    description: `${name} service`,
    category: 'data',
    endpoint_url: `https://${id}.example.local/mcp`,
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

function capability(): CapabilityManifest {
  return {
    capabilityId: 'report-capability',
    provider: 'mcp',
    capabilityType: 'data.report',
    dataDomain: 'advertising',
    supports: {
      metrics: ['activation', 'roi'],
      dimensions: ['media', 'date'],
      identifierTypes: ['app_id'],
      granularity: ['day', 'week'],
      views: ['summary', 'trend', 'table', 'detail', 'comparison'],
    },
    source: {
      sourceType: 'mcp',
      toolName: 'get_zt_ad_day_report',
      serverId: 'report-mcp',
    },
  };
}

function assertRequirementIntent(message: string, expectedServiceIntent: string, expectedTask?: string): void {
  const requirement = deriveUserRequirement(message);
  assert.equal(requirement.serviceIntent, expectedServiceIntent, `${message} serviceIntent`);
  if (expectedTask) assert.equal(requirement.task, expectedTask, `${message} task`);
  assert.ok(Array.isArray(requirement.routeEvidence) && requirement.routeEvidence.length > 0, `${message} must expose route evidence`);
}

async function assertRuntimeFlow(): Promise<void> {
  assertRequirementIntent('OpenAI API 怎么用？', 'help_qa', 'help');
  assertRequirementIntent('B站小游戏监测需要哪些配置?', 'help_qa', 'help');
  assertRequirementIntent('帮我写一个归因异常排查需求', 'light_requirement', 'demand');
  assertRequirementIntent('为什么昨天 ROI 下降?', 'issue_diagnosis', 'diagnosis');

  const diagnosis = '为什么昨天 ROI 下降?';
  assert.equal(matchesReportQueryRoute(diagnosis), false, 'diagnosis should not match ordinary report route');
  assert.equal(deriveRequestRouteDecision(diagnosis).intent_type, 'diagnosis', 'diagnosis should stay diagnosis on backend route');

  const reportMessage = '昨天巨量激活多少?';
  const dailyReport = '查日报';
  const reportDeliveryTool = {
    ...tool('get_zt_ad_day_report'),
    displayName: 'daily report delivery capability',
    supportedServiceIntents: ['report_delivery'] as const,
    primaryGoal: 'report_delivery',
    aliases: ['daily report capability'],
    examples: ['查日报', '看一下这个项目情况'],
    triggerHints: ['查日报', '看一下这个项目情况'],
    defaultInputs: { metrics: ['cost', 'activation', 'roi'], timeType: 'day' },
  };
  const capabilityManifest = buildCapabilityManifest([server('report-mcp', 'Report MCP', [reportDeliveryTool])]);
  const dailyCapabilityCandidates = discoverCapabilityCandidatesForMessage(dailyReport, capabilityManifest);
  assert.ok(dailyCapabilityCandidates.some(candidate => candidate.capability.source.toolName === 'get_zt_ad_day_report'), `${dailyReport} should discover report delivery capability`);
  assert.equal(deriveRequestRouteDecision(dailyReport, { capabilityCandidates: dailyCapabilityCandidates }).intent_type, 'report_query', `${dailyReport} should route to report_query when capability evidence is active`);
  assert.equal(deriveRequestRouteDecision(dailyReport).intent_type, 'general', `${dailyReport} should not be hardcoded in Chat Core without capability evidence`);
  assert.equal(selectReportQuestionType(dailyReport), 'daily', `${dailyReport} should map to daily report question type`);

  const projectOverview = '看一下这个项目情况';
  const projectOverviewDecision = deriveRequestRouteDecision(projectOverview, {
    capabilityCandidates: discoverCapabilityCandidatesForMessage(projectOverview, capabilityManifest),
  });
  assert.equal(projectOverviewDecision.intent_type, 'report_query', `${projectOverview} should stay on report_query`);

  const reportRequirement = deriveUserRequirement(reportMessage);
  assert.ok(reportRequirement.serviceIntent === 'data_query' || reportRequirement.serviceIntent === 'report_delivery', `${reportMessage} should be report-oriented`);
  assert.equal(deriveRequestRouteDecision(reportMessage).intent_type, 'report_query', `${reportMessage} should route to report_query`);

  const teamComparisonMessage = '查看一下不同团队的消耗和首日ROI表现';
  const teamComparisonRequirement = deriveUserRequirement(teamComparisonMessage);
  assert.equal(teamComparisonRequirement.task, 'report_query', `${teamComparisonMessage} should stay in report query`);
  assert.ok(teamComparisonRequirement.dimensions.some(item => item.key === 'team'), `${teamComparisonMessage} should recognize team as a dimension`);
  assert.ok(!teamComparisonRequirement.requiredIdentifiers.includes('team_id'), `${teamComparisonMessage} should not require a concrete team_id`);

  const selectedType = selectReportQuestionType(reportMessage);
  assert.equal(selectedType, 'daily', `${reportMessage} should map to daily report question type`);
  const selectedTool = selectReportTool([server('report-mcp', 'Report MCP', [tool('get_zt_ad_day_report')])], reportMessage);
  assert.ok(selectedTool, `${reportMessage} should select a report tool`);
  assert.equal(selectedTool?.tool.name, 'get_zt_ad_day_report', `${reportMessage} should use the daily report tool`);

  const capabilityDecision = selectCapabilityForRequirement(reportRequirement, [capability()]);
  assert.equal(capabilityDecision.executionDecision, 'executable', `${reportMessage} capability should be executable`);
  assert.equal(capabilityDecision.selected?.capabilityId, 'report-capability', `${reportMessage} should select the report capability`);

  const preflight = buildCapabilityPreflight({
    servers: [server('report-mcp', 'Report MCP', [tool('get_zt_ad_day_report')])],
    selected: selectedTool!,
    message: reportMessage,
    baseInput: {},
    appId: '',
    policy: loadReportQueryPolicySync(),
  });
  assert.equal(preflight.missing_context_fields.length, 0, 'appId absence must not become a universal blocking field');
  assert.equal(preflight.ok || preflight.missing_capabilities.length > 0, true, 'preflight must stay capability-based');

  const adapted = buildReportToolInput(selectedTool!.tool, reportMessage, {});
  assert.equal(adapted.input.appId || adapted.input.projectId || adapted.input.project_id, undefined, 'tool input should not invent appId');
  assert.ok(adapted.input.startDate || adapted.input.start_date, 'tool input should still derive date fields');

  const adGroupStep = await executeReportQueryStep({
    servers: [server('ad-group-mcp', 'Ad Group MCP', [adGroupTool('get_ad_group_performance_report')])],
    message: '查某个广告组表现',
    baseInput: {},
    capabilityDecision: {
      selected: {
        capabilityId: 'ad-group-capability',
        source: { toolName: 'get_ad_group_performance_report' },
      },
    },
  });
  assert.equal(adGroupStep.business_outcome, 'need_clarification', 'ad group query should clarify when required tool inputs are missing');
  assert.equal(adGroupStep.tool_execution_status, 'not_called', 'missing tool inputs must not trigger execution');
  assert.equal(adGroupStep.tool_chain.filter(item => item.status === 'success' || item.status === 'failed').length, 0, 'tool call count must stay zero before execution');
}

assertRuntimeFlow()
  .then(() => {
    console.log('route-runtime-golden: ok');
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
