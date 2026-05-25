import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { WorkflowEngine } from '../../src/core/workflowEngine';
import { OrchestratorRuntime } from '../../src/core/orchestratorRuntime';
import { McpContextSyncService } from '../../src/core/mcpContextSyncService';
import { TaskSsotService } from '../../src/core/taskSsotService';

function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-task-ssot-'));
  return {
    root,
    store: new FileStore(root),
  };
}

async function seedFixture(store: FileStore) {
  const repoStore = new FileStore(path.resolve(process.cwd()));
  await store.write('docs/memory/project-memory.md', '# Project Memory\n');
  await store.write('skills/registry.json', await repoStore.read('skills/registry.json'));
  await store.write(
    'config/providers.json',
    JSON.stringify(
      {
        defaultProvider: 'mock',
        providers: [
          {
            name: 'mock',
            type: 'mock',
            envKey: 'MOCK_KEY',
            capabilities: ['text', 'code', 'review', 'text-multimodal'],
          },
        ],
      },
      null,
      2,
    ),
  );
}

describe('TaskSsotService', () => {
  it('reflects workflow manual-gate rework and resume into task ssot state', async () => {
    const { root, store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const mcpContextSync = new McpContextSyncService(root);
    const taskSsotService = new TaskSsotService(store, mcpContextSync, memoryService);
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Task SSOT Fixture',
        projectDescription: null,
        projectRoot: '',
        projectMemoryPath: 'docs/memory/project-memory.md',
        selectedProvider: null,
        providerConfigPath: null,
        mcpConfigPath: null,
      },
      providerCount: 1,
      mcpServerCount: 1,
    });

    const reworked = await orchestratorRuntime.applyManualGateDecision(run.id, {
      decision: 'rework',
      summary: 'Need more upstream truth before continuing.',
    });

    const blockedState = await taskSsotService.getState();
    const blockedTask = blockedState.tasks.find((task) => task.taskId === `${run.id}-${reworked.currentStageId}`);
    expect(blockedTask).toBeTruthy();
    expect(blockedTask?.status).toBe('blocked');
    expect(blockedTask?.continuation.nextSafeStep).toContain('Need more upstream truth');
    expect(blockedTask?.continuation.resumeAnchor).toContain('#stage:');
    expect(blockedState.continuation.activeMainlineAttention?.taskId).toBe(blockedTask?.taskId);
    expect(blockedTask?.continuation.currentAttention?.operatorEntries.length ?? 0).toBeGreaterThan(0);
    expect(blockedTask?.continuation.currentAttention?.operatorEntries[0]?.targetTaskId).toBe(blockedTask?.taskId);

    const resumed = await orchestratorRuntime.resumeRun(run.id, {
      reason: 'Manual operator resume after backfill.',
    });
    const resumedState = await taskSsotService.getState();
    const resumedTask = resumedState.tasks.find((task) => task.taskId === `${run.id}-${resumed.currentStageId}`);
    expect(resumedTask?.status).toBe('active');
    expect(resumedTask?.currentOwnerAgentId).toContain('workflow-role:');
    expect(resumedTask?.gateChecks.some((gate) => gate.gateId === 'asset-backwrite-gate')).toBe(true);
  });

  it('loads scoped workflow runs into subproject task ssot state', async () => {
    const { root, store } = createFixture();
    await seedFixture(store);
    await store.write('subprojects/shop/docs/memory/project-memory.md', '# Shop Memory\n');

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const mcpContextSync = new McpContextSyncService(root);
    const taskSsotService = new TaskSsotService(store, mcpContextSync, memoryService);
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: 'shop',
        projectName: 'Shop Fixture',
        projectDescription: null,
        projectRoot: 'subprojects/shop',
        projectMemoryPath: 'subprojects/shop/docs/memory/project-memory.md',
        selectedProvider: null,
        providerConfigPath: null,
        mcpConfigPath: null,
      },
      providerCount: 1,
      mcpServerCount: 1,
    });

    const state = await taskSsotService.getState('shop');
    const activeTask = state.tasks.find((task) => task.taskId === `${run.id}-${run.currentStageId}`);
    expect(activeTask?.subprojectId).toBe('shop');
    expect(activeTask?.sourceType).toBe('workflow-run-task');
    expect(state.continuation.activeMainlineTaskId).toBe(activeTask?.taskId);
  });

  it('captures design language, design confirmation, and ai writeback gates into task ssot history', async () => {
    const { root, store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const mcpContextSync = new McpContextSyncService(root);
    const taskSsotService = new TaskSsotService(store, mcpContextSync, memoryService);
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Design Gate Fixture',
        projectDescription: null,
        projectRoot: '',
        projectMemoryPath: 'docs/memory/project-memory.md',
        selectedProvider: null,
        providerConfigPath: null,
        mcpConfigPath: null,
      },
      providerCount: 1,
      mcpServerCount: 1,
    });

    const snapshot = await memoryService.loadRunSnapshot(run.id);
    const activeTaskId = `${run.id}-${run.currentStageId}`;
    snapshot.tasks = snapshot.tasks.map((task) =>
      task.id === activeTaskId
        ? {
            ...task,
            artifactPaths: [
              'subprojects/demo/DESIGN.md',
              'docs/operations/design-confirmation-record-demo.md',
              'docs/operations/ai-writeback-confirmation-demo.md',
            ],
            summary: 'design confirmation and ai writeback ready',
          }
        : task,
    );
    await memoryService.saveRunSnapshot(run.id, snapshot);
    await memoryService.appendEvent(
      run.id,
      {
        id: `${run.id}-design-language-artifact`,
        runId: run.id,
        stageId: run.currentStageId ?? 'unknown',
        kind: 'artifact_written',
        status: 'ok',
        timestamp: new Date().toISOString(),
        detail: 'DESIGN.md written for current design line.',
        artifactPath: 'subprojects/demo/DESIGN.md',
        metadata: {},
      },
      null,
    );
    await memoryService.appendEvent(
      run.id,
      {
        id: `${run.id}-design-confirmation-artifact`,
        runId: run.id,
        stageId: run.currentStageId ?? 'unknown',
        kind: 'artifact_written',
        status: 'ok',
        timestamp: new Date().toISOString(),
        detail: 'design confirmation recorded.',
        artifactPath: 'docs/operations/design-confirmation-record-demo.md',
        metadata: {},
      },
      null,
    );
    await memoryService.appendEvent(
      run.id,
      {
        id: `${run.id}-ai-writeback-artifact`,
        runId: run.id,
        stageId: run.currentStageId ?? 'unknown',
        kind: 'artifact_written',
        status: 'ok',
        timestamp: new Date().toISOString(),
        detail: 'ai writeback confirmation recorded.',
        artifactPath: 'docs/operations/ai-writeback-confirmation-demo.md',
        metadata: {},
      },
      null,
    );

    const state = await taskSsotService.getState();
    const task = state.tasks.find((item) => item.taskId === activeTaskId);
    expect(task?.gateChecks.some((gate) => gate.gateId === 'design-language-ready' && gate.status === 'pass')).toBe(true);
    expect(task?.gateChecks.some((gate) => gate.gateId === 'design-confirmed-gate' && gate.status === 'pass')).toBe(true);
    expect(task?.gateChecks.some((gate) => gate.gateId === 'ai-writeback-confirmation' && gate.status === 'pass')).toBe(true);
    expect(task?.gateHistory.some((event) => event.gateId === 'design-language-ready')).toBe(true);
    expect(task?.gateHistory.some((event) => event.gateId === 'design-confirmed-gate')).toBe(true);
    expect(task?.gateHistory.some((event) => event.gateId === 'ai-writeback-confirmation')).toBe(true);
  });

  it('hydrates specialist reviewer assignments from workflow review activation metadata', async () => {
    const { root, store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const mcpContextSync = new McpContextSyncService(root);
    const taskSsotService = new TaskSsotService(store, mcpContextSync, memoryService);
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Reviewer Assignment Fixture',
        projectDescription: null,
        projectRoot: '',
        projectMemoryPath: 'docs/memory/project-memory.md',
        selectedProvider: null,
        providerConfigPath: null,
        mcpConfigPath: null,
      },
      providerCount: 1,
      mcpServerCount: 1,
    });
    await orchestratorRuntime.advanceRun(run.id);
    const reviewStageRun = await orchestratorRuntime.advanceRun(run.id);
    expect(reviewStageRun.currentStageId).toBe('requirements-document');

    const now = new Date().toISOString();
    await memoryService.appendEvent(
      reviewStageRun.id,
      {
        id: `${reviewStageRun.id}-specialist-review`,
        runId: reviewStageRun.id,
        stageId: reviewStageRun.currentStageId ?? 'unknown',
        kind: 'review_recorded',
        status: 'ok',
        timestamp: now,
        detail: 'specialist review activation recorded',
        artifactPath: 'docs/review/demo-review.json',
        metadata: {
          activatedSpecialistRoles: ['Research Review', 'Solution-Optimality Review'],
        },
      },
      null,
    );

    const state = await taskSsotService.getState();
    const task = state.tasks.find((item) => item.taskId === `${reviewStageRun.id}-${reviewStageRun.currentStageId}`);
    expect(task?.agentAssignments.some((assignment) => assignment.agentId === 'specialist-role:Research Review')).toBe(true);
    expect(task?.agentAssignments.some((assignment) => assignment.agentId === 'specialist-role:Solution-Optimality Review')).toBe(true);
    expect(task?.agentAssignments.filter((assignment) => assignment.assignmentType === 'reviewer').length).toBeGreaterThanOrEqual(2);
    expect(task?.gateChecks.some((gate) => gate.gateId === 'specialist-activation-gate' && gate.status === 'pass')).toBe(true);
  });

  it('blocks review-required workflow tasks when specialist activation is still implicit', async () => {
    const { root, store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const mcpContextSync = new McpContextSyncService(root);
    const taskSsotService = new TaskSsotService(store, mcpContextSync, memoryService);
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Implicit Specialist Fixture',
        projectDescription: null,
        projectRoot: '',
        projectMemoryPath: 'docs/memory/project-memory.md',
        selectedProvider: null,
        providerConfigPath: null,
        mcpConfigPath: null,
      },
      providerCount: 1,
      mcpServerCount: 1,
    });
    await orchestratorRuntime.advanceRun(run.id);
    const reviewStageRun = await orchestratorRuntime.advanceRun(run.id);
    expect(reviewStageRun.currentStageId).toBe('requirements-document');

    const state = await taskSsotService.getState();
    const task = state.tasks.find((item) => item.taskId === `${reviewStageRun.id}-${reviewStageRun.currentStageId}`);
    expect(task?.agentAssignments.some((assignment) => assignment.agentId === 'specialist-role:Solution-Optimality Review')).toBe(true);
    expect(task?.agentAssignments.some((assignment) => assignment.agentId === 'specialist-role:Technical Review')).toBe(true);
    expect(task?.agentAssignments.some((assignment) => assignment.agentId === 'specialist-role:Research Review')).toBe(true);
    expect(task?.gateChecks.some((gate) => gate.gateId === 'specialist-activation-gate' && gate.status === 'block')).toBe(true);
    expect(task?.collaborationLevel).toBe('L2');
  });

  it('promotes workflow collaboration level and blocks completed tasks without final-delivery backwrite', async () => {
    const { root, store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const mcpContextSync = new McpContextSyncService(root);
    const taskSsotService = new TaskSsotService(store, mcpContextSync, memoryService);
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Backwrite Fixture',
        projectDescription: null,
        projectRoot: '',
        projectMemoryPath: 'docs/memory/project-memory.md',
        selectedProvider: null,
        providerConfigPath: null,
        mcpConfigPath: null,
      },
      providerCount: 1,
      mcpServerCount: 1,
    });
    await orchestratorRuntime.advanceRun(run.id);
    const reviewStageRun = await orchestratorRuntime.advanceRun(run.id);

    const snapshot = await memoryService.loadRunSnapshot(reviewStageRun.id);
    snapshot.status = 'completed';
    snapshot.currentStageId = null;
    snapshot.tasks = snapshot.tasks.map((task) =>
      task.id === `${reviewStageRun.id}-requirements-document`
        ? {
            ...task,
            status: 'completed',
            summary: 'completed without final delivery artifact',
            artifactPaths: ['docs/review/requirements-review.json'],
            metadata: {
              ...task.metadata,
              reviewRequired: true,
            },
          }
        : task,
    );
    await memoryService.saveRunSnapshot(reviewStageRun.id, snapshot);
    await memoryService.appendEvent(
      reviewStageRun.id,
      {
        id: `${reviewStageRun.id}-activated-specialists`,
        runId: reviewStageRun.id,
        stageId: 'requirements-document',
        kind: 'review_recorded',
        status: 'ok',
        timestamp: new Date().toISOString(),
        detail: 'review activated multiple specialists',
        artifactPath: 'docs/review/requirements-review.json',
        metadata: {
          activatedSpecialistRoles: ['Research Review', 'Solution-Optimality Review'],
        },
      },
      null,
    );

    const state = await taskSsotService.getState();
    const task = state.tasks.find((item) => item.taskId === `${reviewStageRun.id}-requirements-document`);
    expect(task?.collaborationLevel).toBe('L3');
    expect(task?.gateChecks.some((gate) => gate.gateId === 'asset-backwrite-gate' && gate.status === 'block')).toBe(true);
  });

  it('projects deep-decomposition artifacts into task ssot gates', async () => {
    const { root, store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const mcpContextSync = new McpContextSyncService(root);
    const taskSsotService = new TaskSsotService(store, mcpContextSync, memoryService);
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Deep Mapping Fixture',
        projectDescription: null,
        projectRoot: '',
        projectMemoryPath: 'docs/memory/project-memory.md',
        selectedProvider: null,
        providerConfigPath: null,
        mcpConfigPath: null,
      },
      providerCount: 1,
      mcpServerCount: 1,
    });

    const snapshot = await memoryService.loadRunSnapshot(run.id);
    snapshot.tasks = snapshot.tasks.map((task) =>
      task.stageId === 'backend-api'
        ? {
            ...task,
            status: 'active',
            artifactPaths: ['docs/implementation/api-to-task-demo.json'],
            summary: 'backend-api api-to-task mapping ready',
          }
        : task,
    );
    await memoryService.saveRunSnapshot(run.id, snapshot);

    const state = await taskSsotService.getState();
    const backendTask = state.tasks.find((item) => item.taskId === `${run.id}-backend-api`);
    expect(backendTask?.gateChecks.some((gate) => gate.gateId === 'api-to-task-gate' && gate.status === 'pass')).toBe(true);
  });

  it('skips legacy workflow snapshots that do not contain task arrays', async () => {
    const { root, store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const mcpContextSync = new McpContextSyncService(root);
    const taskSsotService = new TaskSsotService(store, mcpContextSync, memoryService);
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Legacy Task Snapshot Fixture',
        projectDescription: null,
        projectRoot: '',
        projectMemoryPath: 'docs/memory/project-memory.md',
        selectedProvider: null,
        providerConfigPath: null,
        mcpConfigPath: null,
      },
      providerCount: 1,
      mcpServerCount: 1,
    });

    const legacyRun = { ...run } as unknown as Record<string, unknown>;
    delete legacyRun.tasks;
    await store.writeJson(run.memory.runStatePath, legacyRun);

    const state = await taskSsotService.getState();
    expect(state.tasks.some((task) => task.sourceRef === run.id)).toBe(false);
  });
});
