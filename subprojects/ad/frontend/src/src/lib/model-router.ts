import { createHash } from 'node:crypto';
import { SpanKind } from '@cozeloop/ai';
import { LLMClient } from 'coze-coding-dev-sdk';
import { GOVERNED_REPORT_QUERY_LLM_NODES, getModelUseCaseDefinition, type ModelUseCase } from '@/contracts/model-service';
import type { ModelParticipationRecord } from '@/types';
import {
  buildEffectiveModelRoute,
  buildModelSdkConfig,
  buildModelSdkConfigForRoute,
  getModelServiceConfig,
  hasConfiguredModelCredentials,
  type ModelServiceConfig,
} from './runtime-config';
import type { ModelGenerationParams } from '@/contracts/model-service';
import {
  buildModelBreakerKey,
  classifyModelError,
  getRetryDelaysMs,
  recordModelCallFailure,
  recordModelCallSuccess,
  shouldSkipModelCall,
  sleep,
} from './model-resilience';
import {
  buildStandardTraceInput,
  buildStandardTraceTags,
  flushTrace,
  initTrace,
  safeSetInput,
  safeSetOutput,
  safeSetTags,
  safeTraceable,
  truncate,
} from './trace';

export type ModelRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ModelRouterSource = 'model' | 'fallback' | 'disabled' | 'template' | 'error' | 'not_applicable' | 'not_configured';

type PromptSourceKind = 'admin' | 'seed' | 'fallback' | 'hardcoded' | 'managed';

export interface GenerateModelTextInput {
  useCase: ModelUseCase;
  promptId?: string;
  promptSource?: string;
  promptVersion?: string;
  promptHash?: string;
  messages: ModelRouterMessage[];
  input?: unknown;
  traceMeta?: Record<string, string | number | boolean | undefined>;
  fallback?: (() => Promise<string> | string) | string;
  modelServiceConfig?: ModelServiceConfig;
}

export interface GenerateModelTextResult {
  text: string;
  source: ModelRouterSource;
  modelName?: string;
  modelSpanId?: string;
  effectiveRoute: ReturnType<typeof buildEffectiveModelRoute>;
  fallbackUsed: boolean;
  warnings: string[];
  participation: ModelParticipationRecord;
}

type ModelCallOutcome =
  | { kind: 'success'; text: string }
  | { kind: 'fallback'; result: GenerateModelTextResult };

function thinkingMode(reasoningLevel?: string): 'enabled' | 'disabled' {
  return reasoningLevel === 'disabled' ? 'disabled' : 'enabled';
}

function isTraceExporterError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /CozeLoopTraceExporter|forceFlush|no spans provided|no access permission|socket hang up|600904002/i.test(message)
    || /connect EACCES .*:443/i.test(message)
    || /ENOTFOUND .*liannu/i.test(message)
    || /timeout|timed out|ETIMEDOUT|EPIPE|broken pipe/i.test(message)
    || /^Connection error\.$/i.test(message);
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function fallbackReason(source: ModelRouterSource | ModelParticipationRecord['status'], warnings: string[]): string | undefined {
  if (source === 'disabled') return 'route_disabled';
  if (source === 'template') return 'template_only';
  if (source === 'not_configured') return warnings[0] || 'model_not_configured';
  if (source === 'fallback_to_rules') return warnings[0] || 'rules_or_template_authoritative';
  if (source === 'not_applicable') return warnings[0] || 'model_not_applicable_for_branch';
  if (source === 'failed_fallback') return warnings[0] || 'model_call_failed';
  if (source === 'invalid_output_fallback') return warnings[0] || 'model_output_validation_failed';
  if (source === 'blocked_by_policy') return warnings[0] || 'model_output_blocked_by_policy';
  if (source === 'error') return warnings[0] || 'model_call_failed';
  if (source === 'fallback') return warnings[0] || 'model_unavailable_or_config_incomplete';
  return undefined;
}

