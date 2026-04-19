import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { CapabilityRegistry } from '../../src/core/capabilityRegistry';
import { ProductAgentService } from '../../src/core/productAgentService';
import { MemoryService } from '../../src/core/memoryService';
import { WorkflowEngine } from '../../src/core/workflowEngine';
import { OrchestratorRuntime } from '../../src/core/orchestratorRuntime';
import { SubprojectRegistry } from '../../src/core/subprojectRegistry';
import { RequirementService } from '../../src/core/requirementService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-capability-'));
  return new FileStore(root);
}

async function createFixture() {
  const store = createStore();
  const repoStore = new FileStore(path.resolve(process.cwd()));
  await store.write('docs/memory/project-memory.md', '# Project Memory\n- capability registry fixture\n');
  await store.write(
    'config/providers.json',
    JSON.stringify(
      {
        defaultProvider: 'mock',
        providers: [{ name: 'mock', type: 'mock', envKey: 'MOCK_KEY', capabilities: ['text', 'code', 'review', 'text-multimodal'] }],
      },
      null,
      2,
    ),
  );
  await store.write(
    'mcp/mcp-servers.example.json',
    JSON.stringify(
      {
        servers: [{ name: 'filesystem', transport: 'stdio', command: 'node', args: ['server.js'], enabled: true, tools: ['read'] }],
      },
      null,
      2,
    ),
  );
  await store.write('skills/registry.json', await repoStore.read('skills/registry.json'));

  return {
    store,
    capabilityRegistry: new CapabilityRegistry(store),
    productAgentService: new ProductAgentService(store),
  };
}

async function createPassingReviewRun(store: FileStore) {
  const memoryService = new MemoryService(store);
  const workflowEngine = new WorkflowEngine(store, memoryService);
  const runtime = new OrchestratorRuntime(store, memoryService);
  const subprojectRegistry = new SubprojectRegistry(store);
  const definition = await workflowEngine.loadDefinition();
  const project = await subprojectRegistry.resolveProjectContext();
  const run = await runtime.initRun({
    definition,
    project,
    providerCount: 1,
    mcpServerCount: 1,
  });

  const artifactPaths = Array.from({ length: 5 }, (_, index) => `docs/review/review-evidence-${run.id}-${index + 1}.md`);
  await Promise.all(
    artifactPaths.map((artifactPath, index) =>
      store.write(
        artifactPath,
        index === 0
          ? '# Review Evidence\n\nOpen-source-first and build-vs-buy evaluation recorded.\n'
          : `# Review Evidence ${index + 1}\n\nSupporting release artifact.\n`,
      ),
    ),
  );
  run.stages[0] = {
    ...run.stages[0]!,
    status: 'completed',
    outputPaths: artifactPaths,
    completedAt: new Date().toISOString(),
  };
  await memoryService.saveRunSnapshot(run.id, run);
  return run;
}

