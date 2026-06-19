import type { EvidenceRef } from '../../semantic/evidence-contract';
import type { RuntimeDisplayProtocol } from '../../runtime/runtime-display-protocol';
import type { SourceRef } from '../../semantic/source-contract';
import type { MessageRuntimeProjection } from '@/types';
import type {
  DisclosureBuildInput,
  DisclosureEvidenceItem,
  DisclosureExecutionStep,
  DisclosureFieldCatalogItem,
  DisclosurePermissionState,
  DisclosureProjectionSeed,
  DisclosureQualityCheckItem,
  DisclosureRawInfoItem,
  DisclosureSourceItem,
  DisclosureToolCallItem,
  MessageDisclosureView,
} from '../types';
import { MESSAGE_DISCLOSURE_VIEW_CONTRACT_TYPE, MESSAGE_DISCLOSURE_VIEW_VERSION } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text || !/^[\[{]/.test(text)) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

const SENSITIVE_KEY_PATTERN = /(token|api[_-]?key|secret|authorization|cookie|password|phone|email|idfa|imei|oaid|android[_-]?id|ip|app[_-]?id|project[_-]?id|project[_-]?scope|account[_-]?id|advertiser[_-]?id|media[_-]?id|user[_-]?id)$/i;

function redactSensitiveValue(value: unknown, redactedFields: string[] = [], depth = 8): unknown {
  if (depth <= 0) return '[已折叠]';
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redactSensitiveValue(item, redactedFields, depth - 1));

  const output: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    const shouldRedact = SENSITIVE_KEY_PATTERN.test(key) || redactedFields.some((field) => {
      const normalized = field.replace(/^\$\./, '').toLowerCase();
      return normalized === key.toLowerCase() || normalized.endsWith(`.${key.toLowerCase()}`);
    });
    output[key] = shouldRedact ? '***' : redactSensitiveValue(raw, redactedFields, depth - 1);
  });
  return output;
}

function normalizeToolPayload(
  payload: DisclosureToolCallItem['request'] | DisclosureToolCallItem['response'] | undefined,
  permissions: DisclosurePermissionState,
): DisclosureToolCallItem['request'] | DisclosureToolCallItem['response'] | undefined {
  if (!payload) return undefined;
  const redaction = payload.redaction || {
    level: permissions.redactionLevel,
    reason: permissions.canViewRaw ? undefined : '当前权限仅展示脱敏内容。',
  };
  const normalized = payload.normalized === undefined
    ? undefined
    : permissions.canViewRaw || redaction.level === 'none'
      ? payload.normalized
      : redaction.level === 'full'
        ? '[已脱敏]'
        : redactSensitiveValue(payload.normalized, redaction.redactedFields || []);
  return {
    ...payload,
    normalized,
    displayValue: payload.displayValue || (normalized === undefined ? undefined : stringifyValue(normalized)),
    redaction,
  };
}

function normalizeToolCall(item: DisclosureToolCallItem, permissions: DisclosurePermissionState): DisclosureToolCallItem {
  return {
    ...item,
    request: normalizeToolPayload(item.request, permissions),
    response: normalizeToolPayload(item.response, permissions),
  };
}

