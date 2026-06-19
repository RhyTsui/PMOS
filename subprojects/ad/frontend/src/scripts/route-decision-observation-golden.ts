import assert from 'node:assert/strict';
import { deriveRequestRouteDecision, deriveUserRequirement } from '../src/lib/request-understanding';
import { evaluateIntentRouteRules, matchesReportQueryRoute } from '../src/lib/intent-route-rules';
import { loadIntentRouteRulesSync } from '../src/lib/intent-route-rules-store';
import { selectSkillCandidate } from '../src/lib/skill-orchestration';
import { buildRouteDecisionObservation } from '../src/lib/route-decision-observation';
import type { PromptConfigMetadata } from '../src/lib/prompt-runtime-policy';
import type { ServiceIntent, ToolPurpose } from '../src/contracts/request-understanding/route-decision-contract';

const promptConfig = {
  route_prompt: {
    id: 'route_prompt',
    version: 1,
    name: 'route prompt',
    source: 'exact',
    fallback: false,
    cache_hit: true,
    match_strategy: 'exact',
    content_hash: 'sha256:test',
    content_length: 10,
    conflicts: [],
  },
} as unknown as PromptConfigMetadata;

const seedFallbackPromptConfig = {
  route_prompt: {
    id: 'route_prompt',
    version: 1,
    name: 'route prompt seed',
    source: 'builtin_fallback',
    fallback: true,
    cache_hit: false,
    match_strategy: 'fallback',
    content_hash: 'sha256:seed',
    content_length: 10,
    conflicts: [],
  },
} as unknown as PromptConfigMetadata;

const strongReportPromptConfig = {
  route_prompt: {
    id: 'route_prompt',
    version: 1,
    name: 'route prompt',
    source: 'exact',
    fallback: false,
    cache_hit: true,
    match_strategy: 'exact',
    content_hash: 'sha256:strong',
    content_length: 10,
    conflicts: [{ reason: 'strong_report_bias', prompt_ids: ['route_prompt'] }],
  },
} as unknown as PromptConfigMetadata;

function fakeCapability(toolName: string) {
  const capability = {
    capabilityId: `capability.${toolName}`,
    provider: 'mcp',
    capabilityType: 'data.report',
    dataDomain: 'advertising',
    supports: {
      metrics: ['activation'],
      dimensions: ['date'],
      identifierTypes: ['media_id'],
      granularity: ['day'],
      views: ['summary', 'trend', 'table'],
    },
    source: {
      sourceType: 'mcp',
      toolName,
      serverId: 'route-governance-test',
    },
  } as const;
  return {
    selected: capability,
    fallbackUsed: false,
    executionDecision: 'executable',
    dataCoverage: { covered: true, missing: [], reasons: ['test'] },
    presentationCoverage: { covered: true, missing: [], reasons: ['test'] },
    candidates: [{
      capability,
      score: 100,
      reasons: ['test'],
      dataCoverage: { covered: true, missing: [], reasons: ['test'] },
      presentationCoverage: { covered: true, missing: [], reasons: ['test'] },
    }],
    warnings: [],
  };
}

