import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { ChatService } from '../../src/core/chatService';
import { MemoryService } from '../../src/core/memoryService';
import { RequirementService } from '../../src/core/requirementService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-chat-governance-'));
  return new FileStore(root);
}

describe('Chat governance capture', () => {
  it('captures global rules and requirements from user messages', async () => {
    const store = createStore();
    await store.write('docs/memory/project-memory.md', '# Project Memory\n- governance fixture\n');
    const chatService = new ChatService(store);
    const requirementService = new RequirementService(new MemoryService(store));

    const session = await chatService.createSession({});
    const message = await chatService.createUserMessage(session.id, {
      content: '以后所有规则类对话都应该沉淀成全局规则，而且新增能力需求需要自动识别并加入需求池。',
      parentMessageId: null,
    });

    const rules = await store.read('docs/memory/global-rules.md');
    const requirements = await requirementService.listRequirements();

    expect(rules).toContain(message.id);
    expect(rules).toContain('全局规则');
    expect(requirements.some((requirement) => requirement.source.messageId === message.id)).toBe(true);
  });
  it('auto-captures provider failures into requirement pool during respond', async () => {
    const store = createStore();
    await store.write('docs/memory/project-memory.md', '# Project Memory\n- governance fixture\n');
    const memoryService = new MemoryService(store);
    const requirementService = new RequirementService(memoryService);
    const llmRouter = {
      execute: async () => ({
        result: {
          providerName: 'mock-provider',
          providerType: 'mock',
          model: 'mock-model',
          status: 'error',
          outputText: null,
          warning: null,
          error: 'quota exceeded',
        },
        events: [
          {
            kind: 'provider_failed',
            status: 'warning',
            detail: 'mock-provider quota exceeded',
            artifactPath: null,
          },
        ],
      }),
    };
    const chatService = new ChatService(store, memoryService, undefined, llmRouter as never);

    const session = await chatService.createSession({});
    await chatService.createUserMessage(session.id, {
      content: '帮我总结当前平台状态',
      parentMessageId: null,
    });
    await chatService.respond(session.id);

    const requirements = await requirementService.listRequirements();
    expect(
      requirements.some(
        (requirement) =>
          requirement.source.kind === 'auto-capture' && requirement.metadata.autoCaptureEventKind === 'provider_failed',
      ),
    ).toBe(true);
  });
});
