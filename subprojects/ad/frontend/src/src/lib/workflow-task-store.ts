import { mkdir, readFile, rename, writeFile, unlink, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import type { EvidenceItem, Task, TaskContext, WorkflowResult } from '@/types';
import { runtimeDataPath } from './runtime-data-path';

const STORE_PATH = runtimeDataPath('workflow-tasks.json');
const BACKUP_PATH = `${STORE_PATH}.bak`;
const SHOULD_PERSIST_STORE = process.env.XIAOQIAO_PERSIST_DEV_STORE !== 'false';

const taskStatusSchema = z.enum(['created', 'clarifying', 'running', 'waiting', 'completed', 'archived', 'downgraded']);

const taskSchema = z.object({
  task_id: z.string(),
  conversation_id: z.string(),
  task_type: z.string(),
  workflow_level: z.enum(['light', 'heavy']),
  status: taskStatusSchema,
  owner_type: z.enum(['xiaoqiao', 'sub-agent', 'user']),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().optional(),
  id: z.string().optional(),
  title: z.string(),
  summary: z.string().optional(),
  route_reason: z.string().optional(),
  latest_result_id: z.string().optional(),
  latest_evidence_ids: z.array(z.string()).optional(),
  workflow_state: z.string().optional(),
  workflow_run_count: z.number().int().nonnegative().optional(),
  last_error: z.string().optional(),
  workflow_runs: z.array(z.any()).optional(),
});

const contextSchema = z.object({
  task_id: z.string(),
  is_business_related: z.boolean().optional(),
  business_domain: z.string().optional(),
  intent_type: z.string().optional(),
  media: z.string().optional(),
  app: z.string().optional(),
  plan_id: z.string().optional(),
  device_id: z.string().optional(),
  time_range: z.string().optional(),
  target_date: z.string().optional(),
  anomaly_type: z.string().optional(),
  demand_type: z.string().optional(),
  account: z.string().optional(),
  attachments: z.array(z.string()),
  missing_fields: z.array(z.any()),
});

const resultSchema = z.object({
  result_id: z.string().optional(),
  task_id: z.string(),
  result_type: z.string(),
  summary: z.string(),
  structured_payload: z.any(),
  confidence: z.string().optional(),
  next_action: z.string().optional(),
  created_at: z.string(),
  kind: z.string(),
  next_actions: z.array(z.string()),
  pending_checks: z.array(z.string()),
});

const evidenceSchema = z.object({
  evidence_id: z.string().optional(),
  task_id: z.string().optional(),
  evidence_type: z.string().optional(),
  title: z.string(),
  summary: z.string().optional(),
  source_attachment_id: z.string().optional(),
  source_message_id: z.string().optional(),
  confidence: z.string().optional(),
  happened_at: z.string().optional(),
  step: z.number().optional(),
  detail: z.string(),
  status: z.enum(['confirmed', 'suspected', 'pending']),
  source: z.string(),
  timestamp: z.string().optional(),
});

const workflowStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(['planned', 'running', 'success', 'failed', 'blocked', 'skipped']).optional(),
  message: z.string().optional(),
  input: z.record(z.string(), z.any()).optional(),
  output: z.record(z.string(), z.any()).optional(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
});

const workflowRunSchema = z.object({
  run_id: z.string(),
  task_id: z.string(),
  conversation_id: z.string().optional(),
  intent_type: z.string(),
  workflow_level: z.enum(['light', 'heavy']),
  state: z.string(),
  status: z.enum(['created', 'running', 'blocked', 'completed', 'failed']),
  route_reason: z.string().optional(),
  started_at: z.string(),
  updated_at: z.string(),
  completed_at: z.string().optional(),
  steps: z.array(workflowStepSchema),
  trace_id: z.string().optional(),
  evidence_ids: z.array(z.string()).optional(),
  result_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const storeSchema = z.object({
  schema_version: z.literal(1),
  tasks: z.array(taskSchema),
  contexts: z.record(z.string(), contextSchema),
  results_by_task: z.record(z.string(), z.array(resultSchema)),
  evidence_by_task: z.record(z.string(), z.array(evidenceSchema)),
  runs_by_task: z.record(z.string(), z.array(workflowRunSchema)),
});

type WorkflowStoreFile = z.infer<typeof storeSchema>;
export type WorkflowRunRecord = z.infer<typeof workflowRunSchema>;
export type WorkflowStepRecord = z.infer<typeof workflowStepSchema>;
export type WorkflowTaskRecord = z.infer<typeof taskSchema>;

let storeCache: WorkflowStoreFile | null = null;
let writeChain: Promise<void> = Promise.resolve();

function nowIso(): string {
  return new Date().toISOString();
}

function defaultStore(): WorkflowStoreFile {
  return {
    schema_version: 1,
    tasks: [],
    contexts: {},
    results_by_task: {},
    evidence_by_task: {},
    runs_by_task: {},
  };
}

async function loadRawStore(): Promise<WorkflowStoreFile> {
  if (storeCache) return structuredClone(storeCache);

  const candidates = [STORE_PATH, BACKUP_PATH];
  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, 'utf8');
      const parsed = storeSchema.parse(JSON.parse(raw));
      storeCache = parsed;
      return structuredClone(parsed);
    } catch {
      // try next candidate
    }
  }

  storeCache = defaultStore();
  return structuredClone(storeCache);
}

