import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { OutboxService } from './outboxService.js';
import { GateAttentionService } from './gateAttentionService.js';
import { PlanArchiveService } from './planArchiveService.js';
import {
  McpContextSyncService,
  type McpCheckpoint,
  type McpContextEvent,
  type McpContextState,
  type TaskNode,
} from './mcpContextSyncService.js';
import type {
  PlanArchiveRecord,
  TaskSsotArtifactLink,
  TaskSsotGateCheck,
  TaskSsotGateEvent,
  TaskSsotState,
  TaskSsotTask,
  TaskSsotStageStatus,
  TaskSsotStatus,
  WorkflowEvent,
  WorkflowRun,
  WorkflowTask,
} from '../shared/schemas.js';
import { TaskSsotStateSchema } from '../shared/schemas.js';

const TASK_SSOT_STATE_PATH = 'docs/memory/task-ssot/state.json';
const MCP_CONTEXT_STATE_PATH = 'docs/memory/mcp-context/session-state.json';

type WorkflowRunContext = {
  run: WorkflowRun;
  events: WorkflowEvent[];
};

export class TaskSsotService {
  constructor(
    private readonly store: FileStore,
    private readonly mcpContextSync: McpContextSyncService,
    private readonly memoryService = new MemoryService(store),
    private readonly outboxService = new OutboxService(store),
    private readonly gateAttentionService = new GateAttentionService(),
    private readonly planArchiveService = new PlanArchiveService(store),
  ) {}

  async getState(subprojectId?: string | null): Promise<TaskSsotState> {
    const mcpState = await this.mcpContextSync.getState();
    const workflowRuns = await this.loadWorkflowRunContexts(subprojectId);
    const outboxEnvelopes = await this.outboxService.listEnvelopes(subprojectId);
    const planArchives = await this.planArchiveService.listArchives({ subprojectId });
    const current = subprojectId ? this.createEmptyState() : await this.loadPersistedState();
    const next = this.syncFromMcpContext(current, mcpState, workflowRuns, outboxEnvelopes, planArchives);
    if (!subprojectId && JSON.stringify(next) !== JSON.stringify(current)) {
      await this.store.writeJson(TASK_SSOT_STATE_PATH, next);
    }
    return next;
  }

  async listTasks(status?: TaskSsotStatus, subprojectId?: string | null) {
    const state = await this.getState(subprojectId);
    return status ? state.tasks.filter((task) => task.status === status) : state.tasks;
  }

  async getTask(taskId: string, subprojectId?: string | null) {
    const state = await this.getState(subprojectId);
    return state.tasks.find((task) => task.taskId === taskId) ?? null;
  }

  private async loadPersistedState(): Promise<TaskSsotState> {
    if (!(await this.store.exists(TASK_SSOT_STATE_PATH))) {
      return this.createEmptyState();
    }
    const raw = await this.store.readJson<unknown>(TASK_SSOT_STATE_PATH);
    const parsed = TaskSsotStateSchema.safeParse(raw);
    return parsed.success ? parsed.data : this.createEmptyState();
  }

  private createEmptyState(): TaskSsotState {
    return {
      version: 1,
      generatedAt: new Date(0).toISOString(),
      source: 'mcp-context-bootstrap',
      tasks: [],
      continuation: {
        activeMainlineTaskId: null,
        activeMainlineLabel: null,
        parkedTaskIds: [],
        blockedTaskIds: [],
        resumeAnchor: null,
        activeMainlineAttention: null,
      },
    };
  }

  private syncFromMcpContext(
    current: TaskSsotState,
    mcpState: McpContextState,
    workflowRuns: WorkflowRunContext[],
    outboxEnvelopes: TaskSsotTask['syncEnvelopes'],
    planArchives: PlanArchiveRecord[],
  ): TaskSsotState {
    const existingById = new Map(current.tasks.map((task) => [task.taskId, task]));
    const mcpTasks = mcpState.tasks.map((task) => {
      const previous = existingById.get(task.id);
      return this.syncTask(previous, task, mcpState, planArchives);
    });
    const workflowTasks = workflowRuns.flatMap(({ run, events }) => this.syncWorkflowRunTasks(run, events, existingById, planArchives));
    const mergedTasks = [...mcpTasks, ...workflowTasks].map((task) => ({
      ...task,
      syncEnvelopes: outboxEnvelopes.filter((envelope) => envelope.taskId === task.taskId),
    }));

    const attentionWorkflowTask =
      workflowTasks
        .filter((task) => task.status === 'active' || task.status === 'in_review' || task.status === 'blocked')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
    const activeMainlineTaskId =
      attentionWorkflowTask?.taskId ??
      mcpState.currentTaskId ??
      mergedTasks.find((task) => task.status === 'active' || task.status === 'in_review' || task.status === 'blocked')?.taskId ??
      null;
    const activeMainlineTask = activeMainlineTaskId ? mergedTasks.find((task) => task.taskId === activeMainlineTaskId) ?? null : null;
    const generatedAt = [mcpState.lastUpdated, ...workflowRuns.map(({ run }) => run.updatedAt)].sort().at(-1) ?? mcpState.lastUpdated;
    return {
      version: 1,
      generatedAt,
      source: 'mcp-context-bootstrap',
      tasks: mergedTasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      continuation: {
        activeMainlineTaskId,
        activeMainlineLabel: activeMainlineTask?.continuation.mainlineLabel ?? activeMainlineTask?.title ?? null,
        parkedTaskIds: mergedTasks.filter((task) => (task.status === 'active' || task.status === 'in_review') && task.taskId !== activeMainlineTaskId).map((task) => task.taskId),
        blockedTaskIds: mergedTasks.filter((task) => task.status === 'blocked').map((task) => task.taskId),
        resumeAnchor: activeMainlineTask?.continuation.resumeAnchor ?? null,
        activeMainlineAttention: activeMainlineTask?.continuation.currentAttention ?? null,
      },
    };
  }

