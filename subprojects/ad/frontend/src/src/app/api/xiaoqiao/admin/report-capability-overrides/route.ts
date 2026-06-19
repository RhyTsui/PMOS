import { NextResponse } from 'next/server';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import { logAdminOperation } from '@/lib/admin-operation-log';
import {
  loadReportCapabilityOverrideConfigSync,
  saveReportCapabilityOverrideConfig,
  type ReportCapabilityOverrideConfig,
} from '@/lib/report-capability-override-store';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) return NextResponse.json({ message: '请先登录' }, { status: 401 });
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看问数能力覆盖配置' }, { status: 403 });
  }
  return NextResponse.json(loadReportCapabilityOverrideConfigSync());
}

export async function PUT(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) return NextResponse.json({ message: '请先登录' }, { status: 401 });
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权修改问数能力覆盖配置' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as Partial<ReportCapabilityOverrideConfig> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ message: '请求体必须是配置对象' }, { status: 400 });
  }

  const next = await saveReportCapabilityOverrideConfig(body);
  await logAdminOperation({
    context,
    module: 'report_capability',
    action: 'update',
    targetType: 'report-capability-overrides',
    targetId: 'runtime',
    targetName: '问数能力覆盖配置',
    summary: `更新问数能力覆盖配置，共 ${next.overrides.length} 条`,
    changes: [
      `enabled: ${next.enabled}`,
      `override_count: ${next.overrides.length}`,
    ],
  });
  return NextResponse.json(next);
}
