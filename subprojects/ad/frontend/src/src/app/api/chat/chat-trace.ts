import { SpanKind } from '@cozeloop/ai';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import type { MessageRuntimeProjection } from '@/types';
import {
  buildChatTraceInput,
  buildStandardTraceInput,
  buildStandardTraceTags,
  buildTraceUrl,
  createChatSpan,
  flushTrace,
  initTrace,
  safeSetInput,
  safeSetOutput,
  safeSetTags,
  safeTraceable,
} from '@/lib/trace';
import { truncate } from '@/lib/chat-runtime/payload-compact';

export type ChatTraceStatus = 'active' | 'degraded' | 'disabled' | 'failed';

export interface ChatTraceMeta {
  trace_id: string;
  sdk_trace_id: string;
  local_trace_id: string;
  trace_url?: string;
  thread_id: string;
  message_id: string;
  turn_id: string;
  trace_status: ChatTraceStatus;
  trace_warnings?: string[];
}

type StageStatus = 'OK' | 'EMPTY' | 'SKIPPED' | 'ERROR' | 'FALLBACK';

function mapMainStatus(status: string): StageStatus {
  if (status === 'success') return 'OK';
  if (status === 'empty') return 'EMPTY';
  if (status === 'fallback' || status === 'blocked' || status === 'not_configured') return 'SKIPPED';
  return 'ERROR';
}

function mapModelStatus(modelStatus?: string): StageStatus {
  if (!modelStatus) return 'ERROR';
  return modelStatus === 'model_succeeded'
    ? 'OK'
    : modelStatus === 'disabled' || modelStatus === 'template' || modelStatus === 'not_applicable'
      ? 'SKIPPED'
      : modelStatus === 'fallback'
        || modelStatus === 'fallback_to_rules'
        || modelStatus === 'not_configured'
        ? 'FALLBACK'
        : 'ERROR';
}