function normalizePromptSource(input: string | undefined, context: { promptId?: string; routeSource?: string }): PromptSourceKind {
  const normalizedInput = String(input || '').trim().toLowerCase();
  if (normalizedInput === 'admin' || normalizedInput === 'hardcoded' || normalizedInput === 'seed' || normalizedInput === 'fallback') {
    return normalizedInput;
  }
  if (normalizedInput === 'runtime_call' || normalizedInput === 'runtime_config' || normalizedInput === 'runtime') {
    return 'admin';
  }
  if (normalizedInput === 'managed' || normalizedInput === 'managed_seed' || normalizedInput === 'audit_projection') {
    return 'managed';
  }
  const routeSource = String(context.routeSource || '').trim().toLowerCase();
  if (routeSource === 'seed_default') return 'seed';
  if (routeSource === 'fallback') return 'fallback';
  if (routeSource === 'runtime_config' || routeSource === 'env_default' || routeSource === 'managed') return 'managed';
  if (routeSource === 'disabled') return 'fallback';
  if (context.promptId) return 'admin';
  return 'admin';
}

function normalizeModelStatus(params: {
  status?: ModelParticipationRecord['status'];
  source?: ModelRouterSource;
  outputConsumed?: boolean;
}): ModelParticipationRecord['status'] {
  if (params.status) {
    if (params.status === 'model_succeeded') {
      return params.outputConsumed ? 'succeeded_consumed' : 'succeeded_not_consumed';
    }
    if (params.status === 'attempted') {
      return params.outputConsumed ? 'succeeded_not_consumed' : 'attempted';
    }
    if (params.status === 'template' || params.status === 'fallback') {
      return 'fallback_to_rules';
    }
    return params.status;
  }
  if (params.source === 'model') return params.outputConsumed ? 'succeeded_consumed' : 'succeeded_not_consumed';
  if (params.source === 'disabled') return 'disabled';
  if (params.source === 'template') return 'fallback_to_rules';
  if (params.source === 'error') return 'failed_fallback';
  if (params.source === 'not_applicable') return 'not_applicable';
  if (params.source === 'not_configured') return 'not_configured';
  if (params.source === 'fallback') return 'not_configured';
  return 'fallback_to_rules';
}

function extractChunkText(chunk: { content?: unknown }): string {
  if (typeof chunk.content === 'string') return chunk.content;
  if (Array.isArray(chunk.content)) {
    return chunk.content.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
        return String((part as { text?: string }).text || '');
      }
      return '';
    }).join('');
  }
  return '';
}

function inferTimeoutStage(error: unknown): 'connect' | 'response' | 'unknown' {
  const message = error instanceof Error ? error.message : String(error);
  if (/model_connect_timeout/i.test(message)) return 'connect';
  if (/model_response_timeout/i.test(message)) return 'response';
  if (/timeout|timed out|etimedout/i.test(message)) return 'unknown';
  return 'unknown';
}

function logResilienceEvent(event: string, payload: Record<string, unknown>): void {
  console.warn(`[chat_answer-resilience] ${event} ${JSON.stringify(payload)}`);
}

async function resolveFallbackText(fallback?: (() => Promise<string> | string) | string): Promise<string> {
  if (typeof fallback === 'function') {
    try {
      return await fallback();
    } catch {
      return '';
    }
  }
  return fallback || '';
}

