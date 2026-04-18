import type {
  ExecutionObservability,
  ObservabilityTimelineEntry,
  WorkflowRun,
} from '../shared/schemas.js';
import { MemoryService } from './memoryService.js';

export class ObservabilityService {
  constructor(private readonly memoryService: MemoryService) {}

  async loadExecutionObservability(runId: string, subprojectId?: string | null): Promise<ExecutionObservability> {
    const executionRun = await this.memoryService.loadExecutionRun(runId, subprojectId);
    const executionEvents = await this.loadExecutionEvents(runId, executionRun.subprojectId);
    const workflowRunIds = [...new Set([executionRun.workflowRunId, ...executionRun.linkedWorkflowRunIds].filter(Boolean))];

    const linkedWorkflowRuns = (
      await Promise.all(workflowRunIds.map((workflowRunId) => this.tryLoadWorkflowRun(workflowRunId as string, executionRun.subprojectId)))
    ).filter((run): run is WorkflowRun => run !== null);

    const workflowEventGroups = await Promise.all(
      linkedWorkflowRuns.map(async (workflowRun) => ({
        workflowRun,
        events: await this.loadWorkflowEvents(workflowRun.id, executionRun.subprojectId),
      })),
    );

    const timeline: ObservabilityTimelineEntry[] = [
      ...executionEvents.map((event) => ({
        id: event.id,
        sourceKind: 'execution' as const,
        runId: event.runId,
        workflowRunId: event.workflowRunId,
        stageId: null,
        kind: event.kind,
        status: event.status,
        timestamp: event.timestamp,
        detail: event.detail,
        artifactPath: event.artifactPath,
        metadata: event.metadata,
      })),
      ...workflowEventGroups.flatMap(({ workflowRun, events }) =>
        events.map((event) => ({
          id: event.id,
          sourceKind: 'workflow' as const,
          runId: executionRun.id,
          workflowRunId: workflowRun.id,
          stageId: event.stageId,
          kind: event.kind,
          status: event.status,
          timestamp: event.timestamp,
          detail: event.detail,
          artifactPath: event.artifactPath,
          metadata: event.metadata,
        })),
      ),
    ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const artifactPaths = [
      ...new Set(
        [
          ...executionEvents.map((event) => event.artifactPath),
          ...workflowEventGroups.flatMap(({ events }) => events.map((event) => event.artifactPath)),
          ...linkedWorkflowRuns.flatMap((workflowRun) => workflowRun.stages.flatMap((stage) => stage.outputPaths)),
          ...linkedWorkflowRuns.flatMap((workflowRun) => workflowRun.tasks.flatMap((task) => task.artifactPaths)),
        ].filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    ];

    return {
      executionRun,
      linkedWorkflowRuns,
      timeline,
      artifactPaths,
      summary: {
        executionEventCount: executionEvents.length,
        workflowEventCount: workflowEventGroups.reduce((total, group) => total + group.events.length, 0),
        linkedWorkflowRunCount: linkedWorkflowRuns.length,
        artifactPathCount: artifactPaths.length,
      },
    };
  }

  private async tryLoadWorkflowRun(runId: string, subprojectId?: string | null) {
    try {
      return await this.memoryService.loadRunSnapshot(runId, subprojectId);
    } catch {
      return null;
    }
  }

  private async loadExecutionEvents(runId: string, subprojectId?: string | null) {
    try {
      return await this.memoryService.loadExecutionEvents(runId, subprojectId);
    } catch {
      return this.memoryService.loadExecutionEvents(runId);
    }
  }

  private async loadWorkflowEvents(runId: string, subprojectId?: string | null) {
    try {
      const events = await this.memoryService.loadEvents(runId, subprojectId);
      if (events.length > 0) {
        return events;
      }
    } catch {
      // Fall through to automatic path resolution.
    }

    return this.memoryService.loadEvents(runId);
  }
}
