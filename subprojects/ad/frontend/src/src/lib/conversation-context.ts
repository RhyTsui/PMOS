import type { BusinessContextSnapshot, Message } from '@/types';
import { createSlotValue } from './slot-resolver';

type ContextRecord = Record<string, unknown>;
type ContextMessageLike = Pick<Message, 'id' | 'message_id' | 'role' | 'content' | 'intent_type' | 'metadata' | 'evidence_ids'>;

interface ConversationContextEnvelope {
  project?: string;
  app?: string;
  media?: string;
  timeRange?: string;
  metrics?: string[];
  dimensions?: string[];
  reportSource?: string;
  compareSource?: string;
  qualityStatus?: 'ok' | 'needs_review';
  qualityIssues?: string[];
  lastIntent?: string;
  sourceMessageId?: string;
  updatedAt?: string;
}

function isRecord(value: unknown): value is ContextRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return value.map(asString).filter(Boolean).join(',');
  return '';
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(asString).filter(Boolean);
  const text = asString(value);
  return text ? text.split(/[,，、]/).map(item => item.trim()).filter(Boolean) : [];
}

function firstString(record: ContextRecord | undefined, keys: string[]): string {
  if (!record) return '';
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return '';
}

function firstStringList(record: ContextRecord | undefined, keys: string[]): string[] {
  if (!record) return [];
  for (const key of keys) {
    const value = asStringList(record[key]);
    if (value.length > 0) return value;
  }
  return [];
}

function limitText(value: string, max = 140): string {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function mergeEnvelope(base: ConversationContextEnvelope, next: ConversationContextEnvelope): ConversationContextEnvelope {
  return {
    ...base,
    ...Object.fromEntries(Object.entries(next).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    })),
    metrics: next.metrics?.length ? next.metrics : base.metrics,
    dimensions: next.dimensions?.length ? next.dimensions : base.dimensions,
    qualityIssues: next.qualityIssues?.length ? next.qualityIssues : base.qualityIssues,
  };
}

function getNestedRecord(value: unknown, path: string[]): ContextRecord | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return isRecord(current) ? current : undefined;
}

function extractReportQueryResult(value: unknown): ContextRecord | null {
  if (!isRecord(value)) return null;
  if (value.result_type === 'ReportQueryResult') return value;

  const candidates = [
    value.report_query_result,
    getNestedRecord(value, ['structured_payload'])?.report_query_result,
    getNestedRecord(value, ['workflow_result'])?.report_query_result,
    getNestedRecord(value, ['workflow_result', 'structured_payload'])?.report_query_result,
    getNestedRecord(value, ['metadata'])?.report_query_result,
    getNestedRecord(value, ['metadata', 'workflow_result', 'structured_payload'])?.report_query_result,
  ];

  for (const candidate of candidates) {
    const result = extractReportQueryResult(candidate);
    if (result) return result;
  }
  return null;
}

function envelopeFromReportResult(result: ContextRecord, sourceMessageId?: string): ConversationContextEnvelope {
  const input = isRecord(result.input) ? result.input : {};
  const dateRange = isRecord(result.date_range) ? result.date_range : {};
  const quality = isRecord(result.quality_check) ? result.quality_check : {};
  const metrics = asStringList(result.metrics).length ? asStringList(result.metrics) : firstStringList(input, ['metrics', 'metric_keys', 'metric']);
  const dimensions = asStringList(result.dimensions).length ? asStringList(result.dimensions) : firstStringList(input, ['dimensions', 'dimension']);
  const startDate = firstString(dateRange, ['start_date', 'startDate']);
  const endDate = firstString(dateRange, ['end_date', 'endDate']);
  const qualityIssues = [
    ...asStringList(quality.issues),
    ...asStringList(quality.anomaly_warnings),
    ...asStringList(quality.metric_risks),
    ...asStringList(quality.date_gaps),
    ...asStringList(quality.missing_fields).map(item => `missing:${item}`),
  ].map(item => limitText(item, 80));

  return {
    project: firstString(input, ['project', 'project_name', 'projectName', 'project_scope']),
    app: firstString(input, ['appId', 'app_id', 'project_id', 'projectId', 'app', 'product']),
    media: firstString(input, ['media', 'mediaId', 'media_id', 'mediaName', 'media_name']),
    timeRange: startDate && endDate ? `${startDate}~${endDate}` : firstString(input, ['date_range', 'time_range']),
    metrics,
    dimensions,
    reportSource: [asString(result.server_name), asString(result.tool_name)].filter(Boolean).join('.'),
    compareSource: 'report_query_result',
    qualityStatus: quality.ok === false || qualityIssues.length > 0 ? 'needs_review' : 'ok',
    qualityIssues,
    lastIntent: 'report_query',
    sourceMessageId,
    updatedAt: new Date().toISOString(),
  };
}

