import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { getOutboxEnvelopeDirectoryPath, getOutboxEnvelopePath } from './projectPaths.js';
import type { TaskSsotSyncEnvelope, TaskSsotSyncStatus } from '../shared/schemas.js';

type DispatchResult = {
  syncId: string;
  status: TaskSsotSyncEnvelope['status'];
  receiptRef: string | null;
  error: string | null;
  adapterKey: string | null;
};

type DispatchPendingOptions = {
  limit?: number;
  targetCategory?: TaskSsotSyncEnvelope['targetCategory'];
};

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
    targetCategory?: TaskSsotSyncEnvelope['targetCategory'];
    topicKey?: string | null;
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
      targetCategory: input.targetCategory ?? this.inferTargetCategory(input.targetSystem),
      topicKey: input.topicKey ?? `${input.entityType}:${input.action}`,
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

  async dispatchEnvelope(syncId: string, input: { subprojectId?: string | null }): Promise<DispatchResult> {
    const target = getOutboxEnvelopePath(syncId, input.subprojectId);
    const current = await this.store.readJson<TaskSsotSyncEnvelope>(target);
    const adapterKey = this.resolveAdapterKey(current);
    if (current.status !== 'processing') {
      await this.store.writeJson(target, {
        ...current,
        status: 'processing',
        error: null,
      } satisfies TaskSsotSyncEnvelope);
    }
    if (!(await this.store.exists(current.payloadRef))) {
      const failed = await this.retry(syncId, {
        subprojectId: input.subprojectId,
        error: `payload_ref_missing:${current.payloadRef}`,
      });
      return {
        syncId,
        status: failed.status,
        receiptRef: failed.receiptRef,
        error: failed.error,
        adapterKey,
      };
    }

    const receiptRef = this.buildSyntheticReceipt(current, adapterKey);
    const completed = await this.markCompleted(syncId, {
      subprojectId: input.subprojectId,
      receiptRef,
    });
    return {
      syncId,
      status: completed.status,
      receiptRef: completed.receiptRef,
      error: completed.error,
      adapterKey,
    };
  }

  async dispatchPending(subprojectId?: string | null, options: DispatchPendingOptions = {}) {
    const items = await this.listEnvelopes(subprojectId);
    const limit = Math.max(0, options.limit ?? Number.POSITIVE_INFINITY);
    const pending = items
      .filter((item) => item.status === 'pending' || item.status === 'processing')
      .filter((item) => (options.targetCategory ? item.targetCategory === options.targetCategory : true))
      .slice(0, limit);
    const results: DispatchResult[] = [];
    for (const item of pending) {
      results.push(await this.dispatchEnvelope(item.syncId, { subprojectId }));
    }
    return results;
  }

  async buildRuntimeSummary(subprojectId?: string | null) {
    const items = await this.listEnvelopes(subprojectId);
    const byTargetSystem = Object.entries(
      items.reduce<Record<string, number>>((acc, item) => {
        acc[item.targetSystem] = (acc[item.targetSystem] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([targetSystem, total]) => ({ targetSystem, total }));
    const byCategory = Object.entries(
      items.reduce<Record<string, number>>((acc, item) => {
        acc[item.targetCategory] = (acc[item.targetCategory] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([targetCategory, total]) => ({ targetCategory, total }));
    const openItems = items.filter((item) => item.status === 'pending' || item.status === 'processing');
    const retryExhausted = items.filter((item) => item.status === 'failed' || item.retryCount >= item.maxRetries);
    const oldestPending = openItems
      .filter((item) => item.scheduledAt)
      .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))[0] ?? null;
    const nextPending = openItems
      .filter((item) => item.scheduledAt)
      .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))[0] ?? null;
    return {
      total: items.length,
      pending: items.filter((item) => item.status === 'pending' || item.status === 'processing').length,
      processing: items.filter((item) => item.status === 'processing').length,
      completed: items.filter((item) => item.status === 'completed').length,
      failed: items.filter((item) => item.status === 'failed').length,
      dropped: items.filter((item) => item.status === 'dropped').length,
      retryExhausted: retryExhausted.length,
      oldestPendingAt: oldestPending?.scheduledAt ?? null,
      nextPending: nextPending
        ? {
            syncId: nextPending.syncId,
            taskId: nextPending.taskId,
            targetSystem: nextPending.targetSystem,
            targetCategory: nextPending.targetCategory,
            scheduledAt: nextPending.scheduledAt,
          }
        : null,
      byTargetSystem,
      byCategory,
    };
  }

  private inferTargetCategory(targetSystem: string): TaskSsotSyncEnvelope['targetCategory'] {
    const normalized = targetSystem.toLowerCase();
    if (/notion|dataki|knowledge|wiki/.test(normalized)) {
      return 'knowledge';
    }
    if (/figma|design|pixso/.test(normalized)) {
      return 'design';
    }
    if (/github|git|repo/.test(normalized)) {
      return 'repo';
    }
    if (/release|deploy|ops|slack|discord|mail/.test(normalized)) {
      return 'ops';
    }
    if (/delivery|artifact|handoff/.test(normalized)) {
      return 'delivery';
    }
    return 'custom';
  }

  private resolveAdapterKey(envelope: TaskSsotSyncEnvelope) {
    const normalized = envelope.targetSystem.toLowerCase();
    if (/notion|dataki|knowledge|wiki/.test(normalized)) {
      return 'knowledge-publish';
    }
    if (/figma|design|pixso/.test(normalized)) {
      return 'design-publish';
    }
    if (/github|git|repo/.test(normalized)) {
      return 'repo-publish';
    }
    if (/release|deploy|ops|slack|discord|mail/.test(normalized)) {
      return 'ops-notify';
    }
    if (/delivery|artifact|handoff/.test(normalized)) {
      return 'delivery-handoff';
    }
    return `custom:${envelope.targetCategory}`;
  }

  private buildSyntheticReceipt(envelope: TaskSsotSyncEnvelope, adapterKey: string) {
    const target = encodeURIComponent(envelope.targetSystem);
    const topic = encodeURIComponent(envelope.topicKey ?? `${envelope.entityType}:${envelope.action}`);
    return `outbox://${adapterKey}/${target}/${envelope.action}/${topic}`;
  }
}
