import { describe, expect, it } from 'vitest';
import { buildInformationSourceArbitration } from '../src/lib/information-source-arbitration';
import type { PublicWebNeed } from '../src/lib/public-web-runtime';

function publicWebNeed(overrides: Partial<PublicWebNeed> = {}): PublicWebNeed {
  return {
    required: true,
    primaryGoal: 'fetch_external_public_info',
    capabilityType: 'web_search',
    sourceRequired: true,
    reasonCode: 'public_web.need_detected',
    confidence: 0.9,
    policy: 'heuristic',
    ...overrides,
  };
}

describe('information source arbitration', () => {
  it('keeps internal capabilities above public web when both are candidates', () => {
    const arbitration = buildInformationSourceArbitration({
      stage: 'route_arbitration',
      isReportQuery: true,
      reportRouteMatch: true,
      capabilityReportMatch: true,
      publicWebNeed: publicWebNeed(),
      hasProjectContext: true,
      hasMemoryOrHistoryContext: false,
    });

    const internal = arbitration.candidates.find(candidate => candidate.source === 'internal_capability');
    const publicWeb = arbitration.candidates.find(candidate => candidate.source === 'public_web');

    expect(arbitration.selected_source).toBe('internal_capability');
    expect(arbitration.public_web_decision).toBe('deferred_to_internal');
    expect(internal?.status).toBe('selected');
    expect(publicWeb?.status).toBe('deferred');
    expect(publicWeb?.role).toBe('verification');
    expect(arbitration.rejected_authorities).toContain('public_web_direct_route_override');
  });

  it('selects public web only when no internal capability is available and public evidence is allowed', () => {
    const arbitration = buildInformationSourceArbitration({
      stage: 'route_arbitration',
      isReportQuery: false,
      reportRouteMatch: false,
      capabilityReportMatch: false,
      publicWebNeed: publicWebNeed(),
      hasProjectContext: false,
      hasMemoryOrHistoryContext: false,
    });

    expect(arbitration.selected_source).toBe('public_web');
    expect(arbitration.public_web_decision).toBe('candidate_only');
    expect(arbitration.candidates.find(candidate => candidate.source === 'public_web')?.status).toBe('candidate');
  });

  it('rejects public web when provider eligibility or search plan blocks it', () => {
    const arbitration = buildInformationSourceArbitration({
      stage: 'route_arbitration',
      isReportQuery: false,
      reportRouteMatch: false,
      capabilityReportMatch: false,
      publicWebNeed: publicWebNeed({
        providerEligibility: {
          provider: 'public_web',
          eligible: false,
          role: 'not_applicable',
          reasons: [],
          rejectedBy: ['sensitivity'],
        },
        searchPlan: {
          allowed: false,
          role: 'not_applicable',
          depth: 'none',
          source_policy: 'not_allowed',
          query_strategy: 'not_applicable',
          redaction_policy: 'block',
          reasons: ['sensitive_non_public_context'],
        },
      }),
      hasProjectContext: false,
      hasMemoryOrHistoryContext: false,
    });

    const publicWeb = arbitration.candidates.find(candidate => candidate.source === 'public_web');
    expect(arbitration.public_web_decision).toBe('blocked');
    expect(publicWeb?.status).toBe('rejected');
    expect(publicWeb?.reasons).toContain('public_web_provider_not_eligible_or_search_not_allowed');
  });

  it('records user context as context only, not as execution authority', () => {
    const arbitration = buildInformationSourceArbitration({
      stage: 'route_arbitration',
      isReportQuery: false,
      reportRouteMatch: false,
      capabilityReportMatch: false,
      publicWebNeed: publicWebNeed({ required: false, reasonCode: 'public_web.need_not_detected' }),
      hasProjectContext: true,
      hasMemoryOrHistoryContext: true,
    });

    const context = arbitration.candidates.find(candidate => candidate.source === 'context');
    expect(context?.status).toBe('candidate');
    expect(context?.role).toBe('context');
    expect(context?.reasons).toContain('context_can_fill_empty_slots_but_not_override_current_turn');
    expect(arbitration.selected_source).toBe('model_only');
  });

  it('selects knowledge when internal capability is unavailable and knowledge evidence exists', () => {
    const arbitration = buildInformationSourceArbitration({
      stage: 'route_arbitration',
      isReportQuery: false,
      reportRouteMatch: false,
      capabilityReportMatch: false,
      publicWebNeed: publicWebNeed({ required: false, reasonCode: 'public_web.need_not_detected' }),
      knowledge: { available: true, status: 'searched', hitCount: 2, knowledgeBaseCount: 1 },
      hasProjectContext: false,
      hasMemoryOrHistoryContext: false,
    });

    const knowledge = arbitration.candidates.find(candidate => candidate.source === 'knowledge');
    expect(arbitration.selected_source).toBe('knowledge');
    expect(knowledge?.status).toBe('selected');
    expect(knowledge?.role).toBe('primary_answer');
    expect(knowledge?.evidence_required).toBe(true);
    expect(knowledge?.reasons).toContain('knowledge_hit_available_for_evidence');
  });

  it('keeps internal capability primary and records knowledge hits as verification evidence', () => {
    const arbitration = buildInformationSourceArbitration({
      stage: 'execution_arbitration',
      isReportQuery: true,
      reportRouteMatch: true,
      capabilityReportMatch: true,
      publicWebNeed: publicWebNeed({ required: false, reasonCode: 'public_web.need_not_detected' }),
      knowledge: { available: true, status: 'searched', hitCount: 1, knowledgeBaseCount: 1 },
      hasProjectContext: true,
      hasMemoryOrHistoryContext: false,
    });

    const knowledge = arbitration.candidates.find(candidate => candidate.source === 'knowledge');
    expect(arbitration.selected_source).toBe('internal_capability');
    expect(knowledge?.status).toBe('candidate');
    expect(knowledge?.role).toBe('verification');
    expect(knowledge?.reasons).toContain('internal_capability_has_higher_priority_knowledge_supports_verification');
  });

  it('records report pre-execution knowledge as not evaluated instead of silently omitting it', () => {
    const arbitration = buildInformationSourceArbitration({
      stage: 'execution_arbitration',
      isReportQuery: true,
      reportRouteMatch: true,
      capabilityReportMatch: true,
      publicWebNeed: publicWebNeed({ required: false, reasonCode: 'public_web.need_not_detected' }),
      knowledge: { status: 'not_collected_in_report_pre_execution', hitCount: 0 },
      hasProjectContext: true,
      hasMemoryOrHistoryContext: false,
    });

    const knowledge = arbitration.candidates.find(candidate => candidate.source === 'knowledge');
    expect(knowledge?.status).toBe('not_evaluated');
    expect(knowledge?.reasons).toContain('knowledge_not_collected_in_this_stage');
    expect(knowledge?.metadata?.status).toBe('not_collected_in_report_pre_execution');
  });
});
