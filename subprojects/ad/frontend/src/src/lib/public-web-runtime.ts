import { createHash } from 'node:crypto';
import type { AgentProcessEvent, SourceRef } from '@/types';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { getPublicWebConfig, isUnsafePublicWebEndpoint, type PublicWebConfig } from '@/lib/runtime-config';
import type { SourceGroundedAnswer, WebFetchInput, WebSearchInput, WebSourceRef } from '@/contracts/public-web/source-grounding';
import type { AmbiguityAssessment, FactNeed, ProviderEligibility, SearchPlan, SearchPlanQuery } from '@/contracts/request-understanding/fact-need-contract';
import { generateModelText } from '@/lib/model-router';
import { getPromptContent } from '@/lib/prompt-store';
import type { ModelServiceConfig } from '@/lib/runtime-config';
import { resolveChatAnswerMessage } from '@/lib/chat-answer-message-catalog';
import {
  buildSearchPlanForProvider,
  evaluateProviderEligibility,
  getProviderAuthorityProfile,
  inferFactNeed,
  type FactNeedPublicSignals,
} from '@/lib/fact-need-reasoner';
import {
  hasConfiguredPublicSearchProvider,
  hasEnabledSearchAdapterProvider,
  runSearchOrchestrator,
} from '@/lib/search-orchestrator';
import type { SearchEvidenceItem, SearchOrchestratorResult } from '@/lib/search-orchestrator';
import {
  buildPublicSearchRetrievalResult,
  type RetrievalResult,
} from '@/contracts/retrieval/retrieval-layer-contract';

export interface PublicWebNeed {
  required: boolean;
  primaryGoal?: 'fetch_external_public_info';
  capabilityType?: 'web_search' | 'web_fetch' | 'realtime_public_info' | 'public_web_qa' | 'external_doc_lookup';
  realtime?: boolean;
  sourceRequired?: boolean;
  reason?: string;
  reasonCode?: string;
  policy?: 'llm' | 'heuristic';
  confidence?: number;
  factNeed?: FactNeed;
  providerEligibility?: ProviderEligibility;
  searchPlan?: SearchPlan;
  ambiguity?: AmbiguityAssessment[];
  metadata?: Record<string, unknown>;
}

export interface PublicWebNeedContext {
  routeIntent?: string;
  conversationIntent?: string;
  routeReason?: string;
  hasInternalBusinessSignal?: boolean;
}

export interface PublicWebExecutionResult {
  status: 'success' | 'not_configured' | 'blocked' | 'failed';
  answer: string;
  reasonCode: string;
  reasonContext?: {
    topic?: string;
    policy?: 'llm' | 'heuristic';
    confidence?: number;
  };
  sourceRefs: WebSourceRef[];
  processEvents: AgentProcessEvent[];
  need: PublicWebNeed;
  sanitizedQuery?: string;
  warnings: string[];
  evidenceItems?: SearchEvidenceItem[];
  searchTrace?: SearchOrchestratorResult['trace'];
  retrievalResult?: RetrievalResult;
}

interface SearchItem {
  title: string;
  url: string;
  snippet: string;
  siteName?: string;
  publisher?: string;
}

type ProviderErrorKind =
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'http_5xx'
  | 'http_4xx'
  | 'config'
  | 'unsafe_endpoint'
  | 'unknown';

interface ProviderAttemptRecord {
  attempt: number;
  status: 'success' | 'error';
  error_kind?: ProviderErrorKind;
  error?: string;
  duration_ms: number;
}

interface ProviderRetryResult {
  data: unknown;
  attempts: ProviderAttemptRecord[];
}

type SourceQuality = 'official_or_institutional' | 'news_or_current' | 'reference' | 'community' | 'generic';

interface SourcePolicyGateResult {
  items: SearchItem[];
  source_quality_counts: Record<SourceQuality, number>;
  policy_rejected_counts: Record<string, number>;
}

interface RelevanceGateResult {
  items: SearchItem[];
  rejected_count: number;
  min_score: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeText(value: string): string {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(normalizeText(term)));
}

function parseJsonModelOutput(rawText: string): Record<string, unknown> | null {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        // ignore
      }
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // ignore
      }
    }
  }
  return null;
}

function parseBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNeedConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.6;
  return Math.max(0, Math.min(1, value));
}

function normalizeNeedPolicy(value: unknown): 'llm' | 'heuristic' {
  return value === 'heuristic' ? 'heuristic' : 'llm';
}

const PUBLIC_WEB_CLASSIFICATION_TIMEOUT_MS = 1200;

function normalizeRouteIntent(value: string | undefined): string {
  return String(value || '').trim();
}

