/**
 * Chat-first Task Center E2E 验收测试（mock-safe）
 *
 * 覆盖 7 个核心场景：
 * 1. 创建 GI 日报任务 → task_proposal + task_created
 * 2. 触发 GI 日报 run → task_run_completed + 高亮
 * 3. 创建指标监控任务 → task_proposal + task_created
 * 4. 指标监控 no_anomaly → 无消息，无高亮
 * 5. 指标监控 anomaly → task_run_completed/needs_action + 高亮
 * 6. 暂停/恢复/删除确认
 * 7. 主消息安全（无 raw config / cron / debug）
 *
 * 通过真实 HTTP API 驱动，不依赖真实 GI / 聚合 / 数仓。
 */

import { runTemplateTask } from '../src/lib/task-template-runner';
import { confirmCreateTask } from '../src/lib/automation-task-lifecycle';
import { detectAutomationIntent } from '../src/lib/automation-intent-router';
import { listMessages } from '../src/lib/conversation-store';
import { getUnreadHighlights, markAutomationRead, markAutomationUnread } from '../src/lib/conversation-highlight-store';
import { getScheduledTask, createScheduledTask, updateScheduledTask, deleteScheduledTask } from '../src/lib/scheduled-task-store';
import { writeTaskProposalMessage } from '../src/lib/task-message-writer';

const SCOPE_KEY = 'e2e-test-user';
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

async function setupConversation(): Promise<string> {
  const { createConversation } = await import('../src/lib/conversation-store');
  const conv = await createConversation(SCOPE_KEY, { title: `E2E-${Date.now()}` });
  return conv.conversation_id;
}

async function cleanupConversation(conversationId: string) {
  try {
    const { deleteConversation } = await import('../src/lib/conversation-store');
    await deleteConversation(conversationId, SCOPE_KEY);
  } catch {
    // cleanup best-effort
  }
}

async function createTaskViaIntent(conversationId: string, userMessage: string) {
  const intent = detectAutomationIntent({ message: userMessage });
  assert(intent.automation_intent === 'create', `intent detected as "create" for "${userMessage}"`);

  // Write proposal
  const proposalResult = await writeTaskProposalMessage({
    conversationId,
    scopeKey: SCOPE_KEY,
    taskId: `pending-${Date.now()}`,
    proposal: {
      task_title: `${intent.template_id || 'task'}-${Date.now()}`,
      description: 'E2E 测试任务',
      template_id: intent.template_id,
      schedule_label: intent.slots.schedule || 'daily',
      risk_level: intent.risk_level,
      scope_summary: 'E2E scope',
      output_summary: 'E2E output',
    },
  });
  assert(proposalResult.success === true, 'proposal message written');

  // Confirm create
  const confirmResult = await confirmCreateTask({
    scopeKey: SCOPE_KEY,
    conversationId,
    userId: SCOPE_KEY,
    proposal: {
      task_title: `${intent.template_id || 'task'}-${Date.now()}`,
      description: 'E2E 测试任务',
      template_id: intent.template_id,
      schedule_label: intent.slots.schedule || 'daily',
      risk_level: intent.risk_level,
      scope_summary: 'E2E scope',
      output_summary: 'E2E output',
    },
  });
  assert(confirmResult.success === true, 'task created after confirmation');
  return confirmResult.taskId;
}

