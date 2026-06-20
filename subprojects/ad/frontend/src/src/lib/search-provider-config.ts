import type {
  PublicSearchOrchestratorConfig,
  PublicSearchProviderCapability,
  PublicSearchProviderConfig,
  PublicSearchProviderKind,
} from '@/lib/runtime-config';

function isSyntheticPublicWebHost(host: string): boolean {
  const normalizedHost = host.trim().toLowerCase();
  return normalizedHost === 'example.test'
    || normalizedHost.endsWith('.example.test')
    || normalizedHost === 'example.org'
    || normalizedHost.endsWith('.example.org')
    || normalizedHost === 'localhost'
    || normalizedHost === '127.0.0.1'
    || normalizedHost === '0.0.0.0';
}

function isUnsafeEndpoint(endpoint: string): boolean {
  const normalizedEndpoint = endpoint.trim();
  if (!normalizedEndpoint) return false;
  const lowered = normalizedEndpoint.toLowerCase();
  if (lowered.startsWith('fake:') || lowered.startsWith('mock:')) return true;
  try {
    const url = new URL(normalizedEndpoint);
    return isSyntheticPublicWebHost(url.hostname);
  } catch {
    return /(?:^|[^a-z0-9])(example\.test|fake|mock)(?:[^a-z0-9]|$)/i.test(normalizedEndpoint);
  }
}

function safeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  return trimmed && !isUnsafeEndpoint(trimmed) ? trimmed : '';
}

export function getDefaultPublicSearchProviders(): PublicSearchProviderConfig[] {
  return [
    {
      id: 'weather-7d',
      kind: 'weather',
      label: '7 天天气预报',
      enabled: process.env.XIAOQIAO_WEATHER_7D_ENABLED !== 'false',
      endpoint: 'builtin:weather-7d',
      apiKey: '',
      authType: 'none',
      method: 'GET',
      capabilities: ['search'],
      maxResults: Number(process.env.XIAOQIAO_WEATHER_7D_MAX_RESULTS ?? 1),
    },
    {
      id: 'tavily',
      kind: 'tavily',
      label: 'Tavily Search',
      enabled: process.env.XIAOQIAO_TAVILY_SEARCH_ENABLED === 'true',
      endpoint: safeEndpoint(process.env.XIAOQIAO_TAVILY_SEARCH_ENDPOINT ?? 'https://api.tavily.com/search'),
      apiKey: process.env.XIAOQIAO_TAVILY_SEARCH_API_KEY ?? '',
      authType: 'api_key_body',
      method: 'POST',
      capabilities: ['search'],
      maxResults: Number(process.env.XIAOQIAO_TAVILY_SEARCH_MAX_RESULTS ?? 8),
    },
    {
      id: 'brave',
      kind: 'brave',
      label: 'Brave Search',
      enabled: process.env.XIAOQIAO_BRAVE_SEARCH_ENABLED === 'true',
      endpoint: safeEndpoint(process.env.XIAOQIAO_BRAVE_SEARCH_ENDPOINT ?? 'https://api.search.brave.com/res/v1/web/search'),
      apiKey: process.env.XIAOQIAO_BRAVE_SEARCH_API_KEY ?? '',
      authType: 'api_key_header',
      apiKeyHeader: 'X-Subscription-Token',
      method: 'GET',
      capabilities: ['search'],
      maxResults: Number(process.env.XIAOQIAO_BRAVE_SEARCH_MAX_RESULTS ?? 8),
    },
    {
      id: 'exa',
      kind: 'exa',
      label: 'Exa Deep Search',
      enabled: process.env.XIAOQIAO_EXA_SEARCH_ENABLED === 'true',
      endpoint: safeEndpoint(process.env.XIAOQIAO_EXA_SEARCH_ENDPOINT ?? 'https://api.exa.ai/search'),
      apiKey: process.env.XIAOQIAO_EXA_SEARCH_API_KEY ?? '',
      authType: 'bearer',
      method: 'POST',
      capabilities: ['search', 'deep_search'],
      maxResults: Number(process.env.XIAOQIAO_EXA_SEARCH_MAX_RESULTS ?? 8),
    },
    {
      id: 'firecrawl',
      kind: 'firecrawl',
      label: 'Firecrawl Extract',
      enabled: process.env.XIAOQIAO_FIRECRAWL_ENABLED === 'true',
      endpoint: safeEndpoint(process.env.XIAOQIAO_FIRECRAWL_EXTRACT_ENDPOINT ?? 'https://api.firecrawl.dev/v1/extract'),
      apiKey: process.env.XIAOQIAO_FIRECRAWL_API_KEY ?? '',
      authType: 'bearer',
      method: 'POST',
      capabilities: ['fetch'],
      maxResults: 1,
      fetchMode: 'extract',
    },
    {
      id: 'simple-fetch',
      kind: 'simple_fetch',
      label: '内置网页抓取',
      enabled: process.env.XIAOQIAO_SIMPLE_FETCH_ENABLED === 'true',
      endpoint: 'builtin:simple-fetch',
      apiKey: '',
      authType: 'none',
      method: 'GET',
      capabilities: ['fetch'],
      maxResults: 1,
      fetchMode: 'scrape',
      timeoutMs: Number(process.env.XIAOQIAO_SIMPLE_FETCH_TIMEOUT_MS ?? 10000),
    },
  ];
}

