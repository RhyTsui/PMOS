/**
 * Skill Adapter Types
 *
 * 定义通用 Skill Adapter 的输入、输出和执行上下文类型。
 * 放在 src/lib/ 而非 src/contracts/skills/ 因为依赖 StreamIO 和 ChatPipelineContext (lib 层类型)。
 */

import type { SkillContract, McpServerConfig, MessageContract } from '@/types';
import type { SkillExecutionInput, SkillExecutionPolicyResult } from '@/lib/skill-execution-types';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import type { EvidenceRef } from '@/contracts/semantic/evidence-contract';
import type { SourceRef } from '@/contracts/semantic/source-contract';
import type { StreamIO, ChatPipelineContext } from '@/lib/chat-pipeline/pipeline-types';

// ─── Adapter Context ────────────────────────────────────────

export interface SkillAdapterContext {
  input: SkillExecutionInput;
  contract: SkillContract;
  mcpServers: McpServerConfig[];
  streamIO: StreamIO;
  pipelineCtx: ChatPipelineContext;
}

// ─── Tool Call Result ───────────────────────────────────────

export interface SkillToolCallResult {
  stepKey: string;
  toolName: string;
  serverId?: string;
  status: 'success' | 'empty' | 'failed' | 'skipped';
  result: Record<string, unknown>;
  error?: string;
  durationMs: number;
  /** 工具输入参数摘录（脱敏后，用于 trace） */
  inputSummary?: Record<string, unknown>;
}

// ─── Execution Result ───────────────────────────────────────

export interface SkillExecutionResult {
  status: 'success' | 'blocked' | 'partial' | 'failed';
  skillId: string;
  /** 对应的 CapabilityCatalog capabilityId（skill:{skillId}） */
  capabilityId: string;
  policyResult?: SkillExecutionPolicyResult;
  toolCalls: SkillToolCallResult[];
  semanticResult: SemanticResultContract<Record<string, unknown>>;
  evidenceRefs: EvidenceRef[];
  sourceRefs: SourceRef[];
  workflowTrace: Array<{
    stepKey: string;
    label: string;
    status: 'completed' | 'failed' | 'skipped';
    toolCallIndex?: number;
    durationMs?: number;
    /** 分支决策结果（仅 branch 步骤） */
    branchResult?: string;
  }>;
  /** 必须的 MessageContract，用于前端渲染 */
  messageContract: MessageContract;
  /** 聚合错误信息，对齐 CapabilityManifest.errorTaxonomy */
  error?: {
    code: 'tool_failed' | 'policy_blocked' | 'permission_denied'
        | 'schema_mismatch' | 'unavailable' | 'empty_result';
    message: string;
    stepKey?: string;
    toolName?: string;
  };
  /** 执行元数据 */
  metadata?: Record<string, unknown>;
}

// ─── Adapter Function Signature ─────────────────────────────

/** 通用 Skill Adapter 函数签名。
 *  消费 SkillAdapterContext，产出 SkillExecutionResult。
 *  默认实现是 GenericMcpStepAdapter —— 遍历 workflow_steps 顺序调用 MCP tools。
 */
export type SkillAdapter = (
  ctx: SkillAdapterContext,
) => Promise<SkillExecutionResult>;
