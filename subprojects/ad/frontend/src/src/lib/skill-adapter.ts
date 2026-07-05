/**
 * Universal Skill Adapter
 *
 * 通用 Skill 执行入口。遍历 SkillContract.workflow_steps，
 * 顺序调用 MCP tools，组装 SemanticResultContract。
 *
 * 设计原则：
 * - Adapter 只做 MCP tool 调用编排和结果投影，不启动独立 LLM 对话
 * - 每个 step 推送 skill.step SSE 事件（渐进式披露）
 * - 支持 branch 分支步骤
 * - 非必需步骤失败时 workflow 继续（partial 状态）
 */

import type { McpServerConfig, SkillContract } from '@/types';
import { callMcpTool } from '@/lib/mcp-discovery';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import type { SkillAdapterContext, SkillExecutionResult, SkillToolCallResult } from '@/lib/skill-adapter-types';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import type { EvidenceRef } from '@/contracts/semantic/evidence-contract';
import type { SourceRef } from '@/contracts/semantic/source-contract';
import type { MessageContract, AgentProcessEvent } from '@/types';
import { buildSkillCapabilityId } from '@/lib/skill-capability-projection';

// ─── MCP Tool Lookup ────────────────────────────────────────

interface ResolvedTool {
  server: McpServerConfig;
  toolName: string;
}

function findToolInServers(
  toolName: string,
  servers: McpServerConfig[],
): ResolvedTool | undefined {
  for (const server of servers) {
    const tool = (server.tools || []).find(t => t.name === toolName);
    if (tool) {
      return { server, toolName };
    }
  }
  return undefined;
}

// ─── Input Building ─────────────────────────────────────────

function buildStepToolInput(
  stepKey: string,
  input: SkillAdapterContext['input'],
  previousOutputs: Map<string, Record<string, unknown>>,
): Record<string, unknown> {
  const args: Record<string, unknown> = {
    question: input.question,
    traceId: input.traceId,
  };

  // Map executeMode to MCP tool parameters
  if (input.executeMode === 'execute_query') {
    args.execute = true;
  } else if (input.executeMode === 'generate_sql_only') {
    args.execute = false;
  }

  // Include previous step outputs for chained workflows
  if (previousOutputs.size > 0) {
    args.previousSteps = Object.fromEntries(previousOutputs);
  }

  return args;
}

// ─── Semantic Result Building ───────────────────────────────

function buildSkillSemanticResult(
  contract: SkillContract,
  executionResult: SkillExecutionResult,
): SemanticResultContract<Record<string, unknown>> {
  const statusText = executionResult.status === 'success'
    ? '执行完成'
    : executionResult.status === 'partial'
      ? '部分完成'
      : '执行失败';

  return {
    contractType: 'semantic-result',
    version: '1.0.0',
    resultId: `skill-${contract.skill_id}-${Date.now()}`,
    screenType: 'workflow-result',
    title: contract.name,
    description: `${contract.name} ${statusText}`,
    createdAt: new Date().toISOString(),
    producer: { kind: 'workflow', name: contract.skill_id },
    regions: [
      {
        id: 'workflow-trace',
        type: 'primary-result',
        componentBinding: 'workflow-trace',
        title: '执行过程',
        state: 'ready',
        data: { workflowTrace: executionResult.workflowTrace },
      },
    ],
    evidenceRefs: executionResult.evidenceRefs,
    sourceRefs: executionResult.sourceRefs,
    metadata: {
      skillId: contract.skill_id,
      status: executionResult.status,
      toolCallCount: executionResult.toolCalls.length,
    },
  };
}

