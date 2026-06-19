import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_COOKIE, getCurrentUser } from '@/lib/auth-service';
import { ensureAdminUserForAuthUser, getAdminAccessForAuthUser } from '@/lib/admin-access-store';
import { getUserScopeKey } from '@/lib/user-scope';
import { buildCompiledContextPackage, summarizeCompiledContext } from '@/lib/context-compiler';
import { ensureUserPreferenceProfile } from '@/lib/user-preference-store';
import { getRoleProfile } from '@/lib/role-profile-store';
import { resolveZhitouRoleMapping } from '@/lib/zhitou-role-mapping';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }

  try {
    const payload = await getCurrentUser(token);
    const persisted = await ensureAdminUserForAuthUser(payload.user);
    const access = await getAdminAccessForAuthUser(persisted);
    const scopeKey = getUserScopeKey(payload.user);
    const roleMapping = resolveZhitouRoleMapping(payload.user);
    const preferenceProfile = await ensureUserPreferenceProfile(scopeKey, {
      roleId: roleMapping.mappedRoleId,
    });
    const roleProfile = await getRoleProfile(preferenceProfile.currentRole || preferenceProfile.defaultRole);
    const compiledContext = await buildCompiledContextPackage({
      scopeKey,
      user: payload.user,
      preferenceProfile,
      roleProfile,
      modelAvailable: Boolean(payload.ability),
      mcpAvailable: false,
      mcpServers: [],
      skills: [],
      featureSwitches: [],
    });
    return NextResponse.json({
      ...payload,
      user: {
        ...payload.user,
        admin_access: access,
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
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '登录已失效，请重新登录' },
      { status: 401 },
    );
  }
}