async function observe(params: {
  message: string;
  clientIntent?: string;
  actualIsReportQuery?: boolean;
  actualSelectedTool?: string;
  expectedServiceIntent?: ServiceIntent | ServiceIntent[];
  expectedToolPurpose?: ToolPurpose;
  promptConfigOverride?: PromptConfigMetadata;
  capabilityDecisionOverride?: any;
}) {
  const rules = loadIntentRouteRulesSync();
  const route = deriveRequestRouteDecision(params.message, { routeRules: rules });
  const requirement = deriveUserRequirement(params.message);
  const matchedRules = evaluateIntentRouteRules({ message: params.message, rules: rules.rules });
  const reportRouteMatch = matchesReportQueryRoute(params.message, rules);
  const blocked = ['help', 'diagnosis', 'debugging', 'demand', 'get_delivery_packages', 'monitor', 'forecast'].includes(route.intent_type);
  const isReportQuery = Boolean(
    (route.intent_type === 'report_query' || requirement.task === 'report_query')
    && reportRouteMatch
    && !blocked
  );
  const skillSelection = await selectSkillCandidate(params.message, route.intent_type, route.reason);
  const capabilityDecision = params.capabilityDecisionOverride ?? (isReportQuery ? fakeCapability(params.actualSelectedTool || 'get_ad_daily_report') : undefined);
  const observation = buildRouteDecisionObservation({
    decisionId: `test:${params.message}`,
    traceId: 'route-governance-test',
    message: params.message,
    clientIntent: params.clientIntent,
    routeIntent: route.intent_type,
    routeReason: route.reason,
    routeConfidence: route.confidence,
    resolvedIntent: isReportQuery ? 'report_query' : route.intent_type,
    matchedRules,
    reportRouteMatch,
    reportContinuation: false,
    userRequirementTask: requirement.task,
    routeWarnings: params.clientIntent && params.clientIntent !== route.intent_type
      ? [`client_intent_conflict:${params.clientIntent}->${route.intent_type}`]
      : [],
    selectedSkill: skillSelection.selected?.skill
      ? { skill_id: skillSelection.selected.skill.skill_id, name: skillSelection.selected.skill.name }
      : null,
    skillSelection,
    capabilityDecision,
    promptConfig: params.promptConfigOverride || promptConfig,
    isReportQuery,
    actualExecution: {
      actualServiceIntent: requirement.serviceIntent as ServiceIntent,
      actualIsReportQuery: params.actualIsReportQuery ?? isReportQuery,
      actualSelectedSkill: skillSelection.selected?.skill.skill_id,
      actualSelectedTool: params.actualSelectedTool,
      actualCapabilityId: capabilityDecision?.selected?.capabilityId,
    },
  });

  const expected = params.expectedServiceIntent;
  if (expected) {
    const allowed = Array.isArray(expected) ? expected : [expected];
    assert.ok(allowed.includes(observation.serviceIntent), `${params.message}: expected ${allowed.join('/')} got ${observation.serviceIntent}`);
  }
  if (params.expectedToolPurpose) {
    assert.equal(observation.toolPurpose, params.expectedToolPurpose, `${params.message}: toolPurpose`);
  }
  assert.equal(observation.mode, 'observe_only');
  assert.equal(observation.decisionAuthority.clientIntent, params.clientIntent ? 'hint_only' : 'ignored');
  assert.equal(observation.decisionAuthority.prompt, 'evidence_only');
  assert.equal(observation.decisionAuthority.domainSignals, 'evidence_only');
  assert.equal(observation.decisionAuthority.backendRouteDecision, 'authoritative');
  assert.equal(observation.promptRuntime?.cacheHit, params.promptConfigOverride?.route_prompt?.cache_hit ?? true);
  assert.equal(observation.domainSignals.every(signal => signal.evidenceOnly), true);
  return observation;
}