function buildMessageContract(
  result: SkillExecutionResult,
): MessageContract {
  const completedCount = result.workflowTrace.filter(t => t.status === 'completed').length;
  const answerMarkdown = result.status === 'success'
    ? `**${result.skillId}** 执行完成。完成 ${completedCount}/${result.workflowTrace.length} 个步骤。`
    : result.status === 'partial'
      ? `**${result.skillId}** 部分完成。完成 ${completedCount}/${result.workflowTrace.length} 个步骤。`
      : `**${result.skillId}** 执行失败。${result.error?.message || ''}`;

  return {
    type: 'report_query',
    answer_markdown: answerMarkdown,
    business_summary: {
      title: `${result.skillId} 执行结果`,
      brief: `状态: ${result.status}，完成 ${completedCount}/${result.workflowTrace.length} 步骤`,
      severity: result.status === 'failed' ? 'high' : 'info',
    },
    runtime_state: {
      current_stage: 'completed',
      completed_stages: ['understanding', 'context_loading', 'data_fetching'],
      status: result.status === 'success' ? 'completed' : 'failed',
      started_at: new Date().toISOString(),
    },
  };
}

// ─── Push Helper ─────────────────────────────────────────────

function pushStepEvent(
  ctx: SkillAdapterContext,
  stepKey: string,
  label: string,
  status: 'running' | 'success' | 'failed',
  currentStep: number,
  totalSteps: number,
  durationMs?: number,
): void {
  const event = createProcessEvent({
    type: 'skill.step',
    label,
    summary: status === 'running'
      ? `正在执行: ${label}`
      : `完成: ${label}`,
    status: status === 'failed' ? 'error' : 'success',
    skill_id: ctx.contract.skill_id,
  });
  // Attach step metadata
  const enriched = { ...event, step_key: stepKey, current_step: currentStep, total_steps: totalSteps };
  if (durationMs) (enriched as Record<string, unknown>).duration_ms = durationMs;
  ctx.streamIO.pushEvent(enriched as unknown as AgentProcessEvent);
}

// ─── Main Adapter ────────────────────────────────────────────

