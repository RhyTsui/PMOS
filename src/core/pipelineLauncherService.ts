import type { PipelineLauncherPlan, TaskSsotTask, WorkflowRun } from '../shared/schemas.js';

const PIPELINE_STAGE_GROUPS: Array<{
  id: string;
  label: string;
  trigger: string;
  sourceStages: string[];
  targetStages: string[];
  requiredSignals: Array<'truth' | 'review' | 'design' | 'delivery'>;
}> = [
  {
    id: 'requirements-to-functional',
    label: 'Requirements -> Functional',
    trigger: '需求真源已稳定，可起功能拆解链',
    sourceStages: ['requirements-document'],
    targetStages: ['functional-specification'],
    requiredSignals: ['truth'],
  },
  {
    id: 'functional-to-design',
    label: 'Functional -> Design',
    trigger: '功能契约收敛，可起设计约束链',
    sourceStages: ['functional-specification'],
    targetStages: ['design-document', 'frontend-page'],
    requiredSignals: ['truth', 'review'],
  },
  {
    id: 'design-to-delivery',
    label: 'Design -> Delivery',
    trigger: '设计约束与确认证据齐备，可起前端交付链',
    sourceStages: ['design-document', 'frontend-page'],
    targetStages: ['data-schema', 'backend-api', 'frontend-backend-integration'],
    requiredSignals: ['truth', 'review', 'design', 'delivery'],
  },
];

export class PipelineLauncherService {
  buildPlans(task: TaskSsotTask, workflowRun: WorkflowRun | null = null): PipelineLauncherPlan[] {
    const sourceStage = task.currentStage;
    const truthReady = task.gateChecks.some((gate) => gate.gateId === 'project-truth-gate' && gate.status === 'pass');
    const reviewReady = task.gateChecks.some((gate) => gate.gateId === 'review-convergence-gate' && gate.status === 'pass');
    const designReady = task.gateChecks.some(
      (gate) => (gate.gateId === 'design-language-ready' || gate.gateId === 'design-confirmed-gate') && gate.status === 'pass',
    );
    const deliveryReady = task.gateChecks.some((gate) => gate.gateId === 'asset-backwrite-gate' && gate.status === 'pass');
    const evidenceRefs = task.artifactLinks.map((artifact) => artifact.artifactPath);

    return PIPELINE_STAGE_GROUPS
      .filter((group) => group.sourceStages.includes(sourceStage))
      .map((group) => {
        const missingInputs: string[] = [];
        if (group.requiredSignals.includes('truth') && !truthReady) {
          missingInputs.push('上游真源');
        }
        if (group.requiredSignals.includes('review') && !reviewReady) {
          missingInputs.push('review 收敛证据');
        }
        if (group.requiredSignals.includes('design') && !designReady) {
          missingInputs.push('设计约束/确认');
        }
        if (group.requiredSignals.includes('delivery') && !deliveryReady) {
          missingInputs.push('回写交付物');
        }
        const status = task.status === 'blocked'
          ? 'blocked'
          : missingInputs.length > 0
            ? 'needs-input'
            : 'ready';
        return {
          id: group.id,
          label: group.label,
          status,
          sourceTaskId: task.taskId,
          sourceStageId: sourceStage,
          trigger: group.trigger,
          targetStages: group.targetStages,
          missingInputs,
          evidenceRefs,
          nextAction:
            status === 'ready'
              ? `Launch ${group.targetStages.join(' -> ')} from ${workflowRun?.projectName ?? task.title}.`
              : status === 'blocked'
                ? 'Clear active blocker before launching downstream pipeline.'
                : `Backfill ${missingInputs.join(' / ')} before launching this pipeline.`,
        } satisfies PipelineLauncherPlan;
      });
  }

  async triggerPlan(input: {
    task: TaskSsotTask;
    workflowRun: WorkflowRun;
    planId: string;
    resumeRun: (targetStageId: string, reason: string) => Promise<WorkflowRun>;
  }) {
    const plan = this.buildPlans(input.task, input.workflowRun).find((item) => item.id === input.planId);
    if (!plan) {
      throw new Error(`pipeline launcher plan ${input.planId} not found`);
    }
    if (plan.status !== 'ready') {
      throw new Error(`pipeline launcher plan ${plan.id} is not ready: ${plan.missingInputs.join('; ') || plan.status}`);
    }
    const targetStageId = plan.targetStages[0];
    if (!targetStageId) {
      throw new Error(`pipeline launcher plan ${plan.id} has no target stage`);
    }

    const workflowRun = await input.resumeRun(targetStageId, `pipeline-launcher:${plan.id}`);
    return {
      taskId: input.task.taskId,
      plan,
      targetStageId,
      workflowRun,
    };
  }
}
