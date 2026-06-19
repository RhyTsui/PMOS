'use client';

import { useEffect, useState } from 'react';
import { Button } from 'antd';
import {
  Settings, ToggleRight, ToggleLeft, Save, Activity, Loader2, Wifi, Cpu, Target, GitBranch,
} from 'lucide-react';
import type {
  EffectiveModelRoute,
  ModelProfileConfig,
  ModelRouteConfig,
  ModelUseCaseDefinition,
} from '@/contracts/model-service';
import { ClientTime } from './admin-menu';
import {
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

interface TraceConfigForm {
  enabled: boolean;
  apiUrl: string;
  workspaceId: string;
  apiToken: string;
  env: 'test' | 'pre' | 'prod';
  serviceName: string;
  sampleRate: number;
}

interface ModelServiceConfigForm {
  enabled: boolean;
  provider: 'coze_openai_compatible' | 'custom_openai_compatible';
  providerLabel: string;
  apiKey: string;
  baseUrl: string;
  modelBaseUrl: string;
  modelName: string;
  modelProfiles?: ModelProfileConfig[];
  defaultModelProfileId?: string;
  knowledgeBaseUrl: string;
  knowledgeBaseApiKey: string;
  knowledgeBaseDataset: string;
  datakiBaseUrl: string;
  datakiAdminEmail: string;
  datakiAdminPassword: string;
  notes: string;
  updatedAt?: string;
  routes?: Record<string, ModelRouteConfig>;
}

type ServiceTestTarget = 'model' | 'knowledge' | 'dataki-admin';
type ServiceLinkState = 'idle' | 'testing' | 'success' | 'fail';

interface ServiceTestFeedback {
  state: ServiceLinkState;
  message: string;
  latencyMs?: number;
}

function TraceConfigTab() {
  const [config, setConfig] = useState<TraceConfigForm>({
    enabled: false,
    apiUrl: 'http://liannu.dc.yokagames.com:1117',
    workspaceId: '',
    apiToken: '',
    env: 'test',
    serviceName: 'xiaoqiao-zhitou-chat-service',
    sampleRate: 1,
  });
  const [modelService, setModelService] = useState<ModelServiceConfigForm>({
    enabled: true,
    provider: 'coze_openai_compatible',
    providerLabel: 'Coze/OpenAI 兼容服务',
    apiKey: '',
    baseUrl: '',
    modelBaseUrl: '',
    modelName: 'doubao-seed-1-8-251228',
    modelProfiles: [],
    defaultModelProfileId: 'default-current-model',
    knowledgeBaseUrl: '',
    knowledgeBaseApiKey: '',
    knowledgeBaseDataset: '',
    datakiBaseUrl: 'https://dataki.dobest.com',
    datakiAdminEmail: '',
    datakiAdminPassword: '',
    notes: '',
    routes: {},
  });
  const [modelUseCases, setModelUseCases] = useState<ModelUseCaseDefinition[]>([]);
  const [effectiveModelRoutes, setEffectiveModelRoutes] = useState<EffectiveModelRoute[]>([]);
  const [saved, setSaved] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [traceTest, setTraceTest] = useState<ServiceTestFeedback>({
    state: 'idle',
    message: '尚未测试',
  });
  const [serviceTest, setServiceTest] = useState<{
    model: ServiceTestFeedback;
    knowledge: ServiceTestFeedback;
    'dataki-admin': ServiceTestFeedback;
  }>({
    model: { state: 'idle', message: '尚未测试' },
    knowledge: { state: 'idle', message: '尚未测试' },
    'dataki-admin': { state: 'idle', message: '尚未测试' },
  });

  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadError(null);
        const [traceRes, modelRes] = await Promise.all([
          fetch('/api/xiaoqiao/admin/trace-config'),
          fetch('/api/xiaoqiao/admin/model-service-config'),
        ]);
        if (!traceRes.ok || !modelRes.ok) throw new Error('配置读取失败');
        const traceData = await traceRes.json();
        const modelData = await modelRes.json();
        if (modelData.message) throw new Error(modelData.message);
        const { registry, effectiveRoutes, ...modelConfig } = modelData as ModelServiceConfigForm & {
          registry?: ModelUseCaseDefinition[];
          effectiveRoutes?: EffectiveModelRoute[];
        };
        setConfig(prev => ({ ...prev, ...traceData }));
        setModelService(prev => ({ ...prev, ...modelConfig }));
        setModelUseCases(Array.isArray(registry) ? registry : []);
        setEffectiveModelRoutes(Array.isArray(effectiveRoutes) ? effectiveRoutes : []);
        setConfigLoaded(true);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : '配置读取失败');
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaveState('saving');
    setLoadError(null);
    try {
      const responses = await Promise.all([
        fetch('/api/xiaoqiao/admin/trace-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        }),
        fetch('/api/xiaoqiao/admin/model-service-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modelService),
        }),
      ]);
      if (responses.some(response => !response.ok)) {
        throw new Error('保存失败');
      }
      const refreshed = await fetch('/api/xiaoqiao/admin/model-service-config');
      const refreshedData = await refreshed.json().catch(() => ({})) as {
        registry?: ModelUseCaseDefinition[];
        effectiveRoutes?: EffectiveModelRoute[];
      };
      if (Array.isArray(refreshedData.registry)) setModelUseCases(refreshedData.registry);
      if (Array.isArray(refreshedData.effectiveRoutes)) setEffectiveModelRoutes(refreshedData.effectiveRoutes);
      setSaved(true);
      setSaveState('saved');
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setSaveState('error');
      setLoadError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const [isEditingConfig, setIsEditingConfig] = useState(false);

  const updateField = <K extends keyof TraceConfigForm>(key: K, value: TraceConfigForm[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    setTraceTest({ state: 'idle', message: '配置已变更，请重新测试' });
  };

  const updateModelServiceField = <K extends keyof ModelServiceConfigForm>(
    key: K,
    value: ModelServiceConfigForm[K],
  ) => {
    setModelService(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    if (key !== 'notes' && key !== 'updatedAt') {
      setServiceTest(prev => ({
        ...prev,
        model: { state: 'idle', message: '配置已变更，请重新测试' },
        knowledge: { state: 'idle', message: '配置已变更，请重新测试' },
        'dataki-admin': { state: 'idle', message: '配置已变更，请重新测试' },
      }));
    }
  };

  const updateModelRoute = (useCase: string, patch: Partial<ModelRouteConfig>) => {
    setModelService(prev => ({
      ...prev,
      routes: {
        ...(prev.routes || {}),
        [useCase]: {
          ...((prev.routes || {})[useCase] || { useCase, enabled: false, routeMode: 'disabled' }),
          ...patch,
          useCase,
        } as ModelRouteConfig,
      },
    }));
    setSaved(false);
    setServiceTest(prev => ({
      ...prev,
      model: { state: 'idle', message: '配置已变更，请重新测试' },
    }));
  };

  const modelProfiles = modelService.modelProfiles?.length
    ? modelService.modelProfiles
    : [{
      id: 'default-current-model',
      name: '当前默认模型',
      provider: modelService.provider,
      providerLabel: modelService.providerLabel,
      apiKey: modelService.apiKey,
      baseUrl: modelService.baseUrl,
      modelBaseUrl: modelService.modelBaseUrl,
      modelName: modelService.modelName,
      enabled: true,
      notes: '',
      updatedAt: modelService.updatedAt,
    } satisfies ModelProfileConfig];

  const updateModelProfile = (profileId: string, patch: Partial<ModelProfileConfig>) => {
    setModelService(prev => {
      const profiles = (prev.modelProfiles?.length ? prev.modelProfiles : modelProfiles).map(profile => (
        profile.id === profileId ? { ...profile, ...patch } : profile
      ));
      // 当默认 profile 被停用时，自动切换到第一个启用的 profile
      let nextDefaultId = prev.defaultModelProfileId || profiles[0]?.id;
      const currentDefault = profiles.find(profile => profile.id === nextDefaultId);
      if (currentDefault && !currentDefault.enabled) {
        const enabledFallback = profiles.find(profile => profile.enabled);
        if (enabledFallback) {
          nextDefaultId = enabledFallback.id;
        }
      }
      const defaultProfile = profiles.find(profile => profile.id === nextDefaultId) || profiles[0];
      return {
        ...prev,
        modelProfiles: profiles,
        defaultModelProfileId: nextDefaultId || defaultProfile?.id,
        provider: defaultProfile?.provider || prev.provider,
        providerLabel: defaultProfile?.providerLabel || prev.providerLabel,
        apiKey: defaultProfile?.apiKey || prev.apiKey,
        baseUrl: defaultProfile?.baseUrl || prev.baseUrl,
        modelBaseUrl: defaultProfile?.modelBaseUrl || prev.modelBaseUrl,
        modelName: defaultProfile?.modelName || prev.modelName,
      };
    });
    setSaved(false);
    setServiceTest(prev => ({ ...prev, model: { state: 'idle', message: '配置已变更，请重新测试' } }));
  };

  const addModelProfile = () => {
    const now = new Date().toISOString();
    const nextProfile: ModelProfileConfig = {
      id: `model-profile-${Date.now()}`,
      name: '新增模型',
      provider: modelService.provider,
      providerLabel: modelService.providerLabel || 'OpenAI 兼容服务',
      apiKey: '',
      baseUrl: modelService.baseUrl,
      modelBaseUrl: modelService.modelBaseUrl || modelService.baseUrl,
      modelName: '',
      enabled: true,
      notes: '',
      updatedAt: now,
    };
    updateModelServiceField('modelProfiles', [...modelProfiles, nextProfile]);
  };

  const setDefaultModelProfile = (profileId: string) => {
    const profile = modelProfiles.find(item => item.id === profileId);
    setModelService(prev => ({
      ...prev,
      defaultModelProfileId: profileId,
      provider: profile?.provider || prev.provider,
      providerLabel: profile?.providerLabel || prev.providerLabel,
      apiKey: profile?.apiKey || prev.apiKey,
      baseUrl: profile?.baseUrl || prev.baseUrl,
      modelBaseUrl: profile?.modelBaseUrl || prev.modelBaseUrl,
      modelName: profile?.modelName || prev.modelName,
    }));
    setSaved(false);
  };

  const routeByUseCase = new Map(effectiveModelRoutes.map(route => [route.useCase, route]));

  const fields: { key: keyof TraceConfigForm; label: string; type?: string; placeholder?: string }[] = [
    { key: 'apiUrl', label: '服务地址', placeholder: 'http://liannu.dc.yokagames.com:1117' },
    { key: 'workspaceId', label: '工作区编号', placeholder: '填写观测服务工作区编号' },
    { key: 'apiToken', label: '访问令牌', type: 'password', placeholder: '填写观测服务访问令牌' },
    { key: 'serviceName', label: '服务名称', placeholder: 'xiaoqiao-zhitou-chat-service' },
  ];
  const modelFields: { key: keyof ModelServiceConfigForm; label: string; type?: string; placeholder?: string }[] = [
    { key: 'providerLabel', label: '服务名称', placeholder: 'Coze/OpenAI 兼容服务' },
    { key: 'apiKey', label: '访问密钥', type: 'password', placeholder: 'sk-...' },
    { key: 'baseUrl', label: '服务地址', placeholder: 'https://your-gateway.example.com' },
    { key: 'modelBaseUrl', label: '模型地址', placeholder: 'https://your-gateway.example.com/v1' },
    { key: 'modelName', label: '模型名称', placeholder: 'doubao-seed-1-8-251228' },
    { key: 'knowledgeBaseUrl', label: '知识库地址', placeholder: '留空则跟随服务地址' },
    { key: 'knowledgeBaseApiKey', label: '知识库访问密钥', type: 'password', placeholder: '留空则复用访问密钥' },
    { key: 'knowledgeBaseDataset', label: '知识库 ID（可选）', placeholder: '留空时自动覆盖当前账号可访问的全部知识库' },
    { key: 'datakiBaseUrl', label: '个人知识库地址', placeholder: 'https://dataki.dobest.com' },
    { key: 'datakiAdminEmail', label: 'Dataki 管理员账号', placeholder: 'admin@example.com' },
    { key: 'datakiAdminPassword', label: 'Dataki 管理员密码', type: 'password', placeholder: '用于首次登录时读取用户授权' },
  ];

  const runTraceTest = async () => {
    setTraceTest({ state: 'testing', message: '正在测试连接...' });
    try {
      const res = await fetch('/api/xiaoqiao/admin/trace-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json().catch(() => ({}));
      const nextState: ServiceLinkState = res.ok && data.ok ? 'success' : 'fail';
      setTraceTest({
        state: nextState,
        message: data.message || (nextState === 'success' ? '连接正常' : '连接失败'),
        latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
      });
    } catch (error: unknown) {
      setTraceTest({
        state: 'fail',
        message: error instanceof Error ? `连接失败：${error.message}` : '连接失败',
      });
    }
  };

  const runServiceTest = async (target: ServiceTestTarget) => {
    setServiceTest(prev => ({
      ...prev,
      [target]: { state: 'testing', message: '正在测试连接...' },
    }));
    try {
      const res = await fetch('/api/xiaoqiao/admin/model-service-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, config: modelService }),
      });
      const data = await res.json().catch(() => ({}));
      const nextState: ServiceLinkState = res.ok && data.ok ? 'success' : 'fail';
      setServiceTest(prev => ({
        ...prev,
        [target]: {
          state: nextState,
          message: data.message || (nextState === 'success' ? '连接正常' : '连接失败'),
          latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
        },
      }));
    } catch (error: unknown) {
      setServiceTest(prev => ({
        ...prev,
        [target]: {
          state: 'fail',
          message: error instanceof Error ? `连接失败：${error.message}` : '连接失败',
        },
      }));
    }
  };

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="问答服务配置"
        description="统一管理问答服务、调用观测和运行参数；保存前请确认模型、知识库和观测连接状态。"
        saveState={saveState}
        actions={(
          <>
            {!isEditingConfig ? (
              <Button
                onClick={() => setIsEditingConfig(true)}
                disabled={!configLoaded}
                icon={<Settings className="h-3.5 w-3.5" />}
              >
                编辑配置
              </Button>
            ) : (
              <>
                <button
                  onClick={() => updateField('enabled', !config.enabled)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    config.enabled
                      ? 'bg-[#e9fff4] text-[#157f54] border border-[#b8ebd0]'
                      : 'bg-[#fff1f2] text-[#c2415c] border border-[#fecdd3]'
                  }`}
                >
                  {config.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  {config.enabled ? '已启用' : '已禁用'}
                </button>
                <Button
                  onClick={() => setIsEditingConfig(false)}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  onClick={async () => { await handleSave(); setIsEditingConfig(false); }}
                  loading={saveState === 'saving'}
                  icon={<Save className="h-3.5 w-3.5" />}
                >
                  保存配置
                </Button>
              </>
            )}
          </>
        )}
      />

      {loadError ? (
        <AdminCrudErrorState
          description={loadError}
          action={<Button size="small" onClick={() => window.location.reload()}>重新打开页面</Button>}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {!configLoaded && (
          <div className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
            <AdminCrudListSkeleton rows={4} />
          </div>
        )}

        <div className={!isEditingConfig && configLoaded ? 'pointer-events-none select-none opacity-75' : ''}>
        {/* Connection Info Card */}
        <div className="rounded-2xl border border-[#dbe4f0] bg-white p-5 space-y-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-medium text-[#355070] flex items-center gap-2">
                <Activity className="w-4 h-4" /> 观测连接配置
              </h3>
              <p className="mt-1 text-[11px] text-[#6b7c93]">
                这里配置的是连弩观测服务。保存后可直接测试链路是否可达、认证是否生效。
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 ${
              traceTest.state === 'success'
                ? 'border-[#b8ebd0] bg-[#f2fff7] text-[#157f54]'
                : traceTest.state === 'fail'
                  ? 'border-[#fecdd3] bg-[#fff1f2] text-[#c2415c]'
                  : 'border-[#dbe4f0] bg-[#f8fbff] text-[#4f647d]'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium">观测链路状态</div>
                  <div className="mt-1 text-[11px] opacity-80">
                    {traceTest.message}
                    {typeof traceTest.latencyMs === 'number' ? ` · ${traceTest.latencyMs}ms` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={runTraceTest}
                  disabled={traceTest.state === 'testing'}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors ${
                    traceTest.state === 'testing'
                      ? 'bg-[#e8f1ff] text-[#0f6fff]'
                      : 'bg-white text-[#0f6fff] border border-[#c8d8ee] hover:border-[#0f6fff]'
                  }`}
                >
                  {traceTest.state === 'testing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                  {traceTest.state === 'testing' ? '测试中...' : '测试观测链路'}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fields.map(f => (
              <div key={f.key}>
                <label className="text-[11px] text-[#6b7c93] block mb-1">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={String(config[f.key])}
                  onChange={e => {
                    if (f.key === 'sampleRate') {
                      updateField(f.key, parseFloat(e.target.value) || 0);
                    } else {
                      updateField(f.key, e.target.value as TraceConfigForm[typeof f.key]);
                    }
                  }}
                  placeholder={f.placeholder}
                  className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] placeholder-[#93a1b2] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)] transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#dbe4f0] bg-white p-5 space-y-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-medium text-[#355070] flex items-center gap-2">
                <Cpu className="w-4 h-4" /> 问答服务配置
              </h3>
              <p className="text-[11px] text-[#6b7c93] mt-1">
                这里配置用户提问时实际调用的模型服务和知识库连接方式；如果不填写知识库编号，系统会使用当前账号可访问的全部知识库。
              </p>
            </div>
            <button
              onClick={() => updateModelServiceField('enabled', !modelService.enabled)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                modelService.enabled
                  ? 'bg-[#e9fff4] text-[#157f54] border border-[#b8ebd0]'
                  : 'bg-[#fff1f2] text-[#c2415c] border border-[#fecdd3]'
              }`}
            >
              {modelService.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {modelService.enabled ? '已启用' : '已禁用'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">服务类型</label>
              <select
                value={modelService.provider}
                onChange={e => updateModelServiceField('provider', e.target.value as ModelServiceConfigForm['provider'])}
                className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
              >
                <option value="coze_openai_compatible">Coze / OpenAI 兼容服务</option>
                <option value="custom_openai_compatible">自定义 OpenAI 兼容服务</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">最近更新时间</label>
              <div className="w-full min-h-[40px] bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#355070]">
                <ClientTime value={modelService.updatedAt} empty="未保存" />
              </div>
            </div>
            {modelFields.map(f => (
              <div key={f.key}>
                <label className="text-[11px] text-[#6b7c93] block mb-1">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={String(modelService[f.key] ?? '')}
                  onChange={e => updateModelServiceField(f.key, e.target.value as ModelServiceConfigForm[typeof f.key])}
                  placeholder={f.placeholder}
                  className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] placeholder-[#93a1b2] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)] transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {([
              {
                key: 'model' as const,
                label: '大模型连接状态',
                buttonLabel: '测试大模型连接',
              },
              {
                key: 'knowledge' as const,
                label: '知识库连接状态',
                buttonLabel: '测试知识库连接',
              },
              {
                key: 'dataki-admin' as const,
                label: '个人知识库授权状态',
                buttonLabel: '测试管理员授权',
              },
            ] satisfies Array<{ key: ServiceTestTarget; label: string; buttonLabel: string }>).map(item => {
              const current = serviceTest[item.key];
              const stateClass = current.state === 'success'
                ? 'border-[#b8ebd0] bg-[#f2fff7] text-[#157f54]'
                : current.state === 'fail'
                  ? 'border-[#fecdd3] bg-[#fff1f2] text-[#c2415c]'
                  : 'border-[#dbe4f0] bg-[#f8fbff] text-[#4f647d]';
              return (
                <div key={item.key} className={`rounded-2xl border p-4 ${stateClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium">{item.label}</div>
                      <div className="mt-1 text-[11px] opacity-80">
                        {current.message}
                        {typeof current.latencyMs === 'number' ? ` · ${current.latencyMs}ms` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => runServiceTest(item.key)}
                      disabled={current.state === 'testing'}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors ${
                        current.state === 'testing'
                          ? 'bg-[#e8f1ff] text-[#0f6fff]'
                          : 'bg-white text-[#0f6fff] border border-[#c8d8ee] hover:border-[#0f6fff]'
                      }`}
                    >
                      {current.state === 'testing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                      {current.state === 'testing' ? '测试中...' : item.buttonLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#10233f]">模型列表</h4>
                <p className="mt-1 text-[11px] leading-5 text-[#6b7c93]">
                  先维护可用模型，再在每个调用点选择使用默认模型或指定模型。未指定时只使用默认模型，不按业务场景写死优先级。
                </p>
              </div>
              <button
                type="button"
                onClick={addModelProfile}
                className="rounded-xl border border-[#c8d8ee] bg-white px-3 py-2 text-[11px] font-medium text-[#0f6fff] hover:border-[#0f6fff]"
              >
                新增模型
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {modelProfiles.map(profile => {
                const isDefault = profile.id === (modelService.defaultModelProfileId || modelProfiles[0]?.id);
                return (
                  <div key={profile.id} className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        value={profile.name}
                        onChange={event => updateModelProfile(profile.id, { name: event.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-[#dbe4f0] bg-[#f8fbff] px-2 py-1.5 text-xs font-medium text-[#10233f]"
                      />
                      <button
                        type="button"
                        onClick={() => updateModelProfile(profile.id, { enabled: !profile.enabled })}
                        className={`rounded-full px-2 py-1 text-[11px] ${profile.enabled ? 'bg-[#e9fff4] text-[#157f54]' : 'bg-[#eef2f7] text-[#6b7c93]'}`}
                      >
                        {profile.enabled ? '启用' : '停用'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDefaultModelProfile(profile.id)}
                        className={`rounded-full px-2 py-1 text-[11px] ${isDefault ? 'bg-[#e8f1ff] text-[#0f6fff]' : 'bg-[#eef2f7] text-[#6b7c93]'}`}
                      >
                        {isDefault ? '默认' : '设为默认'}
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {([
                        { key: 'providerLabel', label: '服务名称', type: 'text', placeholder: 'OpenAI 兼容服务' },
                        { key: 'modelName', label: '模型名称', type: 'text', placeholder: 'gpt-4.1 / doubao...' },
                        { key: 'apiKey', label: '访问密钥', type: 'password', placeholder: 'sk-...' },
                        { key: 'baseUrl', label: '服务地址', type: 'text', placeholder: 'https://gateway.example.com' },
                        { key: 'modelBaseUrl', label: '模型地址', type: 'text', placeholder: 'https://gateway.example.com/v1' },
                        { key: 'notes', label: '备注', type: 'text', placeholder: '适用场景或限制' },
                      ] as const).map(field => (
                        <label key={field.key} className="block">
                          <span className="mb-1 block text-[11px] text-[#6b7c93]">{field.label}</span>
                          <input
                            type={field.type}
                            value={String(profile[field.key] || '')}
                            onChange={event => updateModelProfile(profile.id, { [field.key]: event.target.value } as Partial<ModelProfileConfig>)}
                            placeholder={field.placeholder}
                            className="w-full rounded-lg border border-[#dbe4f0] bg-[#f8fbff] px-2 py-1.5 text-[11px] text-[#10233f]"
                          />
                        </label>
                      ))}
                      <label className="block">
                        <span className="mb-1 block text-[11px] text-[#6b7c93]">服务类型</span>
                        <select
                          value={profile.provider}
                          onChange={event => updateModelProfile(profile.id, { provider: event.target.value as ModelProfileConfig['provider'] })}
                          className="w-full rounded-lg border border-[#dbe4f0] bg-[#f8fbff] px-2 py-1.5 text-[11px] text-[#10233f]"
                        >
                          <option value="coze_openai_compatible">Coze / OpenAI 兼容服务</option>
                          <option value="custom_openai_compatible">自定义 OpenAI 兼容服务</option>
                        </select>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#10233f]">模型用途矩阵</h4>
                <p className="mt-1 text-[11px] leading-5 text-[#6b7c93]">
                  每个调用点都可单独配置启用状态、调用方式、模型名称、统一模型网关、异常处理和运行记录策略。
                </p>
              </div>
              <div className="text-[11px] text-[#8ea0b8]">
                已登记 {modelUseCases.length} 个调用点
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[1320px] w-full border-separate border-spacing-0 text-left text-[11px]">
                <thead>
                  <tr className="text-[#6b7c93]">
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">调用点</th>
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">状态</th>
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">启用</th>
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">调用方式</th>
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">模型</th>
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">统一模型网关</th>
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">数据策略</th>
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">生成参数</th>
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">兜底</th>
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">追踪</th>
                    <th className="border-b border-[#dbe4f0] px-3 py-2 font-medium">提示</th>
                  </tr>
                </thead>
                <tbody>
                  {modelUseCases.map((item) => {
                    const route = routeByUseCase.get(item.useCase);
                    const configuredRoute = modelService.routes?.[item.useCase];
                    return (
                      <tr key={item.useCase} className="align-top text-[#36506f]">
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          <div className="font-medium text-[#10233f]">{item.displayName}</div>
                          <div className="mt-1 font-mono text-[10px] text-[#8ea0b8]">{item.useCase}</div>
                          <div className="mt-1 max-w-[220px] leading-4 text-[#6b7c93]">{item.description}</div>
                        </td>
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          <span className="rounded-full border border-[#dbe4f0] bg-white px-2 py-0.5">{item.currentStatus}</span>
                        </td>
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          <button
                            type="button"
                            onClick={() => updateModelRoute(item.useCase, { enabled: !(configuredRoute?.enabled ?? route?.enabled ?? item.defaultEnabled) })}
                            className={`rounded-full px-2 py-1 ${
                              configuredRoute?.enabled ?? route?.enabled
                                ? 'bg-[#e9fff4] text-[#157f54]'
                                : 'bg-[#eef2f7] text-[#6b7c93]'
                            }`}
                          >
                            {configuredRoute?.enabled ?? route?.enabled ? '启用' : '停用'}
                          </button>
                        </td>
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          <select
                            value={configuredRoute?.routeMode || route?.routeMode || 'disabled'}
                            onChange={event => updateModelRoute(item.useCase, { routeMode: event.target.value as ModelRouteConfig['routeMode'] })}
                            className="w-full min-w-[150px] rounded-lg border border-[#dbe4f0] bg-white px-2 py-1.5 text-[11px]"
                          >
                            {item.allowedRouteModes.map(mode => (
                              <option key={mode} value={mode}>{mode}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          <select
                            value={configuredRoute?.modelProfileId || ''}
                            onChange={event => updateModelRoute(item.useCase, { modelProfileId: event.target.value || undefined, modelName: undefined })}
                            className="w-full min-w-[180px] rounded-lg border border-[#dbe4f0] bg-white px-2 py-1.5 text-[11px]"
                          >
                            <option value="">默认模型</option>
                            {modelProfiles.map(profile => (
                              <option key={profile.id} value={profile.id}>{profile.name} · {profile.modelName || '未填写模型名'}</option>
                            ))}
                          </select>
                          <div className="mt-1 text-[10px] text-[#8ea0b8]">
                            {route?.modelProfileName || '默认模型'} · {route?.modelName || '未生效'} · {route?.source || 'disabled'}
                          </div>
                        </td>
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(configuredRoute?.gateway?.enabled ?? route?.gatewayEnabled)}
                              onChange={event => updateModelRoute(item.useCase, {
                                gateway: {
                                  ...(configuredRoute?.gateway || { enabled: false }),
                                  enabled: event.target.checked,
                                },
                              })}
                            />
                            <span>网关控制</span>
                          </div>
                          <input
                            value={configuredRoute?.gateway?.gatewayName ?? route?.gatewayName ?? ''}
                            onChange={event => updateModelRoute(item.useCase, {
                              gateway: {
                                ...(configuredRoute?.gateway || { enabled: false }),
                                gatewayName: event.target.value,
                              },
                            })}
                            placeholder="由管理中心配置的模型网关"
                            className="mt-2 w-full min-w-[170px] rounded-lg border border-[#dbe4f0] bg-white px-2 py-1.5 text-[11px]"
                          />
                          <input
                            value={configuredRoute?.gateway?.policyId ?? route?.policyId ?? ''}
                            onChange={event => updateModelRoute(item.useCase, {
                              gateway: {
                                ...(configuredRoute?.gateway || { enabled: false }),
                                policyId: event.target.value,
                              },
                            })}
                            placeholder="策略编号"
                            className="mt-2 w-full min-w-[170px] rounded-lg border border-[#dbe4f0] bg-white px-2 py-1.5 text-[11px]"
                          />
                        </td>
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean((configuredRoute?.dataPolicy ?? route?.dataPolicy)?.allowExternalModel)}
                              onChange={event => updateModelRoute(item.useCase, {
                                dataPolicy: {
                                  ...(configuredRoute?.dataPolicy || route?.dataPolicy),
                                  dataClass: (configuredRoute?.dataPolicy || route?.dataPolicy)?.dataClass || 'internal',
                                  requireDesensitization: (configuredRoute?.dataPolicy || route?.dataPolicy)?.requireDesensitization ?? false,
                                  auditRequired: (configuredRoute?.dataPolicy || route?.dataPolicy)?.auditRequired ?? true,
                                  allowExternalModel: event.target.checked,
                                },
                              })}
                            />
                            <span>允许调用外部模型</span>
                          </label>
                          <select
                            value={(configuredRoute?.dataPolicy || route?.dataPolicy)?.dataClass || 'internal'}
                            onChange={event => updateModelRoute(item.useCase, {
                              dataPolicy: {
                                ...(configuredRoute?.dataPolicy || route?.dataPolicy),
                                dataClass: event.target.value as NonNullable<ModelRouteConfig['dataPolicy']>['dataClass'],
                                requireDesensitization: (configuredRoute?.dataPolicy || route?.dataPolicy)?.requireDesensitization ?? false,
                                allowExternalModel: (configuredRoute?.dataPolicy || route?.dataPolicy)?.allowExternalModel ?? true,
                                auditRequired: (configuredRoute?.dataPolicy || route?.dataPolicy)?.auditRequired ?? true,
                              },
                            })}
                            className="mt-2 w-full min-w-[150px] rounded-lg border border-[#dbe4f0] bg-white px-2 py-1.5 text-[11px]"
                          >
                            <option value="public">公开数据</option>
                            <option value="internal">内部数据</option>
                            <option value="confidential">保密数据</option>
                            <option value="restricted">受限数据</option>
                          </select>
                          <label className="mt-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean((configuredRoute?.dataPolicy || route?.dataPolicy)?.requireDesensitization)}
                              onChange={event => updateModelRoute(item.useCase, {
                                dataPolicy: {
                                  ...(configuredRoute?.dataPolicy || route?.dataPolicy),
                                  dataClass: (configuredRoute?.dataPolicy || route?.dataPolicy)?.dataClass || 'internal',
                                  allowExternalModel: (configuredRoute?.dataPolicy || route?.dataPolicy)?.allowExternalModel ?? true,
                                  auditRequired: (configuredRoute?.dataPolicy || route?.dataPolicy)?.auditRequired ?? true,
                                  requireDesensitization: event.target.checked,
                                },
                              })}
                            />
                            <span>调用前脱敏</span>
                          </label>
                        </td>
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          <div className="grid min-w-[190px] grid-cols-2 gap-2">
                            <label>
                              <span className="mb-1 block text-[#6b7c93]">等待毫秒</span>
                              <input
                                type="number"
                                min={1000}
                                value={(configuredRoute?.generationParams || route?.generationParams)?.timeoutMs ?? 12000}
                                onChange={event => updateModelRoute(item.useCase, {
                                  generationParams: {
                                    ...(configuredRoute?.generationParams || route?.generationParams),
                                    timeoutMs: Number(event.target.value || 12000),
                                  },
                                })}
                                className="w-full rounded-lg border border-[#dbe4f0] bg-white px-2 py-1.5 text-[11px]"
                              />
                            </label>
                            <label>
                              <span className="mb-1 block text-[#6b7c93]">输出上限</span>
                              <input
                                type="number"
                                min={128}
                                value={(configuredRoute?.generationParams || route?.generationParams)?.maxTokens ?? 1200}
                                onChange={event => updateModelRoute(item.useCase, {
                                  generationParams: {
                                    ...(configuredRoute?.generationParams || route?.generationParams),
                                    maxTokens: Number(event.target.value || 1200),
                                  },
                                })}
                                className="w-full rounded-lg border border-[#dbe4f0] bg-white px-2 py-1.5 text-[11px]"
                              />
                            </label>
                          </div>
                          <div className="mt-2 flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={Boolean((configuredRoute?.generationParams || route?.generationParams)?.jsonMode)}
                                onChange={event => updateModelRoute(item.useCase, {
                                  generationParams: {
                                    ...(configuredRoute?.generationParams || route?.generationParams),
                                    jsonMode: event.target.checked,
                                  },
                                })}
                              />
                              <span>JSON 输出</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <span className="text-[#6b7c93]">温度</span>
                              <input
                                type="number"
                                min={0}
                                max={2}
                                step={0.1}
                                value={(configuredRoute?.generationParams || route?.generationParams)?.temperature ?? 0.2}
                                onChange={event => updateModelRoute(item.useCase, {
                                  generationParams: {
                                    ...(configuredRoute?.generationParams || route?.generationParams),
                                    temperature: Number(event.target.value || 0.2),
                                  },
                                })}
                                className="w-16 rounded-lg border border-[#dbe4f0] bg-white px-2 py-1.5 text-[11px]"
                              />
                            </label>
                          </div>
                        </td>
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          <div>{route?.fallback.fallbackMode || 'template'}</div>
                          <div className="mt-1 text-[10px] text-[#8ea0b8]">{route?.fallbackUsed ? '已使用兜底' : '未使用兜底'}</div>
                        </td>
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          <div>{route?.hasModelSpan ? '已记录模型调用' : '未记录模型调用'}</div>
                          <div className="mt-1 text-[10px] text-[#8ea0b8]">{route?.tracePolicy.recordAnswerOrigin ? '记录来源' : '不记录来源'}</div>
                        </td>
                        <td className="border-b border-[#e6edf7] px-3 py-3">
                          {(route?.warnings || []).length ? (
                            <div className="max-w-[220px] space-y-1 text-[#b7791f]">
                              {route?.warnings.map((warning, index) => (
                                <div key={`${item.useCase}-warning-${index}`}>{warning}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#8ea0b8]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#6b7c93] block mb-1">备注</label>
            <textarea
              value={modelService.notes}
              onChange={e => updateModelServiceField('notes', e.target.value)}
              placeholder="例如：生产环境走统一 AI 网关，模型地址需包含 /v1"
              className="w-full min-h-[96px] bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] placeholder-[#93a1b2] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Sampling & Env */}
        <div className="rounded-2xl border border-[#dbe4f0] bg-white p-5 space-y-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
              <h3 className="text-sm font-medium text-[#355070] flex items-center gap-2">
                <Target className="w-4 h-4" /> 观测采样与环境
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">运行环境</label>
              <select
                value={config.env}
                onChange={e => updateField('env', e.target.value as TraceConfigForm['env'])}
                className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
              >
                <option value="test">test (100%采样)</option>
                <option value="pre">pre (100%采样)</option>
                <option value="prod">prod (按采样率)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#6b7c93] block mb-1">采样率 (0-1)</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={config.sampleRate}
                onChange={e => updateField('sampleRate', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#f8fbff] border border-[#dbe4f0] rounded-xl px-3 py-2.5 text-xs text-[#10233f] focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
              />
            </div>
          </div>
        </div>

        {/* Span Structure Info */}
        <div className="rounded-2xl border border-[#dbe4f0] bg-white p-5 space-y-3 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
          <h3 className="text-sm font-medium text-[#355070] flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> 观测链路结构
          </h3>
          <div className="overflow-x-auto text-[11px] text-[#5f6f86] font-mono leading-6 bg-[#f8fbff] rounded-xl p-4 border border-[#e5edf7]">
            <div className="text-[#0f6fff]">xiaoqiao.zhitou.chat</div>
            <div className="ml-4 text-[#157f54]">├── xiaoqiao.zhitou.llm <span className="text-[#8ea0b8]">(model)</span></div>
            <div className="ml-4 text-[#b7791f]">├── xiaoqiao.zhitou.tool <span className="text-[#8ea0b8]">(tool - 知识库 / 搜索)</span></div>
            <div className="ml-4 text-[#c2415c]">├── xiaoqiao.zhitou.mcp <span className="text-[#8ea0b8]">(tool - 外部服务)</span></div>
            <div className="ml-4 text-[#157f54]">└── xiaoqiao.zhitou.llm <span className="text-[#8ea0b8]">(model - 最终回复)</span></div>
          </div>
          <p className="text-[10px] text-[#8ea0b8]">观测服务会记录关键调用节点，用于排查连接、模型调用和外部服务状态。</p>
        </div>

        {/* Status */}
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
          config.enabled
            ? 'border-[#b8ebd0] bg-[#f2fff7]'
            : 'border-[#dbe4f0] bg-white'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${config.enabled ? 'bg-[#22c55e]' : 'bg-[#94a3b8]'}`} />
          <span className="text-xs text-[#4f647d]">
            {config.enabled
              ? `观测已启用 · ${config.env} 环境 · 采样率 ${(config.sampleRate * 100).toFixed(0)}%`
              : '观测未启用 · 需填写服务地址、工作区编号和访问令牌后启用'}
          </span>
        </div>

        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
          serviceTest.model.state === 'success'
            ? 'border-[#b8ebd0] bg-[#f2fff7]'
            : 'border-[#fde68a] bg-[#fffaf0]'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            serviceTest.model.state === 'success'
              ? 'bg-[#22c55e]'
              : 'bg-[#f59e0b]'
          }`} />
          <span className="text-xs text-[#4f647d]">
            {serviceTest.model.state === 'success'
              ? `聊天服务已接通 · ${modelService.providerLabel} · 模型 ${modelService.modelName}`
              : serviceTest.model.state === 'fail'
                ? `聊天服务测试失败 · ${serviceTest.model.message}`
                : '聊天服务尚未验证。请保存配置后执行大模型连接测试。'}
          </span>
        </div>

        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
          serviceTest.knowledge.state === 'success'
            ? 'border-[#b8ebd0] bg-[#f2fff7]'
            : 'border-[#dbe4f0] bg-white'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            serviceTest.knowledge.state === 'success'
              ? 'bg-[#22c55e]'
              : serviceTest.knowledge.state === 'fail'
                ? 'bg-[#ef4444]'
                : 'bg-[#94a3b8]'
          }`} />
          <span className="text-xs text-[#4f647d]">
            {serviceTest.knowledge.state === 'success'
              ? (modelService.knowledgeBaseDataset
                ? `知识库已接通 · 知识库 ID ${modelService.knowledgeBaseDataset}`
                : '知识库已接通 · 当前按账号可访问范围自动检索')
              : serviceTest.knowledge.state === 'fail'
                ? `知识库测试失败 · ${serviceTest.knowledge.message}`
                : '知识库尚未验证。请补齐知识库地址和知识库 Key；知识库 ID 可选，留空时自动按账号权限覆盖全部可访问知识库。'}
          </span>
        </div>
        </div>
      </div>
      </div>
    </AdminCrudShell>
  );
}

export { TraceConfigTab };