  private async loadWorkflowRunContexts(subprojectId?: string | null): Promise<WorkflowRunContext[]> {
    const runIds = await this.memoryService.listRunIds(subprojectId);
    const runs = await Promise.all(
      runIds.map(async (runId) => {
        try {
          const run = await this.memoryService.loadRunSnapshot(runId, subprojectId);
          const events = await this.memoryService.loadEvents(runId, subprojectId);
          return { run, events } satisfies WorkflowRunContext;
        } catch {
          return null;
        }
      }),
    );
    return runs.filter((run): run is WorkflowRunContext => run !== null);
  }

  private syncTask(
    previous: TaskSsotTask | undefined,
    task: TaskNode,
    mcpState: McpContextState,
    planArchives: PlanArchiveRecord[],
  ): TaskSsotTask {
    const checkpoints = mcpState.checkpoints.filter((item) => item.taskId === task.id);
    const latestCheckpoint = checkpoints.at(-1) ?? null;
    const events = mcpState.eventLog.filter((item) => item.taskId === task.id);
    const latestEvent = events.at(-1) ?? null;
    const status = this.mapTaskStatus(task.status);
    const currentOwnerAgentId = this.resolveOwnerAgentId(latestEvent, mcpState);
    const stageStatus = this.mapStageStatus(task.status);
    const summary = this.resolveSummary(task, latestCheckpoint, latestEvent, previous);
    const sourceType = previous?.sourceType ?? 'mcp-context-task';
    const sourceRef = previous?.sourceRef ?? task.id;
    const currentStage = 'shared-context';
    const continuationBase = this.resolveContinuation(task, latestCheckpoint, latestEvent, previous, mcpState);
    const artifactLinks = [
      ...checkpoints.map((checkpoint) => this.toCheckpointArtifact(task.id, checkpoint)),
      ...this.toPlanArchiveArtifactLinks(task.id, planArchives),
    ];
    const gateChecks = this.resolveGateChecks({
      taskId: task.id,
      status,
      originalDemandRefs: previous?.originalDemandRefs ?? [],
      artifactLinks,
      latestCheckpoint,
      latestEvent,
      summary,
      currentStage,
    });
    const gateHistory = this.resolveSharedContextGateHistory(task, checkpoints, gateChecks);
    const continuation = this.attachCurrentAttention(continuationBase, {
      taskId: task.id,
      sourceType,
      sourceRef,
      currentStage,
      gateChecks,
      gateHistory,
    });
    const collaborationLevel = this.resolveSharedTaskCollaborationLevel({
      previousLevel: previous?.collaborationLevel,
      events,
      checkpoints,
      gateChecks,
    });

    return {
      taskId: task.id,
      sourceType,
      sourceRef,
      originalDemandRefs: previous?.originalDemandRefs ?? [],
      subprojectId: previous?.subprojectId ?? null,
      title: task.label,
      summary,
      collaborationLevel,
      status,
      currentStage: previous?.currentStage ?? currentStage,
      currentOwnerAgentId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      stages: [
        {
          taskId: task.id,
          stageId: 'shared-context',
          status: stageStatus,
          ownerAgentId: currentOwnerAgentId,
          startedAt: task.createdAt,
          completedAt: task.completedAt,
          blockedReason: task.status === 'blocked' ? task.notes ?? 'shared task blocked' : null,
        },
      ],
      gateChecks,
      gateHistory,
      artifactLinks,
      agentAssignments: currentOwnerAgentId
        ? [
            {
              taskId: task.id,
              agentId: currentOwnerAgentId,
              role: 'shared-context-owner',
              assignmentType: 'owner',
              status: task.status === 'completed' ? 'completed' : 'active',
            },
          ]
        : [],
      syncEnvelopes: previous?.syncEnvelopes ?? [],
      continuation,
    };
  }

  private mapTaskStatus(status: TaskNode['status']): TaskSsotStatus {
    switch (status) {
      case 'pending':
        return 'draft';
      case 'in_progress':
        return 'active';
      case 'completed':
        return 'completed';
      case 'blocked':
        return 'blocked';
      default:
        return 'draft';
    }
  }

