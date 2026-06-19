import type { CompiledContextPackage, RoleProfile, UserPreferenceProfile } from '@/types';
import type { AdminAccessSnapshot } from './admin-access-types';
import { resolveZhitouRoleMapping, type StandardRoleId } from './zhitou-role-mapping';

export const AUTH_TOKEN_COOKIE = 'xiaoqiao_auth_token';
export const AUTH_SESSION_COOKIE = 'xiaoqiao_auth_session';

export interface AuthProjectItem {
  app_id: string | number;
  app_name: string;
  id?: string | number;
  icon?: string;
  app_alias?: string;
  app_en_name?: string;
  status?: string;
  app_status?: string | number;
  is_recent?: boolean;
  is_favorite?: boolean;
  is_current?: boolean;
  app_types?: string[];
  app_type?: string | number | string[];
  attribution_provider_id?: string | number;
  open_beta_time?: string;
  booking_time?: string;
  data_start_date?: string;
  sp_multi_team?: boolean;
}

export interface AiadUserInfo {
  [key: string]: unknown;
  account: string;
  user_name: string;
  real_name?: string;
  third_account?: string;
  phone?: string;
  uid: number;
  menus: unknown[];
  auths: string[];
  projects: AuthProjectItem[];
  previous?: AuthProjectItem;
  current?: AuthProjectItem | null;
  roles: number[];
  admin_access?: AdminAccessSnapshot;
  current_role?: string;
  zhitou_role_id?: string;
  zhitou_role_name?: string;
  mapped_role_id?: StandardRoleId;
  role_mapping_reason?: string;
  role_profile?: RoleProfile | null;
  preference_profile?: UserPreferenceProfile | null;
  compiled_context?: CompiledContextPackage | null;
}

export interface AiadUserAbility {
  supportExport?: boolean;
  appType?: string;
  appTypes?: string[];
  [key: string]: unknown;
}

export interface AiadMemberProjectItem {
  code?: string | number;
  id?: string | number;
  app_id?: string | number;
  appId?: string | number;
  name?: string;
  app_name?: string;
  appName?: string;
  app_alias?: string;
  appAlias?: string;
  app_en_name?: string;
  appEnName?: string;
  icon?: string;
  status?: string | number;
  app_status?: string | number;
}

export interface AiadMemberInfo {
  userId?: string | number;
  user_id?: string | number;
  userName?: string;
  user_name?: string;
  realName?: string;
  phone?: string;
  organization?: string;
  apps?: AiadMemberProjectItem[];
  [key: string]: unknown;
}

export interface CurrentUserPayload {
  user: AiadUserInfo;
  ability: AiadUserAbility | null;
}

interface BackendResult<T> {
  code?: number;
  data?: T;
  msg?: string;
  message?: string;
}

export function getAuthApiBaseUrl(): string {
  return (
    process.env.XIAOQIAO_AUTH_API_BASE_URL ||
    process.env.NEXT_PUBLIC_XIAOQIAO_AUTH_API_BASE_URL ||
    'https://ads.dobest.com/api'
  ).replace(/\/$/, '');
}

export function getProjectListEndpoint(): string {
  return (
    process.env.XIAOQIAO_PROJECT_LIST_ENDPOINT ||
    `${getAuthApiBaseUrl()}/aiad-setting/v2/app/list`
  ).trim();
}

function assertProductionAiadUrl(url: string): void {
  const normalized = url.trim().toLowerCase();
  if (!normalized) return;
  if (normalized.includes('pre-aitd.dobest.cn')) {
    throw new Error('pre-aitd project/auth endpoint is not allowed for production validation');
  }
}

export function getLoginSecurityBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_XIAOQIAO_LOGIN_SECURITY_BASE_URL ||
    process.env.XIAOQIAO_LOGIN_SECURITY_BASE_URL ||
    'https://xs-login.dobest.com/ads-aitd/security'
  ).replace(/\/$/, '');
}

export function getLoginAppId(): string {
  return process.env.NEXT_PUBLIC_XIAOQIAO_LOGIN_APP_ID || process.env.XIAOQIAO_LOGIN_APP_ID || '90001';
}

