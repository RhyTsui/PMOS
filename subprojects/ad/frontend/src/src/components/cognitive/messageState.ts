import type { Message } from '@/types';
import type {
  DisclosurePermissionState,
  DisclosureProjectionSeed,
  DisclosureRawInfoItem,
  DisclosureSourceItem,
  DisclosureToolCallItem,
  MessageDisclosureView,
} from '@/contracts/disclosure';
import { buildDisclosureView } from '@/contracts/disclosure';

export interface MessageDisclosurePayload {
  message: Message | null;
  source?: Record<string, unknown> | null;
  capability?: Record<string, unknown> | null;
  permissions?: Partial<DisclosurePermissionState> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeFieldCatalog(value: unknown): Array<Record<string, unknown>> {
  return safeArray<Record<string, unknown>>(value).filter(isRecord);
}

function summarizeValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.slice(0, 180);
  if (Array.isArray(value)) return `共 ${value.length} 项`;
  if (isRecord(value)) {
    const message = typeof value.message === 'string' ? value.message : '';
    const rowCount = typeof value.row_count === 'number'
      ? value.row_count
      : Array.isArray(value.rows)
        ? value.rows.length
        : undefined;
    return [typeof rowCount === 'number' ? `返回 ${rowCount} 行` : '', message].filter(Boolean).join('；') || Object.keys(value).slice(0, 6).join('、');
  }
  return String(value);
}

function toolChainToDisclosureCalls(value: unknown): DisclosureToolCallItem[] {
  return normalizeFieldCatalog(value).map((item, index) => {
    const input = item.input;
    const result = item.result;
    return {
      id: String(item.key || item.tool_name || `tool-${index}`),
      name: String(item.tool_name || item.key || `tool-${index}`),
      displayName: String(item.tool_name || item.key || `工具 ${index + 1}`),
      kind: item.tool_name ? 'mcp' : 'runtime',
      status: String(item.status || ''),
      stepKey: String(item.key || ''),
      request: input !== undefined ? {
        summary: summarizeValue(input),
        normalized: input,
        redaction: { level: 'partial' },
      } : undefined,
      response: result !== undefined ? {
        summary: summarizeValue(result),
        normalized: result,
        rowCount: isRecord(result) && typeof result.row_count === 'number' ? result.row_count : undefined,
        redaction: { level: 'partial' },
      } : undefined,
    };
  });
}

export function getMessageDisclosureKey(message: Message | null | undefined): string {
  return message?.message_id || message?.id || '';
}

export function buildMessageDisclosureView(payload: MessageDisclosurePayload): MessageDisclosureView | null {
  if (!payload.message) return null;

  const metadata = isRecord(payload.message.metadata) ? payload.message.metadata : {};
  const workflowResult = isRecord(metadata.workflow_result) ? metadata.workflow_result : {};
  const messageContract = isRecord(metadata.message_contract) ? metadata.message_contract : {};
  const runtimeProjection = isRecord(metadata.message_runtime_projection)
    ? metadata.message_runtime_projection
    : isRecord(workflowResult.message_runtime_projection)
      ? workflowResult.message_runtime_projection
      : isRecord(messageContract.message_runtime_projection)
        ? messageContract.message_runtime_projection
        : null;
  const semanticResult = isRecord(metadata.semantic_result)
    ? metadata.semantic_result
    : isRecord(workflowResult.semantic_result)
      ? workflowResult.semantic_result
      : isRecord(messageContract.semantic_result)
        ? messageContract.semantic_result
        : null;
  const runtime = isRecord(metadata.runtime_state)
    ? metadata.runtime_state
    : isRecord(workflowResult)
      ? workflowResult.runtime_state || workflowResult
      : null;
  const fieldCatalog = normalizeFieldCatalog(
    metadata.field_catalog
      || metadata.fieldCatalog
      || (isRecord(semanticResult) ? semanticResult.fieldCatalog : undefined)
      || (isRecord(semanticResult) ? semanticResult.fields : undefined),
  );
  const messageToolCalls = metadata.tool_calls || payload.message.tool_calls;
  const processEvents = Array.isArray(payload.message.process_events)
    ? payload.message.process_events
    : Array.isArray(metadata.process_events)
      ? metadata.process_events
      : [];
  const toolChain = metadata.tool_chain
    || (isRecord(metadata.message_contract) && isRecord(metadata.message_contract.evidence_bundle) ? metadata.message_contract.evidence_bundle.tool_calls : undefined)
    || (isRecord(workflowResult.evidence_bundle) ? workflowResult.evidence_bundle.tool_calls : undefined);

  const seed: DisclosureProjectionSeed = {
    rawInfo: { items: [] },
    execution: { toolCalls: toolChainToDisclosureCalls(toolChain) },
    evidence: { sources: [], evidenceRefs: [], summary: '' },
    metadata: {
      message_runtime_projection: runtimeProjection,
      process_events: processEvents,
      trace_meta: metadata.trace_meta,
      trace_url: metadata.trace_meta && isRecord(metadata.trace_meta) ? metadata.trace_meta.trace_url : undefined,
    },
  };
  const seedSources = seed.evidence?.sources || [];
  const seedRawItems = seed.rawInfo?.items || [];

  if (payload.source) {
    seedSources.push({
      id: String(payload.source.id || payload.source.title || 'source'),
      title: String(payload.source.title || '来源'),
      type: String(payload.source.sourceType || 'other'),
      summary: String(payload.source.source || ''),
      detail: String(payload.source.detail || payload.source.prompt || ''),
      metadata: payload.source,
    } as DisclosureSourceItem);
  }

  if (payload.capability) {
    seedRawItems.push({
      id: String(payload.capability.key || payload.capability.name || 'capability'),
      label: String(payload.capability.name || '能力调用'),
      kind: 'json',
      summary: '能力调用信息',
      displayValue: JSON.stringify(payload.capability, null, 2),
      rawValue: payload.capability,
      redacted: true,
      collapsed: true,
      source: 'message.capability',
    } as DisclosureRawInfoItem);
  }

  if (messageToolCalls) {
    seedRawItems.push({
      id: 'tool_calls',
      label: '工具调用',
      kind: 'json',
      summary: '消息中的工具调用',
      displayValue: '[已脱敏]',
      rawValue: messageToolCalls,
      redacted: true,
      collapsed: true,
      source: 'message.tool_calls',
    } as DisclosureRawInfoItem);
  }

  seed.evidence = {
    sources: seedSources,
    evidenceRefs: [],
    summary: '',
  };
  seed.rawInfo = {
    status: 'redacted',
    note: '原始信息已脱敏，仅在此区域展开显示。',
    items: seedRawItems,
  };

  const view = buildDisclosureView({
    message: payload.message,
    semanticResult,
    runtime: runtime as any,
    fieldCatalog: fieldCatalog as any,
    seed,
    permissions: payload.permissions,
  });

  return view;
}
