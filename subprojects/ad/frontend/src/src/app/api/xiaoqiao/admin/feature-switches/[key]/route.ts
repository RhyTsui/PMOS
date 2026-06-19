import { NextResponse } from 'next/server';
import { listFeatureSwitches, updateFeatureSwitch } from '@/lib/feature-switch-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { key } = await params;
  const before = (await listFeatureSwitches()).find((item) => item.key === key) || null;
  const body = await request.json();
  const sw = await updateFeatureSwitch(key, body);
  if (!sw) return NextResponse.json({ error: 'Switch not found' }, { status: 404 });
  await logAdminOperation({
    context,
    module: 'feature_switch',
    action: 'update',
    targetType: 'feature-switch',
    targetId: sw.key,
    targetName: sw.name,
    summary: 'update feature switch ' + sw.name,
    changes: [
      describeFieldChange('enabled', before?.enabled, sw.enabled),
      describeFieldChange('name', before?.name, sw.name),
      describeFieldChange('description', before?.description, sw.description),
      ...(sw.type === 'number' ? [describeFieldChange('value', before?.config?.value, sw.config?.value)] : []),
    ],
    metadata: { type: sw.type },
  });
  return NextResponse.json(sw);
}
