import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { createScheduledTask, deleteScheduledTask, runScheduledTask } from '../src/lib/scheduled-task-store';
import { getAttachment } from '../src/lib/attachment-store';
import { findReusableAutomationResults } from '../src/lib/automation-result-reuse-store';
import { runtimeUserDataPath } from '../src/lib/runtime-data-path';

const scopeKey = 'automation-p0-self-test';

async function cleanupUserScope() {
  await rm(path.dirname(runtimeUserDataPath(scopeKey, 'placeholder.json')), {
    recursive: true,
    force: true,
  });
}

async function main() {
  await cleanupUserScope();
  const task = await createScheduledTask({
    name: 'P0 拼表取数自测',
    description: '每天生成消耗、激活、ROI  拼表',
    task_type: 'multi_query_spreadsheet',
    status: 'active',
    frequency: 'daily',
    created_by: scopeKey,
    automation_trigger: 'user_schedule',
    automation_visibility: 'owner_visible',
    owner_scope: 'user',
    result_reuse_policy: {
      reusable_in_chat: true,
      freshness_seconds: 86400,
      requires_permission_filter: true,
      requires_evidence_refs: true,
    },
    account_ids: ['acct-self-test'],
    app_names: ['self-test-app'],
    monitor_metrics: ['消耗', '激活', 'ROI'],
    custom_params: {
      dimensions: ['日期', '媒体'],
      conversation_id: 'automation-p0-self-test-conversation',
    },
  });

  try {
    const result = await runScheduledTask(task.id, scopeKey);
    assert.ok(result, 'scheduled task should run');
    assert.ok(result.artifact, 'scheduled task should produce an artifact');
    assert.match(result.artifact.name, /\.xlsx$/, 'artifact should be an xlsx file');
    assert.ok(result.execution.artifact_attachment_id, 'execution should reference attachment artifact');
    assert.equal(result.execution.result_reusable_in_chat, true, 'execution should be reusable in Chat');
    assert.ok(result.execution.quality_status, 'execution should record quality status');
    assert.ok(Array.isArray(result.execution.source_refs), 'execution should expose source refs array');
    assert.ok(Array.isArray(result.execution.evidence_refs), 'execution should expose evidence refs array');

    const attachment = await getAttachment(result.execution.artifact_attachment_id!, scopeKey);
    assert.ok(attachment, 'artifact attachment should be readable');
    assert.equal(
      attachment?.mime_type,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'artifact should use xlsx mime type',
    );
    assert.equal(attachment?.kind, 'table', 'artifact should be classified as a table');

    const reusableResults = await findReusableAutomationResults(scopeKey, { limit: 3 });
    const reusableResult = reusableResults.find((item) => item.execution_id === result.execution.id);
    assert.ok(reusableResult, 'chat reuse lookup should find the latest task result');
    assert.equal(reusableResult?.artifact_attachment_id, result.execution.artifact_attachment_id, 'reuse result should expose attachment id');
    assert.equal(reusableResult?.task_type, 'multi_query_spreadsheet', 'reuse result should keep task type');
    assert.equal(reusableResult?.quality_status, result.execution.quality_status, 'reuse result should expose quality status');
    assert.ok(Array.isArray(reusableResult?.evidence_refs), 'reuse result should expose evidence refs');
    assert.ok(Array.isArray(reusableResult?.source_refs), 'reuse result should expose source refs');
  } finally {
    await deleteScheduledTask(task.id);
    await cleanupUserScope();
  }
}

main()
  .then(() => {
    console.log('automation-task-p0-self-test: ok');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