export function getDefaultSearchOrchestratorConfig(): PublicSearchOrchestratorConfig {
  return {
    enabled: process.env.XIAOQIAO_SEARCH_ORCHESTRATOR_ENABLED !== 'false',
    maxFetchPages: Number(process.env.XIAOQIAO_SEARCH_MAX_FETCH_PAGES ?? 3),
    maxResearchRounds: Number(process.env.XIAOQIAO_SEARCH_MAX_RESEARCH_ROUNDS ?? 2),
    concurrency: Number(process.env.XIAOQIAO_SEARCH_CONCURRENCY ?? 3),
    timeoutMs: Number(process.env.XIAOQIAO_SEARCH_ORCHESTRATOR_TIMEOUT_MS ?? 12000),
    rerankWeights: {
      queryRelevance: 0.38,
      sourceQuality: 0.18,
      freshness: 0.16,
      authority: 0.16,
      languageMatch: 0.12,
    },
  };
}

export function normalizePublicSearchProviderConfig(input: Partial<PublicSearchProviderConfig> | undefined, fallback: PublicSearchProviderConfig, index: number): PublicSearchProviderConfig {
  const timeoutMs = Number(input?.timeoutMs);
  const maxResults = Number(input?.maxResults);
  const kind: PublicSearchProviderKind = input?.kind === 'brave' || input?.kind === 'exa' || input?.kind === 'firecrawl' || input?.kind === 'legacy' || input?.kind === 'weather' || input?.kind === 'tavily' || input?.kind === 'simple_fetch'
    ? input.kind
    : fallback.kind;
  const method = String(input?.method ?? fallback.method ?? 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET';
  const authType = input?.authType === 'bearer' || input?.authType === 'api_key_header' || input?.authType === 'api_key_body' || input?.authType === 'custom_headers' || input?.authType === 'none'
    ? input.authType
    : fallback.authType;
  const rawCapabilities = Array.isArray(input?.capabilities) && input.capabilities.length ? input.capabilities : fallback.capabilities;
  const capabilities = rawCapabilities.filter((item): item is PublicSearchProviderCapability => item === 'search' || item === 'deep_search' || item === 'fetch');
  const fetchMode = input?.fetchMode === 'extract' || input?.fetchMode === 'scrape'
    ? input.fetchMode
    : fallback.fetchMode;
  return {
    id: input?.id?.trim() || fallback.id || `provider-${index + 1}`,
    kind,
    label: input?.label?.trim() || fallback.label || kind,
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : fallback.enabled,
    endpoint: typeof input?.endpoint === 'string' ? safeEndpoint(input.endpoint) : fallback.endpoint,
    apiKey: input?.apiKey?.trim() || fallback.apiKey || '',
    authType,
    apiKeyHeader: input?.apiKeyHeader?.trim() || fallback.apiKeyHeader,
    method,
    capabilities: capabilities.length ? capabilities : fallback.capabilities,
    timeoutMs: Number.isFinite(timeoutMs) ? Math.max(1000, timeoutMs) : fallback.timeoutMs,
    maxResults: Number.isFinite(maxResults) ? Math.max(1, Math.min(20, maxResults)) : fallback.maxResults,
    fetchMode,
  };
}

export function normalizePublicSearchProviderConfigs(input: unknown, defaults = getDefaultPublicSearchProviders()): PublicSearchProviderConfig[] {
  const configured = Array.isArray(input) ? input : [];
  const records = configured.filter((item): item is Partial<PublicSearchProviderConfig> => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
  const byId = new Map(records.map(item => [String(item.id || item.kind || ''), item]));
  const normalizedDefaults = defaults.map((fallback, index) => normalizePublicSearchProviderConfig(byId.get(fallback.id) || byId.get(fallback.kind), fallback, index));
  const extra = records
    .filter(item => !defaults.some(fallback => fallback.id === item.id || fallback.kind === item.kind))
    .map((item, index) => normalizePublicSearchProviderConfig(item, {
      id: `custom-${index + 1}`,
      kind: 'legacy',
      label: 'Configured Web Search',
      enabled: false,
      endpoint: '',
      apiKey: '',
      authType: 'none',
      method: 'GET',
      capabilities: ['search'],
    }, normalizedDefaults.length + index));
  return [...normalizedDefaults, ...extra];
}

export function normalizePublicSearchOrchestratorConfig(input: Partial<PublicSearchOrchestratorConfig> | undefined, defaults = getDefaultSearchOrchestratorConfig()): PublicSearchOrchestratorConfig {
  const maxFetchPages = Number(input?.maxFetchPages);
  const maxResearchRounds = Number(input?.maxResearchRounds);
  const concurrency = Number(input?.concurrency);
  const timeoutMs = Number(input?.timeoutMs);
  return {
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : defaults.enabled,
    maxFetchPages: Number.isFinite(maxFetchPages) ? Math.max(0, Math.min(10, maxFetchPages)) : defaults.maxFetchPages,
    maxResearchRounds: Number.isFinite(maxResearchRounds) ? Math.max(1, Math.min(5, maxResearchRounds)) : defaults.maxResearchRounds,
    concurrency: Number.isFinite(concurrency) ? Math.max(1, Math.min(8, concurrency)) : defaults.concurrency,
    timeoutMs: Number.isFinite(timeoutMs) ? Math.max(1000, timeoutMs) : defaults.timeoutMs,
    rerankWeights: {
      ...defaults.rerankWeights,
      ...(input?.rerankWeights || {}),
    },
  };
}
