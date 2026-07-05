/**
 * Skill Pipeline Stage
 *
 * 统一 Skill Pipeline Stage。当 Plan Arbitration 选中 skill 时执行。
 * 替代硬编码的 ad-label-aggregation-stage.ts。
 */

import type { StreamIO, ChatPipelineContext, ChatPipelineResult } from './pipeline-types';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { getSkillContract } from '@/lib/skill-contract-store';
import { evaluateSkillExecutionPolicy } from '@/lib/skill-execution-policy';
import { executeSkill } from '@/lib/skill-adapter';
import type { SkillExecutionInput } from '@/lib/skill-execution-types';
import type { SkillAdapterContext, SkillExecutionResult } from '@/lib/skill-adapter-types';

function buildSkillExecutionInput(ctx: ChatPipelineContext): SkillExecutionInput {
  return {
    skillId: ctx.executionTarget?.skillId || '',
    question: ctx.question || ctx.message,
    executeMode: 'execute_query',
    traceId: ctx.traceId,
    userScope: ctx.userScope!,
    conversationId: ctx.conversationId,
    skillContractVersion: '',
  };
}

export async function executeSkillStage(
  ctx: ChatPipelineContext,
  io: StreamIO,
): Promise<ChatPipelineResult> {
  const target = ctx.executionTarget;
  if (!target || target.type !== 'skill') return {};

  const skillId = target.skillId;
  if (!skillId) return {};

  // Readiness gate
  if (target.readiness !== 'ready' && target.readiness !== 'executable') {
    io.pushEvent(createProcessEvent({
      type: 'skill.blocked',
      label: 'Skill 未就绪',
      summary: `Skill ${skillId} 状态为 ${target.readiness || 'unknown'}，无法执行`,
      status: 'rejected',
    }));
    return {};
  }

  const contract = await getSkillContract(skillId);
  if (!contract) return {};

  const execInput = buildSkillExecutionInput(ctx);
  execInput.skillContractVersion = contract.version || 'unknown';

  // Execution policy
  const policy = evaluateSkillExecutionPolicy(execInput, contract, ctx.userScope);
  if (!policy.allowed) {
    io.pushEvent(createProcessEvent({
      type: 'skill.blocked',
      label: '执行策略阻断',
      summary: policy.reason || 'Skill 执行策略不允许',
      status: 'rejected',
      skill_id: skillId,
    }));
    io.push({ type: 'content', content: `操作被阻断：${policy.reason || '权限不足'}` });
    io.close();
    return { terminal: true };
  }

  // Execute via universal adapter
  io.pushEvent(createProcessEvent({
    type: 'skill.started',
    label: `执行 ${contract.name}`,
    summary: `开始执行 Skill: ${contract.name}`,
    skill_id: contract.skill_id,
  }));

  let result: SkillExecutionResult;
  try {
    result = await executeSkill({
      input: execInput,
      contract,
      mcpServers: ctx.routeServers,
      streamIO: io,
      pipelineCtx: ctx,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    io.pushEvent(createProcessEvent({
      type: 'skill.failed',
      label: contract.name,
      summary: `Skill 执行异常：${errMsg}`,
      status: 'error',
      skill_id: contract.skill_id,
    }));
    io.push({ type: 'content', content: `Skill 执行失败：${errMsg}` });
    io.close();
    return { terminal: true, content: errMsg };
  }

  // Partial → degrade but don't terminate pipeline
  if (result.status === 'partial') {
    io.pushEvent(createProcessEvent({
      type: 'skill.degraded',
      label: '部分完成',
      summary: `Skill 部分完成 (${result.workflowTrace.filter(t => t.status === 'completed').length}/${result.workflowTrace.length} 步骤成功)`,
      status: 'error',
      skill_id: contract.skill_id,
    }));
    return {
      terminal: false,
      semanticResult: result.semanticResult,
      messageContract: result.messageContract,
      metadata: { skillDegraded: true, skillStatus: 'partial' },
    };
  }

  if (result.status === 'blocked') {
    io.pushEvent(createProcessEvent({
      type: 'skill.blocked',
      label: '执行阻断',
      summary: result.error?.message || 'Skill 执行被阻断',
      status: 'rejected',
      skill_id: contract.skill_id,
    }));
    return { terminal: false };
  }

  io.pushEvent(createProcessEvent({
    type: 'skill.finished',
    label: contract.name,
    summary: 'Skill 执行完成',
    status: 'success',
    skill_id: contract.skill_id,
  }));

  return {
    terminal: true,
    semanticResult: result.semanticResult,
    messageContract: result.messageContract,
    workflowResult: {
      task_id: `skill-${contract.skill_id}-${Date.now()}`,
      result_type: 'report_query_result' as const,
      structured_payload: {
        steps: result.workflowTrace.map(t => ({ key: t.stepKey, label: t.label, status: t.status === 'completed' ? 'success' : t.status })),
        toolCalls: result.toolCalls.map(tc => ({ toolName: tc.toolName, status: tc.status })),
      },
      created_at: new Date().toISOString(),
      kind: 'diagnosis' as const,
      next_actions: [],
      pending_checks: [],
    },
  };
}
