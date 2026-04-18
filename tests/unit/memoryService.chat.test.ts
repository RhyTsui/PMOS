import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-chat-'));
  return new FileStore(root);
}

describe('MemoryService chat persistence', () => {
  it('persists platform chat session, messages, snapshots, runs and events', async () => {
    const store = createStore();
    const memoryService = new MemoryService(store);

    await memoryService.saveChatSession({
      id: 'chat-platform-1',
      title: 'Platform Chat',
      defaultSubprojectId: null,
      status: 'active',
      createdAt: '2026-04-07T00:00:00.000Z',
      updatedAt: '2026-04-07T00:00:00.000Z',
    });
    await memoryService.appendChatMessage('chat-platform-1', {
      id: 'msg-1',
      sessionId: 'chat-platform-1',
      role: 'user',
      content: 'hello',
      createdAt: '2026-04-07T00:00:01.000Z',
      parentMessageId: null,
      runId: null,
      contextSnapshotId: null,
      subprojectId: null,
    });
    await memoryService.saveContextSnapshot({
      id: 'snapshot-1',
      sessionId: 'chat-platform-1',
      subprojectId: null,
      inheritsFromSnapshotId: null,
      messageIdsIncluded: ['msg-1'],
      platformMemoryRefs: ['docs/memory/project-memory.md'],
      subprojectMemoryRefs: [],
      truthSourceRefs: ['workflows/main.md', 'docs/implementation/PMAIOS愿景.md'],
      contextDocRefs: [],
      artifactRefs: [],
      workflowRunRefs: [],
      workflowEventRefs: [],
      contextSummary: 'loaded 1 message, 2 truth-source docs, 0 context docs, 0 workflow runs, 0 workflow events',
      permissions: ['platform:read'],
      createdAt: '2026-04-07T00:00:02.000Z',
    });
    await memoryService.saveExecutionRun({
      id: 'exec-1',
      sessionId: 'chat-platform-1',
      subprojectId: null,
      runType: 'assistant_turn',
      parentRunId: null,
      inputMessageId: 'msg-1',
      outputMessageIds: ['msg-2'],
      contextSnapshotId: 'snapshot-1',
      workflowRunId: null,
      linkedWorkflowRunIds: [],
      source: 'workspace',
      status: 'completed',
      createdAt: '2026-04-07T00:00:03.000Z',
      updatedAt: '2026-04-07T00:00:04.000Z',
    });
    await memoryService.appendExecutionEvent('exec-1', {
      id: 'event-1',
      runId: 'exec-1',
      sessionId: 'chat-platform-1',
      subprojectId: null,
      kind: 'message_emitted',
      status: 'ok',
      timestamp: '2026-04-07T00:00:05.000Z',
      detail: 'assistant reply emitted',
      messageId: 'msg-2',
      artifactPath: null,
      workflowRunId: null,
      metadata: {},
    });

    const session = await memoryService.loadChatSession('chat-platform-1');
    const messages = await memoryService.loadChatMessages('chat-platform-1');
    const snapshot = await memoryService.loadContextSnapshot('snapshot-1');
    const executionRun = await memoryService.loadExecutionRun('exec-1');
    const executionEvents = await memoryService.loadExecutionEvents('exec-1');

    expect(session.title).toBe('Platform Chat');
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe('hello');
    expect(snapshot.messageIdsIncluded).toEqual(['msg-1']);
    expect(snapshot.truthSourceRefs).toContain('workflows/main.md');
    expect(executionRun.contextSnapshotId).toBe('snapshot-1');
    expect(executionEvents[0]?.kind).toBe('message_emitted');
  });

  it('stores and discovers subproject-scoped chat records', async () => {
    const store = createStore();
    const memoryService = new MemoryService(store);

    await memoryService.saveChatSession({
      id: 'chat-shop-1',
      title: 'Shop Chat',
      defaultSubprojectId: 'shop',
      status: 'active',
      createdAt: '2026-04-07T01:00:00.000Z',
      updatedAt: '2026-04-07T01:00:00.000Z',
    });
    await memoryService.appendChatMessage('chat-shop-1', {
      id: 'shop-msg-1',
      sessionId: 'chat-shop-1',
      role: 'user',
      content: 'shop status',
      createdAt: '2026-04-07T01:00:01.000Z',
      parentMessageId: null,
      runId: null,
      contextSnapshotId: null,
      subprojectId: 'shop',
    });
    await memoryService.saveContextSnapshot({
      id: 'shop-snapshot-1',
      sessionId: 'chat-shop-1',
      subprojectId: 'shop',
      inheritsFromSnapshotId: null,
      messageIdsIncluded: ['shop-msg-1'],
      platformMemoryRefs: ['docs/memory/project-memory.md'],
      subprojectMemoryRefs: ['subprojects/shop/docs/memory/project-memory.md'],
      truthSourceRefs: ['workflows/main.md', 'subprojects/shop/workflows/main.md'],
      contextDocRefs: ['docs/context/project/shop-status.md'],
      artifactRefs: [],
      workflowRunRefs: ['run-shop-1'],
      workflowEventRefs: ['shop-run/events.jsonl#1'],
      contextSummary: 'loaded 1 message, 2 truth-source docs, 1 context doc, 1 workflow run, 1 workflow event',
      permissions: ['subproject:shop'],
      createdAt: '2026-04-07T01:00:02.000Z',
    });
    await memoryService.saveExecutionRun({
      id: 'shop-exec-1',
      sessionId: 'chat-shop-1',
      subprojectId: 'shop',
      runType: 'assistant_turn',
      parentRunId: null,
      inputMessageId: 'shop-msg-1',
      outputMessageIds: [],
      contextSnapshotId: 'shop-snapshot-1',
      workflowRunId: null,
      linkedWorkflowRunIds: ['run-shop-1'],
      source: 'workspace',
      status: 'running',
      createdAt: '2026-04-07T01:00:03.000Z',
      updatedAt: '2026-04-07T01:00:03.000Z',
    });
    await memoryService.appendExecutionEvent('shop-exec-1', {
      id: 'shop-event-1',
      runId: 'shop-exec-1',
      sessionId: 'chat-shop-1',
      subprojectId: 'shop',
      kind: 'context_resolved',
      status: 'ok',
      timestamp: '2026-04-07T01:00:04.000Z',
      detail: 'shop context resolved',
      messageId: 'shop-msg-1',
      artifactPath: null,
      workflowRunId: 'run-shop-1',
      metadata: { source: 'workspace' },
    });

    const sessionIds = await memoryService.listChatSessionIds('shop');
    const loadedSession = await memoryService.loadChatSession('chat-shop-1');
    const loadedMessages = await memoryService.loadChatMessages('chat-shop-1');
    const loadedRunIds = await memoryService.listExecutionRunIds('shop');
    const loadedEvents = await memoryService.loadExecutionEvents('shop-exec-1');

    expect(sessionIds).toContain('chat-shop-1');
    expect(loadedSession.defaultSubprojectId).toBe('shop');
    expect(loadedMessages[0]?.subprojectId).toBe('shop');
    expect(loadedRunIds).toContain('shop-exec-1');
    expect(loadedEvents[0]?.kind).toBe('context_resolved');
  });

  it('loads truth-source and context documents from disk', async () => {
    const store = createStore();
    const memoryService = new MemoryService(store);

    await store.write('workflows/main.md', '# main workflow');
    await store.write('docs/implementation/PMAIOS愿景.md', '# 愿景');
    await store.write('docs/context/weekly/2026-W15.md', '# 周报');
    await store.write('docs/context/project/status.md', '# 项目状态');

    const truthSources = await memoryService.loadTruthSourceDocuments(null);
    const contextDocs = await memoryService.loadContextDocuments(null);

    expect(truthSources.map((item) => item.path)).toContain('workflows/main.md');
    expect(truthSources.map((item) => item.path)).toContain('docs/implementation/PMAIOS愿景.md');
    expect(contextDocs.map((item) => item.path)).toContain('docs/context/weekly/2026-W15.md');
    expect(contextDocs.map((item) => item.path)).toContain('docs/context/project/status.md');
  });
});
