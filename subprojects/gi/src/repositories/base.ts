/**
 * Repository 基类
 *
 * 提供通用的 CRUD 操作，子类继承后扩展特定查询
 */
import type { Database } from 'better-sqlite3';
import { getDatabase } from '../lib/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository 基类
 *
 * @template T - 模型类型
 * @template R - 数据库行类型（与 T 不同，因为字段命名风格不同）
 */
export abstract class BaseRepository<T extends { id: string }, R = Record<string, unknown>> {
  protected db: Database;
  protected abstract tableName: string;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 将数据库行转换为模型对象
   */
  protected abstract toModel(row: R): T;

  /**
   * 将模型对象转换为数据库行
   */
  protected abstract toRow(model: Partial<T>): Partial<R>;

  /**
   * 根据 ID 查找
   */
  findById(id: string): T | null {
    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as R | undefined;
    return row ? this.toModel(row) : null;
  }

  /**
   * 查找所有
   */
  findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
  }): T[] {
    const { limit = 100, offset = 0, orderBy = 'created_at', order = 'DESC' } = options || {};
    const sql = `SELECT * FROM ${this.tableName} ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
    const rows = this.db.prepare(sql).all(limit, offset) as R[];
    return rows.map(row => this.toModel(row));
  }

  /**
   * 创建
   */
  create(model: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
    const now = new Date().toISOString();
    const id = uuidv4();
    const fullModel = { ...model, id, createdAt: now, updatedAt: now } as unknown as T;
    const row = this.toRow(fullModel);

    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => (row as Record<string, unknown>)[col]);

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    this.db.prepare(sql).run(...values);

    return fullModel;
  }

  /**
   * 更新
   */
  update(id: string, updates: Partial<T>): T | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const merged = { ...existing, ...updates, id, updatedAt: now };
    const row = this.toRow(merged);

    const sets: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(row)) {
      if (key !== 'id' && key !== 'created_at') {
        sets.push(`${key} = ?`);
        values.push(value);
      }
    }

    values.push(id);
    const sql = `UPDATE ${this.tableName} SET ${sets.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    return this.findById(id);
  }

  /**
   * 删除
   */
  delete(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  /**
   * 计数
   */
  count(where?: string, params?: unknown[]): number {
    const sql = where
      ? `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${this.tableName}`;

    const stmt = this.db.prepare(sql);
    const result = params ? stmt.get(...params) : stmt.get();
    return (result as { count: number }).count;
  }

  /**
   * 执行事务
   */
  protected transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
}
