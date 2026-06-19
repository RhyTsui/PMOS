import type { EvidenceRef } from '../semantic/evidence-contract';
import type { SourceRef } from '../semantic/source-contract';
import {
  addIssue,
  createValidationResult,
  enumSet,
  isRecord,
  requireEnum,
  requireString,
  type ContractValidationResult,
} from './contract-validator';

const EVIDENCE_TYPES = enumSet([
  'metric-value',
  'data-row',
  'data-snapshot',
  'query-result',
  'calculation',
  'chart-observation',
  'document-excerpt',
  'tool-output',
  'runtime-trace',
  'human-approval',
  'model-output',
  'experiment-result',
  'external-reference',
  'policy-rule',
  'unknown',
] as const);

const SOURCE_TYPES = enumSet([
  'warehouse-table',
  'warehouse-query',
  'api',
  'file',
  'document',
  'url',
  'email',
  'spreadsheet',
  'chart',
  'report',
  'artifact',
  'tool',
  'runtime',
  'human',
  'model',
  'system',
  'policy',
  'unknown',
] as const);

export function validateEvidenceRef(value: unknown, path = '$'): ContractValidationResult<EvidenceRef> {
  const result = createValidationResult<EvidenceRef>(value as EvidenceRef);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'evidence_not_object',
      message: 'EvidenceRef must be an object.',
      path,
    });
  }

  requireString(result, value, 'id', path);
  requireString(result, value, 'title', path);
  requireEnum(result, value.type, EVIDENCE_TYPES, `${path}.type`, 'EvidenceType');

  if (value.confidence !== undefined && !isRecord(value.confidence)) {
    addIssue(result, {
      level: 'warning',
      code: 'evidence_confidence_invalid',
      message: 'EvidenceRef.confidence should be an object when provided.',
      path: `${path}.confidence`,
    });
  }

  if (value.freshness !== undefined && !isRecord(value.freshness)) {
    addIssue(result, {
      level: 'warning',
      code: 'evidence_freshness_invalid',
      message: 'EvidenceRef.freshness should be an object when provided.',
      path: `${path}.freshness`,
    });
  }

  return result;
}

export function validateSourceRef(value: unknown, path = '$'): ContractValidationResult<SourceRef> {
  const result = createValidationResult<SourceRef>(value as SourceRef);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'source_not_object',
      message: 'SourceRef must be an object.',
      path,
    });
  }

  requireString(result, value, 'id', path);
  requireString(result, value, 'title', path);
  requireEnum(result, value.type, SOURCE_TYPES, `${path}.type`, 'SourceType');

  if (value.locator !== undefined && !isRecord(value.locator)) {
    addIssue(result, {
      level: 'warning',
      code: 'source_locator_invalid',
      message: 'SourceRef.locator should be an object when provided.',
      path: `${path}.locator`,
    });
  }

  return result;
}
