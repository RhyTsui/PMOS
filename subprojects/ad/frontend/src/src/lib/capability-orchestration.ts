import type { McpServerConfig } from '@/types';
import { normalizeMcpToolToCapability } from '@/contracts/mcp/tool-capability-normalization';
import type {
  CapabilityBlockingReason,
  CapabilityCoverageDetail,
  CapabilityExecutionDecision,
  CapabilityManifest,
  CapabilitySelectionCandidate,
} from '@/contracts/capability/capability-manifest';
import type { UserRequirementContract } from '@/contracts/request-understanding/user-requirement-contract';
import { identifierKeyForEntityType, type EntityType } from '@/contracts/request-understanding/entity-resolution';
import { getServiceIntentExecutionPolicy, inferCapabilityPurpose } from './service-intent-execution-policy';
import { matchDomainSignalTerms, ADVERTISING_REQUEST_SIGNALS } from './advertising-domain-pack';

export function buildCapabilityManifest(servers: McpServerConfig[]): CapabilityManifest[] {
  const capabilities: CapabilityManifest[] = [];
  for (const server of servers) {
    if (!server.enabled) continue;
    for (const tool of server.tools || []) {
      if (!tool.enabled || tool.access_mode === 'write') continue;
      capabilities.push(normalizeMcpToolToCapability(server, tool));
    }
  }
  return capabilities;
}

type PresentationCoverageDetail = CapabilityCoverageDetail & {
  requestedView?: string;
  preferredView?: string;
  fallbackView?: string;
};

const ENTITY_TYPES: EntityType[] = ['media', 'app', 'campaign', 'material', 'account', 'team', 'app_package_type', 'package', 'terminal', 'terminal_os'];
const ENTITY_TYPE_SET = new Set<string>(ENTITY_TYPES);
const PRESENTATION_BACKUP_VIEW_SET = new Set(['table', 'summary', 'detail']);

function unique(values: string[]): string[] {
  return Array.from(new Set(values.flatMap(value => value ? [value] : [])));
}

