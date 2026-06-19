import type {
  AgentProcessEvent,
  ContractSafetyIssue,
  ContractSafetyResult,
  EvidenceMode,
  ResponseConfidence,
  ResultStatus,
  SourceRef,
  ToolCallTrace,
  WorkflowResult,
} from '@/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

const MOJIBAKE_TOKENS = [
  '\u951b',
  '\u9428',
  '\u6d93',
  '\u7edb',
  '\u59dd',
  '\u93ba',
  '\u6fa7',
  '\u9225',
  '\u9473',
  '\u95c2',
  '\u7487',
  '\u59ab',
  '\u93cc',
  '\u7039',
  '\u9365',
  '\u6e1a',
  '\u9a9e',
  '\u9359',
  '\u6d7c',
  '\u6748',
  '\u9354',
  '\u5bee',
  '\u93c2',
  '\u6402',
  '\ufffd',
  '\u6d5c\u5b2d\u6b22',
];

function textHasMojibake(value: string): boolean {
  return MOJIBAKE_TOKENS.some((token) => value.includes(token));
}

function normalizeStatus(value: unknown): ResultStatus | string {
  const text = String(value || '').toLowerCase();
  if (text === 'success' || text === 'succeeded' || text === 'completed' || text === 'done') return 'success';
  if (text === 'partial' || text === 'degraded') return 'degraded';
  if (text === 'blocked') return 'blocked';
  if (text === 'failed' || text === 'error' || text === 'tool_failed' || text === 'business_failed') return 'failed';
  return String(value || 'unknown');
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

export function buildToolCallTrace(events: AgentProcessEvent[], traceId?: string): ToolCallTrace[] {
  return events
    .filter((event) => {
      if (event.tool_name) return true;
      return event.type === 'mcp.tool_call'
        || event.type === 'mcp.tool_result'
        || event.type === 'mcp.tool_error'
        || event.type === 'knowledge.search'
        || event.type === 'knowledge.result'
        || event.type === 'web.search'
        || event.type === 'web.result';
    })
    .map((event, index) => ({
      id: event.id || `tool-call-${index + 1}`,
      name: event.tool_name || event.label || event.type,
      kind: event.type.startsWith('mcp.') ? 'mcp'
        : event.type.startsWith('knowledge.') ? 'knowledge'
          : event.type.startsWith('web.') ? 'public_web'
            : event.provider,
      status: normalizeStatus(event.status),
      duration_ms: event.duration_ms,
      input_summary: summarizeValue(event.input),
      output_summary: summarizeValue(event.output) || event.summary,
      trace_id: traceId,
      source_ref_ids: event.source_refs?.map((source) => source.id || source.title).filter(Boolean),
    }));
}

function inferConfidence(params: {
  status: ResultStatus;
  sourceRefs: SourceRef[];
  evidenceRefs: string[];
  evidenceMode?: EvidenceMode;
  workflowResult?: WorkflowResult | null;
  answerOrigin?: unknown;
}): ResponseConfidence {
  if (params.status === 'failed' || params.status === 'blocked') {
    return { level: 'low', basis: 'policy', reason: '响应未成功完成。' };
  }
  if (params.status === 'degraded' && isRecord(params.answerOrigin) && params.answerOrigin.source === 'model_unavailable') {
    return { level: 'low', basis: 'model', reason: '模型回答生成不可用，当前为降级兜底。' };
  }
  if (params.workflowResult?.confidence === 'high' || params.workflowResult?.confidence === 'medium' || params.workflowResult?.confidence === 'low') {
    return {
      level: params.workflowResult.confidence,
      basis: params.evidenceRefs.length ? 'evidence' : params.sourceRefs.length ? 'source' : 'model',
    };
  }
  if (params.evidenceMode === 'insufficient_evidence') {
    return { level: 'low', basis: 'policy', reason: '当前证据不足，不能形成高置信回答。' };
  }
  if (params.evidenceRefs.length || params.sourceRefs.length) return { level: 'medium', basis: 'mixed' };
  if (isRecord(params.answerOrigin) && params.answerOrigin.kind === 'model_only') {
    return { level: 'low', basis: 'model', reason: '回答主要来自模型生成，未绑定外部证据。' };
  }
  return { level: 'unknown', basis: 'policy' };
}

function collectTextIssues(value: unknown, path: string, issues: ContractSafetyIssue[]): void {
  if (typeof value === 'string') {
    if (textHasMojibake(value)) {
      issues.push({
        code: 'mojibake_detected',
        severity: 'error',
        message: '用户可见文本包含疑似乱码。',
        path,
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectTextIssues(item, `${path}[${index}]`, issues));
    return;
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, item]) => collectTextIssues(item, path ? `${path}.${key}` : key, issues));
  }
}

