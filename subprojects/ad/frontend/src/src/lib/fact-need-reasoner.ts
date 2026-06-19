import {
  DEFAULT_PROVIDER_AUTHORITY_PROFILES,
  type EvidenceProvider,
  type FactAnswerShape,
  type FactAuthorityNeed,
  type FactFreshnessNeed,
  type FactNeed,
  type FactSensitivity,
  type FactVisibility,
  type ProviderAuthorityProfile,
  type ProviderEligibility,
  type ProviderRole,
  type SearchPlan,
  type SearchPlanQuery,
} from '@/contracts/request-understanding/fact-need-contract';

export interface FactNeedReasoningContext {
  routeIntent?: string;
  conversationIntent?: string;
  routeReason?: string;
  hasInternalBusinessSignal?: boolean;
}

export interface FactNeedPublicSignals {
  hasRealtime: boolean;
  hasExternal: boolean;
  explicitSearch: boolean;
  hasStrongPublicSignal: boolean;
  hasConfigQuestion: boolean;
  defaultGeneralLookupCandidate: boolean;
}

export interface FactNeedReasoningInput {
  message: string;
  context?: FactNeedReasoningContext;
  publicSignals?: Partial<FactNeedPublicSignals>;
}

function normalize(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function hasPattern(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function inferAnswerShape(text: string): FactAnswerShape {
  if (hasPattern(text, /(怎么|如何|怎样|步骤|配置|处理|how\s+to|guide)/i)) return 'how_to';
  if (hasPattern(text, /(为什么|原因|诊断|排查|异常|下降|上升|波动|root\s*cause)/i)) return 'diagnosis';
  if (hasPattern(text, /(推荐|建议|选择|选型|哪个好|best|recommend)/i)) return 'recommendation';
  if (hasPattern(text, /(对比|比较|区别|差异|compare|versus|vs\.?)/i)) return 'comparison';
  if (hasPattern(text, /(趋势|总结|概览|复盘|分析|新闻|动态|summary|trend|news)/i)) return 'trend_or_summary';
  if (hasPattern(text, /(列表|清单|安排|日程|排期|计划|calendar|list)/i)) return 'list_or_schedule';
  if (hasPattern(text, /(是否|是不是|有没有|会不会|能否|能不能|真要|whether|will\s+.*\?|has\s+.*\?)/i)) return 'status_update';
  if (hasPattern(text, /(最新|更新|公告|状态|进展|变化|发布|latest|update|status|release)/i)) return 'status_update';
  if (hasPattern(text, /(什么是|定义|含义|是什么|definition|meaning)/i)) return 'definition';
  if (hasPattern(text, /(写一|生成|创作|润色|改写|draft|create|rewrite)/i)) return 'creative_output';
  if (hasPattern(text, /(多少|几|数值|金额|价格|比例|rate|price|count|value|amount)/i)) return 'specific_value';
  return 'trend_or_summary';
}

function inferFreshness(text: string, signals: Partial<FactNeedPublicSignals>): FactFreshnessNeed {
  if (signals.hasRealtime || hasPattern(text, /(实时|当前|现在|此刻|live|real[-\s]?time)/i)) return 'live';
  if (hasPattern(text, /(今天|今日|当天|昨日|昨天|明天|today|yesterday|tomorrow)/i)) return 'today';
  if (hasPattern(text, /(是否|是不是|有没有|会不会|能否|能不能|真要|whether|will\s+.*\?|has\s+.*\?)/i)) return 'recent';
  if (signals.hasExternal || signals.hasStrongPublicSignal || hasPattern(text, /(最近|近期|最新|刚刚|近[一二三四五六七八九十0-9]+|latest|recent|new)/i)) return 'recent';
  if (hasPattern(text, /(定义|是什么|什么是|原理|历史|概念|definition|meaning)/i)) return 'stable';
  return 'not_relevant';
}

function inferVisibility(
  context: FactNeedReasoningContext | undefined,
  signals: Partial<FactNeedPublicSignals>,
): FactVisibility {
  if (context?.hasInternalBusinessSignal) return 'private_enterprise';
  if (signals.hasExternal || signals.explicitSearch || signals.hasStrongPublicSignal) return 'public';
  return 'unknown';
}

function inferSensitivity(context: FactNeedReasoningContext | undefined): FactSensitivity {
  return context?.hasInternalBusinessSignal ? 'business_context' : 'none';
}

function inferAuthorityNeed(
  text: string,
  answerShape: FactAnswerShape,
  freshnessNeed: FactFreshnessNeed,
  visibility: FactVisibility,
  signals: Partial<FactNeedPublicSignals>,
): FactAuthorityNeed {
  if (visibility === 'private_enterprise' || visibility === 'private_user' || visibility === 'partner_restricted') {
    return 'system_of_record';
  }
  const hasPublicEvidenceSignal = Boolean(signals.hasExternal || signals.hasStrongPublicSignal || signals.explicitSearch);
  if (!hasPublicEvidenceSignal && answerShape === 'specific_value' && (freshnessNeed === 'today' || freshnessNeed === 'live')) {
    return 'system_of_record';
  }
  if (!hasPublicEvidenceSignal && answerShape === 'diagnosis' && (freshnessNeed === 'recent' || freshnessNeed === 'today' || freshnessNeed === 'live')) {
    return 'system_of_record';
  }
  if (
    (answerShape === 'recommendation' || answerShape === 'diagnosis' || answerShape === 'trend_or_summary')
    && (freshnessNeed === 'recent' || freshnessNeed === 'today' || freshnessNeed === 'live')
  ) {
    return 'multi_source_consensus';
  }
  if (signals.hasExternal || signals.hasStrongPublicSignal) return 'official_source';
  if (hasPattern(text, /(发起|执行|提交|创建|开通|run|execute|submit|create|enable)/i)) {
    return 'system_of_record';
  }
  if (signals.explicitSearch) return freshnessNeed === 'stable' ? 'multi_source_consensus' : 'official_source';
  if (answerShape === 'recommendation' || answerShape === 'diagnosis' || answerShape === 'trend_or_summary') return 'expert_synthesis';
  if (answerShape === 'definition' || answerShape === 'how_to' || answerShape === 'creative_output') {
    return 'model_knowledge_ok';
  }
  return 'expert_synthesis';
}

export function inferFactNeed(input: FactNeedReasoningInput): FactNeed {
  const text = normalize(input.message);
  const signals = input.publicSignals || {};
  const answerShape = inferAnswerShape(text);
  const freshnessNeed = inferFreshness(text, signals);
  const factVisibility = inferVisibility(input.context, signals);
  const sensitivity = inferSensitivity(input.context);
  const authorityNeed = inferAuthorityNeed(text, answerShape, freshnessNeed, factVisibility, signals);
  const highEvidenceNeed = authorityNeed === 'system_of_record'
    || authorityNeed === 'official_source'
    || authorityNeed === 'multi_source_consensus'
    || sensitivity !== 'none';

  return {
    answer_shape: answerShape,
    fact_visibility: factVisibility,
    authority_need: authorityNeed,
    freshness_need: freshnessNeed,
    sensitivity,
    consequence_risk: highEvidenceNeed ? 'high' : freshnessNeed === 'recent' ? 'medium' : 'low',
    ambiguity: factVisibility === 'unknown' && authorityNeed === 'system_of_record'
      ? [{
        field: 'authority',
        impact: 'high',
        risk: 'misleading',
        resolution: 'ask_user',
        reason: 'The requested fact looks like a system-record value, but no qualified system of record is available in context.',
      }]
      : [],
  };
}

function containsAny<T extends string>(values: T[] | undefined, target: T): boolean {
  return Array.isArray(values) && values.includes(target);
}

export function evaluateProviderEligibility(
  profile: ProviderAuthorityProfile,
  factNeed: FactNeed,
): ProviderEligibility {
  const rejectedBy: string[] = [];
  const reasons: string[] = [];
  if (containsAny(profile.cannot_answer_when.fact_visibility, factNeed.fact_visibility)) {
    rejectedBy.push('fact_visibility');
  }
  if (containsAny(profile.cannot_answer_when.sensitivity, factNeed.sensitivity)) {
    rejectedBy.push('sensitivity');
  }
  if (containsAny(profile.cannot_answer_when.authority_need, factNeed.authority_need)) {
    rejectedBy.push('authority_need');
  }
  if (!profile.can_answer_when.fact_visibility.includes(factNeed.fact_visibility)) {
    rejectedBy.push('fact_visibility_not_supported');
  }
  if (!profile.can_answer_when.authority_need.includes(factNeed.authority_need)) {
    rejectedBy.push('authority_need_not_supported');
  }
  if (!profile.can_answer_when.freshness_need.includes(factNeed.freshness_need)) {
    rejectedBy.push('freshness_need_not_supported');
  }
  if (!profile.can_answer_when.answer_shape.includes(factNeed.answer_shape)) {
    rejectedBy.push('answer_shape_not_supported');
  }

  if (!rejectedBy.length) {
    reasons.push('provider_authority_profile_matched');
  }

  const role: ProviderRole = rejectedBy.length
    ? 'not_applicable'
    : profile.allowed_roles.includes('primary_answer')
      ? 'primary_answer'
      : profile.allowed_roles[0] || 'not_applicable';

  return {
    provider: profile.provider,
    eligible: rejectedBy.length === 0,
    role,
    reasons,
    rejectedBy,
  };
}

export function getProviderAuthorityProfile(provider: EvidenceProvider): ProviderAuthorityProfile {
  return DEFAULT_PROVIDER_AUTHORITY_PROFILES.find((profile) => profile.provider === provider)
    || DEFAULT_PROVIDER_AUTHORITY_PROFILES[0];
}

function buildBaseSearchQuery(message: string): string {
  return String(message || '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '')
    .replace(/\b(?:token|secret|password|credential|key)\s*[:=]\s*\S+/gi, '')
    .replace(/\b(?:user|account|project|org|tenant|workspace)[_-]?id\s*[:=]\s*\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueSearchQueries(queries: SearchPlanQuery[]): SearchPlanQuery[] {
  const seen = new Set<string>();
  const output: SearchPlanQuery[] = [];
  for (const query of queries) {
    const normalized = query.query.replace(/\s+/g, ' ').trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    output.push({ ...query, query: normalized });
  }
  return output;
}

function buildSearchQueries(message: string, factNeed: FactNeed, strategy: SearchPlan['query_strategy']): SearchPlanQuery[] {
  const base = String(message || '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '')
    .replace(/\b(?:token|secret|password|credential|key)\s*[:=]\s*\S+/gi, '')
    .replace(/\b(?:user|account|project|org|tenant|workspace)[_-]?id\s*[:=]\s*\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return [];
  const queries: SearchPlanQuery[] = [{ query: base, purpose: 'primary' }];
  if (strategy === 'official_domain_discovery' && factNeed.authority_need === 'official_source') {
    queries.push(
      { query: `${base} official`, purpose: 'verification' },
      { query: `${base} official latest`, purpose: 'verification' },
    );
    return uniqueSearchQueries(queries);
  }
  if (strategy === 'live_fact_lookup') {
    queries.push(
      { query: `${base} 最新`, purpose: 'verification' },
      { query: `${base} 实时`, purpose: 'verification' },
    );
    return uniqueSearchQueries(queries);
  }
  if (strategy === 'cross_source_compare') {
    queries.push(
      { query: `${base} latest official sources`, purpose: 'verification' },
      { query: `${base} source comparison`, purpose: 'verification' },
    );
    return uniqueSearchQueries(queries);
  }
  if (strategy === 'fresh_update_search') {
    queries.push(
      { query: `${base} latest`, purpose: 'verification' },
      { query: `${base} official update`, purpose: 'verification' },
    );
    return uniqueSearchQueries(queries);
  }
  if (strategy === 'background_reference') {
    queries.push({ query: `${base} reference`, purpose: 'background' });
  }
  return uniqueSearchQueries(queries);
}

export function buildSearchPlanForProvider(
  providerEligibility: ProviderEligibility,
  factNeed: FactNeed,
  message: string,
): SearchPlan {
  if (!providerEligibility.eligible) {
    return {
      allowed: false,
      role: 'not_applicable',
      depth: 'none',
      source_policy: 'not_allowed',
      query_strategy: 'not_applicable',
      redaction_policy: factNeed.sensitivity === 'none' ? 'none' : 'block',
      reasons: providerEligibility.rejectedBy,
    };
  }

  if (factNeed.sensitivity !== 'none' && factNeed.fact_visibility !== 'public') {
    return {
      allowed: false,
      role: 'not_applicable',
      depth: 'none',
      source_policy: 'not_allowed',
      query_strategy: 'not_applicable',
      redaction_policy: 'block',
      reasons: ['sensitive_non_public_context'],
    };
  }

  const isFresh = factNeed.freshness_need === 'live'
    || factNeed.freshness_need === 'today'
    || factNeed.freshness_need === 'recent';
  const requiresRealtimePublicFeed = hasPattern(message, /(天气|气温|温度|降雨|下雨|晴|多云|预报|大风|湿度)/i);
  const highConflictRisk = factNeed.consequence_risk === 'high'
    || factNeed.authority_need === 'multi_source_consensus';

  const plan: SearchPlan = (factNeed.fact_visibility === 'public' && requiresRealtimePublicFeed)
    || (factNeed.fact_visibility === 'public'
    && factNeed.freshness_need === 'live'
    && factNeed.authority_need !== 'official_source'
    && factNeed.authority_need !== 'multi_source_consensus')
    ? {
      allowed: true,
      role: providerEligibility.role,
      depth: 'standard',
      source_policy: 'fresh_news',
      query_strategy: 'live_fact_lookup',
      redaction_policy: factNeed.sensitivity === 'none' ? 'none' : 'remove_sensitive_context',
      reasons: ['live_public_fact_lookup'],
    }
    : highConflictRisk && factNeed.authority_need !== 'official_source'
    ? {
      allowed: true,
      role: providerEligibility.role,
      depth: 'deep',
      source_policy: 'multi_source_consensus',
      query_strategy: 'cross_source_compare',
      redaction_policy: factNeed.sensitivity === 'none' ? 'none' : 'remove_sensitive_context',
      reasons: ['high_risk_or_consensus_needed'],
    }
    : factNeed.authority_need === 'official_source' && isFresh
      ? {
        allowed: true,
        role: providerEligibility.role,
        depth: 'standard',
        source_policy: 'official_first',
        query_strategy: 'official_domain_discovery',
        redaction_policy: factNeed.sensitivity === 'none' ? 'none' : 'remove_sensitive_context',
        reasons: ['fresh_official_source_needed'],
      }
      : factNeed.freshness_need === 'stable' || factNeed.authority_need === 'model_knowledge_ok'
        ? {
          allowed: true,
          role: providerEligibility.role,
          depth: 'shallow',
          source_policy: 'stable_reference',
          query_strategy: 'background_reference',
          redaction_policy: factNeed.sensitivity === 'none' ? 'none' : 'remove_sensitive_context',
          reasons: ['stable_reference_sufficient'],
        }
        : {
          allowed: true,
          role: providerEligibility.role,
          depth: isFresh ? 'standard' : 'shallow',
          source_policy: isFresh ? 'fresh_news' : 'stable_reference',
          query_strategy: isFresh ? 'fresh_update_search' : 'background_reference',
          redaction_policy: factNeed.sensitivity === 'none' ? 'none' : 'remove_sensitive_context',
          reasons: ['generic_public_evidence_needed'],
        };

  const queries = buildSearchQueries(buildBaseSearchQuery(message), factNeed, plan.query_strategy);
  return queries.length
    ? { ...plan, queries }
    : { ...plan, allowed: false, role: 'not_applicable', depth: 'none', source_policy: 'not_allowed', query_strategy: 'not_applicable', reasons: [...(plan.reasons || []), 'empty_sanitized_query'] };
}
