/**
 * 轻量级数据库迁移框架
 *
 * 设计原则：
 * - 零依赖（只用 better-sqlite3 原生 API）
 * - 文件即迁移：每个迁移是一个 .ts 文件，导出 `up: string`（必须）和 `down?: string`（可选）
 * - 幂等性：通过 `_migrations` 表跟踪已应用的迁移，重复运行不会重复执行
 * - 原子性：每个迁移在独立事务中运行
 *
 * 迁移文件命名约定：`NNN-描述.ts`，例如 `001-vnext-intelligence-assets.ts`
 *
 * @see docs/WHITE_PAPER.md §16（P0-P4 演进路线）
 * @see docs/design/02-数据模型设计.md 第六节（VNext 新增模型）
 */
import type { Database } from 'better-sqlite3';

import * as m001 from './migrations/001-vnext-intelligence-assets.js';
import * as m002 from './migrations/002-llm-providers.js';
import * as m003 from './migrations/003-add-model-base-url.js';
import * as m004 from './migrations/004-system-settings.js';

// —— 迁移注册表 ——
// 新增迁移时，在这里按顺序追加一条记录
export interface Migration {
  /** 迁移 ID，必须唯一且稳定（一旦应用不可更改） */
  id: string;
  /** 迁移名称，仅用于日志 */
  name: string;
  /** 正向 SQL（必须） */
  up: string;
  /** 反向 SQL（可选，用于回滚；P0 阶段暂未实现） */
  down?: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: '001',
    name: 'vnext-intelligence-assets',
    up: m001.up,
  },
  {
    id: '002',
    name: 'llm-providers',
    up: m002.up,
  },
  {
    id: '003',
    name: 'add-model-base-url',
    up: m003.up,
  },
  {
    id: '004',
    name: 'system-settings',
    up: m004.up,
  },
];

// —— 迁移执行 ——

/**
 * 运行所有尚未应用的迁移。
 *
 * 流程：
 * 1. 确保 `_migrations` 跟踪表存在
 * 2. 读取已应用的迁移 ID 集合
 * 3. 按顺序遍历 MIGRATIONS，跳过已应用的
 * 4. 对每个待应用迁移：BEGIN → exec(up) → INSERT → COMMIT
 * 5. 任何失败都会 ROLLBACK 并抛出异常
 */
export function runMigrations(db: Database): void {
  // 1. 跟踪表
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 2. 已应用集合
  const appliedRows = db
    .prepare('SELECT id FROM _migrations')
    .all() as Array<{ id: string }>;
  const applied = new Set(appliedRows.map((r) => r.id));

  // 3+4+5. 逐个应用
  const applyOne = db.transaction((m: Migration) => {
    db.exec(m.up);
    db.prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)').run(m.id, m.name);
  });

  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) {
      continue;
    }
    console.log(`[DB:MIGRATE] 应用迁移 ${m.id}: ${m.name}`);
    try {
      applyOne(m);
      console.log(`[DB:MIGRATE] ✓ 迁移 ${m.id} 已应用`);
    } catch (err) {
      console.error(`[DB:MIGRATE] ✗ 迁移 ${m.id} 失败:`, err);
      throw err;
    }
  }

  const totalApplied = db
    .prepare('SELECT count(*) as cnt FROM _migrations')
    .get() as { cnt: number } | undefined;
  console.log(`[DB:MIGRATE] 迁移完成，已应用 ${totalApplied?.cnt ?? 0}/${MIGRATIONS.length}`);
}

/**
 * 返回当前迁移状态（供调试/系统 API 使用）
 */
export function getMigrationStatus(db: Database): Array<{
  id: string;
  name: string;
  applied: boolean;
  appliedAt?: string;
}> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const appliedRows = db
    .prepare('SELECT id, applied_at FROM _migrations')
    .all() as Array<{ id: string; applied_at: string }>;
  const appliedMap = new Map(appliedRows.map((r) => [r.id, r.applied_at]));

  return MIGRATIONS.map((m) => ({
    id: m.id,
    name: m.name,
    applied: appliedMap.has(m.id),
    appliedAt: appliedMap.get(m.id),
  }));
}