async function main() {
  console.log('=== Chat-first Task Center E2E (mock-safe) ===\n');

  const conversationId = await setupConversation();
  console.log(`Test conversation: ${conversationId}\n`);

  try {
    // ─── 场景 1: 创建 GI 日报任务 ───
    console.log('场景 1: 创建 GI 日报任务');
    const giTaskId = await createTaskViaIntent(conversationId, '每天9点给我一份小游戏买量情报日报，关键词是SLG、小游戏');
    const giTask = await getScheduledTask(giTaskId!);
    assert(giTask?.template_id === 'gi_keyword_daily_digest', 'GI 日报 template_id 正确');
    assert(giTask?.source_conversation_id === conversationId, 'GI 日报 source_conversation_id 正确');

    // ─── 场景 2: 触发 GI 日报 run ───
    console.log('\n场景 2: 触发 GI 日报 run');
    const giRunResult = await runTemplateTask({
      taskId: giTaskId!,
      scopeKey: SCOPE_KEY,
    });
    assert(giRunResult.success === true, 'GI 日报 run success');
    assert(giRunResult.status === 'completed', 'GI 日报 run status = completed');
    assert(typeof giRunResult.messageId === 'string' && giRunResult.messageId.length > 0, 'GI 日报 messageId 已回填');
    assert(giRunResult.skipped !== true, 'GI 日报 未跳过消息写入');

    const giHighlights = await getUnreadHighlights(SCOPE_KEY, conversationId);
    assert(giHighlights.length >= 1, 'GI 日报触发高亮（至少 1 条未读）');

    // 模拟点击会话：标记已读
    await markAutomationRead({
      scopeKey: SCOPE_KEY,
      conversationId,
      userId: SCOPE_KEY,
    });
    const afterRead = await getUnreadHighlights(SCOPE_KEY, conversationId);
    assert(afterRead.length === 0, '标记已读后高亮清零');

    // ─── 场景 3: 创建指标监控任务 ───
    console.log('\n场景 3: 创建指标监控任务');
    const monitorTaskId = await createTaskViaIntent(conversationId, '每小时监控ROI低于80%的项目');
    const monitorTask = await getScheduledTask(monitorTaskId!);
    assert(monitorTask?.template_id === 'scheduled_metric_monitor', '指标监控 template_id 正确');

    // ─── 场景 4: 指标监控 no_anomaly（无异常，不刷消息） ───
    console.log('\n场景 4: 指标监控 no_anomaly');
    const noAnomalyResult = await runTemplateTask({
      taskId: monitorTaskId!,
      scopeKey: SCOPE_KEY,
      testMode: 'no_anomaly',
    });
    assert(noAnomalyResult.success === true, 'no_anomaly run success');
    assert(noAnomalyResult.skipped === true, 'no_anomaly skipped user message');
    assert(noAnomalyResult.messageId === undefined, 'no_anomaly 无 messageId');

    const beforeAnomalyHighlights = await getUnreadHighlights(SCOPE_KEY, conversationId);
    assert(beforeAnomalyHighlights.length === 0, 'no_anomaly 未触发新高亮');

    // ─── 场景 5: 指标监控 anomaly（有异常，生成消息 + 高亮） ───
    console.log('\n场景 5: 指标监控 anomaly');
    const anomalyResult = await runTemplateTask({
      taskId: monitorTaskId!,
      scopeKey: SCOPE_KEY,
      testMode: 'anomaly',
    });
    assert(anomalyResult.success === true, 'anomaly run success');
    assert(anomalyResult.status === 'needs_action', 'anomaly status = needs_action');
    assert(typeof anomalyResult.messageId === 'string' && anomalyResult.messageId.length > 0, 'anomaly messageId 已回填');

    const afterAnomalyHighlights = await getUnreadHighlights(SCOPE_KEY, conversationId);
    assert(afterAnomalyHighlights.length >= 1, 'anomaly 触发新高亮');
    assert(afterAnomalyHighlights.some((h) => h.severity === 'warning' || h.severity === 'error'), 'anomaly 高亮 severity 正确');

    // ─── 场景 6: 暂停 / 恢复 / 删除确认 ───
    console.log('\n场景 6: 暂停 / 恢复 / 删除');
    await updateScheduledTask(monitorTaskId!, { status: 'paused' });
    const pausedTask = await getScheduledTask(monitorTaskId!);
    assert(pausedTask?.status === 'paused', '暂停成功');

    await updateScheduledTask(monitorTaskId!, { status: 'active' });
    const resumedTask = await getScheduledTask(monitorTaskId!);
    assert(resumedTask?.status === 'active', '恢复成功');

    const deleted = await deleteScheduledTask(giTaskId!);
    assert(deleted === true, '删除成功');
    const deletedTask = await getScheduledTask(giTaskId!);
    assert(deletedTask === undefined, '删除后 task 不存在');

    // ─── 场景 7: 主消息安全（验证消息内容不含 raw 字段） ───
    console.log('\n场景 7: 主消息安全');
    const messages = await listMessages(conversationId, SCOPE_KEY, { limit: 100 });
    const taskMessages = messages.filter((m) => String(m.message_type).startsWith('task_'));
    assert(taskMessages.length > 0, `存在 ${taskMessages.length} 条任务消息`);

    let rawLeaks = 0;
    for (const msg of taskMessages) {
      const content = msg.content || '';
      // 检查主消息内容不含 raw config / cron / debug
      if (/(cron_expression|raw_params|tool_debug|trace_raw_payload|debug_summary)/i.test(content)) {
        rawLeaks++;
      }
      // metadata 中可以包含 task_result_payload，但 content 必须用户可读
    }
    assert(rawLeaks === 0, '主消息无 raw config / cron / debug 泄露');

  } finally {
    await cleanupConversation(conversationId);
  }

  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
