'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Search, Save, RotateCcw, Edit3, FileText, Clock, Tag, ChevronRight, X,
  Plug, Activity, Loader2, Wifi, Trash2, GitBranch, Plus, Settings, Cpu, Link2, Upload, ArrowRight,
} from 'lucide-react';
import type { McpSkill, McpSkillCategory, McpServerConfig, SkillContract, SkillImportPreview } from '@/types';
import type { ModelProfileConfig, ModelRouteConfig } from '@/contracts/model-service';
import { xiaoqiaoApi } from '@/lib/api';
import { parseSkillImportPackage } from '@/lib/skill-import';
import { broadcastAdminCatalogChange } from '@/lib/admin-catalog-events';
import {
  parseJson, statusLabels, statusStyles,
  readClientStorage, writeClientStorage,
  ADMIN_SKILL_STORAGE_KEY, ADMIN_WORKFLOW_STORAGE_KEY, skillCategoryLabels,
} from './admin-tab-helpers';
import type { AdminTab } from './admin-tab-helpers';
import { ClientTime } from './admin-menu';
import {
  AdminCrudEmptyState,
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

type SkillManagementTabProps = {
  onJump: (tab: AdminTab) => void;
};

function parseJsonText(value: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: '请先粘贴导入内容' };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'JSON 解析失败',
    };
  }
}

const packageRefLabels: Record<string, string> = {
  manifest: '能力清单',
  workflow: '流程',
  prompts: '提示词',
  golden_cases: '验收样例',
  result_contract: '结果说明',
  runtime_display: '运行展示',
  observability: '观测设置',
};

function abilityDisplayText(value: string): string {
  return value
    .replace(/\bSkill\b/g, '能力')
    .replace(/\bMCP\b/g, '外部服务')
    .replace(/\bAPI\b/g, '服务')
    .replace(/接口/g, '服务')
    .replace(/\bSDK\b/g, '客户端组件');
}

