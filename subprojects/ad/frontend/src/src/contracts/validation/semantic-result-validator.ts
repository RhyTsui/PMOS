import type { SemanticResultContract, SemanticRegion } from '../semantic/semantic-result-contract';
import {
  addIssue,
  createValidationResult,
  enumSet,
  isRecord,
  mergeValidationResults,
  requireArray,
  requireEnum,
  requireString,
  type ContractValidationOptions,
  type ContractValidationResult,
} from './contract-validator';
import { validateActionContract } from './action-validator';
import { validateEvidenceRef, validateSourceRef } from './evidence-source-validator';
import { validateRendererData } from './renderer-data-validator';

const SCREEN_TYPES = enumSet([
  'conversation-answer',
  'analysis-result',
  'report-result',
  'dashboard-result',
  'metric-explainer',
  'decision-review',
  'workflow-result',
  'asset-viewer',
  'error-result',
  'empty-result',
  'permission-blocked',
] as const);

const REGION_TYPES = enumSet([
  'summary',
  'primary-result',
  'supporting-detail',
  'insight',
  'metric',
  'data-view',
  'evidence',
  'source',
  'action-bar',
  'runtime',
  'workflow',
  'asset',
  'form',
  'warning',
  'error',
  'metadata',
] as const);

const COMPONENT_BINDINGS = enumSet([
  'markdown-result',
  'data-visualization',
  'ai-runtime',
  'workflow-trace',
  'asset-reference',
  'decision-card',
  'evidence-panel',
  'source-list',
  'action-bar',
  'disclosure-panel',
  'form-input',
  'feedback-panel',
  'permission-gate',
  'empty-state',
  'error-state',
] as const);

export function isSemanticResultContract(value: unknown): value is SemanticResultContract {
  return validateSemanticResultContract(value).valid;
}

export function validateSemanticResultContract(
  value: unknown,
  options: ContractValidationOptions = { requireEvidenceForInsights: true, requireSourceForDataViews: true },
  path = '$',
): ContractValidationResult<SemanticResultContract> {
  const result = createValidationResult<SemanticResultContract>(value as SemanticResultContract);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'semantic_result_not_object',
      message: 'SemanticResultContract must be an object.',
      path,
    });
  }

  if (value.contractType !== 'semantic-result') {
    addIssue(result, {
      level: 'error',
      code: 'semantic_contract_type_invalid',
      message: 'SemanticResultContract.contractType must be "semantic-result".',
      path: `${path}.contractType`,
    });
  }

  requireString(result, value, 'version', path);
  requireString(result, value, 'resultId', path);
  requireString(result, value, 'createdAt', path);
  requireEnum(result, value.screenType, SCREEN_TYPES, `${path}.screenType`, 'ScreenType');
  requireArray(result, value, 'regions', path, { nonEmpty: true });

  const evidenceIds = new Set<string>();
  const sourceIds = new Set<string>();
  const actionIds = new Set<string>();

  if (Array.isArray(value.evidenceRefs)) {
    value.evidenceRefs.forEach((evidence, index) => {
      if (isRecord(evidence) && typeof evidence.id === 'string') evidenceIds.add(evidence.id);
      mergeValidationResults(result, validateEvidenceRef(evidence, `${path}.evidenceRefs[${index}]`));
    });
  }

  if (Array.isArray(value.sourceRefs)) {
    value.sourceRefs.forEach((source, index) => {
      if (isRecord(source) && typeof source.id === 'string') sourceIds.add(source.id);
      mergeValidationResults(result, validateSourceRef(source, `${path}.sourceRefs[${index}]`));
    });
  }

  if (Array.isArray(value.actions)) {
    value.actions.forEach((action, index) => {
      if (isRecord(action) && typeof action.id === 'string') actionIds.add(action.id);
      mergeValidationResults(result, validateActionContract(action, options, `${path}.actions[${index}]`));
      validateActionReferences(result, action, evidenceIds, sourceIds, `${path}.actions[${index}]`);
    });
  }

  if (Array.isArray(value.regions)) {
    const regionIds = new Set<string>();
    value.regions.forEach((region, index) => {
      const regionPath = `${path}.regions[${index}]`;
      if (isRecord(region) && typeof region.id === 'string') {
        if (regionIds.has(region.id)) {
          addIssue(result, {
            level: 'error',
            code: 'duplicate_region_id',
            message: `Duplicate region id: ${region.id}`,
            path: `${regionPath}.id`,
          });
        }
        regionIds.add(region.id);
      }
      validateRegion(result, region, evidenceIds, sourceIds, actionIds, options, regionPath);
    });
  }

  return result;
}

