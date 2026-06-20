import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';
import { Config } from 'coze-coding-dev-sdk';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';
import {
  DEFAULT_CHAT_DISPLAY_CONFIG,
  DEFAULT_CHAT_STARTERS,
  type ChatDisplayConfig,
  type ChatStarterItemConfig,
  type ChatStarterQuestionConfig,
} from '@/types/chat-display';
import {
  DEFAULT_MODEL_DATA_POLICY,
  DEFAULT_MODEL_FALLBACK,
  DEFAULT_MODEL_GENERATION_PARAMS,
  DEFAULT_MODEL_RESILIENCE,
  DEFAULT_MODEL_TRACE_POLICY,
  MODEL_USE_CASE_REGISTRY,
  GOVERNED_REPORT_QUERY_LLM_NODES,
  getModelUseCaseDefinition,
  type EffectiveModelRoute,
  type ModelProfileConfig,
  type ModelResilienceConfig,
  type ModelRouteConfig,
  type ModelRouteMode,
  type ModelUseCase,
} from '@/contracts/model-service';
import {
  getDefaultPublicSearchProviders,
  getDefaultSearchOrchestratorConfig,
  normalizePublicSearchOrchestratorConfig,
  normalizePublicSearchProviderConfigs,
} from '@/lib/search-provider-config';

export interface ModelServiceConfig {
  enabled: boolean;
  provider: 'coze_openai_compatible' | 'custom_openai_compatible';
  providerLabel: string;
  apiKey: string;
  baseUrl: string;
  modelBaseUrl: string;
  modelName: string;
  modelProfiles?: ModelProfileConfig[];
  defaultModelProfileId?: string;
  knowledgeBaseUrl: string;
  knowledgeBaseApiKey: string;
  knowledgeBaseDataset: string;
  controlledGlossaryKnowledgeBaseId: string;
  datakiBaseUrl: string;
  datakiAdminEmail: string;
  datakiAdminPassword: string;
  notes: string;
  updatedAt: string;
  routes?: Partial<Record<ModelUseCase, ModelRouteConfig>>;
}

export type PublicWebAuthType = 'none' | 'bearer' | 'api_key_header' | 'api_key_body' | 'custom_headers';
export type PublicWebSearchMethod = 'GET' | 'POST';
export type PublicSearchProviderKind = 'legacy' | 'brave' | 'exa' | 'firecrawl' | 'weather' | 'tavily' | 'simple_fetch';
export type PublicSearchProviderCapability = 'search' | 'deep_search' | 'fetch';

export interface PublicSearchProviderConfig {
  id: string;
  kind: PublicSearchProviderKind;
  label: string;
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  authType?: PublicWebAuthType;
  apiKeyHeader?: string;
  method?: PublicWebSearchMethod;
  capabilities: PublicSearchProviderCapability[];
  timeoutMs?: number;
  maxResults?: number;
  fetchMode?: 'scrape' | 'extract';
}

export interface PublicSearchOrchestratorConfig {
  enabled: boolean;
  maxFetchPages: number;
  maxResearchRounds: number;
  concurrency: number;
  timeoutMs: number;
  rerankWeights: {
    queryRelevance: number;
    sourceQuality: number;
    freshness: number;
    authority: number;
    languageMatch: number;
  };
}

export interface PublicWebConfig {
  enabled: boolean;
  providerLabel: string;
  searchEndpoint: string;
  fetchEndpoint: string;
  apiKey: string;
  authType: PublicWebAuthType;
  apiKeyHeader: string;
  headers: Record<string, string>;
  method: PublicWebSearchMethod;
  queryParam: string;
  resultsPath: string;
  titlePath: string;
  urlPath: string;
  snippetPath: string;
  siteNamePath: string;
  publisherPath: string;
  allowedDomains: string[];
  blockedDomains: string[];
  maxResults: number;
  timeoutMs: number;
  cacheTtl: number;
  sourceRequired: boolean;
  internalDataProtection: boolean;
  providers?: PublicSearchProviderConfig[];
  orchestrator?: PublicSearchOrchestratorConfig;
  needRules: {
    defaultGeneralLookup: boolean;
    defaultLookupRouteIntents: string[];
    excludedRouteIntents: string[];
    configQuestionSignals: string[];
    realtimeSignals: string[];
    externalSignals: string[];
    explicitSearchSignals: string[];
    businessDataSignals: string[];
    strongPublicSignals: string[];
    internalDataPatterns: string[];
  };
}

const CONFIG_PATH = runtimeDataPath('runtime-config.json');
const LEGACY_CONFIG_PATH = legacyDataPath('runtime-config.json');
const DEFAULT_MODEL_PROFILE_ID = 'default-current-model';
const MODEL_GOVERNANCE_CUTOVER_AT = '2026-06-07T00:00:00.000Z';
const MODEL_GOVERNANCE_CUTOVER_MS = Date.parse(MODEL_GOVERNANCE_CUTOVER_AT);

const DEFAULT_MODEL_SERVICE_CONFIG: ModelServiceConfig = {
  enabled: true,
  provider: 'coze_openai_compatible',
  providerLabel: process.env.XIAOQIAO_MODEL_PROVIDER_LABEL || 'Coze/OpenAI 兼容服务',
  apiKey: process.env.COZE_WORKLOAD_IDENTITY_API_KEY || process.env.COZE_CODING_API_KEY || '',
  baseUrl:
    process.env.COZE_INTEGRATION_BASE_URL ||
    process.env.COZE_CODING_BASE_URL ||
    '',
  modelBaseUrl:
    process.env.COZE_INTEGRATION_MODEL_BASE_URL ||
    process.env.COZE_CODING_MODEL_BASE_URL ||
    '',
  modelName: process.env.XIAOQIAO_MODEL_NAME || 'doubao-seed-1-8-251228',
  modelProfiles: [],
  defaultModelProfileId: DEFAULT_MODEL_PROFILE_ID,
  knowledgeBaseUrl: process.env.XIAOQIAO_KNOWLEDGE_BASE_URL || '',
  knowledgeBaseApiKey: process.env.XIAOQIAO_KNOWLEDGE_API_KEY || '',
  knowledgeBaseDataset: process.env.XIAOQIAO_KNOWLEDGE_BASE_ID || process.env.XIAOQIAO_KNOWLEDGE_DATASET || '',
  controlledGlossaryKnowledgeBaseId: process.env.XIAOQIAO_CONTROLLED_GLOSSARY_KNOWLEDGE_BASE_ID || '',
  datakiBaseUrl: process.env.XIAOQIAO_DATAKI_BASE_URL || 'https://dataki.dobest.com',
  datakiAdminEmail: process.env.XIAOQIAO_DATAKI_ADMIN_EMAIL || '',
  datakiAdminPassword: process.env.XIAOQIAO_DATAKI_ADMIN_PASSWORD || '',
  notes: '',
  updatedAt: new Date().toISOString(),
  routes: {},
};

