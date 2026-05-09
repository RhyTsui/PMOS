import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { OrchestratorRuntime } from './orchestratorRuntime.js';
import { WorkflowEngine } from './workflowEngine.js';
import {
  getDagChangeEventDirectoryPath,
  getDagChangeEventPath,
  getDagGraphPath,
  getDagRunDirectoryPath,
  getDagRunPath,
} from './projectPaths.js';
import { ImpactEngine } from './impactEngine.js';
import type { DAGChangeEvent, DAGGraph, DAGRun, WorkflowDefinition, WorkflowRun } from '../shared/schemas.js';

export class DagService {
  constructor(
    private readonly store: FileStore,
    private readonly workflowEngine = new WorkflowEngine(store),
    private readonly memoryService = new MemoryService(store),
    private readonly orchestratorRuntime = new OrchestratorRuntime(store, memoryService),
  ) {}

  async loadGraph(subprojectId?: string | null) {
    const target = getDagGraphPath(subprojectId);
    if (await this.store.exists(target)) {
      return this.store.readJson<DAGGraph>(target);
    }

    const definition = await this.workflowEngine.loadDefinition(subprojectId ? `subprojects/${subprojectId}` : '');
    const graph = this.buildGraphFromWorkflow(definition);
    await this.saveGraph(graph, subprojectId);
    return graph;
  }

  async saveGraph(graph: DAGGraph, subprojectId?: string | null) {
    await this.store.writeJson(getDagGraphPath(subprojectId), graph);
  }

  async listRuns(subprojectId?: string | null) {
    const relativeDir = getDagRunDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [] as DAGRun[];
    }