export async function executeSkill(
  ctx: SkillAdapterContext,
): Promise<SkillExecutionResult> {
  const { contract, mcpServers, input, streamIO } = ctx;
  const steps = contract.workflow_steps || [];
  const totalSteps = steps.length;

  const toolCalls: SkillToolCallResult[] = [];
  const workflowTrace: SkillExecutionResult['workflowTrace'] = [];
  const evidenceRefs: EvidenceRef[] = [];
  const sourceRefs: SourceRef[] = [];
  const previousOutputs = new Map<string, Record<string, unknown>>();

  let overallStatus: SkillExecutionResult['status'] = 'success';
  let currentBranch: string | undefined;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepKey = step.key;

    // Branch check: skip steps that don't match the current branch
    if (step.branch && currentBranch && step.branch !== currentBranch && step.branch !== 'common') {
      workflowTrace.push({
        stepKey,
        label: step.label,
        status: 'skipped',
        durationMs: 0,
        branchResult: step.branch,
      });
      continue;
    }

    // Branch decision step: if no toolBindings but has branch, treat as branch-setter
    if (step.branch && !step.tool_bindings?.length) {
      currentBranch = step.branch;
      workflowTrace.push({
        stepKey,
        label: step.label,
        status: 'completed',
        durationMs: 0,
        branchResult: step.branch,
      });
      continue;
    }

    // UI-only step (component rendering): skip execution, mark as completed
    if (!step.tool_bindings?.length && step.ui_component) {
      workflowTrace.push({
        stepKey,
        label: step.label,
        status: 'completed',
        durationMs: 0,
      });
      continue;
    }

    // Steps without toolBindings and without ui_component are skipped
    if (!step.tool_bindings?.length) {
      workflowTrace.push({
        stepKey,
        label: step.label,
        status: 'skipped',
        durationMs: 0,
      });
      continue;
    }

    // Push step progress event (progressive disclosure)
    pushStepEvent(ctx, stepKey, step.label, 'running', i + 1, totalSteps);

    const stepStartMs = Date.now();

    // Execute all tool bindings for this step
    let stepSuccess = true;
    for (const toolName of step.tool_bindings) {
      const resolved = findToolInServers(toolName, mcpServers);
      if (!resolved) {
        const tc: SkillToolCallResult = {
          stepKey,
          toolName,
          status: 'failed',
          result: {},
          error: `MCP tool '${toolName}' not found in configured servers`,
          durationMs: Date.now() - stepStartMs,
        };
        toolCalls.push(tc);
        stepSuccess = false;
        continue;
      }

      const toolInput = buildStepToolInput(stepKey, input, previousOutputs);
      const toolStartMs = Date.now();

      try {
        const toolResult = await callMcpTool(
          {
            endpoint_url: resolved.server.endpoint_url,
            transport: resolved.server.transport,
            auth_type: resolved.server.auth_type,
            auth_config: resolved.server.auth_config,
          },
          toolName,
          toolInput,
        );

        const durationMs = Date.now() - toolStartMs;

        if (toolResult.ok) {
          const resultData = (toolResult.result || {}) as Record<string, unknown>;
          previousOutputs.set(stepKey, resultData);

          const tc: SkillToolCallResult = {
            stepKey,
            toolName,
            serverId: resolved.server.id,
            status: 'success',
            result: resultData,
            durationMs,
            inputSummary: { question: input.question, executeMode: input.executeMode },
          };
          toolCalls.push(tc);

          // Extract evidence and source refs from result
          if (resultData.traceId) {
            sourceRefs.push({
              type: 'tool',
              locator: { value: `mcp:${resolved.server.id || 'unknown'}:${toolName}` },
            } as SourceRef);
          }
        } else {
          const tc: SkillToolCallResult = {
            stepKey,
            toolName,
            serverId: resolved.server.id,
            status: 'failed',
            result: {},
            error: toolResult.msg || toolResult.error_code || 'Unknown error',
            durationMs,
          };
          toolCalls.push(tc);
          stepSuccess = false;
        }
      } catch (err) {
        const durationMs = Date.now() - toolStartMs;
        const tc: SkillToolCallResult = {
          stepKey,
          toolName,
          serverId: resolved.server.id,
          status: 'failed',
          result: {},
          error: err instanceof Error ? err.message : String(err),
          durationMs,
        };
        toolCalls.push(tc);
        stepSuccess = false;
      }
    }

    const stepDurationMs = Date.now() - stepStartMs;

    workflowTrace.push({
      stepKey,
      label: step.label,
      status: stepSuccess ? 'completed' : 'failed',
      toolCallIndex: toolCalls.length - (step.tool_bindings?.length || 0),
      durationMs: stepDurationMs,
    });

    // Push step completion
    pushStepEvent(ctx, stepKey, step.label, stepSuccess ? 'success' : 'failed', i + 1, totalSteps, stepDurationMs);

    // Determine overall status
    const isRequired = step.required !== false;
    if (!stepSuccess && isRequired) {
      overallStatus = 'partial';
    }
  }

  // Build result
  const result: SkillExecutionResult = {
    status: overallStatus,
    skillId: contract.skill_id,
    capabilityId: buildSkillCapabilityId(contract.skill_id),
    toolCalls,
    workflowTrace,
    evidenceRefs,
    sourceRefs,
    semanticResult: {} as SemanticResultContract<Record<string, unknown>>, // Placeholder, filled below
    messageContract: {} as MessageContract, // Placeholder, filled below
  };

  // Build semantic result
  result.semanticResult = buildSkillSemanticResult(contract, result);

  // Build message contract (required)
  result.messageContract = buildMessageContract(result);

  if (overallStatus !== 'success') {
    const failedSteps = workflowTrace.filter(t => t.status === 'failed');
    result.error = {
      code: 'tool_failed',
      message: `${failedSteps.length}/${totalSteps} 步骤失败`,
      stepKey: failedSteps[0]?.stepKey,
      toolName: toolCalls.find(tc => tc.status === 'failed')?.toolName,
    };
  }

  return result;
}

// Export as default adapter
export const GenericMcpStepAdapter = executeSkill;