async function streamModelOutputOnce(params: {
  llmClient: LLMClient;
  messages: ModelRouterMessage[];
  modelName: string;
  reasoningLevel?: string;
  generationParams?: ModelGenerationParams;
  headers?: Record<string, string>;
  connectTimeoutMs: number;
  responseTimeoutMs: number;
}): Promise<string> {
  const stream = params.llmClient.stream(
    params.messages,
    {
      model: params.modelName,
      thinking: thinkingMode(params.reasoningLevel),
      temperature: params.generationParams?.temperature,
      streaming: params.generationParams?.stream,
    },
    undefined,
    params.headers,
  );
  const iterator = stream[Symbol.asyncIterator]();
  let output = '';
  let seenFirstChunk = false;
  let connectTimer: ReturnType<typeof setTimeout> | undefined;
  let responseTimer: ReturnType<typeof setTimeout> | undefined;
  let rejectTimeout: ((error: Error) => void) | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    rejectTimeout = reject;
  });

  const clearConnectTimer = (): void => {
    if (connectTimer) clearTimeout(connectTimer);
    connectTimer = undefined;
  };
  const clearResponseTimer = (): void => {
    if (responseTimer) clearTimeout(responseTimer);
    responseTimer = undefined;
  };

  connectTimer = setTimeout(() => {
    rejectTimeout?.(new Error(`model_connect_timeout:${params.connectTimeoutMs}`));
  }, params.connectTimeoutMs);
  responseTimer = setTimeout(() => {
    rejectTimeout?.(new Error(`model_response_timeout:${params.responseTimeoutMs}`));
  }, params.responseTimeoutMs);

  try {
    while (true) {
      const next = await Promise.race([
        iterator.next(),
        timeoutPromise,
      ]);
      if (next.done) break;
      const chunkText = extractChunkText(next.value as { content?: unknown });
      if (chunkText) {
        output += chunkText;
        seenFirstChunk = true;
      }
      if (seenFirstChunk) {
        clearConnectTimer();
      }
    }
    return output;
  } finally {
    clearConnectTimer();
    clearResponseTimer();
    try {
      await iterator.return?.(undefined);
    } catch {
      // ignore iterator cleanup failures
    }
  }
}

const USE_CASE_TIMEOUT_TIER: Record<string, number> = {
  request_understanding: 12000,
  intent_routing_review: 12000,
  query_contract_building: 15000,
  entity_candidate_extraction: 12000,
  ambiguity_detection: 12000,
  resolver_disambiguation_review: 12000,
  capability_ranking_review: 12000,
  capability_discovery: 15000,
  required_input_assist: 15000,
  data_result_interpretation: 30000,
  report_summary: 30000,
  diagnosis_summary: 30000,
  answer_composition: 30000,
  chat_answer: 30000,
  knowledge_answer: 30000,
  automation_summary: 30000,
  requirement_drafting: 30000,
  conversation_title: 12000,
  recommendation: 15000,
};

function legacyTimeoutMs(effectiveRoute: ReturnType<typeof buildEffectiveModelRoute>): number {
  const configuredTimeoutMs = Number(effectiveRoute.generationParams.timeoutMs || 0);
  if (configuredTimeoutMs > 0) return configuredTimeoutMs;
  const tierTimeout = USE_CASE_TIMEOUT_TIER[effectiveRoute.useCase];
  if (tierTimeout) return tierTimeout;
  const isGovernedReportNode = GOVERNED_REPORT_QUERY_LLM_NODES.includes(effectiveRoute.useCase as ModelUseCase);
  return isGovernedReportNode ? 12000 : 60000;
}

async function buildFallbackResult(params: {
  input: GenerateModelTextInput;
  effectiveRoute: ReturnType<typeof buildEffectiveModelRoute>;
  promptText: string;
  source: ModelRouterSource;
  warnings: string[];
  status?: ModelParticipationRecord['status'];
  modelSpanId?: string;
  modelName?: string;
}): Promise<GenerateModelTextResult> {
  const text = await resolveFallbackText(params.input.fallback);
  return {
    text,
    source: params.source,
    modelName: params.modelName || params.effectiveRoute.modelName,
    modelSpanId: params.modelSpanId,
    effectiveRoute: params.effectiveRoute,
    fallbackUsed: true,
    warnings: params.warnings,
    participation: buildModelParticipationRecord({
      useCase: params.input.useCase,
      promptId: params.input.promptId,
      promptSource: params.input.promptSource,
      promptVersion: params.input.promptVersion,
      promptHash: params.input.promptHash,
      promptText: params.promptText,
      effectiveRoute: params.effectiveRoute,
      source: params.source,
      status: params.status,
      modelSpanId: params.modelSpanId,
      warnings: params.warnings,
    }),
  };
}

