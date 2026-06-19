import { access, copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DebugAutomationConfig, DebugAutomationTask, DebugExecutionResult, DebugExecutionStep } from '@/types';
import { runtimeDataPath } from './runtime-data-path';

const STORE_PATH = runtimeDataPath('debug-automation.json');
const BACKUP_PATH = `${STORE_PATH}.bak`;
const TEMP_PATH = `${STORE_PATH}.tmp`;
const SHOULD_PERSIST_STORE = process.env.XIAOQIAO_PERSIST_DEV_STORE !== 'false';

interface DebugAutomationFile {
  configs: DebugAutomationConfig[];
  tasks: DebugAutomationTask[];
  steps_by_task: Record<string, DebugExecutionStep[]>;
  results_by_task: Record<string, DebugExecutionResult>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeConfig(input: Partial<DebugAutomationConfig>): DebugAutomationConfig {
  return {
    id: input.id || `debug-config-${Date.now()}`,
    name: input.name?.trim() || '未命名调试配置',
    media: input.media?.trim() || '',
    terminal: input.terminal || 'android',
    environment: input.environment || 'test',
    executor_type: input.executor_type?.trim() || 'standard',
    vision_provider: input.vision_provider?.trim() || 'builtin',
    adb_path: input.adb_path?.trim() || undefined,
    app_package: input.app_package?.trim() || undefined,
    media_config: input.media_config || {},
    channel_config: input.channel_config || {},
    game_config: input.game_config || {},
    mobile_env: input.mobile_env || {},
    keywords_json: input.keywords_json || '{}',
    timeouts_json: input.timeouts_json || '{}',
    is_active: input.is_active ?? true,
    scope: input.scope?.trim() || 'global',
    updated_at: input.updated_at || nowIso(),
  };
}

function normalizeTask(input: Partial<DebugAutomationTask>): DebugAutomationTask {
  const now = nowIso();
  return {
    id: input.id || `debug-task-${Date.now()}`,
    conversation_id: input.conversation_id || '',
    media: input.media?.trim() || '',
    debug_type: input.debug_type?.trim() || '',
    account: input.account?.trim() || '',
    app_name: input.app_name?.trim() || '',
    package_name: input.package_name?.trim() || '',
    device: input.device?.trim() || '',
    environment: input.environment?.trim() || 'test',
    status: input.status || 'created',
    current_stage: input.current_stage?.trim() || '已创建',
    current_step: input.current_step?.trim() || '',
    requires_manual_confirm: input.requires_manual_confirm ?? false,
    current_blocker: input.current_blocker?.trim() || undefined,
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
    closed_at: input.closed_at || undefined,
  };
}

function normalizeStep(input: Partial<DebugExecutionStep>): DebugExecutionStep {
  return {
    id: input.id || `debug-step-${Date.now()}`,
    task_id: input.task_id || '',
    stage: input.stage?.trim() || '',
    step_name: input.step_name?.trim() || '',
    step_order: input.step_order || 0,
    status: input.status || 'pending',
    screenshot_url: input.screenshot_url || undefined,
    log_summary: input.log_summary || undefined,
    started_at: input.started_at || undefined,
    completed_at: input.completed_at || undefined,
    duration_ms: input.duration_ms || undefined,
  };
}

function normalizeResult(input: Partial<DebugExecutionResult>): DebugExecutionResult {
  return {
    task_id: input.task_id || '',
    success: input.success ?? false,
    success_criteria: input.success_criteria?.trim() || '',
    failure_code: input.failure_code || undefined,
    failure_reason: input.failure_reason || undefined,
    evidence_json: input.evidence_json || undefined,
    execution_log_summary: input.execution_log_summary?.trim() || '',
    key_screenshots: Array.isArray(input.key_screenshots) ? input.key_screenshots : [],
    final_report_url: input.final_report_url || undefined,
    final_report_markdown: input.final_report_markdown || undefined,
    manual_takeover_flag: input.manual_takeover_flag ?? false,
    failed_step: input.failed_step || undefined,
  };
}

function buildDefaultResult(task: DebugAutomationTask): DebugExecutionResult {
  return normalizeResult({
    task_id: task.id,
    success: task.status === 'success',
    success_criteria: '完成预期联调流程并给出结果',
    execution_log_summary: task.current_stage,
    key_screenshots: [],
    manual_takeover_flag: task.status === 'manual_takeover',
    failed_step: task.status === 'failed' ? task.current_step : undefined,
  });
}

function defaultStore(): DebugAutomationFile {
  return {
    configs: [],
    tasks: [],
    steps_by_task: {},
    results_by_task: {},
  };
}

let storeCache: DebugAutomationFile | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function readStore(): Promise<DebugAutomationFile> {
  if (storeCache) return structuredClone(storeCache);
  for (const candidate of [STORE_PATH, BACKUP_PATH]) {
    try {
      const raw = await readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DebugAutomationFile>;
      if (Array.isArray(parsed.configs) && Array.isArray(parsed.tasks)) {
        storeCache = {
          configs: parsed.configs.map(normalizeConfig),
          tasks: parsed.tasks.map(normalizeTask),
          steps_by_task: parsed.steps_by_task || {},
          results_by_task: parsed.results_by_task || {},
        };
        return structuredClone(storeCache);
      }
    } catch {
      // try next
    }
  }
  storeCache = defaultStore();
  return structuredClone(storeCache);
}

async function writeStore(store: DebugAutomationFile): Promise<void> {
  storeCache = structuredClone(store);
  if (!SHOULD_PERSIST_STORE) return;
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(TEMP_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  try {
    await access(STORE_PATH);
    await rename(STORE_PATH, BACKUP_PATH);
  } catch {
    // no previous file
  }
  try {
    await rename(TEMP_PATH, STORE_PATH);
  } catch (error) {
    try { await copyFile(BACKUP_PATH, STORE_PATH); } catch { /* ignore */ }
    try { await unlink(TEMP_PATH); } catch { /* ignore */ }
    throw error;
  }
}

async function updateStore(mutator: (store: DebugAutomationFile) => void | Promise<void>): Promise<DebugAutomationFile> {
  const next = await readStore();
  await mutator(next);
  writeChain = writeChain.then(() => writeStore(next));
  await writeChain;
  return structuredClone(next);
}

export async function listDebugAutomationConfigs(): Promise<DebugAutomationConfig[]> {
  return (await readStore()).configs;
}

export async function getDebugAutomationConfig(id: string): Promise<DebugAutomationConfig | undefined> {
  return (await readStore()).configs.find(item => item.id === id);
}

export async function createDebugAutomationConfig(input: Partial<DebugAutomationConfig>): Promise<DebugAutomationConfig> {
  const config = normalizeConfig(input);
  await updateStore((store) => {
    store.configs.unshift(config);
  });
  return config;
}

export async function updateDebugAutomationConfig(id: string, input: Partial<DebugAutomationConfig>): Promise<DebugAutomationConfig | undefined> {
  let updated: DebugAutomationConfig | undefined;
  await updateStore((store) => {
    store.configs = store.configs.map((item) => {
      if (item.id !== id) return item;
      updated = normalizeConfig({ ...item, ...input, id, updated_at: nowIso() });
      return updated;
    });
  });
  return updated;
}

export async function listDebugAutomationTasks(): Promise<DebugAutomationTask[]> {
  return (await readStore()).tasks;
}

export async function getDebugAutomationTask(id: string): Promise<DebugAutomationTask | undefined> {
  return (await readStore()).tasks.find(task => task.id === id);
}

export async function createDebugAutomationTask(input: Partial<DebugAutomationTask>): Promise<DebugAutomationTask> {
  const task = normalizeTask(input);
  await updateStore((store) => {
    store.tasks.unshift(task);
    store.steps_by_task[task.id] = store.steps_by_task[task.id] || [];
    store.results_by_task[task.id] = store.results_by_task[task.id] || buildDefaultResult(task);
  });
  return task;
}

export async function updateDebugAutomationTask(id: string, input: Partial<DebugAutomationTask>): Promise<DebugAutomationTask | undefined> {
  let updated: DebugAutomationTask | undefined;
  await updateStore((store) => {
    store.tasks = store.tasks.map((item) => {
      if (item.id !== id) return item;
      updated = normalizeTask({ ...item, ...input, id, updated_at: nowIso() });
      return updated;
    });
    if (updated) {
      store.results_by_task[id] = store.results_by_task[id] || buildDefaultResult(updated);
    }
  });
  return updated;
}

export async function startDebugAutomationTask(id: string): Promise<DebugAutomationTask | undefined> {
  return updateDebugAutomationTask(id, { status: 'running_web_prepare', current_stage: 'Web端准备' });
}

export async function pauseDebugAutomationTask(id: string): Promise<DebugAutomationTask | undefined> {
  return updateDebugAutomationTask(id, { status: 'waiting_confirm', current_stage: '已暂停' });
}

export async function resumeDebugAutomationTask(id: string): Promise<DebugAutomationTask | undefined> {
  return updateDebugAutomationTask(id, { status: 'running_mobile_find_ad', current_stage: '恢复执行' });
}

export async function takeoverDebugAutomationTask(id: string): Promise<DebugAutomationTask | undefined> {
  return updateDebugAutomationTask(id, { status: 'manual_takeover', current_stage: '人工接管', requires_manual_confirm: true });
}

export async function listDebugExecutionSteps(taskId: string): Promise<DebugExecutionStep[]> {
  const store = await readStore();
  return (store.steps_by_task[taskId] || []).map(normalizeStep).sort((a, b) => a.step_order - b.step_order);
}

export async function setDebugExecutionSteps(taskId: string, steps: DebugExecutionStep[]): Promise<void> {
  await updateStore((store) => {
    store.steps_by_task[taskId] = steps.map(normalizeStep);
  });
}

export async function getDebugExecutionResult(taskId: string): Promise<DebugExecutionResult | undefined> {
  const store = await readStore();
  const result = store.results_by_task[taskId];
  if (result) return normalizeResult(result);
  const task = store.tasks.find(item => item.id === taskId);
  return task ? buildDefaultResult(task) : undefined;
}

export async function setDebugExecutionResult(taskId: string, input: Partial<DebugExecutionResult>): Promise<DebugExecutionResult> {
  const result = normalizeResult({ ...input, task_id: taskId });
  await updateStore((store) => {
    store.results_by_task[taskId] = result;
  });
  return result;
}
