import type {
  RequirementDimensionRole,
  RequestTask,
  UserRequirementContract,
} from '@/contracts/request-understanding/user-requirement-contract';

export type RequirementWeakSignalSource = 'request_understanding' | 'multi_turn_state';

export interface RequirementWeakSignal {
  metrics?: unknown;
  dimensions?: unknown;
  dateRange?: unknown;
  task?: unknown;
  entities?: unknown;
}

export interface RequirementWeakSignalMergeItem {
  field: string;
  source: RequirementWeakSignalSource;
  reason: string;
}

export interface RequirementWeakSignalMergeAudit {
  applied: RequirementWeakSignalMergeItem[];
  rejected: RequirementWeakSignalMergeItem[];
}

const VALID_TASKS = new Set<RequestTask>([
  'report_query',
  'help',
  'diagnosis',
  'debugging',
  'demand',
  'forecast',
  'general',
]);

const VALID_DIMENSION_ROLES = new Set<RequirementDimensionRole>([
  'breakdown',
  'x_axis',
  'filter',
  'focus',
]);

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean)));
}

function normalizeDateRange(value: unknown): UserRequirementContract['dateRange'] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const type = record.type;
  if (type !== 'relative' && type !== 'absolute') return null;
  const directValue = typeof record.value === 'string' ? record.value.trim() : '';
  if (directValue) return { type, value: directValue };
  const start = typeof record.start === 'string' ? record.start.trim() : '';
  const end = typeof record.end === 'string' ? record.end.trim() : '';
  const rangeValue = [start, end].filter(Boolean).join('~');
  return rangeValue ? { type, value: rangeValue } : null;
}

function normalizeDimensions(value: unknown): UserRequirementContract['dimensions'] {
  if (!Array.isArray(value)) return [];
  const output: UserRequirementContract['dimensions'] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item === 'string') {
      const key = item.trim();
      if (key && !seen.has(key)) {
        output.push({ key, role: 'breakdown' });
        seen.add(key);
      }
      continue;
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const key = typeof record.key === 'string' ? record.key.trim() : '';
    const role = typeof record.role === 'string' && VALID_DIMENSION_ROLES.has(record.role as RequirementDimensionRole)
      ? record.role as RequirementDimensionRole
      : 'breakdown';
    if (key && !seen.has(key)) {
      output.push({ key, role });
      seen.add(key);
    }
  }
  return output;
}

function reject(audit: RequirementWeakSignalMergeAudit, source: RequirementWeakSignalSource, field: string, reason: string): void {
  audit.rejected.push({ field, source, reason });
}

function apply(audit: RequirementWeakSignalMergeAudit, source: RequirementWeakSignalSource, field: string, reason: string): void {
  audit.applied.push({ field, source, reason });
}

export function mergeRequirementWeakSignal(
  requirement: UserRequirementContract,
  signal: RequirementWeakSignal | null | undefined,
  source: RequirementWeakSignalSource,
): RequirementWeakSignalMergeAudit {
  const audit: RequirementWeakSignalMergeAudit = { applied: [], rejected: [] };
  if (!signal || typeof signal !== 'object') return audit;

  if (signal.metrics !== undefined) {
    const metrics = stringArray(signal.metrics);
    if (!metrics.length) {
      reject(audit, source, 'metrics', 'invalid_shape');
    } else if (requirement.metrics.length) {
      reject(audit, source, 'metrics', 'target_already_explicit');
    } else {
      requirement.metrics = metrics;
      if (!requirement.dataRequirement.requiredMetrics.length) {
        requirement.dataRequirement.requiredMetrics = metrics;
      }
      apply(audit, source, 'metrics', 'filled_empty_slot');
    }
  }

  if (signal.dimensions !== undefined) {
    const dimensions = normalizeDimensions(signal.dimensions);
    if (!dimensions.length) {
      reject(audit, source, 'dimensions', 'invalid_shape');
    } else if (requirement.dimensions.length) {
      reject(audit, source, 'dimensions', 'target_already_explicit');
    } else {
      requirement.dimensions = dimensions;
      if (!requirement.dataRequirement.requiredDimensions.length) {
        requirement.dataRequirement.requiredDimensions = dimensions.map(item => item.key);
      }
      apply(audit, source, 'dimensions', 'filled_empty_slot');
    }
  }

  if (signal.dateRange !== undefined) {
    const dateRange = normalizeDateRange(signal.dateRange);
    if (!dateRange) {
      reject(audit, source, 'dateRange', 'invalid_shape');
    } else if (requirement.dateRange.type !== 'unknown') {
      reject(audit, source, 'dateRange', 'target_already_explicit');
    } else {
      requirement.dateRange = dateRange;
      apply(audit, source, 'dateRange', 'filled_empty_slot');
    }
  }

  if (signal.task !== undefined) {
    if (typeof signal.task !== 'string' || !VALID_TASKS.has(signal.task as RequestTask)) {
      reject(audit, source, 'task', 'invalid_shape');
    } else if (requirement.task !== 'general') {
      reject(audit, source, 'task', 'target_already_explicit');
    } else {
      requirement.task = signal.task as RequestTask;
      requirement.taskAuthority = source === 'multi_turn_state' ? 'inherited' : 'heuristic_candidate';
      requirement.taskSource = source;
      requirement.taskConfidence = source === 'multi_turn_state' ? 'medium' : 'low';
      apply(audit, source, 'task', 'filled_empty_slot');
    }
  }

  if (signal.entities !== undefined) {
    reject(audit, source, 'entities', 'unsupported_field');
  }

  return audit;
}
