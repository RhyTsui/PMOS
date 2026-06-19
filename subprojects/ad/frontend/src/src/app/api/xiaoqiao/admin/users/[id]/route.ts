import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_COOKIE, getCurrentUser } from '@/lib/auth-service';
import {
  ensureAdminUserForAuthUser,
  getAdminAccessForAuthUser,
  listAdminUsers,
  toPublicAdminUser,
  updateAdminUser,
} from '@/lib/admin-access-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value || '';
  if (!token) return null;
  const payload = await getCurrentUser(token);
  const persisted = await ensureAdminUserForAuthUser(payload.user);
  const access = await getAdminAccessForAuthUser(persisted);
  return { token, payload, access };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!auth.access.can_manage_users) {
    return NextResponse.json({ message: '无权访问用户管理' }, { status: 403 });
  }
  const { id } = await params;
  const user = (await listAdminUsers()).find((item) => item.id === id) || null;
  if (!user) {
    return NextResponse.json({ message: '用户不存在' }, { status: 404 });
  }
  return NextResponse.json({ user: toPublicAdminUser(user) });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!auth.access.can_manage_users) {
    return NextResponse.json({ message: '无权访问用户管理' }, { status: 403 });
  }
  const { id } = await params;
  const before = (await listAdminUsers()).find((item) => item.id === id) || null;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const updated = await updateAdminUser(id, {
    account: typeof body.account === 'string' ? body.account : undefined,
    user_name: typeof body.user_name === 'string' ? body.user_name : undefined,
    real_name: typeof body.real_name === 'string' ? body.real_name : undefined,
    phone: typeof body.phone === 'string' ? body.phone : undefined,
    status: body.status === 'disabled' ? 'disabled' : 'active',
    can_view_admin: typeof body.can_view_admin === 'boolean' ? body.can_view_admin : undefined,
    can_operate_admin: typeof body.can_operate_admin === 'boolean' ? body.can_operate_admin : undefined,
  });
  if (!updated) {
    return NextResponse.json({ message: '用户不存在' }, { status: 404 });
  }

  await logAdminOperation({
    context: {
      token: auth.token,
      user: auth.payload.user,
      access: auth.access,
    },
    module: 'admin_user',
    action: 'update',
    targetType: 'user',
    targetId: updated.id,
    targetName: updated.real_name || updated.user_name || updated.account,
    summary: `更新用户「${updated.real_name || updated.user_name || updated.account}」`,
    changes: before ? [
      describeFieldChange('账号', before.account, updated.account),
      describeFieldChange('小闪用户名', before.user_name, updated.user_name),
      describeFieldChange('真实姓名', before.real_name, updated.real_name),
      describeFieldChange('手机', before.phone, updated.phone),
      describeFieldChange('查看权限', before.can_view_admin, updated.can_view_admin),
      describeFieldChange('操作权限', before.can_operate_admin, updated.can_operate_admin),
      describeFieldChange('状态', before.status, updated.status),
    ] : undefined,
  });

  return NextResponse.json({ user: toPublicAdminUser(updated) });
}
