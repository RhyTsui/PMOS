import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { PlanArchiveService } from '../../src/core/planArchiveService';

function createService() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-plan-archive-'));
  const store = new FileStore(root);
  return { store, service: new PlanArchiveService(store) };
}

describe('PlanArchiveService', () => {
  it('archives platform plans into versioned plan threads', async () => {
    const { store, service } = createService();

    const first = await service.archivePlan({
      title: 'PMOS plan archive',
      content: '# Plan\n\nFirst version',
      source: 'codex-plan',
      taskId: 'task-1',
      createdAt: '2026-05-24T01:00:00.000Z',
    });
    const second = await service.archivePlan({
      title: 'PMOS plan archive',
      content: '# Plan\n\nSecond version',
      source: 'codex-plan',
      taskId: 'task-1',
      planThreadId: first.record.planThreadId,
      createdAt: '2026-05-24T01:01:00.000Z',
    });
    const records = await service.listArchives();

    expect(first.record.version).toBe(1);
    expect(second.record.version).toBe(2);
    expect(second.record.supersedes).toBe(first.record.path);
    expect(records.find((record) => record.id === first.record.id)?.status).toBe('superseded');
    expect(records.find((record) => record.id === second.record.id)?.status).toBe('active');
    expect(await store.exists(second.record.path)).toBe(true);
  });

  it('archives subproject plans under the subproject docs directory', async () => {
    const { service } = createService();

    const result = await service.archivePlan({
      title: 'AD rollout plan',
      content: '# Plan\n\nSubproject version',
      source: 'manual',
      subprojectId: 'ad',
      createdAt: '2026-05-24T02:00:00.000Z',
    });

    expect(result.record.path).toContain('subprojects/ad/docs/plan-archives/2026/05/');
    expect(result.record.subprojectId).toBe('ad');
  });

  it('does not duplicate identical active content for the same thread', async () => {
    const { service } = createService();

    const first = await service.archivePlan({
      title: 'Same plan',
      content: '# Plan\n\nSame content',
      source: 'manual',
      taskId: 'task-2',
    });
    const second = await service.archivePlan({
      title: 'Same plan',
      content: '# Plan\n\nSame content',
      source: 'manual',
      taskId: 'task-2',
      planThreadId: first.record.planThreadId,
    });

    expect(second.duplicate).toBe(true);
    expect(second.record.id).toBe(first.record.id);
    expect(await service.listArchives()).toHaveLength(1);
  });
});
