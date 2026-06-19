import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeDataPath } from './runtime-data-path';
import type { ModelResilienceConfig, ModelUseCase } from '@/contracts/model-service';

export type ModelRetryableErrorKind =
  | 'network'
  | 'timeout'
  | 'http_429'
  | 'http_502'
  | 'http_503'
  | 'http_504'
  | 'non_retryable';

export type ModelBreakerState = 'closed' | 'open' | 'half_open';

export interface RetryClassification {
  retryable: boolean;
  kind: ModelRetryableErrorKind;
  statusCode?: number;
  message: string;
}

export interface ModelBreakerSnapshot {
  key: string;
  state: ModelBreakerState;
  failureCount: number;
  openUntil?: string;
  halfOpenProbeReservedAt?: string;
  lastFailureAt?: string;
  lastSuccessAt?: string;
  lastErrorKind?: ModelRetryableErrorKind;
  lastErrorMessage?: string;
  lastStatusCode?: number;
}

interface ModelResilienceStoreFile {
  version: 1;
  updatedAt: string;
  breakers: Record<string, ModelBreakerSnapshot>;
}

const STORE_PATH = runtimeDataPath('model-resilience-state.json');
const STORE_VERSION: ModelResilienceStoreFile['version'] = 1;

let storeCache: ModelResilienceStoreFile | null = null;
let storeLoadPromise: Promise<ModelResilienceStoreFile> | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function defaultStore(): ModelResilienceStoreFile {
  return {
    version: STORE_VERSION,
    updatedAt: nowIso(),
    breakers: {},
  };
}

function normalizeBreaker(snapshot: Partial<ModelBreakerSnapshot> & { key: string }): ModelBreakerSnapshot {
  return {
    key: snapshot.key,
    state: snapshot.state === 'open' || snapshot.state === 'half_open' ? snapshot.state : 'closed',
    failureCount: Number.isFinite(snapshot.failureCount) ? Math.max(0, Math.floor(snapshot.failureCount || 0)) : 0,
    openUntil: snapshot.openUntil,
    halfOpenProbeReservedAt: snapshot.halfOpenProbeReservedAt,
    lastFailureAt: snapshot.lastFailureAt,
    lastSuccessAt: snapshot.lastSuccessAt,
    lastErrorKind: snapshot.lastErrorKind,
    lastErrorMessage: snapshot.lastErrorMessage,
    lastStatusCode: Number.isFinite(snapshot.lastStatusCode) ? Math.floor(snapshot.lastStatusCode || 0) : undefined,
  };
}

function normalizeStore(input?: Partial<ModelResilienceStoreFile> | null): ModelResilienceStoreFile {
  const breakers = Object.fromEntries(
    Object.entries(input?.breakers || {}).map(([key, snapshot]) => [key, normalizeBreaker({ ...(snapshot || {}), key })]),
  );
  return {
    version: STORE_VERSION,
    updatedAt: input?.updatedAt || nowIso(),
    breakers,
  };
}

async function loadStore(): Promise<ModelResilienceStoreFile> {
  if (storeCache) return storeCache;
  if (!storeLoadPromise) {
    storeLoadPromise = (async () => {
      try {
        const raw = await readFile(STORE_PATH, 'utf8');
        const parsed = JSON.parse(raw) as Partial<ModelResilienceStoreFile>;
        storeCache = normalizeStore(parsed);
      } catch {
        storeCache = defaultStore();
      }
      return storeCache;
    })();
  }
  return storeLoadPromise;
}

async function saveStore(store: ModelResilienceStoreFile): Promise<void> {
  storeCache = normalizeStore(store);
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(storeCache, null, 2), 'utf8');
}

function getBreakerKey(input: { useCase: ModelUseCase; modelProfileId?: string; modelName?: string }): string {
  return [input.useCase, input.modelProfileId || 'default-profile', input.modelName || 'default-model'].join('|');
}

