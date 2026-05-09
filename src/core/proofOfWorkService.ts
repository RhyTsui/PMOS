import type { CommitteeReport, ProofOfWorkBundle, TaskSsotSyncEnvelope, TaskSsotTask, WorkflowRun } from '../shared/schemas.js';
import { FinalStateValidationService } from './finalStateValidationService.js';
import { GateAttentionService } from './gateAttentionService.js';

export class ProofOfWorkService {
  constructor(
    private readonly finalStateValidationService = new FinalStateValidationService(),
    private readonly gateAttentionService = new GateAttentionService(),
  ) {}

  buildBundle(input: {
    task: TaskSsotTask;
    workflowRun: WorkflowRun | null;
    review: CommitteeReport | null;
    outboxEnvelopes: TaskSsotSyncEnvelope[];
  }): ProofOfWorkBundle {
    const finalState = this.finalStateValidationService.evaluateTask(input.task, input.workflowRun);
    const pass = input.task.gateChecks.filter((gate) => gate.status === 'pass').length;
    const warn = input.task.gateChecks.filter((gate) => gate.status === 'warn').length;
    const block = input.task.gateChecks.filter((gate) => gate.status === 'block').length;
    const artifactPaths = [
      ...new Set([
        ...input.task.artifactLinks.map((artifact) => artifact.artifactPath),
        ...(input.workflowRun?.tasks.flatMap((task) => task.artifactPaths) ?? []),
        ...(input.workflowRun?.stages.flatMap((stage) => stage.outputPaths) ?? []),
      ]),
    ];
    const pending = input.outboxEnvelopes.filter((item) => item.status === 'pending' || item.status === 'processing').length;
    const failed = input.outboxEnvelopes.filter((item) => item.status === 'failed' || item.status === 'dropped').length;
    const completed = input.outboxEnvelopes.filter((item) => item.status === 'completed').length;
    const reviewerAgentIds = input.task.agentAssignments
      .filter((assignment) => assignment.assignmentType === 'reviewer')
      .map((assignment) => assignment.agentId);
    const latestDecisionEvent = this.resolveLatestDecisionEvent(input.task);
    const currentAttention = this.enrichCurrentAttention(
      this.gateAttentionService.resolveCurrentAttention(input.task),
      input.review,
    );
    const approvalStatus =
      input.review?.gate.decision === 'pass'
        ? 'approved'
        : input.review?.gate.decision === 'conditional'
          ? 'conditional'
          : input.review?.gate.decision === 'reject'
            ? 'rejected'
            : 'pending';
    const reviewDecision = input.review
      ? input.review.gate.decision === 'pass'
        ? 'pass'
        : input.review.gate.decision === 'conditional'
          ? 'conditional'
          : 'reject'
      : 'not-run';
    const requiredActivationTrace = (input.review?.activationTrace ?? []).filter((item) => item.required);
    const missingActivationCount = requiredActivationTrace.filter((item) => !item.activated || item.status === 'missing').length;
    const assumedActivationCount = requiredActivationTrace.filter((item) => item.status === 'assumed' || item.source === 'implicit-stage-default').length;
    const requiredEvidence: ProofOfWorkBundle['acceptancePackage']['requiredEvidence'] = [
      {
        id: 'final-state-validation',
        label: 'Final-state validation',
        status: finalState.status === 'ready' ? 'pass' : finalState.status === 'rework' ? 'warn' : 'block',
        detail: finalState.summary,
        evidencePaths: artifactPaths,
      },
      {
        id: 'frontend-browser-verification',
        label: 'Frontend browser verification',
        status:
          !finalState.browserVerification || finalState.browserVerification.status === 'not-applicable'
            ? 'pass'
            : finalState.browserVerification.status === 'pass'
              ? 'pass'
              : finalState.browserVerification.status === 'block'
                ? 'block'
                : 'warn',
        detail:
          finalState.browserVerification?.summary
          ?? 'Frontend browser verification is not applicable for the current task.',
        evidencePaths:
          finalState.browserVerification?.checks.flatMap((check) => check.evidencePaths) ?? [],
      },
      {
        id: 'review-decision',
        label: 'Review decision',
        status: reviewDecision === 'pass' ? 'pass' : reviewDecision === 'conditional' ? 'warn' : 'block',
        detail:
          reviewDecision === 'not-run'
            ? 'No review result is attached yet.'
            : `Review decision is ${reviewDecision}: ${input.review?.summary ?? input.review?.overallConclusion ?? 'no summary'}`,
        evidencePaths: input.review ? artifactPaths.filter((artifactPath) => /review|committee|approval/iu.test(artifactPath)) : [],
      },
      {
        id: 'specialist-activation',
        label: 'Specialist activation',
        status:
          !input.review
            ? 'warn'
            : requiredActivationTrace.length === 0
              ? 'warn'
            : missingActivationCount > 0
              ? 'block'
              : assumedActivationCount > 0
                ? 'warn'
                : 'pass',
        detail:
          !input.review
            ? 'No committee review package is attached yet, so specialist activation cannot be verified.'
            : requiredActivationTrace.length === 0
              ? 'Committee review is attached, but no specialist activation trace was recorded yet.'
            : missingActivationCount > 0
              ? `${missingActivationCount} required specialist role(s) are still missing from the activation trace.`
              : assumedActivationCount > 0
                ? `${assumedActivationCount} required specialist role(s) are still implicit defaults instead of runtime-backed activation evidence.`
                : `All ${requiredActivationTrace.length} required specialist role(s) are runtime-backed in the activation trace.`,
        evidencePaths: input.review
          ? artifactPaths.filter((artifactPath) => /review|committee|approval|specialist|product-chief/iu.test(artifactPath))
          : [],
      },
      {
        id: 'hermes-governance',
        label: 'Hermes governance',
        status:
          input.review?.hermes.overallDecision === 'promote' || input.review?.hermes.overallDecision === 'keep'
            ? 'pass'
            : input.review?.hermes.overallDecision === 'revise'
              ? 'warn'
              : input.review?.hermes.overallDecision === 'block'
                ? 'block'
                : 'warn',
        detail: input.review?.hermes
          ? `Hermes decision is ${input.review.hermes.overallDecision}: ${input.review.hermes.summary}`
          : 'No Hermes governance summary is attached yet.',
        evidencePaths: input.review ? artifactPaths.filter((artifactPath) => /review|committee|approval|hermes/iu.test(artifactPath)) : [],
      },
      {
        id: 'hermes-loop-closure',
        label: 'Hermes loop closure',
        status:
          input.review?.hermes.watchClosure.openTaskCount || input.review?.hermes.writebackClosure.openTargets
            ? 'warn'
            : input.review?.hermes.writebackClosure.totalTargets || input.review?.hermes.watchClosure.resolvedFindings
              ? 'pass'
              : 'warn',
        detail: input.review?.hermes
          ? [
              input.review.hermes.writebackClosure.summary,
              input.review.hermes.watchClosure.summary,
            ].filter((item): item is string => Boolean(item)).join(' ')
          : 'No Hermes loop-closure summary is attached yet.',
        evidencePaths: input.review
          ? artifactPaths.filter((artifactPath) => /review|committee|approval|hermes|writeback|closure/iu.test(artifactPath))
          : [],
      },
      {
        id: 'gate-traceability',
        label: 'Gate traceability',
        status:
          block > 0 || latestDecisionEvent?.toStatus === 'block' || currentAttention.status === 'block'
            ? 'block'
            : input.task.gateHistory.length > 0 && warn === 0
              ? 'pass'
              : input.task.gateHistory.length > 0 || warn > 0
                ? 'warn'
                : 'block',
        detail:
          block > 0 || latestDecisionEvent?.toStatus === 'block' || currentAttention.status === 'block'
            ? `There are still ${block} blocked gate(s) in the acceptance chain.`
            : input.task.gateHistory.length > 0 && warn === 0
              ? `Gate history is traceable with ${input.task.gateHistory.length} recorded event(s) and no outstanding gate warnings.`
              : input.task.gateHistory.length > 0 || warn > 0
                ? `Gate history exists, but ${warn} warning gate(s) still need closure before full acceptance.`
                : 'No gate-traceability history is attached yet.',
        evidencePaths: [
          ...new Set(
            input.task.gateHistory.flatMap((event) => [...event.artifactRefs, ...event.evidenceRefs]),
          ),
        ],
      },
      {
        id: 'outbox-receipts',
        label: 'Outbox receipts',
        status:
          failed > 0
            ? 'block'
            : pending > 0
              ? 'warn'
              : completed > 0
                ? 'pass'
                : 'warn',
        detail:
          failed > 0
            ? `${failed} outbox sync(s) failed or were dropped.`
            : pending > 0
              ? `${pending} outbox sync(s) are still pending or processing.`
              : completed > 0
                ? `${completed} downstream receipt(s) are attached.`
                : 'No downstream outbox receipts are attached yet.',
        evidencePaths: input.outboxEnvelopes.map((item) => item.receiptRef).filter((value): value is string => Boolean(value)),
      },
      {
        id: 'continuation-handoff',
        label: 'Continuation handoff',
        status:
          input.task.continuation.mainlineLabel && (input.task.currentStage || input.task.continuation.nextSafeStep)
            ? 'pass'
            : 'warn',
        detail:
          input.task.continuation.mainlineLabel && (input.task.currentStage || input.task.continuation.nextSafeStep)
            ? 'Mainline label, current stage, and next-safe-step context are attached for operator handoff.'
            : 'Acceptance package still lacks a strong handoff anchor for continuation or operator takeover.',
        evidencePaths: input.task.continuation.resumeAnchor ? [input.task.continuation.resumeAnchor] : [],
      },
    ];
    const missingEvidence = [
      artifactPaths.length === 0 ? 'repository-backed artifacts' : null,
      reviewDecision === 'not-run' ? 'review decision' : null,
      !input.review || requiredActivationTrace.length === 0 || missingActivationCount > 0 || assumedActivationCount > 0
        ? 'specialist activation evidence'
        : null,
      input.task.gateHistory.length === 0 ? 'gate history traceability' : null,
      completed === 0 ? 'downstream receipt' : null,
      !input.task.continuation.resumeAnchor ? 'resume anchor' : null,
    ].filter((item): item is string => Boolean(item));
    const acceptanceVerdict =
      finalState.status === 'blocked'
      || reviewDecision === 'reject'
      || failed > 0
      || block > 0
      || latestDecisionEvent?.toStatus === 'block'
      || currentAttention.status === 'block'
        ? 'blocked'
        : finalState.status === 'ready' && reviewDecision === 'pass' && pending === 0 && missingEvidence.length === 0
          ? 'accepted'
          : 'conditional';
    const acceptanceSummary =
      acceptanceVerdict === 'accepted'
        ? 'Acceptance package is complete enough for sign-off: validation passed, review approved, and delivery receipts are attached.'
        : acceptanceVerdict === 'blocked'
          ? 'Acceptance package is blocked: at least one hard blocker remains in validation, review, gate traceability, or downstream delivery receipts.'
          : 'Acceptance package is usable for operator review, but still carries warnings or missing evidence that should be closed before final sign-off.';

    return {
      taskId: input.task.taskId,
      workflowRunId: input.workflowRun?.id ?? null,
      subprojectId: input.task.subprojectId ?? input.workflowRun?.subprojectId ?? null,
      generatedAt: new Date().toISOString(),
      status: finalState.status,
      summary:
        finalState.status === 'ready'
          ? 'Proof-of-work bundle is ready: final-state passed, artifacts are attached, and downstream evidence can be reviewed from one bundle.'
          : finalState.status === 'blocked'
            ? 'Proof-of-work bundle is blocked: one or more hard blockers still remain in final-state or gate evidence.'
            : 'Proof-of-work bundle exists, but rework is still required before the delivery claim is trustworthy.',
      finalState,
      gateSummary: {
        pass,
        warn,
        block,
      },
      gateHistory: {
        total: input.task.gateHistory.length,
        recentEvents: [...input.task.gateHistory].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).slice(0, 5),
        latestDecisionEvent,
        blockedGates: input.task.gateChecks.filter((gate) => gate.status === 'block'),
        currentAttention,
      },
      ownership: {
        ownerAgentId: input.task.currentOwnerAgentId,
        reviewerAgentIds,
        approvalStatus,
        approver: input.review ? 'review-committee' : null,
      },
      artifactPaths,
      review: {
        decision: reviewDecision,
        summary: input.review?.summary ?? input.review?.overallConclusion ?? 'No workflow review evidence is attached to this proof-of-work bundle yet.',
        hermesDecision: input.review?.hermes.overallDecision ?? null,
        hermesSummary: input.review?.hermes.summary ?? null,
        hermesActions: input.review?.hermes.actions ?? [],
      },
      acceptancePackage: {
        verdict: acceptanceVerdict,
        summary: acceptanceSummary,
        missingEvidence,
        requiredEvidence: [...requiredEvidence],
        handoff: {
          mainlineLabel: input.task.continuation.mainlineLabel ?? null,
          currentStage: input.task.currentStage ?? null,
          resumeAnchor: input.task.continuation.resumeAnchor ?? null,
          nextSafeStep: input.task.continuation.nextSafeStep ?? null,
        },
      },
      outbox: {
        total: input.outboxEnvelopes.length,
        pending,
        failed,
        completed,
        receiptRefs: input.outboxEnvelopes.map((item) => item.receiptRef).filter((value): value is string => Boolean(value)),
      },
    };
  }

  private enrichCurrentAttention(
    attention: ProofOfWorkBundle['gateHistory']['currentAttention'],
    review: CommitteeReport | null,
  ): ProofOfWorkBundle['gateHistory']['currentAttention'] {
    if (!review) {
      return attention;
    }

    const extraActions: string[] = [];
    if (review.hermes.writebackClosure.openTargets > 0) {
      extraActions.push(
        `Execute ${review.hermes.writebackClosure.openTargets} Hermes writeback target(s) before claiming governed closure.`,
      );
    }
    if (review.hermes.watchClosure.openTaskCount > 0) {
      extraActions.push(
        `Resolve ${review.hermes.watchClosure.openTaskCount} Hermes watch task(s) and return closure evidence.`,
      );
    }
    if (review.hermes.watchClosure.closureEvidenceCount > 0) {
      extraActions.push(
        `Hermes already recovered ${review.hermes.watchClosure.closureEvidenceCount} closure evidence item(s); refresh proof after more writeback/watch tasks close.`,
      );
    }
    const requiredActivationTrace = (review.activationTrace ?? []).filter((item) => item.required);
    const missingActivationCount = requiredActivationTrace.filter((item) => item.status === 'missing' || !item.activated).length;
    const assumedActivationCount = requiredActivationTrace.filter((item) => item.status === 'assumed').length;
    if (missingActivationCount > 0) {
      extraActions.push(
        `Provide ${missingActivationCount} missing specialist activation evidence before treating this review as valid delivery proof.`,
      );
    } else if (assumedActivationCount > 0) {
      extraActions.push(
        `Replace ${assumedActivationCount} implicit specialist activation default(s) with runtime-backed reviewer evidence.`,
      );
    }
    if (extraActions.length === 0) {
      return attention;
    }

    return {
      ...attention,
      suggestedActions: [...new Set([...extraActions, ...attention.suggestedActions])].slice(0, 5),
      operatorEntries:
        review.hermes.writebackClosure.openTargets > 0 || review.hermes.watchClosure.openTaskCount > 0 || missingActivationCount > 0 || assumedActivationCount > 0
          ? [
              ...(review.hermes.writebackClosure.openTargets > 0
                ? [{
                    actionId: 'execute-hermes-writeback' as const,
                    label: 'Execute Hermes Writeback',
                    targetTaskId: attention.taskId,
                    targetWorkflowRunId: attention.workflowRunId,
                    targetStageId: attention.stageId,
                  }]
                : []),
              ...(missingActivationCount > 0 || assumedActivationCount > 0
                ? [{
                    actionId: 'resume-current-stage' as const,
                    label: 'Refresh Specialist Evidence',
                    targetTaskId: attention.taskId,
                    targetWorkflowRunId: attention.workflowRunId,
                    targetStageId: attention.stageId,
                  }]
                : []),
              {
                actionId: 'close-hermes-loop' as const,
                label: 'Close Hermes Loop',
                targetTaskId: attention.taskId,
                targetWorkflowRunId: attention.workflowRunId,
                targetStageId: attention.stageId,
              },
              ...attention.operatorEntries,
            ].slice(0, 5)
          : attention.operatorEntries,
    };
  }

  private resolveLatestDecisionEvent(task: TaskSsotTask) {
    return (
      [...task.gateHistory]
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .find((event) => event.toStatus === 'pass' || event.toStatus === 'block') ?? null
    );
  }

}
