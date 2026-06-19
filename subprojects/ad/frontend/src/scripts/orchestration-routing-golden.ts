import assert from 'node:assert/strict';
import { deriveRequestRouteDecision, deriveUserRequirement } from '../src/lib/request-understanding';
import { routeUserIntent } from '../src/lib/intent-router';
import { matchesReportQueryRoute } from '../src/lib/intent-route-rules';
import { selectCapabilityForRequirement } from '../src/lib/capability-orchestration';
import { parseSkillImportPackage } from '../src/lib/skill-import';
import { selectSkillCandidate, executeAndroidAttributionDiagnosisSkill } from '../src/lib/skill-orchestration';
import { selectReportTool } from '../src/lib/report-query-orchestrator';
import { CALLBACK_ATTR_DIAGNOSIS_SKILL_ID } from '../src/contracts/skills/callback-attribution-diagnosis';
import type { CapabilityManifest } from '../src/contracts/capability/capability-manifest';
import type { CompiledContextPackage, McpServerConfig, McpToolConfig } from '../src/types';

function tool(toolId: string, name: string, description: string): McpToolConfig {
  return {
    tool_id: toolId,
    name,
    description,
    input_schema: {
      type: 'object',
      required: ['appId', 'startDate', 'endDate', 'metric'],
      properties: {
        appId: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        metric: { type: 'string' },
        dimension: { type: 'string' },
        reportType: { type: 'string' },
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

function reportServer(id: string, name: string, tools: McpToolConfig[]): McpServerConfig {
  return server(id, name, tools);
}

function buildRequirement(text: string) {
  return deriveUserRequirement(text);
}

function buildCapability(id: string, toolName: string, supports: CapabilityManifest['supports']): CapabilityManifest {
  return {
    capabilityId: id,
    provider: 'mcp',
    capabilityType: 'data.report',
    dataDomain: 'advertising',
    supports,
    source: {
      sourceType: 'mcp',
      toolName,
    },
  };
}

function assertGeneralChatQuestion(): void {
  const message = 'OpenAI 最新 API 怎么用？';
  assert.equal(routeUserIntent(message).intent_type, 'help', 'API usage question should route to help');
  assert.equal(deriveRequestRouteDecision(message).intent_type, 'help', 'API usage question should stay in help route');
  assert.equal(selectReportTool([reportServer('report', 'Report MCP', [tool('day', 'get_zt_ad_day_report', 'daily report tool')])], message), null, 'help question should not select report tool');
}

function assertHelpQuestionsStayHelp(): void {
  const support = '我们支不支持监测B站小游戏？';
  const config = 'B站小游戏监测需要哪些配置？';
  const explain = '这个报表字段 cost 是什么意思？';
  for (const message of [support, config, explain]) {
    assert.notEqual(routeUserIntent(message).intent_type, 'report_query', `help-style question should not route to report_query: ${message}`);
    assert.notEqual(deriveRequestRouteDecision(message).intent_type, 'report_query', `backend route should not force report_query: ${message}`);
    assert.equal(selectReportTool([reportServer('report', 'Report MCP', [tool('day', 'get_zt_ad_day_report', 'daily report tool')])], message), null, `help-style question should not select report tool: ${message}`);
  }
  assert.equal(routeUserIntent(config).intent_type, 'help', 'configuration explanation should route to help on frontend route');
  assert.equal(deriveRequestRouteDecision(config).intent_type, 'help', 'configuration explanation should route to help on backend route');
  assert.equal(deriveUserRequirement(config).task, 'help', 'configuration explanation should be a help requirement');
}

function assertReportQuestionsSelectReportTool(): void {
  const servers = [
    reportServer('report', 'Report MCP', [
      tool('day', 'get_zt_ad_day_report', 'daily report tool'),
      tool('roi', 'get_zt_ad_roi_report', 'roi trend report tool'),
      tool('hour', 'get_zt_hour_report', 'hour report tool'),
    ]),
  ];
  const daily = '昨天巨量激活多少？';
  const roiTrend = '巨量近7天 ROI 趋势怎么样？';
  const reportDelivery = '生成昨天投放日报';
  assert.equal(routeUserIntent(daily).intent_type, 'report_query', 'daily numeric question should route to report_query');
  assert.equal(deriveRequestRouteDecision(daily).intent_type, 'report_query', 'daily numeric question should stay report_query');
  assert.equal(selectReportTool(servers, daily)?.tool.name, 'get_zt_ad_day_report', 'daily question should select day report tool');
  assert.equal(routeUserIntent(roiTrend).intent_type, 'report_query', 'roi trend question should route to report_query');
  assert.equal(selectReportTool(servers, roiTrend)?.tool.name, 'get_zt_ad_roi_report', 'roi trend should select roi report tool');
  assert.equal(routeUserIntent(reportDelivery).intent_type, 'report_query', 'report delivery should route to report_query');
  assert.equal(deriveRequestRouteDecision(reportDelivery).intent_type, 'report_query', 'report delivery should stay report_query');
}

function assertDiagnosisAndOperationQuestions(): void {
  const diagnosis = '为什么昨天 ROI 下降？';
  const requirement = deriveUserRequirement(diagnosis);
  assert.equal(requirement.task, 'diagnosis', 'diagnosis question should not become report requirement');
  assert.equal(deriveRequestRouteDecision(diagnosis).intent_type, 'diagnosis', 'diagnosis question should route to diagnosis');
  assert.equal(matchesReportQueryRoute(diagnosis), false, 'diagnosis question must not match ordinary report route');
  assert.equal(selectReportTool([reportServer('report', 'Report MCP', [tool('day', 'get_zt_ad_day_report', 'daily report tool')])], diagnosis), null, 'diagnosis question should not choose report tool as primary route');

  const operation = '获取可用包并发起联调';
  assert.notEqual(routeUserIntent(operation).intent_type, 'report_query', 'system operation should not route to report_query');
  assert.notEqual(deriveRequestRouteDecision(operation).intent_type, 'report_query', 'system operation should not become report_query');
}

function assertWritingDeliverableRoutesToDemand(): void {
  const message = '帮我写一个归因异常排查需求';
  assert.equal(routeUserIntent(message).intent_type, 'demand', 'writing deliverable should route to demand on frontend route');
  assert.equal(deriveRequestRouteDecision(message).intent_type, 'demand', 'writing deliverable should route to demand on backend route');
  assert.equal(deriveUserRequirement(message).task, 'demand', 'writing deliverable should be a demand requirement');
  assert.equal(matchesReportQueryRoute(message), false, 'writing deliverable should not match report route');
  assert.equal(selectReportTool([reportServer('report', 'Report MCP', [tool('day', 'get_zt_ad_day_report', 'daily report tool')])], message), null, 'writing deliverable should not select report tool');
}

function assertClientReportHintCannotForceHelpQuestion(): void {
  const message = '我们支不支持监测 B站小游戏？';
  const clientIntent = 'report_query';
  const route = deriveRequestRouteDecision(message);
  const reportMatch = matchesReportQueryRoute(message);
  const isReportQuery = route.intent_type === 'report_query' && reportMatch;
  assert.equal(clientIntent, 'report_query', 'test should simulate client report_query hint');
  assert.equal(route.intent_type, 'help', 'backend route must keep capability question as help');
  assert.equal(isReportQuery, false, 'client report_query hint must not force report query');
  assert.equal(selectReportTool([reportServer('report', 'Report MCP', [tool('day', 'get_zt_ad_day_report', 'daily report tool')])], message), null, 'client-hinted help question should not select report tool');
}

function assertStructuredProjectContextIsUsed(): Promise<void> {
  const compiledContext = {
    project: {
      currentProject: {
        appId: 123456,
        appName: '测试应用',
        projectId: 'project-123',
        projectName: '测试项目',
        packageName: 'com.example.test',
        platform: 'Android',
        channel: '巨量',
        media: '巨量',
        mediaName: '巨量引擎',
        appTypes: [],
        status: 'active',
        icon: '',
      },
    },
    businessContext: {
      app: undefined,
      media: undefined,
      timeRange: undefined,
      metrics: undefined,
      dimensions: undefined,
      latestResult: undefined,
      qualityCheck: undefined,
      evidenceRefs: [],
      updatedAt: new Date().toISOString(),
    },
  } as unknown as CompiledContextPackage;
  return executeAndroidAttributionDiagnosisSkill({
    message: '为什么昨天 ROI 下降？',
    compiledContext,
    servers: [],
  }).then((execution) => {
    assert.ok(!execution.missingFields.includes('app_query'), 'structured currentProject should satisfy app lookup');
  });
}

function assertSkillPackagePreview(): void {
  const parsed = parseSkillImportPackage({
    skill: {
      id: CALLBACK_ATTR_DIAGNOSIS_SKILL_ID,
      name: 'Android Attribution Diagnosis',
      category: 'diagnosis',
      endpoint_url: 'https://mcp.example.local',
      transport: 'streamable-http',
      auth_type: 'bearer_token',
    },
    contract: {
      skill_id: CALLBACK_ATTR_DIAGNOSIS_SKILL_ID,
      name: 'Android Attribution Diagnosis',
      category: 'diagnosis',
      intent_triggers: ['android', 'attribution'],
      input_schema: { type: 'object', properties: {} },
      workflow_steps: [],
      output_schema: { type: 'object', properties: {} },
      evaluation_cases: ['android-attribution-diagnosis-001'],
      risk_guardrails: ['evidence-first'],
    },
    manifest: {
      skillId: CALLBACK_ATTR_DIAGNOSIS_SKILL_ID,
      domain: 'ad-attribution-diagnosis',
      slotSchemaRef: 'android-attribution-callback-diagnosis.slot-schema',
      capabilityRequirementsRef: 'android-attribution-callback-diagnosis.capability-requirements',
      workflowRef: 'android-attribution-callback-diagnosis.workflow',
      promptFragmentRefs: ['diagnosis-role', 'evidence-first-policy'],
    },
    workflow: {
      workflowRef: 'android-attribution-callback-diagnosis.workflow',
      steps: [{ key: 'resolve_app_context' }, { key: 'check_callback_rule_match' }],
    },
    prompts: {
      diagnosisRole: 'role fragment',
      evidenceFirstPolicy: 'evidence fragment',
    },
    golden_cases: {
      cases: ['android-attribution-diagnosis-001', 'android-attribution-diagnosis-002'],
    },
    result_contract: {
      resultScreenType: 'workflow-result',
    },
    runtime_display: {
      runtimeDisplayRef: 'android-attribution-callback-diagnosis.runtime-display',
    },
    observability: {
      observabilityRef: 'android-attribution-callback-diagnosis.observability',
    },
  });

  assert.equal(parsed.preview.valid, true, 'skill package preview should be valid');
  assert.equal(parsed.preview.kind, 'skill-package', 'package must be recognized');
  const keys = parsed.preview.packageRefs?.map(item => item.key).sort() || [];
  assert.deepEqual(keys, ['golden_cases', 'manifest', 'observability', 'prompts', 'result_contract', 'runtime_display', 'workflow'].sort(), 'package preview should expose all package parts');
}

async function assertSkillSelection(): Promise<void> {
  const selected = await selectSkillCandidate('安卓归因为什么没回推', 'diagnosis', 'diagnosis route');
  assert.ok(selected.selected, 'diagnosis message should select a skill');
  assert.equal(selected.selected?.skill.skill_id, CALLBACK_ATTR_DIAGNOSIS_SKILL_ID, 'android diagnosis skill should be selected');

  const genericDiagnosis = await selectSkillCandidate('为什么昨天 ROI 下降？', 'diagnosis', 'diagnosis route');
  assert.notEqual(genericDiagnosis.selected?.skill.skill_id, CALLBACK_ATTR_DIAGNOSIS_SKILL_ID, 'generic diagnosis without android attribution trigger must not select android diagnosis skill');
  assert.equal(genericDiagnosis.candidates.some(candidate => candidate.skill.skill_id === CALLBACK_ATTR_DIAGNOSIS_SKILL_ID), false, 'android diagnosis skill must not participate without its domain trigger');
}

function assertCapabilityFullCoverage(): void {
  const requirement = buildRequirement('看下安卓素材近30天 ROI 趋势');
  const decision = selectCapabilityForRequirement(requirement, [
    buildCapability('mcp.android.material.report', 'get_android_material_report', {
      metrics: ['cost', 'roi'],
      dimensions: ['material', 'date'],
      identifierTypes: ['media_id', 'app_id', 'material_id', 'terminal_id'],
      granularity: ['day'],
      views: ['trend', 'table'],
    }),
  ]);
  assert.ok(decision.selected, 'full coverage capability should be selected');
  assert.equal(decision.fallbackUsed, false, 'full coverage must not fallback');
}

function assertPresentationFallbackDoesNotBlockCapability(): void {
  const requirement = buildRequirement('近30天巨量激活趋势');
  const decision = selectCapabilityForRequirement(requirement, [
    buildCapability('mcp.ad.daily.report', 'get_ad_daily_report', {
      metrics: ['activation'],
      dimensions: ['date'],
      identifierTypes: ['media_id'],
      granularity: ['day'],
      views: ['summary', 'table'],
    }),
  ]);
  assert.ok(decision.selected, 'data-covered capability should remain selected when trend presentation needs fallback');
  assert.equal(decision.executionDecision, 'executable_with_presentation_fallback', 'presentation fallback must not block data execution');
  assert.equal(decision.fallbackReason, undefined, 'presentation fallback must not become no_full_coverage');
  assert.equal(decision.warnings.some(item => item.includes('展示方式已降级')), true, 'presentation fallback warning should be visible');
}

function assertCapabilityUnavailable(): void {
  const requirement = buildRequirement('看下安卓素材近30天 ROI 趋势');
  const decision = selectCapabilityForRequirement(requirement, []);
  assert.equal(decision.selected, undefined, 'no capability should be selected');
  assert.equal(decision.fallbackReason, 'no_capability', 'empty registry should be reported explicitly');
}

function assertCapabilitySupportQuestionRoutesToHelp(): void {
  const message = '我们支不支持监测B站小游戏';
  assert.equal(routeUserIntent(message).intent_type, 'help', 'capability support question must not route to report_query on frontend route');
  assert.equal(deriveUserRequirement(message).task, 'general', 'capability support question must not become report_query requirement');
  assert.equal(deriveRequestRouteDecision(message).intent_type, 'help', 'capability support question must route to help on backend route');
}

function assertMultipleCapabilityCandidates(): void {
  const requirement = buildRequirement('看下安卓素材近30天 ROI 趋势');
  const capabilities = [
    buildCapability('mcp.android.material.report.a', 'get_android_material_report_a', {
      metrics: ['cost', 'roi'],
      dimensions: ['material', 'date'],
      identifierTypes: ['media_id', 'material_id', 'terminal_id'],
      granularity: ['day'],
      views: ['trend', 'table'],
    }),
    buildCapability('mcp.android.material.report.b', 'get_android_material_report_b', {
      metrics: ['cost', 'roi'],
      dimensions: ['material', 'date'],
      identifierTypes: ['media_id', 'material_id', 'terminal_id'],
      granularity: ['day'],
      views: ['trend', 'table'],
    }),
  ];
  const decision = selectCapabilityForRequirement(requirement, capabilities);
  assert.ok(decision.selected, 'multi-candidate capability should still select one');
  assert.ok(decision.candidates.length >= 2, 'multi-candidate state should be visible in trace');
}

async function assertMissingSlotExecution(): Promise<void> {
  const compiledContext = {
    project: { currentProject: null },
    businessContext: {
      app: undefined,
      media: undefined,
      timeRange: undefined,
      metrics: undefined,
      dimensions: undefined,
      latestResult: undefined,
      qualityCheck: undefined,
      evidenceRefs: [],
      updatedAt: new Date().toISOString(),
    },
  } as unknown as CompiledContextPackage;

  const execution = await executeAndroidAttributionDiagnosisSkill({
    message: '安卓归因为什么没回推',
    compiledContext,
    servers: [],
  });

  assert.equal(execution.status, 'blocked', 'missing slots must block execution');
  assert.ok(execution.missingFields.includes('app_query'), 'app field should be required');
  assert.ok(execution.missingFields.includes('date_start'), 'date_start should be required');
  assert.ok(execution.missingFields.includes('date_end'), 'date_end should be required');
}

async function main(): Promise<void> {
  assertGeneralChatQuestion();
  assertHelpQuestionsStayHelp();
  assertWritingDeliverableRoutesToDemand();
  assertClientReportHintCannotForceHelpQuestion();
  assertReportQuestionsSelectReportTool();
  assertDiagnosisAndOperationQuestions();
  await assertStructuredProjectContextIsUsed();
  assertSkillPackagePreview();
  await assertSkillSelection();
  assertCapabilityFullCoverage();
  assertPresentationFallbackDoesNotBlockCapability();
  assertCapabilityUnavailable();
  assertCapabilitySupportQuestionRoutesToHelp();
  assertMultipleCapabilityCandidates();
  await assertMissingSlotExecution();
  console.log('orchestration routing golden cases passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
