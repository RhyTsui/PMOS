'use client';

import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { Save, RefreshCw, Search, FileText, Key, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';
import {
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

interface SearchProviderConfig {
  id: string;
  kind: 'brave' | 'exa' | 'firecrawl' | 'legacy' | 'weather';
  label: string;
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  authType: 'bearer' | 'api_key_header' | 'custom_headers' | 'none';
  apiKeyHeader?: string;
  method: 'GET' | 'POST';
  capabilities: Array<'search' | 'deep_search' | 'fetch'>;
  timeoutMs?: number;
  maxResults?: number;
  fetchMode?: 'scrape' | 'extract';
}

interface OrchestratorConfig {
  enabled: boolean;
  maxFetchPages: number;
  maxResearchRounds: number;
  concurrency: number;
  timeoutMs: number;
}

interface PublicWebConfig {
  enabled: boolean;
  providerLabel: string;
  searchEndpoint: string;
  fetchEndpoint: string;
  apiKey: string;
  authType: string;
  method: string;
  maxResults: number;
  timeoutMs: number;
  sourceRequired: boolean;
  internalDataProtection: boolean;
  providers?: SearchProviderConfig[];
  orchestrator?: OrchestratorConfig;
}

const PROVIDER_INFO: Record<string, { name: string; icon: string; color: string; registerUrl: string; description: string }> = {
  tavily: {
    name: 'Tavily Search',
    icon: '🔍',
    color: '#2563eb',
    registerUrl: 'https://tavily.com/',
    description: 'AI 专用搜索引擎，每月 1000 次免费',
  },
  brave: {
    name: 'Brave Search',
    icon: '🦁',
    color: '#fb542b',
    registerUrl: 'https://brave.com/search/api/',
    description: '主力实时搜索，每月 2000 次免费',
  },
  exa: {
    name: 'Exa Deep Search',
    icon: '🧠',
    color: '#6366f1',
    registerUrl: 'https://exa.ai/',
    description: '语义深度搜索，注册赠送 $10 额度',
  },
  firecrawl: {
    name: 'Firecrawl Extract',
    icon: '🔥',
    color: '#f97316',
    registerUrl: 'https://www.firecrawl.dev/',
    description: '网页正文抓取，每月 500 次免费',
  },
  weather: {
    name: '天气查询（内置）',
    icon: '🌤️',
    color: '#0ea5e9',
    registerUrl: '',
    description: '内置天气查询，无需访问密钥',
  },
  legacy: {
    name: '旧版配置',
    icon: '📦',
    color: '#6b7280',
    registerUrl: '',
    description: '旧版端点配置',
  },
};

export function PublicWebConfigTab() {
  const [config, setConfig] = useState<PublicWebConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/xiaoqiao/admin/public-web-config');
      if (!response.ok) throw new Error('获取配置失败');
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSaveState('saving');
    try {
      const response = await fetch('/api/xiaoqiao/admin/public-web-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '保存失败');
      }
      const data = await response.json();
      setConfig(data.config);
      setSaveState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      setSaveState('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const updateProvider = (index: number, updates: Partial<SearchProviderConfig>) => {
    if (!config?.providers) return;
    const newProviders = [...config.providers];
    newProviders[index] = { ...newProviders[index], ...updates };
    setConfig({ ...config, providers: newProviders });
  };

  const handleApiKeySave = (index: number) => {
    if (!config?.providers) return;
    updateProvider(index, { apiKey: newKeyValue });
    setEditingKey(null);
    setNewKeyValue('');
  };

  if (loading) {
    return (
      <AdminCrudShell>
        <AdminCrudHeader
          title="公开网页检索配置"
          description="配置可用的公开搜索来源、访问密钥和多源编排策略。"
        />
        <div className="px-5 py-4">
          <AdminCrudListSkeleton rows={6} />
        </div>
      </AdminCrudShell>
    );
  }

  if (!config) {
    return (
      <AdminCrudShell>
        <AdminCrudHeader
          title="公开网页检索配置"
          description="配置可用的公开搜索来源、访问密钥和多源编排策略。"
          actions={<Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void fetchConfig()}>重新读取</Button>}
        />
        <AdminCrudErrorState
          description={error || '配置读取失败，请稍后重试。'}
          action={<Button size="small" onClick={() => void fetchConfig()}>重新读取</Button>}
        />
      </AdminCrudShell>
    );
  }

  const providers = config.providers || [];
  const orchestrator = config.orchestrator || {
    enabled: true,
    maxFetchPages: 3,
    maxResearchRounds: 2,
    concurrency: 3,
    timeoutMs: 12000,
  };

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="公开网页检索配置"
        description="配置可用的公开搜索来源、访问密钥和多源编排策略；保存后用于需要公开资料佐证的回答。"
        saveState={saveState}
        actions={(
          <>
            <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void fetchConfig()} disabled={loading || saving}>
              刷新
            </Button>
            <Button type="primary" icon={<Save className="h-4 w-4" />} onClick={() => void handleSave()} loading={saving}>
              保存配置
            </Button>
          </>
        )}
      />

      {error ? (
        <AdminCrudErrorState
          description={error}
          action={<Button size="small" onClick={() => void fetchConfig()}>重新读取</Button>}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-6">
          {/* Global Toggle */}
          <div className="rounded-xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[#10233f]">联网搜索总开关</h3>
                <p className="mt-1 text-sm text-[#6b7c93]">
                  关闭后，公开网页检索不会作为回答证据来源。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className="text-2xl"
              >
                {config.enabled ? (
                  <ToggleRight className="h-10 w-10 text-green-500" />
                ) : (
                  <ToggleLeft className="h-10 w-10 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Search providers */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-medium text-[#10233f]">
              <Search className="h-5 w-5" />
              搜索来源配置
            </h3>
            <p className="text-sm text-[#6b7c93]">
              配置多个搜索来源可提升可用性；某个来源不可用时，系统可使用备用来源继续取证。
            </p>

            <div className="grid gap-4">
              {providers.map((provider, index) => {
                const info = PROVIDER_INFO[provider.kind] || PROVIDER_INFO.legacy;
                const isApiKeyMasked = provider.apiKey === '******';
                const isEditing = editingKey === `${provider.id}-${index}`;

                return (
                  <div
                    key={`${provider.id}-${index}`}
                    className="rounded-xl border bg-white p-4"
                    style={{ borderLeftColor: info.color, borderLeftWidth: '4px' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{info.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-[#10233f]">{provider.label}</h4>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                              {provider.kind}
                            </span>
                            {provider.enabled ? (
                              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                已启用
                              </span>
                            ) : (
                              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                已停用
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-[#6b7c93]">{info.description}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateProvider(index, { enabled: !provider.enabled })}
                        className="text-2xl"
                      >
                        {provider.enabled ? (
                          <ToggleRight className="h-8 w-8 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-400" />
                        )}
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="w-24 text-sm text-[#6b7c93]">来源地址</label>
                        <code className="flex-1 truncate rounded bg-gray-100 px-2 py-1 text-xs">
                          {provider.endpoint || '(未配置)'}
                        </code>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="w-24 text-sm text-[#6b7c93]">可用能力</label>
                        <div className="flex gap-1">
                          {provider.capabilities.map(cap => (
                            <span
                              key={cap}
                              className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                            >
                              {cap === 'deep_search' ? '深度搜索' : cap === 'search' ? '搜索' : '抓取'}
                            </span>
                          ))}
                        </div>
                      </div>

                      {provider.kind !== 'weather' && (
                        <div className="flex items-center gap-2">
                          <label className="flex w-24 items-center gap-1 text-sm text-[#6b7c93]">
                            <Key className="h-4 w-4" />
                            访问密钥
                          </label>
                          {isEditing ? (
                            <div className="flex flex-1 gap-2">
                              <input
                                type="password"
                                value={newKeyValue}
                                onChange={e => setNewKeyValue(e.target.value)}
                                placeholder="输入新的访问密钥"
                                className="flex-1 rounded border px-3 py-1 text-sm"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleApiKeySave(index)}
                                className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
                              >
                                保存
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingKey(null); setNewKeyValue(''); }}
                                className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-1 items-center gap-2">
                              <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                                {isApiKeyMasked ? '****** (已配置)' : provider.apiKey ? '****** (已配置)' : '(未配置)'}
                              </code>
                              <button
                                type="button"
                                onClick={() => { setEditingKey(`${provider.id}-${index}`); setNewKeyValue(''); }}
                                className="text-sm text-blue-500 hover:text-blue-600"
                              >
                                {isApiKeyMasked || provider.apiKey ? '修改' : '配置'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-[#6b7c93]">最大结果数</label>
                          <input
                            type="number"
                            value={provider.maxResults || 8}
                            onChange={e => updateProvider(index, { maxResults: Number(e.target.value) })}
                            className="w-16 rounded border px-2 py-1 text-sm"
                            min={1}
                            max={20}
                          />
                        </div>
                        {provider.kind !== 'weather' && (
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-[#6b7c93]">超时时间</label>
                            <input
                              type="number"
                              value={provider.timeoutMs || 10000}
                              onChange={e => updateProvider(index, { timeoutMs: Number(e.target.value) })}
                              className="w-24 rounded border px-2 py-1 text-sm"
                              min={1000}
                              max={30000}
                              step={1000}
                            />
                          </div>
                        )}
                      </div>

                      {info.registerUrl && (
                        <div className="flex items-center gap-2 border-t pt-2">
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                          <a
                            href={info.registerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:text-blue-600"
                          >
                            前往申请 {info.name} 访问密钥
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Orchestrator Config */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-medium text-[#10233f]">
              <FileText className="h-5 w-5" />
              搜索编排配置
            </h3>

            <div className="space-y-4 rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[#10233f]">启用多源编排</h4>
                  <p className="text-sm text-[#6b7c93]">
                    多源编排负责协调搜索来源、去重、排序和正文提取。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({
                    ...config,
                    orchestrator: { ...orchestrator, enabled: !orchestrator.enabled },
                  })}
                  className="text-2xl"
                >
                  {orchestrator.enabled ? (
                    <ToggleRight className="h-10 w-10 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-10 w-10 text-gray-400" />
                  )}
                </button>
              </div>

              {orchestrator.enabled && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <label className="text-sm text-[#6b7c93]">最大抓取页面数</label>
                    <input
                      type="number"
                      value={orchestrator.maxFetchPages}
                      onChange={e => setConfig({
                        ...config,
                        orchestrator: { ...orchestrator, maxFetchPages: Number(e.target.value) },
                      })}
                      className="mt-1 w-full rounded border px-3 py-2"
                      min={0}
                      max={10}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#6b7c93]">最大研究轮次</label>
                    <input
                      type="number"
                      value={orchestrator.maxResearchRounds}
                      onChange={e => setConfig({
                        ...config,
                        orchestrator: { ...orchestrator, maxResearchRounds: Number(e.target.value) },
                      })}
                      className="mt-1 w-full rounded border px-3 py-2"
                      min={1}
                      max={5}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#6b7c93]">并发数</label>
                    <input
                      type="number"
                      value={orchestrator.concurrency}
                      onChange={e => setConfig({
                        ...config,
                        orchestrator: { ...orchestrator, concurrency: Number(e.target.value) },
                      })}
                      className="mt-1 w-full rounded border px-3 py-2"
                      min={1}
                      max={8}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#6b7c93]">超时时间</label>
                    <input
                      type="number"
                      value={orchestrator.timeoutMs}
                      onChange={e => setConfig({
                        ...config,
                        orchestrator: { ...orchestrator, timeoutMs: Number(e.target.value) },
                      })}
                      className="mt-1 w-full rounded border px-3 py-2"
                      min={1000}
                      max={30000}
                      step={1000}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminCrudShell>
  );
}
