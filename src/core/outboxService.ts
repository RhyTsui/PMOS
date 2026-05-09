import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { getOutboxEnvelopeDirectoryPath, getOutboxEnvelopePath } from './projectPaths.js';
import type { TaskSsotSyncEnvelope, TaskSsotSyncStatus } from '../shared/schemas.js';

export class OutboxService {
  constructor(private readonly store: FileStore) {}

  async listEnvelopes(subprojectId?: string | null, status?: TaskSsotSyncStatus) {
    const relativeDir = getOutboxEnvelopeDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [] as TaskSsotSyncEnvelope[];
    }
    const files = await this.store.list(relativeDir);
    const items = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => this.store.readJson<TaskSsotSyncEnvelope>(file)),
    );
    return items
      .filter((item) => (status ? item.status === status : true))
      .sort((a, b) => (b.scheduledAt ?? b.completedAt ?? '').localeCompare(a.scheduledAt ?? a.completedAt ?? ''));
  }

  async enqueue(input: {
    taskId: string;
    entityType: string;
    entityId: string;
    targetSystem: string;
    action: string;
    payloadRef: string;
    subprojectId?: string | null;
    maxRetries?: number;
  }) {
    const now = new Date().toISOString();
    const envelope: TaskSsotSyncEnvelope = {
      syncId: `sync-${randomUUID()}`,
      taskId: input.taskId,
      entityType: input.entityType,
      entityId: input.entityId,
      targetSystem: input.targetSystem,
      action: input.action,
      payloadRef: input.payloadRef,
      status: 'pending',
      retryCount: 0,
      maxRetries: input.maxRetries ?? 3,
      scheduledAt: now,
      completedAt: null,
      receiptRef: null,
      error: null,
    };
    await this.store.writeJson(getOutboxEnvelopePath(envelope.syncId, input.subprojectId), envelope);
    return envelope;
  }

  async markCompleted(syncId: string, input: { subprojectId?: string | null; receiptRef?: string | null }) {
    const target = getOutboxEnvelopePath(syncId, input.subprojectId);
    const current = await this.store.readJson<TaskSsotSyncEnvelope>(target);
    const next: TaskSsotSyncEnvelope = {
      ...current,
      status: 'completed',
      completedAt: new Date().toISOString(),
      receiptRef: input.receiptRef ?? null,
      error: null,
    };
    await this.store.writeJson(target, next);
    return next;
  }

  async retry(syncId: string, input: { subprojectId?: string | null; error?: string | null }) {
    const target = getOutboxEnvelopePath(syncId, input.subprojectId);
    const current = await this.store.readJson<TaskSsotSyncEnvelope>(target);
    const next: TaskSsotSyncEnvelope = {
      ...current,
      status: current.retryCount + 1 >= current.maxRetries ? 'failed' : 'pending',
      retryCount: current.retryCount + 1,
      scheduledAt: new Date().toISOString(),
      error: input.error ?? current.error,
    };
    await this.store.writeJson(target, next);
    return next;
  }

  async drop(syncId: string, input: { subprojectId?: string | null; error?: string | null }) {
    const target = getOutboxEnvelopePath(syncId, input.subprojectId);
    const current = await this.store.readJson<TaskSsotSyncEnvelope>(target);
    const next: TaskSsotSyncEnvelope = {
      ...current,
      status: 'dropped',
      error: input.error ?? current.error,
      completedAt: new Date().toISOString(),
    };
    await this.store.writeJson(target, next);
    return next;
  }
}
