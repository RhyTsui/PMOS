/**
 * LLM 供应商配置 Repository
 *
 * 后台配置管理的数据库访问层。
 *
 * @see docs/WHITE_PAPER.md §8.5
 */
import { BaseRepository } from './base.js';
import type {
  LLMProvider,
  LLMProviderType,
  LLMProviderStatus,
} from '../models/types.js';

interface LLMProviderRow {
  id: string;
  name: string;
  provider_type: string;
  api_key: string;
  base_url: string;
  model_base_url: string | null;
  models: string;
  default_model: string | null;
  enabled: number;
  rate_limit_rpm: number;
  rate_limit_daily: number;
  priority: number;
  cost_per_1m_input: number | null;
  cost_per_1m_output: number | null;
  config: string;
  status: string;
  last_error: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export class LLMProviderRepository extends BaseRepository<LLMProvider, LLMProviderRow> {
  protected tableName = 'llm_providers';

  protected toModel(row: LLMProviderRow): LLMProvider {
    return {
      id: row.id,
      name: row.name,
      providerType: row.provider_type as LLMProviderType,
      apiKey: row.api_key,
      baseUrl: row.base_url,
      modelBaseUrl: row.model_base_url ?? undefined,
      models: JSON.parse(row.models) as string[],
      defaultModel: row.default_model ?? undefined,
      enabled: row.enabled === 1,
      rateLimitRpm: row.rate_limit_rpm,
      rateLimitDaily: row.rate_limit_daily,
      priority: row.priority,
      costPer1mInput: row.cost_per_1m_input ?? undefined,
      costPer1mOutput: row.cost_per_1m_output ?? undefined,
      config: row.config ? JSON.parse(row.config) as Record<string, unknown> : undefined,
      status: row.status as LLMProviderStatus,
      lastError: row.last_error ?? undefined,
      lastUsedAt: row.last_used_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(model: Partial<LLMProvider>): Partial<LLMProviderRow> {
    return {
      id: model.id,
      name: model.name,
      provider_type: model.providerType,
      api_key: model.apiKey,
      base_url: model.baseUrl,
      model_base_url: model.modelBaseUrl ?? null,
      models: model.models ? JSON.stringify(model.models) : '[]',
      default_model: model.defaultModel ?? null,
      enabled: model.enabled === true ? 1 : model.enabled === false ? 0 : undefined,
      rate_limit_rpm: model.rateLimitRpm,
      rate_limit_daily: model.rateLimitDaily,
      priority: model.priority,
      cost_per_1m_input: model.costPer1mInput ?? null,
      cost_per_1m_output: model.costPer1mOutput ?? null,
      config: model.config ? JSON.stringify(model.config) : '{}',
      status: model.status,
      last_error: model.lastError ?? null,
      last_used_at: model.lastUsedAt ?? null,
      created_at: model.createdAt,
      updated_at: model.updatedAt,
    };
  }

  /**
   * 获取所有启用的供应商（按优先级排序）
   */
  findEnabled(): LLMProvider[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE enabled = 1 AND status != 'inactive'
         ORDER BY priority ASC`,
      )
      .all() as LLMProviderRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按类型查找
   */
  findByType(providerType: LLMProviderType): LLMProvider[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE provider_type = ? ORDER BY priority`)
      .all(providerType) as LLMProviderRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 按名称查找
   */
  findByName(name: string): LLMProvider | null {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE name = ?`)
      .get(name) as LLMProviderRow | undefined;
    return row ? this.toModel(row) : null;
  }

  /**
   * 切换启用状态
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET enabled = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(enabled ? 1 : 0, id);
    return result.changes > 0;
  }

  /**
   * 更新状态
   */
  updateStatus(id: string, status: LLMProviderStatus, lastError?: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET status = ?, last_error = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(status, lastError ?? null, id);
    return result.changes > 0;
  }

  /**
   * 记录一次使用
   */
  recordUsage(id: string): void {
    this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET last_used_at = datetime('now')
         WHERE id = ?`,
      )
      .run(id);
  }

  /**
   * 按状态统计
   */
  countByStatus(): Record<LLMProviderStatus, number> {
    const rows = this.db
      .prepare(
        `SELECT status, COUNT(*) as count
         FROM ${this.tableName}
         GROUP BY status`,
      )
      .all() as Array<{ status: string; count: number }>;
    const result: Record<string, number> = { active: 0, inactive: 0, error: 0 };
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result as Record<LLMProviderStatus, number>;
  }

  /**
   * 检查模型是否在指定供应商中可用
   */
  hasModel(providerId: string, modelName: string): boolean {
    const row = this.db
      .prepare(`SELECT models FROM ${this.tableName} WHERE id = ?`)
      .get(providerId) as { models: string } | undefined;
    if (!row) return false;
    const models = JSON.parse(row.models) as string[];
    return models.includes(modelName);
  }
}
