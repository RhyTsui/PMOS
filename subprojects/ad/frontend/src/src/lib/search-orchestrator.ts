import { createHash } from 'node:crypto';
import type { AgentProcessEvent, SourceRef } from '@/types';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { getPublicWebConfig, isUnsafePublicWebEndpoint, type PublicSearchProviderConfig, type PublicWebConfig } from '@/lib/runtime-config';
import { getPromptContent } from '@/lib/prompt-store';
import type { PublicWebNeed } from '@/lib/public-web-runtime';
import type { SearchPlanQuery } from '@/contracts/request-understanding/fact-need-contract';
import type { WebSourceRef } from '@/contracts/public-web/source-grounding';
import {
  fetchWithProviderAdapter,
  searchWithProviderAdapter,
  type FetchProviderResult,
  type ProviderCallRecord,
  type SearchProviderResultItem,
} from '@/lib/search-provider-adapter';
import { generateModelText } from '@/lib/model-router';

export interface SearchEvidenceItem {
  evidence_id: string;
  source_url: string;
  title: string;
  published_at?: string;
  updated_at?: string;
  snippet: string;
  confidence: number;
  provider: string;
  source_ref_id: string;
  fetched: boolean;
  fetch_failed?: boolean;
}

export interface RerankScore {
  url: string;
  title: string;
  provider: string;
  total: number;
  query_relevance: number;
  source_quality: number;
  freshness: number;
  authority: number;
  language_match: number;
  explanation: string[];
}

export interface SearchOrchestratorResult {
  status: 'success' | 'not_configured' | 'blocked' | 'failed';
  answer: string;
  sourceRefs: WebSourceRef[];
  evidenceItems: SearchEvidenceItem[];
  processEvents: AgentProcessEvent[];
  providerCalls: ProviderCallRecord[];
  rerankScores: RerankScore[];
  warnings: string[];
  sanitizedQuery?: string;
  trace: {
    query_rewrite: {
      original_query: string;
      rewritten_queries: SearchPlanQuery[];
      rewrite_reason: string;
    };
    search_plan: Record<string, unknown>;
    provider_calls: ProviderCallRecord[];
    fetch_results: Record<string, unknown>[];
    rerank_scores: RerankScore[];
    evidence_items: SearchEvidenceItem[];
    research_loop_steps: Record<string, unknown>[];
    conflicts: SearchConflict[];
    answer_origin: string;
  };
}

export interface SearchConflict {
  conflict_id: string;
  topic: string;
  source_urls: string[];
  snippets: string[];
  severity: 'low' | 'medium' | 'high';
  explanation: string;
}

function uniqueQueries(queries: SearchPlanQuery[]): SearchPlanQuery[] {
  const seen = new Set<string>();
  const output: SearchPlanQuery[] = [];
  for (const item of queries) {
    const query = String(item.query || '').replace(/\s+/g, ' ').trim();
    if (!query) continue;
    const key = query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ query, purpose: item.purpose || 'verification' });
  }
  return output;
}

export function rewriteSearchQueries(message: string, need: PublicWebNeed): { queries: SearchPlanQuery[]; reason: string } {
  const planned = need.searchPlan?.queries?.length ? need.searchPlan.queries : [{ query: message, purpose: 'primary' as const }];
  const cleaned = message
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '')
    .replace(/^(请|帮我|帮忙|麻烦)?\s*(联网|公开|外部|网上)?\s*(查一下|查找|查询|检索|搜索|查)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const expanded: SearchPlanQuery[] = [...planned];
  if (cleaned && cleaned !== message) expanded.push({ query: cleaned, purpose: 'verification' });
  if (/[\u4e00-\u9fff]/.test(message) && /[A-Za-z][A-Za-z0-9 .-]{2,}/.test(message)) {
    expanded.push({ query: `${cleaned || message} latest official update`, purpose: 'verification' });
  }
  if (need.searchPlan?.source_policy === 'official_first' || need.searchPlan?.source_policy === 'official_required') {
    expanded.push({ query: `${cleaned || message} 官方 文档 帮助中心`, purpose: 'verification' });
  }
  if (need.searchPlan?.source_policy === 'multi_source_consensus') {
    expanded.push({ query: `${cleaned || message} 趋势 分析 报告`, purpose: 'background' });
  }
  return {
    queries: uniqueQueries(expanded).slice(0, 6),
    reason: '保留原始语义，补充去指令化查询、官方/多源核验查询和必要的中英文公共检索表达。',
  };
}

