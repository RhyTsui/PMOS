import type { AutomationTask } from './automation-task';
import type { McpWorkflowBusinessOutcome } from './mcp-workflow-status';

export interface AgentRuntimeTaskToolCall {
  toolName: string;
  status: 'planned' | 'running' | 'success' | 'failed' | 'skipped' | 'not_called';
  inputPreview?: Record<string, unknown>;
  outputPreview?: unknown;
  error?: string;
}

export interface AgentRuntimeTask {
  taskId: string;
  serviceIntent: string;
  plan?: string[];
  toolCalls?: AgentRuntimeTaskToolCall[];
  collaborationState?: 'none' | 'waiting_for_input' | 'approval_required' | 'handoff';
  taskState: AutomationTask['status'];
  businessOutcome: McpWorkflowBusinessOutcome;
  metadata?: Record<string, unknown>;
}
