import type { NextRequest } from 'next/server';
import { AUTH_TOKEN_COOKIE, getCurrentUser, type AiadUserInfo } from './auth-service';
import { ensureAdminUserForAuthUser, getAdminAccessForAuthUser } from './admin-access-store';
import type { AdminAccessSnapshot } from './admin-access-types';

export interface AdminRequestContext {
  token: string;
  user: AiadUserInfo;
  access: AdminAccessSnapshot;
}

function readCookieToken(request: Request | NextRequest): string {
  if ('cookies' in request && request.cookies) {
    return request.cookies.get(AUTH_TOKEN_COOKIE)?.value || '';
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export async function resolveAdminRequestContext(request: Request | NextRequest): Promise<AdminRequestContext | null> {
  const token = readCookieToken(request);
  if (!token) return null;

  const payload = await getCurrentUser(token);
  const persisted = await ensureAdminUserForAuthUser(payload.user);
  const access = await getAdminAccessForAuthUser(persisted);
  return {
    token,
    user: {
      ...payload.user,
      admin_access: access,
    },
    access,
  };
}
