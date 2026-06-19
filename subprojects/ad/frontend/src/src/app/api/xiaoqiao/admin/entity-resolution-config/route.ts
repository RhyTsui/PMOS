import { NextResponse } from 'next/server';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import {
  loadEntityResolutionConfigSync,
  saveEntityResolutionConfig,
  type EntityResolutionConfig,
} from '@/lib/entity-resolution-config-store';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) return NextResponse.json({ message: '请先登录' }, { status: 401 });
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看实体解析配置' }, { status: 403 });
  }
  return NextResponse.json(loadEntityResolutionConfigSync());
}

export async function PUT(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) return NextResponse.json({ message: '请先登录' }, { status: 401 });
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权修改实体解析配置' }, { status: 403 });
  }

  const before = loadEntityResolutionConfigSync();
  const body = await request.json().catch(() => ({})) as Partial<EntityResolutionConfig>;
  const config = await saveEntityResolutionConfig(body);

  await logAdminOperation({
    context,
    module: 'entity_resolution',
    action: 'update',
    targetType: 'entity-resolution-config',
    targetId: 'runtime',
    targetName: '实体解析配置',
    summary: '更新实体解析配置',
    changes: [
      describeFieldChange('enabled', before.enabled, config.enabled),
      describeFieldChange('entries', before.entries.length, config.entries.length),
    ],
  });

  return NextResponse.json(config);
}
