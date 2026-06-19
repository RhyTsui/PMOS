import { mapProcessEventToRuntimeStep } from '@/lib/runtime-event-display';
import { executeReportQueryStep, type ReportQueryResult } from '@/lib/report-query-orchestrator';
import { buildFieldRenderConsumption, composeMessagePresentationRegions } from '@/contracts/presentation/message-contract-field-bindings';
import { createDefaultRendererRegistry } from '@/contracts/renderer/default-renderers';
import { getModelUseCaseDefinition } from '@/contracts/model-service';
import type { SemanticRegion, SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import type { AgentProcessEvent, AnswerPolicy, BusinessSummary, CompiledContextPackage, MessageContract, MessageRuntimeProjection, RuntimeState } from '@/types';
import { buildToolSnapshotForProjection } from './tool-chain-projection';
import { compactRuntimePayload, isRecord, truncate } from './payload-compact';

const presentationRendererRegistry = createDefaultRendererRegistry();

export function normalizeSemanticResultForPresentation(semanticResult: unknown): SemanticResultContract | null {
  if (!isRecord(semanticResult)) return null;
  return semanticResult as unknown as SemanticResultContract;
}

export function readBusinessSummary(semanticResult: unknown): BusinessSummary | undefined {
  if (!isRecord(semanticResult) || !isRecord(semanticResult.business_summary)) return undefined;
  const summary = semanticResult.business_summary;
  return {
    title: typeof summary.title === 'string' && summary.title.trim() ? summary.title : '结果摘要',
    brief: typeof summary.brief === 'string' ? summary.brief : '',
    severity: summary.severity === 'critical' || summary.severity === 'high' || summary.severity === 'medium' || summary.severity === 'low' || summary.severity === 'info'
      ? summary.severity
      : undefined,
    confidence: summary.confidence === 'high' || summary.confidence === 'medium' || summary.confidence === 'low'
      ? summary.confidence
      : undefined,
    business_impact: typeof summary.business_impact === 'string' ? summary.business_impact : undefined,
    type: typeof summary.type === 'string' ? summary.type : undefined,
    kind: typeof summary.kind === 'string' ? summary.kind : undefined,
    capability_gap: isRecord(summary.capability_gap) ? summary.capability_gap : undefined,
  };
}

function buildPromptHitsFromModelParticipation(
  participation: MessageRuntimeProjection['model_participation'] | undefined,
): MessageRuntimeProjection['prompt_hits'] {
  const records = Array.isArray(participation) ? participation : [];
  const promptHits = records.map((item, index) => {
    const useCase = item.model_use_case || item.modelUseCase || item.node || `model-use-case-${index + 1}`;
    const promptId = item.prompt_id || useCase;
    const useCaseDefinition = getModelUseCaseDefinition(String(useCase));
    const title = useCaseDefinition?.displayName || String(useCase);
    return {
      key: `${useCase}:${promptId}:${item.prompt_version || index}`,
      title,
      prompt_version: item.prompt_version,
      matched: item.status !== 'disabled' && item.status !== 'not_configured',
      summary: [
        item.prompt_source ? `来源：${item.prompt_source}` : '',
        item.status ? `状态：${item.status}` : '',
        item.consumed_by || item.output_consumed_by ? `消费：${item.consumed_by || item.output_consumed_by}` : '',
      ].filter(Boolean).join('；') || '已记录模型提示词命中。',
      metadata: {
        model_use_case: useCase,
        prompt_id: promptId,
        prompt_source: item.prompt_source,
        prompt_version: item.prompt_version,
        prompt_hash: item.prompt_hash || item.content_hash,
        status: item.status,
        consumed: item.consumed ?? item.output_consumed,
        consumed_by: item.consumed_by || item.output_consumed_by,
        consumed_fields: item.consumed_fields,
        model_name: item.model_name,
        provider: item.provider,
        model_span_id: item.model_span_id,
        warnings: item.warnings,
      },
    };
  });

  return promptHits;
}

export function buildAnswerOrigin(params: {
  source: 'real_llm' | 'template_composer' | 'rule_fallback' | 'external_service' | 'model_unavailable';
  composerName?: string;
  modelSpanId?: string;
  externalTraceId?: string;
  modelName?: string;
  provider?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}): NonNullable<MessageRuntimeProjection['answer_origin']> {
  return {
    source: params.source,
    composer_name: params.composerName,
    model_span_id: params.modelSpanId,
    external_trace_id: params.externalTraceId,
    model_name: params.modelName,
    provider: params.provider,
    summary: params.summary,
    metadata: params.metadata,
  };
}

export function buildMessageRuntimeProjection(args: {
  messageId: string;
  threadId: string;
  traceId: string;
  workflow: string;
  intent: string;
  status: string;
  routeReason?: string;
  runtimeState?: RuntimeState;
  answerPolicy?: AnswerPolicy;
  content?: string;
  promptConfig?: Record<string, unknown>;
  promptRuntimePolicy?: Record<string, unknown>;
  compiledContext?: CompiledContextPackage | null;
  reportStep?: Awaited<ReturnType<typeof executeReportQueryStep>>;
  result?: ReportQueryResult | null;
  messageContract?: MessageContract | null;
  semanticResult?: Record<string, unknown> | null;
  queryPlan?: Record<string, unknown>;
  processEvents?: AgentProcessEvent[];
  traceUrl?: string;
  selectedTool?: string;
  selectedServer?: string;
  selectedQuestionType?: string;
  failureCaseId?: string;
  answerOrigin?: MessageRuntimeProjection['answer_origin'];
  modelParticipation?: MessageRuntimeProjection['model_participation'];
}): MessageRuntimeProjection {
  const reportStep = args.reportStep;
  const semanticRegions = isRecord(args.semanticResult) && Array.isArray((args.semanticResult as Record<string, unknown>).regions)
    ? (args.semanticResult as Record<string, unknown>).regions as SemanticRegion[]
    : [];
  const isDataVisualizationRegion = (item: SemanticRegion) => String(item.componentBinding || '').includes('data-visualization');
  const readRegionKind = (item: SemanticRegion) => String((item.data as Record<string, unknown> | undefined)?.kind || '').toLowerCase();
  const presentationComposition = composeMessagePresentationRegions({
    messageContract: args.messageContract,
    semanticRegions,
    hasRenderer: (binding) => Boolean(presentationRendererRegistry.resolve(binding)),
  });
  const fieldStatusByField = presentationComposition.fieldStatuses;
  const actionItems = isRecord(args.messageContract) && Array.isArray((args.messageContract as Record<string, unknown>).next_actions)
    ? (args.messageContract as Record<string, unknown>).next_actions as unknown[]
    : [];
  const toolSummaries = reportStep?.tool_chain?.map((item) => ({
    name: item.tool_name || item.key,
    kind: item.key === 'knowledge_fallback' ? 'knowledge' : item.tool_name ? 'mcp' : 'skill',
    status: item.status,
    summary: item.message || item.tool_name || item.key,
    arguments: item.input ? truncate(JSON.stringify(item.input), 1000) : undefined,
    result_summary: item.result ? truncate(JSON.stringify(item.result), 1000) : undefined,
    row_count: isRecord(item.result) && typeof item.result.row_count === 'number' ? item.result.row_count : undefined,
    document_count: isRecord(item.result) && typeof item.result.document_count === 'number' ? item.result.document_count : undefined,
    score_summary: isRecord(item.result) && typeof item.result.score === 'number' ? String(item.result.score) : undefined,
    http_status: isRecord(item.result) && typeof item.result.http_status === 'number' ? item.result.http_status : undefined,
    duration_ms: undefined,
    status_code: item.status === 'failed' ? 'ERROR' : item.status === 'skipped' ? 'SKIPPED' : 'OK',
    metadata: {
      tool_snapshot: buildToolSnapshotForProjection(item),
    },
  })) || [];

  const runtimeSteps = (args.processEvents || []).map(mapProcessEventToRuntimeStep);

  const promptHits = buildPromptHitsFromModelParticipation(args.modelParticipation);

  const renderConsumption = [
    {
      renderer: 'MessageSurface',
      field: 'answer_markdown',
      consumed: Boolean(args.messageContract?.answer_markdown),
      status: args.messageContract?.answer_markdown ? 'rendered' : 'empty',
      required: true,
      warning: args.messageContract?.answer_markdown ? undefined : '答案文本缺失',
      metadata: { source: 'message_contract' },
    },
    {
      renderer: 'ReportQueryRenderer',
      field: 'report_query_view_model',
      consumed: presentationComposition.regions.some(isDataVisualizationRegion),
      status: presentationComposition.regions.some(isDataVisualizationRegion) ? 'rendered' : 'empty',
      required: false,
      warning: undefined,
      metadata: { source: 'semantic_result' },
    },
    ...buildFieldRenderConsumption(fieldStatusByField),
  ];

  const qualityChecks = [
    {
      key: 'render-contract',
      label: '结果检查',
      status: (args.messageContract?.answer_markdown ? 'pass' : 'warn') as 'pass' | 'warn',
      summary: args.messageContract?.answer_markdown ? '答案文本已准备。' : '答案文本缺失。',
      detail: args.content ? truncate(args.content, 300) : undefined,
    },
    {
      key: 'quality-check',
      label: '质量检查',
      status: (args.result?.quality_check?.ok === false ? 'warn' : 'pass') as 'warn' | 'pass',
      summary: args.result?.quality_check?.ok === false ? '存在需要注意的数据口径或匹配风险。' : '未发现阻断问题。',
      detail: args.result?.quality_check ? truncate(JSON.stringify(args.result.quality_check), 400) : undefined,
    },
  ];

  return {
    message_id: args.messageId,
    thread_id: args.threadId,
    trace_id: args.traceId,
    workflow: args.workflow,
    intent: args.intent,
    status: args.status,
    answer_origin: args.answerOrigin,
    model_participation: args.modelParticipation?.length ? args.modelParticipation : undefined,
    runtime_steps: runtimeSteps,
    prompt_hits: promptHits,
    query_plan_summary: {
      selected_tool: args.selectedTool,
      selected_server: args.selectedServer,
      selected_question_type: args.selectedQuestionType,
      filters: args.reportStep?.resolved_filters as Record<string, unknown> | undefined,
      summary: args.queryPlan?.summary ? String(args.queryPlan.summary) : args.reportStep?.message,
      metadata: {
        route_reason: args.routeReason,
        selection_trace: compactRuntimePayload(args.reportStep?.selection_trace, { depth: 3, maxString: 800, maxArray: 8, maxKeys: 30 }),
        query_plan: compactRuntimePayload(args.queryPlan, { depth: 3, maxString: 800, maxArray: 8, maxKeys: 30 }),
      },
    },
    tool_summaries: toolSummaries,
    view_model_summary: {
      type: args.messageContract?.type || args.result?.question_type,
      status: args.status,
      has_answer_markdown: Boolean(args.messageContract?.answer_markdown),
      has_business_summary: fieldStatusByField.business_summary?.status === 'rendered',
      table_count: presentationComposition.regions.filter(item => isDataVisualizationRegion(item) && readRegionKind(item) === 'table').length,
      chart_count: presentationComposition.regions.filter(item => isDataVisualizationRegion(item) && readRegionKind(item) === 'chart').length,
      action_count: actionItems.length,
      evidence_available: Boolean((args.messageContract as Record<string, unknown> | null)?.evidence_bundle),
      empty_reason: args.result?.status === 'empty' ? '查询结果为空。' : undefined,
      metadata: {
        trace_url: args.traceUrl,
        answer_policy: args.answerPolicy,
        runtime_state: args.runtimeState,
      },
    },
    quality_checks: qualityChecks,
    render_consumption: renderConsumption,
    prompt_hits_summary: promptHits.map(item => item.title).join('；'),
    view_model_summary_text: args.result?.message || args.content,
    quality_summary: args.result?.quality_check?.ok === false ? '存在质量风险。' : '质量检查通过。',
    trace_url: args.traceUrl,
    metadata: {
      trace_url: args.traceUrl,
      prompt_config: args.promptConfig,
      prompt_runtime_policy: args.promptRuntimePolicy,
      compiled_context: args.compiledContext,
      query_plan: args.queryPlan,
      failure_case_id: args.failureCaseId,
    },
  };
}
