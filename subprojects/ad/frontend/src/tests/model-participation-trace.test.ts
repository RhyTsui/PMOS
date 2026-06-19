import { describe, expect, it } from 'vitest';
import { buildMessageRuntimeProjection } from '../src/lib/chat-runtime/message-runtime-projection';
import { buildResponseContract } from '../src/lib/response-contract';
import { buildEffectiveModelRoute, type ModelServiceConfig } from '../src/lib/runtime-config';
import { buildModelParticipationRecord } from '../src/lib/model-router';
import type { MessageContract, ModelParticipationRecord } from '../src/types';

const modelConfig: ModelServiceConfig = {
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
  updatedAt: '2026-06-06T00:00:00.000Z',
  routes: {
    report_summary: {
      useCase: 'report_summary',
      enabled: false,
      routeMode: 'disabled',
    },
    required_input_assist: {
      useCase: 'required_input_assist',
      enabled: true,
      routeMode: 'direct_external',
    },
    data_result_interpretation: {
      useCase: 'data_result_interpretation',
      enabled: true,
      routeMode: 'direct_external',
    },
    answer_composition: {
      useCase: 'answer_composition',
      enabled: true,
      routeMode: 'template_only',
    },
  },
};

function record(params: {
  useCase: 'report_summary' | 'required_input_assist' | 'data_result_interpretation' | 'answer_composition';
  status: ModelParticipationRecord['status'];
  consumed?: boolean;
  consumedBy?: string;
  warnings?: string[];
}): ModelParticipationRecord {
  return buildModelParticipationRecord({
    useCase: params.useCase,
    promptId: params.useCase,
    promptSource: 'test',
    promptVersion: '1',
    promptText: `${params.useCase}: test prompt`,
    effectiveRoute: buildEffectiveModelRoute(modelConfig, params.useCase),
    status: params.status,
    modelSpanId: params.status === 'model_succeeded' ? `span-${params.useCase}` : undefined,
    latencyMs: params.status === 'model_succeeded' ? 12 : undefined,
    warnings: params.warnings || [],
    outputConsumed: params.consumed || false,
    outputConsumedBy: params.consumedBy,
    answerOrigin: params.consumed ? params.consumedBy : undefined,
  });
}

describe('model participation trace projection', () => {
  it('keeps disabled, failed, unconsumed, and consumed model states in runtime projection', () => {
    const modelParticipation = [
      record({ useCase: 'report_summary', status: 'disabled', warnings: ['route disabled'] }),
      record({ useCase: 'required_input_assist', status: 'failed_fallback', warnings: ['model call failed'] }),
      record({ useCase: 'data_result_interpretation', status: 'succeeded_not_consumed', consumed: false, consumedBy: 'not_consumed' }),
      record({ useCase: 'answer_composition', status: 'succeeded_consumed', consumed: true, consumedBy: 'answer_composition' }),
    ];
    const messageContract: MessageContract = {
      type: 'report_query',
      answer_markdown: 'Report answer',
    };

    const projection = buildMessageRuntimeProjection({
      messageId: 'msg-1',
      threadId: 'thread-1',
      traceId: 'trace-1',
      workflow: 'report_query',
      intent: 'report_query',
      status: 'success',
      content: 'Report answer',
      messageContract,
      processEvents: [],
      modelParticipation,
    });

    expect(projection.model_participation).toHaveLength(4);
    expect(projection.model_participation?.map(item => item.status)).toEqual([
      'disabled',
      'failed_fallback',
      'succeeded_not_consumed',
      'succeeded_consumed',
    ]);
    expect(projection.model_participation?.[0].fallback_reason).toBe('route_disabled');
    expect(projection.model_participation?.[1].fallback_reason).toBe('model call failed');
    expect(projection.model_participation?.[2].output_consumed).toBe(false);
    expect(projection.model_participation?.[3].output_consumed).toBe(true);
    expect(projection.model_participation?.[3].output_consumed_by).toBe('answer_composition');
    expect(projection.model_participation?.[3].prompt_version).toBe('1');
    expect(projection.model_participation?.[3].prompt_hash).toBeTruthy();
  });

  it('does not leak participation audit records into the main response message', () => {
    const response = buildResponseContract({
      status: 'success',
      intentType: 'report_query',
      answer: 'Report answer',
      processEvents: [],
      metadata: {
        message_runtime_projection: {
          model_participation: [
            record({ useCase: 'report_summary', status: 'disabled', warnings: ['route disabled'] }),
          ],
        },
      },
    });

    expect(response.answer_markdown).toBe('Report answer');
    expect(JSON.stringify(response.message_parts)).not.toContain('model_participation');
    expect(JSON.stringify(response.message_parts)).not.toContain('prompt_hash');
  });
});