async function main(): Promise<void> {
  const api = await observe({
    message: 'OpenAI \u6700\u65b0 API \u600e\u4e48\u7528\uff1f',
    expectedServiceIntent: ['help_qa', 'general_chat'],
    actualIsReportQuery: false,
  });
  assert.equal(api.actualExecution.actualIsReportQuery, false);

  const support = await observe({
    message: '\u6211\u4eec\u652f\u4e0d\u652f\u6301\u76d1\u6d4b B\u7ad9\u5c0f\u6e38\u620f\uff1f',
    expectedServiceIntent: 'help_qa',
    actualIsReportQuery: false,
  });
  assert.equal(support.actualExecution.actualIsReportQuery, false);

  const config = await observe({
    message: 'B\u7ad9\u5c0f\u6e38\u620f\u76d1\u6d4b\u9700\u8981\u54ea\u4e9b\u914d\u7f6e\uff1f',
    expectedServiceIntent: 'help_qa',
    actualIsReportQuery: false,
  });
  assert.equal(config.actualExecution.actualIsReportQuery, false);

  const demand = await observe({
    message: '\u5e2e\u6211\u5199\u4e00\u4e2a\u5f52\u56e0\u5f02\u5e38\u6392\u67e5\u9700\u6c42',
    expectedServiceIntent: 'light_requirement',
    actualIsReportQuery: false,
  });
  assert.equal(demand.actualExecution.actualIsReportQuery, false);

  const diagnosis = await observe({
    message: '\u4e3a\u4ec0\u4e48\u6628\u5929 ROI \u4e0b\u964d\uff1f',
    expectedServiceIntent: 'issue_diagnosis',
    expectedToolPurpose: 'evidence_fetch',
    actualIsReportQuery: false,
  });
  assert.equal(diagnosis.actualExecution.actualIsReportQuery, false);

  const dataQuery = await observe({
    message: '\u6628\u5929\u5de8\u91cf\u6fc0\u6d3b\u591a\u5c11\uff1f',
    expectedServiceIntent: 'data_query',
    expectedToolPurpose: 'data_fetch',
    actualIsReportQuery: true,
    actualSelectedTool: 'get_ad_daily_report',
  });
  assert.equal(dataQuery.actualExecution.actualIsReportQuery, true);
  assert.equal(dataQuery.capabilityDecision?.executable?.toolName, 'get_ad_daily_report');

  const reportDelivery = await observe({
    message: '\u751f\u6210\u6628\u5929\u6295\u653e\u65e5\u62a5',
    expectedServiceIntent: 'report_delivery',
    expectedToolPurpose: 'report_generate',
    actualIsReportQuery: true,
    actualSelectedTool: 'get_ad_daily_report',
  });
  assert.equal(reportDelivery.actualExecution.actualIsReportQuery, true);

  const operation = await observe({
    message: '\u83b7\u53d6\u53ef\u7528\u5305\u5e76\u53d1\u8d77\u8054\u8c03',
    expectedServiceIntent: 'system_operation',
    expectedToolPurpose: 'package_fetch',
    actualIsReportQuery: false,
  });
  assert.equal(operation.actualExecution.actualIsReportQuery, false);
  assert.notEqual(operation.toolPurpose, 'data_fetch');

  const conflict = await observe({
    message: '\u6211\u4eec\u652f\u4e0d\u652f\u6301\u76d1\u6d4b B\u7ad9\u5c0f\u6e38\u620f\uff1f',
    clientIntent: 'report_query',
    expectedServiceIntent: 'help_qa',
    actualIsReportQuery: false,
  });
  assert.equal(conflict.clientIntent, 'report_query');
  assert.equal(conflict.actualExecution.actualIsReportQuery, false);
  assert.ok(conflict.warnings.some(item => item.code === 'client_intent_ignored' || item.code === 'client_intent_conflict'));

  assert.equal(api.promptRuntime?.activePromptId, 'route_prompt');
  assert.equal(api.promptRuntime?.slots?.route_prompt?.activePromptId, 'route_prompt');
  assert.equal(api.promptRuntime?.slots?.route_prompt?.cacheHit, true);
  assert.equal(api.promptRuntime?.seedFallbackUsed, false);

  const seedFallback = await observe({
    message: 'OpenAI latest API how to use?',
    expectedServiceIntent: ['help_qa', 'general_chat'],
    actualIsReportQuery: false,
    promptConfigOverride: seedFallbackPromptConfig,
  });
  assert.equal(seedFallback.promptRuntime?.seedFallbackUsed, true, 'runtime missing should expose seed fallback');
  assert.ok(seedFallback.governanceConflicts?.some(item => item.code === 'seed_fallback_used'));

  const strongPrompt = await observe({
    message: 'OpenAI latest API how to use?',
    expectedServiceIntent: ['help_qa', 'general_chat'],
    actualIsReportQuery: false,
    promptConfigOverride: strongReportPromptConfig,
  });
  assert.ok(strongPrompt.governanceConflicts?.some(item => item.code === 'prompt_strong_report_bias'));
  assert.equal(strongPrompt.actualExecution.actualIsReportQuery, false);

  const executableCapability = fakeCapability('get_ad_daily_report');
  const candidateOnlyCapability = {
    ...executableCapability,
    selected: undefined,
    executionDecision: 'needs_clarification',
  };
  const candidateOnly = await observe({
    message: '\u6628\u5929\u5de8\u91cf\u6fc0\u6d3b\u591a\u5c11\uff1f',
    expectedServiceIntent: 'data_query',
    actualIsReportQuery: true,
    capabilityDecisionOverride: candidateOnlyCapability,
  });
  assert.ok(candidateOnly.governanceConflicts?.some(item => item.code === 'candidate_capability_without_executable'));
  assert.equal(candidateOnly.capabilityDecision?.executable, undefined);

  const systemOperationConflict = await observe({
    message: '\u83b7\u53d6\u53ef\u7528\u5305\u5e76\u53d1\u8d77\u8054\u8c03',
    expectedServiceIntent: 'system_operation',
    expectedToolPurpose: 'package_fetch',
    actualIsReportQuery: false,
  });
  assert.equal(systemOperationConflict.actualExecution.actualIsReportQuery, false);
  assert.notEqual(systemOperationConflict.serviceIntent, 'data_query');
}

main()
  .then(() => {
    console.log('route decision observation golden cases passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
