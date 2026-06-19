import { describe, expect, it } from 'vitest';
import {
  summarizeRouteDecisionObservation,
  type RouteDecisionObservation,
} from '../src/lib/route-decision-observation';

function observationWith(mismatches: RouteDecisionObservation['mismatches']): RouteDecisionObservation {
  return {
    decisionId: 'decision-1',
    traceId: 'trace-1',
    mode: 'observe_only',
    source: 'deterministic',
    routeIntent: 'general',
    serviceIntent: 'help_qa',
    resolvedIntent: 'help_qa',
    primaryDeliverable: 'help_answer',
    decisionAuthority: {
      clientIntent: 'hint_only',
      prompt: 'decision_support',
      domainSignals: 'evidence_only',
      routeRules: 'authoritative',
      backendRouteDecision: 'authoritative',
    },
    routeEvidence: [],
    isReportQuery: false,
    confidence: 0.8,
    toolPurpose: 'help_lookup',
    needsClarification: false,
    warnings: [],
    evidence: [],
    matchedRules: [],
    domainSignals: [],
    actualExecution: {
      actualServiceIntent: 'help_qa',
      actualIsReportQuery: false,
      actualToolPurpose: 'help_lookup',
    },
    mismatches,
    createdAt: '2026-06-12T00:00:00.000Z',
  } as RouteDecisionObservation;
}

describe('route decision observation summary', () => {
  it('does not call non-blocking warnings mismatches in user-facing runtime logs', () => {
    const summary = summarizeRouteDecisionObservation(observationWith([
      { code: 'prompt_warning', message: 'non blocking', severity: 'warning' },
    ]));

    expect(summary).toContain('路由观测通过');
    expect(summary).toContain('非阻断提醒');
    expect(summary).not.toContain('mismatch');
  });

  it('keeps blocking route differences explicit', () => {
    const summary = summarizeRouteDecisionObservation(observationWith([
      { code: 'route_conflict', message: 'blocking', severity: 'error' },
    ]));

    expect(summary).toContain('阻断差异');
    expect(summary).toContain('预期 help_qa');
    expect(summary).toContain('实际 help_qa');
  });
});
