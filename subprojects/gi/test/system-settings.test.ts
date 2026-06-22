import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'net';
import { initializeDatabase, getDatabase, closeDatabase } from '../src/lib/database.js';
import { SystemSettingsRepository } from '../src/repositories/system-settings-repository.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { SeedService } from '../src/services/seed/index.js';
import { createApiRouter } from '../src/routes/index.js';

const TEST_SETTING_KEY = 'test.persistence.setting';
const TEST_SOURCE_NAME = '系统持久化测试源';
const TEST_SEED_TEXT = '系统持久化测试种子';

describe('系统配置与核心资产持久化', () => {
  beforeAll(() => {
    initializeDatabase();
    cleanupTestRows();
  });

  afterAll(() => {
    initializeDatabase();
    cleanupTestRows();
    closeDatabase();
  });

  it('initializeDatabase 会应用 system_settings 迁移', () => {
    const db = getDatabase();
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='system_settings'")
      .get() as { name: string } | undefined;
    const migration = db
      .prepare('SELECT id FROM _migrations WHERE id = ?')
      .get('004') as { id: string } | undefined;

    expect(table?.name).toBe('system_settings');
    expect(migration?.id).toBe('004');
  });

  it('SystemSettingsRepository 可写入、读取、覆盖 JSON 配置', () => {
    const repo = new SystemSettingsRepository();
    repo.setJson(TEST_SETTING_KEY, { enabled: true, cron: '*/15 * * * *' });
    expect(repo.getJson(TEST_SETTING_KEY, { enabled: false })).toEqual({
      enabled: true,
      cron: '*/15 * * * *',
    });

    repo.setJson(TEST_SETTING_KEY, { enabled: false, cron: '0 * * * *' });
    expect(repo.getJson(TEST_SETTING_KEY, null)).toEqual({
      enabled: false,
      cron: '0 * * * *',
    });
  });

  it('保存的配置关闭并重新打开数据库后仍可读取', () => {
    const repo = new SystemSettingsRepository();
    repo.setJson(TEST_SETTING_KEY, { value: 'persisted' });

    closeDatabase();
    initializeDatabase();

    const reopenedRepo = new SystemSettingsRepository();
    expect(reopenedRepo.getJson(TEST_SETTING_KEY, null)).toEqual({ value: 'persisted' });
  });

  it('非法 cron 通过系统 API 返回 400 且不覆盖原配置', async () => {
    const settingsRepo = new SystemSettingsRepository();

    const app = express();
    app.use(express.json());
    app.use('/api/v1', createApiRouter());
    const server = app.listen(0);

    try {
      const { port } = server.address() as AddressInfo;
      await fetch(`http://127.0.0.1:${port}/api/v1/system/settings/scheduler`);
      const originalConfig = settingsRepo.getJson('scheduler.config', null);

      const response = await fetch(`http://127.0.0.1:${port}/api/v1/system/settings/scheduler`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultCron: 'not-a-cron' }),
      });

      expect(response.status).toBe(400);
      expect(settingsRepo.getJson('scheduler.config', null)).toEqual(originalConfig);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('信源和种子在数据库重连后仍存在', () => {
    const sourceRepo = new IntelSourceRepository();
    const seedService = new SeedService();

    const source = sourceRepo.create({
      name: TEST_SOURCE_NAME,
      shortName: 'PERSIST',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://persist.example.com',
      feedUrl: 'https://persist.example.com/rss.xml',
      config: {},
      schedule: { cron: '0 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
      enabled: true,
      priority: 'P2',
      tags: ['persistence-test'],
    });

    const seed = seedService.createSeed({
      seedType: 'entity',
      text: TEST_SEED_TEXT,
      entityType: 'game',
      aliases: [],
      score: 60,
      tags: ['persistence-test'],
    });

    closeDatabase();
    initializeDatabase();

    const reopenedSourceRepo = new IntelSourceRepository();
    const reopenedSeedService = new SeedService();

    expect(reopenedSourceRepo.findById(source.id)?.name).toBe(TEST_SOURCE_NAME);
    expect(reopenedSeedService.getSeed(seed.id)?.text).toBe(TEST_SEED_TEXT);
  });
});

function cleanupTestRows(): void {
  const db = getDatabase();
  db.prepare('DELETE FROM system_settings WHERE key = ?').run(TEST_SETTING_KEY);
  db.prepare('DELETE FROM intel_sources WHERE name = ?').run(TEST_SOURCE_NAME);
  db.prepare('DELETE FROM seeds WHERE text = ?').run(TEST_SEED_TEXT);
}
