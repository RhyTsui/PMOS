import { describe, expect, it } from 'vitest';
import { ReviewCommittee } from '../../src/core/reviewCommittee';

describe('ReviewCommittee', () => {
  it('builds a passing committee report when artifacts and open-source evidence exist', () => {
    const committee = new ReviewCommittee();
    const report = committee.buildReportForRun({
      runId: 'run-001',
      artifactCount: 5,
      openSourceEvaluationPresent: true,
      openSourceEvidencePaths: ['docs/implementation/baseline/run-001.md'],
    });

    expect(report.roles.length).toBe(5);
    expect(report.overallConclusion).toContain('评审通过');
    expect(report.roles.some((role) => role.role === 'Architecture Review')).toBe(true);
    expect(report.gate.decision).toBe('pass');
  });

  it('blocks review when open-source-first evaluation is missing', () => {
    const committee = new ReviewCommittee();
    const report = committee.buildReportForRun({
      runId: 'run-002',
      artifactCount: 6,
      openSourceEvaluationPresent: false,
    });

    expect(report.gate.decision).toBe('conditional');
    expect(report.gate.blocked).toBe(true);
    expect(report.recommendedReworkStageId).toBe('core-definition-baseline');
    expect(report.roles[0]?.issues.some((issue) => issue.title === 'Missing open-source-first evaluation')).toBe(true);
  });
});
