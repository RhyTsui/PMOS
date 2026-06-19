import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_SESSION_COOKIE,
  AUTH_TOKEN_COOKIE,
  authCookieOptions,
    GetBuildVersionInfo,
  getCurrentUser,
} from '@/lib/auth-service';
import { getUserScopeKey } from '@/lib/user-scope';
import { buildCompiledContextPackage, summarizeCompiledContext } from '@/lib/context-compiler';
import { ensureUserPreferenceProfile } from '@/lib/user-preference-store';
import { getRoleProfile } from '@/lib/role-profile-store';
import { resolveZhitouRoleMapping } from '@/lib/zhitou-role-mapping';
import { ensureAdminUserForAuthUser } from '@/lib/admin-access-store';
import { ensureDatakiKeyForAdminUser } from '@/lib/dataki-user-key-service';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';

  if (!token || !sessionId) {
    return NextResponse.json({ message: '登录信息不完整' }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentUser(token);
    const scopeKey = getUserScopeKey(currentUser.user);
    const adminUser = await ensureAdminUserForAuthUser(currentUser.user);
    await ensureDatakiKeyForAdminUser(adminUser).catch(() => adminUser);
    const roleMapping = resolveZhitouRoleMapping(currentUser.user);
    const preferenceProfile = await ensureUserPreferenceProfile(scopeKey, {
      roleId: roleMapping.mappedRoleId,
    });
    const roleProfile = await getRoleProfile(preferenceProfile.currentRole || preferenceProfile.defaultRole);
    const compiledContext = await buildCompiledContextPackage({
      scopeKey,
      user: currentUser.user,
      preferenceProfile,
      roleProfile,
      modelAvailable: Boolean(currentUser.ability),
      mcpAvailable: false,
      mcpServers: [],
      skills: [],
      featureSwitches: [],
    });
    const buildVersionInfo = await GetBuildVersionInfo();
    console.log(buildVersionInfo);
    const response = NextResponse.json({
      ...currentUser,
      user: {
        ...currentUser.user,
        zhitou_role_id: roleMapping.externalRoleId,
        zhitou_role_name: roleMapping.externalRoleName,
        mapped_role_id: roleMapping.mappedRoleId,
        role_mapping_reason: roleMapping.reason,
        current_role: compiledContext.user.currentRole,
        role_profile: roleProfile || null,
        preference_profile: preferenceProfile,
        compiled_context: compiledContext,
      },
      current_role: compiledContext.user.currentRole,
      role_profile: roleProfile || null,
      preference_profile: preferenceProfile,
      compiled_context: summarizeCompiledContext(compiledContext),
    });
    response.cookies.set(AUTH_TOKEN_COOKIE, token, authCookieOptions());
    response.cookies.set(AUTH_SESSION_COOKIE, sessionId, authCookieOptions());
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { message: error instanceof Error ? error.message : '登录已失效，请重新登录' },
      { status: 401 },
    );
    response.cookies.delete(AUTH_TOKEN_COOKIE);
    response.cookies.delete(AUTH_SESSION_COOKIE);
    return response;
  }
}
