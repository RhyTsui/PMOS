import assert from 'node:assert/strict';
import { normalizeAgentRuntimeTask, normalizeAutomationTask, normalizeMcpWorkflowStatus } from '../src/lib/mcp-tool-output-adapter';

function assertAutomationRuntimeFlow(): void {
  const integrationWorkflow = normalizeMcpWorkflowStatus({
    workflowRunId: 'wf-001',
    workflowType: 'integration_run',
    status: 'running',
    businessOutcome: 'in_progress',
    progress: 40,
    steps: [{ stepId: 'fetch-packages', status: 'success', title: 'fetch packages' }],
    artifacts: [{ artifactId: 'log-001', artifactType: 'integration_log', title: 'integration log' }],
  });
  assert.equal(integrationWorkflow?.workflowType, 'integration_run', 'MCP workflow status should normalize integration run type');
  assert.equal(integrationWorkflow?.artifacts?.[0]?.artifactType, 'integration_log', 'integration workflow should expose log artifact');

  const scheduledReport = normalizeAutomationTask({
    taskId: 'task-daily-report',
    taskType: 'scheduled_task',
    trigger: 'schedule',
    status: 'pending',
    nextRunAt: '2026-06-04T01:00:00.000Z',
    artifacts: [{ artifactId: 'report-template', artifactType: 'report' }],
  });
  assert.equal(scheduledReport?.taskType, 'scheduled_task', 'scheduled report should normalize as scheduled task');
  assert.equal(scheduledReport?.artifacts?.[0]?.artifactType, 'report', 'scheduled report should keep report artifact');

  const watchTask = normalizeAgentRuntimeTask({
    taskId: 'task-roi-watch',
    taskType: 'condition_watch',
    trigger: 'condition',
    status: 'running',
    serviceIntent: 'issue_diagnosis',
    artifacts: [{ artifactId: 'diagnosis-001', artifactType: 'diagnosis_result' }],
  });
  assert.equal(watchTask?.serviceIntent, 'issue_diagnosis', 'condition watch should preserve diagnosis serviceIntent');
  assert.equal(watchTask?.businessOutcome, 'in_progress', 'running watch task should stay in progress');

  const approvalWorkflow = normalizeMcpWorkflowStatus({
    workflowRunId: 'wf-approval',
    workflowType: 'operation',
    status: 'approval_required',
    businessOutcome: 'approval_required',
    blockingRequirements: ['manual_approval'],
  });
  assert.equal(approvalWorkflow?.status, 'approval_required', 'high-risk operation should surface approval_required');
  assert.equal(approvalWorkflow?.blockingRequirements?.[0], 'manual_approval', 'approval workflow should expose blocking requirement');
}

assertAutomationRuntimeFlow();
console.log('automation-runtime-golden: ok');
