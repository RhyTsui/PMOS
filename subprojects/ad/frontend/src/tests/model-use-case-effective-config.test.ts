import { describe, expect, it } from 'vitest';
import {
  GOVERNED_REPORT_QUERY_LLM_NODES,
  MODEL_USE_CASE_REGISTRY,
  validateModelOutputContract,
} from '../src/contracts/model-service';
import { buildModelParticipationRecord } from '../src/lib/model-router';
import { buildModelUseCaseObservation } from '../src/lib/model-use-case-effective-config';
import { buildEffectiveModelRoute, type ModelServiceConfig } from '../src/lib/runtime-config';
import type { ModelUseCase } from '../src/contracts/model-service';

const baseModelConfig: ModelServiceConfig = {
  enabled: true,
  provider: 'coze_openai_compatible',
  providerLabel: 'Test Provider',
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
  updatedAt: '2026-06-07T00:00:00.000Z',
  routes: {},
};

const allowExternalModelPolicy = {
  dataClass: 'internal' as const,
  requireDesensitization: true,
  allowExternalModel: true,
  auditRequired: true,
};

function configWithRoute(useCase: ModelUseCase, enabled: boolean, routeMode: 'direct_external' | 'disabled' = 'direct_external'): ModelServiceConfig {
  return {
    ...baseModelConfig,
    routes: {
      [useCase]: {
        useCase,
        enabled,
        routeMode,
        dataPolicy: allowExternalModelPolicy,
        updatedAt: '2026-06-08T00:00:00.000Z',
      },
    },
  };
}

function configWithAllGovernedRoutes(): ModelServiceConfig {
  return {
    ...baseModelConfig,
    routes: Object.fromEntries(GOVERNED_REPORT_QUERY_LLM_NODES.map(useCase => [useCase, {
      useCase,
      enabled: true,
      routeMode: 'direct_external',
      dataPolicy: allowExternalModelPolicy,
      updatedAt: '2026-06-08T00:00:00.000Z',
    }])) as ModelServiceConfig['routes'],
  };
}

