import { NextResponse } from 'next/server';
import { getAdminPolicyBundle } from '@/lib/admin-policy-bundle-store';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看策略配置' }, { status: 403 });
  }
  return NextResponse.json(await getAdminPolicyBundle());
}
