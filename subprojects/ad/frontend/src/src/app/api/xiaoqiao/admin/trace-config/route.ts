import { NextResponse } from 'next/server';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import { getTraceConfigSync, updateTraceConfig } from '@/lib/trace-config-store';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看追踪配置' }, { status: 403 });
  }
  return NextResponse.json(getTraceConfigSync());
}

export async function PUT(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权操作追踪配置' }, { status: 403 });
  }

  const before = getTraceConfigSync();
  const body = await request.json();
  const config = await updateTraceConfig(body);

  await logAdminOperation({
    context,
    module: 'trace_config',
    action: 'update',
    targetType: 'trace-config',
    targetId: config.serviceName,
    targetName: config.serviceName,
    summary: '更新追踪配置',
    changes: [
      describeFieldChange('启用', before.enabled, config.enabled),
      describeFieldChange('服务名称', before.serviceName, config.serviceName),
      describeFieldChange('环境', before.env, config.env),
      describeFieldChange('采样率', before.sampleRate, config.sampleRate),
      describeFieldChange('API 地址', before.apiUrl, config.apiUrl),
      describeFieldChange('Workspace ID', before.workspaceId, config.workspaceId),
      describeFieldChange('API Token', before.apiToken, config.apiToken),
    ],
  });

  return NextResponse.json({ success: true, config });
}
