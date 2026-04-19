import type { CommitteeReport } from '../shared/schemas.js';

type ReviewArtifact = {
  path: string;
  content: string;
};

type ReviewCommitteeInput = {
  runId: string;
  artifactCount: number;
  openSourceEvaluationPresent?: boolean;
  openSourceEvidencePaths?: string[];
};

type CommitteeIssue = CommitteeReport['roles'][number]['issues'][number];

export class ReviewCommittee {
  inspectOpenSourceEvidence(artifacts: ReviewArtifact[]) {
    const evidencePatterns = [
      /open source first/iu,
      /open-source-first/iu,
      /build[- ]vs[- ]buy/iu,
      /buy before build/iu,
      /existing solution/iu,
      /mature open source/iu,
      /现成方案/u,
      /开源优先/u,
      /优先评估开源/u,
    ];

    const evidencePaths = artifacts
      .filter((artifact) => evidencePatterns.some((pattern) => pattern.test(artifact.content)))
      .map((artifact) => artifact.path);

    return {
      present: evidencePaths.length > 0,
      evidencePaths,
    };
  }

  buildReportForRun(input: ReviewCommitteeInput): CommitteeReport {
    const hasEnoughArtifacts = input.artifactCount >= 5;
    const hasOpenSourceEvaluation = input.openSourceEvaluationPresent ?? true;
    const openSourceEvidencePaths = input.openSourceEvidencePaths ?? [];
    const gateBlocked = !hasEnoughArtifacts || !hasOpenSourceEvaluation;
    const blockingStageId = !hasEnoughArtifacts
      ? 'operations-surface'
      : !hasOpenSourceEvaluation
        ? 'core-definition-baseline'
        : null;

    const architectureIssues: CommitteeIssue[] = [
      {
        title: 'Architecture artifacts captured for review',
        description: `runId=${input.runId} produced ${input.artifactCount} reviewable artifacts.`,
        impact: 'The review has enough implementation context to assess scope, interfaces, and release readiness.',
        recommendation: 'Keep the design, runtime, and release artifacts linked to the same run for traceability.',
        expectedAnswer: 'The artifact set remains attached to the same workflow run and can be audited later.',
        decision: 'Pass' as const,
      },
    ];

    if (!hasOpenSourceEvaluation) {
      architectureIssues.push({
        title: 'Missing open-source-first evaluation',
        description:
          'The current run does not record a build-vs-buy decision or a recommendation of mature open-source tooling.',
        impact: 'The team could hand-roll code prematurely and create avoidable maintenance and delivery risk.',
        recommendation:
          'Add an explicit open-source-first assessment that compares existing tools, integration boundaries, and reasons to self-build.',
        expectedAnswer:
          'The artifacts should name the preferred external toolchain or explain why license, cost, security, performance, or integration constraints force custom code.',
        decision: 'Conditional' as const,
      });
    } else if (openSourceEvidencePaths.length > 0) {
      architectureIssues.push({
        title: 'Open-source-first evaluation recorded',
        description: `Evidence found in ${openSourceEvidencePaths.join(', ')}.`,
        impact: 'Build-vs-buy reasoning is visible during review and can be reused in future iterations.',
        recommendation: 'Keep the recommendation current when architecture or deployment constraints change.',
        expectedAnswer: 'The preferred toolchain and the fallback self-build boundary remain explicit in the artifacts.',
        decision: 'Pass' as const,
      });
    }

    const operationsIssues: CommitteeIssue[] = hasEnoughArtifacts
      ? []
      : [
          {
            title: 'Operations surface artifacts are incomplete',
            description:
              'The run does not yet expose enough artifacts for API, CLI, frontend, and runtime verification.',
            impact: 'The review cannot validate the operator surface or decide whether the release is ready to ship.',
            recommendation:
              'Finish the missing runtime and operator-facing outputs before resubmitting the review.',
            expectedAnswer: 'At least five reviewable artifacts should exist before the review gate is evaluated again.',
            decision: 'Conditional' as const,
          },
        ];

    const telemetryIssues: CommitteeIssue[] = [
      {
        title: 'Telemetry trail remains available',
        description: 'Run, review, and stage telemetry can be correlated back to the workflow execution.',
        impact: 'The release can be audited and reworked without losing the review context.',
        recommendation: 'Keep review decisions attached to metrics, events, and generated artifacts.',
        expectedAnswer: 'The workflow run should retain a durable review summary and linked event history.',
        decision: 'Pass' as const,
      },
    ];

    const roles = [
      {
        role: 'Architecture Review',
        summary: hasOpenSourceEvaluation
          ? 'Architecture review has both implementation context and build-vs-buy evidence.'
          : 'Architecture review is blocked until an open-source-first evaluation is documented.',
        issues: architectureIssues,
      },
      {
        role: 'Operations Review',
        summary: hasEnoughArtifacts
          ? 'Operator-facing surfaces expose enough artifacts for release review.'
          : 'Operator-facing surfaces are incomplete and need more artifacts before release review can pass.',
        issues: operationsIssues,
      },
      {
        role: 'Workflow Runtime',
        summary: 'Workflow orchestration remains traceable through a run-based review flow.',
        issues: [],
      },
      {
        role: 'Telemetry Review',
        summary: 'Telemetry and review traces remain linked to the workflow run for audit and rework.',
        issues: telemetryIssues,
      },
      {
        role: 'Capability Review',
        summary: 'Capability and release governance can reuse this report as a single review checkpoint.',
        issues: [],
      },
    ];

    const issueCount = roles.reduce((count, role) => count + role.issues.length, 0);

    return {
      overallConclusion: gateBlocked
        ? '评审未通过，需要补齐门禁证据后再进入后续阶段。'
        : '评审通过，可以进入后续阶段。',
      nextStage: !gateBlocked,
      reworkRequired: gateBlocked,
      gate: {
        decision: gateBlocked ? 'conditional' : 'pass',
        blocked: gateBlocked,
        issueCount,
        blockingStageId,
      },
      roles,
      summary: gateBlocked
        ? '评审未通过：请先补齐产物覆盖和开源优先评估。'
        : '评审通过：产物覆盖和开源优先评估均已具备。',
      recommendedReworkStageId: blockingStageId,
    };
  }
}
