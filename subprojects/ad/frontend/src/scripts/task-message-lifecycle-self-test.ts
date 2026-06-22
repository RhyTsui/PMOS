/**
 * Task Message Lifecycle Self-Test
 *
 * 测试 TaskMessageWriter + ConversationHighlightService + Template Registry + Risk Policy
 */

import { writeTaskRunMessage, writeTaskStatusMessage, writeTaskProposalMessage } from '../src/lib/task-message-writer';
import { markAutomationUnread, markAutomationRead, getUnreadHighlights, getConversationHighlightSummary } from '../src/lib/conversation-highlight-store';
import { getTaskTemplate, guessTemplateFromInput, listTaskTemplates, TASK_TEMPLATE_REGISTRY } from '../src/contracts/automation/task-template-registry';
import { getTaskRiskPolicy, canTaskAutoExecute, requiresTaskConfirmation } from '../src/contracts/automation/task-risk-policy';
import { resolveTaskMessageType, shouldGenerateTaskMessage, buildTaskResultPayload } from '../src/contracts/automation/task-message-contract';
import { detectAutomationIntent, isAutomationIntent } from '../src/lib/automation-intent-router';

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

async function main() {
  console.log('=== Task Message Contract ===');

  assert(resolveTaskMessageType('completed') === 'task_run_completed', 'completed → task_run_completed');
  assert(resolveTaskMessageType('partial') === 'task_run_completed', 'partial → task_run_completed');
  assert(resolveTaskMessageType('failed') === 'task_run_failed', 'failed → task_run_failed');
  assert(resolveTaskMessageType('needs_action') === 'task_needs_action', 'needs_action → task_needs_action');
  assert(resolveTaskMessageType('skipped') === 'task_run_skipped', 'skipped → task_run_skipped');
  assert(shouldGenerateTaskMessage('completed') === true, 'completed generates message');
  assert(shouldGenerateTaskMessage('skipped') === false, 'skipped does not generate message');

  const payload = buildTaskResultPayload({
    taskId: 'task-1',
    runId: 'run-1',
    taskTitle: '测试任务',
    runStatus: 'completed',
    summary: '测试摘要',
  });
  assert(payload.task_id === 'task-1', 'payload task_id');
  assert(payload.display_mode === 'compact', 'payload display_mode default compact');

  console.log('\n=== Task Template Registry ===');

  assert(Object.keys(TASK_TEMPLATE_REGISTRY).length === 4, '4 standard templates registered');
  assert(getTaskTemplate('scheduled_join_table')?.name === '拼表 + 定时更新', 'join_table template');
  assert(getTaskTemplate('scheduled_aggregate_table')?.name === '聚合表 + 定时更新', 'aggregate_table template');
  assert(getTaskTemplate('gi_keyword_daily_digest')?.name === 'GI 日报 + 关键词定制', 'daily_digest template');
  assert(getTaskTemplate('scheduled_metric_monitor')?.name === '指标监控 + 定时更新', 'metric_monitor template');
  assert(listTaskTemplates().length === 4, 'listTaskTemplates returns 4');

  assert(guessTemplateFromInput('每天帮我更新这个拼表') === 'scheduled_join_table', 'registry intent: 拼表');
  assert(guessTemplateFromInput('每天聚合各渠道数据') === 'scheduled_aggregate_table', 'registry intent: 聚合表');
  assert(guessTemplateFromInput('每天给我一份游戏行业情报日报') === 'gi_keyword_daily_digest', 'registry intent: GI日报');
  assert(guessTemplateFromInput('每小时监控指标异常') === 'scheduled_metric_monitor', 'registry intent: 指标监控');

  console.log('\n=== Task Risk Policy ===');

  assert(canTaskAutoExecute('L0') === true, 'L0 can auto execute');
  assert(canTaskAutoExecute('L3') === true, 'L3 can auto execute');
  assert(canTaskAutoExecute('L5') === false, 'L5 cannot auto execute');
  assert(requiresTaskConfirmation('L4') === true, 'L4 requires confirmation');
  assert(requiresTaskConfirmation('L5') === true, 'L5 requires confirmation');
  assert(requiresTaskConfirmation('L1') === false, 'L1 does not require confirmation');

  const l5Policy = getTaskRiskPolicy('L5');
  assert(l5Policy.forbidAutoExecute === true, 'L5 forbidAutoExecute');
  assert(l5Policy.confirmationMessage?.includes('高风险') === true, 'L5 confirmation message mentions high risk');

  console.log('\n=== Automation Intent Router ===');

  const createIntent = detectAutomationIntent({ message: '每天9点帮我更新这个拼表' });
  assert(createIntent.automation_intent === 'create', 'detect create intent from governed template');
  assert(createIntent.template_id === 'scheduled_join_table', 'resolve template from registry');
  assert(createIntent.slots.schedule === 'daily 09:00', 'extract schedule from cadence phrase');
  assert(!createIntent.slots.media?.length, 'does not infer business media in generic router');
  assert(!createIntent.slots.metrics?.length, 'does not infer business metrics in generic router');

  const genericCreateIntent = detectAutomationIntent({ message: '每天早上9点帮我检查最新结果' });
  assert(genericCreateIntent.automation_intent === 'create', 'detect generic create intent');
  assert(genericCreateIntent.template_id === undefined, 'generic create has no forced template');

  const pauseIntent = detectAutomationIntent({ message: '暂停这个任务' });
  assert(pauseIntent.automation_intent === 'pause', 'detect pause intent');

  const resumeIntent = detectAutomationIntent({ message: '恢复这个任务' });
  assert(resumeIntent.automation_intent === 'resume', 'detect resume intent');

  const deleteIntent = detectAutomationIntent({ message: '删除这个任务' });
  assert(deleteIntent.automation_intent === 'delete', 'detect delete intent');
  assert(deleteIntent.requires_confirmation === true, 'delete requires confirmation');

  const rerunIntent = detectAutomationIntent({ message: '重新跑一次' });
  assert(rerunIntent.automation_intent === 'rerun', 'detect rerun intent');

  const updateIntent = detectAutomationIntent({ message: '时间改到下午3点' });
  assert(updateIntent.automation_intent === 'update', 'detect time update intent');
  assert(updateIntent.slots.schedule === 'daily 15:00', 'extract time from update phrase');

  const statusIntent = detectAutomationIntent({ message: '最近任务状态怎么样' });
  assert(statusIntent.automation_intent === 'ask_status', 'detect ask_status intent');

  const noneIntent = detectAutomationIntent({ message: '今天天气怎么样' });
  assert(noneIntent.automation_intent === 'none', 'non-automation intent returns none');
  assert(isAutomationIntent(noneIntent) === false, 'isAutomationIntent false for none');

  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
