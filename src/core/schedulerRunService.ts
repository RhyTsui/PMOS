import type { CommitteeReport, SchedulerRun, WorkflowRun } from '../shared/schemas.js';
import { HermesPolicyService } from './hermesPolicyService.js';
import { MemoryService } from './memoryService.js';
import { OrchestratorRuntime } from './orchestratorRuntime.js';
import { ReviewCommittee } from './reviewCommittee.js';
import { SpecialistActivationService } from './specialistActivationService.js';
import { WorkflowEngine } from './workflowEngine.js';

type SchedulerAction = 'advance' | 'resume-current-stage' | 'resume-rework-stage';

type ScheduleRunInput = {
  cooldownUntil?: string | null;
  action?: SchedulerAction | null;
  reason?: string | null;
  subprojectId?: string | null;
};

type ResolvedSchedulerPlan = {
  action: SchedulerAction | null;
  reason: string | null;
  mode: 'scheduled' | 'auto-rework' | 'auto-retry' | 'idle';
};

const AUTO_RETRY_MAX_ATTEMPTS = 3;

export class SchedulerRunService {
  constructor(
    private readonly orchestratorRuntime: OrchestratorRuntime,
    private readonly memoryService: MemoryService,
    private readonly workflowEngine: WorkflowEngine,
    private readonly reviewCommittee: ReviewCommittee,
    private readonly hermesPolicyService: HermesPolicyService,
    private readonly specialistActivationService = new SpecialistActivationService(),
  ) {}