function hasValidTraceEndpoint(apiUrl?: string): boolean {
  if (!apiUrl) return false;
  try {
    const parsed = new URL(apiUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function emitModelTraceSpans(
  models: Array<NonNullable<MessageRuntimeProjection['model_participation']>[number] | undefined>,
  identity: {
    trace_id: string;
    sdk_trace_id: string;
    local_trace_id: string;
    thread_id: string;
    conversation_id?: string;
    message_id?: string;
    turn_id?: string;
    task_id?: string;
    run_id?: string;
    env?: string;
    app?: string;
    module?: string;
    user_role?: string;
    intent_type?: string;
    workflow_name?: string;
  },
) {
  if (!Array.isArray(models)) return;
  for (const [index, model] of models.entries()) {
    if (!model) continue;
    const modelStatus = mapModelStatus(model.status);
    const spanName = `model.${index}.${model.model_use_case}`;
    await safeTraceable(async (modelSpan) => {
      const stageIdentity = {
        ...identity,
        span_name: spanName,
        span_type: 'model' as const,
        status_code: modelStatus,
      };
      safeSetInput(modelSpan, buildStandardTraceInput({
        model_use_case: model.model_use_case,
        route_mode: model.route_mode,
        prompt_id: model.prompt_id,
        prompt_source: model.prompt_source,
        prompt_version: model.prompt_version,
        prompt_hash: model.prompt_hash,
        input_schema: model.input_schema,
        output_schema: model.output_schema,
      }, stageIdentity));
      safeSetTags(modelSpan, buildStandardTraceTags(stageIdentity));
      safeSetOutput(modelSpan, {
        model_name: model.model_name,
        provider: model.provider,
        model_span_id: model.model_span_id,
        latency_ms: model.latency_ms,
        status: model.status,
        status_code: modelStatus,
        fallback_reason: model.fallback_reason,
        output_consumed: model.output_consumed,
        output_consumed_by: model.output_consumed_by,
        answer_origin: model.answer_origin,
        warnings: model.warnings,
      });
    }, createChatSpan({ name: spanName, kind: 'model', identity, attrs: { model_use_case: model.model_use_case, route_mode: model.route_mode, prompt_id: model.prompt_id } }));
  }
}

export async function emitChatMessageTrace(args: {
  traceId: string;
  message: string;
  conversationId: string;
  threadId?: string;
  messageId?: string;
  turnId?: string;
  intentType?: string;
  taskId?: string;
  runId?: string;
  status: string;
  routeReason?: string;
  finalAnswer?: string;
  runtimeProjection?: MessageRuntimeProjection;
  extra?: Record<string, unknown>;
}): Promise<ChatTraceMeta> {
  const cfg = getTraceConfigSync();
  const localTraceId = args.traceId;
  const threadId = args.threadId || args.conversationId;
  const messageId = args.messageId || args.traceId;
  const turnId = args.turnId || args.taskId || args.runId || args.traceId;
  const baseStatus = cfg.enabled && hasValidTraceEndpoint(cfg.apiUrl) && cfg.workspaceId && cfg.apiToken ? 'active' : 'disabled';
  const traceUrl = buildTraceUrl(localTraceId, cfg.workspaceId);
  const input = buildStandardTraceInput(
    buildChatTraceInput(args.message || '', {
      local_trace_id: localTraceId,
      thread_id: threadId,
      message_id: messageId,
      turn_id: turnId,
      conversation_id: args.conversationId,
      agent_id: args.intentType ? `agent_${args.intentType}` : undefined,
      app: 'xiaoqiao',
      module: 'chat',
    }),
    {
      env: cfg.env || 'prod',
      thread_id: threadId,
      message_id: messageId,
      turn_id: turnId,
      local_trace_id: localTraceId,
      task_id: args.taskId,
      run_id: args.runId,
      conversation_id: args.conversationId,
      intent_type: args.intentType,
      workflow_name: 'chat_message',
      app: 'xiaoqiao',
      module: 'chat',
      user_role: 'user',
    },
  );
  const output = {
    status: args.status,
    route_reason: args.routeReason,
    final_answer: args.finalAnswer ? truncate(args.finalAnswer, 1000) : undefined,
    ...args.extra,
    candidate_source: args.extra?.candidate_source || args.extra?.route_candidate_source || null,
    final_route_decision: args.extra?.final_route_decision || args.extra?.arbitrated_route || args.extra?.arbitration_summary || null,
    execution_decision: args.extra?.execution_decision || args.extra?.capability_decision || null,
    fallback_reason: args.extra?.fallback_reason || null,
    evidence_ids: args.extra?.evidence_ids || args.extra?.evidence_refs || null,
    contract_safety: args.extra?.contract_safety || (
      args.extra?.response_contract && typeof args.extra.response_contract === 'object'
        ? (args.extra.response_contract as Record<string, unknown>).contract_safety
        : null
    ),
    trace_url: traceUrl,
  };

  if (baseStatus === 'disabled') {
    return {
      trace_id: localTraceId,
      sdk_trace_id: localTraceId,
      local_trace_id: localTraceId,
      trace_url: traceUrl,
      thread_id: threadId,
      message_id: messageId,
      turn_id: turnId,
      trace_status: 'disabled',
      trace_warnings: ['Trace disabled by config.'],
    };
  }

  let sdkTraceId = '';
  const warnings: string[] = [];
  const statusCode = mapMainStatus(args.status);
  try {
    initTrace(cfg);
    await safeTraceable(async (span) => {
      sdkTraceId = span.spanContext().traceId;
      const identity = {
        trace_id: sdkTraceId,
        sdk_trace_id: sdkTraceId,
        local_trace_id: localTraceId,
        thread_id: threadId,
        conversation_id: args.conversationId,
        message_id: messageId,
        turn_id: turnId,
        task_id: args.taskId,
        run_id: args.runId,
        env: cfg.env || 'prod',
        app: 'xiaoqiao',
        module: 'chat',
        user_role: 'user',
        intent_type: args.intentType,
        workflow_name: 'chat_message',
      };
      safeSetInput(span, input);
      safeSetTags(span, buildStandardTraceTags({
        ...identity,
        trace_id: sdkTraceId,
        sdk_trace_id: sdkTraceId,
        span_name: 'xiaoqiao.zhitou.chat',
        span_type: 'custom' as const,
        status_code: statusCode,
      }));
      safeSetOutput(span, output);

      const projectedSpans = [
        { name: 'agent.intent_route', input: { route_reason: args.routeReason, intent_type: args.intentType, candidate_source: args.extra?.candidate_source || args.extra?.route_candidate_source || null }, output: { intent_type: args.intentType, conversation_id: args.conversationId, route_candidate_only: args.extra?.route_candidate_only || null } },
        { name: 'agent.prompt_resolve', input: { prompt_config: args.runtimeProjection?.prompt_hits || args.extra?.prompt_config || {}, prompt_runtime_policy: args.extra?.prompt_runtime_policy || {} }, output: { prompt_hits: args.runtimeProjection?.prompt_hits || [], trace_url: traceUrl } },
        { name: 'agent.context_prepare', input: { conversation_id: args.conversationId, task_id: args.taskId, run_id: args.runId }, output: { compiled_context: args.extra?.compiled_context || null, project_context_summary: args.extra?.project_context_summary || null } },
        { name: 'agent.plan_arbitration', input: { planner_candidates: args.extra?.planner_candidates || args.extra?.reasoning_artifacts || null, candidate_source: args.extra?.candidate_source || args.extra?.route_candidate_source || null }, output: { arbitration_summary: args.extra?.arbitration_summary || args.extra?.info_source_arbitration || args.extra?.final_route_decision || null, arbitration_rule_id: args.extra?.arbitration_rule_id || null, fallback_reason: args.extra?.fallback_reason || null, trace_url: traceUrl } },
        { name: 'agent.query_plan', input: { query_plan: args.extra?.query_plan || args.runtimeProjection?.query_plan_summary || {}, selected_tool: args.runtimeProjection?.query_plan_summary?.selected_tool }, output: { selection_trace: args.extra?.selection_trace || null, resolved_filters: args.extra?.resolved_filters || null, trace_url: traceUrl } },
        { name: 'agent.answer_compose', input: { final_answer: args.finalAnswer ? truncate(args.finalAnswer, 1000) : '', status: args.status }, output: { final_answer: args.finalAnswer ? truncate(args.finalAnswer, 1000) : '', trace_url: traceUrl } },
        { name: 'agent.view_model_build', input: { message_contract: args.extra?.message_contract || null, semantic_result: args.extra?.semantic_result || null }, output: args.runtimeProjection?.view_model_summary || { status: args.status, trace_url: traceUrl } },
        { name: 'agent.render_contract_validate', input: { render_consumption: args.runtimeProjection?.render_consumption || [], contract_safety: args.extra?.contract_safety || null }, output: { quality_checks: args.runtimeProjection?.quality_checks || [], evidence_ids: args.extra?.evidence_ids || args.extra?.evidence_refs || null, trace_url: traceUrl } },
      ];

      for (const stage of projectedSpans) {
        await safeTraceable(async (stageSpan) => {
          const stageName = stage.name;
          const stageStatus = stageName === 'agent.render_contract_validate' && args.status === 'success' ? 'OK' : mapMainStatus(args.status);
          safeSetInput(stageSpan, buildStandardTraceInput(stage.input, {
            ...identity,
            span_name: stageName,
            span_type: 'agent' as const,
            status_code: stageStatus,
          }));
          safeSetTags(stageSpan, buildStandardTraceTags({
            ...identity,
            span_name: stageName,
            span_type: 'agent' as const,
            status_code: stageStatus,
          }));
          safeSetOutput(stageSpan, {
            ...stage.output,
            status_code: stageStatus,
          });
        }, createChatSpan({ name: stage.name, kind: 'agent', identity, attrs: stage.input }));
      }

      if (Array.isArray(args.runtimeProjection?.tool_summaries)) {
        for (const [index, tool] of args.runtimeProjection.tool_summaries.entries()) {
          const toolKind: 'retriever' | 'tool' = tool.kind === 'knowledge' ? 'retriever' : 'tool';
          const toolStatus = tool.status_code || (tool.status === 'failed' ? 'ERROR' : tool.status === 'empty' ? 'EMPTY' : tool.status === 'skipped' ? 'SKIPPED' : 'OK');
          await safeTraceable(async (toolSpan) => {
            const stageIdentity = {
              ...identity,
              span_name: `tool.${index}.${tool.name}`,
              span_type: toolKind,
              status_code: toolStatus,
            };
            safeSetInput(toolSpan, buildStandardTraceInput({
              arguments: tool.arguments,
              query: tool.summary,
              tool_name: tool.name,
              kind: tool.kind,
            }, stageIdentity));
            safeSetTags(toolSpan, buildStandardTraceTags(stageIdentity));
            safeSetOutput(toolSpan, {
              result_summary: tool.result_summary,
              row_count: tool.row_count,
              document_count: tool.document_count,
              score_summary: tool.score_summary,
              http_status: tool.http_status,
              status_code: toolStatus,
            });
          }, createChatSpan({ name: `tool.${index}.${tool.name}`, kind: toolKind, identity, attrs: { arguments: tool.arguments, query: tool.summary, tool_name: tool.name } }));
        }
      }

      await emitModelTraceSpans(args.runtimeProjection?.model_participation || [], identity);
    }, { name: 'xiaoqiao.zhitou.chat', type: 'custom' as never });
    await flushTrace();
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
    return {
      trace_id: localTraceId,
      sdk_trace_id: localTraceId,
      local_trace_id: localTraceId,
      trace_url: traceUrl,
      thread_id: threadId,
      message_id: messageId,
      turn_id: turnId,
      trace_status: 'failed',
      trace_warnings: warnings,
    };
  }

  return {
    trace_id: sdkTraceId || localTraceId,
    sdk_trace_id: sdkTraceId || localTraceId,
    local_trace_id: localTraceId,
    trace_url: traceUrl,
    thread_id: threadId,
    message_id: messageId,
    turn_id: turnId,
    trace_status: warnings.length ? 'degraded' : 'active',
    trace_warnings: warnings.length ? warnings : undefined,
  };
}
