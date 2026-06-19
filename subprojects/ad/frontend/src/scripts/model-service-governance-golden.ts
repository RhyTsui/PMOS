import assert from 'node:assert/strict';
import { cozeLoopTracer } from '@cozeloop/ai';
import {
  MODEL_USE_CASE_REGISTRY,
  type ModelRouteConfig,
  type ModelUseCase,
} from '../src/contracts/model-service';
import {
  buildEffectiveModelRoute,
  getModelServiceConfig,
  updateModelServiceConfig,
  withRuntimeConfigOverrides,
  type ModelServiceConfig,
} from '../src/lib/runtime-config';
import { evaluateChatAnswerBoundary } from '../src/lib/chat-answer-boundary';
import { generateModelText } from '../src/lib/model-router';
import { safeTraceable } from '../src/lib/trace';

const expectedUseCases: ModelUseCase[] = [
  'request_understanding',
  'intent_routing_review',
  'chat_answer',
  'knowledge_answer',
  'query_contract_building',
  'entity_candidate_extraction',
  'ambiguity_detection',
  'resolver_disambiguation_review',
  'capability_ranking_review',
  'report_summary',
  'diagnosis_summary',
  'automation_summary',
  'requirement_drafting',
  'conversation_title',
  'recommendation',
  'parameter_resolution',
  'capability_discovery',
  'required_input_assist',
  'tool_selection_review',
  'data_result_interpretation',
  'answer_composition',
  'metric_formula_explanation',
  'calculation_audit',
  'operation_risk_review',
  'permission_explanation',
  'planner_shadow',
  'trace_summary',
  'trace_anomaly_review',
  'response_contract_review',
  'component_binding_suggestion',
  'prompt_preview',
  'model_connectivity_test',
  'prompt_quality_review',
  'route_case_explanation',
  'config_change_summary',
  'release_note_generation',
];

const baseConfig: ModelServiceConfig = {
  enabled: true,
  provider: 'coze_openai_compatible',
  providerLabel: 'Test Provider',
  defaultModelProfileId: 'test-profile',
  modelProfiles: [{
    id: 'test-profile',
    name: 'Test Profile',
    provider: 'coze_openai_compatible',
    providerLabel: 'Test Provider',
    enabled: true,
    apiKey: 'test-key',
    baseUrl: 'https://gateway.example.com',
    modelBaseUrl: 'https://gateway.example.com/v1',
    modelName: 'test-model',
  }],
  apiKey: 'test-key',
  baseUrl: 'https://gateway.example.com',
  modelBaseUrl: 'https://gateway.example.com/v1',
  modelName: 'test-model',
  knowledgeBaseUrl: '',
  knowledgeBaseApiKey: '',
  knowledgeBaseDataset: '',
  controlledGlossaryKnowledgeBaseId: '',
  datakiBaseUrl: 'https://dataki.example.com',
  datakiAdminEmail: '',
  datakiAdminPassword: '',
  notes: '',
  updatedAt: '2026-06-03T00:00:00.000Z',
  routes: {},
};

function withRoute(useCase: ModelUseCase, route: ModelRouteConfig): ModelServiceConfig {
  return {
    ...baseConfig,
    routes: {
      ...baseConfig.routes,
      [useCase]: route,
    },
  };
}

