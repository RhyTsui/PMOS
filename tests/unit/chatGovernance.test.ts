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
});