function readToolSnapshot(item: { metadata?: Record<string, unknown> }): Partial<DisclosureToolCallItem> {
  const snapshot = isRecord(item.metadata?.tool_snapshot) ? item.metadata.tool_snapshot : item.metadata;
  if (!isRecord(snapshot)) return {};
  const request = isRecord(snapshot.request) ? snapshot.request : undefined;
  const response = isRecord(snapshot.response) ? snapshot.response : undefined;
  return {
    request: request ? {
      summary: safeString(request.summary),
      normalized: request.normalized,
      displayValue: safeString(request.displayValue),
      rawRef: safeString(request.rawRef || request.raw_ref),
      redaction: isRecord(request.redaction) ? request.redaction as any : undefined,
      metadata: isRecord(request.metadata) ? request.metadata : undefined,
    } : undefined,
    response: response ? {
      summary: safeString(response.summary),
      normalized: response.normalized,
      displayValue: safeString(response.displayValue),
      rawRef: safeString(response.rawRef || response.raw_ref),
      redaction: isRecord(response.redaction) ? response.redaction as any : undefined,
      rowCount: typeof response.rowCount === 'number' ? response.rowCount : typeof response.row_count === 'number' ? response.row_count : undefined,
      error: isRecord(response.error) ? {
        code: safeString(response.error.code),
        message: safeString(response.error.message),
        recoverable: typeof response.error.recoverable === 'boolean' ? response.error.recoverable : undefined,
      } : undefined,
      metadata: isRecord(response.metadata) ? response.metadata : undefined,
    } : undefined,
    schemaRef: isRecord(snapshot.schemaRef) ? snapshot.schemaRef as any : isRecord(snapshot.schema_ref) ? snapshot.schema_ref as any : undefined,
    quality: isRecord(snapshot.quality) ? snapshot.quality as any : undefined,
  };
}

function normalizeOverviewStatus(value: unknown): MessageDisclosureView['overview']['status'] {
  const text = safeString(value, 'ready').toLowerCase();
  if (text.includes('fail')) return 'failed';
  if (text.includes('block')) return 'blocked';
  if (text.includes('degrad')) return 'degraded';
  if (text.includes('partial') || text.includes('empty')) return 'partial';
  return 'ready';
}

function normalizePermissionState(seed?: Partial<DisclosurePermissionState> | null): DisclosurePermissionState {
  return {
    canViewOverview: true,
    canViewExecution: true,
    canViewEvidence: true,
    canViewFields: true,
    canViewQualityChecks: true,
    canViewRaw: false,
    canViewActions: true,
    canViewFull: false,
    redactionLevel: 'partial',
    ...(seed || {}),
  };
}

function collectRuntimeProjection(seed?: DisclosureProjectionSeed | null): MessageRuntimeProjection | null {
  const metadata = seed?.metadata;
  if (!isRecord(metadata)) return null;
  return isRecord(metadata.message_runtime_projection)
    ? metadata.message_runtime_projection as unknown as MessageRuntimeProjection
    : null;
}

function projectionStatusToQuality(value: string | undefined): DisclosureQualityCheckItem['status'] {
  const text = String(value || '').toLowerCase();
  if (!text) return 'info';
  if (text.includes('fail') || text.includes('error') || text.includes('deny')) return 'fail';
  if (text.includes('warn') || text.includes('partial') || text.includes('degrad')) return 'warn';
  if (text.includes('pass') || text.includes('ok') || text.includes('success') || text.includes('ready')) return 'pass';
  if (text.includes('pending') || text.includes('wait')) return 'pending';
  return 'info';
}

function projectionStatusToRuntime(value: string | undefined): RuntimeDisplayProtocol['status'] | 'idle' {
  const text = String(value || '').toLowerCase();
  if (!text) return 'idle';
  if (text.includes('fail')) return 'failed';
  if (text.includes('partial') || text.includes('degrad')) return 'partially-succeeded';
  if (text.includes('wait')) return 'queued';
  if (text.includes('run')) return 'running';
  if (text.includes('done') || text.includes('success') || text.includes('complete') || text.includes('pass')) return 'succeeded';
  return 'idle';
}

function getLocatorValue(locator: unknown): string {
  if (!isRecord(locator)) return '';
  return safeString(locator.value);
}

function collectSemanticSourceRefs(semanticResult: unknown): SourceRef[] {
  if (!isRecord(semanticResult) || !Array.isArray(semanticResult.sourceRefs)) return [];
  return semanticResult.sourceRefs.filter(isRecord).map((item, index) => ({
    id: safeString(item.id || `source-${index}`),
    type: safeString(item.type || 'unknown') as SourceRef['type'],
    title: safeString(item.title || `来源 ${index + 1}`),
    description: safeString(item.description),
    retrievedAt: safeString(item.retrievedAt || item.retrieved_at),
    freshness: isRecord(item.freshness) ? (item.freshness as any) : undefined,
    reliability: isRecord(item.reliability) ? (item.reliability as any) : undefined,
    locator: isRecord(item.locator) ? (item.locator as any) : undefined,
    citationPolicy: isRecord(item.citationPolicy) ? (item.citationPolicy as any) : undefined,
    redaction: isRecord(item.redaction) ? (item.redaction as any) : undefined,
    metadata: isRecord(item.metadata) ? item.metadata : undefined,
  }));
}

