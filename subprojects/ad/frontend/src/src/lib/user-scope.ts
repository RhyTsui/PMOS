import { AUTH_TOKEN_COOKIE, decodeJwtPayload, getCurrentUser, getUserIdFromToken, type AuthProjectItem } from './auth-service';

export interface UserScope {
  key: string;
  uid?: number;
  account: string;
  user_name: string;
  real_name?: string;
  third_account?: string;
  current_project?: AuthProjectItem | null;
  projects?: AuthProjectItem[];
}

function normalizeScopePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'anonymous';
}

export function getUserScopeKey(input: {
  uid?: number;
  account?: string | null;
  user_name?: string | null;
  real_name?: string | null;
  third_account?: string | null;
}): string {
  const candidate =
    input.account ||
    input.third_account ||
    input.user_name ||
    input.real_name ||
    '';
  if (candidate) {
    return `acct-${normalizeScopePart(String(candidate))}`;
  }
  if (typeof input.uid === 'number' && Number.isFinite(input.uid)) {
    return `uid-${input.uid}`;
  }
  return 'acct-anonymous';
}

export function getPersonalKnowledgeScopeKey(input: {
  uid?: number;
  account?: string | null;
  user_name?: string | null;
  real_name?: string | null;
  third_account?: string | null;
  key?: string | null;
}): string {
  if (typeof input.uid === 'number' && Number.isFinite(input.uid)) {
    return `uid-${input.uid}`;
  }
  const candidate =
    input.account ||
    input.third_account ||
    input.user_name ||
    input.real_name ||
    '';
  return candidate ? `acct-${normalizeScopePart(String(candidate))}` : String(input.key || 'acct-anonymous');
}

function readCookie(cookieHeader: string, name: string): string {
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function getNumericUserIdFromToken(token: string): number | undefined {
  const rawUserId = getUserIdFromToken(token).trim();
  if (!rawUserId) return undefined;
  const uid = Number(rawUserId);
  return Number.isFinite(uid) ? uid : undefined;
}

function scopeFromToken(token: string): UserScope | null {
  const payload = decodeJwtPayload(token);
  const uid = getNumericUserIdFromToken(token);
  const account = String(payload?.third_account || payload?.account || payload?.user_name || payload?.real_name || payload?.phone || '');
  const rawUserName = String(payload?.user_name || payload?.account || payload?.real_name || account || '');
  const user_name = rawUserName || 'anonymous';
  const real_name = typeof payload?.real_name === 'string' ? payload.real_name : undefined;
  const third_account = typeof payload?.third_account === 'string' ? payload.third_account : undefined;
  const hasStableIdentity = uid !== undefined || Boolean(account || rawUserName || real_name || third_account);
  if (!hasStableIdentity) return null;
  const scopeInput = {
    uid,
    account,
    user_name,
    real_name,
    third_account,
  };
  return {
    key: getUserScopeKey(scopeInput),
    uid,
    account: account || user_name,
    user_name,
    real_name,
    third_account,
  };
}

export async function resolveUserScopeFromRequest(request: Request): Promise<UserScope | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = readCookie(cookieHeader, AUTH_TOKEN_COOKIE);
  if (!token) return null;
  const tokenScope = scopeFromToken(token);

  try {
    const current = await getCurrentUser(token);
    const user = current.user;
    const currentScopeKey = getUserScopeKey(user);
    return {
      key: currentScopeKey || tokenScope?.key || 'acct-anonymous',
      uid: user.uid ?? tokenScope?.uid,
      account: tokenScope?.account || user.account,
      user_name: tokenScope?.user_name || user.user_name,
      real_name: tokenScope?.real_name || user.real_name,
      third_account: tokenScope?.third_account || user.third_account,
      current_project: user.current || null,
      projects: Array.isArray(user.projects) ? user.projects : [],
    };
  } catch {
    return tokenScope;
  }
}
