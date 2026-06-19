import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_COOKIE, getCurrentUser } from '@/lib/auth-service';
import {
  ensureAdminUserForAuthUser,
  getAdminAccessForAuthUser,
} from '@/lib/admin-access-store';
import { refreshDatakiKeyForAdminUser, toPublicAdminUser } from '@/lib/dataki-user-key-service';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value || '';
  if (!token) return null;
  const payload = await getCurrentUser(token);
  const persisted = await ensureAdminUserForAuthUser(payload.user);
  const access = await getAdminAccessForAuthUser(persisted);
  return { token, payload, access };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!auth.access.can_manage_users) {
    return NextResponse.json({ message: '无权刷新知识库授权' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const updated = await refreshDatakiKeyForAdminUser(id);
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
      action: 'refresh_dataki_key',
      targetType: 'user',
      targetId: updated.id,
      targetName: updated.real_name || updated.user_name || updated.account,
      summary: `刷新个人知识库授权：${updated.real_name || updated.user_name || updated.account}`,
      changes: [
        describeFieldChange('Dataki 用户', undefined, updated.dataki_tenant_name),
        describeFieldChange('Dataki KEY', undefined, updated.dataki_masked_api_key),
      ],
    });

    return NextResponse.json({
      success: true,
      user: toPublicAdminUser(updated),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '刷新知识库授权失败',
    }, { status: 500 });
  }
}
