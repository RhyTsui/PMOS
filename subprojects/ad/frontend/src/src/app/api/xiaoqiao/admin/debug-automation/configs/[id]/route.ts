import { NextResponse } from 'next/server';
import { getDebugAutomationConfig, updateDebugAutomationConfig } from '@/lib/debug-automation-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const config = await getDebugAutomationConfig(id);
  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });
  return NextResponse.json(config);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const before = await getDebugAutomationConfig(id);
  const body = await request.json();
  const config = await updateDebugAutomationConfig(id, body);
  if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });
  await logAdminOperation({
    context,
    module: 'debug_config',
    action: 'update',
    targetType: 'debug-config',
    targetId: config.id,
    targetName: config.name,
    summary: 'update debug config ' + config.name,
    changes: before ? [
      describeFieldChange('name', before.name, config.name),
      describeFieldChange('media', before.media, config.media),
      describeFieldChange('terminal', before.terminal, config.terminal),
      describeFieldChange('environment', before.environment, config.environment),
      describeFieldChange('executor_type', before.executor_type, config.executor_type),
      describeFieldChange('vision_provider', before.vision_provider, config.vision_provider),
      describeFieldChange('is_active', before.is_active, config.is_active),
      describeFieldChange('scope', before.scope, config.scope),
    ] : undefined,
  });
  return NextResponse.json(config);
}
