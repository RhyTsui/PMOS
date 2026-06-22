import { listScheduledTasks } from './scheduled-task-store';
import type { ScheduledTask, ScheduledTaskExecution } from '@/types';

export interface AutomationReusableResult {
  task_id: string;
  task_name: string;
  task_type: ScheduledTask['task_type'];
  automation_trigger?: ScheduledTask['automation_trigger'];
  automation_visibility?: ScheduledTask['automation_visibility'];
  owner_scope?: ScheduledTask['owner_scope'];
  execution_id: string;
  execution_status: ScheduledTaskExecution['status'];
  result_summary: string;
  quality_status: string;
  artifact_name?: string;
  artifact_url?: string;
  artifact_attachment_id?: string;
  evidence_refs: ScheduledTaskExecution['evidence_refs'];
  source_refs: ScheduledTaskExecution['source_refs'];
  started_at: number;
  finished_at: number;
  freshness_seconds: number;
}

export interface AutomationReusableResultQuery {
  projectRefs?: string[];
  nowMs?: number;
  limit?: number;
}

function isVisibleToScope(task: ScheduledTask, scopeKey: string) {
  if (task.automation_visibility === 'admin_only') return false;
  if (task.automation_visibility === 'silent') return task.created_by === scopeKey;
  if (task.automation_visibility === 'owner_visible') return task.created_by === scopeKey;
  return true;
}

function getFreshnessSeconds(task: ScheduledTask) {
  return Math.max(0, Number(task.result_reuse_policy?.freshness_seconds ?? 24 * 60 * 60));
}

function isReusableExecution(task: ScheduledTask, execution: ScheduledTaskExecution, nowMs: number) {
  if (task.result_reuse_policy?.reusable_in_chat === false) return false;
  if (execution.result_reusable_in_chat === false) return false;
  if (!execution.artifact_attachment_id && !execution.artifact_url) return false;
  if (!['success', 'succeeded', 'partial_succeeded'].includes(execution.status)) return false;

  const freshnessMs = getFreshnessSeconds(task) * 1000;
  if (freshnessMs > 0 && nowMs - execution.finished_at > freshnessMs) return false;

  const evidenceRefs = execution.evidence_refs || [];
  const sourceRefs = execution.source_refs || [];
  if (task.result_reuse_policy?.requires_evidence_refs && evidenceRefs.length === 0 && sourceRefs.length === 0) {
    return false;
  }
  return true;
}

export async function findReusableAutomationResults(
  scopeKey: string,
  query: AutomationReusableResultQuery = {},
): Promise<AutomationReusableResult[]> {
  const nowMs = query.nowMs ?? Date.now();
  const limit = Math.max(1, Math.min(query.limit ?? 5, 20));
  const tasks = await listScheduledTasks({ project_refs: query.projectRefs });

  return tasks
    .filter((task) => isVisibleToScope(task, scopeKey))
    .flatMap((task) => task.recent_executions
      .filter((execution) => isReusableExecution(task, execution, nowMs))
      .map((execution): AutomationReusableResult => ({
        task_id: task.id,
        task_name: task.name,
        task_type: task.task_type,
        automation_trigger: task.automation_trigger,
        automation_visibility: task.automation_visibility,
        owner_scope: task.owner_scope,
        execution_id: execution.id,
        execution_status: execution.status,
        result_summary: execution.result_summary,
        quality_status: execution.quality_status || 'unknown',
        artifact_name: execution.artifact_name,
        artifact_url: execution.artifact_url,
        artifact_attachment_id: execution.artifact_attachment_id,
        evidence_refs: execution.evidence_refs || [],
        source_refs: execution.source_refs || [],
        started_at: execution.started_at,
        finished_at: execution.finished_at,
        freshness_seconds: getFreshnessSeconds(task),
      })))
    .sort((a, b) => b.finished_at - a.finished_at)
    .slice(0, limit);
}
