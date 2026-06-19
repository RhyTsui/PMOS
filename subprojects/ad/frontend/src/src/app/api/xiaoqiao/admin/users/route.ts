import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_COOKIE, getCurrentUser } from '@/lib/auth-service';
import {
  createAdminUser,
  ensureAdminUserForAuthUser,
  getAdminAccessForAuthUser,
  listAdminUsers,
  toPublicAdminUser,
} from '@/lib/admin-access-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { getUserScopeKey } from '@/lib/user-scope';
import { listUserPreferenceProfiles, summarizePreferenceProfile } from '@/lib/user-preference-store';

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value || '';
  if (!token) return null;
  const payload = await getCurrentUser(token);
  const persisted = await ensureAdminUserForAuthUser(payload.user);
  const access = await getAdminAccessForAuthUser(persisted);
  return { token, payload, access };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ message: 'please login' }, { status: 401 });
  }
  if (!auth.access.can_manage_users) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }
  const [users, preferenceProfiles] = await Promise.all([
    listAdminUsers(),
    listUserPreferenceProfiles(),
  ]);
  const preferenceByUserId = new Map(preferenceProfiles.map((profile) => [profile.userId, profile]));
  return NextResponse.json({
    users: users.map((user) => {
      const preference = preferenceByUserId.get(getUserScopeKey(user));
      return {
        ...toPublicAdminUser(user),
        current_role: preference?.currentRole || preference?.defaultRole || user.current_role,
        preference_profile: preference || null,
        preference_summary: summarizePreferenceProfile(preference) || null,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ message: 'please login' }, { status: 401 });
  }
  if (!auth.access.can_manage_users) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const user = await createAdminUser({
    account: String(body.account || '').trim(),
    user_name: String(body.user_name || body.account || '').trim(),
    real_name: String(body.real_name || body.user_name || body.account || '').trim(),
    phone: String(body.phone || '').trim(),
    status: body.status === 'disabled' ? 'disabled' : 'active',
    can_view_admin: Boolean(body.can_view_admin),
    can_operate_admin: Boolean(body.can_operate_admin),
    is_super_admin: false,
    source: 'manual',
  });
  await logAdminOperation({
    context: {
      token: auth.token,
      user: auth.payload.user,
      access: auth.access,
    },
    module: 'admin_user',
    action: 'create',
    targetType: 'user',
    targetId: user.id,
    targetName: user.real_name || user.user_name || user.account,
    summary: 'create user ' + (user.real_name || user.user_name || user.account),
    changes: [
      describeFieldChange('account', undefined, user.account),
      describeFieldChange('user_name', undefined, user.user_name),
      describeFieldChange('can_view_admin', undefined, user.can_view_admin),
      describeFieldChange('can_operate_admin', undefined, user.can_operate_admin),
    ],
  });
  return NextResponse.json({ user: toPublicAdminUser(user) }, { status: 201 });
}