function envelopeFromMessage(message: ContextMessageLike): ConversationContextEnvelope {
  const meta = message.metadata || {};
  const compiledContext = isRecord(meta.compiled_context) ? meta.compiled_context : undefined;
  const compiledBusinessContext = isRecord(compiledContext?.businessContext) ? compiledContext.businessContext as unknown as BusinessContextSnapshot : undefined;
  const reportResult = extractReportQueryResult(meta) || extractReportQueryResult(meta.workflow_result);
  const reportEnvelope = reportResult ? envelopeFromReportResult(reportResult, message.message_id || message.id) : {};
  const compiledEnvelope: ConversationContextEnvelope = compiledBusinessContext ? {
    project: typeof compiledBusinessContext.project?.value === 'string' ? compiledBusinessContext.project.value : undefined,
    app: typeof compiledBusinessContext.app?.value === 'string' ? compiledBusinessContext.app.value : undefined,
    media: typeof compiledBusinessContext.media?.value === 'string' ? compiledBusinessContext.media.value : undefined,
    timeRange: typeof compiledBusinessContext.timeRange?.value === 'string' ? compiledBusinessContext.timeRange.value : undefined,
    metrics: Array.isArray(compiledBusinessContext.metrics?.value) ? compiledBusinessContext.metrics.value.map(String) : undefined,
    dimensions: Array.isArray(compiledBusinessContext.dimensions?.value) ? compiledBusinessContext.dimensions.value.map(String) : undefined,
    reportSource: typeof compiledBusinessContext.reportSource?.value === 'string' ? compiledBusinessContext.reportSource.value : undefined,
    compareSource: typeof compiledBusinessContext.compareSource?.value === 'string' ? compiledBusinessContext.compareSource.value : undefined,
    qualityStatus: compiledBusinessContext.qualityCheck?.status === 'needs_review' ? 'needs_review' : compiledBusinessContext.qualityCheck?.status === 'ok' ? 'ok' : undefined,
    qualityIssues: compiledBusinessContext.qualityCheck?.issues,
    lastIntent: compiledBusinessContext.latestResult?.resultType,
    sourceMessageId: compiledBusinessContext.sourceMessageId,
    updatedAt: compiledBusinessContext.updatedAt,
  } : {};
  return mergeEnvelope(compiledEnvelope, {
    ...reportEnvelope,
    lastIntent: reportEnvelope.lastIntent || compiledEnvelope.lastIntent || message.intent_type,
    sourceMessageId: reportEnvelope.sourceMessageId || compiledEnvelope.sourceMessageId || message.message_id || message.id,
  });
}

function envelopeFromProjectContext(projectContext?: string): ConversationContextEnvelope {
  const text = projectContext?.trim();
  if (!text) return {};
  const app = /(?:APPID|appId|app_id|project_id|projectId|应用ID|项目ID)[:：=\s]+([A-Za-z0-9_-]+)/i.exec(text)?.[1];
  const project = /(?:项目范围|当前项目|项目)[:：]\s*([^\n(（]+)/.exec(text)?.[1]?.trim();
  return {
    project: project && !/未选择|全部项目/.test(project) ? project : undefined,
    app,
  };
}

function buildConversationContextEnvelope(messages: Message[], projectContext?: string): ConversationContextEnvelope {
  const recent = messages.slice(-10).reverse();
  let envelope = envelopeFromProjectContext(projectContext);
  for (const message of recent) {
    envelope = mergeEnvelope(envelope, envelopeFromMessage(message));
    if (envelope.timeRange && envelope.metrics?.length && (envelope.app || envelope.project)) break;
  }
  return envelope;
}

export function buildBusinessContextSnapshot(messages: ContextMessageLike[], projectContext?: string): BusinessContextSnapshot {
  const envelope = buildConversationContextEnvelope(messages as Message[], projectContext);
  const evidenceRefs = messages
    .slice(-10)
    .flatMap((message) => Array.isArray(message.evidence_ids) ? message.evidence_ids : [])
    .filter(Boolean);

  return {
    project: createSlotValue(envelope.project, 'project_context'),
    app: createSlotValue(envelope.app, envelope.sourceMessageId ? 'workflow_result' : 'project_context'),
    media: createSlotValue(envelope.media, envelope.sourceMessageId ? 'workflow_result' : 'conversation_history'),
    timeRange: createSlotValue(envelope.timeRange, envelope.sourceMessageId ? 'workflow_result' : 'conversation_history'),
    metrics: createSlotValue(envelope.metrics, envelope.sourceMessageId ? 'workflow_result' : 'conversation_history'),
    dimensions: createSlotValue(envelope.dimensions, envelope.sourceMessageId ? 'workflow_result' : 'conversation_history'),
    reportSource: createSlotValue(envelope.reportSource, 'workflow_result'),
    compareSource: createSlotValue(envelope.compareSource, envelope.compareSource === 'report_query_result' ? 'workflow_result' : 'conversation_history'),
    latestResult: envelope.lastIntent || envelope.qualityStatus ? {
      resultType: envelope.lastIntent,
      status: envelope.qualityStatus,
      sourceMessageId: envelope.sourceMessageId,
      updatedAt: envelope.updatedAt,
    } : undefined,
    qualityCheck: envelope.qualityStatus || envelope.qualityIssues?.length ? {
      status: envelope.qualityStatus || 'unknown',
      issues: envelope.qualityIssues || [],
      missingFields: (envelope.qualityIssues || []).filter((item) => item.startsWith('missing:')).map((item) => item.replace(/^missing:/, '')),
      source: 'workflow_result',
    } : undefined,
    evidenceRefs: [...new Set(evidenceRefs)],
    sourceMessageId: envelope.sourceMessageId,
    updatedAt: envelope.updatedAt || new Date().toISOString(),
  };
}