function legacyProviderFromConfig(config: PublicWebConfig): PublicSearchProviderConfig | null {
  if (!isRealSearchEndpoint(config.searchEndpoint)) return null;
  return {
    id: 'legacy-configured-search',
    kind: 'legacy',
    label: config.providerLabel || 'Configured Web Search',
    enabled: config.enabled,
    endpoint: config.searchEndpoint,
    apiKey: config.apiKey,
    authType: config.authType,
    apiKeyHeader: config.apiKeyHeader,
    method: config.method,
    capabilities: ['search'],
    timeoutMs: config.timeoutMs,
    maxResults: config.maxResults,
  };
}

function isUsableAdapterSearchProvider(provider: PublicSearchProviderConfig): boolean {
  if (!provider.enabled || !provider.endpoint) return false;
  if (!providerSupportsSearch(provider)) return false;
  if (provider.kind === 'weather' || provider.kind === 'legacy') return true;
  return Boolean(provider.apiKey);
}

function providerSupportsSearch(provider: PublicSearchProviderConfig): boolean {
  return Boolean(provider.capabilities.find(item => item === 'search' || item === 'deep_search'));
}

/** 判断 searchEndpoint 是否为真实可用的端点（排除占位符/example URL） */
function isRealSearchEndpoint(endpoint?: string): boolean {
  if (!endpoint) return false;
  if (isUnsafePublicWebEndpoint(endpoint)) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function selectSearchProvidersForPlan(config: PublicWebConfig, need: PublicWebNeed): PublicSearchProviderConfig[] {
  const providers = [...(config.providers || [])];
  const legacy = legacyProviderFromConfig(config);
  if (legacy) providers.push(legacy);
  const enabled = providers.filter(isUsableAdapterSearchProvider);
  const wantsDeep = need.searchPlan?.depth === 'deep' || need.searchPlan?.source_policy === 'multi_source_consensus';
  const wantsFresh = need.searchPlan?.source_policy === 'fresh_news' || need.factNeed?.freshness_need === 'live' || need.factNeed?.freshness_need === 'today';
  const wantsWeather = wantsFresh && need.searchPlan?.query_strategy === 'live_fact_lookup';
  // Search-capable provider kinds (tavily, brave, exa, legacy)
  const searchKinds: Array<PublicSearchProviderConfig['kind']> = ['tavily', 'brave', 'exa', 'legacy'];
  const preferred = enabled.filter(provider => {
    if (!providerSupportsSearch(provider)) return false;
    if (wantsWeather && provider.kind === 'weather') return true;
    if (provider.kind === 'weather') return false;
    if (wantsDeep && (provider.kind === 'exa' || provider.kind === 'tavily' || provider.kind === 'brave' || provider.kind === 'legacy')) return true;
    if (wantsFresh && (provider.kind === 'tavily' || provider.kind === 'brave')) return true;
    return searchKinds.includes(provider.kind);
  });
  const ordered = preferred.sort((left, right) => {
    // Prioritize: weather > tavily > exa > brave > legacy
    const priority: Record<string, number> = { weather: 0, tavily: 1, exa: 2, brave: 3, legacy: 4 };
    return (priority[left.kind] ?? 5) - (priority[right.kind] ?? 5);
  });
  return ordered.length
    ? ordered
    : enabled.filter(provider => provider.kind !== 'weather' && providerSupportsSearch(provider));
}

export function hasConfiguredPublicSearchProvider(config: PublicWebConfig, need?: PublicWebNeed): boolean {
  const hasRealEndpoint = isRealSearchEndpoint(config.searchEndpoint);
  if (need) return hasRealEndpoint || selectSearchProvidersForPlan(config, need).length > 0;
  return hasRealEndpoint
    || Boolean(config.providers?.some(provider => provider.enabled && provider.endpoint && provider.kind !== 'weather' && providerSupportsSearch(provider)));
}

export function hasEnabledSearchAdapterProvider(config: PublicWebConfig, need?: PublicWebNeed): boolean {
  if (need) {
    return selectSearchProvidersForPlan(config, need).some(provider => provider.kind !== 'legacy' && isUsableAdapterSearchProvider(provider));
  }
  return Boolean(config.providers?.some(provider =>
    isUsableAdapterSearchProvider(provider)
    && provider.kind !== 'legacy'
    && provider.kind !== 'weather'
  ));
}

function selectFetchProvider(config: PublicWebConfig): PublicSearchProviderConfig | null {
  const providers = config.providers || [];
  // 优先使用 Firecrawl
  const firecrawl = providers.find(provider => provider.enabled && provider.endpoint && provider.kind === 'firecrawl' && provider.capabilities.includes('fetch'));
  if (firecrawl) return firecrawl;
  // 降级：使用内置 simple_fetch（无需外部服务）
  const simpleFetch = providers.find(provider => provider.enabled && provider.kind === 'simple_fetch' && provider.capabilities.includes('fetch'));
  if (simpleFetch) return simpleFetch;
  // 最后尝试 legacy 配置
  if (config.fetchEndpoint) {
    return {
      id: 'legacy-configured-fetch',
      kind: 'legacy',
      label: config.providerLabel || 'Configured Web Fetch',
      enabled: config.enabled,
      endpoint: config.fetchEndpoint,
      apiKey: config.apiKey,
      authType: config.authType,
      apiKeyHeader: config.apiKeyHeader,
      method: 'POST',
      capabilities: ['fetch'],
      timeoutMs: config.timeoutMs,
      maxResults: 1,
    };
  }
  return null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function sourceIdFor(url: string, index: number): string {
  return `web-${index + 1}-${createHash('sha1').update(url).digest('hex').slice(0, 8)}`;
}

function textTokens(text: string): string[] {
  const normalized = String(text || '').toLowerCase();
  const cjk = normalized.replace(/[^\p{Script=Han}]+/gu, '');
  const cjkTokens = new Set<string>();
  for (let index = 0; index < cjk.length - 1; index += 1) cjkTokens.add(cjk.slice(index, index + 2));
  const ascii = normalized.match(/[a-z0-9][a-z0-9-]{1,}/g) || [];
  return Array.from(new Set([...cjkTokens, ...ascii])).filter(item => item.length >= 2);
}

function scoreQueryRelevance(query: string, item: SearchProviderResultItem, fetched?: FetchProviderResult): number {
  const tokens = textTokens(query);
  if (!tokens.length) return 0;
  const haystack = `${item.title}\n${item.snippet}\n${fetched?.markdown || fetched?.text || ''}\n${item.siteName || ''}`.toLowerCase();
  return tokens.filter(token => haystack.includes(token)).length / tokens.length;
}

function scoreSourceQuality(item: SearchProviderResultItem): number {
  const host = hostOf(item.url);
  const text = `${item.title}\n${item.snippet}\n${item.siteName || ''}\n${host}`.toLowerCase();
  if (item.provider === 'weather-7d' || /open-meteo|wttr\.in/.test(text)) return 0.9;
  if (/\.(gov|edu|mil)(\.[a-z]{2})?$/.test(host) || /官方|帮助中心|开发者|文档|公告|official|docs|developer|help|support/.test(text)) return 1;
  if (/news|times|post|daily|journal|press|wire|观察|新闻|日报|时报|媒体/.test(text)) return 0.72;
  if (/百科|wiki|reference|论坛|社区|问答|知乎|贴吧|reddit|quora|forum/.test(text)) return 0.36;
  return 0.5;
}

function scoreFreshness(item: SearchProviderResultItem): number {
  const currentYear = new Date().getFullYear();
  const text = `${item.title}\n${item.snippet}\n${item.publishedAt || ''}\n${item.updatedAt || ''}`;
  if (item.publishedAt || item.updatedAt) return 0.85;
  if (text.includes(`${currentYear}`)) return 0.75;
  if (text.includes(`${currentYear - 1}`)) return 0.5;
  if (/刚刚|今天|昨日|昨天|分钟前|小时前|天前|周前|月前|latest|recent/i.test(text)) return 0.65;
  return 0.35;
}

function scoreAuthority(item: SearchProviderResultItem, need: PublicWebNeed): number {
  const quality = scoreSourceQuality(item);
  if (need.searchPlan?.source_policy === 'official_first' || need.searchPlan?.source_policy === 'official_required') return quality;
  if (need.searchPlan?.source_policy === 'multi_source_consensus') return Math.max(0.4, quality);
  return quality >= 0.7 ? 0.8 : 0.55;
}

function scoreLanguageMatch(query: string, item: SearchProviderResultItem): number {
  const queryIsChinese = /[\u4e00-\u9fff]/.test(query);
  if (!queryIsChinese) return 0.65;
  const text = `${item.title}\n${item.snippet}\n${item.siteName || ''}`;
  if (item.provider === 'weather-7d') return 1;
  return /[\u4e00-\u9fff]/.test(text) ? 1 : 0.35;
}

function dedupeItems(items: SearchProviderResultItem[]): SearchProviderResultItem[] {
  const seen = new Set<string>();
  const output: SearchProviderResultItem[] = [];
  for (const item of items) {
    const key = item.url.replace(/#.*$/, '').replace(/\/$/, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

export function rerankSearchItems(
  query: string,
  items: SearchProviderResultItem[],
  fetchedByUrl: Map<string, FetchProviderResult>,
  config: PublicWebConfig,
  need: PublicWebNeed,
): Array<{ item: SearchProviderResultItem; score: RerankScore }> {
  const weights = getOrchestratorConfig(config).rerankWeights;
  return items.map(item => {
    const fetched = fetchedByUrl.get(item.url);
    const queryRelevance = scoreQueryRelevance(query, item, fetched);
    const sourceQuality = scoreSourceQuality(item);
    const freshness = scoreFreshness(item);
    const authority = scoreAuthority(item, need);
    const languageMatch = scoreLanguageMatch(query, item);
    const total = Number((
      queryRelevance * weights.queryRelevance
      + sourceQuality * weights.sourceQuality
      + freshness * weights.freshness
      + authority * weights.authority
      + languageMatch * weights.languageMatch
    ).toFixed(4));
    const explanation = [
      `query_relevance=${queryRelevance.toFixed(2)}`,
      `source_quality=${sourceQuality.toFixed(2)}`,
      `freshness=${freshness.toFixed(2)}`,
      `authority=${authority.toFixed(2)}`,
      `language_match=${languageMatch.toFixed(2)}`,
    ];
    return {
      item,
      score: {
        url: item.url,
        title: item.title,
        provider: item.provider,
        total,
        query_relevance: Number(queryRelevance.toFixed(4)),
        source_quality: Number(sourceQuality.toFixed(4)),
        freshness: Number(freshness.toFixed(4)),
        authority: Number(authority.toFixed(4)),
        language_match: Number(languageMatch.toFixed(4)),
        explanation,
      },
    };
  }).sort((left, right) => right.score.total - left.score.total);
}

function extractEvidence(item: SearchProviderResultItem, sourceRef: WebSourceRef, fetched?: FetchProviderResult): SearchEvidenceItem {
  const fullText = (fetched?.markdown || fetched?.text || '').replace(/\s+/g, ' ').trim();
  const isStructuredWeatherEvidence = item.provider === 'weather-7d' || /open-meteo|wttr/i.test(`${item.provider} ${item.siteName || ''} ${item.url}`);
  const snippet = fullText
    ? fullText.slice(0, 420)
    : item.snippet.slice(0, 420);
  return {
    evidence_id: `ev-${createHash('sha1').update(`${item.url}\n${snippet}`).digest('hex').slice(0, 10)}`,
    source_url: item.url,
    title: fetched?.title || item.title,
    published_at: fetched?.publishedAt || item.publishedAt,
    updated_at: fetched?.updatedAt || item.updatedAt,
    snippet,
    confidence: fetched && fullText ? 0.78 : isStructuredWeatherEvidence ? 0.82 : 0.55,
    provider: fetched?.provider || item.provider,
    source_ref_id: sourceRef.sourceId,
    fetched: Boolean((fetched && fullText) || isStructuredWeatherEvidence),
    fetch_failed: isStructuredWeatherEvidence ? false : !fetched,
  };
}

function buildSourceRefs(items: SearchProviderResultItem[], fetchedByUrl: Map<string, FetchProviderResult>): WebSourceRef[] {
  const retrievedAt = new Date().toISOString();
  return items.map((item, index) => {
    const fetched = fetchedByUrl.get(item.url);
    const isStructuredWeatherEvidence = item.provider === 'weather-7d' || /open-meteo|wttr/i.test(`${item.provider} ${item.siteName || ''} ${item.url}`);
    const sourceId = sourceIdFor(item.url, index);
    const content = `${item.title}\n${item.url}\n${fetched?.markdown || fetched?.text || item.snippet}`;
    return {
      id: sourceId,
      sourceId,
      title: fetched?.title || item.title,
      source: item.siteName || hostOf(item.url) || 'public web',
      url: item.url,
      source_type: fetched ? 'web_fetch' : isStructuredWeatherEvidence ? 'web_search' : 'web_search',
      icon: fetched ? 'web_fetch' : 'web_search',
      snippet: fetched?.markdown?.slice(0, 240) || fetched?.text?.slice(0, 240) || item.snippet,
      siteName: item.siteName || hostOf(item.url),
      publisher: item.publisher,
      retrievedAt,
      fetchedAt: fetched || isStructuredWeatherEvidence ? retrievedAt : undefined,
      contentHash: fetched?.contentHash || createHash('sha1').update(content).digest('hex'),
      freshness: 'recent',
      confidence: fetched ? 0.78 : isStructuredWeatherEvidence ? 0.82 : 0.55,
    };
  });
}

function getOrchestratorConfig(config: PublicWebConfig) {
  return config.orchestrator || {
    enabled: true,
    maxFetchPages: 3,
    maxResearchRounds: 2,
    concurrency: 3,
    timeoutMs: config.timeoutMs,
    rerankWeights: {
      queryRelevance: 0.38,
      sourceQuality: 0.18,
      freshness: 0.16,
      authority: 0.16,
      languageMatch: 0.12,
    },
  };
}

function composeAnswer(evidenceItems: SearchEvidenceItem[]): string {
  if (!evidenceItems.length) return '';
  const lines = evidenceItems.slice(0, 3).map((item) => `- ${item.snippet}`);
  return lines.join('\n');
}

function cleanExtractedContent(value: string): string {
  const lines = String(value || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const cleaned: string[] = [];
  const noisyLine = /^(导航|菜单|登录|注册|隐私|广告|友情链接|版权|©|cookie|subscribe|newsletter|footer|header)$/i;
  for (const line of lines) {
    if (line.length <= 2 || noisyLine.test(line)) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(line);
  }
  return cleaned.join('\n').slice(0, 6000);
}

function assessInformationGap(need: PublicWebNeed, evidenceItems: SearchEvidenceItem[], requiredSourceCount: number): Record<string, unknown> {
  const fetchedCount = evidenceItems.filter(item => item.fetched).length;
  const sourceCount = new Set(evidenceItems.map(item => item.source_url)).size;
  const missing: string[] = [];
  if (sourceCount < requiredSourceCount) missing.push('insufficient_independent_sources');
  if (need.searchPlan?.depth === 'deep' && fetchedCount < Math.min(requiredSourceCount, sourceCount)) missing.push('insufficient_full_content');
  if (need.searchPlan?.source_policy === 'official_first' && !evidenceItems.some(item => /官方|帮助中心|文档|official|docs|developer|support/i.test(`${item.title}\n${item.source_url}`))) {
    missing.push('official_source_not_confirmed');
  }
  return {
    action: 'gap_analysis',
    source_count: sourceCount,
    fetched_count: fetchedCount,
    required_source_count: requiredSourceCount,
    missing,
    status: missing.length ? 'partial' : 'sufficient',
  };
}

function detectEvidenceConflicts(evidenceItems: SearchEvidenceItem[]): SearchConflict[] {
  const positive = /(支持|增加|提升|上涨|增长|开放|enabled|supports?|increase|improve|available)/i;
  const negative = /(不支持|取消|下降|减少|限制|不可用|disabled|not support|decrease|removed|unavailable)/i;
  const conflicts: SearchConflict[] = [];
  for (let leftIndex = 0; leftIndex < evidenceItems.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < evidenceItems.length; rightIndex += 1) {
      const left = evidenceItems[leftIndex];
      const right = evidenceItems[rightIndex];
      const leftText = `${left.title}\n${left.snippet}`;
      const rightText = `${right.title}\n${right.snippet}`;
      const opposite = (positive.test(leftText) && negative.test(rightText)) || (negative.test(leftText) && positive.test(rightText));
      if (!opposite) continue;
      conflicts.push({
        conflict_id: `conflict-${createHash('sha1').update(`${left.source_url}\n${right.source_url}`).digest('hex').slice(0, 8)}`,
        topic: 'public_search_evidence',
        source_urls: [left.source_url, right.source_url],
        snippets: [left.snippet.slice(0, 180), right.snippet.slice(0, 180)],
        severity: 'medium',
        explanation: '不同公开来源对同一主题呈现相反方向表述，需要在回答中披露不确定性。',
      });
    }
  }
  return conflicts.slice(0, 5);
}

async function composeEvidenceSummary(params: {
  message: string;
  evidenceItems: SearchEvidenceItem[];
  conflicts: SearchConflict[];
  warnings: string[];
}): Promise<{ answer: string; origin: 'llm_evidence_summary' | 'template_evidence_summary'; warnings: string[] }> {
  const builtInAnswer = [
    '结论：基于当前公开来源，只能确认以下已检索到的依据；未覆盖的信息仍需继续核验。',
    '',
    '依据摘要：',
    composeAnswer(params.evidenceItems),
    params.conflicts.length ? `\n不确定性：检测到 ${params.conflicts.length} 组来源表述冲突，需以官方或更新来源为准。` : '',
    params.warnings.length ? `\n降级信息：${params.warnings.slice(0, 3).join('；')}` : '',
  ].filter(Boolean).join('\n');
  try {
    // P0 治理：从 prompt store 读取 managed prompt，失败时回到原始内置文案
    const EVIDENCE_SUMMARY_BUILTIN_PROMPT = [
      '你是 Search Orchestrator 的 Evidence Summary Composer。',
      '只能基于提供的 evidence_items、conflicts、warnings 总结，不得添加来源中没有的事实、日期、数字或 URL。',
      '输出中文，包含：结论、依据摘要、关键来源、不确定性。',
      '如果证据不足，明确写"不足以确认"。',
    ].join('\n');
    const managedEvidencePrompt = await getPromptContent('search.evidence_summary', '').catch(() => '');
    const evidencePrompt = managedEvidencePrompt || EVIDENCE_SUMMARY_BUILTIN_PROMPT;
    const result = await generateModelText({
      useCase: 'chat_answer',
      fallback: builtInAnswer,
      input: {
        user_query: params.message,
        evidence_items: params.evidenceItems,
        conflicts: params.conflicts,
        warnings: params.warnings,
      },
      messages: [
        {
          role: 'system',
          content: evidencePrompt,
        },
        {
          role: 'user',
          content: JSON.stringify({
            question: params.message,
            evidence_items: params.evidenceItems,
            conflicts: params.conflicts,
            warnings: params.warnings,
          }),
        },
      ],
    });
    const answer = result.text.trim();
    return {
      answer: answer || builtInAnswer,
      origin: answer ? 'llm_evidence_summary' : 'template_evidence_summary',
      warnings: result.warnings || [],
    };
  } catch (error) {
    return {
      answer: builtInAnswer,
      origin: 'template_evidence_summary',
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export async function runSearchOrchestrator(message: string, need: PublicWebNeed): Promise<SearchOrchestratorResult> {
  const config = await getPublicWebConfig();
  const processEvents: AgentProcessEvent[] = [];
  const warnings: string[] = [];
  const providerCalls: ProviderCallRecord[] = [];
  const fetchResults: Record<string, unknown>[] = [];
  const researchLoopSteps: Record<string, unknown>[] = [];
  const searchProviders = selectSearchProvidersForPlan(config, need);
  const fetchProvider = selectFetchProvider(config);
  const rewritten = rewriteSearchQueries(message, need);
  const startedAt = new Date().toISOString();

  processEvents.push(createProcessEvent({
    type: 'web.search',
    label: '规划公开检索',
    summary: '已生成检索计划和候选来源。',
    status: 'success',
    visibility: 'internal',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    input: {
      original_query: message,
      fact_need: need.factNeed,
      search_plan: need.searchPlan,
    },
    output: {
      query_rewrite: {
        original_query: message,
        rewritten_queries: rewritten.queries,
        rewrite_reason: rewritten.reason,
      },
      search_plan: {
        ...need.searchPlan,
        selected_providers: searchProviders.map(provider => ({ id: provider.id, kind: provider.kind, capabilities: provider.capabilities })),
        fetch_provider: fetchProvider ? { id: fetchProvider.id, kind: fetchProvider.kind } : null,
      },
    },
  }));

  if (!config.enabled || !searchProviders.length) {
    return {
      status: 'not_configured',
      answer: '',
      sourceRefs: [],
      evidenceItems: [],
      processEvents,
      providerCalls,
      rerankScores: [],
      warnings: ['public_search_provider_not_configured'],
      trace: {
        query_rewrite: { original_query: message, rewritten_queries: rewritten.queries, rewrite_reason: rewritten.reason },
        search_plan: { ...(need.searchPlan || {}) },
        provider_calls: providerCalls,
        fetch_results: fetchResults,
        rerank_scores: [],
        evidence_items: [],
        research_loop_steps: researchLoopSteps,
        conflicts: [],
        answer_origin: 'insufficient_evidence',
      },
    };
  }

  const allItems: SearchProviderResultItem[] = [];
  const orchestratorConfig = getOrchestratorConfig(config);
  const maxRounds = Math.max(1, Math.min(orchestratorConfig.maxResearchRounds, need.searchPlan?.depth === 'deep' ? orchestratorConfig.maxResearchRounds : 1));
  for (let round = 1; round <= maxRounds; round += 1) {
    const roundQueries = round === 1 ? rewritten.queries : rewritten.queries.filter(query => query.purpose !== 'primary');
    researchLoopSteps.push({ round, action: round === 1 ? 'initial_search' : 'gap_followup_search', query_count: roundQueries.length });
    for (const query of roundQueries) {
      for (const provider of searchProviders) {
        // Determine search depth based on need's search plan
        const searchDepth: 'standard' | 'deep' = need.searchPlan?.depth === 'deep'
          || need.searchPlan?.source_policy === 'multi_source_consensus'
          ? 'deep'
          : 'standard';
        const result = await searchWithProviderAdapter({
          query: query.query,
          locale: 'zh-CN',
          freshness: need.realtime ? 'realtime' : 'recent',
          maxResults: provider.maxResults || config.maxResults,
          allowedDomains: config.allowedDomains,
          blockedDomains: config.blockedDomains,
          searchDepth,
        }, provider, config);
        providerCalls.push(result.call);
        allItems.push(...result.items);
      }
    }
    if (allItems.length >= Math.max(2, config.maxResults)) break;
  }

  const deduped = dedupeItems(allItems).slice(0, Math.max(config.maxResults, orchestratorConfig.maxFetchPages));
  const fetchedByUrl = new Map<string, FetchProviderResult>();
  const structuredEvidenceItems = deduped.filter(item => item.provider === 'weather-7d' || /open-meteo|wttr/i.test(`${item.provider} ${item.siteName || ''} ${item.url}`));
  structuredEvidenceItems.forEach(item => {
    fetchResults.push({ url: item.url, status: 'skipped', reason: 'structured_provider_content' });
  });
  const fetchTargets = deduped
    .filter(item => !structuredEvidenceItems.some(structured => structured.url === item.url))
    .slice(0, orchestratorConfig.maxFetchPages);
  if (fetchTargets.length && fetchProvider) {
    for (const item of fetchTargets) {
      const result = await fetchWithProviderAdapter({ url: item.url, extractText: true, timeoutMs: config.timeoutMs }, fetchProvider, config);
      providerCalls.push(result.call);
      fetchResults.push({ url: item.url, status: result.call.status, provider: result.call.provider_id, error: result.call.error });
      if (result.item && (result.item.markdown || result.item.text)) {
        fetchedByUrl.set(item.url, result.item);
      } else {
        warnings.push(`fetch_failed:${item.url}`);
      }
    }
  } else if (fetchTargets.length) {
    warnings.push('fetch_provider_not_configured');
    fetchTargets.forEach(item => fetchResults.push({ url: item.url, status: 'skipped', reason: 'fetch_provider_not_configured' }));
  }

  const ranked = rerankSearchItems(message, deduped, fetchedByUrl, config, need);
  const minScore = need.searchPlan?.source_policy === 'official_first' || need.searchPlan?.source_policy === 'official_required'
    ? 0.14
    : need.sourceRequired ? 0.24 : 0.16;
  const accepted = ranked.filter(entry => entry.score.total >= minScore).slice(0, config.maxResults);
  const rerankScores = ranked.map(entry => entry.score);
  const sourceRefs = buildSourceRefs(accepted.map(entry => entry.item), fetchedByUrl);
  const evidenceItems = accepted
    .map((entry, index) => sourceRefs[index]
      ? extractEvidence(entry.item, sourceRefs[index], fetchedByUrl.get(entry.item.url))
      : null)
    .filter((item): item is SearchEvidenceItem => Boolean(item));
  for (const item of evidenceItems) {
    item.snippet = cleanExtractedContent(item.snippet).slice(0, 420) || item.snippet;
  }
  const requiredSourceCount = need.searchPlan?.source_policy === 'multi_source_consensus' || need.searchPlan?.depth === 'deep' ? 2 : 1;
  const gapAnalysis = assessInformationGap(need, evidenceItems, requiredSourceCount);
  const conflicts = detectEvidenceConflicts(evidenceItems);
  researchLoopSteps.push(gapAnalysis, {
    action: 'conflict_detection',
    conflict_count: conflicts.length,
    conflicts,
    status: conflicts.length ? 'conflicting' : 'no_conflict_detected',
  });
  const summary = evidenceItems.length
    ? await composeEvidenceSummary({ message, evidenceItems, conflicts, warnings })
    : { answer: '', origin: 'template_evidence_summary' as const, warnings: [] };
  warnings.push(...summary.warnings.map(item => `llm_summary_warning:${item}`));
  const answer = summary.answer;
  const status = evidenceItems.length ? 'success' : 'failed';

  processEvents.push(createProcessEvent({
    type: 'web.result',
    label: '整理公开依据',
    summary: evidenceItems.length
      ? `已获取 ${evidenceItems.length} 条可引用依据。`
      : '没有检索到足够可靠的公开依据。',
    status: evidenceItems.length ? 'success' : 'error',
    visibility: 'internal',
    source_refs: sourceRefs as SourceRef[],
    output: {
      provider_calls: providerCalls,
      fetch_results: fetchResults,
      rerank_scores: rerankScores,
      evidence_items: evidenceItems,
      research_loop_steps: researchLoopSteps,
      conflicts,
      answer_origin: evidenceItems.length ? summary.origin : 'insufficient_evidence',
      warnings,
    },
  }));

  return {
    status,
    answer,
    sourceRefs,
    evidenceItems,
    processEvents,
    providerCalls,
    rerankScores,
    warnings,
    sanitizedQuery: rewritten.queries[0]?.query || message,
    trace: {
      query_rewrite: {
        original_query: message,
        rewritten_queries: rewritten.queries,
        rewrite_reason: rewritten.reason,
      },
      search_plan: { ...(need.searchPlan || {}) },
      provider_calls: providerCalls,
      fetch_results: fetchResults,
      rerank_scores: rerankScores,
      evidence_items: evidenceItems,
      research_loop_steps: researchLoopSteps,
      conflicts,
      answer_origin: evidenceItems.length ? summary.origin : 'insufficient_evidence',
    },
  };
}