export function buildModelParticipationRecord(params: {
  useCase: ModelUseCase;
  promptId?: string;
  promptSource?: string;
  promptVersion?: string;
  promptHash?: string;
  promptText: string;
  effectiveRoute: ReturnType<typeof buildEffectiveModelRoute>;
  source?: ModelRouterSource;
  status?: ModelParticipationRecord['status'];
  modelSpanId?: string;
  latencyMs?: number;
  warnings: string[];
  outputConsumed?: boolean;
  outputConsumedBy?: string;
  answerOrigin?: string;
  fallbackReasonOverride?: string;
  fallbackPath?: string;
  inputHash?: string;
  outputHash?: string;
  validationStatus?: ModelParticipationRecord['validation_status'];
  validationError?: string;
  consumedFields?: string[];
  droppedFields?: string[];
  dropReason?: string;
}): ModelParticipationRecord {
  const definition = getModelUseCaseDefinition(params.useCase);
  const status = normalizeModelStatus({
    status: params.status,
    source: params.source,
    outputConsumed: params.outputConsumed,
  });
  const promptHash = params.promptHash || hashText(params.promptText);
  const normalizedPromptSource = normalizePromptSource(params.promptSource, {
    promptId: params.promptId,
    routeSource: params.effectiveRoute.source,
  });
  return {
    node: definition?.node || params.useCase,
    model_use_case: params.useCase,
    modelUseCase: params.useCase,
    model_name: params.effectiveRoute.modelName,
    provider: params.effectiveRoute.provider,
    route_mode: params.effectiveRoute.routeMode,
    model_route_id: definition?.defaultModelRoute || params.useCase,
    prompt_id: params.promptId || params.effectiveRoute.promptIds[0] || definition?.defaultPromptId || params.useCase,
    prompt_source: normalizedPromptSource,
    prompt_version: params.promptVersion,
    prompt_hash: promptHash,
    content_hash: promptHash,
    model_span_id: params.modelSpanId,
    input_schema: definition?.inputContract,
    output_schema: definition?.outputContract,
    input_hash: params.inputHash,
    output_hash: params.outputHash,
    validation_status: params.validationStatus,
    validation_error: params.validationError,
    latency_ms: params.latencyMs,
    status,
    consumed: params.outputConsumed ?? false,
    consumed_by: params.outputConsumedBy,
    consumed_fields: params.consumedFields,
    dropped_fields: params.droppedFields,
    drop_reason: params.dropReason,
    fallback_used: status === 'not_configured'
      || status === 'disabled'
      || status === 'fallback_to_rules'
      || status === 'failed_fallback'
      || status === 'invalid_output_fallback'
      || status === 'blocked_by_policy',
    fallback_reason: params.fallbackReasonOverride || fallbackReason(status, params.warnings),
    fallback_path: params.fallbackPath,
    output_consumed: params.outputConsumed ?? false,
    output_consumed_by: params.outputConsumedBy,
    decision_right: definition?.finalAuthority,
    can_affect_tool_args: false,
    can_affect_permission: false,
    can_affect_final_answer: definition?.canAffectFinalAnswer ?? false,
    answer_origin: params.answerOrigin,
    warnings: params.warnings.length ? params.warnings : undefined,
  };
}

async function runLegacyModelCall(params: {
  input: GenerateModelTextInput;
  modelServiceConfig: ModelServiceConfig;
  effectiveRoute: ReturnType<typeof buildEffectiveModelRoute>;
}): Promise<ModelCallOutcome> {
  const sdkConfig = buildModelSdkConfig(params.modelServiceConfig, params.effectiveRoute);
  const legacyTimeout = legacyTimeoutMs(params.effectiveRoute);
  (sdkConfig as typeof sdkConfig & { retryTimes: number }).retryTimes = 0;
  (sdkConfig as typeof sdkConfig & { retryDelay: number }).retryDelay = 0;
  (sdkConfig as typeof sdkConfig & { timeout: number }).timeout = legacyTimeout;
  const llmClient = new LLMClient(sdkConfig);
  try {
    const text = await streamModelOutputOnce({
      llmClient,
      messages: params.input.messages,
      modelName: params.effectiveRoute.modelName || params.modelServiceConfig.modelName,
      reasoningLevel: params.effectiveRoute.generationParams.reasoningLevel,
      generationParams: params.effectiveRoute.generationParams,
      connectTimeoutMs: legacyTimeout,
      responseTimeoutMs: legacyTimeout,
    });
    return { kind: 'success', text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: 'fallback',
      result: await buildFallbackResult({
        input: params.input,
        effectiveRoute: params.effectiveRoute,
        promptText: params.input.messages.map((messageItem) => `${messageItem.role}: ${messageItem.content}`).join('\n'),
        source: 'error',
        warnings: [...params.effectiveRoute.warnings, `Model call failed: ${truncate(message, 240)}`],
        status: 'failed_fallback',
        modelName: params.effectiveRoute.modelName,
      }),
    };
  }
}

