/**
 * Automation Stage
 *
 * Chat Pipeline 的自动化任务处理阶段。
 * 当 understanding stage 检测到自动化意图时，路由到此 stage。
 *
 * 负责：
 * - 任务创建 proposal
 * - 任务修改/暂停/恢复/删除/重跑
 * - 任务状态/历史查询
 */

import { detectAutomationIntent, isAutomationIntent } from '@/lib/automation-intent-router';
import { handleAutomationIntent } from '@/lib/automation-task-lifecycle';
import type { StreamIO, ChatPipelineContext } from './pipeline-types';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { addMessage } from '@/lib/conversation-store';
import { createRuntimeState } from '@/lib/chat-runtime/runtime-state';
import { buildResponseContract } from '@/lib/response-contract';
import type { MessageType } from '@/types';

function hasAutomationCandidateSignal(message: string): boolean {
  return /每天|每日|每小时|每周|定时|周期|定期|任务|自动|帮我|生成|更新|检查/.test(message);
}

export interface AutomationStageResult {
  terminal: boolean;
  handled: boolean;
  messageType?: string;
  taskId?: string;
  content?: string;
}

/**
 * 执行自动化 stage
 */
export async function executeAutomationStage(
  ctx: ChatPipelineContext,
  streamIO: StreamIO,
): Promise<AutomationStageResult> {
  // 检测自动化意图。优先使用原始用户输入，避免受控词典归一化改写掉任务模板信号。
  const history = ctx.body.history as Array<{ role: string; content: string; intent_type?: string }> | undefined;
  const rawMessage = typeof ctx.body.message === 'string' && ctx.body.message.trim()
    ? ctx.body.message
    : ctx.message;
  if (hasAutomationCandidateSignal(rawMessage) || hasAutomationCandidateSignal(ctx.message)) {
    streamIO.pushEvent(createProcessEvent({
      type: 'route_observation',
      label: '任务候选检查',
      summary: '发现可能的任务处理表达，进入任务候选识别。',
      status: 'running',
      visibility: 'internal',
    }));
  }

  const rawIntent = detectAutomationIntent({ message: rawMessage, history });
  const normalizedIntent = isAutomationIntent(rawIntent)
    ? rawIntent
    : detectAutomationIntent({ message: ctx.message, history });
  const intent = normalizedIntent;

  if (!isAutomationIntent(intent)) {
    return { terminal: false, handled: false };
  }

  // 推送 process event
  streamIO.pushEvent(createProcessEvent({
    type: 'route.resolved',
    label: '识别任务意图',
    summary: `准备处理：${intent.automation_intent}`,
    status: 'running',
  }));

  // 处理自动化意图
  const result = await handleAutomationIntent(intent, {
    scopeKey: ctx.userScopeKey,
    conversationId: ctx.conversationId,
    userId: ctx.userScopeKey,
  });

  if (!result.success && result.error) {
    streamIO.pushEvent(createProcessEvent({
      type: 'fallback_failed',
      label: '处理任务',
      summary: result.error,
      status: 'error',
    }));
  }

  const messageType = (result.messageType || 'assistant_reply') as MessageType;

  // 写入 assistant 消息
  try {
    await addMessage(ctx.conversationId, {
      role: 'assistant',
      content: result.content,
      message_type: messageType,
      metadata: {
        automation_intent: intent.automation_intent,
        task_id: result.taskId,
        template_id: intent.template_id,
      },
    }, ctx.userScopeKey);
  } catch {
    // 消息写入失败不阻塞
  }

  // 推送最终结果到 SSE
  streamIO.push({
    type: 'automation_result',
    automation_intent: intent.automation_intent,
    content: result.content,
    message_type: messageType,
    task_id: result.taskId,
  });

  streamIO.pushEvent(createProcessEvent({
    type: 'fallback_success',
    label: '任务处理完成',
    summary: intent.automation_intent,
    status: 'success',
  }));

  await streamIO.endPlanningAndStartExecution();

  const runtimeState = createRuntimeState(
    ctx.startedAt,
    'completed',
    ['understanding', 'context_loading', 'response_generation'],
    result.success ? 'completed' : 'degraded',
  );
  const responseContract = buildResponseContract({
    status: result.success ? 'success' : 'degraded',
    intentType: 'general',
    traceId: ctx.traceId,
    answer: result.content,
    processEvents: streamIO.getProcessEvents(),
    metadata: {
      automation_intent: intent.automation_intent,
      task_id: result.taskId,
      template_id: intent.template_id,
      message_type: messageType,
      evidence_mode: 'no_external_evidence_required',
    },
  });

  streamIO.pushRuntimeState('response_generation', ['understanding', 'context_loading'], runtimeState.status);
  streamIO.push({ type: 'content', content: result.content });
  streamIO.push({
    type: 'done',
    result: {
      answer: result.content,
      response_contract: responseContract,
      runtime_state: runtimeState,
      task_id: result.taskId,
      message_type: messageType,
    },
    metadata: {
      process_events: streamIO.getProcessEvents(),
      runtime_state: runtimeState,
      response_contract: responseContract,
      thread_id: ctx.conversationId,
      message_id: ctx.traceId,
      turn_id: result.taskId || ctx.traceId,
      automation_intent: intent.automation_intent,
      task_id: result.taskId,
      message_type: messageType,
    },
  });
  streamIO.close();

  return {
    terminal: true,
    handled: true,
    messageType: messageType,
    taskId: result.taskId,
    content: result.content,
  };
}
