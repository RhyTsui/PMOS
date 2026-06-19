export type FactAnswerShape =
  | 'specific_value'
  | 'list_or_schedule'
  | 'status_update'
  | 'definition'
  | 'comparison'
  | 'trend_or_summary'
  | 'recommendation'
  | 'how_to'
  | 'diagnosis'
  | 'creative_output';

export type FactVisibility =
  | 'private_user'
  | 'private_enterprise'
  | 'partner_restricted'
  | 'public'
  | 'mixed'
  | 'unknown';

export type FactAuthorityNeed =
  | 'system_of_record'
  | 'official_source'
  | 'enterprise_policy'
  | 'multi_source_consensus'
  | 'expert_synthesis'
  | 'model_knowledge_ok';

export type FactFreshnessNeed =
  | 'live'
  | 'today'
  | 'recent'
  | 'stable'
  | 'not_relevant';

export type FactSensitivity =
  | 'none'
  | 'business_context'
  | 'personal_data'
  | 'credential_or_secret'
  | 'regulated_or_high_stakes';

export type FactConsequenceRisk = 'low' | 'medium' | 'high';

export type AmbiguityField =
  | 'subject'
  | 'scope'
  | 'time_range'
  | 'authority'
  | 'location'
  | 'identity'
  | 'output_granularity'
  | 'language'
  | 'format';

export type AmbiguityImpact = 'blocking' | 'high' | 'medium' | 'low';
export type AmbiguityRisk = 'misleading' | 'wrong_action' | 'minor_variation' | 'none';
export type AmbiguityResolution = 'ask_user' | 'explicit_assumption' | 'silent_default';

export interface AmbiguityAssessment {
  field: AmbiguityField;
  impact: AmbiguityImpact;
  risk: AmbiguityRisk;
  resolution: AmbiguityResolution;
  reason?: string;
  assumedValue?: string;
}

export interface FactNeed {
  answer_shape: FactAnswerShape;
  fact_visibility: FactVisibility;
  authority_need: FactAuthorityNeed;
  freshness_need: FactFreshnessNeed;
  sensitivity: FactSensitivity;
  consequence_risk: FactConsequenceRisk;
  ambiguity: AmbiguityAssessment[];
}

export type EvidenceProvider = 'mcp' | 'api' | 'knowledge' | 'public_web' | 'memory' | 'model';

export type ProviderRole =
  | 'primary_answer'
  | 'verification'
  | 'context'
  | 'background'
  | 'preference'
  | 'not_applicable';

export interface ProviderAuthorityProfile {
  provider: EvidenceProvider;
  can_answer_when: {
    fact_visibility: FactVisibility[];
    authority_need: FactAuthorityNeed[];
    freshness_need: FactFreshnessNeed[];
    answer_shape: FactAnswerShape[];
  };
  cannot_answer_when: {
    fact_visibility?: FactVisibility[];
    sensitivity?: FactSensitivity[];
    authority_need?: FactAuthorityNeed[];
  };
  allowed_roles: ProviderRole[];
}

export interface ProviderEligibility {
  provider: EvidenceProvider;
  eligible: boolean;
  role: ProviderRole;
  reasons: string[];
  rejectedBy: string[];
}

export type SearchDepth = 'none' | 'shallow' | 'standard' | 'deep';
export type SearchSourcePolicy =
  | 'official_required'
  | 'official_first'
  | 'multi_source_consensus'
  | 'fresh_news'
  | 'stable_reference'
  | 'not_allowed';
export type SearchQueryStrategy =
  | 'official_domain_discovery'
  | 'live_fact_lookup'
  | 'fresh_update_search'
  | 'cross_source_compare'
  | 'background_reference'
  | 'not_applicable';
export type SearchRedactionPolicy = 'none' | 'remove_sensitive_context' | 'block';

export interface SearchPlanQuery {
  query: string;
  purpose: 'primary' | 'verification' | 'background';
}

