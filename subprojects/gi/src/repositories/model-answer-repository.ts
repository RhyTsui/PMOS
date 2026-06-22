/**
 * 模型回答 Repository
 *
 * @see docs/design/02-数据模型设计.md §6.3
 */
import { BaseRepository } from './base.js';
import type { ModelAnswer, AnswerStatus, TokenCost } from '../models/types.js';

interface ModelAnswerRow {
  id: string;
  task_id: string;
  model_provider: string;
  model_name: string;
  prompt_version: string;
  answer_text: string;
  answer_json: string | null;
  token_input: number;
  token_output: number;
  token_total: number;
  latency_ms: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export class ModelAnswerRepository extends BaseRepository<ModelAnswer, ModelAnswerRow> {
  protected tableName = 'model_answers';

  protected toModel(row: ModelAnswerRow): ModelAnswer {
    return {
      id: row.id,
      taskId: row.task_id,
      modelProvider: row.model_provider,
      modelName: row.model_name,
      promptVersion: row.prompt_version,
      answerText: row.answer_text,
      answerJson: row.answer_json ? JSON.parse(row.answer_json) : undefined,
      createdAt: row.created_at,
      tokenCost: {
        input: row.token_input,
        output: row.token_output,
        total: row.token_total,
      } as TokenCost,
      latencyMs: row.latency_ms,
      status: row.status as AnswerStatus,
      errorMessage: row.error_message ?? undefined,
    };
  }

  protected toRow(model: Partial<ModelAnswer>): Partial<ModelAnswerRow> {
    return {
      id: model.id,
      task_id: model.taskId,
      model_provider: model.modelProvider,
      model_name: model.modelName,
      prompt_version: model.promptVersion,
      answer_text: model.answerText,
      answer_json: model.answerJson !== undefined ? JSON.stringify(model.answerJson) : null,
      token_input: model.tokenCost?.input,
      token_output: model.tokenCost?.output,
      token_total: model.tokenCost?.total,
      latency_ms: model.latencyMs,
      status: model.status,
      error_message: model.errorMessage ?? null,
      created_at: model.createdAt,
    };
  }

  findByTask(taskId: string): ModelAnswer[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE task_id = ? ORDER BY created_at DESC`)
      .all(taskId) as ModelAnswerRow[];
    return rows.map((r) => this.toModel(r));
  }

  findByModel(provider: string, model?: string): ModelAnswer[] {
    const sql = model
      ? `SELECT * FROM ${this.tableName} WHERE model_provider = ? AND model_name = ? ORDER BY created_at DESC`
      : `SELECT * FROM ${this.tableName} WHERE model_provider = ? ORDER BY created_at DESC`;
    const rows = (model
      ? this.db.prepare(sql).all(provider, model)
      : this.db.prepare(sql).all(provider)) as ModelAnswerRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * Token 消耗统计（按任务/时间范围）
   */
  sumTokenCost(taskId?: string): TokenCost {
    const sql = taskId
      ? `SELECT
           COALESCE(SUM(token_input), 0) as input,
           COALESCE(SUM(token_output), 0) as output,
           COALESCE(SUM(token_total), 0) as total
         FROM ${this.tableName}
         WHERE task_id = ?`
      : `SELECT
           COALESCE(SUM(token_input), 0) as input,
           COALESCE(SUM(token_output), 0) as output,
           COALESCE(SUM(token_total), 0) as total
         FROM ${this.tableName}`;
    const row = (taskId
      ? this.db.prepare(sql).get(taskId)
      : this.db.prepare(sql).get()) as TokenCost;
    return row;
  }

  /**
   * 按模型分组统计回答数量
   */
  countByModel(): Array<{ provider: string; model: string; count: number }> {
    return this.db
      .prepare(
        `SELECT model_provider as provider, model_name as model, COUNT(*) as count
         FROM ${this.tableName}
         WHERE status = 'success'
         GROUP BY model_provider, model_name
         ORDER BY count DESC`,
      )
      .all() as Array<{ provider: string; model: string; count: number }>;
  }
}