async function runResilientModelCall(params: {
  input: GenerateModelTextInput;
  modelServiceConfig: ModelServiceConfig;
  effectiveRoute: ReturnType<typeof buildEffectiveModelRoute>;
  promptText: string;
}): Promise<ModelCallOutcome> {
  const breakerKey = buildModelBreakerKey({
    useCase: params.input.useCase,
    modelProfileId: params.effectiveRoute.modelProfileId,
    modelName: params.effectiveRoute.modelName,
  });
  const skipState = await shouldSkipModelCall(breakerKey, params.effectiveRoute.resilience);
  if (skipState.skip) {
    logResilienceEvent('breaker_skip', {
      useCase: params.input.useCase,
      breakerKey,
      reason: skipState.reason,
      breakerState: skipState.snapshot.state,
      openUntil: skipState.snapshot.openUntil,
      failureCount: skipState.snapshot.failureCount,
      modelName: params.effectiveRoute.modelName,
      modelProfileId: params.effectiveRoute.modelProfileId,
    });
    return {
      kind: 'fallback',
      result: await buildFallbackResult({
        input: params.input,
        effectiveRoute: params.effectiveRoute,
        promptText: params.promptText,
        source: 'error',
        warnings: [...params.effectiveRoute.warnings, `Model call skipped by breaker: ${skipState.reason || 'breaker_open'}`],
        status: 'failed_fallback',
        modelName: params.effectiveRoute.modelName,
      }),
    };
  }

  const retryDelays = getRetryDelaysMs(params.effectiveRoute.resilience);
  const maxAttempts = Math.max(1, params.effectiveRoute.resilience.maxRetries + 1);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const sdkConfig = buildModelSdkConfigForRoute(params.modelServiceConfig, {
        modelProfileId: params.effectiveRoute.modelProfileId,
        resilience: params.effectiveRoute.resilience,
      });
      (sdkConfig as typeof sdkConfig & { retryTimes: number }).retryTimes = 0;
      (sdkConfig as typeof sdkConfig & { retryDelay: number }).retryDelay = 0;
      const llmClient = new LLMClient(sdkConfig);
      const text = await streamModelOutputOnce({
        llmClient,
        messages: params.input.messages,
        modelName: params.effectiveRoute.modelName || params.modelServiceConfig.modelName,
        reasoningLevel: params.effectiveRoute.generationParams.reasoningLevel,
        generationParams: params.effectiveRoute.generationParams,
        connectTimeoutMs: params.effectiveRoute.resilience.connectTimeoutMs,
        responseTimeoutMs: params.effectiveRoute.resilience.responseTimeoutMs,
      });
      await recordModelCallSuccess(breakerKey);
      return { kind: 'success', text };
    } catch (error) {
      lastError = error;
      const classification = classifyModelError(error);
      const timeoutStage = inferTimeoutStage(error);
      const breakerSnapshot = await recordModelCallFailure(breakerKey, params.effectiveRoute.resilience, error);
      const isLastAttempt = attempt >= maxAttempts;
      const retryDelayMs = retryDelays[Math.min(attempt - 1, Math.max(0, retryDelays.length - 1))] || 0;
      logResilienceEvent('attempt_failure', {
        useCase: params.input.useCase,
        attempt,
        maxAttempts,
        retryable: classification.retryable,
        errorKind: classification.kind,
        httpStatus: classification.statusCode,
        timeoutStage,
        retryDelayMs: classification.retryable && !isLastAttempt ? retryDelayMs : 0,
        breakerState: breakerSnapshot.state,
        failureCount: breakerSnapshot.failureCount,
        openUntil: breakerSnapshot.openUntil,
        modelName: params.effectiveRoute.modelName,
        modelProfileId: params.effectiveRoute.modelProfileId,
        error: error instanceof Error ? error.message : String(error),
      });
      if (!classification.retryable || isLastAttempt || breakerSnapshot.state === 'open') {
        break;
      }
      await sleep(retryDelayMs);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError || 'model call failed');
  return {
    kind: 'fallback',
    result: await buildFallbackResult({
      input: params.input,
      effectiveRoute: params.effectiveRoute,
      promptText: params.promptText,
      source: 'error',
      warnings: [...params.effectiveRoute.warnings, `Model call failed: ${truncate(message, 240)}`],
      status: 'failed_fallback',
      modelName: params.effectiveRoute.modelName,
    }),
  };
}