    const files = await this.store.list(relativeDir);
    const runs = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => this.store.readJson<DAGRun>(file)),
    );
    return runs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async listChangeEvents(subprojectId?: string | null) {
    const relativeDir = getDagChangeEventDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [] as DAGChangeEvent[];
    }

    const files = await this.store.list(relativeDir);
    const events = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => this.store.readJson<DAGChangeEvent>(file)),
    );
    return events.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }

  async registerChange(
    input: Omit<DAGChangeEvent, 'id' | 'timestamp' | 'affectedNodes'> & { subprojectId?: string | null },
  ) {
    const graph = await this.loadGraph(input.subprojectId);
    const engine = new ImpactEngine(graph);
    const analysis = engine.analyzeAndPropagate(input.nodeId);
    engine.markDirty(analysis.dirtyNodes);

    const event: DAGChangeEvent = {
      id: `dag-change-${randomUUID()}`,
      runId: input.runId,
      nodeId: input.nodeId,
      changeType: input.changeType,
      previousVersion: input.previousVersion ?? null,
      newVersion: input.newVersion ?? null,
      timestamp: new Date().toISOString(),
      affectedNodes: analysis.dirtyNodes,
      triggeredBy: input.triggeredBy,
    };

    await this.saveGraph(graph, input.subprojectId);
    await this.store.writeJson(getDagChangeEventPath(event.id, input.subprojectId), event);

    const dagRun: DAGRun = {
      id: `dag-run-${randomUUID()}`,
      graphId: graph.id,
      graphVersion: 'v1',
      status: analysis.requiresFullRerun ? 'blocked' : 'running',
      executionMode: graph.executionMode,
      dirtyNodes: analysis.dirtyNodes,
      completedNodes: graph.nodes.filter((node) => node.state === 'clean').map((node) => node.id),
      runningNodes: analysis.requiresFullRerun ? [] : analysis.dirtyNodes,
      changeLog: analysis.dirtyNodes.map((nodeId) => ({
        nodeId,
        previousState: 'clean',
        newState: 'dirty',
        triggeredBy: input.triggeredBy,
        timestamp: event.timestamp,
      })),
      createdAt: event.timestamp,
      updatedAt: event.timestamp,
      metadata: {
        sourceNodeId: input.nodeId,
        workflowRunId: input.runId,
        requiresFullRerun: analysis.requiresFullRerun,
      },
    };
    await this.store.writeJson(getDagRunPath(dagRun.id, input.subprojectId), dagRun);

    return {
      event,
      analysis,
      dagRun,
      graph,
    };
  }

  async rerunDirtyNodes(input: {
    dagRunId?: string | null;
    workflowRunId?: string | null;
    subprojectId?: string | null;
    reason?: string | null;
    runUntilBlocked?: boolean;
  }) {
    const dagRun = await this.resolveDagRun(input.dagRunId, input.subprojectId);
    const workflowRunId =
      input.workflowRunId ??
      (typeof dagRun.metadata.workflowRunId === 'string' ? dagRun.metadata.workflowRunId : null);

    if (!workflowRunId) {
      throw new Error(`workflow run id is required for DAG run ${dagRun.id}`);
    }

    const graph = await this.loadGraph(input.subprojectId);
    const dirtyStageIds = this.resolveDirtyStageIds(graph, dagRun);
    if (dirtyStageIds.length === 0) {
      return {
        dagRun,
        graph,
        workflowRun: await this.memoryService.loadRunSnapshot(workflowRunId, input.subprojectId),
        rerunStageIds: [],
        completedStageIds: [],
      };
    }

    const preparedRun = await this.prepareWorkflowRunForDirtyStages({
      workflowRunId,
      subprojectId: input.subprojectId,
      dagRun,
      dirtyStageIds,
      reason: input.reason ?? null,
    });
    const workflowRun = input.runUntilBlocked
      ? await this.orchestratorRuntime.runUntilBlocked(preparedRun.id)
      : preparedRun;

    const completedStageIds = dirtyStageIds.filter((stageId) =>
      workflowRun.stages.some((stage) => stage.id === stageId && stage.status === 'completed'),
    );
    const completedNodeIds = graph.nodes
      .filter((node) => completedStageIds.includes(node.stageId ?? node.id))
      .map((node) => node.id);
    const remainingDirtyNodes = dagRun.dirtyNodes.filter((nodeId) => !completedNodeIds.includes(nodeId));
    const currentStageNode = graph.nodes.find((node) => (node.stageId ?? node.id) === workflowRun.currentStageId);
    const nextRunningNodes =
      currentStageNode && remainingDirtyNodes.includes(currentStageNode.id) ? [currentStageNode.id] : [];
    const now = new Date().toISOString();

    for (const node of graph.nodes) {
      if (completedNodeIds.includes(node.id)) {
        node.state = 'clean';
      } else if (remainingDirtyNodes.includes(node.id)) {
        node.state = 'dirty';
      }
    }

    const updatedDagRun: DAGRun = {
      ...dagRun,
      status:
        remainingDirtyNodes.length === 0
          ? 'completed'
          : workflowRun.status === 'blocked' || workflowRun.status === 'needs-rework'
            ? 'blocked'
            : 'running',
      dirtyNodes: remainingDirtyNodes,
      completedNodes: Array.from(new Set([...dagRun.completedNodes, ...completedNodeIds])),
      runningNodes: nextRunningNodes,
      updatedAt: now,
      metadata: {
        ...dagRun.metadata,
        lastWorkflowRunStatus: workflowRun.status,
        lastRerunAt: now,
        lastRerunReason: input.reason ?? null,
      },
    };

    await this.saveGraph(graph, input.subprojectId);
    await this.store.writeJson(getDagRunPath(updatedDagRun.id, input.subprojectId), updatedDagRun);

    return {
      dagRun: updatedDagRun,
      graph,
      workflowRun,
      rerunStageIds: dirtyStageIds,
      completedStageIds,
    };
  }

  private async resolveDagRun(dagRunId?: string | null, subprojectId?: string | null) {
    if (dagRunId) {
      return this.store.readJson<DAGRun>(getDagRunPath(dagRunId, subprojectId));
    }

    const runs = await this.listRuns(subprojectId);
    const dagRun = runs.find((run) => run.dirtyNodes.length > 0) ?? runs[0] ?? null;
    if (!dagRun) {
      throw new Error('no DAG run available for dirty-node rerun');
    }
    return dagRun;
  }

  private resolveDirtyStageIds(graph: DAGGraph, dagRun: DAGRun) {
    return Array.from(
      new Set(
        dagRun.dirtyNodes
          .map((nodeId) => graph.nodes.find((node) => node.id === nodeId))
          .map((node) => node?.stageId ?? node?.id ?? null)
          .filter((stageId): stageId is string => Boolean(stageId)),
      ),
    );
  }

  private async prepareWorkflowRunForDirtyStages(input: {
    workflowRunId: string;
    subprojectId?: string | null;
    dagRun: DAGRun;
    dirtyStageIds: string[];
    reason: string | null;
  }): Promise<WorkflowRun> {
    const run = await this.memoryService.loadRunSnapshot(input.workflowRunId, input.subprojectId);
    const dirtyStageSet = new Set(input.dirtyStageIds);
    const dirtyIndexes = run.stages
      .map((stage, index) => (dirtyStageSet.has(stage.id) ? index : -1))
      .filter((index) => index >= 0);
    if (dirtyIndexes.length === 0) {
      throw new Error(`DAG run ${input.dagRun.id} does not map to workflow run ${run.id}`);
    }

    const firstDirtyIndex = Math.min(...dirtyIndexes);
    const firstDirtyStage = run.stages[firstDirtyIndex];
    const now = new Date().toISOString();

    run.stages = run.stages.map((stage, index) => {
      if (!dirtyStageSet.has(stage.id)) {
        if (index > firstDirtyIndex && stage.status === 'active') {
          return {
            ...stage,
            status: 'pending' as const,
            blockedReason: null,
            metadata: {
              ...stage.metadata,
              dagPausedAt: now,
              dagPausedByRunId: input.dagRun.id,
            },
          };
        }
        return stage;
      }

      const active = index === firstDirtyIndex;
      return {
        ...stage,
        status: active ? ('active' as const) : ('pending' as const),
        outputPaths: [],
        startedAt: active ? now : null,
        completedAt: null,
        blockedReason: null,
        attemptCount: stage.attemptCount + (active ? 1 : 0),
        summary: null,
        metadata: {
          ...stage.metadata,
          dagRunId: input.dagRun.id,
          dagRerunAt: now,
          dagRerunReason: input.reason,
          dagPreviousStatus: stage.status,
        },
      };
    });

    run.tasks = run.tasks.map((task) => {
      if (!dirtyStageSet.has(task.stageId)) {
        const taskStageIndex = run.stages.findIndex((stage) => stage.id === task.stageId);
        if (taskStageIndex > firstDirtyIndex && task.status === 'active') {
          return {
            ...task,
            status: 'pending' as const,
            blockedReason: null,
            metadata: {
              ...task.metadata,
              dagPausedAt: now,
              dagPausedByRunId: input.dagRun.id,
            },
          };
        }
        return task;
      }

      const active = task.stageId === firstDirtyStage.id;
      return {
        ...task,
        status: active ? ('active' as const) : ('pending' as const),
        artifactPaths: [],
        blockedReason: null,
        summary: null,
        metadata: {
          ...task.metadata,
          dagRunId: input.dagRun.id,
          dagRerunAt: now,
          dagRerunReason: input.reason,
        },
      };
    });

    run.currentStageId = firstDirtyStage.id;
    run.status = 'running';
    run.activeCapability = firstDirtyStage.capability;
    run.rework = null;
    run.executionSummary = `DAG dirty-node rerun started at ${firstDirtyStage.id}.`;
    run.updatedAt = now;
    run.metadata = {
      ...run.metadata,
      activeDagRunId: input.dagRun.id,
      dagRerunStageIds: input.dirtyStageIds,
    };

    await this.memoryService.appendEvent(
      run.id,
      {
        id: `${run.id}-dag-rerun-${now.replace(/[-:.TZ]/gu, '').slice(0, 14)}`,
        runId: run.id,
        stageId: firstDirtyStage.id,
        kind: 'stage_resumed',
        status: 'ok',
        timestamp: now,
        detail: `DAG dirty-node rerun started for ${input.dirtyStageIds.length} stage(s).`,
        artifactPath: null,
        metadata: {
          dagRunId: input.dagRun.id,
          dirtyStageIds: input.dirtyStageIds,
          reason: input.reason,
        },
      },
      run.subprojectId,
    );
    await this.memoryService.saveRunSnapshot(run.id, run);
    return run;
  }

  private buildGraphFromWorkflow(definition: WorkflowDefinition): DAGGraph {
    return {
      id: `${definition.id}-dag`,
      name: `${definition.name} DAG`,
      description: 'Workflow-derived DAG graph for dirty-node rerun and impact analysis.',
      executionMode: 'lazy',
      metadata: {
        workflowId: definition.id,
        workflowVersion: definition.version,
      },
      nodes: definition.stages.map((stage) => ({
        id: stage.id,
        label: stage.label,
        description: stage.description,
        version: 'v1',
        state: 'clean',
        executionMode: stage.dependsOn.length === 0 ? 'auto' : 'lazy',
        dependencies: stage.dependsOn,
        outputs: stage.requiredOutputs.map((output) => output.path),
        stageId: stage.id,
        priority: stage.priority,
        constraints: stage.acceptanceCriteria,
        metadata: {
          ownerRole: stage.ownerRole,
          capability: stage.capability,
        },
      })),
      edges: definition.stages.flatMap((stage) =>
        stage.dependsOn.map((dependencyId) => ({
          id: `${dependencyId}->${stage.id}`,
          sourceId: dependencyId,
          targetId: stage.id,
          dependencyType: 'strong' as const,
          description: `Workflow dependency ${dependencyId} -> ${stage.id}`,
        })),
      ),
    };
  }
}
