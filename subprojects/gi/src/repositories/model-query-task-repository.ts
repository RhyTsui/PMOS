/**
 * 模型情报任务 Repository
 *
 * @see docs/design/02-数据模型设计.md §6.2
 */
import { BaseRepository } from './base.js';
import type {
  ModelQueryTask,
  ModelTaskType,
  ModelTaskStatus,
  ModelSpec,
} from '../models/types.js';

interface ModelQueryTaskRow {
  id: string;
  profile_id: string;
  task_type: string;
  prompt_template_id: string;
  prompt_variables: string;
  models: string;
  schedule: string;
  status: string;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}

export class ModelQueryTaskRepository extends BaseRepository<
  ModelQueryTask,
  ModelQueryTaskRow
> {
  protected tableName = 'model_query_tasks';

  protected toModel(row: ModelQueryTaskRow): ModelQueryTask {
    return {
      id: row.id,
      profileId: row.profile_id,
      taskType: row.task_type as ModelTaskType,
      promptTemplateId: row.prompt_template_id,
      promptVariables: JSON.parse(row.prompt_variables) as Record<string, string>,
      models: JSON.parse(row.models) as ModelSpec[],
      schedule: JSON.parse(row.schedule) as ModelQueryTask['schedule'],
      status: row.status as ModelTaskStatus,
      lastRunAt: row.last_run_at ?? undefined,
      nextRunAt: row.next_run_at ?? undefined,
      createdAt: row.created_at,
    };
  }

  protected toRow(model: Partial<ModelQueryTask>): Partial<ModelQueryTaskRow> {
    return {
      id: model.id,
      profile_id: model.profileId,
      task_type: model.taskType,
      prompt_template_id: model.promptTemplateId,
      prompt_variables: model.promptVariables ? JSON.stringify(model.promptVariables) : undefined,
      models: model.models ? JSON.stringify(model.models) : undefined,
      schedule: model.schedule ? JSON.stringify(model.schedule) : undefined,
      status: model.status,
      last_run_at: model.lastRunAt ?? null,
      next_run_at: model.nextRunAt ?? null,
      created_at: model.createdAt,
    };
  }

  findByProfile(profileId: string): ModelQueryTask[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE profile_id = ? ORDER BY created_at DESC`)
      .all(profileId) as ModelQueryTaskRow[];
    return rows.map((r) => this.toModel(r));
  }

  findByStatus(status: ModelTaskStatus): ModelQueryTask[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY created_at DESC`)
      .all(status) as ModelQueryTaskRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 找到下一批需要执行的任务（next_run_at <= now 且 status 为 pending/completed）
   */
  findDueTasks(now: string = new Date().toISOString()): ModelQueryTask[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.tableName}
         WHERE status IN ('pending', 'completed')
           AND next_run_at IS NOT NULL
           AND next_run_at <= ?
         ORDER BY next_run_at ASC`,
      )
      .all(now) as ModelQueryTaskRow[];
    return rows.map((r) => this.toModel(r));
  }

  findByTaskType(taskType: ModelTaskType): ModelQueryTask[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE task_type = ? ORDER BY created_at DESC`)
      .all(taskType) as ModelQueryTaskRow[];
    return rows.map((r) => this.toModel(r));
  }

  /**
   * 记录一次执行（更新 last_run_at 和 next_run_at）
   */
  recordRun(id: string, nextRunAt?: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE ${this.tableName}
         SET last_run_at = datetime('now'),
             next_run_at = ?,
             status = 'completed',
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(nextRunAt ?? null, id);
    return result.changes > 0;
  }

  updateStatus(id: string, status: ModelTaskStatus): boolean {
    const result = this.db
      .prepare(`UPDATE ${this.tableName} SET status = ? WHERE id = ?`)
      .run(status, id);
    return result.changes > 0;
  }
}
