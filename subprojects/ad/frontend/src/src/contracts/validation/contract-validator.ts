export type ValidationLevel = 'error' | 'warning' | 'info';

export interface ContractValidationIssue {
  level: ValidationLevel;
  code: string;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}

export interface ContractValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  errors: ContractValidationIssue[];
  warnings: ContractValidationIssue[];
  infos: ContractValidationIssue[];
}

export interface ContractValidationOptions {
  strict?: boolean;
  allowWarnings?: boolean;
  requireEvidenceForInsights?: boolean;
  requireSourceForDataViews?: boolean;
  now?: string;
}

export function createValidationResult<T>(value?: T): ContractValidationResult<T> {
  return {
    valid: true,
    value,
    errors: [],
    warnings: [],
    infos: [],
  };
}

export function addIssue<T>(
  result: ContractValidationResult<T>,
  issue: ContractValidationIssue,
): ContractValidationResult<T> {
  if (issue.level === 'error') {
    result.errors.push(issue);
    result.valid = false;
  } else if (issue.level === 'warning') {
    result.warnings.push(issue);
  } else {
    result.infos.push(issue);
  }
  return result;
}

export function mergeValidationResults<T>(
  target: ContractValidationResult<T>,
  child: ContractValidationResult<unknown>,
): ContractValidationResult<T> {
  for (const issue of child.errors) addIssue(target, issue);
  for (const issue of child.warnings) addIssue(target, issue);
  for (const issue of child.infos) addIssue(target, issue);
  return target;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function requireString<T>(
  result: ContractValidationResult<T>,
  obj: Record<string, unknown>,
  key: string,
  path: string,
): void {
  if (!isNonEmptyString(obj[key])) {
    addIssue(result, {
      level: 'error',
      code: 'required_string_missing',
      message: `Required string field is missing: ${key}`,
      path: `${path}.${key}`,
    });
  }
}

export function requireArray<T>(
  result: ContractValidationResult<T>,
  obj: Record<string, unknown>,
  key: string,
  path: string,
  options?: { nonEmpty?: boolean },
): void {
  if (!Array.isArray(obj[key])) {
    addIssue(result, {
      level: 'error',
      code: 'required_array_missing',
      message: `Required array field is missing: ${key}`,
      path: `${path}.${key}`,
    });
    return;
  }
  if (options?.nonEmpty && (obj[key] as unknown[]).length === 0) {
    addIssue(result, {
      level: 'error',
      code: 'required_array_empty',
      message: `Required array field must not be empty: ${key}`,
      path: `${path}.${key}`,
    });
  }
}

export function enumSet<T extends string>(values: readonly T[]): ReadonlySet<string> {
  return new Set(values);
}

export function requireEnum<T>(
  result: ContractValidationResult<T>,
  value: unknown,
  allowed: ReadonlySet<string>,
  path: string,
  fieldName = 'value',
): void {
  if (typeof value !== 'string' || !allowed.has(value)) {
    addIssue(result, {
      level: 'error',
      code: 'invalid_enum_value',
      message: `Invalid ${fieldName}: ${String(value)}`,
      path,
    });
  }
}