function SkillManagementTab({ onJump }: SkillManagementTabProps) {
  type SkillDraft = {
    prompt_template: string;
    mcp_server_id: string;
    selected_tool_ids: string[];
    use_cases_text: string;
  };

  const buildDefaultPromptTemplate = (skill: McpSkill): string => {
    return `你是智投 Chat 的服务能力：${skill.name}。

在执行前必须确认：
1. 用户意图是否匹配该能力。
2. 必填信息是否已经齐全。
3. 用户是否具备对应项目、账户或媒体的数据权限。
4. 是否需要先追问，而不是直接调用。

如果满足调用条件：
- 输出能力编号 ${skill.id}
- 输出整理后的输入
- 调用绑定的外部服务工具
- 返回过程、来源、结构化结果和下一步动作

如果不满足：
- 输出缺失字段
- 生成结构化补充信息
- 不把缺失条件直接包装成新的自由问题发送`;
  };

  const [skills, setSkills] = useState<McpSkill[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [mcpLoading, setMcpLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<McpSkillCategory | 'all'>('all');
  const [filterInstall, setFilterInstall] = useState<'all' | 'installed' | 'not-installed'>('all');
  const [selectedSkillIdRaw, setSelectedSkillIdRaw] = useState<string | null>(() => readClientStorage(ADMIN_SKILL_STORAGE_KEY));
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SkillDraft | null>(null);
  const [skillContracts, setSkillContracts] = useState<SkillContract[]>([]);
  const [showImportPanel, setShowImportPanel] = useState(true);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<SkillImportPreview | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  const setSelectedSkillId = (id: string | null) => {
    setSelectedSkillIdRaw(id);
    writeClientStorage(ADMIN_SKILL_STORAGE_KEY, id);
  };

  const loadSkills = async () => {
    setLoading(true);
    try {
      setLoadError(null);
      const data = await xiaoqiaoApi.getSkills();
      setSkills(data);
      setSelectedSkillIdRaw(current => {
        const next = current && data.some(skill => skill.id === current)
          ? current
          : data[0]?.id || null;
        writeClientStorage(ADMIN_SKILL_STORAGE_KEY, next);
        return next;
      });
    } catch {
      setLoadError('能力配置加载失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  const loadMcpServers = async () => {
    setMcpLoading(true);
    try {
      const data = await xiaoqiaoApi.getMcpServers();
      setMcpServers(data);
    } catch {
      setMcpServers([]);
    } finally {
      setMcpLoading(false);
    }
  };

  const loadSkillContracts = async () => {
    try {
      const data = await xiaoqiaoApi.getSkillContracts();
      setSkillContracts(Array.isArray(data) ? data : []);
    } catch {
      setSkillContracts([]);
    }
  };

  useEffect(() => {
    void loadSkills();
    void loadMcpServers();
    void loadSkillContracts();
  }, []);

  const filteredSkills = skills.filter(skill => {
    const categoryMatched = filterCategory === 'all' || skill.category === filterCategory;
    const installMatched = filterInstall === 'all' ||
      (filterInstall === 'installed' ? skill.installed : !skill.installed);
    return categoryMatched && installMatched;
  });
  const selectedSkillId = selectedSkillIdRaw && skills.some(skill => skill.id === selectedSkillIdRaw)
    ? selectedSkillIdRaw
    : null;
  const selectedSkill = skills.find(skill => skill.id === selectedSkillId) || filteredSkills[0] || null;
  const selectedContract = selectedSkill
    ? skillContracts.find(contract => contract.skill_id === selectedSkill.id) || null
    : null;
  const installedCount = skills.filter(skill => skill.installed).length;
  const p0Count = skills.filter(skill => skill.tags.includes('P0')).length;
  const selectedServerId = draft?.mcp_server_id || selectedSkill?.mcp_server_id || selectedSkill?.installed_server_id || '';
  const selectedServer = mcpServers.find(server => server.id === selectedServerId) || null;
  const selectedServerTools = selectedServer?.tools || [];
  const selectedToolIds = draft?.selected_tool_ids || [];

  useEffect(() => {
    if (!editingSkillId || !draft) return;
    const server = mcpServers.find(item => item.id === draft.mcp_server_id);
    if (!server) return;
    const validToolIds = new Set(server.tools.map(tool => tool.tool_id));
    const filteredToolIds = draft.selected_tool_ids.filter(toolId => validToolIds.has(toolId));
    if (filteredToolIds.length !== draft.selected_tool_ids.length) {
      setDraft(prev => prev ? { ...prev, selected_tool_ids: filteredToolIds } : prev);
    }
  }, [draft, editingSkillId, mcpServers]);

  useEffect(() => {
    if (!editingSkillId || !draft || !selectedSkill || draft.selected_tool_ids.length > 0) return;
    const server = mcpServers.find(item => item.id === draft.mcp_server_id);
    if (!server) return;
    const matchedToolIds = selectedSkill.expected_tools
      .map(tool => server.tools.find(serverTool => serverTool.name === tool.name || serverTool.tool_id === tool.name)?.tool_id)
      .filter((toolId): toolId is string => Boolean(toolId));
    if (matchedToolIds.length > 0) {
      setDraft(prev => prev ? { ...prev, selected_tool_ids: matchedToolIds } : prev);
    }
  }, [draft, editingSkillId, mcpServers, selectedSkill]);

  const buildDraft = (skill: McpSkill): SkillDraft => {
    const skillServerId = skill.mcp_server_id || skill.installed_server_id || '';
    const server = mcpServers.find(item => item.id === skillServerId);
    const selectedToolIds = Array.isArray(skill.expected_tools)
      ? skill.expected_tools
        .map(tool => server?.tools.find(serverTool => serverTool.name === tool.name || serverTool.tool_id === tool.name)?.tool_id)
        .filter((toolId): toolId is string => Boolean(toolId))
      : [];
    return {
      prompt_template: skill.prompt_template || buildDefaultPromptTemplate(skill),
      mcp_server_id: skillServerId,
      selected_tool_ids: selectedToolIds,
      use_cases_text: skill.use_cases.join('\n'),
    };
  };

  const updateSkillInstall = async (skill: McpSkill, nextInstalled: boolean) => {
    setMessage('');
    setSaveState('saving');
    try {
      const response = await fetch(`/api/xiaoqiao/skills/${skill.id}/${nextInstalled ? 'install' : 'uninstall'}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(await response.text());
      await loadSkills();
      setSaveState('saved');
      setMessage(`${skill.name} 已${nextInstalled ? '启用' : '停用'}`);
    } catch {
      setSaveState('error');
      setMessage(`${skill.name} 状态更新失败`);
    } finally {
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const startEditSkill = (skill: McpSkill) => {
    setSelectedSkillId(skill.id);
    setEditingSkillId(skill.id);
    setDraft(buildDraft(skill));
    setMessage('');
  };

  const cancelEditSkill = () => {
    setEditingSkillId(null);
    setDraft(null);
  };

  const saveSkillDraft = async () => {
    if (!selectedSkill || !draft) return;
    const server = mcpServers.find(item => item.id === draft.mcp_server_id);
    if (!server) {
      setMessage('请先选择一个已配置的外部服务');
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    const expected_tools = server.tools
      .filter(tool => draft.selected_tool_ids.includes(tool.tool_id))
      .map(tool => ({ name: tool.name, description: tool.description }));
    const use_cases = draft.use_cases_text
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);

    try {
      setMessage('');
      setSaveState('saving');
      const response = await fetch(`/api/xiaoqiao/skills/${selectedSkill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_template: draft.prompt_template,
          mcp_server_id: server.id,
          installed_server_id: server.id,
          endpoint_url: server.endpoint_url,
          transport: server.transport,
          auth_type: server.auth_type,
          expected_tools,
          use_cases,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadSkills();
      setEditingSkillId(null);
      setDraft(null);
      setSaveState('saved');
      setMessage('能力配置已更新');
    } catch {
      setSaveState('error');
      setMessage('能力配置保存失败');
    } finally {
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const duplicateSkill = async () => {
    if (!selectedSkill) return;
    const server = mcpServers.find(item => item.id === (draft?.mcp_server_id || selectedSkill.mcp_server_id || selectedSkill.installed_server_id || ''));
    const sourceToolKeys = draft?.selected_tool_ids.length
      ? draft.selected_tool_ids
      : selectedSkill.expected_tools.map(tool => tool.name);
    const payload = {
      name: `${selectedSkill.name}（副本）`,
      description: selectedSkill.description,
      prompt_template: draft?.prompt_template || selectedSkill.prompt_template || buildDefaultPromptTemplate(selectedSkill),
      icon: selectedSkill.icon,
      source: 'custom',
      category: selectedSkill.category,
      mcp_server_id: server?.id || selectedSkill.mcp_server_id || selectedSkill.installed_server_id || '',
      endpoint_url: server?.endpoint_url || selectedSkill.endpoint_url,
      transport: server?.transport || selectedSkill.transport,
      auth_type: server?.auth_type || selectedSkill.auth_type,
      auth_config_template: selectedSkill.auth_config_template,
      expected_tools: (server?.tools || selectedServerTools).filter(tool => {
        if (sourceToolKeys.length === 0) return false;
        return sourceToolKeys.includes(tool.tool_id) || sourceToolKeys.includes(tool.name);
      }).map(tool => ({ name: tool.name, description: tool.description })),
      installed: false,
      tags: [...selectedSkill.tags],
      use_cases: draft?.use_cases_text
        ? draft.use_cases_text.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
        : [...selectedSkill.use_cases],
      sort_order: selectedSkill.sort_order,
    };
    try {
      setMessage('');
      setSaveState('saving');
      const response = await fetch('/api/xiaoqiao/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      const created = await response.json() as McpSkill;
      await loadSkills();
      setSelectedSkillId(created.id);
      setEditingSkillId(created.id);
      setDraft(buildDraft(created));
      setSaveState('saved');
      setMessage('已复制为自定义能力');
    } catch {
      setSaveState('error');
      setMessage('复制能力失败');
    } finally {
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const clearImport = () => {
    setImportText('');
    setImportPreview(null);
    setImportMessage('');
    setImportLoading(false);
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
    }
  };

  const updateImportText = (value: string) => {
    setImportText(value);
    setImportMessage('');
    if (!value.trim()) {
      setImportPreview(null);
      return;
    }
    const parsed = parseJsonText(value);
    if (!parsed.ok) {
      setImportPreview({
        valid: false,
        kind: 'invalid',
        hasContract: false,
        issues: [{ field: 'json', message: parsed.error, severity: 'error' }],
      });
      return;
    }
    const next = parseSkillImportPackage(parsed.value);
    setImportPreview(next.preview);
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    updateImportText(text);
  };

  const handleImportSkill = async () => {
    const parsed = parseJsonText(importText);
    if (!parsed.ok) {
      setImportPreview({
        valid: false,
        kind: 'invalid',
        hasContract: false,
        issues: [{ field: 'json', message: parsed.error, severity: 'error' }],
      });
      setImportMessage(parsed.error);
      return;
    }
    const normalized = parseSkillImportPackage(parsed.value);
    setImportPreview(normalized.preview);
    if (!normalized.package || normalized.issues.some(item => item.severity === 'error')) {
      setImportMessage('导入内容校验未通过');
      return;
    }

    setImportLoading(true);
    setImportMessage('');
    setSaveState('saving');
    try {
      const result = await xiaoqiaoApi.importSkillPackage(normalized.package);
      await Promise.all([loadSkills(), loadSkillContracts()]);
      setSelectedSkillId(result.skill.id);
      setEditingSkillId(result.skill.id);
      setDraft(buildDraft(result.skill));
      setShowImportPanel(false);
      clearImport();
      setSaveState('saved');
      setMessage(`已导入 ${result.skill.name}`);
    } catch {
      setSaveState('error');
      setImportMessage('能力导入失败');
    } finally {
      setImportLoading(false);
      setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const openWorkflowEditor = () => {
    if (!selectedSkill) return;
    writeClientStorage(ADMIN_WORKFLOW_STORAGE_KEY, selectedSkill.id);
    onJump('workflow');
  };

  const handleSelectSkill = (skill: McpSkill) => {
    setSelectedSkillId(skill.id);
    if (editingSkillId !== skill.id) {
      setEditingSkillId(null);
      setDraft(null);
    }
  };

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="能力治理"
        description={`导入、编辑和编排可调用能力。当前 ${skills.length} 个能力，${installedCount} 个已启用，${p0Count} 个重点能力。`}
        saveState={saveState}
        actions={(
          <>
                <button
                  type="button"
                  onClick={() => setShowImportPanel(prev => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] transition-colors hover:border-[#b8cae6]"
                >
                  <Upload className="h-4 w-4" />
                  {showImportPanel ? '收起导入' : '导入能力'}
                </button>
                <button
                  type="button"
                  onClick={openWorkflowEditor}
                  disabled={!selectedSkill}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] transition-colors hover:border-[#b8cae6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowRight className="h-4 w-4" />
                  去编排
                </button>
          </>
        )}
      />

      {loadError ? (
        <AdminCrudErrorState
          description={loadError}
          action={(
            <button
              type="button"
              onClick={() => void loadSkills()}
              className="rounded-lg bg-[#0f6fff] px-3 py-1.5 text-xs font-medium text-white"
            >
              重新加载
            </button>
          )}
        />
      ) : null}

      <main className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="mx-auto max-w-7xl">
          {message && (
            <div className="mt-4 border-t border-[#edf2f8] px-4 py-3 text-sm text-[#355070]">
              {message}
            </div>
          )}

        {showImportPanel && (
          <section className="border-b border-[#dbe4f0] bg-[#fbfdff] p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[#355070]">导入能力</div>
                    <div className="mt-1 text-[11px] text-[#8ea0b8]">
                      支持从 JSON 文件或粘贴内容导入。导入后会同步生成基础配置和编排入口。
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleImportFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => importFileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] transition-colors hover:border-[#b8cae6]"
                    >
                      <Upload className="h-4 w-4" />
                      选择文件
                    </button>
                    <button
                      type="button"
                      onClick={clearImport}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] transition-colors hover:border-[#b8cae6]"
                    >
                      <RotateCcw className="h-4 w-4" />
                      清空
                    </button>
                  </div>
                </div>

                <textarea
                  value={importText}
                  onChange={event => updateImportText(event.target.value)}
                  rows={14}
                  className="w-full rounded-2xl border border-[#e5edf7] bg-white px-4 py-3 font-mono text-[12px] leading-6 outline-none transition-colors focus:border-[#0f6fff]"
                  placeholder={'粘贴能力包 JSON，例如：\n{\n  "skill": {\n    "name": "能力名称",\n    "endpoint_url": "https://example.com/mcp"\n  },\n  "workflow": {\n    "intent_triggers": ["..."],\n    "workflow_steps": []\n  }\n}'}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleImportSkill}
                    disabled={importLoading || !importPreview?.valid}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      importLoading || !importPreview?.valid
                        ? 'cursor-not-allowed bg-[#dbe4f0] text-[#8ea0b8]'
                        : 'bg-[#0f6fff] text-white hover:bg-[#0b5ad1]'
                    }`}
                  >
                    {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {importLoading ? '导入中...' : '导入并保存'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportPanel(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] transition-colors hover:border-[#b8cae6]"
                  >
                    <X className="h-4 w-4" />
                    收起
                  </button>
                </div>

                {importMessage && (
                  <div className="rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm text-[#c2415c]">
                    {importMessage}
                  </div>
                )}
              </div>

              <aside className="rounded-2xl border border-[#e5edf7] bg-white p-4">
                <div className="text-sm font-medium text-[#355070]">导入预览</div>
                {importPreview ? (
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                      <div className="text-[11px] text-[#8ea0b8]">能力名称</div>
                      <div className="mt-1 text-[#10233f]">{importPreview.skillName || '未识别'}</div>
                      <div className="mt-2 text-[11px] text-[#8ea0b8]">编号</div>
                      <div className="mt-1 font-mono text-[12px] text-[#10233f]">{importPreview.skillId || '导入时自动生成'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                        <div className="text-[11px] text-[#8ea0b8]">编排配置</div>
                        <div className="mt-1 text-[#10233f]">{importPreview.hasContract ? '已包含' : '将自动生成'}</div>
                      </div>
                      <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                        <div className="text-[11px] text-[#8ea0b8]">状态</div>
                        <div className="mt-1 text-[#10233f]">{importPreview.valid ? '可导入' : '请先修正'}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                      <div className="text-[11px] text-[#8ea0b8]">问题提示</div>
                      <div className="mt-2 space-y-2">
                        {importPreview.issues.length > 0 ? importPreview.issues.map((issue, index) => (
                          <div
                            key={`${issue.field}-${index}`}
                            className={`rounded-xl px-3 py-2 text-[12px] ${
                              issue.severity === 'error'
                                ? 'bg-[#fff1f2] text-[#c2415c]'
                                : 'bg-[#f8fbff] text-[#4f647d]'
                            }`}
                          >
                            <span className="font-medium">{issue.field}</span>
                            <span className="ml-2">{issue.message}</span>
                          </div>
                        )) : (
                          <div className="text-[12px] text-[#8ea0b8]">未发现问题</div>
                        )}
                      </div>
                    </div>
                    {importPreview.packageRefs && importPreview.packageRefs.length > 0 && (
                      <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                        <div className="text-[11px] text-[#8ea0b8]">包结构</div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                          {[
                            { key: 'manifest', label: '清单' },
                            { key: 'workflow', label: '流程' },
                            { key: 'prompts', label: '提示词' },
                            { key: 'golden_cases', label: '样例' },
                            { key: 'result_contract', label: '结果' },
                            { key: 'runtime_display', label: '运行态' },
                            { key: 'observability', label: '观测' },
                          ].map(item => {
                            const ref = importPreview.packageRefs?.find(entry => entry.key === item.key);
                            return (
                              <div key={item.key} className="rounded-xl border border-[#e5edf7] bg-white px-3 py-2">
                                <div className="text-[11px] text-[#8ea0b8]">{item.label}</div>
                                <div className="mt-1 truncate font-mono text-[#10233f]">
                                  {ref?.ref || (typeof ref?.count === 'number' ? `${ref.count} 项` : '已识别')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {importPreview.packageRefs && importPreview.packageRefs.length > 0 && (
                      <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                        <div className="text-[11px] text-[#8ea0b8]">包内引用</div>
                        <div className="mt-2 space-y-1 text-[12px] text-[#4f647d]">
                          {importPreview.packageRefs.map(ref => (
                            <div key={ref.key} className="flex items-center justify-between gap-3">
                              <span>{packageRefLabels[ref.key] || ref.key}</span>
                              <span className="truncate font-mono text-[#10233f]">{ref.ref || (typeof ref.count === 'number' ? `${ref.count} 项` : '已识别')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-[#dbe4f0] px-4 py-10 text-center text-sm text-[#8ea0b8]">
                    先导入一个 JSON 文件或粘贴内容，这里会显示解析后的能力信息。
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}

        <section className="grid min-h-[calc(100vh-170px)] xl:grid-cols-[220px_360px_minmax(0,1fr)]">
          <aside className="border-r border-[#dbe4f0] bg-white p-4">
            <div className="mb-3 px-1 text-[11px] font-medium text-[#8ea0b8]">能力分类</div>
            <div className="space-y-2">
              {(Object.keys(skillCategoryLabels) as Array<McpSkillCategory | 'all'>).map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFilterCategory(category)}
                  className={`w-full rounded-2xl px-3 py-3 text-left text-sm transition-colors ${
                    filterCategory === category
                      ? 'border border-[#cfe0ff] bg-[#eef5ff] text-[#0f6fff]'
                      : 'border border-transparent text-[#4f647d] hover:border-[#dbe4f0] hover:bg-[#f8fbff]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{skillCategoryLabels[category]}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#8ea0b8]">
                      {(category === 'all' ? skills : skills.filter(skill => skill.category === category)).length}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-5 border-t border-[#edf2f8] pt-4">
              <div className="mb-3 px-1 text-[11px] font-medium text-[#8ea0b8]">启用状态</div>
              <div className="space-y-2">
                {[
                  ['all', '全部'],
                  ['installed', '已启用'],
                  ['not-installed', '未启用'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilterInstall(key as typeof filterInstall)}
                    className={`w-full rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                      filterInstall === key ? 'bg-[#eef5ff] text-[#0f6fff]' : 'text-[#4f647d] hover:bg-[#f8fbff]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="border-r border-[#dbe4f0] bg-white p-4">
            <div className="text-sm font-medium text-[#355070]">能力列表</div>
            <div className="mt-1 text-[11px] text-[#8ea0b8]">{filteredSkills.length} 个能力单元</div>
            <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
              {loading ? (
                <AdminCrudListSkeleton rows={5} />
              ) : filteredSkills.map(skill => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => handleSelectSkill(skill)}
                  className={`w-full border-b border-[#edf2f8] px-4 py-3 text-left transition-colors ${
                    selectedSkill?.id === skill.id
                      ? 'border-l-2 border-l-[#0f6fff] bg-[#f7fbff]'
                      : 'hover:bg-[#fafcff]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{skill.icon}</span>
                        <span className="truncate text-sm font-medium text-[#10233f]">{skill.name}</span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#6b7c93]">{abilityDisplayText(skill.description)}</div>
                    </div>
                    <span className={`shrink-0 text-[10px] ${skill.installed ? 'text-[#157f54]' : 'text-[#64748b]'}`}>
                      {skill.installed ? '启用' : '停用'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skill.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] text-[#6b7c93]">{tag}</span>
                    ))}
                    <span className="text-[10px] text-[#6b7c93]">{skill.expected_tools.length} 工具</span>
                  </div>
                </button>
              ))}
              {!loading && filteredSkills.length === 0 && (
                <AdminCrudEmptyState title="没有匹配的能力" description="调整分类或启用状态后继续查看。" />
              )}
            </div>
          </div>

          <div className="bg-white p-5">
            {selectedSkill ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selectedSkill.icon}</span>
                      <h3 className="truncate text-base font-semibold text-[#10233f]">{selectedSkill.name}</h3>
                    </div>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7c93]">{abilityDisplayText(selectedSkill.description)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateSkillInstall(selectedSkill, !selectedSkill.installed)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        selectedSkill.installed
                          ? 'border border-[#dbe4f0] bg-white text-[#355070] hover:border-[#b8cae6]'
                          : 'bg-[#0f6fff] text-white hover:bg-[#0b5ad1]'
                      }`}
                    >
                      {selectedSkill.installed ? '停用能力' : '启用能力'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditSkill(selectedSkill)}
                      className="rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] transition-colors hover:border-[#b8cae6]"
                    >
                      编辑配置
                    </button>
                    <button
                      type="button"
                      onClick={openWorkflowEditor}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] transition-colors hover:border-[#b8cae6]"
                    >
                      <ArrowRight className="h-4 w-4" />
                      去编排
                    </button>
                    <button
                      type="button"
                      onClick={duplicateSkill}
                      className="rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] transition-colors hover:border-[#b8cae6]"
                    >
                      复制为自定义能力
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                    <div className="text-[11px] text-[#8ea0b8]">分类</div>
                    <div className="mt-1 text-sm text-[#10233f]">{skillCategoryLabels[selectedSkill.category]}</div>
                  </div>
                  <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                    <div className="text-[11px] text-[#8ea0b8]">来源</div>
                    <div className="mt-1 text-sm text-[#10233f]">{selectedSkill.source === 'builtin' ? '内置' : '自定义'}</div>
                  </div>
                  <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                    <div className="text-[11px] text-[#8ea0b8]">当前外部服务</div>
                    <div className="mt-1 truncate font-mono text-[12px] text-[#10233f]">
                      {selectedServer?.name ? abilityDisplayText(selectedServer.name) : selectedSkill.endpoint_url || '未配置'}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                    <div className="text-sm font-medium text-[#355070]">适用场景</div>
                    {editingSkillId === selectedSkill.id && draft ? (
                      <textarea
                        value={draft.use_cases_text}
                        onChange={event => setDraft(prev => prev ? { ...prev, use_cases_text: event.target.value } : prev)}
                        rows={6}
                        className="mt-3 w-full rounded-2xl border border-[#e5edf7] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]"
                        placeholder="每行一个场景"
                      />
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedSkill.use_cases.length > 0 ? selectedSkill.use_cases.map(useCase => (
                          <span key={useCase} className="rounded-full bg-[#f3f7fd] px-3 py-1 text-[12px] text-[#4f647d]">{useCase}</span>
                        )) : <span className="text-[12px] text-[#8ea0b8]">暂无场景</span>}
                      </div>
                    )}
                  </section>
                  <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                    <div className="text-sm font-medium text-[#355070]">当前服务说明</div>
                    <div className="mt-3 space-y-2 text-[12px] leading-5 text-[#4f647d]">
                      <div>选择已配置的外部服务后，能力会自动采用该服务的地址、协议和鉴权方式。</div>
                      <div>工具绑定只从当前外部服务的工具清单中选择，保存后会同步到能力配置。</div>
                      <div>提示词可独立编辑，不影响技能名称和描述。</div>
                      </div>
                    </section>
                  </div>

                  <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-[#355070]">能力编排</div>
                        <div className="mt-1 text-[11px] text-[#8ea0b8]">在工作流页维护触发词、流程步骤和输出约束。</div>
                      </div>
                      <button
                        type="button"
                        onClick={openWorkflowEditor}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0f6fff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0b5ad1]"
                      >
                        <ArrowRight className="h-4 w-4" />
                        去编排
                      </button>
                    </div>
                    {selectedContract ? (
                      <div className="mt-4 space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                            <div className="text-[11px] text-[#8ea0b8]">启用状态</div>
                            <div className="mt-1 text-[#10233f]">{selectedContract.enabled ? '已启用' : '未启用'}</div>
                          </div>
                          <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                            <div className="text-[11px] text-[#8ea0b8]">流程步骤</div>
                            <div className="mt-1 text-[#10233f]">{selectedContract.workflow_steps.length} 步</div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">触发词</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedContract.intent_triggers.length > 0 ? selectedContract.intent_triggers.slice(0, 6).map(trigger => (
                              <span key={trigger} className="rounded-full bg-[#eef5ff] px-3 py-1 text-[11px] text-[#0f6fff]">
                                {trigger}
                              </span>
                            )) : (
                              <span className="text-[12px] text-[#8ea0b8]">尚未配置触发词</span>
                            )}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3 text-[12px] leading-6 text-[#4f647d]">
                          {selectedContract.description || '当前能力已生成编排入口，可直接跳到工作流页继续维护。'}
                        </div>
                        {(selectedContract.domain || selectedContract.slot_schema_ref || selectedContract.workflow_ref || selectedContract.result_screen_type) && (
                          <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                            <div className="text-[11px] text-[#8ea0b8]">包级引用</div>
                            <div className="mt-2 grid gap-2 text-[12px] text-[#4f647d] md:grid-cols-2">
                              {selectedContract.domain && <div><span className="text-[#8ea0b8]">域：</span>{selectedContract.domain}</div>}
                              {selectedContract.slot_schema_ref && <div><span className="text-[#8ea0b8]">槽位：</span>{selectedContract.slot_schema_ref}</div>}
                              {selectedContract.workflow_ref && <div><span className="text-[#8ea0b8]">流程：</span>{selectedContract.workflow_ref}</div>}
                              {selectedContract.result_screen_type && <div><span className="text-[#8ea0b8]">结果页：</span>{selectedContract.result_screen_type}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-[#dbe4f0] px-4 py-8 text-center text-sm text-[#8ea0b8]">
                        当前能力还没有编排配置，导入后或跳转到工作流页即可补齐。
                      </div>
                    )}
                  </section>

                {editingSkillId === selectedSkill.id && draft ? (
                  <>
                    <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                        <div className="text-sm font-medium text-[#355070]">提示词</div>
                        <div className="mt-1 text-[11px] text-[#8ea0b8]">编辑能力的运行提示词，不改能力名称和描述。</div>
                        </div>
                        <div className="text-[11px] text-[#8ea0b8]">
                          {mcpLoading ? '正在加载服务列表...' : `${mcpServers.length} 个已配置服务`}
                        </div>
                      </div>
                      <textarea
                        value={draft.prompt_template}
                        onChange={event => setDraft(prev => prev ? { ...prev, prompt_template: event.target.value } : prev)}
                        rows={12}
                        className="mt-3 w-full rounded-2xl border border-[#e5edf7] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]"
                      />
                    </section>

                    <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                      <div className="text-sm font-medium text-[#355070]">服务绑定</div>
                      <div className="mt-3 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                        <div className="space-y-3">
                          <label className="block text-[11px] text-[#8ea0b8]">
                            选择已配置的外部服务
                            <select
                              value={draft.mcp_server_id}
                              onChange={event => setDraft(prev => prev ? { ...prev, mcp_server_id: event.target.value, selected_tool_ids: [] } : prev)}
                              className="mt-2 w-full rounded-2xl border border-[#e5edf7] px-3 py-2 text-sm outline-none focus:border-[#0f6fff]"
                            >
                              <option value="">请选择外部服务</option>
                              {mcpServers.map(server => (
                                <option key={server.id} value={server.id}>{server.name}</option>
                              ))}
                            </select>
                          </label>
                          <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3 text-[12px] leading-5 text-[#4f647d]">
                            <div className="text-[11px] text-[#8ea0b8]">服务地址</div>
                            <div className="mt-1 break-all font-mono text-[#10233f]">{selectedServer?.endpoint_url || '未配置'}</div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-[11px] text-[#8ea0b8]">传输方式</div>
                                <div className="mt-1 text-[#10233f]">{selectedServer?.transport || '未配置'}</div>
                              </div>
                              <div>
                                <div className="text-[11px] text-[#8ea0b8]">鉴权方式</div>
                                <div className="mt-1 text-[#10233f]">{selectedServer?.auth_type || '未配置'}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                          <div className="text-[11px] text-[#8ea0b8]">选择工具</div>
                          {selectedServerTools.length > 0 ? (
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              {selectedServerTools.map(tool => {
                                const checked = selectedToolIds.includes(tool.tool_id);
                                return (
                                  <label
                                    key={tool.tool_id}
                                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition-colors ${
                                      checked ? 'border-[#cfe0ff] bg-[#eef5ff]' : 'border-[#e5edf7] bg-white'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={event => {
                                        const nextChecked = event.target.checked;
                                        setDraft(prev => {
                                          if (!prev) return prev;
                                          const next = new Set(prev.selected_tool_ids);
                                          if (nextChecked) next.add(tool.tool_id);
                                          else next.delete(tool.tool_id);
                                          return { ...prev, selected_tool_ids: Array.from(next) };
                                        });
                                      }}
                                      className="mt-1"
                                    />
                                    <div className="min-w-0">
                                      <div className="truncate font-mono text-[#10233f]">{tool.name}</div>
                                      <div className="mt-1 text-[12px] leading-5 text-[#6b7c93]">{tool.description || '未提供说明'}</div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-2xl border border-dashed border-[#dbe4f0] bg-white px-4 py-8 text-center text-sm text-[#8ea0b8]">
                              当前服务还没有可选工具，请先选择一个已配置服务。
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={saveSkillDraft}
                        className="rounded-xl bg-[#0f6fff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0b5ad1]"
                      >
                        保存配置
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditSkill}
                        className="rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] transition-colors hover:border-[#b8cae6]"
                      >
                        取消编辑
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                      <div className="text-sm font-medium text-[#355070]">提示词</div>
                      <pre className="mt-3 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4 text-[12px] leading-6 text-[#10233f]">
                        {selectedSkill.prompt_template || buildDefaultPromptTemplate(selectedSkill)}
                      </pre>
                    </section>

                    <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                      <div className="mb-3 text-sm font-medium text-[#355070]">绑定工具</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {selectedSkill.expected_tools.map(tool => (
                          <div key={tool.name} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                            <div className="font-mono text-sm text-[#10233f]">{tool.name}</div>
                            <div className="mt-1 text-[12px] leading-5 text-[#6b7c93]">{tool.description}</div>
                          </div>
                        ))}
                        {selectedSkill.expected_tools.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-[#dbe4f0] bg-[#fbfdff] px-4 py-8 text-center text-sm text-[#8ea0b8]">
                            尚未绑定工具
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8ea0b8]">
                选择一个能力查看调用说明、工具绑定和启用状态。
              </div>
            )}
          </div>
        </section>
        </div>
      </main>
    </AdminCrudShell>
  );
}

// ---- Trace Config Tab ----
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


export { SkillManagementTab };