describe('CapabilityRegistry', () => {
  it('blocks publish until tests, review, and dataset evaluation all pass', async () => {
    const { store, capabilityRegistry } = await createFixture();
    const capability = await capabilityRegistry.registerCapability({
      id: 'release-assistant',
      name: 'Release Assistant',
      description: 'Publish checklist capability.',
      implementationType: 'workflow',
      implementationRef: 'pmaios-main',
    });

    await expect(
      capabilityRegistry.publishCapabilityVersion(capability.id, {
        version: '0.1.0',
      }),
    ).rejects.toThrow(/failed publish gate/i);

    const dataset = await capabilityRegistry.createEvaluationDataset(capability.id, {
      version: '0.1.0',
      name: 'Release assistant dataset',
      description: 'checks workflow wrapper contract',
      cases: [
        {
          id: 'workflow-shape',
          input: { mode: 'init-only' },
          expected: { requiredKeys: ['type', 'run', 'payload'] },
          rubric: ['must expose workflow run wrapper'],
        },
      ],
    });
    const { capability: afterEval, run } = await capabilityRegistry.runEvaluationDataset(capability.id, {
      datasetId: dataset.id,
      version: '0.1.0',
      evaluator: 'unit-test',
    });

    const gate = afterEval.versions[0]?.gate;
    expect(run.passed).toBe(true);
    expect(gate?.evaluationPassed).toBe(true);
    expect(gate?.publishable).toBe(false);

    await expect(
      capabilityRegistry.publishCapabilityVersion(capability.id, {
        version: '0.1.0',
        testsPassed: true,
        reviewPassed: true,
      }),
    ).rejects.toThrow(/review not passed/i);

    const reviewRun = await createPassingReviewRun(store);
    const published = await capabilityRegistry.publishCapabilityVersion(capability.id, {
      version: '0.1.0',
      testsPassed: true,
      reviewPassed: true,
      runId: reviewRun.id,
      reviewSummary: 'review approved',
      releaseNotes: 'initial rollout',
    });

    expect(published.lifecycleStatus).toBe('published');
    expect(published.activeVersion).toBe('0.1.0');
    expect(published.versions[0]?.status).toBe('published');
    expect(published.versions[0]?.gate.publishable).toBe(true);
  });

  it('invokes a published product-agent capability and persists invocation history', async () => {
    const { store, capabilityRegistry, productAgentService } = await createFixture();
    const agent = await productAgentService.createAgent({
      name: 'Launch Agent',
      summary: 'Helps define launch guardrails.',
      problem: 'Need a reusable launch planning capability.',
      goals: ['Capture launch goals'],
      source: 'api',
    });

    const capability = await capabilityRegistry.registerCapability({
      id: 'launch-agent',
      name: 'Launch Agent Capability',
      description: 'Wraps a product agent as a published capability.',
      implementationType: 'product-agent',
      implementationRef: agent.id,
      testsPassed: true,
      reviewPassed: true,
    });

    await capabilityRegistry.recordEvaluation(capability.id, {
      version: '0.1.0',
      evaluator: 'unit-test',
      passed: true,
      score: 0.95,
      summary: 'agent output acceptable',
    });
    const reviewRun = await createPassingReviewRun(store);
    await capabilityRegistry.publishCapabilityVersion(capability.id, {
      version: '0.1.0',
      testsPassed: true,
      reviewPassed: true,
      runId: reviewRun.id,
    });

    const invocation = await capabilityRegistry.invokeCapability(capability.id, {
      payload: { brief: 'prepare launch plan' },
    });
    const history = await capabilityRegistry.listInvocations(capability.id);

    expect(invocation.status).toBe('completed');
    expect((invocation.output as { type: string }).type).toBe('product-agent');
    expect(history).toHaveLength(2);
    expect(history[0]?.status).toBe('accepted');
    expect(history[1]?.status).toBe('completed');
  });

  it('evaluates real execution output instead of only capability metadata', async () => {
    const { capabilityRegistry, productAgentService } = await createFixture();
    const agent = await productAgentService.createAgent({
      name: 'QA Agent',
      summary: 'Produces product-agent execution output.',
      problem: 'Need evaluation to inspect actual execution wrapper.',
      source: 'api',
    });

    const capability = await capabilityRegistry.registerCapability({
      id: 'qa-agent-cap',
      name: 'QA Agent Capability',
      description: 'Used to verify evaluation runner executes the capability.',
      implementationType: 'product-agent',
      implementationRef: agent.id,
    });

    const dataset = await capabilityRegistry.createEvaluationDataset(capability.id, {
      version: '0.1.0',
      name: 'QA dataset',
      description: 'inspects real output wrapper',
      cases: [
        {
          id: 'type-field',
          input: { brief: 'run actual agent wrapper' },
          expected: { fieldEquals: { type: 'product-agent' } },
          rubric: ['must execute capability and inspect returned wrapper'],
        },
        {
          id: 'required-keys',
          input: { brief: 'run actual agent wrapper' },
          expected: { requiredKeys: ['type', 'agent', 'payload'] },
          rubric: ['must expose runtime wrapper keys'],
        },
      ],
    });

    const result = await capabilityRegistry.runEvaluationDataset(capability.id, {
      datasetId: dataset.id,
      version: '0.1.0',
      evaluator: 'unit-test',
    });

    expect(result.run.passed).toBe(true);
    expect(result.run.caseResults[0]?.output).toMatchObject({ type: 'product-agent' });
    expect(result.run.caseResults[1]?.output).toMatchObject({
      type: 'product-agent',
      agent: expect.any(Object),
      payload: expect.any(Object),
    });
  });

  it('keeps manual evaluation compatibility when no dataset runner result exists', async () => {
    const { store, capabilityRegistry } = await createFixture();
    const capability = await capabilityRegistry.registerCapability({
      id: 'manual-eval-cap',
      name: 'Manual Eval Capability',
      description: 'Backwards-compatible manual eval path.',
      implementationType: 'workflow',
      implementationRef: 'pmaios-main',
      testsPassed: true,
      reviewPassed: true,
    });

    const { capability: updated } = await capabilityRegistry.recordEvaluation(capability.id, {
      version: '0.1.0',
      evaluator: 'legacy-client',
      passed: true,
      score: 0.9,
      summary: 'legacy path still works',
    });

    expect(updated.versions[0]?.gate.evaluationPassed).toBe(true);

    const reviewRun = await createPassingReviewRun(store);
    const published = await capabilityRegistry.publishCapabilityVersion(capability.id, {
      version: '0.1.0',
      testsPassed: true,
      reviewPassed: true,
      runId: reviewRun.id,
    });

    expect(published.activeVersion).toBe('0.1.0');
    expect(published.versions[0]?.status).toBe('published');
  });

  it('can publish and invoke a workflow capability', async () => {
    const { store, capabilityRegistry } = await createFixture();
    const capability = await capabilityRegistry.registerCapability({
      id: 'platform-workflow',
      name: 'Platform Workflow',
      description: 'Initializes the platform workflow runtime.',
      implementationType: 'workflow',
      implementationRef: 'pmaios-main',
      testsPassed: true,
      reviewPassed: true,
    });

    await capabilityRegistry.recordEvaluation(capability.id, {
      version: '0.1.0',
      evaluator: 'unit-test',
      passed: true,
      score: 0.88,
      summary: 'workflow contract passes',
    });
    const reviewRun = await createPassingReviewRun(store);
    await capabilityRegistry.publishCapabilityVersion(capability.id, {
      version: '0.1.0',
      testsPassed: true,
      reviewPassed: true,
      runId: reviewRun.id,
    });

    const invocation = await capabilityRegistry.invokeCapability(capability.id, {
      payload: { mode: 'init-only' },
    });

    expect(invocation.status).toBe('completed');
    expect((invocation.output as { type: string }).type).toBe('workflow');
    expect((invocation.output as { run: { id: string } }).run.id).toContain('run-');
  });

  it('supports richer evaluation assertions for workflow outputs', async () => {
    const { capabilityRegistry } = await createFixture();
    const capability = await capabilityRegistry.registerCapability({
      id: 'workflow-assertions',
      name: 'Workflow Assertions',
      description: 'Verifies richer evaluation DSL against real workflow output.',
      implementationType: 'workflow',
      implementationRef: 'pmaios-main',
    });

    const dataset = await capabilityRegistry.createEvaluationDataset(capability.id, {
      version: '0.1.0',
      name: 'Workflow DSL dataset',
      description: 'checks nested workflow output',
      cases: [
        {
          id: 'workflow-dsl',
          input: { mode: 'init-only' },
          expected: {
            fieldEquals: { type: 'workflow' },
            exists: ['run.id', 'run.status', 'payload.mode'],
            stringIncludes: { 'run.id': 'run-' },
            fieldIncludes: { 'run.status': 'running' },
          },
          rubric: ['must validate nested workflow wrapper fields'],
        },
      ],
    });

    const result = await capabilityRegistry.runEvaluationDataset(capability.id, {
      datasetId: dataset.id,
      version: '0.1.0',
      evaluator: 'unit-test',
    });

    expect(result.run.passed).toBe(true);
    expect(result.run.caseResults[0]?.summary).toContain('fieldEquals matched');
    expect(result.run.caseResults[0]?.summary).toContain('exists matched');
    expect(result.run.caseResults[0]?.summary).toContain('stringIncludes matched');
    expect(result.run.caseResults[0]?.summary).toContain('fieldIncludes matched');
  });

  it('exposes evaluation history drill-down by requirement, version, and capability', async () => {
    const { store, capabilityRegistry } = await createFixture();
    const requirementService = new RequirementService(new MemoryService(store));
    const requirement = await requirementService.createRequirement({
      title: 'Evaluate launch workflow capability',
      description: 'Evaluation history must be traceable from requirement to capability version.',
      category: 'feature',
      priority: 'P1',
    });
    const capability = await capabilityRegistry.registerCapability({
      id: 'history-workflow',
      name: 'History Workflow',
      description: 'Verifies evaluation history traceability.',
      implementationType: 'workflow',
      implementationRef: 'pmaios-main',
      requirementIds: [requirement.id],
    });
    const dataset = await capabilityRegistry.createEvaluationDataset(capability.id, {
      version: '0.1.0',
      name: 'History dataset',
      description: 'links evaluation to requirement and version trace',
      cases: [
        {
          id: 'history-case',
          input: { mode: 'init-only' },
          expected: { fieldEquals: { type: 'workflow' } },
          rubric: ['must create drill-down evidence'],
        },
      ],
      metadata: {
        requirementIds: [requirement.id],
      },
    });

    const result = await capabilityRegistry.runEvaluationDataset(capability.id, {
      datasetId: dataset.id,
      version: '0.1.0',
      evaluator: 'unit-test',
      requirementIds: [requirement.id],
    });
    const byRequirement = await capabilityRegistry.getEvaluationHistory({
      requirementId: requirement.id,
    });
    const byCapability = await capabilityRegistry.getEvaluationHistory({
      capabilityId: capability.id,
      version: '0.1.0',
    });
    const versionEntryId = byRequirement.items[0]!.versionEntryIds[0]!;
    const byVersionEntry = await capabilityRegistry.getEvaluationHistory({
      versionEntryId,
    });

    expect(result.run.passed).toBe(true);
    expect(byRequirement.summary.runCount).toBe(1);
    expect(byRequirement.items[0]?.run.id).toBe(result.run.id);
    expect(byRequirement.items[0]?.requirementIds).toContain(requirement.id);
    expect(byRequirement.items[0]?.versionEntryIds[0]).toMatch(/^ver-/u);
    expect(byCapability.items[0]?.dataset?.id).toBe(dataset.id);
    expect(byVersionEntry.items[0]?.run.id).toBe(result.run.id);
  });
});
