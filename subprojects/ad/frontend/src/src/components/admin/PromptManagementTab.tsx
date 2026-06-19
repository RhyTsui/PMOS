'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Save, RotateCcw, Edit3, FileText, Clock, Tag, ChevronRight, X, ToggleRight, ToggleLeft, Settings, Cpu, GitBranch, Link2 } from 'lucide-react';
import {
  type PromptConfig,
  type AdminPromptListItem,
  type AdminPromptVersionItem,
  type PromptHealthSummary,
  PROMPT_LAYER_SCOPE_ORDER,
  ADMIN_PROMPT_SCOPE_LABELS,
  ADMIN_PROMPT_STORAGE_KEY,
  buildPromptView,
  readClientStorage,
  writeClientStorage,
  statusLabels,
  statusStyles,
  scopeLabels,
} from './admin-tab-helpers';
import { ClientTime } from './admin-menu';
import {
  AdminCrudEmptyState,
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

type DetailTab = 'content' | 'versions' | 'bindings';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function promptDisplayText(value: string): string {
  return value
    .replace(/\bPrompt\b/g, '提示词')
    .replace(/\bprompt\b/g, '提示词')
    .replace(/\bMCP\b/g, '外部服务')
    .replace(/\bAPI\b/g, '服务')
    .replace(/接口/g, '服务')
    .replace(/\bSchema\b/g, '结构')
    .replace(/\bschema\b/g, '结构');
}

export function PromptManagementTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [promptItems, setPromptItems] = useState<PromptConfig[]>([]);
  const [promptLoading, setPromptLoading] = useState(true);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptHealth, setPromptHealth] = useState<PromptHealthSummary | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [versionLoadedIds, setVersionLoadedIds] = useState<Set<string>>(() => new Set());
  const [selectedPromptId, setSelectedPromptIdRaw] = useState<string | null>(() => readClientStorage(ADMIN_PROMPT_STORAGE_KEY));
  const [detailTab, setDetailTab] = useState<DetailTab>('content');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [promptSaveState, setPromptSaveState] = useState<SaveState>('idle');
  const [promptSaveText, setPromptSaveText] = useState('');

  const setSelectedPromptId = (id: string | null) => {
    setSelectedPromptIdRaw(id);
    writeClientStorage(ADMIN_PROMPT_STORAGE_KEY, id);
  };

  useEffect(() => {
    let cancelled = false;
    const loadPrompts = async () => {
      setPromptLoading(true);
      setPromptError(null);
      try {
        const response = await fetch('/api/xiaoqiao/admin/prompts', { cache: 'no-store' });
        const healthResponsePromise = fetch('/api/xiaoqiao/admin/prompts/promptHealth', { cache: 'no-store' });
        const payload = await response.json().catch(() => []) as AdminPromptListItem[];
        if (!response.ok || !Array.isArray(payload)) {
          throw new Error('读取失败');
        }
        const hydrated = payload.map((prompt) => buildPromptView(prompt));
        if (cancelled) return;
        setPromptItems(hydrated);
        setVersionLoadedIds(new Set());
        const healthResponse = await healthResponsePromise;
        const healthPayload = await healthResponse.json().catch(() => null) as PromptHealthSummary | null;
        setPromptHealth(healthResponse.ok && healthPayload ? healthPayload : null);
        const stored = readClientStorage(ADMIN_PROMPT_STORAGE_KEY);
        const preferredPrompt = hydrated.find(item => PROMPT_LAYER_SCOPE_ORDER.includes(item.scope));
        const nextSelected = stored && hydrated.some(item => item.id === stored)
          ? stored
          : preferredPrompt?.id || hydrated[0]?.id || null;
        setSelectedPromptIdRaw(nextSelected);
        writeClientStorage(ADMIN_PROMPT_STORAGE_KEY, nextSelected);
      } catch {
        if (cancelled) return;
        setPromptItems([]);
        setPromptHealth(null);
        setSelectedPromptIdRaw(null);
        writeClientStorage(ADMIN_PROMPT_STORAGE_KEY, null);
        setPromptError('未能读取提示词，请稍后重试');
      } finally {
        if (!cancelled) {
          setPromptLoading(false);
        }
      }
    };
    void loadPrompts();
    return () => { cancelled = true; };
  }, []);

  const filtered = promptItems.filter((p) => {
    const matchSearch = p.name.includes(searchTerm) || p.description.includes(searchTerm);
    const matchScope = filterScope === 'all' || p.scope === filterScope;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchScope && matchStatus;
  });

  const selectedPrompt = promptItems.find(p => p.id === selectedPromptId) || null;

  const handleSelectPrompt = (id: string) => {
    setSelectedPromptId(id);
    setDetailTab('content');
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    if (selectedPrompt) {
      setEditContent(selectedPrompt.content);
      setIsEditing(true);
      setPromptSaveState('idle');
      setPromptSaveText('');
    }
  };

  const loadPromptVersions = async (promptId: string) => {
    if (versionLoadedIds.has(promptId)) return;
    setVersionLoading(true);
    try {
      await refreshPromptItem(promptId);
    } catch {
      setPromptError('未能读取版本记录，请稍后重试');
    } finally {
      setVersionLoading(false);
    }
  };

  const refreshPromptItem = async (promptId: string) => {
    const [detailResponse, versionsResponse] = await Promise.all([
      fetch(`/api/xiaoqiao/admin/prompts/${promptId}`, { cache: 'no-store' }),
      fetch(`/api/xiaoqiao/admin/prompts/${promptId}/versions`, { cache: 'no-store' }),
    ]);
    const detail = await detailResponse.json().catch(() => ({})) as AdminPromptListItem;
    const versions = await versionsResponse.json().catch(() => []) as AdminPromptVersionItem[];
    if (!detailResponse.ok || !detail.id) {
      throw new Error('提示词不存在');
    }
    const merged = buildPromptView(detail, Array.isArray(versions) ? versions : []);
    setPromptItems((prev) => prev.map((item) => item.id === promptId ? merged : item));
    setVersionLoadedIds((prev) => new Set(prev).add(promptId));
    return merged;
  };

  useEffect(() => {
    if (detailTab !== 'versions' || !selectedPromptId || versionLoadedIds.has(selectedPromptId)) return;
    void loadPromptVersions(selectedPromptId);
  }, [detailTab, selectedPromptId, versionLoadedIds]);

  const handleSaveEdit = async () => {
    if (!selectedPrompt) return;
    setPromptSaveState('saving');
    setPromptSaveText('');
    try {
      const response = await fetch(`/api/xiaoqiao/admin/prompts/${selectedPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          change_note: '管理中心编辑',
        }),
      });
      const payload = await response.json().catch(() => ({})) as { promptError?: string };
      if (!response.ok) {
        throw new Error(payload.promptError || '保存失败');
      }
      await refreshPromptItem(selectedPrompt.id);
      setIsEditing(false);
      setPromptSaveState('saved');
      setPromptSaveText('已保存');
    } catch {
      // keep edit state
      setPromptSaveState('error');
      setPromptSaveText('保存失败，请检查内容后重试');
    }
  };

  const handleRollback = async (promptId: string, version: number) => {
    const response = await fetch(`/api/xiaoqiao/admin/prompts/${promptId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    });
    const payload = await response.json().catch(() => ({})) as { promptError?: string; prompt?: PromptConfig };
    if (!response.ok || !payload.prompt) {
      throw new Error(payload.promptError || '回滚失败');
    }
    await refreshPromptItem(promptId);
    setSelectedPromptId(promptId);
    setDetailTab('versions');
  };

  const scopeOptions = [
    { key: 'all', label: '全部', count: promptItems.length },
    ...Object.entries(promptItems.reduce<Record<string, number>>((acc, prompt) => {
      acc[prompt.scope] = (acc[prompt.scope] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => {
      const layerA = PROMPT_LAYER_SCOPE_ORDER.indexOf(a[0]);
      const layerB = PROMPT_LAYER_SCOPE_ORDER.indexOf(b[0]);
      if (layerA !== -1 || layerB !== -1) {
        return (layerA === -1 ? 999 : layerA) - (layerB === -1 ? 999 : layerB);
      }
      return b[1] - a[1];
    }).map(([key, count]) => ({ key, label: ADMIN_PROMPT_SCOPE_LABELS[key] || key, count })),
  ];

  if (promptLoading) {
    return (
      <AdminCrudShell>
        <AdminCrudHeader
          title="提示词"
          description="管理提示词内容、版本、绑定和生效状态。"
        />
        <AdminCrudListSkeleton rows={5} />
      </AdminCrudShell>
    );
  }

  return (
    <AdminCrudShell className="overflow-hidden">
      <AdminCrudHeader
        title="提示词"
        description="管理提示词内容、版本、绑定和生效状态，版本记录会在打开时按需读取。"
        saveState={promptSaveState}
        saveText={promptSaveText || undefined}
      />
      {promptError ? (
        <AdminCrudErrorState description={promptError} />
      ) : null}
    <div className="flex min-h-[640px] overflow-hidden rounded-2xl border border-[#dbe4f0] bg-[#f3f6fb] shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      {/* Left Column - Filters */}
      <div className="w-56 border-r border-[#dbe4f0] flex flex-col bg-white">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-[#f8fbff] border border-[#dbe4f0]">
            <Search className="w-3.5 h-3.5 text-[#6b7c93]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索提示词..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-[#10233f] placeholder:text-[#93a1b2]"
            />
          </div>

          <div className="space-y-1">
              <div className="text-[10px] text-[#6b7c93] uppercase tracking-wider mb-2 px-2">分类筛选</div>
              {scopeOptions.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilterScope(key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                    filterScope === key
                    ? 'bg-[#eaf3ff] text-[#0f6fff]'
                    : 'text-[#5f6f86] hover:bg-[#f5f8fc]'
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 mt-6">
            <div className="text-[10px] text-[#6b7c93] uppercase tracking-wider mb-2 px-2">状态筛选</div>
            {[
              { key: 'all', label: '全部', color: '#0f6fff' },
              { key: 'active', label: '已上线', color: '#00FF88' },
              { key: 'draft', label: '草稿', color: '#FFB800' },
              { key: 'archived', label: '已归档', color: '#64748B' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#5f6f86] hover:bg-[#f5f8fc] transition-colors"
                style={filterStatus === key ? { backgroundColor: '#eaf3ff', color: '#0f6fff' } : undefined}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Column - List */}
      <div className="w-80 border-r border-[#dbe4f0] flex flex-col bg-[#f9fbfe]">
        {promptHealth && (
          <div className="border-b border-[#e5edf7] bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-[#10233f]">生产健康检查</div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${promptHealth.ok ? 'bg-[rgba(0,255,136,0.12)] text-[#008f55]' : 'bg-[#fff4db] text-[#b7791f]'}`}>
                {promptHealth.ok ? '通过' : '需处理'}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-[#dbe4f0] bg-[#f8fbff] p-2">
                <div className="text-[#6b7c93]">重复生效</div>
                <div className="mt-1 font-semibold text-[#10233f]">{promptHealth?.duplicate_active_count}</div>
              </div>
              <div className="rounded-lg border border-[#dbe4f0] bg-[#f8fbff] p-2">
                <div className="text-[#6b7c93]">缺失必需</div>
                <div className="mt-1 font-semibold text-[#10233f]">{promptHealth?.missing_required_count}</div>
              </div>
              <div className="rounded-lg border border-[#dbe4f0] bg-[#f8fbff] p-2">
                <div className="text-[#6b7c93]">问数套件</div>
                <div className="mt-1 font-semibold text-[#10233f]">{promptHealth.report_query_prompt_suite_complete ? '完整' : '缺失'}</div>
              </div>
              <div className="rounded-lg border border-[#dbe4f0] bg-[#f8fbff] p-2">
                <div className="text-[#6b7c93]">已归档</div>
                <div className="mt-1 font-semibold text-[#10233f]">{promptHealth?.counts?.archived ?? 0}</div>
              </div>
            </div>
            {(promptHealth?.ok === false) && (
              <div className="mt-3 rounded-lg bg-[#fff7ed] p-2 text-[11px] leading-5 text-[#9a5b13]">
                {(promptHealth?.duplicate_active?.length ?? 0) > 0 ? `重复：${promptHealth?.duplicate_active?.join('、')}` : null}
                {(promptHealth?.missing_required?.length ?? 0) > 0 ? ` 缺失：${promptHealth?.missing_required?.slice(0, 3).join('、')}` : null}
              </div>
            )}
          </div>
        )}
        <div className="px-4 py-3 border-b border-[#e5edf7]">
          <div className="text-xs text-[#6b7c93]">共 {filtered.length} 个提示词</div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => setSelectedPromptId(prompt.id)}
              className={`w-full text-left p-4 border-b border-[rgba(255,255,255,0.04)] transition-colors ${
                selectedPromptId === prompt.id
                  ? 'bg-[#edf5ff] border-l-2 border-l-[#0f6fff]'
                  : 'hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className={`text-sm font-medium ${selectedPromptId === prompt.id ? 'text-[#0f6fff]' : 'text-[#10233f]'}`}>
                  {promptDisplayText(prompt.name)}
                </h3>
                <ChevronRight className="w-3.5 h-3.5 text-[#93a1b2] mt-0.5" />
              </div>
              <p className="text-[11px] text-[#6b7c93] mb-2 line-clamp-2">{promptDisplayText(prompt.description)}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[prompt.status]}`}>
                  {statusLabels[prompt.status]}
                </span>
                {prompt.effectiveStatus && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    prompt.effectiveStatus === 'active_runtime' ? 'bg-[rgba(0,255,136,0.1)] text-[#00a854]'
                    : prompt.effectiveStatus === 'hardcoded_to_managed' ? 'bg-[rgba(128,0,255,0.1)] text-[#7c3aed]'
                    : prompt.effectiveStatus === 'planned_draft' ? 'bg-[rgba(255,165,0,0.1)] text-[#d97706]'
                    : prompt.effectiveStatus === 'active_alias' ? 'bg-[rgba(0,100,255,0.1)] text-[#0f6fff]'
                    : 'bg-[rgba(107,124,147,0.1)] text-[#6b7c93]'
                  }`}>
                    {prompt.effectiveStatus === 'active_runtime' ? '运行中'
                    : prompt.effectiveStatus === 'hardcoded_to_managed' ? '已纳管'
                      : prompt.effectiveStatus === 'planned_draft' ? '规划中'
                      : prompt.effectiveStatus === 'active_alias' ? '别名'
                      : '归档'}
                  </span>
                )}
                {prompt.runtimeConsumer && (
                  <span className="text-[10px] text-[#6b7c93]" title={prompt.consumerPath}>
                    → {promptDisplayText(prompt.runtimeConsumer)}
                  </span>
                )}
                {prompt.deprecatedBy && (
                  <span className="text-[10px] text-[#93a1b2]" title={prompt.archiveReason || ''}>
                    已由 {prompt.deprecatedBy} 替代
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#eaf3ff] text-[#0f6fff]">
                  {scopeLabels[prompt.scope]}
                </span>
                <span className="text-[10px] text-[#93a1b2]">{prompt.version}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-4">
              <AdminCrudEmptyState title="没有匹配的提示词" description="调整分类、状态或搜索条件后继续查看。" />
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Detail / Edit */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f3f6fb]">
        {selectedPrompt ? (
          <>
            <div className="px-6 py-4 border-b border-[#dbe4f0] bg-white">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-[#10233f]">{promptDisplayText(selectedPrompt.name)}</h2>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      <button onClick={handleStartEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#5f6f86] hover:bg-[#f5f8fc] transition-colors">
                        <Edit3 className="w-3.5 h-3.5" /> 编辑
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#5f6f86] hover:bg-[#f5f8fc] transition-colors">
                        {selectedPrompt.status === 'active' ? <ToggleRight className="w-3.5 h-3.5 text-[#00FF88]" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {selectedPrompt.status === 'active' ? '停用' : '启用'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleSaveEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#0f6fff] text-white hover:bg-[#0b5ad1] transition-colors">
                        <Save className="w-3.5 h-3.5" /> 保存
                      </button>
                      <button onClick={() => setIsEditing(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#5f6f86] hover:bg-[#f5f8fc] transition-colors">
                        <X className="w-3.5 h-3.5" /> 取消
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#6b7c93]">
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {selectedPrompt.intent_type}</span>
                <span className="flex items-center gap-1"><Settings className="w-3 h-3" /> {promptDisplayText(selectedPrompt.key || selectedPrompt.id)}</span>
                {selectedPrompt.role && <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {selectedPrompt.role}</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {selectedPrompt.updated_at}</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {selectedPrompt.version}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusStyles[selectedPrompt.status]}`}>
                  {statusLabels[selectedPrompt.status]}
                </span>
              </div>
            </div>

            <div className="px-6 border-b border-[#dbe4f0] bg-white">
              <div className="flex gap-1">
                {[
                  { key: 'content' as DetailTab, label: '正文', icon: FileText },
                  { key: 'versions' as DetailTab, label: '版本', icon: GitBranch },
                  { key: 'bindings' as DetailTab, label: '绑定', icon: Link2 },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setDetailTab(key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors ${
                      detailTab === key ? 'text-[#0f6fff] border-[#0f6fff]' : 'text-[#6b7c93] border-transparent hover:text-[#355070]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#f3f6fb]">
              {detailTab === 'content' && (
                <div className="space-y-6">
                  <div>
                    <div className="text-xs text-[#6b7c93] mb-2">提示词正文</div>
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-80 p-4 rounded-2xl bg-white border border-[#dbe4f0] text-sm text-[#10233f] font-mono resize-none focus:outline-none focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      />
                    ) : (
                      <div className="p-4 rounded-2xl bg-white border border-[#dbe4f0] shadow-[0_10px_30px_rgba(15,35,63,0.05)]">
                        <pre className="text-sm text-[#10233f] font-mono whitespace-pre-wrap leading-relaxed">{selectedPrompt.content}</pre>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-[#6b7c93] mb-2">变量说明</div>
                    <div className="space-y-2">
                      {selectedPrompt.variables.map((v, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-[#dbe4f0]">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs text-[#0f6fff] font-mono">{`{{${v.name}}}`}</code>
                          </div>
                          <div className="text-[11px] text-[#355070]">{v.description}</div>
                          <div className="text-[11px] text-[#6b7c93] mt-1">示例: {v.example}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6b7c93] mb-2">适用范围</div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] bg-[#eaf3ff] text-[#0f6fff]">{scopeLabels[selectedPrompt.scope]}</span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#dbe4f0] text-[#355070]">{selectedPrompt.intent_type}</span>
                      {selectedPrompt.model_use_case && <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#dbe4f0] text-[#355070]">调用点 {selectedPrompt.model_use_case}</span>}
                      {selectedPrompt.prompt_source && <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#dbe4f0] text-[#355070]">来源 {selectedPrompt.prompt_source}</span>}
                      {selectedPrompt.approval_status && <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#dbe4f0] text-[#355070]">审核 {selectedPrompt.approval_status}</span>}
                      {typeof selectedPrompt.priority === 'number' && <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#dbe4f0] text-[#355070]">优先级 {selectedPrompt.priority}</span>}
                      {selectedPrompt.response_format && <span className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-[#dbe4f0] text-[#355070]">{selectedPrompt.response_format}</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6b7c93] mb-2">治理信息</div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-white border border-[#dbe4f0] p-3">
                        <div className="text-[11px] text-[#6b7c93]">内容指纹</div>
                        <div className="mt-1 font-mono text-xs text-[#10233f]">{selectedPrompt.content_hash || '--'}</div>
                      </div>
                      <div className="rounded-2xl bg-white border border-[#dbe4f0] p-3">
                        <div className="text-[11px] text-[#6b7c93]">创建人</div>
                        <div className="mt-1 text-xs text-[#10233f]">{selectedPrompt.created_by || '--'}</div>
                      </div>
                      <div className="rounded-2xl bg-white border border-[#dbe4f0] p-3">
                        <div className="text-[11px] text-[#6b7c93]">更新人</div>
                        <div className="mt-1 text-xs text-[#10233f]">{selectedPrompt.updated_by || '--'}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6b7c93] mb-2">输出与可见性</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-white border border-[#dbe4f0] p-3">
                        <div className="text-[11px] font-semibold text-[#355070] mb-2">输出要求</div>
                        <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-[#6b7c93]">{JSON.stringify(selectedPrompt.output_schema || {}, null, 2)}</pre>
                      </div>
                      <div className="rounded-2xl bg-white border border-[#dbe4f0] p-3">
                        <div className="text-[11px] font-semibold text-[#355070] mb-2">可见性策略</div>
                        <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-[#6b7c93]">{JSON.stringify(selectedPrompt.visibility || {}, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {detailTab === 'versions' && (
                <div className="space-y-3">
                  {versionLoading ? (
                    <div className="rounded-2xl border border-[#dbe4f0] bg-white p-4 text-sm text-[#6b7c93]">
                      正在读取版本记录...
                    </div>
                  ) : null}
                  {!versionLoading && selectedPrompt.versions.map((v, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white border border-[#dbe4f0]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-3.5 h-3.5 text-[#355070]" />
                          <span className="text-sm font-medium text-[#10233f]">{v.version}</span>
                          {v.status === 'active' && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[rgba(0,255,136,0.1)] text-[#00FF88]">当前生效</span>}
                        </div>
                        {v.status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => void handleRollback(selectedPrompt.id, Number(String(v.version).replace(/^v/i, '')) || 1)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#5f6f86] hover:bg-[#f5f8fc] transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" /> 回滚到此版本
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-[#6b7c93] mb-1">{v.created_at}</div>
                      <div className="text-xs text-[#355070]">{v.summary}</div>
                    </div>
                  ))}
                  {!versionLoading && selectedPrompt.versions.length === 0 ? (
                    <div className="rounded-2xl border border-[#dbe4f0] bg-white p-4 text-sm text-[#6b7c93]">
                      暂无版本记录，保存后会在这里查看历史版本。
                    </div>
                  ) : null}
                </div>
              )}
              {detailTab === 'bindings' && (
                <div className="space-y-3">
                  {selectedPrompt.bindings.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#dbe4f0]">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${b.enabled ? 'bg-[#00FF88]' : 'bg-[#5a6a8a]'}`} />
                        <div>
                          <div className="text-sm text-[#10233f]">{b.target_name}</div>
                          <div className="text-[11px] text-[#6b7c93]">
                            {b.target_type === 'agent' ? '智能体' : b.target_type === 'workflow' ? '工作流' : b.target_type === 'model' ? '模型' : b.target_type === 'model_use_case' ? '调用点' : '技能'}
                          </div>
                        </div>
                      </div>
                      <button className="flex items-center">
                        {b.enabled ? <ToggleRight className="w-5 h-5 text-[#00FF88]" /> : <ToggleLeft className="w-5 h-5 text-[#5a6a8a]" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Settings className="w-10 h-10 text-[#9aa9bc] mx-auto mb-3" />
              <div className="text-sm text-[#6b7c93]">选择左侧提示词查看详情</div>
              <div className="text-[11px] text-[#93a1b2] mt-1">支持编辑、版本管理与绑定配置</div>
            </div>
          </div>
        )}
      </div>
    </div>
    </AdminCrudShell>
  );
}
