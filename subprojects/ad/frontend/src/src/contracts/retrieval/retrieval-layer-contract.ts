import type { EvidenceRef } from '@/contracts/semantic/evidence-contract';
import type { SourceRef } from '@/contracts/semantic/source-contract';

export type RetrievalSourceKind =
  | 'dataki_knowledge'
  | 'public_search'
  | 'mcp_business_data'
  | 'uploaded_document'
  | 'conversation_memory';

export type RetrievalPriority = 'system_of_record' | 'governed_knowledge' | 'public_evidence' | 'context';
export type RetrievalStatus = 'success' | 'partial' | 'empty' | 'failed' | 'blocked' | 'not_configured';

export interface RetrievalRequest {
  query: string;
  sourceKinds: RetrievalSourceKind[];
  factNeed?: Record<string, unknown>;
  maxEvidenceItems?: number;
  traceId?: string;
  context?: Record<string, unknown>;
}

export interface RetrievalResult {
  sourceKind: RetrievalSourceKind;
  priority: RetrievalPriority;
  status: RetrievalStatus;
  sourceRefs: SourceRef[];
  evidenceRefs: EvidenceRef[];
  toolCallTrace: Array<{
    id: string;
    name: string;
    kind: 'mcp' | 'api' | 'knowledge' | 'public_web' | 'file' | 'memory' | string;
    status: string;
    duration_ms?: number;
    input_summary?: string;
    output_summary?: string;
    trace_id?: string;
    source_ref_ids?: string[];
  }>;
  warnings: string[];
  metadata?: Record<string, unknown>;
}

export interface RetrievalLayerTrace {
  selectedSources: RetrievalSourceKind[];
  rejectedSources: Array<{
    sourceKind: RetrievalSourceKind;
    reason: string;
  }>;
  priorityOrder: RetrievalSourceKind[];
  publicSearchMaySupplement: boolean;
}

export interface PublicSearchRetrievalEvidenceInput {
  evidence_id: string;
  source_url: string;
  title: string;
  snippet: string;
  confidence: number;
  provider: string;
  source_ref_id: string;
  published_at?: string;
  updated_at?: string;
  fetched?: boolean;
  fetch_failed?: boolean;
}

export interface PublicSearchRetrievalSourceInput {
  id?: string;
  sourceId?: string;
  title: string;
  url?: string;
  source?: string;
  source_type?: string;
  retrievedAt?: string;
  fetchedAt?: string;
  confidence?: number;
}

export interface RetrievalSourceInput {
  id?: string;
  title: string;
  description?: string;
  type?: SourceRef['type'];
  locator?: SourceRef['locator'];
  retrievedAt?: string;
  owner?: SourceRef['owner'];
  metadata?: Record<string, unknown>;
}

export interface RetrievalEvidenceInput {
  id?: string;
  title: string;
  summary?: string;
  type?: EvidenceRef['type'];
  sourceRefIds?: string[];
  locator?: EvidenceRef['locator'];
  fields?: Record<string, unknown>;
  confidenceScore?: number;
  confidenceLevel?: NonNullable<EvidenceRef['confidence']>['level'];
  freshness?: EvidenceRef['freshness'];
  verification?: EvidenceRef['verification'];
  metadata?: Record<string, unknown>;
}

export const RETRIEVAL_PRIORITY_ORDER: RetrievalSourceKind[] = [
  'mcp_business_data',
  'dataki_knowledge',
  'uploaded_document',
  'conversation_memory',
  'public_search',
];

export function priorityForRetrievalSource(sourceKind: RetrievalSourceKind): RetrievalPriority {
  if (sourceKind === 'mcp_business_data') return 'system_of_record';
  if (sourceKind === 'dataki_knowledge' || sourceKind === 'uploaded_document') return 'governed_knowledge';
  if (sourceKind === 'public_search') return 'public_evidence';
  return 'context';
}

