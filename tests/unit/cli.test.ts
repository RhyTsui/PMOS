import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { WorkflowEngine } from '../../src/core/workflowEngine';
import { MemoryService } from '../../src/core/memoryService';
import { OrchestratorRuntime } from '../../src/core/orchestratorRuntime';
import { ProviderRegistry } from '../../src/core/providerRegistry';
import { McpRegistry } from '../../src/core/mcpRegistry';
import { ReviewCommittee } from '../../src/core/reviewCommittee';
import { SubprojectRegistry } from '../../src/core/subprojectRegistry';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-cli-'));
  return new FileStore(root);
}

describe('CLI-aligned runtime flow', () => {
  async function createRuntimeFixture() {
    const store = createStore();
    const repoStore = new FileStore(path.resolve(process.cwd()));
    await store.write('docs/memory/project-memory.md', '# Project Memory\n- 本地文件驱动\n');
    await store.write('skills/registry.json', await repoStore.read('skills/registry.json'));
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
          servers: [{ name: 'filesystem', transport: 'stdio', command: 'node', args: ['server.js'], enabled: true, tools: ['read', 'write'] }],
        },
        null,
        2,
      ),
    );

    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
    const providerRegistry = new ProviderRegistry(store);
    const mcpRegistry = new McpRegistry(store);
    const reviewCommittee = new ReviewCommittee();
    const subprojectRegistry = new SubprojectRegistry(store);

    return {
      store,
      memoryService,
      workflowEngine,
      orchestratorRuntime,
      providerRegistry,
      mcpRegistry,
      reviewCommittee,
      subprojectRegistry,
    };
  }

  it('provides enough state for run status and memory show commands', async () => {
    const { memoryService, workflowEngine, orchestratorRuntime, providerRegistry, mcpRegistry, subprojectRegistry } =
      await createRuntimeFixture();

    const definition = await workflowEngine.loadDefinition();
    const providers = await providerRegistry.listProviders();
    const servers = await mcpRegistry.listServers();
    const project = await subprojectRegistry.resolveProjectContext();
    const run = await orchestratorRuntime.initRun({
      definition,
      project,
      providerCount: providers.length,
      mcpServerCount: servers.length,
    });

    const loadedRun = await orchestratorRuntime.loadRun(run.id);
    const projectMemory = await memoryService.loadProjectMemory();
    const events = await orchestratorRuntime.loadEvents(run.id);

    expect(loadedRun.id).toBe(run.id);
    expect(loadedRun.stages[0]?.status).toBe('active');
    expect(loadedRun.tasks[0]?.status).toBe('active');
    expect(projectMemory).toContain('本地文件驱动');
    expect(events.some((event) => event.kind === 'run_initialized')).toBe(true);
  });

  it('can advance until review and build a review report', async () => {
    const { workflowEngine, orchestratorRuntime, providerRegistry, mcpRegistry, reviewCommittee, subprojectRegistry } =
      await createRuntimeFixture();

    const definition = await workflowEngine.loadDefinition();
    const providers = await providerRegistry.listProviders();
    const servers = await mcpRegistry.listServers();
    const project = await subprojectRegistry.resolveProjectContext();
    const run = await orchestratorRuntime.initRun({
      definition,
      project,
      providerCount: providers.length,
      mcpServerCount: servers.length,
    });

    let current = run;
    while (current.currentStageId && current.currentStageId !== 'frontend-backend-integration') {
      current = await orchestratorRuntime.advanceRun(current.id);
    }

    const events = await orchestratorRuntime.loadEvents(current.id);
    const artifactCount = events.filter((event) => event.kind === 'artifact_written').length;
    const artifacts = await workflowEngine.hydrateArtifacts(current);
    const openSourceEvidence = reviewCommittee.inspectOpenSourceEvidence(artifacts);
    const review = reviewCommittee.buildReportForRun({
      runId: current.id,
      artifactCount,
      openSourceEvaluationPresent: openSourceEvidence.present,
      openSourceEvidencePaths: openSourceEvidence.evidencePaths,
    });

    expect(current.currentStageId).toBe('frontend-backend-integration');
    expect(artifactCount).toBeGreaterThanOrEqual(6);
    expect(openSourceEvidence.present).toBe(true);
    expect(review.gate.decision).toBe('pass');
  });

  it('can run until blocked or completed for CLI lifecycle', async () => {
    const { workflowEngine, orchestratorRuntime, providerRegistry, mcpRegistry, reviewCommittee, subprojectRegistry } =
      await createRuntimeFixture();

    const definition = await workflowEngine.loadDefinition();
    const providers = await providerRegistry.listProviders();
    const servers = await mcpRegistry.listServers();
    const project = await subprojectRegistry.resolveProjectContext();
    const run = await orchestratorRuntime.initRun({
      definition,
      project,
      providerCount: providers.length,
      mcpServerCount: servers.length,
    });

    const updated = await orchestratorRuntime.runUntilBlocked(run.id, {
      reviewReport: reviewCommittee.buildReportForRun({ runId: run.id, artifactCount: 6 }),
    });

    expect(['completed', 'blocked']).toContain(updated.status);
    expect(updated.stages.some((stage) => stage.outputPaths.length > 0)).toBe(true);
  });

  it('provides events, artifacts, and metrics data for CLI query commands', async () => {
    const { workflowEngine, orchestratorRuntime, providerRegistry, mcpRegistry, reviewCommittee, subprojectRegistry } =
      await createRuntimeFixture();

    const definition = await workflowEngine.loadDefinition();
    const providers = await providerRegistry.listProviders();
    const servers = await mcpRegistry.listServers();
    const project = await subprojectRegistry.resolveProjectContext();
    const run = await orchestratorRuntime.initRun({
      definition,
      project,
      providerCount: providers.length,
      mcpServerCount: servers.length,
    });

    const updated = await orchestratorRuntime.runUntilBlocked(run.id, {
      reviewReport: reviewCommittee.buildReportForRun({ runId: run.id, artifactCount: 6 }),
    });
    const events = await orchestratorRuntime.loadEvents(updated.id);
    const artifacts = updated.stages.flatMap((stage) => stage.outputPaths);
    const review = reviewCommittee.buildReportForRun({
      runId: updated.id,
      artifactCount: events.filter((event) => event.kind === 'artifact_written').length,
    });
    const metrics = await workflowEngine.buildMetrics(updated, review);

    expect(events.length).toBeGreaterThan(0);
    expect(artifacts.length).toBeGreaterThan(0);
    expect(metrics.artifactCount).toBeGreaterThan(0);
    expect(metrics.totalStages).toBe(updated.stages.length);
  });

  it('exposes provider status for list and check style commands', async () => {
    const { providerRegistry } = await createRuntimeFixture();

    const providers = await providerRegistry.listProviders();
    const mockProvider = await providerRegistry.resolveProviderByName('mock');

    expect(providers.some((provider) => provider.name === 'mock')).toBe(true);
    expect(mockProvider?.runtimeReady).toBe(true);
    expect(mockProvider?.configured).toBe(true);
  });

  it('supports isolated subproject runs for CLI-oriented flows', async () => {
    const { workflowEngine, orchestratorRuntime, providerRegistry, mcpRegistry, subprojectRegistry, memoryService } =
      await createRuntimeFixture();

    await subprojectRegistry.createSubproject({ id: 'shop', name: 'Shop' });
    const project = await subprojectRegistry.resolveProjectContext('shop');
    const definition = await workflowEngine.loadDefinition(project.projectRoot);
    const providers = await providerRegistry.listProviders();
    const servers = await mcpRegistry.listServers();
    const run = await orchestratorRuntime.initRun({
      definition,
      project,
      providerCount: providers.length,
      mcpServerCount: servers.length,
    });

    const loadedRun = await orchestratorRuntime.loadRun(run.id, 'shop');
    const events = await orchestratorRuntime.loadEvents(run.id, 'shop');
    const projectMemory = await memoryService.loadProjectMemory(project.projectMemoryPath);

    expect(loadedRun.subprojectId).toBe('shop');
    expect(loadedRun.projectRoot).toBe('subprojects/shop');
    expect(events.some((event) => event.kind === 'run_initialized')).toBe(true);
    expect(projectMemory).toContain('projectId: shop');
  });

  it('uses subproject provider and mcp overrides in runtime context', async () => {
    const { store, workflowEngine, orchestratorRuntime, providerRegistry, mcpRegistry, subprojectRegistry } = await createRuntimeFixture();

    await store.write(
      'config/providers-shop.json',
      JSON.stringify(
        {
          defaultProvider: 'shop-mock',
          providers: [{ name: 'shop-mock', type: 'mock', envKey: 'SHOP_MOCK_KEY', capabilities: ['text'] }],
        },
        null,
        2,
      ),
    );
    await store.write(
      'mcp/shop.json',
      JSON.stringify(
        {
          servers: [{ name: 'shop-filesystem', transport: 'stdio', command: 'node', args: ['shop-server.js'], enabled: true, tools: ['read'] }],
        },
        null,
        2,
      ),
    );
    await subprojectRegistry.createSubproject({
      id: 'shop',
      name: 'Shop',
      overrides: {
        provider: 'shop-mock',
        providerConfigPath: 'config/providers-shop.json',
        mcpConfigPath: 'mcp/shop.json',
      },
    });

    const project = await subprojectRegistry.resolveProjectContext('shop');
    const definition = await workflowEngine.loadDefinition(project.projectRoot);
    const providers = await providerRegistry.listProviders('shop');
    const servers = await mcpRegistry.listServers('shop');
    const run = await orchestratorRuntime.initRun({
      definition,
      project,
      providerCount: providers.length,
      mcpServerCount: servers.length,
    });

    expect(run.selectedProvider).toBe('shop-mock');
    expect(run.providerConfigPath).toBe('config/providers-shop.json');
    expect(run.mcpConfigPath).toBe('mcp/shop.json');
    expect(providers[0]?.name).toBe('shop-mock');
    expect(servers[0]?.name).toBe('shop-filesystem');
  });

  it('marks review gate failures as needs-rework and retries the blocked stage on next advance', async () => {
    const { workflowEngine, orchestratorRuntime, providerRegistry, mcpRegistry, reviewCommittee, subprojectRegistry } =
      await createRuntimeFixture();

    const definition = await workflowEngine.loadDefinition();
    const providers = await providerRegistry.listProviders();
    const servers = await mcpRegistry.listServers();
    const project = await subprojectRegistry.resolveProjectContext();
    const run = await orchestratorRuntime.initRun({
      definition,
      project,
      providerCount: providers.length,
      mcpServerCount: servers.length,
    });

    let current = run;
    while (current.currentStageId && current.currentStageId !== 'frontend-backend-integration') {
      current = await orchestratorRuntime.advanceRun(current.id);
    }

    const blocked = await orchestratorRuntime.advanceRun(current.id, {
      reviewReport: reviewCommittee.buildReportForRun({ runId: current.id, artifactCount: 2 }),
    });

    expect(blocked.status).toBe('needs-rework');
    expect(blocked.currentStageId).toBe('backend-api');
    expect(blocked.stages.find((stage) => stage.id === 'backend-api')?.status).toBe('blocked');

    const resumed = await orchestratorRuntime.advanceRun(blocked.id);
    const resumedStage = resumed.stages.find((stage) => stage.id === 'backend-api');
    const events = await orchestratorRuntime.loadEvents(resumed.id);

    expect(resumed.status).toBe('running');
    expect(resumed.currentStageId).toBe('frontend-backend-integration');
    expect(resumedStage?.status).toBe('completed');
    expect(resumedStage?.blockedReason).toBeNull();
    expect(events.some((event) => event.id === `${resumed.id}-backend-api-restarted`)).toBe(true);
  });

  it('can assemble portfolio-style summary across platform and subprojects', async () => {
    const { workflowEngine, orchestratorRuntime, providerRegistry, mcpRegistry, reviewCommittee, subprojectRegistry } =
      await createRuntimeFixture();

    const platformProject = await subprojectRegistry.resolveProjectContext();
    const platformDefinition = await workflowEngine.loadDefinition(platformProject.projectRoot);
    const platformProviders = await providerRegistry.listProviders();
    const platformServers = await mcpRegistry.listServers();
    await orchestratorRuntime.initRun({
      definition: platformDefinition,
      project: platformProject,
      providerCount: platformProviders.length,
      mcpServerCount: platformServers.length,
    });

    await subprojectRegistry.createSubproject({ id: 'shop', name: 'Shop' });
    const shopProject = await subprojectRegistry.resolveProjectContext('shop');
    const shopDefinition = await workflowEngine.loadDefinition(shopProject.projectRoot);
    const shopProviders = await providerRegistry.listProviders('shop');
    const shopServers = await mcpRegistry.listServers('shop');
    const shopRun = await orchestratorRuntime.initRun({
      definition: shopDefinition,
      project: shopProject,
      providerCount: shopProviders.length,
      mcpServerCount: shopServers.length,
    });
    const shopReview = reviewCommittee.buildReportForRun({ runId: shopRun.id, artifactCount: 6 });
    const shopMetrics = await workflowEngine.buildMetrics(shopRun, shopReview);

    const subprojects = await subprojectRegistry.listSubprojects();
    const portfolio = await Promise.all(
      [null, ...subprojects.map((subproject) => subproject.id)].map(async (subprojectId) => {
        const runs = await orchestratorRuntime.listRuns(subprojectId);
        const currentRun = runs[0] ?? null;
        const review = currentRun ? reviewCommittee.buildReportForRun({ runId: currentRun.id, artifactCount: 6 }) : null;
        const metrics = currentRun ? await workflowEngine.buildMetrics(currentRun, review) : null;
        return {
          subprojectId,
          currentRun,
          metrics,
        };
      }),
    );

    expect(portfolio).toHaveLength(2);
    expect(portfolio.find((entry) => entry.subprojectId === null)?.currentRun?.projectName).toBe('PMAIOS Platform');
    expect(portfolio.find((entry) => entry.subprojectId === 'shop')?.currentRun?.subprojectId).toBe('shop');
    expect(shopMetrics.totalStages).toBeGreaterThan(0);
  });
});
