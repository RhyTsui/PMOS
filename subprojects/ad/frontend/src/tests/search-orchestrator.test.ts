import { afterEach, describe, expect, it, vi } from 'vitest';
import { executePublicWebQuery, type PublicWebNeed } from '../src/lib/public-web-runtime';
import { rerankSearchItems, rewriteSearchQueries, selectSearchProvidersForPlan } from '../src/lib/search-orchestrator';
import { fetchWithProviderAdapter, searchWithProviderAdapter } from '../src/lib/search-provider-adapter';
import { withRuntimeConfigOverrides, type PublicWebConfig } from '../src/lib/runtime-config';

vi.mock('../src/lib/model-router', () => ({
  generateModelText: vi.fn(async ({ fallback }: { fallback?: string }) => ({
    text: [
      '结论：基于已抓取的公开证据生成摘要。',
      '依据摘要：证据来自检索结果与正文抽取。',
      '关键来源：见 source_refs。',
      '不确定性：以 evidence_items 和 conflicts 为准。',
    ].join('\n') || fallback || '',
    warnings: [],
  })),
}));

function makeNeed(overrides: Partial<PublicWebNeed> = {}): PublicWebNeed {
  return {
    required: true,
    primaryGoal: 'fetch_external_public_info',
    capabilityType: 'web_search',
    realtime: false,
    sourceRequired: true,
    reasonCode: 'public_web.need_detected',
    confidence: 0.9,
    factNeed: {
      answer_shape: 'status_update',
      fact_visibility: 'public',
      authority_need: 'official_source',
      freshness_need: 'recent',
      sensitivity: 'none',
      consequence_risk: 'high',
      ambiguity: [],
    },
    providerEligibility: {
      provider: 'public_web',
      eligible: true,
      role: 'primary_answer',
      reasons: ['provider_authority_profile_matched'],
      rejectedBy: [],
    },
    searchPlan: {
      allowed: true,
      role: 'primary_answer',
      depth: 'standard',
      source_policy: 'official_first',
      query_strategy: 'official_domain_discovery',
      redaction_policy: 'none',
      queries: [{ query: '巨量引擎 SKAN 4.0 最新变化', purpose: 'primary' }],
      reasons: ['fresh_official_source_needed'],
    },
    ...overrides,
  };
}

