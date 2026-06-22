/**
 * 通用系统配置 Repository
 *
 * 用 SQLite 保存后台运行配置，前端和进程内状态都不作为权威来源。
 */
import type { Database } from 'better-sqlite3';
import { getDatabase } from '../lib/database.js';

interface SystemSettingRow {
  value_json: string;
}

export class SystemSettingsRepository {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  getJson<T>(key: string, defaultValue: T): T {
    const row = this.db
      .prepare('SELECT value_json FROM system_settings WHERE key = ?')
      .get(key) as SystemSettingRow | undefined;

    if (!row) {
      return defaultValue;
    }

    try {
      return JSON.parse(row.value_json) as T;
    } catch {
      return defaultValue;
    }
  }

  setJson<T>(
    key: string,
    value: T,
    options: { schemaVersion?: number; description?: string } = {},
  ): void {
    this.db
      .prepare(
        `INSERT INTO system_settings
           (key, value_json, schema_version, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(key) DO UPDATE SET
           value_json = excluded.value_json,
           schema_version = excluded.schema_version,
           description = COALESCE(excluded.description, system_settings.description),
           updated_at = datetime('now')`,
      )
      .run(
        key,
        JSON.stringify(value),
        options.schemaVersion ?? 1,
        options.description ?? null,
      );
  }

  delete(key: string): boolean {
    const result = this.db.prepare('DELETE FROM system_settings WHERE key = ?').run(key);
    return result.changes > 0;
  }
}