  async listRuns(subprojectId?: string | null): Promise<SchedulerRun[]> {
    const runs = await this.orchestratorRuntime.listRuns(subprojectId);
    return runs.map((run) => this.toSchedulerRun(run)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getRun(workflowRunId: string, subprojectId?: string | null): Promise<SchedulerRun> {
    const run = await this.orchestratorRuntime.loadRun(workflowRunId, subprojectId);
    return this.toSchedulerRun(run);
  }

  async scheduleRun(workflowRunId: string, input: ScheduleRunInput): Promise<SchedulerRun> {
    const run = await this.orchestratorRuntime.loadRun(workflowRunId, input.subprojectId);
    const now = new Date().toISOString();
    const updated: WorkflowRun = {
      ...run,
      updatedAt: now,
      metadata: {
        ...run.metadata,
        cooldownUntil: input.cooldownUntil ?? null,
        schedulerAction: input.action ?? null,
        schedulerReason: input.reason ?? null,
        schedulerUpdatedAt: now,
      },
    };

    await this.memoryService.appendEvent(
      run.id,
      {
        id: `${run.id}-scheduler-plan-${now.replace(/[-:.TZ]/gu, '').slice(0, 14)}`,
        runId: run.id,
        stageId: run.currentStageId ?? 'scheduler',
        kind: 'review_recorded',
        status: 'ok',
        timestamp: now,
        detail: `Scheduler plan updated: action=${input.action ?? 'none'}, cooldownUntil=${input.cooldownUntil ?? 'none'}.`,
        artifactPath: null,
        metadata: {
          source: 'scheduler',
          schedulerAction: input.action ?? null,
          cooldownUntil: input.cooldownUntil ?? null,
          schedulerReason: input.reason ?? null,
        },
      },
      run.subprojectId,
    );
    await this.memoryService.saveRunSnapshot(run.id, updated);
    return this.toSchedulerRun(updated);
  }

  async tickRun(workflowRunId: string, subprojectId?: string | null): Promise<SchedulerRun> {
    let run = await this.orchestratorRuntime.loadRun(workflowRunId, subprojectId);
    const now = new Date();
    const schedulerPlan = this.resolveSchedulerPlan(run);
    const schedulerAction = schedulerPlan.action;
    const cooldownUntil = this.readCooldownUntil(run);

    if (cooldownUntil && cooldownUntil.getTime() > now.getTime()) {
      return this.toSchedulerRun(run);
    }

    if (schedulerAction === 'advance') {
      run = await this.clearSchedulerPlan(run, 'Auto advance after cooldown.');
    } else if (run.status === 'blocked' && schedulerAction === 'resume-current-stage') {
      run = await this.clearSchedulerPlan(run, 'Auto resume current blocked stage after cooldown.');
      run = await this.orchestratorRuntime.resumeRun(workflowRunId, {
        targetStageId: run.currentStageId,
        reason: 'Scheduler auto resume after cooldown.',
      });
    } else if (run.status === 'needs-rework' && schedulerAction === 'resume-rework-stage') {
      run = await this.clearSchedulerPlan(run, 'Auto resume rework stage after cooldown.');
      run = await this.orchestratorRuntime.resumeRun(workflowRunId, {
        targetStageId: run.rework?.targetStageId ?? run.currentStageId,
        reason: 'Scheduler auto resume rework after cooldown.',
      });
    }

    let safetyCounter = 0;
    while (run.status === 'running' && run.currentStageId && safetyCounter < 32) {
      const activeStage = run.stages.find((stage) => stage.id === run.currentStageId) ?? null;
      const reviewReport = activeStage?.gate.reviewRequired ? await this.buildReviewForRun(run.id, run.subprojectId) : null;
      run = await this.orchestratorRuntime.advanceRun(run.id, { reviewReport });
      safetyCounter += 1;
    }

    return this.toSchedulerRun(run);
  }

  async tickDueRuns(subprojectId?: string | null): Promise<SchedulerRun[]> {
    const runs = await this.orchestratorRuntime.listRuns(subprojectId);
    const now = new Date();
    const touched: SchedulerRun[] = [];

    for (const run of runs) {
      if (!this.isDueForTick(run, now)) {
        continue;
      }
      touched.push(await this.tickRun(run.id, run.subprojectId));
    }

    return touched.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private isDueForTick(run: WorkflowRun, now: Date): boolean {
    const cooldownUntil = this.readCooldownUntil(run);
    const schedulerAction = this.resolveSchedulerPlan(run).action;

    if (cooldownUntil && cooldownUntil.getTime() > now.getTime()) {
      return false;
    }

    if (run.status === 'running' && Boolean(run.currentStageId)) {
      return true;
    }

    if (run.status === 'blocked' && schedulerAction === 'resume-current-stage') {
      return true;
    }

    if (run.status === 'needs-rework' && schedulerAction === 'resume-rework-stage') {
      return true;
    }

    return false;
  }

  private readCooldownUntil(run: WorkflowRun): Date | null {
    const raw = typeof run.metadata.cooldownUntil === 'string' ? run.metadata.cooldownUntil : null;
    if (!raw) {
      return null;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private readSchedulerAction(run: WorkflowRun): SchedulerAction | null {
    const value = run.metadata.schedulerAction;
    return value === 'advance' || value === 'resume-current-stage' || value === 'resume-rework-stage' ? value : null;
  }

  private resolveSchedulerPlan(run: WorkflowRun): ResolvedSchedulerPlan {
    const explicitAction = this.readSchedulerAction(run);
    const explicitReason = typeof run.metadata.schedulerReason === 'string' ? run.metadata.schedulerReason : null;
    if (explicitAction) {
      return {
        action: explicitAction,
        reason: explicitReason,
        mode: 'scheduled',
      };
    }

    if (run.status === 'needs-rework' && run.rework?.targetStageId) {
      const targetStage = run.stages.find((stage) => stage.id === run.rework?.targetStageId) ?? null;
      if (
        targetStage?.gate.allowRework &&
        typeof targetStage.metadata.blockedByReviewAt === 'string' &&
        typeof targetStage.metadata.manualGateBlockedAt !== 'string'
      ) {
        return {
          action: 'resume-rework-stage',
          reason: 'Auto-inferred resume for review-blocked rework stage.',
          mode: 'auto-rework',
        };
      }
    }

    if (run.status === 'blocked' && run.currentStageId) {
      const targetStage = run.stages.find((stage) => stage.id === run.currentStageId) ?? null;
      const blockedReason = targetStage?.blockedReason ?? run.executionSummary ?? '';
      if (
        targetStage?.gate.allowRework &&
        typeof targetStage.metadata.lastBlockedAt === 'string' &&
        typeof targetStage.metadata.manualGateBlockedAt !== 'string' &&
        targetStage.attemptCount < AUTO_RETRY_MAX_ATTEMPTS &&
        this.looksRetryableBlocker(blockedReason)
      ) {
        return {
          action: 'resume-current-stage',
          reason: 'Auto-inferred retry for transient stage execution failure.',
          mode: 'auto-retry',
        };
      }
    }

    return {
      action: null,
      reason: explicitReason,
      mode: 'idle',
    };
  }

  private looksRetryableBlocker(blockedReason: string) {
    return /temporary|timeout|timed out|network|connection|rate limit|429|503|overloaded|unavailable|provider 执行失败|请求失败|超时|网络|连接|限流|服务不可用/iu.test(
      blockedReason,
    );
  }

  private async clearSchedulerPlan(run: WorkflowRun, detail: string): Promise<WorkflowRun> {
    const now = new Date().toISOString();
    const updated: WorkflowRun = {
      ...run,
      updatedAt: now,
      metadata: {
        ...run.metadata,
        cooldownUntil: null,
        schedulerAction: null,
        schedulerReason: null,
        schedulerLastTriggeredAt: now,
      },
    };

    await this.memoryService.appendEvent(
      run.id,
      {
        id: `${run.id}-scheduler-trigger-${now.replace(/[-:.TZ]/gu, '').slice(0, 14)}`,
        runId: run.id,
        stageId: run.currentStageId ?? 'scheduler',
        kind: 'stage_resumed',
        status: 'ok',
        timestamp: now,
        detail,
        artifactPath: null,
        metadata: {
          source: 'scheduler',
        },
      },
      run.subprojectId,
    );
    await this.memoryService.saveRunSnapshot(run.id, updated);
    return updated;
  }

  private async buildReviewForRun(runId: string, subprojectId?: string | null): Promise<CommitteeReport | null> {
    const run = await this.orchestratorRuntime.loadRun(runId, subprojectId);
    const events = await this.orchestratorRuntime.loadEvents(runId, subprojectId);
    const artifactCount = events.filter((event) => event.kind === 'artifact_written').length;
    const artifacts = await this.workflowEngine.hydrateArtifacts(run);
    const openSourceEvidence = this.reviewCommittee.inspectOpenSourceEvidence(artifacts);
    const hermesReport = await this.hermesPolicyService.evaluateRun(run);
    const activatedSpecialistRoles = this.specialistActivationService.resolveActivatedRoles({
      stageId: run.currentStageId,
      artifacts: artifacts.map((artifact) => ({ path: artifact.path, content: artifact.content })),
    });
    return this.reviewCommittee.buildReportForRun({
      runId,
      artifactCount,
      activeStageId: run.currentStageId,
      activatedSpecialistRoles: activatedSpecialistRoles.length > 0 ? activatedSpecialistRoles : undefined,
      openSourceEvaluationPresent: openSourceEvidence.present,
      openSourceEvidencePaths: openSourceEvidence.evidencePaths,
      hermesResearchFindings: hermesReport.researchFindings,
      hermesAutoPromotions: hermesReport.autoPromotions,
      hermesWatchFindings: hermesReport.watchFindings,
      artifacts: artifacts.map((artifact) => ({ path: artifact.path, content: artifact.content })),
    });
  }

  private toSchedulerRun(run: WorkflowRun): SchedulerRun {
    const activeStage = run.currentStageId ? run.stages.find((stage) => stage.id === run.currentStageId) ?? null : null;
    const blockedStage = run.stages.find((stage) => stage.status === 'blocked') ?? null;
    const retryCount = run.stages.reduce((sum, stage) => sum + Math.max(0, stage.attemptCount - 1), 0);
    const cooldownUntil = typeof run.metadata.cooldownUntil === 'string' ? run.metadata.cooldownUntil : null;
    const schedulerPlan = this.resolveSchedulerPlan(run);
    const schedulerAction = schedulerPlan.action;
    const schedulerReason = schedulerPlan.reason;
    const cooldownDate = this.readCooldownUntil(run);
    const dueNow = Boolean(schedulerAction && (!cooldownDate || cooldownDate.getTime() <= Date.now()));
    const waitingForScheduler = Boolean(schedulerAction && cooldownDate && cooldownDate.getTime() > Date.now());
    const status =
      run.status === 'completed'
        ? 'completed'
        : waitingForScheduler
          ? 'paused'
          : run.status === 'blocked' || run.status === 'needs-rework'
            ? 'blocked'
            : 'running';
    const blockedReason =
      status === 'paused'
        ? schedulerReason ?? blockedStage?.blockedReason ?? 'Run is waiting for the next scheduler window.'
        : blockedStage?.blockedReason ??
          (run.status === 'needs-rework' ? run.executionSummary ?? 'Run is waiting for rework or manual resume.' : null);
    const nextRunAt =
      status === 'paused'
        ? cooldownUntil
        : status === 'running'
          ? run.updatedAt
          : null;
    const schedulerMode =
      run.status === 'completed'
        ? 'completed'
        : schedulerPlan.mode === 'auto-rework'
          ? 'auto-rework'
          : schedulerPlan.mode === 'auto-retry'
            ? 'auto-retry'
            : schedulerPlan.mode === 'scheduled'
              ? 'scheduled'
              : status === 'blocked'
                ? 'manual-attention'
                : 'idle';
    const autoRecoveryEligible = schedulerPlan.mode === 'auto-rework' || schedulerPlan.mode === 'auto-retry';
    const operatorActionHint =
      schedulerMode === 'auto-rework'
        ? 'Scheduler will auto-resume the review-blocked rework stage unless an operator overrides it.'
        : schedulerMode === 'auto-retry'
          ? 'Scheduler will auto-retry the current stage because the blocker looks transient and is still within retry bounds.'
          : schedulerMode === 'scheduled'
            ? dueNow
              ? 'A scheduler plan is due now and can be triggered immediately.'
              : 'A scheduler plan is queued for the next cooldown window.'
            : schedulerMode === 'manual-attention'
              ? 'This run is blocked without a safe auto-recovery rule; operator review or manual override is required.'
              : schedulerMode === 'completed'
                ? 'This run has already completed.'
                : 'This run is progressing without a pending recovery plan.';

    return {
      id: `scheduler-${run.id}`,
      workflowRunId: run.id,
      subprojectId: run.subprojectId,
      projectName: run.projectName,
      status,
      schedulerMode,
      currentStageId: activeStage?.id ?? run.currentStageId,
      retryCount,
      plannedAction: schedulerAction,
      dueNow,
      cooldownUntil,
      nextRunAt,
      blockedReason,
      schedulerReason,
      autoRecoveryEligible,
      operatorActionHint,
      resumeAnchor: `${run.memory.runStatePath}#stage:${run.currentStageId ?? 'none'}`,
      updatedAt: run.updatedAt,
      generatedAt: new Date().toISOString(),
      source: 'workflow-run-derived',
    };
  }
}
