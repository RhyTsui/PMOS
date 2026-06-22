/**
 * 004 - 全局系统配置注册表
 *
 * 用于持久化后台配置，避免调度器等运行时配置只保存在进程内存中。
 */

export const up = `
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at
  ON system_settings(updated_at DESC);
`;