function collectProcessEventSourceRefs(seed?: DisclosureProjectionSeed | null): SourceRef[] {
  const sources = collectSeedProcessEvents(seed)
    .flatMap((event) => {
      const rawSources = [
        event.source_refs,
        event.sourceRefs,
        isRecord(event.output) ? event.output.source_refs || event.output.sourceRefs || event.output.sources : undefined,
      ].find(Array.isArray);
      return Array.isArray(rawSources) ? rawSources : [];
    })
    .filter(isRecord);

  const seen = new Set<string>();
  const normalized: SourceRef[] = [];
  sources.forEach((item, index) => {
    const locator = isRecord(item.locator) ? (item.locator as any) : undefined;
    const url = safeString(item.url || (locator?.kind === 'url' ? locator.value : ''));
    const id = safeString(item.id || item.source_id || url || item.title, `event-source-${index}`);
    if (seen.has(id)) return;
    seen.add(id);
    normalized.push({
      id,
      type: safeString(item.type || item.source_type || (url ? 'url' : 'unknown'), 'unknown') as SourceRef['type'],
      title: safeString(item.title || item.name || item.source || url, `来源 ${index + 1}`),
      description: safeString(item.description || item.summary || item.snippet),
      retrievedAt: safeString(item.retrievedAt || item.retrieved_at),
      freshness: isRecord(item.freshness) ? (item.freshness as any) : undefined,
      reliability: isRecord(item.reliability) ? (item.reliability as any) : undefined,
      locator: locator || (url ? { kind: 'url', value: url } : undefined),
      citationPolicy: isRecord(item.citationPolicy) ? (item.citationPolicy as any) : undefined,
      redaction: isRecord(item.redaction) ? (item.redaction as any) : undefined,
      metadata: isRecord(item.metadata) ? item.metadata : undefined,
    });
  });
  return normalized;
}

function collectSemanticEvidenceRefs(semanticResult: unknown): EvidenceRef[] {
  if (!isRecord(semanticResult) || !Array.isArray(semanticResult.evidenceRefs)) return [];
  return semanticResult.evidenceRefs.filter(isRecord).map((item, index) => ({
    id: safeString(item.id || `evidence-${index}`),
    type: safeString(item.type || 'unknown') as EvidenceRef['type'],
    title: safeString(item.title || `证据 ${index + 1}`),
    summary: safeString(item.summary),
    sourceRefIds: safeArray<string>(item.sourceRefIds || item.source_ref_ids),
    confidence: isRecord(item.confidence) ? (item.confidence as any) : undefined,
    freshness: isRecord(item.freshness) ? (item.freshness as any) : undefined,
    redaction: isRecord(item.redaction) ? (item.redaction as any) : undefined,
    verification: isRecord(item.verification) ? (item.verification as any) : undefined,
    metadata: isRecord(item.metadata) ? item.metadata : undefined,
  }));
}

function sourceRefToDisclosureItem(item: SourceRef): DisclosureSourceItem {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    summary: item.description || item.title,
    detail: item.locator?.value || item.description,
    url: item.locator?.kind === 'url' ? item.locator.value : undefined,
    retrievedAt: item.retrievedAt,
    freshness: item.freshness,
    reliability: item.reliability as any,
    locator: item.locator as any,
    citationPolicy: item.citationPolicy as any,
    redaction: item.redaction,
    confidence: undefined,
    metadata: item.metadata,
  };
}

function evidenceRefToDisclosureItem(item: EvidenceRef): DisclosureEvidenceItem {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    summary: item.summary,
    sourceRefIds: item.sourceRefIds,
    confidence: item.confidence,
    freshness: item.freshness,
    redaction: item.redaction,
    verification: item.verification,
    metadata: item.metadata,
  };
}

