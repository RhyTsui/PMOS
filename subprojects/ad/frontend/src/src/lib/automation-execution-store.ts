import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeUserDataPath } from './runtime-data-path';
import type { AutomationExecutionRecord, AutomationExecutionStep, ScheduledTaskExecution } from '@/types';

const STORE_FILE_NAME = 'automation-executions.json';

interface AutomationExecutionsFile {
  executions: AutomationExecutionRecord[];
}

function getStorePath(scopeKey: string) {
  return runtimeUserDataPath(scopeKey, STORE_FILE_NAME);
}

function now() {
  return Date.now();
}

function cloneStep(step: AutomationExecutionStep): AutomationExecutionStep {
  return {
    ...step,
    input: step.input ? { ...step.input } : undefined,
    output: step.output ? { ...step.output } : undefined,
  };
}

function cloneExecution(execution: AutomationExecutionRecord): AutomationExecutionRecord {
  return {
    ...execution,
    project_binding: execution.project_binding ? { ...execution.project_binding } : undefined,
    input_snapshot: { ...execution.input_snapshot },
    step_runs: execution.step_runs.map(cloneStep),
    artifact_attachment_ids: [...execution.artifact_attachment_ids],
    artifact_names: [...execution.artifact_names],
    artifact_urls: [...execution.artifact_urls],
  };
}

