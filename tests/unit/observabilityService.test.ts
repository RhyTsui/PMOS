import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { ObservabilityService } from '../../src/core/observabilityService';
import { getExecutionRunStatePath, getRunStatePath } from '../../src/core/projectPaths';
import type { ExecutionRun, WorkflowRun } from '../../src/shared/schemas';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-observability-'));
  return new FileStore(root);
}

function createExecutionRun(): ExecutionRun {
  const now = '2026-04-16T10:00:00.000Z';
  return {
    id: 'exec-1',
    sessionId: 'session-1',
    subprojectId: null,
    runType: 'assistant_turn',
    parentRunId: null,
    inputMessageId: 'msg-1',
    outputMessageIds: ['msg-2'],
    contextSnapshotId: 'snapshot-1',
    workflowRunId: 'wf-1',
    linkedWorkflowRunIds: ['wf-1'],
    source: 'workspace',
    status: 'completed',
    createdAt: now,
    updatedAt: now,
  };
}

function createWorkflowRun(): WorkflowRun {
  const now = '2026-04-16T10:00:01.000Z';
  return {
    id: 'wf-1',
    subprojectId: null,
    projectName: 'PMAIOS',
    projectRoot: 'E:/AI/ai-os',
    selectedProvider: null,
    providerConfigPath: null,
    mcpConfigPath: null,
    name: 'Main Workflow',
    status: 'completed',
    currentStageId: null,
    stages: [
      {
        id: 'stage-1',
        label: 'Plan',
        ownerRole: 'system',
        description: 'Planning stage',
        acceptanceCriteria: ['artifact exists'],
        requiredOutputs: [],
        priority: 'P1',
        capability: 'system',
        dependsOn: [],
        gate: { reviewRequired: false, allowRework: false },
        status: 'completed',
        outputPaths: ['artifacts/plan.json'],
        startedAt: now,
        completedAt: now,
        blockedReason: null,
        attemptCount: 1,
        summary: 'completed',
        metadata: {},
      },
    ],
    tasks: [
      {
        id: 'task-1',
        runId: 'wf-1',
        stageId: 'stage-1',
        title: 'Write artifact',
        description: 'Produce output',
        ownerRole: 'system',
        priority: 'P1',
        dependsOn: [],
        status: 'completed',
        acceptanceCriteria: ['artifact exists'],
        artifactPaths: ['artifacts/plan.json', 'artifacts/review.json'],
        blockedReason: null,
        summary: 'done',
        metadata: {},
      },
    ],
    generatedAt: now,
    updatedAt: now,
    memory: {
      projectMemoryPath: 'docs/memory/project-memory.md',
      runStatePath: getRunStatePath('wf-1'),
      eventLogPath: 'memory/runs/wf-1.events.jsonl',
      projectRoot: 'E:/AI/ai-os',
      loadedAt: now,
    },
    providerCount: 1,
    mcpServerCount: 0,
    reworkCount: 0,
    executionSummary: 'done',
    lastReview: null,
    activeCapability: 'system',
    rework: null,
    metadata: {},
  };
}

describe('ObservabilityService', () => {
  it('aggregates execution events, workflow events, and artifact paths', async () => {
    const store = createStore();
    const memoryService = new MemoryService(store);
    const service = new ObservabilityService(memoryService);
    const executionRun = createExecutionRun();
    const workflowRun = createWorkflowRun();

    await store.writeJson(getExecutionRunStatePath(executionRun.id), executionRun);
    await memoryService.saveRunSnapshot(workflowRun.id, workflowRun);

    await memoryService.appendExecutionEvent(executionRun.id, {
      id: 'evt-1',
      runId: executionRun.id,
      sessionId: executionRun.sessionId,
      subprojectId: null,
      kind: 'run_created',
      status: 'ok',
      timestamp: '2026-04-16T10:00:00.000Z',
      detail: 'execution created',
      messageId: executionRun.inputMessageId,
      artifactPath: null,
      workflowRunId: 'wf-1',
      metadata: {},
    });
    await memoryService.appendExecutionEvent(executionRun.id, {
      id: 'evt-2',
      runId: executionRun.id,
      sessionId: executionRun.sessionId,
      subprojectId: null,
      kind: 'provider_succeeded',
      status: 'ok',
      timestamp: '2026-04-16T10:00:03.000Z',
      detail: 'execution wrote artifact',
      messageId: 'msg-2',
      artifactPath: 'artifacts/review.json',
      workflowRunId: 'wf-1',
      metadata: {},
    });

    await memoryService.appendEvent(workflowRun.id, {
      id: 'wf-evt-1',
      runId: workflowRun.id,
      stageId: 'stage-1',
      kind: 'stage_started',
      status: 'ok',
      timestamp: '2026-04-16T10:00:01.000Z',
      detail: 'workflow started',
      artifactPath: null,
      metadata: {},
    });
    await memoryService.appendEvent(workflowRun.id, {
      id: 'wf-evt-2',
      runId: workflowRun.id,
      stageId: 'stage-1',
      kind: 'artifact_written',
      status: 'ok',
      timestamp: '2026-04-16T10:00:02.000Z',
      detail: 'workflow wrote artifact',
      artifactPath: 'artifacts/plan.json',
      metadata: {},
    });

    const snapshot = await service.loadExecutionObservability(executionRun.id);

    expect(snapshot.executionRun.id).toBe(executionRun.id);
    expect(snapshot.summary.executionEventCount).toBe(2);
    expect(snapshot.summary.workflowEventCount).toBe(2);
    expect(snapshot.summary.linkedWorkflowRunCount).toBe(1);
    expect(snapshot.timeline.map((entry) => entry.id)).toEqual(['evt-1', 'wf-evt-1', 'wf-evt-2', 'evt-2']);
    expect(snapshot.artifactPaths).toEqual(['artifacts/review.json', 'artifacts/plan.json']);
  });
});
