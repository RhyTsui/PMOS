import type { AiadUserInfo } from './auth-service';
import { getModelServiceConfig } from './runtime-config';
import {
  listAdminUsers,
  maskSensitiveKey,
  toPublicAdminUser,
  updateAdminUser,
} from './admin-access-store';
import type { AdminUserRecord } from './admin-access-types';
import { getUserScopeKey } from './user-scope';

const DATAKI_TIMEOUT_MS = 10000;

interface DatakiTenantSummary {
  id: string;
  name: string;
}

interface DatakiResolvedKey {
  apiKey: string;
  tenantId: string;
  tenantName: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  return values
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      const key = normalizeIdentity(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function identityCandidates(user: {
  account?: string | null;
  user_name?: string | null;
  real_name?: string | null;
  third_account?: string | null;
}): string[] {
  return uniqueStrings([user.real_name, user.user_name, user.account, user.third_account]);
}

async function datakiRequest<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DATAKI_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const record = asRecord(data);
      const nestedError = asRecord(record.error);
      const message = pickString(record, ['message', 'error'])
        || pickString(nestedError, ['message'])
        || `HTTP ${response.status}`;
      throw new Error(message);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

function extractToken(data: unknown): string {
  const record = asRecord(data);
  const nested = asRecord(record.data);
  return pickString(record, ['token', 'access_token'])
    || pickString(nested, ['token', 'access_token']);
}

function extractTenants(data: unknown): DatakiTenantSummary[] {
  const record = asRecord(data);
  const dataRecord = asRecord(record.data);
  const candidates = [
    dataRecord.items,
    dataRecord.list,
    record.items,
    record.list,
    record.tenants,
    dataRecord.tenants,
  ];
  const list = candidates.find(Array.isArray) as unknown[] | undefined;
  return (list || [])
    .map((item) => {
      const entry = asRecord(item);
      return {
        id: pickString(entry, ['id', 'tenant_id']),
        name: pickString(entry, ['name', 'tenant_name', 'title']),
      };
    })
    .filter((item) => item.id);
}

async function loginDatakiAdmin(baseUrl: string, email: string, password: string): Promise<string> {
  const data = await datakiRequest(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const record = asRecord(data);
  if (record.success === false) {
    throw new Error(pickString(record, ['message']) || 'Dataki 管理员登录失败');
  }
  const token = extractToken(data);
  if (!token) throw new Error('Dataki 管理员登录成功但未返回 token');
  return token;
}

async function searchTenants(baseUrl: string, token: string, keyword: string): Promise<DatakiTenantSummary[]> {
  const url = new URL(`${baseUrl}/api/v1/tenants/search`);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('page', '1');
  url.searchParams.set('page_size', '50');
  const data = await datakiRequest(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const record = asRecord(data);
  if (record.success === false) {
    throw new Error(pickString(record, ['message']) || '搜索 Dataki 用户失败');
  }
  return extractTenants(data);
}

async function listAllTenants(baseUrl: string, token: string): Promise<DatakiTenantSummary[]> {
  const data = await datakiRequest(`${baseUrl}/api/v1/tenants/all`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const record = asRecord(data);
  if (record.success === false) {
    throw new Error(pickString(record, ['message']) || '读取 Dataki 用户列表失败');
  }
  return extractTenants(data);
}

async function getTenantKey(baseUrl: string, token: string, tenant: DatakiTenantSummary): Promise<DatakiResolvedKey> {
  const data = await datakiRequest(`${baseUrl}/api/v1/tenants/${encodeURIComponent(tenant.id)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const record = asRecord(data);
  if (record.success === false) {
    throw new Error(pickString(record, ['message']) || '读取 Dataki 用户 KEY 失败');
  }
  const detail = asRecord(record.data);
  const apiKey = pickString(detail, ['api_key', 'apiKey']);
  if (!apiKey) throw new Error('Dataki 用户记录未返回 API KEY');
  return {
    apiKey,
    tenantId: pickString(detail, ['id', 'tenant_id']) || tenant.id,
    tenantName: pickString(detail, ['name', 'tenant_name']) || tenant.name,
  };
}

function chooseTenant(tenants: DatakiTenantSummary[], candidates: string[]): DatakiTenantSummary {
  const byId = new Map(tenants.map((item) => [item.id, item]));
  const uniqueTenants = Array.from(byId.values());
  const exact = uniqueTenants.filter((tenant) => (
    candidates.some((candidate) => normalizeIdentity(tenant.name) === normalizeIdentity(candidate))
  ));
  if (exact.length === 1) return exact[0];

  const fuzzy = uniqueTenants.filter((tenant) => (
    candidates.some((candidate) => {
      const tenantName = normalizeIdentity(tenant.name);
      const userName = normalizeIdentity(candidate);
      return tenantName.includes(userName) || userName.includes(tenantName);
    })
  ));
  if (fuzzy.length === 1) return fuzzy[0];

  if (uniqueTenants.length === 1) return uniqueTenants[0];
  if (exact.length > 1 || fuzzy.length > 1 || uniqueTenants.length > 1) {
    throw new Error('匹配到多个 Dataki 用户，请在用户管理中手动刷新并确认姓名');
  }
  throw new Error('未找到匹配的 Dataki 用户');
}

export async function resolveDatakiKeyForUser(user: AdminUserRecord | AiadUserInfo): Promise<DatakiResolvedKey> {
  const config = await getModelServiceConfig();
  const baseUrl = (config.datakiBaseUrl || 'https://dataki.dobest.com').replace(/\/$/, '');
  const adminEmail = config.datakiAdminEmail.trim();
  const adminPassword = config.datakiAdminPassword.trim();
  if (!adminEmail || !adminPassword) {
    throw new Error('请先在管理中心配置 Dataki 管理员账号和密码');
  }

  const candidates = identityCandidates(user);
  if (!candidates.length) {
    throw new Error('当前用户缺少可用于匹配 Dataki 的姓名或账号');
  }

  const token = await loginDatakiAdmin(baseUrl, adminEmail, adminPassword);
  const tenantMap = new Map<string, DatakiTenantSummary>();
  for (const candidate of candidates) {
    const tenants = await searchTenants(baseUrl, token, candidate);
    tenants.forEach((tenant) => tenantMap.set(tenant.id, tenant));
    if (tenants.length) break;
  }

  if (!tenantMap.size) {
    const allTenants = await listAllTenants(baseUrl, token);
    allTenants.forEach((tenant) => tenantMap.set(tenant.id, tenant));
  }

  const tenant = chooseTenant(Array.from(tenantMap.values()), candidates);
  return getTenantKey(baseUrl, token, tenant);
}

export async function ensureDatakiKeyForAdminUser(user: AdminUserRecord): Promise<AdminUserRecord> {
  if (user.dataki_api_key && user.dataki_key_status === 'resolved') {
    return user;
  }

  try {
    const resolved = await resolveDatakiKeyForUser(user);
    const updated = await updateAdminUser(user.id, {
      dataki_api_key: resolved.apiKey,
      dataki_masked_api_key: maskSensitiveKey(resolved.apiKey),
      dataki_tenant_id: resolved.tenantId,
      dataki_tenant_name: resolved.tenantName,
      dataki_key_status: 'resolved',
      dataki_key_resolved_at: nowIso(),
      dataki_key_last_error: '',
    });
    return updated || user;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const updated = await updateAdminUser(user.id, {
      dataki_key_status: 'failed',
      dataki_key_last_error: message,
    });
    return updated || user;
  }
}

export async function refreshDatakiKeyForAdminUser(userId: string): Promise<AdminUserRecord | undefined> {
  const user = (await listAdminUsers()).find((item) => item.id === userId);
  if (!user) return undefined;
  const resolved = await resolveDatakiKeyForUser(user);
  return updateAdminUser(user.id, {
    dataki_api_key: resolved.apiKey,
    dataki_masked_api_key: maskSensitiveKey(resolved.apiKey),
    dataki_tenant_id: resolved.tenantId,
    dataki_tenant_name: resolved.tenantName,
    dataki_key_status: 'resolved',
    dataki_key_resolved_at: nowIso(),
    dataki_key_last_error: '',
  });
}

export async function getDatakiApiKeyForScope(scopeKey?: string): Promise<string> {
  if (!scopeKey) return '';
  const users = await listAdminUsers();
  const matched = users.find((user) => (
    getUserScopeKey(user) === scopeKey ||
    user.id === scopeKey ||
    user.account === scopeKey ||
    user.user_name === scopeKey
  ));
  return matched?.dataki_key_status === 'resolved' ? (matched.dataki_api_key || '') : '';
}

export { toPublicAdminUser };