function collectFieldCatalog(semanticResult: unknown, seed?: DisclosureProjectionSeed): DisclosureFieldCatalogItem[] {
  const seedItems = seed?.fields?.items || [];
  if (seedItems.length > 0) return seedItems;
  if (!isRecord(semanticResult)) return [];

  const candidates = [
    semanticResult.fieldCatalog,
    semanticResult.fields,
    isRecord(semanticResult.metadata) ? semanticResult.metadata.field_catalog : undefined,
    isRecord(semanticResult.metadata) ? semanticResult.metadata.fieldCatalog : undefined,
  ];
  const source = candidates.find((item) => Array.isArray(item)) as Array<Record<string, unknown>> | undefined;
  if (!source) return [];

  return source.map((item, index) => ({
    key: safeString(item.key || item.field_key || `field-${index}`),
    label: safeString(item.label || item.field_label || `字段 ${index + 1}`),
    description: safeString(item.description || item.why_required),
    type: safeString(item.type || item.value_type),
    unit: safeString(item.unit),
    format: safeString(item.format),
    category: safeString(item.category || item.field_group || item.group),
    value: item.value,
    displayValue: safeString(item.displayValue || item.display_value),
    status: (item.status as DisclosureFieldCatalogItem['status']) || (item.value === undefined ? 'unknown' : 'present'),
    required: typeof item.required === 'boolean' ? item.required : undefined,
    derived: typeof item.derived === 'boolean' ? item.derived : undefined,
    sourcePath: safeString(item.sourcePath || item.source_path),
    examples: safeArray<string>(item.examples),
    metadata: isRecord(item.metadata) ? item.metadata : undefined,
  }));
}

function buildQualityChecks(seed: DisclosureProjectionSeed, runtime: RuntimeDisplayProtocol | Record<string, unknown> | null | undefined): DisclosureQualityCheckItem[] {
  const items = [...(seed.qualityChecks?.items || [])];
  const runtimeRecord = runtime && typeof runtime === 'object' ? (runtime as Record<string, unknown>) : {};

  if (Array.isArray(runtimeRecord.errors) && runtimeRecord.errors.length > 0) {
    items.push({
      id: 'runtime-errors',
      label: '运行错误',
      status: 'fail',
      summary: '本次执行存在错误，需要查看执行详情。',
      detail: stringifyValue(runtimeRecord.errors),
    });
  }

  return items;
}

function buildOverviewHighlights(view: MessageDisclosureView): string[] {
  const highlights: string[] = [];
  if (view.evidence.sources.length > 0) highlights.push(`已识别 ${view.evidence.sources.length} 条来源`);
  if (view.evidence.evidenceRefs.length > 0) highlights.push(`已识别 ${view.evidence.evidenceRefs.length} 条证据`);
  if (view.execution.toolCalls.length > 0) highlights.push(`已记录 ${view.execution.toolCalls.length} 次工具调用`);
  if (view.fields.items.length > 0) highlights.push(`已整理 ${view.fields.items.length} 个字段`);
  return highlights;
}

function collectSeedProcessEvents(seed?: DisclosureProjectionSeed | null): Record<string, unknown>[] {
  const metadata = isRecord(seed?.metadata) ? seed.metadata : {};
  return Array.isArray(metadata.process_events) ? metadata.process_events.filter(isRecord) : [];
}

function processEventStatusToRuntime(status: unknown): MessageDisclosureView['execution']['status'] {
  const text = String(status || '').toLowerCase();
  if (text === 'running' || text === 'pending' || text === 'queued' || text === 'waiting') return 'running';
  if (text === 'failed' || text === 'error') return 'failed';
  if (text === 'partial' || text === 'warn' || text === 'warning') return 'partially-succeeded';
  return 'succeeded';
}

