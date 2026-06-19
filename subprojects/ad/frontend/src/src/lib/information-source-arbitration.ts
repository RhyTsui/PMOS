import type {
  InformationSourceArbitration,
  InformationSourceCandidate,
  InformationSourceProvider,
} from '@/contracts/request-understanding/information-source-arbitration-contract';
import type { PublicWebNeed } from '@/lib/public-web-runtime';

interface EvidenceSourcePolicy {
  priority: InformationSourceProvider[];
  blocked: InformationSourceProvider[];
  primary: InformationSourceProvider;
}

function resolveEvidenceSourcePolicy(serviceIntent: string | undefined): EvidenceSourcePolicy {
  switch (serviceIntent) {
    case 'field_definition':
      return {
        priority: ['field_dictionary', 'schema_registry', 'knowledge', 'model_only', 'clarify'],
        blocked: ['mcp_api', 'internal_capability'],
        primary: 'field_dictionary',
      };
    case 'knowledge_answer':
      return {
        priority: ['knowledge', 'conversation_context', 'model_only', 'clarify'],
        blocked: ['mcp_api', 'internal_capability'],
        primary: 'knowledge',
      };
    case 'data_query':
    case 'report_delivery':
      return {
        priority: ['mcp_api', 'internal_capability', 'knowledge', 'conversation_context'],
        blocked: [],
        primary: 'mcp_api',
      };
    case 'issue_diagnosis':
      return {
        priority: ['mcp_api', 'internal_capability', 'knowledge', 'conversation_context'],
        blocked: [],
        primary: 'mcp_api',
      };
    default:
      return {
        priority: ['knowledge', 'public_web', 'conversation_context', 'context', 'model_only', 'model'],
        blocked: [],
        primary: 'knowledge',
      };
  }
}

export { resolveEvidenceSourcePolicy };