function hasExplicitPublicUrl(value: string): boolean {
  return /https?:\/\/[^\s"'<>]+/i.test(value);
}

function buildPublicSignalSnapshot(
  normalized: string,
  rules: PublicWebConfig['needRules'],
  context: PublicWebNeedContext = {},
): FactNeedPublicSignals & { explicitPublicUrl: boolean; hasBusinessDataIntent: boolean; routeExcluded: boolean; routeAllowsDefaultLookup: boolean; defaultGeneralLookup: boolean } {
  const hasRealtime = includesAny(normalized, rules.realtimeSignals);
  const hasExternal = includesAny(normalized, rules.externalSignals);
  const explicitPublicUrl = hasExplicitPublicUrl(normalized);
  const explicitSearch = includesAny(normalized, rules.explicitSearchSignals) || explicitPublicUrl;
  const dataIntentDetected = Boolean(context.hasInternalBusinessSignal) && !explicitPublicUrl;
  const strongPublicDetected = includesAny(normalized, rules.strongPublicSignals);
  const routeIntent = normalizeRouteIntent(context.routeIntent || context.conversationIntent);
  const routeExcluded = routeIntent ? rules.excludedRouteIntents.includes(routeIntent) : false;
  const routeAllowsDefaultLookup = !routeIntent || rules.defaultLookupRouteIntents.includes(routeIntent);
  const hasSubstantiveQuestion = normalized.length >= 8;
  const defaultGeneralLookup = Boolean(rules.defaultGeneralLookup && routeAllowsDefaultLookup && !routeExcluded && !dataIntentDetected && hasSubstantiveQuestion);
  return {
    hasRealtime,
    hasExternal,
    explicitSearch,
    explicitPublicUrl,
    hasStrongPublicSignal: strongPublicDetected,
    hasConfigQuestion: includesAny(normalized, rules.configQuestionSignals),
    hasBusinessDataIntent: dataIntentDetected,
    routeExcluded,
    routeAllowsDefaultLookup,
    defaultGeneralLookup,
    defaultGeneralLookupCandidate: defaultGeneralLookup,
  };
}

function withFactEvidencePlan(need: PublicWebNeed, message: string, signals: FactNeedPublicSignals, context: PublicWebNeedContext): PublicWebNeed {
  const factNeed = inferFactNeed({ message, context, publicSignals: signals });
  const providerEligibility = evaluateProviderEligibility(getProviderAuthorityProfile('public_web'), factNeed);
  const searchPlan = buildSearchPlanForProvider(providerEligibility, factNeed, message);
  return {
    ...need,
    factNeed,
    providerEligibility,
    searchPlan,
    ambiguity: factNeed.ambiguity,
  };
}

function buildHeuristicNeed(message: string, rules: PublicWebConfig['needRules'], context: PublicWebNeedContext = {}): PublicWebNeed {
  const normalized = normalizeText(message);
  const publicSnapshot = buildPublicSignalSnapshot(normalized, rules, context);
  const factContext = publicSnapshot.explicitPublicUrl
    ? { ...context, hasInternalBusinessSignal: false }
    : context;
  if (!normalized) {
    return withFactEvidencePlan({
      required: false,
      reason: 'public_web.need_not_detected',
      reasonCode: 'public_web.need_not_detected',
      policy: 'heuristic',
      confidence: 0.95,
    }, message, publicSnapshot, factContext);
  }

  if (publicSnapshot.hasConfigQuestion) {
    return withFactEvidencePlan({
      required: false,
      reason: 'public_web.need_not_detected',
      reasonCode: 'public_web.need_not_detected',
      policy: 'heuristic',
      confidence: 0.92,
    }, message, publicSnapshot, factContext);
  }

  const hasRealtime = publicSnapshot.hasRealtime;
  const hasExternal = publicSnapshot.hasExternal;
  const explicitSearch = publicSnapshot.explicitSearch;
  const dataIntentDetected = publicSnapshot.hasBusinessDataIntent;
  const strongPublicDetected = publicSnapshot.hasStrongPublicSignal;
  const hasPublicSourceEvidence = hasExternal || explicitSearch || strongPublicDetected;
  const routeExcluded = publicSnapshot.routeExcluded;
  const defaultGeneralLookup = publicSnapshot.defaultGeneralLookup;

  if (dataIntentDetected && !explicitSearch && !strongPublicDetected) {
    return withFactEvidencePlan({
      required: false,
      reason: 'public_web.internal_business_data',
      reasonCode: 'public_web.internal_business_data',
      policy: 'heuristic',
      confidence: 0.9,
    }, message, publicSnapshot, { ...context, hasInternalBusinessSignal: true });
  }

  if (!hasPublicSourceEvidence && !defaultGeneralLookup) {
    return withFactEvidencePlan({
      required: false,
      reason: 'public_web.need_not_detected',
      reasonCode: 'public_web.need_not_detected',
      policy: 'heuristic',
      confidence: 0.96,
    }, message, publicSnapshot, factContext);
  }

  if (routeExcluded && !explicitSearch && !strongPublicDetected) {
    return withFactEvidencePlan({
      required: false,
      reason: 'public_web.need_not_detected',
      reasonCode: 'public_web.need_not_detected',
      policy: 'heuristic',
      confidence: 0.9,
    }, message, publicSnapshot, factContext);
  }

  const planned = withFactEvidencePlan({
    required: true,
    primaryGoal: 'fetch_external_public_info',
    capabilityType: hasExternal || explicitSearch ? 'web_search' : defaultGeneralLookup ? 'public_web_qa' : 'realtime_public_info',
    realtime: hasRealtime,
    sourceRequired: hasPublicSourceEvidence || hasRealtime,
    reason: defaultGeneralLookup && !hasPublicSourceEvidence ? 'public_web.default_general_lookup' : 'public_web.need_detected',
    reasonCode: defaultGeneralLookup && !hasPublicSourceEvidence ? 'public_web.default_general_lookup' : 'public_web.need_detected',
    policy: 'heuristic',
    confidence: defaultGeneralLookup && !hasPublicSourceEvidence ? 0.72 : 0.9,
    metadata: {
      explicit_public_url: publicSnapshot.explicitPublicUrl,
    },
  }, message, publicSnapshot, factContext);

  if (!planned.searchPlan?.allowed) {
    return {
      ...planned,
      required: false,
      primaryGoal: undefined,
      sourceRequired: false,
      reason: planned.reason === 'public_web.default_general_lookup'
        ? 'public_web.need_not_detected'
        : 'public_web.provider_ineligible',
      reasonCode: planned.reason === 'public_web.default_general_lookup'
        ? 'public_web.need_not_detected'
        : 'public_web.provider_ineligible',
      confidence: Math.max(0.82, planned.confidence || 0),
    };
  }

  return planned;
}

function applyDefaultLookupEvidencePolicy(need: PublicWebNeed, heuristic: PublicWebNeed): PublicWebNeed {
  const evidencePlan = {
    factNeed: need.factNeed || heuristic.factNeed,
    providerEligibility: need.providerEligibility || heuristic.providerEligibility,
    searchPlan: need.searchPlan || heuristic.searchPlan,
    ambiguity: need.ambiguity || heuristic.ambiguity,
  };
  if (heuristic.required && heuristic.reasonCode === 'public_web.default_general_lookup') {
    return {
      ...need,
      ...evidencePlan,
      sourceRequired: false,
      capabilityType: need.capabilityType || 'public_web_qa',
      reasonCode: need.reasonCode || heuristic.reasonCode,
      reason: need.reason || heuristic.reason,
    };
  }
  return { ...need, ...evidencePlan };
}

function shouldConsultPublicWebNeedModel(heuristic: PublicWebNeed, context: PublicWebNeedContext): boolean {
  const routeIntent = normalizeRouteIntent(context.routeIntent);
  const modelConsultRules: Array<[boolean, boolean]> = [
    [!heuristic.required, false],
    [heuristic.reasonCode === 'public_web.internal_business_data', false],
    [heuristic.reasonCode === 'public_web.default_general_lookup', true],
    [(heuristic.confidence || 0) < 0.8, true],
    [Boolean(heuristic.ambiguity?.length), true],
    [!heuristic.searchPlan?.allowed, true],
    [heuristic.sourceRequired === true && heuristic.metadata?.explicit_public_url === true, false],
    [Boolean(routeIntent && routeIntent !== 'general'), true],
  ];
  return modelConsultRules.find(([matched]) => matched)?.[1] ?? false;
}

export async function classifyPublicWebNeedByModel(
  message: string,
  context: PublicWebNeedContext = {},
  modelServiceConfig?: ModelServiceConfig,
): Promise<PublicWebNeed | null> {
  const normalized = normalizeText(message);
  if (!normalized) return null;

  // P0 治理：从 prompt store 读取 managed prompt，失败时 fallback 到原始内置文案
  const PUBLIC_WEB_NEED_BUILTIN_PROMPT = [
    '你是意图判定模型。判断用户问题是否需要联网检索公开信息。',
    '只输出严格 JSON，不要输出代码块。',
    '字段：required(boolean), reason(string), reasonCode(string), capabilityType(string),',
    'primaryGoal(string), sourceRequired(boolean), confidence(0到1), policy(string: llm)',
  ].join('\n');
  const managedPrompt = await getPromptContent('public_web.need_classifier', '').catch(() => '');
  const prompt = managedPrompt || PUBLIC_WEB_NEED_BUILTIN_PROMPT;

  const defaultClassificationJson = JSON.stringify({
    required: false,
    reason: 'public_web.classification_fallback',
    reasonCode: 'public_web.classification_fallback',
    primaryGoal: 'fetch_external_public_info',
    capabilityType: 'realtime_public_info',
    sourceRequired: true,
    confidence: 0.2,
    policy: 'heuristic',
  });

  const timeout = new Promise<string>(
    (resolve) => setTimeout(() => resolve(defaultClassificationJson), PUBLIC_WEB_CLASSIFICATION_TIMEOUT_MS),
  );
  const resultText = await Promise.race([
    generateModelText({
      useCase: 'chat_answer',
      input: {
        message,
        context,
      },
      fallback: defaultClassificationJson,
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: [
            `问题：${message}`,
            `上下文：${normalizeString(context.routeIntent)}|${normalizeString(context.conversationIntent)}|${normalizeString(context.routeReason)}`,
          ].join('\n'),
        },
      ],
      modelServiceConfig,
    }).then((item) => item.text),
    timeout,
  ]);

  const parsed = parseJsonModelOutput(resultText);
  if (!parsed) return null;
  const required = parseBoolean(parsed.required);
  if (required === undefined) return null;
  const confidence = normalizeNeedConfidence(parsed.confidence);
  const reasonCode = normalizeString(parsed.reasonCode);

  return {
    required,
    primaryGoal: normalizeString(parsed.primaryGoal) ? 'fetch_external_public_info' : 'fetch_external_public_info',
    capabilityType: normalizeString(parsed.capabilityType) as PublicWebNeed['capabilityType'],
    realtime: Boolean(parsed.realtime),
    sourceRequired: parseBoolean(parsed.sourceRequired) ?? true,
    reason: normalizeString(parsed.reason),
    reasonCode: reasonCode || (required ? 'public_web.need_detected' : 'public_web.need_not_detected'),
    policy: normalizeNeedPolicy(parsed.policy),
    confidence: confidence,
  };
}