function processEventSourceRefs(event: Record<string, unknown>): string[] {
  const direct = [
    event.source_refs,
    event.sourceRefs,
    isRecord(event.output) ? event.output.source_refs || event.output.sourceRefs || event.output.sources : undefined,
  ].find(Array.isArray);
  if (!Array.isArray(direct)) return [];
  return direct.map((item, index) => {
    if (typeof item === 'string') return item;
    if (isRecord(item)) return safeString(item.id || item.source_id || item.url || item.title, `source-${index}`);
    return '';
  }).filter(Boolean);
}

function buildExecutionStepsFromProcessEvents(seed?: DisclosureProjectionSeed | null): DisclosureExecutionStep[] {
  return collectSeedProcessEvents(seed).map((event, index) => ({
    id: safeString(event.id, `process-event-${index}`),
    title: safeString(event.label || event.type, `步骤 ${index + 1}`),
    status: processEventStatusToRuntime(event.status),
    kind: 'custom',
    summary: safeString(event.summary),
    durationMs: typeof event.duration_ms === 'number' ? event.duration_ms : undefined,
    startedAt: safeString(event.started_at),
    endedAt: safeString(event.completed_at),
    sourceRefs: processEventSourceRefs(event),
    metadata: {
      source: 'message.process_events',
      raw_event: event,
    },
  }));
}

