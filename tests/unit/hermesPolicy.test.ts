import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { WorkflowEngine } from '../../src/core/workflowEngine';
import { OrchestratorRuntime } from '../../src/core/orchestratorRuntime';
import { HermesPolicyService } from '../../src/core/hermesPolicyService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-hermes-'));
  return new FileStore(root);
}

async function seedFixture(store: FileStore) {
  await store.write('docs/memory/project-memory.md', '# Project Memory\n');
  await store.write('skills/registry.json', JSON.stringify({ version: 'test', skills: [] }, null, 2));
  await store.write(
    'docs/memory/retrieval/governance.json',
    JSON.stringify(
      {
        subprojectId: null,
        mode: 'local-only',
        remoteUrl: null,
        collectionName: 'platform',
        topK: 5,
        indexingEnabled: true,
        qualityGate: {
          minChunkCount: 1,
          minScore: 0.1,
          requireTruthSources: true,
        },
        lastIndexedAt: new Date().toISOString(),
        lastIndexedChunkCount: 2,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

describe('HermesPolicyService', () => {
  it('mounts Hermes as enhance-only policy without taking control of workflow routing', async () => {
    const store = createStore();
    await seedFixture(store);
    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const runtime = new OrchestratorRuntime(store, memoryService);
    const hermes = new HermesPolicyService(store, memoryService);
    const definition = await workflowEngine.loadDefinition();
    const run = await runtime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Hermes Fixture',
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

    const report = await hermes.evaluateRun(run);

    expect(report.mode).toBe('enhance-only');
    expect(report.guardrails.canRoute).toBe(false);
    expect(report.guardrails.canPlan).toBe(false);
    expect(report.guardrails.canModifyDag).toBe(false);
    expect(report.guardrails.canBlockWorkflow).toBe(false);
    expect(report.checks.some((check) => check.id === 'enhance-only-guardrail' && check.status === 'pass')).toBe(true);
    expect(report.checks.some((check) => check.id === 'review-gate-presence' && check.status === 'pass')).toBe(true);

    const reports = await hermes.listReports();
    expect(reports[0]?.runId).toBe(run.id);
  });
});
