import type { ActionContract } from '../semantic/action-contract';
import type { VisibilityPolicy, PermissionPolicy } from '../semantic/semantic-result-contract';

export type RuntimeStatus =
  | 'idle'
  | 'queued'
  | 'planning'
  | 'running'
  | 'streaming'
  | 'waiting-for-user'
  | 'waiting-for-approval'
  | 'retrying'
  | 'recovering'
  | 'succeeded'
  | 'partially-succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type RuntimeEventType =
  | 'runtime-started'
  | 'runtime-completed'
  | 'runtime-failed'
  | 'model-started'
  | 'model-stream-started'
  | 'model-token'
  | 'model-stream-ended'
  | 'agent-started'
  | 'agent-completed'
  | 'agent-failed'
  | 'tool-call-started'
  | 'tool-call-progress'
  | 'tool-call-succeeded'
  | 'tool-call-failed'
  | 'workflow-started'
  | 'workflow-step-started'
  | 'workflow-step-completed'
  | 'workflow-step-failed'
  | 'approval-requested'
  | 'approval-granted'
  | 'approval-rejected'
  | 'retry-scheduled'
  | 'retry-started'
  | 'recovery-started'
  | 'recovery-completed'
  | 'user-input-requested'
  | 'user-input-received';

export interface RuntimeError {
  id: string;
  code: string;
  category: 'model' | 'tool' | 'workflow' | 'permission' | 'network' | 'timeout' | 'validation' | 'unknown';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message?: string;
  userMessage: string;
  recoverable?: boolean;
  retryable?: boolean;
  source?: string;
  occurredAt: string;
  relatedEventIds?: string[];
  relatedToolCallIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface RuntimeEvent<TPayload = unknown> {
  id: string;
  runtimeId: string;
  type: RuntimeEventType;
  status: RuntimeStatus;
  timestamp: string;
  title?: string;
  summary?: string;
  actor?: string;
  agentId?: string;
  toolCallId?: string;
  workflowId?: string;
  stepId?: string;
  durationMs?: number;
  payload?: TPayload;
  visibility?: VisibilityPolicy;
  permission?: PermissionPolicy;
  error?: RuntimeError;
  metadata?: Record<string, unknown>;
}

export interface AgentRuntimeState {
  id: string;
  name: string;
  role?: string;
  status: RuntimeStatus;
  startedAt?: string;
  endedAt?: string;
  currentStep?: string;
  summary?: string;
  progress?: number;
  inputRefs?: string[];
  outputRefs?: string[];
  errorRefs?: string[];
  visibility?: VisibilityPolicy;
}

export interface ToolCallState {
  id: string;
  toolName: string;
  toolDisplayName?: string;
  status: RuntimeStatus;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  inputSummary?: string;
  outputSummary?: string;
  inputArtifactRefs?: string[];
  outputArtifactRefs?: string[];
  error?: RuntimeError;
  retry?: RetryPolicy;
  approval?: ApprovalRequest;
  visibility?: VisibilityPolicy;
  permission?: PermissionPolicy;
}

export interface WorkflowStepState {
  id: string;
  name: string;
  type?: string;
  status: RuntimeStatus;
  agentId?: string;
  toolCallIds?: string[];
  dependsOn?: string[];
  startedAt?: string;
  endedAt?: string;
  summary?: string;
  error?: RuntimeError;
}

export interface WorkflowRuntimeState {
  id: string;
  name: string;
  status: RuntimeStatus;
  startedAt?: string;
  endedAt?: string;
  steps: WorkflowStepState[];
  edges?: Array<{ from: string; to: string; label?: string }>;
  currentStepId?: string;
  progress?: number;
  criticalPath?: string[];
  errors?: RuntimeError[];
}

export interface StreamingState {
  status: 'idle' | 'streaming' | 'paused' | 'completed' | 'failed';
  startedAt?: string;
  lastChunkAt?: string;
  chunkCount?: number;
  estimatedCompletion?: string;
  backpressure?: 'normal' | 'slow-client' | 'paused' | 'dropped';
  partialMessageRef?: string;
}

export interface RetryPolicy {
  retryable: boolean;
  maxAttempts?: number;
  attempt?: number;
  nextRetryAt?: string;
  backoffMs?: number;
  retryActionId?: string;
}

export interface RecoveryPlan {
  recoveryActions?: ActionContract[];
  recommendedActionId?: string;
  autoRecoverable?: boolean;
}

export interface ApprovalRequest {
  approvalId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedBy?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  requiredRole?: string;
  approveActionId?: string;
  rejectActionId?: string;
}

export interface RuntimeDisplayProtocol {
  contractType: 'runtime-display';
  version: string;
  runtimeId: string;
  conversationId?: string;
  messageId?: string;
  executionId?: string;
  status: RuntimeStatus;
  startedAt?: string;
  endedAt?: string;
  agents?: AgentRuntimeState[];
  toolCalls?: ToolCallState[];
  workflows?: WorkflowRuntimeState[];
  streaming?: StreamingState;
  events: RuntimeEvent[];
  errors?: RuntimeError[];
  approvals?: ApprovalRequest[];
  recovery?: RecoveryPlan;
  visibility?: VisibilityPolicy;
  permission?: PermissionPolicy;
  metadata?: Record<string, unknown>;
}