function makePublicWebOverride(): Partial<PublicWebConfig> {
  return {
    enabled: true,
    searchEndpoint: '',
    fetchEndpoint: '',
    apiKey: '',
    maxResults: 4,
    timeoutMs: 5000,
    providers: [
      {
        id: 'brave',
        kind: 'brave',
        label: 'Brave Search',
        enabled: true,
        endpoint: 'https://api.search.brave.com/res/v1/web/search',
        apiKey: 'brave-key',
        authType: 'api_key_header',
        apiKeyHeader: 'X-Subscription-Token',
        method: 'GET',
        capabilities: ['search'],
        maxResults: 4,
      },
      {
        id: 'exa',
        kind: 'exa',
        label: 'Exa Deep Search',
        enabled: true,
        endpoint: 'https://api.exa.ai/search',
        apiKey: 'exa-key',
        authType: 'bearer',
        method: 'POST',
        capabilities: ['search', 'deep_search'],
        maxResults: 4,
      },
      {
        id: 'firecrawl',
        kind: 'firecrawl',
        label: 'Firecrawl Extract',
        enabled: true,
        endpoint: 'https://api.firecrawl.dev/v1/extract',
        apiKey: 'firecrawl-key',
        authType: 'bearer',
        method: 'POST',
        capabilities: ['fetch'],
        fetchMode: 'extract',
      },
    ],
    orchestrator: {
      enabled: true,
      maxFetchPages: 2,
      maxResearchRounds: 2,
      concurrency: 2,
      timeoutMs: 8000,
      rerankWeights: {
        queryRelevance: 0.38,
        sourceQuality: 0.18,
        freshness: 0.16,
        authority: 0.16,
        languageMatch: 0.12,
      },
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('search orchestrator', () => {
  it('rewrites queries without changing the original meaning and records reasons', () => {
    const rewritten = rewriteSearchQueries('帮我查一下 OpenAI Agent SDK 最新能力', makeNeed({
      searchPlan: {
        allowed: true,
        role: 'primary_answer',
        depth: 'deep',
        source_policy: 'official_first',
        query_strategy: 'official_domain_discovery',
        redaction_policy: 'none',
        queries: [{ query: 'OpenAI Agent SDK 最新能力', purpose: 'primary' }],
      },
    }));

    expect(rewritten.queries.map(item => item.query)).toContain('OpenAI Agent SDK 最新能力');
    expect(rewritten.queries.some(item => /official|官方|帮助中心/i.test(item.query))).toBe(true);
    expect(rewritten.reason).toContain('保留原始语义');
  });

  it('prefers the 7-day weather provider for live weather questions', async () => {
    const config = {
      ...makePublicWebOverride(),
      providers: [
        {
          id: 'weather-7d',
          kind: 'weather',
          label: '7 天天气预报',
          enabled: true,
          endpoint: 'builtin:weather-7d',
          apiKey: '',
          authType: 'none',
          method: 'GET',
          capabilities: ['search'],
          maxResults: 1,
        },
        ...(makePublicWebOverride().providers || []),
      ],
    } as PublicWebConfig;
    const providers = selectSearchProvidersForPlan(config, makeNeed({
      realtime: true,
      factNeed: {
        answer_shape: 'specific_value',
        fact_visibility: 'public',
        authority_need: 'official_source',
        freshness_need: 'live',
        sensitivity: 'none',
        consequence_risk: 'medium',
        ambiguity: [],
      },
      searchPlan: {
        allowed: true,
        role: 'primary_answer',
        depth: 'standard',
        source_policy: 'fresh_news',
        query_strategy: 'live_fact_lookup',
        redaction_policy: 'none',
        queries: [{ query: '下周日南京天气', purpose: 'primary' }],
        reasons: ['weather_live_source_required'],
      },
    }));

    expect(providers[0]?.id).toBe('weather-7d');
  });

  it('uses the 7-day weather provider without routing through the app web-search endpoint', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('geocoding-api.open-meteo.com')) {
        return new Response(JSON.stringify({
          results: [{
            name: '南京',
            admin1: '江苏省',
            country: '中国',
            latitude: 32.06,
            longitude: 118.79,
            timezone: 'Asia/Shanghai',
          }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.includes('api.open-meteo.com')) {
        return new Response(JSON.stringify({
          daily: {
            time: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21', '2026-06-22'],
            weather_code: [0, 1, 2, 3, 61, 80, 0],
            temperature_2m_max: [32, 33, 34, 31, 30, 29, 32],
            temperature_2m_min: [24, 25, 25, 24, 23, 22, 24],
            precipitation_probability_max: [10, 10, 15, 25, 50, 70, 10],
            wind_speed_10m_max: [8, 9, 9, 10, 12, 13, 8],
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error(`unexpected_url:${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await searchWithProviderAdapter({
      query: '下周日南京天气',
      maxResults: 1,
      locale: 'zh-CN',
      freshness: 'realtime',
    }, {
      id: 'weather-7d',
      kind: 'weather',
      label: '7 天天气预报',
      enabled: true,
      endpoint: 'builtin:weather-7d',
      apiKey: '',
      authType: 'none',
      method: 'GET',
      capabilities: ['search'],
      maxResults: 1,
    }, makePublicWebOverride() as PublicWebConfig);

    expect(result.call.status).toBe('success');
    expect(result.items[0]?.title).toContain('南京');
    expect(result.items[0]?.snippet).toContain('目标日期 2026-06-21');
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/xiaoqiao/web-search'), expect.anything());
  });

  it('honors the Firecrawl endpoint path when legacy fetchMode conflicts with scrape', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      expect(body.url).toBe('https://example.com/article');
      expect(body.urls).toBeUndefined();
      return new Response(JSON.stringify({
        data: {
          markdown: '# Main body',
          title: 'Article',
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchWithProviderAdapter({
      url: 'https://example.com/article',
      timeoutMs: 1000,
    }, {
      id: 'firecrawl',
      kind: 'firecrawl',
      label: 'Firecrawl',
      enabled: true,
      endpoint: 'https://api.firecrawl.dev/v1/scrape',
      apiKey: 'firecrawl-key',
      authType: 'bearer',
      method: 'POST',
      capabilities: ['fetch'],
      fetchMode: 'extract',
    }, {
      ...makePublicWebOverride(),
      providers: [],
    } as PublicWebConfig);

    expect(result.call.status).toBe('success');
    expect(result.item?.markdown).toBe('# Main body');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('blocks unsafe simple_fetch URLs before network access', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const provider = {
      id: 'simple-fetch',
      kind: 'simple_fetch' as const,
      label: 'Simple Fetch',
      enabled: true,
      endpoint: 'builtin:simple-fetch',
      apiKey: '',
      authType: 'none' as const,
      method: 'GET' as const,
      capabilities: ['fetch' as const],
    };
    const config = {
      ...makePublicWebOverride(),
      allowedDomains: ['allowed.example.com'],
      blockedDomains: ['blocked.example.com'],
      providers: [],
    } as PublicWebConfig;

    const cases = [
      ['ftp://allowed.example.com/file', 'simple_fetch_non_http_url'],
      ['http://127.0.0.1/admin', 'simple_fetch_private_ip_blocked'],
      ['http://10.0.0.2/admin', 'simple_fetch_private_ip_blocked'],
      ['http://169.254.169.254/latest/meta-data', 'simple_fetch_metadata_blocked'],
      ['https://metadata.google.internal/computeMetadata/v1', 'simple_fetch_metadata_blocked'],
      ['https://blocked.example.com/page', 'simple_fetch_blocked_domain'],
      ['https://not-allowed.example.com/page', 'simple_fetch_domain_not_allowed'],
    ];

    for (const [url, error] of cases) {
      const result = await fetchWithProviderAdapter({ url }, provider, config);
      expect(result.call.status).toBe('failed');
      expect(result.call.error).toContain(error);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates simple_fetch redirect targets against the same URL policy', async () => {
    const fetchMock = vi.fn(async () => new Response('', {
      status: 302,
      headers: { location: 'http://192.168.0.2/private' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchWithProviderAdapter({
      url: 'https://allowed.example.com/page',
      timeoutMs: 1000,
    }, {
      id: 'simple-fetch',
      kind: 'simple_fetch',
      label: 'Simple Fetch',
      enabled: true,
      endpoint: 'builtin:simple-fetch',
      apiKey: '',
      authType: 'none',
      method: 'GET',
      capabilities: ['fetch'],
    }, {
      ...makePublicWebOverride(),
      allowedDomains: ['allowed.example.com'],
      blockedDomains: [],
      providers: [],
    } as PublicWebConfig);

    expect(result.call.status).toBe('failed');
    expect(result.call.error).toContain('simple_fetch_private_ip_blocked');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('selects Brave for fresh search and Exa for deep research through provider adapter config', () => {
    const config = makePublicWebOverride() as PublicWebConfig;
    const freshProviders = selectSearchProvidersForPlan(config, makeNeed({
      searchPlan: {
        allowed: true,
        role: 'primary_answer',
        depth: 'standard',
        source_policy: 'fresh_news',
        query_strategy: 'live_fact_lookup',
        redaction_policy: 'none',
        queries: [{ query: '下周日南京天气', purpose: 'primary' }],
      },
    }));
    const deepProviders = selectSearchProvidersForPlan(config, makeNeed({
      searchPlan: {
        allowed: true,
        role: 'primary_answer',
        depth: 'deep',
        source_policy: 'multi_source_consensus',
        query_strategy: 'cross_source_compare',
        redaction_policy: 'none',
        queries: [{ query: '最近小游戏买量素材趋势', purpose: 'primary' }],
      },
    }));

    expect(freshProviders.map(provider => provider.kind)).toContain('brave');
    expect(deepProviders.map(provider => provider.kind)).toContain('exa');
  });

  it('searches multiple providers, fetches full content, reranks and extracts evidence', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      calls.push(target);
      if (target.includes('api.search.brave.com')) {
        return Response.json({
          web: {
            results: [
              {
                title: '巨量引擎帮助中心：SKAN 4.0 适配说明',
                url: 'https://help.oceanengine.com/docs/skan4',
                description: '官方帮助中心发布 SKAN 4.0 转化值、回传窗口和粗粒度值说明。',
              },
              {
                title: '无关城市天气',
                url: 'https://weather.invalid.example.com/beijing',
                description: '北京天气测试内容',
              },
            ],
          },
        });
      }
      if (target.includes('api.exa.ai')) {
        return Response.json({
          results: [
            {
              title: '行业分析：SKAN 4.0 对买量归因的影响',
              url: 'https://research.example.org/skan-4-impact',
              text: '多来源分析 SKAN 4.0 对归因窗口、转化值映射和投放优化的影响。',
            },
          ],
        });
      }
      if (target.includes('api.firecrawl.dev')) {
        const body = JSON.parse(String(init?.body || '{}')) as { url?: string; urls?: string[] };
        const fetchUrl = body.url || body.urls?.[0] || '';
        expect(body.urls).toEqual(expect.arrayContaining([expect.stringContaining('https://')]));
        return Response.json({
          data: {
            title: fetchUrl.includes('oceanengine') ? '巨量引擎 SKAN 4.0 官方说明' : 'SKAN 4.0 行业研究',
            markdown: fetchUrl.includes('oceanengine')
              ? '# 巨量引擎 SKAN 4.0 官方说明\n官方帮助中心说明 SKAN 4.0 支持多个回传窗口、粗粒度转化值和隐私阈值变化。'
              : '# SKAN 4.0 行业研究\n行业来源指出 SKAN 4.0 会影响素材优化和归因建模，需要交叉验证。',
            updatedAt: '2026-06-01',
          },
        });
      }
      return Response.json({}, { status: 404 });
    }));

    const result = await withRuntimeConfigOverrides({ publicWeb: makePublicWebOverride() }, () =>
      executePublicWebQuery('巨量引擎 SKAN 4.0 最新变化', makeNeed()));

    expect(result.status).toBe('success');
    expect(calls.some(item => item.includes('api.search.brave.com'))).toBe(true);
    expect(calls.some(item => item.includes('api.firecrawl.dev'))).toBe(true);
    expect(result.sourceRefs.some(source => source.source_type === 'web_fetch')).toBe(true);
    expect(result.answer).toContain('结论');
    expect(result.evidenceItems?.[0]).toEqual(expect.objectContaining({
      source_url: expect.stringContaining('https://'),
      title: expect.any(String),
      snippet: expect.stringContaining('SKAN 4.0'),
      provider: expect.any(String),
      confidence: expect.any(Number),
    }));
    expect(result.searchTrace?.query_rewrite.original_query).toBe('巨量引擎 SKAN 4.0 最新变化');
    expect(result.searchTrace?.provider_calls.length).toBeGreaterThan(0);
    expect(result.searchTrace?.fetch_results.length).toBeGreaterThan(0);
    expect(result.searchTrace?.rerank_scores[0]?.explanation.length).toBeGreaterThan(0);
    expect(result.searchTrace?.research_loop_steps.some(step => (step as { action?: string }).action === 'gap_analysis')).toBe(true);
    expect(result.searchTrace?.answer_origin).toBe('llm_evidence_summary');
    expect(result.retrievalResult).toEqual(expect.objectContaining({
      sourceKind: 'public_search',
      priority: 'public_evidence',
      status: 'success',
    }));
    expect(result.retrievalResult?.evidenceRefs[0]).toEqual(expect.objectContaining({
      type: 'external-reference',
      sourceRefIds: expect.any(Array),
    }));
    expect(JSON.stringify(result)).not.toMatch(/weather\.example\.test|北京天气公开来源/);
  });

  it('keeps search snippets as degraded evidence and marks fetch_failed when Firecrawl fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => {
      const target = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (target.includes('api.search.brave.com')) {
        return Response.json({
          results: [
            {
              title: 'OpenAI Agents SDK 官方发布说明',
              url: 'https://platform.openai.com/docs/agents',
              description: 'OpenAI 官方文档介绍 Agents SDK、工具调用、运行时和评估能力。',
            },
          ],
        });
      }
      if (target.includes('api.firecrawl.dev')) {
        return Response.json({ error: 'temporary unavailable' }, { status: 503 });
      }
      return Response.json({ results: [] });
    }));

    const result = await withRuntimeConfigOverrides({ publicWeb: makePublicWebOverride() }, () =>
      executePublicWebQuery('OpenAI Agent SDK 最新能力', makeNeed({
        searchPlan: {
          allowed: true,
          role: 'primary_answer',
          depth: 'deep',
          source_policy: 'official_first',
          query_strategy: 'official_domain_discovery',
          redaction_policy: 'none',
          queries: [{ query: 'OpenAI Agent SDK 最新能力', purpose: 'primary' }],
        },
      })));

    expect(result.status).toBe('success');
    expect(result.evidenceItems?.[0]?.fetch_failed).toBe(true);
    expect(result.evidenceItems?.[0]?.snippet).toContain('OpenAI');
    expect(result.searchTrace?.fetch_results[0]).toEqual(expect.objectContaining({ status: 'failed' }));
    expect(result.warnings.some(item => item.startsWith('fetch_failed:'))).toBe(true);
  });

  it('discloses conflicting public evidence in research loop trace', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (target.includes('api.search.brave.com')) {
        return Response.json({
          results: [
            {
              title: '平台公告：能力已经开放',
              url: 'https://news.example.com/feature-open',
              description: '官方公告显示该能力已经支持并开放。',
            },
            {
              title: '行业报道：能力暂不可用',
              url: 'https://industry.example.com/feature-closed',
              description: '报道称该能力目前不支持，仍不可用。',
            },
          ],
        });
      }
      if (target.includes('api.firecrawl.dev')) {
        const body = JSON.parse(String(init?.body || '{}')) as { url?: string; urls?: string[] };
        const fetchUrl = body.url || body.urls?.[0] || '';
        return Response.json({
          data: {
            title: fetchUrl.includes('open') ? '平台公告：能力已经开放' : '行业报道：能力暂不可用',
            markdown: fetchUrl.includes('open')
              ? '该能力已经支持并开放。'
              : '该能力目前不支持，仍不可用。',
          },
        });
      }
      return Response.json({ results: [] });
    }));

    const result = await withRuntimeConfigOverrides({ publicWeb: makePublicWebOverride() }, () =>
      executePublicWebQuery('某平台能力最新变化', makeNeed({
        searchPlan: {
          allowed: true,
          role: 'primary_answer',
          depth: 'deep',
          source_policy: 'multi_source_consensus',
          query_strategy: 'cross_source_compare',
          redaction_policy: 'none',
          queries: [{ query: '某平台能力最新变化', purpose: 'primary' }],
        },
      })));

    expect(result.status).toBe('success');
    expect(result.searchTrace?.conflicts.length).toBeGreaterThan(0);
    expect(result.searchTrace?.research_loop_steps.some(step => (step as { action?: string }).action === 'conflict_detection')).toBe(true);
  });

  it('prefers Chinese high quality sources for Chinese queries during rerank', () => {
    const config = makePublicWebOverride() as PublicWebConfig;
    const need = makeNeed();
    const ranked = rerankSearchItems('巨量引擎 SKAN 4.0 最新变化', [
      {
        title: 'Random SKAN 4.0 SEO page',
        url: 'https://seo.example.org/skan',
        snippet: 'Generic English page with repeated keywords and little authority.',
        provider: 'exa',
      },
      {
        title: '巨量引擎帮助中心：SKAN 4.0 适配说明',
        url: 'https://help.oceanengine.com/docs/skan4',
        snippet: '官方帮助中心说明 SKAN 4.0 最新变化。',
        provider: 'brave',
      },
    ], new Map(), config, need);

    expect(ranked[0].item.url).toContain('help.oceanengine.com');
    expect(ranked[0].score.language_match).toBeGreaterThan(ranked[1].score.language_match);
  });
});
