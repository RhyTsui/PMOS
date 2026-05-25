import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { DocumentGovernanceService } from '../../src/core/documentGovernanceService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-docgov-'));
  return new FileStore(root);
}

describe('DocumentGovernanceService', () => {
  it('registers and lists truth-source entries', async () => {
    const store = createStore();
    await store.write('docs/operations/current-version-progress.md', '# current version progress');
    const service = new DocumentGovernanceService(store);

    const entry = await service.upsertEntry({
      topicKey: 'platform-current-version-progress',
      title: 'Current Version Progress',
      path: 'docs/operations/current-version-progress.md',
      status: 'active',
      tags: ['platform', 'version'],
    });

    const entries = await service.listEntries();

    expect(entry.status).toBe('active');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.topicKey).toBe('platform-current-version-progress');
    expect(entries[0]?.tags).toContain('platform');
  });

  it('audits duplicate active topics and missing successor links', async () => {
    const store = createStore();
    await store.write('docs/operations/a.md', '# A');
    await store.write('docs/operations/b.md', '# B');
    const service = new DocumentGovernanceService(store);

    await service.upsertEntry({
      topicKey: 'platform-direction',
      title: 'Direction A',
      path: 'docs/operations/a.md',
      status: 'active',
    });
    await service.upsertEntry({
      topicKey: 'platform-direction',
      title: 'Direction B',
      path: 'docs/operations/b.md',
      status: 'active',
    });
    await service.upsertEntry({
      topicKey: 'platform-legacy-direction',
      title: 'Legacy Direction',
      path: 'docs/operations/legacy.md',
      status: 'superseded',
    });

    const audit = await service.audit();

    expect(audit.issueCount).toBeGreaterThanOrEqual(3);
    expect(audit.issues.some((issue) => issue.code === 'duplicate-active-topic')).toBe(true);
    expect(audit.issues.some((issue) => issue.code === 'superseded-without-successor')).toBe(true);
    expect(audit.issues.some((issue) => issue.code === 'entry-file-missing')).toBe(true);
  });

  it('passes clean registry and persists latest audit', async () => {
    const store = createStore();
    await store.write('docs/operations/v1.md', '# v1');
    await store.write('docs/operations/v2.md', '# v2');
    const service = new DocumentGovernanceService(store);

    await service.upsertEntry({
      topicKey: 'platform-version-direction',
      title: 'v2 direction',
      path: 'docs/operations/v2.md',
      status: 'active',
      supersedes: ['docs/operations/v1.md'],
    });
    await service.upsertEntry({
      topicKey: 'platform-version-direction-history',
      title: 'v1 direction',
      path: 'docs/operations/v1.md',
      status: 'superseded',
      successorPath: 'docs/operations/v2.md',
    });

    const audit = await service.audit();
    const latestAudit = await service.readLatestAudit();

    expect(audit.issueCount).toBe(0);
    expect(latestAudit?.summary).toContain('passed');
  });

  it('checks artifact flow against registered truth sources and latest audit', async () => {
    const store = createStore();
    await store.write('docs/operations/release.md', '# release');
    const service = new DocumentGovernanceService(store);

    await service.upsertEntry({
      topicKey: 'release-package',
      title: 'Release Package',
      path: 'docs/operations/release.md',
      status: 'active',
    });
    await service.audit();

    const pass = await service.evaluateArtifactFlow({
      artifactPaths: ['docs/operations/release.md'],
      requireRegistered: true,
      source: 'unit-test',
    });
    expect(pass.status).toBe('pass');
    expect(pass.blocking).toBe(false);

    const block = await service.evaluateArtifactFlow({
      artifactPaths: ['docs/operations/unregistered.md'],
      requireRegistered: true,
      source: 'unit-test',
    });
    expect(block.status).toBe('block');
    expect(block.unregisteredArtifacts).toContain('docs/operations/unregistered.md');
  });
});
