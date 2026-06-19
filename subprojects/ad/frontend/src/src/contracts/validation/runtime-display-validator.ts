import type { RuntimeDisplayProtocol } from '../runtime/runtime-display-protocol';
import {
  addIssue,
  createValidationResult,
  enumSet,
  isRecord,
  requireArray,
  requireEnum,
  requireString,
  type ContractValidationOptions,
  type ContractValidationResult,
} from './contract-validator';

const RUNTIME_STATUS = enumSet([
  'idle',
  'queued',
  'planning',
  'running',
  'streaming',
  'waiting-for-user',
  'waiting-for-approval',
  'retrying',
  'recovering',
  'succeeded',
  'partially-succeeded',
  'failed',
  'cancelled',
  'expired',
] as const);

export function isRuntimeDisplayProtocol(value: unknown): value is RuntimeDisplayProtocol {
  return validateRuntimeDisplayProtocol(value).valid;
}

export function validateRuntimeDisplayProtocol(
  value: unknown,
  _options: ContractValidationOptions = {},
  path = '$',
): ContractValidationResult<RuntimeDisplayProtocol> {
  const result = createValidationResult<RuntimeDisplayProtocol>(value as RuntimeDisplayProtocol);

  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'runtime_not_object',
      message: 'RuntimeDisplayProtocol must be an object.',
      path,
    });
  }

  if (value.contractType !== 'runtime-display') {
    addIssue(result, {
      level: 'error',
      code: 'runtime_contract_type_invalid',
      message: 'RuntimeDisplayProtocol.contractType must be "runtime-display".',
      path: `${path}.contractType`,
    });
  }

  requireString(result, value, 'version', path);
  requireString(result, value, 'runtimeId', path);
  requireEnum(result, value.status, RUNTIME_STATUS, `${path}.status`, 'RuntimeStatus');
  requireArray(result, value, 'events', path);

  if (Array.isArray(value.events)) {
    value.events.forEach((event, index) => {
      const eventPath = `${path}.events[${index}]`;
      if (!isRecord(event)) {
        addIssue(result, {
          level: 'error',
          code: 'runtime_event_not_object',
          message: 'RuntimeEvent must be an object.',
          path: eventPath,
        });
        return;
      }
      requireString(result, event, 'id', eventPath);
      requireString(result, event, 'runtimeId', eventPath);
      requireString(result, event, 'type', eventPath);
      requireString(result, event, 'timestamp', eventPath);
      requireEnum(result, event.status, RUNTIME_STATUS, `${eventPath}.status`, 'RuntimeStatus');

      if (event.runtimeId !== value.runtimeId) {
        addIssue(result, {
          level: 'warning',
          code: 'runtime_event_id_mismatch',
          message: 'RuntimeEvent.runtimeId should match RuntimeDisplayProtocol.runtimeId.',
          path: `${eventPath}.runtimeId`,
        });
      }
    });
  }

  if (value.status === 'failed' && (!Array.isArray(value.errors) || value.errors.length === 0)) {
    addIssue(result, {
      level: 'warning',
      code: 'failed_runtime_missing_errors',
      message: 'Failed runtime should include errors[].',
      path: `${path}.errors`,
    });
  }

  return result;
}
