import { describe, expect, it } from 'vitest';
import { ReviewCommittee } from '../../src/core/reviewCommittee';

describe('ReviewCommittee', () => {
  it('builds a passing multi-role report for integration stage when evidence exists', () => {
    const committee = new ReviewCommittee();
    const report = committee.buildReportForRun({
      runId: 'run-001',
      artifactCount: 6,
      activeStageId: 'frontend-backend-integration',
      openSourceEvaluationPresent: true,
      openSourceEvidencePaths: ['docs/research/run-001.md'],
      hermesResearchFindings: [
        {
          id: 'research-system-state-search',
          topic: 'system state retrieval',
          summary: 'Hermes found current system-state evidence in Dataki.',
          query: 'integration execution-runtime',
          resultCount: 2,
        },
      ],
      hermesAutoPromotions: [
        {
          comparisonId: 'stage-agent-default-switching',
          writebackTargets: [
            {
              status: 'active',
              taskRequirementId: 'req-writeback-1',
              closureEvidencePaths: [],
            },
            {
              status: 'completed',
              taskRequirementId: 'req-writeback-2',
              closureEvidencePaths: ['docs/operations/closure-req-writeback-2.md'],
            },
          ],
        },
      ],
      hermesWatchFindings: [
        {
          status: 'active',
          taskRequirementId: 'req-watch-1',
          trackedRequirementIds: ['req-watch-1'],
          closureEvidencePaths: [],
          recurrenceCount: 3,
          stableRunCount: 2,
          noiseSuppressed: true,
        },
        {
          status: 'resolved',
          taskRequirementId: 'req-watch-2',
          trackedRequirementIds: ['req-watch-2'],
          closureEvidencePaths: ['docs/operations/closure-req-watch-2.md'],
          recurrenceCount: 1,
          stableRunCount: 1,
          noiseSuppressed: false,
        },
      ],
      artifacts: [
        {
          path: 'docs/integration/run-001.md',
          content:
            'integration acceptance function-to-api request response error entity field relation open source first build-vs-buy current system state development task breakdown frontend task backend task data task test task risk',
        },
      ],
    });

    expect(report.roles.length).toBeGreaterThanOrEqual(5);
    expect(report.roles.some((role) => role.role === 'Research Review')).toBe(true);
    expect(report.overallConclusion).toContain('通');
    expect(report.roles.some((role) => role.role === 'Delivery Review')).toBe(true);
    expect(report.roles.some((role) => role.role === 'Development Review')).toBe(true);
    expect(report.roles.some((role) => role.role === 'Human Final Approval')).toBe(true);
    expect(report.hermes.overallDecision).toBe('promote');
    expect(report.hermes.knowledgeGrounding.resultCount).toBe(2);
    expect(report.hermes.knowledgeGrounding.query).toBe('integration execution-runtime');
    expect(report.hermes.writebackClosure.openTargets).toBe(1);
    expect(report.hermes.writebackClosure.completedTargets).toBe(1);
    expect(report.hermes.watchClosure.activeFindings).toBe(1);
    expect(report.hermes.watchClosure.recurringFindings).toBe(1);
    expect(report.hermes.watchClosure.suppressedFindings).toBe(1);
    expect(report.hermes.watchClosure.closureEvidenceCount).toBe(1);
    expect(report.gate.decision).toBe('pass');
    expect(report.activationTrace?.some((item) => item.role === 'Delivery Review' && item.activated)).toBe(true);
    expect(report.activationTrace?.some((item) => item.role === 'Delivery Review' && item.status === 'assumed')).toBe(true);
  });

  it('blocks requirement-stage review when requirement-to-function mapping and knowledge grounding are missing', () => {
    const committee = new ReviewCommittee();
    const report = committee.buildReportForRun({
      runId: 'run-002',
      artifactCount: 6,
      activeStageId: 'requirements-document',
      openSourceEvaluationPresent: true,
      hermesResearchFindings: [
        {
          id: 'research-system-state-search',
          topic: 'system state retrieval',
          summary: 'No current retrieval hit was returned.',
          query: 'requirements baseline drift',
          resultCount: 0,
        },
      ],
      hermesAutoPromotions: [],
      hermesWatchFindings: [
        {
          status: 'active',
          taskRequirementId: 'req-watch-3',
          trackedRequirementIds: ['req-watch-3'],
          closureEvidencePaths: [],
          recurrenceCount: 2,
          stableRunCount: 2,
          noiseSuppressed: false,
        },
      ],
      artifacts: [
        {
          path: 'docs/requirements/run-002.md',
          content: '这是一个只有高层需求描述的文档，没有任何功能拆解矩阵。',
        },
      ],
    });

    expect(report.gate.decision).toBe('conditional');
    expect(report.gate.blocked).toBe(true);
    expect(report.recommendedReworkStageId).toBe('requirements-document');
    expect(report.roles.some((role) => role.role === 'Solution-Optimality Review')).toBe(true);
    expect(report.hermes.overallDecision).toBe('revise');
    expect(report.hermes.knowledgeGrounding.resultCount).toBe(0);
    expect(report.hermes.watchClosure.openTaskCount).toBe(1);
    expect(
      report.roles.some((role) =>
        role.issues.some((issue) => issue.title === 'Requirements are decomposed to function level'),
      ),
    ).toBe(true);
    expect(
      report.roles.some((role) =>
        role.issues.some((issue) => issue.title === 'System-state knowledge grounding is visible' && issue.decision === 'Conditional'),
      ),
    ).toBe(true);
  });

  it('blocks review when required specialist activation trace is missing', () => {
    const committee = new ReviewCommittee();
    const report = committee.buildReportForRun({
      runId: 'run-003',
      artifactCount: 6,
      activeStageId: 'frontend-page',
      activatedSpecialistRoles: ['Research Review'],
      openSourceEvaluationPresent: true,
      hermesResearchFindings: [],
      hermesAutoPromotions: [],
      hermesWatchFindings: [],
      artifacts: [
        {
          path: 'docs/multimodal/run-003.md',
          content:
            'layout information architecture navigation structure module responsibility user flow interactive dynamic loading state empty state error state form table typography font family radius spacing state open source first build-vs-buy',
        },
      ],
    });

    expect(report.gate.blocked).toBe(true);
    expect(report.roles.some((role) => role.role === 'Specialist Activation Review')).toBe(true);
    expect(report.activationTrace?.some((item) => item.role === 'Design Review' && item.status === 'missing')).toBe(true);
  });
});
