export type ModelRouteMode =
  | 'gateway_controlled'
  | 'direct_external'
  | 'local_private'
  | 'template_only'
  | 'disabled'
  | 'not_applicable';

export type GovernedModelRouteMode =
  | 'disabled'
  | 'shadow'
  | 'assist'
  | 'grounded_compose';

export type ModelRouteSource =
  | 'runtime_config'
  | 'seed_default'
  | 'env_default'
  | 'fallback'
  | 'disabled';

export type ModelFallbackMode = 'template' | 'rule' | 'fallback_model' | 'disabled';

export type ModelDataClass = 'public' | 'internal' | 'confidential' | 'restricted';

export type ModelReasoningLevel = 'disabled' | 'low' | 'medium' | 'high';

export interface ModelResilienceConfig {
  enabled: boolean;
  connectTimeoutMs: number;
  responseTimeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number[];
  retryableHttpStatuses: number[];
  breakerFailureThreshold: number;
  breakerOpenMs: number;
  breakerHalfOpenProbeCount: number;
}

export interface ModelGenerationParams {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  reasoningLevel?: ModelReasoningLevel;
  stream?: boolean;
  jsonMode?: boolean;
}

export interface ModelGatewayConfig {
  enabled: boolean;
  gatewayId?: string;
  gatewayName?: string;
  policyId?: string;
  mode?: 'proxy' | 'policy_check' | 'managed_provider';
}

export interface ModelFallbackConfig {
  enabled: boolean;
  fallbackMode: ModelFallbackMode;
  fallbackModelName?: string;
}

export interface ModelDataPolicy {
  dataClass: ModelDataClass;
  requireDesensitization: boolean;
  allowExternalModel: boolean;
  auditRequired: boolean;
}

export interface ModelTracePolicy {
  requireModelSpan: boolean;
  recordAnswerOrigin: boolean;
  recordTokenUsage: boolean;
  recordLatency: boolean;
}

export interface ModelProfileConfig {
  id: string;
  name: string;
  provider: 'coze_openai_compatible' | 'custom_openai_compatible';
  providerLabel: string;
  apiKey: string;
  baseUrl: string;
  modelBaseUrl: string;
  modelName: string;
  enabled: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface ModelRouteConfig {
  useCase: string;
  enabled: boolean;
  routeMode: ModelRouteMode;
  modelProfileId?: string;
  provider?: string;
  modelName?: string;
  resilience?: ModelResilienceConfig;
  gateway?: ModelGatewayConfig;
  generationParams?: ModelGenerationParams;
  fallback?: ModelFallbackConfig;
  dataPolicy?: ModelDataPolicy;
  tracePolicy?: ModelTracePolicy;
  updatedAt?: string;
}

export interface EffectiveModelRoute {
  useCase: string;
  enabled: boolean;
  routeMode: ModelRouteMode;
  modelProfileId?: string;
  modelProfileName?: string;
  provider?: string;
  modelName?: string;
  source: ModelRouteSource;
  gatewayEnabled: boolean;
  gatewayId?: string;
  gatewayName?: string;
  policyId?: string;
  fallbackUsed: boolean;
  isRealLLMCall: boolean;
  policyBlocked?: boolean;
  policyBlockReason?: string;
  hasModelSpan: boolean;
  promptIds: string[];
  warnings: string[];
  generationParams: ModelGenerationParams;
  resilience: ModelResilienceConfig;
  fallback: ModelFallbackConfig;
  dataPolicy: ModelDataPolicy;
  tracePolicy: ModelTracePolicy;
}

export const DEFAULT_MODEL_GENERATION_PARAMS: ModelGenerationParams = {
  temperature: 0.2,
  maxTokens: 1200,
  timeoutMs: 12000,
  reasoningLevel: 'low',
  stream: true,
  jsonMode: false,
};

export const DEFAULT_MODEL_RESILIENCE: ModelResilienceConfig = {
  enabled: false,
  connectTimeoutMs: 10000,
  responseTimeoutMs: 30000,
  maxRetries: 3,
  retryBackoffMs: [1000, 2000, 4000],
  retryableHttpStatuses: [429, 502, 503, 504],
  breakerFailureThreshold: 5,
  breakerOpenMs: 15000,
  breakerHalfOpenProbeCount: 2,
};

export const DEFAULT_MODEL_FALLBACK: ModelFallbackConfig = {
  enabled: true,
  fallbackMode: 'template',
};

export const DEFAULT_MODEL_DATA_POLICY: ModelDataPolicy = {
  dataClass: 'internal',
  requireDesensitization: false,
  allowExternalModel: false,
  auditRequired: true,
};

export const DEFAULT_MODEL_TRACE_POLICY: ModelTracePolicy = {
  requireModelSpan: true,
  recordAnswerOrigin: true,
  recordTokenUsage: false,
  recordLatency: true,
};
