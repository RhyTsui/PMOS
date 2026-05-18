import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { OutboxService } from '../../src/core/outboxService';
import { FinalStateValidationService } from '../../src/core/finalStateValidationService';
import type { TaskSsotTask } from '../../src/shared/schemas';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-outbox-'));
  return new FileStore(root);
}

describe('OutboxService and FinalStateValidationService', () => {
  it('queues and updates sync envelopes through the outbox shell', async () => {
    const store = createStore();
    const outbox = new OutboxService(store);

    const envelope = await outbox.enqueue({
      taskId: 'task-1',
      entityType: 'product-output',
      entityId: 'output-1',
      targetSystem: 'figma',
      action: 'create-frame',
      payloadRef: 'docs/product-office/outputs/output-1.md',
    });
    expect(envelope.status).toBe('pending');

    const retried = await outbox.retry(envelope.syncId, { error: 'temporary network issue' });
    expect(retried.retryCount).toBe(1);
    expect(['pending', 'failed']).toContain(retried.status);

    const completed = await outbox.markCompleted(envelope.syncId, { receiptRef: 'figma://frame/123' });
    expect(completed.status).toBe('completed');

    const items = await outbox.listEnvelopes();
    expect(items).toHaveLength(1);
    expect(items[0]?.receiptRef).toBe('figma://frame/123');
    expect(items[0]?.targetCategory).toBe('design');
    const summary = await outbox.buildRuntimeSummary();
    expect(summary.byCategory.some((item) => item.targetCategory === 'design')).toBe(true);
  });

  it('dispatches pending envelopes through adapter routing and writes synthetic receipts', async () => {
    const store = createStore();
    const outbox = new OutboxService(store);

    await store.write('docs/payloads/release.md', '# Release payload\n');
    const envelope = await outbox.enqueue({
      taskId: 'task-2',
      entityType: 'release-note',
      entityId: 'rel-1',
      targetSystem: 'github',
      action: 'publish',
      payloadRef: 'docs/payloads/release.md',
    });

    const dispatched = await outbox.dispatchEnvelope(envelope.syncId, {});
    expect(dispatched.status).toBe('completed');
    expect(dispatched.adapterKey).toBe('repo-publish');
    expect(dispatched.receiptRef).toContain('outbox://repo-publish');

    const items = await outbox.listEnvelopes();
    expect(items[0]?.status).toBe('completed');
    expect(items[0]?.receiptRef).toContain('outbox://repo-publish');
  });

  it('retries envelopes when payload refs are missing during dispatch', async () => {
    const store = createStore();
    const outbox = new OutboxService(store);

    const envelope = await outbox.enqueue({
      taskId: 'task-3',
      entityType: 'knowledge-digest',
      entityId: 'digest-1',
      targetSystem: 'notion',
      action: 'publish',
      payloadRef: 'docs/payloads/missing.md',
    });

    const dispatched = await outbox.dispatchEnvelope(envelope.syncId, {});
    expect(dispatched.status).toBe('pending');
    expect(dispatched.error).toContain('payload_ref_missing');

    const items = await outbox.listEnvelopes();
    expect(items[0]?.retryCount).toBe(1);
    expect(items[0]?.status).toBe('pending');
  });

  it('judges task final-state readiness from task ssot evidence', () => {
    const validator = new FinalStateValidationService();
    const task: TaskSsotTask = {
      taskId: 'task-ready',
      sourceType: 'workflow-run-task',
      sourceRef: 'run-1',
      originalDemandRefs: ['demand-1'],
      subprojectId: null,
      title: 'Ready task',
      summary: 'ready for delivery',
      collaborationLevel: 'L1',
      status: 'completed',
      currentStage: 'handoff',
      currentOwnerAgentId: 'workflow-role:delivery',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stages: [],
      gateChecks: [
        {
          taskId: 'task-ready',
          gateId: 'asset-backwrite-gate',
          status: 'pass',
          reason: 'artifacts present',
          evidencePaths: ['docs/product-office/outputs/output-1.md'],
          checkedAt: new Date().toISOString(),
        },
      ],
      gateHistory: [],
      artifactLinks: [
        {
          taskId: 'task-ready',
          artifactType: 'doc',
          artifactId: 'artifact-1',
          artifactPath: 'docs/product-office/outputs/output-1.md',
          roleInTask: 'final-delivery',
        },
      ],
      agentAssignments: [],
      syncEnvelopes: [],
      continuation: {
        mainlineLabel: 'Ready task',
        nextSafeStep: null,
        parkedLines: [],
        blockerType: null,
        resumeAnchor: null,
        lastMeaningfulAdvanceAt: new Date().toISOString(),
        currentAttention: null,
      },
    };

    const report = validator.evaluateTask(task);
    expect(report.status).toBe('ready');
    expect(report.checks.every((check) => check.status === 'pass')).toBe(true);
    expect(report.browserVerification).toBeNull();
  });
});
