import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('IntentOrch report chain contract', () => {
  const routeSource = readFileSync(join(process.cwd(), 'src/app/api/chat/route.ts'), 'utf8');

  it('uses planner candidate events instead of the legacy enhanced event in the report chain', () => {
    expect(routeSource).toContain("type: 'intent_orch.candidate'");
    expect(routeSource).not.toContain("type: 'intent_orch.enhanced'");
  });

  it('does not pass the raw IntentOrch plan into capability discovery', () => {
    expect(routeSource).toContain('intentorch_candidate: reportIntentOrchCandidate');
    expect(routeSource).toContain('planner_candidates: reportPlannerProjection.plannerCandidates');
    expect(routeSource).toContain('arbitration_summary: reportPlannerProjection.arbitrationSummary');
    expect(routeSource).not.toContain('intentOrchPlan:');
  });
});
