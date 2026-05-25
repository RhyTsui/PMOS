import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type ToolIdentity = 'claude' | 'codex' | 'other';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
export type CollaborationMode = 'default' | 'plan' | 'deep' | 'do';

export type TaskNode = {
  id: string;
  label: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  notes: string | null;
};

export type McpContextState = {
  version: 1;
  toolIdentity: ToolIdentity;
  sessionId: string;
  projectPath: string;
  currentMode: CollaborationMode;
  currentTaskId: string | null;
  tasks: TaskNode[];
  lastUpdated: string;
  lastUpdatedBy: ToolIdentity;
  eventLog: McpContextEvent[];
  checkpoints: McpCheckpoint[];
  modeHistory: McpModeEntry[];
};

export type McpContextEvent = {
  id: string;
  toolIdentity: ToolIdentity;
  kind:
    | 'task_started'
    | 'task_completed'
    | 'task_blocked'
    | 'checkpoint'
    | 'decision'
    | 'note'
    | 'mode_changed'
    | 'plan_archived';
  taskId: string | null;
  content: string;
  timestamp: string;
};

export type McpCheckpoint = {
  id: string;
  label: string;
  taskId: string | null;
  contextSnapshot: string;
  timestamp: string;
};

export type McpModeEntry = {
  id: string;
  mode: CollaborationMode;
  label: string;
  toolIdentity: ToolIdentity;
  timestamp: string;
};

const STATE_FILE = 'docs/memory/mcp-context/session-state.json';

export class McpContextSyncService {
  private readonly stateFile: string;
  private cachedState: McpContextState | null = null;
  private lastModified: string | null = null;

  constructor(private readonly rootDir: string) {
    this.stateFile = path.join(this.rootDir, STATE_FILE);
  }

  async getState(): Promise<McpContextState> {
    try {
      const raw = await fs.readFile(this.stateFile, 'utf8');
      const stat = await fs.stat(this.stateFile);
      const state = this.normalizeLoadedState(JSON.parse(raw) as Partial<McpContextState>);
      this.cachedState = state;
      this.lastModified = stat.mtime.toISOString();
      return state;
    } catch {
      const state = this.createEmptyState();
      await this.persistState(state);
      return state;
    }
  }

  async getStateIfChanged(etag: string | null): Promise<{ state: McpContextState; changed: boolean; newEtag: string }> {
    const state = await this.getState();
    const newEtag = state.lastUpdated;
    return { state, changed: etag !== newEtag, newEtag };
  }