export function buildDisclosureView(input: DisclosureBuildInput): MessageDisclosureView {
  const semanticResult = input.semanticResult;
  const runtime = input.runtime;
  const seed = (input.seed || {}) as DisclosureProjectionSeed;
  const runtimeProjection = collectRuntimeProjection(seed);

  const semanticRecord = isRecord(semanticResult) ? semanticResult : {};
  const runtimeRecord = runtime && typeof runtime === 'object' ? (runtime as Record<string, unknown>) : {};
  const semanticSourceRefs = collectSemanticSourceRefs(semanticRecord);
  const processEventSourceRefs = collectProcessEventSourceRefs(seed);
  const semanticEvidenceRefs = collectSemanticEvidenceRefs(semanticRecord);
  const disclosureSources: DisclosureSourceItem[] = [
    ...(seed.evidence?.sources || []),
    ...semanticSourceRefs.map(sourceRefToDisclosureItem),
    ...processEventSourceRefs.map(sourceRefToDisclosureItem),
  ];
  const disclosureEvidenceItems: DisclosureEvidenceItem[] = [
    ...(seed.evidence?.evidenceRefs || []),
    ...semanticEvidenceRefs.map(evidenceRefToDisclosureItem),
  ];
  const fieldItems = collectFieldCatalog(semanticRecord, seed);
  const permissions = normalizePermissionState({
    ...(seed.permissions || {}),
    ...(input.permissions || {}),
    canViewRaw: Boolean(seed.permissions?.canViewRaw || input.permissions?.canViewRaw),
  });

  const overviewTitle = safeString(
    seed.overview?.title
      || (isRecord(semanticRecord.business_summary) ? semanticRecord.business_summary.title : '')
      || input.message.content.slice(0, 48),
    '过程与依据',
  );
  const overviewSummary = safeString(
    seed.overview?.summary
      || (isRecord(semanticRecord.business_summary) ? semanticRecord.business_summary.brief : '')
      || safeString(runtimeRecord.summary)
      || input.message.content,
    input.message.content,
  );
  const eventBackedSteps = buildExecutionStepsFromProcessEvents(seed);
  const executionStatus = safeString(seed.execution?.status || runtimeRecord.status || (eventBackedSteps.length ? 'running' : '') || (seed.rawInfo?.items?.length ? 'succeeded' : 'idle'), 'idle');

  const view: MessageDisclosureView = {
    contractType: MESSAGE_DISCLOSURE_VIEW_CONTRACT_TYPE,
    version: MESSAGE_DISCLOSURE_VIEW_VERSION,
    disclosureId: `disclosure-${input.message.message_id || input.message.id || Date.now()}`,
    messageId: input.message.message_id || input.message.id,
    conversationId: input.message.conversation_id,
    title: overviewTitle,
    overview: {
      title: overviewTitle,
      summary: overviewSummary,
      status: normalizeOverviewStatus(seed.overview?.status || runtimeRecord.status || semanticRecord.status),
      badges: [safeString(input.message.agent), safeString(input.message.intent_type), safeString(semanticRecord.screenType)].filter(Boolean),
      highlights: [],
      metrics: [],
    },
    execution: {
      runtimeId: safeString(seed.execution?.runtimeId || runtimeRecord.runtimeId || input.message.message_id),
      executionId: safeString(seed.execution?.executionId || runtimeRecord.executionId),
      status: executionStatus as MessageDisclosureView['execution']['status'],
      summary: safeString(seed.execution?.summary || runtimeRecord.summary || overviewSummary),
      toolCalls: (seed.execution?.toolCalls || []).map((item) => normalizeToolCall(item, permissions)),
      steps: seed.execution?.steps?.length ? seed.execution.steps : eventBackedSteps,
      events: seed.execution?.events || [],
      workflowSteps: seed.execution?.workflowSteps || [],
      runtimeStatusLabel: safeString(seed.execution?.runtimeStatusLabel || executionStatus),
    },
    evidence: {
      sources: disclosureSources,
      evidenceRefs: disclosureEvidenceItems,
      summary: safeString(seed.evidence?.summary || (disclosureSources.length > 0 || disclosureEvidenceItems.length > 0 ? `来源 ${disclosureSources.length} 条，证据 ${disclosureEvidenceItems.length} 条` : '')),
    },
    fields: {
      items: fieldItems.map((item) => ({
        ...item,
        displayValue: item.displayValue || stringifyValue(item.value),
      })),
      summary: safeString(seed.fields?.summary || (fieldItems.length > 0 ? `字段目录 ${fieldItems.length} 项` : '')),
    },
    qualityChecks: {
      items: buildQualityChecks(seed, runtime),
      summary: safeString(seed.qualityChecks?.summary || ''),
    },
    rawInfo: {
      status: permissions.canViewRaw ? 'available' : (seed.rawInfo?.items && seed.rawInfo.items.length > 0 ? 'redacted' : 'empty'),
      note: seed.rawInfo?.note || (permissions.canViewRaw ? '原始信息可展开查看。' : '原始信息已脱敏，仅展示可公开内容。'),
      items: (seed.rawInfo?.items || []).map((item) => ({
        ...item,
        displayValue: permissions.canViewRaw && item.rawValue !== undefined ? stringifyValue(item.rawValue) : item.displayValue,
        rawValue: permissions.canViewRaw ? item.rawValue : undefined,
        redacted: permissions.canViewRaw ? false : item.redacted || true,
      })),
    },
    permissions,
    emptyStates: {
      overview: seed.emptyStates?.overview || '当前没有可展示的过程摘要。',
      execution: seed.emptyStates?.execution || '当前没有可展示的执行步骤。',
      evidence: seed.emptyStates?.evidence || '当前没有可展示的来源或证据。',
      fields: seed.emptyStates?.fields || '当前没有字段目录可展示。',
      qualityChecks: seed.emptyStates?.qualityChecks || '当前没有质量检查项。',
      rawInfo: seed.emptyStates?.rawInfo || '当前没有原始返回可展示。',
    },
    actions: seed.actions,
    sourceRefs: [...semanticSourceRefs, ...processEventSourceRefs],
    evidenceRefs: semanticEvidenceRefs,
    runtimeRefs: [safeString(seed.execution?.runtimeId || runtimeRecord.runtimeId || input.message.message_id)].filter(Boolean),
    metadata: {
      ...(seed.metadata || {}),
      message_id: input.message.message_id,
      conversation_id: input.message.conversation_id,
      source_message_id: input.message.message_id,
    },
  };

  if (runtimeProjection) {
    view.metadata = {
      ...(view.metadata || {}),
      message_runtime_projection: runtimeProjection,
      trace_url: runtimeProjection.trace_url,
    };

    view.overview.badges = Array.from(new Set([
      ...view.overview.badges,
      safeString(runtimeProjection.workflow),
      safeString(runtimeProjection.intent),
    ].filter(Boolean)));

    view.execution.summary = safeString(
      runtimeProjection.view_model_summary_text
        || runtimeProjection.query_plan_summary?.summary
        || runtimeProjection.quality_summary
        || view.execution.summary,
      view.execution.summary,
    );
    view.execution.status = projectionStatusToRuntime(runtimeProjection.status) as MessageDisclosureView['execution']['status'];
    view.execution.runtimeId = safeString(view.execution.runtimeId || runtimeProjection.trace_id || input.message.message_id);
    view.execution.executionId = safeString(view.execution.executionId || runtimeProjection.trace_id || input.message.message_id);
    view.execution.steps = runtimeProjection.runtime_steps.map((step, index) => ({
      id: step.key || `runtime-step-${index}`,
      title: step.label || step.key || `步骤 ${index + 1}`,
      status: projectionStatusToRuntime(step.status) as MessageDisclosureView['execution']['status'],
      kind: (step.kind || 'custom') as DisclosureExecutionStep['kind'],
      summary: step.summary,
      durationMs: step.durationMs,
      metadata: step.metadata,
    }));
    view.execution.toolCalls = runtimeProjection.tool_summaries.map((item, index) => normalizeToolCall({
      id: `${item.name || 'tool'}-${index}`,
      name: item.name || `tool-${index}`,
      displayName: item.name || `工具 ${index + 1}`,
      kind: item.kind,
      status: item.status,
      arguments: item.arguments,
      result: item.result_summary,
      durationMs: item.duration_ms,
      ...readToolSnapshot(item),
    }, permissions));
    view.qualityChecks.items = runtimeProjection.quality_checks.map((item) => ({
      id: item.key,
      label: item.label,
      status: item.status,
      summary: item.summary,
      detail: item.detail,
      metadata: item.metadata,
    }));
    view.qualityChecks.summary = safeString(
      runtimeProjection.quality_summary || view.qualityChecks.summary || `共 ${view.qualityChecks.items.length} 项质量检查`,
      `共 ${view.qualityChecks.items.length} 项质量检查`,
    );
    view.rawInfo.note = runtimeProjection.trace_url
      ? `原始 trace 可通过链接打开。`
      : view.rawInfo.note;
    const runtimeRawItems: DisclosureRawInfoItem[] = [
      {
        id: 'runtime-projection',
        label: '系统运行总览',
        kind: 'json',
        summary: '本轮执行的系统运行过程总览',
        displayValue: JSON.stringify(runtimeProjection, null, 2),
        rawValue: runtimeProjection,
        redacted: !permissions.canViewRaw,
        collapsed: true,
        source: 'message.runtime_projection',
      },
      ...(runtimeProjection.trace_url ? [{
        id: 'trace-url',
        label: '原始 Trace 链接',
        kind: 'link' as const,
        summary: 'Trace URL',
        displayValue: runtimeProjection.trace_url,
        rawValue: runtimeProjection.trace_url,
        redacted: false,
        collapsed: false,
        source: 'message.trace_url',
        metadata: { trace_url: runtimeProjection.trace_url },
      }] : []),
    ];
    view.rawInfo.items = [...view.rawInfo.items, ...runtimeRawItems];

    const projectionWarnings = runtimeProjection.render_consumption
      .filter((item) => !item.consumed && !['empty', 'deduped'].includes(String(item.status || '')))
      .map((item) => ({
        id: `renderer-warning-${item.renderer}-${item.field}`,
        label: `${item.renderer} 未消费字段`,
        status: 'warn' as const,
        summary: item.warning || `字段 ${item.field} 已存在但未被消费`,
        detail: item.metadata ? stringifyValue(item.metadata) : undefined,
      }));
    if (projectionWarnings.length > 0) {
      view.qualityChecks.items = [...view.qualityChecks.items, ...projectionWarnings];
    }
  }

  view.overview.highlights = [
    ...(seed.overview?.highlights || []),
    ...buildOverviewHighlights(view),
  ];
  view.overview.metrics = [
    {
      label: '来源',
      value: String(view.evidence.sources.length),
      detail: '可展示的来源数量',
      tone: view.evidence.sources.length > 0 ? 'success' : 'neutral',
    },
    {
      label: '证据',
      value: String(view.evidence.evidenceRefs.length),
      detail: '可展示的证据数量',
      tone: view.evidence.evidenceRefs.length > 0 ? 'success' : 'neutral',
    },
    {
      label: '字段',
      value: String(view.fields.items.length),
      detail: '字段目录数量',
      tone: view.fields.items.length > 0 ? 'success' : 'neutral',
    },
    {
      label: '工具',
      value: String(view.execution.toolCalls.length),
      detail: '工具调用数量',
      tone: view.execution.toolCalls.length > 0 ? 'warning' : 'neutral',
    },
  ];

  if (view.qualityChecks.items.length === 0 && Array.isArray((input.message as any).pending_checks) && (input.message as any).pending_checks.length > 0) {
    view.qualityChecks.items = (input.message as any).pending_checks.map((check: string, index: number) => ({
      id: `pending-${index}`,
      label: '待确认事项',
      status: 'pending',
      summary: safeString(check),
      actionHint: '补充条件后可继续查询。',
    }));
    view.qualityChecks.summary = `共 ${view.qualityChecks.items.length} 项质量检查`;
  }

  if (view.qualityChecks.items.length === 0) {
    const retryOrFailTools = view.execution.toolCalls.filter((item) => /fail|retry/i.test(String(item.status || '')));
    const retryOrFailSteps = view.execution.steps.filter((item) => /fail|retry/i.test(String(item.status || '')));

    if (retryOrFailTools.length > 0) {
      view.qualityChecks.items = retryOrFailTools.map((item, index) => ({
        id: `tool-status-${index}`,
        label: item.displayName || item.name || '工具状态',
        status: /fail/i.test(String(item.status || '')) ? 'fail' : 'warn',
        summary: /fail/i.test(String(item.status || ''))
          ? '工具调用失败，需要查看执行详情。'
          : '工具调用处于重试阶段。',
        detail: item.result || item.arguments,
      }));
      view.qualityChecks.summary = `共 ${view.qualityChecks.items.length} 项质量检查`;
    } else if (retryOrFailSteps.length > 0 || view.execution.status === 'partially-succeeded') {
      view.qualityChecks.items = [{
        id: 'partial-result',
        label: '部分结果',
        status: 'warn',
        summary: '本次结果为部分成功，建议继续补充条件或查看执行详情。',
        detail: view.execution.summary,
      }];
      view.qualityChecks.summary = '共 1 项质量检查';
    }
  }

  const messageMetadata = isRecord(input.message.metadata) ? input.message.metadata : {};
  const legacyToolCalls = Array.isArray(input.message.tool_calls) && input.message.tool_calls.length > 0
    ? input.message.tool_calls
    : safeArray<Record<string, unknown>>(messageMetadata.tool_calls).filter(isRecord);
  if (view.execution.toolCalls.length === 0 && legacyToolCalls.length > 0) {
    view.execution.toolCalls = legacyToolCalls.map((item, index) => normalizeToolCall({
      id: safeString(item.step_key || item.name || `tool-${index}`),
      name: safeString(item.name || `tool-${index}`),
      displayName: safeString(item.display_name),
      kind: safeString(item.kind),
      status: safeString(item.status),
      arguments: safeString(item.arguments),
      result: safeString(item.result),
      providerUrl: safeString(item.provider_url),
      prompt: safeString(item.prompt),
      stepKey: safeString(item.step_key),
      request: item.arguments ? {
        summary: safeString(item.arguments).slice(0, 160),
        normalized: parseJsonValue(item.arguments),
        redaction: { level: permissions.redactionLevel },
      } : undefined,
      response: item.result ? {
        summary: safeString(item.result).slice(0, 160),
        normalized: parseJsonValue(item.result),
        redaction: { level: permissions.redactionLevel },
      } : undefined,
    }, permissions));
  }

  return view;
}
