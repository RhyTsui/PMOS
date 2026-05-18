import type { ContextInjectionBundle, TaskSsotTask, WorkflowRun } from '../shared/schemas.js';

export class ContextInjectionService {
  buildBundle(task: TaskSsotTask, workflowRun: WorkflowRun | null = null): ContextInjectionBundle {
    const activeGateIds = task.gateChecks
      .filter((gate) => gate.status === 'warn' || gate.status === 'block')
      .map((gate) => gate.gateId);
    const blockedGateIds = task.gateChecks
      .filter((gate) => gate.status === 'block')
      .map((gate) => gate.gateId);
    const truthRefs = task.originalDemandRefs.length > 0
      ? task.originalDemandRefs
      : task.artifactLinks.filter((artifact) => artifact.roleInTask === 'upstream-truth').map((artifact) => artifact.artifactPath);
    const artifactRefs = task.artifactLinks
      .filter((artifact) => artifact.roleInTask === 'working-output' || artifact.roleInTask === 'final-delivery')
      .map((artifact) => artifact.artifactPath);
    const reviewEvidenceRefs = task.artifactLinks
      .filter((artifact) => artifact.roleInTask === 'review-evidence')
      .map((artifact) => artifact.artifactPath);
    const syncTargets = [...new Set(task.syncEnvelopes.map((envelope) => `${envelope.targetSystem}:${envelope.action}`))];
    const redlines = this.resolveRedlines(task);

    return {
      taskId: task.taskId,
      workflowRunId: task.sourceType === 'workflow-run-task' ? task.sourceRef : null,
      subprojectId: task.subprojectId,
      generatedAt: new Date().toISOString(),
      collaborationLevel: task.collaborationLevel,
      projectLabel: workflowRun?.projectName ?? task.continuation.mainlineLabel ?? task.title,
      currentStage: task.currentStage ?? workflowRun?.currentStageId ?? null,
      activeGateIds,
      blockedGateIds,
      truthRefs,
      artifactRefs,
      reviewEvidenceRefs,
      syncTargets,
      resumeAnchor: task.continuation.resumeAnchor,
      nextSafeStep: task.continuation.nextSafeStep,
      redlines,
    };
  }

  private resolveRedlines(task: TaskSsotTask) {
    const redlines: string[] = [];
    if (task.gateChecks.some((gate) => gate.gateId === 'asset-backwrite-gate' && gate.status !== 'pass')) {
      redlines.push('未回写真源不算完成');
    }
    if (task.gateChecks.some((gate) => gate.gateId === 'specialist-activation-gate' && gate.status !== 'pass')) {
      redlines.push('缺少 runtime-backed specialist activation');
    }
    if (task.gateChecks.some((gate) => gate.gateId === 'review-convergence-gate' && gate.status === 'block')) {
      redlines.push('review 未收敛前不得继续下游交付');
    }
    if (task.gateChecks.some((gate) => gate.gateId === 'project-truth-gate' && gate.status !== 'pass')) {
      redlines.push('上游真源未挂接前不得视为稳定主线');
    }
    return redlines;
  }
}
