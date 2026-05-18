import { describe, expect, it } from 'vitest';
import { ContextInjectionService } from '../../src/core/contextInjectionService';
import { PipelineLauncherService } from '../../src/core/pipelineLauncherService';
import type { TaskSsotTask, WorkflowRun } from '../../src/shared/schemas';

function createTask(overrides: Partial<TaskSsotTask> = {}): TaskSsotTask {
  return {
    taskId: 'task-1',
    sourceType: 'workflow-run-task',
    sourceRef: 'run-1',
    originalDemandRefs: ['req-1'],
    subprojectId: 'demo',
    title: 'Demo task',
    summary: 'demo summary',
    collaborationLevel: 'L2',
    status: 'active',
    currentStage: 'functional-specification',
    currentOwnerAgentId: 'workflow-role:Solution PM',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stages: [],
    gateChecks: [
      {
        taskId: 'task-1',
        gateId: 'project-truth-gate',
        status: 'pass',
        reason: 'truth attached',
        evidencePaths: ['req-1'],
        checkedAt: new Date().toISOString(),
      },
      {
        taskId: 'task-1',
        gateId: 'review-convergence-gate',
        status: 'pass',
        reason: 'review attached',
        evidencePaths: ['docs/review/review-1.json'],
        checkedAt: new Date().toISOString(),
      },
    ],
    gateHistory: [],
    artifactLinks: [
      {
        taskId: 'task-1',
        artifactType: 'doc',
        artifactId: 'truth-1',
        artifactPath: 'docs/requirements/demo.md',
        roleInTask: 'upstream-truth',
      },
      {
        taskId: 'task-1',
        artifactType: 'doc',
        artifactId: 'review-1',
        artifactPath: 'docs/review/review-1.json',
        roleInTask: 'review-evidence',
      },
    ],
    agentAssignments: [],
    syncEnvelopes: [
      {
        syncId: 'sync-1',
        taskId: 'task-1',
        entityType: 'review',
        entityId: 'review-1',
        targetSystem: 'github',
        targetCategory: 'repo',
        topicKey: 'review:publish',
        action: 'publish',
        payloadRef: 'docs/review/review-1.json',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: new Date().toISOString(),
        completedAt: null,
        receiptRef: null,
        error: null,
      },
    ],
    continuation: {
      mainlineLabel: 'Demo Mainline',
      nextSafeStep: 'continue',
      parkedLines: [],
      blockerType: null,
      resumeAnchor: 'docs/memory/run.json#stage:functional-specification',
      lastMeaningfulAdvanceAt: new Date().toISOString(),
      currentAttention: null,
    },
    ...overrides,
  };
}

function createRun(): WorkflowRun {
  return {
    id: 'run-1',
    projectName: 'Demo Project',
    projectRoot: 'subprojects/demo',
    subprojectId: 'demo',
    selectedProvider: null,
    providerConfigPath: null,
    mcpConfigPath: null,
    name: 'Demo Project',
    status: 'running',
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    providerCount: 1,
    mcpServerCount: 0,
    currentStageId: 'functional-specification',
    executionSummary: null,
    reworkCount: 0,
    memory: {
      projectMemoryPath: 'docs/memory/project-memory.md',
      runStatePath: 'docs/memory/run.json',
      eventLogPath: 'docs/memory/events.json',
      projectRoot: 'subprojects/demo',
      loadedAt: new Date().toISOString(),
    },
    stages: [],
    tasks: [],
    lastReview: null,
    activeCapability: null,
    rework: null,
    metadata: {},
  };
}

describe('runtime capability closure services', () => {
  it('builds a context injection bundle from task ssot state', () => {
    const service = new ContextInjectionService();
    const bundle = service.buildBundle(createTask(), createRun());
    expect(bundle.projectLabel).toBe('Demo Project');
    expect(bundle.truthRefs).toContain('req-1');
    expect(bundle.reviewEvidenceRefs).toContain('docs/review/review-1.json');
    expect(bundle.syncTargets).toContain('github:publish');
  });

  it('returns ready pipeline launcher plans when required upstream signals exist', () => {
    const service = new PipelineLauncherService();
    const plans = service.buildPlans(createTask(), createRun());
    expect(plans[0]?.id).toBe('functional-to-design');
    expect(plans[0]?.status).toBe('ready');
    expect(plans[0]?.targetStages).toContain('design-document');
  });
});
