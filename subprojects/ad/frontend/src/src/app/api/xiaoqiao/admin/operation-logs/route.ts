import { NextResponse } from 'next/server';
import { listOperationLogs } from '@/lib/admin-operation-log-store';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_manage_users) {
    return NextResponse.json({ message: '无权查看操作日志' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const logs = await listOperationLogs({
    module: searchParams.get('module') || undefined,
    action: searchParams.get('action') || undefined,
    targetType: searchParams.get('target_type') || undefined,
    actor: searchParams.get('actor') || undefined,
    keyword: searchParams.get('keyword') || undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  });

  return NextResponse.json({ logs });
}