  private mapStageStatus(status: TaskNode['status']): TaskSsotStageStatus {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'in_progress':
        return 'active';
      case 'completed':
        return 'completed';
      case 'blocked':
        return 'blocked';
      default:
        return 'pending';
    }
  }

  private resolveOwnerAgentId(latestEvent: McpContextEvent | null, mcpState: McpContextState) {
    if (latestEvent?.toolIdentity) {
      return `tool:${latestEvent.toolIdentity}`;
    }
    return mcpState.currentTaskId ? `tool:${mcpState.lastUpdatedBy}` : null;
  }

  private resolveSummary(
    task: TaskNode,
    latestCheckpoint: McpCheckpoint | null,
    latestEvent: McpContextEvent | null,
    previous: TaskSsotTask | undefined,
  ) {
    return task.notes ?? latestCheckpoint?.label ?? latestEvent?.content ?? previous?.summary ?? null;
  }

  private syncWorkflowRunTasks(
    run: WorkflowRun,
    events: WorkflowEvent[],
    existingById: Map<string, TaskSsotTask>,
    planArchives: PlanArchiveRecord[],
  ) {
    const tasks = Array.isArray(run.tasks) ? run.tasks : [];
    return tasks.map((task) => this.syncWorkflowTask(existingById.get(task.id), run, task, events, planArchives));
  }

  private syncWorkflowTask(
    previous: TaskSsotTask | undefined,
    run: WorkflowRun,
    task: WorkflowTask,
    events: WorkflowEvent[],
    planArchives: PlanArchiveRecord[],
  ): TaskSsotTask {
    const stage = run.stages.find((item) => item.id === task.stageId) ?? null;
    const currentOwnerAgentId = stage ? `workflow-role:${stage.ownerRole}` : `workflow-role:${task.ownerRole}`;
    const artifactLinks = [
      ...this.toWorkflowArtifactLinks(run, task),
      ...this.toPlanArchiveArtifactLinks(task.id, planArchives),
    ];
    const status = this.mapWorkflowTaskStatus(run, task);
    const summary = task.summary ?? stage?.summary ?? run.executionSummary ?? previous?.summary ?? null;
    const specialistActivationSnapshot = this.resolveWorkflowSpecialistActivation(task, events);
    const continuationBase = {
      mainlineLabel: `${run.projectName} / ${stage?.label ?? task.title}`,
      nextSafeStep:
        status === 'completed'
          ? null
          : status === 'blocked'
            ? stage?.blockedReason ?? task.blockedReason ?? run.executionSummary ?? 'Resolve the workflow blocker and resume the stage.'
            : status === 'in_review'
              ? `Complete review work for ${stage?.label ?? task.stageId} and clear the review gate.`
              : task.status === 'pending'
                ? `Wait for dependency tasks before starting ${stage?.label ?? task.stageId}.`
                : `Continue ${stage?.label ?? task.stageId} in workflow run ${run.id}.`,
      parkedLines: [],
      blockerType:
        status === 'blocked'
          ? this.classifyBlockerType(stage?.blockedReason ?? task.blockedReason ?? run.executionSummary ?? '')
          : null,
      resumeAnchor: `${run.memory.runStatePath}#stage:${task.stageId}`,
      lastMeaningfulAdvanceAt: stage?.completedAt ?? stage?.startedAt ?? run.updatedAt,
      currentAttention: null,
    };

    const gateChecks = this.resolveGateChecks({
      taskId: task.id,
      status,
      originalDemandRefs: previous?.originalDemandRefs ?? [],
      artifactLinks,
      latestCheckpoint: null,
      latestEvent: null,
      summary,
      currentStage: task.stageId,
      specialistActivation: specialistActivationSnapshot,
    });
    const gateHistory = this.resolveWorkflowGateHistory(run, task, events, gateChecks);
    const continuation = this.attachCurrentAttention(continuationBase, {
      taskId: task.id,
      sourceType: 'workflow-run-task',
      sourceRef: run.id,
      currentStage: task.stageId,
      gateChecks,
      gateHistory,
    });

    const reviewerAssignments = this.resolveWorkflowReviewerAssignments(task, events);
    const collaborationLevel = this.resolveWorkflowCollaborationLevel({
      previousLevel: previous?.collaborationLevel,
      reviewerAssignments,
      specialistActivation: specialistActivationSnapshot,
      task,
      run,
    });
    return {
      taskId: task.id,
      sourceType: 'workflow-run-task',
      sourceRef: run.id,
      originalDemandRefs: previous?.originalDemandRefs ?? [],
      subprojectId: run.subprojectId,
      title: task.title,
      summary,
      collaborationLevel,
      status,
      currentStage: task.stageId,
      currentOwnerAgentId,
      createdAt: run.generatedAt,
      updatedAt: run.updatedAt,
      stages: [
        {
          taskId: task.id,
          stageId: task.stageId,
          status: this.mapStageStatusFromWorkflowTask(task, run),
          ownerAgentId: currentOwnerAgentId,
          startedAt: stage?.startedAt ?? null,
          completedAt: stage?.completedAt ?? null,
          blockedReason: stage?.blockedReason ?? task.blockedReason ?? null,
        },
      ],
      gateChecks,
      gateHistory,
      artifactLinks,
      agentAssignments: [
        {
          taskId: task.id,
          agentId: currentOwnerAgentId,
          role: task.ownerRole,
          assignmentType: 'owner',
          status: status === 'completed' ? 'completed' : 'active',
        },
        ...reviewerAssignments,
      ],
      syncEnvelopes: previous?.syncEnvelopes ?? [],
      continuation,
    };
  }

  private toWorkflowArtifactLinks(run: WorkflowRun, task: WorkflowTask): TaskSsotArtifactLink[] {
    const stage = run.stages.find((item) => item.id === task.stageId) ?? null;
    const dependencyArtifactPaths = task.dependsOn
      .map((dependencyTaskId) => run.tasks.find((candidate) => candidate.id === dependencyTaskId))
      .flatMap((dependencyTask) => dependencyTask?.artifactPaths ?? []);
    const links: TaskSsotArtifactLink[] = [
      ...dependencyArtifactPaths.map((artifactPath, index) => ({
        taskId: task.id,
        artifactType: 'workflow-artifact',
        artifactId: `${task.id}-upstream-${index + 1}`,
        artifactPath,
        roleInTask: 'upstream-truth' as const,
      })),
      ...task.artifactPaths.map((artifactPath, index) => ({
        taskId: task.id,
        artifactType: 'workflow-artifact',
        artifactId: `${task.id}-artifact-${index + 1}`,
        artifactPath,
        roleInTask:
          stage?.capability === 'review' || /review|gate|评审/iu.test(artifactPath)
            ? ('review-evidence' as const)
            : stage?.status === 'completed'
              ? ('final-delivery' as const)
              : ('working-output' as const),
      })),
    ];
    return links;
  }

  private toPlanArchiveArtifactLinks(taskId: string, planArchives: PlanArchiveRecord[]): TaskSsotArtifactLink[] {
    return planArchives
      .filter((record) => record.taskId === taskId)
      .map((record) => ({
        taskId,
        artifactType: 'plan-archive',
        artifactId: record.id,
        artifactPath: record.path,
        roleInTask: 'upstream-truth' as const,
      }));
  }

  private mapWorkflowTaskStatus(run: WorkflowRun, task: WorkflowTask): TaskSsotStatus {
    if (task.status === 'completed') {
      return 'completed';
    }
    if (task.status === 'blocked' || (run.status === 'needs-rework' && run.currentStageId === task.stageId)) {
      return 'blocked';
    }
    if (task.status === 'active') {
      const stage = run.stages.find((item) => item.id === task.stageId) ?? null;
      return stage?.capability === 'review' ? 'in_review' : 'active';
    }
    return 'draft';
  }

  private mapStageStatusFromWorkflowTask(task: WorkflowTask, run: WorkflowRun): TaskSsotStageStatus {
    if (task.status === 'completed') {
      return 'completed';
    }
    if (task.status === 'blocked' || (run.status === 'needs-rework' && run.currentStageId === task.stageId)) {
      return 'blocked';
    }
    if (task.status === 'active') {
      return 'active';
    }
    return 'pending';
  }

  private resolveContinuation(
    task: TaskNode,
    latestCheckpoint: McpCheckpoint | null,
    latestEvent: McpContextEvent | null,
    previous: TaskSsotTask | undefined,
    mcpState: McpContextState,
  ) {
    const isActiveMainline = mcpState.currentTaskId === task.id || (!mcpState.currentTaskId && task.status === 'in_progress');
    const resumeAnchor = latestCheckpoint
      ? `${MCP_CONTEXT_STATE_PATH}#checkpoint:${latestCheckpoint.id}`
      : latestEvent
        ? `${MCP_CONTEXT_STATE_PATH}#event:${latestEvent.id}`
        : `${MCP_CONTEXT_STATE_PATH}#task:${task.id}`;

    return {
      mainlineLabel: previous?.continuation.mainlineLabel ?? task.label,
      nextSafeStep: task.status === 'completed'
        ? null
        : task.status === 'blocked'
          ? task.notes ?? latestCheckpoint?.label ?? 'Resolve the blocker and resume the task from the current shared-context stage.'
          : isActiveMainline
            ? latestCheckpoint?.label ?? latestEvent?.content ?? `Continue ${task.label} from the current shared-context stage.`
            : previous?.continuation.nextSafeStep ?? `Keep ${task.label} parked until it becomes the active mainline again.`,
      parkedLines: previous?.continuation.parkedLines ?? [],
      blockerType: task.status === 'blocked' ? this.classifyBlockerType(task.notes ?? latestCheckpoint?.label ?? latestEvent?.content ?? '') : null,
      resumeAnchor,
      lastMeaningfulAdvanceAt: latestCheckpoint?.timestamp ?? latestEvent?.timestamp ?? task.updatedAt,
      currentAttention: previous?.continuation.currentAttention ?? null,
    };
  }

  private attachCurrentAttention(
    continuation: TaskSsotTask['continuation'],
    input: {
      taskId: string;
      sourceType: TaskSsotTask['sourceType'];
      sourceRef: TaskSsotTask['sourceRef'];
      currentStage: TaskSsotTask['currentStage'];
      gateChecks: TaskSsotTask['gateChecks'];
      gateHistory: TaskSsotTask['gateHistory'];
    },
  ): TaskSsotTask['continuation'] {
    return {
      ...continuation,
      currentAttention: this.gateAttentionService.resolveCurrentAttention({
        taskId: input.taskId,
        sourceType: input.sourceType,
        sourceRef: input.sourceRef,
        currentStage: input.currentStage,
        continuation,
        gateChecks: input.gateChecks,
        gateHistory: input.gateHistory,
      }),
    };
  }

  private resolveGateChecks(input: {
    taskId: string;
    status: TaskSsotStatus;
    originalDemandRefs: string[];
    artifactLinks: TaskSsotTask['artifactLinks'];
    latestCheckpoint: McpCheckpoint | null;
    latestEvent: McpContextEvent | null;
    summary: string | null;
    currentStage?: string | null;
    specialistActivation?: {
      required: boolean;
      activatedRoles: string[];
      assumedRoles: string[];
      missingRoles: string[];
    } | null;
  }) {
    const checkedAt = input.latestCheckpoint?.timestamp ?? input.latestEvent?.timestamp ?? new Date().toISOString();
    const upstreamEvidencePaths = input.artifactLinks
      .filter((artifact) => artifact.roleInTask === 'upstream-truth')
      .map((artifact) => artifact.artifactPath);
    const reviewEvidencePaths = input.artifactLinks
      .filter((artifact) => artifact.roleInTask === 'review-evidence')
      .map((artifact) => artifact.artifactPath);
    const workingOutputPaths = input.artifactLinks
      .filter((artifact) => artifact.roleInTask === 'working-output' || artifact.roleInTask === 'final-delivery')
      .map((artifact) => artifact.artifactPath);
    const finalDeliveryPaths = input.artifactLinks
      .filter((artifact) => artifact.roleInTask === 'final-delivery')
      .map((artifact) => artifact.artifactPath);
    const designLanguagePaths = input.artifactLinks
      .map((artifact) => artifact.artifactPath)
      .filter((artifactPath) => /(^|[\\/])DESIGN\.md$/iu.test(artifactPath));
    const designConfirmationPaths = input.artifactLinks
      .map((artifact) => artifact.artifactPath)
      .filter((artifactPath) => /design-confirm|design-confirmation|confirmation-record|确认/u.test(artifactPath));
    const aiWritebackPaths = input.artifactLinks
      .map((artifact) => artifact.artifactPath)
      .filter((artifactPath) => /ai-writeback|writeback|backwrite|回写/u.test(artifactPath));
    const requirementToFunctionPaths = input.artifactLinks
      .map((artifact) => artifact.artifactPath)
      .filter((artifactPath) => /requirement-to-function/u.test(artifactPath));
    const functionToApiPaths = input.artifactLinks
      .map((artifact) => artifact.artifactPath)
      .filter((artifactPath) => /function-to-api/u.test(artifactPath));
    const apiToTaskPaths = input.artifactLinks
      .map((artifact) => artifact.artifactPath)
      .filter((artifactPath) => /api-to-task/u.test(artifactPath));
    const planArchivePaths = input.artifactLinks
      .filter((artifact) => artifact.artifactType === 'plan-archive')
      .map((artifact) => artifact.artifactPath);
    const taskContext = [
      input.summary ?? '',
      input.latestCheckpoint?.label ?? '',
      input.latestEvent?.content ?? '',
      ...input.artifactLinks.map((artifact) => artifact.artifactPath),
    ].join(' ');
    const designRelevant = /design|ui|visual|interaction|prototype|figma|pixso|html|schema|设计|视觉|交互|原型/u.test(taskContext);
    const aiWritebackRelevant = /writeback|backwrite|ai-writeback|回写/u.test(taskContext);

    const planningRelevant = /plan|planning|roadmap|规划|计划/u.test(taskContext);
    const isDeliveryState = input.status === 'completed' || input.status === 'ready_for_delivery';
    const requiresRequirementToFunction =
      input.currentStage === 'requirements-document' || /requirements-document|requirement-to-function/u.test(taskContext);
    const requiresFunctionToApi =
      input.currentStage === 'functional-specification' || /functional-specification|function-to-api/u.test(taskContext);
    const requiresApiToTask = input.currentStage === 'backend-api' || /backend-api|api-to-task/u.test(taskContext);

    const checks: TaskSsotTask['gateChecks'] = [
      {
        taskId: input.taskId,
        gateId: 'project-truth-gate',
        status: input.originalDemandRefs.length > 0 || upstreamEvidencePaths.length > 0 ? 'pass' : 'warn',
        reason:
          input.originalDemandRefs.length > 0 || upstreamEvidencePaths.length > 0
            ? 'Upstream truth references are attached to the task.'
            : 'No original-demand refs or upstream-truth artifacts are attached yet.',
        evidencePaths: [...input.originalDemandRefs, ...upstreamEvidencePaths],
        checkedAt,
      },
      {
        taskId: input.taskId,
        gateId: 'review-convergence-gate',
        status:
          reviewEvidencePaths.length > 0
            ? 'pass'
            : input.status === 'in_review'
              ? 'block'
              : 'warn',
        reason:
          reviewEvidencePaths.length > 0
            ? 'Review evidence is linked to the task.'
            : input.status === 'in_review'
              ? 'Task is in review but no review-evidence artifact is linked yet.'
              : 'No review-evidence artifact is linked yet.',
        evidencePaths: reviewEvidencePaths,
        checkedAt,
      },
      {
        taskId: input.taskId,
        gateId: 'plan-archive-gate',
        status:
          planArchivePaths.length > 0
            ? 'pass'
            : planningRelevant && isDeliveryState
              ? 'block'
              : 'warn',
        reason:
          planArchivePaths.length > 0
            ? 'Plan archive is linked to the task.'
            : planningRelevant && isDeliveryState
              ? 'Planning-relevant task reached delivery state without a linked plan archive.'
              : 'No plan archive is linked yet.',
        evidencePaths: planArchivePaths,
        checkedAt,
      },
      {
        taskId: input.taskId,
        gateId: 'asset-backwrite-gate',
        status:
          finalDeliveryPaths.length > 0 || (workingOutputPaths.length > 0 && input.status !== 'completed' && input.status !== 'ready_for_delivery')
            ? 'pass'
            : input.status === 'completed'
              ? 'block'
              : input.status === 'ready_for_delivery'
                ? 'block'
              : 'warn',
        reason:
          finalDeliveryPaths.length > 0
            ? 'Final delivery artifacts are written back and linked to the task.'
            : workingOutputPaths.length > 0 && input.status !== 'completed' && input.status !== 'ready_for_delivery'
              ? 'Working-output artifacts are linked while the task is still in motion.'
            : input.status === 'completed'
              ? 'Task is completed but no final-delivery backwrite artifact was written back.'
              : input.status === 'ready_for_delivery'
                ? 'Task is marked ready for delivery but no final-delivery backwrite artifact is linked yet.'
                : 'Task has not written back repository-backed artifacts yet.',
        evidencePaths: [...workingOutputPaths, ...finalDeliveryPaths],
        checkedAt,
      },
    ];

    if (requiresRequirementToFunction || requirementToFunctionPaths.length > 0) {
      checks.push({
        taskId: input.taskId,
        gateId: 'requirement-to-function-gate',
        status: requirementToFunctionPaths.length > 0 ? 'pass' : isDeliveryState || input.status === 'in_review' ? 'block' : 'warn',
        reason:
          requirementToFunctionPaths.length > 0
            ? 'Requirement-to-function mapping artifact is linked to the task.'
            : isDeliveryState || input.status === 'in_review'
              ? 'Requirement stage cannot close or enter review without requirement-to-function mapping.'
              : 'Requirement-to-function mapping is not linked yet.',
        evidencePaths: requirementToFunctionPaths,
        checkedAt,
      });
    }

    if (requiresFunctionToApi || functionToApiPaths.length > 0) {
      checks.push({
        taskId: input.taskId,
        gateId: 'function-to-api-gate',
        status: functionToApiPaths.length > 0 ? 'pass' : isDeliveryState || input.status === 'in_review' ? 'block' : 'warn',
        reason:
          functionToApiPaths.length > 0
            ? 'Function-to-api mapping artifact is linked to the task.'
            : isDeliveryState || input.status === 'in_review'
              ? 'Functional specification cannot close or enter review without function-to-api mapping.'
              : 'Function-to-api mapping is not linked yet.',
        evidencePaths: functionToApiPaths,
        checkedAt,
      });
    }

    if (requiresApiToTask || apiToTaskPaths.length > 0) {
      checks.push({
        taskId: input.taskId,
        gateId: 'api-to-task-gate',
        status: apiToTaskPaths.length > 0 ? 'pass' : isDeliveryState || input.status === 'in_review' ? 'block' : 'warn',
        reason:
          apiToTaskPaths.length > 0
            ? 'API-to-task mapping artifact is linked to the task.'
            : isDeliveryState || input.status === 'in_review'
              ? 'Backend API stage cannot close or enter review without api-to-task mapping.'
              : 'API-to-task mapping is not linked yet.',
        evidencePaths: apiToTaskPaths,
        checkedAt,
      });
    }

    if (designRelevant || designLanguagePaths.length > 0) {
      checks.push({
        taskId: input.taskId,
        gateId: 'design-language-ready',
        status:
          designLanguagePaths.length > 0
            ? 'pass'
            : input.status === 'completed' || input.status === 'ready_for_delivery'
              ? 'block'
              : 'warn',
        reason:
          designLanguagePaths.length > 0
            ? 'Project-level DESIGN.md is attached to the task context.'
            : input.status === 'completed' || input.status === 'ready_for_delivery'
              ? 'Design-relevant task reached delivery state without linked DESIGN.md.'
              : 'Design-relevant task has no linked DESIGN.md yet.',
        evidencePaths: designLanguagePaths,
        checkedAt,
      });
      checks.push({
        taskId: input.taskId,
        gateId: 'design-confirmed-gate',
        status:
          designConfirmationPaths.length > 0
            ? 'pass'
            : input.status === 'completed' || input.status === 'ready_for_delivery'
              ? 'block'
              : 'warn',
        reason:
          designConfirmationPaths.length > 0
            ? 'Design confirmation evidence is linked to the task.'
            : input.status === 'completed' || input.status === 'ready_for_delivery'
              ? 'Design-relevant task reached delivery state without linked design confirmation evidence.'
              : 'Design confirmation evidence is not linked yet.',
        evidencePaths: designConfirmationPaths,
        checkedAt,
      });
    }

    if (aiWritebackRelevant || aiWritebackPaths.length > 0) {
      checks.push({
        taskId: input.taskId,
        gateId: 'ai-writeback-confirmation',
        status:
          aiWritebackPaths.length > 0 && designConfirmationPaths.length > 0
            ? 'pass'
            : input.status === 'completed' || input.status === 'ready_for_delivery'
              ? 'block'
              : 'warn',
        reason:
          aiWritebackPaths.length > 0 && designConfirmationPaths.length > 0
            ? 'AI writeback artifacts and confirmation evidence are both linked.'
            : input.status === 'completed' || input.status === 'ready_for_delivery'
              ? 'AI writeback reached delivery state without both writeback artifact and confirmation evidence.'
              : 'AI writeback artifact or confirmation evidence is not linked yet.',
        evidencePaths: [...aiWritebackPaths, ...designConfirmationPaths],
        checkedAt,
      });
    }

    if (input.specialistActivation?.required) {
      checks.push({
        taskId: input.taskId,
        gateId: 'specialist-activation-gate',
        status:
          input.specialistActivation.missingRoles.length > 0
            ? 'block'
            : input.specialistActivation.assumedRoles.length > 0 || input.specialistActivation.activatedRoles.length === 0
              ? 'block'
              : 'pass',
        reason:
          input.specialistActivation.missingRoles.length > 0
            ? `Missing specialist activation roles: ${input.specialistActivation.missingRoles.join(', ')}.`
            : input.specialistActivation.assumedRoles.length > 0
              ? `Implicit specialist activation defaults still remain and must be replaced with runtime-backed reviewer evidence: ${input.specialistActivation.assumedRoles.join(', ')}.`
              : input.specialistActivation.activatedRoles.length === 0
                ? 'No runtime-backed specialist activation evidence is attached yet, so this review-required task cannot continue.'
                : `Runtime-backed specialist activation is visible: ${input.specialistActivation.activatedRoles.join(', ')}.`,
        evidencePaths: [],
        checkedAt,
      });
    }

    return checks;
  }

  private resolveWorkflowSpecialistActivation(task: WorkflowTask, events: WorkflowEvent[]) {
    const relevantEvents = [...events]
      .filter((event) => event.stageId === task.stageId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const reviewEvent = relevantEvents.find((event) => event.kind === 'review_recorded' || event.kind === 'stage_blocked') ?? null;
    const activatedRoles = Array.isArray(reviewEvent?.metadata.activatedSpecialistRoles)
      ? reviewEvent.metadata.activatedSpecialistRoles.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
    const assumedRoles = Array.isArray(reviewEvent?.metadata.assumedSpecialistRoles)
      ? reviewEvent.metadata.assumedSpecialistRoles.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
    const missingRoles = Array.isArray(reviewEvent?.metadata.missingSpecialistRoles)
      ? reviewEvent.metadata.missingSpecialistRoles.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];

    return {
      required: Boolean(task.metadata.reviewRequired),
      activatedRoles,
      assumedRoles,
      missingRoles,
    };
  }

  private resolveSharedContextGateHistory(
    task: TaskNode,
    checkpoints: McpCheckpoint[],
    gateChecks: TaskSsotGateCheck[],
  ): TaskSsotGateEvent[] {
    const history: TaskSsotGateEvent[] = [];
    for (const checkpoint of checkpoints) {
      const gateId = this.inferCheckpointGateId(checkpoint.label);
      if (!gateId) {
        continue;
      }
      const gate = gateChecks.find((item) => item.gateId === gateId) ?? null;
      history.push({
        id: `gate-event-${checkpoint.id}`,
        taskId: task.id,
        gateId,
        stageId: 'shared-context',
        action: 'checkpoint-recorded',
        fromStatus: null,
        toStatus: gate?.status ?? null,
        actorRole: 'shared-context-owner',
        artifactRefs: [`${MCP_CONTEXT_STATE_PATH}#checkpoint:${checkpoint.id}`],
        evidenceRefs: gate?.evidencePaths ?? [],
        sourceEventId: checkpoint.id,
        recordedAt: checkpoint.timestamp,
        summary: checkpoint.label,
      });
    }
    return history.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  }

  private resolveWorkflowGateHistory(
    run: WorkflowRun,
    task: WorkflowTask,
    events: WorkflowEvent[],
    gateChecks: TaskSsotGateCheck[],
  ): TaskSsotGateEvent[] {
    const gateStatusById = new Map<string, string | null>();
    const stageEvents = events
      .filter((event) => event.stageId === task.stageId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return stageEvents
      .map((event) => this.toWorkflowGateEvent(run, task, event, gateChecks, gateStatusById))
      .filter((item): item is TaskSsotGateEvent => item !== null);
  }

  private resolveWorkflowReviewerAssignments(task: WorkflowTask, events: WorkflowEvent[]) {
    const reviewerRoles = new Set<string>();
    const relevantEvents = events.filter((event) => event.stageId === task.stageId);

    for (const event of relevantEvents) {
      const assignedRoles = Array.isArray(event.metadata.taskAssignmentRoles)
        ? event.metadata.taskAssignmentRoles.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
      const activatedRoles = Array.isArray(event.metadata.activatedSpecialistRoles)
        ? event.metadata.activatedSpecialistRoles.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
      for (const role of assignedRoles) {
        reviewerRoles.add(role);
      }
      for (const role of activatedRoles) {
        reviewerRoles.add(role);
      }
    }

    return [...reviewerRoles].map((role) => ({
      taskId: task.id,
      agentId: `specialist-role:${role}`,
      role,
      assignmentType: 'reviewer' as const,
      status: task.status === 'completed' ? 'completed' as const : 'active' as const,
    }));
  }

  private toWorkflowGateEvent(
    run: WorkflowRun,
    task: WorkflowTask,
    event: WorkflowEvent,
    gateChecks: TaskSsotGateCheck[],
    gateStatusById: Map<string, string | null>,
  ): TaskSsotGateEvent | null {
    const gateId = this.resolveWorkflowGateId(event);
    if (!gateId) {
      return null;
    }

    const currentGate = gateChecks.find((item) => item.gateId === gateId) ?? null;
    const nextStatus = this.resolveWorkflowGateStatus(event, currentGate);
    const previousStatus = gateStatusById.get(gateId) ?? null;
    gateStatusById.set(gateId, nextStatus);

    return {
      id: `gate-event-${event.id}`,
      taskId: task.id,
      gateId,
      stageId: task.stageId,
      action: this.resolveWorkflowGateAction(event),
      fromStatus: previousStatus,
      toStatus: nextStatus,
      actorRole: this.resolveWorkflowGateActor(event),
      artifactRefs: event.artifactPath ? [event.artifactPath] : [],
      evidenceRefs: currentGate?.evidencePaths ?? [],
      sourceEventId: event.id,
      recordedAt: event.timestamp,
      summary: `${run.projectName}: ${event.detail}`,
    };
  }

  private inferCheckpointGateId(label: string): string | null {
    const normalized = label.toLowerCase();
    if (/design\.md/u.test(normalized)) {
      return 'design-language-ready';
    }
    if (/(confirm|confirmation|确认)/u.test(normalized) && /(design|visual|interaction|prototype|html|ui|设计|视觉|交互)/u.test(normalized)) {
      return 'design-confirmed-gate';
    }
    if (/(writeback|backwrite|回写)/u.test(normalized)) {
      return 'ai-writeback-confirmation';
    }
    if (/review|gate|评审/u.test(normalized)) {
      return 'review-convergence-gate';
    }
    if (/requirement-to-function/u.test(normalized)) {
      return 'requirement-to-function-gate';
    }
    if (/function-to-api/u.test(normalized)) {
      return 'function-to-api-gate';
    }
    if (/api-to-task/u.test(normalized)) {
      return 'api-to-task-gate';
    }
    if (/plan archive|plan-archive|planning|roadmap|规划|计划/u.test(normalized)) {
      return 'plan-archive-gate';
    }
    if (/truth|ssot|requirement|version|真源|需求/u.test(normalized)) {
      return 'project-truth-gate';
    }
    if (/writeback|backwrite|artifact|delivery|回写|交付/u.test(normalized)) {
      return 'asset-backwrite-gate';
    }
    return null;
  }

  private resolveWorkflowGateId(event: WorkflowEvent): string | null {
    if (event.artifactPath && /(^|[\\/])DESIGN\.md$/iu.test(event.artifactPath)) {
      return 'design-language-ready';
    }
    if (event.artifactPath && /design-confirm|design-confirmation|confirmation-record|确认/u.test(event.artifactPath)) {
      return 'design-confirmed-gate';
    }
    if (event.artifactPath && /ai-writeback|writeback|backwrite|回写/u.test(event.artifactPath)) {
      return 'ai-writeback-confirmation';
    }
    if (event.artifactPath && /requirement-to-function/u.test(event.artifactPath)) {
      return 'requirement-to-function-gate';
    }
    if (event.artifactPath && /function-to-api/u.test(event.artifactPath)) {
      return 'function-to-api-gate';
    }
    if (event.artifactPath && /api-to-task/u.test(event.artifactPath)) {
      return 'api-to-task-gate';
    }
    if (event.artifactPath && /plan-archive|plan-archives|planning|roadmap|规划|计划/u.test(event.artifactPath)) {
      return 'plan-archive-gate';
    }
    if (event.kind === 'artifact_written' || event.kind === 'stage_completed') {
      return 'asset-backwrite-gate';
    }
    if (event.kind === 'review_recorded' || (event.kind === 'stage_blocked' && this.isReviewGateEvent(event)) || event.kind === 'stage_resumed') {
      return 'review-convergence-gate';
    }
    return null;
  }

  private resolveWorkflowGateStatus(event: WorkflowEvent, currentGate: TaskSsotGateCheck | null): string | null {
    if (event.kind === 'artifact_written' || event.kind === 'stage_completed' || event.kind === 'stage_resumed') {
      return 'pass';
    }
    if (event.kind === 'review_recorded') {
      if (typeof event.metadata.blocked === 'boolean') {
        return event.metadata.blocked ? 'block' : 'pass';
      }
      return currentGate?.status ?? 'warn';
    }
    if (event.kind === 'stage_blocked') {
      return this.isReviewGateEvent(event) ? 'block' : currentGate?.status ?? 'block';
    }
    return currentGate?.status ?? null;
  }

  private resolveWorkflowGateAction(event: WorkflowEvent): string {
    if (event.kind === 'artifact_written') {
      return 'artifact-written';
    }
    if (event.kind === 'stage_completed') {
      return 'stage-completed';
    }
    if (event.kind === 'stage_resumed') {
      return 'resume';
    }
    if (event.kind === 'review_recorded') {
      return typeof event.metadata.blocked === 'boolean' && event.metadata.blocked ? 'review-blocked' : 'review-passed';
    }
    if (event.kind === 'stage_blocked') {
      return 'block';
    }
    return event.kind;
  }

  private resolveWorkflowGateActor(event: WorkflowEvent): string {
    const source = typeof event.metadata.source === 'string' ? event.metadata.source : null;
    if (source === 'manual-gate') {
      return 'operator';
    }
    if (source === 'scheduler') {
      return 'scheduler';
    }
    if (event.kind === 'review_recorded') {
      return 'review-committee';
    }
    return 'workflow-runtime';
  }

  private isReviewGateEvent(event: WorkflowEvent): boolean {
    const source = typeof event.metadata.source === 'string' ? event.metadata.source : null;
    return source === 'manual-gate' || typeof event.metadata.reviewDecision === 'string' || /review|gate/i.test(event.detail);
  }

  private classifyBlockerType(content: string) {
    const normalized = content.toLowerCase();
    if (/permission|approve|approval|权限|授权/u.test(normalized)) {
      return 'permission' as const;
    }
    if (/depend|missing|prerequisite|依赖|缺前置|前置/u.test(normalized)) {
      return 'dependency' as const;
    }
    if (/risk|blast|high-risk|风险/u.test(normalized)) {
      return 'risk' as const;
    }
    if (/question|unknown|clarify|信息|澄清|未知/u.test(normalized)) {
      return 'information' as const;
    }
    if (/manual|human|review|人工|人工决策/u.test(normalized)) {
      return 'manual' as const;
    }
    return 'unknown' as const;
  }

  private toCheckpointArtifact(taskId: string, checkpoint: McpCheckpoint) {
    const label = checkpoint.label.toLowerCase();
    let roleInTask: TaskSsotTask['artifactLinks'][number]['roleInTask'] =
      /review|gate|评审/u.test(label)
        ? 'review-evidence'
        : /baseline|requirement|version|truth|ssot|demand|需求|真源/u.test(label)
          ? 'upstream-truth'
          : 'working-output';
    if (/final-delivery|delivered|release|closed|closure|completed|完成|通过|已落地|落地|收口/u.test(label)) {
      roleInTask = 'final-delivery';
    }

    return {
      taskId,
      artifactType: 'checkpoint',
      artifactId: checkpoint.id,
      artifactPath: `${MCP_CONTEXT_STATE_PATH}#checkpoint:${checkpoint.id}`,
      roleInTask,
    };
  }

  private resolveSharedTaskCollaborationLevel(input: {
    previousLevel: TaskSsotTask['collaborationLevel'] | undefined;
    events: McpContextEvent[];
    checkpoints: McpCheckpoint[];
    gateChecks: TaskSsotGateCheck[];
  }): TaskSsotTask['collaborationLevel'] {
    if (input.previousLevel === 'L3') {
      return 'L3';
    }
    const mentionsReview = input.gateChecks.some((gate) => gate.gateId === 'review-convergence-gate');
    const mentionsWriteback = input.gateChecks.some((gate) => gate.gateId === 'asset-backwrite-gate');
    const hasMultipleSignals = input.events.length + input.checkpoints.length >= 3;
    if (mentionsReview && mentionsWriteback && hasMultipleSignals) {
      return 'L1';
    }
    return input.previousLevel ?? 'L0';
  }

  private resolveWorkflowCollaborationLevel(input: {
    previousLevel: TaskSsotTask['collaborationLevel'] | undefined;
    reviewerAssignments: TaskSsotTask['agentAssignments'];
    specialistActivation: {
      required: boolean;
      activatedRoles: string[];
      assumedRoles: string[];
      missingRoles: string[];
    } | null;
    task: WorkflowTask;
    run: WorkflowRun;
  }): TaskSsotTask['collaborationLevel'] {
    if (input.previousLevel === 'L3') {
      return 'L3';
    }
    const reviewerCount = input.reviewerAssignments.filter((assignment) => assignment.assignmentType === 'reviewer').length;
    const activatedCount = input.specialistActivation?.activatedRoles.length ?? 0;
    const hasRework = Boolean(input.run.rework?.targetStageId) || input.run.reworkCount > 0;
    if (activatedCount > 1 || hasRework) {
      return 'L3';
    }
    if (reviewerCount > 0 || input.task.metadata.reviewRequired) {
      return 'L2';
    }
    return input.previousLevel ?? 'L1';
  }
}
