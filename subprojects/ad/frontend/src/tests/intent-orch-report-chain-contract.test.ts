import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('IntentOrch report chain contract', () => {
  const reportStageSource = readFileSync(join(process.cwd(), 'src/lib/chat-pipeline/report-query-stage.ts'), 'utf8');

  it('uses planner candidate events instead of the legacy enhanced event in the report chain', () => {
    expect(reportStageSource).toContain("type: 'intent_orch.candidate'");
    expect(reportStageSource).not.toContain("type: 'intent_orch.enhanced'");
  });

  it('does not pass the raw IntentOrch plan into capability discovery', () => {
    expect(reportStageSource).toContain('intentorch_candidate: reportIntentOrchCandidate');
    expect(reportStageSource).toContain('planner_candidates: reportPlannerProjection.plannerCandidates');
    expect(reportStageSource).toContain('arbitration_summary: reportPlannerProjection.arbitrationSummary');
    expect(reportStageSource).not.toContain('intentOrchPlan:');
  });
});