export function buildRetrievalLayerTrace(sourceKinds: RetrievalSourceKind[]): RetrievalLayerTrace {
  const selected = RETRIEVAL_PRIORITY_ORDER.filter(source => sourceKinds.includes(source));
  return {
    selectedSources: selected,
    rejectedSources: RETRIEVAL_PRIORITY_ORDER
      .filter(source => !sourceKinds.includes(source))
      .map(sourceKind => ({ sourceKind, reason: 'not_requested_or_not_eligible_for_current_turn' })),
    priorityOrder: RETRIEVAL_PRIORITY_ORDER,
    publicSearchMaySupplement: selected.includes('public_search') && selected.some(source => source !== 'public_search'),
  };
}

function sourceTypeForRetrievalSource(sourceKind: RetrievalSourceKind): SourceRef['type'] {
  if (sourceKind === 'mcp_business_data') return 'tool';
  if (sourceKind === 'dataki_knowledge') return 'document';
  if (sourceKind === 'uploaded_document') return 'file';
  if (sourceKind === 'conversation_memory') return 'document';
  return 'web_search';
}

function sourceReliabilityForRetrievalSource(sourceKind: RetrievalSourceKind): SourceRef['reliability'] {
  if (sourceKind === 'mcp_business_data') {
    return { level: 'verified', explanation: '来自受控 MCP/业务数据工具，优先作为内部事实依据。' };
  }
  if (sourceKind === 'dataki_knowledge') {
    return { level: 'trusted', explanation: '来自 Dataki 知识库，按治理知识来源处理。' };
  }
  if (sourceKind === 'uploaded_document') {
    return { level: 'user-provided', explanation: '来自用户上传文档，需保留文件来源。' };
  }
  if (sourceKind === 'conversation_memory') {
    return { level: 'trusted', explanation: '来自会话历史记忆，仅用于上下文补充。' };
  }
  return { level: 'unknown', explanation: '公开搜索来源，需结合 evidence 与重排分数判断可信度。' };
}

function confidenceForEvidence(input: RetrievalEvidenceInput): EvidenceRef['confidence'] {
  const score = Number.isFinite(Number(input.confidenceScore)) ? Number(input.confidenceScore) : undefined;
  const level = input.confidenceLevel || (score === undefined ? 'unknown' : score >= 0.78 ? 'high' : score >= 0.55 ? 'medium' : 'low');
  return {
    level,
    score,
    basis: 'mixed',
    explanation: '由来源类型、工具结果、检索上下文和契约转换过程综合生成。',
  };
}

export function buildRetrievalResultFromContract(input: {
  sourceKind: RetrievalSourceKind;
  status?: RetrievalStatus;
  sources?: RetrievalSourceInput[];
  evidenceItems?: RetrievalEvidenceInput[];
  toolCallTrace?: RetrievalResult['toolCallTrace'];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}): RetrievalResult {
  const sourceRefs = (input.sources || []).map((source, index): SourceRef => ({
    id: source.id || `${input.sourceKind}-source-${index + 1}`,
    type: source.type || sourceTypeForRetrievalSource(input.sourceKind),
    title: source.title,
    description: source.description,
    locator: source.locator,
    owner: source.owner,
    retrievedAt: source.retrievedAt || new Date().toISOString(),
    reliability: sourceReliabilityForRetrievalSource(input.sourceKind),
    citationPolicy: {
      required: true,
      format: 'panel',
      clickable: source.locator?.kind === 'url' || source.locator?.kind === 'file' || source.locator?.kind === 'document',
      quoteAllowed: input.sourceKind !== 'mcp_business_data',
      maxQuoteLength: 240,
    },
    metadata: {
      ...(source.metadata || {}),
      retrieval_source: input.sourceKind,
      retrieval_priority: priorityForRetrievalSource(input.sourceKind),
    },
  }));
  const defaultSourceIds = sourceRefs.map(source => source.id);
  const evidenceRefs = (input.evidenceItems || []).map((item, index): EvidenceRef => ({
    id: item.id || `${input.sourceKind}-evidence-${index + 1}`,
    type: item.type || (input.sourceKind === 'mcp_business_data' ? 'tool-output' : 'document-excerpt'),
    title: item.title,
    summary: item.summary,
    sourceRefIds: item.sourceRefIds?.length ? item.sourceRefIds : defaultSourceIds,
    locator: item.locator,
    fields: item.fields,
    confidence: confidenceForEvidence(item),
    freshness: item.freshness || {
      status: 'unknown',
      retrievedAt: new Date().toISOString(),
    },
    verification: item.verification || {
      status: input.sourceKind === 'mcp_business_data' ? 'verified' : 'unverified',
      verifiedBy: input.sourceKind === 'mcp_business_data' ? 'tool' : 'system',
    },
    metadata: {
      ...(item.metadata || {}),
      retrieval_source: input.sourceKind,
      retrieval_priority: priorityForRetrievalSource(input.sourceKind),
    },
  }));
  return {
    sourceKind: input.sourceKind,
    priority: priorityForRetrievalSource(input.sourceKind),
    status: input.status || (evidenceRefs.length ? 'success' : 'empty'),
    sourceRefs,
    evidenceRefs,
    toolCallTrace: input.toolCallTrace || [],
    warnings: input.warnings || [],
    metadata: {
      ...(input.metadata || {}),
      retrieval_layer: buildRetrievalLayerTrace([input.sourceKind]),
    },
  };
}