async function buildTraceAndResult(params: {
  input: GenerateModelTextInput;
  effectiveRoute: ReturnType<typeof buildEffectiveModelRoute>;
  promptText: string;
  output: string;
  shouldUseResilience: boolean;
}): Promise<{ modelSpanId?: string; warnings: string[] }> {
  const warnings: string[] = [];
  const normalizedPromptSource = normalizePromptSource(params.input.promptSource, {
    promptId: params.input.promptId,
    routeSource: params.effectiveRoute.source,
  });
  let modelSpanId: string | undefined;
  try {
    await safeTraceable(async (modelSpan) => {
      const spanContext = modelSpan.spanContext();
      const traceId = spanContext.traceId;
      modelSpanId = spanContext.spanId;
      safeSetInput(modelSpan, buildStandardTraceInput({
        model_name: params.effectiveRoute.modelName,
        provider: params.effectiveRoute.provider,
        model_use_case: params.input.useCase,
        route_mode: params.effectiveRoute.routeMode,
        prompt_keys: params.input.promptId ? [params.input.promptId] : [],
        prompt_id: params.input.promptId,
        prompt_source: normalizedPromptSource,
        prompt_version: params.input.promptVersion,
        prompt_hash: hashText(params.promptText),
        prompt_length: params.promptText.length,
        prompt_preview: truncate(params.promptText, 1000),
        input_schema: getModelUseCaseDefinition(params.input.useCase)?.inputContract,
        output_schema: getModelUseCaseDefinition(params.input.useCase)?.outputContract,
        resilience: params.shouldUseResilience ? {
          enabled: params.effectiveRoute.resilience.enabled,
          connect_timeout_ms: params.effectiveRoute.resilience.connectTimeoutMs,
          response_timeout_ms: params.effectiveRoute.resilience.responseTimeoutMs,
          max_retries: params.effectiveRoute.resilience.maxRetries,
        } : undefined,
      }, {
        trace_id: traceId,
        sdk_trace_id: traceId,
        local_trace_id: traceId,
        env: process.env.XIAOQIAO_TRACE_ENV || process.env.NODE_ENV || 'prod',
        app: 'xiaoqiao',
        module: `model-router.${params.input.useCase}`,
      }));
      safeSetTags(modelSpan, buildStandardTraceTags({
        trace_id: traceId,
        sdk_trace_id: traceId,
        local_trace_id: traceId,
        env: process.env.XIAOQIAO_TRACE_ENV || process.env.NODE_ENV || 'prod',
        app: 'xiaoqiao',
        module: `model-router.${params.input.useCase}`,
        span_name: `xiaoqiao.zhitou.model.${params.input.useCase}`,
        span_type: 'model',
      }));
      safeSetOutput(modelSpan, {
        model_name: params.effectiveRoute.modelName,
        provider: params.effectiveRoute.provider,
        model_use_case: params.input.useCase,
        route_mode: params.effectiveRoute.routeMode,
        status_code: 'OK',
        tokens_unknown: true,
        output_preview: truncate(params.output, 300),
        model_span_id: modelSpanId,
      });
    }, { name: `xiaoqiao.zhitou.model.${params.input.useCase}`, type: SpanKind.Model });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(
      isTraceExporterError(error)
        ? 'Model trace is unavailable.'
        : `Model trace is unavailable: ${truncate(message, 240)}`,
    );
  }
  try {
    await flushTrace();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(
      isTraceExporterError(error)
        ? 'Model trace is unavailable.'
        : `Model trace is unavailable: ${truncate(message, 240)}`,
    );
  }
  return { modelSpanId, warnings };
}

