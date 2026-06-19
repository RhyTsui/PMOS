import type { BusinessSummary, MessageContract, RuntimeState, WorkflowResult, AiNextAction } from '@/types';
import type { SemanticResultContract } from '../semantic/semantic-result-contract';
import { semanticResultToVizSpec } from '@/lib/report-result-visualization';

export interface ResultAssemblyWarning {
  code: string;
  message: string;
}

export interface ResultAssemblyReference {
  id: string;
  title: string;
  sourceType: string;
  detail?: string;
}

export interface ResultAssemblyContract {
  resultId: string;
  screenType: string;
  warnings: ResultAssemblyWarning[];
  sourceRefs: ResultAssemblyReference[];
  evidenceRefs: ResultAssemblyReference[];
  nextActions: string[];
}

export function buildConversationSemanticResult(args: {
  conversationId?: string;
  messageId?: string;
  traceId?: string;
  answerMarkdown: string;
  title?: string;
  createdAt?: string;
}): {
  semanticResult: SemanticResultContract;
  businessSummary: BusinessSummary;
} {
  const createdAt = args.createdAt || new Date().toISOString();
  const summaryText = args.answerMarkdown.trim();
  const businessSummary: BusinessSummary = {
    title: args.title || '对话回复',
    brief: summaryText || '已生成回复。',
    severity: 'info',
    confidence: 'medium',
    type: 'conversation_answer',
    kind: 'chat',
  };
  const resultId = `semantic-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    businessSummary,
    semanticResult: {
      contractType: 'semantic-result',
      version: 'semantic-result/v1',
      resultId,
      conversationId: args.conversationId,
      messageId: args.messageId,
      screenType: 'conversation-answer',
      title: businessSummary.title,
      description: businessSummary.brief,
      createdAt,
      producer: { kind: 'backend', name: 'result-assembly' },
      regions: [
        {
          id: 'answer_markdown',
          type: 'primary-result',
          componentBinding: 'markdown-result',
          title: '回答',
          state: summaryText ? 'ready' : 'empty',
          data: {
            markdown: args.answerMarkdown,
          },
          runtimeRefs: args.traceId ? [{ id: args.traceId, kind: 'runtime' }] : [],
          layoutHints: {
            placement: 'main',
            width: 'full',
            density: 'comfortable',
          },
        },
      ],
      runtimeRefs: args.traceId ? [{ id: args.traceId, kind: 'runtime' }] : [],
      metadata: {
        intent_type: 'general',
      },
    },
  };
}

function semanticResultToVisualizations(semanticResult?: SemanticResultContract | null): MessageContract['visualizations'] | undefined {
  const vizSpec = semanticResultToVizSpec(semanticResult);
  if (!vizSpec) return undefined;
  if (vizSpec.kind === 'chart') {
    return { charts: [vizSpec] };
  }
  if (vizSpec.kind === 'table') {
    return {
      tables: [{
        kind: 'table',
        engine: 'table',
        columns: vizSpec.columns,
        rows: vizSpec.rows,
      }],
    };
  }
  return undefined;
}

export function buildSemanticMessageContract(args: {
  type: MessageContract['type'];
  answerMarkdown: string;
  businessSummary?: BusinessSummary;
  semanticResult?: SemanticResultContract | null;
  nextActions?: AiNextAction[];
  runtimeState?: RuntimeState;
  answerPolicy?: MessageContract['answer_policy'];
  evidenceBundle?: MessageContract['evidence_bundle'];
  executionContext?: MessageContract['execution_context'];
  agentRuntime?: MessageContract['agent_runtime'];
  reasoningArtifacts?: MessageContract['reasoning_artifacts'];
  rawResult?: unknown;
}): MessageContract {
  return {
    type: args.type,
    answer_markdown: args.answerMarkdown,
    business_summary: args.businessSummary,
    visualizations: semanticResultToVisualizations(args.semanticResult),
    next_actions: args.nextActions,
    runtime_state: args.runtimeState,
    answer_policy: args.answerPolicy,
    evidence_bundle: args.evidenceBundle,
    execution_context: args.executionContext,
    agent_runtime: args.agentRuntime,
    reasoning_artifacts: args.reasoningArtifacts,
    raw_result: args.rawResult,
  };
}

export function buildSemanticWorkflowResult(args: {
  taskId: string;
  kind: WorkflowResult['kind'];
  resultType: WorkflowResult['result_type'];
  answer: string;
  businessSummary?: BusinessSummary;
  semanticResult?: SemanticResultContract | null;
  reportQueryResult?: unknown;
  answerPolicy?: WorkflowResult['answer_policy'];
  runtimeState?: WorkflowResult['runtime_state'];
  evidenceBundle?: WorkflowResult['evidence_bundle'];
  executionContext?: WorkflowResult['execution_context'];
  agentRuntime?: WorkflowResult['agent_runtime'];
  reasoningArtifacts?: WorkflowResult['reasoning_artifacts'];
  nextActions?: string[];
}): WorkflowResult {
  const reportStatus = typeof args.reportQueryResult === 'object' && args.reportQueryResult && 'status' in args.reportQueryResult
    ? String((args.reportQueryResult as { status?: unknown }).status)
    : '';
  const confidence: WorkflowResult['confidence'] = reportStatus === 'success'
    ? 'high'
    : reportStatus === 'partial' || reportStatus === 'empty'
      ? 'medium'
      : reportStatus === 'blocked' || reportStatus === 'failed'
        ? 'low'
        : args.runtimeState?.status === 'completed'
          ? 'high'
          : args.runtimeState?.status === 'degraded'
            ? 'medium'
            : 'low';

  return {
    result_id: `result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    task_id: args.taskId,
    result_type: args.resultType,
    business_summary: args.businessSummary,
    confidence,
    structured_payload: {
      report_query_result: args.reportQueryResult,
      semantic_result: args.semanticResult,
    },
    answer: args.answer,
    answer_policy: args.answerPolicy,
    runtime_state: args.runtimeState,
    evidence_bundle: args.evidenceBundle,
    execution_context: args.executionContext,
    agent_runtime: args.agentRuntime,
    reasoning_artifacts: args.reasoningArtifacts,
    next_actions: args.nextActions || [],
    pending_checks: [],
    created_at: new Date().toISOString(),
    kind: args.kind,
  } as WorkflowResult;
}
