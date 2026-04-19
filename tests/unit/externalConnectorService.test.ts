import { describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync } from 'node:fs';
import { FileStore } from '../../src/core/fileStore';
import { ExternalConnectorService } from '../../src/core/externalConnectorService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-external-connectors-'));
  return new FileStore(root);
}

describe('ExternalConnectorService', () => {
  it('writes web fetch artifacts into the governed inbox', async () => {
    const store = createStore();
    const service = new ExternalConnectorService(store, undefined, async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '<html><head><title>Example Article</title></head><body><h1>Hello</h1><p>Product signal</p></body></html>',
      json: async () => ({}),
    }));

    const artifact = await service.fetchWebPage({ url: 'https://example.com/article' });

    expect(artifact.title).toBe('Example Article');
    expect(artifact.sourcePath).toContain('docs/sources/inbox/web-fetch-');
    expect(await store.read(artifact.sourcePath)).toContain('Product signal');
  });

  it('imports DingTalk meeting notes into inbox for normalization', async () => {
    const store = createStore();
    const service = new ExternalConnectorService(store);

    const imported = await service.importDingTalkMeetingNote({
      title: 'Knowledge base demo sync',
      content: 'Decision: rebuild the knowledge-base demo project. Action: generate PM outputs.',
    });

    expect(imported.sourcePath).toContain('docs/sources/inbox/dingtalk-meeting-');
    expect(await store.read(imported.sourcePath)).toContain('Knowledge base demo sync');
  });
});