export interface SearchPlan {
  allowed: boolean;
  role: ProviderRole;
  depth: SearchDepth;
  source_policy: SearchSourcePolicy;
  query_strategy: SearchQueryStrategy;
  redaction_policy: SearchRedactionPolicy;
  queries?: SearchPlanQuery[];
  reasons?: string[];
}

export const DEFAULT_PROVIDER_AUTHORITY_PROFILES: ProviderAuthorityProfile[] = [
  {
    provider: 'public_web',
    can_answer_when: {
      fact_visibility: ['public', 'mixed', 'unknown'],
      authority_need: ['official_source', 'multi_source_consensus', 'expert_synthesis', 'model_knowledge_ok'],
      freshness_need: ['live', 'today', 'recent', 'stable', 'not_relevant'],
      answer_shape: [
        'specific_value',
        'list_or_schedule',
        'status_update',
        'definition',
        'comparison',
        'trend_or_summary',
        'recommendation',
        'how_to',
        'diagnosis',
      ],
    },
    cannot_answer_when: {
      fact_visibility: ['private_user', 'private_enterprise', 'partner_restricted'],
      sensitivity: ['business_context', 'personal_data', 'credential_or_secret', 'regulated_or_high_stakes'],
      authority_need: ['system_of_record', 'enterprise_policy'],
    },
    allowed_roles: ['primary_answer', 'verification', 'context', 'background'],
  },
  {
    provider: 'mcp',
    can_answer_when: {
      fact_visibility: ['private_user', 'private_enterprise', 'partner_restricted', 'mixed', 'unknown'],
      authority_need: ['system_of_record', 'enterprise_policy', 'official_source', 'expert_synthesis'],
      freshness_need: ['live', 'today', 'recent', 'stable', 'not_relevant'],
      answer_shape: [
        'specific_value',
        'list_or_schedule',
        'status_update',
        'definition',
        'comparison',
        'trend_or_summary',
        'recommendation',
        'how_to',
        'diagnosis',
      ],
    },
    cannot_answer_when: {},
    allowed_roles: ['primary_answer', 'verification', 'context'],
  },
  {
    provider: 'knowledge',
    can_answer_when: {
      fact_visibility: ['private_enterprise', 'partner_restricted', 'public', 'mixed', 'unknown'],
      authority_need: ['enterprise_policy', 'official_source', 'expert_synthesis', 'model_knowledge_ok'],
      freshness_need: ['recent', 'stable', 'not_relevant'],
      answer_shape: ['definition', 'comparison', 'trend_or_summary', 'recommendation', 'how_to', 'diagnosis'],
    },
    cannot_answer_when: {
      sensitivity: ['credential_or_secret'],
    },
    allowed_roles: ['primary_answer', 'verification', 'context', 'background'],
  },
  {
    provider: 'memory',
    can_answer_when: {
      fact_visibility: ['private_user', 'mixed', 'unknown'],
      authority_need: ['expert_synthesis', 'model_knowledge_ok'],
      freshness_need: ['recent', 'stable', 'not_relevant'],
      answer_shape: ['recommendation', 'how_to', 'creative_output'],
    },
    cannot_answer_when: {
      sensitivity: ['credential_or_secret', 'regulated_or_high_stakes'],
    },
    allowed_roles: ['preference', 'context'],
  },
  {
    provider: 'model',
    can_answer_when: {
      fact_visibility: ['public', 'mixed', 'unknown'],
      authority_need: ['model_knowledge_ok', 'expert_synthesis'],
      freshness_need: ['stable', 'not_relevant'],
      answer_shape: ['definition', 'comparison', 'trend_or_summary', 'recommendation', 'how_to', 'creative_output'],
    },
    cannot_answer_when: {
      sensitivity: ['credential_or_secret', 'regulated_or_high_stakes'],
      authority_need: ['system_of_record', 'official_source', 'enterprise_policy', 'multi_source_consensus'],
    },
    allowed_roles: ['primary_answer', 'background', 'context'],
  },
];