function isRetryableStatus(statusCode?: number): boolean {
  return statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

export function classifyModelError(error: unknown): RetryClassification {
  const message = errorMessage(error);
  const anyError = error as {
    name?: string;
    code?: string;
    statusCode?: number;
    response?: { status?: number };
    isAxiosError?: boolean;
  } | null | undefined;
  const statusCode = anyError?.response?.status || anyError?.statusCode;
  if (isRetryableStatus(statusCode)) {
    return {
      retryable: true,
      kind: `http_${statusCode}` as ModelRetryableErrorKind,
      statusCode,
      message,
    };
  }

  const normalized = `${anyError?.name || ''} ${anyError?.code || ''} ${message}`.toLowerCase();
  if (
    normalized.includes('timeout')
    || normalized.includes('timed out')
    || normalized.includes('etimedout')
    || normalized.includes('econnaborted')
    || normalized.includes('aborterror')
    || normalized.includes('request aborted')
  ) {
    return { retryable: true, kind: 'timeout', message };
  }

  if (
    normalized.includes('econnreset')
    || normalized.includes('econnrefused')
    || normalized.includes('enotfound')
    || normalized.includes('eai_again')
    || normalized.includes('socket hang up')
    || normalized.includes('network error')
    || normalized.includes('fetch failed')
    || normalized.includes('epipe')
    || normalized.includes('connection error')
  ) {
    return { retryable: true, kind: 'network', message };
  }

  return { retryable: false, kind: 'non_retryable', statusCode, message };
}

export function buildModelBreakerKey(input: { useCase: ModelUseCase; modelProfileId?: string; modelName?: string }): string {
  return getBreakerKey(input);
}

export async function getModelBreakerSnapshot(key: string): Promise<ModelBreakerSnapshot | undefined> {
  const store = await loadStore();
  return store.breakers[key];
}

export async function shouldSkipModelCall(key: string, config: ModelResilienceConfig): Promise<{ skip: boolean; snapshot: ModelBreakerSnapshot; reason?: string }> {
  const store = await loadStore();
  const current = store.breakers[key] || normalizeBreaker({ key });
  const now = Date.now();
  const probeStaleAfterMs = Math.max(
    config.connectTimeoutMs,
    config.responseTimeoutMs,
    1000,
  );

  if (current.state === 'open') {
    const openUntil = current.openUntil ? Date.parse(current.openUntil) : 0;
    if (openUntil > now) {
      return {
        skip: true,
        snapshot: current,
        reason: `breaker_open_until:${current.openUntil}`,
      };
    }
  }

  if (current.state === 'half_open' && current.halfOpenProbeReservedAt) {
    const reservedAt = Date.parse(current.halfOpenProbeReservedAt);
    if (Number.isFinite(reservedAt) && now - reservedAt > probeStaleAfterMs) {
      const refreshed: ModelBreakerSnapshot = {
        ...current,
        halfOpenProbeReservedAt: undefined,
      };
      store.breakers[key] = refreshed;
      await saveStore(store);
      return { skip: false, snapshot: refreshed };
    }
    return {
      skip: true,
      snapshot: current,
      reason: 'breaker_half_open_probe_in_progress',
    };
  }

  if (current.state === 'open' && current.openUntil && Date.parse(current.openUntil) <= now) {
    const snapshot: ModelBreakerSnapshot = {
      ...current,
      state: 'half_open',
      halfOpenProbeReservedAt: nowIso(),
    };
    store.breakers[key] = snapshot;
    await saveStore(store);
    return { skip: false, snapshot };
  }

  return { skip: false, snapshot: current };
}

export async function recordModelCallSuccess(key: string): Promise<void> {
  const store = await loadStore();
  const current = store.breakers[key] || normalizeBreaker({ key });
  store.breakers[key] = {
    ...current,
    state: 'closed',
    failureCount: 0,
    openUntil: undefined,
    halfOpenProbeReservedAt: undefined,
    lastSuccessAt: nowIso(),
  };
  await saveStore(store);
}

export async function recordModelCallFailure(
  key: string,
  config: ModelResilienceConfig,
  error: unknown,
): Promise<ModelBreakerSnapshot> {
  const store = await loadStore();
  const current = store.breakers[key] || normalizeBreaker({ key });
  const classification = classifyModelError(error);
  const nextFailureCount = current.state === 'half_open'
    ? config.breakerFailureThreshold
    : current.failureCount + 1;
  const shouldOpen = nextFailureCount >= config.breakerFailureThreshold;
  const nextSnapshot: ModelBreakerSnapshot = shouldOpen
    ? {
      ...current,
      state: 'open',
      failureCount: 0,
      openUntil: new Date(Date.now() + config.breakerOpenMs).toISOString(),
      halfOpenProbeReservedAt: undefined,
      lastFailureAt: nowIso(),
      lastErrorKind: classification.kind,
      lastErrorMessage: classification.message,
      lastStatusCode: classification.statusCode,
    }
    : {
      ...current,
      state: 'closed',
      failureCount: nextFailureCount,
      lastFailureAt: nowIso(),
      lastErrorKind: classification.kind,
      lastErrorMessage: classification.message,
      lastStatusCode: classification.statusCode,
    };
  store.breakers[key] = nextSnapshot;
  await saveStore(store);
  return nextSnapshot;
}

export function getRetryDelaysMs(config: ModelResilienceConfig): number[] {
  return config.retryBackoffMs.slice(0, Math.max(0, config.maxRetries));
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
