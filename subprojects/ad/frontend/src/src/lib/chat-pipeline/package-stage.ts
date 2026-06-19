/**
 * Package Stage
 *
 * 当路由意图为 get_delivery_packages 且选中了 package skill 时执行。
 * 当前实现为模型生成回答模式，后续可接入真实 MCP 工具调用。
 */

import type { StreamIO, ChatPipelineContext, ChatPipelineResult } from './pipeline-types';
import { createRuntimeState } from '@/lib/chat-runtime/runtime-state';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { runChatModelNode } from '@/lib/runner-stages/assembly-helpers';
import { buildResponseContract } from '@/lib/response-contract';
import { buildTraceUrl } from '@/lib/trace';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import { emitChatMessageTrace } from '@/app/api/chat/chat-trace';
import { recordEvidence } from '@/lib/evidence-ledger';
import { getModelServiceConfig } from '@/lib/runtime-config';
import { getSkillContract } from '@/lib/skill-contract-store';
import {
  createWorkflowTask,
  startWorkflowRun,
  updateWorkflowRun,
} from '@/lib/workflow-task-store';
import type { MessageContract } from '@/types';
import type { SkillContract } from '@/types';

// ─── Package Skill Governance ──────────────────────────

function isGovernedPackageSkill(contract: SkillContract | undefined): boolean {
  if (!contract || contract.enabled === false) return false;
  const workflowBindings = (contract.workflow_steps || [])
    .flatMap(step => Array.isArray(step.tool_bindings) ? step.tool_bindings : [])
    .join('\n');
  const outputProperties = contract.output_schema && typeof contract.output_schema === 'object'
    ? Object.keys((contract.output_schema as { properties?: Record<string, unknown> }).properties || {}).join('\n')
    : '';
  return contract.category === 'integration'
    && (
      /package/i.test(workflowBindings)
      || /packages|deliverable_packages/i.test(outputProperties)
    );
}

function isPackageDeliveryContract(contract: SkillContract | undefined): boolean {
  if (!contract) return false;
  const outputProperties = contract.output_schema && typeof contract.output_schema === 'object'
    ? Object.keys((contract.output_schema as { properties?: Record<string, unknown> }).properties || {}).join('\n')
    : '';
  return /deliverable_packages/i.test(outputProperties)
    || (contract.workflow_steps || []).some(step => (step.tool_bindings || []).some(binding => /create_sub_package|sync_media_sub_package/i.test(binding)));
}

// ─── Stage Entry Check ─────────────────────────────────

export function shouldEnterPackageStage(ctx: ChatPipelineContext): boolean {
  const route = ctx.route;
  const skillSelection = ctx.skillSelection;
  const selectedSkill = skillSelection.selected?.skill;

  return (
    route.intent_type === 'get_delivery_packages' &&
    Boolean(selectedSkill?.skill_id)
  );
}

// ─── Main Stage Function ───────────────────────────────

