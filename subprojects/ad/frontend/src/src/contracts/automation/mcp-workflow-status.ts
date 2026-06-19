import type { TaskArtifact } from './task-artifact';

export type McpWorkflowRunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'waiting_for_input'
  | 'approval_required';

export type McpWorkflowBusinessOutcome =
  | 'success'
  | 'failed'
  | 'need_clarification'
  | 'waiting_for_input'
  | 'approval_required'
  | 'blocked'
  | 'in_progress';

export interface McpWorkflowStepStatus {
  stepId: string;
  title?: string;
  status: McpWorkflowRunStatus;
  startedAt?: string;
  endedAt?: string;
  summary?: string;
  logs?: string[];
  metadata?: Record<string, unknown>;
}

export interface McpWorkflowStatus {
  workflowRunId: string;
  workflowType: string;
  status: McpWorkflowRunStatus;
  businessOutcome: McpWorkflowBusinessOutcome;
  progress?: number;
  steps?: McpWorkflowStepStatus[];
  artifacts?: TaskArtifact[];
  blockingRequirements?: string[];
  evidenceRefs?: string[];
  sourceRefs?: string[];
  metadata?: Record<string, unknown>;
}
