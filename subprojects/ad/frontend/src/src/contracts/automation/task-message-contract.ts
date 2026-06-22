import type { TaskResultMessagePayload } from '@/types';

/**
 * 任务消息契约
 *
 * 定义任务结果写入会话消息的标准化载荷格式。
 */

export type TaskMessageStatus = 'completed' | 'failed' | 'partial' | 'skipped' | 'needs_action';

/**
 * 根据 TaskRun 状态确定消息类型
 */
export function resolveTaskMessageType(status: TaskMessageStatus): string {
  switch (status) {
    case 'completed':
    case 'partial':
      return 'task_run_completed';
    case 'failed':
      return 'task_run_failed';
    case 'needs_action':
      return 'task_needs_action';
    case 'skipped':
      return 'task_run_skipped';
    default:
      return 'task_run_completed';
  }
}

/**
 * 是否需要生成用户消息
 * skipped / no_change 默认不生成用户消息
 */
export function shouldGenerateTaskMessage(status: TaskMessageStatus): boolean {
  return status !== 'skipped';
}

/**
 * 构建标准的 TaskResultMessagePayload
 */
export function buildTaskResultPayload(input: {
  taskId: string;
  runId: string;
  taskTitle: string;
  runStatus: TaskMessageStatus;
  summary: string;
  keyFindings?: string[];
  nextActions?: TaskResultMessagePayload['next_actions'];
  artifacts?: TaskResultMessagePayload['artifacts'];
  evidenceRefs?: TaskResultMessagePayload['evidence_refs'];
  sourceRefs?: TaskResultMessagePayload['source_refs'];
  traceId?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}): TaskResultMessagePayload {
  return {
    task_id: input.taskId,
    run_id: input.runId,
    task_title: input.taskTitle,
    run_status: input.runStatus,
    completed_at: new Date().toISOString(),
    summary: input.summary,
    key_findings: input.keyFindings,
    next_actions: input.nextActions,
    artifacts: input.artifacts,
    evidence_refs: input.evidenceRefs,
    source_refs: input.sourceRefs,
    trace_id: input.traceId,
    display_mode: 'compact',
    template_id: input.templateId,
    template_data: input.templateData,
  };
}
