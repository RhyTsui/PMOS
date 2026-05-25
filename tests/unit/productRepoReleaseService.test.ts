import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { ProductRepoReleaseService } from '../../src/core/productRepoReleaseService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-release-'));
  return new FileStore(root);
}

describe('ProductRepoReleaseService', () => {
  it('writes a product repo readiness package with parked tracks and validation commands', async () => {
    const store = createStore();
    const service = new ProductRepoReleaseService(store);

    const result = await service.buildReadinessPackage({
      versionLabel: 'v1.0-test',
      parkedTracks: ['pmos-page-unified-entry'],
      validationCommands: ['npm run validate'],
    });

    expect(result.versionLabel).toBe('v1.0-test');
    expect(result.parkedTracks).toContain('pmos-page-unified-entry');
    expect(await store.exists(result.jsonPath)).toBe(true);
    expect(await store.exists(result.markdownPath)).toBe(true);
  });
});
