import { afterEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { checkNotionConfig } from '../../src/core/notionService';
import { ExternalConnectorService } from '../../src/core/externalConnectorService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-notion-'));
  return new FileStore(root);
}

const ORIGINAL_ENV = {
  NOTION_API_KEY: process.env.NOTION_API_KEY,
  NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
  NOTION_PAGE_ID: process.env.NOTION_PAGE_ID,
};

describe('Notion configuration', () => {
  afterEach(() => {
    process.env.NOTION_API_KEY = ORIGINAL_ENV.NOTION_API_KEY;
    process.env.NOTION_DATABASE_ID = ORIGINAL_ENV.NOTION_DATABASE_ID;
    process.env.NOTION_PAGE_ID = ORIGINAL_ENV.NOTION_PAGE_ID;
  });

  it('treats page mode as configured', async () => {
    process.env.NOTION_API_KEY = 'test-key';
    delete process.env.NOTION_DATABASE_ID;
    process.env.NOTION_PAGE_ID = 'test-page';

    expect(checkNotionConfig()).toEqual({
      configured: true,
      missing: [],
    });

    const service = new ExternalConnectorService(createStore());
    const status = await service.getStatus();
    expect(status.notion.configured).toBe(true);
    expect(status.notion.targetMode).toBe('page');
    expect(status.notion.missing).toEqual([]);
  });

  it('requires either database or page target', async () => {
    process.env.NOTION_API_KEY = 'test-key';
    delete process.env.NOTION_DATABASE_ID;
    delete process.env.NOTION_PAGE_ID;

    expect(checkNotionConfig()).toEqual({
      configured: false,
      missing: ['NOTION_DATABASE_ID or NOTION_PAGE_ID'],
    });

    const service = new ExternalConnectorService(createStore());
    const status = await service.getStatus();
    expect(status.notion.configured).toBe(false);
    expect(status.notion.targetMode).toBe('unconfigured');
    expect(status.notion.missing).toContain('NOTION_DATABASE_ID or NOTION_PAGE_ID');
  });
});
