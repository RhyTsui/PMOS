import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelParticipationRecord, PromptConfig, PromptVersion } from '../src/types';
import type { ModelServiceConfig } from '../src/lib/runtime-config';

let modelText = '{}';

const allowExternalModelPolicy = {
  dataClass: 'internal' as const,
  requireDesensitization: true,
  allowExternalModel: true,
  auditRequired: true,
};

const activePrompt: PromptConfig = {
  id: 'model-use-case.answer_composition',
  key: 'model-use-case.answer_composition',
  name: '答案组装提示词',
  scope: 'model-use-case.answer_composition',
  expectation: 'test',
  status: 'active',
  current_version: 1,
  binding: {
    workflow: 'report_query',
    modelUseCase: 'answer_composition',
    promptSource: 'seed',
    status: 'active',
    inputVariables: ['semanticResult'],
    outputSchema: { contract: 'GroundedAnswerContract' },
  },
  updated_at: '2026-06-07T00:00:00.000Z',
  enabled: true,
  prompt_source: 'seed',
  input_variables: ['semanticResult'],
  output_schema: { contract: 'GroundedAnswerContract' },
};

const activeVersion: PromptVersion = {
  version: 1,
  content: '只输出 JSON',
  created_at: '2026-06-07T00:00:00.000Z',
  author: 'system',
  change_note: 'seed',
  content_hash: 'hash-v1',
};

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
  routes: {
    answer_composition: {
      useCase: 'answer_composition',
      enabled: true,
      routeMode: 'direct_external',
      dataPolicy: allowExternalModelPolicy,
      updatedAt: '2026-06-08T00:00:00.000Z',
    },
    query_contract_building: {
      useCase: 'query_contract_building',
      enabled: true,
      routeMode: 'direct_external',
      dataPolicy: allowExternalModelPolicy,
      updatedAt: '2026-06-08T00:00:00.000Z',
    },
    entity_candidate_extraction: {
      useCase: 'entity_candidate_extraction',
      enabled: true,
      routeMode: 'direct_external',
      dataPolicy: allowExternalModelPolicy,
      updatedAt: '2026-06-08T00:00:00.000Z',
    },
    chat_answer: {
      useCase: 'chat_answer',
      enabled: true,
      routeMode: 'direct_external',
      dataPolicy: allowExternalModelPolicy,
      updatedAt: '2026-06-08T00:00:00.000Z',
    },
  },
};

vi.mock('../src/lib/prompt-store', () => ({
  getPrompt: vi.fn(async () => activePrompt),
  listPromptVersions: vi.fn(async () => [activeVersion]),
  getPromptContent: vi.fn(async () => activeVersion.content),
}));

vi.mock('../src/lib/model-router', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/model-router')>('../src/lib/model-router');
  return {
    ...actual,
    generateModelText: vi.fn(async (input: { useCase: string; promptId?: string; promptSource?: string }) => ({
      text: modelText,
      source: 'model',
      modelName: 'test-model',
      effectiveRoute: {
        useCase: input.useCase,
        enabled: true,
        routeMode: 'direct_external',
        provider: 'coze_openai_compatible',
        modelName: 'test-model',
        source: 'runtime_config',
        gatewayEnabled: false,
        fallbackUsed: false,
        isRealLLMCall: true,
        hasModelSpan: true,
        promptIds: [input.promptId || input.useCase],
        warnings: [],
        generationParams: {},
        fallback: {},
        dataPolicy: {},
        tracePolicy: {},
      },
      fallbackUsed: false,
      warnings: [],
      participation: {
        node: input.useCase,
        model_use_case: input.useCase,
        modelUseCase: input.useCase,
        model_name: 'test-model',
        provider: 'coze_openai_compatible',
        route_mode: 'grounded_compose',
        model_route_id: input.useCase,
        prompt_id: input.promptId || input.useCase,
        prompt_source: input.promptSource || 'seed',
        prompt_hash: 'hash-v1',
        content_hash: 'hash-v1',
        input_schema: 'report_result_and_message_contract',
        output_schema: 'GroundedAnswerContract',
        status: 'attempted',
        consumed: false,
        output_consumed: false,
        fallback_used: false,
        can_affect_tool_args: false,
        can_affect_permission: false,
        can_affect_final_answer: true,
        warnings: [],
      } as ModelParticipationRecord,
    })),
  };
});