export async function executePackageStage(
  ctx: ChatPipelineContext,
  io: StreamIO,
): Promise<ChatPipelineResult> {
  if (!shouldEnterPackageStage(ctx)) {
    return {};
  }

  const route = ctx.route;
  const skillSelection = ctx.skillSelection;
  const selectedSkill = skillSelection.selected!.skill;
  const selectedSkillContract = await getSkillContract(selectedSkill.skill_id);
  if (!isGovernedPackageSkill(selectedSkillContract)) {
    return {};
  }

  const {
    question,
    conversationId,
    traceId,
    startedAt,
    message,
    promptConfigMetadata,
    compiledContext,
    projectContextSummary,
  } = ctx;

  io.push({ type: 'route', intent: route.intent_type, hasThinking: false, tools_used: [] });
  io.pushRuntimeState('data_fetching', ['understanding', 'context_loading']);

  // ─── Create Workflow Task ─────────────────────────────
  const isDelivery = isPackageDeliveryContract(selectedSkillContract);
  const task = await createWorkflowTask({
    conversation_id: conversationId,
    task_type: 'package',
    workflow_level: isDelivery ? 'heavy' : 'light',
    title: selectedSkill.name,
    summary: question,
    route_reason: route.reason as string,
    workflow_state: 'running',
  });
  const run = await startWorkflowRun({
    taskId: task.task_id,
    conversationId,
    intentType: 'get_delivery_packages',
    workflowLevel: isDelivery ? 'heavy' : 'light',
    routeReason: route.reason as string,
    metadata: { question, skillId: selectedSkill.skill_id },
  });

  io.pushEvent(createProcessEvent({
    type: 'skill.selected',
    label: '选择 Skill',
    summary: `已选择 ${selectedSkill.name}`,
    status: 'success',
    intent_type: 'delivery',
    agent: 'package',
    skill_id: selectedSkill.skill_id,
    skill_name: selectedSkill.name,
    output: { skill_id: selectedSkill.skill_id, task_id: task.task_id },
  }));

  // ─── Generate Answer ──────────────────────────────────
  const modelServiceConfig = await getModelServiceConfig();
  const fallbackText = buildPackageFallbackAnswer({ isDelivery, question });

  const packageAnswerResult = await runChatModelNode({
    useCase: 'chat_answer',
    fallbackText,
    modelServiceConfig,
    input: {
      message,
      question,
      skillId: selectedSkill.skill_id,
      skillName: selectedSkill.name,
      skillDescription: selectedSkill.description,
      businessContext: compiledContext.businessContext,
      projectContextSummary,
    },
    consume: {
      enabled: false,
      consumedBy: 'package_answer',
      textField: 'answerMarkdown',
    },
    traceMeta: { intent: 'package', phase: 'execution' },
  });

  const answer = packageAnswerResult.text || fallbackText;

  // ─── Record Evidence ──────────────────────────────────
  io.setEvidenceLedger(recordEvidence(io.getEvidenceLedger(), {
    source: 'planner_inference',
    sourceId: 'package_skill',
    confidence: 'high_probability',
    content: {
      skill_id: selectedSkill.skill_id,
      question,
      answer_preview: answer.slice(0, 200),
    },
  }));

  // ─── Update Workflow Task ─────────────────────────────
  await updateWorkflowRun(task.task_id, run.run_id, {
    status: 'completed',
    metadata: { answer_preview: answer.slice(0, 200) },
  });

  io.pushEvent(createProcessEvent({
    type: 'skill.finished',
    label: '包查询完成',
    summary: isDelivery ? '投放包交付完成' : '包信息查询完成',
    status: 'success',
    intent_type: 'delivery',
    agent: 'package',
    output: { task_id: task.task_id },
  }));

  // ─── Build Response ───────────────────────────────────
  const responseContract = buildResponseContract({
    status: 'success',
    intentType: 'get_delivery_packages',
    traceId,
    answer,
    processEvents: io.getProcessEvents(),
    metadata: {
      skill_id: selectedSkill.skill_id,
      task_id: task.task_id,
      run_id: run.run_id,
    },
  });

  // ─── Emit Trace ───────────────────────────────────────
  const traceConfig = getTraceConfigSync();
  if (traceConfig.enabled) {
    await emitChatMessageTrace({
      traceId,
      message,
      conversationId,
      threadId: conversationId,
      messageId: traceId,
      turnId: traceId,
      intentType: 'get_delivery_packages',
      status: 'success',
    });
  }

  // ─── Push Done ────────────────────────────────────────
  const finalRuntimeState = createRuntimeState(
    startedAt,
    'completed',
    ['understanding', 'context_loading', 'data_fetching', 'response_generation'],
    'completed',
  );

  io.push({
    type: 'done',
    result: {
      answer,
      response_contract: responseContract,
    },
    metadata: {
      process_events: io.getProcessEvents(),
      prompt_config: promptConfigMetadata,
      runtime_state: finalRuntimeState,
      response_contract: responseContract,
      trace_meta: traceConfig.enabled ? { trace_url: buildTraceUrl(traceId) } : undefined,
      thread_id: conversationId,
      message_id: traceId,
      turn_id: traceId,
    },
  });
  io.close();

  return {
    terminal: true,
    content: answer,
    finalRuntimeState,
  };
}

// ─── Fallback Answer ───────────────────────────────────

function buildPackageFallbackAnswer(params: { isDelivery: boolean; question: string }): string {
  if (params.isDelivery) {
    return [
      '## 投放包交付',
      '',
      `您的问题：${params.question}`,
      '',
      '正在为您查询可投放包信息...',
      '',
      '> 提示：完整的包交付功能需要配置对应的 MCP 工具（如 get_app_package_list、zhitou_package.channel_package_query）。',
      '> 当前为模型生成回答模式。',
    ].join('\n');
  }

  return [
    '## 包信息查询',
    '',
    `您的问题：${params.question}`,
    '',
    '正在为您查询包信息和状态...',
    '',
    '> 提示：完整的包查询功能需要配置对应的 MCP 工具（如 get_app_package_list）。',
    '> 当前为模型生成回答模式。',
  ].join('\n');
}