const DEFAULT_PUBLIC_WEB_CONFIG: PublicWebConfig = {
  enabled: process.env.XIAOQIAO_WEB_SEARCH_ENABLED === 'true',
  providerLabel: process.env.XIAOQIAO_WEB_SEARCH_PROVIDER_LABEL || 'Configured Web Search',
  searchEndpoint: normalizePublicWebEndpoint(process.env.XIAOQIAO_WEB_SEARCH_ENDPOINT || ''),
  fetchEndpoint: normalizePublicWebEndpoint(process.env.XIAOQIAO_WEB_FETCH_ENDPOINT || ''),
  apiKey: process.env.XIAOQIAO_WEB_SEARCH_API_KEY || '',
  authType: (process.env.XIAOQIAO_WEB_SEARCH_AUTH_TYPE as PublicWebAuthType) || 'none',
  apiKeyHeader: process.env.XIAOQIAO_WEB_SEARCH_API_KEY_HEADER || 'X-API-Key',
  headers: {},
  method: ((process.env.XIAOQIAO_WEB_SEARCH_METHOD || 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET'),
  queryParam: process.env.XIAOQIAO_WEB_SEARCH_QUERY_PARAM || 'q',
  resultsPath: process.env.XIAOQIAO_WEB_SEARCH_RESULTS_PATH || '',
  titlePath: process.env.XIAOQIAO_WEB_SEARCH_TITLE_PATH || 'title',
  urlPath: process.env.XIAOQIAO_WEB_SEARCH_URL_PATH || 'url',
  snippetPath: process.env.XIAOQIAO_WEB_SEARCH_SNIPPET_PATH || 'snippet',
  siteNamePath: process.env.XIAOQIAO_WEB_SEARCH_SITE_PATH || 'siteName',
  publisherPath: process.env.XIAOQIAO_WEB_SEARCH_PUBLISHER_PATH || 'publisher',
  allowedDomains: (process.env.XIAOQIAO_WEB_SEARCH_ALLOWED_DOMAINS || '').split(',').map(item => item.trim()).filter(Boolean),
  blockedDomains: (process.env.XIAOQIAO_WEB_SEARCH_BLOCKED_DOMAINS || '').split(',').map(item => item.trim()).filter(Boolean),
  maxResults: Number(process.env.XIAOQIAO_WEB_SEARCH_MAX_RESULTS || 5),
  timeoutMs: Number(process.env.XIAOQIAO_WEB_SEARCH_TIMEOUT_MS || 8000),
  cacheTtl: Number(process.env.XIAOQIAO_WEB_SEARCH_CACHE_TTL || 300),
  sourceRequired: true,
  internalDataProtection: true,
  providers: getDefaultPublicSearchProviders(),
  orchestrator: getDefaultSearchOrchestratorConfig(),
  needRules: {
    defaultGeneralLookup: true,
    defaultLookupRouteIntents: ['general'],
    excludedRouteIntents: ['report_query', 'diagnosis', 'debugging', 'demand', 'get_delivery_packages', 'monitor', 'forecast'],
    configQuestionSignals: ['接口', '网关', '配置', '设置', '设置方法', 'apiconfig', 'api配置'],
    realtimeSignals: ['实时', '当前', '现在', '今年', '明年', '去年', '天气', '明天', '今天', '最近', '更新', '提醒', '公告', '新闻', '警告', '政策', '节假日'],
    externalSignals: ['官网', '网站', '网页', '公告', '新闻', '政策', '天气', '公开', '行业', '平台', '赛事', '比赛', '赛程', '举办', '举行', '地点'],
    explicitSearchSignals: ['搜索', '检索', '查找公开', '查公开', '外部搜索', '联网查'],
    businessDataSignals: [],
    strongPublicSignals: ['官网', '网站', '网页', '公告', '新闻', '政策', '天气', '假期', '节假日', '规则', '审核', '赛事', '比赛', '赛程', '举办', '举行'],
    internalDataPatterns: [
      String.raw`(?:appId|app_id|projectId|project_id|appid|项目ID|应用id)[:\s]*[A-Za-z0-9_-]{4,}`,
      String.raw`\b\d{7,}\b`,
    ],
  },
};

function isSyntheticPublicWebHost(host: string): boolean {
  const normalizedHost = host.trim().toLowerCase();
  return Boolean(normalizedHost) && (
    normalizedHost === 'example.test'
    || normalizedHost.endsWith('.example.test')
    || normalizedHost === 'example.org'
    || normalizedHost.endsWith('.example.org')
    || normalizedHost === 'localhost'
    || normalizedHost === '127.0.0.1'
    || normalizedHost === '0.0.0.0'
  );
}

function isPrivateNetworkHost(host: string): boolean {
  const normalizedHost = host.trim().toLowerCase();
  const private172Match = normalizedHost.match(/^172\.(\d{1,2})\./);
  return Boolean(normalizedHost) && (
    normalizedHost === 'localhost'
    || /^(127|10)\./.test(normalizedHost)
    || /^192\.168\./.test(normalizedHost)
    || Boolean(private172Match && Number(private172Match[1]) >= 16 && Number(private172Match[1]) <= 31)
  );
}

function isSelfReferentialPublicWebEndpoint(url: URL): boolean {
  const pathname = url.pathname.replace(/\/+$/, '').toLowerCase();
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  return pathname === '/api/xiaoqiao/web-search'
    && isPrivateNetworkHost(url.hostname)
    && (port === '8002' || port === '3000' || port === '80' || port === '443');
}

export function isUnsafePublicWebEndpoint(endpoint: string): boolean {
  const normalizedEndpoint = endpoint.trim();
  if (!normalizedEndpoint) return false;
  const lowered = normalizedEndpoint.toLowerCase();
  if (lowered.startsWith('fake:') || lowered.startsWith('mock:')) return true;
  try {
    const url = new URL(normalizedEndpoint);
    return isSyntheticPublicWebHost(url.hostname) || isSelfReferentialPublicWebEndpoint(url);
  } catch {
    return /(?:^|[^a-z0-9])(example\.test|fake|mock)(?:[^a-z0-9]|$)/i.test(normalizedEndpoint);
  }
}

function normalizePublicWebEndpoint(endpoint?: string): string {
  const trimmed = endpoint?.trim() || '';
  if (!trimmed) return '';
  return isUnsafePublicWebEndpoint(trimmed) ? '' : trimmed;
}

interface RuntimeConfigFile {
  modelService: ModelServiceConfig;
  chatDisplay: ChatDisplayConfig;
  publicWeb: PublicWebConfig;
}

interface RuntimeConfigOverrideStore {
  modelService?: ModelServiceConfig;
  publicWeb?: PublicWebConfig;
}

const runtimeConfigOverrides = new AsyncLocalStorage<RuntimeConfigOverrideStore>();

function normalizeDefaultPublicWebLookupRouteIntents(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(String).filter(Boolean)
    : DEFAULT_PUBLIC_WEB_CONFIG.needRules.defaultLookupRouteIntents;
}

function normalizePublicWebExcludedRouteIntents(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value.map(String).filter(Boolean)
    : DEFAULT_PUBLIC_WEB_CONFIG.needRules.excludedRouteIntents;
  return [...new Set(source)];
}

function mergePublicWebDefaultSignals(value: unknown, defaults: string[]): string[] {
  const configured = Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
  return Array.from(new Set([...configured, ...defaults]));
}

function normalizePublicWebConfig(input?: Partial<PublicWebConfig>): PublicWebConfig {
  const method = String(input?.method || DEFAULT_PUBLIC_WEB_CONFIG.method).toUpperCase() === 'POST' ? 'POST' : 'GET';
  const authType = input?.authType === 'bearer' || input?.authType === 'api_key_header' || input?.authType === 'custom_headers'
    ? input.authType
    : input?.authType === 'none'
      ? 'none'
      : DEFAULT_PUBLIC_WEB_CONFIG.authType;
  return {
    ...DEFAULT_PUBLIC_WEB_CONFIG,
    ...input,
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : DEFAULT_PUBLIC_WEB_CONFIG.enabled,
    providerLabel: input?.providerLabel?.trim() || DEFAULT_PUBLIC_WEB_CONFIG.providerLabel,
    searchEndpoint: typeof input?.searchEndpoint === 'string'
      ? normalizePublicWebEndpoint(input.searchEndpoint)
      : DEFAULT_PUBLIC_WEB_CONFIG.searchEndpoint,
    fetchEndpoint: typeof input?.fetchEndpoint === 'string'
      ? normalizePublicWebEndpoint(input.fetchEndpoint)
      : DEFAULT_PUBLIC_WEB_CONFIG.fetchEndpoint,
    apiKey: input?.apiKey?.trim() || DEFAULT_PUBLIC_WEB_CONFIG.apiKey,
    authType,
    apiKeyHeader: input?.apiKeyHeader?.trim() || DEFAULT_PUBLIC_WEB_CONFIG.apiKeyHeader,
    headers: input?.headers && typeof input.headers === 'object' ? input.headers : {},
    method,
    queryParam: input?.queryParam?.trim() || DEFAULT_PUBLIC_WEB_CONFIG.queryParam,
    resultsPath: input?.resultsPath?.trim() || DEFAULT_PUBLIC_WEB_CONFIG.resultsPath,
    titlePath: input?.titlePath?.trim() || DEFAULT_PUBLIC_WEB_CONFIG.titlePath,
    urlPath: input?.urlPath?.trim() || DEFAULT_PUBLIC_WEB_CONFIG.urlPath,
    snippetPath: input?.snippetPath?.trim() || DEFAULT_PUBLIC_WEB_CONFIG.snippetPath,
    siteNamePath: input?.siteNamePath?.trim() || DEFAULT_PUBLIC_WEB_CONFIG.siteNamePath,
    publisherPath: input?.publisherPath?.trim() || DEFAULT_PUBLIC_WEB_CONFIG.publisherPath,
    allowedDomains: Array.isArray(input?.allowedDomains) ? input.allowedDomains.map(String).filter(Boolean) : DEFAULT_PUBLIC_WEB_CONFIG.allowedDomains,
    blockedDomains: Array.isArray(input?.blockedDomains) ? input.blockedDomains.map(String).filter(Boolean) : DEFAULT_PUBLIC_WEB_CONFIG.blockedDomains,
    maxResults: Number.isFinite(Number(input?.maxResults)) ? Math.max(1, Math.min(20, Number(input?.maxResults))) : DEFAULT_PUBLIC_WEB_CONFIG.maxResults,
    timeoutMs: Number.isFinite(Number(input?.timeoutMs)) ? Math.max(1000, Number(input?.timeoutMs)) : DEFAULT_PUBLIC_WEB_CONFIG.timeoutMs,
    cacheTtl: Number.isFinite(Number(input?.cacheTtl)) ? Math.max(0, Number(input?.cacheTtl)) : DEFAULT_PUBLIC_WEB_CONFIG.cacheTtl,
    sourceRequired: typeof input?.sourceRequired === 'boolean' ? input.sourceRequired : DEFAULT_PUBLIC_WEB_CONFIG.sourceRequired,
    internalDataProtection: typeof input?.internalDataProtection === 'boolean' ? input.internalDataProtection : DEFAULT_PUBLIC_WEB_CONFIG.internalDataProtection,
    providers: normalizePublicSearchProviderConfigs(input?.providers, DEFAULT_PUBLIC_WEB_CONFIG.providers),
    orchestrator: normalizePublicSearchOrchestratorConfig(input?.orchestrator, DEFAULT_PUBLIC_WEB_CONFIG.orchestrator),
    needRules: {
      defaultGeneralLookup: typeof input?.needRules?.defaultGeneralLookup === 'boolean' ? input.needRules.defaultGeneralLookup : DEFAULT_PUBLIC_WEB_CONFIG.needRules.defaultGeneralLookup,
      defaultLookupRouteIntents: normalizeDefaultPublicWebLookupRouteIntents(input?.needRules?.defaultLookupRouteIntents),
      excludedRouteIntents: normalizePublicWebExcludedRouteIntents(input?.needRules?.excludedRouteIntents),
      configQuestionSignals: mergePublicWebDefaultSignals(input?.needRules?.configQuestionSignals, DEFAULT_PUBLIC_WEB_CONFIG.needRules.configQuestionSignals),
      realtimeSignals: mergePublicWebDefaultSignals(input?.needRules?.realtimeSignals, DEFAULT_PUBLIC_WEB_CONFIG.needRules.realtimeSignals),
      externalSignals: mergePublicWebDefaultSignals(input?.needRules?.externalSignals, DEFAULT_PUBLIC_WEB_CONFIG.needRules.externalSignals),
      explicitSearchSignals: mergePublicWebDefaultSignals(input?.needRules?.explicitSearchSignals, DEFAULT_PUBLIC_WEB_CONFIG.needRules.explicitSearchSignals),
      businessDataSignals: mergePublicWebDefaultSignals(input?.needRules?.businessDataSignals, DEFAULT_PUBLIC_WEB_CONFIG.needRules.businessDataSignals),
      strongPublicSignals: mergePublicWebDefaultSignals(input?.needRules?.strongPublicSignals, DEFAULT_PUBLIC_WEB_CONFIG.needRules.strongPublicSignals),
      internalDataPatterns: mergePublicWebDefaultSignals(input?.needRules?.internalDataPatterns, DEFAULT_PUBLIC_WEB_CONFIG.needRules.internalDataPatterns),
    },
  };
}

function stripJsonBom(raw: string): string {
  return raw.replace(/^\uFEFF/, '');
}

function repairRuntimeModelServiceJson(raw: string): string {
  return raw.replace(/"providerLabel"\s*:\s*"[^"\r\n]*(?:\r?\n)/, '"providerLabel": "Aliyun Qwen",\n');
}

function readModelServiceFromPartialRuntimeConfig(raw: string): ModelServiceConfig | null {
  const chatDisplayIndex = raw.indexOf('  "chatDisplay"');
  if (chatDisplayIndex < 0) return null;
  const modelServiceOnly = `${raw.slice(0, chatDisplayIndex).trimEnd().replace(/,\s*$/, '')}\n}`;
  try {
    const parsed = JSON.parse(repairRuntimeModelServiceJson(modelServiceOnly)) as Partial<RuntimeConfigFile>;
    return normalizeModelServiceConfig(parsed.modelService);
  } catch {
    return null;
  }
}

function normalizeModelProfileConfig(
  input: Partial<ModelProfileConfig> | undefined,
  defaults: Pick<ModelServiceConfig, 'provider' | 'providerLabel' | 'apiKey' | 'baseUrl' | 'modelBaseUrl' | 'modelName' | 'updatedAt'>,
  index = 0,
): ModelProfileConfig {
  const id = input?.id?.trim() || (index === 0 ? DEFAULT_MODEL_PROFILE_ID : `model-profile-${index + 1}`);
  const baseUrl = input?.baseUrl?.trim() || defaults.baseUrl || '';
  return {
    id,
    name: input?.name?.trim() || (index === 0 ? '当前默认模型' : `模型 ${index + 1}`),
    provider: input?.provider || defaults.provider,
    providerLabel: input?.providerLabel?.trim() || defaults.providerLabel,
    apiKey: input?.apiKey?.trim() || defaults.apiKey || '',
    baseUrl,
    modelBaseUrl: input?.modelBaseUrl?.trim() || defaults.modelBaseUrl || baseUrl,
    modelName: input?.modelName?.trim() || defaults.modelName,
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : true,
    notes: input?.notes?.trim() || '',
    updatedAt: input?.updatedAt || defaults.updatedAt,
  };
}

function normalizeModelProfiles(
  input: Partial<ModelProfileConfig>[] | undefined,
  modelService: Pick<ModelServiceConfig, 'provider' | 'providerLabel' | 'apiKey' | 'baseUrl' | 'modelBaseUrl' | 'modelName' | 'updatedAt'>,
): ModelProfileConfig[] {
  const sourceProfiles = Array.isArray(input) && input.length ? input : [undefined];
  const seen = new Set<string>();
  return sourceProfiles.map((profile, index) => normalizeModelProfileConfig(profile, modelService, index))
    .map((profile, index) => {
      if (!seen.has(profile.id)) {
        seen.add(profile.id);
        return profile;
      }
      const deduped = { ...profile, id: `${profile.id}-${index + 1}` };
      seen.add(deduped.id);
      return deduped;
    });
}

function normalizeModelServiceConfig(input?: Partial<ModelServiceConfig>): ModelServiceConfig {
  const base: ModelServiceConfig = {
    ...DEFAULT_MODEL_SERVICE_CONFIG,
    ...input,
    provider: input?.provider || DEFAULT_MODEL_SERVICE_CONFIG.provider,
    providerLabel: input?.providerLabel?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.providerLabel,
    apiKey: input?.apiKey?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.apiKey || '',
    baseUrl: input?.baseUrl?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.baseUrl || '',
    modelBaseUrl: input?.modelBaseUrl?.trim() || input?.baseUrl?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.modelBaseUrl || '',
    modelName: input?.modelName?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.modelName,
    knowledgeBaseUrl: input?.knowledgeBaseUrl?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.knowledgeBaseUrl || '',
    knowledgeBaseApiKey: input?.knowledgeBaseApiKey?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.knowledgeBaseApiKey || '',
    knowledgeBaseDataset: input?.knowledgeBaseDataset?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.knowledgeBaseDataset || '',
    controlledGlossaryKnowledgeBaseId: input?.controlledGlossaryKnowledgeBaseId?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.controlledGlossaryKnowledgeBaseId || '',
    datakiBaseUrl: input?.datakiBaseUrl?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.datakiBaseUrl,
    datakiAdminEmail: input?.datakiAdminEmail?.trim() || '',
    datakiAdminPassword: input?.datakiAdminPassword?.trim() || '',
    notes: input?.notes?.trim() || '',
    updatedAt: input?.updatedAt || new Date().toISOString(),
    routes: {},
  };
  base.modelProfiles = normalizeModelProfiles(input?.modelProfiles, base);
  const configuredDefaultProfileId = input?.defaultModelProfileId?.trim();
  const configuredDefaultProfile = base.modelProfiles.find(profile => profile.id === configuredDefaultProfileId);
  if (configuredDefaultProfile?.enabled) {
    base.defaultModelProfileId = configuredDefaultProfileId;
  } else {
    // 默认 profile 不存在或已禁用，降级到第一个启用的 profile
    const firstEnabledProfile = base.modelProfiles.find(profile => profile.enabled);
    base.defaultModelProfileId = firstEnabledProfile?.id || base.modelProfiles[0]?.id || DEFAULT_MODEL_PROFILE_ID;
  }
  base.routes = normalizeModelRouteConfigs(input?.routes, base);
  return base;
}

function isRouteMode(value: unknown): value is ModelRouteMode {
  return value === 'gateway_controlled'
    || value === 'direct_external'
    || value === 'local_private'
    || value === 'template_only'
    || value === 'disabled'
    || value === 'not_applicable';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeNumberList(values: unknown, fallback: number[]): number[] {
  if (!Array.isArray(values) || !values.length) return [...fallback];
  const normalized = values
    .map(item => Number(item))
    .filter(item => Number.isFinite(item));
  return normalized.length ? normalized : [...fallback];
}

function normalizeModelResilienceConfig(
  input: Partial<ModelResilienceConfig> | undefined,
  useCase: ModelUseCase,
): ModelResilienceConfig {
  const defaults = {
    ...DEFAULT_MODEL_RESILIENCE,
    enabled: useCase === 'chat_answer',
  };
  const minConnectTimeoutMs = useCase === 'chat_answer' ? defaults.connectTimeoutMs : 1000;
  const minMaxRetries = useCase === 'chat_answer' ? defaults.maxRetries : 0;
  return {
    ...defaults,
    ...input,
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : defaults.enabled,
    connectTimeoutMs: isFiniteNumber(input?.connectTimeoutMs) ? Math.max(minConnectTimeoutMs, Math.floor(input.connectTimeoutMs)) : defaults.connectTimeoutMs,
    responseTimeoutMs: isFiniteNumber(input?.responseTimeoutMs) ? Math.max(1000, Math.floor(input.responseTimeoutMs)) : defaults.responseTimeoutMs,
    maxRetries: isFiniteNumber(input?.maxRetries) ? Math.max(minMaxRetries, Math.floor(input.maxRetries)) : defaults.maxRetries,
    retryBackoffMs: normalizeNumberList(input?.retryBackoffMs, defaults.retryBackoffMs),
    retryableHttpStatuses: normalizeNumberList(input?.retryableHttpStatuses, defaults.retryableHttpStatuses)
      .map(status => Math.floor(status))
      .filter(status => Number.isFinite(status)),
    breakerFailureThreshold: isFiniteNumber(input?.breakerFailureThreshold) ? Math.max(1, Math.floor(input.breakerFailureThreshold)) : defaults.breakerFailureThreshold,
    breakerOpenMs: isFiniteNumber(input?.breakerOpenMs) ? Math.max(1000, Math.floor(input.breakerOpenMs)) : defaults.breakerOpenMs,
    breakerHalfOpenProbeCount: isFiniteNumber(input?.breakerHalfOpenProbeCount) ? Math.max(1, Math.floor(input.breakerHalfOpenProbeCount)) : defaults.breakerHalfOpenProbeCount,
  };
}

function normalizeModelRouteConfigs(
  routes: Partial<Record<ModelUseCase, ModelRouteConfig>> | undefined,
  modelService: ModelServiceConfig,
): Partial<Record<ModelUseCase, ModelRouteConfig>> {
  const normalized: Partial<Record<ModelUseCase, ModelRouteConfig>> = {};
  const inputRoutes = routes || {};
  const governedReportNodes = new Set<ModelUseCase>(GOVERNED_REPORT_QUERY_LLM_NODES);
  for (const definition of MODEL_USE_CASE_REGISTRY) {
    const input = (inputRoutes[definition.useCase] || {}) as Partial<ModelRouteConfig>;
    const shouldMigrateLegacyGovernedRoute = governedReportNodes.has(definition.useCase)
      && definition.defaultEnabled
      && (input.enabled === false || input.routeMode === 'disabled')
      && (!input.updatedAt || Date.parse(input.updatedAt) < MODEL_GOVERNANCE_CUTOVER_MS);
    const routeMode = shouldMigrateLegacyGovernedRoute
      ? 'direct_external'
      : isRouteMode(input.routeMode)
      ? input.routeMode
      : definition.defaultEnabled
        ? 'direct_external'
        : 'disabled';
    normalized[definition.useCase] = {
      useCase: definition.useCase,
      enabled: shouldMigrateLegacyGovernedRoute
        ? true
        : typeof input.enabled === 'boolean' ? input.enabled : definition.defaultEnabled,
      routeMode,
      modelProfileId: input.modelProfileId?.trim() || undefined,
      provider: input.provider?.trim() || modelService.provider,
      modelName: input.modelName?.trim() || undefined,
      resilience: normalizeModelResilienceConfig(input.resilience, definition.useCase),
      gateway: input.gateway ? {
        enabled: Boolean(input.gateway.enabled),
        gatewayId: input.gateway.gatewayId?.trim() || undefined,
        gatewayName: input.gateway.gatewayName?.trim() || undefined,
        policyId: input.gateway.policyId?.trim() || undefined,
        mode: input.gateway.mode,
      } : { enabled: false },
      generationParams: {
        ...DEFAULT_MODEL_GENERATION_PARAMS,
        ...(input.generationParams || {}),
      },
      fallback: {
        ...DEFAULT_MODEL_FALLBACK,
        ...(input.fallback || {}),
      },
      dataPolicy: {
        ...DEFAULT_MODEL_DATA_POLICY,
        ...(input.dataPolicy || {}),
        allowExternalModel: typeof input.dataPolicy?.allowExternalModel === 'boolean'
          ? input.dataPolicy.allowExternalModel
          : routeMode === 'direct_external' && definition.defaultEnabled,
      },
      tracePolicy: {
        ...DEFAULT_MODEL_TRACE_POLICY,
        ...(input.tracePolicy || {}),
      },
      updatedAt: input.updatedAt || modelService.updatedAt,
    };
  }
  return normalized;
}

function normalizeChatStarterItemConfig(
  input: Partial<ChatStarterItemConfig> | undefined,
  index: number,
): ChatStarterItemConfig {
  const fallback = DEFAULT_CHAT_STARTERS[index] || DEFAULT_CHAT_STARTERS[0];
  const fallbackChildren = fallback.children || [];
  return {
    ...fallback,
    ...input,
    id: input?.id?.trim() || fallback.id || `starter-${index + 1}`,
    label: input?.label?.trim() || fallback.label,
    description: input?.description?.trim() || fallback.description,
    prompt: input?.prompt?.trim() || fallback.prompt,
    agent: input?.agent || fallback.agent,
    openPanel: typeof input?.openPanel === 'boolean' ? input.openPanel : fallback.openPanel,
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : fallback.enabled,
    sortOrder: Number.isFinite(Number(input?.sortOrder)) ? Number(input?.sortOrder) : fallback.sortOrder,
    children: (Array.isArray(input?.children) && input.children.length ? input.children : fallbackChildren)
      .map((child, childIndex) => normalizeChatStarterQuestionConfig(child, childIndex, fallbackChildren[childIndex], index))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

function normalizeChatStarterQuestionConfig(
  input: Partial<ChatStarterQuestionConfig> | undefined,
  index: number,
  fallback?: ChatStarterQuestionConfig,
  parentIndex = 0,
): ChatStarterQuestionConfig {
  const parentFallback = DEFAULT_CHAT_STARTERS[parentIndex] || DEFAULT_CHAT_STARTERS[0];
  const nextFallback = fallback || parentFallback.children?.[index] || {
    id: `${parentFallback.id}-question-${index + 1}`,
    label: parentFallback.label,
    prompt: parentFallback.prompt,
    agent: parentFallback.agent,
    openPanel: parentFallback.openPanel,
    enabled: parentFallback.enabled,
    sortOrder: (index + 1) * 10,
  };
  return {
    ...nextFallback,
    ...input,
    id: input?.id?.trim() || nextFallback.id,
    label: input?.label?.trim() || nextFallback.label,
    prompt: input?.prompt?.trim() || nextFallback.prompt,
    agent: input?.agent || nextFallback.agent,
    openPanel: typeof input?.openPanel === 'boolean' ? input.openPanel : nextFallback.openPanel,
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : nextFallback.enabled,
    sortOrder: Number.isFinite(Number(input?.sortOrder)) ? Number(input?.sortOrder) : nextFallback.sortOrder,
  };
}

function normalizeChatDisplayConfig(input?: Partial<ChatDisplayConfig>): ChatDisplayConfig {
  const hasNestedStarters = Array.isArray(input?.starters) && input.starters.some(item => Array.isArray(item.children) && item.children.length);
  const startersInput = hasNestedStarters
    ? input?.starters || DEFAULT_CHAT_STARTERS
    : DEFAULT_CHAT_STARTERS;

  // 欢迎语池归一化：过滤空白项，截断 50 条，支持从 welcomeText 迁移
  const rawWelcomeTexts = Array.isArray(input?.welcomeTexts) ? input.welcomeTexts : [];
  let welcomeTexts = rawWelcomeTexts
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean);
  if (welcomeTexts.length === 0 && input?.welcomeText?.trim()) {
    welcomeTexts = [input.welcomeText.trim()];
  }
  if (welcomeTexts.length === 0) {
    welcomeTexts = [...DEFAULT_CHAT_DISPLAY_CONFIG.welcomeTexts];
  }
  if (welcomeTexts.length > 50) {
    welcomeTexts = welcomeTexts.slice(0, 50);
  }
  const welcomeText = welcomeTexts[0] || DEFAULT_CHAT_DISPLAY_CONFIG.welcomeText;

  return {
    ...DEFAULT_CHAT_DISPLAY_CONFIG,
    ...input,
    welcomeText,
    welcomeTexts,
    quickTitle: input?.quickTitle?.trim() || DEFAULT_CHAT_DISPLAY_CONFIG.quickTitle,
    quickHint: input?.quickHint?.trim() || DEFAULT_CHAT_DISPLAY_CONFIG.quickHint,
    taskPanelTitle: input?.taskPanelTitle?.trim() || DEFAULT_CHAT_DISPLAY_CONFIG.taskPanelTitle,
    starters: startersInput
      .map((item, index) => normalizeChatStarterItemConfig(item, index))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    updatedAt: input?.updatedAt || new Date().toISOString(),
  };
}

async function readRuntimeConfigFile(): Promise<RuntimeConfigFile> {
  for (const configPath of [CONFIG_PATH, LEGACY_CONFIG_PATH]) {
    try {
      const raw = stripJsonBom(await readFile(configPath, 'utf8'));
      const parsed = JSON.parse(raw) as Partial<RuntimeConfigFile>;
      return {
        modelService: normalizeModelServiceConfig(parsed.modelService),
        chatDisplay: normalizeChatDisplayConfig(parsed.chatDisplay),
        publicWeb: normalizePublicWebConfig(parsed.publicWeb),
      };
    } catch {
      try {
        const raw = stripJsonBom(await readFile(configPath, 'utf8'));
        const modelService = readModelServiceFromPartialRuntimeConfig(raw);
        if (modelService) {
          return {
            modelService,
            chatDisplay: normalizeChatDisplayConfig(),
            publicWeb: normalizePublicWebConfig(),
          };
        }
      } catch {
        // try next path
      }
    }
  }
  return {
    modelService: normalizeModelServiceConfig(),
    chatDisplay: normalizeChatDisplayConfig(),
    publicWeb: normalizePublicWebConfig(),
  };
}
async function writeRuntimeConfigFile(file: RuntimeConfigFile): Promise<void> {
  await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(file, null, 2), 'utf8');
}

export async function getModelServiceConfig(): Promise<ModelServiceConfig> {
  const override = runtimeConfigOverrides.getStore()?.modelService;
  if (override) return override;
  const file = await readRuntimeConfigFile();
  return file.modelService;
}

function resolveModelProfile(
  modelService: ModelServiceConfig,
  route?: ModelRouteConfig,
): { profile?: ModelProfileConfig; requestedProfileId?: string; warnings: string[] } {
  const profiles = modelService.modelProfiles || [];
  const isExplicitProfileSelection = Boolean(route?.modelProfileId);
  const requestedProfileId = route?.modelProfileId || modelService.defaultModelProfileId || profiles[0]?.id;
  const warnings: string[] = [];
  let profile = requestedProfileId
    ? profiles.find(item => item.id === requestedProfileId)
    : profiles[0];

  if (requestedProfileId && !profile) {
    warnings.push(`Selected model profile "${requestedProfileId}" is not configured.`);
  }

  // profile 不存在或被禁用时的降级策略
  if (!profile || !profile.enabled) {
    const fallbackProfile = profiles.find(item => item.enabled);
    if (isExplicitProfileSelection && profile && !profile.enabled) {
      // 路由显式选择了被禁用的 profile → 尊重管理员选择，不做降级
      warnings.push(`Model profile "${profile.name}" is disabled; route will not make real model calls.`);
    } else if (fallbackProfile && fallbackProfile.id !== profile?.id) {
      // 默认 profile 被禁用或不存在 → 自动降级到第一个启用的 profile
      warnings.push(
        profile
          ? `Model profile "${profile.name}" is disabled; falling back to "${fallbackProfile.name}".`
          : `Requested model profile "${requestedProfileId}" not found; falling back to "${fallbackProfile.name}".`,
      );
      profile = fallbackProfile;
    } else if (!profile && !fallbackProfile && profiles.length > 0) {
      // 没有任何 profile 被找到，且没有启用的 profile，使用第一个
      profile = profiles[0];
      warnings.push(`No enabled model profile available; using "${profile.name}" (disabled).`);
    } else if (profile && !profile.enabled && !fallbackProfile) {
      // 请求的 profile 被禁用，且没有其他启用的 profile 可用
      warnings.push(`Model profile "${profile.name}" is disabled and no other enabled profile is available. Model calls will be disabled.`);
    }
  }

  return { profile, requestedProfileId, warnings };
}

export function buildEffectiveModelRoute(
  modelService: ModelServiceConfig,
  useCase: ModelUseCase,
): EffectiveModelRoute {
  const definition = getModelUseCaseDefinition(useCase);
  const config = modelService.routes?.[useCase];
  const routeMode = config?.routeMode || (definition?.defaultEnabled ? 'direct_external' : 'disabled');
  const routeEnabled = typeof config?.enabled === 'boolean' ? config.enabled : Boolean(definition?.defaultEnabled);
  const warnings: string[] = [];
  const gateway = config?.gateway || { enabled: false };
  const { profile, requestedProfileId, warnings: profileWarnings } = resolveModelProfile(modelService, config);
  warnings.push(...profileWarnings);
  const provider = profile?.provider || config?.provider || modelService.provider;
  const modelName = config?.modelName || profile?.modelName || modelService.modelName;
  const profileEnabled = Boolean(profile?.enabled ?? true);
  const hasExplicitDataPolicy = Boolean(config?.dataPolicy);
  const effectiveDataPolicy = {
    ...DEFAULT_MODEL_DATA_POLICY,
    ...(config?.dataPolicy || {}),
    allowExternalModel: hasExplicitDataPolicy
      ? (config?.dataPolicy?.allowExternalModel ?? DEFAULT_MODEL_DATA_POLICY.allowExternalModel)
      : true,
  };
  const policyBlockReason = routeMode === 'direct_external' && hasExplicitDataPolicy && effectiveDataPolicy.allowExternalModel === false
    ? 'direct_external_blocked_by_data_policy'
    : routeMode === 'gateway_controlled' && !gateway.enabled
      ? 'gateway_controlled_requires_enabled_gateway'
      : undefined;
  const policyBlocked = Boolean(policyBlockReason);
  const enabled = Boolean(modelService.enabled && routeEnabled && profileEnabled && !policyBlocked && routeMode !== 'disabled' && routeMode !== 'not_applicable');
  const isRealLLMCall = enabled && routeMode !== 'template_only';

  if (routeMode === 'gateway_controlled' && !gateway.enabled) {
    warnings.push('routeMode is gateway_controlled but no model gateway is enabled.');
  }
  if (routeMode === 'direct_external' && hasExplicitDataPolicy && effectiveDataPolicy.allowExternalModel === false) {
    warnings.push('routeMode is direct_external but dataPolicy does not allow external model; real model call is blocked.');
  }
  if (isRealLLMCall && (!profile?.apiKey || !profile.baseUrl || !profile.modelBaseUrl || !modelName)) {
    warnings.push('Real model call requires API key, service URL, model URL, and model name.');
  }
  if (definition?.currentStatus !== 'implemented' && isRealLLMCall) {
    warnings.push('This use case is configured for real model calls but is not implemented at runtime.');
  }

  return {
    useCase,
    enabled,
    routeMode,
    modelProfileId: profile?.id || requestedProfileId,
    modelProfileName: profile?.name,
    provider,
    modelName,
    source: config ? 'runtime_config' : enabled ? 'env_default' : 'disabled',
    gatewayEnabled: Boolean(gateway.enabled),
    gatewayId: gateway.gatewayId,
    gatewayName: gateway.gatewayName,
    policyId: gateway.policyId,
    fallbackUsed: !enabled || routeMode === 'template_only',
    isRealLLMCall,
    policyBlocked,
    policyBlockReason,
    hasModelSpan: isRealLLMCall && Boolean(config?.tracePolicy?.requireModelSpan ?? DEFAULT_MODEL_TRACE_POLICY.requireModelSpan),
    promptIds: definition?.promptIds || [],
    warnings,
    generationParams: {
      ...DEFAULT_MODEL_GENERATION_PARAMS,
      ...(config?.generationParams || {}),
    },
    resilience: normalizeModelResilienceConfig(config?.resilience, useCase),
    fallback: {
      ...DEFAULT_MODEL_FALLBACK,
      ...(config?.fallback || {}),
    },
    dataPolicy: effectiveDataPolicy,
    tracePolicy: {
      ...DEFAULT_MODEL_TRACE_POLICY,
      ...(config?.tracePolicy || {}),
    },
  };
}

export async function getEffectiveModelRoute(useCase: ModelUseCase): Promise<EffectiveModelRoute> {
  const config = await getModelServiceConfig();
  return buildEffectiveModelRoute(config, useCase);
}

export async function listEffectiveModelRoutes(): Promise<EffectiveModelRoute[]> {
  const config = await getModelServiceConfig();
  return MODEL_USE_CASE_REGISTRY.map((definition) => buildEffectiveModelRoute(config, definition.useCase));
}

export async function updateModelServiceConfig(
  patch: Partial<ModelServiceConfig>,
): Promise<ModelServiceConfig> {
  const override = runtimeConfigOverrides.getStore();
  if (override) {
    const next = normalizeModelServiceConfig({
      ...(override.modelService || normalizeModelServiceConfig()),
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    override.modelService = next;
    return next;
  }
  const file = await readRuntimeConfigFile();
  const next = normalizeModelServiceConfig({
    ...file.modelService,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  await writeRuntimeConfigFile({
    ...file,
    modelService: next,
  });
  return next;
}

export async function getChatDisplayConfig(): Promise<ChatDisplayConfig> {
  const file = await readRuntimeConfigFile();
  return file.chatDisplay;
}

export async function getPublicWebConfig(): Promise<PublicWebConfig> {
  const override = runtimeConfigOverrides.getStore()?.publicWeb;
  if (override) return override;
  const file = await readRuntimeConfigFile();
  return file.publicWeb;
}

export async function updatePublicWebConfig(
  patch: Partial<PublicWebConfig>,
): Promise<PublicWebConfig> {
  const override = runtimeConfigOverrides.getStore();
  if (override) {
    const next = normalizePublicWebConfig({
      ...(override.publicWeb || normalizePublicWebConfig()),
      ...patch,
    });
    override.publicWeb = next;
    return next;
  }
  const file = await readRuntimeConfigFile();
  const next = normalizePublicWebConfig({
    ...file.publicWeb,
    ...patch,
  });
  await writeRuntimeConfigFile({
    ...file,
    publicWeb: next,
  });
  return next;
}

export async function updateChatDisplayConfig(
  patch: Partial<ChatDisplayConfig>,
): Promise<ChatDisplayConfig> {
  const file = await readRuntimeConfigFile();
  const next = normalizeChatDisplayConfig({
    ...file.chatDisplay,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  await writeRuntimeConfigFile({
    ...file,
    chatDisplay: next,
  });
  return next;
}

export async function withRuntimeConfigOverrides<T>(
  overrides: {
    modelService?: Partial<ModelServiceConfig>;
    publicWeb?: Partial<PublicWebConfig>;
  },
  run: () => Promise<T>,
): Promise<T> {
  const file = await readRuntimeConfigFile();
  return runtimeConfigOverrides.run({
    modelService: overrides.modelService
      ? normalizeModelServiceConfig({ ...file.modelService, ...overrides.modelService })
      : file.modelService,
    publicWeb: overrides.publicWeb
      ? normalizePublicWebConfig({ ...file.publicWeb, ...overrides.publicWeb })
      : file.publicWeb,
  }, run);
}

function getRouteModelProfile(config: ModelServiceConfig, effectiveRoute?: Pick<EffectiveModelRoute, 'modelProfileId'>): ModelProfileConfig | undefined {
  const profiles = config.modelProfiles || [];
  const profileId = effectiveRoute?.modelProfileId || config.defaultModelProfileId || profiles[0]?.id;
  return profileId ? profiles.find(profile => profile.id === profileId) : profiles[0];
}

export function hasConfiguredModelCredentials(config: ModelServiceConfig, effectiveRoute?: Pick<EffectiveModelRoute, 'modelProfileId' | 'modelName'>): boolean {
  const profile = getRouteModelProfile(config, effectiveRoute);
  return Boolean(
    config.enabled &&
    profile?.enabled &&
    profile.apiKey &&
    profile.baseUrl &&
    profile.modelBaseUrl &&
    (effectiveRoute?.modelName || profile.modelName),
  );
}

export function hasConfiguredKnowledgeCredentials(config: ModelServiceConfig): boolean {
  return Boolean(
    config.enabled &&
    (config.knowledgeBaseApiKey || config.apiKey) &&
    (config.knowledgeBaseUrl || config.baseUrl),
  );
}

export function getKnowledgeBaseApiKey(config: ModelServiceConfig): string {
  return config.knowledgeBaseApiKey || config.apiKey;
}

export function getKnowledgeBaseId(config: ModelServiceConfig): string {
  return config.knowledgeBaseDataset || '';
}

export function getControlledGlossaryKnowledgeBaseId(config: ModelServiceConfig): string {
  return config.controlledGlossaryKnowledgeBaseId || config.knowledgeBaseDataset || '';
}

export function getKnowledgeApiBase(config: ModelServiceConfig): string {
  const rawBase = config.knowledgeBaseUrl || config.baseUrl;
  if (!rawBase) return '';

  const normalizedBase = rawBase.replace(/\/$/, '');
  if (normalizedBase.endsWith('/api/v1')) {
    return normalizedBase;
  }
  if (normalizedBase.endsWith('/api')) {
    return `${normalizedBase}/v1`;
  }
  return `${normalizedBase}/api/v1`;
}

export function getKnowledgeSearchEndpoint(config: ModelServiceConfig): string {
  const apiBase = getKnowledgeApiBase(config);
  return apiBase ? `${apiBase}/knowledge-search` : '';
}

export function getKnowledgeBasesEndpoint(config: ModelServiceConfig): string {
  const apiBase = getKnowledgeApiBase(config);
  return apiBase ? `${apiBase}/knowledge-bases` : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function findArrayCandidate(value: unknown, depth = 0): unknown[] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 3) return undefined;
  const record = asRecord(value);
  const directCandidates = [record.items, record.results, record.list, record.data, record.knowledge_bases];
  const directArray = directCandidates.find(Array.isArray) as unknown[] | undefined;
  if (directArray) return directArray;
  for (const candidate of directCandidates) {
    const nested = findArrayCandidate(candidate, depth + 1);
    if (nested) return nested;
  }
  return undefined;
}

function extractKnowledgeBaseIds(data: unknown): string[] {
  const list = findArrayCandidate(data);
  return (list || [])
    .map(item => {
      const entry = asRecord(item);
      const rawId = entry.id ?? entry.knowledge_base_id ?? entry.dataset_id ?? entry.datasetId ?? entry.knowledge_id;
      return typeof rawId === 'string' ? rawId.trim() : '';
    })
    .filter((item): item is string => Boolean(item));
}

export async function resolveKnowledgeBaseIds(config: ModelServiceConfig): Promise<string[]> {
  const explicitId = getKnowledgeBaseId(config);
  if (explicitId) {
    return [explicitId];
  }

  const endpoint = getKnowledgeBasesEndpoint(config);
  if (!endpoint) {
    return [];
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-API-Key': getKnowledgeBaseApiKey(config),
      },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return [];
    }

    const record = asRecord(data);
    if (record.success === false) {
      return [];
    }

    return extractKnowledgeBaseIds(data);
  } catch {
    return [];
  }
}

export function buildModelSdkConfig(modelService: ModelServiceConfig, effectiveRoute?: Pick<EffectiveModelRoute, 'modelProfileId'>): Config {
  const profile = getRouteModelProfile(modelService, effectiveRoute);
  const config = new Config();
  if (profile?.apiKey) {
    (config as Config & { apiKey: string }).apiKey = profile.apiKey;
  }
  if (profile?.baseUrl) {
    (config as Config & { baseUrl: string }).baseUrl = profile.baseUrl;
  }
  if (profile?.modelBaseUrl) {
    (config as Config & { modelBaseUrl: string }).modelBaseUrl = profile.modelBaseUrl;
  }
  return config;
}

export function buildModelSdkConfigForRoute(
  modelService: ModelServiceConfig,
  effectiveRoute: Pick<EffectiveModelRoute, 'modelProfileId' | 'resilience'>,
): Config {
  const config = buildModelSdkConfig(modelService, effectiveRoute);
  (config as Config & { retryTimes: number }).retryTimes = Math.max(0, Math.floor(effectiveRoute.resilience.maxRetries));
  (config as Config & { retryDelay: number }).retryDelay = 0;
  (config as Config & { timeout: number }).timeout = Math.max(
    effectiveRoute.resilience.connectTimeoutMs,
    effectiveRoute.resilience.responseTimeoutMs,
  );
  return config;
}

export function buildKnowledgeSdkConfig(modelService: ModelServiceConfig): Config {
  const config = new Config();
  const knowledgeBaseUrl = modelService.knowledgeBaseUrl || modelService.baseUrl;
  const knowledgeBaseApiKey = modelService.knowledgeBaseApiKey || modelService.apiKey;
  if (knowledgeBaseApiKey) {
    (config as Config & { apiKey: string }).apiKey = knowledgeBaseApiKey;
  }
  if (knowledgeBaseUrl) {
    (config as Config & { baseUrl: string }).baseUrl = knowledgeBaseUrl;
  }
  if (modelService.modelBaseUrl) {
    (config as Config & { modelBaseUrl: string }).modelBaseUrl = modelService.modelBaseUrl;
  }
  return config;
}
