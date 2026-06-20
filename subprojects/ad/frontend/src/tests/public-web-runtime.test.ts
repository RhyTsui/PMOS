import { afterEach, describe, expect, it, vi } from 'vitest';
import { callSearchProvider, detectPublicWebNeed, executePublicWebQuery } from '../src/lib/public-web-runtime';
import { getPublicWebConfig, updatePublicWebConfig } from '../src/lib/runtime-config';
import { generateModelText } from '../src/lib/model-router';

vi.mock('../src/lib/model-router', () => ({
  generateModelText: vi.fn(),
}));

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe('public web runtime safety', () => {
  const substantiveGeneralQuestion = ['青灯微雨', '一夜春声', '请帮我判断'].join('，');

  it('rejects synthetic public web endpoints before any network call', async () => {
    globalThis.fetch = vi.fn() as typeof fetch;

    await expect(callSearchProvider({
      query: '下周日南京的天气',
      maxResults: 3,
    }, {
      enabled: true,
      providerLabel: 'Fake Public Web',
      searchEndpoint: 'fake:public-web',
      fetchEndpoint: '',
      apiKey: '',
      authType: 'none',
      apiKeyHeader: 'X-API-Key',
      headers: {},
      method: 'GET',
      queryParam: 'q',
      resultsPath: '',
      titlePath: 'title',
      urlPath: 'url',
      snippetPath: 'snippet',
      siteNamePath: 'siteName',
      publisherPath: 'publisher',
      allowedDomains: [],
      blockedDomains: [],
      maxResults: 3,
      timeoutMs: 1000,
      cacheTtl: 0,
      sourceRequired: true,
      internalDataProtection: true,
      needRules: {
        defaultGeneralLookup: false,
        defaultLookupRouteIntents: [],
        excludedRouteIntents: [],
        configQuestionSignals: [],
        realtimeSignals: [],
        externalSignals: [],
        explicitSearchSignals: [],
        businessDataSignals: [],
        strongPublicSignals: [],
        internalDataPatterns: [],
      },
    })).rejects.toThrow('unsafe_public_web_endpoint');

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('clears unsafe endpoints during runtime config normalization', async () => {
    const original = await getPublicWebConfig();
    try {
      const updated = await updatePublicWebConfig({
        ...original,
        enabled: true,
        searchEndpoint: 'https://search.example.test/query',
        fetchEndpoint: 'https://fetch.example.test/page',
      });

      expect(updated.searchEndpoint).toBe('');
      expect(updated.fetchEndpoint).toBe('');

      const selfReferential = await updatePublicWebConfig({
        ...updated,
        searchEndpoint: 'http://10.236.14.27:8002/api/xiaoqiao/web-search',
      });

      expect(selfReferential.searchEndpoint).toBe('');
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('uses the 7-day weather provider instead of calling a self-referential public search endpoint', async () => {
    const original = await getPublicWebConfig();
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
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      await updatePublicWebConfig({
        ...original,
        enabled: true,
        searchEndpoint: 'http://10.236.14.27:8002/api/xiaoqiao/web-search',
        fetchEndpoint: '',
      });

      const result = await executePublicWebQuery('下周日南京天气', {
        required: true,
        primaryGoal: 'fetch_external_public_info',
        capabilityType: 'web_search',
        realtime: true,
        sourceRequired: true,
        confidence: 0.91,
        reasonCode: 'public_web.need_detected',
        factNeed: {
          answer_shape: 'specific_value',
          fact_visibility: 'public',
          authority_need: 'official_source',
          freshness_need: 'live',
          sensitivity: 'none',
          consequence_risk: 'medium',
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
          query_strategy: 'live_fact_lookup',
          redaction_policy: 'none',
          queries: [{ query: '下周日南京天气', purpose: 'primary' }],
          reasons: ['weather_live_source_required'],
        },
      });

      expect(result.status).toBe('success');
      expect(result.reasonCode).toBe('public_web.need_detected');
      expect(result.sourceRefs[0]?.title).toContain('南京');
      expect(result.evidenceItems?.[0]?.provider).toBe('weather-7d');
      expect(result.evidenceItems?.[0]?.snippet).toContain('目标日期 2026-06-21');
      expect(result.answer).not.toContain('北京');
      expect(result.answer).not.toContain('weather.example.test');
      expect(result.answer).not.toContain('未配置');
      expect(result.answer).not.toContain('公共网页能力');
      expect(result.answer).not.toContain('外部检索');
      expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/xiaoqiao/web-search'), expect.anything());
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('uses default public lookup for substantive general questions without keyword examples', async () => {
    const original = await getPublicWebConfig();
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general', 'help'],
          excludedRouteIntents: ['report_query', 'diagnosis', 'debugging'],
          configQuestionSignals: [],
          realtimeSignals: [],
          externalSignals: [],
          explicitSearchSignals: [],
          businessDataSignals: [],
          strongPublicSignals: [],
          internalDataPatterns: [],
        },
      });

      const generalNeed = await detectPublicWebNeed(substantiveGeneralQuestion, {
        context: { routeIntent: 'general' },
      });
      const shortGreetingNeed = await detectPublicWebNeed('你好', {
        context: { routeIntent: 'general' },
      });
      const reportNeed = await detectPublicWebNeed(substantiveGeneralQuestion, {
        context: { routeIntent: 'report_query' },
      });

      expect(generalNeed.required).toBe(true);
      expect(generalNeed.reasonCode).toBe('public_web.default_general_lookup');
      expect(generalNeed.capabilityType).toBe('public_web_qa');
      expect(shortGreetingNeed.required).toBe(false);
      expect(reportNeed.required).toBe(false);
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('does not default to public lookup for internal advertising data questions', async () => {
    const original = await getPublicWebConfig();
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general'],
          excludedRouteIntents: ['report_query', 'diagnosis', 'debugging'],
          configQuestionSignals: [],
          realtimeSignals: ['今天', '当前'],
          externalSignals: [],
          explicitSearchSignals: [],
          businessDataSignals: [],
          strongPublicSignals: [],
          internalDataPatterns: [],
        },
      });

      const need = await detectPublicWebNeed('今天巨量消耗多少', {
        context: { routeIntent: 'general', hasInternalBusinessSignal: true },
      });

      expect(need.required).toBe(false);
      expect(need.reasonCode).toBe('public_web.internal_business_data');
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('does not default to public lookup for internal workflow questions', async () => {
    const original = await getPublicWebConfig();
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general'],
          excludedRouteIntents: ['report_query', 'diagnosis', 'debugging'],
          configQuestionSignals: [],
          realtimeSignals: ['当前'],
          externalSignals: [],
          explicitSearchSignals: [],
          businessDataSignals: [],
          strongPublicSignals: [],
          internalDataPatterns: [],
        },
      });

      const need = await detectPublicWebNeed('获取可用包并发起联调', {
        context: { routeIntent: 'general', hasInternalBusinessSignal: true },
      });

      expect(need.required).toBe(false);
      expect(need.reasonCode).toBe('public_web.internal_business_data');
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('does not let business keyword lists become routing authority without structured internal signal', async () => {
    const original = await getPublicWebConfig();
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general'],
          excludedRouteIntents: [],
          configQuestionSignals: [],
          realtimeSignals: [],
          externalSignals: ['公开'],
          explicitSearchSignals: [],
          businessDataSignals: ['投放', 'ROI', '报表'],
          strongPublicSignals: [],
          internalDataPatterns: [],
        },
      });

      const publicNeed = await detectPublicWebNeed('公开资料里 ROI 是怎么定义的', {
        context: { routeIntent: 'general' },
      });
      const internalNeed = await detectPublicWebNeed('公开资料里 ROI 是怎么定义的', {
        context: { routeIntent: 'general', hasInternalBusinessSignal: true },
      });

      expect(publicNeed.required).toBe(true);
      expect(publicNeed.reasonCode).toBe('public_web.need_detected');
      expect(internalNeed.required).toBe(false);
      expect(internalNeed.reasonCode).toBe('public_web.internal_business_data');
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('does not call chat_answer classifier for high-confidence public evidence signals', async () => {
    const original = await getPublicWebConfig();
    vi.mocked(generateModelText).mockRejectedValue(new Error('chat_answer classifier should not run'));
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general'],
          excludedRouteIntents: ['report_query', 'diagnosis', 'debugging'],
          configQuestionSignals: [],
          realtimeSignals: ['天气', '本周', '周日'],
          externalSignals: [],
          explicitSearchSignals: [],
          businessDataSignals: [],
          strongPublicSignals: [],
          internalDataPatterns: [],
        },
      });

      const need = await detectPublicWebNeed('南京本周日天气如何', {
        context: { routeIntent: 'general' },
        modelServiceConfig: {} as any,
      });

      expect(need.required).toBe(true);
      expect(need.reasonCode).toBe('public_web.need_detected');
      expect(need.sourceRequired).toBe(true);
      expect(need.searchPlan?.source_policy).toBe('fresh_news');
      expect(need.searchPlan?.query_strategy).toBe('live_fact_lookup');
      expect((need.searchPlan?.queries || []).map(item => item.query).join('\n')).not.toMatch(/\bofficial\b/i);
      expect(generateModelText).not.toHaveBeenCalled();
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('keeps live public fact lookup relevant without requiring official-domain query terms', async () => {
    const original = await getPublicWebConfig();
    const queries: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      queries.push(url.searchParams.get('q') || '');
      return new Response(JSON.stringify({
        results: [
          {
            title: '南京天气预报',
            url: 'https://weather.example.com/nanjing',
            snippet: '南京本周日天气预报：2026年6月21日多云，气温 24-31℃。',
            siteName: 'Weather Service',
          },
        ],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    try {
      await updatePublicWebConfig({
        ...original,
        enabled: true,
        providers: (original.providers || []).map(provider => ({ ...provider, enabled: false })),
        searchEndpoint: 'https://search.example.com/query',
        method: 'GET',
        queryParam: 'q',
        resultsPath: 'results',
        titlePath: 'title',
        urlPath: 'url',
        snippetPath: 'snippet',
        siteNamePath: 'siteName',
        maxResults: 5,
        needRules: {
          ...original.needRules,
          realtimeSignals: ['天气', '本周', '周日'],
          strongPublicSignals: ['天气'],
        },
      });

      const need = await detectPublicWebNeed('南京本周日天气如何', {
        context: { routeIntent: 'general' },
        modelServiceConfig: {} as any,
      });
      const result = await executePublicWebQuery('南京本周日天气如何', need);

      expect(need.searchPlan?.query_strategy).toBe('live_fact_lookup');
      expect(queries.some(query => /\bofficial\b/i.test(query))).toBe(false);
      expect(result.status).toBe('success');
      expect(result.sourceRefs).toHaveLength(1);
      expect(result.sourceRefs[0]?.title).toContain('南京天气');
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('does not treat a help route label as private enterprise evidence by itself', async () => {
    const original = await getPublicWebConfig();
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          ...original.needRules,
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general', 'help'],
          excludedRouteIntents: ['report_query', 'diagnosis', 'debugging'],
        },
      });

      const need = await detectPublicWebNeed('南京本周日天气如何', {
        context: { routeIntent: 'help', hasInternalBusinessSignal: false },
      });

      expect(need.required).toBe(true);
      expect(need.reasonCode).toBe('public_web.need_detected');
      expect(need.factNeed?.fact_visibility).toBe('public');
      expect(need.providerEligibility?.eligible).toBe(true);
      expect(need.searchPlan?.allowed).toBe(true);
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('treats explicit public URLs as public evidence even when business context exists', async () => {
    const original = await getPublicWebConfig();
    vi.mocked(generateModelText).mockRejectedValue(new Error('chat_answer classifier should not run for explicit url'));
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general', 'help'],
          excludedRouteIntents: ['report_query', 'diagnosis', 'debugging'],
          configQuestionSignals: [],
          realtimeSignals: [],
          externalSignals: [],
          explicitSearchSignals: [],
          businessDataSignals: [],
          strongPublicSignals: [],
          internalDataPatterns: [],
        },
      });

      const need = await detectPublicWebNeed('https://open.example.com/docs 回传文档在哪', {
        context: { routeIntent: 'help', hasInternalBusinessSignal: true },
        modelServiceConfig: {} as any,
      });

      expect(need.required).toBe(true);
      expect(need.reasonCode).toBe('public_web.need_detected');
      expect(need.sourceRequired).toBe(true);
      expect(need.searchPlan?.allowed).toBe(true);
      expect(generateModelText).not.toHaveBeenCalled();
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('does not default to public lookup for help or capability explanation turns', async () => {
    const original = await getPublicWebConfig();
    vi.mocked(generateModelText).mockResolvedValue({
      text: JSON.stringify({
        required: false,
        reason: 'help route should use local capability context unless public evidence is explicitly needed',
        reasonCode: 'public_web.need_not_detected',
        capabilityType: 'public_web_qa',
        sourceRequired: false,
        confidence: 0.82,
        policy: 'llm',
      }),
      source: 'model',
      participation: {} as any,
      warnings: [],
    } as any);
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general', 'help'],
          excludedRouteIntents: ['report_query', 'diagnosis', 'debugging'],
          configQuestionSignals: [],
          realtimeSignals: [],
          externalSignals: [],
          explicitSearchSignals: [],
          businessDataSignals: [],
          strongPublicSignals: [],
          internalDataPatterns: [],
        },
      });

      const need = await detectPublicWebNeed('你好，请用一句话说明你现在可以帮我做什么。', {
        context: { routeIntent: 'help' },
        modelServiceConfig: {} as any,
      });

      expect(need.required).toBe(false);
      expect(need.reasonCode).toBe('public_web.need_not_detected');
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('does not hard-exclude help route from planner-approved public lookup', async () => {
    const original = await getPublicWebConfig();
    vi.mocked(generateModelText).mockResolvedValue({
      text: JSON.stringify({
        required: true,
        reason: 'planner selected public evidence as an optional candidate',
        reasonCode: 'public_web.need_detected',
        capabilityType: 'public_web_qa',
        sourceRequired: false,
        confidence: 0.84,
        policy: 'llm',
      }),
      source: 'model',
      participation: {} as any,
      warnings: [],
    } as any);
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general', 'help'],
          excludedRouteIntents: ['report_query', 'diagnosis', 'debugging'],
          configQuestionSignals: [],
          realtimeSignals: [],
          externalSignals: [],
          explicitSearchSignals: [],
          businessDataSignals: [],
          strongPublicSignals: [],
          internalDataPatterns: [],
        },
      });

      const config = await getPublicWebConfig();
      expect(config.needRules.defaultLookupRouteIntents).toContain('help');
      expect(config.needRules.excludedRouteIntents).not.toContain('help');

      const need = await detectPublicWebNeed('你好，请说明你可以结合哪些公开资料帮助我。', {
        context: { routeIntent: 'help' },
        modelServiceConfig: {} as any,
      });

      expect(need.required).toBe(true);
      expect(need.policy).toBe('llm');
      expect(need.reasonCode).toBe('public_web.need_detected');
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('lets LLM planner suppress default general public lookup when public evidence is not needed', async () => {
    const original = await getPublicWebConfig();
    vi.mocked(generateModelText).mockResolvedValue({
      text: JSON.stringify({
        required: false,
        reason: 'assistant capability question should use local capability context',
        reasonCode: 'public_web.need_not_detected',
        capabilityType: 'public_web_qa',
        sourceRequired: false,
        confidence: 0.86,
        policy: 'llm',
      }),
      source: 'model',
      participation: {} as any,
      warnings: [],
    } as any);
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general'],
          excludedRouteIntents: ['help', 'report_query', 'diagnosis', 'debugging'],
          configQuestionSignals: [],
          realtimeSignals: [],
          externalSignals: [],
          explicitSearchSignals: [],
          businessDataSignals: [],
          strongPublicSignals: [],
          internalDataPatterns: [],
        },
      });

      const need = await detectPublicWebNeed('你好，请用一句话说明你现在可以帮我做什么。', {
        context: { routeIntent: 'general' },
        modelServiceConfig: {} as any,
      });

      expect(need.required).toBe(false);
      expect(need.reasonCode).toBe('public_web.need_not_detected');
      expect(need.policy).toBe('llm');
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('treats time-sensitive public event location questions as public evidence candidates without sample-answer rules', async () => {
    const original = await getPublicWebConfig();
    try {
      await updatePublicWebConfig({
        ...original,
        needRules: {
          ...original.needRules,
          defaultGeneralLookup: true,
          defaultLookupRouteIntents: ['general'],
          excludedRouteIntents: ['report_query', 'diagnosis', 'debugging'],
        },
      });

      const need = await detectPublicWebNeed('今年国际赛事在哪里举行', {
        context: { routeIntent: 'general' },
      });

      expect(need.required).toBe(true);
      expect(need.reasonCode).toBe('public_web.need_detected');
      expect(need.sourceRequired).toBe(true);
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('does not treat low relevance search results as reliable public evidence', async () => {
    const original = await getPublicWebConfig();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      results: [
        {
          title: '弦（汉语文字）_百科',
          url: 'https://baike.example.com/item/xian',
          snippet: '弦的本义是弓弦，也指乐器上用以发声的细线。',
          siteName: 'baike.example.com',
        },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    try {
      await updatePublicWebConfig({
        ...original,
        enabled: true,
        searchEndpoint: 'https://search.example.com/query',
        method: 'GET',
        resultsPath: 'results',
        titlePath: 'title',
        urlPath: 'url',
        snippetPath: 'snippet',
        siteNamePath: 'siteName',
      });

      const result = await executePublicWebQuery(substantiveGeneralQuestion, {
        required: true,
        primaryGoal: 'fetch_external_public_info',
        capabilityType: 'public_web_qa',
        sourceRequired: true,
        reasonCode: 'public_web.default_general_lookup',
        policy: 'heuristic',
        confidence: 0.72,
      });

      expect(result.status).toBe('failed');
      expect(result.sourceRefs).toHaveLength(0);
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('filters URL-shell matches that are unrelated to the requested document topic', async () => {
    const original = await getPublicWebConfig();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      results: [
        {
          title: 'HTTPS 安全协议介绍',
          url: 'https://security.example.com/https',
          snippet: 'HTTPS 的安全性依赖 SSL 与 TLS 加密协议。',
          siteName: 'Security Docs',
        },
        {
          title: 'HTTPS 与 HTTP 的区别',
          url: 'https://network.example.com/http',
          snippet: 'HTTPS 目前是网站标配，提供安全通信。',
          siteName: 'Network Reference',
        },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    try {
      await updatePublicWebConfig({
        ...original,
        enabled: true,
        searchEndpoint: 'https://search.example.com/query',
        method: 'GET',
        resultsPath: 'results',
        titlePath: 'title',
        urlPath: 'url',
        snippetPath: 'snippet',
        siteNamePath: 'siteName',
      });

      const result = await executePublicWebQuery('https://open.oceanengine.com/labels/7 监测回传文档在哪', {
        required: true,
        primaryGoal: 'fetch_external_public_info',
        capabilityType: 'web_search',
        sourceRequired: true,
        reasonCode: 'public_web.need_detected',
        policy: 'heuristic',
        confidence: 0.9,
        metadata: { explicit_public_url: true },
        searchPlan: {
          allowed: true,
          role: 'primary_answer',
          depth: 'shallow',
          source_policy: 'stable_reference',
          query_strategy: 'background_reference',
          redaction_policy: 'none',
          reasons: ['generic_public_evidence_needed'],
          queries: [{ query: 'https://open.oceanengine.com/labels/7 监测回传文档在哪', purpose: 'primary' }],
        },
      });

      expect(result.status).toBe('failed');
      expect(result.sourceRefs).toHaveLength(0);
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('filters weak dictionary-like sources from default open-answer lookup', async () => {
    const original = await getPublicWebConfig();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      results: [
        {
          title: '你好（汉语词语）_百科',
          url: 'https://baike.example.com/item/hello',
          snippet: '你好是汉语常用问候语，主要用于礼貌性打招呼或请教问题前的问候。',
          siteName: 'baike.example.com',
        },
        {
          title: '你好 - 词典',
          url: 'https://dict.example.com/hello',
          snippet: '用于见面时的问候。',
          siteName: 'dict.example.com',
        },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    try {
      await updatePublicWebConfig({
        ...original,
        enabled: true,
        searchEndpoint: 'https://search.example.com/query',
        method: 'GET',
        resultsPath: 'results',
        titlePath: 'title',
        urlPath: 'url',
        snippetPath: 'snippet',
        siteNamePath: 'siteName',
      });

      const result = await executePublicWebQuery('你好，你现在可以帮我做什么。', {
        required: true,
        primaryGoal: 'fetch_external_public_info',
        capabilityType: 'public_web_qa',
        sourceRequired: false,
        reasonCode: 'public_web.default_general_lookup',
        policy: 'heuristic',
        confidence: 0.72,
      });

      expect(result.status).toBe('failed');
      expect(result.sourceRefs).toHaveLength(0);
      expect(result.processEvents.some(event => JSON.stringify(event.output || {}).includes('min_relevance_score'))).toBe(true);
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('retries transient provider failures and records retry attempts', async () => {
    const original = await getPublicWebConfig();
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [
          {
            title: 'Public agency update 2026',
            url: 'https://updates.example.com/story',
            snippet: '2026年6月，public agency released a current update for the topic.',
            siteName: 'Daily News',
          },
        ],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await updatePublicWebConfig({
        ...original,
        enabled: true,
        searchEndpoint: 'https://search.example.com/query',
        method: 'GET',
        resultsPath: 'results',
        titlePath: 'title',
        urlPath: 'url',
        snippetPath: 'snippet',
        siteNamePath: 'siteName',
        timeoutMs: 1000,
      });

      const result = await executePublicWebQuery('public agency update 2026', {
        required: true,
        primaryGoal: 'fetch_external_public_info',
        capabilityType: 'public_web_qa',
        sourceRequired: true,
        reasonCode: 'public_web.default_general_lookup',
        policy: 'heuristic',
        confidence: 0.72,
        factNeed: {
          answer_shape: 'status_update',
          fact_visibility: 'public',
          authority_need: 'expert_synthesis',
          freshness_need: 'recent',
          sensitivity: 'none',
          consequence_risk: 'medium',
          ambiguity: [],
        },
        searchPlan: {
          allowed: true,
          role: 'primary_answer',
          depth: 'standard',
          source_policy: 'fresh_news',
          query_strategy: 'fresh_update_search',
          redaction_policy: 'none',
          queries: [{ query: 'public agency update 2026', purpose: 'primary' }],
        },
      });

      expect(result.status).toBe('success');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const successEvent = result.processEvents.find(event => event.type === 'web.result' && event.status === 'success');
      expect(JSON.stringify(successEvent?.output || {})).toContain('"provider_attempts"');
      expect(JSON.stringify(successEvent?.output || {})).toContain('"error_kind":"network"');
    } finally {
      await updatePublicWebConfig(original);
    }
  });

  it('filters weak reference and community sources for fresh public evidence', async () => {
    const original = await getPublicWebConfig();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      results: [
        {
          title: 'Topic 2026 _百科',
          url: 'https://baike.example.com/item/topic',
          snippet: '2026年6月的背景介绍，但属于百科参考资料。',
          siteName: '百科',
        },
        {
          title: 'Topic 2026 - 问答社区',
          url: 'https://community.example.com/topic',
          snippet: '2 天前，用户讨论该话题。',
          siteName: '问答社区',
        },
        {
          title: 'Topic latest public update 2026',
          url: 'https://news.example.com/topic',
          snippet: '1 天前，news report covers the latest public update for this topic.',
          siteName: 'Daily News',
        },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    try {
      await updatePublicWebConfig({
        ...original,
        enabled: true,
        searchEndpoint: 'https://search.example.com/query',
        method: 'GET',
        resultsPath: 'results',
        titlePath: 'title',
        urlPath: 'url',
        snippetPath: 'snippet',
        siteNamePath: 'siteName',
      });

      const result = await executePublicWebQuery('Topic latest public update 2026', {
        required: true,
        primaryGoal: 'fetch_external_public_info',
        capabilityType: 'public_web_qa',
        sourceRequired: true,
        reasonCode: 'public_web.default_general_lookup',
        policy: 'heuristic',
        confidence: 0.72,
        factNeed: {
          answer_shape: 'status_update',
          fact_visibility: 'public',
          authority_need: 'expert_synthesis',
          freshness_need: 'recent',
          sensitivity: 'none',
          consequence_risk: 'medium',
          ambiguity: [],
        },
        searchPlan: {
          allowed: true,
          role: 'primary_answer',
          depth: 'standard',
          source_policy: 'fresh_news',
          query_strategy: 'fresh_update_search',
          redaction_policy: 'none',
          queries: [{ query: 'Topic latest public update 2026', purpose: 'primary' }],
        },
      });

      expect(result.status).toBe('success');
      expect(result.sourceRefs).toHaveLength(1);
      expect(result.sourceRefs[0]?.url).toContain('news.example.com');
      const outputText = JSON.stringify(result.processEvents.find(event => event.type === 'web.result')?.output || {});
      expect(outputText).toContain('weak_source_quality:reference');
      expect(outputText).toContain('weak_source_quality:community');
      expect(outputText).toContain('source_quality_counts');
    } finally {
      await updatePublicWebConfig(original);
    }
  });

});
