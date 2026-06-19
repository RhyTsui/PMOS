import { NextResponse } from 'next/server';
import { getModelServiceConfig, listEffectiveModelRoutes, updateModelServiceConfig } from '@/lib/runtime-config';
import { MODEL_USE_CASE_REGISTRY } from '@/contracts/model-service';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看模型配置' }, { status: 403 });
  }
  const config = await getModelServiceConfig();
  const effectiveRoutes = await listEffectiveModelRoutes();
  return NextResponse.json({ ...config, registry: MODEL_USE_CASE_REGISTRY, effectiveRoutes });
}

export async function PUT(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权操作模型配置' }, { status: 403 });
  }
  const before = await getModelServiceConfig();
  const body = await request.json();
  const config = await updateModelServiceConfig(body);
  await logAdminOperation({
    context,
    module: 'model_service',
    action: 'update',
    targetType: 'model-service-config',
    targetId: config.modelName,
    targetName: config.providerLabel,
    summary: '更新模型服务配置',
    changes: [
      describeFieldChange('启用', before.enabled, config.enabled),
      describeFieldChange('提供方', before.provider, config.provider),
      describeFieldChange('提供方名称', before.providerLabel, config.providerLabel),
      describeFieldChange('模型名称', before.modelName, config.modelName),
      describeFieldChange('知识库地址', before.knowledgeBaseUrl, config.knowledgeBaseUrl),
      describeFieldChange('模型地址', before.modelBaseUrl, config.modelBaseUrl),
      describeFieldChange('说明', before.notes, config.notes),
      describeFieldChange('API Key', before.apiKey, config.apiKey),
      describeFieldChange('基础地址', before.baseUrl, config.baseUrl),
    ],
  });
  return NextResponse.json({ success: true, config });
}
