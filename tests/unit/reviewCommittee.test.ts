import { describe, expect, it } from 'vitest';
import { ReviewCommittee } from '../../src/core/reviewCommittee';

describe('ReviewCommittee', () => {
  it('builds a structured committee report for a run', () => {
    const committee = new ReviewCommittee();
    const report = committee.buildReportForRun({ runId: 'run-001', artifactCount: 5 });

    expect(report.roles.length).toBe(5);
    expect(report.overallConclusion.length).toBeGreaterThan(10);
    expect(report.roles.some((role) => role.role === '风险评审')).toBe(true);
    expect(report.gate.decision).toBe('pass');
  });
});
