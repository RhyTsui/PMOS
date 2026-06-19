'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search, ChevronRight, Globe, Smartphone, Save, X, Edit3, Pause, Play,
  Shield, Cpu, Settings, Timer, MessageSquare, RotateCcw, AlertTriangle, Zap,
} from 'lucide-react';
import {
  defaultDebugRuntimeConfig,
  normalizeDebugAutomationConfigItem,
  readClientStorage,
  writeClientStorage,
  ADMIN_DEBUG_CONFIG_STORAGE_KEY,
  platformLabels,
  environmentLabels,
  executorTypeLabels,
  executorTypeStyles,
  type DebugAutomationConfigItem,
} from './admin-tab-helpers';
import {
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function AutoDebugConfigTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMedia, setFilterMedia] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterEnv, setFilterEnv] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [debugConfigs, setDebugConfigs] = useState<DebugAutomationConfigItem[]>([]);
  const [selectedConfigId, setSelectedConfigIdRaw] = useState<string | null>(() => readClientStorage(ADMIN_DEBUG_CONFIG_STORAGE_KEY));
  const [detailTab, setDetailTab] = useState<'runtime' | 'keywords' | 'timeout' | 'instruction'>('runtime');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const setSelectedConfigId = (id: string | null) => {
    setSelectedConfigIdRaw(id);
    writeClientStorage(ADMIN_DEBUG_CONFIG_STORAGE_KEY, id);
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setLoadError('');
        const response = await fetch('/api/xiaoqiao/admin/debug-automation/configs', { cache: 'no-store' });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json() as DebugAutomationConfigItem[];
        const next = Array.isArray(data) ? data.map(item => normalizeDebugAutomationConfigItem(item)) : [];
        setDebugConfigs(next);
        setSelectedConfigIdRaw(current => current && next.some(item => item.id === current) ? current : next[0]?.id || null);
      } catch {
        setDebugConfigs([]);
        setSelectedConfigIdRaw(null);
        setLoadError('联调配置读取失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredConfigs = debugConfigs.filter((c) => {
    const matchSearch = c.name.includes(searchTerm) || c.media.includes(searchTerm);
    const matchMedia = filterMedia === 'all' || c.media === filterMedia;
    const matchPlatform = filterPlatform === 'all' || c.platform === filterPlatform || (filterPlatform === 'both' && c.platform === 'both');
    const matchEnv = filterEnv === 'all' || c.environment === filterEnv;
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchMedia && matchPlatform && matchEnv && matchStatus;
  });

  const selectedConfig = debugConfigs.find(c => c.id === selectedConfigId) || null;
  const uniqueMedias = [...new Set(debugConfigs.map(c => c.media))];

  const onUpdateConfig = (id: string, patch: Partial<DebugAutomationConfigItem>) => {
    const before = debugConfigs.find(item => item.id === id);
    if (!before) return;
    const nextItem = normalizeDebugAutomationConfigItem({
      ...before,
      ...patch,
      updated_at: new Date().toISOString(),
    });
    setDebugConfigs(prev => prev.map(item => item.id === id ? nextItem : item));
    setSaveState('saving');
    void fetch(`/api/xiaoqiao/admin/debug-automation/configs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextItem),
    }).then(async (response) => {
      if (!response.ok) throw new Error(await response.text());
      const saved = await response.json() as DebugAutomationConfigItem;
      setDebugConfigs(prev => prev.map(item => item.id === id ? normalizeDebugAutomationConfigItem(saved) : item));
      setSaveState('saved');
    }).catch(() => {
      setDebugConfigs(prev => prev.map(item => item.id === id ? before : item));
      setSaveState('error');
    });
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DebugAutomationConfigItem | null>(null);

  useEffect(() => {
    setEditing(false);
    setDraft(selectedConfig ? {
      ...selectedConfig,
      media_config: { ...defaultDebugRuntimeConfig.media_config, ...(selectedConfig.media_config || {}) },
      channel_config: { ...defaultDebugRuntimeConfig.channel_config, ...(selectedConfig.channel_config || {}) },
      game_config: { ...defaultDebugRuntimeConfig.game_config, ...(selectedConfig.game_config || {}) },
      mobile_env: { ...defaultDebugRuntimeConfig.mobile_env, ...(selectedConfig.mobile_env || {}) },
    } : null);
  }, [selectedConfig?.id]);

  const activeConfig = draft || selectedConfig;
  const updateDraftGroup = <K extends 'media_config' | 'channel_config' | 'game_config' | 'mobile_env'>(
    group: K,
    key: keyof NonNullable<DebugAutomationConfigItem[K]>,
    value: string | number,
  ) => {
    setDraft(prev => prev ? ({
      ...prev,
      [group]: {
        ...defaultDebugRuntimeConfig[group],
        ...(prev[group] || {}),
        [key]: value,
      },
    }) : prev);
  };

  const saveDraft = () => {
    if (!draft) return;
    onUpdateConfig(draft.id, draft);
    setEditing(false);
  };
  const dbgConfigStatusStyles: Record<string, string> = {
    active: 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]',
    inactive: 'bg-[rgba(100,116,139,0.15)] text-[#64748B]',
    draft: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]',
  };
  const dbgConfigStatusLabels: Record<string, string> = {
    active: '已启用',
    inactive: '已停用',
    draft: '草稿',
  };
  const stageLabels: Record<string, string> = {
    web_prepare: 'Web准备',
    mobile_scan: '移动端扫码',
    mobile_find_ad: '查找广告',
    mobile_launch: '启动应用',
    success_poll: '成功轮询',
  };

  return (
    <AdminCrudShell className="overflow-hidden">
      <AdminCrudHeader
        title="联调配置"
        description="维护自动联调模板、默认参数、关键词、超时和用户提示文案。"
        saveState={saveState}
      />
      {loadError ? (
        <AdminCrudErrorState description={loadError} />
      ) : null}
      {loading ? (
        <AdminCrudListSkeleton rows={5} />
      ) : (
    <div className="flex min-h-[640px] overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      {/* Left Column - Filters */}
      <div className="flex w-56 flex-col border-r border-[#e8eef7] bg-[#fbfdff]">
        <div className="p-4">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2">
            <Search className="w-3.5 h-3.5 text-[#5a6a8a]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索配置..."
              className="flex-1 border-none bg-transparent text-xs text-[#355070] outline-none placeholder:text-[#9aa8bb]"
            />
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider mb-2 px-2">媒体筛选</div>
            <button
              onClick={() => setFilterMedia('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                filterMedia === 'all' ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              <span>全部媒体</span>
            </button>
            {uniqueMedias.map((media) => (
              <button
                key={media}
                onClick={() => setFilterMedia(media)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  filterMedia === media ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <span>{media}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 mt-4">
            <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider mb-2 px-2">终端筛选</div>
            {['all', 'android', 'ios', 'both'].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  filterPlatform === p ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <span>{p === 'all' ? '全部终端' : platformLabels[p]}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 mt-4">
            <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider mb-2 px-2">环境筛选</div>
            {['all', 'production', 'staging', 'test'].map((e) => (
              <button
                key={e}
                onClick={() => setFilterEnv(e)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  filterEnv === e ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <span>{e === 'all' ? '全部环境' : environmentLabels[e]}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 mt-4">
            <div className="text-[10px] text-[#5a6a8a] uppercase tracking-wider mb-2 px-2">状态筛选</div>
            {['all', 'active', 'inactive', 'draft'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  filterStatus === s ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' : 'text-[#8B9DC3] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <span>{s === 'all' ? '全部状态' : dbgConfigStatusLabels[s]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Column - Config List */}
      <div className="flex w-80 flex-col border-r border-[#e8eef7] bg-white">
        <div className="border-b border-[#edf3fb] px-4 py-3">
          <div className="text-xs text-[#5a6a8a]">共 {filteredConfigs.length} 个配置模板</div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConfigs.map((cfg) => (
            <button
              key={cfg.id}
              onClick={() => setSelectedConfigId(cfg.id)}
              className={`w-full text-left p-4 border-b border-[rgba(255,255,255,0.04)] transition-colors ${
                selectedConfigId === cfg.id
                  ? 'bg-[#f5f9ff] border-l-2 border-l-[#0f6fff]'
                  : 'hover:bg-[#fafcff]'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className={`text-sm font-medium ${selectedConfigId === cfg.id ? 'text-[#0f6fff]' : 'text-[#10233f]'}`}>
                  {cfg.name}
                </h3>
                <ChevronRight className="w-3.5 h-3.5 text-[#5a6a8a] mt-0.5" />
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="flex items-center gap-1 text-[11px] text-[#8B9DC3]">
                  <Globe className="w-3 h-3" /> {cfg.media}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-[#8B9DC3]">
                  <Smartphone className="w-3 h-3" /> {platformLabels[cfg.platform]}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${dbgConfigStatusStyles[cfg.status]}`}>
                  {dbgConfigStatusLabels[cfg.status]}
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${executorTypeStyles[cfg.executor_type]}`}>
                  {executorTypeLabels[cfg.executor_type]}
                </span>
              </div>
            </button>
          ))}
          {filteredConfigs.length === 0 && (
            <div className="text-center py-12 text-[#5a6a8a] text-sm">没有匹配的配置</div>
          )}
        </div>
      </div>

      {/* Right Column - Config Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConfig ? (
          <>
            <div className="border-b border-[#edf3fb] bg-white px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-[#10233f]">{selectedConfig.name}</h2>
                <div className="flex items-center gap-2">
                  {editing ? (
                    <>
                      <button
                        onClick={saveDraft}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#0f6fff] transition-colors hover:bg-[#f3f8ff]"
                      >
                        <Save className="w-3.5 h-3.5" /> 保存
                      </button>
                      <button
                        onClick={() => { setEditing(false); setDraft(selectedConfig); }}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#5f6f86] transition-colors hover:bg-[#f3f8ff]"
                      >
                        <X className="w-3.5 h-3.5" /> 取消
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setDraft(selectedConfig); setEditing(true); }}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#5f6f86] transition-colors hover:bg-[#f3f8ff] hover:text-[#0f6fff]"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> 编辑
                    </button>
                  )}
                    <button
                      onClick={() => onUpdateConfig(selectedConfig.id, { status: selectedConfig.status === 'active' ? 'inactive' : 'active' })}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#5f6f86] transition-colors hover:bg-[#f3f8ff] hover:text-[#0f6fff]"
                    >
                    {selectedConfig.status === 'active' ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-[#FFB800]" /> 停用
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-[#00FF88]" /> 启用
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#5a6a8a]">
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {selectedConfig.media}</span>
                <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {platformLabels[selectedConfig.platform]}</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {environmentLabels[selectedConfig.environment]}</span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {executorTypeLabels[selectedConfig.executor_type]}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${dbgConfigStatusStyles[selectedConfig.status]}`}>
                  {dbgConfigStatusLabels[selectedConfig.status]}
                </span>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="border-b border-[#edf3fb] bg-white px-6">
              <div className="flex gap-1">
                {[
                  { key: 'runtime' as const, label: '联调参数', icon: Settings },
                  { key: 'keywords' as const, label: '关键词配置', icon: Search },
                  { key: 'timeout' as const, label: '超时配置', icon: Timer },
                  { key: 'instruction' as const, label: '说明文案', icon: MessageSquare },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setDetailTab(key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
                      detailTab === key ? 'text-[#00D9FF] border-[#00D9FF]' : 'text-[#5a6a8a] border-transparent hover:text-[#8B9DC3]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {detailTab === 'runtime' && activeConfig && (
                <div className="space-y-6">
                  {([
                    {
                      key: 'media_config' as const,
                      title: '媒体账号与事件资产',
                      fields: [
                        ['username', '账号'],
                        ['password', '密码'],
                        ['default_account', '默认账户'],
                        ['event_asset_url', '事件资产地址'],
                        ['postback_result_view', '回传查看位置'],
                        ['aadvid', '广告主ID'],
                        ['target_channel', '目标渠道包'],
                      ],
                    },
                    {
                      key: 'channel_config' as const,
                      title: '渠道端执行参数',
                      fields: [
                        ['app_package', '媒体应用包名'],
                        ['app_activity', '启动Activity'],
                        ['deeplink', '扫码DeepLink'],
                        ['auth_keyword', '授权关键词'],
                        ['feed_keyword', '广告关键词'],
                        ['action_keyword', '动作关键词'],
                        ['max_swipe_count', '最大滑动次数'],
                        ['keyword_settle_seconds', '关键词停留秒数'],
                        ['install_password', '安装密码'],
                        ['game_package', '游戏包名'],
                      ],
                    },
                    {
                      key: 'game_config' as const,
                      title: '游戏登录参数',
                      fields: [
                        ['package_name', '游戏包名'],
                        ['login_type', '登录方式'],
                        ['account', '测试账号'],
                        ['password', '测试密码'],
                      ],
                    },
                    {
                      key: 'mobile_env' as const,
                      title: '移动设备环境',
                      fields: [
                        ['device_id', '设备ID'],
                      ],
                    },
                  ]).map((group) => {
                    const values = {
                      ...defaultDebugRuntimeConfig[group.key],
                      ...(activeConfig[group.key] || {}),
                    } as Record<string, string | number>;
                    return (
                      <section key={group.key} className="space-y-3">
                        <div>
                          <div className="text-sm font-semibold text-[#10233f]">{group.title}</div>
                          <div className="mt-1 text-xs text-[#6b7c93]">这里维护默认参数。用户发起联调时只需要选择项目、媒体、应用包和联调目标。</div>
                        </div>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                          {group.fields.map(([field, label]) => (
                            <label key={`${group.key}-${field}`} className="flex flex-col gap-1.5">
                              <span className="text-[11px] text-[#6b7c93]">{label}</span>
                              {editing ? (
                                <input
                                  type={String(field).includes('password') ? 'password' : 'text'}
                                  value={String(values[field] ?? '')}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    const nextValue = ['max_swipe_count', 'keyword_settle_seconds'].includes(String(field)) ? Number(raw || 0) : raw;
                                    updateDraftGroup(group.key, field as never, nextValue);
                                  }}
                                  className="h-9 rounded-xl border border-[#dbe4f0] bg-white px-3 text-xs text-[#10233f] outline-none focus:border-[#0f6fff]"
                                />
                              ) : (
                                <div className="min-h-9 rounded-xl px-3 py-2 text-xs text-[#10233f]">
                                  {String(field).includes('password') && values[field] ? '••••••••' : String(values[field] || '未配置')}
                                </div>
                              )}
                            </label>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              {detailTab === 'keywords' && (
                <div className="space-y-4">
                  <div className="text-xs text-[#5a6a8a] mb-2">触发关键词规则</div>
                  {selectedConfig.keywords.map((kw, idx) => (
                    <div key={idx} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          kw.match_type === 'exact' ? 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]'
                            : kw.match_type === 'contains' ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]'
                              : 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]'
                        }`}>
                          {kw.match_type === 'exact' ? '精确匹配' : kw.match_type === 'contains' ? '包含匹配' : '正则匹配'}
                        </span>
                      </div>
                      <code className="mb-2 block text-sm font-mono text-[#10233f]">{kw.pattern}</code>
                      <div className="text-[11px] text-[#5a6a8a]">{kw.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === 'timeout' && (
                <div className="space-y-4">
                  <div className="text-xs text-[#5a6a8a] mb-2">阶段超时与重试配置</div>
                  {selectedConfig.timeout_config.map((tc, idx) => (
                    <div key={idx} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${idx < 3 ? 'bg-[#00D9FF]' : 'bg-[#FFB800]'}`} />
                          <span className="text-sm font-medium text-[#10233f]">
                            {stageLabels[tc.stage] || tc.stage}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-[#5a6a8a] mb-1">超时时间</div>
                          <div className="flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5 text-[#00D9FF]" />
                            <span className="text-sm text-[#10233f]">{tc.timeout_seconds}s</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#5a6a8a] mb-1">重试次数</div>
                          <div className="flex items-center gap-2">
                            <RotateCcw className="w-3.5 h-3.5 text-[#FFB800]" />
                            <span className="text-sm text-[#10233f]">{tc.retry_count} 次</span>
                          </div>
                        </div>
                      </div>
                      {/* Timeout progress bar */}
                      <div className="mt-3">
                        <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              tc.timeout_seconds > 100 ? 'bg-[#FFB800]' : tc.timeout_seconds > 60 ? 'bg-[#00D9FF]' : 'bg-[#00FF88]'
                            }`}
                            style={{ width: `${Math.min((tc.timeout_seconds / 180) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailTab === 'instruction' && (
                <div className="space-y-4">
                  <div className="text-xs text-[#5a6a8a] mb-2">联调说明文案</div>
                  <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#355070]">{selectedConfig.instruction_text}</pre>
                  </div>
                  <div className="p-4 rounded-xl bg-[rgba(255,184,0,0.05)] border border-[rgba(255,184,0,0.15)]">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-[#FFB800]" />
                      <span className="text-xs text-[#FFB800] font-medium">注意事项</span>
                    </div>
                    <div className="text-[11px] text-[#8B9DC3] space-y-1">
                      <p>1. 此文案将在联调开始前展示给用户</p>
                      <p>2. 请确保文案包含必要的准备条件和注意事项</p>
                      <p>3. 修改后需重新发布才生效</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#5a6a8a]">
                    <span>创建者: {selectedConfig.created_by}</span>
                    <span>更新时间: {selectedConfig.updated_at}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Zap className="w-10 h-10 text-[#2a3654] mx-auto mb-3" />
              <div className="text-sm text-[#5a6a8a]">选择左侧配置查看详情</div>
              <div className="text-[11px] text-[#3a4a6a] mt-1">关键词配置 / 超时配置 / 说明文案</div>
            </div>
          </div>
        )}
      </div>
    </div>
      )}
    </AdminCrudShell>
  );
}