async function writeRawStore(store: WorkflowStoreFile): Promise<void> {
  storeCache = structuredClone(store);
  if (!SHOULD_PERSIST_STORE) return;

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  const tempPath = `${STORE_PATH}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await writeFile(tempPath, JSON.stringify(store, null, 2), 'utf8');
  try {
    await access(STORE_PATH);
    await renameWithWindowsRetry(STORE_PATH, BACKUP_PATH);
  } catch {
    // no previous file
  }
  try {
    await renameWithWindowsRetry(tempPath, STORE_PATH);
  } catch (error) {
    try {
      await copyFile(BACKUP_PATH, STORE_PATH);
    } catch {
      // ignore
    }
    try {
      await unlink(tempPath);
    } catch {
      // ignore
    }
    throw error;
  }
}

async function renameWithWindowsRetry(from: string, to: string): Promise<void> {
  const retryableCodes = new Set(['EPERM', 'EBUSY', 'EACCES']);
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      lastError = error;
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
      if (!retryableCodes.has(code)) break;
      await delay(25 * (attempt + 1));
    }
  }

  throw lastError;
}

async function updateStore(mutator: (store: WorkflowStoreFile) => void | Promise<void>): Promise<WorkflowStoreFile> {
  const next = await loadRawStore();
  await mutator(next);
  writeChain = writeChain.then(() => writeRawStore(next));
  await writeChain;
  return structuredClone(next);
}

function ensureTaskExists(store: WorkflowStoreFile, task: WorkflowTaskRecord): WorkflowTaskRecord {
  const existingIndex = store.tasks.findIndex(item => item.task_id === task.task_id);
  if (existingIndex >= 0) {
    store.tasks[existingIndex] = task;
  } else {
    store.tasks.unshift(task);
  }
  return task;
}

export async function listWorkflowTasks(): Promise<WorkflowTaskRecord[]> {
  const store = await loadRawStore();
  return [...store.tasks].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function getWorkflowTask(taskId: string): Promise<WorkflowTaskRecord | undefined> {
  const store = await loadRawStore();
  return store.tasks.find(item => item.task_id === taskId);
}

export async function createWorkflowTask(input: {
  conversation_id: string;
  task_type: string;
  workflow_level: 'light' | 'heavy';
  owner_type?: WorkflowTaskRecord['owner_type'];
  title: string;
  summary?: string;
  route_reason?: string;
  workflow_state?: string;
  status?: WorkflowTaskRecord['status'];
}): Promise<WorkflowTaskRecord> {
  const now = nowIso();
  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const task: WorkflowTaskRecord = {
    task_id: taskId,
    id: taskId,
    conversation_id: input.conversation_id,
    task_type: input.task_type,
    workflow_level: input.workflow_level,
    status: input.status || (input.workflow_level === 'heavy' ? 'created' : 'running'),
    owner_type: input.owner_type || 'xiaoqiao',
    created_at: now,
    updated_at: now,
    title: input.title,
    summary: input.summary,
    route_reason: input.route_reason,
    workflow_state: input.workflow_state || 'created',
    workflow_run_count: 0,
  };

  await updateStore((store) => {
    ensureTaskExists(store, task);
  });

  return task;
}

export async function upsertWorkflowTask(task: WorkflowTaskRecord): Promise<WorkflowTaskRecord> {
  const nextTask = {
    ...task,
    id: task.id || task.task_id,
    updated_at: nowIso(),
  };
  await updateStore((store) => {
    ensureTaskExists(store, nextTask);
  });
  return nextTask;
}

export async function patchWorkflowTask(
  taskId: string,
  patch: Partial<WorkflowTaskRecord>,
): Promise<WorkflowTaskRecord | undefined> {
  let updated: WorkflowTaskRecord | undefined;
  await updateStore((store) => {
    const current = store.tasks.find(item => item.task_id === taskId);
    if (!current) return;
    updated = {
      ...current,
      ...patch,
      task_id: current.task_id,
      id: current.id || current.task_id,
      updated_at: nowIso(),
    };
    ensureTaskExists(store, updated);
  });
  return updated;
}

export async function getWorkflowTaskContext(taskId: string): Promise<TaskContext | undefined> {
  const store = await loadRawStore();
  return store.contexts[taskId] as TaskContext | undefined;
}

export async function upsertWorkflowTaskContext(taskId: string, context: TaskContext): Promise<TaskContext> {
  const next = { ...context, task_id: taskId } as TaskContext;
  await updateStore((store) => {
    store.contexts[taskId] = next;
  });
  return next;
}

export async function listWorkflowTaskResults(taskId: string): Promise<WorkflowResult[]> {
  const store = await loadRawStore();
  return [...(store.results_by_task[taskId] || [])] as WorkflowResult[];
}

export async function appendWorkflowTaskResult(result: WorkflowResult): Promise<WorkflowResult> {
  const normalizedResult = {
    ...result,
    summary: result.summary || result.business_summary?.brief || result.answer || '',
  };
  await updateStore((store) => {
    const current = store.results_by_task[normalizedResult.task_id] || [];
    store.results_by_task[normalizedResult.task_id] = [...current, normalizedResult];
    const task = store.tasks.find(item => item.task_id === normalizedResult.task_id);
    if (task) {
      task.latest_result_id = normalizedResult.result_id || normalizedResult.task_id;
      task.workflow_state = 'completed';
      task.status = 'completed';
      task.updated_at = nowIso();
      task.closed_at = task.closed_at || nowIso();
    }
  });
  return normalizedResult;
}

export async function listWorkflowTaskEvidence(taskId: string): Promise<EvidenceItem[]> {
  const store = await loadRawStore();
  return [...(store.evidence_by_task[taskId] || [])] as EvidenceItem[];
}

export async function appendWorkflowTaskEvidence(taskId: string, evidences: EvidenceItem[]): Promise<EvidenceItem[]> {
  const nextItems = evidences.map((item, index) => ({
    ...item,
    evidence_id: item.evidence_id || `ev-${Date.now()}-${index}`,
    task_id: item.task_id || taskId,
  }));
  await updateStore((store) => {
    const current = store.evidence_by_task[taskId] || [];
    store.evidence_by_task[taskId] = [...current, ...nextItems];
    const task = store.tasks.find(item => item.task_id === taskId);
    if (task) {
      task.latest_evidence_ids = nextItems.map(item => item.evidence_id || '').filter(Boolean);
      task.updated_at = nowIso();
    }
  });
  return nextItems as EvidenceItem[];
}

export async function listWorkflowRuns(taskId?: string): Promise<WorkflowRunRecord[]> {
  const store = await loadRawStore();
  if (taskId) {
    return [...(store.runs_by_task[taskId] || [])];
  }
  return Object.values(store.runs_by_task).flat();
}

export async function startWorkflowRun(input: {
  taskId: string;
  conversationId?: string;
  intentType: string;
  workflowLevel: 'light' | 'heavy';
  routeReason?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<WorkflowRunRecord> {
  const run: WorkflowRunRecord = {
    run_id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    task_id: input.taskId,
    conversation_id: input.conversationId,
    intent_type: input.intentType,
    workflow_level: input.workflowLevel,
    state: 'created',
    status: 'created',
    route_reason: input.routeReason,
    started_at: nowIso(),
    updated_at: nowIso(),
    steps: [],
    trace_id: input.traceId,
    metadata: input.metadata,
  };

  await updateStore((store) => {
    const runs = store.runs_by_task[input.taskId] || [];
    store.runs_by_task[input.taskId] = [...runs, run];
    const task = store.tasks.find(item => item.task_id === input.taskId);
    if (task) {
      task.workflow_run_count = (task.workflow_run_count || 0) + 1;
      task.workflow_state = 'created';
      task.status = input.workflowLevel === 'heavy' ? 'created' : 'running';
      task.route_reason = input.routeReason || task.route_reason;
      task.updated_at = nowIso();
    }
  });

  return run;
}

export async function updateWorkflowRun(
  taskId: string,
  runId: string,
  patch: Partial<WorkflowRunRecord>,
): Promise<WorkflowRunRecord | undefined> {
  let updated: WorkflowRunRecord | undefined;
  await updateStore((store) => {
    const runs = store.runs_by_task[taskId] || [];
    const current = runs.find(item => item.run_id === runId);
    if (!current) return;
    updated = {
      ...current,
      ...patch,
      run_id: current.run_id,
      task_id: current.task_id,
      updated_at: nowIso(),
      steps: patch.steps ? [...patch.steps] : current.steps,
    };
    store.runs_by_task[taskId] = runs.map(item => item.run_id === runId ? updated! : item);
    const task = store.tasks.find(item => item.task_id === taskId);
    if (task) {
      task.workflow_state = updated.state;
      task.status = updated.status === 'blocked' ? 'waiting' : updated.status === 'failed' ? 'downgraded' : updated.status === 'completed' ? 'completed' : task.status;
      task.updated_at = nowIso();
      if (updated.status === 'completed' || updated.status === 'blocked' || updated.status === 'failed') {
        task.closed_at = nowIso();
      }
    }
  });
  return updated;
}

export async function appendWorkflowRunStep(
  taskId: string,
  runId: string,
  step: WorkflowStepRecord,
): Promise<WorkflowRunRecord | undefined> {
  const currentRun = (await listWorkflowRuns(taskId)).find(item => item.run_id === runId);
  return updateWorkflowRun(taskId, runId, {
    steps: [
      ...(currentRun?.steps || []),
      step,
    ],
    status: step.status === 'failed' ? 'failed' : 'running',
    state: step.status === 'failed' ? 'failed' : step.status === 'blocked' ? 'blocked' : 'running',
  });
}
