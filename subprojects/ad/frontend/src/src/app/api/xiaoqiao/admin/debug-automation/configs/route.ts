import { NextResponse } from 'next/server';
import { createDebugAutomationConfig, listDebugAutomationConfigs } from '@/lib/debug-automation-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json(await listDebugAutomationConfigs());
}

export async function POST(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const config = await createDebugAutomationConfig(body);
  await logAdminOperation({
    context,
    module: 'debug_config',
    action: 'create',
    targetType: 'debug-config',
    targetId: config.id,
    targetName: config.name,
    summary: 'create debug config ' + config.name,
    changes: [
      describeFieldChange('name', undefined, config.name),
      describeFieldChange('media', undefined, config.media),
      describeFieldChange('terminal', undefined, config.terminal),
      describeFieldChange('environment', undefined, config.environment),
      describeFieldChange('is_active', undefined, config.is_active),
    ],
  });
  return NextResponse.json(config, { status: 201 });
}
