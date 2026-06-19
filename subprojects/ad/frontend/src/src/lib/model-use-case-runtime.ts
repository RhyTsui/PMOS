import type { ModelParticipationRecord } from '@/types';
import type { ModelUseCase } from '@/contracts/model-service';
import {
  hashModelValue,
  validateModelOutputContract,
} from '@/contracts/model-service/llm-output-contracts';
import { validatePromptVariables } from '@/contracts/model-service/prompt-variable-contract';
import { generateModelText } from './model-router';
import {
  buildEffectiveModelUseCaseConfig,
  buildModelUseCaseObservation,
} from './model-use-case-effective-config';
import { getPromptContent } from './prompt-store';
import { buildEffectiveModelRoute, getModelServiceConfig, type ModelServiceConfig } from './runtime-config';

export interface ModelUseCaseRuntimeInput {
  useCase: ModelUseCase;
  promptId?: string;
  input: unknown;
  fallbackText: string;
  modelServiceConfig?: ModelServiceConfig;
  consume?: {
    enabled: boolean;
    consumedBy: string;
    textField?: 'answerMarkdown' | 'summary' | 'diagnosis' | 'suggestedQuestion' | 'draftText' | 'titleText';
    consumedFields?: string[];
  };
  traceMeta?: Record<string, string | number | boolean | undefined>;
  skipReason?: string;
}

export interface ModelUseCaseRuntimeResult<TOutput = unknown> {
  text: string;
  output?: TOutput;
  modelUsed: boolean;
  consumed: boolean;
  blocked: boolean;
  warnings: string[];
  participation: ModelParticipationRecord;
}

function parseJsonModelOutput(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        // fall through
      }
    }
    const firstObject = trimmed.indexOf('{');
    const lastObject = trimmed.lastIndexOf('}');
    if (firstObject >= 0 && lastObject > firstObject) {
      try {
        return JSON.parse(trimmed.slice(firstObject, lastObject + 1));
      } catch {
        // fall through
      }
    }
  }
  return { __rawText: trimmed };
}

