'use client';

import { useEffect, useMemo, useState } from 'react';
import { GitBranch, Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import type { AgentType, IntentType } from '@/types';
import type { IntentRouteRule, IntentRouteRulesConfig } from '@/lib/intent-route-rules';
import {
  AdminCrudEmptyState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

type RuleDraft = IntentRouteRule & {
  include_terms_text: string;
  exclude_terms_text: string;
  required_tool_keywords_text: string;
};

const intentOptions: IntentType[] = ['help', 'report_query', 'demand', 'diagnosis', 'debugging', 'get_delivery_packages', 'monitor', 'forecast', 'general'];
const agentOptions: AgentType[] = ['hub', 'help', 'report', 'demand', 'diagnosis', 'debugging', 'delivery', 'monitoring', 'material', 'prediction'];

function splitLines(value: string): string[] {
  return value.split(/[\n,，、]/).map(item => item.trim()).filter(Boolean);
}

function joinLines(value: string[] | undefined): string {
  return Array.isArray(value) ? value.join('\n') : '';
}

function toDraft(rule: IntentRouteRule): RuleDraft {
  return {
    ...rule,
    include_terms_text: joinLines(rule.include_terms),
    exclude_terms_text: joinLines(rule.exclude_terms),
    required_tool_keywords_text: joinLines(rule.required_tool_keywords),
  };
}

function fromDraft(rule: RuleDraft): IntentRouteRule {
  return {
    ...rule,
    include_terms: splitLines(rule.include_terms_text),
    exclude_terms: splitLines(rule.exclude_terms_text),
    required_tool_keywords: splitLines(rule.required_tool_keywords_text),
    updated_at: new Date().toISOString(),
  };
}

function createRule(): RuleDraft {
  const now = new Date().toISOString();
  return {
    id: `custom-${Date.now()}`,
    name: '新意图规则',
    description: '',
    intent_type: 'help',
    agent: 'help',
    workflow_level: 'light',
    confidence: 'medium',
    priority: 50,
    status: 'draft',
    enabled: false,
    rollout_percent: 0,
    match_mode: 'contains',
    include_terms: [],
    exclude_terms: [],
    required_tool_keywords: [],
    reason_template: '命中已配置的意图规则。',
    updated_at: now,
    include_terms_text: '',
    exclude_terms_text: '',
    required_tool_keywords_text: '',
  };
}

export function IntentRouteRulesTab() {
  const [config, setConfig] = useState<IntentRouteRulesConfig | null>(null);
  const [drafts, setDrafts] = useState<RuleDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selected = useMemo(() => drafts.find(rule => rule.id === selectedId) || drafts[0] || null, [drafts, selectedId]);

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/xiaoqiao/admin/intent-route-rules', { cache: 'no-store' });
      const payload = await response.json() as IntentRouteRulesConfig;
      if (!response.ok) throw new Error('load failed');
      setConfig(payload);
      const nextDrafts = payload.rules.map(toDraft);
      setDrafts(nextDrafts);
      setSelectedId(current => nextDrafts.some(rule => rule.id === current) ? current : nextDrafts[0]?.id || '');
    } catch {
      setMessage('意图规则读取失败');
      setConfig(null);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const patchSelected = (patch: Partial<RuleDraft>) => {
    if (!selected) return;
    setDrafts(prev => prev.map(rule => rule.id === selected.id ? { ...rule, ...patch } : rule));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/xiaoqiao/admin/intent-route-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: drafts.map(fromDraft),
          note: '保存意图规则',
        }),
      });
      const payload = await response.json() as IntentRouteRulesConfig;
      if (!response.ok) throw new Error('save failed');
      setConfig(payload);
      setDrafts(payload.rules.map(toDraft));
      setMessage(`已保存为 v${payload.current_version}`);
    } catch {
      setMessage('保存失败，请检查规则配置');
    } finally {
      setSaving(false);
    }
  };

  const rollback = async (version: number) => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/xiaoqiao/admin/intent-route-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback', version }),
      });
      const payload = await response.json() as IntentRouteRulesConfig;
      if (!response.ok) throw new Error('rollback failed');
      setConfig(payload);
      setDrafts(payload.rules.map(toDraft));
      setSelectedId(payload.rules[0]?.id || '');
      setMessage(`已回滚并生成 v${payload.current_version}`);
    } catch {
      setMessage('回滚失败');
    } finally {
      setSaving(false);
    }
  };

  const saveState = saving
    ? 'saving'
    : message.includes('失败')
      ? 'error'
      : message.includes('已')
        ? 'saved'
        : 'idle';

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="意图规则"
        description="配置问题进入哪个处理路径，结合模型判别、可用工具和角色上下文一起打分。"
        saveState={saveState}
        saveText={message || undefined}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs text-[#0f6fff]">当前 v{config?.current_version || '-'}</span>
              <button
                type="button"
                onClick={() => {
                  const rule = createRule();
                  setDrafts(prev => [rule, ...prev]);
                  setSelectedId(rule.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-xs font-medium text-[#355070] hover:border-[#b8cae6]"
              >
                <Plus className="h-3.5 w-3.5" />
                新增规则
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f6fff] px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                保存
              </button>
            </div>
        )}
      />

        <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
          <aside className="rounded-[20px] border border-[#dbe4f0] bg-white p-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-[#355070]">规则列表</div>
              <GitBranch className="h-4 w-4 text-[#0f6fff]" />
            </div>
            <div className="space-y-2">
              {loading ? (
                <AdminCrudListSkeleton rows={5} />
              ) : drafts.map(rule => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setSelectedId(rule.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${selected?.id === rule.id ? 'border-[#9cc8ff] bg-[#f3f8ff]' : 'border-[#edf2f8] bg-white hover:border-[#cfe0ff]'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-medium text-[#10233f]">{rule.name}</div>
                    <span className={rule.enabled ? 'text-[11px] text-[#157f54]' : 'text-[11px] text-[#8ea0b8]'}>
                      {rule.enabled ? '启用' : '停用'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#6b7c93]">{rule.intent_type} · 灰度 {rule.rollout_percent}% · P{rule.priority}</div>
                </button>
              ))}
              {!loading && drafts.length === 0 ? (
                <AdminCrudEmptyState title="还没有意图规则" description="新增规则后可配置命中词、目标意图和处理路径。" />
              ) : null}
            </div>
          </aside>

          <section className="rounded-[20px] border border-[#dbe4f0] bg-white p-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[#355070]">规则配置</div>
                    <div className="mt-1 text-[11px] text-[#8ea0b8]">修改后点击保存才会生成新版本。</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDrafts(prev => prev.filter(rule => rule.id !== selected.id));
                      setSelectedId('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#ffd6df] bg-white px-3 py-2 text-xs font-medium text-[#c2415c]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-[#6b7c93]">
                    名称
                    <input value={selected.name} onChange={event => patchSelected({ name: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f0] px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]" />
                  </label>
                  <label className="text-xs text-[#6b7c93]">
                    规则 ID
                    <input value={selected.id} onChange={event => patchSelected({ id: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f0] px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]" />
                  </label>
                  <label className="text-xs text-[#6b7c93]">
                    目标意图
                    <select value={selected.intent_type} onChange={event => patchSelected({ intent_type: event.target.value as IntentType })} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f0] px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]">
                      {intentOptions.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-[#6b7c93]">
                    目标智能体
                    <select value={selected.agent} onChange={event => patchSelected({ agent: event.target.value as AgentType })} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f0] px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]">
                      {agentOptions.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-[#6b7c93]">
                    优先级
                    <input type="number" value={selected.priority} onChange={event => patchSelected({ priority: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f0] px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]" />
                  </label>
                  <label className="text-xs text-[#6b7c93]">
                    灰度比例
                    <input type="number" min={0} max={100} value={selected.rollout_percent} onChange={event => patchSelected({ rollout_percent: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f0] px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]" />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex items-center gap-2 rounded-xl border border-[#edf2f8] px-3 py-2 text-xs text-[#355070]">
                    <input type="checkbox" checked={selected.enabled} onChange={event => patchSelected({ enabled: event.target.checked, status: event.target.checked ? 'active' : 'inactive' })} />
                    启用
                  </label>
                  <label className="text-xs text-[#6b7c93]">
                    链路级别
                    <select value={selected.workflow_level} onChange={event => patchSelected({ workflow_level: event.target.value as 'light' | 'heavy' })} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f0] px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]">
                      <option value="light">轻链路</option>
                      <option value="heavy">重链路</option>
                    </select>
                  </label>
                  <label className="text-xs text-[#6b7c93]">
                    置信度
                    <select value={selected.confidence} onChange={event => patchSelected({ confidence: event.target.value as 'high' | 'medium' | 'low' })} className="mt-1 h-10 w-full rounded-lg border border-[#dbe4f0] px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]">
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </label>
                </div>

                <label className="block text-xs text-[#6b7c93]">
                  描述
                  <textarea value={selected.description} onChange={event => patchSelected({ description: event.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 text-[#10233f] outline-none focus:border-[#0f6fff]" />
                </label>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block text-xs text-[#6b7c93]">
                    命中词
                    <textarea value={selected.include_terms_text} onChange={event => patchSelected({ include_terms_text: event.target.value })} rows={8} className="mt-1 w-full rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 text-[#10233f] outline-none focus:border-[#0f6fff]" />
                  </label>
                  <label className="block text-xs text-[#6b7c93]">
                    排除词
                    <textarea value={selected.exclude_terms_text} onChange={event => patchSelected({ exclude_terms_text: event.target.value })} rows={8} className="mt-1 w-full rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 text-[#10233f] outline-none focus:border-[#0f6fff]" />
                  </label>
                  <label className="block text-xs text-[#6b7c93]">
                    需要的工具关键词
                    <textarea value={selected.required_tool_keywords_text} onChange={event => patchSelected({ required_tool_keywords_text: event.target.value })} rows={8} className="mt-1 w-full rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 text-[#10233f] outline-none focus:border-[#0f6fff]" />
                  </label>
                </div>
                <label className="block text-xs text-[#6b7c93]">
                  命中说明
                  <textarea value={selected.reason_template} onChange={event => patchSelected({ reason_template: event.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-[#dbe4f0] px-3 py-2 text-sm leading-6 text-[#10233f] outline-none focus:border-[#0f6fff]" />
                </label>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dbe4f0] px-4 py-12 text-center text-sm text-[#8ea0b8]">请选择一条规则</div>
            )}
          </section>

          <aside className="rounded-[20px] border border-[#dbe4f0] bg-white p-4 shadow-[0_10px_30px_rgba(15,35,63,0.06)]">
            <div className="text-sm font-medium text-[#355070]">版本回滚</div>
            <div className="mt-1 text-[11px] text-[#8ea0b8]">每次保存都会生成新版本，可回滚到任一历史快照。</div>
            <div className="mt-3 space-y-2">
              {(config?.versions || []).slice().reverse().map(version => (
                <div key={version.version} className="rounded-2xl border border-[#edf2f8] bg-[#fbfdff] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-[#10233f]">v{version.version}</div>
                    <button
                      type="button"
                      onClick={() => void rollback(version.version)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[#0f6fff] hover:bg-[#eef5ff] disabled:opacity-60"
                    >
                      <RotateCcw className="h-3 w-3" />
                      回滚
                    </button>
                  </div>
                  <div className="mt-1 text-[11px] text-[#6b7c93]">{version.note || '未填写说明'}</div>
                  <div className="mt-1 text-[10px] text-[#8ea0b8]">{new Date(version.created_at).toLocaleString('zh-CN')}</div>
                </div>
              ))}
            </div>
          </aside>
        </section>
    </AdminCrudShell>
  );
}
