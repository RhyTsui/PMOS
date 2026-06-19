import type { TaskArtifact, TaskNotification, TaskRun } from './task-artifact';

export type AutomationTaskType =
  | 'one_off_task'
  | 'scheduled_task'
  | 'condition_watch'
  | 'manual_approval_task'
  | 'background_task';

export type AutomationTaskTrigger = 'immediate' | 'schedule' | 'condition';

export type AutomationTaskStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'waiting_for_input'
  | 'approval_required'
  | 'paused';

export interface AutomationTask {
  taskId: string;
  taskType: AutomationTaskType;
  trigger: AutomationTaskTrigger;
  status: AutomationTaskStatus;
  nextRunAt?: string;
  lastRunAt?: string;
  ownerUserId?: string;
  workspaceId?: string;
  projectId?: string;
  runs?: TaskRun[];
  artifacts?: TaskArtifact[];
  notifications?: TaskNotification[];
  metadata?: Record<string, unknown>;
}
