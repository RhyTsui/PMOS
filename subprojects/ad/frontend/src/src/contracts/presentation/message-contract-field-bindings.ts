import type {
  ComponentBinding,
  RegionType,
  SemanticRegion,
} from '@/contracts/semantic/semantic-result-contract';
import type { MessageContract } from '@/types';
import type { VizSpec } from '@/types/viz';

export type FieldProjectionStatus =
  | 'rendered'
  | 'empty'
  | 'unmapped'
  | 'missing_renderer'
  | 'deduped'
  | 'hidden'
  | 'render_error';

export interface MessageContractFieldBinding {
  field: keyof MessageContract & string;
  regionType: RegionType;
  componentBinding: ComponentBinding;
  renderer: string;
  source: 'message_contract';
  priority: number;
  required?: boolean;
  title: string;
  validate: (value: unknown) => boolean;
  normalize?: (value: unknown) => unknown;
}

export interface FieldPresentationStatus {
  field: string;
  renderer: string;
  source: 'message_contract';
  status: FieldProjectionStatus;
  consumed: boolean;
  required?: boolean;
  reason?: string;
  regionId?: string;
  regionType?: RegionType;
  componentBinding?: ComponentBinding;
  metadata?: Record<string, unknown>;
}

export interface ContractRegionComposition {
  regions: SemanticRegion[];
  fieldStatuses: Record<string, FieldPresentationStatus>;
}