function normalizeText(value: string): string {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function capabilityTriggerTerms(capability: CapabilityManifest): string[] {
  return unique([
    ...(capability.triggerHints || []),
    ...(capability.examples || []),
    ...(capability.aliases || []),
  ].flatMap((item) => {
    const normalized = normalizeText(item);
    return normalized.length >= 2 ? [normalized] : [];
  }));
}

function isEntityType(value: string): value is EntityType {
  return ENTITY_TYPE_SET.has(value);
}

function semanticOutputDimensions(capability: CapabilityManifest): string[] {
  return unique([
    ...(capability.semanticSurface?.supportedOutputDimensions || [])
      .flatMap(item => item.supportLevel !== 'unsupported' ? [item.key] : []),
    ...capability.supports.dimensions,
  ]);
}

function semanticFilterDimensions(capability: CapabilityManifest): string[] {
  return unique([
    ...(capability.semanticSurface?.supportedFilterDimensions || [])
      .flatMap(item => item.supportLevel !== 'unsupported' ? [item.key] : []),
    ...capability.supports.dimensions,
  ]);
}

function semanticGranularities(capability: CapabilityManifest): string[] {
  return unique([
    ...(capability.semanticSurface?.supportedGranularities || [])
      .flatMap(item => item.supportLevel !== 'unsupported' ? [item.key] : []),
    ...capability.supports.granularity,
  ]);
}

function semanticMetricSupport(capability: CapabilityManifest, metric: string): 'supported' | 'unknown' | 'unsupported' {
  const semantic = capability.semanticSurface?.supportedMetrics.find(item => item.key === metric);
  if (semantic) {
    const hasStrongEvidence = semantic.evidence.some(item =>
      item.source === 'schema_field' || item.source === 'schema_enum' || item.source === 'metadata',
    );
    if (semantic.supportLevel === 'supported' && !hasStrongEvidence) return 'unknown';
    return semantic.supportLevel;
  }
  if (capability.supports.metrics.includes(metric)) return 'supported';
  return capability.semanticSurface && capability.capabilityType === 'data.report' ? 'unknown' : 'unsupported';
}

function configDrivenMetricAffinity(capability: CapabilityManifest, metrics: string[]): { score: number; reasons: string[] } {
  const supportedMetrics = new Set([
    ...capability.supports.metrics,
    ...(capability.semanticSurface?.supportedMetrics || [])
      .flatMap(item => semanticMetricSupport(capability, item.key) === 'supported' ? [item.key] : []),
  ]);
  const matched = unique(metrics.flatMap(metric => supportedMetrics.has(metric) ? [metric] : []));
  const unknown = unique(metrics.flatMap(metric => semanticMetricSupport(capability, metric) === 'unknown' ? [metric] : []));
  return {
    score: (matched.length * 10) + (unknown.length * 3),
    reasons: [
      ...matched.map(metric => `source_type:capability_manifest;source_key:supportedMetrics.${metric};matched_terms:${metric};score_delta:10`),
      ...unknown.map(metric => `source_type:capability_manifest;source_key:supportedMetrics.${metric};matched_terms:${metric};score_delta:3`),
    ],
  };
}

function supportsOutputDimension(capability: CapabilityManifest, dimension: string): boolean {
  return semanticOutputDimensions(capability).includes(dimension);
}

function outputDimensionKeys(requirement: UserRequirementContract): string[] {
  const filterKeys = new Set(requirement.dimensions.flatMap(item => item.role === 'filter' ? [item.key] : []));
  const roleDimensions = requirement.dimensions
    .flatMap(item => item.role === 'x_axis' || item.role === 'breakdown' ? [item.key] : []);
  return unique([
    ...roleDimensions,
    ...requirement.dataRequirement.requiredDimensions.flatMap(item => !filterKeys.has(item) ? [item] : []),
  ]);
}

function filterDimensionKeys(requirement: UserRequirementContract): string[] {
  return unique([
    ...requirement.dimensions.flatMap(item => item.role === 'filter' ? [item.key] : []),
    ...Object.keys(requirement.filters || {}),
    ...(requirement.entityHints || []).map(item => item.entityType),
  ]);
}

function hasFilterValue(requirement: UserRequirementContract, key: string): boolean {
  if (Array.isArray(requirement.filters?.[key]) && requirement.filters[key].length > 0) return true;
  return (requirement.entityHints || []).some(item => item.entityType === key && item.rawText.trim().length > 0);
}

function supportsFilter(capability: CapabilityManifest, key: string): boolean {
  if (semanticFilterDimensions(capability).includes(key)) return true;
  if (!isEntityType(key)) return false;
  if (key === 'terminal_os' && capability.supports.identifierTypes.includes('terminal_id')) return true;
  return capability.supports.identifierTypes.includes(identifierKeyForEntityType(key));
}

function buildDataCoverage(requirement: UserRequirementContract, capability: CapabilityManifest): CapabilityCoverageDetail {
  const requiredDimensions = outputDimensionKeys(requirement);
  const requiredFilters = filterDimensionKeys(requirement);
  const requiredMetrics = requirement.dataRequirement.requiredMetrics;
  const requiredGranularity = requirement.dataRequirement.requiredGranularity;
  const missing: string[] = [];
  const reasons: string[] = [];
  const unsupportedMetrics: string[] = [];
  const unsupportedDimensions: string[] = [];
  const unsupportedFilters: string[] = [];
  const missingMappings: string[] = [];
  const validationRequired: string[] = [];

  const dimensionHits = requiredDimensions.filter((dimension) => supportsOutputDimension(capability, dimension));
  const metricHits = requiredMetrics.filter((metric) => semanticMetricSupport(capability, metric) === 'supported');
  const metricUnknown = requiredMetrics.filter((metric) => semanticMetricSupport(capability, metric) === 'unknown');
  const filterHits = requiredFilters.filter((filter) => supportsFilter(capability, filter));
  const identifierHits = requirement.requiredIdentifiers.filter((identifier) => capability.supports.identifierTypes.includes(identifier));
  const granularityHit = semanticGranularities(capability).includes(requiredGranularity);

  for (const metric of requiredMetrics) {
    const support = semanticMetricSupport(capability, metric);
    if (support === 'unknown') validationRequired.push(`metric:${metric}`);
    if (support === 'unsupported') {
      missing.push(`metric:${metric}`);
      unsupportedMetrics.push(metric);
    }
  }
  for (const dimension of requiredDimensions) {
    if (!supportsOutputDimension(capability, dimension)) {
      missing.push(`output_dimension:${dimension}`);
      unsupportedDimensions.push(dimension);
      missingMappings.push(`output_dimension:${dimension}`);
    }
  }
  for (const filter of requiredFilters) {
    if (!hasFilterValue(requirement, filter)) {
      missing.push(`entity:${filter}`);
    } else if (!supportsFilter(capability, filter)) {
      missing.push(`filter:${filter}`);
      unsupportedFilters.push(filter);
      missingMappings.push(`filter:${filter}`);
    }
  }
  if (requirement.dateRange.type === 'unknown' && (requiredDimensions.includes('date') || requiredGranularity === 'day')) {
    missing.push('date_range');
  }
  if (!granularityHit) {
    missing.push(`granularity:${requiredGranularity}`);
    missingMappings.push(`granularity:${requiredGranularity}`);
  }

  if (dimensionHits.length) reasons.push(`dimensions:${dimensionHits.join(',')}`);
  if (metricHits.length) reasons.push(`metrics:${metricHits.join(',')}`);
  if (metricUnknown.length) reasons.push(`metrics_unknown:${metricUnknown.join(',')}`);
  if (filterHits.length) reasons.push(`filters:${filterHits.join(',')}`);
  for (const filter of filterHits) {
    if (filter === 'terminal_os' && !semanticFilterDimensions(capability).includes(filter) && !capability.supports.identifierTypes.includes(identifierKeyForEntityType(filter))) {
      reasons.push('source_type:fallback;source_key:legacy_filter_contract.terminal_os;matched_terms:terminal_os;score_delta:0');
    }
  }
  if (granularityHit) reasons.push(`granularity:${requiredGranularity}`);
  if (identifierHits.length) reasons.push(`identifiers:${identifierHits.join(',')}`);
  const metricAffinity = configDrivenMetricAffinity(capability, requiredMetrics);
  reasons.push(...metricAffinity.reasons);

  const score = (dimensionHits.length * 30)
    + (metricHits.length * 25)
    + (metricUnknown.length * 8)
    + (filterHits.length * 20)
    + (granularityHit ? 25 : 0)
    + (identifierHits.length * 10)
    + metricAffinity.score;
  const supportLevel: CapabilityCoverageDetail['supportLevel'] = missing.length === 0
    ? (validationRequired.length ? 'executable_with_validation' : 'full_match')
    : score > 0
      ? 'partial_match'
      : 'not_executable';
  return {
    covered: missing.length === 0,
    missing: unique(missing),
    reasons,
    score,
    supportLevel,
    unsupportedMetrics,
    unsupportedDimensions,
    unsupportedFilters,
    missingMappings: unique(missingMappings),
    validationRequired: unique(validationRequired),
  };
}

function buildPresentationCoverage(requirement: UserRequirementContract, capability: CapabilityManifest): PresentationCoverageDetail {
  const requestedView = requirement.requestedView;
  const viewHit = capability.supports.views.includes(requestedView);
  const fallbackView = capability.supports.views.find(view => PRESENTATION_BACKUP_VIEW_SET.has(view));
  return {
    covered: viewHit,
    missing: viewHit ? [] : [`view:${requestedView}`],
    reasons: viewHit ? [`view:${requestedView}`] : fallbackView ? [`fallback_view:${fallbackView}`] : [],
    requestedView,
    preferredView: requestedView,
    fallbackView: viewHit ? undefined : fallbackView,
    score: viewHit ? 10 : fallbackView ? 4 : 0,
  };
}

function buildCandidate(requirement: UserRequirementContract, capability: CapabilityManifest): CapabilitySelectionCandidate {
  const dataCoverage = buildDataCoverage(requirement, capability);
  const presentationCoverage = buildPresentationCoverage(requirement, capability);
  const score = (dataCoverage.score || 0)
    + (presentationCoverage.score || 0)
    + (dataCoverage.covered ? 120 : 0)
    + (presentationCoverage.covered ? 15 : 0);
  return {
    capability,
    score,
    reasons: [...dataCoverage.reasons, ...presentationCoverage.reasons],
    dataCoverage,
    presentationCoverage,
  };
}

function supportsRequirementServiceIntent(requirement: UserRequirementContract, capability: CapabilityManifest): boolean {
  if (!requirement.serviceIntent || requirement.serviceIntent === 'general_chat') return true;
  if (!capability.supportedServiceIntents?.length) return true;
  return capability.supportedServiceIntents.includes(requirement.serviceIntent);
}

function isCapabilityPurposeAllowedForIntent(requirement: UserRequirementContract, capability: CapabilityManifest): boolean {
  const policy = getServiceIntentExecutionPolicy(requirement.serviceIntent);
  const purpose = capability.capabilityPurpose || inferCapabilityPurpose({
    capabilityType: capability.capabilityType,
    toolPurpose: capability.toolPurpose,
  });
  if (policy.blockedPurposes.includes(purpose)) return false;
  if (policy.allowedPurposes.length > 0 && !policy.allowedPurposes.includes(purpose)) return false;
  return true;
}

function blockingReasonFor(requirement: UserRequirementContract, dataCoverage?: CapabilityCoverageDetail): CapabilityBlockingReason | undefined {
  const missing = dataCoverage?.missing || [];
  const hasMissing = (prefix: string) => missing.some(item => item === prefix || item.startsWith(`${prefix}:`));
  if (hasMissing('metric')) return 'metric_unresolved';
  if (hasMissing('date_range')) return 'date_range_unresolved';
  if (hasMissing('entity')) return 'entity_unresolved';
  if (missing.length > 0) return 'tool_data_capability_missing';
  return undefined;
}

function decideExecution(
  selected: CapabilityManifest | undefined,
  selectedCandidate: CapabilitySelectionCandidate | undefined,
  requirement: UserRequirementContract,
): CapabilityExecutionDecision {
  if (selected && selectedCandidate?.presentationCoverage?.covered) return 'executable';
  if (selected) return 'executable_with_presentation_fallback';
  const reason = blockingReasonFor(requirement, selectedCandidate?.dataCoverage);
  if (reason === 'metric_unresolved' || reason === 'date_range_unresolved' || reason === 'entity_unresolved') {
    return 'needs_clarification';
  }
  return 'no_executable_capability';
}

export function selectCapabilityForRequirement(
  requirement: UserRequirementContract,
  capabilities: CapabilityManifest[],
): {
  selected?: CapabilityManifest;
  candidates: CapabilitySelectionCandidate[];
  fallbackUsed: boolean;
  fallbackReason?: string;
  executionDecision: CapabilityExecutionDecision;
  dataCoverage: CapabilityCoverageDetail;
  presentationCoverage: PresentationCoverageDetail;
  blockingReason?: CapabilityBlockingReason;
  warnings: string[];
} {
  const candidates = capabilities
    .filter((capability) => supportsRequirementServiceIntent(requirement, capability))
    .filter((capability) => isCapabilityPurposeAllowedForIntent(requirement, capability))
    .map((capability) => buildCandidate(requirement, capability))
    .sort((a, b) => {
      if (a.dataCoverage?.covered !== b.dataCoverage?.covered) return a.dataCoverage?.covered ? -1 : 1;
      const aValidatable = a.dataCoverage?.supportLevel === 'executable_with_validation';
      const bValidatable = b.dataCoverage?.supportLevel === 'executable_with_validation';
      if (aValidatable !== bValidatable) return aValidatable ? 1 : -1;
      return b.score - a.score;
    });

  const selectedCandidate = candidates.find((item) => item.dataCoverage?.covered);
  const partialCandidate = !selectedCandidate
    ? candidates.find((item) =>
      (item.dataCoverage?.supportLevel === 'executable_with_validation'
      || item.dataCoverage?.supportLevel === 'partial_match')
      && !(item.dataCoverage?.missing || []).some(m => m.startsWith('metric:'))
    )
    : undefined;
  const selected = selectedCandidate?.capability || partialCandidate?.capability;
  const bestCandidate = selectedCandidate || partialCandidate || candidates[0];
  const dataCoverage = bestCandidate?.dataCoverage || { covered: false, missing: ['capability'], reasons: [] };
  const presentationCoverage = bestCandidate?.presentationCoverage || {
    covered: false,
    missing: [`view:${requirement.requestedView}`],
    reasons: [],
    requestedView: requirement.requestedView,
    preferredView: requirement.requestedView,
  };
  const executionDecision = decideExecution(selected, selectedCandidate, requirement);
  const blockingReason = selected ? undefined : blockingReasonFor(requirement, dataCoverage);

  const warnings: string[] = [];
  if (requirement.requiredIdentifiers.length > 0) {
    const satisfied = requirement.requiredIdentifiers.every((identifier) =>
      capabilities.some((capability) => capability.supports.identifierTypes.includes(identifier)),
    );
    if (!satisfied) warnings.push(`当前缺少可处理所需标识的能力：${requirement.requiredIdentifiers.join('、')}。`);
  }
  if (executionDecision === 'executable_with_presentation_fallback') {
    warnings.push('数据能力已匹配，展示方式已降级为当前可用组件。');
  }
  if (!selected && candidates[0]) warnings.push('当前没有找到可执行的数据查询能力，需要补齐能力或查询条件。');
  if (partialCandidate && !selectedCandidate) {
    warnings.push('未找到完全匹配的能力，已选择最佳部分匹配工具尝试执行。');
  }

  return {
    selected,
    candidates: candidates.map(({ capability, score, reasons, dataCoverage, presentationCoverage }) => ({
      capability,
      score,
      reasons,
      dataCoverage,
      presentationCoverage,
    })),
    fallbackUsed: !selectedCandidate && candidates.length > 0,
    fallbackReason: selectedCandidate ? undefined : partialCandidate ? 'partial_match_selected' : candidates[0] ? 'no_full_coverage' : 'no_capability',
    executionDecision,
    dataCoverage,
    presentationCoverage,
    blockingReason,
    warnings,
  };
}

export function discoverCapabilityCandidatesForMessage(
  message: string,
  capabilities: CapabilityManifest[],
): CapabilitySelectionCandidate[] {
  const normalizedMessage = normalizeText(message);
  if (!normalizedMessage) return [];

  // Extract domain signals from message using the canonical signal terms
  const metricHits = matchDomainSignalTerms(message, ADVERTISING_REQUEST_SIGNALS.metrics);
  const dimensionHits = matchDomainSignalTerms(message, ADVERTISING_REQUEST_SIGNALS.dimensions);
  const reportActionHits = matchDomainSignalTerms(message, ADVERTISING_REQUEST_SIGNALS.reportActions);
  const metricKeys = new Set(metricHits.map(hit => hit.key));
  const dimensionKeys = new Set(dimensionHits.map(hit => hit.key));

  return capabilities
    .map((capability): CapabilitySelectionCandidate | null => {
      // Stage 1: keyword trigger terms (existing logic)
      const matchedTerms = capabilityTriggerTerms(capability)
        .filter(term => normalizedMessage.includes(term));
      const triggerScore = matchedTerms.length * 25;

      // Stage 2: structured semantic surface matching
      // Check if the capability's semanticSurface covers the metrics/dimensions
      // detected in the message via domain signals
      const semantic = capability.semanticSurface;
      let semanticScore = 0;
      const semanticReasons: string[] = [];

      if (semantic && (metricKeys.size > 0 || dimensionKeys.size > 0)) {
        // Metric coverage: does this tool support the metrics the user is asking about?
        // Only count 'supported' level — 'unknown' is inferred from server context
        // and too noisy (e.g. get_current_time would match every metric).
        const supportedMetricKeys = new Set(
          (semantic.supportedMetrics || [])
            .filter(m => m.supportLevel === 'supported')
            .map(m => m.key),
        );
        // Also include the flat supports.metrics list as strong evidence
        for (const mk of (capability.supports?.metrics || [])) {
          supportedMetricKeys.add(mk);
        }

        const matchedMetricKeys: string[] = [];
        for (const mk of metricKeys) {
          if (supportedMetricKeys.has(mk)) {
            matchedMetricKeys.push(mk);
          }
        }
        if (matchedMetricKeys.length > 0) {
          semanticScore += matchedMetricKeys.length * 35;
          semanticReasons.push(`metric_match:${matchedMetricKeys.join(',')}`);
        }

        // Dimension coverage: does this tool support the dimensions the user needs?
        const supportedDimKeys = new Set([
          ...(semantic.supportedOutputDimensions || [])
            .filter(d => d.supportLevel !== 'unsupported')
            .map(d => d.key),
          ...(semantic.supportedFilterDimensions || [])
            .filter(d => d.supportLevel !== 'unsupported')
            .map(d => d.key),
          ...(capability.supports?.dimensions || []),
        ]);

        const matchedDimKeys: string[] = [];
        for (const dk of dimensionKeys) {
          if (supportedDimKeys.has(dk)) {
            matchedDimKeys.push(dk);
          }
        }
        if (matchedDimKeys.length > 0) {
          semanticScore += matchedDimKeys.length * 20;
          semanticReasons.push(`dimension_match:${matchedDimKeys.join(',')}`);
        }
      }

      // Combine: trigger terms OR semantic match can qualify the candidate
      if (!matchedTerms.length && semanticScore === 0) return null;

      const serviceIntentBoost = capability.supportedServiceIntents?.includes('report_delivery') ? 40 : 0;
      const reportCapabilityBoost = capability.capabilityType === 'data.report' ? 30 : 0;
      const totalScore = triggerScore + semanticScore + serviceIntentBoost + reportCapabilityBoost;

      return {
        capability,
        score: totalScore,
        reasons: [
          matchedTerms.length ? `capability_trigger:${matchedTerms.join(',')}` : '',
          ...semanticReasons,
          capability.supportedServiceIntents?.length ? `service_intents:${capability.supportedServiceIntents.join(',')}` : '',
          capability.primaryGoal ? `primary_goal:${capability.primaryGoal}` : '',
        ].filter(Boolean),
      };
    })
    .filter((candidate): candidate is CapabilitySelectionCandidate => Boolean(candidate))
    .sort((a, b) => b.score - a.score);
}

export function findNormalizationCapabilityForEntity(
  entityType: EntityType,
  capabilities: CapabilityManifest[],
): CapabilityManifest | undefined {
  const identifierKey = identifierKeyForEntityType(entityType);
  return capabilities.find((capability) => capability.supports.identifierTypes.includes(identifierKey));
}
