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
    const { capabilityRegistry, versionRegistry, requirementService } = await createFixture();
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
    await capabilityRegistry.publishCapabilityVersion(capability.id, {
      version: '0.1.0',
      testsPassed: true,
      reviewPassed: true,
      requirementIds: [requirement.id],
      runId: 'chat-run-1',
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
});