describe('model use case governance', () => {
  it('defines every governed report-query LLM node in the registry', () => {
    const definitions = new Map(MODEL_USE_CASE_REGISTRY.map(item => [item.useCase, item]));
    for (const node of GOVERNED_REPORT_QUERY_LLM_NODES) {
      const definition = definitions.get(node);
      expect(definition, node).toBeTruthy();
      expect(definition?.modelUseCase).toBe(node);
      expect(definition?.node).toBe(node);
      expect(definition?.canAffectToolArgs).toBe(false);
      expect(definition?.canAffectPermission).toBe(false);
      expect(definition?.defaultPromptId).toBeTruthy();
      expect(definition?.defaultModelRoute).toBeTruthy();
      expect(definition?.outputContract).toBeTruthy();
      expect(definition?.fallbackPolicy).toBeTruthy();
    }
  });

  it('enables every governed report-query LLM node by default', () => {
    const definitions = new Map(MODEL_USE_CASE_REGISTRY.map(item => [item.useCase, item]));
    const modelConfig = configWithAllGovernedRoutes();
    for (const node of GOVERNED_REPORT_QUERY_LLM_NODES) {
      const definition = definitions.get(node);
      const route = buildEffectiveModelRoute(modelConfig, node);
      expect(definition?.enabled, node).toBe(true);
      expect(definition?.defaultEnabled, node).toBe(true);
      expect(definition?.routeMode, node).not.toBe('disabled');
      expect(route.enabled, node).toBe(true);
      expect(route.routeMode, node).toBe('direct_external');
    }
  });

  it('records not_configured when a use case has no active prompt', async () => {
    const trace = await buildModelUseCaseObservation({
      modelUseCase: 'query_contract_building',
      promptId: 'missing-active-prompt',
      modelServiceConfig: configWithRoute('query_contract_building', true),
    });

    expect(trace.status).toBe('not_configured');
    expect(trace.fallback_used).toBe(true);
    expect(trace.prompt_id).toBe('missing-active-prompt');
    expect(trace.can_affect_tool_args).toBe(false);
  });

  it('records disabled when the model route is disabled', async () => {
    const trace = await buildModelUseCaseObservation({
      modelUseCase: 'entity_candidate_extraction',
      promptId: 'model-use-case.entity_candidate_extraction',
      modelServiceConfig: configWithRoute('entity_candidate_extraction', false, 'disabled'),
    });

    expect(trace.status).toBe('disabled');
    expect(trace.fallback_reason).toBe('route_disabled');
  });

  it('blocks direct_external route when data policy disallows external model', () => {
    const route = buildEffectiveModelRoute({
      ...baseModelConfig,
      routes: {
        answer_composition: {
          useCase: 'answer_composition',
          enabled: true,
          routeMode: 'direct_external',
          dataPolicy: { ...allowExternalModelPolicy, allowExternalModel: false },
          updatedAt: '2026-06-08T00:00:00.000Z',
        },
      },
    }, 'answer_composition');

    expect(route.enabled).toBe(false);
    expect(route.policyBlocked).toBe(true);
    expect(route.policyBlockReason).toBe('direct_external_blocked_by_data_policy');
    expect(route.isRealLLMCall).toBe(false);
  });

  it('defaults direct_external route to allow external model when data policy is not configured', () => {
    const route = buildEffectiveModelRoute({
      ...baseModelConfig,
      routes: {
        answer_composition: {
          useCase: 'answer_composition',
          enabled: true,
          routeMode: 'direct_external',
        },
      },
    }, 'answer_composition');

    expect(route.enabled).toBe(true);
    expect(route.policyBlocked).toBe(false);
    expect(route.dataPolicy.allowExternalModel).toBe(true);
    expect(route.isRealLLMCall).toBe(true);
  });

  it('keeps explicit external-model block regardless of route age', () => {
    const route = buildEffectiveModelRoute({
      ...baseModelConfig,
      routes: {
        answer_composition: {
          useCase: 'answer_composition',
          enabled: true,
          routeMode: 'direct_external',
          dataPolicy: { ...allowExternalModelPolicy, allowExternalModel: false },
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      },
    }, 'answer_composition');

    expect(route.enabled).toBe(false);
    expect(route.policyBlocked).toBe(true);
    expect(route.dataPolicy.allowExternalModel).toBe(false);
  });

  it('projects per-use-case generation params into effective route', () => {
    const route = buildEffectiveModelRoute({
      ...baseModelConfig,
      routes: {
        query_contract_building: {
          useCase: 'query_contract_building',
          enabled: true,
          routeMode: 'direct_external',
          dataPolicy: allowExternalModelPolicy,
          generationParams: {
            timeoutMs: 5000,
            maxTokens: 640,
            jsonMode: true,
            temperature: 0.1,
          },
        },
      },
    }, 'query_contract_building');

    expect(route.generationParams.timeoutMs).toBe(5000);
    expect(route.generationParams.maxTokens).toBe(640);
    expect(route.generationParams.jsonMode).toBe(true);
    expect(route.generationParams.temperature).toBe(0.1);
  });

  it('marks hardcoded instruction fallback with promptSource=hardcoded', () => {
    const trace = buildModelParticipationRecord({
      useCase: 'report_summary',
      promptId: 'report_summary',
      promptSource: 'hardcoded',
      promptText: 'hardcoded instruction',
      effectiveRoute: buildEffectiveModelRoute(configWithRoute('report_summary', true), 'report_summary'),
      status: 'fallback_to_rules',
      warnings: ['hardcoded instruction is fallback only'],
    });

    expect(trace.prompt_source).toBe('hardcoded');
    expect(trace.fallback_used).toBe(true);
  });

  it('falls back when model output fails schema validation', () => {
    const validation = validateModelOutputContract('QueryUnderstandingContract', { metrics: 'roi' });
    const trace = buildModelParticipationRecord({
      useCase: 'query_contract_building',
      promptId: 'model-use-case.query_contract_building',
      promptSource: 'seed',
      promptText: 'schema validation failed',
      effectiveRoute: buildEffectiveModelRoute(configWithRoute('query_contract_building', true), 'query_contract_building'),
      status: validation.blockedByPolicy ? 'blocked_by_policy' : 'invalid_output_fallback',
      validationStatus: validation.validationStatus,
      validationError: validation.validationError,
      warnings: [validation.validationError || 'validation failed'],
    });

    expect(trace.status).toBe('invalid_output_fallback');
    expect(trace.validation_status).toBe('failed');
    expect(trace.fallback_used).toBe(true);
  });

  it('blocks forbidden model authority fields before consumption', () => {
    const validation = validateModelOutputContract('DetectedEntityContract', {
      entities: [],
      finalArgs: { mediaId: '1' },
      promotionSource: '2',
    });
    const trace = buildModelParticipationRecord({
      useCase: 'entity_candidate_extraction',
      promptId: 'model-use-case.entity_candidate_extraction',
      promptSource: 'seed',
      promptText: 'blocked by policy',
      effectiveRoute: buildEffectiveModelRoute(configWithRoute('entity_candidate_extraction', true), 'entity_candidate_extraction'),
      status: validation.blockedByPolicy ? 'blocked_by_policy' : 'invalid_output_fallback',
      validationStatus: validation.validationStatus,
      validationError: validation.validationError,
      droppedFields: validation.droppedFields,
      dropReason: validation.dropReason,
      warnings: [validation.validationError || 'blocked'],
    });

    expect(trace.status).toBe('blocked_by_policy');
    expect(trace.dropped_fields).toContain('finalArgs');
    expect(trace.dropped_fields).toContain('promotionSource');
    expect(trace.can_affect_tool_args).toBe(false);
  });
});
