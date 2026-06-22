/**
 * 迁移框架 + VNext 新表 单元测试
 *
 * 验证：
 * 1. 迁移跟踪表 _migrations 自动创建
 * 2. 8 张 VNext 新表均创建成功
 * 3. 新表列数/约束与设计文档一致
 * 4. 重复运行迁移时幂等（不重复应用）
 * 5. 新表可正常 CRUD
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeDatabase,
  getDatabase,
  closeDatabase,
} from '../src/lib/database.js';
import { getMigrationStatus } from '../src/db/migrate.js';

describe('VNext 迁移', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('迁移跟踪表存在且记录了 001', () => {
    const db = getDatabase();
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'",
      )
      .all() as Array<{ name: string }>;
    expect(tables.length).toBe(1);

    const applied = db
      .prepare('SELECT * FROM _migrations WHERE id = ?')
      .get('001') as { id: string; name: string; applied_at: string } | undefined;
    expect(applied).toBeDefined();
    expect(applied?.name).toBe('vnext-intelligence-assets');
  });

  it('迁移幂等：再次初始化不会重复应用', () => {
    const db = getDatabase();
    const before = db
      .prepare('SELECT count(*) as cnt FROM _migrations')
      .get() as { cnt: number };

    // 再次运行初始化（包括迁移）
    initializeDatabase();

    const after = db
      .prepare('SELECT count(*) as cnt FROM _migrations')
      .get() as { cnt: number };
    expect(after.cnt).toBe(before.cnt);
  });

  it('8 张 VNext 新表全部创建', () => {
    const db = getDatabase();
    const expected = [
      'requirement_profiles',
      'model_query_tasks',
      'model_answers',
      'model_claims',
      'model_source_mentions',
      'evidence_ledger',
      'benchmark_parameters',
      'intelligence_briefs',
    ];
    for (const table of expected) {
      const row = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        )
        .get(table) as { name: string } | undefined;
      expect(row, `表 ${table} 应该存在`).toBeDefined();
    }
  });

  it('新表列数与设计文档一致', () => {
    const db = getDatabase();
    const expectedColumns: Record<string, number> = {
      requirement_profiles: 15,
      model_query_tasks: 11,
      model_answers: 14,
      model_claims: 12,
      model_source_mentions: 10,
      evidence_ledger: 20,
      benchmark_parameters: 13,
      intelligence_briefs: 12,
    };

    for (const [table, expected] of Object.entries(expectedColumns)) {
      const cols = db
        .prepare(`PRAGMA table_info(${table})`)
        .all() as Array<{ name: string }>;
      expect(
        cols.length,
        `表 ${table} 应该有 ${expected} 列，实际 ${cols.length}`,
      ).toBe(expected);
    }
  });

  it('RequirementProfile CRUD 正常', () => {
    const db = getDatabase();
    const id = 'test-profile-001';

    // 创建
    db.prepare(
      `INSERT INTO requirement_profiles (id, name, owner, industry, purpose, focus_topics)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, '测试画像', 'tester', '游戏', '["发行"]', '["新游上线"]');

    // 读
    const row = db
      .prepare('SELECT * FROM requirement_profiles WHERE id = ?')
      .get(id) as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.name).toBe('测试画像');
    expect(row.industry).toBe('游戏');

    // 更新
    db.prepare(
      `UPDATE requirement_profiles SET status = 'paused', updated_at = datetime('now') WHERE id = ?`,
    ).run(id);
    const updated = db
      .prepare('SELECT status FROM requirement_profiles WHERE id = ?')
      .get(id) as { status: string };
    expect(updated.status).toBe('paused');

    // 删除
    db.prepare('DELETE FROM requirement_profiles WHERE id = ?').run(id);
    const deleted = db
      .prepare('SELECT id FROM requirement_profiles WHERE id = ?')
      .get(id);
    expect(deleted).toBeUndefined();
  });

  it('Evidence Ledger 多态关联可写可读', () => {
    const db = getDatabase();
    const id = 'test-ledger-001';

    db.prepare(
      `INSERT INTO evidence_ledger
         (id, target_type, target_id, evidence_type, title, confidence)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, 'model_claim', 'claim-001', 'cross_verified', '测试证据', 0.85);

    const row = db
      .prepare('SELECT * FROM evidence_ledger WHERE id = ?')
      .get(id) as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.target_type).toBe('model_claim');
    expect(row.confidence).toBe(0.85);

    db.prepare('DELETE FROM evidence_ledger WHERE id = ?').run(id);
  });

  it('CHECK 约束：非法 status 拒绝插入', () => {
    const db = getDatabase();
    expect(() => {
      db.prepare(
        `INSERT INTO requirement_profiles (id, name, owner, status) VALUES (?, ?, ?, ?)`,
      ).run('bad-status', 'x', 'y', 'invalid_status');
    }).toThrow();
  });

  it('getMigrationStatus 返回正确状态', () => {
    const db = getDatabase();
    const status = getMigrationStatus(db);
    expect(status.length).toBeGreaterThanOrEqual(1);
    expect(status[0].id).toBe('001');
    expect(status[0].applied).toBe(true);
    expect(status[0].appliedAt).toBeDefined();
  });
});
