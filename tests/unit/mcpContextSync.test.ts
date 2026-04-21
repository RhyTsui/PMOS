import { describe, it, expect, beforeEach } from 'vitest';
import { McpContextSyncService } from '../../src/core/mcpContextSyncService.js';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';

const TEST_DIR = path.join(os.tmpdir(), 'mcp-context-test-' + randomUUID().slice(0, 8));

describe('McpContextSyncService', () => {
  let service: McpContextSyncService;

  beforeEach(async () => {
    service = new McpContextSyncService(TEST_DIR);
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('creates empty state on first read', async () => {
    const state = await service.getState();
    expect(state.tasks).toHaveLength(0);
    expect(state.sessionId).toBeDefined();
    expect(state.version).toBe(1);
  });

  it('starts a task and completes it', async () => {
    const state = await service.updateState({
      toolIdentity: 'claude',
      newTask: { label: 'Test task', status: 'in_progress', notes: null },
      newEvent: { toolIdentity: 'claude', kind: 'task_started', taskId: null, content: 'Test task' },
    });
    const taskId = state.tasks[0]?.id;
    expect(taskId).toBeDefined();
    expect(state.currentTaskId).toBe(taskId);
    expect(state.tasks[0]?.status).toBe('in_progress');
    expect(state.eventLog[0]?.taskId).toBe(taskId);

    const updated = await service.updateState({
      toolIdentity: 'codex',
      taskId,
      taskUpdates: { status: 'completed' },
    });
    const task = updated.tasks.find((t) => t.id === taskId);
    expect(task?.status).toBe('completed');
    expect(task?.completedAt).toBeDefined();
    expect(updated.currentTaskId).toBeNull();
  });

  it('writes event log and checkpoints', async () => {
    const state = await service.updateState({
      toolIdentity: 'codex',
      newTask: { label: 'Checkpoint task', status: 'in_progress', notes: null },
      newEvent: { toolIdentity: 'codex', kind: 'task_started', taskId: null, content: 'Checkpoint task' },
    });

    await service.updateState({
      toolIdentity: 'claude',
      newEvent: { toolIdentity: 'claude', kind: 'decision', taskId: null, content: 'Decided on approach' },
      newCheckpoint: { label: 'approach-decided', taskId: null, contextSnapshot: 'snapshot' },
    });

    const events = await service.getRecentEvents(5);
    expect(events).toHaveLength(2);
    expect(events[0].content).toBe('Decided on approach');
    expect(events[0].taskId).toBe(state.currentTaskId);

    const checkpoints = await service.getCheckpoints();
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0].label).toBe('approach-decided');
    expect(checkpoints[0].taskId).toBe(state.currentTaskId);
  });

  it('reads state with ETag and detects changes', async () => {
    const { state, changed, newEtag } = await service.getStateIfChanged(null);
    expect(changed).toBe(true);
    expect(newEtag).toBe(state.lastUpdated);

    const { changed: unchanged } = await service.getStateIfChanged(newEtag);
    expect(unchanged).toBe(false);
  });

  it('repairs legacy task links and statuses', async () => {
    const firstState = await service.updateState({
      toolIdentity: 'codex',
      newTask: { label: 'Legacy task', status: 'in_progress', notes: null },
      newEvent: { toolIdentity: 'codex', kind: 'task_started', taskId: null, content: 'Legacy task' },
    });
    const firstTaskId = firstState.currentTaskId!;

    const secondState = await service.updateState({
      toolIdentity: 'codex',
      newTask: { label: 'Current task', status: 'in_progress', notes: null },
      newEvent: { toolIdentity: 'codex', kind: 'task_started', taskId: null, content: 'Current task' },
    });
    const secondTaskId = secondState.currentTaskId!;

    const statePath = path.join(TEST_DIR, 'docs/memory/mcp-context/session-state.json');
    const brokenState = {
      ...(await service.getState()),
      currentTaskId: secondTaskId,
      tasks: (await service.getState()).tasks.map((task) =>
        task.id === firstTaskId
          ? { ...task, status: 'pending', completedAt: null }
          : task.id === secondTaskId
            ? { ...task, status: 'in_progress', completedAt: null }
            : task,
      ),
      eventLog: (await service.getState()).eventLog.map((event) =>
        event.kind === 'task_started' && event.content === 'Legacy task'
          ? { ...event, taskId: null }
          : event.kind === 'task_started' && event.content === 'Current task'
            ? { ...event, taskId: null }
            : event,
      ),
      checkpoints: [
        {
          id: 'ckpt-legacy',
          label: 'legacy checkpoint',
          taskId: null,
          contextSnapshot: 'snapshot',
          timestamp: new Date(Date.parse(secondState.lastUpdated) + 1000).toISOString(),
        },
      ],
    };

    await fs.writeFile(statePath, JSON.stringify(brokenState, null, 2), 'utf8');

    const repaired = await service.repairState('codex');
    const repairedFirstTask = repaired.tasks.find((task) => task.id === firstTaskId);
    const repairedSecondTask = repaired.tasks.find((task) => task.id === secondTaskId);
    const legacyEvent = repaired.eventLog.find((event) => event.kind === 'task_started' && event.content === 'Legacy task');

    expect(repaired.currentTaskId).toBe(secondTaskId);
    expect(repairedFirstTask?.status).toBe('completed');
    expect(repairedFirstTask?.completedAt).toBe(repairedSecondTask?.createdAt);
    expect(repairedSecondTask?.status).toBe('in_progress');
    expect(legacyEvent?.taskId).toBe(firstTaskId);
    expect(repaired.checkpoints[0]?.taskId).toBe(secondTaskId);
  });

  it('collapses stale in-progress tasks behind the current task', async () => {
    const firstState = await service.updateState({
      toolIdentity: 'codex',
      newTask: { label: 'First active task', status: 'in_progress', notes: null },
      newEvent: { toolIdentity: 'codex', kind: 'task_started', taskId: null, content: 'First active task' },
    });
    const firstTaskId = firstState.currentTaskId!;

    const secondState = await service.updateState({
      toolIdentity: 'codex',
      newTask: { label: 'Current active task', status: 'in_progress', notes: null },
      newEvent: { toolIdentity: 'codex', kind: 'task_started', taskId: null, content: 'Current active task' },
    });
    const secondTaskId = secondState.currentTaskId!;

    const statePath = path.join(TEST_DIR, 'docs/memory/mcp-context/session-state.json');
    const brokenState = {
      ...(await service.getState()),
      currentTaskId: secondTaskId,
      tasks: (await service.getState()).tasks.map((task) =>
        task.id === firstTaskId
          ? { ...task, status: 'in_progress', completedAt: null, updatedAt: task.updatedAt }
          : task,
      ),
    };

    await fs.writeFile(statePath, JSON.stringify(brokenState, null, 2), 'utf8');

    const repaired = await service.repairState('codex');
    const repairedFirstTask = repaired.tasks.find((task) => task.id === firstTaskId);

    expect(repaired.currentTaskId).toBe(secondTaskId);
    expect(repairedFirstTask?.status).toBe('completed');
    expect(repairedFirstTask?.completedAt).toBe(secondState.tasks.find((task) => task.id === secondTaskId)?.createdAt);
  });
});