async function main() {
  const actualUseCases = MODEL_USE_CASE_REGISTRY.map((item) => item.useCase).sort();
  assert.deepEqual(actualUseCases, [...expectedUseCases].sort(), 'ModelUseCase registry should include every planned use case');
  assert.equal(new Set(actualUseCases).size, actualUseCases.length, 'ModelUseCase registry should not contain duplicates');

  const persistedModelConfig = await getModelServiceConfig();
  await withRuntimeConfigOverrides({}, async () => {
    const scoped = await updateModelServiceConfig({
      ...persistedModelConfig,
      enabled: !persistedModelConfig.enabled,
    });
    assert.equal(scoped.enabled, !persistedModelConfig.enabled, 'scoped runtime config override should allow temporary model-service changes');
    assert.equal((await getModelServiceConfig()).enabled, !persistedModelConfig.enabled, 'scoped getModelServiceConfig should read the override');
  });
  assert.equal((await getModelServiceConfig()).enabled, persistedModelConfig.enabled, 'temporary runtime config override must not persist modelService.enabled');

  const conversationTitle = MODEL_USE_CASE_REGISTRY.find((item) => item.useCase === 'conversation_title');
  assert.equal(conversationTitle?.currentStatus, 'implemented');
  assert.equal(conversationTitle?.defaultEnabled, true);

  const chatAnswer = MODEL_USE_CASE_REGISTRY.find((item) => item.useCase === 'chat_answer');
  assert.equal(chatAnswer?.currentStatus, 'implemented');
  assert.equal(chatAnswer?.defaultEnabled, true);

  const disabled = buildEffectiveModelRoute(withRoute('recommendation', {
    useCase: 'recommendation',
    enabled: false,
    routeMode: 'disabled',
  }), 'recommendation');
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.isRealLLMCall, false);
  assert.equal(disabled.fallbackUsed, true);

  const templateOnly = buildEffectiveModelRoute(withRoute('recommendation', {
    useCase: 'recommendation',
    enabled: true,
    routeMode: 'template_only',
  }), 'recommendation');
  assert.equal(templateOnly.enabled, true);
  assert.equal(templateOnly.isRealLLMCall, false);
  assert.equal(templateOnly.fallbackUsed, true);

  const gatewayControlled = buildEffectiveModelRoute(withRoute('recommendation', {
    useCase: 'recommendation',
    enabled: true,
    routeMode: 'gateway_controlled',
    gateway: {
      enabled: true,
      gatewayId: 'configured-gateway',
      gatewayName: '统一模型网关',
      policyId: 'policy-001',
      mode: 'policy_check',
    },
  }), 'recommendation');
  assert.equal(gatewayControlled.gatewayEnabled, true);
  assert.equal(gatewayControlled.gatewayId, 'configured-gateway');
  assert.equal(gatewayControlled.gatewayName, '统一模型网关');
  assert.equal(gatewayControlled.policyId, 'policy-001');
  assert.equal(gatewayControlled.isRealLLMCall, true);
  assert.equal(gatewayControlled.warnings.some((warning) => /henness/i.test(warning)), false);

  const plannedRealCall = buildEffectiveModelRoute(withRoute('chat_answer', {
    useCase: 'chat_answer',
    enabled: true,
    routeMode: 'direct_external',
    dataPolicy: {
      dataClass: 'internal',
      requireDesensitization: true,
      allowExternalModel: true,
      auditRequired: true,
    },
  }), 'chat_answer');
  assert.equal(plannedRealCall.isRealLLMCall, true);
  assert.equal(plannedRealCall.warnings.length, 0);

  assert.equal(evaluateChatAnswerBoundary({
    serviceIntent: 'general_chat',
    routeIntent: 'general',
    isReportQuery: false,
  }).allowed, true, 'general_chat should allow chat_answer');

  assert.equal(evaluateChatAnswerBoundary({
    serviceIntent: 'help_qa',
    routeIntent: 'help',
    isReportQuery: false,
  }).allowed, true, 'help_qa without tool should allow chat_answer');

  assert.equal(evaluateChatAnswerBoundary({
    serviceIntent: 'light_requirement',
    routeIntent: 'demand',
    isReportQuery: false,
  }).allowed, true, 'light_requirement can be assisted when no tool is executable');

  assert.equal(evaluateChatAnswerBoundary({
    serviceIntent: 'data_query',
    routeIntent: 'report_query',
    isReportQuery: true,
  }).allowed, false, 'data_query/report_query should not allow chat_answer before tool execution');

  assert.equal(evaluateChatAnswerBoundary({
    serviceIntent: 'issue_diagnosis',
    routeIntent: 'diagnosis',
    isReportQuery: false,
  }).allowed, false, 'issue_diagnosis should not allow chat_answer before evidence is complete');

  assert.equal(evaluateChatAnswerBoundary({
    serviceIntent: 'system_operation',
    routeIntent: 'get_delivery_packages',
    isReportQuery: false,
  }).allowed, false, 'system_operation should not allow chat_answer');

  assert.equal(evaluateChatAnswerBoundary({
    serviceIntent: 'general_chat',
    routeIntent: 'general',
    isReportQuery: false,
    hasExecutableTool: true,
  }).allowed, false, 'executable tool should block chat_answer takeover');

  const disabledAssist = await generateModelText({
    useCase: 'report_summary',
    promptId: 'report_summary',
    messages: [{ role: 'user', content: 'summarize report result' }],
    fallback: 'template summary',
    modelServiceConfig: withRoute('report_summary', {
      useCase: 'report_summary',
      enabled: false,
      routeMode: 'disabled',
    }),
  });
  assert.equal(disabledAssist.source, 'disabled');
  assert.equal(disabledAssist.text, 'template summary');
  assert.equal(disabledAssist.participation.model_use_case, 'report_summary');
  assert.equal(disabledAssist.participation.status, 'disabled');
  assert.equal(disabledAssist.participation.route_mode, 'disabled');
  assert.equal(disabledAssist.participation.fallback_reason, 'route_disabled');
  assert.equal(disabledAssist.participation.input_schema, 'report_result');
  assert.equal(disabledAssist.participation.output_schema, 'GroundedInterpretationContract');
  assert.ok(disabledAssist.participation.prompt_hash, 'model participation should record prompt hash');

  console.log('model service governance golden cases passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
