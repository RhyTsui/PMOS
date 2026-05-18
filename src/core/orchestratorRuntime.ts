import type {
  Artifact,
  CommitteeReport,
  WorkflowDefinition,
  WorkflowStageDefinition,
  WorkflowStageRun,
  WorkflowTask,
  WorkflowRun,
} from '../shared/schemas.js';
import type { ProviderEventRecord } from './modelProvider.js';
import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { RequirementService } from './requirementService.js';
import { StageRunners } from './stageRunners.js';
import { SpecialistActivationService } from './specialistActivationService.js';
import type { ProjectContext } from './projectPaths.js';

export class OrchestratorRuntime {
  private readonly stageRunners: StageRunners;
  private readonly requirementService: RequirementService;
  private readonly specialistActivationService: SpecialistActivationService;

  constructor(
    private readonly store: FileStore,
    private readonly memoryService: MemoryService,
  ) {
    this.stageRunners = new StageRunners(store, memoryService);
    this.requirementService = new RequirementService(memoryService);
    this.specialistActivationService = new SpecialistActivationService();
  }

  async initRun(input: {
    definition: WorkflowDefinition;
    project: ProjectContext;
    providerCount: number;
    mcpServerCount: number;
  }): Promise<WorkflowRun> {
    const now = new Date().toISOString();
    const runId = `run-${now.replace(/[-:.TZ]/gu, '').slice(0, 14)}`;
    const stages = input.definition.stages.map((stage, index) => this.createStageRun(stage, index === 0, now));
    const tasks = input.definition.stages.map((stage, index) => this.createTask(stage, runId, index === 0));

    const run: WorkflowRun = {
      id: runId,
      subprojectId: input.project.subprojectId,
      projectName: input.project.projectName,
      projectRoot: input.project.projectRoot,
      name: `${input.project.projectName} · ${input.definition.name} 运行实例`,
      selectedProvider: input.project.selectedProvider,
      providerConfigPath: input.project.providerConfigPath,
      mcpConfigPath: input.project.mcpConfigPath,
      status: 'running',
      currentStageId: stages[0]?.id ?? null,
      stages,
      tasks,
      generatedAt: now,
      updatedAt: now,
      memory: {
        projectMemoryPath: input.project.projectMemoryPath,
        runStatePath: this.memoryService.getRunStatePath(runId, input.project.subprojectId),
        eventLogPath: this.memoryService.getEventLogPath(runId, input.project.subprojectId),
        projectRoot: input.project.projectRoot,
        loadedAt: now,
      },
      providerCount: input.providerCount,
      mcpServerCount: input.mcpServerCount,
      reworkCount: 0,
      executionSummary: '运行实例已初始化，等待按阶段推进。',
      lastReview: null,
      activeCapability: stages[0]?.capability ?? null,
      rework: null,
      metadata: {
        workflowId: input.definition.id,
        workflowVersion: input.definition.version,
        sourceMarkdownPath: input.definition.sourceMarkdownPath,
        executionMarkdownPath: input.definition.executionMarkdownPath,
      },
    };

    await this.memoryService.saveRunSnapshot(runId, run);
    await this.memoryService.appendEvent(
      runId,
      {
        id: `${runId}-initialized`,
        runId,
        stageId: stages[0]?.id ?? 'init',
        kind: 'run_initialized',
        status: 'ok',
        timestamp: now,
        detail: '运行实例已初始化，已加载 workflow/provider/MCP/project memory。',
        artifactPath: null,
        metadata: {
          activeCapability: stages[0]?.capability ?? null,
          providerCount: input.providerCount,
          mcpServerCount: input.mcpServerCount,
          taskAssignmentRoles: stages[0]
            ? this.specialistActivationService.resolveAssignedRolesForStage(stages[0].id)
            : [],
        },
      },
      run.subprojectId,
    );

    if (stages[0]) {
      await this.memoryService.appendEvent(
        runId,
        {
          id: `${runId}-${stages[0].id}-started`,
          runId,
          stageId: stages[0].id,
          kind: 'stage_started',
          status: 'ok',
          timestamp: now,
          detail: `${stages[0].label} 已进入进行中状态。`,
          artifactPath: null,
          metadata: {
            capability: stages[0].capability,
            priority: stages[0].priority,
            dependsOn: stages[0].dependsOn,
            taskAssignmentRoles: this.specialistActivationService.resolveAssignedRolesForStage(stages[0].id),
          },
        },
        run.subprojectId,
      );
    }

    return run;
  }

