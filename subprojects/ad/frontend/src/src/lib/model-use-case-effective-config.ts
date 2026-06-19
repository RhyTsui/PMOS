import { createHash } from 'node:crypto';
import {
  getModelUseCaseDefinition,
  type GovernedModelRouteMode,
  type ModelFallbackPolicy,
  type ModelUseCase,
} from '@/contracts/model-service';
import type { ModelParticipationRecord, PromptConfig } from '@/types';
import { getPrompt, listPromptVersions } from './prompt-store';
import {
  buildEffectiveModelRoute,
  getModelServiceConfig,
  type ModelServiceConfig,
} from './runtime-config';
import { buildModelParticipationRecord } from './model-router';

export type PromptBindingSource = 'admin' | 'seed' | 'fallback' | 'hardcoded';
export type PromptBindingStatus = 'active' | 'draft' | 'seed' | 'fallback' | 'disabled' | 'not_configured';

export interface EffectiveModelUseCaseConfig {
  modelUseCase: ModelUseCase;
  node: string;
  enabled: boolean;
  routeMode: GovernedModelRouteMode;
  promptId: string;
  promptVersion?: string;
  promptSource: PromptBindingSource;
  promptHash?: string;
  contentHash?: string;
  modelName?: string;
  modelRouteId: string;
  outputContract: string;
  fallbackPolicy: ModelFallbackPolicy;
  promptStatus: PromptBindingStatus;
  inputVariables: string[];
  outputSchema?: unknown;
  canAffectToolArgs: false;
  canAffectPermission: false;
  canAffectFinalAnswer: boolean;
  policyBlocked?: boolean;
  policyBlockReason?: string;
  warnings: string[];
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function promptSourceForConfig(prompt?: PromptConfig): PromptBindingSource {
  if (!prompt) return 'fallback';
  if (prompt.prompt_source) return prompt.prompt_source;
  if (prompt.managed_seed_hash || prompt.managed_seed_revision) return 'seed';
  return 'admin';
}

function promptStatusForConfig(prompt?: PromptConfig): PromptBindingStatus {
  if (!prompt) return 'not_configured';
  if (prompt.enabled === false || prompt.status === 'disabled' || prompt.status === 'archived') return 'disabled';
  if (prompt.status === 'active') return 'active';
  if (prompt.status === 'seed') return 'seed';
  if (prompt.status === 'fallback') return 'fallback';
  if (prompt.status === 'not_configured') return 'not_configured';
  return 'draft';
}

function governedRouteMode(params: {
  configuredEnabled: boolean;
  promptStatus: PromptBindingStatus;
  definitionRouteMode: GovernedModelRouteMode;
}): GovernedModelRouteMode {
  if (!params.configuredEnabled || params.promptStatus === 'disabled') return 'disabled';
  return params.definitionRouteMode;
}

export async function buildEffectiveModelUseCaseConfig(params: {
  modelUseCase: ModelUseCase;
  modelServiceConfig?: ModelServiceConfig;
  promptId?: string;
  hardcodedFallback?: boolean;
}): Promise<EffectiveModelUseCaseConfig> {
  const definition = getModelUseCaseDefinition(params.modelUseCase);
  if (!definition) {
    throw new Error(`Unknown model use case: ${params.modelUseCase}`);
  }
  const modelServiceConfig = params.modelServiceConfig || await getModelServiceConfig();
  const effectiveRoute = buildEffectiveModelRoute(modelServiceConfig, params.modelUseCase);
  const promptId = params.promptId || definition.defaultPromptId;
  const prompt = await getPrompt(promptId);
  const versions = prompt ? await listPromptVersions(prompt.id) : [];
  const currentVersion = prompt
    ? versions.find(item => item.version === prompt.current_version) || versions.at(-1)
    : undefined;
  const contentHash = currentVersion?.content_hash || (currentVersion?.content ? hashText(currentVersion.content) : undefined);
  const promptStatus = promptStatusForConfig(prompt);
  const promptSource = params.hardcodedFallback ? 'hardcoded' : promptSourceForConfig(prompt);
  const hasActivePrompt = promptStatus === 'active';
  const routeMode = governedRouteMode({
    configuredEnabled: effectiveRoute.enabled,
    promptStatus,
    definitionRouteMode: definition.routeMode,
  });
  const enabled = effectiveRoute.enabled && hasActivePrompt && routeMode !== 'disabled';
  const warnings = [
    ...effectiveRoute.warnings,
    ...(!hasActivePrompt ? [`No active prompt configured for ${params.modelUseCase}.`] : []),
  ];
  return {
    modelUseCase: params.modelUseCase,
    node: definition.node,
    enabled,
    routeMode,
    promptId,
    promptVersion: currentVersion ? String(currentVersion.version) : undefined,
    promptSource,
    promptHash: contentHash,
    contentHash,
    modelName: effectiveRoute.modelName,
    modelRouteId: definition.defaultModelRoute,
    outputContract: definition.outputContract,
    fallbackPolicy: !hasActivePrompt ? 'not_configured' : definition.fallbackPolicy,
    promptStatus,
    inputVariables: prompt?.input_variables || prompt?.variables || prompt?.binding.inputVariables || [],
    outputSchema: prompt?.output_schema || prompt?.binding.outputSchema,
    canAffectToolArgs: false,
    canAffectPermission: false,
    canAffectFinalAnswer: definition.canAffectFinalAnswer,
    policyBlocked: effectiveRoute.policyBlocked,
    policyBlockReason: effectiveRoute.policyBlockReason,
    warnings,
  };
}

export async function buildModelUseCaseObservation(params: {
  modelUseCase: ModelUseCase;
  status?: ModelParticipationRecord['status'];
  promptId?: string;
  promptSource?: PromptBindingSource;
  promptVersion?: string;
  promptHash?: string;
  outputConsumedBy?: string;
  warnings?: string[];
  modelServiceConfig?: ModelServiceConfig;
  fallbackPath?: string;
  fallbackReason?: string;
  input?: unknown;
  output?: unknown;
  validationStatus?: ModelParticipationRecord['validation_status'];
  validationError?: string;
  droppedFields?: string[];
  dropReason?: string;
}): Promise<ModelParticipationRecord> {
  const modelServiceConfig = params.modelServiceConfig || await getModelServiceConfig();
  const effectiveConfig = await buildEffectiveModelUseCaseConfig({
    modelUseCase: params.modelUseCase,
    modelServiceConfig,
    promptId: params.promptId,
  });
  const effectiveRoute = buildEffectiveModelRoute(modelServiceConfig, params.modelUseCase);
  const status = params.status === 'not_applicable'
    ? 'not_applicable'
    : effectiveConfig.policyBlocked
      ? 'blocked_by_policy'
      : effectiveConfig.promptStatus === 'not_configured'
      ? 'not_configured'
      : effectiveConfig.routeMode === 'disabled'
        ? 'disabled'
        : params.status || 'fallback_to_rules';
  return buildModelParticipationRecord({
    useCase: params.modelUseCase,
    promptId: params.promptId || effectiveConfig.promptId,
    promptSource: params.promptSource || effectiveConfig.promptSource,
    promptVersion: params.promptVersion || effectiveConfig.promptVersion,
    promptHash: params.promptHash || effectiveConfig.promptHash,
    promptText: `${params.modelUseCase}:effective_config_projection`,
    effectiveRoute,
    status,
    warnings: [...effectiveConfig.warnings, ...(params.warnings || [])],
    outputConsumed: status === 'succeeded_consumed',
    outputConsumedBy: params.outputConsumedBy,
    fallbackReasonOverride: params.fallbackReason,
    fallbackPath: params.fallbackPath,
    inputHash: params.input === undefined ? undefined : hashText(JSON.stringify(params.input)),
    outputHash: params.output === undefined ? undefined : hashText(JSON.stringify(params.output)),
    validationStatus: params.validationStatus,
    validationError: params.validationError,
    droppedFields: params.droppedFields,
    dropReason: params.dropReason,
  });
}
