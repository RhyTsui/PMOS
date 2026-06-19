import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';
import type { AdminAccessSnapshot, AdminUserRecord, AdminUserSource } from './admin-access-types';

const STORE_PATH = runtimeDataPath('admin-users.json');
const SUPER_ADMIN_HINTS = ['徐韵', 'xuyun', 'dobest.com\\xuyun'];

interface AdminUsersFile {
  users: AdminUserRecord[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

export function maskSensitiveKey(key?: string | null): string {
  const trimmed = String(key || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}****`;
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
}

function isSuperAdminSeedCandidate(input: {
  account?: string | null;
  user_name?: string | null;
  real_name?: string | null;
  third_account?: string | null;
}): boolean {
  const values = [input.account, input.user_name, input.real_name, input.third_account]
    .map(normalizeText)
    .filter(Boolean);
  return values.some((value) => SUPER_ADMIN_HINTS.some((hint) => value.includes(normalizeText(hint))));
}

function buildSuperAdminSeed(): AdminUserRecord {
  const timestamp = nowIso();
  return {
    id: 'seed-super-admin-xuyun',
    uid: undefined,
    account: 'xuyun',
    user_name: '徐韵',
    real_name: '徐韵',
    phone: '',
    status: 'active',
    is_super_admin: true,
    can_view_admin: true,
    can_operate_admin: true,
    source: 'seed',
    last_login_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function normalizeUser(input: Partial<AdminUserRecord>): AdminUserRecord {
  const timestamp = input.created_at || input.updated_at || nowIso();
  const isSuperAdmin = Boolean(input.is_super_admin);
  const canOperate = isSuperAdmin || Boolean(input.can_operate_admin);
  const canView = isSuperAdmin || canOperate || Boolean(input.can_view_admin);
  return {
    id: input.id || `user-${Date.now()}`,
    uid: typeof input.uid === 'number' ? input.uid : undefined,
    account: input.account?.trim() || '',
    user_name: input.user_name?.trim() || input.account?.trim() || '未命名用户',
    real_name: input.real_name?.trim() || undefined,
    phone: input.phone?.trim() || '',
    status: input.status || 'active',
    is_super_admin: isSuperAdmin,
    can_view_admin: canView,
    can_operate_admin: canOperate,
    source: input.source || 'manual',
    last_login_at: input.last_login_at || undefined,
    created_at: input.created_at || timestamp,
    updated_at: input.updated_at || timestamp,
    zhitou_role_id: input.zhitou_role_id,
    zhitou_role_name: input.zhitou_role_name,
    mapped_role_id: input.mapped_role_id,
    role_mapping_reason: input.role_mapping_reason,
    dataki_api_key: input.dataki_api_key?.trim() || undefined,
    dataki_masked_api_key: input.dataki_api_key ? maskSensitiveKey(input.dataki_api_key) : input.dataki_masked_api_key,
    dataki_tenant_id: input.dataki_tenant_id?.trim() || undefined,
    dataki_tenant_name: input.dataki_tenant_name?.trim() || undefined,
    dataki_key_status: input.dataki_key_status || (input.dataki_api_key ? 'resolved' : 'unresolved'),
    dataki_key_resolved_at: input.dataki_key_resolved_at,
    dataki_key_last_error: input.dataki_key_last_error,
  };
}

function mergeFromAuth(record: AdminUserRecord, authUser: {
  uid?: number;
  account?: string;
  user_name?: string;
  real_name?: string;
  phone?: string;
  third_account?: string;
  zhitou_role_id?: string;
  zhitou_role_name?: string;
  mapped_role_id?: string;
  role_mapping_reason?: string;
}): AdminUserRecord {
  return normalizeUser({
    ...record,
    uid: typeof authUser.uid === 'number' ? authUser.uid : record.uid,
    account: authUser.account?.trim() || record.account,
    user_name: authUser.user_name?.trim() || record.user_name,
    real_name: authUser.real_name?.trim() || record.real_name,
    phone: authUser.phone?.trim() || record.phone,
    last_login_at: nowIso(),
    source: record.source === 'seed' ? 'seed' : 'login',
    is_super_admin: record.is_super_admin,
    can_view_admin: record.is_super_admin || record.can_view_admin,
    can_operate_admin: record.is_super_admin || record.can_operate_admin,
    status: record.status,
    created_at: record.created_at,
    zhitou_role_id: authUser.zhitou_role_id || record.zhitou_role_id,
    zhitou_role_name: authUser.zhitou_role_name || record.zhitou_role_name,
    mapped_role_id: authUser.mapped_role_id || record.mapped_role_id,
    role_mapping_reason: authUser.role_mapping_reason || record.role_mapping_reason,
    dataki_api_key: record.dataki_api_key,
    dataki_masked_api_key: record.dataki_masked_api_key,
    dataki_tenant_id: record.dataki_tenant_id,
    dataki_tenant_name: record.dataki_tenant_name,
    dataki_key_status: record.dataki_key_status,
    dataki_key_resolved_at: record.dataki_key_resolved_at,
    dataki_key_last_error: record.dataki_key_last_error,
  });
}

async function readStoreFile(): Promise<AdminUsersFile> {
  for (const filePath of [STORE_PATH, LEGACY_STORE_PATH]) {
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AdminUsersFile>;
      if (Array.isArray(parsed.users)) {
        const users = parsed.users.map((item) => normalizeUser(item));
        return { users: users.length > 0 ? users : [buildSuperAdminSeed()] };
      }
    } catch {
      // try next location
    }
  }
  return { users: [buildSuperAdminSeed()] };
}

async function writeStoreFile(file: AdminUsersFile): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

function sortUsers(users: AdminUserRecord[]): AdminUserRecord[] {
  return [...users].sort((a, b) => {
    if (a.is_super_admin && !b.is_super_admin) return -1;
    if (!a.is_super_admin && b.is_super_admin) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

function computeAccess(record: AdminUserRecord | null | undefined): AdminAccessSnapshot {
  const isSuperAdmin = Boolean(record?.is_super_admin);
  const canOperateAdmin = isSuperAdmin || Boolean(record?.can_operate_admin);
  const canViewAdmin = isSuperAdmin || canOperateAdmin || Boolean(record?.can_view_admin);
  return {
    is_super_admin: isSuperAdmin,
    can_view_admin: canViewAdmin,
    can_operate_admin: canOperateAdmin,
    can_manage_users: isSuperAdmin,
  };
}

function findRecord(file: AdminUsersFile, user: { uid?: number; account?: string; user_name?: string; real_name?: string }): AdminUserRecord | undefined {
  const uid = typeof user.uid === 'number' ? user.uid : undefined;
  const normalizedAccount = normalizeText(user.account);
  const normalizedName = normalizeText(user.user_name);
  const normalizedRealName = normalizeText(user.real_name);
  return file.users.find((item) => (
    (uid !== undefined && item.uid === uid) ||
    (!!normalizedAccount && normalizeText(item.account) === normalizedAccount) ||
    (!!normalizedName && normalizeText(item.user_name) === normalizedName) ||
    (!!normalizedRealName && normalizeText(item.real_name) === normalizedRealName)
  ));
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const file = await readStoreFile();
  return sortUsers(file.users);
}

export async function ensureAdminUserForAuthUser(authUser: {
  uid?: number;
  account?: string;
  user_name?: string;
  real_name?: string;
  phone?: string;
  third_account?: string;
  zhitou_role_id?: string;
  zhitou_role_name?: string;
  mapped_role_id?: string;
  role_mapping_reason?: string;
}): Promise<AdminUserRecord> {
  const file = await readStoreFile();
  const existing = findRecord(file, authUser);
  if (existing) {
    const merged = mergeFromAuth(existing, authUser);
    file.users = file.users.map((item) => (item.id === existing.id ? merged : item));
    await writeStoreFile(file);
    return merged;
  }

  const seedCandidate = isSuperAdminSeedCandidate(authUser);
  const record = normalizeUser({
    id: `user-${authUser.uid || authUser.account || Date.now()}`,
    uid: typeof authUser.uid === 'number' ? authUser.uid : undefined,
    account: authUser.account?.trim() || authUser.user_name?.trim() || 'unknown',
    user_name: authUser.user_name?.trim() || authUser.account?.trim() || '未命名用户',
    real_name: authUser.real_name?.trim() || undefined,
    phone: authUser.phone?.trim() || '',
    status: 'active',
    is_super_admin: seedCandidate,
    can_view_admin: seedCandidate,
    can_operate_admin: seedCandidate,
    source: seedCandidate ? 'seed' : 'login',
    last_login_at: nowIso(),
    created_at: nowIso(),
    updated_at: nowIso(),
    zhitou_role_id: authUser.zhitou_role_id,
    zhitou_role_name: authUser.zhitou_role_name,
    mapped_role_id: authUser.mapped_role_id,
    role_mapping_reason: authUser.role_mapping_reason,
    dataki_key_status: 'unresolved',
  });
  file.users = sortUsers([...file.users, record]);
  await writeStoreFile(file);
  return record;
}

export async function getAdminAccessForAuthUser(authUser: {
  uid?: number;
  account?: string;
  user_name?: string;
  real_name?: string;
}): Promise<AdminAccessSnapshot> {
  const file = await readStoreFile();
  const existing = findRecord(file, authUser);
  if (existing) return computeAccess(existing);
  if (isSuperAdminSeedCandidate(authUser)) {
    return computeAccess(buildSuperAdminSeed());
  }
  return computeAccess(null);
}

export async function createAdminUser(input: Partial<AdminUserRecord>): Promise<AdminUserRecord> {
  const file = await readStoreFile();
  const record = normalizeUser({
    ...input,
    id: input.id || `user-${Date.now()}`,
    source: (input.source as AdminUserSource) || 'manual',
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  file.users = sortUsers([...file.users.filter((item) => item.id !== record.id), record]);
  await writeStoreFile(file);
  return record;
}

export async function updateAdminUser(id: string, patch: Partial<AdminUserRecord>): Promise<AdminUserRecord | undefined> {
  const file = await readStoreFile();
  const current = file.users.find((item) => item.id === id);
  if (!current) return undefined;

  const next = normalizeUser({
    ...current,
    ...patch,
    id: current.id,
    uid: patch.uid ?? current.uid,
    account: patch.account ?? current.account,
    user_name: patch.user_name ?? current.user_name,
    real_name: patch.real_name ?? current.real_name,
    phone: patch.phone ?? current.phone,
    status: patch.status ?? current.status,
    is_super_admin: current.is_super_admin,
    can_view_admin: current.is_super_admin || Boolean(patch.can_view_admin ?? current.can_view_admin),
    can_operate_admin: current.is_super_admin || Boolean(patch.can_operate_admin ?? current.can_operate_admin),
    source: current.source,
    created_at: current.created_at,
    updated_at: nowIso(),
    last_login_at: patch.last_login_at ?? current.last_login_at,
    dataki_api_key: patch.dataki_api_key ?? current.dataki_api_key,
    dataki_masked_api_key: patch.dataki_api_key
      ? maskSensitiveKey(patch.dataki_api_key)
      : (patch.dataki_masked_api_key ?? current.dataki_masked_api_key),
    dataki_tenant_id: patch.dataki_tenant_id ?? current.dataki_tenant_id,
    dataki_tenant_name: patch.dataki_tenant_name ?? current.dataki_tenant_name,
    dataki_key_status: patch.dataki_key_status ?? current.dataki_key_status,
    dataki_key_resolved_at: patch.dataki_key_resolved_at ?? current.dataki_key_resolved_at,
    dataki_key_last_error: patch.dataki_key_last_error ?? current.dataki_key_last_error,
  });

  file.users = sortUsers(file.users.map((item) => (item.id === id ? next : item)));
  await writeStoreFile(file);
  return next;
}

export function resolveAdminAccess(record?: AdminUserRecord | null): AdminAccessSnapshot {
  return computeAccess(record);
}

export function toPublicAdminUser(record: AdminUserRecord): AdminUserRecord {
  const { dataki_api_key: _datakiApiKey, ...publicRecord } = record;
  return {
    ...publicRecord,
    dataki_masked_api_key: record.dataki_masked_api_key || maskSensitiveKey(record.dataki_api_key),
  };
}
const LEGACY_STORE_PATH = legacyDataPath('admin-users.json');