describe('ModelUseCaseRuntime', () => {
  beforeEach(() => {
    modelText = '{}';
  });

  const validAnswerCompositionInput = {
    message: '请总结这次结果',
    userRequirement: { task: 'summary' },
    semanticResult: { evidenceRefs: ['ev-test'] },
    businessSummary: { title: '测试结果' },
    status: 'success',
    baseAnswer: '模板答案',
  };

  it('consumes validated grounded answer output', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = JSON.stringify({ answerMarkdown: '模型答案', evidenceRefs: [], sourceRefs: [], nextActions: [] });

    const result = await runModelUseCase({
      useCase: 'answer_composition',
      input: validAnswerCompositionInput,
      fallbackText: '模板答案',
      modelServiceConfig: baseModelConfig,
      consume: { enabled: true, consumedBy: 'answer_composition', textField: 'answerMarkdown' },
    });

    expect(result.text).toBe('模型答案');
    expect(result.participation.status).toBe('succeeded_consumed');
    expect(result.participation.validation_status).toBe('passed');
  });

  it('records succeeded_not_consumed when output is valid but not consumed', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = JSON.stringify({ answerMarkdown: '模型答案', evidenceRefs: [], sourceRefs: [], nextActions: [] });

    const result = await runModelUseCase({
      useCase: 'answer_composition',
      input: validAnswerCompositionInput,
      fallbackText: '模板答案',
      modelServiceConfig: baseModelConfig,
      consume: { enabled: false, consumedBy: 'answer_composition', textField: 'answerMarkdown' },
    });

    expect(result.text).toBe('模板答案');
    expect(result.participation.status).toBe('succeeded_not_consumed');
  });

  it('falls back on schema validation failure', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = JSON.stringify({ answerMarkdown: 123 });

    const result = await runModelUseCase({
      useCase: 'answer_composition',
      input: validAnswerCompositionInput,
      fallbackText: '模板答案',
      modelServiceConfig: baseModelConfig,
      consume: { enabled: true, consumedBy: 'answer_composition', textField: 'answerMarkdown' },
    });

    expect(result.text).toBe('模板答案');
    expect(result.participation.status).toBe('invalid_output_fallback');
    expect(result.participation.validation_status).toBe('failed');
  });

  it('blocks forbidden final argument fields', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = JSON.stringify({ answerMarkdown: 'x', finalArgs: { promotionSource: '2' }, evidenceRefs: [], sourceRefs: [], nextActions: [] });

    const result = await runModelUseCase({
      useCase: 'answer_composition',
      input: validAnswerCompositionInput,
      fallbackText: '模板答案',
      modelServiceConfig: baseModelConfig,
      consume: { enabled: true, consumedBy: 'answer_composition', textField: 'answerMarkdown' },
    });

    expect(result.blocked).toBe(true);
    expect(result.participation.status).toBe('blocked_by_policy');
    expect(result.participation.dropped_fields).toContain('finalArgs');
    expect(result.participation.can_affect_tool_args).toBe(false);
  });

  it('only applies answer alias adapter to allowed non-report use cases', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = JSON.stringify({ answer: 'alias answer', status: 'final', sourceRefs: [], evidenceRefs: [] });

    const result = await runModelUseCase({
      useCase: 'chat_answer',
      input: { message: 'hello', context: { mode: 'planner_first_context' }, baseAnswer: 'template answer' },
      fallbackText: 'template answer',
      modelServiceConfig: baseModelConfig,
      consume: { enabled: true, consumedBy: 'chat_answer', textField: 'answerMarkdown' },
    });

    expect(result.text).toBe('alias answer');
    expect(result.participation.status).toBe('succeeded_consumed');
    expect(result.participation.output_adapter_used).toBe(true);
    expect(result.participation.output_adapter_name).toBe('answer_to_answerMarkdown');
    expect(result.participation.raw_output_hash).toBeTruthy();
    expect(result.participation.normalized_output_hash).toBeTruthy();
  });

  it('wraps raw text only for allowed non-report answer use cases', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = 'plain model answer';

    const result = await runModelUseCase({
      useCase: 'chat_answer',
      input: { message: 'hello', context: { mode: 'planner_first_context' }, baseAnswer: 'template answer' },
      fallbackText: 'template answer',
      modelServiceConfig: baseModelConfig,
      consume: { enabled: true, consumedBy: 'chat_answer', textField: 'answerMarkdown' },
    });

    expect(result.text).toBe('plain model answer');
    expect(result.participation.status).toBe('succeeded_consumed');
    expect(result.participation.output_adapter_used).toBe(true);
    expect(result.participation.output_adapter_name).toBe('rawText_to_answerMarkdown');
  });

  it('blocks forbidden prompt variables before calling chat_answer', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = JSON.stringify({ answerMarkdown: 'should not be used', evidenceRefs: [], sourceRefs: [], nextActions: [] });

    const result = await runModelUseCase({
      useCase: 'chat_answer',
      input: {
        message: 'hello',
        context: { mode: 'planner_first_context' },
        baseAnswer: 'template answer',
        raw_tool_args: { query: 'secret' },
      },
      fallbackText: 'template answer',
      modelServiceConfig: baseModelConfig,
      consume: { enabled: true, consumedBy: 'chat_answer', textField: 'answerMarkdown' },
    });

    expect(result.blocked).toBe(true);
    expect(result.modelUsed).toBe(false);
    expect(result.text).toBe('template answer');
    expect(result.participation.status).toBe('blocked_by_policy');
    expect(result.participation.fallback_reason).toBe('prompt_variable_violation');
  });

  it('does not use answer alias adapter for report-query contracts', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = JSON.stringify({ answer: 'should not be adapted', status: 'fallback', candidates: [] });

    const result = await runModelUseCase({
      useCase: 'query_contract_building',
      input: { message: '安卓巨量近30天ROI' },
      fallbackText: 'rule query contract',
      modelServiceConfig: baseModelConfig,
      consume: { enabled: true, consumedBy: 'resolver_candidate_lane', consumedFields: ['semanticCandidateSet'] },
    });

    expect(result.text).toBe('rule query contract');
    expect(result.participation.status).toBe('invalid_output_fallback');
    expect(result.participation.output_adapter_used).toBe(false);
    expect(result.participation.validation_status).toBe('failed');
  });

  it('records consumed resolver candidate lane without changing fallback text', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = JSON.stringify({
      intent: 'report_query',
      metrics: ['roi'],
      dimensions: ['media'],
      terminalOsCandidates: ['ANDROID'],
      confidence: 0.72,
    });

    const result = await runModelUseCase({
      useCase: 'query_contract_building',
      input: { message: '安卓巨量近30天ROI' },
      fallbackText: 'rule query contract',
      modelServiceConfig: baseModelConfig,
      consume: { enabled: true, consumedBy: 'resolver_candidate_lane', consumedFields: ['semanticCandidateSet'] },
    });

    expect(result.text).toBe('rule query contract');
    expect(result.consumed).toBe(true);
    expect(result.participation.status).toBe('succeeded_consumed');
    expect(result.participation.consumed_by).toBe('resolver_candidate_lane');
    expect(result.participation.consumed_fields).toContain('semanticCandidateSet');
  });

  it('blocks direct external route when data policy disallows external model', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = JSON.stringify({ answerMarkdown: 'must not call', evidenceRefs: [], sourceRefs: [], nextActions: [] });

    const result = await runModelUseCase({
      useCase: 'answer_composition',
      input: { semanticResult: {} },
      fallbackText: 'template answer',
      modelServiceConfig: {
        ...baseModelConfig,
        routes: {
          answer_composition: {
            useCase: 'answer_composition',
            enabled: true,
            routeMode: 'direct_external',
            dataPolicy: { ...allowExternalModelPolicy, allowExternalModel: false },
          },
        },
      },
      consume: { enabled: true, consumedBy: 'answer_composition', textField: 'answerMarkdown' },
    });

    expect(result.blocked).toBe(true);
    expect(result.text).toBe('template answer');
    expect(result.participation.status).toBe('blocked_by_policy');
    expect(result.participation.fallback_reason).toBe('direct_external_blocked_by_data_policy');
  });

  it('rejects model entity candidates that contain final numeric IDs', async () => {
    const { runModelUseCase } = await import('../src/lib/model-use-case-runtime');
    modelText = JSON.stringify({
      entities: [{ entityType: 'media', rawText: '巨量', normalizedCandidate: '10001', source: 'model_candidate' }],
    });

    const result = await runModelUseCase({
      useCase: 'entity_candidate_extraction',
      input: { message: '巨量近30天ROI' },
      fallbackText: 'rule entity candidates',
      modelServiceConfig: baseModelConfig,
      consume: { enabled: true, consumedBy: 'resolver_candidate_lane', consumedFields: ['entityCandidateSet'] },
    });

    expect(result.participation.status).toBe('invalid_output_fallback');
    expect(result.participation.validation_status).toBe('failed');
    expect(result.participation.validation_error).toContain('final numeric IDs');
  });
});
