import { NextResponse } from 'next/server';
import { getPublicWebConfig, isUnsafePublicWebEndpoint, updatePublicWebConfig } from '@/lib/runtime-config';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import { normalizePublicSearchProviderConfigs, normalizePublicSearchOrchestratorConfig } from '@/lib/search-provider-config';

function maskApiKey(key: string): string {
  return key ? '******' : '';
}

function maskProviderKeys(providers: Array<Record<string, unknown>> | undefined): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(providers)) return providers;
  return providers.map(p => ({
    ...p,
    apiKey: maskApiKey(String(p.apiKey || '')),
  }));
}

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看联网查询配置' }, { status: 403 });
  }
  const config = await getPublicWebConfig();
  return NextResponse.json({
    ...config,
    apiKey: maskApiKey(config.apiKey),
    providers: maskProviderKeys(config.providers as Array<Record<string, unknown>> | undefined),
  });
}

export async function PUT(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权操作联网查询配置' }, { status: 403 });
  }
  const before = await getPublicWebConfig();
  const body = await request.json();
  const patch = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  // Don't allow masked API keys to overwrite real ones
  if (patch.apiKey === '******') delete patch.apiKey;

  // Handle providers array - restore real API keys if masked
  if (Array.isArray(patch.providers)) {
    const beforeProviders = before.providers || [];
    patch.providers = patch.providers.map((p: Record<string, unknown>) => {
      const provider = { ...p };
      // If API key is masked, restore from before
      if (provider.apiKey === '******') {
        const beforeProvider = beforeProviders.find(bp => bp.id === provider.id || bp.kind === provider.kind);
        provider.apiKey = beforeProvider?.apiKey || '';
      }
      return provider;
    });
    // Normalize providers
    patch.providers = normalizePublicSearchProviderConfigs(patch.providers);
  }

  // Handle orchestrator config
  if (patch.orchestrator && typeof patch.orchestrator === 'object') {
    patch.orchestrator = normalizePublicSearchOrchestratorConfig(patch.orchestrator as never);
  }

  const invalidFields = [
    typeof patch.searchEndpoint === 'string' && isUnsafePublicWebEndpoint(patch.searchEndpoint) ? 'searchEndpoint' : null,
    typeof patch.fetchEndpoint === 'string' && isUnsafePublicWebEndpoint(patch.fetchEndpoint) ? 'fetchEndpoint' : null,
  ].filter((item): item is string => Boolean(item));
  if (invalidFields.length) {
    return NextResponse.json({
      message: '不允许配置测试或假源地址',
      invalidFields,
    }, { status: 400 });
  }
  const config = await updatePublicWebConfig(patch);
  await logAdminOperation({
    context,
    module: 'public_web',
    action: 'update',
    targetType: 'public-web-config',
    targetId: 'public-web',
    targetName: config.providerLabel,
    summary: '更新联网查询配置',
    changes: [
      describeFieldChange('启用', before.enabled, config.enabled),
      describeFieldChange('提供方', before.providerLabel, config.providerLabel),
      describeFieldChange('搜索地址', before.searchEndpoint, config.searchEndpoint),
      describeFieldChange('抓取地址', before.fetchEndpoint, config.fetchEndpoint),
      describeFieldChange('最大结果数', before.maxResults, config.maxResults),
      describeFieldChange('超时时间', before.timeoutMs, config.timeoutMs),
      describeFieldChange('来源必需', before.sourceRequired, config.sourceRequired),
      describeFieldChange('内部数据保护', before.internalDataProtection, config.internalDataProtection),
      describeFieldChange('Provider 数量', before.providers?.length || 0, config.providers?.length || 0),
    ],
  });
  return NextResponse.json({
    success: true,
    config: {
      ...config,
      apiKey: maskApiKey(config.apiKey),
      providers: maskProviderKeys(config.providers as Array<Record<string, unknown>> | undefined),
    },
  });
}