export async function generateModelText(input: GenerateModelTextInput): Promise<GenerateModelTextResult> {
  const modelServiceConfig = input.modelServiceConfig || await getModelServiceConfig();
  const effectiveRoute = buildEffectiveModelRoute(modelServiceConfig, input.useCase);
  const promptText = input.messages.map((message) => `${message.role}: ${message.content}`).join('\n');
  const normalizedPromptSource = normalizePromptSource(input.promptSource, {
    promptId: input.promptId,
    routeSource: effectiveRoute.source,
  });
  const normalizedInput: GenerateModelTextInput = {
    ...input,
    promptSource: normalizedPromptSource,
  };

  const buildImmediateFallback = async (
    source: ModelRouterSource,
    extraWarnings: string[] = [],
    status?: ModelParticipationRecord['status'],
): Promise<GenerateModelTextResult> => buildFallbackResult({
    input: normalizedInput,
    effectiveRoute,
    promptText,
    source,
    warnings: [...effectiveRoute.warnings, ...extraWarnings],
    status,
    modelName: effectiveRoute.modelName,
  });

  if (!effectiveRoute.enabled || effectiveRoute.routeMode === 'disabled') {
    return buildImmediateFallback('disabled');
  }
  if (effectiveRoute.routeMode === 'template_only') {
    return buildImmediateFallback('template');
  }
  if (effectiveRoute.routeMode === 'not_applicable') {
    return buildImmediateFallback('template', ['model route is not applicable for this use case.'], 'not_applicable');
  }
  if (!effectiveRoute.isRealLLMCall || !hasConfiguredModelCredentials(modelServiceConfig, effectiveRoute) || !effectiveRoute.modelName) {
    return buildImmediateFallback('fallback', ['模型服务配置不完整，已使用兜底输出。'], 'not_configured');
  }

  initTrace();
  const startedAt = Date.now();
  const shouldUseResilience = input.useCase === 'chat_answer' && effectiveRoute.resilience.enabled;
  const callOutcome = shouldUseResilience
    ? await runResilientModelCall({
      input: normalizedInput,
      modelServiceConfig,
      effectiveRoute,
      promptText,
    })
    : await runLegacyModelCall({
      input: normalizedInput,
      modelServiceConfig,
      effectiveRoute,
    });

  if (callOutcome.kind === 'fallback') {
    return callOutcome.result;
  }

  const traceOutcome = await buildTraceAndResult({
    input: normalizedInput,
    effectiveRoute,
    promptText,
    output: callOutcome.text,
    shouldUseResilience,
  });
  const warnings = [...effectiveRoute.warnings, ...traceOutcome.warnings];
  return {
    text: callOutcome.text,
    source: 'model',
    modelName: effectiveRoute.modelName,
    modelSpanId: traceOutcome.modelSpanId,
    effectiveRoute,
    fallbackUsed: false,
    warnings,
    participation: buildModelParticipationRecord({
      useCase: normalizedInput.useCase,
      promptId: normalizedInput.promptId,
      promptSource: normalizedPromptSource,
      promptVersion: normalizedInput.promptVersion,
      promptHash: normalizedInput.promptHash,
      promptText,
      effectiveRoute,
      source: 'model',
      modelSpanId: traceOutcome.modelSpanId,
      latencyMs: Date.now() - startedAt,
      warnings,
    }),
  };
}
