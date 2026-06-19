'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Save, Shield, Sparkles } from 'lucide-react';
import {
  xiaoqiaoApi,
  type ReportCapabilityManifestResponse,
  type ReportCapabilityOverrideConfigResponse,
  type ReportQueryPolicyResponse,
} from '@/lib/api';
import {
  ADMIN_CATALOG_CHANGE_EVENT,
  ADMIN_CATALOG_CHANGE_STORAGE_KEY,
  broadcastAdminCatalogChange,
} from '@/lib/admin-catalog-events';
import {
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

type SaveStatus = {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
};

export function OrchestrationGovernanceTab() {
  const [policy, setPolicy] = useState<ReportQueryPolicyResponse | null>(null);
  const [manifest, setManifest] = useState<ReportCapabilityManifestResponse | null>(null);
  const [overrides, setOverrides] = useState<ReportCapabilityOverrideConfigResponse | null>(null);
  const [policyText, setPolicyText] = useState('');
  const [overrideText, setOverrideText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policySave, setPolicySave] = useState<SaveStatus>({ status: 'idle' });
  const [overrideSave, setOverrideSave] = useState<SaveStatus>({ status: 'idle' });
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policyData, manifestData, overrideData] = await Promise.all([
        xiaoqiaoApi.getReportQueryPolicy(),
        xiaoqiaoApi.getReportCapabilityManifest(),
        xiaoqiaoApi.getReportCapabilityOverrides(),
      ]);
      setPolicy(policyData);
      setManifest(manifestData);
      setOverrides(overrideData);
      setPolicyText(JSON.stringify(policyData, null, 2));
      setOverrideText(JSON.stringify(overrideData, null, 2));
      setPolicySave({ status: 'idle' });
      setOverrideSave({ status: 'idle' });
      setLastLoadedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleCatalogChange = () => {
      void load();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_CATALOG_CHANGE_STORAGE_KEY) {
        void load();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };

    window.addEventListener(ADMIN_CATALOG_CHANGE_EVENT, handleCatalogChange);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleCatalogChange);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener(ADMIN_CATALOG_CHANGE_EVENT, handleCatalogChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleCatalogChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load]);

  const topRules = useMemo(() => (policy?.tool_selection_rules || []).slice(0, 5), [policy]);
  const topCapabilities = useMemo(() => (manifest?.tools || []).slice(0, 8), [manifest]);
  const lastLoadedLabel = useMemo(() => {
    if (!lastLoadedAt) return '尚未刷新';
    return new Intl.DateTimeFormat('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(lastLoadedAt));
  }, [lastLoadedAt]);

  const savePolicy = async () => {
    setPolicySave({ status: 'saving' });
    try {
      const parsed = JSON.parse(policyText) as Partial<ReportQueryPolicyResponse>;
      const updated = await xiaoqiaoApi.updateReportQueryPolicy(parsed);
      setPolicy(updated);
      setPolicyText(JSON.stringify(updated, null, 2));
      setPolicySave({ status: 'saved', message: '已保存请求理解规则' });
      broadcastAdminCatalogChange('report-query-policy');
    } catch (err) {
      setPolicySave({ status: 'error', message: err instanceof Error ? err.message : '保存失败' });
    }
  };

  const saveOverrides = async () => {
    setOverrideSave({ status: 'saving' });
    try {
      const parsed = JSON.parse(overrideText) as Partial<ReportCapabilityOverrideConfigResponse>;
      const updated = await xiaoqiaoApi.updateReportCapabilityOverrides(parsed);
      setOverrides(updated);
      setOverrideText(JSON.stringify(updated, null, 2));
      setOverrideSave({ status: 'saved', message: '已保存能力覆盖配置' });
      broadcastAdminCatalogChange('report-capability-overrides');
    } catch (err) {
      setOverrideSave({ status: 'error', message: err instanceof Error ? err.message : '保存失败' });
    }
  };

  const saveState = policySave.status === 'saving' || overrideSave.status === 'saving'
    ? 'saving'
    : policySave.status === 'error' || overrideSave.status === 'error'
      ? 'error'
      : policySave.status === 'saved' || overrideSave.status === 'saved'
        ? 'saved'
        : 'idle';

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="请求与能力"
        description={`维护请求理解规则、能力清单和覆盖配置。最近刷新：${lastLoadedLabel}`}
        saveState={saveState}
        actions={(
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-medium text-[#355070] hover:border-[#0f6fff] hover:text-[#0f6fff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? '刷新中' : '刷新'}
        </button>
        )}
      />

      {error ? <AdminCrudErrorState description={error} action={(
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#dbe4f0] bg-white px-3 text-xs font-semibold text-[#355070] hover:border-[#0f6fff] hover:text-[#0f6fff]"
        >
          <RefreshCw size={13} />
          重新读取
        </button>
      )} /> : null}

      {loading ? <AdminCrudListSkeleton rows={5} /> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          title="请求理解规则"
          value={policy?.tool_selection_rules.length ?? 0}
          note="当前可用的路由规则数量"
        />
        <StatCard
          title="能力清单"
          value={manifest?.tools.length ?? 0}
          note="当前已注册的数据能力数量"
        />
        <StatCard
          title="能力覆盖"
          value={overrides?.overrides.length ?? 0}
          note="当前已启用的覆盖配置数量"
        />
      </div>

      <section className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[#0f6fff]" />
          <h3 className="text-sm font-semibold text-[#10233f]">路由原则</h3>
        </div>
        <div className="mt-3 grid gap-3 text-sm text-[#355070] lg:grid-cols-2">
          <div className="rounded-xl bg-[#f8fbff] p-3">
            <div className="font-medium text-[#10233f]">默认原则</div>
            <div className="mt-1 leading-6">
              先把用户问题归一成任务、视图、指标、维度、时间范围和粒度，再从能力清单里选择覆盖度最完整的能力。
            </div>
          </div>
          <div className="rounded-xl bg-[#f8fbff] p-3">
            <div className="font-medium text-[#10233f]">降级要求</div>
            <div className="mt-1 leading-6">
              如果没有完全覆盖的能力，必须明确说明，不允许用不支持对应维度的数据冒充目标结果。
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#0f6fff]" />
              <h3 className="text-sm font-semibold text-[#10233f]">请求理解规则</h3>
            </div>
            <div className="flex items-center gap-2">
              {policySave.status === 'saved' && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <Check size={12} />
                  {policySave.message}
                </span>
              )}
              {policySave.status === 'error' && <span className="text-xs text-rose-600">{policySave.message}</span>}
              <button
                type="button"
                onClick={() => void savePolicy()}
                disabled={policySave.status === 'saving'}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f6fff] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={14} />
                {policySave.status === 'saving' ? '保存中' : '保存规则'}
              </button>
            </div>
          </div>
          <textarea
            value={policyText}
            onChange={(event) => setPolicyText(event.target.value)}
            className="mt-3 min-h-[520px] w-full rounded-2xl border border-[#dbe4f0] bg-[#fbfdff] px-4 py-3 font-mono text-xs leading-6 text-[#10233f] outline-none focus:border-[#0f6fff]"
            spellCheck={false}
          />
          <div className="mt-2 text-xs text-[#8ea0b8]">修改后点击保存，会立即写回当前管理配置。</div>
        </section>

        <section className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#0f6fff]" />
              <h3 className="text-sm font-semibold text-[#10233f]">能力覆盖配置</h3>
            </div>
            <div className="flex items-center gap-2">
              {overrideSave.status === 'saved' && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <Check size={12} />
                  {overrideSave.message}
                </span>
              )}
              {overrideSave.status === 'error' && <span className="text-xs text-rose-600">{overrideSave.message}</span>}
              <button
                type="button"
                onClick={() => void saveOverrides()}
                disabled={overrideSave.status === 'saving'}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f6fff] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={14} />
                {overrideSave.status === 'saving' ? '保存中' : '保存覆盖'}
              </button>
            </div>
          </div>
          <textarea
            value={overrideText}
            onChange={(event) => setOverrideText(event.target.value)}
            className="mt-3 min-h-[520px] w-full rounded-2xl border border-[#dbe4f0] bg-[#fbfdff] px-4 py-3 font-mono text-xs leading-6 text-[#10233f] outline-none focus:border-[#0f6fff]"
            spellCheck={false}
          />
          <div className="mt-2 text-xs text-[#8ea0b8]">这里管理的是覆盖规则，不是全部能力清单。</div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0f6fff]" />
            <h3 className="text-sm font-semibold text-[#10233f]">当前规则预览</h3>
          </div>
          <div className="mt-3 grid gap-3">
            {loading && <div className="rounded-xl border border-dashed border-[#dbe4f0] px-4 py-6 text-sm text-[#8ea0b8]">正在加载...</div>}
            {!loading && topRules.map((rule, index) => {
              const typedRule = rule as Record<string, unknown>;
              const keywords = Array.isArray(typedRule.tool_keywords) ? typedRule.tool_keywords.filter((item): item is string => typeof item === 'string') : [];
              const dimensions = Array.isArray(typedRule.default_dimensions) ? typedRule.default_dimensions.filter((item): item is string => typeof item === 'string') : [];
              return (
                <div key={String(typedRule.id || index)} className="rounded-xl border border-[#e9eff7] bg-[#fbfdff] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-[#10233f]">{String(typedRule.id || `rule-${index + 1}`)}</div>
                    <div className="text-xs text-[#8ea0b8]">优先级 {String(typedRule.priority ?? 0)}</div>
                  </div>
                  <div className="mt-1 text-sm leading-6 text-[#355070]">{String(typedRule.description || '未提供说明')}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#6b7c93]">
                    <span className="rounded-full bg-[#eef5ff] px-2 py-1">意图 {String(typedRule.question_type || 'unknown')}</span>
                    <span className="rounded-full bg-[#eef5ff] px-2 py-1">关键词 {keywords.length}</span>
                    <span className="rounded-full bg-[#eef5ff] px-2 py-1">默认维度 {dimensions.join('、') || '无'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0f6fff]" />
            <h3 className="text-sm font-semibold text-[#10233f]">当前能力清单</h3>
          </div>
          <div className="mt-3 grid gap-3">
            {loading && <div className="rounded-xl border border-dashed border-[#dbe4f0] px-4 py-6 text-sm text-[#8ea0b8]">正在加载...</div>}
            {!loading && topCapabilities.map((item) => (
              <div key={item.capability_id} className="rounded-xl border border-[#e9eff7] bg-[#fbfdff] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-[#10233f]">{item.tool_name}</div>
                  <div className="text-xs text-[#8ea0b8]">{item.server_name}</div>
                </div>
                <div className="mt-1 text-sm leading-6 text-[#355070]">
                  {item.report_domains.length ? `数据域：${item.report_domains.join('、')}` : '未声明数据域'}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#6b7c93]">
                  <span className="rounded-full bg-[#eef5ff] px-2 py-1">维度 {item.supported_dimensions.join('、') || '无'}</span>
                  <span className="rounded-full bg-[#eef5ff] px-2 py-1">粒度 {item.supported_granularity.join('、') || '无'}</span>
                  <span className="rounded-full bg-[#eef5ff] px-2 py-1">可信度 {item.confidence}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminCrudShell>
  );
}

function StatCard({ title, value, note }: { title: string; value: number; note: string }) {
  return (
    <section className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
      <div className="text-sm text-[#6b7c93]">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-[#10233f]">{value}</div>
      <div className="mt-1 text-xs leading-5 text-[#8ea0b8]">{note}</div>
    </section>
  );
}
