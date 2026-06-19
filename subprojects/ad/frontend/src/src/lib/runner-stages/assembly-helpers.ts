import type { ModelParticipationRecord } from '@/types';
import type { ModelUseCase } from '@/contracts/model-service';
import type { ModelServiceConfig } from '@/lib/runtime-config';
import { runModelUseCase, type ModelUseCaseRuntimeResult } from '@/lib/model-use-case-runtime';
import { buildModelUseCaseObservation } from '@/lib/model-use-case-effective-config';
import { cleanQuestion } from '@/lib/chat-runtime/project-context';

async function runChatModelNode(params: {
  useCase: ModelUseCase;
  input: unknown;
  fallbackText: string;
  modelServiceConfig: ModelServiceConfig;
  consume: {
    enabled: boolean;
    consumedBy: string;
    textField: 'answerMarkdown' | 'diagnosis' | 'draftText';
    consumedFields?: string[];
  };
  traceMeta?: Record<string, string | number | boolean | undefined>;
}): Promise<ModelUseCaseRuntimeResult> {
  return runModelUseCase({
    useCase: params.useCase,
    input: params.input,
    fallbackText: params.fallbackText,
    modelServiceConfig: params.modelServiceConfig,
    consume: params.consume,
    traceMeta: params.traceMeta,
  });
}

function modelParticipationFromRuntime(result?: Pick<ModelUseCaseRuntimeResult, 'participation'>): ModelParticipationRecord[] {
  return result?.participation ? [result.participation] : [];
}

async function runReportModelNode(params: {
  useCase: ModelUseCase;
  input: unknown;
  fallbackText: string;
  modelServiceConfig: ModelServiceConfig;
  consume?: {
    enabled: boolean;
    consumedBy: string;
    textField?: 'answerMarkdown' | 'summary' | 'diagnosis' | 'suggestedQuestion';
    consumedFields?: string[];
  };
  traceMeta?: Record<string, string | number | boolean | undefined>;
  skipReason?: string;
}): Promise<Awaited<ReturnType<typeof runModelUseCase>>> {
  try {
    return await runModelUseCase({
      useCase: params.useCase,
      input: params.input,
      fallbackText: params.fallbackText,
      modelServiceConfig: params.modelServiceConfig,
      consume: params.consume,
      traceMeta: {
        intent: 'report_query',
        ...(params.traceMeta || {}),
      },
      skipReason: params.skipReason,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      text: params.fallbackText,
      modelUsed: false,
      consumed: false,
      blocked: false,
      warnings: [`runReportModelNode[${params.useCase}] unexpected error: ${errMsg}`],
      participation: await buildModelParticipationObservation({
        useCase: params.useCase,
        status: 'failed_fallback',
        warnings: [`unexpected_error: ${errMsg}`],
        modelServiceConfig: params.modelServiceConfig,
      }),
    };
  }
}

async function buildModelParticipationObservation(params: {
  useCase: ModelUseCase;
  status: ModelParticipationRecord['status'];
  promptId?: string;
  promptSource?: string;
  promptVersion?: string;
  promptHash?: string;
  promptText?: string;
  outputConsumedBy?: string;
  warnings?: string[];
  modelServiceConfig?: ModelServiceConfig;
}): Promise<ModelParticipationRecord> {
  return buildModelUseCaseObservation({
    modelUseCase: params.useCase,
    promptId: params.promptId || params.useCase,
    promptSource: params.promptSource === 'hardcoded'
      || params.promptSource === 'admin'
      || params.promptSource === 'seed'
      || params.promptSource === 'fallback'
      ? params.promptSource
      : undefined,
    promptVersion: params.promptVersion,
    promptHash: params.promptHash,
    status: params.status,
    warnings: params.warnings || [],
    outputConsumedBy: params.outputConsumedBy,
    modelServiceConfig: params.modelServiceConfig,
    fallbackPath: 'rules_or_template',
    fallbackReason: params.warnings?.[0],
  });
}

function fallbackAnswer(message: string): string {
  return [
    '我已收到你的问题，但当前未命中可执行的问数链路。',
    '',
    `问题：${cleanQuestion(message)}`,
  ].join('\n');
}

export {
  runChatModelNode,
  runReportModelNode,
  modelParticipationFromRuntime,
  buildModelParticipationObservation,
  fallbackAnswer,
};