export interface RenderConsumptionItem {
  renderer: string;
  field: string;
  consumed: boolean;
  status: FieldProjectionStatus | string;
  required?: boolean;
  warning?: string;
  metadata?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function readDataKind(value: unknown): string {
  return isRecord(value) ? safeString(value.kind).toLowerCase() : '';
}

export function hasNonEmptyBusinessSummary(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Boolean(
    safeString(value.title)
      || safeString(value.brief)
      || safeString(value.summary)
      || safeString(value.business_impact)
      || safeString(value.businessImpact),
  );
}

export function normalizeBusinessSummary(value: unknown): Record<string, unknown> {
  const record = isRecord(value) ? value : {};
  return {
    ...record,
    title: safeString(record.title, '结果摘要'),
    brief: safeString(record.brief, safeString(record.summary)),
    business_impact: safeString(record.business_impact, safeString(record.businessImpact)),
  };
}

function hasNonEmptyActions(value: unknown): boolean {
  return safeArray(value).length > 0;
}

function normalizeActions(value: unknown): Record<string, unknown> {
  return { actions: safeArray(value) };
}

function extractEvidenceItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  const candidates = [
    value.items,
    value.evidence,
    value.evidence_items,
    value.sources,
    value.source_refs,
    value.refs,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  return [];
}

function hasNonEmptyEvidence(value: unknown): boolean {
  return extractEvidenceItems(value).length > 0;
}

function normalizeEvidence(value: unknown): Record<string, unknown> {
  return { items: extractEvidenceItems(value) };
}

export const MESSAGE_CONTRACT_FIELD_BINDINGS: MessageContractFieldBinding[] = [
  {
    field: 'business_summary',
    regionType: 'summary',
    componentBinding: 'decision-card',
    renderer: 'BusinessSummaryCard',
    source: 'message_contract',
    priority: 10,
    title: '结果摘要',
    validate: hasNonEmptyBusinessSummary,
    normalize: normalizeBusinessSummary,
  },
  {
    field: 'next_actions',
    regionType: 'action-bar',
    componentBinding: 'action-bar',
    renderer: 'ActionsRenderer',
    source: 'message_contract',
    priority: 90,
    title: '下一步',
    validate: hasNonEmptyActions,
    normalize: normalizeActions,
  },
  {
    field: 'evidence_bundle',
    regionType: 'evidence',
    componentBinding: 'evidence-panel',
    renderer: 'EvidencePanel',
    source: 'message_contract',
    priority: 100,
    title: '依据',
    validate: hasNonEmptyEvidence,
    normalize: normalizeEvidence,
  },
];

function createEmptyStatus(binding: MessageContractFieldBinding, reason: string): FieldPresentationStatus {
  return {
    field: binding.field,
    renderer: binding.renderer,
    source: binding.source,
    status: 'empty',
    consumed: false,
    required: binding.required,
    reason,
    componentBinding: binding.componentBinding,
    regionType: binding.regionType,
    metadata: {
      source: `${binding.source}.${binding.field}`,
      reason,
    },
  };
}

export function composeContractFieldRegions(
  contract: MessageContract | null | undefined,
  bindings: MessageContractFieldBinding[] = MESSAGE_CONTRACT_FIELD_BINDINGS,
): ContractRegionComposition {
  const regions: SemanticRegion[] = [];
  const fieldStatuses: Record<string, FieldPresentationStatus> = {};
  const record = isRecord(contract) ? contract as Record<string, unknown> : {};

  for (const binding of bindings) {
    const value = record[binding.field];
    if (!binding.validate(value)) {
      fieldStatuses[binding.field] = createEmptyStatus(binding, `${binding.field} is missing or empty`);
      continue;
    }

    const normalized = binding.normalize ? binding.normalize(value) : value;
    const regionId = `contract-${binding.field.replace(/_/g, '-')}`;
    regions.push({
      id: regionId,
      type: binding.regionType,
      componentBinding: binding.componentBinding,
      title: isRecord(normalized) ? safeString(normalized.title, binding.title) : binding.title,
      state: 'ready',
      data: normalized,
      layoutHints: {
        priority: binding.priority,
        placement: 'main',
        width: 'full',
        density: 'comfortable',
      },
      metadata: {
        source: `${binding.source}.${binding.field}`,
        field: binding.field,
        renderer: binding.renderer,
      },
    });
    fieldStatuses[binding.field] = {
      field: binding.field,
      renderer: binding.renderer,
      source: binding.source,
      status: 'rendered',
      consumed: true,
      required: binding.required,
      regionId,
      regionType: binding.regionType,
      componentBinding: binding.componentBinding,
      metadata: {
        source: `${binding.source}.${binding.field}`,
        regionType: binding.regionType,
        componentBinding: binding.componentBinding,
      },
    };
  }

  return { regions, fieldStatuses };
}

function toVizSpec(item: unknown): VizSpec | null {
  if (!isRecord(item)) return null;
  const kind = readDataKind(item);
  if (kind === 'table') {
    const columns = safeArray<string>(item.columns).filter((value) => typeof value === 'string');
    const rows = safeArray<Record<string, unknown>>(item.rows).filter(isRecord);
    if (!columns.length || !rows.length) return null;
    return {
      kind: 'table',
      engine: 'table',
      columns,
      rows,
      fileName: safeString(item.fileName),
    };
  }
  if (kind === 'chart') {
    return {
      kind: 'chart',
      engine: safeString(item.engine, 'echarts') as 'echarts' | 'antv',
      option: isRecord(item.option) ? item.option : {},
      height: typeof item.height === 'number' ? item.height : undefined,
    };
  }
  if (kind === 'flow') {
    return {
      kind: 'flow',
      engine: 'reactflow',
      nodes: safeArray<Record<string, unknown>>(item.nodes).filter(isRecord),
      edges: safeArray<Record<string, unknown>>(item.edges).filter(isRecord),
      height: typeof item.height === 'number' ? item.height : undefined,
    };
  }
  return null;
}

function toVisualizationRegion(item: unknown, idPrefix: string, index: number): SemanticRegion | null {
  const spec = toVizSpec(item);
  if (!spec) return null;

  return {
    id: `contract-${idPrefix}-${index}`,
    type: 'data-view',
    componentBinding: 'data-visualization',
    title: isRecord(item) ? safeString(item.title, spec.kind === 'table' ? '数据表' : '图表') : spec.kind === 'table' ? '数据表' : '图表',
    state: 'ready',
    data: spec,
    layoutHints: {
      priority: 30 + index,
      placement: 'main',
      width: 'full',
      density: 'comfortable',
    },
    metadata: {
      source: `message_contract.visualizations.${idPrefix}`,
      field: `visualizations.${idPrefix}`,
      renderer: 'DataVisualizationRenderer',
    },
  };
}

export function collectContractVisualizationRegions(contract: MessageContract | null | undefined): SemanticRegion[] {
  const visualizations = isRecord(contract) && isRecord(contract.visualizations) ? contract.visualizations : null;
  if (!visualizations) return [];

  return [
    ...safeArray(visualizations.charts)
      .map((item, index) => toVisualizationRegion(item, 'charts', index))
      .filter((item): item is SemanticRegion => Boolean(item)),
    ...safeArray(visualizations.tables)
      .map((item, index) => toVisualizationRegion(item, 'tables', index))
      .filter((item): item is SemanticRegion => Boolean(item)),
  ];
}

function semanticRegionKey(region: SemanticRegion): string {
  if (region.componentBinding === 'decision-card' || region.type === 'summary') return 'summary';
  if (region.componentBinding === 'action-bar' || region.type === 'action-bar') return 'action-bar';
  if (region.componentBinding === 'evidence-panel' || region.type === 'evidence') return 'evidence';
  return `${region.type}:${region.componentBinding}`;
}

export function mergePresentationRegions(
  semanticRegions: SemanticRegion[],
  contractRegions: SemanticRegion[],
  fieldStatuses: Record<string, FieldPresentationStatus>,
): ContractRegionComposition {
  const usedKeys = new Set(semanticRegions.map(semanticRegionKey));
  const regions = [...semanticRegions];
  const statuses = { ...fieldStatuses };

  for (const region of contractRegions) {
    const key = semanticRegionKey(region);
    const field = isRecord(region.metadata) ? safeString(region.metadata.field) : '';
    if (usedKeys.has(key)) {
      if (field && statuses[field]?.status === 'rendered') {
        statuses[field] = {
          ...statuses[field],
          status: 'deduped',
          consumed: false,
          reason: 'same presentation region already exists',
          metadata: {
            ...(statuses[field].metadata || {}),
            reason: 'same presentation region already exists',
          },
        };
      }
      continue;
    }
    usedKeys.add(key);
    regions.push(region);
  }

  regions.sort((a, b) => {
    const ap = a.layoutHints?.priority ?? a.priority ?? 100;
    const bp = b.layoutHints?.priority ?? b.priority ?? 100;
    return ap - bp;
  });

  return { regions, fieldStatuses: statuses };
}

export function applyRendererAvailability(
  fieldStatuses: Record<string, FieldPresentationStatus>,
  hasRenderer: (binding: ComponentBinding) => boolean,
): Record<string, FieldPresentationStatus> {
  const next = { ...fieldStatuses };
  for (const status of Object.values(next)) {
    if (status.status !== 'rendered' || !status.componentBinding) continue;
    if (hasRenderer(status.componentBinding)) continue;
    next[status.field] = {
      ...status,
      status: 'missing_renderer',
      consumed: false,
      reason: 'renderer is not registered',
      metadata: {
        ...(status.metadata || {}),
        reason: 'renderer is not registered',
      },
    };
  }
  return next;
}

export function composeMessagePresentationRegions(input: {
  messageContract: MessageContract | null | undefined;
  semanticRegions?: SemanticRegion[];
  hasRenderer?: (binding: ComponentBinding) => boolean;
}): ContractRegionComposition {
  const contractComposition = composeContractFieldRegions(input.messageContract);
  const semanticRegions = [
    ...(input.semanticRegions || []),
    ...collectContractVisualizationRegions(input.messageContract),
  ];
  const merged = mergePresentationRegions(
    semanticRegions,
    contractComposition.regions,
    contractComposition.fieldStatuses,
  );
  return {
    regions: merged.regions,
    fieldStatuses: input.hasRenderer
      ? applyRendererAvailability(merged.fieldStatuses, input.hasRenderer)
      : merged.fieldStatuses,
  };
}

export function buildFieldRenderConsumption(
  fieldStatuses: Record<string, FieldPresentationStatus>,
  bindings: MessageContractFieldBinding[] = MESSAGE_CONTRACT_FIELD_BINDINGS,
): RenderConsumptionItem[] {
  return bindings.map((binding) => {
    const status = fieldStatuses[binding.field];
    const normalizedStatus = status?.status || 'unmapped';
    const warning = status && !['rendered', 'empty', 'deduped'].includes(status.status)
      ? status.reason || `${binding.field} 未完成展示`
      : undefined;
    return {
      renderer: binding.renderer,
      field: binding.field,
      consumed: normalizedStatus === 'rendered',
      status: normalizedStatus,
      required: binding.required,
      warning,
      metadata: {
        ...(status?.metadata || {}),
        source: `${binding.source}.${binding.field}`,
        region_id: status?.regionId,
        regionType: status?.regionType,
        componentBinding: status?.componentBinding,
      },
    };
  });
}