function validateRegion(
  result: ContractValidationResult<SemanticResultContract>,
  region: unknown,
  evidenceIds: Set<string>,
  sourceIds: Set<string>,
  _rootActionIds: Set<string>,
  options: ContractValidationOptions,
  path: string,
): void {
  if (!isRecord(region)) {
    addIssue(result, {
      level: 'error',
      code: 'region_not_object',
      message: 'SemanticRegion must be an object.',
      path,
    });
    return;
  }

  requireString(result, region, 'id', path);
  requireEnum(result, region.type, REGION_TYPES, `${path}.type`, 'RegionType');
  requireEnum(result, region.componentBinding, COMPONENT_BINDINGS, `${path}.componentBinding`, 'ComponentBinding');

  if (!('data' in region)) {
    addIssue(result, {
      level: 'error',
      code: 'region_data_missing',
      message: 'SemanticRegion.data is required.',
      path: `${path}.data`,
    });
  }

  validateStringRefs(result, region.evidenceRefs, evidenceIds, `${path}.evidenceRefs`, 'evidence_ref_not_found');
  validateStringRefs(result, region.sourceRefs, sourceIds, `${path}.sourceRefs`, 'source_ref_not_found');

  if (Array.isArray(region.actions)) {
    region.actions.forEach((action, index) => {
      mergeValidationResults(result, validateActionContract(action, options, `${path}.actions[${index}]`));
      validateActionReferences(result, action, evidenceIds, sourceIds, `${path}.actions[${index}]`);
    });
  }

  const type = typeof region.type === 'string' ? region.type : undefined;
  const binding = typeof region.componentBinding === 'string' ? region.componentBinding : undefined;
  const evidenceCount = Array.isArray(region.evidenceRefs) ? region.evidenceRefs.length : 0;
  const sourceCount = Array.isArray(region.sourceRefs) ? region.sourceRefs.length : 0;

  if (options.requireEvidenceForInsights !== false && (type === 'insight' || type === 'warning' || binding === 'decision-card')) {
    if (evidenceCount === 0 && sourceCount === 0) {
      addIssue(result, {
        level: 'warning',
        code: 'trust_region_missing_evidence_or_source',
        message: 'Insight/warning/decision regions should reference evidenceRefs or sourceRefs.',
        path,
      });
    }
  }

  if (options.requireSourceForDataViews !== false && binding === 'data-visualization' && sourceCount === 0) {
    addIssue(result, {
      level: 'warning',
      code: 'data_visualization_missing_source',
      message: 'Data visualization region should reference sourceRefs.',
      path: `${path}.sourceRefs`,
    });
  }

  mergeValidationResults(
    result,
    validateRendererData(binding ?? 'unknown', region.data, region as unknown as SemanticRegion, `${path}.data`),
  );
}

function validateStringRefs(
  result: ContractValidationResult<SemanticResultContract>,
  refs: unknown,
  allowedIds: Set<string>,
  path: string,
  code: string,
): void {
  if (refs === undefined) return;
  if (!Array.isArray(refs)) {
    addIssue(result, {
      level: 'error',
      code: 'refs_not_array',
      message: 'Reference field must be an array of ids.',
      path,
    });
    return;
  }
  refs.forEach((ref, index) => {
    if (typeof ref !== 'string') {
      addIssue(result, {
        level: 'error',
        code: 'ref_not_string',
        message: 'Reference id must be a string.',
        path: `${path}[${index}]`,
      });
      return;
    }
    if (allowedIds.size > 0 && !allowedIds.has(ref)) {
      addIssue(result, {
        level: 'warning',
        code,
        message: `Reference id was not found in top-level refs: ${ref}`,
        path: `${path}[${index}]`,
      });
    }
  });
}

function validateActionReferences(
  result: ContractValidationResult<SemanticResultContract>,
  action: unknown,
  evidenceIds: Set<string>,
  sourceIds: Set<string>,
  path: string,
): void {
  if (!isRecord(action)) return;
  validateStringRefs(result, action.evidenceRefs, evidenceIds, `${path}.evidenceRefs`, 'action_evidence_ref_not_found');
  validateStringRefs(result, action.sourceRefs, sourceIds, `${path}.sourceRefs`, 'action_source_ref_not_found');
}