  async listRuns(subprojectId?: string | null) {
    const runIds = await this.memoryService.listRunIds(subprojectId);
    const runs = await Promise.all(
      runIds.map(async (runId) => {
        try {
          return await this.memoryService.loadRunSnapshot(runId, subprojectId);
        } catch {
          return null;
        }
      }),
    );

    return runs.filter((run): run is WorkflowRun => run !== null).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  async loadRun(runId: string, subprojectId?: string | null) {
    return this.memoryService.loadRunSnapshot(runId, subprojectId);
  }

  async loadEvents(runId: string, subprojectId?: string | null) {
    return this.memoryService.loadEvents(runId, subprojectId);
  }

  async advanceRun(runId: string, options?: { reviewReport?: CommitteeReport | null }): Promise<WorkflowRun> {
    const run = await this.memoryService.loadRunSnapshot(runId);
    let activeIndex = run.stages.findIndex((stage) => stage.status === 'active');
    if (activeIndex === -1 && run.status === 'needs-rework' && run.rework?.targetStageId) {
      const reworkIndex = run.stages.findIndex((stage) => stage.id === run.rework?.targetStageId);
      if (reworkIndex !== -1) {
        const resumedAt = new Date().toISOString();
        run.stages[reworkIndex] = {
          ...run.stages[reworkIndex],
          status: 'active',
          blockedReason: null,
          startedAt: run.stages[reworkIndex].startedAt ?? resumedAt,
          attemptCount: run.stages[reworkIndex].attemptCount + 1,
          metadata: {
            ...run.stages[reworkIndex].metadata,
            resumedFromReworkAt: resumedAt,
          },
        };
        this.syncTaskForStage(run, run.stages[reworkIndex].id, {
          status: 'active',
          blockedReason: null,
          metadata: {
            resumedFromReworkAt: resumedAt,
          },
        });
        run.status = 'running';
        run.currentStageId = run.stages[reworkIndex].id;
        run.activeCapability = run.stages[reworkIndex].capability;
        run.executionSummary = `${run.stages[reworkIndex].label} 已从返工状态恢复推进。`;
        run.updatedAt = resumedAt;
        await this.memoryService.appendEvent(
          runId,
          {
            id: `${runId}-${run.stages[reworkIndex].id}-restarted`,
            runId,
            stageId: run.stages[reworkIndex].id,
            kind: 'stage_started',
            status: 'ok',
            timestamp: resumedAt,
            detail: `${run.stages[reworkIndex].label} 已从返工状态恢复推进。`,
            artifactPath: null,
            metadata: {
              resumedFromStageId: run.rework.sourceStageId,
              reworkReason: run.rework.reason,
              taskAssignmentRoles: this.specialistActivationService.resolveAssignedRolesForStage(run.stages[reworkIndex].id),
            },
          },
          run.subprojectId,
        );
        activeIndex = reworkIndex;
      }
    }
    if (activeIndex === -1) {
      return run;
    }

    const activeStage = run.stages[activeIndex];
    const now = new Date().toISOString();
    const reviewReport = activeStage.gate.reviewRequired ? options?.reviewReport ?? null : null;
    const materialized = await this.materializeStageOutputs(run, activeStage, reviewReport);

    for (const artifact of materialized.artifacts) {
      await this.memoryService.appendEvent(
        runId,
        {
          id: `${runId}-${artifact.id}-artifact`,
          runId,
          stageId: artifact.stageId,
          kind: 'artifact_written',
          status: 'ok',
          timestamp: now,
          detail: `${artifact.title} 已写入 ${artifact.path}`,
          artifactPath: artifact.path,
          metadata: {
            artifactType: artifact.type,
            stageLabel: activeStage.label,
          },
        },
        run.subprojectId,
      );
    }

    for (const [index, event] of materialized.providerEvents.entries()) {
      await this.memoryService.appendEvent(
        runId,
        {
          id: `${runId}-${activeStage.id}-provider-${index + 1}`,
          runId,
          stageId: activeStage.id,
          kind: event.kind,
          status: event.status,
          timestamp: now,
          detail: event.detail,
          artifactPath: null,
          metadata: {
            capability: activeStage.capability,
          },
        },
        run.subprojectId,
      );
    }

    if (materialized.blockedReason) {
      run.stages[activeIndex] = {
        ...activeStage,
        blockedReason: materialized.blockedReason,
        outputPaths: materialized.outputPaths,
        status: 'blocked',
        summary: materialized.blockedReason,
        metadata: {
          ...activeStage.metadata,
          lastBlockedAt: now,
        },
      };
      this.syncTaskForStage(run, activeStage.id, {
        status: 'blocked',
        blockedReason: materialized.blockedReason,
        artifactPaths: materialized.outputPaths,
        summary: materialized.blockedReason,
        metadata: {
          lastBlockedAt: now,
        },
      });
      run.currentStageId = activeStage.id;
      run.status = 'blocked';
      run.activeCapability = activeStage.capability;
      run.executionSummary = materialized.blockedReason;
      run.updatedAt = now;

      await this.memoryService.appendEvent(
        runId,
        {
          id: `${runId}-${activeStage.id}-blocked`,
          runId,
          stageId: activeStage.id,
          kind: 'stage_blocked',
          status: 'error',
          timestamp: now,
          detail: materialized.blockedReason,
          artifactPath: null,
          metadata: {
            capability: activeStage.capability,
            outputCount: materialized.outputPaths.length,
          },
        },
        run.subprojectId,
      );
      await this.memoryService.saveRunSnapshot(runId, run);
      return run;
    }

    const completedStage = this.completeStage(
      {
        ...activeStage,
        outputPaths: materialized.outputPaths,
        summary: this.buildStageSummary(activeStage, materialized.outputPaths, reviewReport),
      },
      now,
    );
    run.stages[activeIndex] = completedStage;
    this.syncTaskForStage(run, completedStage.id, {
      status: 'completed',
      blockedReason: null,
      artifactPaths: completedStage.outputPaths,
      summary: completedStage.summary,
      metadata: {
        completedAt: now,
      },
    });

    const requiredActivationTrace = (reviewReport?.activationTrace ?? []).filter((item) => item.required);
    if (reviewReport) {
      run.lastReview = reviewReport.summary ?? reviewReport.overallConclusion;
      await this.memoryService.appendEvent(
        runId,
        {
          id: `${runId}-${activeStage.id}-review`,
          runId,
          stageId: activeStage.id,
          kind: 'review_recorded',
          status: reviewReport.gate.blocked ? 'warning' : 'ok',
          timestamp: now,
          detail: `评审完成，gate=${reviewReport.gate.decision}`,
          artifactPath: completedStage.outputPaths.find((path) => path.endsWith('.json')) ?? null,
          metadata: {
            decision: reviewReport.gate.decision,
            blocked: reviewReport.gate.blocked,
            recommendedReworkStageId: reviewReport.recommendedReworkStageId,
            activatedSpecialistRoles: requiredActivationTrace.filter((item) => item.activated).map((item) => item.role),
            assumedSpecialistRoles: requiredActivationTrace.filter((item) => item.status === 'assumed').map((item) => item.role),
            missingSpecialistRoles: requiredActivationTrace.filter((item) => item.status === 'missing').map((item) => item.role),
          },
        },
        run.subprojectId,
      );
    }

    await this.memoryService.appendEvent(
      runId,
      {
        id: `${runId}-${completedStage.id}-completed`,
        runId,
        stageId: completedStage.id,
        kind: 'stage_completed',
        status: 'ok',
        timestamp: now,
        detail: `${completedStage.label} 已完成。`,
        artifactPath: completedStage.outputPaths[0] ?? null,
        metadata: {
          outputCount: completedStage.outputPaths.length,
          attemptCount: completedStage.attemptCount,
        },
      },
      run.subprojectId,
    );

    if (reviewReport?.gate.blocked) {
      const reworkStageId = this.resolveReworkTargetStageId(run, activeIndex, reviewReport);
      const reworkIndex = run.stages.findIndex((stage) => stage.id === reworkStageId);
      if (reworkIndex !== -1) {
        const reason = reviewReport.summary ?? reviewReport.overallConclusion;
        const reviewArtifactPath = completedStage.outputPaths.find((path) => path.endsWith('.json')) ?? completedStage.outputPaths[0] ?? null;
        await this.requirementService.ingestFromAcceptanceReview({
          title: `Acceptance review blocked: ${run.projectName}`,
          content: [
            `P0 blocker: review gate blocked and workflow entered needs-rework.`,
            '',
            `Run: ${run.id}`,
            `Source stage: ${activeStage.id}`,
            `Target stage: ${reworkStageId}`,
            `Decision: ${reviewReport.gate.decision}`,
            `Summary: ${reason}`,
          ].join('\n'),
          subprojectId: run.subprojectId,
          runId: run.id,
          artifactPath: reviewArtifactPath,
        });
        await this.requirementService.ingestFromRuntimeGateEvent({
          title: `Runtime gate blocked: ${reworkStageId}`,
          content: [
            `P0 blocker: runtime gate event marked stage as blocked after review.`,
            '',
            `Run: ${run.id}`,
            `Gate decision: ${reviewReport.gate.decision}`,
            `Blocked stage: ${reworkStageId}`,
            `Reason: ${reason}`,
          ].join('\n'),
          subprojectId: run.subprojectId,
          runId: run.id,
          gateId: 'review-gate-blocked',
          artifactPath: reviewArtifactPath,
        });
        run.stages[reworkIndex] = {
          ...run.stages[reworkIndex],
          status: 'blocked',
          blockedReason: reason,
          metadata: {
            ...run.stages[reworkIndex].metadata,
            blockedByReviewAt: now,
          },
        };
        this.syncTaskForStage(run, reworkStageId, {
          status: 'blocked',
          blockedReason: reason,
          metadata: {
            blockedByReviewAt: now,
          },
        });
        run.currentStageId = reworkStageId;
        run.status = 'needs-rework';
        run.reworkCount += 1;
        run.activeCapability = run.stages[reworkIndex].capability;
        run.rework = {
          sourceStageId: activeStage.id,
          targetStageId: reworkStageId,
          reason,
          triggeredAt: now,
        };
        run.executionSummary = `评审要求返工：${run.stages[reworkIndex].label}`;
        run.updatedAt = now;
        await this.memoryService.appendEvent(
          runId,
          {
            id: `${runId}-${reworkStageId}-blocked`,
            runId,
            stageId: reworkStageId,
            kind: 'stage_blocked',
            status: 'warning',
            timestamp: now,
            detail: '评审 gate 要求先返工，工作流进入 needs-rework 状态。',
            artifactPath: null,
            metadata: {
              sourceStageId: activeStage.id,
              reviewDecision: reviewReport.gate.decision,
              activatedSpecialistRoles: requiredActivationTrace.filter((item) => item.activated).map((item) => item.role),
              assumedSpecialistRoles: requiredActivationTrace.filter((item) => item.status === 'assumed').map((item) => item.role),
              missingSpecialistRoles: requiredActivationTrace.filter((item) => item.status === 'missing').map((item) => item.role),
            },
          },
          run.subprojectId,
        );
        await this.memoryService.saveRunSnapshot(runId, run);
        return run;
      }
    }

    const nextStage = this.findNextRunnableStage(run, activeIndex, now);
    if (!nextStage) {
      run.currentStageId = null;
      run.status = 'completed';
      run.activeCapability = null;
      run.rework = null;
      run.executionSummary = '所有阶段已完成。';
      run.updatedAt = now;
      await this.memoryService.saveRunSnapshot(runId, run);
      return run;
    }

    run.currentStageId = nextStage.id;
    run.status = 'running';
    run.activeCapability = nextStage.capability;
    run.rework = null;
    run.executionSummary = `${nextStage.label} 已激活。`;
    run.updatedAt = now;

    await this.memoryService.appendEvent(
      runId,
      {
        id: `${runId}-${nextStage.id}-started`,
        runId,
        stageId: nextStage.id,
        kind: 'stage_started',
        status: 'ok',
        timestamp: now,
        detail: `${nextStage.label} 已进入进行中状态。`,
        artifactPath: null,
        metadata: {
          capability: nextStage.capability,
          priority: nextStage.priority,
          dependsOn: nextStage.dependsOn,
          taskAssignmentRoles: this.specialistActivationService.resolveAssignedRolesForStage(nextStage.id),
        },
      },
      run.subprojectId,
    );

    await this.memoryService.saveRunSnapshot(runId, run);
    return run;
  }

  async runUntilBlocked(runId: string, options?: { reviewReport?: CommitteeReport | null }) {
    let run = await this.memoryService.loadRunSnapshot(runId);
    while (run.status === 'running' && run.currentStageId) {
      const activeStage = run.stages.find((stage) => stage.id === run.currentStageId) ?? null;
      const reviewReport = activeStage?.gate.reviewRequired ? options?.reviewReport ?? null : null;
      run = await this.advanceRun(runId, { reviewReport });
    }
    return run;
  }

  async resumeRun(
    runId: string,
    options?: {
      targetStageId?: string | null;
      reason?: string | null;
    },
  ) {
    const run = await this.memoryService.loadRunSnapshot(runId);
    const resumedAt = new Date().toISOString();
    const targetStageId = options?.targetStageId ?? run.rework?.targetStageId ?? run.currentStageId;

    if (!targetStageId) {
      return run;
    }

    const targetIndex = run.stages.findIndex((stage) => stage.id === targetStageId);
    if (targetIndex === -1) {
      throw new Error(`stage ${targetStageId} not found for run ${runId}`);
    }

    const targetStage = run.stages[targetIndex];
    run.stages[targetIndex] = {
      ...targetStage,
      status: 'active',
      blockedReason: null,
      startedAt: targetStage.startedAt ?? resumedAt,
      attemptCount: targetStage.attemptCount + 1,
      metadata: {
        ...targetStage.metadata,
        manualResumeAt: resumedAt,
        manualResumeReason: options?.reason ?? null,
      },
    };
    this.syncTaskForStage(run, targetStageId, {
      status: 'active',
      blockedReason: null,
      metadata: {
        manualResumeAt: resumedAt,
        manualResumeReason: options?.reason ?? null,
      },
    });

    run.currentStageId = targetStageId;
    run.status = 'running';
    run.activeCapability = run.stages[targetIndex].capability;
    run.executionSummary = `${run.stages[targetIndex].label} 已人工恢复推进。`;
    run.updatedAt = resumedAt;
    if (run.rework?.targetStageId === targetStageId) {
      run.rework = null;
    }

    await this.memoryService.appendEvent(
      runId,
      {
        id: `${runId}-${targetStageId}-resumed`,
        runId,
        stageId: targetStageId,
        kind: 'stage_resumed',
        status: 'ok',
        timestamp: resumedAt,
        detail: `${run.stages[targetIndex].label} 已人工恢复推进。`,
        artifactPath: null,
        metadata: {
          reason: options?.reason ?? null,
          taskAssignmentRoles: this.specialistActivationService.resolveAssignedRolesForStage(targetStageId),
        },
      },
      run.subprojectId,
    );

    await this.memoryService.saveRunSnapshot(runId, run);
    return run;
  }

  async applyManualGateDecision(
    runId: string,
    input: {
      decision: 'approve' | 'rework';
      summary: string;
      targetStageId?: string | null;
    },
  ) {
    const run = await this.memoryService.loadRunSnapshot(runId);
    const now = new Date().toISOString();

    if (input.decision === 'approve') {
      await this.memoryService.appendEvent(
        runId,
        {
          id: `${runId}-manual-gate-${now.replace(/[-:.TZ]/gu, '').slice(0, 14)}`,
          runId,
          stageId: run.currentStageId ?? 'manual-gate',
          kind: 'review_recorded',
          status: 'ok',
          timestamp: now,
          detail: `人工 gate 决策：approve。${input.summary}`,
          artifactPath: null,
          metadata: {
            source: 'manual-gate',
          },
        },
        run.subprojectId,
      );
      return this.resumeRun(runId, {
        targetStageId: input.targetStageId ?? run.currentStageId,
        reason: input.summary,
      });
    }

    const activeStageId = input.targetStageId ?? run.currentStageId ?? run.stages[0]?.id ?? null;
    if (!activeStageId) {
      return run;
    }

    const targetIndex = run.stages.findIndex((stage) => stage.id === activeStageId);
    if (targetIndex === -1) {
      throw new Error(`stage ${activeStageId} not found for run ${runId}`);
    }

    const targetStage = run.stages[targetIndex];
    run.stages[targetIndex] = {
      ...targetStage,
      status: 'blocked',
      blockedReason: input.summary,
      metadata: {
        ...targetStage.metadata,
        manualGateBlockedAt: now,
      },
    };
    this.syncTaskForStage(run, activeStageId, {
      status: 'blocked',
      blockedReason: input.summary,
      metadata: {
        manualGateBlockedAt: now,
      },
    });

    run.currentStageId = activeStageId;
    run.status = 'needs-rework';
    run.reworkCount += 1;
    run.activeCapability = run.stages[targetIndex].capability;
    run.rework = {
      sourceStageId: run.currentStageId ?? activeStageId,
      targetStageId: activeStageId,
      reason: input.summary,
      triggeredAt: now,
    };
    run.executionSummary = `人工 gate 要求返工：${run.stages[targetIndex].label}`;
    run.updatedAt = now;

    await this.memoryService.appendEvent(
      runId,
      {
        id: `${runId}-${activeStageId}-manual-rework`,
        runId,
        stageId: activeStageId,
        kind: 'stage_blocked',
        status: 'warning',
        timestamp: now,
        detail: `人工 gate 决策：rework。${input.summary}`,
        artifactPath: null,
        metadata: {
          source: 'manual-gate',
        },
      },
      run.subprojectId,
    );

    await this.memoryService.saveRunSnapshot(runId, run);
    return run;
  }

  private createStageRun(stage: WorkflowStageDefinition, isFirstStage: boolean, now: string): WorkflowStageRun {
    return {
      id: stage.id,
      label: stage.label,
      ownerRole: stage.ownerRole,
      description: stage.description,
      acceptanceCriteria: stage.acceptanceCriteria,
      requiredOutputs: stage.requiredOutputs,
      priority: stage.priority,
      capability: stage.capability,
      dependsOn: stage.dependsOn,
      gate: stage.gate,
      status: isFirstStage ? 'active' : 'pending',
      outputPaths: [],
      startedAt: isFirstStage ? now : null,
      completedAt: null,
      blockedReason: null,
      attemptCount: isFirstStage ? 1 : 0,
      summary: null,
      metadata: {},
    };
  }

  private createTask(stage: WorkflowStageDefinition, runId: string, isFirstStage: boolean): WorkflowTask {
    return {
      id: `${runId}-${stage.id}`,
      runId,
      stageId: stage.id,
      title: `${stage.label} 任务`,
      description: stage.description,
      ownerRole: stage.ownerRole,
      priority: stage.priority,
      dependsOn: stage.dependsOn.map((dependencyStageId) => `${runId}-${dependencyStageId}`),
      status: isFirstStage ? 'active' : 'pending',
      acceptanceCriteria: stage.acceptanceCriteria,
      artifactPaths: [],
      blockedReason: null,
      summary: null,
      metadata: {
        capability: stage.capability,
        reviewRequired: stage.gate.reviewRequired,
      },
    };
  }

  private completeStage(stage: WorkflowStageRun, completedAt: string): WorkflowStageRun {
    return {
      ...stage,
      status: 'completed',
      completedAt,
      blockedReason: null,
      metadata: {
        ...stage.metadata,
        completedAt,
      },
    };
  }

  private syncTaskForStage(
    run: WorkflowRun,
    stageId: string,
    input: Partial<Pick<WorkflowTask, 'status' | 'blockedReason' | 'artifactPaths' | 'summary' | 'metadata'>>,
  ) {
    const taskIndex = run.tasks.findIndex((task) => task.stageId === stageId);
    if (taskIndex === -1) {
      return;
    }

    run.tasks[taskIndex] = {
      ...run.tasks[taskIndex],
      ...input,
      artifactPaths: input.artifactPaths ?? run.tasks[taskIndex].artifactPaths,
      metadata: {
        ...run.tasks[taskIndex].metadata,
        ...(input.metadata ?? {}),
      },
    };
  }

  private async materializeStageOutputs(
    run: WorkflowRun,
    stage: WorkflowStageRun,
    reviewReport: CommitteeReport | null,
  ): Promise<{
    artifacts: Artifact[];
    providerEvents: ProviderEventRecord[];
    outputPaths: string[];
    blockedReason: string | null;
  }> {
    const outputPaths = [...stage.outputPaths];
    const artifacts: Artifact[] = [];

    for (const [index, output] of stage.requiredOutputs.entries()) {
      const artifactPath = this.resolveOutputPath(output.path, run.id, output.kind);
      const title = `${stage.label} 产物 ${index + 1}`;
      const content = await this.stageRunners.buildArtifactContent({
        run,
        stage,
        artifactPath,
        artifactKind: output.kind,
        reviewReport,
        existingOutputPaths: outputPaths,
      });
      await this.store.write(artifactPath, content);
      if (!outputPaths.includes(artifactPath)) {
        outputPaths.push(artifactPath);
      }
      artifacts.push({
        id: `${stage.id}-${index + 1}`,
        runId: run.id,
        stageId: stage.id,
        title,
        path: artifactPath,
        stage: stage.label,
        type: output.kind,
      });
    }

    const execution = this.stageRunners.getExecutionBundle(run.id, stage.id);
    return {
      artifacts,
      providerEvents: execution?.events ?? [],
      outputPaths,
      blockedReason: execution?.result.status === 'error' ? execution.result.error ?? 'Provider 执行失败。' : null,
    };
  }

  private resolveOutputPath(templatePath: string, runId: string, kind: Artifact['type']) {
    if (!templatePath.includes('*')) {
      return templatePath;
    }

    const extension = kind === 'json' ? '.json' : kind === 'code' ? '.ts' : '.md';
    return templatePath.replace(`*${extension}`, `${runId}${extension}`);
  }

  private buildStageSummary(stage: WorkflowStageRun, outputPaths: string[], reviewReport: CommitteeReport | null) {
    if (reviewReport) {
      return reviewReport.summary ?? reviewReport.overallConclusion;
    }

    return `${stage.label} 已输出 ${outputPaths.length} 个产物。`;
  }

  private resolveReworkTargetStageId(run: WorkflowRun, activeIndex: number, reviewReport: CommitteeReport) {
    if (reviewReport.recommendedReworkStageId) {
      return reviewReport.recommendedReworkStageId;
    }

    const fallbackIndex = Math.max(0, activeIndex - 1);
    return run.stages[fallbackIndex]?.id ?? run.stages[0]?.id ?? '';
  }

  private findNextRunnableStage(run: WorkflowRun, activeIndex: number, now: string) {
    for (let index = activeIndex + 1; index < run.stages.length; index += 1) {
      const candidate = run.stages[index];
      if (candidate.status === 'completed' && typeof run.metadata.activeDagRunId === 'string') {
        continue;
      }

      const dependenciesReady = candidate.dependsOn.every((dependencyId) =>
        run.stages.some((stage) => stage.id === dependencyId && stage.status === 'completed'),
      );
      if (!dependenciesReady) {
        continue;
      }

      const nextStage = {
        ...candidate,
        status: 'active' as const,
        startedAt: candidate.startedAt ?? now,
        blockedReason: null,
        attemptCount: Math.max(candidate.attemptCount, 1),
        metadata: {
          ...candidate.metadata,
          activatedAt: now,
        },
      };
      run.stages[index] = nextStage;
      this.syncTaskForStage(run, nextStage.id, {
        status: 'active',
        blockedReason: null,
        metadata: {
          activatedAt: now,
        },
      });
      return nextStage;
    }

    return null;
  }
}