export function orderRetrievalResultsByPriority(results: RetrievalResult[]): RetrievalResult[] {
  return [...results].sort((left, right) =>
    RETRIEVAL_PRIORITY_ORDER.indexOf(left.sourceKind) - RETRIEVAL_PRIORITY_ORDER.indexOf(right.sourceKind));
}

export function buildPublicSearchRetrievalResult(input: {
  sourceRefs: PublicSearchRetrievalSourceInput[];
  evidenceItems: PublicSearchRetrievalEvidenceInput[];
  providerTrace?: RetrievalResult['toolCallTrace'];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}): RetrievalResult {
  const sourceRefs = input.sourceRefs.map((source, index): SourceRef => ({
    id: source.id || source.sourceId || `public-search-source-${index + 1}`,
    type: source.source_type === 'web_fetch' ? 'web_fetch' : 'web_search',
    title: source.title,
    locator: source.url ? { kind: 'url', value: source.url } : undefined,
    retrievedAt: source.retrievedAt || source.fetchedAt,
    reliability: {
      level: 'unknown',
      explanation: '公开搜索来源，需结合 evidence 与重排分数判断可信度。',
    },
    citationPolicy: {
      required: true,
      format: 'panel',
      clickable: Boolean(source.url),
      quoteAllowed: true,
      maxQuoteLength: 240,
    },
    metadata: {
      original_source: source.source,
      confidence: source.confidence,
    },
  }));
  const evidenceRefs = input.evidenceItems.map((item): EvidenceRef => ({
    id: item.evidence_id,
    type: 'external-reference',
    title: item.title,
    summary: item.snippet,
    sourceRefIds: [item.source_ref_id],
    locator: {
      kind: 'url',
      value: item.source_url,
    },
    fields: {
      provider: item.provider,
      fetched: item.fetched,
      fetch_failed: item.fetch_failed,
      published_at: item.published_at,
      updated_at: item.updated_at,
    },
    confidence: {
      level: item.confidence >= 0.78 ? 'high' : item.confidence >= 0.55 ? 'medium' : 'low',
      score: item.confidence,
      basis: 'mixed',
      explanation: '由搜索重排、来源质量、语言匹配和正文抽取状态综合生成。',
    },
    freshness: {
      status: item.published_at || item.updated_at ? 'fresh' : 'unknown',
      updatedAt: item.updated_at,
      retrievedAt: new Date().toISOString(),
    },
    verification: {
      status: item.fetch_failed ? 'unverified' : 'verified',
      verifiedBy: item.fetch_failed ? 'system' : 'tool',
    },
    metadata: {
      retrieval_source: 'public_search',
    },
  }));
  return {
    sourceKind: 'public_search',
    priority: priorityForRetrievalSource('public_search'),
    status: evidenceRefs.length ? 'success' : 'empty',
    sourceRefs,
    evidenceRefs,
    toolCallTrace: input.providerTrace || [],
    warnings: input.warnings || [],
    metadata: {
      ...(input.metadata || {}),
      retrieval_layer: buildRetrievalLayerTrace(['public_search']),
    },
  };
}