export function buildInformationSourceArbitration(params: {
  stage: InformationSourceArbitration['stage'];
  isReportQuery: boolean;
  reportRouteMatch: boolean;
  capabilityReportMatch: boolean;
  publicWebNeed: PublicWebNeed;
  serviceIntent?: string;
  knowledge?: {
    available?: boolean;
    status?: string;
    hitCount?: number;
    knowledgeBaseCount?: number;
    errorStatus?: number;
    error?: string;
    hits?: unknown[];
  } | null;
  hasProjectContext: boolean;
  hasMemoryOrHistoryContext?: boolean;
  capabilityDecision?: {
    selected?: { capabilityId?: string; source?: { toolName?: string } };
    executionDecision?: string;
    dataCoverage?: { covered?: boolean; supportLevel?: string; missing?: string[] };
    fallbackUsed?: boolean;
    fallbackReason?: string;
    candidates?: unknown[];
  } | null;
}): InformationSourceArbitration {
  const internalAvailable = params.isReportQuery || params.capabilityReportMatch || Boolean(params.capabilityDecision?.selected);
  const publicWebRequired = params.publicWebNeed.required === true;
  const publicWebBlocked = params.publicWebNeed.searchPlan?.allowed === false
    || params.publicWebNeed.providerEligibility?.eligible === false;
  const knowledgeStatus = String(params.knowledge?.status || (params.knowledge?.available ? 'available' : 'not_collected'));
  const knowledgeHitCount = typeof params.knowledge?.hitCount === 'number'
    ? params.knowledge.hitCount
    : Array.isArray(params.knowledge?.hits)
      ? params.knowledge.hits.length
      : 0;
  const knowledgeAvailable = params.knowledge?.available === true || knowledgeStatus === 'searched';
  const knowledgeHasEvidence = knowledgeHitCount > 0;
  const knowledgeFailed = knowledgeStatus === 'failed';
  const knowledgeNotCollected = knowledgeStatus === 'not_collected'
    || knowledgeStatus === 'not_collected_in_route_arbitration'
    || knowledgeStatus === 'not_collected_in_report_pre_execution';
  const candidates: InformationSourceCandidate[] = [
    {
      source: 'internal_capability',
      status: internalAvailable ? (params.isReportQuery ? 'selected' : 'candidate') : 'not_evaluated',
      priority: 1,
      role: internalAvailable ? 'primary_answer' : 'not_applicable',
      evidence_required: internalAvailable,
      reasons: [
        params.reportRouteMatch ? 'request_understanding_report_route_match' : '',
        params.capabilityReportMatch ? 'capability_manifest_report_candidate' : '',
        params.capabilityDecision?.selected ? 'execution_capability_selected' : '',
        params.capabilityDecision?.executionDecision ? `execution_decision:${params.capabilityDecision.executionDecision}` : '',
      ].filter(Boolean),
      metadata: {
        selected_capability_id: params.capabilityDecision?.selected?.capabilityId,
        selected_tool_name: params.capabilityDecision?.selected?.source?.toolName,
        data_coverage: params.capabilityDecision?.dataCoverage,
        fallback_used: params.capabilityDecision?.fallbackUsed,
        fallback_reason: params.capabilityDecision?.fallbackReason,
        candidate_count: params.capabilityDecision?.candidates?.length,
      },
    },
    {
      source: 'knowledge',
      status: knowledgeHasEvidence
        ? internalAvailable
          ? 'candidate'
          : 'selected'
        : knowledgeFailed
          ? 'rejected'
          : knowledgeNotCollected
            ? 'not_evaluated'
            : knowledgeAvailable
              ? 'candidate'
              : 'not_evaluated',
      priority: 2,
      role: knowledgeHasEvidence && !internalAvailable ? 'primary_answer' : 'verification',
      evidence_required: knowledgeHasEvidence,
      reasons: [
        knowledgeHasEvidence ? 'knowledge_hit_available_for_evidence' : '',
        knowledgeAvailable && !knowledgeHasEvidence ? 'knowledge_searched_no_hit_or_not_relevant' : '',
        knowledgeFailed ? 'knowledge_search_failed' : '',
        knowledgeNotCollected ? 'knowledge_not_collected_in_this_stage' : '',
        internalAvailable && knowledgeHasEvidence ? 'internal_capability_has_higher_priority_knowledge_supports_verification' : '',
      ].filter(Boolean),
      metadata: {
        status: knowledgeStatus,
        hit_count: knowledgeHitCount,
        knowledge_base_count: params.knowledge?.knowledgeBaseCount,
        error_status: params.knowledge?.errorStatus,
        error: params.knowledge?.error,
      },
    },
    {
      source: 'public_web',
      status: publicWebBlocked
        ? 'rejected'
        : publicWebRequired
          ? params.isReportQuery
            ? 'deferred'
            : 'candidate'
          : 'not_evaluated',
      priority: 3,
      role: publicWebRequired && !publicWebBlocked ? (params.isReportQuery ? 'verification' : 'primary_answer') : 'not_applicable',
      evidence_required: Boolean(params.publicWebNeed.sourceRequired),
      confidence: params.publicWebNeed.confidence,
      reasons: [
        params.publicWebNeed.reasonCode || 'public_web.need_not_detected',
        params.isReportQuery && publicWebRequired ? 'internal_capability_has_higher_priority' : '',
        publicWebBlocked ? 'public_web_provider_not_eligible_or_search_not_allowed' : '',
      ].filter(Boolean),
      metadata: {
        capability_type: params.publicWebNeed.capabilityType,
        fact_need: params.publicWebNeed.factNeed,
        provider_eligibility: params.publicWebNeed.providerEligibility,
        search_plan: params.publicWebNeed.searchPlan,
      },
    },
    {
      source: 'intentorch',
      status: 'candidate',
      priority: 4,
      role: 'context',
      reasons: ['intentorch_is_planner_candidate_not_execution_authority'],
    },
    {
      source: 'context',
      status: params.hasProjectContext || params.hasMemoryOrHistoryContext ? 'candidate' : 'not_evaluated',
      priority: 5,
      role: 'context',
      reasons: [
        params.hasProjectContext ? 'project_context_available' : '',
        params.hasMemoryOrHistoryContext ? 'memory_or_history_context_available' : '',
        'context_can_fill_empty_slots_but_not_override_current_turn',
      ].filter(Boolean),
    },
  ];
  const evidencePolicy = resolveEvidenceSourcePolicy(params.serviceIntent);
  const selectedSource: InformationSourceArbitration['selected_source'] = (() => {
    // Use evidence source policy for selection
    if (evidencePolicy.primary === 'field_dictionary' || evidencePolicy.primary === 'schema_registry') {
      return evidencePolicy.primary;
    }
    if (internalAvailable && !evidencePolicy.blocked.includes('internal_capability') && !evidencePolicy.blocked.includes('mcp_api')) {
      return 'internal_capability';
    }
    if (knowledgeHasEvidence && !evidencePolicy.blocked.includes('knowledge')) {
      return 'knowledge';
    }
    if (publicWebRequired && !publicWebBlocked && !evidencePolicy.blocked.includes('public_web')) {
      return 'public_web';
    }
    if (!evidencePolicy.blocked.includes('model_only')) {
      return 'model_only';
    }
    return 'clarify';
  })();
  return {
    policy: 'planner_first_tool_grounded_contract_guarded',
    stage: params.stage,
    selected_source: selectedSource,
    priority_order: evidencePolicy.priority as InformationSourceArbitration['priority_order'],
    candidates,
    rejected_authorities: [
      'public_web_direct_route_override',
      'intentorch_direct_tool_selection',
      'prompt_keyword_routing',
      'model_only_without_evidence_for_external_facts',
    ],
    public_web_decision: publicWebBlocked
      ? 'blocked'
      : publicWebRequired
        ? params.isReportQuery
          ? 'deferred_to_internal'
          : 'candidate_only'
        : 'not_needed',
    final_authority: 'plan_arbitrator_then_contract_safety',
  };
}