function textFromOutput(output: unknown, field?: NonNullable<ModelUseCaseRuntimeInput['consume']>['textField']): string | undefined {
  if (!field || !output || typeof output !== 'object') return undefined;
  const value = (output as Record<string, unknown>)[field];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

type OutputAliasAdapterResult = {
  output: unknown;
  used: boolean;
  name?: string;
};

const ALIAS_ADAPTER_USE_CASES = new Set<ModelUseCase>([
  'chat_answer',
  'knowledge_answer',
  'conversation_title',
  'requirement_drafting',
]);

function applyOutputAliasAdapter(useCase: ModelUseCase, contractName: string, output: unknown): OutputAliasAdapterResult {
  if (!ALIAS_ADAPTER_USE_CASES.has(useCase) || !output || typeof output !== 'object' || Array.isArray(output)) {
    return { output, used: false };
  }
  const record = output as Record<string, unknown>;
  if (contractName === 'GroundedAnswerContract' && typeof record.answerMarkdown !== 'string' && typeof record.__rawText === 'string' && record.__rawText.trim()) {
    return {
      used: true,
      name: 'rawText_to_answerMarkdown',
      output: {
        answerMarkdown: record.__rawText.trim(),
        evidenceRefs: [],
        sourceRefs: [],
        nextActions: [],
      },
    };
  }
  if (contractName === 'GroundedAnswerContract' && typeof record.answerMarkdown !== 'string' && typeof record.answer === 'string') {
    return {
      used: true,
      name: 'answer_to_answerMarkdown',
      output: {
        answerMarkdown: record.answer,
        evidenceRefs: Array.isArray(record.evidenceRefs) ? record.evidenceRefs : [],
        sourceRefs: Array.isArray(record.sourceRefs) ? record.sourceRefs : [],
        nextActions: Array.isArray(record.nextActions) ? record.nextActions : [],
      },
    };
  }
  if (contractName === 'DraftTextContract' && typeof record.draftText !== 'string') {
    const draftText = typeof record.draft === 'string' ? record.draft : typeof record.text === 'string' ? record.text : undefined;
    if (draftText) return { used: true, name: 'draft_or_text_to_draftText', output: { draftText } };
  }
  if (contractName === 'TitleTextContract' && typeof record.titleText !== 'string') {
    const titleText = typeof record.title === 'string' ? record.title : typeof record.text === 'string' ? record.text : undefined;
    if (titleText) return { used: true, name: 'title_or_text_to_titleText', output: { titleText } };
  }
  if (contractName === 'TitleTextContract' && typeof record.titleText !== 'string' && typeof record.__rawText === 'string' && record.__rawText.trim()) {
    return {
      used: true,
      name: 'rawText_to_titleText',
      output: { titleText: record.__rawText.trim() },
    };
  }
  return { output, used: false };
}

function markParticipation(params: {
  participation: ModelParticipationRecord;
  status: ModelParticipationRecord['status'];
  consumed: boolean;
  consumedBy?: string;
  consumedFields?: string[];
  outputHash?: string;
  validationStatus?: ModelParticipationRecord['validation_status'];
  validationError?: string;
  droppedFields?: string[];
  dropReason?: string;
  rawOutputHash?: string;
  outputAdapterUsed?: boolean;
  outputAdapterName?: string;
  normalizedOutputHash?: string;
  warnings?: string[];
}): ModelParticipationRecord {
  return {
    ...params.participation,
    status: params.status,
    consumed: params.consumed,
    consumed_by: params.consumedBy,
    consumed_fields: params.consumedFields,
    output_consumed: params.consumed,
    output_consumed_by: params.consumedBy,
    raw_output_hash: params.rawOutputHash || params.participation.raw_output_hash,
    output_hash: params.outputHash || params.participation.output_hash,
    output_adapter_used: params.outputAdapterUsed ?? params.participation.output_adapter_used,
    output_adapter_name: params.outputAdapterName || params.participation.output_adapter_name,
    normalized_output_hash: params.normalizedOutputHash || params.participation.normalized_output_hash,
    validation_status: params.validationStatus || params.participation.validation_status,
    validation_error: params.validationError || params.participation.validation_error,
    dropped_fields: params.droppedFields?.length ? params.droppedFields : params.participation.dropped_fields,
    drop_reason: params.dropReason || params.participation.drop_reason,
    fallback_used: params.status === 'blocked_by_policy'
      || params.status === 'invalid_output_fallback'
      || params.status === 'failed_fallback'
      || params.status === 'not_configured'
      || params.status === 'disabled'
      || params.status === 'fallback_to_rules',
    fallback_reason: params.status === 'blocked_by_policy'
      ? 'model_output_blocked_by_policy'
      : params.status === 'invalid_output_fallback'
        ? 'model_output_validation_failed'
        : params.participation.fallback_reason,
    fallback_path: params.status === 'blocked_by_policy' || params.status === 'invalid_output_fallback'
      ? 'deterministic_template'
      : params.participation.fallback_path,
    warnings: [...(params.participation.warnings || []), ...(params.warnings || [])],
  };
}

export async function runModelUseCase<TOutput = unknown>(
  params: ModelUseCaseRuntimeInput,
): Promise<ModelUseCaseRuntimeResult<TOutput>> {
  const modelServiceConfig = params.modelServiceConfig || await getModelServiceConfig();
  const effectiveConfig = await buildEffectiveModelUseCaseConfig({
    modelUseCase: params.useCase,
    modelServiceConfig,
    promptId: params.promptId,
  });

  if (params.skipReason) {
    return {
      text: params.fallbackText,
      modelUsed: false,
      consumed: false,
      blocked: false,
      warnings: [params.skipReason],
      participation: await buildModelUseCaseObservation({
        modelUseCase: params.useCase,
        status: 'not_applicable',
        warnings: [params.skipReason],
        fallbackPath: 'deterministic_template',
        fallbackReason: params.skipReason,
        modelServiceConfig,
        input: params.input,
      }),
    };
  }

  if (!effectiveConfig.enabled) {
    if (effectiveConfig.policyBlocked) {
      const reason = effectiveConfig.policyBlockReason || effectiveConfig.warnings[0] || 'model_call_blocked_by_data_policy';
      return {
        text: params.fallbackText,
        modelUsed: false,
        consumed: false,
        blocked: true,
        warnings: effectiveConfig.warnings,
        participation: await buildModelUseCaseObservation({
          modelUseCase: params.useCase,
          status: 'blocked_by_policy',
          warnings: effectiveConfig.warnings,
          fallbackPath: 'deterministic_template',
          fallbackReason: reason,
          modelServiceConfig,
          input: params.input,
        }),
      };
    }
    const status: ModelParticipationRecord['status'] = effectiveConfig.promptStatus === 'not_configured'
      ? 'not_configured'
      : effectiveConfig.routeMode === 'disabled'
        ? 'disabled'
        : 'fallback_to_rules';
    const reason = effectiveConfig.warnings[0] || 'model_use_case_not_enabled';
    return {
      text: params.fallbackText,
      modelUsed: false,
      consumed: false,
      blocked: false,
      warnings: effectiveConfig.warnings,
      participation: await buildModelUseCaseObservation({
        modelUseCase: params.useCase,
        status,
        warnings: effectiveConfig.warnings,
        fallbackPath: 'deterministic_template',
        fallbackReason: reason,
        modelServiceConfig,
        input: params.input,
      }),
    };
  }

  const promptVariableValidation = validatePromptVariables(params.useCase, params.input);
  if (!promptVariableValidation.passed) {
    const warnings = [
      ...promptVariableValidation.missingRequired.map((item) => `missing required prompt variable: ${item}`),
      ...promptVariableValidation.forbiddenPaths.map((item) => `forbidden prompt variable: ${item}`),
    ];
    return {
      text: params.fallbackText,
      modelUsed: false,
      consumed: false,
      blocked: true,
      warnings,
      participation: await buildModelUseCaseObservation({
        modelUseCase: params.useCase,
        status: 'blocked_by_policy',
        warnings,
        fallbackPath: 'deterministic_template',
        fallbackReason: promptVariableValidation.forbiddenPaths.length
          ? 'prompt_variable_violation'
          : 'prompt_variable_missing_required',
        modelServiceConfig,
        input: {
          validation: {
            missingRequired: promptVariableValidation.missingRequired,
            forbiddenPaths: promptVariableValidation.forbiddenPaths,
          },
        },
      }),
    };
  }

  const promptContent = await getPromptContent(effectiveConfig.promptId, '');
  const inputJson = JSON.stringify(params.input, null, 2).slice(0, 32000);
  const effectiveRoute = buildEffectiveModelRoute(modelServiceConfig, params.useCase);
  const generationInstructions = [
    effectiveRoute.generationParams.maxTokens ? `输出长度上限：不超过 ${effectiveRoute.generationParams.maxTokens} tokens。` : '',
    effectiveRoute.generationParams.jsonMode ? '输出格式策略：必须返回可被 JSON.parse 解析的对象。' : '',
  ].filter(Boolean);
  const result = await generateModelText({
    useCase: params.useCase,
    promptId: effectiveConfig.promptId,
    promptSource: effectiveConfig.promptSource,
    promptVersion: effectiveConfig.promptVersion,
    promptHash: effectiveConfig.promptHash,
    modelServiceConfig,
    input: params.input,
    traceMeta: params.traceMeta,
    fallback: params.fallbackText,
    messages: [
      {
        role: 'system',
        content: promptContent,
      },
      {
        role: 'user',
        content: [
          ...generationInstructions,
          '请只输出一个 JSON 对象，不要输出 Markdown，不要输出解释性前后缀。',
          '',
          '运行时输入：',
          inputJson,
        ].join('\n'),
      },
    ],
  });

  if (result.source !== 'model') {
    return {
      text: params.fallbackText,
      modelUsed: false,
      consumed: false,
      blocked: false,
      warnings: result.warnings,
      participation: result.participation,
    };
  }

  const rawOutput = parseJsonModelOutput(result.text);
  const rawPolicyValidation = validateModelOutputContract('__policy_only__', rawOutput);
  const aliasAdapter = applyOutputAliasAdapter(params.useCase, effectiveConfig.outputContract, rawOutput);
  const parsedOutput = aliasAdapter.output;
  const validation = rawPolicyValidation.blockedByPolicy
    ? rawPolicyValidation
    : validateModelOutputContract(effectiveConfig.outputContract, parsedOutput);
  const rawOutputHash = hashModelValue(rawOutput);
  const outputHash = hashModelValue(parsedOutput);
  if (validation.blockedByPolicy) {
    return {
      text: params.fallbackText,
      output: parsedOutput as TOutput,
      modelUsed: true,
      consumed: false,
      blocked: true,
      warnings: [validation.validationError || 'model output blocked by policy'],
      participation: markParticipation({
        participation: result.participation,
        status: 'blocked_by_policy',
        consumed: false,
        outputHash,
        validationStatus: validation.validationStatus,
        validationError: validation.validationError,
        droppedFields: validation.droppedFields,
        dropReason: validation.dropReason,
        rawOutputHash,
        outputAdapterUsed: aliasAdapter.used,
        outputAdapterName: aliasAdapter.name,
        normalizedOutputHash: outputHash,
      }),
    };
  }
  if (validation.validationStatus === 'failed') {
    return {
      text: params.fallbackText,
      output: parsedOutput as TOutput,
      modelUsed: true,
      consumed: false,
      blocked: false,
      warnings: [validation.validationError || 'model output validation failed'],
      participation: markParticipation({
        participation: result.participation,
        status: 'invalid_output_fallback',
        consumed: false,
        outputHash,
        validationStatus: validation.validationStatus,
        validationError: validation.validationError,
        rawOutputHash,
        outputAdapterUsed: aliasAdapter.used,
        outputAdapterName: aliasAdapter.name,
        normalizedOutputHash: outputHash,
      }),
    };
  }

  const consumedText = textFromOutput(parsedOutput, params.consume?.textField);
  const shouldConsume = Boolean(params.consume?.enabled && (consumedText || !params.consume.textField));
  return {
    text: shouldConsume && consumedText ? consumedText : params.fallbackText,
    output: parsedOutput as TOutput,
    modelUsed: true,
    consumed: shouldConsume,
    blocked: false,
    warnings: result.warnings,
    participation: markParticipation({
      participation: result.participation,
      status: shouldConsume ? 'succeeded_consumed' : 'succeeded_not_consumed',
      consumed: shouldConsume,
      consumedBy: shouldConsume ? params.consume?.consumedBy : undefined,
      consumedFields: shouldConsume ? params.consume?.consumedFields || [params.consume?.textField || 'output'] : undefined,
      outputHash,
      rawOutputHash,
      outputAdapterUsed: aliasAdapter.used,
      outputAdapterName: aliasAdapter.name,
      normalizedOutputHash: outputHash,
      validationStatus: 'passed',
    }),
  };
}
