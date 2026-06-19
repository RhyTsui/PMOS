export type StandardRoleId = 'designer' | 'optimizer' | 'observer';

export interface ZhitouRoleMappingResult {
  externalRoleId?: string;
  externalRoleName?: string;
  mappedRoleId?: StandardRoleId;
  hasExternalRole: boolean;
  reason: string;
}

export const STANDARD_ROLE_IDS: StandardRoleId[] = ['designer', 'optimizer', 'observer'];
export const DEFAULT_NEW_USER_ROLE_ID: StandardRoleId = 'optimizer';
export const EXISTING_USER_MIGRATION_ROLE_ID: StandardRoleId = 'optimizer';

const LEGACY_ROLE_ID_MAP: Record<string, StandardRoleId> = {
  'project-operation': 'optimizer',
  'delivery-ops': 'optimizer',
  'finance-review': 'optimizer',
  'anomaly-review': 'optimizer',
};

const DESIGNER_ROLE_NAMES = new Set(['设计师', '设计师主管', '素材分析']);
const OPTIMIZER_ROLE_NAMES = new Set(['投放', '投放主管']);
const OBSERVER_ROLE_NAMES = new Set(['观察员']);

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

function readString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function readObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function firstStringFromKeys(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const direct = readString(source[key]);
    if (direct) return direct;
  }
  return undefined;
}

function firstRoleObject(source: Record<string, unknown>): Record<string, unknown> | undefined {
  const objectKeys = ['role', 'currentRole', 'current_role', 'userRole', 'user_role', 'jobRole', 'job_role'];
  for (const key of objectKeys) {
    const objectValue = readObject(source[key]);
    if (objectValue) return objectValue;
  }

  for (const key of ['roles', 'roleList', 'role_list']) {
    const value = source[key];
    if (Array.isArray(value)) {
      const objectItem = value.map(readObject).find(Boolean);
      if (objectItem) return objectItem;
    }
  }
  return undefined;
}

function firstRoleString(source: Record<string, unknown>): string | undefined {
  const direct = firstStringFromKeys(source, [
    'roleName',
    'role_name',
    'currentRoleName',
    'current_role_name',
    'currentRole',
    'current_role',
    'jobRoleName',
    'job_role_name',
    'jobRole',
    'job_role',
    'position',
    'positionName',
    'position_name',
  ]);
  if (direct && !isStandardRoleId(direct)) return direct;

  for (const key of ['roleNames', 'role_names', 'roles', 'roleList', 'role_list']) {
    const value = source[key];
    if (!Array.isArray(value)) continue;
    const text = value.map(readString).find((item) => Boolean(item) && !/^\d+$/.test(String(item)));
    if (text) return text;
  }

  const roleObject = firstRoleObject(source);
  return roleObject
    ? firstStringFromKeys(roleObject, ['name', 'roleName', 'role_name', 'label', 'title'])
    : undefined;
}

function firstRoleId(source: Record<string, unknown>): string | undefined {
  const direct = firstStringFromKeys(source, [
    'roleId',
    'role_id',
    'currentRoleId',
    'current_role_id',
    'jobRoleId',
    'job_role_id',
  ]);
  if (direct) return direct;

  for (const key of ['roles', 'roleIds', 'role_ids']) {
    const value = source[key];
    if (!Array.isArray(value)) continue;
    const text = value.map(readString).find(Boolean);
    if (text) return text;
  }

  const roleObject = firstRoleObject(source);
  return roleObject
    ? firstStringFromKeys(roleObject, ['id', 'roleId', 'role_id', 'code', 'value'])
    : undefined;
}

export function isStandardRoleId(value: string | undefined | null): value is StandardRoleId {
  return STANDARD_ROLE_IDS.includes(String(value || '') as StandardRoleId);
}

export function normalizeInternalRoleId(
  roleId: string | undefined | null,
  fallback: StandardRoleId = DEFAULT_NEW_USER_ROLE_ID,
): StandardRoleId {
  const normalized = String(roleId || '').trim();
  if (isStandardRoleId(normalized)) return normalized;
  return LEGACY_ROLE_ID_MAP[normalized] || fallback;
}

export function mapZhitouRoleName(roleName: string): StandardRoleId {
  const normalized = normalizeKey(roleName);
  const designerNames = [...DESIGNER_ROLE_NAMES].map(normalizeKey);
  const optimizerNames = [...OPTIMIZER_ROLE_NAMES].map(normalizeKey);
  const observerNames = [...OBSERVER_ROLE_NAMES].map(normalizeKey);
  if (designerNames.includes(normalized)) return 'designer';
  if (optimizerNames.includes(normalized)) return 'optimizer';
  if (observerNames.includes(normalized)) return 'observer';
  return DEFAULT_NEW_USER_ROLE_ID;
}

export function resolveZhitouRoleMapping(user: unknown): ZhitouRoleMappingResult {
  const source = readObject(user);
  if (!source) {
    return { hasExternalRole: false, reason: 'no_user_payload' };
  }

  const externalRoleName = firstRoleString(source);
  const externalRoleId = firstRoleId(source);
  if (externalRoleName) {
    return {
      externalRoleId,
      externalRoleName,
      mappedRoleId: mapZhitouRoleName(externalRoleName),
      hasExternalRole: true,
      reason: 'matched_role_name',
    };
  }

  if (externalRoleId) {
    return {
      externalRoleId,
      hasExternalRole: true,
      reason: 'role_id_without_name',
    };
  }

  return { hasExternalRole: false, reason: 'missing_role' };
}