export async function detectPublicWebNeed(
  message: string,
  options: { modelServiceConfig?: ModelServiceConfig; context?: PublicWebNeedContext } = {},
): Promise<PublicWebNeed> {
  const context = options.context || {};
  const publicWebConfig = await getPublicWebConfig();
  const heuristic = buildHeuristicNeed(message, publicWebConfig.needRules, context);
  if (!options.modelServiceConfig) return heuristic;
  if (!shouldConsultPublicWebNeedModel(heuristic, context)) return heuristic;

  const modelNeed = await classifyPublicWebNeedByModel(message, context, options.modelServiceConfig);
  if (!modelNeed) return heuristic;
  if (heuristic.reasonCode === 'public_web.internal_business_data') return heuristic;

  const modelConfidence = modelNeed.confidence ?? 0;
  if (heuristic.required && !modelNeed.required) {
    if (heuristic.reasonCode === 'public_web.default_general_lookup' && modelConfidence >= 0.6) {
      return {
        ...modelNeed,
        factNeed: heuristic.factNeed,
        providerEligibility: heuristic.providerEligibility,
        searchPlan: heuristic.searchPlan,
        ambiguity: heuristic.ambiguity,
        required: false,
        sourceRequired: false,
        capabilityType: modelNeed.capabilityType || 'public_web_qa',
        reason: modelNeed.reason || 'LLM planner judged public web lookup unnecessary for this turn.',
        reasonCode: modelNeed.reasonCode || 'public_web.need_not_detected',
        policy: 'llm',
        confidence: modelConfidence,
      };
    }
    return {
      ...heuristic,
      reason: modelNeed.reason || heuristic.reason,
      reasonCode: heuristic.reasonCode,
      policy: 'llm',
      confidence: Math.max(heuristic.confidence || 0, modelConfidence),
    };
  }
  if (modelNeed.required && modelConfidence >= 0.6 && !heuristic.required && heuristic.searchPlan?.allowed) {
    return {
      ...modelNeed,
      factNeed: heuristic.factNeed,
      providerEligibility: heuristic.providerEligibility,
      searchPlan: heuristic.searchPlan,
      ambiguity: heuristic.ambiguity,
    };
  }
  if (modelConfidence >= 0.6 && modelNeed.required === heuristic.required) {
    return applyDefaultLookupEvidencePolicy(modelNeed, heuristic);
  }
  if (modelNeed.required === heuristic.required) return applyDefaultLookupEvidencePolicy(modelNeed, heuristic);

  return applyDefaultLookupEvidencePolicy({
    ...heuristic,
    required: heuristic.required,
    reason: modelNeed.reason || heuristic.reason,
    reasonCode: modelNeed.reasonCode || heuristic.reasonCode,
    policy: 'llm',
    confidence: Math.max(modelConfidence, heuristic.confidence || 0),
  }, heuristic);
}

function readPath(value: unknown, path: string): unknown {
  if (!path) return value;
  return path.split('.').filter(Boolean).reduce((current, key) => {
    if (Array.isArray(current)) return current[Number(key)];
    if (isRecord(current)) return current[key];
    return undefined;
  }, value);
}

