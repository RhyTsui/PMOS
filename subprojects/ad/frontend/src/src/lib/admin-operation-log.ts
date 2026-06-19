import type { AdminRequestContext } from './admin-request-context';
import { appendOperationLog, type OperationLogRecord } from './admin-operation-log-store';

function nowIso(): string {
  return new Date().toISOString();
}

function isSensitiveField(field: string): boolean {
  return /(token|secret|password|api[_-]?key|authorization|workspaceId|apiToken|apiKey)/i.test(field);
}

function formatValue(value: unknown, field?: string): string {
  if (field && isSensitiveField(field)) {
    if (value === undefined || value === null || value === '') return 'unset';
    return 'set';
  }
  if (value === undefined || value === null || value === '') return 'empty';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  try {
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  } catch {
    return String(value);
  }
}

export function describeFieldChange(field: string, before: unknown, after: unknown): string {
  return `${field}: ${formatValue(before, field)} -> ${formatValue(after, field)}`;
}

export function describeFieldChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
  fields: string[],
): string[] {
  return fields
    .filter((field) => (before?.[field] !== after[field]))
    .map((field) => describeFieldChange(field, before?.[field], after[field]));
}

export function toOperationLogActor(user: AdminRequestContext['user']): OperationLogRecord['actor'] {
  return {
    uid: user.uid,
    account: user.account,
    user_name: user.user_name,
    real_name: user.real_name,
  };
}

export async function logAdminOperation(input: {
  context: AdminRequestContext;
  module: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  summary: string;
  status?: OperationLogRecord['status'];
  changes?: string[];
  detail?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await appendOperationLog({
    created_at: nowIso(),
    module: input.module,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    target_name: input.targetName,
    summary: input.summary,
    status: input.status || 'success',
    actor: toOperationLogActor(input.context.user),
    changes: input.changes,
    detail: input.detail,
    metadata: input.metadata,
  });
}
