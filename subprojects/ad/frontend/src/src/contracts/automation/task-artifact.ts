export type TaskArtifactType =
  | 'report'
  | 'diagnosis_result'
  | 'package_list'
  | 'integration_log'
  | 'operation_result'
  | 'alert'
  | 'file';

export interface TaskArtifact {
  artifactId: string;
  artifactType: TaskArtifactType;
  title?: string;
  summary?: string;
  uri?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskNotification {
  notificationId: string;
  taskId: string;
  channel?: string;
  title?: string;
  message?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskRun {
  runId: string;
  taskId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'waiting_for_input' | 'approval_required';
  startedAt?: string;
  endedAt?: string;
  artifacts?: TaskArtifact[];
  evidenceRefs?: string[];
  sourceRefs?: string[];
  metadata?: Record<string, unknown>;
}
