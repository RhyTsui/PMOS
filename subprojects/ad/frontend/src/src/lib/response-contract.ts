import type { AgentProcessEvent, AiNextAction, EvidenceMode, IntentType, MessagePart, ResponseContract, ResultStatus, SourceRef, ToolCallTrace, WorkflowResult } from '@/types';
import { buildToolCallTrace, runContractSafety } from '@/lib/contract-safety';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeStatus(status: unknown): ResultStatus {
  const value = String(status || '').toLowerCase();
  if (value === 'success' || value === 'succeeded') return 'success';
  if (value === 'empty') return 'empty';
  if (value === 'partial' || value === 'partial_succeeded') return 'partial';
  if (value === 'succeeded_consumed' || value === 'succeeded_not_consumed' || value === 'model_succeeded') return 'success';
  if (value === 'attempted') return 'degraded';
  if (value === 'missing_input') return 'missing_input';
  if (value === 'blocked') return 'blocked';
  if (value === 'not_configured') return 'not_configured';
  if (value === 'not_applicable' || value === 'fallback_to_rules' || value === 'fallback') return 'degraded';
  if (value === 'disabled' || value === 'template' || value === 'failed' || value === 'business_failed' || value === 'error' || value === 'timeout' || value === 'failed_fallback') return 'failed';
  if (value === 'invalid_output_fallback' || value === 'blocked_by_policy') return 'degraded';
  return 'degraded';
}

function collectSourceRefs(events: AgentProcessEvent[]): SourceRef[] {
  return dedupeSourceRefs(events.flatMap((event) => event.source_refs || []));
}

