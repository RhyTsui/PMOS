import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { WorkflowEngine } from '../../src/core/workflowEngine';
import { OrchestratorRuntime } from '../../src/core/orchestratorRuntime';
import { SchedulerRunService } from '../../src/core/schedulerRunService';
import { ReviewCommittee } from '../../src/core/reviewCommittee';
import { HermesPolicyService } from '../../src/core/hermesPolicyService';
import type { ProviderExecutionBundle } from '../../src/core/modelProvider';

function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-scheduler-'));
  return {
    root,
    store: new FileStore(root),
  };
}

async function seedFixture(store: FileStore) {
  await store.write('docs/memory/project-memory.md', '# Project Memory\n');
  await store.write('skills/registry.json', JSON.stringify({ version: 'test', skills: [] }, null, 2));
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

async function advanceRunToReviewStage(orchestratorRuntime: OrchestratorRuntime, runId: string) {
  let run = await orchestratorRuntime.loadRun(runId);
  let safetyCounter = 0;
  while (run.currentStageId !== 'frontend-backend-integration' && run.status === 'running' && safetyCounter < 32) {
    run = await orchestratorRuntime.advanceRun(runId);
    safetyCounter += 1;
  }
  return run;
}

async function advanceRunToFrontendPage(orchestratorRuntime: OrchestratorRuntime, runId: string) {
  let run = await orchestratorRuntime.loadRun(runId);
  let safetyCounter = 0;
  while (run.currentStageId !== 'frontend-page' && run.status === 'running' && safetyCounter < 32) {
    run = await orchestratorRuntime.advanceRun(runId);
    safetyCounter += 1;
  }
  return run;
}

describe('SchedulerRunService', () => {
  it('marks a scheduled run as paused until cooldown and then advances it when ticked', async () => {
    const { store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const schedulerRunService = new SchedulerRunService(
      orchestratorRuntime,
      memoryService,
      workflowEngine,
      new ReviewCommittee(),
      new HermesPolicyService(store, memoryService),
    );
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Scheduler Fixture',
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

    const scheduled = await schedulerRunService.scheduleRun(run.id, {
      action: 'advance',
      cooldownUntil: '2999-01-01T00:00:00.000Z',
      reason: 'Wait until the next scheduler window.',
    });
    expect(scheduled.status).toBe('paused');
    expect(scheduled.schedulerMode).toBe('scheduled');
    expect(scheduled.plannedAction).toBe('advance');
    expect(scheduled.dueNow).toBe(false);
    expect(scheduled.nextRunAt).toBe('2999-01-01T00:00:00.000Z');
    expect(scheduled.blockedReason).toContain('next scheduler window');
    expect(scheduled.operatorActionHint).toContain('next cooldown window');

    await schedulerRunService.scheduleRun(run.id, {
      action: 'advance',
      cooldownUntil: '2000-01-01T00:00:00.000Z',
      reason: 'Run now.',
    });
    const advanced = await schedulerRunService.tickRun(run.id);
    expect(advanced.status === 'running' || advanced.status === 'blocked' || advanced.status === 'completed').toBe(true);
    expect(advanced.currentStageId).not.toBe(run.currentStageId);
    const latestRun = await orchestratorRuntime.loadRun(run.id);
    expect(latestRun.metadata.schedulerAction ?? null).toBeNull();
    expect(latestRun.metadata.cooldownUntil ?? null).toBeNull();
  });

  it('auto-resumes a rework run after cooldown when the scheduler plan allows it', async () => {
    const { store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const schedulerRunService = new SchedulerRunService(
      orchestratorRuntime,
      memoryService,
      workflowEngine,
      new ReviewCommittee(),
      new HermesPolicyService(store, memoryService),
    );
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Scheduler Rework Fixture',
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
      summary: 'Need rework before continuing.',
    });
    expect(reworked.status).toBe('needs-rework');

    const paused = await schedulerRunService.scheduleRun(run.id, {
      action: 'resume-rework-stage',
      cooldownUntil: '2000-01-01T00:00:00.000Z',
      reason: 'Auto resume after backfill.',
    });
    expect(paused.status).toBe('blocked');
    expect(paused.schedulerMode).toBe('scheduled');
    expect(paused.plannedAction).toBe('resume-rework-stage');
    expect(paused.dueNow).toBe(true);
    expect(paused.schedulerReason).toContain('Auto resume');
    expect(paused.operatorActionHint).toContain('triggered immediately');

    const resumed = await schedulerRunService.tickRun(run.id);
    expect(['running', 'blocked', 'completed', 'needs-rework']).toContain(resumed.status);
    const latestRun = await orchestratorRuntime.loadRun(run.id);
    expect(latestRun.metadata.schedulerAction ?? null).toBeNull();
  });

  it('auto-infers resume-rework for review-blocked runs even without an explicit scheduler plan', async () => {
    const { store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const schedulerRunService = new SchedulerRunService(
      orchestratorRuntime,
      memoryService,
      workflowEngine,
      new ReviewCommittee(),
      new HermesPolicyService(store, memoryService),
    );
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Scheduler Auto Infer Fixture',
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

    const atReview = await advanceRunToReviewStage(orchestratorRuntime, run.id);
    expect(atReview.currentStageId).toBe('frontend-backend-integration');

    const reviewBlocked = await orchestratorRuntime.advanceRun(run.id, {
      reviewReport: {
        overallConclusion: 'Review blocked until upstream stage is reworked.',
        nextStage: false,
        reworkRequired: true,
        gate: {
          decision: 'conditional',
          blocked: true,
          issueCount: 1,
          blockingStageId: 'backend-api',
        },
        roles: [],
        hermes: {
          overallDecision: 'block',
          summary: 'Hermes blocks continuation until backend-api is reworked.',
          actions: [
            {
              action: 'block',
              target: 'backend-api',
              reason: 'Upstream API package is still insufficient.',
            },
          ],
          knowledgeGrounding: {
            configured: true,
            query: 'backend api review',
            resultCount: 1,
            summary: 'Hermes found one grounded system-state retrieval hit.',
          },
          writebackClosure: {
            totalTargets: 1,
            completedTargets: 0,
            openTargets: 1,
            activeTaskCount: 1,
            summary: '1 Hermes writeback target still needs closure.',
          },
          watchClosure: {
            activeFindings: 1,
            resolvedFindings: 0,
            recurringFindings: 0,
            suppressedFindings: 0,
            openTaskCount: 1,
            closureEvidenceCount: 0,
            summary: '1 Hermes watch task remains open.',
          },
        },
        summary: 'Review blocked: return to backend api.',
        recommendedReworkStageId: 'backend-api',
      },
    });
    expect(reviewBlocked.status).toBe('needs-rework');

    const derived = await schedulerRunService.getRun(run.id);
    expect(derived.schedulerMode).toBe('auto-rework');
    expect(derived.plannedAction).toBe('resume-rework-stage');
    expect(derived.dueNow).toBe(true);
    expect(derived.schedulerReason).toContain('Auto-inferred');
    expect(derived.autoRecoveryEligible).toBe(true);
    expect(derived.operatorActionHint).toContain('auto-resume');

    const touched = await schedulerRunService.tickDueRuns();
    expect(touched.some((item) => item.workflowRunId === run.id)).toBe(true);

    const latestRun = await orchestratorRuntime.loadRun(run.id);
    expect(latestRun.currentStageId).toBe('backend-api');
    expect(latestRun.metadata.schedulerAction ?? null).toBeNull();
  });

  it('auto-infers retry for transient blocked stages without an explicit scheduler plan', async () => {
    const { store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const schedulerRunService = new SchedulerRunService(
      orchestratorRuntime,
      memoryService,
      workflowEngine,
      new ReviewCommittee(),
      new HermesPolicyService(store, memoryService),
    );
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Scheduler Auto Retry Fixture',
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

    const atFrontendPage = await advanceRunToFrontendPage(orchestratorRuntime, run.id);
    expect(atFrontendPage.currentStageId).toBe('frontend-page');

    const errorBundle: ProviderExecutionBundle = {
      result: {
        providerName: 'mock',
        providerType: 'mock',
        capability: 'text-multimodal',
        model: 'mock-model',
        status: 'error',
        operationId: 'op-1',
        outputText: null,
        assets: [],
        warning: null,
        error: 'temporary network timeout',
      },
      events: [
        { kind: 'provider_invoked', status: 'ok', detail: 'mock invoked' },
        { kind: 'provider_failed', status: 'error', detail: 'temporary network timeout' },
      ],
    };
    const stageRunners = (orchestratorRuntime as unknown as { stageRunners: { executionCache: Map<string, ProviderExecutionBundle> } }).stageRunners;
    stageRunners.executionCache.set(`${run.id}:frontend-page`, errorBundle);

    const blocked = await orchestratorRuntime.advanceRun(run.id);
    expect(blocked.status).toBe('blocked');
    expect(blocked.currentStageId).toBe('frontend-page');

    const derived = await schedulerRunService.getRun(run.id);
    expect(derived.schedulerMode).toBe('auto-retry');
    expect(derived.plannedAction).toBe('resume-current-stage');
    expect(derived.dueNow).toBe(true);
    expect(derived.schedulerReason).toContain('Auto-inferred retry');
    expect(derived.autoRecoveryEligible).toBe(true);
    expect(derived.operatorActionHint).toContain('auto-retry');

    stageRunners.executionCache.delete(`${run.id}:frontend-page`);
    const touched = await schedulerRunService.tickDueRuns();
    expect(touched.some((item) => item.workflowRunId === run.id)).toBe(true);

    const latestRun = await orchestratorRuntime.loadRun(run.id);
    expect(latestRun.status).not.toBe('blocked');
    expect(latestRun.metadata.schedulerAction ?? null).toBeNull();
  });

  it('falls back to manual-only when scheduler session budget is exhausted', async () => {
    const { store } = createFixture();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const schedulerRunService = new SchedulerRunService(
      orchestratorRuntime,
      memoryService,
      workflowEngine,
      new ReviewCommittee(),
      new HermesPolicyService(store, memoryService),
    );
    const definition = await workflowEngine.loadDefinition();

    const run = await orchestratorRuntime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Scheduler Budget Fixture',
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

    const latest = await orchestratorRuntime.loadRun(run.id);
    await memoryService.saveRunSnapshot(run.id, {
      ...latest,
      metadata: {
        ...latest.metadata,
        schedulerSessionBudget: 1,
        schedulerConsumedBudget: 1,
      },
    });

    const derived = await schedulerRunService.getRun(run.id);
    expect(derived.budgetExhausted).toBe(true);
    expect(derived.remainingBudget).toBe(0);
    expect(derived.recoveryPolicy).toBe('manual-only');
    expect(derived.operatorActionHint).toContain('budget is exhausted');

    const ticked = await schedulerRunService.tickRun(run.id);
    expect(ticked.budgetExhausted).toBe(true);
    expect(ticked.recoveryPolicy).toBe('manual-only');
  });
});
