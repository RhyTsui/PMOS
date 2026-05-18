import type { FinalStateValidationCheck, FinalStateValidationReport, TaskSsotTask, WorkflowRun } from '../shared/schemas.js';
import { FrontendBrowserVerificationService } from './frontendBrowserVerificationService.js';

export class FinalStateValidationService {
  constructor(
    private readonly frontendBrowserVerificationService = new FrontendBrowserVerificationService(),
  ) {}

  evaluateTask(task: TaskSsotTask, workflowRun: WorkflowRun | null = null): FinalStateValidationReport {
    const browserVerification = this.frontendBrowserVerificationService.evaluateTask(task, workflowRun);
    const automatedAcceptanceEvidencePaths = task.artifactLinks
      .map((artifact) => artifact.artifactPath)
      .filter((artifactPath) => /auto-acceptance-/iu.test(artifactPath));
    const hasFinalDeliveryBackwrite = task.artifactLinks.some((artifact) => artifact.roleInTask === 'final-delivery');
    const hasWorkingBackwrite = task.artifactLinks.some((artifact) => artifact.roleInTask === 'working-output');
    const backwriteGate = task.gateChecks.find((gate) => gate.gateId === 'asset-backwrite-gate') ?? null;
    const checks: FinalStateValidationCheck[] = [
      {
        id: 'completeness',
        label: 'Completeness',
        status: task.artifactLinks.length > 0 ? 'pass' : 'block',
        detail:
          task.artifactLinks.length > 0
            ? 'Task has repository-backed artifacts attached.'
            : 'Task has no repository-backed artifacts attached yet.',
      },
      {
        id: 'consistency',
        label: 'Consistency',
        status: task.gateChecks.some((gate) => gate.status === 'block') ? 'block' : 'pass',
        detail:
          task.gateChecks.some((gate) => gate.status === 'block')
            ? 'At least one gate is still blocked.'
            : 'No gate is currently blocked.',
      },
      {
        id: 'downstream-readiness',
        label: 'Downstream readiness',
        status: task.status === 'completed' || task.status === 'ready_for_delivery' ? 'pass' : task.status === 'blocked' ? 'block' : 'warn',
        detail:
          task.status === 'completed' || task.status === 'ready_for_delivery'
            ? 'Task status indicates downstream delivery readiness.'
            : task.status === 'blocked'
              ? 'Task is blocked and not ready for downstream delivery.'
              : 'Task is still in motion; downstream readiness is not final yet.',
      },
      {
        id: 'backwrite-completeness',
        label: 'Backwrite completeness',
        status:
          hasFinalDeliveryBackwrite
            ? 'pass'
            : task.status === 'completed' || task.status === 'ready_for_delivery'
              ? 'block'
              : hasWorkingBackwrite
                ? 'warn'
                : 'warn',
        detail:
          hasFinalDeliveryBackwrite
            ? 'Task wrote back final delivery artifacts.'
            : task.status === 'completed' || task.status === 'ready_for_delivery'
              ? 'Task reached delivery state without final-delivery backwrite artifacts.'
              : hasWorkingBackwrite
              ? 'Task only wrote back working artifacts and still needs final delivery backwrite.'
              : 'Task still lacks explicit working/final backwrite artifacts.',
      },
    ];
    if (browserVerification.applicable) {
      checks.push({
        id: 'automated-acceptance-gate',
        label: 'Automated acceptance gate',
        status:
          automatedAcceptanceEvidencePaths.length > 0
            ? 'pass'
            : task.status === 'completed' || task.status === 'ready_for_delivery'
              ? 'block'
              : 'warn',
        detail:
          automatedAcceptanceEvidencePaths.length > 0
            ? 'Automated acceptance evidence is attached to the task.'
            : task.status === 'completed' || task.status === 'ready_for_delivery'
              ? 'Frontend delivery reached a delivery state before automated acceptance was executed.'
              : 'Automated acceptance has not been executed yet for this frontend delivery task.',
      });
    }
    if (backwriteGate && backwriteGate.status === 'block') {
      checks.push({
        id: 'backwrite-gate',
        label: 'Asset backwrite gate',
        status: 'block',
        detail: backwriteGate.reason,
      });
    }
    if (browserVerification.applicable) {
      checks.push({
        id: 'frontend-browser-verification',
        label: 'Frontend browser verification',
        status:
          browserVerification.status === 'pass'
            ? 'pass'
            : browserVerification.status === 'block'
              ? 'block'
              : 'warn',
        detail: browserVerification.summary,
      });
    }

    const status =
      checks.some((check) => check.status === 'block')
        ? 'blocked'
        : checks.some((check) => check.status === 'warn')
          ? 'rework'
          : 'ready';

    return {
      taskId: task.taskId,
      status,
      generatedAt: new Date().toISOString(),
      checks,
      browserVerification: browserVerification.applicable ? browserVerification : null,
      summary:
        status === 'ready'
          ? 'Task passed final-state validation.'
          : status === 'blocked'
            ? 'Task failed final-state validation because one or more hard blockers remain.'
            : 'Task needs rework before it can be considered delivery-ready.',
    };
  }
}