  async updateState(updates: {
    toolIdentity: ToolIdentity;
    taskId?: string | null;
    taskUpdates?: Partial<TaskNode>;
    mode?: CollaborationMode;
    modeLabel?: string | null;
    newTask?: Omit<TaskNode, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;
    newEvent?: Omit<McpContextEvent, 'id' | 'timestamp'>;
    newCheckpoint?: Omit<McpCheckpoint, 'id' | 'timestamp'>;
  }): Promise<McpContextState> {
    const state = await this.getState();
    const now = new Date().toISOString();
    const createdTask = updates.newTask
      ? this.createTaskNode(updates.newTask, now)
      : null;
    let next = { ...state };

    if (updates.taskId || createdTask) {
      const nextCurrentTaskId = createdTask
        ? createdTask.id
        : this.resolveCurrentTaskId(next.currentTaskId, updates.taskId ?? null, updates.taskUpdates);
      next = {
        ...next,
        currentTaskId: nextCurrentTaskId,
        tasks: this.applyTaskChange(next.tasks, updates, now, createdTask),
      };
    }

    if (updates.mode && updates.mode !== next.currentMode) {
      next = {
        ...next,
        currentMode: updates.mode,
        modeHistory: [
          ...next.modeHistory,
          {
            id: `mode-${randomUUID()}`,
            mode: updates.mode,
            label: updates.modeLabel?.trim() || `switch to ${updates.mode}`,
            toolIdentity: updates.toolIdentity,
            timestamp: now,
          },
        ],
      };
    }

    if (updates.newEvent) {
      next = {
        ...next,
        lastUpdated: now,
        lastUpdatedBy: updates.toolIdentity,
        eventLog: [
          ...next.eventLog,
          {
            ...updates.newEvent,
            taskId: updates.newEvent.taskId ?? createdTask?.id ?? next.currentTaskId,
            id: `evt-${randomUUID()}`,
            timestamp: now,
          },
        ],
      };
    }

    if (updates.newCheckpoint) {
      next = {
        ...next,
        lastUpdated: now,
        lastUpdatedBy: updates.toolIdentity,
        checkpoints: [
          ...next.checkpoints,
          {
            ...updates.newCheckpoint,
            taskId: updates.newCheckpoint.taskId ?? createdTask?.id ?? next.currentTaskId,
            id: `ckpt-${randomUUID()}`,
            timestamp: now,
          },
        ],
      };
    }

    next.currentTaskId = this.normalizeCurrentTaskId(next.tasks, next.currentTaskId);
    next.lastUpdated = now;
    next.lastUpdatedBy = updates.toolIdentity;

    this.cachedState = next;
    this.lastModified = now;

    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(next, null, 2), 'utf8');
    return next;
  }

  async repairState(toolIdentity: ToolIdentity): Promise<McpContextState> {
    const state = await this.getState();
    const repaired = this.repairSnapshot(state, toolIdentity);
    await this.persistState(repaired);
    return repaired;
  }

  private applyTaskChange(
    tasks: TaskNode[],
    updates: {
      taskId?: string | null;
      taskUpdates?: Partial<TaskNode>;
      newTask?: Omit<TaskNode, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;
    },
    now: string,
    createdTask: TaskNode | null,
  ): TaskNode[] {
    if (createdTask) {
      return [...tasks, createdTask];
    }

    if (updates.taskId) {
      return tasks.map((t) => {
        if (t.id !== updates.taskId) return t;
        const updated = { ...t, ...updates.taskUpdates, updatedAt: now };
        if (updated.status === 'completed' && t.status !== 'completed') {
          updated.completedAt = now;
        }
        return updated;
      });
    }

    return tasks;
  }

  private createTaskNode(
    task: Omit<TaskNode, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>,
    now: string,
  ): TaskNode {
    return {
      ...task,
      id: `task-${randomUUID()}`,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
  }

  private resolveCurrentTaskId(
    currentTaskId: string | null,
    taskId: string | null,
    taskUpdates?: Partial<TaskNode>,
  ) {
    if (!taskId) {
      return currentTaskId;
    }
    if (taskUpdates?.status === 'completed' && currentTaskId === taskId) {
      return null;
    }
    return taskId;
  }

  private normalizeCurrentTaskId(tasks: TaskNode[], currentTaskId: string | null) {
    const inProgressTasks = [...tasks]
      .filter((task) => task.status === 'in_progress')
      .sort((left, right) => {
        const updatedCompare = right.updatedAt.localeCompare(left.updatedAt);
        if (updatedCompare !== 0) {
          return updatedCompare;
        }
        return right.createdAt.localeCompare(left.createdAt);
      });

    if (!inProgressTasks.length) {
      return null;
    }

    if (currentTaskId) {
      const currentTask = tasks.find((task) => task.id === currentTaskId);
      if (currentTask && currentTask.status !== 'completed') {
        const latestInProgress = inProgressTasks[0];
        const latestIsNewer =
          latestInProgress.updatedAt.localeCompare(currentTask.updatedAt) > 0 ||
          (latestInProgress.updatedAt === currentTask.updatedAt &&
            latestInProgress.createdAt.localeCompare(currentTask.createdAt) > 0);
        return latestIsNewer ? latestInProgress.id : currentTaskId;
      }
    }

    return inProgressTasks[0]?.id ?? null;
  }

  private repairSnapshot(state: McpContextState, toolIdentity: ToolIdentity): McpContextState {
    const tasks = [...state.tasks]
      .map((task) => ({ ...task }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const checkpoints = state.checkpoints.map((checkpoint) => ({ ...checkpoint }));
    const eventLog = state.eventLog.map((event) => ({ ...event }));
    const tasksById = new Map(tasks.map((task) => [task.id, task]));

    for (const event of eventLog) {
      if (event.taskId || event.kind !== 'task_started') {
        continue;
      }
      const matchedTask = tasks.find(
        (task) =>
          task.label === event.content &&
          (task.createdAt === event.timestamp || !event.taskId),
      );
      if (matchedTask) {
        event.taskId = matchedTask.id;
      }
    }

    for (const event of eventLog) {
      if (event.taskId) {
        continue;
      }
      const activeTask = this.findTaskForTimestamp(tasks, event.timestamp);
      if (activeTask) {
        event.taskId = activeTask.id;
      }
    }

    for (const checkpoint of checkpoints) {
      if (checkpoint.taskId) {
        continue;
      }
      const activeTask = this.findTaskForTimestamp(tasks, checkpoint.timestamp);
      if (activeTask) {
        checkpoint.taskId = activeTask.id;
      }
    }

    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];
      const nextTask = tasks[index + 1] ?? null;
      const startedEvent = eventLog.find((event) => event.kind === 'task_started' && event.taskId === task.id);
      if (task.status === 'pending' && startedEvent) {
        if (nextTask) {
          task.status = 'completed';
          task.completedAt = task.completedAt ?? nextTask.createdAt;
          task.updatedAt = nextTask.createdAt;
        } else {
          task.status = 'in_progress';
          task.updatedAt = state.lastUpdated;
        }
      }
      if (task.status === 'in_progress' && nextTask && task.id !== state.currentTaskId) {
        task.status = 'completed';
        task.completedAt = task.completedAt ?? nextTask.createdAt;
        task.updatedAt = nextTask.createdAt;
      }
      tasksById.set(task.id, task);
    }

    const currentTaskId = this.normalizeCurrentTaskId(tasks, state.currentTaskId);

    return {
      ...state,
      currentMode: state.currentMode ?? 'default',
      currentTaskId,
      tasks,
      eventLog,
      checkpoints,
      modeHistory: state.modeHistory ?? [],
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: toolIdentity,
    };
  }

  private findTaskForTimestamp(tasks: TaskNode[], timestamp: string): TaskNode | null {
    const candidates = tasks.filter((task) => task.createdAt.localeCompare(timestamp) <= 0);
    if (!candidates.length) {
      return null;
    }
    candidates.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return candidates[0] ?? null;
  }

  private normalizeLoadedState(raw: Partial<McpContextState>): McpContextState {
    return {
      version: 1,
      toolIdentity: raw.toolIdentity ?? 'other',
      sessionId: raw.sessionId ?? `session-${randomUUID()}`,
      projectPath: raw.projectPath ?? this.rootDir,
      currentMode: raw.currentMode ?? 'default',
      currentTaskId: raw.currentTaskId ?? null,
      tasks: raw.tasks ?? [],
      lastUpdated: raw.lastUpdated ?? new Date().toISOString(),
      lastUpdatedBy: raw.lastUpdatedBy ?? 'other',
      eventLog: raw.eventLog ?? [],
      checkpoints: raw.checkpoints ?? [],
      modeHistory: raw.modeHistory ?? [],
    };
  }

  private createEmptyState(): McpContextState {
    return {
      version: 1,
      toolIdentity: 'other',
      sessionId: `session-${randomUUID()}`,
      projectPath: this.rootDir,
      currentMode: 'default',
      currentTaskId: null,
      tasks: [],
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: 'other',
      eventLog: [],
      checkpoints: [],
      modeHistory: [],
    };
  }

  async getActiveTasks(): Promise<TaskNode[]> {
    const state = await this.getState();
    return state.tasks.filter((t) => t.status !== 'completed');
  }

  async getCompletedTasks(): Promise<TaskNode[]> {
    const state = await this.getState();
    return state.tasks.filter((t) => t.status === 'completed');
  }

  async getRecentEvents(count = 10): Promise<McpContextEvent[]> {
    const state = await this.getState();
    return [...state.eventLog].reverse().slice(0, count);
  }

  async getCheckpoints(): Promise<McpCheckpoint[]> {
    const state = await this.getState();
    return [...state.checkpoints].reverse();
  }

  async getModeHistory(): Promise<McpModeEntry[]> {
    const state = await this.getState();
    return [...state.modeHistory].reverse();
  }

  async createSession(input: {
    toolIdentity: ToolIdentity;
    projectPath: string;
  }): Promise<McpContextState> {
    const state = await this.getState();
    if (state.projectPath && state.projectPath !== input.projectPath) {
      const fresh = this.createEmptyState();
      fresh.toolIdentity = input.toolIdentity;
      fresh.projectPath = input.projectPath;
      await this.persistState(fresh);
      return fresh;
    }
    const next: McpContextState = {
      ...state,
      toolIdentity: input.toolIdentity,
      projectPath: input.projectPath,
      currentMode: state.currentMode ?? 'default',
      modeHistory: state.modeHistory ?? [],
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: input.toolIdentity,
    };
    await this.persistState(next);
    return next;
  }

  private async persistState(state: McpContextState) {
    this.cachedState = state;
    this.lastModified = state.lastUpdated;
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2), 'utf8');
  }
}
