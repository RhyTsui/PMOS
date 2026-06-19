'use client';

import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import type { AutomationTemplateConfig, ScheduleFrequency } from '@/types';
import {
  AUTOMATION_TEMPLATE_FREQUENCY_OPTIONS,
  AUTOMATION_TEMPLATE_STATUS_OPTIONS,
  AUTOMATION_TEMPLATE_TYPE_OPTIONS,
  EMPTY_AUTOMATION_TEMPLATE,
  joinAdminList,
  readClientStorage,
  splitAdminList,
  writeClientStorage,
} from './admin-tab-helpers';
import {
  AdminCrudEmptyState,
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

const ADMIN_AUTOMATION_TEMPLATE_STORAGE_KEY = 'xiaoqiao-admin-automation-template-id';

function AutomationTemplateManagementTab() {
  const [templates, setTemplates] = useState<AutomationTemplateConfig[]>([]);
  const [selectedIdRaw, setSelectedIdRaw] = useState<string>(() => readClientStorage(ADMIN_AUTOMATION_TEMPLATE_STORAGE_KEY) || '');
  const [draft, setDraft] = useState<AutomationTemplateConfig>(EMPTY_AUTOMATION_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [messageText, setMessageText] = useState('');

  const selectedId = selectedIdRaw;
  const selectedTemplate = templates.find((item) => item.id === selectedId) || null;

  const setSelectedId = (id: string) => {
    setSelectedIdRaw(id);
    writeClientStorage(ADMIN_AUTOMATION_TEMPLATE_STORAGE_KEY, id || null);
  };

  const loadTemplates = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/xiaoqiao/admin/automation-templates', { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json() as AutomationTemplateConfig[];
      setTemplates(Array.isArray(data) ? data : []);
      const stored = readClientStorage(ADMIN_AUTOMATION_TEMPLATE_STORAGE_KEY) || selectedId;
      const next = stored && data.some((item) => item.id === stored) ? stored : data[0]?.id || '';
      setSelectedId(next);
      setDraft(data.find((item) => item.id === next) || EMPTY_AUTOMATION_TEMPLATE);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '模板读取失败，请稍后重试';
      setLoadError(errorMessage);
      setMessageText('模板读取失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTemplate = (template: AutomationTemplateConfig) => {
    setSelectedId(template.id);
    setDraft(template);
    setMessageText('');
  };

  const createTemplate = () => {
    const now = Date.now();
    const next: AutomationTemplateConfig = {
      ...EMPTY_AUTOMATION_TEMPLATE,
      id: '',
      name: '新建自动化模板',
      description: '说明这个模板适合解决什么固定任务。',
      created_at: now,
      updated_at: now,
    };
    setSelectedId('');
    setDraft(next);
    setMessageText('');
    setSaveState('idle');
  };

  const saveTemplate = async () => {
    setSaving(true);
    setMessageText('');
    setSaveState('saving');
    try {
      const payload = {
        ...draft,
        name: draft.name.trim() || '未命名模板',
        metrics: splitAdminList(joinAdminList(draft.metrics)),
        dimensions: splitAdminList(joinAdminList(draft.dimensions)),
        filters: splitAdminList(joinAdminList(draft.filters)),
        default_cron_expression: draft.default_cron_expression?.trim() || undefined,
      };
      const response = await fetch(draft.id ? `/api/xiaoqiao/admin/automation-templates/${draft.id}` : '/api/xiaoqiao/admin/automation-templates', {
        method: draft.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      const saved = await response.json() as AutomationTemplateConfig;
      setTemplates((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        return exists ? prev.map((item) => item.id === saved.id ? saved : item) : [...prev, saved];
      });
      setSelectedId(saved.id);
      setDraft(saved);
      setMessageText('已保存');
      setSaveState('saved');
    } catch {
      setMessageText('保存失败，请稍后重试');
      setSaveState('error');
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const deleteTemplate = async () => {
    if (!draft.id) return;
    if (!window.confirm('确认删除这个模板？')) return;
    try {
      const response = await fetch(`/api/xiaoqiao/admin/automation-templates/${draft.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await response.text());
      const nextTemplates = templates.filter((item) => item.id !== draft.id);
      setTemplates(nextTemplates);
      setSelectedId(nextTemplates[0]?.id || '');
      setDraft(nextTemplates[0] || EMPTY_AUTOMATION_TEMPLATE);
      setMessageText('已删除');
    } catch {
      setMessageText('删除失败，请稍后重试');
    }
  };

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="自动化模板"
        description="维护日报、周报、拼表和标签汇总等常用任务模板；保存后，工作台里的任务模板会同步使用这套配置。"
        saveState={saveState}
        actions={(
          <Button type="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={createTemplate}>
            新建模板
          </Button>
        )}
      />
      {loadError ? (
        <AdminCrudErrorState
          description={loadError}
          action={<Button size="small" onClick={() => void loadTemplates()}>重新读取</Button>}
        />
      ) : null}
      <div className="grid min-h-0 flex-1 gap-4 p-4 md:grid-cols-[320px_minmax(0,1fr)] md:p-5">
        <section className="min-h-0 overflow-hidden rounded-xl border border-[#dbe4f0] bg-white">
          <div className="flex items-center justify-between border-b border-[#edf2f8] p-4">
            <div>
              <h2 className="text-sm font-semibold text-[#10233f]">模板列表</h2>
              <p className="mt-1 text-xs text-[#6b7c93]">选择一个模板继续编辑。</p>
            </div>
          </div>
          <div className="h-[calc(100%-73px)] overflow-y-auto p-2">
            {loading && <AdminCrudListSkeleton rows={5} />}
            {!loading && templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template)}
                className={`mb-2 w-full rounded-xl border p-3 text-left transition-colors ${
                  selectedId === template.id ? 'border-[#9cc8ff] bg-[#f3f8ff]' : 'border-transparent hover:bg-[#f7f9fd]'
                }`}
              >
                <span className="block text-sm font-semibold text-[#10233f]">{template.name}</span>
                <span className="mt-1 block truncate text-xs text-[#6b7c93]">{template.description}</span>
                <span className="mt-2 inline-flex rounded-full bg-[#eef4ff] px-2 py-1 text-[11px] font-semibold text-[#0f6fff]">
                  {AUTOMATION_TEMPLATE_STATUS_OPTIONS.find((item) => item.value === template.status)?.label || template.status}
                </span>
              </button>
            ))}
            {!loading && templates.length === 0 ? (
              <AdminCrudEmptyState
                title="暂无自动化模板"
                description="新建模板后，可在这里维护常用任务的提问模板、指标、维度和默认周期。"
                action={<Button type="primary" onClick={createTemplate}>新建模板</Button>}
              />
            ) : null}
          </div>
        </section>

        <section className="min-h-0 overflow-y-auto rounded-xl border border-[#dbe4f0] bg-white p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#10233f]">{selectedTemplate ? selectedTemplate.name : '编辑模板'}</h2>
              <p className="mt-1 text-xs text-[#6b7c93]">调整任务说明、默认周期和提问模板。</p>
            </div>
            <div className="flex items-center gap-2">
              {draft.id && (
                <button type="button" onClick={() => void deleteTemplate()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f3f4f6] px-3 text-xs font-semibold text-[#6b7c93]">
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              )}
              <button type="button" disabled={saving} onClick={() => void saveTemplate()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#10233f] px-4 text-xs font-semibold text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                保存
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[#355070]">模板名称</span>
              <input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[#355070]">模板类型</span>
              <select value={draft.template_type} onChange={(event) => setDraft((prev) => ({ ...prev, template_type: event.target.value as AutomationTemplateConfig['template_type'] }))} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]">
                {AUTOMATION_TEMPLATE_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[#355070]">默认周期</span>
              <select value={draft.default_frequency} onChange={(event) => setDraft((prev) => ({ ...prev, default_frequency: event.target.value as ScheduleFrequency }))} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]">
                {AUTOMATION_TEMPLATE_FREQUENCY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[#355070]">默认时间</span>
              <input value={draft.default_cron_expression || ''} onChange={(event) => setDraft((prev) => ({ ...prev, default_cron_expression: event.target.value }))} placeholder="例如 0 9 * * 1" className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]" />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-xs font-semibold text-[#355070]">模板说明</span>
              <textarea value={draft.description} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} rows={2} className="rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[#355070]">指标</span>
              <textarea value={joinAdminList(draft.metrics)} onChange={(event) => setDraft((prev) => ({ ...prev, metrics: splitAdminList(event.target.value) }))} rows={3} className="rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[#355070]">维度</span>
              <textarea value={joinAdminList(draft.dimensions)} onChange={(event) => setDraft((prev) => ({ ...prev, dimensions: splitAdminList(event.target.value) }))} rows={3} className="rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[#355070]">筛选条件</span>
              <textarea value={joinAdminList(draft.filters)} onChange={(event) => setDraft((prev) => ({ ...prev, filters: splitAdminList(event.target.value) }))} rows={3} className="rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-[#355070]">状态</span>
              <select value={draft.status} onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as AutomationTemplateConfig['status'] }))} className="h-10 rounded-lg border border-[#dbe4f0] px-3 text-sm outline-none focus:border-[#0f6fff]">
                {AUTOMATION_TEMPLATE_STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-xs font-semibold text-[#355070]">完整提问模板</span>
              <textarea value={draft.prompt_template} onChange={(event) => setDraft((prev) => ({ ...prev, prompt_template: event.target.value }))} rows={5} className="rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 outline-none focus:border-[#0f6fff]" />
            </label>
          </div>

          {messageText && <div className="mt-4 text-xs text-[#6b7c93]">{messageText}</div>}
        </section>
      </div>
    </AdminCrudShell>
  );
}

// ---- Prompt Management Tab Component ----

export { AutomationTemplateManagementTab };
