import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectPublicWebNeed, executePublicWebQuery, type PublicWebNeed } from '../src/lib/public-web-runtime';
import { withRuntimeConfigOverrides, type PublicWebConfig } from '../src/lib/runtime-config';

vi.mock('../src/lib/model-router', () => ({
  generateModelText: vi.fn(async () => ({
    text: '结论：基于 evidence_items 汇总。\n依据摘要：仅使用已抓取正文和检索证据。\n关键来源：见 source_refs。\n不确定性：见 conflicts 与 warnings。',
    warnings: [],
  })),
}));

function publicWebConfig(): Partial<PublicWebConfig> {
  return {
    enabled: true,
    searchEndpoint: '',
    fetchEndpoint: '',
    maxResults: 5,
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
        maxResults: 5,
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
        maxResults: 5,
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
      maxFetchPages: 3,
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

function makeNeed(query: string, overrides: Partial<PublicWebNeed> = {}): PublicWebNeed {
  return {
    required: true,
    primaryGoal: 'fetch_external_public_info',
    capabilityType: 'web_search',
    realtime: false,
    sourceRequired: true,
    reasonCode: 'public_web.need_detected',
    confidence: 0.9,
    factNeed: {
      answer_shape: 'trend_or_summary',
      fact_visibility: 'public',
      authority_need: 'multi_source_consensus',
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
      depth: 'deep',
      source_policy: 'multi_source_consensus',
      query_strategy: 'cross_source_compare',
      redaction_policy: 'none',
      queries: [{ query, purpose: 'primary' }],
      reasons: ['high_risk_or_consensus_needed'],
    },
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('search orchestrator acceptance cases', () => {
  it('keeps Nanjing weather as realtime public info without Beijing or test-source pollution', async () => {
    const need = await detectPublicWebNeed('下周日南京天气');

    expect(need.required).toBe(true);
    expect(need.searchPlan?.query_strategy).toBe('live_fact_lookup');
    expect(JSON.stringify(need)).toContain('南京');
    expect(JSON.stringify(need)).not.toMatch(/北京天气公开来源|weather\.example\.test/);
  });

  it('searches, fetches and cites official/high-quality sources for SKAN 4.0 updates', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (target.includes('api.search.brave.com')) {
        return Response.json({
          results: [
            {
              title: '巨量引擎帮助中心 SKAN 4.0 最新变化',
              url: 'https://help.oceanengine.com/docs/skan4-update',
              description: '官方帮助中心说明 SKAN 4.0 最新变化和适配建议。',
            },
          ],
        });
      }
      if (target.includes('api.exa.ai')) {
        return Response.json({ results: [] });
      }
      if (target.includes('api.firecrawl.dev')) {
        return Response.json({
          data: {
            title: '巨量引擎帮助中心 SKAN 4.0 最新变化',
            markdown: '官方帮助中心正文：SKAN 4.0 最新变化包括回传窗口、粗粒度转化值和隐私阈值说明。',
            updatedAt: '2026-06-01',
          },
        });
      }
      return Response.json({ results: [] });
    }));

    const result = await withRuntimeConfigOverrides({ publicWeb: publicWebConfig() }, () =>
      executePublicWebQuery('巨量引擎 SKAN 4.0 最新变化', makeNeed('巨量引擎 SKAN 4.0 最新变化', {
        factNeed: {
          answer_shape: 'status_update',
          fact_visibility: 'public',
          authority_need: 'official_source',
          freshness_need: 'recent',
          sensitivity: 'none',
          consequence_risk: 'high',
          ambiguity: [],
        },
        searchPlan: {
          allowed: true,
          role: 'primary_answer',
          depth: 'standard',
          source_policy: 'official_first',
          query_strategy: 'official_domain_discovery',
          redaction_policy: 'none',
          queries: [{ query: '巨量引擎 SKAN 4.0 最新变化', purpose: 'primary' }],
        },
      })));

    expect(result.status).toBe('success');
    expect(result.sourceRefs.some(source => source.url?.includes('help.oceanengine.com'))).toBe(true);
    expect(result.evidenceItems?.some(item => item.fetched && item.snippet.includes('SKAN 4.0'))).toBe(true);
    expect(result.searchTrace?.answer_origin).toBe('llm_evidence_summary');
  });

  it('uses multi-source search, full-content extraction and evidence merge for mini-game ad creative trends', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (target.includes('api.search.brave.com')) {
        return Response.json({
          results: [{
            title: '小游戏买量素材趋势观察',
            url: 'https://news.example.com/minigame-creative-trend',
            description: '近期小游戏买量素材趋势包括短视频节奏和试玩素材。',
          }],
        });
      }
      if (target.includes('api.exa.ai')) {
        return Response.json({
          results: [{
            title: '小游戏素材行业研究',
            url: 'https://research.example.com/minigame-ads',
            text: '行业研究指出小游戏买量素材趋势需要结合多来源验证。',
          }],
        });
      }
      if (target.includes('api.firecrawl.dev')) {
        const body = JSON.parse(String(init?.body || '{}')) as { url?: string; urls?: string[] };
        const fetchUrl = body.url || body.urls?.[0] || '';
        return Response.json({
          data: {
            title: fetchUrl.includes('research') ? '小游戏素材行业研究' : '小游戏买量素材趋势观察',
            markdown: fetchUrl.includes('research')
              ? '行业研究正文：小游戏买量素材趋势包括试玩、强反馈和短时长卖点表达。'
              : '新闻正文：近期小游戏买量素材趋势包括短视频节奏和试玩素材。',
          },
        });
      }
      return Response.json({ results: [] });
    }));

    const result = await withRuntimeConfigOverrides({ publicWeb: publicWebConfig() }, () =>
      executePublicWebQuery('最近小游戏买量素材趋势', makeNeed('最近小游戏买量素材趋势')));

    expect(result.status).toBe('success');
    expect(new Set(result.sourceRefs.map(source => source.url)).size).toBeGreaterThanOrEqual(2);
    expect(result.searchTrace?.provider_calls.some(call => call.provider_kind === 'brave')).toBe(true);
    expect(result.searchTrace?.provider_calls.some(call => call.provider_kind === 'exa')).toBe(true);
    expect(result.evidenceItems?.filter(item => item.fetched).length).toBeGreaterThanOrEqual(2);
  });

  it('keeps Android ROI decline as internal business analysis instead of public-search authority', async () => {
    const need = await detectPublicWebNeed('为什么安卓 ROI 最近下降', {
      context: {
        routeIntent: 'report_query',
        hasInternalBusinessSignal: true,
      },
    });

    expect(need.required).toBe(false);
    expect(need.reasonCode).toBe('public_web.internal_business_data');
    expect(need.searchPlan?.allowed).toBe(false);
    expect(need.factNeed?.authority_need).toBe('system_of_record');
  });

  it('rewrites, searches official sources, fetches content and summarizes OpenAI Agent SDK capabilities from evidence', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => {
      const target = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (target.includes('api.search.brave.com')) {
        return Response.json({
          results: [{
            title: 'OpenAI Agents SDK 官方文档',
            url: 'https://platform.openai.com/docs/agents',
            description: 'OpenAI 官方文档介绍 Agents SDK 工具调用、运行、追踪和评估能力。',
          }],
        });
      }
      if (target.includes('api.exa.ai')) {
        return Response.json({ results: [] });
      }
      if (target.includes('api.firecrawl.dev')) {
        return Response.json({
          data: {
            title: 'OpenAI Agents SDK 官方文档',
            markdown: 'OpenAI Agents SDK 官方正文：支持工具调用、运行编排、追踪和评估。',
            updatedAt: '2026-06-01',
          },
        });
      }
      return Response.json({ results: [] });
    }));

    const result = await withRuntimeConfigOverrides({ publicWeb: publicWebConfig() }, () =>
      executePublicWebQuery('OpenAI Agent SDK 最新能力', makeNeed('OpenAI Agent SDK 最新能力', {
        factNeed: {
          answer_shape: 'status_update',
          fact_visibility: 'public',
          authority_need: 'official_source',
          freshness_need: 'recent',
          sensitivity: 'none',
          consequence_risk: 'high',
          ambiguity: [],
        },
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
    expect((result.searchTrace?.query_rewrite.rewritten_queries || []).length).toBeGreaterThan(1);
    expect(result.sourceRefs.some(source => source.url?.includes('platform.openai.com'))).toBe(true);
    expect(result.answer).toContain('结论');
    expect(result.searchTrace?.answer_origin).toBe('llm_evidence_summary');
  });
});