export function getStoredAuthToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const localToken =
      window.localStorage.getItem('__YK_LOGIN_TOKEN__') ||
      window.localStorage.getItem(AUTH_TOKEN_COOKIE);
    if (localToken) return localToken;
    const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${AUTH_TOKEN_COOKIE}=([^;]*)`));
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
  } catch {
    return '';
  }
}

export function getStoredAuthSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const localSession =
      window.localStorage.getItem('__YK_LOGIN_SESSION_ID__') ||
      window.localStorage.getItem(AUTH_SESSION_COOKIE);
    if (localSession) return localSession;
    const cookieMatch = document.cookie.match(
      new RegExp(`(?:^|; )${AUTH_SESSION_COOKIE}=([^;]*)`),
    );
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
  } catch {
    return '';
  }
}

export const GetBuildVersionInfo = async () => {
  let pkgJson: unknown;
  const root = process.cwd();

  return {
    gitCiPipelineID: process.env.CI_PIPELINE_ID  || '',
    version: process.env.VERSION || ''
  };

};
export function authCookieOptions() {
 console.log('[authCookieOptions] Cookie 配置检查:');
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    /*secure: process.env.NODE_ENV === 'production',*/
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

async function fetchAiad<T>(
  path: string,
  token: string,
  init: RequestInit & { appId?: string | number } = {},
): Promise<T> {
  const { appId, headers, ...requestInit } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    const url = `${getAuthApiBaseUrl()}${path}`;
    assertProductionAiadUrl(url);
    response = await fetch(url, {
      ...requestInit,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        ...(appId ? { 'X-App-Id': String(appId) } : {}),
        ...(headers || {}),
      },
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('登录状态校验超时，请重新登录');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  let payload: BackendResult<T> | T | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'msg' in payload
      ? String((payload as BackendResult<T>).msg || response.statusText)
      : response.statusText;
    throw new Error(message || `AIAD request failed: ${response.status}`);
  }

  if (payload && typeof payload === 'object' && 'code' in payload) {
    const result = payload as BackendResult<T>;
    if (result.code === 200 || result.code === 201 || result.code === 202 || result.code === 0) {
      return result.data as T;
    }
    throw new Error(result.msg || result.message || `AIAD business error: ${result.code}`);
  }

  return payload as T;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const normalized = token.replace(/^Bearer\s+/i, '').trim();
  const parts = normalized.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${payload}${'='.repeat((4 - (payload.length % 4)) % 4)}`;
    const decoded = typeof window === 'undefined'
      ? Buffer.from(padded, 'base64').toString('utf8')
      : window.atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getUserIdFromToken(token: string): string {
  const payload = decodeJwtPayload(token);
  const userId = payload?.user_id ?? payload?.userId ?? payload?.uid ?? payload?.userID;
  return userId === undefined || userId === null ? '' : String(userId);
}

export async function getAiadUserInfo(token: string): Promise<AiadUserInfo> {
  return fetchAiad<AiadUserInfo>('/aiad-auth/user/info', token);
}

export async function getAiadUserAbility(
  token: string,
  appId?: string | number,
): Promise<AiadUserAbility | null> {
  if (!appId) return null;
  try {
    return await fetchAiad<AiadUserAbility>('/aiad-setting/v2/user/ability', token, { appId });
  } catch {
    return null;
  }
}

export async function getAiadMemberInfo(
  token: string,
  userId: string | number,
): Promise<AiadMemberInfo> {
  return fetchAiad<AiadMemberInfo>(
    `/aiad-setting/v2/user/info/id?userId=${encodeURIComponent(String(userId))}`,
    token,
  );
}

export async function getAiadProjectList(token: string): Promise<unknown> {
  const endpoint = getProjectListEndpoint();
  assertProductionAiadUrl(endpoint);
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    throw new Error(`AIAD project list request failed: ${response.status}`);
  }
  return payload;
}

export async function getCurrentUser(token: string): Promise<CurrentUserPayload> {
  const user = await getAiadUserInfo(token);
  if (!user || typeof user !== 'object') {
    throw new Error('未能获取用户信息');
  }
  const roleMapping = resolveZhitouRoleMapping(user);
  user.zhitou_role_id = roleMapping.externalRoleId;
  user.zhitou_role_name = roleMapping.externalRoleName;
  user.mapped_role_id = roleMapping.mappedRoleId;
  user.role_mapping_reason = roleMapping.reason;
  const resolvedCurrent = user.current || user.previous || user.projects?.[0] || null;
  const ability = await getAiadUserAbility(token, resolvedCurrent?.app_id);
  if (ability && resolvedCurrent) {
    user.current = {
      ...resolvedCurrent,
      app_type: ability.appType || resolvedCurrent.app_type,
      app_types: ability.appTypes || resolvedCurrent.app_types,
    };
  } else if (resolvedCurrent) {
    user.current = resolvedCurrent;
  } else {
    user.current = null;
  }
  return { user, ability };
}

export async function resetAiadProject(
  token: string,
  projectId: string | number,
): Promise<CurrentUserPayload> {
  await fetchAiad(`/aiad-auth/user/reset-project?project_id=${encodeURIComponent(String(projectId))}`, token, {
    method: 'GET',
    appId: projectId,
  });
  return getCurrentUser(token);
}

export async function logoutAiadSession(token: string, sessionId?: string): Promise<void> {
  try {
    await fetchAiad('/aiad-auth/user/logout', token, {
      method: 'POST',
      body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
    });
  } catch {
    // ignore logout failures
  }
}

export function normalizeAuthProject(item: AuthProjectItem) {
  return {
    app_id: item.app_id,
    app_name: item.app_name || item.app_alias || item.app_en_name || `APPID ${item.app_id}`,
    app_alias: item.app_alias,
    app_en_name: item.app_en_name,
    app_status: item.app_status || item.status,
    icon: item.icon,
    app_type: item.app_type || item.app_types,
    status: item.status,
    is_recent: item.is_recent,
    is_favorite: item.is_favorite,
    is_current: item.is_current,
    app_types: item.app_types,
    attribution_provider_id: item.attribution_provider_id,
    open_beta_time: item.open_beta_time,
    booking_time: item.booking_time,
    data_start_date: item.data_start_date,
    sp_multi_team: item.sp_multi_team,
  };
}
