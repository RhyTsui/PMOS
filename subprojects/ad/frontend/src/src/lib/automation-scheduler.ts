import { runDueScheduledTasks } from './scheduled-task-store';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { runtimeDataPath } from './runtime-data-path';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_LIMIT = 5;
const DEFAULT_LOCK_TTL_MS = 120_000;
const LOCK_PATH = runtimeDataPath('automation-scheduler.lock');

let timer: NodeJS.Timeout | null = null;
let running = false;

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function acquireSchedulerLock(ttlMs: number) {
  await mkdir(path.dirname(LOCK_PATH), { recursive: true });
  const expiresAt = Date.now() + ttlMs;
  try {
    const handle = await open(LOCK_PATH, 'wx');
    await handle.writeFile(JSON.stringify({ pid: process.pid, expires_at: expiresAt }));
    await handle.close();
    return true;
  } catch {
    const raw = await readFile(LOCK_PATH, 'utf8').catch(() => '');
    let current: { expires_at?: number } = {};
    try {
      current = raw ? JSON.parse(raw) as { expires_at?: number } : {};
    } catch {
      current = {};
    }
    if (!current.expires_at || current.expires_at > Date.now()) return false;
    await unlink(LOCK_PATH).catch(() => undefined);
    return acquireSchedulerLock(ttlMs);
  }
}

async function releaseSchedulerLock() {
  const raw = await readFile(LOCK_PATH, 'utf8').catch(() => '');
  let current: { pid?: number } = {};
  try {
    current = raw ? JSON.parse(raw) as { pid?: number } : {};
  } catch {
    current = {};
  }
  if (current.pid === process.pid) {
    await unlink(LOCK_PATH).catch(() => undefined);
  }
}

export async function runAutomationSchedulerTick() {
  if (running) return [];
  running = true;
  const lockTtlMs = readPositiveInteger(process.env.AUTOMATION_SCHEDULER_LOCK_TTL_MS, DEFAULT_LOCK_TTL_MS);
  const locked = await acquireSchedulerLock(lockTtlMs);
  if (!locked) {
    running = false;
    return [];
  }
  try {
    return await runDueScheduledTasks({
      limit: readPositiveInteger(process.env.AUTOMATION_SCHEDULER_BATCH_LIMIT, DEFAULT_BATCH_LIMIT),
    });
  } finally {
    await releaseSchedulerLock();
    running = false;
  }
}

export function startAutomationScheduler() {
  if (timer || process.env.AUTOMATION_SCHEDULER_DISABLED === '1') return;
  const intervalMs = readPositiveInteger(process.env.AUTOMATION_SCHEDULER_INTERVAL_MS, DEFAULT_INTERVAL_MS);

  timer = setInterval(() => {
    void runAutomationSchedulerTick().catch((error) => {
      console.error('[automation-scheduler] tick failed', error);
    });
  }, intervalMs);
  timer.unref?.();

  void runAutomationSchedulerTick().catch((error) => {
    console.error('[automation-scheduler] initial tick failed', error);
  });
}

export function stopAutomationScheduler() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