function findArrayCandidate(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  const candidates = [
    value.results,
    value.items,
    value.data,
    value.list,
    value.value,
    value.webPages,
    value.organic_results,
    value.organicResults,
    value.organic,
    value.news,
    value.sources,
    value.citations,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      const nested = findArrayCandidate(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
}

function asSearchItems(data: unknown, config: PublicWebConfig): SearchItem[] {
  const rawItems = config.resultsPath ? readPath(data, config.resultsPath) : findArrayCandidate(data);
  const list = Array.isArray(rawItems) ? rawItems : findArrayCandidate(rawItems);
  return list
    .map((item): SearchItem | null => {
      if (!isRecord(item)) return null;
      const source = isRecord(item.source) ? item.source : {};
      const metadata = isRecord(item.metadata) ? item.metadata : {};
      const title = String(readPath(item, config.titlePath) || item.name || item.title || item.headline || source.name || '').trim();
      const url = String(readPath(item, config.urlPath) || item.link || item.url || item.href || item.displayUrl || item.contentUrl || source.url || metadata.url || '').trim();
      const snippet = String(readPath(item, config.snippetPath) || item.description || item.snippet || item.content || item.summary || item.text || metadata.snippet || '').trim();
      const siteName = String(readPath(item, config.siteNamePath) || item.siteName || item.site || item.sourceName || source.siteName || source.name || '').trim();
      const publisher = String(readPath(item, config.publisherPath) || item.publisher || metadata.publisher || '').trim();
      if (!title || !url) return null;
      return { title, url, snippet, siteName, publisher };
    })
    .filter((item): item is SearchItem => Boolean(item));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isSyntheticPublicWebHost(host: string): boolean {
  const normalizedHost = host.trim().toLowerCase();
  if (!normalizedHost) return false;
  return normalizedHost === 'example.test'
    || normalizedHost.endsWith('.example.test')
    || normalizedHost === 'localhost'
    || normalizedHost === '127.0.0.1'
    || normalizedHost === '0.0.0.0';
}

function isSyntheticSearchResult(item: SearchItem): boolean {
  const host = hostOf(item.url);
  return isSyntheticPublicWebHost(host) || isUnsafePublicWebEndpoint(item.url);
}

function domainListMatches(host: string, domains: string[]): boolean {
  return Boolean(domains.find(domain => host === domain || host.endsWith(`.${domain}`)));
}

function filterDomains(items: SearchItem[], config: PublicWebConfig): SearchItem[] {
  return items.filter((item) => {
    const host = hostOf(item.url);
    const blocked = domainListMatches(host, config.blockedDomains);
    const allowed = config.allowedDomains.length === 0
      || domainListMatches(host, config.allowedDomains);
    return !isSyntheticSearchResult(item) && Boolean(host) && !blocked && allowed;
  });
}

function buildHeaders(config: PublicWebConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...config.headers,
    ...(config.authType === 'bearer' && config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    ...(config.authType === 'api_key_header' && config.apiKey ? { [config.apiKeyHeader || 'X-API-Key']: config.apiKey } : {}),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function classifyProviderError(error: unknown): ProviderErrorKind {
  const message = error instanceof Error ? error.message : String(error || '');
  const matched = [
    [/unsafe_public_web_endpoint/i, 'unsafe_endpoint'],
    [/search_endpoint_missing|fetch_endpoint_missing/i, 'config'],
    [/provider_http_429/i, 'rate_limited'],
    [/provider_http_5\d\d/i, 'http_5xx'],
    [/provider_http_4\d\d/i, 'http_4xx'],
    [/abort|aborted|timeout|timed out/i, 'timeout'],
    [/fetch failed|network|econnreset|enotfound|etimedout|socket|connection/i, 'network'],
  ].find(([pattern]) => (pattern as RegExp).test(message));
  return (matched?.[1] as ProviderErrorKind | undefined) || 'unknown';
}

function isRetryableProviderError(kind: ProviderErrorKind): boolean {
  return kind === 'timeout' || kind === 'network' || kind === 'rate_limited' || kind === 'http_5xx' || kind === 'unknown';
}

function providerRetryAttemptsForNeed(need: PublicWebNeed): number {
  const depth = need.searchPlan?.depth;
  const policy = need.searchPlan?.source_policy;
  const matched = [
    [depth === 'deep' || policy === 'multi_source_consensus', 3],
    [depth === 'standard' || policy === 'fresh_news' || policy === 'official_first', 2],
  ].find(([condition]) => condition);
  return Number(matched?.[1] || 1);
}

async function callSearchProviderWithRetry(
  input: WebSearchInput,
  config: PublicWebConfig,
  maxAttempts: number,
): Promise<ProviderRetryResult> {
  const attempts: ProviderAttemptRecord[] = [];
  let lastError: unknown;
  const boundedMaxAttempts = Math.max(1, Math.min(3, maxAttempts));

  for (let attempt = 1; attempt <= boundedMaxAttempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const data = await callSearchProvider(input, config);
      attempts.push({
        attempt,
        status: 'success',
        duration_ms: Date.now() - startedAt,
      });
      return { data, attempts };
    } catch (error) {
      lastError = error;
      const errorKind = classifyProviderError(error);
      attempts.push({
        attempt,
        status: 'error',
        error_kind: errorKind,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startedAt,
      });
      if (attempt >= boundedMaxAttempts || !isRetryableProviderError(errorKind)) break;
      await sleep(Math.min(1200, 250 * attempt));
    }
  }

  throw Object.assign(lastError instanceof Error ? lastError : new Error(String(lastError)), {
    providerAttempts: attempts,
  });
}

export async function callSearchProvider(input: WebSearchInput, config: PublicWebConfig): Promise<unknown> {
  const endpoint = config.searchEndpoint;
  if (!endpoint) throw new Error('search_endpoint_missing');
  if (isUnsafePublicWebEndpoint(endpoint)) throw new Error('unsafe_public_web_endpoint');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    if (config.method === 'POST') {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify(input),
        cache: 'no-store',
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = isRecord(data) ? String(data.error || data.message || '') : '';
        throw new Error(`provider_http_${response.status}${detail ? `:${detail}` : ''}`);
      }
      return data;
    }

    const url = new URL(endpoint);
    url.searchParams.set(config.queryParam || 'q', input.query);
    url.searchParams.set('maxResults', String(input.maxResults || config.maxResults));
    if (input.locale) url.searchParams.set('locale', input.locale);
    if (input.freshness) url.searchParams.set('freshness', input.freshness);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(config),
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = isRecord(data) ? String(data.error || data.message || '') : '';
      throw new Error(`provider_http_${response.status}${detail ? `:${detail}` : ''}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function callFetchProvider(input: WebFetchInput, config: PublicWebConfig): Promise<unknown> {
  const endpoint = config.fetchEndpoint;
  if (!endpoint) throw new Error('fetch_endpoint_missing');
  if (isUnsafePublicWebEndpoint(endpoint)) throw new Error('unsafe_public_web_endpoint');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs || config.timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(config),
      body: JSON.stringify(input),
      cache: 'no-store',
      signal: controller.signal,
    });
    return await response.json().catch(() => ({}));
  } finally {
    clearTimeout(timer);
  }
}

function sourceIdFor(url: string, index: number): string {
  return `web-${index + 1}-${createHash('sha1').update(url).digest('hex').slice(0, 8)}`;
}

function buildSourceRefs(items: SearchItem[]): WebSourceRef[] {
  const retrievedAt = new Date().toISOString();
  return items.map((item, index) => ({
    id: sourceIdFor(item.url, index),
    sourceId: sourceIdFor(item.url, index),
    title: item.title,
    source: item.siteName || hostOf(item.url) || 'public web',
    url: item.url,
    source_type: 'web_search',
    icon: 'web_search',
    snippet: item.snippet,
    siteName: item.siteName || hostOf(item.url),
    publisher: item.publisher,
    retrievedAt,
    fetchedAt: retrievedAt,
    contentHash: createHash('sha1').update(`${item.title}\n${item.url}\n${item.snippet}`).digest('hex'),
    freshness: 'realtime',
    confidence: 0.7,
  }));
}

function cjkBigrams(text: string): string[] {
  const normalized = String(text || '').replace(/[^\p{Script=Han}]+/gu, '');
  const tokens = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    tokens.add(normalized.slice(index, index + 2).toLowerCase());
  }
  return Array.from(tokens);
}

function relevanceTokens(text: string): string[] {
  const normalized = String(text || '')
    .replace(/https?:\/\/[^\s"'<>]+/gi, ' ')
    .replace(/(怎么样|如何|怎么|怎样|请问|麻烦|帮我|是否|是不是|有没有|多少|什么|你好|您好|现在|可以|能够|帮忙|帮助|做什么|吗|呢|啊|呀|在哪|哪里)/g, ' ')
    .toLowerCase();
  const asciiWords = normalized.match(/[a-z0-9][a-z0-9-]{1,}/g) || [];
  const stopTokens = new Set([
    'http',
    'https',
    'www',
    'com',
    'cn',
    'org',
    'net',
    'html',
    'htm',
    'docs',
    'doc',
    'label',
    'labels',
    'page',
    'reference',
    'hello',
  ]);
  const output: string[] = [];
  for (const token of new Set([...cjkBigrams(text), ...asciiWords])) {
    token.length >= 2 && !stopTokens.has(token) && output.push(token);
  }
  return output;
}

function sourceRelevanceScore(query: string, item: SearchItem): number {
  const queryTokens = relevanceTokens(query);
  if (!queryTokens.length) return 0;
  const haystack = `${item.title}\n${item.snippet}\n${item.siteName || ''}`.toLowerCase();
  const matched = queryTokens.filter(token => haystack.includes(token)).length;
  return matched / queryTokens.length;
}

function filterRelevantSearchItems(query: string, items: SearchItem[], minScore = 0.12): SearchItem[] {
  if (!items.length) return [];
  return items
    .map(item => ({ item, score: sourceRelevanceScore(query, item) }))
    .filter(entry => entry.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .map(entry => entry.item);
}

function applyRelevanceGate(query: string, items: SearchItem[], minScore = 0.12): RelevanceGateResult {
  const filtered = filterRelevantSearchItems(query, items, minScore);
  return {
    items: filtered,
    rejected_count: Math.max(0, items.length - filtered.length),
    min_score: minScore,
  };
}

function hasFreshnessSignal(item: SearchItem): boolean {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const text = `${item.title}\n${item.snippet}\n${item.siteName || ''}`.toLowerCase();
  return /刚刚|今天|今日|昨天|分钟前|小时前|天前|周前|月前|\b\d+\s*(minutes?|hours?|days?|weeks?|months?)\s+ago\b/i.test(text)
    || text.includes(`${currentYear}年`)
    || text.includes(`${previousYear}年`)
    || new RegExp(`\\b(?:${currentYear}|${previousYear})[-/]`).test(text)
    || new RegExp(`\\b(?:${currentYear}|${previousYear})\\b`).test(text);
}

function classifySourceQuality(item: SearchItem): SourceQuality {
  const host = hostOf(item.url);
  const text = `${item.title}\n${item.snippet}\n${item.siteName || ''}\n${host}`.toLowerCase();
  const matched = [
    [/\.(gov|edu|mil)(\.[a-z]{2})?$/.test(host) || /\.(int)$/.test(host) || /官方|公报|公告|press release|official|government|agency|ministry|commission|court|parliament|university|institution/i.test(text), 'official_or_institutional'],
    [/百科|wiki|dictionary|词典|reference|encyclopedia|baike/i.test(text), 'reference'],
    [/论坛|社区|问答|知乎|贴吧|reddit|quora|forum|community|answers/i.test(text), 'community'],
    [/news|times|post|daily|journal|press|wire|agency|观察|新闻|日报|时报|通讯社|电视台|广播|media/i.test(text), 'news_or_current'],
  ].find(([condition]) => condition);
  return (matched?.[1] as SourceQuality | undefined) || 'generic';
}

function incrementCounter<T extends string>(record: Record<T, number>, key: T): void {
  record[key] = (record[key] || 0) + 1;
}

function filterBySourcePolicy(items: SearchItem[], need: PublicWebNeed): SourcePolicyGateResult {
  const source_quality_counts: Record<SourceQuality, number> = {
    official_or_institutional: 0,
    news_or_current: 0,
    reference: 0,
    community: 0,
    generic: 0,
  };
  const policy_rejected_counts: Record<string, number> = {};
  const requiresFreshSources = need.searchPlan?.source_policy === 'fresh_news'
    || (
      need.searchPlan?.source_policy === 'multi_source_consensus'
      && (need.factNeed?.freshness_need === 'live' || need.factNeed?.freshness_need === 'today' || need.factNeed?.freshness_need === 'recent')
    );
  const requiresConsensusQuality = need.searchPlan?.source_policy === 'multi_source_consensus'
    || need.searchPlan?.source_policy === 'official_first'
    || need.searchPlan?.source_policy === 'fresh_news';
  const rejectsWeakReferenceSources = requiresConsensusQuality
    || need.sourceRequired === true
    || need.reasonCode === 'public_web.default_general_lookup'
    || need.capabilityType === 'public_web_qa';
  const filtered: SearchItem[] = [];

  for (const item of items) {
    const quality = classifySourceQuality(item);
    incrementCounter(source_quality_counts, quality);
    if (requiresFreshSources && !hasFreshnessSignal(item) && quality !== 'official_or_institutional') {
      incrementCounter(policy_rejected_counts, 'missing_freshness_signal');
      continue;
    }
    if (rejectsWeakReferenceSources && (quality === 'reference' || quality === 'community')) {
      incrementCounter(policy_rejected_counts, `weak_source_quality:${quality}`);
      continue;
    }
    filtered.push(item);
  }

  return {
    items: filtered,
    source_quality_counts,
    policy_rejected_counts,
  };
}

function relevanceThresholdForNeed(need: PublicWebNeed): number {
  const defaultLookupStableReference = need.reasonCode === 'public_web.default_general_lookup'
    && (!need.searchPlan || need.searchPlan.source_policy === 'stable_reference');
  const matched = [
    [need.sourceRequired === true, 0.28],
    [defaultLookupStableReference, 0.35],
  ].find(([condition]) => condition);
  return Number(matched?.[1] || 0.12);
}

function requiredPublicSourceCount(need: PublicWebNeed, queryCount: number): number {
  return need.searchPlan?.source_policy === 'multi_source_consensus'
    || (queryCount > 1 && need.factNeed?.authority_need === 'expert_synthesis')
    ? 2
    : 1;
}

function composeGroundedAnswer(query: string, sourceRefs: WebSourceRef[]): SourceGroundedAnswer {
  const retrievedAt = new Date().toISOString();
  const first = sourceRefs[0];
  const snippets = sourceRefs
    .slice(0, 3)
    .map((source) => formatPublicInfoSnippet(source.snippet || source.title))
    .filter(Boolean)
    .map((text) => text.replace(/^\s*[-*]\s+/, '').trim());
  const answer = snippets.length <= 1
    ? snippets[0] || first?.title || ''
    : snippets.map((text) => `- ${text}`).join('\n');

  return {
    answer: first ? answer : '',
    sourceRefs,
    retrievedAt,
    sourceRequired: true,
    freshness: 'realtime',
    confidence: sourceRefs.length ? 0.7 : 0,
  };
}

function formatPublicInfoSnippet(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/。 +/g, '。\n  - ')
    .replace(/；\s*/g, '；\n  - ')
    .trim();
}

function uniqueRuntimeSearchQueries(queries: SearchPlanQuery[]): SearchPlanQuery[] {
  const seen = new Set<string>();
  const output: SearchPlanQuery[] = [];
  for (const item of queries) {
    const query = String(item.query || '').replace(/\s+/g, ' ').trim();
    if (!query) continue;
    const key = query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ query, purpose: item.purpose || 'primary' });
  }
  return output;
}

function stripSearchInstructionShell(query: string): string {
  const stripped = String(query || '')
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '')
    .replace(/^(请|帮我|帮忙|麻烦)?\s*(联网|公开|外部|网上)?\s*(查一下|查找|查询|检索|搜索|查)\s*/i, '')
    .replace(/[，,；;]\s*(如果|若|不要|请勿|请不要|比较|对比|同时|并且)[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || query.trim();
}

function expandRuntimeSearchQueries(queries: SearchPlanQuery[]): SearchPlanQuery[] {
  const expanded: SearchPlanQuery[] = [];
  for (const item of queries) {
    expanded.push(item);
    const stripped = stripSearchInstructionShell(item.query);
    if (stripped && stripped.toLowerCase() !== item.query.toLowerCase()) {
      expanded.push({ query: stripped, purpose: item.purpose || 'verification' });
    }
  }
  return uniqueRuntimeSearchQueries(expanded);
}

function parseModelSearchQueries(rawText: string): SearchPlanQuery[] {
  const parsed = parseJsonModelOutput(rawText);
  const rawQueries = isRecord(parsed) && Array.isArray(parsed.queries) ? parsed.queries : [];
  return rawQueries
    .filter(isRecord)
    .map((item): SearchPlanQuery | null => {
      const query = String(item.query || '').trim();
      if (!query) return null;
      const rawPurpose = item.purpose;
      const purpose: SearchPlanQuery['purpose'] = rawPurpose === 'verification' || rawPurpose === 'background'
        ? rawPurpose
        : 'verification';
      return { query, purpose };
    })
    .filter((item): item is SearchPlanQuery => Boolean(item));
}

async function buildModelSearchQueryCandidates(message: string, need: PublicWebNeed): Promise<SearchPlanQuery[]> {
  const rewriteEnabled = process.env.XIAOQIAO_PUBLIC_WEB_QUERY_REWRITE_MODEL === 'true'
    || (process.env.XIAOQIAO_PUBLIC_WEB_QUERY_REWRITE_MODEL !== 'false' && process.env.NODE_ENV !== 'test');
  if (!rewriteEnabled) return [];
  const plan = need.searchPlan;
  if (!plan?.allowed || plan.redaction_policy === 'block') return [];
  // Allow LLM query rewrite for any search depth and source policy as long as search is allowed
  if (plan.depth === 'none') return [];

  const defaultQueryJson = JSON.stringify({ queries: [] });
  const timeout = new Promise<string>(
    (resolve) => setTimeout(() => resolve(defaultQueryJson), 5000),
  );
  // P0 治理：从 prompt store 读取 managed prompt，失败时 fallback 到原始内置文案
  const PUBLIC_WEB_QUERY_REWRITE_BUILTIN_PROMPT = [
    '你是公开联网检索的 Query Rewriter，只负责生成检索词，不回答事实。',
    '只输出严格 JSON：{"queries":[{"query":"string","purpose":"verification|background"}]}。',
    '要求：保留用户问题中的主体、时间意图和权威/多源要求；不要添加用户没有提供的私有上下文、账号、项目、token 或内部数据。',
    '如果问题是非英文且公共国际来源可能更充分，可以额外给出一条英文检索词；最多 3 条。',
  ].join('\n');
  const managedRewritePrompt = await getPromptContent('public_web.query_rewriter', '').catch(() => '');
  const prompt = managedRewritePrompt || PUBLIC_WEB_QUERY_REWRITE_BUILTIN_PROMPT;

  const resultText = await Promise.race([
    generateModelText({
      useCase: 'chat_answer',
      fallback: defaultQueryJson,
      input: {
        message,
        factNeed: need.factNeed,
        searchPlan: need.searchPlan,
      },
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: JSON.stringify({
            question: message,
            fact_need: need.factNeed,
            search_policy: need.searchPlan?.source_policy,
            query_strategy: need.searchPlan?.query_strategy,
            depth: need.searchPlan?.depth,
          }),
        },
      ],
    }).then((item) => item.text),
    timeout,
  ]);

  return uniqueRuntimeSearchQueries(parseModelSearchQueries(resultText)).slice(0, 3);
}

export async function executePublicWebQuery(message: string, need: PublicWebNeed): Promise<PublicWebExecutionResult> {
  const config = await getPublicWebConfig();
  const processEvents: AgentProcessEvent[] = [];
  const warnings: string[] = [];
  const topic = message.replace(/[?！？!]/g, '').trim();
  const reasonContext = {
    topic,
    policy: need.policy || 'heuristic',
    confidence: need.confidence,
  };

  const reasonCode = need.reasonCode || (need.required ? 'public_web.need_detected' : 'public_web.need_not_detected');
  if (!need.required) {
    return {
      status: 'not_configured',
      reasonCode,
      reasonContext,
      answer: resolveChatAnswerMessage(reasonCode, reasonContext),
      sourceRefs: [],
      processEvents,
      need,
      warnings,
    };
  }

  const hasConfiguredSearchProvider = hasConfiguredPublicSearchProvider(config, need);
  if (!config.enabled || !hasConfiguredSearchProvider) {
    const answer = resolveChatAnswerMessage('public_web.not_configured', reasonContext);
    processEvents.push(createProcessEvent({
      type: 'web.search',
      label: '检查联网查询能力',
      summary: '当前没有取得可验证的公开实时来源结果。',
      status: 'error',
      visibility: 'internal',
      output: {
        capability_status: 'not_configured',
        provider_unavailable_reason: !config.enabled ? 'public_web_disabled' : 'no_configured_search_provider',
        sourceRequired: true,
        fact_need: need.factNeed,
        provider_eligibility: need.providerEligibility,
        search_plan: need.searchPlan,
      },
    }));
    return {
      status: 'not_configured',
      reasonCode: 'public_web.not_configured',
      reasonContext,
      answer,
      sourceRefs: [],
      processEvents,
      need,
      warnings,
    };
  }

  if (need.searchPlan && (!need.searchPlan.allowed || need.searchPlan.redaction_policy === 'block')) {
    warnings.push('公开联网 Provider 对当前事实需求不具备主答资格。');
    const answer = resolveChatAnswerMessage('public_web.internal_data_blocked', reasonContext);
    processEvents.push(createProcessEvent({
      type: 'web.search',
      label: '联网检索前置校验',
      summary: '当前事实需求不允许发送到公开联网检索。已阻止外部查询。',
      status: 'rejected',
      visibility: 'internal',
      output: {
        reason: 'public_web.provider_ineligible',
        fact_need: need.factNeed,
        provider_eligibility: need.providerEligibility,
        search_plan: need.searchPlan,
        warnings,
      },
    }));
    return {
      status: 'blocked',
      reasonCode: 'public_web.internal_data_blocked',
      reasonContext,
      answer,
      sourceRefs: [],
      processEvents,
      need,
      sanitizedQuery: '',
      warnings,
    };
  }

  const hasLegacySearchEndpoint = Boolean(config.searchEndpoint && !isUnsafePublicWebEndpoint(config.searchEndpoint));
  while (!hasLegacySearchEndpoint && (config.orchestrator?.enabled ?? true) && hasEnabledSearchAdapterProvider(config, need)) {
    const orchestrated = await runSearchOrchestrator(message, need);
    const orchestratorWarnings = [...warnings, ...orchestrated.warnings];
    const retrievalResult = buildPublicSearchRetrievalResult({
      sourceRefs: orchestrated.sourceRefs,
      evidenceItems: orchestrated.evidenceItems,
      providerTrace: orchestrated.providerCalls.map((call, index) => ({
        id: `public-search-call-${index + 1}`,
        name: call.provider_id,
        kind: 'public_web',
        status: call.status,
        duration_ms: call.duration_ms,
        input_summary: call.query || call.url,
        output_summary: call.error || `${call.result_count || 0} results`,
        source_ref_ids: [],
      })),
      warnings: orchestratorWarnings,
      metadata: {
        answer_origin: orchestrated.trace.answer_origin,
        search_plan: orchestrated.trace.search_plan,
      },
    });
    if (orchestrated.status === 'success') {
      return {
        status: 'success',
        reasonCode,
        reasonContext,
        answer: orchestrated.answer,
        sourceRefs: orchestrated.sourceRefs,
        processEvents: orchestrated.processEvents,
        need,
        sanitizedQuery: orchestrated.sanitizedQuery,
        warnings: orchestratorWarnings,
        evidenceItems: orchestrated.evidenceItems,
        searchTrace: orchestrated.trace,
        retrievalResult,
      };
    }
    const failedReasonCode = orchestrated.status === 'not_configured'
      ? 'public_web.not_configured'
      : 'public_web.no_results';
    return {
      status: orchestrated.status === 'not_configured' ? 'not_configured' : 'failed',
      reasonCode: failedReasonCode,
      reasonContext,
      answer: resolveChatAnswerMessage(failedReasonCode, reasonContext),
      sourceRefs: orchestrated.sourceRefs,
      processEvents: orchestrated.processEvents,
      need,
      sanitizedQuery: orchestrated.sanitizedQuery,
      warnings: orchestratorWarnings,
      evidenceItems: orchestrated.evidenceItems,
      searchTrace: orchestrated.trace,
      retrievalResult,
    };
  }

  const plannedQueries = expandRuntimeSearchQueries(uniqueRuntimeSearchQueries(
    need.searchPlan?.queries?.length ? need.searchPlan.queries : [{ query: message, purpose: 'primary' }],
  ));
  const modelQueries = await buildModelSearchQueryCandidates(message, need).catch((error) => {
    warnings.push(`query_rewrite_failed:${error instanceof Error ? error.message : String(error)}`);
    return [];
  });
  const searchQueries = uniqueRuntimeSearchQueries([...plannedQueries, ...modelQueries]).slice(0, 6);
  let firstQuery = '';
  let lastFailureReasonCode = 'public_web.no_results';
  let lastFailureMessage = '';
  const requiredSourceCount = requiredPublicSourceCount(need, searchQueries.length);

  for (const [attemptIndex, queryCandidate] of searchQueries.entries()) {
    firstQuery ||= queryCandidate.query;

    const searchStartedAt = new Date().toISOString();
    const searchEvent = createProcessEvent({
      type: 'web.search',
      label: '查询公开来源',
      summary: `正在查询公开信息（尝试 ${attemptIndex + 1}/${searchQueries.length}）。`,
      status: 'running',
      visibility: 'internal',
      started_at: searchStartedAt,
      input: {
        query: queryCandidate.query,
        query_purpose: queryCandidate.purpose,
        attempt: attemptIndex + 1,
        maxResults: config.maxResults,
        allowedDomains: config.allowedDomains,
        blockedDomains: config.blockedDomains,
        fact_need: need.factNeed,
        provider_eligibility: need.providerEligibility,
        search_plan: need.searchPlan,
      },
    });
    processEvents.push(searchEvent);

    try {
      const providerResult = await callSearchProviderWithRetry({
        query: queryCandidate.query,
        locale: 'zh-CN',
        freshness: need.realtime ? 'realtime' : 'recent',
        maxResults: config.maxResults,
        allowedDomains: config.allowedDomains,
        blockedDomains: config.blockedDomains,
      }, config, providerRetryAttemptsForNeed(need));

      const rawItems = filterDomains(asSearchItems(providerResult.data, config), config);
      const policyGate = filterBySourcePolicy(rawItems, need);
      const minRelevanceScore = relevanceThresholdForNeed(need);
      const relevanceGate = applyRelevanceGate(queryCandidate.query, policyGate.items, minRelevanceScore);
      const items = relevanceGate.items.slice(0, config.maxResults);
      const sourceRefs = buildSourceRefs(items);
      const grounded = composeGroundedAnswer(queryCandidate.query, sourceRefs);
      const searchCompletedAt = new Date().toISOString();
      const emptySourceReason = rawItems.length
        ? `检索返回 ${rawItems.length} 条，相关性门禁后无可引用来源。`
        : '检索服务未返回可用结果。';
      const emptySourceReasonCode = rawItems.length ? 'relevance_gate_filtered_all' : 'provider_returned_no_results';
      const hasUsableSourceSet = sourceRefs.length >= requiredSourceCount;
      const insufficientSourceReason = `需要至少 ${requiredSourceCount} 条可交叉核验公开来源，当前仅 ${sourceRefs.length} 条。`;
      const sourceFilterReason = sourceRefs.length ? 'insufficient_source_count' : emptySourceReasonCode;
      const sourceSummary = hasUsableSourceSet
        ? '已完成公开信息查询。'
        : sourceRefs.length
          ? insufficientSourceReason
          : emptySourceReason;
      searchEvent.status = hasUsableSourceSet ? 'success' : 'error';
      searchEvent.summary = sourceSummary;
      searchEvent.completed_at = searchCompletedAt;
      searchEvent.duration_ms = new Date(searchCompletedAt).getTime() - new Date(searchStartedAt).getTime();
      searchEvent.source_refs = sourceRefs as SourceRef[];
      searchEvent.output = {
        source_count: sourceRefs.length,
        raw_source_count: rawItems.length,
        policy_source_count: policyGate.items.length,
        relevance_rejected_count: relevanceGate.rejected_count,
        rejected_source_count: Math.max(0, rawItems.length - sourceRefs.length),
        min_source_count: requiredSourceCount,
        filter_reason: hasUsableSourceSet ? undefined : sourceFilterReason,
        min_relevance_score: minRelevanceScore,
        source_quality_counts: policyGate.source_quality_counts,
        policy_rejected_counts: policyGate.policy_rejected_counts,
        provider_attempts: providerResult.attempts,
        query: queryCandidate.query,
        query_purpose: queryCandidate.purpose,
        attempt: attemptIndex + 1,
        providerLabel: config.providerLabel,
        fact_need: need.factNeed,
        provider_eligibility: need.providerEligibility,
        search_plan: need.searchPlan,
      };

      processEvents.push(createProcessEvent({
        type: 'web.result',
        label: '整理公开来源',
        summary: hasUsableSourceSet ? `已获取 ${sourceRefs.length} 条公开来源。` : sourceSummary,
        status: hasUsableSourceSet ? 'success' : 'error',
        visibility: 'internal',
        source_refs: sourceRefs as SourceRef[],
        output: {
          source_count: sourceRefs.length,
          raw_source_count: rawItems.length,
          policy_source_count: policyGate.items.length,
          relevance_rejected_count: relevanceGate.rejected_count,
          rejected_source_count: Math.max(0, rawItems.length - sourceRefs.length),
          min_source_count: requiredSourceCount,
          filter_reason: hasUsableSourceSet ? undefined : sourceFilterReason,
          min_relevance_score: minRelevanceScore,
          source_quality_counts: policyGate.source_quality_counts,
          policy_rejected_counts: policyGate.policy_rejected_counts,
          provider_attempts: providerResult.attempts,
          retrievedAt: grounded.retrievedAt,
          query: queryCandidate.query,
          query_purpose: queryCandidate.purpose,
          attempt: attemptIndex + 1,
          providerLabel: config.providerLabel,
          fact_need: need.factNeed,
          provider_eligibility: need.providerEligibility,
          search_plan: need.searchPlan,
        },
      }));

      if (!hasUsableSourceSet) {
        lastFailureReasonCode = 'public_web.no_results';
        lastFailureMessage = sourceFilterReason;
        continue;
      }

      return {
        status: 'success',
        reasonCode,
        reasonContext,
        answer: grounded.answer,
        sourceRefs,
        processEvents,
        need,
        sanitizedQuery: queryCandidate.query,
        warnings,
      };
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      const providerAttempts = isRecord(error) && Array.isArray(error.providerAttempts)
        ? error.providerAttempts
        : [];
      const errorKind = providerAttempts.length
        ? (providerAttempts[providerAttempts.length - 1] as ProviderAttemptRecord).error_kind
        : classifyProviderError(error);
      const searchCompletedAt = new Date().toISOString();
      searchEvent.status = 'error';
      searchEvent.summary = '公开信息查询失败。';
      searchEvent.completed_at = searchCompletedAt;
      searchEvent.duration_ms = new Date(searchCompletedAt).getTime() - new Date(searchStartedAt).getTime();
      searchEvent.output = {
        error: messageText,
        error_kind: errorKind,
        provider_attempts: providerAttempts,
        query: queryCandidate.query,
        query_purpose: queryCandidate.purpose,
        attempt: attemptIndex + 1,
      };
      processEvents.push(createProcessEvent({
        type: 'web.result',
        label: '公开来源查询失败',
        summary: '联网查询服务暂时不可用。',
        status: 'error',
        visibility: 'internal',
        output: {
          error: messageText,
          error_kind: errorKind,
          provider_attempts: providerAttempts,
          query: queryCandidate.query,
          query_purpose: queryCandidate.purpose,
          attempt: attemptIndex + 1,
        },
      }));
      lastFailureReasonCode = 'public_web.query_failed';
      lastFailureMessage = messageText;
      warnings.push(messageText);
    }
  }

  return {
    status: 'failed',
    reasonCode: lastFailureReasonCode,
    reasonContext,
    answer: resolveChatAnswerMessage(lastFailureReasonCode, reasonContext),
    sourceRefs: [],
    processEvents,
    need,
    sanitizedQuery: firstQuery,
    warnings: lastFailureMessage ? [...warnings, lastFailureMessage] : warnings,
  };
}
