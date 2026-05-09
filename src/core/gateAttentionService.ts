import type { TaskSsotGateCheck, TaskSsotGateEvent, TaskSsotTask } from '../shared/schemas.js';

type AttentionTaskInput = {
  taskId: string;
  sourceType: TaskSsotTask['sourceType'];
  sourceRef: TaskSsotTask['sourceRef'];
  currentStage: TaskSsotTask['currentStage'];
  continuation: Pick<TaskSsotTask['continuation'], 'mainlineLabel' | 'nextSafeStep' | 'resumeAnchor'>;
  gateChecks: TaskSsotGateCheck[];
  gateHistory: TaskSsotGateEvent[];
};

export class GateAttentionService {
  resolveCurrentAttention(task: AttentionTaskInput): NonNullable<TaskSsotTask['continuation']['currentAttention']> {
    const latestDecisionEvent = this.resolveLatestDecisionEvent(task.gateHistory);
    const workflowRunId = task.sourceType === 'workflow-run-task' ? task.sourceRef : null;

    if (latestDecisionEvent?.toStatus === 'block') {
      return this.buildAttention(task, workflowRunId, latestDecisionEvent.gateId, 'block', latestDecisionEvent.summary, latestDecisionEvent.actorRole);
    }

    const blockedGate = task.gateChecks.find((gate) => gate.status === 'block') ?? null;
    if (blockedGate) {
      return this.buildAttention(task, workflowRunId, blockedGate.gateId, blockedGate.status, blockedGate.reason, latestDecisionEvent?.actorRole ?? null);
    }

    const warnedGate = task.gateChecks.find((gate) => gate.status === 'warn') ?? null;
    if (warnedGate) {
      return this.buildAttention(task, workflowRunId, warnedGate.gateId, warnedGate.status, warnedGate.reason, latestDecisionEvent?.actorRole ?? null);
    }

    const normalizedStatus: 'pass' | 'warn' | 'block' | null =
      latestDecisionEvent?.toStatus === 'block' || latestDecisionEvent?.toStatus === 'warn' || latestDecisionEvent?.toStatus === 'pass'
        ? latestDecisionEvent.toStatus
        : null;

    return this.buildAttention(
      task,
      workflowRunId,
      latestDecisionEvent?.gateId ?? null,
      normalizedStatus,
      latestDecisionEvent?.summary ?? null,
      latestDecisionEvent?.actorRole ?? null,
    );
  }

  private resolveLatestDecisionEvent(gateHistory: TaskSsotGateEvent[]) {
    return (
      [...gateHistory]
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .find((event) => event.toStatus === 'pass' || event.toStatus === 'block') ?? null
    );
  }

  private buildAttention(
    task: AttentionTaskInput,
    workflowRunId: string | null,
    gateId: string | null,
    status: 'pass' | 'warn' | 'block' | null,
    reason: string | null,
    actorRole: string | null,
  ): NonNullable<TaskSsotTask['continuation']['currentAttention']> {
    return {
      taskId: task.taskId,
      workflowRunId,
      stageId: task.currentStage,
      mainlineLabel: task.continuation.mainlineLabel,
      gateId,
      status,
      reason,
      actorRole,
      nextSafeStep: task.continuation.nextSafeStep,
      resumeAnchor: task.continuation.resumeAnchor,
      suggestedActions: this.buildSuggestedActions({
        gateId,
        status,
        nextSafeStep: task.continuation.nextSafeStep,
      }),
      operatorEntries: this.buildOperatorEntries({
        taskId: task.taskId,
        workflowRunId,
        stageId: task.currentStage,
        gateId,
        status,
      }),
    };
  }

  private buildSuggestedActions(input: {
    gateId: string | null;
    status: 'pass' | 'warn' | 'block' | null;
    nextSafeStep: string | null;
  }) {
    const actions: string[] = [];
    if (input.gateId === 'review-convergence-gate') {
      actions.push(input.status === 'block' ? 'Resume or rework the blocked review path before claiming delivery.' : 'Complete the pending review loop and attach review evidence.');
    }
    if (input.gateId === 'design-confirmed-gate') {
      actions.push('Attach design confirmation evidence before continuing delivery or writeback.');
    }
    if (input.gateId === 'design-language-ready') {
      actions.push('Link the active DESIGN.md to the task context before continuing design delivery.');
    }
    if (input.gateId === 'project-truth-gate') {
      actions.push('Attach upstream truth or requirement references before continuing implementation.');
    }
    if (input.gateId === 'asset-backwrite-gate') {
      actions.push('Write repository-backed artifacts before marking the task as delivered.');
    }
    if (input.nextSafeStep) {
      actions.push(`Next safe step: ${input.nextSafeStep}`);
    }
    return actions.slice(0, 3);
  }

  private buildOperatorEntries(input: {
    taskId: string;
    workflowRunId: string | null;
    stageId: string | null;
    gateId: string | null;
    status: 'pass' | 'warn' | 'block' | null;
  }) {
    const entries: NonNullable<TaskSsotTask['continuation']['currentAttention']>['operatorEntries'] = [];

    entries.push(this.createEntry(input, 'refresh-proof', 'Refresh Proof'));

    if (input.gateId === 'review-convergence-gate') {
      entries.push(this.createEntry(input, 'approve-gate', 'Approve Gate'));
      if (input.status === 'block' || input.status === 'warn') {
        entries.push(this.createEntry(input, 'send-to-rework', 'Send To Rework'));
        entries.push(this.createEntry(input, 'resume-rework-stage', 'Resume Rework'));
      }
    }

    if (input.status === 'block') {
      entries.push(this.createEntry(input, 'tick-run', 'Tick Run'));
      entries.push(this.createEntry(input, 'tick-due', 'Tick Due'));
    }

    if (input.gateId === 'asset-backwrite-gate' || input.gateId === 'project-truth-gate') {
      entries.push(this.createEntry(input, 'resume-current-stage', 'Resume Current Stage'));
    }

    return entries.slice(0, 4);
  }

  private createEntry(
    input: {
      taskId: string;
      workflowRunId: string | null;
      stageId: string | null;
    },
    actionId: NonNullable<TaskSsotTask['continuation']['currentAttention']>['operatorEntries'][number]['actionId'],
    label: string,
  ) {
    return {
      actionId,
      label,
      targetTaskId: input.taskId,
      targetWorkflowRunId: input.workflowRunId,
      targetStageId: input.stageId,
    };
  }
}
