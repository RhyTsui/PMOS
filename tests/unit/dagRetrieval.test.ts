import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { DagService } from '../../src/core/dagService';
import { RetrievalGovernanceService } from '../../src/core/retrievalGovernanceService';
import { WorkflowEngine } from '../../src/core/workflowEngine';
import { MemoryService } from '../../src/core/memoryService';
import { OrchestratorRuntime } from '../../src/core/orchestratorRuntime';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-dag-ret-'));
  return new FileStore(root);
}

async function createFixture() {
  const store = createStore();
  await store.write('docs/memory/project-memory.md', '# Project Memory\n- dag/retrieval fixture\n');
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
  await store.write('workflows/main.md', '# workflow main');
  await store.write('workflows/execution.md', '# workflow execution');
  await store.write('docs/memory/global-rules.md', '# Rules\n');
  await store.write('docs/decisions/adr-0003-document-taxonomy.md', '# Taxonomy\n');
  await store.write('docs/decisions/adr-0004-v0.6-baseline-adoption.md', '# Baseline\n');
  await store.write('docs/context/project/overview.md', '# Project\ncontent about delivery observability and requirements.\n');
  await store.write('docs/context/weekly/report.md', '# Weekly\nworkflow metrics and release readiness.\n');
  await store.write('docs/implementation/PMAIOSéŽ°æŒŽæ«™.md', '# Vision\n');
  await store.write('docs/tasks/PMAIOS_v0.6_é—å›©éª‡æµ è¯²å§Ÿå¨“å‘­å´Ÿ.md', '# Tasks\n');
  await store.write('docs/implementation/PMAIOS_v0.6_éç¨¿ç¸¾ç€¹æ°«ç®Ÿ.md', '# Core\n');

  return {
    store,
    dagService: new DagService(store),
    retrievalGovernanceService: new RetrievalGovernanceService(store),
  };
}

describe('DAG and retrieval governance', () => {
  it('derives a workflow-backed DAG graph and records dirty-node reruns', async () => {
    const { dagService } = await createFixture();

    const graph = await dagService.loadGraph();
    const result = await dagService.registerChange({
      runId: 'workflow-run-1',
      nodeId: 'orchestrator-kernel',
      changeType: 'backend',
      previousVersion: 'v1',
      newVersion: 'v2',
      triggeredBy: 'system',
    });

    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(result.analysis.dirtyNodes).toContain('capability-slots');
    expect(result.event.affectedNodes.length).toBeGreaterThan(0);
    expect(result.dagRun.dirtyNodes.length).toBeGreaterThan(0);

    const runs = await dagService.listRuns();
    const changes = await dagService.listChangeEvents();
    expect(runs[0]?.metadata.sourceNodeId).toBe('orchestrator-kernel');
    expect(changes[0]?.nodeId).toBe('orchestrator-kernel');
  });

  it('connects DAG dirty-node reruns back into the workflow runtime loop', async () => {
    const { store } = await createFixture();
    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const runtime = new OrchestratorRuntime(store, memoryService);
    const dagService = new DagService(store, workflowEngine, memoryService, runtime);
    const definition = await workflowEngine.loadDefinition();
    const run = await runtime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Fixture Project',
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

    await runtime.advanceRun(run.id);
    await runtime.advanceRun(run.id);
    await runtime.advanceRun(run.id);
    await runtime.advanceRun(run.id);
    const change = await dagService.registerChange({
      runId: run.id,
      nodeId: 'orchestrator-kernel',
      changeType: 'backend',
      previousVersion: 'v1',
      newVersion: 'v2',
      triggeredBy: 'system',
    });
    const rerun = await dagService.rerunDirtyNodes({
      dagRunId: change.dagRun.id,
      workflowRunId: run.id,
      reason: 'unit test DAG rerun',
      runUntilBlocked: true,
    });

    expect(rerun.rerunStageIds).toContain('capability-slots');
    expect(rerun.completedStageIds).toContain('capability-slots');
    expect(rerun.dagRun.status).toBe('completed');
    expect(rerun.dagRun.dirtyNodes).not.toContain('capability-slots');
    expect(rerun.workflowRun.stages.find((stage) => stage.id === 'capability-slots')?.attemptCount).toBeGreaterThan(1);

    const events = await workflowEngine.loadEvents(run.id);
    expect(events.some((event) => event.metadata.dagRunId === change.dagRun.id)).toBe(true);
  });

  it('stores retrieval governance and records indexing activity', async () => {
    const { retrievalGovernanceService } = await createFixture();

    const initial = await retrievalGovernanceService.load();
    const updated = await retrievalGovernanceService.update(null, {
      mode: 'local-only',
      topK: 8,
      qualityGate: {
        minChunkCount: 2,
      },
    });
    const indexed = await retrievalGovernanceService.index();
    const search = await retrievalGovernanceService.search(null, 'workflow');

    expect(initial.collectionName).toBe('platform');
    expect(updated.mode).toBe('local-only');
    expect(updated.topK).toBe(8);
    expect(updated.qualityGate.minChunkCount).toBe(2);
    expect(indexed.lastIndexedAt).toBeTruthy();
    expect(indexed.lastIndexedChunkCount).toBeGreaterThan(0);
    expect(indexed.gate.passed).toBe(true);
    expect(search.gate.passed).toBe(true);
    expect(search.items.length).toBeGreaterThan(0);
  });
});