async function readStore(scopeKey: string): Promise<AutomationExecutionsFile> {
  try {
    const raw = await readFile(getStorePath(scopeKey), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AutomationExecutionsFile>;
    return {
      executions: Array.isArray(parsed.executions)
        ? parsed.executions.map((item) => ({
            ...item,
            project_binding: item.project_binding ? { ...item.project_binding } : undefined,
            input_snapshot: item.input_snapshot && typeof item.input_snapshot === 'object' ? { ...item.input_snapshot } : {},
            step_runs: Array.isArray(item.step_runs) ? item.step_runs.map(cloneStep) : [],
            artifact_attachment_ids: Array.isArray(item.artifact_attachment_ids) ? [...item.artifact_attachment_ids] : [],
            artifact_names: Array.isArray(item.artifact_names) ? [...item.artifact_names] : [],
            artifact_urls: Array.isArray(item.artifact_urls) ? [...item.artifact_urls] : [],
          }))
        : [],
    };
  } catch {
    return { executions: [] };
  }
}

async function writeStore(scopeKey: string, store: AutomationExecutionsFile) {
  const storePath = getStorePath(scopeKey);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

export async function listAutomationExecutions(scopeKey: string, taskId?: string) {
  const store = await readStore(scopeKey);
  return store.executions
    .filter((execution) => !taskId || execution.task_id === taskId)
    .sort((a, b) => b.started_at - a.started_at)
    .map(cloneExecution);
}

export async function getAutomationExecution(scopeKey: string, executionId: string) {
  const store = await readStore(scopeKey);
  const execution = store.executions.find((item) => item.id === executionId);
  return execution ? cloneExecution(execution) : undefined;
}

export async function createAutomationExecution(
  scopeKey: string,
  input: Partial<AutomationExecutionRecord> & Pick<AutomationExecutionRecord, 'task_id' | 'prompt_snapshot'>,
) {
  const store = await readStore(scopeKey);
  const startedAt = input.started_at ?? now();
  const execution: AutomationExecutionRecord = {
    id: input.id || `automation-execution-${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
    task_id: input.task_id,
    project_binding: input.project_binding ? { ...input.project_binding } : undefined,
    status: input.status || 'queued',
    started_at: startedAt,
    finished_at: input.finished_at,
    duration_ms: input.duration_ms,
    input_snapshot: input.input_snapshot && typeof input.input_snapshot === 'object' ? { ...input.input_snapshot } : {},
    prompt_snapshot: input.prompt_snapshot,
    result_summary: input.result_summary || '等待执行',
    artifact_attachment_ids: Array.isArray(input.artifact_attachment_ids) ? [...input.artifact_attachment_ids] : [],
    artifact_names: Array.isArray(input.artifact_names) ? [...input.artifact_names] : [],
    artifact_urls: Array.isArray(input.artifact_urls) ? [...input.artifact_urls] : [],
    error_message: input.error_message,
    failure_category: input.failure_category,
    retry_attempt: input.retry_attempt ?? 0,
    next_retry_at: input.next_retry_at,
    retry_reason: input.retry_reason,
    failure_case_id: input.failure_case_id,
    step_runs: Array.isArray(input.step_runs) ? input.step_runs.map(cloneStep) : [],
    created_at: input.created_at ?? startedAt,
    updated_at: input.updated_at ?? startedAt,
  };
  store.executions.unshift(execution);
  await writeStore(scopeKey, store);
  return cloneExecution(execution);
}

export async function updateAutomationExecution(
  scopeKey: string,
  executionId: string,
  patch: Partial<AutomationExecutionRecord>,
) {
  const store = await readStore(scopeKey);
  let updated: AutomationExecutionRecord | undefined;
  store.executions = store.executions.map((execution) => {
    if (execution.id !== executionId) return execution;
    updated = {
      ...execution,
      ...patch,
      input_snapshot: patch.input_snapshot ? { ...patch.input_snapshot } : execution.input_snapshot,
      step_runs: patch.step_runs ? patch.step_runs.map(cloneStep) : execution.step_runs,
      artifact_attachment_ids: patch.artifact_attachment_ids ? [...patch.artifact_attachment_ids] : execution.artifact_attachment_ids,
      artifact_names: patch.artifact_names ? [...patch.artifact_names] : execution.artifact_names,
      artifact_urls: patch.artifact_urls ? [...patch.artifact_urls] : execution.artifact_urls,
      updated_at: now(),
    };
    return updated;
  });
  if (!updated) return undefined;
  await writeStore(scopeKey, store);
  return cloneExecution(updated);
}

export async function appendAutomationExecutionStep(
  scopeKey: string,
  executionId: string,
  step: AutomationExecutionStep,
) {
  const store = await readStore(scopeKey);
  let updated: AutomationExecutionRecord | undefined;
  store.executions = store.executions.map((execution) => {
    if (execution.id !== executionId) return execution;
    updated = {
      ...execution,
      step_runs: [...execution.step_runs.filter((item) => item.id !== step.id), cloneStep(step)],
      updated_at: now(),
    };
    return updated;
  });
  if (!updated) return undefined;
  await writeStore(scopeKey, store);
  return cloneExecution(updated);
}

export async function finishAutomationExecution(
  scopeKey: string,
  executionId: string,
  patch: Partial<AutomationExecutionRecord> & Pick<AutomationExecutionRecord, 'status' | 'result_summary'>,
) {
  const finishedAt = patch.finished_at ?? now();
  return updateAutomationExecution(scopeKey, executionId, {
    ...patch,
    finished_at: finishedAt,
    duration_ms: patch.duration_ms ?? Math.max(0, finishedAt - (patch.started_at || finishedAt)),
  });
}

export async function cancelAutomationExecution(scopeKey: string, executionId: string) {
  return updateAutomationExecution(scopeKey, executionId, {
    status: 'cancelled',
    finished_at: now(),
  });
}

export async function retryAutomationExecution(scopeKey: string, executionId: string) {
  const current = await getAutomationExecution(scopeKey, executionId);
  if (!current) return undefined;
  return createAutomationExecution(scopeKey, {
    task_id: current.task_id,
    project_binding: current.project_binding,
    prompt_snapshot: current.prompt_snapshot,
    input_snapshot: current.input_snapshot,
    status: 'queued',
    result_summary: '重新排队执行',
    failure_category: current.failure_category,
    retry_attempt: (current.retry_attempt || 0) + 1,
    retry_reason: current.retry_reason || '用户要求重新执行',
  });
}

export type AutomationExecutionSummary = ScheduledTaskExecution;