export function runContractSafety(params: {
  status: ResultStatus;
  answer: string;
  sourceRefs: SourceRef[];
  evidenceRefs: string[];
  evidenceMode?: EvidenceMode;
  workflowResult?: WorkflowResult | null;
  answerOrigin?: unknown;
  metadata?: Record<string, unknown>;
}): {
  confidence: ResponseConfidence;
  safety: ContractSafetyResult;
} {
  const issues: ContractSafetyIssue[] = [];
  collectTextIssues(params.answer, 'answer_markdown', issues);
  collectTextIssues(params.sourceRefs, 'source_refs', issues);
  collectTextIssues(params.metadata, 'metadata', issues);

  const confidence = inferConfidence({
    status: params.status,
    sourceRefs: params.sourceRefs,
    evidenceRefs: params.evidenceRefs,
    evidenceMode: params.evidenceMode,
    workflowResult: params.workflowResult,
    answerOrigin: params.answerOrigin,
  });

  if (!params.evidenceMode) {
    issues.push({
      code: 'evidence_mode_missing',
      severity: 'warning',
      message: '响应缺少 evidence_mode，无法审计回答证据边界。',
      path: 'response_contract.evidence_mode',
    });
  }

  if (
    params.evidenceMode === 'source_grounded'
    && !params.sourceRefs.some((source) => source.source_type === 'web_search' || source.source_type === 'web_fetch')
  ) {
    issues.push({
      code: 'source_grounded_without_source',
      severity: 'error',
      message: '公开来源回答缺少可追溯 source_ref。',
      path: 'source_refs',
    });
  }

  if (params.evidenceMode === 'tool_grounded' && !params.evidenceRefs.length) {
    issues.push({
      code: 'tool_grounded_without_evidence',
      severity: 'warning',
      message: '工具证据回答缺少 evidence_refs。',
      path: 'evidence_refs',
    });
  }

  if ((params.evidenceMode === 'model_only' || params.evidenceMode === 'no_external_evidence_required') && /(已查询|已检索|已调用|已验证|已读取知识库|已联网)/.test(params.answer)) {
    issues.push({
      code: 'model_only_claims_external_evidence',
      severity: 'error',
      message: 'model-only 回答声称使用了外部证据或工具。',
      path: 'answer_markdown',
    });
  }

  if (params.status === 'success' && confidence.level === 'low' && !params.sourceRefs.length && !params.evidenceRefs.length) {
    issues.push({
      code: 'success_without_evidence',
      severity: 'warning',
      message: '成功回答缺少可追溯来源或证据。',
      path: 'response_contract',
    });
  }

  const disclaimers = new Set<string>();
  if (confidence.level === 'low' || confidence.level === 'unknown') {
    disclaimers.add('当前回答的证据不足或置信度较低，请结合上下文复核。');
  }
  if (params.sourceRefs.some((source) => source.source_type === 'web_search' || source.source_type === 'web_fetch')) {
    disclaimers.add('部分信息来自公开网络，未经内部系统验证。');
  }
  if (issues.some((issue) => issue.code === 'mojibake_detected')) {
    disclaimers.add('检测到疑似乱码，已将本次响应标记为需修复。');
  }

  const hasError = issues.some((issue) => issue.severity === 'error');
  const hasWarning = issues.some((issue) => issue.severity === 'warning');
  const hasLowConfidence = confidence.level === 'low' || confidence.level === 'unknown';
  const status: ContractSafetyResult['status'] = hasError
    ? 'blocked'
    : hasWarning || hasLowConfidence || params.status === 'degraded'
      ? 'degraded'
      : 'passed';

  return {
    confidence,
    safety: {
      status,
      checked_at: new Date().toISOString(),
      issues,
      disclaimers: Array.from(disclaimers),
    },
  };
}