function dedupeSourceRefs(refs: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = ref.id || `${ref.title}:${ref.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function summarizeValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value.length > 160 ? `${value.slice(0, 157)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `array(${value.length})`;
  if (isRecord(value)) {
    const summaryKeys = ['status', 'message', 'summary', 'answer', 'row_count', 'business_outcome', 'reasonCode'];
    const parts = summaryKeys
      .map((key) => value[key] === undefined ? '' : `${key}=${String(value[key])}`)
      .filter(Boolean);
    return parts.length ? parts.join('; ') : `object(${Object.keys(value).slice(0, 5).join(',')})`;
  }
  return undefined;
}

function sourceRefsFromToolChain(toolChain?: unknown[]): SourceRef[] {
  if (!Array.isArray(toolChain)) return [];
  const refs: SourceRef[] = [];
  for (const item of toolChain) {
    if (!isRecord(item)) continue;
    const toolName = readString(item.tool_name);
    const serverName = readString(item.server_name);
    const key = readString(item.key);
    if (!toolName && !serverName && key !== 'business_report') continue;
    const title = toolName || key || 'report_query';
    const source = serverName ? `${serverName}.${title}` : title;
    refs.push({
      id: `tool:${source}`.replace(/[^a-zA-Z0-9:_./-]+/g, '_'),
      title,
      source,
      source_type: key === 'business_report' || toolName ? 'report_mcp' : 'mcp',
      icon: 'report_mcp',
      status: item.status === 'failed' ? 'error' : item.status === 'skipped' ? 'waiting' : 'success',
      snippet: readString(item.message),
    });
  }
  return dedupeSourceRefs(refs);
}

function toolTraceFromToolChain(toolChain?: unknown[], traceId?: string): ToolCallTrace[] {
  if (!Array.isArray(toolChain)) return [];
  return toolChain
    .filter(isRecord)
    .filter((item) => readString(item.tool_name) || readString(item.server_name) || readString(item.key) === 'business_report')
    .map((item, index) => {
      const toolName = readString(item.tool_name) || readString(item.key) || `tool-chain-${index + 1}`;
      const serverName = readString(item.server_name);
      const source = serverName ? `${serverName}.${toolName}` : toolName;
      return {
        id: readString(item.key) || `tool-chain-${index + 1}`,
        name: toolName,
        kind: 'mcp',
        status: readString(item.status) || 'unknown',
        input_summary: summarizeValue(item.input),
        output_summary: summarizeValue(item.result) || readString(item.message),
        trace_id: traceId,
        source_ref_ids: [`tool:${source}`.replace(/[^a-zA-Z0-9:_./-]+/g, '_')],
      };
    });
}

function dedupeToolCallTrace(traces: ToolCallTrace[]): ToolCallTrace[] {
  const seen = new Set<string>();
  return traces.filter((trace) => {
    const key = trace.id || `${trace.name}:${trace.kind}:${trace.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitizeTimelineForMainMessage(events: AgentProcessEvent[]): AgentProcessEvent[] {
  return events.map((event) => ({
    ...event,
    input: undefined,
    output: undefined,
    prompt: undefined,
    ui_component: event.ui_component
      ? {
        type: event.ui_component.type,
        title: event.ui_component.title,
      }
      : undefined,
  }));
}

function sanitizeToolChainForMainMessage(toolChain?: unknown[]): unknown[] | undefined {
  if (!Array.isArray(toolChain)) return undefined;
  return toolChain.map((item) => {
    if (!isRecord(item)) return item;
    const result = isRecord(item.result) ? item.result : {};
    return {
      key: item.key,
      tool_name: item.tool_name,
      server_name: item.server_name,
      status: item.status,
      required: item.required,
      message: item.message,
      result: {
        status: result.status,
        business_outcome: result.business_outcome,
        tool_execution_status: result.tool_execution_status,
        row_count: result.row_count,
        columns: result.columns,
        execution_contract: result.execution_contract,
        policy_blocked: result.policy_blocked,
        security_blocked: result.security_blocked,
        blocking_reason: result.blocking_reason,
        retry: result.retry,
        message: result.message,
        error_code: result.error_code,
        normalizedStatus: result.normalizedStatus,
        canRetryWithSameTool: result.canRetryWithSameTool,
        suggestedAction: result.suggestedAction,
      },
    };
  });
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function sanitizeReportResultForMainMessage(reportResult: Record<string, unknown>): Record<string, unknown> {
  const rowCount = readNumber(reportResult.row_count)
    ?? (Array.isArray(reportResult.rows) ? reportResult.rows.length : undefined);
  return {
    status: reportResult.status,
    business_outcome: reportResult.business_outcome,
    message: reportResult.message,
    answer_markdown: reportResult.answer_markdown,
    row_count: rowCount,
    columns: Array.isArray(reportResult.columns) ? reportResult.columns : undefined,
    display_fields: Array.isArray(reportResult.display_fields) ? reportResult.display_fields : undefined,
    quality_summary: isRecord(reportResult.quality_check)
      ? {
        status: reportResult.quality_check.status,
        missing_fields: Array.isArray(reportResult.quality_check.missing_fields)
          ? reportResult.quality_check.missing_fields
          : undefined,
        recommended_next_actions: Array.isArray(reportResult.quality_check.recommended_next_actions)
          ? reportResult.quality_check.recommended_next_actions
          : undefined,
      }
      : undefined,
    evidence_refs: Array.isArray(reportResult.evidence_refs) ? reportResult.evidence_refs : undefined,
  };
}

function sanitizeWorkflowResultForMainMessage(workflowResult: WorkflowResult): Record<string, unknown> {
  const structuredPayload = isRecord(workflowResult.structured_payload) ? workflowResult.structured_payload : {};
  return {
    task_id: workflowResult.task_id,
    result_type: workflowResult.result_type,
    kind: workflowResult.kind,
    summary: workflowResult.summary,
    answer: workflowResult.answer,
    business_summary: workflowResult.business_summary,
    confidence: workflowResult.confidence,
    status: structuredPayload.status,
    message: structuredPayload.message,
    evidence_refs: Array.isArray(structuredPayload.evidence_refs) ? structuredPayload.evidence_refs : undefined,
  };
}

function collectEvidenceRefs(params: {
  workflowResult?: WorkflowResult | null;
  reportResult?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}): string[] {
  const refs: string[] = [];
  const add = (value: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (trimmed) refs.push(trimmed);
  };
  const addArray = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(add);
  };

  if (isRecord(params.workflowResult?.evidence_bundle)) {
    addArray(params.workflowResult.evidence_bundle.evidence_refs);
    addArray(params.workflowResult.evidence_bundle.evidenceRefs);
  }
  if (isRecord(params.workflowResult?.structured_payload)) {
    addArray(params.workflowResult.structured_payload.evidence_refs);
    addArray(params.workflowResult.structured_payload.evidenceRefs);
  }
  if (isRecord(params.reportResult?.query_plan)) {
    addArray(params.reportResult.query_plan.evidence_refs);
  }
  addArray(params.reportResult?.evidence_refs);
  addArray(params.reportResult?.evidenceRefs);
  addArray(params.metadata?.evidence_refs);
  addArray(params.metadata?.evidenceRefs);
  if (Array.isArray(params.metadata?.evidence_ledger_entries)) {
    for (const entry of params.metadata.evidence_ledger_entries) {
      if (!isRecord(entry)) continue;
      add(entry.evidenceRefId);
      add(entry.id);
    }
  }

  return Array.from(new Set(refs));
}

function readSemanticRegions(result: Record<string, unknown> | null): Array<Record<string, unknown>> {
  const semantic = isRecord(result?.semantic_result)
    ? result.semantic_result
    : isRecord(result?.structured_payload) && isRecord(result.structured_payload.semantic_result)
      ? result.structured_payload.semantic_result
      : null;
  return Array.isArray(semantic?.regions)
    ? semantic.regions.filter(isRecord)
    : [];
}

function readSemanticResult(params: {
  workflowResult?: WorkflowResult | null;
  reportResult?: Record<string, unknown> | null;
}): Record<string, unknown> | undefined {
  if (isRecord(params.reportResult?.semantic_result)) return params.reportResult.semantic_result;
  const structuredPayload = isRecord(params.workflowResult?.structured_payload)
    ? params.workflowResult.structured_payload
    : {};
  return isRecord(structuredPayload.semantic_result) ? structuredPayload.semantic_result : undefined;
}

function readEvidenceMode(params: {
  status: ResultStatus;
  sourceRefs: SourceRef[];
  evidenceRefs: string[];
  toolCallTrace: ReturnType<typeof buildToolCallTrace>;
  answerOrigin?: ResponseContract['answer_origin'];
  metadata?: Record<string, unknown>;
}): EvidenceMode {
  const explicit = params.metadata?.evidence_mode || params.metadata?.evidenceMode;
  if (
    explicit === 'model_only'
    || explicit === 'no_external_evidence_required'
    || explicit === 'knowledge_grounded'
    || explicit === 'source_grounded'
    || explicit === 'tool_grounded'
    || explicit === 'mixed_grounded'
    || explicit === 'insufficient_evidence'
  ) {
    return explicit;
  }
  if (params.status === 'failed' || params.status === 'blocked' || params.status === 'degraded') {
    if (!params.sourceRefs.length && !params.evidenceRefs.length) return 'insufficient_evidence';
  }
  const hasPublicSource = params.sourceRefs.some((source) => source.source_type === 'web_search' || source.source_type === 'web_fetch');
  const hasToolTrace = params.toolCallTrace.some((trace) => trace.kind === 'mcp' || trace.kind === 'api' || trace.kind === 'file');
  const hasKnowledgeTrace = params.toolCallTrace.some((trace) => trace.kind === 'knowledge');
  const groundedKinds = [hasPublicSource, hasToolTrace, hasKnowledgeTrace, params.evidenceRefs.length > 0].filter(Boolean).length;
  if (groundedKinds > 1) return 'mixed_grounded';
  if (hasPublicSource) return 'source_grounded';
  if (hasToolTrace || params.evidenceRefs.length) return 'tool_grounded';
  if (hasKnowledgeTrace) return 'knowledge_grounded';
  if (params.answerOrigin?.source === 'real_llm' || params.answerOrigin?.source === 'template_composer' || params.answerOrigin?.source === 'model_unavailable') {
    return 'model_only';
  }
  return 'no_external_evidence_required';
}

function buildMessageParts(params: {
  answer: string;
  status: ResultStatus;
  timeline: AgentProcessEvent[];
  workflowResult?: WorkflowResult | null;
  reportResult?: Record<string, unknown> | null;
  toolChain?: unknown[];
  missingFields?: string[];
  nextActions: AiNextAction[];
}): MessagePart[] {
  const parts: MessagePart[] = [];
  const sanitizedToolChain = sanitizeToolChainForMainMessage(params.toolChain);
  if (params.answer) {
    parts.push({
      id: 'answer',
      type: 'text',
      title: '回答',
      status: params.status,
      content: params.answer,
    });
  }
  if (params.timeline.length > 0) {
    parts.push({
      id: 'timeline',
      type: 'timeline',
      title: '处理过程',
      status: params.status,
      summary: `已记录 ${params.timeline.length} 个步骤。`,
      payload: { events: params.timeline },
    });
  }
  if (Array.isArray(sanitizedToolChain) && sanitizedToolChain.length > 0) {
    parts.push({
      id: 'tool-chain',
      type: 'tool_card',
      title: '数据来源与工具',
      status: params.status,
      payload: { tool_chain: sanitizedToolChain },
    });
  }
  if (params.reportResult) {
    parts.push({
      id: 'result',
      type: 'result_card',
      title: '查询结果',
      status: params.status,
      summary: typeof params.reportResult.message === 'string' ? params.reportResult.message : undefined,
      payload: { report_query_result: sanitizeReportResultForMainMessage(params.reportResult) },
    });
  } else if (params.workflowResult) {
    parts.push({
      id: 'result',
      type: 'result_card',
      title: '处理结果',
      status: params.status,
      summary: params.workflowResult.summary || params.workflowResult.answer,
      payload: { workflow_result: sanitizeWorkflowResultForMainMessage(params.workflowResult) },
    });
  }
  readSemanticRegions(params.reportResult ?? null).forEach((region, index) => {
    const data = isRecord(region.data) ? region.data : {};
    const kind = String(data.kind || data.viewType || data.chartType || '').toLowerCase();
    if (!kind) return;
    parts.push({
      id: `visual-${index + 1}`,
      type: kind === 'table' ? 'table' : 'chart',
      title: typeof region.title === 'string' ? region.title : kind === 'table' ? '数据表' : '图表',
      status: params.status,
      payload: { region },
    });
  });
  if (params.missingFields?.length) {
    parts.push({
      id: 'missing-fields',
      type: 'missing_fields',
      title: '需要补充的信息',
      status: 'missing_input',
      payload: { missing_fields: params.missingFields },
    });
  }
  if (params.nextActions.length > 0) {
    parts.push({
      id: 'next-actions',
      type: 'actions',
      title: '下一步',
      status: params.status,
      payload: { actions: params.nextActions },
    });
  }
  return parts;
}

export function buildResponseContract(params: {
  status: unknown;
  intentType?: IntentType | string;
  traceId?: string;
  answer?: string;
  answerOrigin?: ResponseContract['answer_origin'];
  workflowResult?: WorkflowResult | null;
  reportResult?: Record<string, unknown> | null;
  processEvents?: AgentProcessEvent[];
  toolChain?: unknown[];
  missingFields?: string[];
  nextActions?: AiNextAction[];
  metadata?: Record<string, unknown>;
}): ResponseContract {
  const status = normalizeStatus(params.status);
  const timeline = sanitizeTimelineForMainMessage(params.processEvents || []);
  const answer = params.answer || params.workflowResult?.answer || params.workflowResult?.summary || '';
  const nextActions = params.nextActions || [];
  const evidenceRefs = collectEvidenceRefs({
    workflowResult: params.workflowResult,
    reportResult: params.reportResult,
    metadata: params.metadata,
  });
  const sourceRefs = dedupeSourceRefs([
    ...collectSourceRefs(timeline),
    ...sourceRefsFromToolChain(params.toolChain),
  ]);
  const toolCallTrace = dedupeToolCallTrace([
    ...buildToolCallTrace(params.processEvents || [], params.traceId),
    ...toolTraceFromToolChain(params.toolChain, params.traceId),
  ]);
  const evidenceMode = readEvidenceMode({
    status,
    sourceRefs,
    evidenceRefs,
    toolCallTrace,
    answerOrigin: params.answerOrigin,
    metadata: params.metadata,
  });
  const safetyResult = runContractSafety({
    status,
    answer,
    sourceRefs,
    evidenceRefs,
    evidenceMode,
    workflowResult: params.workflowResult,
    answerOrigin: params.answerOrigin,
    metadata: params.metadata,
  });
  const effectiveStatus: ResultStatus = safetyResult.safety.status === 'blocked' && status === 'success'
    ? 'failed'
    : status;
  return {
    version: 'response-contract/v1',
    status: effectiveStatus,
    intent_type: params.intentType,
    result_type: params.workflowResult?.result_type,
    task_id: params.workflowResult?.task_id,
    trace_id: params.traceId,
    answer_markdown: answer,
    business_summary: params.workflowResult?.business_summary,
    semantic_result: readSemanticResult({
      workflowResult: params.workflowResult,
      reportResult: params.reportResult,
    }),
    timeline,
    message_parts: buildMessageParts({
      answer,
      status: effectiveStatus,
      timeline,
      workflowResult: params.workflowResult,
      reportResult: params.reportResult,
      toolChain: params.toolChain,
      missingFields: params.missingFields,
      nextActions,
    }),
    source_refs: sourceRefs,
    evidence_refs: evidenceRefs,
    evidence_mode: evidenceMode,
    confidence: safetyResult.confidence,
    tool_call_trace: toolCallTrace,
    disclaimers: safetyResult.safety.disclaimers,
    contract_safety: safetyResult.safety,
    candidate_source: readString(params.metadata?.candidate_source),
    final_route_decision: isRecord(params.metadata?.final_route_decision)
      ? params.metadata.final_route_decision
      : isRecord(params.metadata?.arbitrated_route)
        ? params.metadata.arbitrated_route
        : undefined,
    execution_decision: readString(params.metadata?.execution_decision),
    fallback_reason: readString(params.metadata?.fallback_reason),
    evidence_ids: evidenceRefs,
    contract_safety_trace_ref: params.traceId ? `contract_safety:${params.traceId}` : undefined,
    next_actions: nextActions,
    answer_origin: params.answerOrigin,
    metadata: params.metadata,
  };
}
