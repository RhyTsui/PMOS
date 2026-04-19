import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { ChatService } from '../../src/core/chatService';
import { RequirementService } from '../../src/core/requirementService';
import { CapabilityRegistry } from '../../src/core/capabilityRegistry';
import { VersionRegistry } from '../../src/core/versionRegistry';
import { WorkflowEngine } from '../../src/core/workflowEngine';
import { OrchestratorRuntime } from '../../src/core/orchestratorRuntime';
import { SubprojectRegistry } from '../../src/core/subprojectRegistry';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-req-ver-'));
  return new FileStore(root);
}

async function createFixture() {
  const store = createStore();
  await store.write('docs/memory/project-memory.md', '# Project Memory\n- requirement/version fixture\n');
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
    JSON.stringify({ servers: [{ name: 'filesystem', transport: 'stdio', command: 'node', args: ['server.js'], enabled: true, tools: ['read'] }] }, null, 2),
  );
  await store.write('skills/registry.json', await new FileStore('E:/AI/ai-os').read('skills/registry.json'));

  const memoryService = new MemoryService(store);
  return {
    store,
    memoryService,
    chatService: new ChatService(store, memoryService),
    requirementService: new RequirementService(memoryService),
    capabilityRegistry: new CapabilityRegistry(store),
    versionRegistry: new VersionRegistry(memoryService),
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

describe('Requirement + Version system', () => {
  it('ingests user chat into a requirement record', async () => {
    const { chatService, requirementService } = await createFixture();
    const session = await chatService.createSession({});
    const message = await chatService.createUserMessage(session.id, {
      content: '需要新增 capability 发布历史页，并能按版本回滚，P0',
    });

    const requirement = await requirementService.ingestFromChat({
      sessionId: session.id,
      messageId: message.id,
    });

    expect(requirement.source.kind).toBe('chat');
    expect(requirement.source.messageId).toBe(message.id);
    expect(requirement.category).toBe('feature');
    expect(requirement.priority).toBe('P0');
    expect(requirement.title).toContain('[feature]');
  });

  it('creates version entries for capability register and publish changes', async () => {
    const { store, capabilityRegistry, versionRegistry, requirementService } = await createFixture();
    const requirement = await requirementService.createRequirement({
      title: 'Link capability publish to requirement',
      description: 'Publish path should backfill requirement traces.',
      category: 'architecture',
    });
    const capability = await capabilityRegistry.registerCapability({
      id: 'versioned-capability',
      name: 'Versioned Capability',
      description: 'Used to verify version registry.',
      implementationType: 'workflow',
      implementationRef: 'pmaios-main',
      requirementIds: [requirement.id],
      runId: 'chat-run-1',
    });

    await capabilityRegistry.recordEvaluation(capability.id, {
      version: '0.1.0',
      evaluator: 'unit-test',
      passed: true,
      score: 0.9,
      summary: 'ready for publish',
    });
    const reviewRun = await createPassingReviewRun(store);
    await capabilityRegistry.publishCapabilityVersion(capability.id, {
      version: '0.1.0',
      testsPassed: true,
      reviewPassed: true,
      requirementIds: [requirement.id],
      runId: reviewRun.id,
    });
    await capabilityRegistry.invokeCapability(capability.id, {
      payload: { mode: 'init-only' },
      requirementIds: [requirement.id],
    });

    const entries = await versionRegistry.listEntries();
    const updatedRequirement = await requirementService.loadRequirement(requirement.id);

    expect(entries.some((entry) => entry.entityId === capability.id && entry.changeType === 'register')).toBe(true);
    expect(entries.some((entry) => entry.entityId === capability.id && entry.changeType === 'publish')).toBe(true);
    expect(entries.some((entry) => entry.entityId === capability.id && entry.changeType === 'invoke')).toBe(true);
    expect(updatedRequirement.trace.linkedVersionIds.length).toBeGreaterThanOrEqual(3);
    expect(updatedRequirement.trace.linkedRunIds).toContain('chat-run-1');
  });

  it('supports requirement status updates and batch operations', async () => {
    const { requirementService } = await createFixture();
    const first = await requirementService.createRequirement({
      title: 'First requirement',
      description: 'Need active lifecycle',
      category: 'feature',
    });
    const second = await requirementService.createRequirement({
      title: 'Second requirement',
      description: 'Need batch update',
      category: 'architecture',
    });

    const updated = await requirementService.updateRequirement(first.id, {
      status: 'active',
      priority: 'P0',
      metadataPatch: { owner: 'platform' },
    });
    const batch = await requirementService.batchUpdateRequirements({
      requirementIds: [first.id, second.id],
      status: 'done',
      metadataPatch: { syncedBy: 'unit-test' },
    });

    expect(updated.status).toBe('active');
    expect(updated.priority).toBe('P0');
    expect(updated.metadata.owner).toBe('platform');
    expect(batch).toHaveLength(2);
    expect(batch.every((item) => item.status === 'done')).toBe(true);
    expect(batch.every((item) => item.metadata.syncedBy === 'unit-test')).toBe(true);
  });

  it('stores release approval and rollback trace in version entries', async () => {
    const { store, capabilityRegistry, requirementService, versionRegistry } = await createFixture();
    const requirement = await requirementService.createRequirement({
      title: 'Release traceability',
      description: 'Version entries must keep approval and rollback links.',
      category: 'architecture',
    });

    const capability = await capabilityRegistry.registerCapability({
      id: 'release-trace-capability',
      name: 'Release Trace Capability',
      description: 'Tracks release metadata.',
      implementationType: 'workflow',
      implementationRef: 'pmaios-main',
      requirementIds: [requirement.id],
      runId: 'chat-run-2',
    });

    await capabilityRegistry.recordEvaluation(capability.id, {
      version: '0.1.0',
      evaluator: 'unit-test',
      passed: true,
      score: 1,
      summary: 'gate ready',
    });
    const reviewRun = await createPassingReviewRun(store);
    await capabilityRegistry.publishCapabilityVersion(capability.id, {
      version: '0.1.0',
      testsPassed: true,
      reviewPassed: true,
      releaseNotes: 'Initial release notes',
      reviewSummary: 'Approved by review gate',
      requirementIds: [requirement.id],
      runId: reviewRun.id,
    });
    await capabilityRegistry.rollbackCapabilityVersion(capability.id, {
      version: '0.1.0',
      summary: 'Rollback drill',
      requirementIds: [requirement.id],
      runId: 'chat-run-2',
    });

    const entries = await versionRegistry.listEntries();
    const publishEntry = entries.find((entry) => entry.entityId === capability.id && entry.changeType === 'publish');
    const rollbackEntry = entries.find((entry) => entry.entityId === capability.id && entry.changeType === 'rollback');

    expect(publishEntry?.releaseNotes).toBe('Initial release notes');
    expect(publishEntry?.approval?.approved).toBe(true);
    expect(publishEntry?.diffSummary).toContain('publish');
    expect(rollbackEntry?.approval?.approver).toBe('rollback-operator');
    expect(rollbackEntry?.rollbackOfVersionEntryId).toBe(publishEntry?.id);
    expect(rollbackEntry?.diffSummary).toContain('rollback');
  });
});
