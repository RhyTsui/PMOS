import type { ActionContract } from '../semantic/action-contract';
import {
  addIssue,
  createValidationResult,
  enumSet,
  isRecord,
  requireEnum,
  requireString,
  type ContractValidationOptions,
  type ContractValidationResult,
} from './contract-validator';

const ACTION_TYPES = enumSet([
  'navigate',
  'open-url',
  'open-source',
  'open-evidence',
  'open-artifact',
  'query',
  'drill-down',
  'filter',
  'sort',
  'export',
  'copy',
  'share',
  'continue-analysis',
  'regenerate',
  'retry',
  'run-workflow',
  'approve',
  'reject',
  'request-access',
  'create-task',
  'submit-feedback',
  'dismiss',
  'custom',
] as const);

const ACTION_INTENTS = enumSet([
  'primary',
  'secondary',
  'tertiary',
  'destructive',
  'risky',
  'system',
  'background',
] as const);

const HIGH_RISK_TYPES = new Set(['approve', 'reject', 'run-workflow', 'export']);

export function isActionContract(value: unknown): value is ActionContract {
  return validateActionContract(value).valid;
}

export function validateActionContract(
  value: unknown,
  options: ContractValidationOptions = {},
  path = '$',
): ContractValidationResult<ActionContract> {
  const result = createValidationResult<ActionContract>(value as ActionContract);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'action_not_object',
      message: 'ActionContract must be an object.',
      path,
    });
  }

  requireString(result, value, 'id', path);
  requireString(result, value, 'label', path);
  requireEnum(result, value.type, ACTION_TYPES, `${path}.type`, 'ActionType');
  requireEnum(result, value.intent, ACTION_INTENTS, `${path}.intent`, 'ActionIntent');

  const actionType = typeof value.type === 'string' ? value.type : undefined;
  const actionIntent = typeof value.intent === 'string' ? value.intent : undefined;
  const confirm = value.confirm;
  const audit = value.audit;

  if ((HIGH_RISK_TYPES.has(actionType ?? '') || actionIntent === 'destructive' || actionIntent === 'risky') && isRecord(confirm)) {
    if (confirm.required !== true) {
      addIssue(result, {
        level: options.strict ? 'error' : 'warning',
        code: 'high_risk_action_confirm_not_required',
        message: 'High-risk actions should require confirmation.',
        path: `${path}.confirm.required`,
      });
    }
  }

  if ((HIGH_RISK_TYPES.has(actionType ?? '') || actionIntent === 'destructive' || actionIntent === 'risky') && !isRecord(confirm)) {
    addIssue(result, {
      level: options.strict ? 'error' : 'warning',
      code: 'high_risk_action_missing_confirm',
      message: 'High-risk actions should define ActionConfirm.',
      path: `${path}.confirm`,
    });
  }

  if ((HIGH_RISK_TYPES.has(actionType ?? '') || actionIntent === 'destructive' || actionIntent === 'risky') && (!isRecord(audit) || audit.required !== true)) {
    addIssue(result, {
      level: options.strict ? 'error' : 'warning',
      code: 'high_risk_action_missing_audit',
      message: 'High-risk actions should define audit.required = true.',
      path: `${path}.audit.required`,
    });
  }

  if (value.target !== undefined && !isRecord(value.target)) {
    addIssue(result, {
      level: 'error',
      code: 'action_target_invalid',
      message: 'ActionContract.target must be an object when provided.',
      path: `${path}.target`,
    });
  }

  return result;
}
